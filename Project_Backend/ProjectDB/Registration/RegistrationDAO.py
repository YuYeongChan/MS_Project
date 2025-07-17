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
            return JSONResponse({"result": "사진 저장 실패", "error": str(e)}, headers=h)

        try:
            con, cur = SsyDBManager.makeConCur()

            # --- 날짜 형식 변환 ---
            # 'YYYY/MM/DD' 형식의 문자열을 Python의 datetime 객체로 변환합니다.
            # 예: "2025/07/17" -> datetime.datetime(2025, 7, 17, 0, 0)
            # 클라이언트에서 보낸 날짜를 그대로 사용합니다.
            parsed_report_date = datetime.strptime(report_date, "%Y/%m/%d")

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
                'details': details,
                'report_date': parsed_report_date, # <<< SYSTIMESTAMP 대신 클라이언트에서 받은 날짜 사용
            })
            con.commit()
            return JSONResponse({"result": "신고 등록 성공"}, headers=h)
        except Exception as e:
            if con: con.rollback()
            if filename and file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as file_e:
                    print(f"오류: DB 삽입 실패 후 임시 파일 삭제 실패 {file_path}: {file_e}")
            return JSONResponse({"result": "신고 등록 실패", "error": str(e)}, headers=h)
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
