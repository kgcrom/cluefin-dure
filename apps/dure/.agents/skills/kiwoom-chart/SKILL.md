---
name: kiwoom-chart
description: >
  Kiwoom(키움증권) 차트 및 ETF 데이터를 조회할 때 사용한다.
  주식/업종 틱·분·일·주·월·연 차트, 기관별 종목 차트,
  ETF 수익률·종목정보·추이·시세 등을 포함한다.
---

# Kiwoom Chart

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- stock_code: 6자리 숫자 (예: "005930")
- industry_code: 업종코드 (예: "001")
- base_date: YYYYMMDD 형식
- adj_price: "0"(수정주가), "1"(원주가)
- tic_scope: 틱범위

## 메서드

### 차트 (14개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.chart.stock_tick` | 주식 틱 차트 | `stock_code` | `tic_scope`, `adj_price` |
| `kiwoom.chart.stock_minute` | 주식 분봉 차트 | `stock_code` | `tic_scope`, `adj_price` |
| `kiwoom.chart.stock_daily` | 주식 일봉 차트 | `stock_code` | `base_date`, `adj_price` |
| `kiwoom.chart.stock_weekly` | 주식 주봉 차트 | `stock_code` | `base_date`, `adj_price` |
| `kiwoom.chart.stock_monthly` | 주식 월봉 차트 | `stock_code` | `base_date`, `adj_price` |
| `kiwoom.chart.stock_yearly` | 주식 연봉 차트 | `stock_code` | `base_date`, `adj_price` |
| `kiwoom.chart.industry_tick` | 업종 틱 차트 | `industry_code` | `tic_scope` |
| `kiwoom.chart.industry_minute` | 업종 분봉 차트 | `industry_code` | `tic_scope` |
| `kiwoom.chart.industry_daily` | 업종 일봉 차트 | `industry_code` | `base_date` |
| `kiwoom.chart.industry_weekly` | 업종 주봉 차트 | `industry_code` | `base_date` |
| `kiwoom.chart.industry_monthly` | 업종 월봉 차트 | `industry_code` | `base_date` |
| `kiwoom.chart.industry_yearly` | 업종 연봉 차트 | `industry_code` | `base_date` |
| `kiwoom.chart.institutional_by_stock` | 기관별 종목 차트 | `stock_code`, `date` | `amount_qty_type`, `trade_type`, `unit_type` |
| `kiwoom.chart.intraday_investor_trading` | 장중 투자자 매매 | `market_type` | `amount_qty_type`, `trade_type`, `stock_code` |

### ETF (9개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.etf.return_rate` | ETF 수익률 | `stock_code`, `index_code`, `period` | |
| `kiwoom.etf.item_info` | ETF 종목정보 | `stock_code` | |
| `kiwoom.etf.daily_trend` | ETF 일별 추이 | `stock_code` | |
| `kiwoom.etf.full_price` | ETF 전체 시세 | | `tax_type`, `nav_premium`, `management_company`, `tax_yn`, `trace_index`, `exchange_type` |
| `kiwoom.etf.hourly_trend` | ETF 시간별 추이 | `stock_code` | |
| `kiwoom.etf.hourly_execution` | ETF 시간별 체결 | `stock_code` | |
| `kiwoom.etf.daily_execution` | ETF 일별 체결 | `stock_code` | |
| `kiwoom.etf.hourly_execution_v2` | ETF 시간별 체결 v2 | `stock_code` | |
| `kiwoom.etf.hourly_trend_v2` | ETF 시간별 추이 v2 | `stock_code` | |

## 사용 예시

```bash
# 삼성전자 일봉 차트
bun run start call kiwoom.chart.stock_daily '{"stock_code":"005930"}'

# 삼성전자 분봉 차트
bun run start call kiwoom.chart.stock_minute '{"stock_code":"005930","tic_scope":"1"}'

# KODEX 200 ETF 수익률
bun run start call kiwoom.etf.return_rate '{"stock_code":"069500","index_code":"001","period":0}'
```
