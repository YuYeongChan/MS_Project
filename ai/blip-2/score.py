# score.py
import os
import io
import base64
import uuid
from datetime import datetime

from PIL import Image
import torch
from transformers import Blip2Processor, Blip2ForConditionalGeneration
from azure.storage.blob import BlobServiceClient
import requests
import json

# Environment / settings
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_DIR = os.environ.get("AZUREML_MODEL_DIR") or os.environ.get("AZUREML_MODEL_PATH") or "./model"

# Blob settings from environment
BLOB_CONN_STR = ""  # e.g. "DefaultEndpointsProtocol=...;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
BLOB_CONTAINER_NO_DET = os.environ.get("BLOB_CONTAINER_NO_DET", "no-detection-images")

# Translator settings from environment
TRANSLATOR_ENDPOINT = "https://proms-resource.cognitiveservices.azure.com"  # e.g. https://<resource>.cognitiveservices.azure.com
TRANSLATOR_KEY = ""
TRANSLATOR_REGION = "eastus2"  # optional, for multi-service endpoints

# Globals
_processor = None
_model = None
_blob_container_client = None


def _find_model_dir(base_dir):
    try:
        entries = [p for p in os.listdir(base_dir) if not p.startswith(".")]
    except Exception:
        return base_dir
    if len(entries) == 1 and os.path.isdir(os.path.join(base_dir, entries[0])):
        return os.path.join(base_dir, entries[0])
    return base_dir


def init():
    global _processor, _model, _blob_container_client

    model_path = _find_model_dir(MODEL_DIR)
    print(f"[init] Using model path: {model_path}")

    _processor = Blip2Processor.from_pretrained(model_path, local_files_only=True)
    _model = Blip2ForConditionalGeneration.from_pretrained(model_path, local_files_only=True).to(DEVICE).eval()
    print("[init] BLIP-2 model loaded.")

    if not BLOB_CONN_STR:
        print("[init] WARNING: BLOB_CONN_STR not set. No-detection images will NOT be uploaded.")
        _blob_container_client = None
    else:
        blob_service = BlobServiceClient.from_connection_string(BLOB_CONN_STR)
        _blob_container_client = blob_service.get_container_client(BLOB_CONTAINER_NO_DET)
        try:
            _blob_container_client.create_container()
            print(f"[init] Created container: {BLOB_CONTAINER_NO_DET}")
        except Exception:
            print(f"[init] Using existing container: {BLOB_CONTAINER_NO_DET}")


def _upload_no_det_image(pil_img: Image.Image, orig_filename: str) -> str:
    global _blob_container_client
    if _blob_container_client is None:
        return ""

    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    buf.seek(0)

    stem = "no_det"
    if orig_filename:
        stem = os.path.splitext(os.path.basename(orig_filename))[0]
    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    name = f"{stem}_{now}_{uuid.uuid4().hex[:6]}.png"
    _blob_container_client.upload_blob(name=name, data=buf, overwrite=True)
    return f"{_blob_container_client.url}/{name}"


def translate_to_korean_via_azure(text: str) -> str:
    """
    Synchronous call to Azure Translator Text API.
    Expects TRANSLATOR_ENDPOINT and TRANSLATOR_KEY set as env vars.
    Supports both 'cognitiveservices.azure.com' style custom endpoint and the regional endpoint (api-version).
    """
    if not TRANSLATOR_ENDPOINT or not TRANSLATOR_KEY:
        return text

    # detect whether endpoint looks like custom domain (contains cognitiveservices.azure.com)
    is_custom_domain = "cognitiveservices.azure.com" in TRANSLATOR_ENDPOINT.lower()

    headers = {
        "Ocp-Apim-Subscription-Key": TRANSLATOR_KEY,
        "Content-Type": "application/json"
    }
    if TRANSLATOR_REGION:
        headers["Ocp-Apim-Subscription-Region"] = TRANSLATOR_REGION

    if is_custom_domain:
        url = f"{TRANSLATOR_ENDPOINT}/translator/text/v3.0/translate"
        params = {"to": "ko", "from": "en"}
    else:
        url = f"{TRANSLATOR_ENDPOINT}/translate"
        params = {"api-version": "3.0", "to": "ko", "from": "en"}

    body = [{"text": text}]
    try:
        resp = requests.post(url, params=params, headers=headers, json=body, timeout=15.0)
        resp.raise_for_status()
        j = resp.json()
        # response shape: [ { "translations": [ { "text": "...", "to": "ko" } ] } ]
        return j[0]["translations"][0]["text"]
    except Exception as e:
        print("[translate] error:", str(e))
        return text  # fallback to original English


def normalize_terms_ko(text: str) -> str:
    repl = {
        "맨홀 뚜껑": "맨홀",
        "맨홀덮개": "맨홀",
        "관개 구멍 덮개": "맨홀",
        "교통 콘": "라바콘",
        "콘 ": "라바콘 "
    }
    for s, d in repl.items():
        text = text.replace(s, d)
    return text


def run(request_json):
    """
    request_json: { "image_base64": "...", "orig_filename": "foo.jpg" }
    Returns: { caption_en, caption_ko, blob_url, blob_name } or { error: ... }
    """
    try:
        if request_json is None:
            return {"error": "No input provided"}
        
        if isinstance(request_json, bytes):
            try:
                request_json = request_json.decode("utf-8")
            except Exception as e:
                return {"error": f"Failed to decode bytes input: {e}"}

        if isinstance(request_json, str):
            # try to parse JSON string
            try:
                request_json = json.loads(request_json)
            except Exception as e:
                return {"error": f"Failed to parse JSON string input: {e}"}

        if not isinstance(request_json, dict):
            return {"error": f"Unexpected input type: {type(request_json)}"}

        image_b64 = request_json.get("image_base64") or request_json.get("data") or request_json.get("image")
        orig_filename = request_json.get("orig_filename", "")

        if not image_b64:
            return {"error": "Missing 'image_base64' in request JSON"}

        img_bytes = base64.b64decode(image_b64)
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        prompt = (
            "Look ONLY at clearly visible objects in the image. Do not guess.\n"
            "If you CANNOT clearly see any damage, reply EXACTLY:\n"
            "\"No damaged object is visible.\"\n"
            "Otherwise, answer in this format:\n"
            "Object: <main object>, \n"
            "Damage Location: <one of: top-left, top-right, center, bottom-left, bottom-right>, \n"
            "Damage Type: <one of: crack, hole, scratch, broken, bent>\n\n"
            "----\n"
            "Example:\n"
            "Object: manhole cover, Damage Location: top-left, Damage Type: crack\n"
            "----\n"
            "Use short, factual phrases. No extra text."
        )

        inputs = _processor(images=pil_image, text=prompt, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            outputs = _model.generate(**inputs, max_new_tokens=100, do_sample=False, temperature=0.0, num_beams=1)
        caption_en = _processor.tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

        # translate and normalize
        caption_ko = translate_to_korean_via_azure(caption_en)
        caption_ko = normalize_terms_ko(caption_ko)

        # Upload original image to Blob (no-detection record)
        blob_url = ""
        try:
            blob_url = _upload_no_det_image(pil_image, orig_filename)
        except Exception as e:
            print("[run] blob upload failed:", str(e))

        return {
            "status": "분류불가",
            "caption_en": caption_en,
            "caption_ko": caption_ko,
            "blob_url": blob_url,
            "blob_name": os.path.basename(blob_url) if blob_url else ""
        }
    except Exception as e:
        print("[run] Exception:", str(e))
        return {"error": str(e)}