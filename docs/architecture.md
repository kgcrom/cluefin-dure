# Architecture

## System Overview

Dure는 CLI 또는 대화형 모드에서 요청을 받아, 워크플로우별 에이전트를 실행하고 결과를 HTML 리포트와 실행 아티팩트로 저장합니다.

- CLI 진입점: [`src/main.ts`](../src/main.ts)
- 대화형 모드 진입점: [`src/interactive/startInteractive.ts`](../src/interactive/startInteractive.ts)
- 공통 리포트 생성: [`src/report/generateReport.ts`](../src/report/generateReport.ts)

## Execution Modes

### CLI

`src/main.ts`는 아래 명령을 라우팅합니다.

- `chat`
- `equity <ticker>`
- `screen [market] [style]`
- `strategy <theme...>`
- `scenario <시나리오>`

각 워크플로우는 실행 후 `generateReport()`로 `data/runs/<runId>/report.html`을 만들고, 터미널 요약을 함께 출력합니다.

### Interactive Mode

대화형 모드는 router 프롬프트를 로드한 뒤 `chatWorkflowTools`를 custom tool로 등록합니다.
사용자 자연어 요청은 router가 적절한 워크플로우 도구로 연결합니다.

등록된 도구:

- `run_equity_analysis`
- `run_screening`
- `run_strategy_research`
- `run_scenario_analysis`
- `run_review_checklist`

대화형 모드 제약:

- `run_equity_analysis`는 전체 equity 분석 뒤 checklist review까지 자동 실행합니다.
## Agents and Workflows

| 에이전트 | 역할 | 기본 모델 |
|---------|------|-----------|
| Universe | 투자 유니버스 구성 | `gpt-5.4-mini` |
| Fundamental | 재무제표와 밸류에이션 분석 | `gpt-5.4` |
| News | 뉴스 감성 및 이벤트 분석 | `gpt-5.4-mini` |
| Strategy | 투자 전략 설계 | `gpt-5.4` |
| Critic | 과적합, 데이터 누수, 편향 검토 | `gpt-5.4` |
| Scenario | 시나리오 영향 분석 | `gpt-5.4` |
| Review Checklist | 기존 equity run 체크리스트 리뷰 | `gpt-4.5-mini` |
| Router | 대화형 요청 라우팅 | `gpt-5.3-codex-spark` |

대표 워크플로우:

- Equity Analysis: Universe(또는 단일 종목) → Fundamental + News → Strategy → Critic 반복(최대 3회)
- Interactive Equity Analysis: Universe → Fundamental + News → Strategy → Critic 반복 → Review Checklist
- Screening: Universe → Fundamental ranking
- Strategy Research: Strategy → Critic 반복(최대 3회)
- Interactive Strategy Research: Strategy 초안
- Scenario Analysis: Scenario 정의 → 영향 분석 → 종합 평가

현재 구현 예시:

- 스크리닝은 유니버스 결과 상위 5개를 대상으로 펀더멘털 분석을 병렬 실행합니다.

## Prompts and Memory

프롬프트는 `research/prompts/` 아래 파일을 조합해 만듭니다.

1. `SOUL.md`
2. 역할별 프롬프트 (`router.md`, `fundamental.md`, `strategy.md` 등)
3. 메모리 지침 (`_memory_instructions.md`, 필요 시)
4. 메모리 컨텍스트 (`data/memory/MEMORY.md`, 필요 시)

기본적으로 router를 제외한 에이전트는 메모리를 포함합니다.

메모리 저장소:

- 인덱스: `data/memory/MEMORY.md`
- 토픽 문서: `data/memory/*.md`

README 기준 권한 정책:

- Strategy, Critic: 읽기 + 쓰기
- Universe, News, Fundamental: 읽기 전용

## Reports and Runtime Artifacts

실행 결과는 `data/runs/<runId>/` 아래에 저장됩니다.

- `report.html`: 워크플로우별 요약 리포트
- `events.json`: 세션 이벤트 로그
- `<agent>/<artifact>.json`: 에이전트별 중간 산출물

리포트는 워크플로우 타입에 따라 다른 컴포넌트를 조합합니다.

- `scenario`: 시나리오 정의, 프로젝션, 펀더멘털, 뉴스, 종합 평가
- `screen`: 랭킹된 펀더멘털 묶음
- `equity`: 펀더멘털, 뉴스, critic 리포트, critic 반복 로그
- `strategy`: 전략 정의, critic 리포트, critic 반복 로그

macOS에서는 리포트 생성 직후 `open` 명령으로 HTML 파일을 자동으로 엽니다.

## External CLI Dependency

Dure는 `CLUEFIN_CLI_CWD` 또는 기본 sibling 경로 `../cluefin`를 기준으로
`uv run cluefin-openapi-cli ... --json`,
`uv run cluefin-ta-cli ... --json`
를 stateless subprocess로 실행합니다.

도구 discovery는 각 CLI의 `list --json` / `describe --json` 결과를 사용하며,
에이전트에는 Dure가 재구성한 alias 이름으로 노출됩니다.

## Project Layout

```text
src/
├── agents/          # 에이전트 정의
├── workflow/        # 워크플로우 오케스트레이션
├── tools/           # 워크플로우/시장 데이터 도구
├── schemas/         # 분석/시그널/시나리오/전략 스키마
├── memory/          # 파일 기반 메모리 저장소
├── runtime/         # 세션, 이벤트, 아티팩트 관리
├── report/          # HTML 리포트 렌더링
├── interactive/     # 대화형 모드 진입점
├── cli/             # cluefin CLI discovery/exec 브리지
├── config.ts        # 모델 설정
└── main.ts          # CLI 라우터
research/
└── prompts/         # 공통 SOUL + 역할별 프롬프트
data/
├── memory/          # 세션 간 메모리
└── runs/            # 실행별 산출물
docs/
└── examples/        # README에서 참조하는 예시 결과
```

## Reliability Notes

- JSON 추출 실패 시 주요 에이전트는 최대 2회 재시도합니다.
- 이벤트 레코더는 세션 스트림, provider retry metadata, provider error metadata를 `events.json`에 남깁니다.
- 스크리닝은 기본 병렬도 3으로 펀더멘털 분석을 수행하며, `DURE_MAX_CONCURRENT_SESSIONS`로 조정할 수 있습니다.
