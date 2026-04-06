import type { FundamentalAnalysis, NewsAnalysis } from '../../src/schemas/analysis.js';
import type { ScenarioDefinition, ScenarioProjection, ScenarioReport } from '../../src/schemas/scenario.js';
import type { ExperimentRecord } from '../../src/schemas/signal.js';
import type { CriticReport, StrategyDefinition } from '../../src/schemas/strategy.js';

export const fundamentals: FundamentalAnalysis[] = [
  {
    ticker: '005930',
    metrics: {
      revenue: 302200000000,
      operatingMargin: 0.124,
      netMargin: 0.103,
      PE: 16.4,
      PB: 1.3,
      ROE: 0.094,
      debtToEquity: 0.28,
    },
    growthTrend: '메모리 업황 회복',
    quarterlyChanges: '전분기 대비 영업이익 12% 증가',
    redFlags: ['메모리 가격 변동성'],
    memo: '반도체 업황 회복 수혜',
  },
  {
    ticker: '000660',
    metrics: {
      revenue: 32700000000,
      operatingMargin: 0.211,
      netMargin: 0.163,
      PE: 14.8,
      PB: 2.1,
      ROE: 0.151,
      debtToEquity: 0.36,
    },
    growthTrend: 'HBM 수요 중심 성장',
    quarterlyChanges: '전분기 대비 D램 ASP 9% 상승',
    redFlags: ['고객사 CAPEX 둔화 가능성'],
    memo: 'AI 메모리 수요 확대',
  },
];

export const newsAnalyses: NewsAnalysis[] = [
  {
    ticker: '005930',
    eventTimeline: [
      { date: '2025-03-15', headline: '삼성전자 HBM 공급 확대 기대', impact: '긍정적' },
      { date: '2025-03-10', headline: '스마트폰 출하량 둔화 우려', impact: '부정적' },
    ],
    sentimentSummary: '전반적 긍정',
    catalysts: ['HBM 수요 확대', '주주환원 강화'],
    risks: ['메모리 가격 조정', '세트 수요 둔화'],
  },
];

export const criticReport: CriticReport = {
  overfittingRisk: '낮음 - 충분한 표본 기간',
  dataLeakageCheck: '미래 데이터 사용 없음',
  survivorshipBias: '유니버스 고정으로 편향 제한적',
  regimeDependency: '금리 상승기에 성과 저하 가능',
  verdict: 'keep',
  recommendations: ['리밸런싱 주기 조정 고려', '소형주 비중 확대 검토'],
};

export const scenarioDefinition: ScenarioDefinition = {
  name: '연준 긴급 금리 인하',
  description: '연준이 50bp 긴급 인하할 경우의 시나리오',
  variables: [
    { name: '기준금리', baseline: '5.25%', scenario: '4.75%', direction: 'down' },
    { name: '달러 인덱스', baseline: '104', scenario: '100', direction: 'down' },
  ],
  affectedTickers: ['005930', '000660', '042700'],
  timeHorizon: '6개월',
  assumptions: ['인플레이션 안정', '고용 지표 급격 악화'],
};

export const scenarioProjections: ScenarioProjection[] = [
  {
    ticker: '005930',
    fundamentalImpact: {
      direction: 'positive',
      magnitude: 'high',
      rationale: '대형 반도체주 밸류에이션 부담 완화',
      affectedMetrics: ['PER', 'Revenue Growth'],
    },
    newsContext: { expectedSentiment: 'bullish', likelyCatalysts: ['HBM 수요 확대'] },
  },
  {
    ticker: '000660',
    fundamentalImpact: {
      direction: 'positive',
      magnitude: 'medium',
      rationale: '메모리 업황 회복 기대',
      affectedMetrics: ['Revenue', 'Margin'],
    },
    newsContext: { expectedSentiment: 'bullish', likelyCatalysts: ['서버향 메모리 수요'] },
  },
];

export const scenarioReport: ScenarioReport = {
  scenarioName: '연준 긴급 금리 인하',
  projections: scenarioProjections,
  overallAssessment: '국내 반도체 섹터 전반적으로 긍정적 영향 예상.',
  confidence: 'medium',
  keyRisks: ['인플레이션 재발', '지정학적 리스크'],
  recommendations: ['005930 비중 확대', '000660 분할 매수'],
  disclaimer: '본 분석은 투자 조언이 아닙니다.',
};

export const strategy: StrategyDefinition = {
  name: '저PER 고ROE 퀄리티 밸류',
  hypothesis: '저평가 고수익 기업이 장기적으로 시장 수익률을 상회',
  entryRules: ['PE < 15', 'ROE > 15%', '부채비율 < 100%'],
  exitRules: ['PE > 25', 'ROE < 10%'],
  positionSizing: '균등 배분',
  rebalancePeriod: '분기',
  config: { lookback: 252, topN: 10 },
};

export const experimentRecord: ExperimentRecord = {
  id: 'test-run-iter-0',
  strategyId: '저PER 고ROE',
  params: { lookback: 252 },
  result: {
    note: 'critic 중심 전략 실험 결과',
    score: 0.82,
  },
  criticVerdict: 'keep',
  timestamp: '2025-03-15T10:00:00Z',
};
