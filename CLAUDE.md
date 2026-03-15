# CLAUDE.md

## Core Rules

- **플랜이 있으면 바로 코딩**: 구현 플랜을 받으면 즉시 파일 수정부터 시작한다. 코드베이스 재분석, 추가 계획서 작성 금지. 플랜 = 이미 완료된 분석.
- **구체적으로 답하라**: 파일명, 코드, 설정값을 요청받으면 즉시 실제 내용을 제공한다. 추상적인 개요나 "~할 수 있습니다" 식 요약 금지.
- **프로젝트 디렉토리 이탈 금지**: 명시적으로 요청받지 않는 한 홈 디렉토리나 프로젝트 루트 외부를 탐색하지 않는다.
- **탐색 시간 제한**: 파일 읽기·탐색은 최대 5분. 불확실하면 최선의 판단으로 구현하고 사용자가 수정한다.

## Git Conventions

- 커밋 메시지는 **한국어**로 작성한다.
- 변경 사항을 논리적인 기능 단위로 묶어 커밋한다.

## Debugging

- 수정 시도 전 반드시 **근본 원인을 파악**한다. 빠른 시도-실패 반복 금지.
- 첫 번째 수정이 실패하면 즉시 원인 재분석. 새로운 에러가 나면 새 에러의 근본 원인을 파악한 후 수정한다.
- 수정 전 가설을 한 문장으로 정리한다: "이 버그는 [원인] 때문이며, [증거]로 확인된다."

## Commands

```sh
npm install              # install deps
npm test                 # run all tests
npm run check            # lint + format
npm run check:fix        # auto-fix lint + format
```

### App-specific

```sh
# dure — pi-coding-agent 확장 (cluefin-rpc 연동)
cd apps/dure && npm run start                    # pi-coding-agent 실행

# broker — 인증 토큰 & 주문 관리 CLI
cd apps/broker && npm run start -- kis    # (or kiwoom, order)

# trader — Cloudflare Workers
cd apps/trader && npm run dev             # 로컬 개발
cd apps/trader && npx wrangler deploy     # 배포
```

## Architecture

npm workspace monorepo (`workspace:*` protocol).

```
apps/
  dure/         @cluefin/dure       pi-coding-agent 확장, cluefin-rpc JSON-RPC 클라이언트 + ToolRegistry
  broker/       @cluefin/broker     증권사 인증 토큰 & 주문 관리 CLI (@clack/prompts)
  trader/       @cluefin/trader     Hono + Cloudflare Workers, Cron: 주문 실행 & 체결 확인 KST 9-15

packages/
  securities/   @cluefin/securities KIS/Kiwoom REST API 클라이언트 (인증, 시세, 주문)
  cloudflare/   @cluefin/cloudflare Cloudflare D1 Repository/Mapper, R2 유틸리티
```

### dure ↔ cluefin-rpc

- dure가 `uv run -m cluefin_rpc` (외부 `cluefin` 리포)를 subprocess로 spawn
- JSON-RPC 2.0 over NDJSON (stdin/stdout), stderr는 로그
- 15개 카테고리, 237개+ 메서드: `stock`, `ranking`, `analysis`, `schedule`, `sector`, `etf`, `ta`, `chart`, `financial`, `program`, `market`, `dart`, `session`, `theme`, `rpc`
- Python 전용 라이브러리 의존 (cluefin-openapi, cluefin-ta, numpy, pydantic)

### dure 주요 모듈

| File | Role |
|---|---|
| `index.ts` | pi-coding-agent 진입점 |
| `extension.ts` | `ExtensionFactory` 구현, `session_start`/`session_shutdown` 라이프사이클 |
| `tool-registry.ts` | `rpc.list_methods`로 메서드 발견, 카테고리별 동적 로딩, `ToolDefinition` 변환 |
| `system-prompt.ts` | `SOUL.md` (페르소나) + `skills/` (도메인별 지침) 조합 |
| `jsonrpc.ts` | JSON-RPC 2.0 타입 & 유틸리티 |
| `stdio-jsonrpc-client.ts` | NDJSON stdin/stdout 클라이언트 |
| `category-descriptions.ts` | 카테고리별 한국어 설명 |

### AI Agent

- Meta Tools: `list_tool_categories` → `load_category_tools` → 개별 도구 호출
- Skills: `.agents/skills/` 하위 8개 SKILL.md — stock, chart, financial, ranking-analysis, sector-market, dart, technical-analysis, peer-comparison

## Conventions

- TypeScript strict, ESNext target, NodeNext module resolution
- Minimal external deps — Node built-ins & standard `fetch` 우선
- Barrel exports per package (`index.ts`)
- Tests: Vitest (`*.test.ts`), mock `globalThis.fetch` for HTTP
- Dates: KST (+09:00). KIS `yyyy-MM-dd HH:mm:ss`, Kiwoom `yyyyMMddHHmmss`
- Biome lint/format (100 char line width, 2-space indent)
- Root `.env` referenced via `--env-file=../../.env` from app dirs
- RPC 메서드 명명: 도메인 기반 (`{domain}.{action}`)
