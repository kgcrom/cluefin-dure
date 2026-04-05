import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import {
  type ReviewChecklistResult,
  runReviewChecklistAgent,
} from '../agents/reviewChecklistAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';

export interface ReviewChecklistOptions {
  runId: string;
}

export async function runReviewChecklist(
  options: ReviewChecklistOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<ReviewChecklistResult> {
  const reviewRunId = `review-checklist-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] 리뷰 체크리스트 시작: ${reviewRunId}`);
  emit(`[run] source equity run: ${options.runId}`);

  try {
    const result = await runReviewChecklistAgent(
      reviewRunId,
      { sourceRunId: options.runId },
      store,
      recorder,
      onUpdate,
    );

    await recorder.persist(reviewRunId, 'data/runs');
    emit(`\n[run] 리뷰 체크리스트 완료: ${reviewRunId}`);

    return result;
  } finally {
    recorder.dispose();
  }
}
