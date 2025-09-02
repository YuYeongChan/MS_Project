# Ainuri 프로젝트

![팀 전체 사진](발표%20자료/DSC00560.JPG)

## 📌 프로젝트 소개
**Ainuri**는 시민 참여형 공공기물 파손 신고 및 관리 플랫폼입니다.  
AI를 활용한 자동 인식과 관리 시스템을 통해 도시 환경을 효율적으로 유지하고, 행정 효율성과 시민 편의를 높이는 것을 목표로 합니다.  

## 🚀 주요 기능
- **AI 기반 이미지 분석**: Mask R-CNN, SAM, BLIP-2를 이용한 파손 인식 및 설명 자동화  
- **시민 참여 앱**: React Native 기반 앱으로 파손 신고 및 조회 가능  
- **관리자 웹/앱**: 신고 접수, AI 분석 결과 확인, 보수 진행 상황 관리  
- **알림 서비스**: 관리자·사용자 대상 푸시 알림 제공  

## 📂 프로젝트 구조
```
ms_project/
 ┣ ai/                # AI 모델 및 API (Mask R-CNN, SAM, BLIP-2 등)
 ┣ city_snap/         # React Native 기반 프론트엔드
 ┣ Project_Backend/   # FastAPI 백엔드 + OracleDB 연동
 ┣ 발표자료/          # 발표 자료 및 시연 영상
```

## 🎥 시연 영상
[![시연 영상](발표%20자료/DSC00560.JPG)](발표%20자료/시연영상.mp4)  
👉 클릭하면 시연 영상을 확인할 수 있습니다.

## 📑 발표 자료
- [최종 발표 PPT 보기](발표%20자료/Ainuri_최종발표_제출용.pptx)

## ⚙️ 기술 스택
- **프론트엔드**: React Native, Expo  
- **백엔드**: FastAPI, OracleDB, Azure ML/ACI  
- **AI 모델**: Mask R-CNN, SAM, BLIP-2, Whisper  
- **클라우드/배포**: Microsoft Azure, Docker, ACR/ACI  
- **기타**: Python, PyTorch, Node.js, MongoDB, VSCode  
