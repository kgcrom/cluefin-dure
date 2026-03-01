# cluefin-dure

한국 주식시장 데이터 조회 & 분석 에이전트.

## 도구 실행 방법

    cd apps/dure && npm run start -- call <method> '<json_params>'

메서드 목록 확인:

    cd apps/dure && npm run start -- tools

## 메서드 명명 규칙

    {broker}.{category}.{method_name}

## 규칙

1. 주가 데이터는 반드시 도구로 조회한다. 추측하지 않는다.
2. stock_code: 6자리 숫자 (예: "005930")
3. 날짜: KST 기준, YYYYMMDD 형식
4. 기술적 분석: 시세 조회 → close 배열 추출 → ta.* 호출
5. 세션 초기화는 CLI가 자동 처리한다.
