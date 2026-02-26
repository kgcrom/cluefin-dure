# CLAUDE.md

## Commands

```sh
bun install              # install deps
bun test                 # run all tests
bun run check            # lint + format
bun run check:fix        # auto-fix lint + format
```

dure CLI: `cd apps/dure && bun run start tools` (or `call`, `quote`)
broker CLI: `cd apps/broker && bun run start kis` (or `kiwoom`, `order`)
trader dev: `cd apps/trader && bun run dev`
trader deploy: `cd apps/trader && npx wrangler deploy`

## Architecture

Bun workspace monorepo (`workspace:*` protocol).

| Package | Description |
|---|---|
| `@cluefin/dure` | AI agent — cluefin-rpc JSON-RPC client, ToolRegistry |
| `@cluefin/securities` | KIS API client library |
| `@cluefin/cloudflare` | Cloudflare runtime utils (D1, R2, Secrets Store) |
| `@cluefin/broker` | Auth token & order management CLI (`@clack/prompts`) |
| `apps/trader` | Hono + Cloudflare Workers. Cron: token refresh 6h, order exec & fill check KST 9-15 |

## Conventions

- TypeScript strict, ESNext, bundler module resolution
- Minimal external deps — use Bun built-ins & standard `fetch`
- Barrel exports per package (`index.ts`)
- Tests: Bun test runner (`*.test.ts`), mock `globalThis.fetch` for HTTP
- Dates: KST (+09:00). KIS format `yyyy-MM-dd HH:mm:ss`, Kiwoom `yyyyMMddHHmmss`
- Biome lint/format (100 char line width, space indent)
- Root `.env` referenced via `--env-file=../../.env` from app dirs
- JSON-RPC 2.0 (NDJSON via stdin/stdout) for dure ↔ cluefin-rpc communication
- `uv run` for Python RPC server (`cluefin`)
