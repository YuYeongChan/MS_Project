from datetime import datetime, timedelta, timezone
import os, jwt

ALGORITHM = "HS256"
ACCESS_EXPIRE_MIN = 60
REFRESH_EXPIRE_DAYS = 14
SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY",
    "your_jwt_secret_key_here_please_change_this_to_a_strong_key"
)
REFRESH_SECRET_KEY = os.environ.get(
    "JWT_REFRESH_SECRET",
    "please_use_a_different_refresh_secret"
)

# Expo 알림 기능 URL
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# === 토큰 생성 유틸리티 ===
def create_access_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MIN)
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    data = {"sub": user_id, "typ": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_DAYS)}
    return jwt.encode(data, REFRESH_SECRET_KEY, algorithm=ALGORITHM)