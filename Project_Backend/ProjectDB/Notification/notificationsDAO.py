from typing import Optional
import logging
from fastapi import HTTPException
from ProjectDB.SSY.ssyDBManager import SsyDBManager

class NotificationDAO:
    def __init__(self):
        pass

    def list(self, recipient_code: Optional[str] = None, limit: int = 50):
        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            if cur is None:
                logging.error("DB cursor init failed")
                raise HTTPException(status_code=500, detail="DB cursor init failed")

            logging.info(f"[Notifications] recipient_code(user_id)={recipient_code}, limit={limit}")

            if recipient_code:
                sql = """
                    SELECT *
                    FROM (
                        SELECT
                            n.notification_id,
                            n.content,
                            TO_CHAR(n.sent_at, 'YYYY-MM-DD HH24') || ':' || TO_CHAR(n.sent_at, 'MI') || ':' || TO_CHAR(n.sent_at, 'SS') AS sent_at,
                            n.sender,
                            n.recipient_code
                        FROM notifications n
                        WHERE
                            -- 모든 사용자 알림
                            UPPER(n.recipient_code) = 'USER_ALL'
                            -- 개별 사용자(ID) 알림
                            OR UPPER(n.recipient_code) = 'NAME_' || UPPER(TRIM(:p_uid))
                            -- 개별 사용자(이메일) 알림
                            OR (
                                INSTR(TRIM(:p_uid), '@') > 0 AND
                                UPPER(n.recipient_code) = 'NAME_' || UPPER(SUBSTR(TRIM(:p_uid), 1, INSTR(TRIM(:p_uid), '@') - 1))
                            )
                            --  시 단위 알림 조건
                            OR n.recipient_code = 'LOCATION_' || (
                                SELECT 
                                    CASE
                                        WHEN REGEXP_LIKE(address, '^서울특별시') THEN 'SEOUL'
                                        WHEN REGEXP_LIKE(address, '^부산광역시') THEN 'BUSAN'
                                        WHEN REGEXP_LIKE(address, '^인천광역시') THEN 'INCHEON'
                                        WHEN REGEXP_LIKE(address, '^경기도') THEN 'GYEONGGI'
                                        -- 필요한 시/도 코드를 여기에 추가
                                        ELSE ''
                                    END
                                FROM USERS
                                WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(:p_uid)) AND ROWNUM = 1
                            )
                            -- 구 단위 알림 조건
                            OR n.recipient_code = 'LOCATION_' || (
                                SELECT REGEXP_SUBSTR(address, '([^ ]+구)')
                                FROM USERS
                                WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(:p_uid)) AND ROWNUM = 1
                            )
                        ORDER BY n.sent_at DESC NULLS LAST
                    )
                    WHERE ROWNUM <= :p_lim
                """
                params = {"p_uid": recipient_code, "p_lim": int(limit)}

            cur.execute(sql, params)
            rows = cur.fetchall()

            results = []
            for r in rows:
                results.append({
                    "notification_id": r[0],
                    "content": r[1],
                    "sent_at": r[2],
                    "sender": r[3],
                    "recipient_code": r[4],
                })

            return {"result": "ok", "notifications": results}

        except HTTPException:
            raise
        except Exception as e:
            logging.exception(f"[Notifications] 조회 실패: {e}")
            raise HTTPException(status_code=500, detail="Internal Server Error")
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)