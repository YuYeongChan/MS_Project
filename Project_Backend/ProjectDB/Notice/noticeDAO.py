from sympy import true
from ProjectDB.SSY.ssyDBManager import SsyDBManager
from fastapi.responses import JSONResponse
from datetime import datetime

class NoticeDAO:
    def getNotices(self):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None

        # id 기준 내림차순으로 공지사항 조회
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                SELECT * 
                FROM notices 
                ORDER BY notice_id DESC 
            """
            cur.execute(sql)

            notice_list = []
            for notice_id, title, content, created_date, created_by, notice_type, is_pinned in cur:
                notice_list.append({
                    "id": notice_id,
                    "title": title,
                    "content": content.read(),
                    "date": created_date.strftime("%Y-%m-%d"),
                    "admin_name": created_by,
                    "type": notice_type,
                    "fixed": True if is_pinned == "Y" else False
                })
            return JSONResponse(notice_list, status_code=200, headers=h)

        except Exception as e:
            print(f"공지사항 조회 중 오류 발생: {e}")
            return JSONResponse({"result": f"공지사항 조회 DB 오류: {e}"}, status_code=500, headers=h)
        
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)