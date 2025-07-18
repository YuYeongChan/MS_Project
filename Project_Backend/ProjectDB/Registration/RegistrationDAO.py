import os
from datetime import datetime # datetime 임포트 필요!
from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager
from ProjectDB.SSY.ssyFileNameGenerator import SsyFileNameGenerator


class RegistrationDAO:
    def __init__(self):
        self.photoFolder = "./registration_photos/" 

    # registerFacility 메서드 시그니처 변경: report_date 파라미터 추가
    async def registerFacility(self, photo, location_description, latitude, longitude, user_id, details, report_date): # <<< report_date 추가
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        filename = None
        file_path = None # 에러 시 파일 경로를 알 수 있도록 try 블록 바깥에서 초기화

        try:
            if not os.path.exists(self.photoFolder):
                os.makedirs(self.photoFolder)

            content = await photo.read()
            filename = SsyFileNameGenerator.generate(photo.filename, "date")
            file_path = os.path.join(self.photoFolder, filename)

            with open(file_path, "wb") as f:
                f.write(content)

        except Exception as e:
            error_msg = f"신고 사진 저장 실패 (파일 시스템): {str(e)}"
            print(f"ERROR: {error_msg}") # ERROR 명시적으로 표시
            # --- 수정: 상태 코드를 500 Internal Server Error로 변경 (기존과 동일) ---
            return JSONResponse({"result": "신고 실패", "error": error_msg}, status_code=500, headers=h)

        try:
            con, cur = SsyDBManager.makeConCur()

            parsed_report_date = datetime.strptime(report_date, "%Y-%m-%d")

            sql = """
                INSERT INTO Reports (
                    user_id, photo_url, location_description, latitude, longitude, report_date, details
                ) VALUES (
                    :user_id, :photo_url, :location_description, :latitude, :longitude, :report_date, :details
                )
            """
            cur.execute(sql, {
                'user_id': user_id,
                'photo_url': filename,
                'location_description': location_description,
                'latitude': latitude,
                'longitude': longitude,
                'report_date': parsed_report_date,
                'details': details,
            })
            con.commit()
            print("INFO: 신고 등록 DB 커밋 성공.") # 성공 로그 추가
            return JSONResponse({"result": "신고 등록 성공"}, status_code=200, headers=h) # 성공 시 200 OK 명시
        
        except Exception as e:
            if con: con.rollback()
            # DB 삽입 실패 시 저장된 사진 파일 삭제
            if filename and file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"INFO: DB 삽입 실패 후 신고 사진 파일 삭제 완료: {file_path}")
                except Exception as file_e:
                    print(f"ERROR: DB 삽입 실패 후 신고 사진 파일 삭제 실패 {file_path}: {file_e}")
            
            error_msg = f"신고 등록 DB 오류 발생: {str(e)}"
            print(f"ERROR: {error_msg}") # ERROR 명시적으로 표시

            # --- 수정: 상태 코드를 500 Internal Server Error로 변경 (기존과 동일) ---
            return JSONResponse({"result": "신고 실패", "error": error_msg}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # getAllRegistrations 메서드는 동일 (변경 없음)
    def getAllRegistrations(self):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT report_id, user_id, photo_url, location_description, latitude, longitude, report_date, details
                FROM Reports ORDER BY report_date DESC
            """
            cur.execute(sql)
            rows = cur.fetchall()
            result = []
            for r in rows:
                details_data = r[7]
                if hasattr(details_data, 'read'):
                    details_data = details_data.read()
                    if isinstance(details_data, bytes):
                        details_data = details_data.decode('utf-8')

                result.append({
                    "report_id": r[0],
                    "user_id": r[1],
                    "photo_url": r[2],
                    "location_description": r[3],
                    "latitude": r[4],
                    "longitude": r[5],
                    "report_date": r[6].strftime("%Y-%m-%d %H:%M:%S") if r[6] else None,
                    "details": details_data,
                })
            return JSONResponse({"result": "조회 성공", "data": result}, headers=h)
        except Exception as e:
            return JSONResponse({"result": "조회 실패", "error": str(e)}, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)
