# CLAUDE.md

## Commands

```sh
bun install              # install deps
bun test                 # run all tests
bun run check            # lint + format
bun run check:fix        # auto-fix lint + format
```

### App-specific

```sh
# dure — AI agent CLI (cluefin-rpc 연동)
cd apps/dure && bun run start tools                                    # RPC 메서드 목록
cd apps/dure && bun run start call <method> '<json_params>'            # RPC 메서드 호출
cd apps/dure && bun run start quote <stock_code>                       # KIS 현재가 조회

# broker — 인증 토큰 & 주문 관리 CLI
cd apps/broker && bun run start kis       # (or kiwoom, order)

# trader — Cloudflare Workers
cd apps/trader && bun run dev             # 로컬 개발
cd apps/trader && npx wrangler deploy     # 배포
```

## Architecture

Bun workspace monorepo (`workspace:*` protocol).

```
cluefin-dure (this repo)                    cluefin (external repo)
═══════════════════════                     ═══════════════════════
apps/dure/                                  apps/cluefin-rpc/
  index.ts (CLI)                              server.py (JSON-RPC main loop)
  stdio-jsonrpc-client.ts (Bun.spawn)         dispatcher.py (method routing)
  tool-registry.ts (메서드 발견 & 변환)         handlers/ (quote, ta, dart)
  .agents/skills/ (Codex skill 정의)           middleware/ (auth, session)
       ─── stdin/stdout NDJSON ───>
       <──────────────────────────
```

### Packages

| Package | Description |
|---|---|
| `@cluefin/dure` | AI agent — Codex skill + cluefin-rpc JSON-RPC client |
| `@cluefin/securities` | KIS/Kiwoom API client library (TypeScript) |
| `@cluefin/cloudflare` | Cloudflare runtime utils (D1, R2, Secrets Store) |
| `@cluefin/broker` | Auth token & order management CLI (`@clack/prompts`) |
| `apps/trader` | Hono + Cloudflare Workers. Cron: token refresh 6h, order exec & fill check KST 9-15 |

### dure ↔ cluefin-rpc

- dure가 `uv run -m cluefin_rpc` (외부 `cluefin` 리포)를 subprocess로 spawn
- JSON-RPC 2.0 over NDJSON (stdin/stdout), stderr는 로그
- RPC 서버는 32개 메서드 제공: Quote(KIS 6, Kiwoom 4, KRX 2), TA(11), DART(4), Meta(5)
- Python 전용 라이브러리 의존 (cluefin-openapi, cluefin-ta, numpy, pydantic)

### AI Agent (Codex + Skill)

- Agent: OpenAI Codex (ChatGPT 구독, API 키 불필요)
- Skill: `.agents/skills/` 하위 SKILL.md로 도메인별 도구 지침 정의
- 도구 실행: `bun run start call <method> <params>` CLI를 셸 커맨드로 호출
- Codex가 사용자 질문에 맞는 skill을 자동 선택 → 지침에 따라 CLI 호출 → 결과 종합

## Conventions

- TypeScript strict, ESNext, bundler module resolution
- Minimal external deps — use Bun built-ins & standard `fetch`
- Barrel exports per package (`index.ts`)
- Tests: Bun test runner (`*.test.ts`), mock `globalThis.fetch` for HTTP
- Dates: KST (+09:00). KIS format `yyyy-MM-dd HH:mm:ss`, Kiwoom `yyyyMMddHHmmss`
- Biome lint/format (100 char line width, space indent)
- Root `.env` referenced via `--env-file=../../.env` from app dirs
- JSON-RPC 2.0 (NDJSON via stdin/stdout) for dure ↔ cluefin-rpc communication
- `uv run` for Python RPC server (외부 `cluefin` 리포)
- RPC 메서드 명명: `{category}.{broker?}.{action}` (e.g. `quote.kis.stock_current`)
