# Dure (두레)

![Dure Logo](docs/assets/dure_logo.png)

두레는 여러 AI 에이전트가 협업해 투자 리서치를 수행하는 멀티 에이전트 시스템입니다.
종목 분석, 스크리닝, 전략 설계, 백테스트, 시나리오 분석을 하나의 CLI와 대화형 인터페이스로 실행할 수 있습니다.

## 핵심 기능

- 종목 분석: 펀더멘털, 뉴스, 비평 결과를 종합
- 스크리닝: 유니버스 구성 후 상위 종목 랭킹 생성
- 전략 리서치: 전략 정의, 백테스트, 비평까지 연결
- 백테스트 루프: 전략을 반복 개선하며 성과 비교
- 시나리오 분석: what-if 질문에 대한 종목별 영향 평가

## 빠른 시작

### 요구 사항

- Node.js 18+
- npm

### 설치

```bash
git clone <repository-url>
cd cluefin-dure
npm install
```

### 실행

```bash
# 종목 분석
npm run equity -- AAPL

# 스크리닝
npm run screen -- "US growth"

# 전략 리서치
npm run strategy -- "quality dividend growth"

# 백테스트 반복 개선
npm run backtest -- <strategyId>

# 시나리오 분석
npm run scenario -- "연준이 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"

# 대화형 모드
npm run chat
```

> `tsx`가 인수를 직접 파싱하므로 `--` 구분자가 필요합니다.

## 출력물

각 실행은 `data/runs/<runId>/` 아래에 결과를 저장합니다.

- `report.html`: 결과를 읽기 쉬운 HTML 리포트로 정리
- `events.json`: 실행 이벤트 기록
- 에이전트별 서브디렉토리: 실행 중 생성된 세부 아티팩트

CLI 실행 시 터미널 요약이 출력되고, macOS에서는 `report.html`이 자동으로 열립니다.

## 아키텍처

### 에이전트

| 에이전트 | 역할 | 기본 모델 |
|---------|------|-----------|
| Universe | 투자 유니버스 구성 | `gemini-3-flash` |
| Fundamental | 재무제표 및 밸류에이션 분석 | `claude-sonnet-4-6` |
| News | 뉴스 감성 및 이벤트 분석 | `gemini-3-flash` |
| Strategy | 투자 전략 설계 | `claude-sonnet-4-6` |
| Backtest | 전략 성과 검증 | `claude-sonnet-4-6` |
| Critic | 과적합, 데이터 누수, 편향 검토 | `claude-opus-4-6-thinking` |
| Scenario | 시나리오 영향도 분석 | `claude-sonnet-4-6` |
| Router | 자연어 요청 라우팅 | `gemini-3-flash` |

### 워크플로우

- Equity Analysis: 유니버스 → 펀더멘털 + 뉴스 → 비평
- Screening: 유니버스 → 펀더멘털 랭킹
- Strategy Research: 전략 설계 → 백테스트 → 비평
- Backtest Loop: 백테스트 → 비평 → 전략 수정 반복
- Scenario Analysis: 시나리오 정의 → 영향 분석 → 종합 평가

## 설정

기본 프로바이더는 `google-antigravity`입니다.
전체 프리셋은 `DURE_PROVIDER`, 개별 에이전트는 `DURE_MODEL_{AGENT}`로 덮어쓸 수 있습니다.

우선순위는 다음과 같습니다.

`DURE_MODEL_{AGENT}` > `DURE_PROVIDER` > 코드 기본값

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `DURE_PROVIDER` | 전체 프로바이더 프리셋 (`google-antigravity`, `openai-codex`, `anthropic`) | `google-antigravity` |
| `DURE_MODEL_UNIVERSE` | Universe 모델 | `google-antigravity:gemini-3-flash` |
| `DURE_MODEL_FUNDAMENTAL` | Fundamental 모델 | `google-antigravity:claude-sonnet-4-6` |
| `DURE_MODEL_NEWS` | News 모델 | `google-antigravity:gemini-3-flash` |
| `DURE_MODEL_STRATEGY` | Strategy 모델 | `google-antigravity:claude-sonnet-4-6` |
| `DURE_MODEL_BACKTEST` | Backtest 모델 | `google-antigravity:claude-sonnet-4-6` |
| `DURE_MODEL_CRITIC` | Critic 모델 | `google-antigravity:claude-opus-4-6-thinking` |
| `DURE_MODEL_SCENARIO` | Scenario 모델 | `google-antigravity:claude-sonnet-4-6` |
| `DURE_MODEL_ROUTER` | Router 모델 | `google-antigravity:gemini-3-flash` |

형식은 `provider:modelId`입니다.

```bash
# 전체 프로바이더 전환
DURE_PROVIDER=openai-codex npm run chat

# critic만 별도 override
DURE_PROVIDER=openai-codex \
DURE_MODEL_CRITIC=anthropic:claude-opus-4-6 \
npm run chat
```

### 프로바이더 프리셋

| 역할 티어 | 에이전트 | google-antigravity | openai-codex | anthropic |
|-----------|---------|-------------------|-------------|-----------|
| fast | Universe, News, Router | `gemini-3-flash` | `gpt-5.4-mini` / `gpt-5.3-codex-spark` | `claude-haiku-4-5` |
| standard | Fundamental, Strategy, Backtest, Scenario | `claude-sonnet-4-6` | `gpt-5.4` | `claude-sonnet-4-6` |
| advanced | Critic | `claude-opus-4-6-thinking` | `gpt-5.4` | `claude-opus-4-6` |

## 안정성

- 모든 주요 에이전트는 JSON 추출 실패 시 최대 2회 재시도합니다.
- 최종 실패 시 에이전트 이름과 마지막 응답 일부를 포함한 오류를 반환합니다.
- 프로바이더 오류와 자동 재시도 이벤트는 로그에 기록됩니다.

## 메모리 시스템

에이전트는 파일 기반 메모리를 사용해 세션 간 정보를 축적합니다.

- 저장 위치: `data/memory/*.md`, `data/memory/MEMORY.md`
- 자동 주입: `loadPrompt()`가 시스템 프롬프트에 메모리 컨텍스트를 포함

### 접근 권한

| 에이전트 | 권한 |
|---------|------|
| Strategy, Backtest, Critic | 읽기 + 쓰기 |
| Universe, News, Fundamental | 읽기 전용 |

## 프로젝트 구조

```text
src/
├── agents/          # 에이전트 정의
├── workflow/        # 워크플로우 오케스트레이션
├── tools/           # 시세, 뉴스, 공시, 스크리너, 백테스트 도구
├── schemas/         # 분석/백테스트/시그널/시나리오 스키마
├── memory/          # 파일 기반 메모리 저장소
├── runtime/         # 세션, 이벤트, 아티팩트 관리
├── interactive/     # 대화형 모드 진입점
├── config.ts        # 모델 설정
└── main.ts          # CLI 라우터
research/
└── prompts/         # 에이전트 시스템 프롬프트
data/
├── memory/          # 세션 간 메모리
├── processed/       # 전략, 실험, 논제 JSON
├── raw/             # 원시 데이터
└── runs/            # 실행별 아티팩트
```

## 기술 스택

- TypeScript 5.7
- Node.js (ESM)
- `@mariozechner/pi-coding-agent` ^0.60.0
- `@sinclair/typebox` ^0.34.48
- Biome 2.4.7
- Vitest ^4.1.0
- tsx ^4.19.0
