import os
from datetime import datetime

from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager 
from ProjectDB.SSY.ssyFileNameGenerator import SsyFileNameGenerator 


class RegistrationDAO:
    def __init__(self):
        self.photoFolder = "./registration_photos/" 
        
    async def registerFacility(self, photo, location_description, latitude, longitude, user_id, details, report_date):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        filename = None
        file_path = None

        try:
            upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'registration_photos')
            os.makedirs(upload_dir, exist_ok=True) 

            content = await photo.read()
            filename = SsyFileNameGenerator.generate(photo.filename, "date")
            file_path = os.path.join(upload_dir, filename) 

            with open(file_path, "wb") as f:
                f.write(content)

            photo_url_for_db = f"/registration_photos/{filename}" 

        except Exception as e:
            error_msg = f"신고 사진 저장 실패 (파일 시스템): {str(e)}"
            print(f"ERROR: {error_msg}")
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
                'photo_url': photo_url_for_db, 
                'location_description': location_description,
                'latitude': latitude,
                'longitude': longitude,
                'report_date': parsed_report_date, 
                'details': details,
            })
            con.commit()
            print("INFO: 신고 등록 DB 커밋 성공.") 
            return JSONResponse({"result": "신고 등록 성공"}, status_code=200, headers=h)
        
        except Exception as e:
            if con: con.rollback()
            if filename and file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"INFO: DB 삽입 실패 후 신고 사진 파일 삭제 완료: {file_path}")
                except Exception as file_e:
                    print(f"ERROR: DB 삽입 실패 후 신고 사진 파일 삭제 실패 {file_path}: {file_e}")
            
            error_msg = f"신고 등록 DB 오류 발생: {str(e)}"
            print(f"ERROR: {error_msg}") 
            return JSONResponse({"result": "신고 실패", "error": error_msg}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

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
                # 튜플 인덱스로 접근하도록 수정 (SELECT 쿼리 순서에 맞춰서)
                # report_id: 0, user_id: 1, photo_url: 2, location_description: 3,
                # latitude: 4, longitude: 5, report_date: 6, details: 7
                details_data = r[7] # details 컬럼 (8번째, 인덱스 7)
                if hasattr(details_data, 'read'): # BLOB/TEXT 컬럼 처리 로직 (필요하다면 유지)
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
            return {"result": "조회 성공", "data": result}
        except Exception as e:
            print(f"ERROR: {str(e)}") 
            return {"result": "조회 실패", "error": str(e)}
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)
    
    def getAllDamageReportLocations(self):
        con, cur = None, None 
        try:
            con, cur = SsyDBManager.makeConCur() 
            sql = """
            SELECT report_id, latitude, longitude, location_description
            FROM Reports 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY report_date DESC
            """ #  SQL 문장 끝의 세미콜론(;)이 없어야 합니다. 
            
            print(f"Executing SQL in getAllDamageReportLocations: {sql}") 

            cur.execute(sql)
            results = cur.fetchall() # 튜플 리스트 반환

            processed_results = []
            for row in results:
                # 튜플 인덱스로 접근하도록 수정 (SELECT 쿼리 순서에 맞춰서)
                # report_id: 0, latitude: 1, longitude: 2, location_description: 3
                processed_results.append({
                    "report_id": row[0],
                    "latitude": row[1],
                    "longitude": row[2],
                    "address": row[3] # location_description 컬럼 (4번째, 인덱스 3)
                })
            return processed_results
        except Exception as e:
            print(f"ERROR in getAllDamageReportLocations: {e}")
            return None
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)