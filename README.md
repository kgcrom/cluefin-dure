# ClueFin DURE

AI Agent 기반 증권 분석 & 트레이딩 플랫폼.

dure(AI agent)가 cluefin-rpc를 통해 시세, 분석, 공시 데이터를 조회하고, broker(주문)와 trader(체결)가 실행을 담당한다.

**지원 증권사**: KIS (한국투자증권), Kiwoom (키움증권) | **데이터 소스**: DART (전자공시 API)

## Built With

TypeScript, Node.js, npm Workspaces, [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent), [Hono](https://hono.dev/), [Cloudflare Workers](https://workers.cloudflare.com/), [Biome](https://biomejs.dev/)

## Project Structure

```
cluefin-dure/
├── apps/
│   ├── dure/            # AI agent — pi-coding-agent 확장
│   ├── broker/          # 증권사 인증 및 주문 관리 CLI
│   └── trader/          # 트레이딩 API + 자동 매매 Cron (Cloudflare Workers)
├── packages/
│   ├── cloudflare/      # Cloudflare 런타임 유틸리티 (D1, R2)
│   └── securities/      # 증권사 API 클라이언트 라이브러리
├── package.json
└── tsconfig.json
```

### Apps

| App | Package | Description |
|---|---|---|
| dure | `@cluefin/dure` | pi-coding-agent 확장. cluefin-rpc JSON-RPC 클라이언트 + ToolRegistry로 237개 메서드를 AI 도구로 변환 |
| broker | `@cluefin/broker` | `@clack/prompts` 기반 CLI. 증권사 인증 토큰 발급 및 주문 생성/조회 |
| trader | `@cluefin/trader` | Hono + Cloudflare Workers. Cron으로 KST 9-15시 자동 주문 실행 및 체결 확인 |

### Packages

| Package | Description |
|---|---|
| `@cluefin/securities` | KIS/Kiwoom REST API 클라이언트 (인증, 시세, 주문) |
| `@cluefin/cloudflare` | Cloudflare D1 Repository/Mapper, R2 유틸리티 |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS 이상
- [uv](https://docs.astral.sh/uv/) (cluefin-rpc Python 서버 실행용)

### Installation

```sh
git clone https://github.com/kgcrom/cluefin-dure.git
cd cluefin-dure
npm install
```

### Environment Variables

프로젝트 루트에 `.env` 파일을 생성하고 필요한 환경변수를 설정한다.

| 변수 | 설명 |
|---|---|
| `KIS_ENV` | KIS 환경 (`prod` \| `dev`) |
| `KIS_APP_KEY` | KIS 앱 키 |
| `KIS_SECRET_KEY` | KIS 시크릿 키 |
| `KIS_ACCOUNT_NO` | KIS 계좌번호 (앞 8자리) |
| `KIS_ACCOUNT_PRODUCT_CODE` | KIS 계좌 상품코드 (뒤 2자리) |
| `KIWOOM_ENV` | Kiwoom 환경 (`prod` \| `dev`) |
| `KIWOOM_APP_KEY` | Kiwoom 앱 키 |
| `KIWOOM_SECRET_KEY` | Kiwoom 시크릿 키 |

## Usage

```sh
npm install              # 의존성 설치
npm test                 # 전체 테스트
npm run check            # lint + format 검사
npm run check:fix        # 자동 수정
```

### App 실행

```sh
# dure — AI agent (pi-coding-agent + cluefin-rpc)
cd apps/dure && npm run start

# broker — 증권사 인증 및 주문 CLI
cd apps/broker && npm run start -- kis       # KIS 토큰 발급
cd apps/broker && npm run start -- kiwoom    # Kiwoom 토큰 발급
cd apps/broker && npm run start -- order     # 주문 관리

# trader — Cloudflare Workers
cd apps/trader && npm run dev                # 로컬 개발
cd apps/trader && npx wrangler deploy        # 배포
```

## Architecture

### dure ↔ cluefin-rpc

```
cluefin-dure                                cluefin (외부 리포)
═══════════════                             ═══════════════════
apps/dure/src/                              apps/cluefin-rpc/
  index.ts (진입점)                           server.py (JSON-RPC main loop)
  extension.ts (ExtensionFactory)             dispatcher.py (method routing)
  tool-registry.ts (메서드 발견 & 도구 변환)    handlers/ (kis, kiwoom, ta, dart, session)
  system-prompt.ts (SOUL + skill 프롬프트)     middleware/ (auth, session)
  jsonrpc.ts (JSON-RPC 타입 & 유틸리티)
  stdio-jsonrpc-client.ts (NDJSON 클라이언트)
  category-descriptions.ts (카테고리 메타데이터)
       ─── stdin/stdout NDJSON ───>
       <──────────────────────────
```

- dure가 `uv run -m cluefin_rpc`를 subprocess로 spawn
- JSON-RPC 2.0 over NDJSON (stdin/stdout), stderr는 로그
- 15개 카테고리, 237개+ 메서드: `stock`, `ranking`, `analysis`, `schedule`, `sector`, `etf`, `ta`, `chart`, `financial`, `program`, `market`, `dart`, `session`, `theme`, `rpc`

### AI Agent

- **Extension**: `extension.ts`가 `ExtensionFactory` 구현, `session_start`/`session_shutdown` 라이프사이클 관리
- **Tool Discovery**: `ToolRegistry`가 `rpc.list_methods`로 메서드 자동 탐색, 카테고리별 동적 로딩
- **Meta Tools**: `list_tool_categories` → `load_category_tools` → 개별 도구 호출
- **System Prompt**: `SOUL.md` (페르소나) + `skills/` (도메인별 지침) 조합
- **Skills**: `.agents/skills/` 하위 8개 — stock, chart, financial, ranking-analysis, sector-market, dart, technical-analysis, peer-comparison
