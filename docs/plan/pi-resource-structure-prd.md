# Pi Resource Structure PRD

## Summary

Dure 대화형 모드를 Pi project-local resource discovery 흐름에 맞춘다. Extension은 런타임 도구 등록에 집중하고, slash UX는 prompt template로 옮기며, 반복 작업 지침은 skill로 분리한다.

## Problem

- `src/interactive/startInteractive.ts`가 `.pi/extensions/finance-commands.ts`만 명시 로드하고 skills/prompt templates discovery를 비활성화한다.
- `.pi/extensions/finance-commands.ts`가 workflow tool 등록과 slash command prompt 생성 책임을 함께 가진다.
- `src/cli/*`의 cluefin CLI bridge는 존재하지만, cluefin의 domain/tag discovery를 Dure workflow 의도와 연결하는 규칙이 명확하지 않다.
- README와 architecture 문서가 Pi resource별 위치, 목적, 검증 방법을 충분히 설명하지 않는다.

## Goals

- Interactive router 세션에서 `.pi/extensions`, `.pi/prompts`, `.pi/skills` project-local discovery를 사용한다.
- 내부 workflow agent 세션은 기존처럼 명시 system prompt와 명시 tool 중심으로 유지한다.
- Slash command UX를 prompt template로 옮겨 `/equity`, `/screen`, `/strategy`, `/scenario`, `/review`를 유지한다.
- Dure의 주식 AI 작업 도메인을 cluefin CLI domain/tag taxonomy에 매핑한다.
- 각 phase는 targeted test, format, lint, full test를 통과한 뒤 한국어 커밋으로 닫는다.

## Non-Goals

- 내부 workflow agent까지 모든 Pi skills/prompt templates를 자동 주입하지 않는다.
- cluefin CLI taxonomy를 Dure에 1:1 복제하지 않는다.
- 기존 workflow 실행 표면이나 report artifact 구조를 재설계하지 않는다.
- 실제 broker API 통합 테스트를 필수 gate로 추가하지 않는다.

## Resource Boundary

- **Extension**: Pi runtime에 workflow tools를 등록한다. 사용자 입력을 prompt 문자열로 바꾸는 단순 slash command는 담당하지 않는다.
- **Prompt template**: 사용자가 `/equity 005930`처럼 직접 호출하는 재사용 prompt entrypoint를 제공한다.
- **Skill**: 모델이 workflow 선택, review 기준, CLI discovery fallback 기준을 필요할 때 읽는 작업 지침이다.
- **TypeScript workflow code**: 실제 분석 실행, artifact 기록, report 생성, cluefin CLI subprocess 실행을 계속 담당한다.

## Domain Decision

Dure domain은 사용자 작업 의도 기준이다. cluefin domain/tag는 데이터와 기능 discovery 기준이다. 따라서 Dure는 별도 주식 AI 도메인을 정의하고 각 도메인이 cluefin domain/tag 조합을 사용한다.

초기 Dure domain:

- `equity-research`
- `market-screening`
- `strategy-research`
- `scenario-analysis`
- `review-checklist`

## Rollout Policy

각 phase는 작은 변경 단위로 진행한다. phase가 끝날 때 `docs/plan/feature_list.json` 상태를 갱신하고, targeted test와 전체 검증이 모두 통과해야 다음 phase로 넘어간다.

Phase gate:

1. 해당 phase targeted test 실행
2. `npm run format`
3. `npm run lint`
4. `npm test`
5. `git status`
6. 현재 phase 파일만 stage
7. 한국어 commit 생성

