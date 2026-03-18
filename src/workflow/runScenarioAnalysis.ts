import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runScenarioCriticAgent } from '../agents/criticAgent.js';
import { runFundamentalAgent } from '../agents/fundamentalAgent.js';
import { runNewsAgent } from '../agents/newsAgent.js';
import { runScenarioAgent } from '../agents/scenarioAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import { SessionPool } from '../runtime/sessionPool.js';
import type { FundamentalAnalysis, NewsAnalysis } from '../schemas/analysis.js';
import type { ScenarioDefinition, ScenarioReport } from '../schemas/scenario.js';

export interface ScenarioAnalysisOptions {
  scenario: string;
  tickers?: string[];
}

export interface ScenarioAnalysisResult {
  runId: string;
  definition: ScenarioDefinition;
  fundamentals: FundamentalAnalysis[];
  newsAnalyses: NewsAnalysis[];
  report: ScenarioReport;
}

export async function runScenarioAnalysis(
  options: ScenarioAnalysisOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<ScenarioAnalysisResult> {
  const runId = `scenario-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const pool = new SessionPool(3);
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] 시나리오 분석 시작: ${runId}`);

  // 1. ScenarioAgent — 자연어 → 구조화
  emit('[run] 시나리오 구조화 중...');
  const definition = await runScenarioAgent(
    runId,
    { scenario: options.scenario, tickers: options.tickers },
    store,
    recorder,
    onUpdate,
  );

  const tickers = options.tickers ?? definition.affectedTickers;
  emit(`[run] 분석 대상 종목: ${tickers.join(', ')}`);

  // 2. 종목별 병렬 분석 (fundamental + news, scenarioContext 주입)
  emit('[run] 시나리오 컨텍스트 기반 펀더멘털 + 뉴스 병렬 분석 중...');
  const settledResults = await Promise.allSettled(
    tickers.map((ticker) =>
      pool.acquire(async () => {
        const [fundamental, news] = await Promise.all([
          runFundamentalAgent(
            runId,
            { ticker, scenarioContext: definition },
            store,
            recorder,
            onUpdate,
          ),
          runNewsAgent(
            runId,
            { ticker, scenarioContext: definition },
            store,
            recorder,
            onUpdate,
          ),
        ]);
        return { ticker, fundamental, news };
      }),
    ),
  );

  const succeeded = settledResults
    .filter(
      (r): r is PromiseFulfilledResult<{ ticker: string; fundamental: FundamentalAnalysis; news: NewsAnalysis }> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value);

  for (let i = 0; i < settledResults.length; i++) {
    const r = settledResults[i];
    if (r.status === 'rejected') {
      emit(`[run] ⚠ ${tickers[i]} 분석 실패: ${r.reason?.message ?? r.reason}`);
    }
  }

  if (succeeded.length === 0) {
    throw new Error('모든 종목 분석이 실패했습니다.');
  }

  const fundamentals = succeeded.map((r) => r.fundamental);
  const newsAnalyses = succeeded.map((r) => r.news);

  // 3. Scenario Critic — 종합 평가
  emit('[run] 시나리오 종합 평가 중...');
  const report = await runScenarioCriticAgent(
    runId,
    {
      scenarioContext: definition,
      fundamentals,
      newsAnalyses,
    },
    store,
    recorder,
    onUpdate,
  );

  // 4. 이벤트 로그 저장
  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  emit(`\n[run] 시나리오 분석 완료: ${runId}`);
  emit(`[run] 신뢰도: ${report.confidence}`);

  return { runId, definition, fundamentals, newsAnalyses, report };
}
