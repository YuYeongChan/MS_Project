from fastapi.responses import JSONResponse
from ProjectDB.SSY.ssyDBManager import SsyDBManager
from typing import Optional,List
import logging
from fastapi import HTTPException
from datetime import datetime 

SEQ_NAME = "notification_seq"  # Oracle 시퀀스 이름

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
    # ===== 추가: 수신코드 정규화 =====
    @staticmethod
    def _normalize_recipient_code(recipient_code: str) -> str:
        """
        입력이 이미 USER_ALL / NAME_* / LOCATION_* 면 그대로.
        아니면 user_id 또는 email로 보고 NAME_ 접두어로 변환.
        """
        if not recipient_code:
            return "USER_ALL"
        up = recipient_code.strip().upper()
        if up.startswith(("USER_ALL", "NAME_", "LOCATION_")):
            return up
        if "@" in recipient_code:
            # 이메일 -> @ 앞부분만 추출
            name_part = recipient_code.strip().split("@", 1)[0]
            return f"NAME_{name_part.strip().upper()}"
        return f"NAME_{up}"

    # ===== 추가: 단건 INSERT =====
    def insert_notification(
        self,
        content: str,
        sender: str,
        recipient_code: str = "USER_ALL",
        sent_at: Optional[datetime] = None,   # 파이썬 datetime -> Oracle TIMESTAMP
    ) -> dict:
        if not content or not sender:
            raise HTTPException(status_code=400, detail="content와 sender는 필수입니다.")

        norm_code = self._normalize_recipient_code(recipient_code)

        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            if cur is None:
                logging.error("DB cursor init failed")
                raise HTTPException(status_code=500, detail="DB cursor init failed")

            if sent_at is None:
                sql = """
                    INSERT INTO notifications (notification_id, content, sender, recipient_code)
                    VALUES (notification_seq.NEXTVAL, :p_content, :p_sender, :p_rc)
                    RETURNING notification_id INTO :p_new_id
                """
                params = {"p_content": content, "p_sender": sender, "p_rc": norm_code}
            else:
                sql = """
                    INSERT INTO notifications (notification_id, content, sent_at, sender, recipient_code)
                    VALUES (notification_seq.NEXTVAL, :p_content, :p_sent_at, :p_sender, :p_rc)
                    RETURNING notification_id INTO :p_new_id
                """
                params = {
                    "p_content": content,
                    "p_sent_at": sent_at,  # 오라클 드라이버가 TIMESTAMP로 매핑
                    "p_sender": sender,
                    "p_rc": norm_code
                }

            out_id = cur.var(int)
            params["p_new_id"] = out_id
            cur.execute(sql, params)
            con.commit()

            new_id = out_id.getvalue()
            if isinstance(new_id, (list, tuple)):
                new_id = new_id[0]

            logging.info(f"[Notifications] inserted id={new_id}, rc={norm_code}")
            return {"result": "ok", "notification_id": int(new_id) if new_id is not None else None}

        except Exception as e:
            if con: con.rollback()
            logging.exception(f"[Notifications] insert failed: {e}")
            raise HTTPException(status_code=500, detail="Insert failed")
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)

    # ===== 추가: 일괄 INSERT =====
    def insert_notifications_bulk(
        self,
        content: str,
        sender: str,
        recipients: List[str],
        sent_at: Optional[datetime] = None,
    ) -> dict:
        if not content or not sender:
            raise HTTPException(status_code=400, detail="content와 sender는 필수입니다.")
        if not recipients:
            raise HTTPException(status_code=400, detail="recipients가 비어있습니다.")

        con, cur = None, None
        try:
            con, cur = SsyDBManager.makeConCur()
            if cur is None:
                logging.error("DB cursor init failed")
                raise HTTPException(status_code=500, detail="DB cursor init failed")

            if sent_at is None:
                sql = """
                    INSERT INTO notifications (notification_id, content, sender, recipient_code)
                    VALUES (notification_seq.NEXTVAL, :p_content, :p_sender, :p_rc)
                    RETURNING notification_id INTO :p_new_id
                """
            else:
                sql = """
                    INSERT INTO notifications (notification_id, content, sent_at, sender, recipient_code)
                    VALUES (notification_seq.NEXTVAL, :p_content, :p_sent_at, :p_sender, :p_rc)
                    RETURNING notification_id INTO :p_new_id
                """

            ids = []
            for rc in recipients:
                norm_code = self._normalize_recipient_code(rc)
                out_id = cur.var(int)
                params = {
                    "p_content": content,
                    "p_sender": sender,
                    "p_rc": norm_code,
                    "p_new_id": out_id
                }
                if sent_at is not None:
                    params["p_sent_at"] = sent_at

                cur.execute(sql, params)
                new_id = out_id.getvalue()
                if isinstance(new_id, (list, tuple)):
                    new_id = new_id[0]
                ids.append(int(new_id) if new_id is not None else None)

            con.commit()
            logging.info(f"[Notifications] bulk inserted cnt={len(ids)}")
            return {"result": "ok", "inserted": len(ids), "ids": ids}

        except Exception as e:
            if con: con.rollback()
            logging.exception(f"[Notifications] bulk insert failed: {e}")
            raise HTTPException(status_code=500, detail="Bulk insert failed")
        finally:
            if cur:
                SsyDBManager.closeConCur(con, cur)

    # ===== 추가: 헬퍼들 =====
    def broadcast_all(self, content: str, sender: str, sent_at: Optional[datetime]=None) -> dict:
        return self.insert_notification(content=content, sender=sender, recipient_code="USER_ALL", sent_at=sent_at)

    def notify_user(self, content: str, sender: str, user_id_or_email: str, sent_at: Optional[datetime]=None) -> dict:
        rc = self._normalize_recipient_code(user_id_or_email)
        return self.insert_notification(content=content, sender=sender, recipient_code=rc, sent_at=sent_at)

    def notify_location(self, content: str, sender: str, location_code: str, sent_at: Optional[datetime]=None) -> dict:
        rc = location_code if location_code.upper().startswith("LOCATION_") else f"LOCATION_{location_code.strip().upper()}"
        return self.insert_notification(content=content, sender=sender, recipient_code=rc, sent_at=sent_at)