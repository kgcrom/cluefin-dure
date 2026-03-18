import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { getToolsForAgent } from '../rpc/agent-tools.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { FundamentalAnalysis } from '../schemas/analysis.js';
import type { ScenarioDefinition } from '../schemas/scenario.js';
import { getMemoryTools } from '../tools/memoryTools.js';
import { buildSessionLabel, extractJsonWithRetry, loadPrompt } from './_utils.js';

export interface FundamentalInput {
  ticker: string;
  scenarioContext?: ScenarioDefinition;
}

export async function runFundamentalAgent(
  runId: string,
  input: FundamentalInput,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<FundamentalAnalysis> {
  const prompt = await loadPrompt('fundamental');
  const label = buildSessionLabel('fundamental', input.ticker);

  const session = await createPiSession({
    agentName: 'fundamental',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [...(await getToolsForAgent('fundamental')), ...getMemoryTools('fundamental')],
    eventRecorder: recorder,
    onUpdate,
  });

  const parts: string[] = [
    `분석 대상: ${input.ticker}`,
    '',
    '사용 가능한 도구를 활용하여 재무지표, 재무제표, 최근 공시를 조회한 후 종합 펀더멘털 분석을 수행하세요.',
  ];

  if (input.scenarioContext) {
    parts.push(
      '',
      '=== 시나리오 컨텍스트 ===',
      JSON.stringify(input.scenarioContext, null, 2),
      '',
      '위 시나리오 가정 하에서 이 종목의 펀더멘털 영향을 분석하세요.',
    );
  }

  parts.push('결과를 JSON으로 반환하세요.');
  const userMessage = parts.join('\n');

  await session.prompt(userMessage);
  const result = await extractJsonWithRetry<FundamentalAnalysis>(session, 'fundamental');
  await store.put(runId, 'fundamental', input.ticker, result);
  return result;
}
