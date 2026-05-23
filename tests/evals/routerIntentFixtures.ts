export interface RouterIntentFixture {
  id: string;
  utterance: string;
  expectedTool: string;
  expectedParamKeys: string[];
}

export const routerIntentFixtures: RouterIntentFixture[] = [
  {
    id: 'equity-ticker',
    utterance: '005930 펀더멘탈과 뉴스까지 종합 분석해줘',
    expectedTool: 'run_equity_analysis',
    expectedParamKeys: ['ticker'],
  },
  {
    id: 'screen-quality',
    utterance: '한국 시장에서 퀄리티 스타일 상위 종목을 스크리닝해줘',
    expectedTool: 'run_screening',
    expectedParamKeys: ['market', 'style'],
  },
  {
    id: 'strategy-theme',
    utterance: '저PER 고ROE 퀄리티 밸류 전략 초안을 만들어줘',
    expectedTool: 'run_strategy_research',
    expectedParamKeys: ['theme'],
  },
  {
    id: 'scenario-rate-cut',
    utterance: '연준이 50bp 긴급 인하하면 반도체 섹터 영향이 어떻게 될까?',
    expectedTool: 'run_scenario_analysis',
    expectedParamKeys: ['scenario'],
  },
  {
    id: 'review-existing-run',
    utterance: 'equity-1712345678901 결과를 체크리스트로 리뷰해줘',
    expectedTool: 'run_review_checklist',
    expectedParamKeys: ['runId'],
  },
];
