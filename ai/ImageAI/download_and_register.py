
import os
from huggingface_hub import snapshot_download
from azureml.core import Run

run = Run.get_context()

target_dir = "blip2_model"
os.makedirs(target_dir, exist_ok=True)

snapshot_download(
    repo_id="Salesforce/blip2-flan-t5-xl",
    local_dir=target_dir,
    local_dir_use_symlinks=False,
    token=os.getenv("")
)

run.upload_folder(name="blip2_model", path=target_dir)
run.register_model(
    model_name="blip2-flan-t5-xl",
    model_path="blip2_model",
    description="BLIP-2 FLAN-T5-XL 모델"
)
