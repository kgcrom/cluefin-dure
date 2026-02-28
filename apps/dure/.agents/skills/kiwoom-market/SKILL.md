---
name: kiwoom-market
description: >
  Kiwoom(키움증권) 시세, 업종, 기관/외국인, 테마 데이터를 조회할 때 사용한다.
  종목 시세/호가, 기관별 매매동향, 체결강도, 프로그램매매,
  업종지수, 업종별 시세, 테마그룹, 외국인 순매수 추이 등을 포함한다.
---

# Kiwoom Market

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- stock_code: 6자리 숫자 (예: "005930")
- industry_code: 업종코드 (예: "001")
- market_type: "001"(KOSPI), "101"(KOSDAQ)
- exchange_type: "1"(KRX), "2"(NXT), "3"(SOR)
- 날짜: YYYYMMDD 형식

## 메서드

### 시세 (16개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.market_condition.stock_quote` | 종목 시세 | `stock_code` | |
| `kiwoom.market_condition.stock_quote_by_date` | 종목 일별 시세 | `stock_code` | |
| `kiwoom.market_condition.stock_price` | 종목 가격 | `stock_code` | |
| `kiwoom.market_condition.market_sentiment` | 시장 심리 | `stock_code` | |
| `kiwoom.market_condition.new_stock_warrant_price` | 신주인수권 시세 | `newstk_recvrht_tp` | |
| `kiwoom.market_condition.daily_institutional_trading` | 일별 기관 매매 | (시그니처 참조) | |
| `kiwoom.market_condition.institutional_trend_by_stock` | 종목별 기관 동향 | (시그니처 참조) | |
| `kiwoom.market_condition.execution_intensity_by_time` | 시간별 체결강도 | `stock_code` | |
| `kiwoom.market_condition.execution_intensity_by_date` | 일별 체결강도 | `stock_code` | |
| `kiwoom.market_condition.intraday_trading_by_investor` | 장중 투자자별 매매 | (시그니처 참조) | |
| `kiwoom.market_condition.after_market_trading_by_investor` | 시간외 투자자별 매매 | (시그니처 참조) | |
| `kiwoom.market_condition.securities_firm_trend` | 증권사별 종목 동향 | (시그니처 참조) | |
| `kiwoom.market_condition.daily_stock_price` | 일별 주가 | `stock_code` | `qry_dt`, `indc_tp` |
| `kiwoom.market_condition.after_hours_single_price` | 시간외 단일가 | `stock_code` | |
| `kiwoom.market_condition.program_trading_trend_by_time` | 시간별 프로그램매매 | (시그니처 참조) | |
| `kiwoom.market_condition.program_trading_cumulative` | 프로그램매매 누적 | (시그니처 참조) | |

### 업종 (6개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.sector.program` | 업종 프로그램매매 | `stock_code` | |
| `kiwoom.sector.investor_net_buy` | 업종 투자자 순매수 | `market_type` | `amount_qty_type`, `base_date`, `exchange_type` |
| `kiwoom.sector.current_price` | 업종 현재가 | `market_type`, `industry_code` | |
| `kiwoom.sector.price_by_sector` | 업종별 시세 | `market_type`, `industry_code` | `exchange_type` |
| `kiwoom.sector.all_index` | 전체 업종지수 | `industry_code` | |
| `kiwoom.sector.daily_current_price` | 업종 일별 현재가 | `market_type`, `industry_code` | |

### 기관/외국인 (3개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.foreign.investor_trading_trend` | 외국인 투자자 매매동향 | `stock_code` | |
| `kiwoom.foreign.stock_institution` | 종목별 기관 현황 | `stock_code` | |
| `kiwoom.foreign.consecutive_net_buy_sell` | 기관/외국인 연속 순매수/매도 | `period` | `market_type`, `stock_industry_type`, `amount_qty_type`, `exchange_type` |

### 테마 (2개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.theme.group` | 테마 그룹 목록 | | `query_type`, `date_type`, `theme_name`, `fluctuation_type`, `exchange_type`, `stock_code` |
| `kiwoom.theme.group_stocks` | 테마 그룹 구성종목 | `theme_group_code` | `exchange_type`, `date_type` |

## 사용 예시

```bash
# 삼성전자 시세
bun run start call kiwoom.market_condition.stock_quote '{"stock_code":"005930"}'

# KOSPI 업종 현재가
bun run start call kiwoom.sector.current_price '{"market_type":"001","industry_code":"001"}'

# 테마 그룹 목록
bun run start call kiwoom.theme.group '{}'
```
