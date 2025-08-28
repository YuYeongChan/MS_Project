# Dockerfile.cpu
FROM python:3.10-slim

# 환경변수 (비로그 파일로 버퍼링 문제 방지)
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# 시스템 패키지 (opencv / build deps에 필요)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    wget \
    unzip \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# 복사: requirements 먼저 (이미지 레이어 캐시 활용)
COPY requirements.txt ./

# Python 패키지 설치
RUN pip install --no-cache-dir -r requirements.txt

# 코드 및 모델 복사
COPY api.py ./ 
COPY models/ ./models/

EXPOSE 8000

# 개발용은 --reload; 프로덕션에서는 --reload 제거 권장
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]