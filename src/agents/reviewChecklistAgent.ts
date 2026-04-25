import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import type { ArtifactStore } from '../runtime/artifactStore.js';
import { createPiSession } from '../runtime/createPiSession.js';
import type { EventRecorder } from '../runtime/eventRecorder.js';
import { buildSessionLabel, extractTextWithRetry, loadPrompt, type PromptName } from './_utils.js';

export interface ReviewChecklistInput {
  sourceRunId: string;
}

export interface ReviewChecklistReviewers {
  companyAnalysis?: string;
  riskManagement?: string;
  comparableCompanies?: string;
  crossValidation?: string;
  fallback?: string;
}

export interface ReviewChecklistResult {
  runId: string;
  sourceRunId: string;
  sourceType: 'equity';
  reviewers: ReviewChecklistReviewers;
  finalReview: string;
}

interface EquityEvidenceBundle {
  universe?: unknown;
  fundamentals: unknown[];
  newsAnalyses: unknown[];
  strategy: unknown;
  critic: unknown;
}

interface ReviewerSpec {
  key: keyof Omit<ReviewChecklistReviewers, 'fallback'>;
  label: string;
  promptNames: PromptName[];
}

const REVIEWER_SPECS: ReviewerSpec[] = [
  {
    key: 'companyAnalysis',
    label: 'company',
    promptNames: ['review_checklist_base', 'review_checklist_company'],
  },
  {
    key: 'riskManagement',
    label: 'risk',
    promptNames: ['review_checklist_base', 'review_checklist_risk'],
  },
  {
    key: 'comparableCompanies',
    label: 'peer',
    promptNames: ['review_checklist_base', 'review_checklist_peer'],
  },
  {
    key: 'crossValidation',
    label: 'cross-validation',
    promptNames: ['review_checklist_base', 'review_checklist_cross_validation'],
  },
];

export async function runReviewChecklistAgent(
  runId: string,
  input: ReviewChecklistInput,
  store: ArtifactStore,
  recorder: EventRecorder,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<ReviewChecklistResult> {
  const sourceType = validateSourceRunId(input.sourceRunId);
  const evidence = await loadEquityEvidenceBundle(input.sourceRunId);
  const evidenceBundle = buildEvidenceBundle(input.sourceRunId, evidence);
  const evidenceSummary = buildEvidenceSummary(input.sourceRunId, evidence);

  const reviewerSettled = await Promise.allSettled(
    REVIEWER_SPECS.map(async (spec) => {
      const review = await runReviewSession({
        label: spec.label,
        promptNames: spec.promptNames,
        sourceRunId: input.sourceRunId,
        evidenceBundle,
        recorder,
        onUpdate,
      });
      return [spec.key, review] as const;
    }),
  );

  const reviewers: ReviewChecklistReviewers = {};
  let useFallback = false;

  for (const settled of reviewerSettled) {
    if (settled.status === 'fulfilled') {
      const [key, review] = settled.value;
      reviewers[key] = review;
      continue;
    }
    useFallback = true;
  }

  for (const spec of REVIEWER_SPECS) {
    if (!reviewers[spec.key]?.trim()) {
      useFallback = true;
      break;
    }
  }

  let finalReview: string;

  if (useFallback) {
    const fallbackReview = await runFallbackSession({
      sourceRunId: input.sourceRunId,
      evidenceBundle,
      recorder,
      onUpdate,
    });
    reviewers.fallback = fallbackReview;
    finalReview = [
      'Fallback Mode: one or more specialized reviewers were unavailable, so this result was produced by a single-agent checklist review.',
      '',
      fallbackReview,
    ].join('\n');
  } else {
    finalReview = await runSynthesizerSession({
      sourceRunId: input.sourceRunId,
      evidenceSummary,
      reviewers: {
        companyAnalysis: reviewers.companyAnalysis ?? '',
        riskManagement: reviewers.riskManagement ?? '',
        comparableCompanies: reviewers.comparableCompanies ?? '',
        crossValidation: reviewers.crossValidation ?? '',
      },
      recorder,
      onUpdate,
    });
  }

  const result: ReviewChecklistResult = {
    runId,
    sourceRunId: input.sourceRunId,
    sourceType,
    reviewers,
    finalReview,
  };

  await store.put(runId, 'review-checklist', 'reviewers', reviewers);
  await store.put(runId, 'review-checklist', 'output', result);

  return result;
}

function validateSourceRunId(sourceRunId: string): 'equity' {
  if (!sourceRunId.startsWith('equity-')) {
    throw new Error(`review-checklist는 현재 equity run만 지원합니다. 받은 runId: ${sourceRunId}`);
  }

  return 'equity';
}

async function loadEquityEvidenceBundle(sourceRunId: string): Promise<EquityEvidenceBundle> {
  const runDir = path.join(getRunsDir(), sourceRunId);
  const missingPaths: string[] = [];

  const strategy = await readRequiredJson(
    path.join(runDir, 'strategy', 'output.json'),
    missingPaths,
  );
  const critic = await readRequiredJson(path.join(runDir, 'critic', 'output.json'), missingPaths);
  const fundamentals = await readRequiredJsonDirectory(
    path.join(runDir, 'fundamental'),
    missingPaths,
  );
  const newsAnalyses = await readRequiredJsonDirectory(path.join(runDir, 'news'), missingPaths);
  const universe = await readOptionalJson(path.join(runDir, 'universe', 'output.json'));

  if (
    !strategy ||
    !critic ||
    fundamentals.length === 0 ||
    newsAnalyses.length === 0 ||
    missingPaths.length > 0
  ) {
    throw new Error(
      [
        `review-checklist source run validation failed for ${sourceRunId}.`,
        'Missing required artifacts:',
        ...missingPaths.map((missingPath) => `- ${missingPath}`),
      ].join('\n'),
    );
  }

  return {
    universe,
    fundamentals,
    newsAnalyses,
    strategy,
    critic,
  };
}

function getRunsDir(): string {
  return path.resolve('data/runs');
}

async function readRequiredJson(
  filePath: string,
  missingPaths: string[],
): Promise<unknown | undefined> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    missingPaths.push(filePath);
    return undefined;
  }
}

async function readOptionalJson(filePath: string): Promise<unknown | undefined> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function readRequiredJsonDirectory(
  dirPath: string,
  missingPaths: string[],
): Promise<unknown[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort();

    if (jsonFiles.length === 0) {
      missingPaths.push(path.join(dirPath, '*.json'));
      return [];
    }

    return await Promise.all(
      jsonFiles.map(async (fileName) => {
        const raw = await readFile(path.join(dirPath, fileName), 'utf-8');
        return JSON.parse(raw);
      }),
    );
  } catch {
    missingPaths.push(path.join(dirPath, '*.json'));
    return [];
  }
}

function buildEvidenceBundle(sourceRunId: string, evidence: EquityEvidenceBundle): string {
  const sections: string[] = [`Source Run ID: ${sourceRunId}`];

  if (evidence.universe) {
    sections.push('', '=== Universe ===', JSON.stringify(evidence.universe, null, 2));
  }

  sections.push('', '=== Fundamentals ===');
  for (const fundamental of evidence.fundamentals) {
    sections.push(JSON.stringify(fundamental, null, 2));
  }

  sections.push('', '=== News Analyses ===');
  for (const newsAnalysis of evidence.newsAnalyses) {
    sections.push(JSON.stringify(newsAnalysis, null, 2));
  }

  sections.push(
    '',
    '=== Strategy ===',
    JSON.stringify(evidence.strategy, null, 2),
    '',
    '=== Critic ===',
    JSON.stringify(evidence.critic, null, 2),
  );

  return sections.join('\n');
}

function buildEvidenceSummary(sourceRunId: string, evidence: EquityEvidenceBundle): string {
  return [
    `Source Run ID: ${sourceRunId}`,
    `Universe Included: ${evidence.universe ? 'yes' : 'no'}`,
    `Fundamental Artifacts: ${evidence.fundamentals.length}`,
    `News Artifacts: ${evidence.newsAnalyses.length}`,
    `Strategy Summary: ${summarizeJson(evidence.strategy)}`,
    `Critic Summary: ${summarizeJson(evidence.critic)}`,
  ].join('\n');
}

function summarizeJson(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  const objectValue = value as Record<string, unknown>;
  const summaryKeys = ['name', 'hypothesis', 'verdict', 'recommendations'];
  const summary: Record<string, unknown> = {};

  for (const key of summaryKeys) {
    if (key in objectValue) {
      summary[key] = objectValue[key];
    }
  }

  if (Object.keys(summary).length === 0) {
    return `keys=${Object.keys(objectValue).join(', ')}`;
  }

  return JSON.stringify(summary);
}

async function runReviewSession(params: {
  label: string;
  promptNames: PromptName[];
  sourceRunId: string;
  evidenceBundle: string;
  recorder: EventRecorder;
  onUpdate?: AgentToolUpdateCallback<null>;
}): Promise<string> {
  const systemPrompt = await loadPrompt(params.promptNames, {
    includeMemory: false,
  });
  const session = await createPiSession({
    agentName: 'review_checklist',
    sessionLabel: buildSessionLabel('review_checklist', `${params.label}:${params.sourceRunId}`),
    systemPrompt,
    eventRecorder: params.recorder,
    onUpdate: params.onUpdate,
  });

  await session.prompt(
    [
      'Review this Dure equity analysis evidence bundle.',
      `Source Run ID: ${params.sourceRunId}`,
      'Return concise Markdown using the required headings.',
      'Do not reproduce the full evidence bundle in the answer.',
      '',
      '=== Evidence Bundle ===',
      params.evidenceBundle,
    ].join('\n'),
  );

  return extractTextWithRetry(session, `review-checklist:${params.label}`);
}

async function runSynthesizerSession(params: {
  sourceRunId: string;
  evidenceSummary: string;
  reviewers: Required<Omit<ReviewChecklistReviewers, 'fallback'>>;
  recorder: EventRecorder;
  onUpdate?: AgentToolUpdateCallback<null>;
}): Promise<string> {
  const systemPrompt = await loadPrompt(['review_checklist_base', 'review_checklist_synthesizer'], {
    includeMemory: false,
  });
  const session = await createPiSession({
    agentName: 'review_checklist',
    sessionLabel: buildSessionLabel('review_checklist', `synthesizer:${params.sourceRunId}`),
    systemPrompt,
    eventRecorder: params.recorder,
    onUpdate: params.onUpdate,
  });

  await session.prompt(
    [
      'Synthesize the specialist investment review outputs into one final decision.',
      `Source Run ID: ${params.sourceRunId}`,
      'Return concise Markdown using the required headings.',
      '',
      '=== Source Summary ===',
      params.evidenceSummary,
      '',
      '=== Company Analysis Reviewer ===',
      params.reviewers.companyAnalysis,
      '',
      '=== Risk Management Reviewer ===',
      params.reviewers.riskManagement,
      '',
      '=== Comparable Companies Reviewer ===',
      params.reviewers.comparableCompanies,
      '',
      '=== Cross-Validation Reviewer ===',
      params.reviewers.crossValidation,
    ].join('\n'),
  );

  return extractTextWithRetry(session, 'review-checklist:synthesizer');
}

async function runFallbackSession(params: {
  sourceRunId: string;
  evidenceBundle: string;
  recorder: EventRecorder;
  onUpdate?: AgentToolUpdateCallback<null>;
}): Promise<string> {
  const systemPrompt = await loadPrompt('review_checklist_base', { includeMemory: false });
  const session = await createPiSession({
    agentName: 'review_checklist',
    sessionLabel: buildSessionLabel('review_checklist', `fallback:${params.sourceRunId}`),
    systemPrompt,
    eventRecorder: params.recorder,
    onUpdate: params.onUpdate,
  });

  await session.prompt(
    [
      'One or more specialized reviewers failed or were unavailable.',
      'Perform a single-agent end-to-end review using the checklist.',
      'State clearly that this is a fallback review.',
      'Return concise Markdown using the required headings.',
      '',
      '=== Evidence Bundle ===',
      params.evidenceBundle,
    ].join('\n'),
  );

  return extractTextWithRetry(session, 'review-checklist:fallback');
}
