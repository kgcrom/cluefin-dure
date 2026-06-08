# TODO

## Investment Decision Extension 도입 검토

현재 투자 리서치 흐름은 `.pi/prompts/market-review.md`가 전체 진행 순서를 지시하고, `.pi/skills/*`가 각 분석 역할을 담당하는 구조로 시작한다.

현재 기준 역할 분리는 다음과 같다.

- `/market-review`: 사용자가 실행하는 진입점이며, 시장/종목 입력부터 기본적 분석, 기술적 분석, 뉴스, 매크로, 데이터 sanity check, 포트폴리오 적합성, bull/bear 의견, 최종 판단까지의 순서를 지시한다.
- `market-data` extension: 키움증권, 한국투자증권, DART, Naver News 등 외부 데이터 공급자에서 가격, 재무, 공시, 뉴스, 매크로 데이터를 가져오는 도구를 제공한다.
- analysis skills: 수집된 데이터를 기본적 분석, 기술적 분석, 뉴스 분석, 매크로 분석, 포트폴리오 적합성, 리스크 관리, 최종 판단 관점으로 해석한다.

`investment-decision` extension은 처음부터 필요한 설계라기보다, `/market-review`가 반복 실행에서 불안정해질 때 코드로 고정하는 다음 단계로 본다.

### 지금 당장 만들지 않는 이유

초기 단계에서는 prompt와 skill이 더 유연하다. 분석 순서, 출력 형식, 데이터 점검 기준이 자주 바뀔 가능성이 크기 때문에, 먼저 `/market-review`와 skill 문서를 조정하면서 실제 사용 흐름을 검증한다.

`investment-decision` extension을 너무 일찍 만들면 아직 확정되지 않은 workflow가 TypeScript 코드에 고정된다. 그러면 분석 단계 변경, 출력 포맷 변경, skill 역할 조정이 불필요하게 무거워진다.

### 나중에 도입할 조건

아래 문제가 반복되면 `investment-decision` extension 도입을 검토한다.

- `/market-review`가 같은 입력에서도 단계 순서를 자주 건너뛰거나 바꾸는 경우
- 데이터 누락 또는 충돌 시 중단해야 하는데 계속 최종 판단까지 진행하는 경우
- bull, bear, final decision 결과를 구조화해서 저장하거나 비교해야 하는 경우
- 데이터 수집 결과를 캐싱하거나 중간 산출물로 파일에 남겨야 하는 경우
- 여러 provider 결과를 코드 레벨에서 병합, 우선순위 적용, fallback 처리해야 하는 경우
- `/market-decision KOSDAQ 247540`처럼 하나의 명령으로 항상 같은 리포트 구조를 생성해야 하는 경우

### 예상 역할

도입 시 `investment-decision` extension은 다음을 담당한다.

- 입력 검증: 시장, 종목명, 종목코드 표준화
- 실행 순서 고정: 데이터 수집, sanity check, 분석, bull/bear 의견, 최종 판단
- 중단 조건 처리: `data-sanity-check` 결과가 blocked이면 buy/sell 확정 판단 제한
- 중간 결과 저장: provider 원천 데이터, 정규화 데이터, 분석 결과를 구조화된 파일로 저장
- 최종 출력 생성: buy, hold, sell, watch와 기준선, 손절선, 무효화 조건, 추적 지표 정리

### 우선순위

1. `market-data` extension으로 데이터 수집 도구 구현
2. `/market-review` prompt와 analysis skills로 실제 리서치 흐름 검증
3. `data-sanity-check`와 `portfolio-fit`의 출력 품질 개선
4. 반복 실행 안정성이 부족할 때 `investment-decision` extension 도입
