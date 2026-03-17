import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { BacktestResult, StrategyDefinition } from '../schemas/backtest.js';
import { backtestTool } from '../tools/backtestTool.js';
import { marketDataTool } from '../tools/marketDataTool.js';
import { buildSessionLabel, extractJsonFromMessage, loadPrompt } from './_utils.js';

export interface BacktestInput {
  strategy: StrategyDefinition;
  tickers: string[];
  startDate?: string;
  endDate?: string;
}

export async function runBacktestAgent(
  runId: string,
  input: BacktestInput,
  store: ArtifactStore,
  recorder: EventRecorder,
): Promise<BacktestResult> {
  const prompt = await loadPrompt('backtest');
  const label = buildSessionLabel('backtest', input.strategy.name);

  const session = await createPiSession({
    agentName: 'backtest',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [backtestTool, marketDataTool] as unknown as ToolDefinition[],
    eventRecorder: recorder,
  });

  const userMessage = [
    `전략: ${JSON.stringify(input.strategy, null, 2)}`,
    `대상 종목: ${input.tickers.join(', ')}`,
    `기간: ${input.startDate ?? '2020-01-01'} ~ ${input.endDate ?? '2025-01-01'}`,
    '',
    'run_backtest 도구를 사용하여 백테스트를 실행하고, 결과를 분석하세요.',
    '결과를 JSON으로 반환하세요.',
  ].join('\n');

  await session.prompt(userMessage);
  const result = extractJsonFromMessage<BacktestResult>(session.state.messages);
  await store.put(runId, 'backtest', 'output', result);
  return result;
}
