---
name: kis-quote
description: >
  KIS(한국투자증권) 기본시세 및 업종/기타 시세를 조회할 때 사용한다.
  주식 현재가, 일봉/분봉 차트, 호가, 투자자별 매매동향, 시간외 시세,
  ETF/ETN 시세, 업종지수, 변동성완화장치(VI) 상태, 휴장일 등을 포함한다.
---

# KIS Quote

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- stock_code: 6자리 숫자 (예: "005930")
- market: "J"(KOSPI), "NX"(KOSDAQ), "UN"(KONEX). 기본값 "J"
- 날짜: YYYYMMDD 형식
- 시간: HHMMSS 형식
- period: "D"(일), "W"(주), "M"(월), "Y"(년)
- adj_price: "0"(수정주가), "1"(원주가). 기본값 "0"

## 메서드

### 기본시세 (21개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kis.basic_quote.stock_current_price` | 주식 현재가 | `stock_code` | `market` |
| `kis.basic_quote.stock_current_price_2` | 주식 현재가 (상세) | `stock_code` | `market` |
| `kis.basic_quote.stock_conclusion` | 체결 내역 | `stock_code` | `market` |
| `kis.basic_quote.stock_daily` | 일/주/월봉 차트 | `stock_code` | `market`, `period`, `adj_price` |
| `kis.basic_quote.stock_asking_expected` | 호가/예상체결 | `stock_code` | `market` |
| `kis.basic_quote.stock_investor` | 투자자별 매매동향 | `stock_code` | `market` |
| `kis.basic_quote.stock_member` | 회원사별 매매동향 | `stock_code` | `market` |
| `kis.basic_quote.stock_period_quote` | 기간별 시세 | `stock_code`, `start_date`, `end_date` | `market`, `period`, `adj_price` |
| `kis.basic_quote.stock_today_minute` | 당일 분봉 | `stock_code` | `market`, `hour` |
| `kis.basic_quote.stock_daily_minute` | 일별 분봉 | `stock_code` | (시그니처 참조) |
| `kis.basic_quote.stock_time_conclusion` | 시간대별 체결 | `stock_code` | `market`, `hour` |
| `kis.basic_quote.stock_overtime_daily_price` | 시간외 일별 시세 | `stock_code` | `market` |
| `kis.basic_quote.stock_overtime_conclusion` | 시간외 체결 | `stock_code` | `market` |
| `kis.basic_quote.stock_overtime_current_price` | 시간외 현재가 | `stock_code` | `market` |
| `kis.basic_quote.stock_overtime_asking_price` | 시간외 호가 | `stock_code` | `market` |
| `kis.basic_quote.stock_closing_expected_price` | 장마감 예상가 | `stock_code` | `market` |
| `kis.basic_quote.etf_etn_current_price` | ETF/ETN 현재가 | `stock_code` | |
| `kis.basic_quote.etf_component_stock_price` | ETF 구성종목 시세 | `stock_code` | (시그니처 참조) |
| `kis.basic_quote.etf_nav_comparison_trend` | ETF NAV 비교 추이 | `stock_code` | (시그니처 참조) |
| `kis.basic_quote.etf_nav_comparison_daily` | ETF NAV 비교 일별 | `stock_code` | (시그니처 참조) |
| `kis.basic_quote.etf_nav_comparison_time` | ETF NAV 비교 시간별 | `stock_code` | (시그니처 참조) |

### 업종/기타 (14개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kis.issue_other.sector_current_index` | 업종 현재 지수 | `sector_code` | `market` |
| `kis.issue_other.sector_daily_index` | 업종 일별 지수 | `sector_code`, `start_date`, `end_date` | `market`, `period` |
| `kis.issue_other.sector_time_index_second` | 업종 초별 지수 | (시그니처 참조) | |
| `kis.issue_other.sector_time_index_minute` | 업종 분별 지수 | (시그니처 참조) | |
| `kis.issue_other.sector_minute_inquiry` | 업종 분 조회 | (시그니처 참조) | |
| `kis.issue_other.sector_period_quote` | 업종 기간별 시세 | (시그니처 참조) | |
| `kis.issue_other.sector_all_quote_by_category` | 업종별 전체 시세 | (시그니처 참조) | |
| `kis.issue_other.expected_index_trend` | 예상지수 추이 | (시그니처 참조) | |
| `kis.issue_other.expected_index_all` | 예상지수 전체 | (시그니처 참조) | |
| `kis.issue_other.volatility_interruption_status` | VI 발동 현황 | (시그니처 참조) | |
| `kis.issue_other.interest_rate_summary` | 금리 요약 | (시그니처 참조) | |
| `kis.issue_other.market_announcement_schedule` | 시장 공시 일정 | (시그니처 참조) | |
| `kis.issue_other.holiday_inquiry` | 휴장일 조회 | (시그니처 참조) | |
| `kis.issue_other.futures_business_day_inquiry` | 선물 영업일 조회 | (시그니처 참조) | |

## 사용 예시

```bash
# 삼성전자 현재가
bun run start call kis.basic_quote.stock_current_price '{"stock_code":"005930"}'

# 삼성전자 일봉 (최근 30일)
bun run start call kis.basic_quote.stock_period_quote '{"stock_code":"005930","start_date":"20260101","end_date":"20260228"}'

# KOSPI 업종지수
bun run start call kis.issue_other.sector_current_index '{"sector_code":"0001"}'
```
