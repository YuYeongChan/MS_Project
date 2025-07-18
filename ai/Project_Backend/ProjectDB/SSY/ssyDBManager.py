from oracledb import connect
from ProjectDB.SSY import config

class SsyDBManager:
    @staticmethod
    def makeConCur():
        con = connect(config.ORACLE_URL)
        cur = con.cursor()
        return con, cur
    @staticmethod
    def closeConCur(con, cur):
        cur.close()
        con.close()