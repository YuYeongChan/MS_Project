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

    # 2. GPT 프롬프트 구성
    conversation = [{
        "role": "system",
        "content": (
            "너는 신고 내용을 다음 세 항목으로 간단히 정리하는 도우미야.\n"
            "1. 장소\n2. 공공기물 종류\n3. 발견된 문제 또는 점검 필요 사유\n"
        "반드시 아래 지침을 지켜:\n"
        "1. 입력된 텍스트에 있는 정보만 사용해. 없는 내용을 새로 만들지 마.\n"
        "2. 장소 정보가 '성도구', '성서구'처럼 실제 존재하지 않는 행정구역인 경우, 실제 한국 행정구역(예: 성북구, 강남구 등)을 기준으로 가장 유사한 지명으로 수정해.\n"
        "3. 확실하지 않으면 해당 항목은 null로 남겨.\n"
        "4. 문장 전체가 아닌 요약된 키워드 형태로 작성하되 의미는 정확하게 전달해.\n"
        "5. 반드시 JSON 형식을 지켜서 출력해."
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
                        },
                    },
                }
            ]
        }
    )

    reportResult = res.choices[0].message.content

    # 4. 구조화 결과 파싱
    parsed = dao.parse_report_result(reportResult)
    return parsed



