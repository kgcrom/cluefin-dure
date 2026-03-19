/** 데이터 스키마 단위 HTML 렌더링 컴포넌트 */

import type { FundamentalAnalysis, NewsAnalysis } from '../schemas/analysis.js';
import type { BacktestResult, CriticReport, StrategyDefinition } from '../schemas/backtest.js';
import type {
  ScenarioDefinition,
  ScenarioProjection,
  ScenarioReport,
} from '../schemas/scenario.js';
import {
  badge,
  bulletList,
  detailsBlock,
  esc,
  metricCards,
  pct,
  section,
  table,
} from './layout.js';

// ── Fundamentals ──

export function renderFundamentals(fundamentals: FundamentalAnalysis[]): string {
  if (fundamentals.length === 0) return '';

  const rows = fundamentals.map((f) => [
    esc(f.ticker),
    f.metrics.revenue.toLocaleString(),
    pct(f.metrics.operatingMargin),
    pct(f.metrics.netMargin),
    f.metrics.PE.toFixed(1),
    f.metrics.PB.toFixed(1),
    pct(f.metrics.ROE),
    f.metrics.debtToEquity.toFixed(2),
  ]);

  const metricsTable = table(
    ['티커', '매출', '영업이익률', '순이익률', 'PE', 'PB', 'ROE', 'D/E'],
    rows,
  );

  const details = fundamentals
    .map((f) => {
      const parts = [
        `<h3>${esc(f.ticker)}</h3>`,
        `<p><strong>성장 트렌드:</strong> ${esc(f.growthTrend)}</p>`,
        `<p><strong>분기별 변화:</strong> ${esc(f.quarterlyChanges)}</p>`,
        f.redFlags.length > 0
          ? `<p><strong>레드 플래그:</strong></p>${bulletList(f.redFlags)}`
          : '',
        `<p><strong>메모:</strong> ${esc(f.memo)}</p>`,
      ];
      return parts.join('\n');
    })
    .join('\n');

  return section('펀더멘털 분석', metricsTable + details);
}

// ── News ──

export function renderNewsAnalyses(newsAnalyses: NewsAnalysis[]): string {
  if (newsAnalyses.length === 0) return '';

  const content = newsAnalyses
    .map((n) => {
      const timelineRows = n.eventTimeline.map((e) => [
        esc(e.date),
        esc(e.headline),
        esc(e.impact),
      ]);
      const timelineHtml = table(['날짜', '헤드라인', '영향'], timelineRows);

      return [
        `<h3>${esc(n.ticker)}</h3>`,
        `<p><strong>센티먼트:</strong> ${esc(n.sentimentSummary)}</p>`,
        timelineHtml,
        n.catalysts.length > 0 ? `<p><strong>촉매:</strong></p>${bulletList(n.catalysts)}` : '',
        n.risks.length > 0 ? `<p><strong>리스크:</strong></p>${bulletList(n.risks)}` : '',
      ].join('\n');
    })
    .join('\n');

  return section('뉴스 분석', content);
}

// ── Critic ──

export function renderCriticReport(critic: CriticReport): string {
  const verdictBadge = badge(critic.verdict, critic.verdict);
  const cards = metricCards([{ label: '판정', value: critic.verdict.toUpperCase() }]);

  const content = [
    cards,
    `<p><strong>판정:</strong> ${verdictBadge}</p>`,
    `<p><strong>과적합 리스크:</strong> ${esc(critic.overfittingRisk)}</p>`,
    `<p><strong>데이터 누수:</strong> ${esc(critic.dataLeakageCheck)}</p>`,
    `<p><strong>생존 편향:</strong> ${esc(critic.survivorshipBias)}</p>`,
    `<p><strong>체제 의존성:</strong> ${esc(critic.regimeDependency)}</p>`,
    critic.recommendations.length > 0
      ? `<p><strong>권고사항:</strong></p>${bulletList(critic.recommendations)}`
      : '',
  ].join('\n');

  return section('Critic 리포트', content);
}

// ── Scenario Definition ──

export function renderScenarioDefinition(definition: ScenarioDefinition): string {
  const varRows = definition.variables.map((v) => [
    esc(v.name),
    esc(v.baseline),
    esc(v.scenario),
    badge(v.direction, v.direction),
  ]);
  const varTable = table(['변수', '기준값', '시나리오값', '방향'], varRows);

  const content = [
    `<p><strong>설명:</strong> ${esc(definition.description)}</p>`,
    `<p><strong>시간 범위:</strong> ${esc(definition.timeHorizon)}</p>`,
    `<p><strong>대상 종목:</strong> ${definition.affectedTickers.map((t) => esc(t)).join(', ')}</p>`,
    varTable,
    definition.assumptions.length > 0
      ? `<p><strong>가정:</strong></p>${bulletList(definition.assumptions)}`
      : '',
  ].join('\n');

  return section('시나리오 정의', content);
}

// ── Scenario Projections ──

export function renderScenarioProjections(projections: ScenarioProjection[]): string {
  if (projections.length === 0) return '';

  const rows = projections.map((p) => [
    esc(p.ticker),
    badge(p.fundamentalImpact.direction, p.fundamentalImpact.direction),
    badge(p.fundamentalImpact.magnitude, p.fundamentalImpact.magnitude),
    esc(p.fundamentalImpact.rationale),
    badge(p.newsContext.expectedSentiment, p.newsContext.expectedSentiment),
  ]);

  const projTable = table(['티커', '영향 방향', '크기', '근거', '예상 센티먼트'], rows);

  const detailContent = projections
    .map((p) => {
      return [
        `<h3>${esc(p.ticker)}</h3>`,
        `<p><strong>영향 메트릭:</strong> ${p.fundamentalImpact.affectedMetrics.map((m) => esc(m)).join(', ')}</p>`,
        p.newsContext.likelyCatalysts.length > 0
          ? `<p><strong>예상 촉매:</strong></p>${bulletList(p.newsContext.likelyCatalysts)}`
          : '',
      ].join('\n');
    })
    .join('\n');

  return section('종목별 영향 전망', projTable + detailContent);
}

// ── Scenario Assessment ──

export function renderAssessment(report: ScenarioReport): string {
  const confidenceBadge = badge(report.confidence, report.confidence);

  const content = [
    `<p><strong>시나리오:</strong> ${esc(report.scenarioName)}</p>`,
    `<p><strong>신뢰도:</strong> ${confidenceBadge}</p>`,
    `<div class="assessment-box">${esc(report.overallAssessment)}</div>`,
    report.keyRisks.length > 0
      ? `<p><strong>핵심 리스크:</strong></p>${bulletList(report.keyRisks)}`
      : '',
    report.recommendations.length > 0
      ? `<p><strong>권고사항:</strong></p>${bulletList(report.recommendations)}`
      : '',
    `<p class="meta"><em>${esc(report.disclaimer)}</em></p>`,
  ].join('\n');

  return section('종합 평가', content);
}

// ── Strategy ──

export function renderStrategy(strategy: StrategyDefinition): string {
  const content = [
    `<p><strong>전략명:</strong> ${esc(strategy.name)}</p>`,
    `<p><strong>가설:</strong> ${esc(strategy.hypothesis)}</p>`,
    `<p><strong>진입 규칙:</strong></p>${bulletList(strategy.entryRules)}`,
    `<p><strong>청산 규칙:</strong></p>${bulletList(strategy.exitRules)}`,
    `<p><strong>포지션 사이징:</strong> ${esc(strategy.positionSizing)}</p>`,
    `<p><strong>리밸런싱 주기:</strong> ${esc(strategy.rebalancePeriod)}</p>`,
  ].join('\n');

  return section('전략 정의', content);
}

// ── Backtest KPIs ──

export function renderBacktestKPIs(result: BacktestResult): string {
  const cards = metricCards([
    { label: 'CAGR', value: pct(result.cagr) },
    { label: 'MDD', value: pct(result.mdd) },
    { label: 'Sharpe', value: result.sharpe.toFixed(2) },
    { label: 'Turnover', value: pct(result.turnover) },
  ]);

  const errorContent =
    result.errorLog.length > 0
      ? `<p><strong>에러 로그:</strong></p>${bulletList(result.errorLog)}`
      : '';

  return section('백테스트 성과', cards + errorContent);
}

// ── Trade Log ──

const TRADE_LOG_FOLD_THRESHOLD = 50;

export function renderTradeLog(tradeLog: BacktestResult['tradeLog']): string {
  if (tradeLog.length === 0) {
    return section('거래 내역', '<p>거래 내역이 없습니다.</p>');
  }

  const rows = tradeLog.map((t) => [
    esc(t.date),
    esc(t.ticker),
    esc(t.action),
    t.price.toLocaleString(),
    t.quantity.toString(),
  ]);

  const tradeTable = table(['날짜', '티커', '액션', '가격', '수량'], rows);

  if (tradeLog.length > TRADE_LOG_FOLD_THRESHOLD) {
    return section('거래 내역', detailsBlock(`거래 ${tradeLog.length}건 보기`, tradeTable));
  }

  return section('거래 내역', tradeTable);
}
