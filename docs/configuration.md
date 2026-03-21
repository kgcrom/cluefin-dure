# Configuration

## Required Environment Variables

기본 템플릿은 [.env.example](../.env.example)에 있습니다.
실행 전 `.env`를 만들고 아래 값을 채워야 합니다.

`cluefin-dure`만으로는 실행되지 않고, RPC 백엔드용 `cluefin` 저장소도 로컬에 함께 있어야 합니다.
`CLUEFIN_RPC_CWD`는 그 `cluefin` 작업 디렉터리를 가리켜야 합니다.

| 변수 | 설명 |
|------|------|
| `KIWOOM_APP_KEY` | 키움 API 앱 키 |
| `KIWOOM_SECRET_KEY` | 키움 API 시크릿 |
| `KIWOOM_ENV` | 키움 실행 환경 (`prod` 등) |
| `DART_AUTH_KEY` | DART 공시 API 키 |
| `KIS_APP_KEY` | 한국투자 API 앱 키 |
| `KIS_SECRET_KEY` | 한국투자 API 시크릿 |
| `KIS_ENV` | 한국투자 실행 환경 (`prod` 등) |
| `CLUEFIN_RPC_CWD` | `uv run -m cluefin_rpc`를 실행할 cluefin 리포지토리 경로 |

`CLUEFIN_RPC_CWD`가 없으면 RPC 클라이언트 초기화 단계에서 바로 오류가 발생합니다.

예시:

```bash
# cluefin-dure와 cluefin을 같은 상위 디렉터리에 clone한 경우
CLUEFIN_RPC_CWD=../cluefin
```

## Model Selection

기본 프리셋은 `openai-codex`입니다.
모델 선택 우선순위는 아래 순서입니다.

```text
DURE_MODEL_{AGENT} > DURE_PROVIDER > agentModelConfig 기본값
```

### Global Provider Preset

```bash
DURE_PROVIDER=openai-codex npm run chat
```

`DURE_PROVIDER`를 지정하면 `src/config.ts`의 preset 매핑을 사용합니다.
만약 등록되지 않은 provider 이름을 넣으면, 해당 provider 이름과 기존 agent 기본 `modelId`를 조합해 폴백합니다.

### Per-Agent Override

형식은 `provider:modelId`입니다.

```bash
DURE_PROVIDER=openai-codex \
DURE_MODEL_CRITIC=anthropic:claude-opus-4-6 \
npm run strategy -- "quality dividend growth"
```

자주 쓰는 키는 다음과 같습니다.

- `DURE_MODEL_UNIVERSE`
- `DURE_MODEL_FUNDAMENTAL`
- `DURE_MODEL_NEWS`
- `DURE_MODEL_STRATEGY`
- `DURE_MODEL_BACKTEST`
- `DURE_MODEL_CRITIC`
- `DURE_MODEL_SCENARIO`
- `DURE_MODEL_ROUTER`

## Unsupported Google Product Logins

다음 방식은 지원하지 않습니다.

- `Antigravity`, `Gemini CLI`, `Gemini Code Assist` 제품 로그인을 제3자 코딩 에이전트나 외부 도구에 연결하는 경우
- 제품 로그인 기반 OAuth를 우회해 다른 소프트웨어에서 Google 모델에 접근하는 경우

이런 방식으로 연동하면 차단 또는 계정 정지 대상이 될 수 있습니다.
Gemini를 제3자 코딩 에이전트에서 사용해야 한다면 제품 로그인 대신 Vertex AI 또는 AI Studio API 키를 사용하는 편이 안전합니다.

이미 차단된 경우 이의제기는 아래 Google Form에서 진행할 수 있습니다.

- [Gemini suspension appeal form](https://docs.google.com/forms/d/e/1FAIpQLScOJWibQ_-hYuVv63kJTgEqlgAaOwRLGFTbXm-QY1gz8U0CGA/viewform)

## Provider Presets

아래 값은 현재 [`src/config.ts`](../src/config.ts) 기준입니다.

| 역할 티어 | 에이전트 | `openai-codex` | `anthropic` |
|-----------|---------|----------------|-------------|
| fast | Universe, News | `gpt-5.4-mini` | `claude-haiku-4-5` |
| fast | Router | `gpt-5.3-codex-spark` | `claude-haiku-4-5` |
| standard | Fundamental, Strategy, Backtest, Scenario | `gpt-5.4` | `claude-sonnet-4-6` |
| advanced | Critic | `gpt-5.4` | `claude-opus-4-6` |

에이전트별 기본 조합은 다음과 같습니다.

| 에이전트 | 기본 provider:modelId |
|----------|------------------------|
| Universe | `openai-codex:gpt-5.4-mini` |
| Fundamental | `openai-codex:gpt-5.4` |
| News | `openai-codex:gpt-5.4-mini` |
| Strategy | `openai-codex:gpt-5.4` |
| Backtest | `openai-codex:gpt-5.4` |
| Critic | `openai-codex:gpt-5.4` |
| Scenario | `openai-codex:gpt-5.4` |
| Router | `openai-codex:gpt-5.3-codex-spark` |

## Command Notes

- 패키지 스크립트는 `tsx --env-file=.env src/main.ts ...` 형태로 실행됩니다.
- `npm run <script>`에 인수를 넘길 때는 `--` 구분자가 필요합니다.

예시:

```bash
npm run screen -- KR value
npm run strategy -- "quality dividend growth"
npm run scenario -- "연준이 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"
```
