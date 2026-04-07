import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { getToolsForAgent } from '../cli/agent-tools.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { FundamentalAnalysis, NewsAnalysis } from '../schemas/analysis.js';
import type { StrategyDefinition } from '../schemas/strategy.js';
import { getMemoryTools } from '../tools/memoryTools.js';
import {
  buildSessionLabel,
  extractJsonWithValidationRetry,
  loadPrompt,
  validateStrategyEnglish,
} from './_utils.js';

export interface StrategyInput {
  theme: string;
  fundamentals?: FundamentalAnalysis[];
  newsAnalyses?: NewsAnalysis[];
  feedback?: string;
}

export async function runStrategyAgent(
  runId: string,
  input: StrategyInput,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<StrategyDefinition> {
  const prompt = await loadPrompt('strategy');
  const label = buildSessionLabel('strategy', input.theme);

  const rpcTools = await getToolsForAgent('strategy');
  const session = await createPiSession({
    agentName: 'strategy',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [...rpcTools, ...getMemoryTools('strategy')],
    useCodeTools: true,
    eventRecorder: recorder,
    onUpdate,
  });

  const parts: string[] = [`테마/가설: ${input.theme}`];

  if (input.fundamentals?.length) {
    parts.push('', '=== 펀더멘털 분석 ===');
    for (const f of input.fundamentals) {
      parts.push(JSON.stringify(f, null, 2));
    }
  }
  if (input.newsAnalyses?.length) {
    parts.push('', '=== 뉴스 분석 ===');
    for (const n of input.newsAnalyses) {
      parts.push(JSON.stringify(n, null, 2));
    }
  }
  if (input.feedback) {
    parts.push('', `=== Critic 피드백 ===\n${input.feedback}`);
  }

  parts.push('', '위 분석을 바탕으로 투자 전략을 설계하세요. 결과를 JSON으로 반환하세요.');
  parts.push(
    '중요: 사용자의 입력 언어와 관계없이 strategy JSON의 모든 문자열 값은 영어로 작성하세요.',
  );

  await session.prompt(parts.join('\n'));
  const result = await extractJsonWithValidationRetry<StrategyDefinition>(
    session,
    validateStrategyEnglish,
    [
      'The previous strategy JSON contains non-English text.',
      'Return the same strategy as valid JSON again, but rewrite every string field in English only.',
      'Do not change the investment intent. Preserve the structure and keys exactly.',
      'Wrap the answer in a ```json block.',
    ].join(' '),
    'strategy',
  );
  await store.put(runId, 'strategy', 'output', result);
  return result;
}
