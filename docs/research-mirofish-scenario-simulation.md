# MiroFish 리서치 및 Dure What-If 시나리오 시뮬레이션 적용 방안

> 작성일: 2026-03-18
> 대상: MiroFish (github.com/666ghj/MiroFish)

---

## 1. 요약

**핵심 인사이트**: 과거/현재 재무정보 조회는 월가에서 가치가 가장 낮다. Bloomberg Terminal이 이미 해결한 영역이다. 진짜 가치는 "What if X happens?"에 대한 구조화된 전방 추론(forward reasoning)에 있다.

MiroFish는 GraphRAG + 대규모 에이전트 소셜 시뮬레이션(OASIS 엔진, 최대 100만 에이전트)으로 시장/여론을 예측하는 오픈소스 엔진이다. 기술적으로 흥미롭지만, 금융 실무 관점에서 대부분의 핵심 기능(MBTI 페르소나, 군중 시뮬레이션)은 검증 불가능한 노이즈 생성기에 가깝다.

**Dure에 적용할 단 하나의 기능**: What-If 변수 주입 시나리오 시뮬레이션. 사용자가 가설("연준이 50bp 긴급 인하", "삼성전자 HBM 수율 30% 하락")을 던지면, 기존 Fundamental/News/Strategy/Critic 에이전트가 해당 시나리오 하에서 분석을 수행하는 워크플로우.

---

## 2. MiroFish 핵심 개념 분석

### 5단계 워크플로우

| 단계 | 설명 |
|------|------|
| 1. Graph Building | 시드 자료(뉴스, 보고서, 정책문서) → GraphRAG로 엔티티/관계 추출 → 지식 그래프 구축 |
| 2. Environment Setup | 지식 그래프 기반으로 에이전트 프로필 생성 (MBTI, 생애 경험, 행동 패턴, 소셜 관계) |
| 3. Simulation | OASIS 프레임워크로 Twitter/Reddit 듀얼 플랫폼 병렬 시뮬레이션. 에이전트 간 자유 상호작용 (토론, 설득, 군집 형성). 시뮬레이션 중 변수 주입 가능 |
| 4. Report Generation | ReportAgent가 시뮬레이션 결과를 인터랙티브 분석 리포트로 합성 |
| 5. Deep Interaction | 개별 에이전트와 대화하거나 ReportAgent에 후속 질문 |

### 기술 요소별 월가 실용성 평가

| 기술 요소 | 실용성 | 평가 근거 |
|-----------|--------|-----------|
| 대규모 에이전트 소셜 시뮬레이션 | **낮음** | LLM 에이전트는 실제 인간보다 군집 행동에 취약하고, 더 빠르게 극단으로 수렴한다. 시뮬레이션 결과의 재현성이 없다(동일 입력 → 상이한 출력). 검증된 벤치마크가 부재하다. |
| MBTI 페르소나 | **낮음** | MBTI 자체가 심리학에서 신뢰성 논란이 있는 분류 체계. 투자 의사결정 모델링에 MBTI를 쓰는 것은 근거가 부족하다. |
| GraphRAG (지식 그래프 구축) | **중간** | 유용하지만, Dure의 Fundamental/News 에이전트가 이미 cluefin CLI 기반 데이터 브로커를 통해 구조화된 재무/뉴스 데이터에 접근한다. 중복 투자 대비 한계 효용이 낮다. |
| **What-If 변수 주입 시뮬레이션** | **높음** | 핵심 차용 대상. "What happened" → "What if X"로의 전환. 기존 에이전트 파이프라인에 시나리오 컨텍스트만 추가하면 구현 가능. |
| 리포트 합성 | **중간** | Dure에 이미 Critic 에이전트의 종합 판단 체계가 있다. 시나리오 리포트로 확장 가능. |

---

## 3. 타겟 사용자별 니즈 분석

### 퀀트 트레이더
- **필요**: 알파 시그널, 엣지, 정량화된 확률
- **불필요**: 군중 시뮬레이션 (노이즈와 시그널 구분 불가)
- **시나리오 활용**: "금리 50bp 인상 시 momentum factor 성과 변화" → Strategy/Backtest 에이전트가 시나리오 하에서 전략 재평가

### 펀더멘털 애널리스트
- **필요**: "What happened" → "What if X" 전환
- **불필요**: 과거 데이터 조회 (이미 Bloomberg에 있다)
- **시나리오 활용**: "삼성전자 HBM 수율 30% 하락 시 영업이익 영향" → Fundamental 에이전트가 시나리오 가정 하에서 재무제표 재추정

### 포트폴리오 매니저
- **필요**: 다중 시나리오 스트레스 테스트, 테일 리스크 평가
- **불필요**: 개별 에이전트와의 대화 (시간 낭비)
- **시나리오 활용**: "미중 관세 확대 + 엔화 약세" 복합 시나리오 → 포트폴리오 전체에 대한 영향 분석

---

## 4. 핵심 제안: What-If 시나리오 시뮬레이션 워크플로우

### 4.1 ScenarioAgent 신규 추가

사용자의 자연어 시나리오를 구조화된 변수 세트로 분해하는 전문 에이전트.

```
사용자: "연준이 다음 FOMC에서 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"

ScenarioAgent 출력:
{
  "name": "Fed 50bp Emergency Cut",
  "variables": [
    { "name": "fedFundsRate", "baseline": 4.50, "scenario": 4.00, "unit": "%" },
    { "name": "usd10yYield", "baseline": 4.20, "scenario": 3.60, "unit": "%" }
  ],
  "affectedSectors": ["semiconductor", "tech"],
  "timeHorizon": "3M",
  "assumptions": ["시장이 인하를 사전에 선반영하지 않았다고 가정"]
}
```

### 4.2 기존 에이전트에 `scenarioContext` 파라미터 추가

기존 에이전트 Input 인터페이스에 optional `scenarioContext`를 추가한다. 시나리오가 주어지면, 에이전트는 해당 가정 하에서 분석을 수행한다. 시나리오가 없으면 기존과 동일하게 동작한다.

```typescript
// 기존 FundamentalInput에 추가
export interface FundamentalInput {
  ticker: string;
  market: string;
  scenarioContext?: ScenarioDefinition;  // optional
}
```

### 4.3 워크플로우 설계

```
사용자 시나리오 입력 (자연어)
    │
    ▼
ScenarioAgent (시나리오 구조화)
    │
    ▼
┌───────────────────────────────────────┐
│  scenarioContext 주입                  │
├───────────┬───────────┬───────────────┤
│Fundamental│   News    │   Strategy    │
│ (시나리오  │ (시나리오  │ (시나리오     │
│  하 재추정)│  하 영향)  │  하 전략평가) │
└─────┬─────┴─────┬─────┴───────┬───────┘
      │           │             │
      ▼           ▼             ▼
   Critic (시나리오 분석 종합 + 리스크 평가)
      │
      ▼
   ScenarioReport (최종 리포트)
```

**기존 Equity Analysis와의 차이**: Universe 단계를 건너뛰고(타겟이 이미 특정됨), 모든 에이전트가 `scenarioContext`를 참조하여 "현재 상태"가 아닌 "시나리오 하 상태"를 분석한다.

### 4.4 스키마 정의

```typescript
// src/schemas/scenario.ts

import { type Static, Type } from '@sinclair/typebox';

export const ScenarioVariableSchema = Type.Object({
  name: Type.String(),
  baseline: Type.Union([Type.Number(), Type.String()]),
  scenario: Type.Union([Type.Number(), Type.String()]),
  unit: Type.String(),
});

export const ScenarioDefinitionSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  variables: Type.Array(ScenarioVariableSchema),
  affectedSectors: Type.Array(Type.String()),
  affectedTickers: Type.Array(Type.String()),
  timeHorizon: Type.String(),
  assumptions: Type.Array(Type.String()),
});
export type ScenarioDefinition = Static<typeof ScenarioDefinitionSchema>;

export const ScenarioProjectionSchema = Type.Object({
  ticker: Type.String(),
  scenarioName: Type.String(),
  fundamentalImpact: Type.Object({
    revenueChange: Type.String(),
    marginChange: Type.String(),
    valuationChange: Type.String(),
    rationale: Type.String(),
  }),
  newsContext: Type.Object({
    likelyCatalysts: Type.Array(Type.String()),
    sentimentShift: Type.String(),
  }),
  strategyImplication: Type.Object({
    signalChange: Type.String(),
    positionAdjustment: Type.String(),
  }),
});
export type ScenarioProjection = Static<typeof ScenarioProjectionSchema>;

export const ScenarioReportSchema = Type.Object({
  scenarioName: Type.String(),
  projections: Type.Array(ScenarioProjectionSchema),
  overallAssessment: Type.String(),
  confidenceLevel: Type.Union([
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
  ]),
  keyRisks: Type.Array(Type.String()),
  recommendations: Type.Array(Type.String()),
});
export type ScenarioReport = Static<typeof ScenarioReportSchema>;
```

### 4.5 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `src/schemas/scenario.ts` | 신규 | ScenarioDefinition, ScenarioProjection, ScenarioReport 스키마 |
| `src/agents/scenarioAgent.ts` | 신규 | 자연어 → 구조화된 시나리오 변환 에이전트 |
| `research/prompts/scenario.md` | 신규 | ScenarioAgent 시스템 프롬프트 |
| `src/agents/fundamentalAgent.ts` | 수정 | FundamentalInput에 `scenarioContext?` 추가 |
| `src/agents/newsAgent.ts` | 수정 | NewsInput에 `scenarioContext?` 추가 |
| `src/agents/strategyAgent.ts` | 수정 | StrategyInput에 `scenarioContext?` 추가 |
| `src/agents/criticAgent.ts` | 수정 | CriticInput에 `scenarioContext?` 추가 |
| `src/workflow/runScenarioAnalysis.ts` | 신규 | 시나리오 분석 워크플로우 오케스트레이션 |
| `src/tools/workflowTools.ts` | 수정 | `run_scenario_analysis` 도구 등록 |
| `src/main.ts` | 수정 | `scenario` CLI 커맨드 추가 |

---

## 5. 대규모 에이전트 시뮬레이션 불채택 근거

MiroFish의 핵심 차별점인 OASIS 기반 대규모 소셜 시뮬레이션을 Dure에 채택하지 않는 이유:

### LLM 군집 행동 문제
LLM 에이전트는 실제 인간보다 군집 행동(herding)에 훨씬 취약하다. 동일한 학습 데이터에서 파생된 에이전트들은 독립적으로 사고한다는 환상 속에서 실제로는 동일한 편향을 공유한다. 시뮬레이션된 군중은 실제 군중보다 더 빠르게 극단으로 수렴하며, 이는 진짜 시장 역학과 괴리된다.

### 시그널 vs 노이즈
100만 에이전트의 "의견"을 집계해도, 그 의견의 근거가 모두 같은 LLM 가중치에서 나온다. 독립적 정보원의 합의와 동일 모델의 N번 샘플링은 근본적으로 다르다. 전자는 시그널이고, 후자는 노이즈다.

### API 비용
에이전트당 LLM 호출이 필요하므로, 1,000 에이전트 × 100 라운드 = 10만 API 호출. 단일 시나리오 분석에 수백 달러가 소요될 수 있다. 비용 대비 정보 가치(information ratio)가 극히 낮다.

### 검증 불가능성
동일 입력에 대해 재현 가능한 출력이 보장되지 않는다. 검증이 불가능한 예측 시스템은 금융에서 사용할 수 없다.

### Dure 철학과의 불일치
Dure는 소수 정예 전문가 에이전트(Fundamental, News, Strategy, Backtest, Critic)가 구조화된 파이프라인에서 협업하는 아키텍처다. 각 에이전트는 명확한 역할과 검증 가능한 출력 스키마를 가진다. 이는 MiroFish의 "수천 에이전트가 자유롭게 상호작용" 모델과 정반대의 설계 철학이다.

---

## 6. 커뮤니티 반응 및 리스크

### MiroFish 프로젝트 현황
- **GitHub**: 33.7k+ stars, 2026년 3월 7일 GitHub Global Trending 1위
- **투자**: 천교(陈天桥, Shanda Group 창업자)로부터 3,000만 위안(~$4.1M) 인큐베이션 투자
- **개발자**: 궈항장(郭杭江), 베이징우편전신대학 4학년. 10일 만에 "바이브 코딩"으로 개발
- **이전 프로젝트**: BettaFish(감성 분석 도구, 20k stars)
- **검증된 벤치마크**: **부재**. 실제 예측 정확도를 검증한 공개 데이터 없음

### 커뮤니티 평가
- **긍정**: GitHub 트렌딩 1위, OpenAI/Google/Microsoft 프로젝트를 제침. 기술 커뮤니티에서 광범위한 관심
- **부정**: 스타 수와 미디어 커버리지가 실증된 예측 정확도를 크게 앞섬. "compelling illustration, not evidence of predictive accuracy"

### 시나리오 접근법 자체의 한계와 리스크

| 리스크 | 설명 | 완화 방안 |
|--------|------|-----------|
| LLM 수치 추론 한계 | LLM은 정밀한 수치 계산에 약하다. "매출 15% 감소 → 영업이익 X" 계산이 부정확할 수 있다 | ScenarioAgent가 정성적 방향성에 집중하도록 프롬프트 설계. 정량 추정은 범위(range)로 제시 |
| 과신(overconfidence) 위험 | 구조화된 리포트가 높은 확신을 가진 것처럼 보이지만, 근본적으로 LLM 추론의 한계를 가진다 | confidenceLevel 필드 필수화. 모든 리포트에 "이 분석은 LLM 기반 추론이며 투자 조언이 아님" 면책 포함 |
| 프롬프트 난이도 | 시나리오를 에이전트 컨텍스트에 효과적으로 주입하는 프롬프트 엔지니어링이 까다롭다 | ScenarioAgent가 변수를 명확히 구조화하여 다운스트림 에이전트의 해석 부담을 줄임 |
| 출력 일관성 | 동일 시나리오에 대해 실행할 때마다 다른 결론이 나올 수 있다 | temperature 낮춤 + 구조화된 스키마로 출력 형식 고정 |
| API 비용 | Fundamental + News + Strategy + Critic 4개 에이전트 병렬 호출 | 기존 Equity Analysis와 동일한 비용 구조. MiroFish의 10만 호출 대비 4-5회 호출로 효율적 |

---

## 7. 구현 로드맵

### Phase 1: ScenarioAgent + 스키마 (1주)
- `src/schemas/scenario.ts` 스키마 정의
- `src/agents/scenarioAgent.ts` 에이전트 구현
- `research/prompts/scenario.md` 시스템 프롬프트 작성
- ScenarioAgent 단위 테스트

### Phase 2: 기존 에이전트 시나리오 컨텍스트 확장 (1주)
- Fundamental/News/Strategy/Critic Input 인터페이스에 `scenarioContext?` 추가
- 각 에이전트 프롬프트에 시나리오 모드 지시사항 추가
- 시나리오 유무에 따른 분기 동작 검증

### Phase 3: 워크플로우 + CLI (3일)
- `src/workflow/runScenarioAnalysis.ts` 워크플로우 오케스트레이션
- `src/tools/workflowTools.ts`에 `run_scenario_analysis` 등록
- `src/main.ts`에 `scenario` 커맨드 추가
- Router 프롬프트에 시나리오 분석 라우팅 규칙 추가

### Phase 4: 검증 및 개선 (지속)
- 실제 시나리오로 end-to-end 테스트 (금리 변동, 실적 서프라이즈, 지정학 이벤트)
- 출력 일관성 측정 (동일 시나리오 10회 실행 → 결론 분산도)
- 사용자 피드백 기반 프롬프트 개선
- 복합 시나리오 지원 (다중 변수 동시 변경)

---

## 8. 결론

### 차용할 것
- **What-If 시나리오 변수 주입**: 사용자가 가설을 던지면 기존 에이전트가 해당 시나리오 하에서 분석을 수행하는 전방 추론 워크플로우
- **구조화된 시나리오 분해**: 자연어 시나리오를 변수, 가정, 영향 범위로 분해하는 ScenarioAgent

### 버릴 것
- **대규모 소셜 시뮬레이션**: 검증 불가능한 노이즈 생성기. LLM 군집 행동은 실제 시장과 괴리
- **MBTI 페르소나**: 금융 의사결정 모델링에 근거 부족
- **OASIS 엔진**: 에이전트 수를 늘려도 정보 가치가 비례 증가하지 않음. 비용만 선형 증가

### Dure의 차별점
MiroFish가 "더 많은 에이전트 = 더 나은 예측"이라는 가설에 기반한다면, Dure는 "소수 정예 전문가의 구조화된 협업 = 검증 가능한 인사이트"라는 철학을 따른다. 시나리오 시뮬레이션은 이 철학의 자연스러운 확장이다: 에이전트를 늘리는 것이 아니라, 기존 에이전트에게 더 나은 질문을 던지는 것이다.
