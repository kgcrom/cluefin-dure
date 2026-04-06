import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runCriticAgent } from '../agents/criticAgent.js';
import { runStrategyAgent } from '../agents/strategyAgent.js';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import type { FundamentalAnalysis, NewsAnalysis } from '../schemas/analysis.js';
import type { CriticReport, StrategyDefinition } from '../schemas/strategy.js';

export interface CriticIteration {
  iteration: number;
  strategy: StrategyDefinition;
  verdict: CriticReport['verdict'];
  criticReport: CriticReport;
}

export interface CriticIterationLoopOptions {
  runId: string;
  initialStrategy: StrategyDefinition;
  theme: string;
  maxIterations?: number;
  fundamentals?: FundamentalAnalysis[];
  newsAnalyses?: NewsAnalysis[];
  universe?: unknown;
}

export interface CriticIterationLoopResult {
  finalStrategy: StrategyDefinition;
  iterations: CriticIteration[];
  finalVerdict: CriticReport['verdict'];
}

export async function runCriticIterationLoop(
  options: CriticIterationLoopOptions,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<CriticIterationLoopResult> {
  const maxIterations = options.maxIterations ?? 3;
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] critic autoresearch 시작: ${options.runId} (최대 ${maxIterations}회)`);

  const iterations: CriticIteration[] = [];
  let currentStrategy = options.initialStrategy;

  for (let i = 0; i < maxIterations; i++) {
    const iteration = i + 1;
    emit(`\n[run] === Iteration ${iteration}/${maxIterations} ===`);

    emit('[run] Critic 검토 중...');
    const criticReport = await runCriticAgent(
      options.runId,
      {
        strategy: currentStrategy,
        additionalArtifacts: {
          theme: options.theme,
          fundamentals: options.fundamentals,
          newsAnalyses: options.newsAnalyses,
          universe: options.universe,
        },
      },
      store,
      recorder,
      onUpdate,
    );

    const record: CriticIteration = {
      iteration,
      strategy: currentStrategy,
      verdict: criticReport.verdict,
      criticReport,
    };
    iterations.push(record);

    emit(`[run] Critic 판정: ${criticReport.verdict}`);
    emit(`[run] 추천사항 개수: ${criticReport.recommendations.length}개`);

    if (criticReport.verdict === 'keep' || criticReport.verdict === 'reject') {
      emit(`\n[run] critic 판정 종료: ${criticReport.verdict}`);
      break;
    }

    if (i < maxIterations - 1) {
      emit('[run] 전략 수정 중...');
      currentStrategy = await runStrategyAgent(
        options.runId,
        {
          theme: currentStrategy.hypothesis,
          feedback: criticReport.recommendations.join('\n'),
          fundamentals: options.fundamentals,
          newsAnalyses: options.newsAnalyses,
        },
        store,
        recorder,
        onUpdate,
      );
    }
  }

  const finalVerdict = iterations[iterations.length - 1]?.criticReport.verdict ?? 'reject';
  emit(`\n[run] critic autoresearch 완료: ${iterations.length}회 반복, 최종 판정: ${finalVerdict}`);

  return {
    finalStrategy: currentStrategy,
    iterations,
    finalVerdict,
  };
}
