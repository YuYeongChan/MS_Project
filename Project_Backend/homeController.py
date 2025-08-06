import sys
import os
from fastapi import FastAPI, Form, UploadFile, HTTPException, File, BackgroundTasks, APIRouter # APIRouter 임포트 유지
from ProjectDB.Account.accountDAO import AccountDAO
from ProjectDB.Registration.RegistrationDAO import RegistrationDAO
from ProjectDB.ManagementStatus.ManagementStatusDAO import ManagementStatusDAO
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from fastapi.staticfiles import StaticFiles
import shutil # shutil 임포트 유지
import json # json 임포트 유지
from datetime import datetime, timedelta
import jwt
#개인정보 수정
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, Header
from pydantic import BaseModel

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

SECRET_KEY = SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your_jwt_secret_key_here_please_change_this_to_a_strong_key")
ALGORITHM = "HS256"

# DAO 인스턴스 생성
aDAO = AccountDAO()
rDAO = RegistrationDAO()
msDAO = ManagementStatusDAO()

#JWT 함수들(개인정보수정 토큰)
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
    
#개인정보 수정 
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




# "/profile_photos" 경로로 해당 폴더를 정적 파일 제공
app.mount("/profile_photos", StaticFiles(directory=UPLOAD_PROFILE_DIR), name="profile_photos")

# registration_photos(공공시설물) 경로 설정
registration_photo_folder = os.path.join(os.path.dirname(__file__), 'registration_photos')
os.makedirs(registration_photo_folder, exist_ok=True)
app.mount("/registration_photos", StaticFiles(directory=registration_photo_folder), name="registration_photos")

from fastapi.responses import JSONResponse
# ex ) http://195.168.9.232:1234/computer.get?page=1
# uvicorn homeController:app --host=0.0.0.0 --port=1234 --reload
# ip 주소 계속 바뀜 :195.168.9.69

# origins = [
#     "http://localhost",
#     "http://localhost:1234", # React Native 개발 서버 기본 포트
#     "exp://192.168.56.1:1234", # 예: "exp://192.168.1.100:19000"
#     # 실제 기기에서 테스트 시, 개발 머신의 IP 주소를 사용하여 Expo Go 앱의 URL을 추가합니다.
#     # 예시: "exp://192.168.1.100:19000" (자신의 IP 주소와 Expo 포트에 맞게 변경)
#     "*" # 개발 목적으로 모든 Origin 허용. 배포 시 반드시 제거!
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,       # 허용할 Origin 목록
#     allow_credentials=True,      # 인증 정보 (쿠키 등) 포함 요청 허용
#     allow_methods=["*"],         # 모든 HTTP 메서드 (GET, POST 등) 허용
#     allow_headers=["*"],         # 모든 HTTP 헤더 허용
# )


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


# 신고 등록 API 엔드포인트
@app.post("/registration.write")
async def registrationWrite(
    photo: UploadFile,
    location_description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: str = Form(...),
    details: str = Form(...),
    report_date: str = Form(...)
):
    return await rDAO.registerFacility(photo, location_description, latitude, longitude, user_id, details, report_date)

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
    reports = rDAO.getAllDamageReportLocations()
    if reports is None:
        raise HTTPException(status_code=500, detail="데이터베이스에서 보고서를 가져오는 데 실패했습니다.")
    return {"result": reports}



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