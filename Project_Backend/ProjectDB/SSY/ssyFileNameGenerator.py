import os
from datetime import datetime
from uuid import uuid4

class SsyFileNameGenerator:
    @staticmethod
    def generate(fileName, mode):
        # 확장자 추출 (예: ".jpeg", ".png")
        base, ext = os.path.splitext(fileName)
        if not ext:
            ext = ".jpeg"  # 기본 확장자 (없을 경우)

        if mode == "uuid":
            uuid_str = str(uuid4())
            return f"{base}_{uuid_str}{ext}"
        elif mode == "date":
            now = datetime.today().strftime("%Y%m%d%H%M%S")
            return f"{base}_{now}{ext}"