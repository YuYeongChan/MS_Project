# homeController.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
import httpx, os, shutil
from pathlib import Path
from fastapi.responses import JSONResponse
from PIL import Image
import torch
import torchvision.transforms as T
import torchvision
from torchvision.models.detection import maskrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
import numpy as np
import matplotlib.pyplot as plt
import io
from datetime import datetime
import cv2

app = FastAPI()

# import logging
# logging.basicConfig(level=logging.INFO)
# # AI 서버 주소를 환경변수에 담아 두세요
# AI_PREDICT_URL = os.getenv("AI_PREDICT_URL")
# logging.info(f"AI_PREDICT_URL = {AI_PREDICT_URL!r}")
SAVE_DIR = Path("saved_images")
SAVE_DIR.mkdir(exist_ok=True, parents=True)

# @app.post("/analyze_and_save")
# async def analyze_and_save(image: UploadFile = File(...)):
#     # 1) AI 서버 호출
#     contents = await image.read()
#     async with httpx.AsyncClient(timeout=30.0) as client:
#         files = {"image": (image.filename, contents, image.content_type)}
#         try:
#             ai_resp = await client.post(AI_PREDICT_URL, files=files)
#             ai_resp.raise_for_status()
#         except httpx.HTTPError as e:
#             raise HTTPException(status_code=502, detail=f"AI 서버 호출 실패: {e}")
#     result = ai_resp.json()
    
#     # 2) image_url 읽어오기
#     image_url = result.get("image_url")
#     if not image_url:
#         raise HTTPException(status_code=502, detail="AI 서버가 image_url을 반환하지 않음")
    
#     # 3) 이미지 다운로드
#     async with httpx.AsyncClient(timeout=30.0) as client:
#         try:
#             img_resp = await client.get(image_url)
#             img_resp.raise_for_status()
#         except httpx.HTTPError as e:
#             raise HTTPException(status_code=502, detail=f"이미지 다운로드 실패: {e}")
    
#     # 4) 로컬에 저장
#     filename = os.path.basename(image_url)
#     local_path = SAVE_DIR / filename
#     with open(local_path, "wb") as f:
#         f.write(img_resp.content)
    
#     # 5) 클라이언트에 결과 반환 (원본 결과 + 로컬 경로)
#     return {
#         "category_id": result["category_id"],
#         "status": result["status"],
#         "image_url": image_url,
#         "saved_path": str(local_path)
#     }

# @app.post("/mask")
# async def sam_masking(filename: str):
#     img_path = SAVE_DIR / filename
#     if not img_path.exists():
#         raise HTTPException(status_code=404, detail="지정된 이미지 파일이 존재하지 않습니다.")
    
#     try:
#         result = apply_sam_and_save_mask(img_path)
#         return result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# Device 설정: CUDA가 가능하면 GPU 사용, 아니면 CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

@app.post("/maskrcnn")
async def analyze_with_maskrcnn(image: UploadFile = File(...)):
    # 이미지 로딩
    contents = await image.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    np_img = np.array(img)
    tensor_img = T.ToTensor()(img).unsqueeze(0).to(device)

    # 모델 로딩 (매 요청마다 로딩하지 않도록 전역 변수로 빼도 좋음)
    model = maskrcnn_resnet50_fpn(weights=None)
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, 15)  # 14 + background
    model.load_state_dict(torch.load("./models/maskrcnn_combined_filtered.pt", map_location=device))
    model.to(device).eval()

    # 추론
    with torch.no_grad():
        output = model(tensor_img)[0]

    # 박스 + 마스크 필터링 (score threshold 적용)
    threshold = 0.5
    keep = output['scores'] > threshold
    if keep.sum().item() == 0:
        return {"status": "분류불가"}

    masks = output['masks'][keep].squeeze(1).cpu().numpy()
    boxes = output['boxes'][keep].cpu().numpy()
    labels = output['labels'][keep].cpu().numpy()

    # 시각화용 원본 복사
    image_copy = np_img.copy()

    alpha = 0.4  # 투명도: 0 = 완전 투명, 1 = 불투명
    for mask in masks:
        red_mask = np.zeros_like(image_copy)
        red_mask[:, :, 0] = 255  # 빨강 채널만 설정
        image_copy = np.where(mask[..., None] > 0.5,
                            (alpha * red_mask + (1 - alpha) * image_copy).astype(np.uint8),
                            image_copy)

    path = Path(image.filename)
    name_part = path.stem   # 확장자 없는 파일명
    ext = path.suffix       # .jpg, .png 등

    # 파일 이름 생성 (날짜+시간)
    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_filename = f"{name_part}_{now_str}{ext}"
    save_path = os.path.join("mask_images", save_filename)

    os.makedirs("mask_images", exist_ok=True)
    cv2.imwrite(save_path, cv2.cvtColor(image_copy, cv2.COLOR_RGB2BGR))

    # class_ids 리턴값 한글로 전환
    category_map = {
        1: "PE드럼 정상",
        2: "PE드럼 파손",
        3: "PE안내봉 정상",
        4: "PE안내봉 파손",
        5: "라바콘 정상",
        6: "라바콘 파손",
        7: "시선유도봉 정상",
        8: "시선유도봉 파손",
        9: "제설함 정상",
        10: "제설함 파손",
        11: "PE입간판 정상",
        12: "PE입간판 파손",
        13: "PE휀스 정상",
        14: "PE휀스 파손"
    }
    class_names = [category_map.get(cls_id, "알수없음") for cls_id in labels.tolist()]

    return {
        "saved_path": save_path,
        "saved_name": save_filename,
        "class_ids": labels.tolist(),
        "class_names": class_names
    }