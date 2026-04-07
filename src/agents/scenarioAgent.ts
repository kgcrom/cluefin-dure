import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { getToolsForAgent } from '../cli/agent-tools.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { ScenarioDefinition } from '../schemas/scenario.js';
import { getMemoryTools } from '../tools/memoryTools.js';
import { buildSessionLabel, extractJsonWithRetry, loadPrompt } from './_utils.js';

export interface ScenarioInput {
  scenario: string;
  tickers?: string[];
}

export async function runScenarioAgent(
  runId: string,
  input: ScenarioInput,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<ScenarioDefinition> {
  const prompt = await loadPrompt('scenario');
  const label = buildSessionLabel('scenario', runId);

  const session = await createPiSession({
    agentName: 'scenario',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [...(await getToolsForAgent('scenario')), ...getMemoryTools('scenario')],
    eventRecorder: recorder,
    onUpdate,
  });

  const parts: string[] = [`시나리오: ${input.scenario}`];

  if (input.tickers?.length) {
    parts.push(``, `분석 대상 종목: ${input.tickers.join(', ')}`);
  }

  parts.push(
    '',
    '위 시나리오를 구조화된 변수 세트로 분해하세요. baseline 값은 도구를 사용하여 실제 현재 값을 조회하세요.',
    '결과를 JSON으로 반환하세요.',
  );

  await session.prompt(parts.join('\n'));
  const result = await extractJsonWithRetry<ScenarioDefinition>(session, 'scenario');
  await store.put(runId, 'scenario', 'definition', result);
  return result;
}
