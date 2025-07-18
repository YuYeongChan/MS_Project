import os
from datetime import datetime
from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager

class ManagementStatusDAO:
    def __init__(self):
        pass

    def addStatus(self, report_id, current_status, damage_info_details, facility_type, manager_nickname, manager_comments=None):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None # 초기화
        try:
            con, cur = SsyDBManager.makeConCur()
            
            # --- 이전 오류 해결을 위해 임시로 추가했던 UUID 관련 코드 제거 (만약 있었다면) ---
            # unique_manager_nickname = f"{manager_nickname}_{uuid.uuid4().hex[:8]}"
            # -------------------------------------------------------------------------

            sql = """
                INSERT INTO Maintenance_Status (
                    report_id, current_status, damage_info_details, facility_type, manager_nickname, manager_comments, last_updated_date
                ) VALUES (
                    :report_id, :current_status, :damage_info_details, :facility_type, :manager_nickname, :manager_comments, SYSTIMESTAMP
                )
            """
            cur.execute(sql, {
                'report_id': report_id,
                'current_status': current_status,
                'damage_info_details': damage_info_details,
                'facility_type': facility_type,
                'manager_nickname': manager_nickname, # FastAPI로부터 받은 manager_nickname 값을 그대로 사용
                'manager_comments': manager_comments
            })
            con.commit()
            return JSONResponse({"result": "관리 상태 등록 성공"}, headers=h)
        except Exception as e:
            if con: con.rollback() # 오류 발생 시 롤백
            error_message = str(e).upper()
            # ORA-00001은 UNIQUE 제약 조건 위반 오류 코드
            # (이 오류가 다시 발생한다면 DB에서 해당 제약조건을 제거해야 합니다.)
            if "ORA-00001" in error_message: # and "REPORT_ID" in error_message: # REPORT_ID에만 Unique가 있다면
                 # 'MANAGER.NICKNAME'이 특정 인덱스 이름일 수 있으므로 좀 더 일반적인 메시지 유지
                 return JSONResponse({"result": "관리 상태 등록 실패", "error": f"중복 오류: {e}"}, headers=h)
            return JSONResponse({"result": "관리 상태 등록 실패", "error": str(e)}, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    def getAllStatuses(self):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None # 초기화
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT status_id, report_id, current_status, damage_info_details, facility_type, manager_nickname, manager_comments, last_updated_date
                FROM Maintenance_Status ORDER BY status_id DESC
            """
            cur.execute(sql)
            rows = cur.fetchall()
            result = []
            for r in rows:
                # CLOB 타입 컬럼 처리 (damage_info_details, manager_comments)
                damage_info_details_data = r[3] # damage_info_details는 r[3]
                if hasattr(damage_info_details_data, 'read'):
                    damage_info_details_data = damage_info_details_data.read()
                    if isinstance(damage_info_details_data, bytes):
                        damage_info_details_data = damage_info_details_data.decode('utf-8')

                manager_comments_data = r[6] # manager_comments는 r[6]
                if hasattr(manager_comments_data, 'read'):
                    manager_comments_data = manager_comments_data.read()
                    if isinstance(manager_comments_data, bytes):
                        manager_comments_data = manager_comments_data.decode('utf-8')


                result.append({
                    "status_id": r[0],
                    "report_id": r[1],
                    "current_status": r[2],
                    "damage_info_details": damage_info_details_data, # 처리된 데이터 사용
                    "facility_type": r[4],
                    "manager_nickname": r[5], # manager_nickname은 LOB 아닐 가능성 높음
                    "manager_comments": manager_comments_data, # 처리된 데이터 사용
                    "last_updated_date": r[7].strftime("%Y-%m-%d %H:%M:%S") if r[7] else None, # TIMESTAMP 포맷팅
                })
            return JSONResponse({"result": "조회 성공", "data": result}, headers=h)
        except Exception as e:
            return JSONResponse({"result": "조회 실패", "error": str(e)}, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)