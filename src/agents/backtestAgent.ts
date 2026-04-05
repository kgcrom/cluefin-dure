import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { getToolsForAgent } from '../rpc/agent-tools.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { BacktestResult, StrategyDefinition } from '../schemas/backtest.js';
import { getMemoryTools } from '../tools/memoryTools.js';
import {
  DEFAULT_BACKTEST_TIMEOUT_MS,
  resolveBacktestTimeoutMs,
  withBacktestTimeout,
} from '../workflow/backtestTimeout.js';
import { buildSessionLabel, extractJsonWithRetry, loadPrompt } from './_utils.js';

export interface BacktestInput {
  strategy: StrategyDefinition;
  tickers: string[];
  startDate?: string;
  endDate?: string;
  timeoutMs?: number;
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
  const resolvedTimeoutMs = resolveBacktestTimeoutMs(input.timeoutMs);
  const timeoutMinutes = resolvedTimeoutMs ? Math.round(resolvedTimeoutMs / 60_000) : undefined;
  const timeoutSeconds = resolvedTimeoutMs
    ? Math.max(1, Math.floor((resolvedTimeoutMs - 15_000) / 1000))
    : undefined;

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
    timeoutSeconds
      ? `전체 백테스트 제한 시간은 약 ${timeoutMinutes}분입니다. Python 실행 시 bash 도구의 timeout 파라미터를 ${timeoutSeconds}초 이하로 설정하세요.`
      : '이번 백테스트는 시간 제한이 없습니다.',
    '결과를 JSON으로 반환하세요.',
  ].join('\n');

  const result = await withBacktestTimeout(
    async () => {
      await session.prompt(userMessage);
      return extractJsonWithRetry<BacktestResult>(session, 'backtest');
    },
    {
      timeoutMs: input.timeoutMs,
      onTimeout: async () => {
        await session.abort();
      },
      errorMessage: `백테스트가 ${Math.round((resolvedTimeoutMs ?? DEFAULT_BACKTEST_TIMEOUT_MS) / 60_000)}분 제한 시간을 초과했습니다.`,
    },
  );

  await store.put(runId, 'backtest', 'output', result);
  return result;
}
