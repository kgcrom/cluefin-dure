# dure AI Agent 구현 계획 — Codex Agent + Skill

## 현재 상태

```
완료 (Phase 0):
  jsonrpc.ts              — JSON-RPC 2.0 프로토콜
  stdio-jsonrpc-client.ts — subprocess RPC 클라이언트
  tool-registry.ts        — RPC 메서드 발견 & 변환
  index.ts                — CLI (tools, call, quote)
  __tests__/              — mock RPC 서버 + integration 테스트

RPC 메서드 확장 예정:
  현재 30개 → 약 240개 (KIS 113 + Kiwoom ~100 추가)
  메서드 명명 변경: quote.kis.* → kis.basic_quote.*, quote.kiwoom.* → kiwoom.chart.*
  패턴: {broker}.{category}.{method_name}
```

## 접근 방식

**Codex Agent + Skill** 패턴으로 구현한다.

- **Agent**: Codex (ChatGPT 구독, API 키 불필요)
- **Skill**: cluefin-rpc 메서드를 도메인별로 묶은 지침 파일
- **도구 실행**: 기존 `bun run start call <method> <params>` CLI

```
사용자: "삼성전자 RSI 알려줘"
    │
    ▼
Codex (LLM)
    ├─ skill 매칭: kis-quote, technical-analysis
    ├─ SKILL.md 지침 로드
    ├─ 판단: 일봉 데이터 필요 → RSI 계산
    │
    ├─ $ bun run start call kis.basic_quote.stock_daily '{"stock_code":"005930"}'
    │   └─→ cluefin-rpc → KIS API → 일봉 데이터 반환
    │
    ├─ $ bun run start call ta.rsi '{"close":[...],"timeperiod":14}'
    │   └─→ cluefin-rpc → numpy 계산 → RSI 값 반환
    │
    └─ 결과 종합 → 사용자에게 답변
```

Codex는 skill의 description을 보고 어떤 skill을 쓸지 자동 판단하고,
SKILL.md의 지침에 따라 셸 커맨드로 cluefin-rpc를 호출한다.

---

## RPC 메서드 현황 (~240개)

### KIS — 한국투자증권 (113개, 5개 카테고리)

| 카테고리 | prefix | 메서드 수 | 주요 용도 |
|---|---|---|---|
| 기본시세 | `kis.basic_quote.*` | 21 | 현재가, 일봉, 호가, 분봉, 시간외 |
| 업종/기타 | `kis.issue_other.*` | 14 | 업종지수, 변동성, 금리, 휴장일 |
| 종목정보 | `kis.stock_info.*` | 26 | 재무제표, 배당, 투자의견, 신용 |
| 시세분석 | `kis.market_analysis.*` | 29 | 투자자 동향, 프로그램매매, 공매도 |
| 순위분석 | `kis.ranking.*` | 23 | 거래량/등락률/시가총액 순위 |

### Kiwoom — 키움증권 (~100개, 8개 카테고리)

| 카테고리 | prefix | 메서드 수 | 주요 용도 |
|---|---|---|---|
| 차트 | `kiwoom.chart.*` | 14 | 틱/분/일/주/월/연 차트, 업종차트 |
| ETF | `kiwoom.etf.*` | 9 | 수익률, 종목정보, 추세 |
| 기관/외국인 | `kiwoom.foreign.*` | 3 | 외국인/기관 매매 동향 |
| 시세 | `kiwoom.market_condition.*` | 16 | 호가, 체결강도, 프로그램매매 |
| 순위 | `kiwoom.rank_info.*` | 22 | 거래량/등락률/외국인 순위 |
| 업종 | `kiwoom.sector.*` | 6 | 업종 현재가, 투자자 순매수 |
| 종목정보 | `kiwoom.stock_info.*` | 28 | 종목상세, 신고가/신저가, 신용 |
| 테마 | `kiwoom.theme.*` | 2 | 테마 그룹, 테마 종목 |

### 기타

| 카테고리 | prefix | 메서드 수 |
|---|---|---|
| KRX | `quote.krx.*` | 2 |
| 기술적 분석 | `ta.*` | 11 |
| DART 공시 | `dart.*` | 4 |
| Meta/Session | `rpc.*`, `session.*` | 5 |

---

## Phase 1: Skill 정의

**목표**: 도메인별 SKILL.md 작성. ~240개 메서드를 8개 skill로 분류.

### 디렉터리 구조

```
apps/dure/.agents/skills/
├── kis-quote/              # 시세 조회 (basic_quote + issue_other)
│   └── SKILL.md
├── kis-stock-info/         # 종목 정보 & 재무
│   └── SKILL.md
├── kis-analysis/           # 시세분석 & 순위
│   └── SKILL.md
├── kiwoom-chart/           # 차트 & ETF
│   └── SKILL.md
├── kiwoom-market/          # 시세, 업종, 기관/외국인, 테마
│   └── SKILL.md
├── kiwoom-stock-info/      # 종목정보 & 순위
│   └── SKILL.md
├── technical-analysis/     # TA 지표 계산
│   └── SKILL.md
└── dart/                   # DART 공시
    └── SKILL.md
```

### 1-1. kis-quote Skill (35개 메서드)

```yaml
---
name: kis-quote
description: >
  KIS(한국투자증권) 시세 조회. 주식 현재가, 일봉/분봉 차트, 호가, 체결,
  투자자별 매매, ETF/ETN 시세, 업종 지수, 시간외 시세를 조회할 때 사용한다.
---
```

지침 내용:
- 세션 초기화 필수: `bun run start call session.initialize '{"broker":"kis"}'`
- stock_code는 6자리 숫자, market 기본값 "J"
- 날짜 형식 YYYYMMDD, 시간 형식 HHMMSS

카테고리별 메서드:

**kis.basic_quote (21개)**:
`stock_current_price`, `stock_current_price_2`, `stock_conclusion`,
`stock_daily`, `stock_asking_expected`, `stock_investor`, `stock_member`,
`stock_period_quote`, `stock_today_minute`, `stock_daily_minute`,
`stock_time_conclusion`, `stock_overtime_daily_price`, `stock_overtime_conclusion`,
`stock_overtime_current_price`, `stock_overtime_asking_price`,
`stock_closing_expected_price`, `etf_etn_current_price`,
`etf_component_stock_price`, `etf_nav_comparison_trend`,
`etf_nav_comparison_daily`, `etf_nav_comparison_time`

**kis.issue_other (14개)**:
`sector_current_index`, `sector_daily_index`, `sector_time_index_second`,
`sector_time_index_minute`, `sector_minute_inquiry`, `sector_period_quote`,
`sector_all_quote_by_category`, `expected_index_trend`, `expected_index_all`,
`volatility_interruption_status`, `interest_rate_summary`,
`market_announcement_schedule`, `holiday_inquiry`, `futures_business_day_inquiry`

### 1-2. kis-stock-info Skill (26개 메서드)

```yaml
---
name: kis-stock-info
description: >
  KIS 종목 기본정보 & 재무 데이터 조회. 재무제표(대차대조표, 손익계산서),
  재무비율, 배당, 투자의견, 신용거래 등 펀더멘털 분석에 사용한다.
---
```

**kis.stock_info (26개)**:
`product_basic_info`, `stock_basic_info`, `balance_sheet`, `income_statement`,
`financial_ratio`, `profitability_ratio`, `other_key_ratio`, `stability_ratio`,
`growth_ratio`, `margin_tradable_stocks`, `ksd_dividend_decision`,
`ksd_stock_dividend_decision`, `ksd_merger_split_decision`,
`ksd_par_value_change_decision`, `ksd_capital_reduction_schedule`,
`ksd_listing_info_schedule`, `ksd_ipo_subscription_schedule`,
`ksd_forfeited_share_schedule`, `ksd_deposit_schedule`,
`ksd_paid_in_capital_increase_schedule`, `ksd_stock_dividend_schedule`,
`ksd_shareholder_meeting_schedule`, `estimated_earnings`,
`stock_loanable_list`, `investment_opinion`, `investment_opinion_by_brokerage`

### 1-3. kis-analysis Skill (52개 메서드)

```yaml
---
name: kis-analysis
description: >
  KIS 시세분석 & 순위 조회. 투자자 매매 동향, 프로그램매매, 공매도, 신용잔고,
  거래량/등락률/시가총액 순위 등 시장 분석에 사용한다.
---
```

**kis.market_analysis (29개)**:
`trading_weight_by_amount`, `buy_sell_volume_by_stock_daily`,
`investor_trend_by_stock_daily`, `investor_trend_by_market_daily`,
`investor_trend_by_market_intraday`, `foreign_brokerage_aggregate`,
`institutional_foreign_aggregate`, `foreign_net_buy_trend`,
`foreign_institutional_estimate`, `member_trend_by_stock`, `member_trend_tick`,
`program_summary_daily`, `program_summary_intraday`,
`program_trend_by_stock_daily`, `program_trend_by_stock_intraday`,
`program_investor_trend_today`, `short_selling_trend_daily`,
`stock_loan_trend_daily`, `credit_balance_trend_daily`,
`resistance_level_trading_weight`, `limit_price_stocks`, `market_fund_summary`,
`expected_price_trend`, `after_hours_expected_fluctuation`,
`watchlist_groups`, `watchlist_stocks_by_group`, `watchlist_multi_quote`,
`condition_search_list`, `condition_search_result`

**kis.ranking (23개)**:
`trading_volume`, `stock_fluctuation`, `large_execution_count`,
`execution_strength`, `after_hours_fluctuation`, `after_hours_volume`,
`market_cap`, `profit`, `expected_execution_rise_decline`, `hoga_quantity`,
`preferred_stock_ratio`, `market_price`, `credit_balance`, `short_selling`,
`disparity_index`, `proprietary_trading`, `dividend_yield`, `finance_ratio`,
`profitability_indicator`, `new_high_low_approaching`,
`watchlist_registration`, `hts_inquiry_top_20`, `time_hoga`

### 1-4. kiwoom-chart Skill (23개 메서드)

```yaml
---
name: kiwoom-chart
description: >
  키움증권 차트 & ETF 데이터 조회. 틱/분/일/주/월/연 차트(주식 & 업종),
  ETF 수익률, 종목정보, 추세를 조회할 때 사용한다.
  기술적 분석용 OHLCV 데이터를 대량으로 가져올 때 적합하다.
---
```

**kiwoom.chart (14개)**:
`stock_tick`, `stock_minute`, `stock_daily`, `stock_weekly`,
`stock_monthly`, `stock_yearly`, `industry_tick`, `industry_minute`,
`industry_daily`, `industry_weekly`, `industry_monthly`, `industry_yearly`,
`institutional_by_stock`, `intraday_investor_trading`

**kiwoom.etf (9개)**:
`return_rate`, `item_info`, `daily_trend`, `full_price`, `hourly_trend`,
`hourly_execution`, `daily_execution`, `hourly_execution_v2`, `hourly_trend_v2`

### 1-5. kiwoom-market Skill (27개 메서드)

```yaml
---
name: kiwoom-market
description: >
  키움증권 시장 데이터 조회. 호가, 체결강도, 프로그램매매, 업종 현재가,
  투자자 순매수, 기관/외국인 동향, 테마 그룹/종목을 조회할 때 사용한다.
---
```

**kiwoom.market_condition (16개)**:
`stock_quote`, `stock_quote_by_date`, `stock_price`, `market_sentiment`,
`new_stock_warrant_price`, `daily_institutional_trading`,
`institutional_trend_by_stock`, `execution_intensity_by_time`,
`execution_intensity_by_date`, `intraday_trading_by_investor`,
`after_market_trading_by_investor`, `securities_firm_trend`,
`daily_stock_price`, `after_hours_single_price`,
`program_trading_trend_by_time`, `program_trading_cumulative`

**kiwoom.sector (6개)**:
`program`, `investor_net_buy`, `current_price`, `price_by_sector`,
`all_index`, `daily_current_price`

**kiwoom.foreign (3개)**:
`investor_trading_trend`, `stock_institution`, `consecutive_net_buy_sell`

**kiwoom.theme (2개)**:
`group`, `group_stocks`

### 1-6. kiwoom-stock-info Skill (50개 메서드)

```yaml
---
name: kiwoom-stock-info
description: >
  키움증권 종목정보 & 순위 조회. 종목 상세, 매매원, 신고가/신저가, 신용잔고,
  거래량/등락률/외국인 순위 등 종목 분석에 사용한다.
---
```

**kiwoom.stock_info (28개)**:
`basic`, `trading_member`, `execution`, `margin_trading_trend`,
`daily_trading_details`, `new_high_low_price`, `upper_lower_limit`,
`high_low_approach`, `price_volatility`, `volume_renewal`,
`supply_demand_concentration`, `high_per`, `change_rate_from_open`,
`trading_member_supply_demand`, `trading_member_instant_volume`,
`volatility_control_event`, `prev_day_execution_volume`,
`daily_trading_by_investor`, `institutional_by_stock`,
`total_institutional_by_stock`, `prev_day_conclusion`, `interest_stock`,
`summary`, `basic_v1`, `industry_code`, `member_company`,
`program_net_buy_top50`, `program_trading_by_stock`

**kiwoom.rank_info (22개)**:
`remaining_order_qty`, `increasing_remaining_order`, `increasing_total_sell`,
`increasing_volume`, `pct_change_from_prev`, `expected_conclusion_pct_change`,
`current_day_volume`, `prev_day_volume`, `transaction_value`, `margin_ratio`,
`foreigner_period_trading`, `consecutive_net_buy_sell_foreigners`,
`limit_exhaustion_rate_foreigner`, `foreign_account_group_trading`,
`securities_firm_by_stock`, `securities_firm_trading`,
`current_day_major_traders`, `net_buy_trader`,
`current_day_deviation_sources`, `same_net_buy_sell`,
`intraday_trading_by_investor`, `after_hours_single_price_change`

### 1-7. technical-analysis Skill (11개 메서드)

```yaml
---
name: technical-analysis
description: >
  기술적 분석 지표 계산. SMA, EMA, RSI, MACD, 볼린저밴드, 스토캐스틱,
  ADX, ATR, OBV, MDD, 샤프비율을 계산할 때 사용한다.
  시세 데이터의 close 배열을 입력으로 받는다. 세션 불필요.
---
```

지침 내용:
- 세션 초기화 불필요 (requires_session=false)
- 시세 조회 skill로 먼저 데이터를 가져온 뒤, close/high/low/volume 배열을 전달
- 각 지표별 파라미터 & 해석 가이드

메서드 11개: `ta.sma`, `ta.ema`, `ta.rsi`, `ta.macd`, `ta.bbands`, `ta.stoch`, `ta.adx`, `ta.atr`, `ta.obv`, `ta.mdd`, `ta.sharpe`

### 1-8. dart Skill (4개 메서드)

```yaml
---
name: dart
description: >
  DART(전자공시) 조회. 공시 검색, 기업 개황, 고유번호 조회, 대주주 현황을
  확인할 때 사용한다.
---
```

메서드 4개: `dart.disclosure_search`, `dart.company_overview`, `dart.corp_code_lookup`, `dart.major_shareholder`

### 파일 변경

| 파일 | 변경 |
|---|---|
| `.agents/skills/kis-quote/SKILL.md` | **신규** (35개 메서드) |
| `.agents/skills/kis-stock-info/SKILL.md` | **신규** (26개 메서드) |
| `.agents/skills/kis-analysis/SKILL.md` | **신규** (52개 메서드) |
| `.agents/skills/kiwoom-chart/SKILL.md` | **신규** (23개 메서드) |
| `.agents/skills/kiwoom-market/SKILL.md` | **신규** (27개 메서드) |
| `.agents/skills/kiwoom-stock-info/SKILL.md` | **신규** (50개 메서드) |
| `.agents/skills/technical-analysis/SKILL.md` | **신규** (11개 메서드) |
| `.agents/skills/dart/SKILL.md` | **신규** (4개 메서드) |

### 검증

```sh
# Codex CLI에서 skill 인식 확인
codex /skills
```

---

## Phase 2: CLI 보강

**목표**: Skill에서 호출하기 편하게 CLI 개선

### 2-1. 세션 자동 초기화

현재 `quote` 커맨드만 세션을 자동 초기화한다.
`call` 커맨드에서도 메서드명의 broker를 감지하여 자동 초기화.

```sh
# 현재: 두 번 호출 필요
bun run start call session.initialize '{"broker":"kis"}'
bun run start call kis.basic_quote.stock_current_price '{"stock_code":"005930"}'

# 개선: 한 번에
bun run start call kis.basic_quote.stock_current_price '{"stock_code":"005930"}'
# → 내부에서 kis 세션 자동 초기화
```

구현: 메서드명의 첫 세그먼트(`kis`, `kiwoom`, `dart`)를 broker로 감지 → `session.initialize` 선행 호출

### 2-2. 에러 메시지 개선

Codex가 에러를 이해하고 재시도할 수 있도록 구조화된 에러 출력:

```json
{"error": true, "code": -32004, "message": "세션 미초기화", "hint": "session.initialize 호출 필요"}
```

### 파일 변경

| 파일 | 변경 |
|---|---|
| `src/index.ts` | `call` 커맨드 세션 자동 초기화, 에러 출력 개선 |

### 테스트

- 세션 자동 초기화 동작 검증 (mock RPC 서버 확장)

---

## Phase 3: AGENTS.md & Codex 설정

**목표**: Codex에 프로젝트 컨텍스트 제공 & 실행 환경 구성

### 3-1. AGENTS.md

프로젝트 루트에 작성. Codex가 프로젝트 진입 시 자동 로드.

```markdown
# cluefin-dure

한국 주식시장 데이터 조회 & 분석 에이전트.

## 도구 실행 방법

모든 데이터 조회는 아래 CLI로 실행한다:

    cd apps/dure && bun run start call <method> '<json_params>'

사용 가능한 메서드 목록:

    cd apps/dure && bun run start tools

## 메서드 명명 규칙

    {broker}.{category}.{method_name}

예: kis.basic_quote.stock_current_price, kiwoom.chart.stock_daily, ta.sma

## 규칙

- 주가 데이터는 반드시 도구로 조회한다. 추측하지 않는다.
- stock_code: 6자리 숫자 (예: "005930")
- 날짜: KST 기준, YYYYMMDD 형식
- 기술적 분석 시 시세 조회 → close 배열 추출 → ta.* 메서드 호출 순서로 진행
```

### 3-2. Codex 설정 (선택)

```toml
# .codex/config.toml (프로젝트 레벨, 선택적)
model = "gpt-5.3-codex"
```

### 파일 변경

| 파일 | 변경 |
|---|---|
| `AGENTS.md` | **신규** — 프로젝트 루트 |
| `.codex/config.toml` | **신규** (선택) |

### 검증

```sh
# Codex CLI에서 실제 동작 확인
codex "삼성전자 현재가 알려줘"
codex "삼성전자 최근 20일 RSI 분석해줘"
codex "SK하이닉스 재무비율 조회해줘"
codex "거래량 상위 종목 순위 알려줘"
codex "외국인 순매수 추이 보여줘"
```

---

## 의존 관계

```
Phase 1: Skill 정의 ─────────────────────────┐
    │                                         │
    ├── 1-1 kis-quote (35)                    │
    ├── 1-2 kis-stock-info (26)               │
    ├── 1-3 kis-analysis (52)            Phase 2: CLI 보강
    ├── 1-4 kiwoom-chart (23)                 │
    ├── 1-5 kiwoom-market (27)                │
    ├── 1-6 kiwoom-stock-info (50)            │
    ├── 1-7 technical-analysis (11)           │
    └── 1-8 dart (4)                          │
                                              │
                           Phase 3: AGENTS.md & Codex 설정
                                  (← Phase 1, 2)
```

Phase 1과 2는 병렬 진행 가능. Phase 3은 1, 2 완료 후 통합 검증.

## 추가 패키지

없음. 기존 CLI + Codex 구독만으로 동작.
