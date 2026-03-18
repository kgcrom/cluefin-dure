# Dure (두레)

> **두레**는 농촌에서 농사일을 공동으로 하기 위한 공동 노동 협동 조직입니다. 여러 AI 에이전트가 두레처럼 협동하여 투자 분석 결과를 도출하는 멀티 에이전트 시스템입니다.

AI 에이전트들이 협력하여 종목 분석, 뉴스 감성 분석, 전략 설계, 백테스트, 비평 평가까지 투자 리서치 전 과정을 자동화합니다.

## Table of Contents

- [Architecture](#architecture)
- [Memory System](#memory-system)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)

## Architecture

```
                         ┌─────────────┐
                         │   Router    │
                         └──────┬──────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
   ┌────────────────┐  ┌───────────────┐  ┌────────────────┐
   │ Equity Analysis│  │   Screening   │  │Strategy Research│
   └───────┬────────┘  └───────┬───────┘  └───────┬────────┘
           │                   │                   │
           ▼                   ▼                   ▼
```

### 에이전트 구성

| 에이전트 | 역할 | 모델 |
|---------|------|------|
| **Universe** | 투자 유니버스 구성 (시장/스타일 필터) | `gemini-3-flash` |
| **Fundamental** | 재무제표 분석, 밸류에이션 평가 | `claude-sonnet-4-6` |
| **News** | 뉴스 감성 분석, 이벤트 타임라인 | `gemini-3-flash` |
| **Strategy** | 정량적 투자 전략 설계 | `claude-sonnet-4-6` |
| **Backtest** | 전략 검증 (CAGR, MDD, Sharpe) | `claude-sonnet-4-6` |
| **Critic** | 과적합, 데이터 누수, 생존 편향 검증 | `claude-opus-4-6-thinking` |
| **Router** | 자연어 요청을 워크플로우로 라우팅 | `gemini-3-flash` |

모든 에이전트는 `google-antigravity` 프로바이더를 사용합니다.

### 워크플로우

- **Equity Analysis** — 종목 분석 파이프라인: 유니버스 → 펀더멘털 + 뉴스 (병렬) → 전략 → 백테스트 → 비평
- **Screening** — 유니버스 구성 후 Top-N 펀더멘털 분석으로 종목 랭킹
- **Strategy Research** — 테마 기반 전략 설계 → 백테스트 → 비평 평가
- **Backtest Loop** — 최대 3회 반복 개선: 백테스트 → 비평 → 전략 수정

## Memory System

에이전트들은 세션 간 정보를 축적하는 파일 기반 메모리 시스템을 사용합니다.

- **저장 위치**: `data/memory/*.md` + `data/memory/MEMORY.md` (인덱스)
- **자동 주입**: `loadPrompt()` (`src/agents/_utils.ts`)가 시스템 프롬프트에 `<agent-memory>` 블록을 자동으로 포함시킵니다.

### 에이전트별 접근 권한

| 에이전트 | 권한 |
|---------|------|
| **Strategy**, **Backtest**, **Critic** | 읽기 + 쓰기 |
| **Universe**, **News**, **Fundamental** | 읽기 전용 |

## Getting Started

### 사전 요구 사항

- Node.js 18+
- npm

### 설치

```bash
git clone <repository-url>
cd cluefin-dure
npm install
```

### 환경 변수

프로젝트 루트에 `.env` 파일을 생성합니다.

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `DURE_MODEL_UNIVERSE` | Universe 에이전트 모델 | `google-antigravity:gemini-3-flash` |
| `DURE_MODEL_FUNDAMENTAL` | Fundamental 에이전트 모델 | `google-antigravity:claude-sonnet-4-6` |
| `DURE_MODEL_NEWS` | News 에이전트 모델 | `google-antigravity:gemini-3-flash` |
| `DURE_MODEL_STRATEGY` | Strategy 에이전트 모델 | `google-antigravity:claude-sonnet-4-6` |
| `DURE_MODEL_BACKTEST` | Backtest 에이전트 모델 | `google-antigravity:claude-sonnet-4-6` |
| `DURE_MODEL_CRITIC` | Critic 에이전트 모델 | `google-antigravity:claude-opus-4-6-thinking` |
| `DURE_MODEL_ROUTER` | Router 에이전트 모델 | `google-antigravity:gemini-3-flash` |

형식은 `provider:modelId`이며, 환경 변수로 기본값을 오버라이드할 수 있습니다.

## Usage

### CLI

```bash
# 종목 분석
npm run equity -- AAPL

# 유니버스 스크리닝
npm run screen -- "US growth"

# 전략 리서치
npm run strategy -- "quality dividend growth"

# 백테스트 반복 개선
npm run backtest -- <strategyId>
```

> `tsx`가 인수를 직접 파싱하므로 `--` 구분자가 필요합니다.

### 대화형 모드

```bash
npm run chat
```

자연어로 요청할 수 있습니다:

```
> 삼성전자 분석해줘
> 저평가된 한국 기술주 찾아줘
> 저PER 고ROE 전략 만들어줘
```

## Project Structure

```
src/
├── agents/          # 6개 에이전트 정의 (universe, fundamental, news, strategy, backtest, critic)
├── workflow/        # 4개 워크플로우 오케스트레이션
├── tools/           # 데이터 도구 (시세, 뉴스, 공시, 스크리너, 백테스트)
├── schemas/         # TypeBox 스키마 (분석, 백테스트, 시그널)
├── memory/          # MemoryStore (파일 기반 영속 메모리)
├── runtime/         # 세션 풀, 이벤트 레코더, 아티팩트 스토어
├── interactive/     # 대화형 모드 진입점
├── config.ts        # 에이전트별 모델 설정
└── main.ts          # CLI 라우터
research/
└── prompts/         # 에이전트 시스템 프롬프트
data/
├── memory/          # MemoryStore 마크다운 (세션 간 축적)
├── processed/       # 전략·실험·논제 JSON
├── raw/             # 원시 데이터
└── runs/            # 실행별 아티팩트 (events.json + 에이전트별 서브디렉토리)
```

## Tech Stack

- **Runtime** — TypeScript 5.7, Node.js (ESM)
- **Agent Framework** — [@mariozechner/pi-coding-agent](https://www.npmjs.com/package/@mariozechner/pi-coding-agent) ^0.58.4
- **Schema Validation** — [@sinclair/typebox](https://github.com/sinclairzx81/typebox) ^0.34.48
- **Linter/Formatter** — Biome 2.4.7
- **Test Runner** — Vitest ^4.1.0
- **TS Executor** — tsx ^4.19.0
