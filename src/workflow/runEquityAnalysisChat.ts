import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import type { ReviewChecklistResult } from '../agents/reviewChecklistAgent.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import {
  type EquityAnalysisOptions,
  type EquityAnalysisResult,
  runEquityAnalysis,
} from './runEquityAnalysis.js';
import { runReviewChecklist } from './runReviewChecklist.js';

export type EquityAnalysisChatOptions = EquityAnalysisOptions;

export interface EquityAnalysisChatResult extends EquityAnalysisResult {
  reviewChecklist: ReviewChecklistResult;
}

export async function runEquityAnalysisChat(
  options: EquityAnalysisChatOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<EquityAnalysisChatResult> {
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit('\n[run] 대화형 종목 분석 시작: 전체 분석 + 체크리스트 리뷰');
  const analysis = await runEquityAnalysis(options, onUpdate);
  emit('[run] 리뷰 체크리스트 실행 중...');
  const reviewChecklist = await runReviewChecklist({ runId: analysis.runId }, onUpdate);
  emit(`\n[run] 대화형 종목 분석 완료: ${analysis.runId}`);

  return {
    ...analysis,
    reviewChecklist,
  };
}
