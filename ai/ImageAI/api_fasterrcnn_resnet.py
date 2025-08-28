from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from azure.storage.blob import BlobServiceClient
from PIL import Image
import io, uuid, os, torch, cv2
from torchvision import transforms
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.models import resnet50, ResNet50_Weights
import torch.nn as nn
import numpy as np
from segment_anything import build_sam_vit_h, SamAutomaticMaskGenerator
from pathlib import Path
import matplotlib.pyplot as plt

app = FastAPI()

# 1) 환경 변수 또는 하드코딩
BLOB_CONN_STR = os.getenv("BLOB_CONN_STR")  # Azure Blob 연결 문자열
BLOB_CONTAINER = "crops"
BLOB_CONTAINER_MASK = "mask-output"

# 2) BlobServiceClient 초기화
blob_service = BlobServiceClient.from_connection_string(BLOB_CONN_STR)
container_client = blob_service.get_container_client(BLOB_CONTAINER)
container_client_mask = blob_service.get_container_client(BLOB_CONTAINER_MASK)
try:
    container_client.create_container()
    container_client_mask.create_container()
except:
    pass  # 이미 있으면 무시

# 3) 장치, 모델, 전처리 함수 로드 (한 번만)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# (FasterRCNN)
detector = fasterrcnn_resnet50_fpn(pretrained=False, num_classes=9)
detector.load_state_dict(torch.load("models/fasterrcnn_model.pt", map_location=device))
detector.to(device).eval()
# (ResNet)
clf = resnet50(weights=None)
clf.fc = nn.Linear(clf.fc.in_features, 2)
clf.load_state_dict(torch.load("models/resnet_binary.pt", map_location=device))
clf.to(device).eval()

preprocess_det = transforms.ToTensor()
preprocess_clf = transforms.Compose([
    transforms.Resize(256), transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    # 1) 이미지 로드 & RGB 변환
    data = await image.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    # 2) detection
    img_tensor = preprocess_det(img).to(device)
    with torch.no_grad():
        out = detector([img_tensor])[0]
    scores = out["scores"]
    if len(scores)==0:
        return {"error":"object not found"}
    idx = torch.argmax(scores).item()
    box = out["boxes"][idx].cpu().numpy().astype(int)
    category = int(out["labels"][idx].item())
    # 3) crop & classification
    crop = img.crop((box[0],box[1],box[2],box[3]))
    buf = io.BytesIO()
    crop.save(buf, format="PNG")
    buf.seek(0)
    # 4) Blob에 업로드
    blob_name = f"{uuid.uuid4().hex}.png"
    container_client.upload_blob(name=blob_name, data=buf, overwrite=True)
    url = f"{container_client.url}/{blob_name}"
    # 5) 분류
    input_crop = preprocess_clf(crop).unsqueeze(0).to(device)
    with torch.no_grad():
        cls = int(torch.argmax(clf(input_crop),1).item())
    # 6) 결과 반환
    return {"category_id":category, "status":cls, "image_url":url}

sam_model = build_sam_vit_h(checkpoint=None).to(device)
sam_model.load_state_dict(torch.load("models/sam_model.pt", map_location=device))
sam_model.eval()

mask_generator = SamAutomaticMaskGenerator(
    model=sam_model,
    points_per_side=32,
    pred_iou_thresh=0.86,
    stability_score_thresh=0.92,
    crop_n_layers=1,
    crop_n_points_downscale_factor=2,
    min_mask_region_area=200,
)

@app.post("/mask")
async def create_mask(
    image: UploadFile = File(...),
    filename: str = Form(...)
):
    # 이미지 디코딩
    image_bytes = await image.read()
    np_img = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="이미지 해석 실패")
    image_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # 마스크 생성
    masks = mask_generator.generate(image_rgb)
    if not masks:
        return {"message": "No masks generated"}

    sorted_masks = sorted(masks, key=lambda x: x['area'], reverse=True)
    main_mask = sorted_masks[0]['segmentation']
    normal_mask = None
    for m in sorted_masks[1:]:
        candidate = m['segmentation']
        iou = np.logical_and(main_mask, candidate).sum() / np.logical_or(main_mask, candidate).sum()
        if iou < 0.1:
            normal_mask = candidate
            break

    # 저장될 이름: sam_기존파일명.png
    # (확장자 제거하고 .png 붙이기)
    filename_base = os.path.splitext(filename)[0]
    output_name = f"sam_{filename_base}.png"
    output_path = f"mask_images/{output_name}"

    # 시각화 및 저장
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.imshow(image_rgb)
    ax.imshow(main_mask, cmap="Reds", alpha=0.5)
    if normal_mask is not None:
        ax.imshow(normal_mask, cmap="Blues", alpha=0.5)
    ax.axis("off")
    ax.set_title("파손 영역(빨강) + 정상 영역(파랑)")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()

    # Blob 업로드
    with open(output_path, "rb") as f:
        container_client_mask.upload_blob(name=output_name, data=f, overwrite=True)

    url = f"{container_client_mask.url}/{output_name}"

    return {
        "masked_image_url": url,
        "mask_count": len(masks)
    }
