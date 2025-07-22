import whisper
from openai import AzureOpenAI
import sys
import os
import requests

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../Project_Backend")))
from speechToText.speechDAO import SpeechDAO

dao = SpeechDAO()

# 경로 확인 (선택 사항)
audio_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ai/whisper_gpt/audioSample.mp3"))
# 모델 로딩
model = whisper.load_model("base")  # 성능 따라 다른 모델 선택 가능

# 텍스트 추출
TxtResult = model.transcribe(audio_path, language="ko")

# 출력
print("📝 인식된 텍스트:")
print(TxtResult["text"])

#################################################################

client = AzureOpenAI(
    azure_endpoint="https://team01-05-4067-resource.openai.azure.com/",  # Azure OpenAI 엔드포인트
     # 🔒 여기에 Azure OpenAI API 키를 입력해야 합니다
    api_version="2024-12-01-preview", 
)

conversation = [{
    "role": "system",
    "content": (
        "너는 신고 내용을 다음 세 항목으로 간단히 정리하는 도우미야.\n"
        "1. 장소\n2. 공공기물 종류\n3. 발견된 문제 또는 점검 필요 사유\n"
        "각 항목은 한 줄로 간결하게 작성하고, 불필요한 문장은 추가하지 마."
    )
}]

userInput = TxtResult["text"]
conversation.append({"role": "user", "content": userInput})
res = client.chat.completions.create(
        model="gpt-4.1",
        messages=conversation,
        extra_body={
            "data_sources": [
                {
                    "type": "azure_search",
                    "parameters": {
                        "endpoint": "https://ainuri-search.search.windows.net",  # Azure Cognitive Search 엔드포인트
                        "index_name": "ainuri-index",
                        "authentication": {
                            # 영어로 "타입" :"에이피아이 키"
                             # 🔒 여기에 Azure Search Admin Key를 입력해야 합니다
                        },
                        "embedding_dependency": {
                            "type": "endpoint",
                            "endpoint": "https://team01-05-4067-resource.cognitiveservices.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview",
                            "authentication": {
                                # 영어로 "타입" :"에이피아이 키"
                                  # 🔒 여기에 Azure OpenAI API 키를 입력해야 합니다
                            },
                        },
                    },
                }
            ]
        },
    )

reportResult = res.choices[0].message.content
parsed = dao.parse_report_result(reportResult)
print("---------------------")
print("gpt 구조화 ")
print(reportResult)
print("---------------------")
print(parsed)

# ③ FastAPI로 GET 요청 보내기
params = {
    "location": parsed["장소"],
    "type": parsed["공공기물 종류"],
    "problem": parsed["발견된 문제 또는 점검 필요 사유"]
}

response = requests.get("http://localhost:9999/info.speechToText", params=params)

# ④ 응답 확인
print("---------------------")
print("FastAPI 응답 결과:")
print(response.json())