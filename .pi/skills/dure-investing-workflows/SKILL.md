---
name: dure-investing-workflows
description: Dure 투자 리서치 workflow tool을 고르는 지침입니다. 종목 분석, 스크리닝, 전략 리서치, 시나리오 분석, 기존 run 리뷰 요청을 처리할 때 사용합니다.
---

# Dure Investing Workflows

Use this skill when a user asks for investment research through Dure.

## Tool Selection

- Use `run_equity_analysis` for a known ticker, company, or a request that should end in a full single-equity report.
- Use `run_screening` when the user starts from a market, style, factor, sector, theme, or candidate discovery request.
- Use `run_strategy_research` when the user asks for an investable rule, portfolio logic, factor thesis, or strategy draft.
- Use `run_scenario_analysis` when the user asks what an event, macro assumption, regulation, rate move, sector shock, or geopolitical scenario could change.
- Use `run_review_checklist` when the user provides an existing equity run ID or asks to audit a previous Dure equity result.

## Operating Rules

- Prefer Dure workflow tools before direct cluefin CLI fallback.
- Ask for a missing ticker, market, style, scenario, or run ID only when the workflow cannot infer a safe default.
- Keep final user-facing answers concise and point to generated run artifacts when available.
- Treat analysis as research support, not investment advice.

