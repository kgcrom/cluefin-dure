import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runStrategyAgent } from '../agents/strategyAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import type { StrategyDefinition } from '../schemas/strategy.js';

export interface StrategyDraftOptions {
  theme: string;
  tickers?: string[];
}

export interface StrategyDraftResult {
  runId: string;
  strategy: StrategyDefinition;
}

export async function runStrategyDraft(
  options: StrategyDraftOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<StrategyDraftResult> {
  const runId = `strategy-draft-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] 전략 초안 생성 시작: ${runId}`);

  const theme = options.tickers?.length
    ? `${options.theme}\n대상 종목: ${options.tickers.join(', ')}`
    : options.theme;

  emit('[run] 전략 설계 중...');
  const strategy = await runStrategyAgent(runId, { theme }, store, recorder, onUpdate);

  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  emit(`\n[run] 전략 초안 생성 완료: ${runId}`);

  return { runId, strategy };
}
