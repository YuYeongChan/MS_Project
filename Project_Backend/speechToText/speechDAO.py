import re

class SpeechDAO:
    def parse_report_result(self,reportResult: str) -> dict:
        # 문서 참조 제거 ([doc2], [doc3] 등)
        clean_text = re.sub(r'\[doc\d+\]', '', reportResult).strip()

        # 각 항목별 정규표현식 추출
        pattern = r'1\. 장소:\s*(.*?)\s*2\. 공공기물 종류:\s*(.*?)\s*3\. 발견된 문제 또는 점검 필요 사유:\s*(.*)'
        match = re.search(pattern, clean_text, re.DOTALL)

        if match:
            return {
                "장소": match.group(1).strip(),
                "공공기물 종류": match.group(2).strip(),
                "발견된 문제 또는 점검 필요 사유": match.group(3).strip()
            }
        else:
            return {}