import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  renderAssessment,
  renderCriticReport,
  renderCriticIterationTrail,
  renderFundamentals,
  renderNewsAnalyses,
  renderScenarioDefinition,
  renderScenarioProjections,
  renderStrategy,
} from '../../src/report/components.js';
import { generateReport, printTerminalSummary } from '../../src/report/generateReport.js';
import { badge, table, wrapLayout } from '../../src/report/layout.js';
import { STRATEGY_USAGE_LINES } from '../../src/main.js';
import {
  criticReport,
  criticIterations,
  fundamentals,
  newsAnalyses,
  scenarioDefinition,
  scenarioProjections,
  scenarioReport,
  strategy,
} from './fixtures.js';

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Layout ──

describe('layout', () => {
  it('wrapLayout: 제목, runId, 타임스탬프가 포함', () => {
    const html = wrapLayout('테스트 리포트', 'run-123', '<p>내용</p>');
    expect(html).toContain('테스트 리포트');
    expect(html).toContain('run-123');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<p>내용</p>');
  });

  it('badge: 올바른 class와 텍스트', () => {
    const b = badge('keep', 'keep');
    expect(b).toContain('badge-keep');
    expect(b).toContain('keep');
  });

  it('table: 헤더와 행 렌더링', () => {
    const t = table(['A', 'B'], [['1', '2'], ['3', '4']]);
    expect(t).toContain('<th>A</th>');
    expect(t).toContain('<th>B</th>');
    expect(t).toContain('<td>1</td>');
    expect(t).toContain('<td>4</td>');
  });
});

// ── Components ──

describe('components', () => {
  it('renderFundamentals: 티커명과 주요 메트릭 포함', () => {
    const html = renderFundamentals(fundamentals);
    expect(html).toContain('005930');
    expect(html).toContain('000660');
    expect(html).toContain('16.4'); // PE
    expect(html).toContain('1.3'); // PB
    expect(html).toContain('펀더멘털 분석');
  });

  it('renderNewsAnalyses: 이벤트 타임라인과 센티먼트 포함', () => {
    const html = renderNewsAnalyses(newsAnalyses);
    expect(html).toContain('005930');
    expect(html).toContain('삼성전자 HBM 공급 확대 기대');
    expect(html).toContain('전반적 긍정');
    expect(html).toContain('뉴스 분석');
  });

  it('renderCriticReport: verdict 뱃지와 recommendations 포함', () => {
    const html = renderCriticReport(criticReport);
    expect(html).toContain('badge-keep');
    expect(html).toContain('Test a slower rebalance cadence.');
    expect(html).toContain('Critic 리포트');
  });

  it('renderScenarioDefinition: 변수 테이블과 assumptions 포함', () => {
    const html = renderScenarioDefinition(scenarioDefinition);
    expect(html).toContain('기준금리');
    expect(html).toContain('5.25%');
    expect(html).toContain('4.75%');
    expect(html).toContain('인플레이션 안정');
    expect(html).toContain('시나리오 정의');
  });

  it('renderScenarioProjections: 종목별 영향 방향/크기 뱃지 포함', () => {
    const html = renderScenarioProjections(scenarioProjections);
    expect(html).toContain('005930');
    expect(html).toContain('badge-positive');
    expect(html).toContain('badge-high');
    expect(html).toContain('badge-bullish');
  });

  it('renderAssessment: 신뢰도, 평가, 리스크 포함', () => {
    const html = renderAssessment(scenarioReport);
    expect(html).toContain('badge-medium');
    expect(html).toContain('국내 반도체 섹터 전반적으로 긍정적');
    expect(html).toContain('인플레이션 재발');
  });

  it('renderStrategy: 전략명과 entry/exit 규칙 포함', () => {
    const html = renderStrategy(strategy);
    expect(html).toContain('Quality Value With Low Multiples');
    expect(html).toContain('PE &lt; 15');
    expect(html).toContain('ROE &lt; 10%');
    expect(html).toContain('Strategy Definition');
    expect(html).toContain('Strategy Name:');
    expect(html).toContain('Entry Rules:');
    expect(html).toContain('Exit Rules:');
  });

  it('renderCriticIterationTrail: strategy-specific labels render in English', () => {
    const html = renderCriticIterationTrail(criticIterations);
    expect(html).toContain('Critic Iteration Log');
    expect(html).toContain('Critic Iteration 1');
    expect(html).toContain('Iteration 1 Verdict');
    expect(html).toContain('Strategy:');
    expect(html).toContain('Hypothesis:');
    expect(html).toContain('Verdict:');
  });
});

// ── generateReport ──

describe('generateReport', () => {
  const testRunDir = path.resolve('data/runs/test-report-run');

  beforeAll(async () => {
    await mkdir(testRunDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testRunDir, { recursive: true, force: true });
  });

  it('scenario 타입: 모든 섹션이 조립되어 완전한 HTML 생성', async () => {
    const filePath = await generateReport({
      type: 'scenario',
      result: {
        runId: 'test-report-run',
        definition: scenarioDefinition,
        fundamentals,
        newsAnalyses,
        report: scenarioReport,
      },
    });

    expect(filePath).toContain('test-report-run/report.html');
    const html = await readFile(filePath, 'utf-8');
    expect(html).toContain('시나리오 분석');
    expect(html).toContain('시나리오 정의');
    expect(html).toContain('종목별 영향 전망');
    expect(html).toContain('펀더멘털 분석');
    expect(html).toContain('뉴스 분석');
    expect(html).toContain('종합 평가');
  });

  it('equity 타입: fundamentals + news + critic 섹션 포함', async () => {
    const filePath = await generateReport({
      type: 'equity',
      result: {
        runId: 'test-report-run',
        tickers: ['005930'],
        fundamentals,
        newsAnalyses,
        criticReport,
        criticIterations: [],
      },
    });

    const html = await readFile(filePath, 'utf-8');
    expect(html).toContain('종목 분석');
    expect(html).toContain('펀더멘털 분석');
    expect(html).toContain('뉴스 분석');
    expect(html).toContain('Critic 리포트');
  });

  it('파일 저장 경로 확인', async () => {
    const filePath = await generateReport({
      type: 'screen',
      result: { runId: 'test-report-run', rankings: fundamentals },
    });

    expect(filePath).toBe(path.resolve('data/runs/test-report-run/report.html'));
  });

  it('strategy 타입: 영어 제목과 lang metadata를 사용한다', async () => {
    const filePath = await generateReport({
      type: 'strategy',
      result: {
        runId: 'test-report-run',
        strategy,
        criticReport,
        criticIterations,
      },
    });

    const html = await readFile(filePath, 'utf-8');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Strategy Research');
    expect(html).toContain('Strategy Definition');
    expect(html).toContain('Critic Iteration Log');
  });
});

describe('strategy terminal copy', () => {
  it('printTerminalSummary: strategy labels are English', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    printTerminalSummary({
      type: 'strategy',
      result: {
        runId: 'strategy-1',
        strategy,
        criticReport,
        criticIterations,
      },
    });

    expect(logSpy.mock.calls).toEqual([
      ['\n  Strategy: Quality Value With Low Multiples'],
      ['  Iterations: 1'],
      ['  Final Verdict: keep'],
      ['  Verdict: keep'],
    ]);
  });

  it('strategy usage copy is English', () => {
    expect(STRATEGY_USAGE_LINES).toEqual([
      'Usage: strategy <theme/hypothesis>',
      'Example: strategy "quality value with high ROE"',
    ]);
  });
});
