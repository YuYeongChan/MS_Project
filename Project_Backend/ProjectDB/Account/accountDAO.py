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
        self.jwtKey = os.environ.get("JWT_SECRET_KEY", "your_jwt_secret_key_here_please_change_this_to_a_strong_key") # 실제 배포 시 변경 필수
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
                upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'profile_photos')
                os.makedirs(upload_dir, exist_ok=True) 
                profile_pic_filename = SsyFileNameGenerator.generate(profile_pic.filename, "date")
                file_path = os.path.join(upload_dir, profile_pic_filename)
                with open(file_path, "wb") as f:
                    f.write(profile_pic.file.read())
                
                # profile_pic_url_for_db = f"/profile_photos/{profile_pic_filename}" 
                profile_pic_url_for_db = profile_pic_filename # 파일명만 저장
            else:
                profile_pic_url_for_db = None

        except Exception as e:
            print(f"프로필 사진 저장 실패 (파일 시스템): {str(e)}")
            #  status_code 추가
            return JSONResponse({"result": "회원가입 실패", "error": f"프로필 사진 저장 중 오류: {e}"}, status_code=500, headers=h)
        
        try:
            con, cur = SsyDBManager.makeConCur()
            
            hashed_password = self.hash_password(password)

            # 여기 추가: 주민등록번호 암호화 전/후 값 확인
            print(f"DEBUG: Plain resident_id_number: {resident_id_number}")
            encrypted_resident_id_number = self.encrypt_resident_id_number(resident_id_number)
            print(f"DEBUG: Encrypted resident_id_number: {encrypted_resident_id_number}")


            sql = """
                INSERT INTO Users (
                    user_id, password, profile_pic_url, nickname, name, 
                    phone_number, address, resident_id_number, score 
                ) VALUES (
                    :user_id, :password, :profile_pic_url, :nickname, :name, 
                    :phone_number, :address, :resident_id_number, 0 
                )
            """ 
            # 여기 추가: SQL 쿼리 및 파라미터 확인
            print(f"DEBUG: SQL query for signUp: {sql}")
            print(f"DEBUG: SQL params for signUp: {{'user_id': {user_id}, ..., 'resident_id_number': {encrypted_resident_id_number}}}") # 다른 파라미터도 포함하여 출력
            cur.execute(sql, {
                'user_id': user_id,
                'password': hashed_password,
                'profile_pic_url': profile_pic_url_for_db, 
                'nickname': nickname,
                'name': name,
                'phone_number': phone_number,
                'address': address,
                'resident_id_number': encrypted_resident_id_number 
            })
            con.commit()
            #  status_code 추가
            return JSONResponse({"result": "회원가입 성공"}, status_code=200, headers=h)
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
                import re # 정규식 사용을 위해 임포트 추가
                constraint_match = re.search(r'\(SSY\.([A-Z0-9_]+)\)', error_message)
                constraint_name = constraint_match.group(1) if constraint_match else ""

                #  여기 추가: 어떤 제약조건이 위배되었는지 정확히 로그에 남김
                print(f"DEBUG: Violated Constraint Name: {constraint_name}")

                if "USERS_USER_ID_UK" in constraint_name or "USER_ID" in constraint_name:
                    #  status_code 추가
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 존재하는 사용자 ID입니다."}, status_code=409, headers=h)
                elif "USERS_NICKNAME_UK" in constraint_name or "NICKNAME" in constraint_name:
                    # status_code 추가
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 존재하는 닉네임입니다."}, status_code=409, headers=h)
                elif "SYS_C0024095" in constraint_name: #  status_code 추가
                    # 이 제약조건 이름은 DB마다 다를 수 있으므로 DDL에 명시적 이름 부여 권장
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 등록된 전화번호입니다"}, status_code=409, headers=h)
                elif "SYS_C0024091" in constraint_name or "PHONE_NUMBER" in constraint_name:
                    #  status_code 추가
                    return JSONResponse({"result": "회원가입 실패", "error": "이미 등록된 주민등록번호입니다."}, status_code=409, headers=h)
                else: 
                    #  status_code 추가
                    return JSONResponse({"result": "회원가입 실패", "error": f"중복된 정보가 있습니다: {constraint_name}"}, status_code=409, headers=h)
            
            # ORA-00001이 아닌 다른 DB 오류
            #  status_code 추가
            return JSONResponse({"result": "회원가입 실패", "error": f"알 수 없는 DB 오류: {e}"}, status_code=500, headers=h)
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
                    password, profile_pic_url, nickname, name, 
                    phone_number, address, resident_id_number, score,
                    is_admin
                FROM Users
                WHERE user_id = :user_id
            """ 
            cur.execute(sql, {'user_id': user_id})
            result = cur.fetchone() 

            if result:
                (hashed_password_db, profile_pic_url, nickname, name, 
                 phone_number, address, encrypted_resident_id_number, 
                 score, is_admin) = result 
                
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
                        "role": "admin" if int(is_admin) == 1 else "user",  #  role 추가
                        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
                    }
                    token = jwt.encode(payload, self.jwtKey, self.jwtAlgorithm)
                    return JSONResponse({"result": "로그인 성공", "token": token}, status_code=200, headers=h)

                return JSONResponse({"result": "로그인 실패: 비밀번호 불일치"}, status_code=401, headers=h)

            return JSONResponse({"result": "로그인 실패: 사용자 ID 없음"}, status_code=404, headers=h)

        except Exception as e:
            print(f"로그인 중 오류 발생: {e}")
            return JSONResponse({"result": f"로그인 DB 오류: {e}"}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # ---닉네임 중복 확인 메서드 추가 ---
    def checkNicknameDuplicate(self, nickname: str) -> bool:
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = "SELECT COUNT(*) FROM Users WHERE nickname = :nickname"
            cur.execute(sql, {'nickname': nickname})
            count = cur.fetchone()[0]

            return count > 0 
        except Exception as e:
            print(f"닉네임 중복 확인 중 오류 발생: {str(e)}")
            # 이 메서드는 True/False를 반환하므로 JSONResponse를 반환하지 않습니다.
            # HTTP 500 에러는 FastAPI 엔드포인트에서 HTTPException을 발생시켜야 합니다.
            return False 
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)
    

    #---id 중복 확인 메서드 추가
    def checkUserIdDuplicate(self, user_id: str) -> bool:
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = "SELECT COUNT(*) FROM Users WHERE user_id = :user_id"
            cur.execute(sql, {'user_id': user_id})
            count = cur.fetchone()[0]
            return count > 0
        except Exception as e:
            print(f"사용자 ID 중복 확인 중 오류 발생: {str(e)}")
            # 이 메서드도 True/False를 반환하므로 JSONResponse를 반환하지 않습니다.
            return False 
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)
    
    #--- 랭킹 조회 메서드
    def getRanking(self, userId: str, limit: int = 100):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None

        # 상위 랭크 100명까지 조회
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT profile_pic_url, user_id, nickname, score, RANK() OVER (ORDER BY score DESC) AS rank
                FROM Users 
                ORDER BY score DESC 
                FETCH FIRST :limit ROWS ONLY
            """
            cur.execute(sql, {'limit': limit})

            ranking_list = []
            for profile, user_id, nickname, score, rank in cur:
                ranking_list.append({
                    "profile_pic_url": profile,
                    "user_id": user_id,
                    "nickname": nickname,
                    "score": score,
                    "rank": rank
                })

        except Exception as e:
            print(f"랭킹 조회 중 오류 발생: {e}")
            return JSONResponse({"result": f"랭킹 조회 DB 오류: {e}"}, status_code=500, headers=h)
        
        # 내 등수 조회
        try:
            sql = """
                SELECT profile_pic_url, user_id, nickname, score, RANK() OVER (ORDER BY score DESC) AS rank
                FROM Users 
                WHERE user_id = :userId
                ORDER BY score DESC
            """
            cur.execute(sql, {'userId': userId})

            myRanking = []
            for profile, user_id, nickname, score, rank in cur:
                myRanking.append({
                    "profile_pic_url": profile,
                    "user_id": user_id,
                    "nickname": nickname,
                    "score": score,
                    "rank": rank
                })

            rankingData = {
                "result": "랭킹 조회 성공",
                "ranking": ranking_list,
                "myRanking": myRanking
            }

            return JSONResponse(rankingData, status_code=200, headers=h)

        except Exception as e:
            print(f"랭킹 조회 중 오류 발생: {e}")
            return JSONResponse({"result": f"랭킹 조회 DB 오류: {e}"}, status_code=500, headers=h)
        
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)
    