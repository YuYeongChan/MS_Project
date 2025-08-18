import os, json, requests
from typing import Optional, Tuple
import logging
from pathlib import Path
from io import BytesIO
from ProjectDB.Registration.RegistrationDAO import RegistrationDAO
import mimetypes
import httpx

DEFAULT_AI_BASE_URL = os.environ.get("AI_BASE_URL", "http://128.24.59.107:8000")
TIMEOUT = (5, 120)  # (connect, read)

LOCAL_ANALYSIS_DIR = Path("./analysis_photo")  # 실제 경로로
LOCAL_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

def _safe_status(msg: str, limit: int = 100) -> str:
    s = (msg or "").strip()
    if len(s) <= limit:
        return s
    return s[: limit - 3] + "..."

class ImageAiDAO:
    """
    - 역할: 외부 AI 호출(/predict: 파일 업로드) → 응답 파싱 → Reports 갱신
    - 사용 예: background_tasks.add_task(service.process_report, report_id, src_path_or_url, display_name)
    """
    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger("ai-call")

    def __init__(self,
                 dao: Optional[RegistrationDAO] = None,
                 ai_base_url: Optional[str] = None,
                 request_timeout: int = 120):
        self.dao = dao or RegistrationDAO()
        self.ai_base_url = (ai_base_url or DEFAULT_AI_BASE_URL).rstrip("/")
        self.request_timeout = request_timeout  # 현재는 TIMEOUT 튜플을 사용하지만 필요시 적용 가능

    def _download_to_local(self, url_or_path: str, save_name: str = None) -> str:
        """
        AI가 준 mask_url을 로컬 analysis_photo로 복제 저장.
        허용 입력:
        - 절대 URL: http(s)://...
        - 서버 상대 URL: /files/...
        그 외(내부 파일시스템 경로)는 거부.
        """
        if not url_or_path:
            return None

        # 이미지 다운로드
        resp = requests.get(url_or_path, timeout=30)
        resp.raise_for_status()

        # 로컬에 저장
        filename = os.path.basename(url_or_path)
        local_path = LOCAL_ANALYSIS_DIR / filename
        with open(local_path, "wb") as f:
            f.write(resp.content)

        return str(local_path)

    # ---------- 퍼블릭 메소드(BackgroundTasks에서 호출) ----------
    def process_report(self, report_id: int, src: str = None, display_name: str = "input"):
        """
        1) ai_status = 'processing'
        2) AI 호출(/predict - 파일 바이트 업로드)
        3) 응답 파싱 → (ai_status, caption_en, caption_ko, mask_url)
        4) DB 업데이트
        """
        # 1) processing 상태 기록
        self.dao.updateAIStatus(report_id, "processing")
        self.log.info("[process_report] report_id=%s → AI 분석 시작", report_id)

        try:
            if not src:
                # 필요 시 report_id로 원본 이미지 경로를 찾아오는 로직을 구현
                # (현재 프로젝트 구조에 맞게 구현하세요)
                raise ValueError("src(로컬 경로 또는 URL)가 지정되지 않았습니다.")

            # 2) AI 호출
            data = self._call_ai(src, name=display_name)

            # 3) 응답 매핑
            ai_status, caption_en, caption_ko, mask_url = self._map_response_to_fields(data)

            if mask_url:
                local_mask_path = self._download_to_local(mask_url)  # ← 로컬 저장
            else:
                local_mask_path = None

            # 4) 결과 DB 업데이트
            self.dao.updateAIResults(
                report_id=report_id,
                ai_status=_safe_status(ai_status),
                caption_en=caption_en,
                caption_ko=caption_ko,
                mask_url=local_mask_path  # ← 로컬 경로 저장 (원한다면 앱의 정적 서빙 URL로 변환)
            )
            # 상태 OK로 정리
        
            self.dao.updateAIStatus(report_id, _safe_status(ai_status))
            self.log.info("[process_report] report_id=%s → AI 분석 완료, status=%s", report_id, ai_status)

        except Exception as e:
            # 실패 이유를 DB에 기록 (열 길이 100 제한 대응)
            err_msg = _safe_status(f"failed:{str(e)}")
            self.dao.updateAIStatus(report_id, err_msg)
            self.log.error("[process_report] report_id=%s → AI 분석 실패: %s", report_id, e, exc_info=True)
            # 필요시 여기서 재throw 하지 않고 종료해도 됨
            # raise

    # ---------- 내부 유틸 ----------
    def _call_ai(self, src: str, name: str = "input"):
        url = f"{self.ai_base_url}/predict"

        def is_url(s: str) -> bool:
            s2 = s.strip().replace("\\", "/")
            return s2.startswith("http://") or s2.startswith("https://")

        # ---- 원본 바이트/파일명/MIME 준비 ----
        content_bytes = None
        filename = "input.jpg"
        mime = "application/octet-stream"

        if is_url(src):
            src_url = src.strip().replace("\\", "/")
            r = requests.get(src_url, timeout=TIMEOUT)
            r.raise_for_status()
            content_bytes = r.content
            # 파일명/MIME 추정
            tail = src_url.split("/")[-1]
            if tail:
                filename = tail
            ct = r.headers.get("Content-Type", "")
            if ct:
                mime = ct.split(";")[0].strip()
            else:
                mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        else:
            p = Path(src)
            if not p.exists():
                raise FileNotFoundError(f"Local image not found: {p}")
            filename = p.name
            mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
            content_bytes = p.read_bytes()

        # ---- 1차 시도: 서버가 file 필드 기대하는 경우 ----
        data = {"name": name}  # name이 Form(...) 여도 OK
        files = {"image": (filename, BytesIO(content_bytes), mime)}
        resp = requests.post(url, files=files, data=data, timeout=TIMEOUT)

        if resp.status_code == 422:
            # 검증 에러 상세를 로그로 남김
            try:
                self.log.error("422 detail (file): %s", resp.text)
            except Exception:
                pass
            # ---- 2차 시도: 서버가 image 필드 기대하는 경우 ----
            files2 = {"image": (filename, BytesIO(content_bytes), mime)}
            resp2 = requests.post(url, files=files2, data=data, timeout=TIMEOUT)
            if resp2.status_code == 422:
                try:
                    self.log.error("422 detail (image): %s", resp2.text)
                except Exception:
                    pass
                resp2.raise_for_status()
            resp2.raise_for_status()
            return resp2.json()

        resp.raise_for_status()
        return resp.json()

    def _map_response_to_fields(self, data: dict) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
        """
        현재 Mask R-CNN API 응답 포맷을 DB 컬럼(4개)에 매핑
        """
        try:
            # --- 분류불가 ---
            if data.get("status") == "not_detected":
                ai_status  = "분류불가"
                caption_en = data.get("caption_en")
                caption_ko = data.get("caption_ko")
                mask_url   = None
                return ai_status, caption_en, caption_ko, mask_url

            # --- 분류가능 ---
            ai_status   = data.get("label_ko")
            caption_en  = None
            caption_ko  = None
            mask_url   = data.get("mask_url")
            return ai_status, caption_en, caption_ko, mask_url
        except:
            # 예상 외 응답
            raise ValueError(f"unknown AI response format: {json.dumps(data)[:200]}")

    def update_ai_status(self, report_id, status_text):
        # Oracle 업데이트 쿼리 실제 호출
        self.dao.updateAIStatus(report_id, _safe_status(status_text))