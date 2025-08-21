import sys
import os
from fastapi import Body, FastAPI, Form, UploadFile, HTTPException, File, BackgroundTasks, Request, APIRouter, Query, Depends, Header
from ProjectDB.Account.accountDAO import AccountDAO
from ProjectDB.Registration.RegistrationDAO import RegistrationDAO
from ProjectDB.ManagementStatus.ManagementStatusDAO import ManagementStatusDAO
from ProjectDB.Notice.noticeDAO import NoticeDAO
from ProjectDB.imageAI.imageAiDAO import ImageAiDAO
from ProjectDB.Notification.notificationDAO import NotificationDAO
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional,Dict, List
from fastapi.staticfiles import StaticFiles
import shutil # shutil 임포트 유지
import json # json 임포트 유지
from datetime import datetime, timedelta, timezone
import jwt
# 개인정보 수정
from pydantic import BaseModel,Field,constr
from urllib.parse import unquote # ADMIN 랭킹 개인정보 확인
from token_utils import create_access_token, create_refresh_token, REFRESH_SECRET_KEY, SECRET_KEY, ALGORITHM, EXPO_PUSH_URL
import httpx

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# DAO 인스턴스 생성
aDAO = AccountDAO()
rDAO = RegistrationDAO()
msDAO = ManagementStatusDAO()
nDAO = NoticeDAO()
aiDAO = ImageAiDAO()
notifyDAO = NotificationDAO()

# ai 서버 url
AI_BASE_URL = os.environ.get("AI_BASE_URL", "http://128.24.59.107:8000")
ai_service = ImageAiDAO(ai_base_url=AI_BASE_URL)

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

# ==== Pydantic 모델 ====
# 개인정보 수정 
class UpdateUserInfoRequest(BaseModel):
    nickname: Optional[str]
    phone_number: Optional[str]
    address: Optional[str]

# Notifications 입력 모델 (DB 스키마 길이 반영)
# class NotificationCreateIn(BaseModel):
#     content:constr(min_length=1, max_length=1000)
#     sender: constr(min_length=1, max_length=50)
#     recipient_code: Optional[constr(max_length=200)] = "USER_ALL"  # user_id/email/NAME_/LOCATION_ 허용
    

# class NotificationBulkIn(BaseModel):
#     content: constr(min_length=1, max_length=1000)
#     sender:  constr(min_length=1, max_length=50)
#     recipients: List[constr(max_length=200)] = Field(..., min_items=1)
    
# 제약조건 없는 단순 버전
class NotificationCreateIn(BaseModel):
    content: str
    sender: str
    recipient_code: Optional[str] = "USER_ALL"  # user_id/email/NAME_/LOCATION_ 허용

class NotificationBulkIn(BaseModel):
    content: str
    sender: str
    recipients: List[str]
#######################

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
        photo_filename = payload.get("photo_url")
        base = str(request.base_url).rstrip("/")
        input_image_url = f"{base}/registration_photos/{photo_filename}"

        # 3) AI 백그라운드 작업 추가
        if background_tasks:
            background_tasks.add_task(aiDAO.process_report, report_id, input_image_url)

        # 4) 신고 등록 성공 시 알림 추가
        # 신고자 정보 가져오기 (여기서는 user_id로 닉네임 등을 조회)
        user_info = aDAO.getUserInfo(user_id)
        nickname = user_info.get("nickname", "익명")

        # 관리자에게 알림 보내기
        admin_notification_data = {
            "title": "[신규 신고 등록 알림]",
            "body": f"사용자 '{nickname}'님이 새로운 파손 내용을 등록하셨습니다.",
        }
        # 백그라운드 태스크에 알림 전송 작업 추가 (API 호출)
        background_tasks.add_task(notifyDAO.send_notification_to_admin_task, **admin_notification_data)

        # 주변 사용자들에게 알림 보내기
        local_notification_data = {
            "title": "[새로운 파손 공공기물 발견]",
            "body": f"근처에 새로운 파손된 공공기물이 신고되었습니다.",
        }
        background_tasks.add_task(notifyDAO.send_notification_to_local_task, **local_notification_data)


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
        data = notifyDAO.list(recipient_code, limit)
        return data
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"알림 조회 실패: {e}"})

# 알림용 토큰 저장
@app.post("/account.save_push_token")
def save_push_token(expoPushToken: str = Body(...), authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization 오류")
    token = authorization[7:]
    user = decode_token(token)
    user_id = user["user_id"]

    result = notifyDAO.saveExpoPushToken(user_id, expoPushToken)

    if result:
        return {"message": "토큰 저장 완료"}
    else:
        raise HTTPException(status_code=500, detail="토큰 저장 실패")
    
@app.post("/notification.notify")
def send_notification(to_user_id: str = Body(...), title: str = Body(...), body: str = Body(...), data: dict = Body({})):
    h = {"Access-Control-Allow-Origin": "*"}

    # DB에서 대상자의 expo_push_token 조회
    token = notifyDAO.getExpoPushToken(to_user_id)
    if not token:
        raise HTTPException(status_code=400, detail="푸시 토큰 없음")

    payload = {
        "to": token,             # "ExponentPushToken[xxx]"
        "title": title,
        "body": body,
        "data": data,            # 클릭 시 사용할 딥링크 정보 등
        "sound": "default",
        "channelId": "default",
        "priority": "high",
    }

    try:
        with httpx.Client(timeout=10) as client:
            r = client.post(EXPO_PUSH_URL, json=payload)
            r.raise_for_status()
            body = {
                "result": r.json()
            }
            return JSONResponse(body, headers=h)
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Expo Push 전송 실패: {str(e)}")

# 100개씩 나눠서 알림을 보내기 위한 용도
def chunk(lst, n=100):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]

@app.post("/notification.notify_admin")
async def send_notification_to_admin(title: str = Body(...), body: str = Body(...), data: dict = Body({})):
    h = {"Access-Control-Allow-Origin": "*"}

    # 1. 관리자 유저 ID와 토큰을 함께 가져옵니다.
    #    getAdminsWithTokens 함수는 (user_id, token) 튜플 리스트를 반환합니다.
    admins = notifyDAO.getAdminsWithTokens()

    if not admins:
        raise HTTPException(status_code=400, detail="관리자 푸시 토큰 없음")

    admin_ids  = [u for (u, _t) in admins]
    admin_toks = [t for (_u, t) in admins]

    # 2. 알림 내용을 DB에 일괄 저장합니다.
    try:
        notifyDAO.insert_notifications_bulk(
            content=f"{title}\n{body}",
            sender="system",
            recipients=admin_ids
        )
    except Exception as e:
        print(f"[notify_admin] DB insert 실패: {e}")
        # DB 저장 실패 시에도 푸시 전송은 계속 진행하도록 합니다.

    # 3. 푸시 알림 전송 로직 (기존 코드 유지)
    tickets, errors = [], []
    async with httpx.AsyncClient(timeout=15) as client:
        # 100개씩 나눠서 알림 전송
        for group in chunk(admin_toks, 100):
            messages = [
                {"to": t, "title": title, "body": body, "data": data or {}, "sound": "default", "channelId": "default", "priority": "high"}
                for t in group
            ]
            resp = await client.post(EXPO_PUSH_URL, json=messages)
            resp.raise_for_status()
            out = resp.json()
            for item in out.get("data", []):
                if item.get("status") == "ok":
                    tickets.append(item.get("id"))
                else:
                    errors.append(item)

    return JSONResponse({"result": {"tickets": tickets, "errors": errors}}, headers=h)
        
@app.post("/notification.notify_repair")
async def send_notification_repair(
    user_id: str = Body(...),
    msg1: dict = Body(...),  # 신고자용 메시지
    msg2: dict = Body(...),  # 주변 사용자용 메시지
):
    h = {"Access-Control-Allow-Origin": "*"}
    
    # 1. 신고자에게 보낼 알림을 DB에 저장합니다.
    try:
        notifyDAO.notify_user(
            content=f"{msg1.get('title','')}\n{msg1.get('body','')}",
            sender="system",
            user_id_or_email=user_id
        )
    except Exception as e:
        print(f"[notify_repair] 신고자 DB insert 실패: {e}")

    # 2. 주변 사용자 목록을 가져와서 알림을 DB에 저장합니다.
    other_tokens, user_ids = notifyDAO.getLocalExpoPushToken()
    recipients_for_db = [uid for uid, t in zip(user_ids, other_tokens) if uid and uid != user_id and t]
    
    try:
        if recipients_for_db:
            notifyDAO.insert_notifications_bulk(
                content=f"{msg2.get('title','')}\n{msg2.get('body','')}",
                sender="system",
                recipients=recipients_for_db
            )
    except Exception as e:
        print(f"[notify_repair] 주변 사용자 DB insert 실패: {e}")

    # 3. 푸시 알림 전송 로직 (기존 코드 유지)
    # messages 리스트를 구성하고, httpx.post를 호출하는 기존 로직은 그대로 두세요.
    # ... (기존 코드) ...
    
    # 이 부분에 `messages` 리스트 구성 및 푸시 전송 로직이 포함됩니다.
    # 이 로직을 정확히 재현하기 위해 `homeController.py`에 있는 기존 `/notification.notify_repair` 코드를
    # 아래의 메시지 리스트 생성 및 httpx 호출 로직으로 교체해야 합니다.

    tickets, errors, total_count = [], [], 0
    async with httpx.AsyncClient(timeout=20) as client:
        messages = []
        # 신고자 메시지
        reporter_token = notifyDAO.getExpoPushToken(user_id)
        if reporter_token:
            messages.append({
                "to": reporter_token,
                "title": msg1.get("title"),
                "body": msg1.get("body"),
                "data": {},
                "sound": "default",
                "channelId": "default",
                "priority": "high",
            })
        
        # 주변 사용자 메시지
        for t, uid in zip(other_tokens, user_ids):
            if uid and uid != user_id and t:
                messages.append({
                    "to": t,
                    "title": msg2.get("title"),
                    "body": msg2.get("body"),
                    "data": {},
                    "sound": "default",
                    "channelId": "default",
                    "priority": "high",
                })

        # Expo는 100개 권장 청크
        CHUNK = 100
        for i in range(0, len(messages), CHUNK):
            chunk_msgs = messages[i:i+CHUNK]
            resp = await client.post(EXPO_PUSH_URL, json=chunk_msgs)
            resp.raise_for_status()
            out = resp.json()
            total_count += len(chunk_msgs)
            for item in out.get("data", []):
                if item.get("status") == "ok":
                    tickets.append(item.get("id"))
                else:
                    errors.append(item)

    return JSONResponse({
        "result": {"tickets": tickets, "errors": errors, "count": total_count}
    }, headers=h)
    
@app.post("/notification.notify_reg")
async def send_notification_reg(user_id: str = Body(), msg1: dict = Body(), msg2: dict = Body()):
    h = {"Access-Control-Allow-Origin": "*"}

    # 알림을 보낼 계정의 토큰 추출
    other_tokens, user_ids = notifyDAO.getLocalExpoPushToken()

    # admin의 토큰만 추출
    admin_tokens = notifyDAO.getAdminExpoPushToken()

    tickets = []
    errors = []

    # 100개씩 나눠서 알림 전송
    async with httpx.AsyncClient(timeout=15) as client:
        
        messages = []
        for idx, t in enumerate(other_tokens):
            if user_ids[idx] != user_id:
                msg = {
                    "to": t,
                    "title": msg2["title"],
                    "body": msg2["body"],
                    "data": msg2["data"],
                    "sound": "default",
                    "channelId": "default",
                    "priority": "high",
                }

                messages.append(msg)

        for t in admin_tokens:
            msg = {
                "to": t,
                "title": msg1["title"],
                "body": msg1["body"],
                "data": msg1["data"],
                "sound": "default",
                "channelId": "default",
                "priority": "high",
            }
            messages.append(msg)

        resp = await client.post(EXPO_PUSH_URL, json=messages)
        resp.raise_for_status()
        out = resp.json()

        # 각 메시지별 ticket 처리
        for item in out["data"]:
            if item["status"] == "ok":
                if "id" in item:
                    tickets.append(item["id"])
            else:
                errors.append(item)  # 개별 실패(토큰 형식 오류 등)

        body = {
            "result": {
                "tickets": tickets,
                "errors": errors,
                "count": len(messages)
            }
        }

        return JSONResponse(body, headers=h)
    
@app.post("/test")
def test():
    h = {"Access-Control-Allow-Origin": "*"}

    other_token, user_ids = notifyDAO.getLocalExpoPushToken()
    body = {
        "other_token": other_token,
        "user_ids": user_ids,
    }

    return JSONResponse(body, headers=h)

# 단건 생성 (USER_ALL / NAME_xxx / LOCATION_xxx 또는 user_id/email 입력)
@app.post("/notifications.create")
def notifications_create(payload: NotificationCreateIn):
    return notifyDAO.insert_notification(
        content=payload.content,
        sender=payload.sender,
        recipient_code=payload.recipient_code,
        sent_at=None,  # 항상 None -> DB가 현재시각 자동 입력
    )

# 여러 대상 일괄 생성
@app.post("/notifications.bulk")
def notifications_bulk(payload: NotificationBulkIn):
    return notifyDAO.insert_notifications_bulk(
        content=payload.content,
        sender=payload.sender,
        recipients=payload.recipients,
        sent_at=None,
    )

# 전 사용자 브로드캐스트
@app.post("/notifications.broadcast_all")
def notifications_broadcast_all(
    content: str = Body(...),
    sender:  str = Body(...),
):
    return notifyDAO.broadcast_all(
        content=content,
        sender=sender,
        sent_at=None,
    )

# 특정 사용자(아이디/이메일)
@app.post("/notifications.notify_user")
def notifications_notify_user(
    content: str = Body(...),
    sender:  str = Body(...),
    user_id_or_email: str = Body(...),
):
    return notifyDAO.notify_user(
        content=content,
        sender=sender,
        user_id_or_email=user_id_or_email,
        sent_at=None,
    )

# 특정 지역(LOCATION_코드 또는 원시값)
@app.post("/notifications.notify_location")
def notifications_notify_location(
    content: str = Body(...),
    sender:  str = Body(...),
    location_code: str = Body(...),  # "SEOUL" / "강남구" / "LOCATION_SEOUL"
):
    return notifyDAO.notify_location(
        content=content,
        sender=sender,
        location_code=location_code,
        sent_at=None,
    )