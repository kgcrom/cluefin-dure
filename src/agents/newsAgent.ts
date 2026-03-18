import type { AgentToolUpdateCallback, ToolDefinition } from '@mariozechner/pi-coding-agent';
import { getToolsForAgent } from '../rpc/agent-tools.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { NewsAnalysis } from '../schemas/analysis.js';
import type { ScenarioDefinition } from '../schemas/scenario.js';
import { getMemoryTools } from '../tools/memoryTools.js';
import { newsTool } from '../tools/newsTool.js';
import { buildSessionLabel, extractJsonFromMessage, loadPrompt } from './_utils.js';

export interface NewsInput {
  ticker: string;
  period?: string;
  scenarioContext?: ScenarioDefinition;
}

export async function runNewsAgent(
  runId: string,
  input: NewsInput,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<NewsAnalysis> {
  const prompt = await loadPrompt('news');
  const label = buildSessionLabel('news', input.ticker);

  const rpcTools = await getToolsForAgent('news');
  const session = await createPiSession({
    agentName: 'news',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [newsTool as unknown as ToolDefinition, ...rpcTools, ...getMemoryTools('news')],
    eventRecorder: recorder,
    onUpdate,
  });

  const parts: string[] = [
    `분석 대상: ${input.ticker}`,
    `기간: ${input.period ?? '최근 3개월'}`,
    '',
    '사용 가능한 도구를 활용하여 관련 뉴스와 공시를 검색한 후, 이벤트 타임라인·센티먼트·촉매·리스크를 분석하세요.',
  ];

  if (input.scenarioContext) {
    parts.push(
      '',
      '=== 시나리오 컨텍스트 ===',
      JSON.stringify(input.scenarioContext, null, 2),
      '',
      '위 시나리오 가정 하에서 이 종목의 뉴스/이벤트 영향을 분석하세요.',
    );
  }

  parts.push('결과를 JSON으로 반환하세요.');
  const userMessage = parts.join('\n');

  await session.prompt(userMessage);
  const result = extractJsonFromMessage<NewsAnalysis>(session.state.messages);
  await store.put(runId, 'news', input.ticker, result);
  return result;
}
