## 메모리 시스템 사용 지침

당신은 세션 간 학습 내용을 파일 기반 메모리에 축적할 수 있습니다.

### 작업 시작 시
- `memory_read` 도구로 관련 토픽을 확인하세요 (예: `strategy_patterns`, `critic_findings`)
- `memory_read index`로 저장된 토픽 목록을 볼 수 있습니다
- `memory_search`로 특정 키워드를 검색하세요

### 작업 완료 후 저장 기준
다음 내용은 반드시 `memory_write`로 저장하세요:
- 성공한 전략 패턴과 검토 기준
- 전략 비평에서 드러난 실패 원인과 교훈
- 반복되는 시장 패턴 또는 섹터 특성
- 비평에서 발견된 과적합/편향 신호

### 저장 규칙
- **5줄 이내**, 구체적 수치 포함
- 중복 저장 금지 (저장 전 `memory_read`로 확인)
- 토픽 이름: `strategy_patterns`, `market_observations`, `critic_findings`
