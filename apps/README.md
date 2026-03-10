# Apps

ClueFin DURE 애플리케이션 모음. 
AI agent인 **dure**는 [cluefin-rpc](https://github.com/kgcrom/cluefin/tree/main/apps/cluefin-rpc)를 통해 시세·분석·공시 데이터를 조회해서 기업/산업분석을 진행하고, **broker**로 Cloudflare D1에 주문정보 저장, Cloudflare Worker 배포된 **trader**가 체결을 담당합니다.

## Dure

pi-coding-agent로 구현된 AI agent.

Python `cluefin-rpc` 프로세스를 자식으로 실행하고 stdin/stdout(NDJSON)으로 JSON-RPC 2.0 통신합니다.

```sh
cd apps/dure

# pi-coding-agent 실행
npm run start
```

### 아키텍처

dure는 `@mariozechner/pi-coding-agent`의 `ExtensionFactory`를 구현합니다.

| 파일 | 역할 |
|---|---|
| `index.ts` | pi-coding-agent 진입점 |
| `extension.ts` | 확장 팩토리 — 라이프사이클, 메타 도구 등록 |
| `tool-registry.ts` | `rpc.list_methods`로 메서드 탐색 → 카테고리별 도구 변환 |
| `system-prompt.ts` | SOUL.md + skill 요약 + 분석 프로토콜 조합 |
| `stdio-jsonrpc-client.ts` | JSON-RPC 2.0 over NDJSON (child_process.spawn) |
| `jsonrpc.ts` | JSON-RPC 요청/응답 타입 및 유틸리티 |
| `analysis/` | 분석 관련 모듈 |
| `scoring/` | 스코어링 관련 모듈 |

### 도구 로딩 흐름

1. `session_start` → `ToolRegistry.discover()` (rpc.list_methods 호출)
2. 에이전트가 `list_tool_categories`로 카테고리 확인
3. `load_category_tools`로 필요한 카테고리의 도구를 동적 등록
4. 등록된 도구를 직접 호출 (또는 `call_rpc_method` 폴백)

### 스킬 (`.agents/skills/`)

도메인별 SKILL.md로 에이전트에 도구 사용 지침을 제공합니다.

| 스킬 | 설명 |
|---|---|
| `stock` | 종목 시세, 호가, 체결, 투자의견, 수급 동향 |
| `chart` | OHLCV 차트 데이터 (일/주/월/분봉/틱) |
| `financial` | 재무제표, 재무비율, 100점 정량 분석 |
| `ranking-analysis` | 순위, 수급 분석, 공매도, 프로그램 매매 |
| `sector-market` | 업종 지수, 거시 지표, ETF, 테마 |
| `dart` | DART 공시 검색, 기업 개황 |
| `technical-analysis` | 기술적 분석 (SMA, RSI, MACD 등) 100점 스코어링 |
| `peer-comparison` | 동종 업종 비교 분석 |

### 페르소나 (`.agents/SOUL.md`)

에이전트의 정체성·분석 철학·가치관을 정의합니다. 시스템 프롬프트 최상단에 주입됩니다.

### RPC 카테고리 (15)

2026-03-10 기준 `rpc.list_methods` 등록 메서드 수는 237개이며, 런타임에 동적 탐색합니다.

| 카테고리 | 설명 |
|---|---|
| `stock` | 종목 시세, 호가, 체결, 매매원 |
| `chart` | 일/분/틱 차트 OHLCV |
| `ranking` | 거래량/등락률/시가총액 등 순위 |
| `analysis` | 투자자/기관별 매매동향, 프로그램매매 |
| `sector` | 업종 지수, 업종별 시세 |
| `etf` | ETF 시세, NAV, 수익률 |
| `financial` | 재무제표, 재무비율 |
| `schedule` | 배당, IPO, 합병 등 일정 |
| `program` | 프로그램매매 동향 |
| `market` | 시장 전체 데이터 (휴장일, 금리 등) |
| `theme` | 테마 그룹, 테마별 종목 |
| `ta` | 기술적 분석 (SMA, RSI, MACD 등) |
| `dart` | DART 공시 검색, 기업 개황 |
| `session` | 세션 관리 (시스템) |
| `rpc` | RPC 메타 (시스템) |

## Broker

증권사 인증 토큰 발급 및 주문 관리 CLI. 루트 `.env` 파일의 환경변수를 읽어 토큰을 발급합니다.

```sh
cd apps/broker

# KIS (한국투자증권) 토큰 발급
npm run start -- kis

# Kiwoom (키움증권) 토큰 발급
npm run start -- kiwoom

# 주문 관리
npm run start -- order add                        # 주문 추가 (인터랙티브)
npm run start -- order list [--broker kis]        # 주문 목록 조회
npm run start -- order cancel <id>                # 주문 취소
```

`order add`는 인터랙티브 프롬프트로 종목코드, 기준가격, 수량, 증권사, 실행환경, 시장을 순서대로 입력받습니다.

## Trader

Hono + Cloudflare Workers 기반 트레이딩 API + 자동 매매 Cron 서비스.

### D1 데이터베이스 설정

Trader 앱은 Cloudflare D1을 사용하여 주문 데이터를 관리합니다.

```sh
cd apps/trader

# D1 데이터베이스 생성
npx wrangler d1 create cluefin-fsd-db

# 출력된 database_id를 apps/trader/wrangler.jsonc에 입력
# 마이그레이션 실행 (리모트)
npx wrangler d1 migrations apply cluefin-fsd-db --remote

# 로컬 개발용
npx wrangler d1 migrations apply cluefin-fsd-db --local
```

마이그레이션 파일은 `apps/trader/migrations/` 디렉토리에 위치합니다.

### 로컬 개발

```sh
# 1. .dev.vars 파일 생성
cp apps/trader/.dev.vars.example apps/trader/.dev.vars

# 2. .dev.vars에 증권사 앱키 및 계좌 정보 입력

# 3. 토큰 발급 후 .dev.vars에 설정
cd ../broker && npm run start -- kis

# 4. 로컬 D1 마이그레이션 적용
npx wrangler d1 migrations apply cluefin-fsd-db --local

# 5. 로컬 서버 실행
cd apps/trader && npm run dev
```

### API curl 예시

로컬 서버(`http://localhost:8787`) 기준:

```sh
# KIS 인트라데이 차트
curl "http://localhost:8787/kis/intraday-chart?market_code=J&stock_code=005930&input_hour=0900"

# Kiwoom 외국인/기관 순위
curl "http://localhost:8787/kiwoom/rank?mrkt_tp=000&amt_qty_tp=1&qry_dt_tp=0&stex_tp=1"

# Kiwoom 거래량급증
curl "http://localhost:8787/kiwoom/volume-surge?mrkt_tp=000&sort_tp=1&tm_tp=1&trde_qty_tp=5&stk_cnd=0&pric_tp=0&stex_tp=1"
```
