import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from fastapi import FastAPI, Form, UploadFile, HTTPException, File
from ProjectDB.Account.accountDAO import AccountDAO
from ProjectDB.Registration.RegistrationDAO import RegistrationDAO
from ProjectDB.ManagementStatus.ManagementStatusDAO import ManagementStatusDAO
from fastapi.middleware.cors import CORSMiddleware # <<< 이 줄을 추가해주세요!
from typing import Optional
from fastapi.staticfiles import StaticFiles
import os

# FastAPI 앱 생성
app = FastAPI()
# 서버 루트 기준 상대 경로 (이미 프로필 사진이 여기에 저장되고 있음)
profile_photo_folder = os.path.join(os.path.dirname(__file__), 'profile_photos')

# 폴더가 없다면 생성
os.makedirs(profile_photo_folder, exist_ok=True)

# "/profile_photos" 경로로 해당 폴더를 정적 파일 제공
app.mount("/profile_photos", StaticFiles(directory=profile_photo_folder), name="profile_photos")
from fastapi.responses import JSONResponse
# ex ) http://195.168.9.232:1234/computer.get?page=1
# ex ) http://192.168.56.1:1234//account.sign.up
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

# DAO 인스턴스 생성
aDAO = AccountDAO()
rDAO = RegistrationDAO()
msDAO = ManagementStatusDAO()

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
def accountSignIn(
    user_id: str = Form(...),
    password: str = Form(...)
):
    return aDAO.signIn(user_id, password)

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