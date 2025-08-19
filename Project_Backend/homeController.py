import sys
import os
from fastapi import FastAPI, Form, UploadFile, HTTPException, File, BackgroundTasks, Request, APIRouter, Query # APIRouter 임포트 유지
from ProjectDB.Account.accountDAO import AccountDAO
from ProjectDB.Registration.RegistrationDAO import RegistrationDAO
from ProjectDB.ManagementStatus.ManagementStatusDAO import ManagementStatusDAO
from ProjectDB.Notice.noticeDAO import NoticeDAO
from ProjectDB.imageAI.imageAiDAO import ImageAiDAO
from ProjectDB.Notification.notificationsDAO import NotificationDAO
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional,Dict
from fastapi.staticfiles import StaticFiles
import shutil # shutil 임포트 유지
import json # json 임포트 유지
from datetime import datetime, timedelta
import jwt
# 개인정보 수정
from fastapi import Depends, Header
from pydantic import BaseModel
from urllib.parse import unquote # ADMIN 랭킹 개인정보 확인
from token_utils import create_access_token, create_refresh_token, REFRESH_SECRET_KEY, SECRET_KEY, ALGORITHM

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# DAO 인스턴스 생성
aDAO = AccountDAO()
rDAO = RegistrationDAO()
msDAO = ManagementStatusDAO()
nDAO = NoticeDAO()
aiDAO = ImageAiDAO()
notifDAO = NotificationDAO()

# ai 서버 url
AI_BASE_URL = os.environ.get("AI_BASE_URL", "http://128.24.59.107:8000")
ai_service = ImageAiDAO(ai_base_url=AI_BASE_URL)  # (참고) 현재 이 인스턴스는 사용 안 함

# JWT 함수들(개인정보수정 토큰)
def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

# 개인정보 수정시 실시간을 하기위해 필요한거
def issue_token(user_id: str):
    user_info = aDAO.getUserInfo(user_id)

    payload = {
        "user_id": user_id,
        "nickname": user_info["nickname"],
        "name": user_info["name"],
        "address": user_info["address"],
        "resident_id_number": user_info["resident_id_number"],
        "score": user_info["score"],
        "profile_pic_url": user_info["profile_pic_url"],
        "phone_number": user_info["phone_number"],
        "role": "admin" if user_info.get("is_admin") else "user",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
# 개인정보 수정 
class UpdateUserInfoRequest(BaseModel):
    nickname: Optional[str]
    phone_number: Optional[str]
    address: Optional[str]

UPLOAD_PROFILE_DIR = os.path.join(os.path.dirname(__file__), "profile_photos")
#폴더가 없다면 생성
os.makedirs(UPLOAD_PROFILE_DIR, exist_ok=True)

# `homeController.py`가 있는 `Project_Backend` 폴더의 부모 디렉토리 (MS_PROJECT_AINURI)를 sys.path에 추가
# 이렇게 하면 'ai' 폴더를 직접 패키지처럼 임포트할 수 있습니다.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../ai"))) 
# MS_PROJECT_AINURI 루트 경로 추가
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(PROJECT_ROOT)

# 올바른 임포트 구문: 'ai' 패키지에서 함수를 가져옵니다.
from ai.whisper_gpt.whisper_gpt import process_audio_and_get_structured_data

# router = APIRouter() #  APIRouter는 필요시 app.include_router()와 함께 사용


# FastAPI 앱 생성
app = FastAPI()
router = APIRouter()

BASE_DIR = os.path.dirname(__file__)
INPUT_DIR = os.path.join(BASE_DIR, "input_images")
MASK_DIR  = os.path.join(BASE_DIR, "mask_images")
ANALYSIS_DIR = os.path.join(BASE_DIR, "analysis_photo")
os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(MASK_DIR,  exist_ok=True)
os.makedirs(ANALYSIS_DIR, exist_ok=True)

app.mount("/input_images", StaticFiles(directory=INPUT_DIR), name="input_images")
app.mount("/mask_images",  StaticFiles(directory=MASK_DIR),  name="mask_images")
app.mount("/analysis_photo", StaticFiles(directory=ANALYSIS_DIR), name="analysis_photo")


# "/profile_photos" 경로로 해당 폴더를 정적 파일 제공
app.mount("/profile_photos", StaticFiles(directory=UPLOAD_PROFILE_DIR), name="profile_photos")

# registration_photos(공공시설물) 경로 설정
registration_photo_folder = os.path.join(os.path.dirname(__file__), 'registration_photos')
os.makedirs(registration_photo_folder, exist_ok=True)
app.mount("/registration_photos", StaticFiles(directory=registration_photo_folder), name="registration_photos")

from fastapi.responses import JSONResponse


# 회원가입 API 엔드포인트
@app.post("/account.sign.up")
def accountSignUp(
    user_id: str = Form(...),
    password: str = Form(...),
    nickname: str = Form(...),
    name: str = Form(...),
    phone_number: Optional[str] = Form(None), # 전화번호 (DAO 시그니처와 순서 맞춰야 함)
    address: Optional[str] = Form(None),      # <<< address를 Optional로 변경합니다!
    resident_id_number: str = Form(...),
    profile_pic: Optional[UploadFile] = File(None)
):
    # DAO 메서드 호출 시 인자 순서를 AccountDAO.py의 signUp 메서드 시그니처와 정확히 일치시킵니다.
    # AccountDAO.py의 signUp 시그니처:
    # signUp(self, user_id, password, nickname, name, address, resident_id_number, phone_number=None, profile_pic: Optional[UploadFile] = None)
    return aDAO.signUp(
        user_id=user_id,
        password=password,
        nickname=nickname,
        name=name,
        address=address,             # DAO 시그니처 순서와 일치 (name 뒤에 address)
        resident_id_number=resident_id_number, # DAO 시그니처 순서와 일치 (address 뒤에 resident_id_number)
        phone_number=phone_number,   # DAO 시그니처 순서와 일치 (resident_id_number 뒤에 phone_number)
        profile_pic=profile_pic      # DAO 시그니처 순서와 일치 (phone_number 뒤에 profile_pic)
    )

# 로그인 API 엔드포인트
@app.post("/account.sign.in")
def accountSignIn(user_id: str = Form(...), password: str = Form(...)):
    return aDAO.signIn(user_id, password)  # JWT 발급은 DAO에서 처리

@app.get("/account.check.nickname")
def checkNickname(nickname: str):
    is_duplicate = aDAO.checkNicknameDuplicate(nickname)
    if is_duplicate:
        raise HTTPException(status_code=409, detail="중복된 닉네임입니다.")
    else:
        return {"result": "사용 가능한 닉네임입니다."}
    
@app.get("/account.check.userid")
def checkUserId(user_id: str):
    is_duplicate = aDAO.checkUserIdDuplicate(user_id)
    if is_duplicate:
        raise HTTPException(status_code=409, detail="이미 사용 중인 사용자 ID입니다.")
    else:
        return {"result": "사용 가능한 사용자 ID입니다."}
    
@app.get("/account.ranking")
def getRanking(user_id: str):
    # 사용자 랭킹을 조회
    # 랭킹은 점수(score) 기준으로 내림차순 정렬
    try:
        ranking = aDAO.getRanking(user_id)
        if not ranking:
            return JSONResponse(status_code=404, content={"error": "랭킹 정보가 없습니다."})
        return ranking.body
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# 신고 등록 API 엔드포인트
@app.post("/registration.write")
async def registrationWrite(
    photo: UploadFile,
    location_description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: str = Form(...),
    details: str = Form(...),
    report_date: str = Form(...),
    is_normal: int = Form(0),  # ← 0/1 로 받기
    request: Request = None,
    background_tasks: BackgroundTasks = None
):
    # 1) 기존 신고 저장
    resp = await rDAO.registerFacility(photo, location_description, latitude, longitude, user_id, details, report_date)

    # 2) report_id, 원본 파일명 -> 공개 url 조립
    try:
        payload = json.loads(resp.body)
        report_id = int(payload.get("report_id"))
        photo_filename = payload.get("photo_url")  # 프로젝트 키에 맞춰 조정
        base = str(request.base_url).rstrip("/")
        input_image_url = f"{base}/registration_photos/{photo_filename}"  # 정적 마운트 기준

        # 3) 백그라운드 실행 (클래스 메소드 호출)
        if background_tasks:
            background_tasks.add_task(aiDAO.process_report, report_id, input_image_url)
    except Exception as e:
        print("BG schedule error:", e)

    return resp

# 신고 목록 조회 API 엔드포인트
@app.get("/registration.list")
def registrationList():
    return rDAO.getAllRegistrations()

# 관리 상태 등록 API 엔드포인트
@app.post("/management.status.add")
def addManagementStatus(
    report_id: int = Form(...),
    current_status: str = Form(...),
    damage_info_details: str = Form(...),
    facility_type: str = Form(...),
    manager_nickname: str = Form(...),
    manager_comments: str = Form(None)
):
    return msDAO.addStatus(report_id, current_status, damage_info_details, facility_type, manager_nickname, manager_comments)

# 관리 상태 전체 조회 API 엔드포인트
@app.get("/management.status.list")
def getManagementStatusList():
    return msDAO.getAllStatuses()

@app.get("/get_user_info/{user_id}")
def get_user_info(user_id: str):
    """
    사용자 ID를 받아 해당 사용자의 주소를 반환합니다.
    주소는 지도 중심 설정에 사용됩니다.
    """
    try:
        user_info = aDAO.getUserInfo(user_id)  # user_id 기준으로 DB 조회
        if not user_info:
            return JSONResponse(status_code=404, content={"error": "해당 사용자를 찾을 수 없습니다."})
        
        address = user_info.get("address")  # dict로 반환된 경우
        return {"address": address}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})



@app.get("/info.speechToText")
def infoSpeech2Txt(location: str, type: str, problem: str):
    result = {
        "장소": location,
        "공공기물 종류": type,
        "발견된 문제 또는 점검 필요 사유": problem
    }
    headers = {"Access-Control-Allow-Origin": "*"}
    return JSONResponse(result, headers=headers)

@app.get("/get_all_damage_reports")
def getAllDamageReports(): # 
    """
    모든 파손 보고서의 위도, 경도, location_description 정보를 조회합니다.
    DamageMapScreen에서 지도에 마커를 표시하는 데 사용됩니다.
    """
    return msDAO.getAllDamageReportLocations()  # JSONResponse를 그대로 반환



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # 또는 ["http://localhost", "http://192.168.254.107"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



UPLOAD_DIR = "uploaded_audios"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload_audio")
async def upload_audio(file: UploadFile = File(...)):
    filename = file.filename
    save_path = os.path.join("uploaded_audios", filename)
    save_path = os.path.abspath(save_path)  #  절대경로로 변환!
    # 1. 파일 저장
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Whisper + GPT 구조화 실행
    try:
        structured_result = process_audio_and_get_structured_data(save_path)
    except Exception as e:
        print(" 구조화 중 오류 발생:", e)
        return JSONResponse(
            status_code=500,
            content={
                "message": "Whisper + GPT 구조화 실패",
                "error": str(e)
            }
        )
    # 3. 클라이언트에 파일 정보 + 구조화 결과 응답
    return JSONResponse({
        "message": "업로드 및 구조화 성공",
        "filename": filename,
        "path": save_path,
        "result": structured_result  #  React Native에서 이걸 받아서 detail 입력란에 사용
    })



@router.get("/analyze_audio")
async def analyze_audio(filename: str):
    path = os.path.join("uploaded_audios", filename)
    if not os.path.exists(path):
        return {"error": "파일이 존재하지 않음"}

    result = process_audio_and_get_structured_data(path)
    return result

#개인정보수정 
@app.patch("/update_user_info")
async def update_user_info(
    nickname: str = Form(None),
    phone_number: str = Form(None),
    address: str = Form(None),
    profile_pic: UploadFile = File(None),
    authorization: str = Header(...)
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization 헤더 형식 오류")

    token = authorization[7:]
    user_data = decode_token(token)
    user_id = user_data["user_id"]

    profile_pic_url = user_data.get("profile_pic_url")
    if profile_pic:
        try:
            ext = os.path.splitext(profile_pic.filename)[-1]
            new_filename = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
            file_path = os.path.join(UPLOAD_PROFILE_DIR, new_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(profile_pic.file, buffer)

            profile_pic_url = new_filename
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"프로필 사진 저장 실패: {str(e)}")

    # DB 업데이트
    result = aDAO.updateUserInfo(
        user_id,
        nickname=nickname,
        phone_number=phone_number,
        address=address,
        profile_pic_url=profile_pic_url
    )

    if result:
        new_token = issue_token(user_id)
        return {"message": "회원 정보 수정 완료", "token": new_token}
    else:
        raise HTTPException(status_code=500, detail="회원 정보 수정 실패")
    
    # 회원 탈퇴 (DELETE)
@app.delete("/delete_account")
def delete_account(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization 헤더 형식 오류")

    token = authorization[7:]
    user_data = decode_token(token)
    user_id = user_data["user_id"]

    result = aDAO.deleteUser(user_id)
    if result:
        return {"message": "회원 탈퇴 완료"}
    else:
        raise HTTPException(status_code=500, detail="회원 탈퇴 실패")
    
@app.get("/get_notices")
def get_notices():
    """
    공지사항 목록을 조회합니다.
    """
    try:
        notices = nDAO.getNotices()
        if not notices:
            return JSONResponse(status_code=404, content={"error": "공지사항이 없습니다."})
        return notices.body
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/delete_notices")    
def delete_notices(id:str):
    return nDAO.deleteNotice(id)

@app.post("/create_notice")
def create_notice(
    title: str = Form(...),
    content: str = Form(...),
    created_by: str = Form(...),
    notice_type: int = Form(...),
    is_pinned: str = Form(...) # 'Y' or 'N'
):
    """
    새로운 공지사항을 등록합니다.
    (Form 데이터로 받도록 수정)
    """
    try:
        # DAO 함수를 호출하여 DB에 저장
        result = nDAO.createNotice(
            title=title,
            content=content,
            created_by=created_by,
            notice_type=notice_type,
            is_pinned=is_pinned
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


    #신고한 유저가 자기가 신고한 목록 보기위해 필요한거
@app.get("/my_reports")
async def my_reports(user_id: str = Query(..., description="조회할 사용자 ID")):
    return rDAO.getUserReports(user_id)

    #유저 신고한 내역 확인할때 유저 정보 확인
@app.get("/me")
def get_my_info(authorization: str = Header(...)):
    """
    JWT 토큰을 통해 현재 로그인한 사용자 정보를 반환합니다.
    React Native 클라이언트에서 로그인 확인용으로 사용됩니다.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization 헤더 형식 오류")

    token = authorization[7:]
    try:
        user_data = decode_token(token)
    except HTTPException as e:
        raise e

    # 프론트에 필요한 정보만 수정 가능
    return {
        "user_id": user_data.get("user_id"),
        "nickname": user_data.get("nickname"),
        "name": user_data.get("name"),
        "address": user_data.get("address"),
        "score": user_data.get("score"),
        "profile_pic_url": user_data.get("profile_pic_url"),
        "phone_number": user_data.get("phone_number"),
        "role": user_data.get("role")
    }

    # 유저가 신고한 내용 삭제 기능
def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization 헤더 형식 오류")

    token = authorization[7:]  # "Bearer " 제거
    return decode_token(token)

@app.delete("/my_reports/{report_id}")
def delete_my_report(report_id: int, current_user: Dict = Depends(get_current_user)):
    """
    현재 로그인한 사용자가 작성한 신고만 삭제할 수 있음
    """
    # 신고가 존재하는지 확인
    report = rDAO.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="신고 내역을 찾을 수 없습니다.")

    # 사용자 권한 확인
    if report["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="본인의 신고만 삭제할 수 있습니다.")

    try:
        rDAO.delete_report_by_id(report_id)
        return {"message": "삭제 성공"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제 실패: {str(e)}")
    
# 특정 ID의 공지사항 상세 정보를 조회
@app.get("/get_notice/{notice_id}")
def get_notice_detail(notice_id: int):
    return nDAO.getNoticeById(notice_id)

@app.post("/update_notice/{notice_id}") 
def update_notice(
    notice_id: int,
    title: str = Form(...),
    content: str = Form(...),
    notice_type: int = Form(...),
    is_pinned: str = Form(...) # 'Y' or 'N'
):
    return nDAO.updateNotice(notice_id, title, content, notice_type, is_pinned)

@app.get("/admin/all_reports")
def get_all_reports_for_admin():
    """관리자 페이지를 위한 모든 신고 목록을 조회합니다."""
    return rDAO.getAllReportsForAdmin()

@app.get("/report_details/{report_id}")
def get_report_details(report_id: int):
    """특정 신고의 모든 상세 정보를 조회합니다."""
    return rDAO.getReportDetailsById(report_id)

@app.post("/update_report_status/{report_id}")
def update_report_status(
    report_id: int,
    is_normal: int = Form(...), # 0=파손, 1=정상
    repair_status: int = Form(...)  # 0=수리 대기, 1=수리 완료
):
    """신고의 파손 및 수리 상태를 업데이트합니다."""
    return rDAO.updateReportStatuses(report_id, is_normal, repair_status)

# 1) 이메일 쿼리 파라미터 방식
@app.get("/admin/users/by-email")
def admin_get_user_by_email(email: str):
    user = aDAO.getUserByEmail(email)
    if not user:
        raise HTTPException(status_code=404, detail="유저가 없습니다.")
    return {"result": user}

# 2) path param 방식도 필요하면 제공 (URL 인코딩 주의)
@app.get("/admin/users/{user_id}")
def admin_get_user_by_id(user_id: str):
    # 안전: 브라우저가 인코딩한 %40 등을 복원
    uid = unquote(user_id)
    user = aDAO.getUserDetailsById(uid)
    if not user:
        raise HTTPException(status_code=404, detail="유저가 없습니다.")
    return {"result": user}
    
class RefreshIn(BaseModel):
    refreshToken: str

@app.post("/auth/refresh")
def auth_refresh(body: RefreshIn):
    # 1) refresh 토큰 검증
    try:
        payload = jwt.decode(body.refreshToken, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "refresh":
            raise HTTPException(status_code=401, detail="유효하지 않은 refresh 토큰")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="유효하지 않은 refresh 토큰")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="refresh 토큰 만료")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 refresh 토큰")

    # 2) 유저 검증(권장)
    user_info = aDAO.getUserInfo(user_id)
    if not user_info:
        raise HTTPException(status_code=401, detail="사용자 없음")

    # 3) access 토큰 새 발급 (payload 구성은 issue_token과 동일 컨셉)
    payload = {
        "user_id": user_id,
        "nickname": user_info["nickname"],
        "name": user_info["name"],
        "address": user_info["address"],
        "resident_id_number": user_info["resident_id_number"],
        "score": user_info["score"],
        "profile_pic_url": user_info["profile_pic_url"],
        "phone_number": user_info["phone_number"],
        "role": "admin" if user_info.get("is_admin") else "user",
    }
    new_access = create_access_token(payload)

    # (선택) refresh rotation: 새 refresh도 함께 내려주고, 이전 refresh를 폐기(블랙리스트/DB저장)하는 설계 권장
    return {"accessToken": new_access}


@app.get("/management.reports")
async def management_reports():
    return msDAO.getAllDamageReportLocations()  # 또는 WithLatestStatus 버전

@app.get("/management.report/{report_id}")
async def management_report_detail(report_id: int):
    return msDAO.getReportDetail(report_id)

@app.get("/notifications")
def get_notifications(recipient_code: Optional[str] = None, limit: int = 50):
    """
    사용자의 recipient_code(=user_id)로 알림 조회.
    recipient_code 없으면 전체 목록(관리/테스트용).
    """
    try:
        data = notifDAO.list(recipient_code, limit)
        return data
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"알림 조회 실패: {e}"})