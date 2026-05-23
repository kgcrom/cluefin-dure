# Dure Domain To cluefin Taxonomy Map

> Historical planning artifact. 현재 taxonomy 연결 구현은 `src/cli/dure-domains.ts`와 `docs/architecture.md`를 기준으로 확인합니다.

## Decision

Dure는 cluefin CLI의 `domain`과 `tag`를 직접 사용자-facing 도메인으로 노출하지 않는다. Dure domain은 투자 리서치 작업 의도이고, cluefin taxonomy는 필요한 데이터와 계산 기능을 찾는 discovery layer다.

## Initial Mapping

| Dure domain | Purpose | cluefin domains | cluefin tags |
| --- | --- | --- | --- |
| `equity-research` | 단일 종목 종합 분석 | `statements`, `quote`, `chart`, `news`, `corporate-actions`, `trading-flow`, `technical-indicator` | `financial-statement`, `financial-ratio`, `current-price`, `ohlcv`, `announcement`, `disclosure`, `dividend`, `foreign`, `institution`, `momentum`, `moving-average` |
| `market-screening` | 시장/스타일 기반 후보 발굴 | `market`, `sector`, `theme`, `etf`, `statements` | `ranking`, `volume-rank`, `market-cap`, `sector-index`, `theme-group`, `financial-ratio` |
| `strategy-research` | 투자 가설과 전략 규칙 설계 | `chart`, `technical-indicator`, `statements`, `trading-flow`, `market`, `portfolio-metric`, `risk-metric` | `ohlcv`, `moving-average`, `momentum`, `volatility`, `financial-ratio`, `foreign`, `institution`, `portfolio-risk` |
| `scenario-analysis` | 거시/이벤트 시나리오 영향 분석 | `market`, `sector`, `theme`, `news`, `statements`, `quote` | `announcement`, `disclosure`, `sector-index`, `theme-group`, `current-price`, `financial-ratio` |
| `review-checklist` | 기존 분석 결과 재검증 | `statements`, `news`, `quote`, `trading-flow`, `corporate-actions` | `financial-statement`, `financial-ratio`, `announcement`, `disclosure`, `current-price`, `foreign`, `institution`, `dividend` |

## Fallback Rule

Workflow tool이 충분한 데이터를 제공하지 못할 때만 cluefin discovery fallback을 사용한다. Fallback은 `domains/tags` 탐색, `list --domain` 또는 `list --tag`, `describe`, `call_cli_command` 순서로 좁힌다.
