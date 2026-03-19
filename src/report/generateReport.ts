/** 워크플로우별 컴포넌트 조립 + 파일 쓰기 + 브라우저 오픈 + 터미널 요약 */

import { exec } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BacktestLoopResult } from '../workflow/runBacktestLoop.js';
import type { EquityAnalysisResult } from '../workflow/runEquityAnalysis.js';
import type { ScenarioAnalysisResult } from '../workflow/runScenarioAnalysis.js';
import type { ScreeningResult } from '../workflow/runScreening.js';
import type { StrategyResearchResult } from '../workflow/runStrategyResearch.js';
import {
  renderAssessment,
  renderBacktestKPIs,
  renderCriticReport,
  renderFundamentals,
  renderNewsAnalyses,
  renderScenarioDefinition,
  renderScenarioProjections,
  renderStrategy,
  renderTradeLog,
} from './components.js';
import { wrapLayout } from './layout.js';

type WorkflowResult =
  | { type: 'scenario'; result: ScenarioAnalysisResult }
  | { type: 'equity'; result: EquityAnalysisResult }
  | { type: 'screen'; result: ScreeningResult }
  | { type: 'strategy'; result: StrategyResearchResult }
  | { type: 'backtest'; result: BacktestLoopResult };

const DATA_DIR = path.resolve('data/runs');

function buildHtml(input: WorkflowResult): string {
  switch (input.type) {
    case 'scenario': {
      const r = input.result;
      return wrapLayout('시나리오 분석', r.runId, [
        renderScenarioDefinition(r.definition),
        renderScenarioProjections(r.report.projections),
        renderFundamentals(r.fundamentals),
        renderNewsAnalyses(r.newsAnalyses),
        renderAssessment(r.report),
      ].join(''));
    }
    case 'equity': {
      const r = input.result;
      return wrapLayout('종목 분석', r.runId, [
        renderFundamentals(r.fundamentals),
        renderNewsAnalyses(r.newsAnalyses),
        renderCriticReport(r.criticReport),
      ].join(''));
    }
    case 'screen': {
      const r = input.result;
      return wrapLayout('종목 스크리닝', r.runId, [
        renderFundamentals(r.rankings),
      ].join(''));
    }
    case 'strategy': {
      const r = input.result;
      return wrapLayout('전략 리서치', r.runId, [
        renderStrategy(r.strategy),
        renderBacktestKPIs(r.backtestResult),
        renderTradeLog(r.backtestResult.tradeLog),
        renderCriticReport(r.criticReport),
      ].join(''));
    }
    case 'backtest': {
      const r = input.result;
      const iterSections = r.iterations.map((iter, i) => {
        return [
          renderBacktestKPIs(iter.result),
          `<p><strong>Iteration ${i + 1} Verdict:</strong> ${iter.criticVerdict}</p>`,
        ].join('');
      });
      return wrapLayout('백테스트 루프', r.runId, [
        renderStrategy(r.finalStrategy),
        ...iterSections,
      ].join(''));
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
      console.log(`\n  전략:    ${r.strategy.name}`);
      console.log(`  CAGR:    ${(r.backtestResult.cagr * 100).toFixed(2)}%`);
      console.log(`  Sharpe:  ${r.backtestResult.sharpe.toFixed(2)}`);
      console.log(`  판정:    ${r.criticReport.verdict}`);
      break;
    }
    case 'backtest': {
      const r = result as BacktestLoopResult;
      const best = r.iterations.reduce((a, b) => (a.result.sharpe > b.result.sharpe ? a : b));
      console.log(`\n  반복:       ${r.iterations.length}회`);
      console.log(`  최종 판정:  ${r.finalVerdict}`);
      console.log(`  최고 CAGR:  ${(best.result.cagr * 100).toFixed(2)}%`);
      console.log(`  최고 Sharpe: ${best.result.sharpe.toFixed(2)}`);
      break;
    }
  }
}
