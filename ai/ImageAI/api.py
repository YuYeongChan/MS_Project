from fastapi import FastAPI, File, UploadFile, HTTPException
from azure.storage.blob import BlobServiceClient
from PIL import Image
import io, uuid, os, torch, httpx, base64
from torchvision import transforms
from torchvision.models.detection import maskrcnn_resnet50_fpn
import numpy as np
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

# 환경 설정
ROOT = Path(__file__).parent
BLOB_CONN_STR       = os.getenv("BLOB_CONN_STR")
BLOB_CONTAINER_IMG  = "crops"
BLOB_CONTAINER_MASK = "mask-images"

# BLIP-2 엔드포인트 (Azure ML에서 발급한 scoring URL)
BLIP2_AZURE_ENDPOINT = os.getenv("BLIP2_AZURE_ENDPOINT")   # 예: https://<region>.api.azureml.ms/onlineEndpoints/<endpoint>/score
BLIP2_AZURE_KEY      = os.getenv("BLIP2_AZURE_KEY")        # 선택: 엔드포인트 키(있다면 Authorization 헤더에 사용)

# Blob 클라이언트 초기화
if not BLOB_CONN_STR:
    raise RuntimeError("BLOB_CONN_STR environment variable is required")
blob_service = BlobServiceClient.from_connection_string(BLOB_CONN_STR)
client_img  = blob_service.get_container_client(BLOB_CONTAINER_IMG)
client_mask = blob_service.get_container_client(BLOB_CONTAINER_MASK)
for c in (client_img, client_mask):
    try: c.create_container()
    except: pass

# 모델 (Mask R-CNN) 로드 함수
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = maskrcnn_resnet50_fpn(weights=None)
in_features = model.roi_heads.box_predictor.cls_score.in_features
model.roi_heads.box_predictor = FastRCNNPredictor(in_features, 15)  # 14 + background
model.load_state_dict(torch.load("./models/maskrcnn_combined_filtered.pt", map_location=device))
model.to(device).eval()

# 카테고리 매핑 (index -> 한국어)
category_map_ko = {
    1:"PE드럼 정상",2:"PE드럼 파손",
    3:"PE안내봉 정상",4:"PE안내봉 파손",5:"라바콘 정상",6:"라바콘 파손",
    7:"시선유도봉 정상",8:"시선유도봉 파손",9:"제설함 정상",10:"제설함 파손",
    11:"PE입간판 정상",12:"PE입간판 파손",13:"PE휀스 정상",14:"PE휀스 파손"
}

# 전처리: Mask R-CNN 은 ToTensor 만
preprocess = transforms.ToTensor()
THRESHOLD  = 0.5

# -------------------------
# Helper: BLIP-2 엔드포인트 호출 (비동기)
# -------------------------
async def call_blip2_endpoint(pil_image: Image.Image, orig_filename: str = "") -> dict:
    """
    Call the BLIP-2 online endpoint.
    Request JSON: {"image_base64": "...", "orig_filename": "foo.jpg"}
    Expects response JSON that contains at least:
      - caption_en
      - caption_ko (optional)
      - blob_url (optional)
      - blob_name (optional)
      - status (optional)
    Returns the parsed dict from endpoint, or raises Exception on unrecoverable failure.
    """
    if not BLIP2_AZURE_ENDPOINT:
        raise RuntimeError("BLIP2_AZURE_ENDPOINT is not configured.")

    # encode image as base64
    buf = io.BytesIO()
    pil_image.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    payload = {"image_base64": img_b64, "orig_filename": orig_filename}
    headers = {"Content-Type": "application/json"}
    if BLIP2_AZURE_KEY:
        headers["Authorization"] = f"Bearer {BLIP2_AZURE_KEY}"

    # call endpoint
    timeout = 60.0  # 충분히 큰 timeout
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(BLIP2_AZURE_ENDPOINT, json=payload, headers=headers)
        r.raise_for_status()
        return r.json()


@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
async def analyze_with_maskrcnn(image: UploadFile = File(...)):
    # 1) 이미지 로드
    data = await image.read()
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")
    np_img = np.array(img)
    t = preprocess(img).to(device)

    # 2) Mask R-CNN 추론
    with torch.no_grad():
        out = model([t])[0]

    scores = out["scores"].cpu()
    keep   = scores > THRESHOLD
    if keep.sum().item() == 0:
        # 객체 미검출: BLIP-2 엔드포인트에 이미지 전달하여 caption + Blob 업로드(엔드포인트가 처리)
        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        stem = Path(image.filename).stem
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        input_filename = f"{stem}_{now_str}_{uuid.uuid4().hex[:6]}{ext}"

        # BLIP-2 endpoint 부르기
        try:
            resp = await call_blip2_endpoint(img, orig_filename=input_filename)
            # resp expected keys: caption_en, caption_ko, blob_url, blob_name (but be defensive)
            caption_en = resp.get("caption_en") or resp.get("caption") or ""
            caption_ko = resp.get("caption_ko") or resp.get("caption_kr") or ""
            blob_url = resp.get("blob_url") or resp.get("input_path") or ""
            blob_name = resp.get("blob_name") or resp.get("input_name") or ""

            return {
                "status": "not_detected",
                "input_name": blob_name or input_filename,
                "input_path": blob_url or "",
                "caption_en": caption_en,
                "caption_ko": caption_ko
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"BLIP-2 endpoint failed and fallback save failed: {e}")

    # -------------------------
    # 검출된 객체가 있는 경우
    # -------------------------
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
        "status": "detected",
        "box": best_box.tolist(),
        "score": round(best_score, 3),
        "label": int(best_label),
        "label_ko": category_map_ko.get(best_label, "알 수 없음"),
        "crop_url": url_c,
        "mask_url": url_m
    }