from fastapi import FastAPI, File, UploadFile, HTTPException
from azure.storage.blob import BlobServiceClient
from PIL import Image
import io, uuid, os, torch
from torchvision import transforms
from torchvision.models.detection import maskrcnn_resnet50_fpn
import numpy as np
import torch
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

app = FastAPI()

# 환경 설정
BLOB_CONN_STR       = os.getenv("BLOB_CONN_STR")
BLOB_CONTAINER_IMG  = "crops"
BLOB_CONTAINER_MASK = "mask-images"

blob_service = BlobServiceClient.from_connection_string(BLOB_CONN_STR)
client_img  = blob_service.get_container_client(BLOB_CONTAINER_IMG)
client_mask = blob_service.get_container_client(BLOB_CONTAINER_MASK)
for c in (client_img, client_mask):
    try: c.create_container()
    except: pass

# 모델 로드 함수
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = maskrcnn_resnet50_fpn(weights=None)
in_features = model.roi_heads.box_predictor.cls_score.in_features
model.roi_heads.box_predictor = FastRCNNPredictor(in_features, 17)  # 16 + background
model.load_state_dict(torch.load("./models/maskrcnn_combined.pt", map_location=device))
model.to(device).eval()

# 전처리: Mask R-CNN 은 ToTensor 만
preprocess = transforms.ToTensor()
THRESHOLD  = 0.5

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
async def analyze_with_maskrcnn(image: UploadFile = File(...)):
    # 1) 이미지 로드
    data = await image.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    np_img = np.array(img)
    t = preprocess(img).to(device)

    # 2) 추론
    with torch.no_grad():
        out = model([t])[0]

    scores = out["scores"].cpu()
    keep   = scores > THRESHOLD
    if keep.sum().item() == 0:
        raise HTTPException(status_code=404, detail="No detections above threshold")

    boxes  = out["boxes"][keep].cpu().numpy().astype(int)
    labels = out["labels"][keep].cpu().numpy().tolist()
    scores = scores[keep].cpu().numpy().tolist()
    masks  = out["masks"][keep,0].cpu().numpy()  # shape (N, H, W)

    # 3) score 가장 높은 객체 선택
    best_idx = int(np.argmax(scores))
    best_box = boxes[best_idx]
    best_label = labels[best_idx]
    best_score = scores[best_idx]
    best_mask = masks[best_idx]

    # --- 원본 이미지 복사 후 해당 객체만 색칠 ---
    image_copy = np_img.copy()
    alpha = 0.4
    red_mask = np.zeros_like(image_copy)
    red_mask[:, :, 0] = 255
    image_copy = np.where(best_mask[..., None] > THRESHOLD,
                          (alpha * red_mask + (1 - alpha) * image_copy).astype(np.uint8),
                          image_copy)

    # --- 합성 이미지 저장 (Azure Blob) ---
    buf_m = io.BytesIO()
    Image.fromarray(image_copy).save(buf_m, format="PNG")
    buf_m.seek(0)
    name_m = f"{uuid.uuid4().hex}.png"
    client_mask.upload_blob(name=name_m, data=buf_m, overwrite=True)
    url_m = f"{client_mask.url}/{name_m}"

    # --- 선택된 객체만 crop 저장 ---
    x1, y1, x2, y2 = best_box.tolist()
    crop = img.crop((x1, y1, x2, y2))
    buf_c = io.BytesIO()
    crop.save(buf_c, format="PNG")
    buf_c.seek(0)
    name_c = f"{uuid.uuid4().hex}.png"
    client_img.upload_blob(name=name_c, data=buf_c, overwrite=True)
    url_c = f"{client_img.url}/{name_c}"

    # 결과 반환
    return {
        "detection": {
            "box": best_box.tolist(),
            "score": round(best_score, 3),
            "label": int(best_label),
            "crop_url": url_c
        },
        "mask_url": url_m
    }