---
name: kiwoom-stock-info
description: >
  Kiwoom(키움증권) 종목정보 및 순위정보를 조회할 때 사용한다.
  종목 기본정보, 매매원, 체결, 신용거래, 신고/신저가, 상한/하한가,
  거래량/등락률/시가총액/외국인 등 각종 순위 데이터를 포함한다.
---

# Kiwoom Stock Info

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- stock_code: 6자리 숫자 (예: "005930")
- market_type: "001"(KOSPI), "101"(KOSDAQ)
- exchange_type: "1"(KRX), "2"(NXT), "3"(SOR)
- 날짜: YYYYMMDD 형식

## 메서드

### 종목정보 (28개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.stock_info.basic` | 종목 기본정보 | `stock_code` | |
| `kiwoom.stock_info.trading_member` | 매매원 정보 | `stock_code` | |
| `kiwoom.stock_info.execution` | 체결 정보 | `stock_code` | |
| `kiwoom.stock_info.margin_trading_trend` | 신용거래 추이 | `stock_code` | `dt`, `qry_tp` |
| `kiwoom.stock_info.daily_trading_details` | 일별 거래 상세 | `stock_code` | `start_date` |
| `kiwoom.stock_info.new_high_low_price` | 신고/신저가 | `market_type` | `ntl_tp`, `high_low_close_tp`, `stk_cnd`, `trde_qty_tp`, `crd_cnd`, `updown_incls`, `dt`, `stex_tp` |
| `kiwoom.stock_info.upper_lower_limit` | 상한/하한가 | `market_type` | `updown_tp`, `sort_tp`, `stk_cnd`, `trde_qty_tp`, `crd_cnd`, `trde_gold_tp`, `stex_tp` |
| `kiwoom.stock_info.high_low_approach` | 고/저가 접근 | `stock_code` | `qry_tp` |
| `kiwoom.stock_info.price_volatility` | 가격 변동성 | `stock_code` | |
| `kiwoom.stock_info.volume_renewal` | 거래량 갱신 | | |
| `kiwoom.stock_info.supply_demand_concentration` | 수급 집중도 | | |
| `kiwoom.stock_info.high_per` | 고PER 종목 | `market_type` | |
| `kiwoom.stock_info.change_rate_from_open` | 시가 대비 등락률 | `market_type` | |
| `kiwoom.stock_info.trading_member_supply_demand` | 매매원 수급 분석 | `mmcm_cd` | |
| `kiwoom.stock_info.trading_member_instant_volume` | 매매원 순간 거래량 | `mmcm_cd` | |
| `kiwoom.stock_info.volatility_control_event` | 변동성완화장치 발동 | | |
| `kiwoom.stock_info.prev_day_execution_volume` | 전일 체결량 | | |
| `kiwoom.stock_info.daily_trading_by_investor` | 일별 투자자별 매매 | `start_date`, `end_date` | `market_type`, `stex_tp` |
| `kiwoom.stock_info.institutional_by_stock` | 종목별 기관 투자자 | `stock_code` | |
| `kiwoom.stock_info.total_institutional_by_stock` | 종목별 전체 기관 | `stock_code` | |
| `kiwoom.stock_info.prev_day_conclusion` | 전일 체결 | | |
| `kiwoom.stock_info.interest_stock` | 관심종목 정보 | | |
| `kiwoom.stock_info.summary` | 종목정보 요약 | | |
| `kiwoom.stock_info.basic_v1` | 종목 기본정보 v1 | `stock_code` | |
| `kiwoom.stock_info.industry_code` | 업종코드 조회 | `stock_code` | |
| `kiwoom.stock_info.member_company` | 회원사 목록 | | |
| `kiwoom.stock_info.program_net_buy_top50` | 프로그램 순매수 상위 50 | | |
| `kiwoom.stock_info.program_trading_by_stock` | 종목별 프로그램매매 | `stock_code` | |

### 순위정보 (22개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `kiwoom.rank_info.remaining_order_qty` | 잔여 주문수량 상위 | `market_type` | `sort_tp` |
| `kiwoom.rank_info.increasing_remaining_order` | 잔여 주문 급증 | `market_type` | |
| `kiwoom.rank_info.increasing_total_sell` | 총매도 급증 | `market_type` | |
| `kiwoom.rank_info.increasing_volume` | 거래량 급증 | `market_type` | |
| `kiwoom.rank_info.pct_change_from_prev` | 전일 대비 등락률 | `market_type` | `sort_tp` |
| `kiwoom.rank_info.expected_conclusion_pct_change` | 예상체결 등락률 | `market_type` | |
| `kiwoom.rank_info.current_day_volume` | 당일 거래량 상위 | `market_type` | |
| `kiwoom.rank_info.prev_day_volume` | 전일 거래량 상위 | `market_type` | |
| `kiwoom.rank_info.transaction_value` | 거래대금 상위 | `market_type` | |
| `kiwoom.rank_info.margin_ratio` | 증거금률 상위 | `market_type` | |
| `kiwoom.rank_info.foreigner_period_trading` | 외국인 기간별 매매 | `market_type` | |
| `kiwoom.rank_info.consecutive_net_buy_sell_foreigners` | 외국인 연속 순매수/매도 | `market_type` | |
| `kiwoom.rank_info.limit_exhaustion_rate_foreigner` | 외국인 한도소진율 | `market_type` | |
| `kiwoom.rank_info.foreign_account_group_trading` | 외국인 계좌그룹 매매 | `market_type` | |
| `kiwoom.rank_info.securities_firm_by_stock` | 종목별 증권사 순위 | `mmcm_cd` | |
| `kiwoom.rank_info.securities_firm_trading` | 증권사 매매 상위 | `market_type` | |
| `kiwoom.rank_info.current_day_major_traders` | 당일 주요 매매자 | `market_type` | |
| `kiwoom.rank_info.net_buy_trader` | 순매수 트레이더 순위 | `market_type` | |
| `kiwoom.rank_info.current_day_deviation_sources` | 당일 이탈 소스 | `market_type` | |
| `kiwoom.rank_info.same_net_buy_sell` | 동일 순매수/매도 순위 | `market_type` | |
| `kiwoom.rank_info.intraday_trading_by_investor` | 장중 투자자별 매매 | `market_type` | `amt_qty_tp`, `invsr` |
| `kiwoom.rank_info.after_hours_single_price_change` | 시간외 단일가 등락률 | `market_type` | |

## 사용 예시

```bash
# 삼성전자 기본정보
bun run start call kiwoom.stock_info.basic '{"stock_code":"005930"}'

# KOSPI 거래량 급증 종목
bun run start call kiwoom.rank_info.increasing_volume '{"market_type":"001"}'

# KOSPI 외국인 한도소진율
bun run start call kiwoom.rank_info.limit_exhaustion_rate_foreigner '{"market_type":"001"}'
```
