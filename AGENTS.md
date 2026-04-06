# AGENTS.md

## Codex Working Rules

- 이 저장소에서는 작은 범위로 수정하고, 요청과 직접 관련 없는 리팩터링은 하지 않습니다.
- 파일 검색은 기본적으로 `rg`, 파일 목록은 `rg --files`를 우선 사용합니다.
- 기존 패턴과 파일 구조를 먼저 따르고, 새 패턴 도입은 꼭 필요한 경우에만 합니다.
- 문서 변경은 `README.md`와 실제 동작이 어긋나지 않도록 함께 맞춥니다.
- 커밋이 필요하면 기능 단위로 나누고, 관련 없는 파일은 함께 포함하지 않습니다.

## Commands

- 설치: `npm install`
- 대화형 실행: `npm run chat`
- 개별 실행: `npm run equity -- ...`, `npm run screen -- ...`, `npm run strategy -- ...`, `npm run scenario -- ...`

## Completion Checks

- 작업 완료 후 반드시 테스트를 실행합니다: `npm test`
- 작업 완료 후 반드시 lint를 확인합니다: `npm run lint`
- 테스트 또는 lint가 실패하면 원인을 확인하고 수정한 뒤 종료합니다.
