import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { AgentBrowserClient } from '../browser/agentBrowser.js';
import { saveBrowserTextArtifact } from '../runtime/browserArtifacts.js';
import { toolResult } from './_helpers.js';

export const NAVER_STOCK_NEWS_BASE_URL = 'https://stock.naver.com/news';
export const NAVER_DOMESTIC_STOCK_BASE_URL = 'https://stock.naver.com/domestic/stock';
export const NAVER_WORLD_STOCK_BASE_URL = 'https://stock.naver.com/worldstock/stock';

export const NAVER_STOCK_NEWS_TOPIC_URLS = {
  flashnews: `${NAVER_STOCK_NEWS_BASE_URL}/flashnews`,
  mainnews: `${NAVER_STOCK_NEWS_BASE_URL}/mainnews`,
  ranknews: `${NAVER_STOCK_NEWS_BASE_URL}/ranknews`,
  worldnews: `${NAVER_STOCK_NEWS_BASE_URL}/worldnews`,
  'market-outlook': `${NAVER_STOCK_NEWS_BASE_URL}/section?tab=market-outlook`,
  'company-analysis': `${NAVER_STOCK_NEWS_BASE_URL}/section?tab=company-analysis`,
  'global-market': `${NAVER_STOCK_NEWS_BASE_URL}/section?tab=global-market`,
  'bond-futures': `${NAVER_STOCK_NEWS_BASE_URL}/section?tab=bond-futures`,
  'disclosure-memo': `${NAVER_STOCK_NEWS_BASE_URL}/section?tab=disclosure-memo`,
  'exchange-rate': `${NAVER_STOCK_NEWS_BASE_URL}/section?tab=exchange-rate`,
  marketNotice: `${NAVER_STOCK_NEWS_BASE_URL}/marketNotice`,
} as const;

export const NAVER_STOCK_NEWS_TOPICS = [
  'flashnews',
  'mainnews',
  'ranknews',
  'worldnews',
  'market-outlook',
  'company-analysis',
  'global-market',
  'bond-futures',
  'disclosure-memo',
  'exchange-rate',
  'marketNotice',
  'all',
] as const;

export type NaverStockNewsTopic = (typeof NAVER_STOCK_NEWS_TOPICS)[number];

export interface BrowserNewsArticle {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
  summary?: string;
  topic: Exclude<NaverStockNewsTopic, 'all'>;
  sourceUrl: string;
}

export interface BrowserNewsSearchResult {
  source: 'naver-stock-news';
  topic: NaverStockNewsTopic;
  sourceUrls: string[];
  articles: BrowserNewsArticle[];
  artifactPath?: string;
  error?: unknown;
}

type RawBrowserArticle = {
  title?: unknown;
  headline?: unknown;
  url?: unknown;
  link?: unknown;
  publisher?: unknown;
  source?: unknown;
  publishedAt?: unknown;
  date?: unknown;
  time?: unknown;
  summary?: unknown;
  topic?: unknown;
  sourceUrl?: unknown;
};

const topicType = Type.Unsafe<NaverStockNewsTopic>({
  type: 'string',
  enum: [...NAVER_STOCK_NEWS_TOPICS],
  description:
    'Naver 증권 뉴스 주제. all은 빠른 기본 묶음(flashnews, company-analysis, market-outlook)을 탐색합니다.',
});

const parameters = Type.Object({
  topic: Type.Optional(topicType),
  query: Type.Optional(Type.String({ description: '추출 결과에서 필터링할 키워드' })),
  ticker: Type.Optional(
    Type.String({
      description:
        '관련 종목 코드. 6자리 국내 종목 코드는 국내 종목별 뉴스, 해외 종목 코드는 worldstock 뉴스 페이지와 artifact 경로에 사용',
    }),
  ),
  companyName: Type.Optional(Type.String({ description: '관련 회사명. 추출 결과 필터에 사용' })),
  limit: Type.Optional(Type.Number({ description: '최대 기사 수 (기본: 20)' })),
  runId: Type.Optional(Type.String({ description: 'artifact를 저장할 run ID' })),
});

type Params = Static<typeof parameters>;

export interface BrowserNewsToolOptions {
  client?: AgentBrowserClient;
}

export function createBrowserNewsSearchTool(
  options: BrowserNewsToolOptions = {},
): ToolDefinition<typeof parameters> {
  const client = options.client ?? new AgentBrowserClient();
  return {
    name: 'browser_news_search',
    label: 'Naver 증권 뉴스 브라우저 검색',
    description:
      'Naver 증권 뉴스 주제별 페이지, 국내 종목별 뉴스, 해외 worldstock 종목별 뉴스 페이지를 agent-browser로 열어 최신 기사 목록을 수집합니다. 뉴스 원문 전체가 아니라 출처/링크/메타데이터를 반환합니다.',
    parameters,
    async execute(_toolCallId, params: Params, signal) {
      const topic = params.topic ?? 'all';
      const sourceUrls = getNaverStockNewsUrls(topic, { ticker: params.ticker });
      const browserResult = await client.runTask({
        instruction: buildNaverStockNewsInstruction({ ...params, topic, sourceUrls }),
        sessionNameSeed: `naver-stock-news-${topic}-${params.ticker ?? params.companyName ?? params.query ?? 'latest'}`,
        signal,
      });

      if (!browserResult.ok) {
        return toolResult(
          JSON.stringify({
            source: 'naver-stock-news',
            topic,
            sourceUrls,
            articles: [],
            error: browserResult.error,
          } satisfies BrowserNewsSearchResult),
        );
      }

      const parsed = parseBrowserNewsStdout(browserResult.stdout);
      const articles = normalizeBrowserNewsArticles(parsed, {
        topic,
        sourceUrls,
        query: params.query,
        ticker: params.ticker,
        companyName: params.companyName,
        limit: params.limit ?? 20,
      });
      const result: BrowserNewsSearchResult = {
        source: 'naver-stock-news',
        topic,
        sourceUrls,
        articles,
      };

      if (params.runId) {
        const artifact = await saveBrowserTextArtifact({
          runId: params.runId,
          scope: 'news',
          ticker: params.ticker ?? params.companyName ?? 'unknown',
          fileName: `naver-stock-news-${topic}.json`,
          contentType: 'application/json',
          text: JSON.stringify(result, null, 2),
        });
        result.artifactPath = artifact.path;
      }

      return toolResult(JSON.stringify(result));
    },
  };
}

export const browserNewsSearchTool = createBrowserNewsSearchTool();

export function buildNaverDomesticStockNewsUrl(ticker: string): string {
  return `${NAVER_DOMESTIC_STOCK_BASE_URL}/${ticker}/news`;
}

export function buildNaverWorldStockNewsUrl(ticker: string): string {
  return `${NAVER_WORLD_STOCK_BASE_URL}/${stripWorldStockSuffix(ticker)}.O/worldnews`;
}

export function getNaverStockNewsUrls(
  topic: NaverStockNewsTopic,
  input: { ticker?: string } = {},
): string[] {
  const koreanTicker = normalizeKoreanTicker(input.ticker);
  if (koreanTicker) return [buildNaverDomesticStockNewsUrl(koreanTicker)];

  const worldTicker = normalizeWorldStockTicker(input.ticker);
  if (worldTicker) return [buildNaverWorldStockNewsUrl(worldTicker)];

  if (topic === 'all') {
    return [
      NAVER_STOCK_NEWS_TOPIC_URLS.flashnews,
      NAVER_STOCK_NEWS_TOPIC_URLS['company-analysis'],
      NAVER_STOCK_NEWS_TOPIC_URLS['market-outlook'],
    ];
  }
  return [NAVER_STOCK_NEWS_TOPIC_URLS[topic]];
}

export function normalizeBrowserNewsArticles(
  payload: unknown,
  context: {
    topic: NaverStockNewsTopic;
    sourceUrls: string[];
    query?: string;
    ticker?: string;
    companyName?: string;
    limit: number;
  },
): BrowserNewsArticle[] {
  const rawArticles = extractRawArticles(payload);
  const filters = buildNewsFilters(context);

  return rawArticles
    .map((article, index) => normalizeBrowserNewsArticle(article, context, index))
    .filter((article): article is BrowserNewsArticle => article !== undefined)
    .filter((article) => matchesNewsFilters(article, filters))
    .slice(0, context.limit);
}

export function buildNaverStockNewsInstruction(input: {
  topic: NaverStockNewsTopic;
  sourceUrls: string[];
  query?: string;
  ticker?: string;
  companyName?: string;
  limit?: number;
}): string {
  return [
    'Open Naver Stock News pages and extract article metadata as JSON.',
    `Source URLs: ${input.sourceUrls.join(', ')}`,
    `Topic: ${input.topic}`,
    input.query ? `Filter keyword: ${input.query}` : '',
    input.ticker ? `Ticker: ${input.ticker}` : '',
    input.companyName ? `Company: ${input.companyName}` : '',
    `Limit: ${input.limit ?? 20}`,
    'If a source URL is /domestic/stock/{ticker}/news or /worldstock/stock/{ticker}.O/worldnews, treat the page as already scoped to that company.',
    'Return only JSON: {"articles":[{"title":"","url":"","publisher":"","publishedAt":"","summary":"","topic":"","sourceUrl":""}]}',
    'Do not include article body text.',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseBrowserNewsStdout(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    return { articles: [] };
  }
}

function extractRawArticles(payload: unknown): RawBrowserArticle[] {
  if (Array.isArray(payload)) return payload as RawBrowserArticle[];
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { articles?: unknown }).articles)
  ) {
    return (payload as { articles: RawBrowserArticle[] }).articles;
  }
  return [];
}

function normalizeBrowserNewsArticle(
  article: RawBrowserArticle,
  context: {
    topic: NaverStockNewsTopic;
    sourceUrls: string[];
  },
  index: number,
): BrowserNewsArticle | undefined {
  const title = stringValue(article.title) ?? stringValue(article.headline);
  const rawUrl = stringValue(article.url) ?? stringValue(article.link);
  if (!title || !rawUrl) return undefined;

  const topic =
    normalizeTopic(stringValue(article.topic)) ??
    topicFromSourceUrl(
      stringValue(article.sourceUrl) ?? context.sourceUrls[index] ?? context.sourceUrls[0],
    ) ??
    (context.topic === 'all' ? 'flashnews' : context.topic);
  const sourceUrl =
    stringValue(article.sourceUrl) ??
    context.sourceUrls[index] ??
    context.sourceUrls[0] ??
    NAVER_STOCK_NEWS_TOPIC_URLS[topic];

  return {
    title,
    url: normalizeNaverNewsUrl(rawUrl),
    publisher: stringValue(article.publisher) ?? stringValue(article.source),
    publishedAt:
      stringValue(article.publishedAt) ?? stringValue(article.date) ?? stringValue(article.time),
    summary: stringValue(article.summary),
    topic,
    sourceUrl,
  };
}

function buildNewsFilters(context: {
  sourceUrls: string[];
  query?: string;
  ticker?: string;
  companyName?: string;
}): string[] {
  const values = isStockSpecificNewsSource(context.sourceUrls, context.ticker)
    ? [context.query]
    : [context.query, context.ticker, context.companyName];

  return values
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
}

function matchesNewsFilters(article: BrowserNewsArticle, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const haystack = [article.title, article.summary, article.publisher]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  return filters.some((filter) => haystack.includes(filter));
}

function normalizeNaverNewsUrl(url: string): string {
  return new URL(url, NAVER_STOCK_NEWS_BASE_URL).href;
}

function normalizeTopic(
  value: string | undefined,
): Exclude<NaverStockNewsTopic, 'all'> | undefined {
  if (!value || value === 'all') return undefined;
  return value in NAVER_STOCK_NEWS_TOPIC_URLS
    ? (value as Exclude<NaverStockNewsTopic, 'all'>)
    : undefined;
}

function topicFromSourceUrl(
  sourceUrl: string | undefined,
): Exclude<NaverStockNewsTopic, 'all'> | undefined {
  if (!sourceUrl) return undefined;
  if (isDomesticStockNewsUrl(sourceUrl)) return 'company-analysis';
  if (isWorldStockNewsUrl(sourceUrl)) return 'worldnews';
  const found = Object.entries(NAVER_STOCK_NEWS_TOPIC_URLS).find(([, url]) => url === sourceUrl);
  return found?.[0] as Exclude<NaverStockNewsTopic, 'all'> | undefined;
}

function isStockSpecificNewsSource(sourceUrls: string[], ticker?: string): boolean {
  const koreanTicker = normalizeKoreanTicker(ticker);
  if (koreanTicker) {
    return sourceUrls.some((sourceUrl) =>
      sourceUrl.startsWith(buildNaverDomesticStockNewsUrl(koreanTicker)),
    );
  }

  const worldTicker = normalizeWorldStockTicker(ticker);
  if (worldTicker) {
    return sourceUrls.some((sourceUrl) =>
      sourceUrl.startsWith(buildNaverWorldStockNewsUrl(worldTicker)),
    );
  }

  return sourceUrls.some(
    (sourceUrl) => isDomesticStockNewsUrl(sourceUrl) || isWorldStockNewsUrl(sourceUrl),
  );
}

function isDomesticStockNewsUrl(sourceUrl: string): boolean {
  try {
    const url = new URL(sourceUrl);
    return /^\/domestic\/stock\/\d{6}\/news\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function isWorldStockNewsUrl(sourceUrl: string): boolean {
  try {
    const url = new URL(sourceUrl);
    return /^\/worldstock\/stock\/[A-Z0-9.-]+\.O\/worldnews\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function normalizeKoreanTicker(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /^\d{6}$/.test(trimmed) ? trimmed : undefined;
}

function normalizeWorldStockTicker(value: string | undefined): string | undefined {
  const trimmed = value ? stripWorldStockSuffix(value) : undefined;
  if (!trimmed) return undefined;
  return /^[A-Z][A-Z0-9.-]{0,14}$/.test(trimmed) ? trimmed : undefined;
}

function stripWorldStockSuffix(value: string): string {
  const trimmed = value.trim().toUpperCase();
  return trimmed.endsWith('.O') ? trimmed.slice(0, -2) : trimmed;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
