import { runOpenApiCli } from '../cli.js';
import type { CliExecutionResult, JsonValue } from '../types.js';

type Signal = AbortSignal | undefined;

type PriceHistoryRow = Record<string, JsonValue>;

const MAX_KIS_CONCURRENCY = 2;
const MAX_DAILY_WINDOW_DAYS = 120;

function parseYyyymmdd(value: string): Date {
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(4, 6), 10) - 1;
  const day = Number.parseInt(value.slice(6, 8), 10);
  return new Date(Date.UTC(year, month, day));
}

function formatYyyymmdd(value: Date): string {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${value.getUTCDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function splitDailyDateRange(
  startDate: string,
  endDate: string,
): Array<{ startDate: string; endDate: string }> {
  const ranges: Array<{ startDate: string; endDate: string }> = [];
  let cursor = parseYyyymmdd(startDate);
  const end = parseYyyymmdd(endDate);

  while (cursor <= end) {
    const windowEnd = addUtcDays(cursor, MAX_DAILY_WINDOW_DAYS - 1);
    const boundedEnd = windowEnd <= end ? windowEnd : end;
    ranges.push({ startDate: formatYyyymmdd(cursor), endDate: formatYyyymmdd(boundedEnd) });
    cursor = addUtcDays(boundedEnd, 1);
  }

  return ranges;
}

async function runInBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize = MAX_KIS_CONCURRENCY,
): Promise<T[]> {
  const results: T[] = [];

  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = tasks.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map((task) => task()))));
  }

  return results;
}

function buildPriceHistoryCommand(params: {
  stockCode: string;
  startDate: string;
  endDate: string;
  market?: 'J' | 'NX' | 'UN';
  period?: 'D' | 'W' | 'M' | 'Y';
  adjPrice?: '0' | '1';
}) {
  return {
    broker: 'kis' as const,
    category: 'chart' as const,
    name: 'period' as const,
    params: {
      stock_code: params.stockCode,
      start_date: params.startDate,
      end_date: params.endDate,
      market: params.market,
      period: params.period,
      adj_price: params.adjPrice,
    },
  };
}

type FinancialSectionName =
  | 'income_statement'
  | 'balance_sheet'
  | 'ratio'
  | 'growth'
  | 'profitability'
  | 'stability';
type FinancialSectionPayload = { data?: PriceHistoryRow[] };
type FinancialBundle = Record<FinancialSectionName, FinancialSectionPayload>;

const FINANCIAL_SECTION_NAMES: FinancialSectionName[] = [
  'income_statement',
  'balance_sheet',
  'ratio',
  'growth',
  'profitability',
  'stability',
];

function extractPeriod(row: PriceHistoryRow): string | undefined {
  return typeof row.stac_yymm === 'string' ? row.stac_yymm : undefined;
}

function getSectionRows(bundle: FinancialBundle, section: FinancialSectionName): PriceHistoryRow[] {
  return Array.isArray(bundle[section]?.data) ? bundle[section].data : [];
}

function uniquePeriods(rows: PriceHistoryRow[]): string[] {
  return Array.from(
    new Set(rows.map(extractPeriod).filter((value): value is string => Boolean(value))),
  );
}

function filterAnnualPeriods(periods: string[]): string[] {
  return periods.filter((period) => period.endsWith('12'));
}

function countPeriodsBySection(
  bundle: FinancialBundle,
  annualOnly: boolean,
): Record<string, JsonValue> {
  return Object.fromEntries(
    FINANCIAL_SECTION_NAMES.map((section) => {
      const periods = uniquePeriods(getSectionRows(bundle, section));
      return [section, annualOnly ? filterAnnualPeriods(periods).length : periods.length];
    }),
  );
}

function pickRowsByPeriods(rows: PriceHistoryRow[], periods: string[]): PriceHistoryRow[] {
  const byPeriod = new Map(rows.map((row) => [extractPeriod(row), row]));
  return periods
    .map((period) => byPeriod.get(period))
    .filter((row): row is PriceHistoryRow => Boolean(row));
}

function selectFinancialBundle(bundle: FinancialBundle, periods: string[]): FinancialBundle {
  return Object.fromEntries(
    FINANCIAL_SECTION_NAMES.map((section) => [
      section,
      { data: pickRowsByPeriods(getSectionRows(bundle, section), periods) },
    ]),
  ) as FinancialBundle;
}

function buildMissingPeriodsBySection(
  bundle: FinancialBundle,
  periods: string[],
): Record<string, JsonValue> {
  return Object.fromEntries(
    FINANCIAL_SECTION_NAMES.map((section) => {
      const available = new Set(uniquePeriods(getSectionRows(bundle, section)));
      const missing = periods.filter((period) => !available.has(period));
      return [section, missing];
    }),
  );
}

export function getCurrentPrice(
  params: {
    stockCode: string;
    market?: 'J' | 'NX' | 'UN';
  },
  signal?: Signal,
) {
  return runOpenApiCli(
    {
      broker: 'kis',
      category: 'stock',
      name: 'current-price',
      params: {
        stock_code: params.stockCode,
        market: params.market,
      },
    },
    signal,
  );
}

export async function getPriceHistory(
  params: {
    stockCode: string;
    startDate: string;
    endDate: string;
    market?: 'J' | 'NX' | 'UN';
    period?: 'D' | 'W' | 'M' | 'Y';
    adjPrice?: '0' | '1';
  },
  signal?: Signal,
): Promise<CliExecutionResult> {
  const period = params.period ?? 'D';
  const ranges =
    period === 'D'
      ? splitDailyDateRange(params.startDate, params.endDate)
      : [{ startDate: params.startDate, endDate: params.endDate }];

  if (ranges.length === 1) {
    return runOpenApiCli(buildPriceHistoryCommand(params), signal);
  }

  const results = await runInBatches(
    ranges.map(
      (range) => () =>
        runOpenApiCli(
          buildPriceHistoryCommand({
            ...params,
            startDate: range.startDate,
            endDate: range.endDate,
          }),
          signal,
        ),
    ),
  );

  const latest = results.at(-1) ?? results[0];
  const mergedRows = new Map<string, PriceHistoryRow>();

  for (const result of results) {
    const payload = result.data as { data?: PriceHistoryRow[] };
    for (const row of payload.data ?? []) {
      const date = typeof row.stck_bsop_date === 'string' ? row.stck_bsop_date : undefined;
      if (date) mergedRows.set(date, row);
    }
  }

  const data = Array.from(mergedRows.values()).sort((left, right) => {
    const leftDate = typeof left.stck_bsop_date === 'string' ? left.stck_bsop_date : '';
    const rightDate = typeof right.stck_bsop_date === 'string' ? right.stck_bsop_date : '';
    return rightDate.localeCompare(leftDate);
  });
  const stderr =
    results
      .map((result) => result.stderr)
      .filter((value): value is string => Boolean(value))
      .join('\n') || undefined;
  const latestPayload = latest.data as { stock_code?: string; summary?: JsonValue };
  const mergedPayload: Record<string, JsonValue> = {
    stock_code: latestPayload.stock_code ?? params.stockCode,
    data,
  };

  if (latestPayload.summary !== undefined) {
    mergedPayload.summary = latestPayload.summary;
  }

  return {
    command: ['uv', 'run', 'cluefin-openapi-cli', 'kis', 'chart', 'period', '<chunked>', '--json'],
    cwd: latest.cwd,
    data: mergedPayload,
    stderr,
  };
}

export async function getFinancials(
  params: {
    stockCode: string;
    market?: string;
    divClsCode?: '0' | '1';
  },
  signal?: Signal,
): Promise<CliExecutionResult> {
  const commonParams = {
    stock_code: params.stockCode,
    market: params.market,
    div_cls_code: params.divClsCode,
  };

  const [incomeStatement, balanceSheet, ratio, growth, profitability, stability] =
    await runInBatches([
      () =>
        runOpenApiCli(
          { broker: 'kis', category: 'financial', name: 'income-statement', params: commonParams },
          signal,
        ),
      () =>
        runOpenApiCli(
          { broker: 'kis', category: 'financial', name: 'balance-sheet', params: commonParams },
          signal,
        ),
      () =>
        runOpenApiCli(
          { broker: 'kis', category: 'financial', name: 'ratio', params: commonParams },
          signal,
        ),
      () =>
        runOpenApiCli(
          { broker: 'kis', category: 'financial', name: 'growth', params: commonParams },
          signal,
        ),
      () =>
        runOpenApiCli(
          { broker: 'kis', category: 'financial', name: 'profitability', params: commonParams },
          signal,
        ),
      () =>
        runOpenApiCli(
          { broker: 'kis', category: 'financial', name: 'stability', params: commonParams },
          signal,
        ),
    ]);

  return {
    command: ['uv', 'run', 'cluefin-openapi-cli', 'kis', 'financial', '<bundle>', '--json'],
    cwd: incomeStatement.cwd,
    data: {
      income_statement: incomeStatement.data,
      balance_sheet: balanceSheet.data,
      ratio: ratio.data,
      growth: growth.data,
      profitability: profitability.data,
      stability: stability.data,
    } satisfies Record<string, JsonValue>,
    stderr:
      [
        incomeStatement.stderr,
        balanceSheet.stderr,
        ratio.stderr,
        growth.stderr,
        profitability.stderr,
        stability.stderr,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n') || undefined,
  };
}

export async function getFinancialsWindowed(
  params: {
    stockCode: string;
    market?: string;
  },
  signal?: Signal,
): Promise<CliExecutionResult> {
  const annualResult = await getFinancials({ ...params, divClsCode: '0' }, signal);
  const annualBundle = annualResult.data as FinancialBundle;
  const annualPeriods = filterAnnualPeriods(
    uniquePeriods(getSectionRows(annualBundle, 'income_statement')),
  ).slice(0, 5);
  const annualCounts = countPeriodsBySection(annualBundle, true);
  const hasFiveAnnualYears =
    annualPeriods.length >= 5 &&
    FINANCIAL_SECTION_NAMES.every((section) => Number(annualCounts[section] ?? 0) >= 5);

  if (hasFiveAnnualYears) {
    const selected = selectFinancialBundle(annualBundle, annualPeriods);
    return {
      command: ['uv', 'run', 'cluefin-openapi-cli', 'kis', 'financial', '<windowed>', '--json'],
      cwd: annualResult.cwd,
      data: {
        basis: 'annual-5y',
        source_div_cls_code: '0',
        selected_periods: annualPeriods,
        selected_count: annualPeriods.length,
        annual_available_counts: annualCounts,
        fallback_used: false,
        missing_periods_by_section: buildMissingPeriodsBySection(annualBundle, annualPeriods),
        selected,
      } satisfies Record<string, JsonValue>,
      stderr: annualResult.stderr,
    };
  }

  const periodResult = await getFinancials({ ...params, divClsCode: '1' }, signal);
  const periodBundle = periodResult.data as FinancialBundle;
  const periodSelection = uniquePeriods(getSectionRows(periodBundle, 'income_statement')).slice(
    0,
    12,
  );
  const periodCounts = countPeriodsBySection(periodBundle, false);
  const selected = selectFinancialBundle(periodBundle, periodSelection);
  const stderr =
    [annualResult.stderr, periodResult.stderr]
      .filter((value): value is string => Boolean(value))
      .join('\n') || undefined;

  return {
    command: ['uv', 'run', 'cluefin-openapi-cli', 'kis', 'financial', '<windowed>', '--json'],
    cwd: periodResult.cwd,
    data: {
      basis: 'period-12',
      source_div_cls_code: '1',
      selected_periods: periodSelection,
      selected_count: periodSelection.length,
      annual_available_counts: annualCounts,
      period_available_counts: periodCounts,
      fallback_used: true,
      fallback_reason: 'annual_data_under_5_years',
      missing_periods_by_section: buildMissingPeriodsBySection(periodBundle, periodSelection),
      selected,
    } satisfies Record<string, JsonValue>,
    stderr,
  };
}

export function getMarketAnnouncement(
  params: {
    stockCode?: string;
    title?: string;
    startDate?: string;
  },
  signal?: Signal,
) {
  return runOpenApiCli(
    {
      broker: 'kis',
      category: 'market',
      name: 'announcement',
      params: {
        stock_code: params.stockCode,
        titl_cntt: params.title,
        start_date: params.startDate,
      },
    },
    signal,
  );
}
