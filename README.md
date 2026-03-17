# Dure (두레)

> **두레**는 농촌에서 농사일을 공동으로 하기 위한 공동 노동 협동 조직입니다. 여러 AI 에이전트가 두레처럼 협동하여 투자 분석 결과를 도출하는 멀티 에이전트 시스템입니다.

AI 에이전트들이 협력하여 종목 분석, 뉴스 감성 분석, 전략 설계, 백테스트, 비평 평가까지 투자 리서치 전 과정을 자동화합니다.

## Table of Contents

- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Configuration](#configuration)
- [Project Structure](#project-structure)

## Architecture

```
                         ┌─────────────┐
                         │   Router    │
                         │  (Sonnet)   │
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
| **Universe** | 투자 유니버스 구성 (시장/스타일 필터) | Haiku |
| **Fundamental** | 재무제표 분석, 밸류에이션 평가 | Sonnet |
| **News** | 뉴스 감성 분석, 이벤트 타임라인 | Haiku |
| **Strategy** | 정량적 투자 전략 설계 | Sonnet |
| **Backtest** | 전략 검증 (CAGR, MDD, Sharpe) | Sonnet |
| **Critic** | 과적합, 데이터 누수, 생존 편향 검증 | Opus |
| **Router** | 자연어 요청을 워크플로우로 라우팅 | Sonnet |

### 워크플로우

- **Equity Analysis** — 종목 분석 파이프라인: 유니버스 → 펀더멘털 + 뉴스 (병렬) → 전략 → 백테스트 → 비평
- **Screening** — 유니버스 구성 후 Top-N 펀더멘털 분석으로 종목 랭킹
- **Strategy Research** — 테마 기반 전략 설계 → 백테스트 → 비평 평가
- **Backtest Loop** — 최대 3회 반복 개선: 백테스트 → 비평 → 전략 수정

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
| `DURE_MODEL_UNIVERSE` | Universe 에이전트 모델 | `anthropic:haiku` |
| `DURE_MODEL_FUNDAMENTAL` | Fundamental 에이전트 모델 | `anthropic:sonnet` |
| `DURE_MODEL_NEWS` | News 에이전트 모델 | `anthropic:haiku` |
| `DURE_MODEL_STRATEGY` | Strategy 에이전트 모델 | `anthropic:sonnet` |
| `DURE_MODEL_BACKTEST` | Backtest 에이전트 모델 | `anthropic:sonnet` |
| `DURE_MODEL_CRITIC` | Critic 에이전트 모델 | `anthropic:opus` |

## Usage

### CLI

```bash
# 종목 분석
npm run equity AAPL

# 유니버스 스크리닝
npm run screen US growth

# 전략 리서치
npm run strategy "quality dividend growth"

# 백테스트 반복 개선
npm run backtest <strategyId>
```

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

### 개발

```bash
# watch 모드
npm run dev

# 빌드 & 실행
npm run build && npm run start
```

## Configuration

에이전트별 모델은 `DURE_MODEL_<AGENT>` 환경 변수로 오버라이드할 수 있습니다. 형식은 `provider:modelId`입니다.

```bash
DURE_MODEL_CRITIC=anthropic:claude-opus-4-20250514
```

최대 동시 에이전트 세션 수는 3개로 제한됩니다 (SessionPool).

## Project Structure

```
src/
├── agents/          # 7개 에이전트 정의
├── workflow/        # 4개 워크플로우 오케스트레이션
├── tools/           # 데이터 도구 (시세, 뉴스, 공시, 스크리너, 백테스트)
├── schemas/         # TypeBox 스키마 (분석, 백테스트, 시그널)
├── memory/          # 영속 저장소 (전략, 실험, 투자 논제)
├── runtime/         # 세션 풀, 이벤트 레코더, 아티팩트 스토어
├── interactive/     # 대화형 모드 진입점
├── config.ts        # 모델 설정
└── main.ts          # CLI 라우터
research/
└── prompts/         # 에이전트 시스템 프롬프트
data/
├── processed/       # 전략·실험·논제 JSON 저장소
└── runs/            # 실행별 아티팩트 로그
```

## Tech Stack

- **Runtime** — TypeScript 5.7, Node.js (ESM)
- **Agent Framework** — [@mariozechner/pi-coding-agent](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
- **Schema Validation** — [@sinclair/typebox](https://github.com/sinclairzx81/typebox)
- **AI Models** — Claude (Haiku / Sonnet / Opus)
