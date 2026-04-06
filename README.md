# Dure (두레)

![Dure Logo](docs/assets/dure_logo.png)

두레는 여러 AI 에이전트를 조합해 투자 리서치를 실행하는 CLI 워크벤치입니다.
종목 분석, 스크리닝, 전략 리서치, 시나리오 분석을 하나의 진입점에서 다룰 수 있습니다.

## Quick Navigation

- [What It Does](#what-it-does)
- [Quick Start](#quick-start)
- [Examples](#examples)
- [Outputs](#outputs)
- [Configuration Summary](#configuration-summary)
- [More Docs](#more-docs)
- [Development](#development)

## What It Does

처음 쓰는 사용자라면 Dure를 "투자 리서치용 AI 워크벤치"로 이해하면 됩니다.
자연어 요청이나 CLI 명령을 입력하면, 작업 종류에 맞는 에이전트 조합이 실행되고 결과가 리포트로 정리됩니다.

- 종목 분석: 특정 종목의 펀더멘털, 뉴스, 전략-논리 검증을 함께 정리하고, 대화형 모드에서는 체크리스트 리뷰까지 이어집니다.
- 스크리닝: 시장과 스타일 기준으로 종목군을 추리고 상위 후보를 보여줍니다.
- 전략 리서치: 전략 정의 후 critic autoresearch로 반복 개선합니다.
- 시나리오 분석: 거시 이벤트나 가정이 종목과 섹터에 주는 영향을 요약합니다.
- 대화형 탐색: 채팅처럼 질문을 이어가며 분석 범위를 좁히거나 확장할 수 있습니다.
- 투자 리뷰 체크리스트: 기존 `equity-...` run을 수동으로 다시 검토하거나, 대화형 종목 분석 뒤 자동으로 이어서 실행할 수 있습니다.

## Quick Start

### 1. Install

```bash
git clone https://github.com/kgcrom/cluefin-dure
git clone https://github.com/kgcrom/cluefin

cd cluefin-dure
npm install
cp .env.example .env
```

두 저장소가 모두 필요합니다.
`cluefin-dure`는 CLI 오케스트레이션을 담당하고, `cluefin`은 `uv run --project apps/cluefin-rpc -m cluefin_rpc`로 호출되는 RPC 백엔드입니다.

`.env`에는 데이터 소스 키와 `CLUEFIN_RPC_CWD`가 필요합니다.
예를 들어 `cluefin`을 같은 상위 디렉터리에 clone했다면 아래처럼 설정합니다.

```bash
CLUEFIN_RPC_CWD=../cluefin

# 또는 RPC 패키지 디렉터리를 직접 지정해도 됩니다.
# CLUEFIN_RPC_CWD=../cluefin/apps/cluefin-rpc
```

필수 항목과 모델 설정 방법은 [docs/configuration.md](docs/configuration.md)에서 정리합니다.

### 2. Run

```bash
# 대화형 모드
npm run chat

# 종목 분석
npm run equity -- 005930

# 스크리닝
npm run screen -- KR value

# 전략 리서치
npm run strategy -- "quality dividend growth"

# 시나리오 분석
npm run scenario -- "연준이 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"
```

> `npm run <script>` 뒤 인수를 넘길 때는 `--` 구분자가 필요합니다.
> `npm run chat`의 종목 분석 요청은 전체 equity 분석 뒤 체크리스트 리뷰까지 자동으로 이어집니다.

## Examples

아래 예시는 저장소에 포함된 실제 산출물 기준으로 정리했습니다.
리포트 예시는 모두 `docs/examples/` 아래에서 바로 확인할 수 있습니다.

### 1. Chat

언제 쓰나: 한 회사 상태를 빠르게 요약받고 다음 질문으로 이어가고 싶을 때

```bash
DURE_PROVIDER=openai-codex npm run chat
```

```text
삼성전자 기업분석해주세요.
```

결과 파일: [docs/examples/chat_result.md](https://kgcrom.github.io/cluefin-dure/examples/chat_result.md)

이 예시에서 볼 포인트:

- 핵심 결론을 먼저 제시하고, 뒤에서 숫자와 근거를 붙입니다.
- 매출, 영업이익, ROE, PER, PBR, 부채비율 같은 기본 지표를 한 번에 보여줍니다.
- 긍정 포인트와 리스크 요인을 분리해 후속 질문을 이어가기 쉽습니다.
- 현재 구현에서는 checklist review verdict와 blocking issue까지 함께 반영됩니다.
- 마지막에 비교 분석, 시나리오, 전략안 같은 다음 액션을 제안합니다.

### 2. Scenario

언제 쓰나: 특정 거시 이벤트가 섹터와 종목에 어떤 경로로 영향을 줄지 보고 싶을 때

```bash
DURE_PROVIDER=openai-codex npm run scenario -- "연준이 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"
```

결과 파일: [docs/examples/scenario_report.html](https://kgcrom.github.io/cluefin-dure/examples/scenario_report.html)

이 예시에서 볼 포인트:

- 시나리오 설명, 시간 범위, 대상 종목, 핵심 변수 방향을 한 화면에서 정리합니다.
- SK하이닉스, 삼성전자 등 종목별 영향과 촉매, 리스크를 비교합니다.
- "단기 긍정, 중기 조건부"처럼 실행 가능한 종합 평가를 제공합니다.
- 마지막에 확인해야 할 후속 데이터와 체크포인트를 권고사항으로 남깁니다.

### 3. Screen

언제 쓰나: 시장과 스타일을 넣고 우선 검토할 종목 후보를 빠르게 추리고 싶을 때

```bash
DURE_PROVIDER=openai-codex npm run screen -- KR value
```

결과 파일: [docs/examples/screen_report.html](https://kgcrom.github.io/cluefin-dure/examples/screen_report.html)

이 예시에서 볼 포인트:

- 상위 랭킹 종목의 매출, 이익률, PE, PB, ROE, D/E를 표로 먼저 보여줍니다.
- 각 종목마다 성장 트렌드, 분기 변화, 레드 플래그, 메모가 이어져 1차 검토에 적합합니다.
- 최근 공시와 자본정책 이벤트까지 함께 언급해 숫자만 보는 스크리너보다 맥락이 풍부합니다.
- 단순 필터 결과가 아니라 "왜 지금 봐야 하는 후보인지"를 서술형으로 정리합니다.

### 4. Strategy

언제 쓰나: 투자 아이디어를 전략 규칙으로 바꾸고 전략/논리 검토를 반복해 다듬고 싶을 때

```bash
DURE_PROVIDER=openai-codex npm run strategy -- "quality dividend growth"
```

결과 파일: [docs/examples/strategy_report.html](https://kgcrom.github.io/cluefin-dure/examples/strategy_report.html)

이 예시에서 볼 포인트:

- 전략 가설, 진입 규칙, 청산 규칙, 포지션 사이징, 리밸런싱 주기를 명시합니다.
- 각 루프별 critic 판정, 추천사항, 전략 버전 변화를 함께 보여줍니다.
- 데이터 한계, 유니버스 제약, 근거 정합성에 대한 비평 포인트가 어떻게 개선되는지 확인할 수 있습니다.

## Outputs

각 실행은 `data/runs/<runId>/` 아래에 결과를 저장합니다.

- `report.html`: 사람이 읽기 쉬운 HTML 리포트
- `events.json`: 실행 중 이벤트 로그
- `<agent>/artifact.json`: 에이전트별 중간 산출물

CLI를 실행하면 터미널 요약이 함께 출력되고, macOS에서는 생성된 `report.html`이 자동으로 열립니다.

## Configuration Summary

기본 모델 프리셋은 `openai-codex`입니다.
전체 프리셋은 `DURE_PROVIDER`, 개별 에이전트 오버라이드는 `DURE_MODEL_{AGENT}`로 제어합니다.

우선순위:

```text
DURE_MODEL_{AGENT} > DURE_PROVIDER > 코드 기본값
```

예시:

```bash
# 전체 프로바이더 전환
DURE_PROVIDER=openai-codex npm run chat

# critic만 별도 override
DURE_PROVIDER=openai-codex \
DURE_MODEL_CRITIC=anthropic:claude-opus-4-6 \
npm run chat
```

전체 환경 변수 목록, provider preset, `.env.example` 설명은 [docs/configuration.md](docs/configuration.md)에서 다룹니다.

Google 계열 제품 로그인(`Antigravity`, `Gemini CLI`, `Gemini Code Assist`)을 제3자 코딩 에이전트에 연결해 사용하는 방식은 지원하지 않습니다.
이 경우 차단 또는 정지될 수 있으므로, 관련 안내와 이의제기 링크는 [docs/configuration.md](docs/configuration.md)에서 확인하세요.

## More Docs

- [docs/configuration.md](docs/configuration.md): `.env` 항목, 모델 선택, provider preset, override 규칙
- [docs/architecture.md](docs/architecture.md): 에이전트 구성, 워크플로우, 메모리 시스템, 프롬프트 조합, 프로젝트 구조
- [docs/examples/scenario_report.html](docs/examples/scenario_report.html): 시나리오 리포트 예시
- [docs/examples/screen_report.html](docs/examples/screen_report.html): 스크리닝 리포트 예시
- [docs/examples/strategy_report.html](docs/examples/strategy_report.html): 전략 리포트 예시
- [docs/examples/chat_result.md](docs/examples/chat_result.md): 대화형 분석 예시

## Development

문서 외 변경 작업을 마칠 때는 아래 검증을 실행합니다.

```bash
npm test
npm run lint
```
