import logging
import whisper
from openai import AzureOpenAI
import sys
import os

# 경로 설정
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from Project_Backend.speechToText.speechDAO import SpeechDAO

# DAO 인스턴스
dao = SpeechDAO()

# Whisper 모델 로딩
model = whisper.load_model("base")

# Azure OpenAI 클라이언트 설정
client = AzureOpenAI(
    azure_endpoint="https://team01-05-4067-resource.openai.azure.com/",
            
    api_version="2024-12-01-preview", 
)

#  핵심 함수 정의
def process_audio_and_get_structured_data(audio_path: str) -> dict:
    # 1. Whisper 텍스트 추출
    TxtResult = model.transcribe(audio_path, language="ko")
    userInput = TxtResult["text"]
    print("음성신고 텍스트: ",userInput)

    # 2. GPT 프롬프트 구성
    conversation = [{
        "role": "system",
        "content": (
                "너는 AI 비서야. 사용자 말을 듣고 아래 '출력 형식'을 글자 하나도 틀리지 않고 그대로 따라해야 해. 이건 매우 중요한 규칙이야.\n"
                    "## 절대 규칙:\n"
                    "1. 응답은 무조건 한 줄이어야 해. 절대 줄바꿈(\n)을 사용하면 안돼.\n"
                    "2. '1. 장소: ', '2. 공공기물 종류: ', '3. 발견된 문제 또는 점검 필요 사유: ' 이 양식을 그대로 써야 해.\n"
                    "3. 각 항목 내용 뒤에 마침표나 다른 기호를 붙이지 마.\n"
                    "\n"
                    "## 내용 규칙:\n"
                    "- 정보가 없으면 항목 내용에 '내용 없음' 이라고 적어.\n"
                    "- 장소 이름이 틀렸으면(예: 성도구,충청시) 올바르게(예: 성북구,춘천시) 고쳐줘.\n"
                    "\n"
                    "## 완벽한 출력 예시 (이 형태를 반드시 지켜야 해):\n"
                    "1. 장소: 서울시 성북구 보도블록 2. 공공기물 종류: 벤치 3. 발견된 문제 또는 점검 필요 사유: 다리가 부서져 있음"
        )
    }, {
        "role": "user",
        "content": userInput
    }]

    # 3. GPT 호출

    res = client.chat.completions.create(
        model="gpt-4.1",
        messages=conversation,
        extra_body={
            "data_sources": [
                {
                    "type": "azure_search",
                    "parameters": {
                        "endpoint": "https://ainuri-search.search.windows.net",
                        "index_name": "ainuri-index",
                        "authentication": {
                                # 따로 ai search리소스 찾아 들어가서 설정 - 키 - 기본 관리자 키
                        },
                        "embedding_dependency": {
                            "type": "endpoint",
                            "endpoint": "https://team01-05-4067-resource.cognitiveservices.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview",
                            "authentication": {                    
                            },
                        }
                    },
                }
            ]
        }
    )

    reportResult = res.choices[0].message.content
    print(reportResult)
    # 4. 구조화 결과 파싱
    parsed = dao.parse_report_result(reportResult)
    return parsed



