import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runFundamentalAgent } from '../agents/fundamentalAgent.js';
import { runUniverseAgent } from '../agents/universeAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import { SessionPool } from '../runtime/sessionPool.js';
import type { FundamentalAnalysis } from '../schemas/analysis.js';

export interface ScreeningOptions {
  market?: string;
  style?: string;
  filterRules?: string;
  topN?: number;
}

export interface ScreeningResult {
  runId: string;
  rankings: FundamentalAnalysis[];
}

export async function runScreening(
  options: ScreeningOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<ScreeningResult> {
  const runId = `screen-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const pool = new SessionPool(3);
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] 스크리닝 시작: ${runId}`);

  // 1. 유니버스 구성
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

  const topN = options.topN ?? 5;
  const tickers = universe.tickers.slice(0, topN).map((t) => t.ticker);
  emit(`[run] 상위 ${topN}개 종목 분석: ${tickers.join(', ')}`);

  // 2. 병렬 펀더멘털 분석
  const rankings = await Promise.all(
    tickers.map((ticker) =>
      pool.acquire(() => runFundamentalAgent(runId, { ticker }, store, recorder, onUpdate)),
    ),
  );

  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  emit(`\n[run] 스크리닝 완료: ${runId}`);
  return { runId, rankings };
}
