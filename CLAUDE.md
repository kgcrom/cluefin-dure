# CLAUDE.md

Dure (두레) is an agent configuration for Korean-market investment research.
There is **no `src/`** — all code and config live under `.pi/` and `.claude/`.
It runs on **two agent runtimes** that share the same cluefin-backed market-data
layer (`.pi/extensions/market-data/`):

- **Pi** — `npm run chat` launches `@earendil-works/pi-coding-agent` against the
  `.pi/` setup (extension `index.ts`, `/market-review` prompt, `.pi/skills/`).
- **Claude Code** — `.mcp.json` registers the `market-data` MCP server (run
  `claude` in-repo); analyst skills live in `.claude/skills/`, the orchestrator
  in `.claude/agents/market-review.md`.

The two entrypoints differ only in tool registration: Pi extension (`index.ts`)
vs MCP server (`mcp-server.ts`). `cli.ts`/`providers/*` are runtime-agnostic.

## Commands

```bash
npm run chat          # launch the Pi agent (reads .env)
npm run build         # tsc -> dist/ (compiles .pi/**/*.ts; required for the MCP server)
npm test              # vitest run --passWithNoTests
npm run test:coverage # vitest with v8 coverage
npm run lint          # biome check .
npm run lint:fix      # biome check --write .
npm run format        # biome format --write .
```

The Claude Code MCP server runs compiled JS
(`dist/.pi/extensions/market-data/mcp-server.js`), so `npm run build` must run
before launching `claude`.

## Layout

```
.pi/
├── extensions/market-data/   # 9 tools (kis_*, dart_*, market_data_health)
│   ├── index.ts              # Pi tool registration entrypoint
│   ├── mcp-server.ts         # MCP stdio server entrypoint (Claude Code)
│   ├── cli.ts                # bridge to external cluefin CLI
│   └── providers/            # dart.ts, kis.ts (runtime-agnostic)
├── prompts/market-review.md  # /market-review prompt (Pi)
└── skills/                   # 12 analyst skills: bull/bear-analyst, fundamental-,
                              # technical-, macro-, news-analysis, scenario-planner,
                              # final-decision, data-sanity-check, portfolio-fit,
                              # risk-position-sizing, investment-journal
.claude/
├── agents/market-review.md   # market-review subagent (Claude Code orchestrator)
└── skills/                   # same 12 analyst skills, ported as SKILL.md
.mcp.json                     # registers the market-data MCP server (Claude Code)
docs/                         # TODO.md + assets/ (GitHub Pages source)
```

Investments data is per-user and git-ignored: `.pi/investments/` (Pi) and
`.claude/investments/` (Claude Code).

## Data sources

Market data tools shell out to the external **cluefin** CLI (`uv run
cluefin-openapi-cli`). Required keys in `.env` (see `.env.example`):
`DART_AUTH_KEY`, `KIS_APP_KEY`/`KIS_SECRET_KEY`/`KIS_ENV`.

## Gotchas

- **cluefin path env var:** code reads `CLUEFIN_OPENAPI_CWD`
  (`.pi/extensions/market-data/cli.ts:9`); default fallback is `~/workspace/cluefin`.
- TS build targets `.pi/**/*.ts` only (`tsconfig.json` `include`); output goes to
  `dist/`, so the MCP server lands at `dist/.pi/extensions/market-data/mcp-server.js`
  (the path `.mcp.json` references).
- The MCP server reuses `cli.ts`/`providers/*` unchanged and only replaces the Pi
  entrypoint (`index.ts`) — keep tool behavior in sync between the two entrypoints.
