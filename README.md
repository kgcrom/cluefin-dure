# Dure (두레)

![Dure Logo](docs/assets/dure_logo.png)

두레는 여러 AI 에이전트가 협업해 투자 리서치를 수행하는 멀티 에이전트 시스템입니다.
종목 분석, 스크리닝, 전략 설계, 백테스트, 시나리오 분석을 하나의 CLI와 대화형 인터페이스로 실행할 수 있습니다.

## Dure로 할 수 있는 일

처음 쓰는 사용자라면 Dure를 "투자 리서치용 AI 워크벤치"로 이해하면 됩니다.
질문을 자연어로 던지면, Dure가 작업 종류에 맞는 에이전트를 조합해 분석 결과를 정리합니다.

- 기업 분석: 특정 기업의 실적, 밸류에이션, 재무 안정성, 최근 공시/뉴스를 요약
- 시나리오 분석: 금리 인하, 경기 둔화, 업황 회복 같은 거시 이벤트가 섹터와 종목에 주는 영향을 정리
- 스크리닝: 조건에 맞는 종목군을 추려서 우선순위를 제시
- 전략 리서치: 투자 아이디어를 전략으로 만들고 백테스트와 비평까지 연결
- 대화형 탐색: 채팅처럼 질문을 이어가며 분석 범위를 좁히거나 확장

## 처음 써보는 사용자용 예시

아래 예시는 모두 `openai-codex` 프로바이더로 실행한 결과이며, 생성 시점은 2026년 3월 19일 저녁 기준입니다.

### 1. 시나리오 분석

"어떤 이벤트가 발생하면 특정 섹터가 어떻게 반응할까?"를 보고 싶을 때 사용합니다.

```bash
DURE_PROVIDER=openai-codex npm run scenario -- "연준이 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"
```

이 명령을 실행하면 Dure는 시나리오를 정의하고, 관련 변수와 종목별 영향을 정리한 HTML 리포트를 생성합니다.
예시 결과는 [docs/examples/scenario_report.html](docs/examples/scenario_report.html)에서 확인할 수 있습니다.

이 예시에서 확인할 수 있는 포인트는 다음과 같습니다.

- 시나리오 정의: 금리 인하가 어떤 경로로 반도체 섹터에 영향을 줄지 설명
- 핵심 변수 정리: 정책금리, 장기금리, 환율, 주요 종목 가격 같은 변수의 방향성 제시
- 종목별 영향 비교: SK하이닉스, 삼성전자 등 개별 종목의 수혜 강도와 리스크 비교
- 종합 평가: "단기 긍정, 중기 조건부"처럼 실행 가능한 한 줄 결론 제시

즉, 막연한 거시 질문을 바로 투자 리서치 문서 형태로 바꿔주는 기능입니다.

### 2. 대화형 기업 분석

"한 회사가 지금 어떤 상태인지 빠르게 파악하고 싶다"면 대화형 모드를 쓰는 것이 가장 쉽습니다.

```bash
DURE_PROVIDER=openai-codex npm run chat
```

프롬프트가 보이면 아래처럼 입력합니다.

```text
삼성전자 기업분석해주세요.
```

그러면 Dure는 삼성전자의 핵심 결론, 주요 재무지표, 실적 흐름, 긍정 포인트, 리스크 요인을 Markdown 형태로 정리합니다.
예시 결과는 [docs/examples/chat_result.md](docs/examples/chat_result.md)에서 확인할 수 있습니다.

이 예시를 보면 Dure는 다음처럼 응답합니다.

- 핵심 결론 먼저 제시: "실적은 회복세지만 밸류에이션 부담이 있다"
- 숫자 정리: 매출, 영업이익, ROE, PER, PBR 같은 핵심 지표를 한 번에 제시
- 투자 판단 포인트 구분: 긍정 요인과 리스크 요인을 나눠서 설명
- 다음 질문 유도: 비교 분석, 시나리오 분석, 투자 전략안으로 자연스럽게 확장 가능

즉, 사용자는 복잡한 명령을 외우지 않아도 자연어 질문만으로 기업 분석을 시작할 수 있습니다.

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
- 자동 주입: 공통 프롬프트 로더가 shared SOUL, 역할 프롬프트, 메모리 지침, 메모리 컨텍스트를 순서대로 조합
- shared SOUL 위치: `research/prompts/SOUL.md`

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
└── prompts/         # shared SOUL + 에이전트 시스템 프롬프트
data/
├── memory/          # 세션 간 메모리
├── processed/       # 전략, 실험, 논제 JSON
├── raw/             # 원시 데이터
└── runs/            # 실행별 아티팩트
```

## 프롬프트 구성

모든 에이전트와 대화형 router는 공통 프롬프트 조합 규칙을 사용합니다.

1. `research/prompts/SOUL.md`의 Dure 정체성
2. 역할별 프롬프트 (`router.md`, `fundamental.md` 등)
3. 메모리 지침 (`_memory_instructions.md`, 메모리 사용 시)
4. 메모리 컨텍스트 (`data/memory/MEMORY.md` 기반, 메모리 사용 시)

이 구조 덕분에 Dure의 공통적인 리서치 태도는 유지하면서도, 각 에이전트는 기존 역할과 출력 스키마를 그대로 보존합니다.

## 기술 스택

- TypeScript 5.7
- Node.js (ESM)
- `@mariozechner/pi-coding-agent` ^0.60.0
- `@sinclair/typebox` ^0.34.48
- Biome 2.4.7
- Vitest ^4.1.0
- tsx ^4.19.0
