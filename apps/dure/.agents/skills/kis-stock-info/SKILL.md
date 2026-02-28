---
name: kis-stock-info
description: >
  KIS(한국투자증권) 종목정보를 조회할 때 사용한다.
  종목 기본정보, 재무제표(대차대조표, 손익계산서), 재무비율,
  배당/합병/분할/증자 등 KSD 일정, 투자의견, 대차 가능 종목 등을 포함한다.
---

# KIS Stock Info

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- stock_code: 6자리 숫자 (예: "005930")
- 날짜: YYYYMMDD 형식

## 메서드

### 종목정보 (26개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kis.stock_info.product_basic_info` | 상품 기본정보 | `stock_code` | |
| `kis.stock_info.stock_basic_info` | 주식 기본정보 | `stock_code` | |
| `kis.stock_info.balance_sheet` | 대차대조표 | `stock_code` | |
| `kis.stock_info.income_statement` | 손익계산서 | `stock_code` | |
| `kis.stock_info.financial_ratio` | 재무비율 | `stock_code` | |
| `kis.stock_info.profitability_ratio` | 수익성비율 | `stock_code` | |
| `kis.stock_info.other_key_ratio` | 기타 주요비율 | `stock_code` | |
| `kis.stock_info.stability_ratio` | 안정성비율 | `stock_code` | |
| `kis.stock_info.growth_ratio` | 성장성비율 | `stock_code` | |
| `kis.stock_info.margin_tradable_stocks` | 신용거래 가능 종목 | `stock_code` | |
| `kis.stock_info.ksd_dividend_decision` | KSD 배당 결정 | `stock_code` | |
| `kis.stock_info.ksd_stock_dividend_decision` | KSD 주식배당 결정 | `stock_code` | |
| `kis.stock_info.ksd_merger_split_decision` | KSD 합병/분할 결정 | `stock_code` | |
| `kis.stock_info.ksd_par_value_change_decision` | KSD 액면변경 결정 | `stock_code` | |
| `kis.stock_info.ksd_capital_reduction_schedule` | KSD 감자 일정 | `stock_code` | |
| `kis.stock_info.ksd_listing_info_schedule` | KSD 상장정보 일정 | `stock_code` | |
| `kis.stock_info.ksd_ipo_subscription_schedule` | KSD IPO 청약 일정 | `stock_code` | |
| `kis.stock_info.ksd_forfeited_share_schedule` | KSD 실권주 일정 | `stock_code` | |
| `kis.stock_info.ksd_deposit_schedule` | KSD 예탁 일정 | `stock_code` | |
| `kis.stock_info.ksd_paid_in_capital_increase_schedule` | KSD 유상증자 일정 | `stock_code` | |
| `kis.stock_info.ksd_stock_dividend_schedule` | KSD 주식배당 일정 | `stock_code` | |
| `kis.stock_info.ksd_shareholder_meeting_schedule` | KSD 주주총회 일정 | `stock_code` | |
| `kis.stock_info.estimated_earnings` | 추정실적 | `stock_code` | |
| `kis.stock_info.stock_loanable_list` | 대차 가능 종목 | `stock_code` | |
| `kis.stock_info.investment_opinion` | 투자의견 | `stock_code` | |
| `kis.stock_info.investment_opinion_by_brokerage` | 증권사별 투자의견 | `stock_code` | |

## 사용 예시

```bash
# 삼성전자 기본정보
bun run start call kis.stock_info.stock_basic_info '{"stock_code":"005930"}'

# 삼성전자 재무비율
bun run start call kis.stock_info.financial_ratio '{"stock_code":"005930"}'

# 삼성전자 투자의견
bun run start call kis.stock_info.investment_opinion '{"stock_code":"005930"}'
```
