import os
from datetime import datetime
import oracledb  # python-oracledb
from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager
from ProjectDB.SSY.ssyFileNameGenerator import SsyFileNameGenerator


class RegistrationDAO:
    def __init__(self):
        # 앱 기준 업로드 루트
        self.photoFolder = "./registration_photos/"
        os.makedirs(self.photoFolder, exist_ok=True)

    async def registerFacility(self, photo, location_description, latitude, longitude, user_id, details, report_date):
        """
        1) 사진 저장
        2) Reports INSERT (RETURNING report_id)  ← repair_status=0 명시
        3) 같은 트랜잭션에서 Maintenance_Status INSERT('접수')
        4) 실패 시 롤백 + 파일 삭제
        """
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        filename = None
        file_path = None

        # ------------------------------------------------------------------
        # 1) 사진 저장
        # ------------------------------------------------------------------
        try:
            upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'registration_photos')
            os.makedirs(upload_dir, exist_ok=True)

            content = await photo.read()
            filename = SsyFileNameGenerator.generate(photo.filename, "date")
            file_path = os.path.join(upload_dir, filename)

            with open(file_path, "wb") as f:
                f.write(content)

            photo_url_for_db = filename
        except Exception as e:
            error_msg = f"신고 사진 저장 실패 (파일 시스템): {str(e)}"
            print(f"ERROR: {error_msg}")
            return JSONResponse({"result": "신고 실패", "error": error_msg}, status_code=500, headers=h)

        # ------------------------------------------------------------------
        # 2) DB INSERT
        # ------------------------------------------------------------------
        try:
            con, cur = SsyDBManager.makeConCur()

            # 날짜/시간 파싱
            try:
                parsed_report_date = datetime.strptime(report_date, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                try:
                    date_only = datetime.strptime(report_date, "%Y-%m-%d")
                    now_time = datetime.now().time()
                    parsed_report_date = datetime.combine(date_only.date(), now_time)
                except ValueError as ve:
                    error_msg = f"날짜 형식 오류: {report_date} - {ve}"
                    print(f"ERROR: {error_msg}")
                    return JSONResponse({"result": "신고 실패", "error": error_msg}, status_code=400, headers=h)

            # is_normal: 0=파손(기본), 1=정상
            is_normal = 0
            # repair_status: 0=대기(기본), 1=완료
            repair_status = 0

            # Reports INSERT + RETURNING
            rid = cur.var(oracledb.NUMBER)
            sql_reports = """
                INSERT INTO Reports (
                    user_id, photo_url, location_description, latitude, longitude,
                    report_date, details, is_normal, repair_status
                ) VALUES (
                    :user_id, :photo_url, :location_description, :latitude, :longitude,
                    :report_date, :details, :is_normal, :repair_status
                )
                RETURNING report_id INTO :rid
            """
            cur.execute(sql_reports, {
                'user_id': user_id,
                'photo_url': photo_url_for_db,
                'location_description': location_description,
                'latitude': latitude,
                'longitude': longitude,
                'report_date': parsed_report_date,
                'details': details,
                'is_normal': is_normal,
                'repair_status': repair_status,
                'rid': rid
            })
            report_id = int(rid.getvalue()[0])

            # Maintenance_Status INSERT (초기 상태 '접수')
            sql_ms = """
                INSERT INTO Maintenance_Status (
                    status_id, report_id, current_status, damage_info_details, facility_type, manager_nickname, manager_comments, last_updated_date
                ) VALUES (
                    maintenance_status_seq.NEXTVAL, :report_id, '접수', NULL, NULL, NULL, NULL, SYSTIMESTAMP
                )
            """
            cur.execute(sql_ms, {"report_id": report_id})

            con.commit()
            print("INFO: 신고 등록 + 상태 초기화 커밋 성공.")
            return JSONResponse({"result": "신고 등록 성공", "report_id": report_id, "photo_url": photo_url_for_db}, status_code=200, headers=h)

        except Exception as e:
            if con:
                con.rollback()
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
            if cur:
                SsyDBManager.closeConCur(con, cur)

    # ----------------------------------------------------------------------
    # 상태 포함 전체 목록 조회
    # ----------------------------------------------------------------------
    def getAllRegistrations(self):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT
                    r.report_id,
                    r.user_id,
                    r.photo_url,
                    r.location_description,
                    r.latitude,
                    r.longitude,
                    r.report_date,
                    r.details,
                    r.is_normal,
                    r.repair_status,          -- 추가
                    m.status_id,
                    m.current_status,
                    m.manager_nickname,
                    m.manager_comments,
                    m.last_updated_date
                FROM Reports r
                LEFT JOIN Maintenance_Status m
                  ON m.report_id = r.report_id
                ORDER BY r.report_date DESC
            """
            cur.execute(sql)
            rows = cur.fetchall()

            def lob_to_text(x):
                if hasattr(x, 'read'):
                    x = x.read()
                    if isinstance(x, bytes):
                        x = x.decode('utf-8', errors='ignore')
                return x

            def dt2str(x):
                return x.strftime("%Y-%m-%d %H:%M:%S") if hasattr(x, "strftime") else None

            result = []
            for r in rows:
                result.append({
                    "report_id": r[0],
                    "user_id": r[1],
                    "photo_url": r[2],
                    "location_description": r[3],
                    "latitude": r[4],
                    "longitude": r[5],
                    "report_date": dt2str(r[6]),
                    "details": lob_to_text(r[7]),
                    "is_normal": int(r[8]) if r[8] is not None else None,   # 0=파손,1=정상
                    "repair_status": int(r[9]) if r[9] is not None else 0,  # 0=대기,1=완료
                    "maintenance": {
                        "status_id": r[10],
                        "current_status": r[11],
                        "manager_nickname": r[12],
                        "manager_comments": lob_to_text(r[13]),
                        "last_updated_date": dt2str(r[14]),
                    }
                })
            return {"result": "조회 성공", "data": result}
        except Exception as e:
            print(f"ERROR: {str(e)}")
            return {"result": "조회 실패", "error": str(e)}
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)

    # ----------------------------------------------------------------------
    # 지도/마커용
    # ----------------------------------------------------------------------
    def getAllDamageReportLocations(self):
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
            SELECT r.report_id, r.latitude, r.longitude, r.location_description,
                   r.details, r.photo_url, r.report_date, r.user_id, r.repair_status  -- 추가
            FROM Reports r
            WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
            ORDER BY r.report_date DESC
            """
            cur.execute(sql)
            results = cur.fetchall()

            def lob_to_text(x):
                if hasattr(x, 'read'):
                    x = x.read()
                    if isinstance(x, bytes):
                        x = x.decode('utf-8', errors='ignore')
                return x

            processed_results = []
            for row in results:
                processed_results.append({
                    "report_id": row[0],
                    "latitude": row[1],
                    "longitude": row[2],
                    "address": row[3] or "주소 없음",
                    "details": lob_to_text(row[4]) or "내용 없음",
                    "photo_url": row[5],
                    "date": row[6].strftime("%Y-%m-%d") if row[6] else "날짜 없음",
                    "nickname": row[7] or "익명",
                    "repair_status": int(row[8]) if row[8] is not None else 0,  # 0=대기,1=완료
                })
            return processed_results

        except Exception as e:
            print(f"ERROR in getAllDamageReportLocations: {e}")
            return None
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)

    # ----------------------------------------------------------------------
    # 사용자별 목록 + 상태 동시 조회
    # ----------------------------------------------------------------------
    def getUserReports(self, user_id):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT
                    r.report_id,
                    r.user_id,
                    r.photo_url,
                    r.location_description,
                    r.latitude,
                    r.longitude,
                    r.report_date,
                    r.details,
                    r.is_normal,
                    r.repair_status,      -- 추가
                    m.current_status,
                    m.last_updated_date
                FROM Reports r
                LEFT JOIN Maintenance_Status m
                  ON m.report_id = r.report_id
                WHERE r.user_id = :user_id
                ORDER BY r.report_date DESC
            """
            cur.execute(sql, {"user_id": user_id})
            rows = cur.fetchall()

            def lob_to_text(x):
                if hasattr(x, "read"):
                    x = x.read()
                    if isinstance(x, bytes):
                        x = x.decode("utf-8", errors="ignore")
                return x

            def dt2str(x):
                return x.strftime("%Y-%m-%d %H:%M:%S") if hasattr(x, "strftime") else None

            result = []
            for r in rows:
                result.append({
                    "report_id": r[0],
                    "user_id": r[1],
                    "photo_url": r[2],
                    "location_description": r[3],
                    "latitude": r[4],
                    "longitude": r[5],
                    "report_date": dt2str(r[6]),
                    "details": lob_to_text(r[7]),
                    "is_normal": int(r[8]) if r[8] is not None else None,
                    "repair_status": int(r[9]) if r[9] is not None else 0,   # 0=대기,1=완료
                    "current_status": r[10],
                    "last_updated_date": dt2str(r[11]),
                })
            return {"result": "조회 성공", "reports": result}

        except Exception as e:
            print(f"ERROR in getUserReports: {str(e)}")
            return {"result": "조회 실패", "error": str(e)}
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)

    # ----------------------------------------------------------------------
    # 유저 신고 삭제/단건 조회 (기존 유지)
    # ----------------------------------------------------------------------
    def get_report_by_id(self, report_id: int):
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            cur.execute("SELECT * FROM REPORTS WHERE REPORT_ID = :id", {"id": report_id})
            row = cur.fetchone()
            if row:
                return {
                    "report_id": row[0],
                    "user_id": row[1],
                    "location_description": row[2],
                    # 필요한 컬럼 추가 가능
                }
            return None
        except Exception as e:
            print("DB 오류:", e)
            return None
        finally:
            if con and cur:
                SsyDBManager.closeConCur(con, cur)

    def delete_report_by_id(self, report_id: int):
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            cur.execute("DELETE FROM REPORTS WHERE REPORT_ID = :id", {"id": report_id})
            con.commit()
            return True
        except Exception as e:
            print("삭제 실패:", e)
            return False
        finally:
            if con and cur:
                SsyDBManager.closeConCur(con, cur)

    # ----------------------------------------------------------------------
    # 수리 상태 변경 API용 메서드
    # ----------------------------------------------------------------------
    def updateRepairStatus(self, report_id: int, repair_status: int):
        """
        repair_status: 0=대기, 1=완료
        """
        h = {"Access-Control-Allow-Origin": "*"}
        if repair_status not in (0, 1):
            return JSONResponse({"result": "bad request", "error": "repair_status must be 0 or 1"},
                                status_code=400, headers=h)
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            cur.execute("""
                UPDATE Reports
                SET repair_status = :st
                WHERE report_id = :rid
            """, {"st": repair_status, "rid": report_id})
            if cur.rowcount == 0:
                return JSONResponse({"result": "not found"}, status_code=404, headers=h)
            con.commit()
            return JSONResponse({"result": "ok", "report_id": report_id, "repair_status": repair_status}, headers=h)
        except Exception as e:
            if con: con.rollback()
            return JSONResponse({"result": "DB 오류", "error": str(e)}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)


    # 1. 관리자용 전체 목록 조회
    def getAllReportsForAdmin(self):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT report_id, location_description, report_date, user_id, 
                       is_normal, repair_status, photo_url
                FROM registrations 
                ORDER BY report_id DESC
            """
            cur.execute(sql)
            
            report_list = []
            for r_id, loc, date, u_id, is_norm, rep_stat, p_url in cur:
                report_list.append({
                    "id": r_id,
                    "location": loc,
                    "date": date.strftime("%Y-%m-%d"),
                    "user_id": u_id,
                    "is_normal": is_norm,
                    "repair_status": rep_stat,
                    "photo_url": p_url
                })
            return JSONResponse(report_list, headers=h)
        except Exception as e:
            return JSONResponse({"error": f"DB 오류: {e}"}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # 2. 신고 1건의 모든 상세 정보 조회
    def getReportDetailsById(self, report_id):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = "SELECT * FROM registrations WHERE report_id = :1"
            cur.execute(sql, [report_id])
            # 컬럼 이름 리스트를 가져옵니다.
            column_names = [desc[0].lower() for desc in cur.description]
            data = cur.fetchone()

            if data:
                report_dict = dict(zip(column_names, data))
                # LOB 및 날짜 타입 처리
                if report_dict.get('details') and hasattr(report_dict['details'], 'read'):
                    report_dict['details'] = report_dict['details'].read()
                if report_dict.get('report_date') and hasattr(report_dict['report_date'], 'strftime'):
                    report_dict['report_date'] = report_dict['report_date'].strftime("%Y-%m-%d %H:%M:%S")
                return JSONResponse(report_dict, headers=h)
            else:
                return JSONResponse({"error": "Report not found"}, status_code=404, headers=h)
        except Exception as e:
            return JSONResponse({"error": f"DB 오류: {e}"}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)



    # 1. 관리자용 전체 목록 조회
    def getAllReportsForAdmin(self):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT REPORT_ID, LOCATION_DESCRIPTION, REPORT_DATE, USER_ID, 
                       IS_NORMAL, REPAIR_STATUS, PHOTO_URL
                FROM REPORTS 
                ORDER BY REPORT_DATE DESC
            """
            cur.execute(sql)
            
            report_list = []
            for r_id, loc, date, u_id, is_norm, rep_stat, p_url in cur:
                report_list.append({
                    "id": r_id,
                    "location": loc,
                    "date": date.strftime("%Y-%m-%d") if date else None,
                    "user_id": u_id,
                    "is_normal": is_norm,
                    "repair_status": rep_stat,
                    "photo_url": p_url
                })
            return JSONResponse(report_list, headers=h)
        except Exception as e:
            print(f"ERROR in getAllReportsForAdmin: {e}") 
            return JSONResponse({"error": f"DB 오류: {e}"}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # 2. 신고 1건의 모든 상세 정보 조회
    def getReportDetailsById(self, report_id):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            # --- [수정] 테이블명을 REPORTS로, 컬럼명을 REPORT_ID로 변경 ---
            sql = "SELECT * FROM REPORTS WHERE REPORT_ID = :1"
            # --------------------------------------------------------
            cur.execute(sql, [report_id])
            
            # DB의 대문자 컬럼명을 가져와서 소문자로 변환
            column_names = [desc[0].lower() for desc in cur.description]
            data = cur.fetchone()

            if data:
                report_dict = dict(zip(column_names, data))
                # LOB 및 날짜 타입 처리
                if report_dict.get('details') and hasattr(report_dict['details'], 'read'):
                    report_dict['details'] = report_dict['details'].read()
                if report_dict.get('report_date') and hasattr(report_dict['report_date'], 'strftime'):
                    report_dict['report_date'] = report_dict['report_date'].strftime("%Y-%m-%d %H:%M:%S")
                return JSONResponse(report_dict, headers=h)
            else:
                return JSONResponse({"error": "Report not found"}, status_code=404, headers=h)
        except Exception as e:
            # 터미널에 진짜 오류 원인을 출력합니다.
            print(f"ERROR in getReportDetailsById: {e}")
            return JSONResponse({"error": f"DB 오류: {e}"}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # 3. 신고 상태 업데이트 (is_normal, repair_status 동시 변경)
    def updateReportStatuses(self, report_id, is_normal, repair_status):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                UPDATE REPORTS 
                SET IS_NORMAL = :is_normal, REPAIR_STATUS = :repair_status
                WHERE REPORT_ID = :report_id
            """
            # --------------------------------------------------------
            cur.execute(sql, {"is_normal": is_normal, "repair_status": repair_status, "report_id": report_id})
            con.commit()

            if cur.rowcount > 0:
                return JSONResponse({'result': 'success'}, headers=h)
            else:
                return JSONResponse({'error': 'Update failed or report not found'}, status_code=404, headers=h)
        except Exception as e:
            return JSONResponse({'error': f"DB 오류: {e}"}, status_code=500, headers=h)
        finally:
            if cur and con: SsyDBManager.closeConCur(con, cur)