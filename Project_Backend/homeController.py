import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from fastapi import FastAPI, Form, UploadFile, HTTPException
from ProjectDB.Account.accountDAO import AccountDAO
from ProjectDB.Registration.RegistrationDAO import RegistrationDAO
from ProjectDB.ManagementStatus.ManagementStatusDAO import ManagementStatusDAO
from fastapi import FastAPI, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware # <<< 이 줄을 추가해주세요!
from typing import Optional

# ex ) http://195.168.9.232:1234/computer.get?page=1
# ex ) http://192.168.56.1:1234//account.sign.up
# uvicorn homeController:app --host=0.0.0.0 --port=1234 --reload
# ip 주소 계속 바뀜 :195.168.9.69
app = FastAPI()

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
    user_id: str = Form(...), # DDL 및 DAO에 맞춰 'username'에서 'user_id'로 변경
    password: str = Form(...),
    nickname: str = Form(...),
    name: str = Form(...), # DDL 및 DAO에 맞춰 'full_name'에서 'name'으로 변경
    phone_number: Optional[str] = Form(None),
    address: str = Form(...),
    resident_id_number: str = Form(...)# DDL 및 DAO에 맞춰 'rrn'에서 'resident_id_number'로 변경
):
    # DAO 메서드 호출 시 인자명도 변경된 이름에 맞춰 전달
    return aDAO.signUp(user_id, password, nickname, name, phone_number, address, resident_id_number)

# 로그인 API 엔드포인트
@app.post("/account.sign.in")
def accountSignIn(
    user_id: str = Form(...), # DDL 및 DAO에 맞춰 'username'에서 'user_id'로 변경
    password: str = Form(...)
):
    # DAO 메서드 호출 시 인자명 변경
    return aDAO.signIn(user_id, password)

@app.get("/account.check.nickname")
def checkNickname(nickname: str): # 쿼리 파라미터로 닉네임을 받습니다.
    """
    닉네임 중복 여부를 확인하는 API 엔드포인트.
    """
    is_duplicate = aDAO.checkNicknameDuplicate(nickname) # DAO 메서드 호출

    if is_duplicate:
        # 중복일 경우 409 Conflict 상태 코드와 함께 메시지 반환
        # 클라이언트에서 이 상태 코드를 받아서 중복 여부를 판단할 수 있습니다.
        raise HTTPException(status_code=409, detail="중복된 닉네임입니다.")
    else:
        # 중복이 아닐 경우 200 OK 상태 코드와 함께 메시지 반환
        return {"result": "사용 가능한 닉네임입니다."}
    
@app.get("/account.check.userid") # <<< 이 부분의 엔드포인트 이름과 메서드(GET)를 정확히 확인
def checkUserId(user_id: str): # 쿼리 파라미터 이름도 정확히 확인
    """
    사용자 ID(이메일) 중복 여부를 확인하는 API 엔드포인트.
    """
    # 이 메서드를 호출하기 전에 DAO 메서드 이름이 정확한지 확인
    is_duplicate = aDAO.checkUserIdDuplicate(user_id)

    if is_duplicate:
        raise HTTPException(status_code=409, detail="이미 사용 중인 사용자 ID입니다.")
    else:
        return {"result": "사용 가능한 사용자 ID입니다."}


# 신고 등록 API 엔드포인트
@app.post("/registration.write")
async def registrationWrite(
    photo: UploadFile,
    location_description: str = Form(...), # DDL 및 DAO에 맞춰 'location'에서 'location_description'으로 변경
    latitude: float = Form(...), # 새롭게 추가된 위도 필드
    longitude: float = Form(...), # 새롭게 추가된 경도 필드
    user_id: str = Form(...), # DDL 및 DAO에 맞춰 'registrant_nickname'에서 'user_id'로 변경 (외래키 연결)
    details: str = Form(...),
    report_date: str = Form(...)
):
    # DAO 메서드 호출 시 모든 인자 전달
    return await rDAO.registerFacility(photo, location_description, latitude, longitude, user_id, details, report_date)

# 신고 목록 조회 API 엔드포인트
@app.get("/registration.list")
def registrationList():
    return rDAO.getAllRegistrations()

# 관리 상태 등록 API 엔드포인트
@app.post("/management.status.add")
def addManagementStatus(
    report_id: int = Form(...), # DDL 및 DAO에 맞춰 'registration_id'에서 'report_id'로 변경
    current_status: str = Form(...), # DDL 및 DAO에 맞춰 'status'에서 'current_status'로 변경
    damage_info_details: str = Form(...), # DDL 및 DAO에 맞춰 'damage_info'에서 'damage_info_details'로 변경
    facility_type: str = Form(...),
    manager_nickname: str = Form(...),
    manager_comments: str = Form(None) # 선택적(Optional) 파라미터 추가
):
    # 'location' 파라미터는 Maintenance_Status 테이블의 직접적인 컬럼이 아니므로 제거
    return msDAO.addStatus(report_id, current_status, damage_info_details, facility_type, manager_nickname, manager_comments)

# 관리 상태 전체 조회 API 엔드포인트
@app.get("/management.status.list")
def getManagementStatusList():
    return msDAO.getAllStatuses()