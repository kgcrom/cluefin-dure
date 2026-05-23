---
name: cluefin-data-discovery
description: cluefin CLI discovery와 fallback 호출 지침입니다. Dure workflow tool 결과만으로 부족한 시장 데이터, 재무 데이터, 기술 지표, 이벤트 데이터를 찾아야 할 때 사용합니다.
---

# cluefin Data Discovery

Use this skill only when Dure workflow tools do not expose enough data for the user request.

## Discovery Flow

1. Start from `domains --json` or `tags --json` when the needed data family is unclear.
2. Use `list --domain <name> --json` or `list --tag <name> --json` to narrow candidate commands.
3. Use `describe ... --json` before execution to confirm parameters, examples, and `agent_notes`.
4. Use `call_cli_command` only after the command and required params are clear.

## Taxonomy Guidance

- `chart`, `quote`, `statements`, `news`, `trading-flow`, `market`, `sector`, `theme`, `corporate-actions`, and `etf` come from `cluefin-openapi-cli`.
- `technical-indicator`, `portfolio-metric`, and `risk-metric` come from `cluefin-ta-cli`.
- Dure domains are task intents. cluefin domains and tags are data discovery labels.

## Fallback Rules

- Do not call broad CLI commands when an existing Dure workflow tool already returns the needed artifact.
- Prefer domain/tag filtered discovery over all-command listing.
- Preserve command JSON output in the reasoning context only as much as needed for the final answer.

