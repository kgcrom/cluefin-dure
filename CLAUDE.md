# CLAUDE.md

Dure (두레) is a Pi coding-agent configuration for Korean-market investment
research. There is **no `src/`** — all code and config live under `.pi/`.
`npm run chat` launches `@earendil-works/pi-coding-agent` against this `.pi/` setup.

## Commands

```bash
npm run chat          # launch the Pi agent (reads .env)
npm run build         # tsc -> dist/ (compiles .pi/**/*.ts)
npm test              # vitest run --passWithNoTests
npm run test:coverage # vitest with v8 coverage
npm run lint          # biome check .
npm run lint:fix      # biome check --write .
npm run format        # biome format --write .
```

## Layout

```
.pi/
├── extensions/market-data/   # registers 9 agent tools (kis_*, dart_*, market_data_health)
│   ├── index.ts              # tool registration entrypoint
│   ├── cli.ts                # bridge to external cluefin CLI
│   └── providers/            # dart.ts, kis.ts
├── prompts/market-review.md  # /market-review prompt (시장 + 종목 -> 투자 검토 리포트)
└── skills/                   # 12 analyst skills: bull/bear-analyst, fundamental-,
                              # technical-, macro-, news-analysis, scenario-planner,
                              # final-decision, data-sanity-check, portfolio-fit,
                              # risk-position-sizing, investment-journal
docs/                         # architecture.md, configuration.md, TODO.md (GitHub Pages source)
```

## Data sources

Market data tools shell out to the external **cluefin** CLI. Required keys in `.env`
(see `.env.example`): `DART_AUTH_KEY`, `KIS_APP_KEY`/`KIS_SECRET_KEY`/`KIS_ENV`.

## Gotchas

- **cluefin path env var:** code reads `CLUEFIN_OPENAPI_CWD` (`.pi/extensions/market-data/cli.ts`),
  NOT the `CLUEFIN_CLI_CWD` shown in `.env.example`/README. Default fallback is `~/workspace/cluefin`.
- TS build targets `.pi/**/*.ts` only (`tsconfig.json` `include`); `node_modules`/`dist` excluded.
- README's `src/`-based workflow architecture and `DURE_*` env vars are **stale** — trust `.pi/` and this file.
