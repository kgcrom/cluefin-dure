import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { getToolsForAgent } from '../rpc/agent-tools.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { FundamentalAnalysis } from '../schemas/analysis.js';
import { buildSessionLabel, extractJsonFromMessage, loadPrompt } from './_utils.js';

export interface FundamentalInput {
  ticker: string;
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
    customTools: await getToolsForAgent('fundamental'),
    eventRecorder: recorder,
    onUpdate,
  });

  const userMessage = [
    `분석 대상: ${input.ticker}`,
    '',
    '사용 가능한 도구를 활용하여 재무지표, 재무제표, 최근 공시를 조회한 후 종합 펀더멘털 분석을 수행하세요.',
    '결과를 JSON으로 반환하세요.',
  ].join('\n');

  await session.prompt(userMessage);
  const result = extractJsonFromMessage<FundamentalAnalysis>(session.state.messages);
  await store.put(runId, 'fundamental', input.ticker, result);
  return result;
}
