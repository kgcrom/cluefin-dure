import type { FundamentalAnalysis, NewsAnalysis } from '../../src/schemas/analysis.js';
import type { BacktestResult, CriticReport, StrategyDefinition } from '../../src/schemas/backtest.js';
import type { ScenarioDefinition, ScenarioProjection, ScenarioReport } from '../../src/schemas/scenario.js';
import type { ExperimentRecord } from '../../src/schemas/signal.js';

export const fundamentals: FundamentalAnalysis[] = [
  {
    ticker: 'AAPL',
    metrics: { revenue: 394000000000, operatingMargin: 0.302, netMargin: 0.253, PE: 28.5, PB: 47.2, ROE: 1.71, debtToEquity: 1.76 },
    growthTrend: '안정적 성장',
    quarterlyChanges: '전분기 대비 매출 3% 증가',
    redFlags: ['높은 PB 비율'],
    memo: '견고한 펀더멘털',
  },
  {
    ticker: 'MSFT',
    metrics: { revenue: 211000000000, operatingMargin: 0.422, netMargin: 0.361, PE: 35.1, PB: 12.8, ROE: 0.389, debtToEquity: 0.42 },
    growthTrend: '클라우드 주도 성장',
    quarterlyChanges: 'Azure 매출 29% 성장',
    redFlags: [],
    memo: '클라우드 성장 지속',
  },
];

export const newsAnalyses: NewsAnalysis[] = [
  {
    ticker: 'AAPL',
    eventTimeline: [
      { date: '2025-03-15', headline: 'Apple Vision Pro 2세대 발표', impact: '긍정적' },
      { date: '2025-03-10', headline: 'EU 디지털 규제 강화', impact: '부정적' },
    ],
    sentimentSummary: '전반적 긍정',
    catalysts: ['AI 기능 통합', '인도 시장 확대'],
    risks: ['중국 시장 둔화', '규제 리스크'],
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
  affectedTickers: ['NVDA', 'AMD', 'TSM'],
  timeHorizon: '6개월',
  assumptions: ['인플레이션 안정', '고용 지표 급격 악화'],
};

export const scenarioProjections: ScenarioProjection[] = [
  {
    ticker: 'NVDA',
    fundamentalImpact: {
      direction: 'positive',
      magnitude: 'high',
      rationale: '성장주에 유리한 저금리 환경',
      affectedMetrics: ['PE', 'Revenue Growth'],
    },
    newsContext: { expectedSentiment: 'bullish', likelyCatalysts: ['AI 투자 확대'] },
  },
  {
    ticker: 'AMD',
    fundamentalImpact: {
      direction: 'positive',
      magnitude: 'medium',
      rationale: '반도체 수요 회복 기대',
      affectedMetrics: ['Revenue', 'Margin'],
    },
    newsContext: { expectedSentiment: 'bullish', likelyCatalysts: ['데이터센터 수주'] },
  },
];

export const scenarioReport: ScenarioReport = {
  scenarioName: '연준 긴급 금리 인하',
  projections: scenarioProjections,
  overallAssessment: '반도체 섹터 전반적으로 긍정적 영향 예상. 특히 AI 관련 기업 수혜 전망.',
  confidence: 'medium',
  keyRisks: ['인플레이션 재발', '지정학적 리스크'],
  recommendations: ['NVDA 비중 확대', 'AMD 분할 매수'],
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

export const backtestResult: BacktestResult = {
  cagr: 0.142,
  mdd: -0.187,
  sharpe: 1.23,
  turnover: 0.45,
  tradeLog: [
    { date: '2024-01-15', ticker: 'AAPL', action: 'BUY', price: 185.5, quantity: 100 },
    { date: '2024-03-20', ticker: 'AAPL', action: 'SELL', price: 195.2, quantity: 100 },
    { date: '2024-04-01', ticker: 'MSFT', action: 'BUY', price: 420.0, quantity: 50 },
  ],
  runArtifactPath: 'data/runs/test-run/backtest',
  errorLog: [],
};

export const experimentRecord: ExperimentRecord = {
  id: 'test-run-iter-0',
  strategyId: '저PER 고ROE',
  params: { lookback: 252 },
  result: backtestResult,
  criticVerdict: 'keep',
  timestamp: '2025-03-15T10:00:00Z',
};
