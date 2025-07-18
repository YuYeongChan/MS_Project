import os # 암호화 키 관리를 위한 모듈 (실제 배포 시 환경 변수 사용 권장)
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager
from passlib.context import CryptContext # 비밀번호 해싱
from cryptography.fernet import Fernet # 강력한 암호화를 위한 라이브러리
from fastapi import UploadFile # UploadFile 타입 힌트를 위해 임포트 (FastAPI에서 사용하는 타입)
from typing import Optional # Optional 타입 힌트를 위해 임포트

from ProjectDB.SSY.ssyFileNameGenerator import SsyFileNameGenerator 

# 아이디: user_test_01
# 비밀번호: password123!

# --- 보안 설정 시작 ---
#       예시: os.getenv("FERNET_KEY").encode()
FERNET_KEY = b"r21VL_bAV6QO7fQsYfrE4yRDtuO2ZCb5TuOCSGb6chc="
if len(FERNET_KEY) < 32:
    raise ValueError("FERNET_KEY는 최소 32바이트의 URL-safe base64-encoded 문자열이어야 합니다.")

try:
    cipher_suite = Fernet(FERNET_KEY)
except Exception as e:
    raise RuntimeError(f"Fernet 키 초기화 실패: {e}. 유효한 키인지 확인하세요.")
# --- 보안 설정 끝 ---

# 비밀번호 해싱을 위한 컨텍스트 (bcrypt 알고리즘 사용)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from fastapi import UploadFile
from typing import Optional

from ProjectDB.SSY.ssyFileNameGenerator import SsyFileNameGenerator 


# --- 보안 설정 시작 (기존과 동일, FERNET_KEY는 환경 변수 권장) ---
FERNET_KEY = b"r21VL_bAV6QO7fQsYfrE4yRDtuO2ZCb5TuOCSGb6chc="
if len(FERNET_KEY) < 32:
    raise ValueError("FERNET_KEY는 최소 32바이트의 URL-safe base64-encoded 문자열이어야 합니다.")

try:
    cipher_suite = Fernet(FERNET_KEY)
except Exception as e:
    raise RuntimeError(f"Fernet 키 초기화 실패: {e}. 유효한 키인지 확인하세요.")
# --- 보안 설정 끝 ---

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AccountDAO:
    def __init__(self):
        self.jwtKey = "your_jwt_secret_key_here" # 실제 배포 시 변경 필수
        self.jwtAlgorithm = "HS256"
        self.profilePhotoFolder = "./profile_photos/" 

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def encrypt_resident_id_number(self, rrn: str) -> str:
        return cipher_suite.encrypt(rrn.encode('utf-8')).decode('utf-8')
    def decrypt_resident_id_number(self, encrypted_rrn: str) -> str:
        return cipher_suite.decrypt(encrypted_rrn.encode('utf-8')).decode('utf-8')
    
    # 1. 회원가입 메서드 (signUp)
    def signUp(self, user_id, password, nickname, name, address, resident_id_number, phone_number=None, profile_pic: Optional[UploadFile] = None):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        profile_pic_filename = None
        file_path = None

        try:
            if profile_pic and profile_pic.filename:
                if not os.path.exists(self.profilePhotoFolder):
                    os.makedirs(self.profilePhotoFolder)
                profile_pic_filename = SsyFileNameGenerator.generate(profile_pic.filename, "date")
                file_path = os.path.join(self.profilePhotoFolder, profile_pic_filename)
                with open(file_path, "wb") as f:
                    f.write(profile_pic.file.read())
        except Exception as e:
            print(f"프로필 사진 저장 실패 (파일 시스템): {str(e)}")
            return JSONResponse({"result": "회원가입 실패", "error": f"프로필 사진 저장 중 오류: {e}"}, headers=h)
        
        try:
            con, cur = SsyDBManager.makeConCur()
            
            hashed_password = self.hash_password(password)
            encrypted_resident_id_number = self.encrypt_resident_id_number(resident_id_number)

            sql = """
                INSERT INTO Users (
                    user_id,            -- DB 순서 2
                    password,           -- DB 순서 3
                    profile_pic_url,    -- DB 순서 4
                    nickname,           -- DB 순서 5
                    name,               -- DB 순서 6
                    phone_number,       -- DB 순서 7 (스키마 순서에 맞춤)
                    address,            -- DB 순서 8 (스키마 순서에 맞춤)
                    resident_id_number, -- DB 순서 9
                    score               -- DB 순서 10
                ) VALUES (
                    :user_id, 
                    :password, 
                    :profile_pic_url,   
                    :nickname, 
                    :name, 
                    :phone_number,      -- 스키마 순서에 맞춤
                    :address,           -- 스키마 순서에 맞춤
                    :resident_id_number, 
                    0                   
                )
            """
            cur.execute(sql, {
                'user_id': user_id,
                'password': hashed_password,
                'profile_pic_url': profile_pic_filename, # 파일 이름 또는 NULL
                'nickname': nickname,
                'name': name,
                'phone_number': phone_number, # 스키마 순서에 맞춤
                'address': address,           # 스키마 순서에 맞춤
                'resident_id_number': encrypted_resident_id_number # 암호화된 주민등록번호
            })
            con.commit()
            return JSONResponse({"result": "회원가입 성공"}, headers=h)
        except Exception as e:
            if con: con.rollback()
            error_message = str(e).upper()
            print(f"회원가입 DB 오류 발생: {error_message}")

            if profile_pic_filename and file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"DB 오류 발생 후 프로필 사진 파일 삭제 완료: {file_path}")
                except Exception as file_e:
                    print(f"오류: DB 삽입 실패 후 프로필 사진 파일 삭제 실패 {file_path}: {file_e}")

            if "ORA-00001" in error_message:
                if "USERS_USER_ID_UK" in error_message or "USER_ID" in error_message:
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 존재하는 사용자 ID입니다."}, headers=h)
                elif "USERS_NICKNAME_UK" in error_message or "NICKNAME" in error_message:
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 존재하는 닉네임입니다."}, headers=h)
                elif "USERS_RESIDENT_ID_NUMBER_UK" in error_message or "RESIDENT_ID_NUMBER" in error_message:
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 등록된 주민등록번호입니다."}, headers=h)
                elif "USERS_PHONE_NUMBER_UK" in error_message or "PHONE_NUMBER" in error_message:
                     return JSONResponse({"result": "회원가입 실패", "error": "이미 등록된 전화번호입니다."}, headers=h)
            return JSONResponse({"result": "회원가입 실패", "error": f"알 수 없는 DB 오류: {e}"}, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # 2. 로그인 메서드 (signIn)
    def signIn(self, user_id, password):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT 
                    password,           -- DB 순서 3
                    profile_pic_url,    -- DB 순서 4
                    nickname,           -- DB 순서 5
                    name,               -- DB 순서 6
                    phone_number,       -- DB 순서 7
                    address,            -- DB 순서 8
                    resident_id_number, -- DB 순서 9
                    score               -- DB 순서 10
                FROM Users
                WHERE user_id = :user_id
            """
            cur.execute(sql, {'user_id': user_id})
            result = cur.fetchone()

            if result:
                # 결과 컬럼 언패킹 순서 (SELECT 쿼리의 컬럼 순서와 일치해야 함)
                hashed_password_db, profile_pic_url, nickname, name, phone_number, address, encrypted_resident_id_number, score = result 
                
                if self.verify_password(password, hashed_password_db):
                    decrypted_resident_id_number = self.decrypt_resident_id_number(encrypted_resident_id_number)
                    
                    payload = {
                        "user_id": user_id,
                        "nickname": nickname,
                        "name": name,
                        "address": address,
                        "resident_id_number": decrypted_resident_id_number,
                        "score": score,
                        "profile_pic_url": profile_pic_url, 
                        "phone_number": phone_number,       
                        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
                    }
                    token = jwt.encode(payload, self.jwtKey, self.jwtAlgorithm)
                    return JSONResponse({"result": "로그인 성공", "token": token}, headers=h)
                return JSONResponse({"result": "로그인 실패: 비밀번호 불일치"}, headers=h)
            return JSONResponse({"result": "로그인 실패: 사용자 ID 없음"}, headers=h)
        except Exception as e:
            print(f"로그인 중 오류 발생: {e}")
            return JSONResponse({"result": f"로그인 DB 오류: {e}"}, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # ---닉네임 중복 확인 메서드 추가 ---
    def checkNicknameDuplicate(self, nickname: str) -> bool:
        """
        데이터베이스에서 닉네임 중복 여부를 확인합니다.
        중복되면 True, 아니면 False를 반환합니다.
        """
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = "SELECT COUNT(*) FROM Users WHERE nickname = :nickname"
            cur.execute(sql, {'nickname': nickname})
            count = cur.fetchone()[0] # 결과의 첫 번째 컬럼 (COUNT 값)

            return count > 0 # count가 0보다 크면 중복

        except Exception as e:
            print(f"닉네임 중복 확인 중 오류 발생: {str(e)}")
            # 오류 발생 시 중복이 아니라고 가정하거나, 더 상세한 에러 처리를 할 수 있습니다.
            # 여기서는 단순히 False를 반환하여 클라이언트가 계속 진행하게 하지만,
            # 실제로는 HTTPException을 발생시켜 서버 오류를 알리는 것이 좋습니다.
            return False 
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    #---id 중복 확인 메서드 추가
    def checkUserIdDuplicate(self, user_id: str) -> bool: # <<< 메서드 이름과 파라미터 이름 정확히 확인
        """
        데이터베이스에서 사용자 ID(이메일) 중복 여부를 확인합니다.
        """
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = "SELECT COUNT(*) FROM Users WHERE user_id = :user_id" # SQL 쿼리 및 바인딩 이름 확인
            cur.execute(sql, {'user_id': user_id})
            count = cur.fetchone()[0]
            return count > 0
        except Exception as e:
            print(f"사용자 ID 중복 확인 중 오류 발생: {str(e)}")
            return False # 오류 발생 시에도 False를 반환하므로, 서버 로그를 잘 확인해야 함
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)