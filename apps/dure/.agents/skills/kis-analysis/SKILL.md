---
name: kis-analysis
description: >
  KIS(한국투자증권) 시세분석 및 순위분석을 수행할 때 사용한다.
  투자자별/회원사별 매매동향, 프로그램매매, 공매도, 신용잔고, 외국인 순매수,
  거래량/등락률/시가총액/배당수익률 등 각종 순위 정보를 포함한다.
---

# KIS Analysis

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- stock_code: 6자리 숫자 (예: "005930")
- market: "J"(KOSPI), "NX"(KOSDAQ). 순위 조회 시 필수
- 날짜: YYYYMMDD 형식

## 메서드

### 시세분석 (29개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kis.market_analysis.trading_weight_by_amount` | 거래대금별 거래비중 | (시그니처 참조) | |
| `kis.market_analysis.buy_sell_volume_by_stock_daily` | 종목별 일별 매수매도 체결량 | (시그니처 참조) | |
| `kis.market_analysis.investor_trend_by_stock_daily` | 종목별 일별 투자자 동향 | (시그니처 참조) | |
| `kis.market_analysis.investor_trend_by_market_daily` | 시장별 일별 투자자 동향 | (시그니처 참조) | |
| `kis.market_analysis.investor_trend_by_market_intraday` | 시장별 장중 투자자 동향 | (시그니처 참조) | |
| `kis.market_analysis.foreign_brokerage_aggregate` | 외국인 증권사별 집계 | (시그니처 참조) | |
| `kis.market_analysis.institutional_foreign_aggregate` | 기관/외국인 집계 | (시그니처 참조) | |
| `kis.market_analysis.foreign_net_buy_trend` | 외국인 순매수 추이 | (시그니처 참조) | |
| `kis.market_analysis.foreign_institutional_estimate` | 외국인/기관 추정 | (시그니처 참조) | |
| `kis.market_analysis.member_trend_by_stock` | 종목별 회원사 동향 | (시그니처 참조) | |
| `kis.market_analysis.member_trend_tick` | 회원사 틱 동향 | (시그니처 참조) | |
| `kis.market_analysis.program_summary_daily` | 프로그램 일별 요약 | (시그니처 참조) | |
| `kis.market_analysis.program_summary_intraday` | 프로그램 장중 요약 | (시그니처 참조) | |
| `kis.market_analysis.program_trend_by_stock_daily` | 종목별 프로그램 일별 | (시그니처 참조) | |
| `kis.market_analysis.program_trend_by_stock_intraday` | 종목별 프로그램 장중 | (시그니처 참조) | |
| `kis.market_analysis.program_investor_trend_today` | 프로그램 투자자 당일 동향 | (시그니처 참조) | |
| `kis.market_analysis.short_selling_trend_daily` | 공매도 일별 추이 | (시그니처 참조) | |
| `kis.market_analysis.stock_loan_trend_daily` | 대차잔고 일별 추이 | (시그니처 참조) | |
| `kis.market_analysis.credit_balance_trend_daily` | 신용잔고 일별 추이 | (시그니처 참조) | |
| `kis.market_analysis.resistance_level_trading_weight` | 저항선 거래비중 | (시그니처 참조) | |
| `kis.market_analysis.limit_price_stocks` | 가격제한 종목 | (시그니처 참조) | |
| `kis.market_analysis.market_fund_summary` | 시장 자금 요약 | (시그니처 참조) | |
| `kis.market_analysis.expected_price_trend` | 예상가 추이 | (시그니처 참조) | |
| `kis.market_analysis.after_hours_expected_fluctuation` | 시간외 예상 등락 | (시그니처 참조) | |
| `kis.market_analysis.watchlist_groups` | 관심종목 그룹 | (시그니처 참조) | |
| `kis.market_analysis.watchlist_stocks_by_group` | 그룹별 관심종목 | (시그니처 참조) | |
| `kis.market_analysis.watchlist_multi_quote` | 관심종목 복수 시세 | (시그니처 참조) | |
| `kis.market_analysis.condition_search_list` | 조건검색 목록 | (시그니처 참조) | |
| `kis.market_analysis.condition_search_result` | 조건검색 결과 | (시그니처 참조) | |

### 순위분석 (23개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kis.ranking.trading_volume` | 거래량 순위 | `market` | `sector_code`, `classification`, `sort_by` |
| `kis.ranking.stock_fluctuation` | 등락률 순위 | `market` | |
| `kis.ranking.large_execution_count` | 대량체결 건수 상위 | `market` | |
| `kis.ranking.execution_strength` | 체결강도 상위 | `market` | |
| `kis.ranking.after_hours_fluctuation` | 시간외 등락률 순위 | `market` | |
| `kis.ranking.after_hours_volume` | 시간외 거래량 순위 | `market` | |
| `kis.ranking.market_cap` | 시가총액 상위 | `market` | |
| `kis.ranking.profit` | 수익률 상위 | `market` | |
| `kis.ranking.expected_execution_rise_decline` | 예상체결 등락 상위 | `market` | |
| `kis.ranking.hoga_quantity` | 호가 잔량 순위 | `market` | |
| `kis.ranking.preferred_stock_ratio` | 우선주 비율 상위 | `market` | |
| `kis.ranking.market_price` | 시세 순위 | `market` | |
| `kis.ranking.credit_balance` | 신용잔고 상위 | `market` | |
| `kis.ranking.short_selling` | 공매도 상위 | `market` | |
| `kis.ranking.disparity_index` | 이격도 순위 | `market` | |
| `kis.ranking.proprietary_trading` | 자기매매 상위 | `market` | |
| `kis.ranking.dividend_yield` | 배당수익률 상위 | `market` | |
| `kis.ranking.finance_ratio` | 재무비율 순위 | `market` | |
| `kis.ranking.profitability_indicator` | 수익성지표 순위 | `market` | |
| `kis.ranking.new_high_low_approaching` | 신고/신저 접근 상위 | `market` | |
| `kis.ranking.watchlist_registration` | 관심종목 등록 상위 | `market` | |
| `kis.ranking.hts_inquiry_top_20` | HTS 조회 상위 20 | | |
| `kis.ranking.time_hoga` | 시간대 호가 순위 | `market` | |

## 사용 예시

```bash
# KOSPI 거래량 순위
bun run start call kis.ranking.trading_volume '{"market":"J"}'

# 삼성전자 외국인 순매수 추이
bun run start call kis.market_analysis.foreign_net_buy_trend '{"stock_code":"005930"}'

# KOSPI 시가총액 상위
bun run start call kis.ranking.market_cap '{"market":"J"}'
```
