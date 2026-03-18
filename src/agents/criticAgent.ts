import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import type { FundamentalAnalysis, NewsAnalysis } from '../schemas/analysis.js';
import type { BacktestResult, CriticReport, StrategyDefinition } from '../schemas/backtest.js';
import type { ScenarioDefinition, ScenarioReport } from '../schemas/scenario.js';
import { getMemoryTools } from '../tools/memoryTools.js';
import { buildSessionLabel, extractJsonWithRetry, loadPrompt } from './_utils.js';

export interface CriticInput {
  strategy: StrategyDefinition;
  backtestResult: BacktestResult;
  additionalArtifacts?: Record<string, unknown>;
}

export async function runCriticAgent(
  runId: string,
  input: CriticInput,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<CriticReport> {
  const prompt = await loadPrompt('critic');
  const label = buildSessionLabel('critic', input.strategy.name);

  const session = await createPiSession({
    agentName: 'critic',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: getMemoryTools('critic'),
    eventRecorder: recorder,
    onUpdate,
  });

  const parts: string[] = [
    '=== 전략 정의 ===',
    JSON.stringify(input.strategy, null, 2),
    '',
    '=== 백테스트 결과 ===',
    JSON.stringify(input.backtestResult, null, 2),
  ];

  if (input.additionalArtifacts) {
    parts.push('', '=== 추가 분석 데이터 ===');
    for (const [key, val] of Object.entries(input.additionalArtifacts)) {
      parts.push(`--- ${key} ---`, JSON.stringify(val, null, 2));
    }
  }

  parts.push(
    '',
    '위 전략과 백테스트 결과를 비판적으로 검토하세요. 과적합 위험, 데이터 유출, 생존편향, 레짐 의존성을 평가하고 verdict를 내려주세요.',
  );
  parts.push('결과를 JSON으로 반환하세요.');

  await session.prompt(parts.join('\n'));
  const result = await extractJsonWithRetry<CriticReport>(session, 'critic');
  await store.put(runId, 'critic', 'output', result);
  return result;
}

// ── 시나리오 분석용 Critic ──

export interface ScenarioCriticInput {
  scenarioContext: ScenarioDefinition;
  fundamentals: FundamentalAnalysis[];
  newsAnalyses: NewsAnalysis[];
}

export async function runScenarioCriticAgent(
  runId: string,
  input: ScenarioCriticInput,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<ScenarioReport> {
  const prompt = await loadPrompt('critic');
  const label = buildSessionLabel('critic', `scenario:${input.scenarioContext.name.slice(0, 20)}`);

  const session = await createPiSession({
    agentName: 'critic',
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: getMemoryTools('critic'),
    eventRecorder: recorder,
    onUpdate,
  });

  const parts: string[] = [
    '당신은 시나리오 분석 결과를 종합하는 역할입니다.',
    '아래 시나리오 정의와 각 종목의 펀더멘털/뉴스 분석을 검토하고,',
    '전체 시나리오의 영향을 종합 평가하세요.',
    '',
    '=== 시나리오 정의 ===',
    JSON.stringify(input.scenarioContext, null, 2),
    '',
    '=== 펀더멘털 분석 ===',
    JSON.stringify(input.fundamentals, null, 2),
    '',
    '=== 뉴스 분석 ===',
    JSON.stringify(input.newsAnalyses, null, 2),
    '',
    '다음 JSON 형식으로 종합 평가를 반환하세요:',
    '{',
    '  "scenarioName": "시나리오 이름",',
    '  "projections": [{ "ticker": "...", "fundamentalImpact": { "direction": "positive|negative|neutral", "magnitude": "low|medium|high", "rationale": "...", "affectedMetrics": [...] }, "newsContext": { "expectedSentiment": "bullish|bearish|mixed", "likelyCatalysts": [...] } }],',
    '  "overallAssessment": "종합 평가",',
    '  "confidence": "low|medium|high",',
    '  "keyRisks": ["리스크1", ...],',
    '  "recommendations": ["권고1", ...],',
    '  "disclaimer": "이 분석은 LLM 기반 추론이며 투자 조언이 아닙니다."',
    '}',
    '',
    '평가 기준:',
    '- confidence: 분석의 신뢰도 (변수가 많고 불확실할수록 low)',
    '- keyRisks: 시나리오 자체의 리스크 + 분석 한계',
    '- disclaimer: "이 분석은 LLM 기반 추론이며 투자 조언이 아닙니다" 포함 필수',
    '',
    '결과를 JSON으로 반환하세요.',
  ];

  await session.prompt(parts.join('\n'));
  const result = await extractJsonWithRetry<ScenarioReport>(session, 'critic');
  await store.put(runId, 'scenario-critic', 'output', result);
  return result;
}
