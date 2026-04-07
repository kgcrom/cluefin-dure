/** 워크플로우별 컴포넌트 조립 + 파일 쓰기 + 브라우저 오픈 + 터미널 요약 */

import { exec } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EquityAnalysisResult } from '../workflow/runEquityAnalysis.js';
import type { ScenarioAnalysisResult } from '../workflow/runScenarioAnalysis.js';
import type { ScreeningResult } from '../workflow/runScreening.js';
import type { StrategyResearchResult } from '../workflow/runStrategyResearch.js';
import {
  renderAssessment,
  renderCriticIterationTrail,
  renderCriticReport,
  renderFundamentals,
  renderNewsAnalyses,
  renderScenarioDefinition,
  renderScenarioProjections,
  renderStrategy,
} from './components.js';
import { wrapLayout } from './layout.js';

type WorkflowResult =
  | { type: 'scenario'; result: ScenarioAnalysisResult }
  | { type: 'equity'; result: EquityAnalysisResult }
  | { type: 'screen'; result: ScreeningResult }
  | { type: 'strategy'; result: StrategyResearchResult };

const DATA_DIR = path.resolve('data/runs');

function buildHtml(input: WorkflowResult): string {
  switch (input.type) {
    case 'scenario': {
      const r = input.result;
      return wrapLayout(
        '시나리오 분석',
        r.runId,
        [
          renderScenarioDefinition(r.definition),
          renderScenarioProjections(r.report.projections),
          renderFundamentals(r.fundamentals),
          renderNewsAnalyses(r.newsAnalyses),
          renderAssessment(r.report),
        ].join(''),
      );
    }
    case 'equity': {
      const r = input.result;
      return wrapLayout(
        '종목 분석',
        r.runId,
        [
          renderFundamentals(r.fundamentals),
          renderNewsAnalyses(r.newsAnalyses),
          renderCriticReport(r.criticReport),
          renderCriticIterationTrail(r.criticIterations),
        ].join(''),
      );
    }
    case 'screen': {
      const r = input.result;
      return wrapLayout('종목 스크리닝', r.runId, [renderFundamentals(r.rankings)].join(''));
    }
    case 'strategy': {
      const r = input.result;
      return wrapLayout(
        'Strategy Research',
        r.runId,
        [
          renderStrategy(r.strategy),
          renderCriticReport(r.criticReport),
          renderCriticIterationTrail(r.criticIterations),
        ].join(''),
        'en',
      );
    }
  }
}

export async function generateReport(input: WorkflowResult): Promise<string> {
  const runId = input.result.runId;
  const html = buildHtml(input);

  const dir = path.join(DATA_DIR, runId);
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, 'report.html');
  await writeFile(filePath, html, 'utf-8');

  // 브라우저 자동 오픈 (macOS)
  exec(`open "${filePath}"`);

  return filePath;
}

export function printTerminalSummary(input: WorkflowResult): void {
  const { type, result } = input;

  switch (type) {
    case 'scenario': {
      const r = result as ScenarioAnalysisResult;
      console.log(`\n  시나리오: ${r.definition.name}`);
      console.log(`  신뢰도:   ${r.report.confidence}`);
      console.log(`  종목 수:  ${r.report.projections.length}`);
      console.log(`  리스크:   ${r.report.keyRisks.length}건`);
      break;
    }
    case 'equity': {
      const r = result as EquityAnalysisResult;
      console.log(`\n  종목:    ${r.tickers.join(', ')}`);
      console.log(`  판정:    ${r.criticReport.verdict}`);
      break;
    }
    case 'screen': {
      const r = result as ScreeningResult;
      const top3 = r.rankings.slice(0, 3).map((f) => f.ticker);
      console.log(`\n  랭킹 종목: ${r.rankings.length}개`);
      console.log(`  상위 3개:  ${top3.join(', ')}`);
      break;
    }
    case 'strategy': {
      const r = result as StrategyResearchResult;
      console.log(`\n  Strategy: ${r.strategy.name}`);
      console.log(`  Iterations: ${r.criticIterations.length}`);
      console.log(`  Final Verdict: ${r.criticReport.verdict}`);
      console.log(`  Verdict: ${r.criticReport.verdict}`);
      break;
    }
  }
}
