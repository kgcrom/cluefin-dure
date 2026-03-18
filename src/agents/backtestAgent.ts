import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { getToolsForAgent } from '../rpc/agent-tools.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { BacktestResult, StrategyDefinition } from '../schemas/backtest.js';
import { getMemoryTools } from '../tools/memoryTools.js';
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
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<BacktestResult> {
  const prompt = await loadPrompt('backtest');
  const label = buildSessionLabel('backtest', input.strategy.name);

  const rpcTools = await getToolsForAgent('backtest');
  const session = await createPiSession({
    agentName: 'backtest',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [...rpcTools, ...getMemoryTools('backtest')],
    useCodeTools: true,
    eventRecorder: recorder,
    onUpdate,
  });

  const userMessage = [
    `전략: ${JSON.stringify(input.strategy, null, 2)}`,
    `대상 종목: ${input.tickers.join(', ')}`,
    `기간: ${input.startDate ?? '2020-01-01'} ~ ${input.endDate ?? '2025-01-01'}`,
    '',
    '사용 가능한 도구로 차트·기술적 분석 데이터를 조회한 후, Python 스크립트(uv shebang)를 작성·실행하여 백테스트를 수행하세요.',
    '결과를 JSON으로 반환하세요.',
  ].join('\n');

  await session.prompt(userMessage);
  const result = extractJsonFromMessage<BacktestResult>(session.state.messages);
  await store.put(runId, 'backtest', 'output', result);
  return result;
}
