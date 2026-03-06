---
name: ranking-analysis
description: >
  거래량/시총/밸류에이션 순위, 기관·외국인 수급 분석, 공매도, 프로그램 매매, 조건 검색.
  모멘텀 스크리닝, 수급 분석, 공매도 집중 모니터링, 조건 검색 결과 조회에 사용한다.
---

# Ranking & Analysis — 순위 및 시세 분석

## 실행 방법

    cd apps/dure && npm run start -- call <method> '<json_params>'

---

## 활용 시나리오

- **모멘텀 스크리닝**: `ranking.volume` + `ranking.new_high_low` → 강한 모멘텀 종목 발굴
- **수급 분석**: `analysis.institutional_foreign` + `program.investor_trend` → 스마트머니 흐름 파악
- **공매도 집중**: `ranking.short_selling` + `analysis.short_selling_trend` → 쇼트 커버링 기회
- **테마 강세**: `ranking.execution_strength` → 체결 강도 높은 종목 = 강한 매수 압력

---

## 거래량 / 모멘텀 순위

### `ranking.volume` — 거래량 순위

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `market_code` | string | | J=코스피, Q=코스닥 (기본: 전체) |

**반환**: 종목코드, 종목명, 거래량, 전일 대비 거래량 증가율

---

### `ranking.execution_strength` — 체결 강도 상위

체결 강도(매수 체결 / 매도 체결 × 100) 높은 종목.
체결 강도 > 100: 매수세 우위, < 100: 매도세 우위.

---

### `ranking.new_high_low` — 신고가/신저가 접근 종목

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `market_code` | string | | 시장 구분 |

**반환**: 52주/연중 신고가 근접 종목, 신저가 근접 종목

---

### `ranking.large_execution` — 대량 체결 상위

단일 체결에서 대량 거래 발생 종목. 이상 거래 모니터링에 유용.

---

## 밸류에이션 / 배당 순위

### `ranking.market_cap` — 시가총액 순위

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `market_code` | string | | 시장 구분 |

---

### `ranking.market_value` — PER/PBR/EPS 기반 시장가치 순위

저PER, 저PBR 종목 스크리닝에 활용.

---

### `ranking.dividend_yield` — 배당수익률 순위

고배당 종목 스크리닝. 배당락일 전후 전략 수립에 유용.

---

### `ranking.finance_ratio` — 재무비율 순위

부채비율, 유동비율 등 재무 건전성 기반 순위.

---

### `ranking.profitability` — 수익성 순위

ROE, ROA 기준 상위 종목.

---

## 외국인 / 기관 수급 순위

### `ranking.foreigner_period` — 외국인 기간별 순매수 순위

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `period` | string | | 1D, 5D, 20D, 60D |
| `market_code` | string | | 시장 구분 |

**해석**: 외국인 60일 순매수 상위 = 중기 외국인 매집 종목

---

### `ranking.net_buy_trader` — 순매수 거래원 순위

특정 종목의 증권사별 순매수. "큰손" 거래원 파악.

---

### `ranking.securities_firm` — 증권사별 순위

증권사별 매매 비중.

---

### `analysis.institutional_foreign` — 기관/외국인 매매 분석

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |
| `date` | string | | 기준일 (YYYYMMDD) |

**반환**: 기간별 기관/외국인 순매수 추이, 보유 비중

---

### `analysis.foreign_net_buy` — 외국인 순매수 분석

외국인 순매수 상위 및 보유 비중 변화.

---

### `analysis.institutional` — 기관별 분석

연기금, 투신, 보험 등 기관 유형별 매매 분석.

---

## 공매도 / 신용

### `ranking.short_selling` — 공매도 순위

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `market_code` | string | | 시장 구분 |

**반환**: 공매도 거래량 비율 상위 종목

**해석**: 공매도 비율 급증 → 주가 하락 압력. 단, 쇼트커버링 시 급등 가능.

---

### `ranking.credit` — 신용 잔고 순위

신용 잔고 비율 높은 종목 = 반대매매 리스크 주의.

---

### `analysis.short_selling_trend` — 공매도 추이

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |

**반환**: 일별 공매도 거래량, 잔고, 잔고 비율 추이

---

## 프로그램 매매

### `program.investor_trend` — 프로그램 매매 투자자 동향

시장 전체 프로그램 매매 현황. 차익 vs 비차익 구분.

---

### `program.summary_daily` — 프로그램 일별 요약

---

### `program.by_stock_daily` — 종목별 프로그램 일별

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |

---

### `program.cumulative` — 누적 프로그램 매매

중기 프로그램 매매 누적 흐름. 인덱스 편입/편출 효과 분석.

---

## 조건 검색 / 관심종목

### `analysis.condition_search_list` — HTS 조건 검색 목록

저장된 조건 검색식 목록 반환.

---

### `analysis.condition_search_result` — 조건 검색 결과

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `condition_index` | number | O | 조건 검색식 인덱스 |

**반환**: 조건을 만족하는 종목 목록

---

### `analysis.watchlist_multi_quote` — 관심종목 멀티시세

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cds` | string[] | O | 종목코드 배열 |

**반환**: 여러 종목의 현재가를 한 번에 조회

---

## 사용 예시

```bash
# 코스피 거래량 상위
npm run start -- call ranking.volume '{"market_code":"J"}'

# 외국인 20일 순매수 상위
npm run start -- call ranking.foreigner_period '{"period":"20D","market_code":"J"}'

# 삼성전자 기관/외국인 매매 분석
npm run start -- call analysis.institutional_foreign '{"stk_cd":"005930"}'

# 공매도 상위 종목
npm run start -- call ranking.short_selling '{"market_code":"J"}'

# 삼성전자 공매도 추이
npm run start -- call analysis.short_selling_trend '{"stk_cd":"005930"}'
```
