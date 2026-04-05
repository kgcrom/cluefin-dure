import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runFundamentalAgent } from '../agents/fundamentalAgent.js';
import { runNewsAgent } from '../agents/newsAgent.js';
import { runStrategyAgent } from '../agents/strategyAgent.js';
import { runUniverseAgent } from '../agents/universeAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import { SessionPool } from '../runtime/sessionPool.js';
import type { FundamentalAnalysis, NewsAnalysis } from '../schemas/analysis.js';
import type { StrategyDefinition } from '../schemas/backtest.js';

export interface EquityAnalysisChatOptions {
  ticker?: string;
  market?: string;
  style?: string;
  filterRules?: string;
}

export interface EquityAnalysisChatResult {
  runId: string;
  tickers: string[];
  fundamentals: FundamentalAnalysis[];
  newsAnalyses: NewsAnalysis[];
  strategy: StrategyDefinition;
}

export async function runEquityAnalysisChat(
  options: EquityAnalysisChatOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<EquityAnalysisChatResult> {
  const runId = `equity-chat-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const pool = new SessionPool(3);
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] 대화형 종목 분석 시작: ${runId}`);

  let tickers: string[];
  if (options.ticker) {
    tickers = [options.ticker];
    emit(`[run] 단일 종목 분석: ${options.ticker}`);
  } else {
    emit('[run] 유니버스 구성 중...');
    const universe = await runUniverseAgent(
      runId,
      {
        market: options.market,
        style: options.style,
        filterRules: options.filterRules,
      },
      store,
      recorder,
      onUpdate,
    );
    tickers = universe.tickers.map((t) => t.ticker);
    emit(`[run] 유니버스: ${tickers.join(', ')}`);
  }

  emit('[run] 펀더멘털 + 뉴스 병렬 분석 중...');
  const analysisResults = await Promise.all(
    tickers.map((ticker) =>
      pool.acquire(async () => {
        const [fundamental, news] = await Promise.all([
          runFundamentalAgent(runId, { ticker }, store, recorder, onUpdate),
          runNewsAgent(runId, { ticker }, store, recorder, onUpdate),
        ]);
        return { fundamental, news };
      }),
    ),
  );

  const fundamentals = analysisResults.map((r) => r.fundamental);
  const newsAnalyses = analysisResults.map((r) => r.news);

  emit('[run] 전략 초안 생성 중...');
  const strategy = await runStrategyAgent(
    runId,
    {
      theme: `${tickers.join(',')} 기반 투자전략`,
      fundamentals,
      newsAnalyses,
    },
    store,
    recorder,
    onUpdate,
  );

  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  emit(`\n[run] 대화형 종목 분석 완료: ${runId}`);

  return { runId, tickers, fundamentals, newsAnalyses, strategy };
}
