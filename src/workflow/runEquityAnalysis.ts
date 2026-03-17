import { ArtifactStore } from "../runtime/artifactStore.js";
import { EventRecorder } from "../runtime/eventRecorder.js";
import { SessionPool } from "../runtime/sessionPool.js";
import { runUniverseAgent } from "../agents/universeAgent.js";
import { runFundamentalAgent } from "../agents/fundamentalAgent.js";
import { runNewsAgent } from "../agents/newsAgent.js";
import { runStrategyAgent } from "../agents/strategyAgent.js";
import { runBacktestAgent } from "../agents/backtestAgent.js";
import { runCriticAgent } from "../agents/criticAgent.js";
import type { FundamentalAnalysis, NewsAnalysis } from "../schemas/analysis.js";
import type { CriticReport } from "../schemas/backtest.js";

export interface EquityAnalysisOptions {
  ticker?: string;
  market?: string;
  style?: string;
  filterRules?: string;
}

export interface EquityAnalysisResult {
  runId: string;
  tickers: string[];
  fundamentals: FundamentalAnalysis[];
  newsAnalyses: NewsAnalysis[];
  criticReport: CriticReport;
}

export async function runEquityAnalysis(options: EquityAnalysisOptions): Promise<EquityAnalysisResult> {
  const runId = `equity-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const pool = new SessionPool(3);

  console.log(`\n[run] 종목 분석 시작: ${runId}`);

  // 1. 유니버스 구성 (또는 단일 종목)
  let tickers: string[];
  if (options.ticker) {
    tickers = [options.ticker];
    console.log(`[run] 단일 종목 분석: ${options.ticker}`);
  } else {
    console.log("[run] 유니버스 구성 중...");
    const universe = await runUniverseAgent(runId, {
      market: options.market,
      style: options.style,
      filterRules: options.filterRules,
    }, store, recorder);
    tickers = universe.tickers.map((t) => t.ticker);
    console.log(`[run] 유니버스: ${tickers.join(", ")}`);
  }

  // 2. 각 종목 병렬 분석 (fundamental + news)
  console.log("[run] 펀더멘털 + 뉴스 병렬 분석 중...");
  const analysisResults = await Promise.all(
    tickers.map((ticker) =>
      pool.acquire(async () => {
        const [fundamental, news] = await Promise.all([
          runFundamentalAgent(runId, { ticker }, store, recorder),
          runNewsAgent(runId, { ticker }, store, recorder),
        ]);
        return { fundamental, news };
      })
    )
  );

  const fundamentals = analysisResults.map((r) => r.fundamental);
  const newsAnalyses = analysisResults.map((r) => r.news);

  // 3. 전략 설계
  console.log("[run] 전략 설계 중...");
  const strategy = await runStrategyAgent(runId, {
    theme: `${tickers.join(",")} 기반 투자전략`,
    fundamentals,
    newsAnalyses,
  }, store, recorder);

  // 4. 백테스트
  console.log("[run] 백테스트 실행 중...");
  const backtestResult = await runBacktestAgent(runId, {
    strategy,
    tickers,
  }, store, recorder);

  // 5. Critic 검토
  console.log("[run] Critic 검토 중...");
  const criticReport = await runCriticAgent(runId, {
    strategy,
    backtestResult,
    additionalArtifacts: {
      fundamentals,
      newsAnalyses,
    },
  }, store, recorder);

  // 6. 이벤트 로그 저장
  await recorder.persist(runId, "data/runs");
  recorder.dispose();

  console.log(`\n[run] 분석 완료: ${runId}`);
  console.log(`[run] Critic 판정: ${criticReport.verdict}`);

  return { runId, tickers, fundamentals, newsAnalyses, criticReport };
}
