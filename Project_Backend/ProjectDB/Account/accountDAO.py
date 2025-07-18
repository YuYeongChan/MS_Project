import os # 암호화 키 관리를 위한 모듈 (실제 배포 시 환경 변수 사용 권장)
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager
from passlib.context import CryptContext # 비밀번호 해싱
from cryptography.fernet import Fernet # 강력한 암호화를 위한 라이브러리


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

class AccountDAO:
    def __init__(self):
        # JWT 키도 실제 환경에서는 환경 변수 등으로 관리해야 합니다.
        self.jwtKey = "your_jwt_secret_key_here" # 실제 배포 시 변경 필수
        self.jwtAlgorithm = "HS256"

    # 비밀번호 해싱
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    # 비밀번호 검증
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    # 주민등록번호 암호화
    def encrypt_resident_id_number(self, rrn: str) -> str:
        return cipher_suite.encrypt(rrn.encode('utf-8')).decode('utf-8')

    # 주민등록번호 복호화
    def decrypt_resident_id_number(self, encrypted_rrn: str) -> str:
        return cipher_suite.decrypt(encrypted_rrn.encode('utf-8')).decode('utf-8')
    
    # 회원가입 데이터 저장
    def signUp(self, user_id, password, nickname, name, address, resident_id_number, phone_number=None): # <<< phone_number 추가!
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            
            # 비밀번호 해싱
            hashed_password = self.hash_password(password)
            # 주민등록번호 암호화
            encrypted_resident_id_number = self.encrypt_resident_id_number(resident_id_number)

            sql = """
                INSERT INTO Users (
                    user_id, password, nickname, name, address, resident_id_number, phone_number, score, profile_pic_url
                ) VALUES (
                    :user_id, :password, :nickname, :name, :address, :resident_id_number, :phone_number, 0, NULL
                )
            """
            cur.execute(sql, {
                'user_id': user_id,
                'password': hashed_password,
                'nickname': nickname,
                'name': name,
                'address': address,
                'resident_id_number': encrypted_resident_id_number,
                'phone_number': phone_number # <<< SQL 바인딩에도 phone_number 추가!
            })
            con.commit()
            return JSONResponse({"result": "회원가입 성공"}, headers=h)
        except Exception as e:
            if con: con.rollback()
            error_message = str(e).upper()
            print(f"회원가입 DB 오류 발생: {error_message}") # 디버깅을 위해 상세 오류 출력

            if "ORA-00001" in error_message: # Oracle UNIQUE 제약조건 위반 오류 코드
                if "USERS_USER_ID_UK" in error_message or "USER_ID" in error_message: # 좀 더 일반적인 방식으로 변경
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 존재하는 사용자 ID입니다."}, headers=h)
                elif "USERS_NICKNAME_UK" in error_message or "NICKNAME" in error_message:
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 존재하는 닉네임입니다."}, headers=h)
                elif "USERS_RESIDENT_ID_NUMBER_UK" in error_message or "RESIDENT_ID_NUMBER" in error_message:
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 등록된 주민등록번호입니다."}, headers=h)
                elif "USERS_PHONE_NUMBER_UK" in error_message or "PHONE_NUMBER" in error_message: # 전화번호 중복 제약 추가 시
                     return JSONResponse({"result": "회원가입 실패", "error": "이미 등록된 전화번호입니다."}, headers=h)
            return JSONResponse({"result": "회원가입 실패", "error": f"알 수 없는 DB 오류: {e}"}, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    def signIn(self, user_id, password):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None # 초기화
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT password, nickname, name, address, resident_id_number, score
                FROM Users
                WHERE user_id = :user_id
            """
            cur.execute(sql, {'user_id': user_id})
            result = cur.fetchone()

            if result:
                hashed_password_db, nickname, name, address, encrypted_resident_id_number, score = result
                
                # 비밀번호 검증
                if self.verify_password(password, hashed_password_db):
                    # 로그인 성공 시에만 주민등록번호 복호화
                    decrypted_resident_id_number = self.decrypt_resident_id_number(encrypted_resident_id_number)
                    
                    payload = {
                        "user_id": user_id,
                        "nickname": nickname,
                        "name": name,
                        "address": address,
                        "resident_id_number": decrypted_resident_id_number, # 복호화된 주민등록번호
                        "score": score,
                        "exp": datetime.now(timezone.utc) + timedelta(hours=1), # 토큰 만료 시간
                    }
                    token = jwt.encode(payload, self.jwtKey, self.jwtAlgorithm)
                    return JSONResponse({"result": "로그인 성공", "token": token}, headers=h)
                return JSONResponse({"result": "로그인 실패: 비밀번호 불일치"}, headers=h)
            return JSONResponse({"result": "로그인 실패: 사용자 ID 없음"}, headers=h)
        except Exception as e:
            return JSONResponse({"result": f"DB 오류: {e}"}, headers=h)
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