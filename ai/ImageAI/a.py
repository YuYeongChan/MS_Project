# import requests, base64, json
# with open("test7.jpg","rb") as f:
#     b64 = base64.b64encode(f.read()).decode()

# url = "https://ljwws-blip2-2.eastus2.inference.ml.azure.com/score"
# headers = {"Content-Type":"application/json", "Authorization":""}
# resp = requests.post(url, json={"image_base64": b64, "orig_filename":"test7.jpg"}, headers=headers, timeout=180)
# print(resp.status_code)
# print(resp.text[:1000])
# print(resp.json())

from fastapi import FastAPI, File, UploadFile, HTTPException
import requests

app = FastAPI()

# Azure VM FastAPI 엔드포인트 URL
AZURE_VM_URL = "http://<>/predict"  # 실제 포트/경로로 변경

@app.post("/process-image")
async def process_image(file: UploadFile = File(...)):
    try:
        # Azure VM으로 이미지 전송
        files = {
            "image": (file.filename, await file.read(), file.content_type)
        }
        response = requests.post(AZURE_VM_URL, files=files, timeout=60)

        # Azure VM 응답 확인
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        # 결과 리턴
        return response.json()

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Azure VM 요청 실패: {str(e)}")