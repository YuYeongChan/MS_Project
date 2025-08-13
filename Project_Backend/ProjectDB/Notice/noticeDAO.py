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
                    "date": created_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "notice_date": created_date.strftime("%Y-%m-%d"),
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

    def deleteNotice(self, id):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None

        try:
            con, cur = SsyDBManager.makeConCur()
            # --- [수정된 부분] ---
            # WHERE 절의 컬럼명을 'id'에서 실제 컬럼명인 'notice_id'로 수정합니다.
            sql="delete from notices where notice_id = :1"
            # --------------------
            cur.execute(sql, [id])
            con.commit()
            
            if cur.rowcount > 0:
                return JSONResponse({'result': 'success'}, headers=h)
            else:
                return JSONResponse({'result': 'not_found', 'message': '삭제할 공지사항을 찾을 수 없습니다.'}, status_code=404, headers=h)

        except Exception as e:
            print("공지사항 삭제 중 오류 발생:", e)
            return JSONResponse({'error': str(e)}, status_code=500, headers=h)
        finally:
            if cur and con:
                SsyDBManager.closeConCur(con, cur)
                
    def createNotice(self, title, content, created_by, notice_type, is_pinned):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            
            # notice_id는 AUTO_INCREMENT로 가정하고,
            # created_date는 데이터베이스의 기본값(SYSDATE)을 사용합니다.
            sql = """
                INSERT INTO notices (title, content, created_date, created_by, notice_type, is_pinned)
                VALUES (:1, :2, SYSDATE, :3, :4, :5)
            """
            cur.execute(sql, [title, content, created_by, notice_type, is_pinned])
            con.commit()

            if cur.rowcount > 0:
                return JSONResponse({'result': 'success'}, status_code=201, headers=h)
            else:
                return JSONResponse({'error': 'Insert failed'}, status_code=500, headers=h)

        except Exception as e:
            print(f"공지사항 등록 중 오류 발생: {e}")
            return JSONResponse({'error': str(e)}, status_code=500, headers=h)
        finally:
            if cur and con:
                SsyDBManager.closeConCur(con, cur)

    def getNoticeById(self, id):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = "SELECT * FROM notices WHERE notice_id = :1"
            cur.execute(sql, [id])
            notice_data = cur.fetchone()

            if notice_data:
                notice_id, title, content, created_date, created_by, notice_type, is_pinned = notice_data
                notice_dict = {
                    "id": notice_id, "title": title, "content": content.read(),
                    "date": created_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "notice_date": created_date.strftime("%Y-%m-%d"),
                    "admin_name": created_by, "type": notice_type,
                    "fixed": True if is_pinned == "Y" else False
                }
                return JSONResponse(notice_dict, status_code=200, headers=h)
            else:
                return JSONResponse({"error": "Notice not found"}, status_code=404, headers=h)
        except Exception as e:
            print(f"특정 공지 조회 중 오류 발생: {e}")
            return JSONResponse({"result": f"DB 오류: {e}"}, status_code=500, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    def updateNotice(self, id, title, content, notice_type, is_pinned):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql = """
                UPDATE notices 
                SET title = :1, content = :2, notice_type = :3, is_pinned = :4
                WHERE notice_id = :5
            """
            cur.execute(sql, [title, content, notice_type, is_pinned, id])
            con.commit()

            if cur.rowcount > 0:
                return JSONResponse({'result': 'success'}, headers=h)
            else:
                return JSONResponse({'error': 'Update failed or notice not found'}, status_code=404, headers=h)
        except Exception as e:
            print(f"공지사항 수정 중 오류 발생: {e}")
            return JSONResponse({'error': str(e)}, status_code=500, headers=h)
        finally:
            if cur and con: SsyDBManager.closeConCur(con, cur)