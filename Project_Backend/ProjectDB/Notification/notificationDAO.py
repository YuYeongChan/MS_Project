from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager
import math


class NotificationDAO:

    def __init__(self):
        pass

    # 계정 알림을 위한 토큰을 DB에 저장
    def saveExpoPushToken(self, user_id, expoPushToken):
        h = {"Access-Control-Allow-Origin": "*"}

        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            params = {"expoPushToken": expoPushToken, "user_id": user_id}

            sql = f"UPDATE Users SET TOKEN = :expoPushToken WHERE user_id = :user_id"
            cur.execute(sql, params)
            con.commit()

            return JSONResponse({'result': 'success'}, headers=h)
        except Exception as e:
            if con: con.rollback()
            print("회원 정보 수정 실패:", str(e))
            return JSONResponse({'error': 'save failed'}, headers=h)
        finally:
            if cur: SsyDBManager.closeConCur(con, cur)

    # 알림용 토큰 받기 (개인)
    def getExpoPushToken(self, to_user_id):
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql =   """
                        SELECT token
                        FROM Users
                        WHERE user_id = :to_user_id
                    """
            cur.execute(sql, {'to_user_id': to_user_id})
            row = cur.fetchone()

            if not row:
                return False

            return row[0]

        except Exception as e:
            return False
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)

    # 알림용 토큰 받기 (관리자)
    def getAdminExpoPushToken(self):
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            sql =   """
                    SELECT token
                    FROM Users
                    WHERE is_admin = 1
                    """
            cur.execute(sql)

            admin_token = []
            for id in cur:
                admin_token.append(id)

            return admin_token

        except Exception as e:
            print(f"[getAdminExpoPushToken] SQL 오류: {e}")
            return []
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)