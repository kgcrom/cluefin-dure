---
name: investment-journal
description: 투자 판단, 매수/매도 이유, 기준선, 사후 복기 항목을 .pi/investments/journal/에 기록한다. 개인 투자 습관 개선과 포트폴리오 분석에 사용한다.
---

# Investment Journal

투자 판단이 끝나면 사용자의 확인을 받은 뒤 journal 파일로 기록한다.

저장 위치:
- `.pi/investments/journal/YYYY-MM-DD-SYMBOL.md`

관련 파일:
- `.pi/investments/portfolio.yaml`: 현재 보유 현황과 투자 원칙
- `.pi/investments/watchlist.yaml`: 관심 종목과 관찰 조건
- `.pi/investments/transactions.csv`: 실제 매수/매도 실행 기록

파일이 없으면 임의로 투자 정보를 채우지 말고, 필요한 최소 템플릿만 제안한다.

기록 항목:
- 날짜
- 시장
- 종목코드
- 기업명
- 당시 가격
- 최종 의견: buy, hold, sell, watch
- 진입 기준
- 손절 기준
- 목표가
- 핵심 근거
- 가장 큰 리스크
- bull case
- bear case
- 무효화 조건
- 사후 복기 예정일
- 추적할 지표

감정적 판단, 추격 매수, 손절 회피 징후가 있으면 별도로 표시한다.

주의:
- 실제 매수/매도 실행 기록은 `transactions.csv`에 남긴다.
- 보유 수량, 평균단가, 현금 잔고는 사용자의 명시적 요청 없이 수정하지 않는다.
- 개인 투자 기록은 민감 정보로 취급한다.
