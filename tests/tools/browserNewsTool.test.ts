import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentBrowserClient } from '../../src/browser/agentBrowser.js';
import {
  buildNaverDomesticStockNewsUrl,
  buildNaverWorldStockNewsUrl,
  createBrowserNewsSearchTool,
  getNaverStockNewsUrls,
  normalizeBrowserNewsArticles,
} from '../../src/tools/browserNewsTool.js';

const originalCwd = process.cwd();
let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `browser-news-tool-test-${Date.now()}-${Math.random()}`);
  await mkdir(tmpDir, { recursive: true });
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('browserNewsSearchTool', () => {
  it('maps Naver stock news topics to fast source URLs', () => {
    expect(getNaverStockNewsUrls('company-analysis')).toEqual([
      'https://stock.naver.com/news/section?tab=company-analysis',
    ]);
    expect(getNaverStockNewsUrls('all')).toEqual([
      'https://stock.naver.com/news/flashnews',
      'https://stock.naver.com/news/section?tab=company-analysis',
      'https://stock.naver.com/news/section?tab=market-outlook',
    ]);
    expect(getNaverStockNewsUrls('all', { ticker: '203650' })).toEqual([
      'https://stock.naver.com/domestic/stock/203650/news',
    ]);
    expect(buildNaverDomesticStockNewsUrl('203650')).toBe(
      'https://stock.naver.com/domestic/stock/203650/news',
    );
    expect(getNaverStockNewsUrls('all', { ticker: 'AAPL' })).toEqual([
      'https://stock.naver.com/worldstock/stock/AAPL.O/worldnews',
    ]);
    expect(getNaverStockNewsUrls('all', { ticker: 'AAPL.O' })).toEqual([
      'https://stock.naver.com/worldstock/stock/AAPL.O/worldnews',
    ]);
    expect(buildNaverWorldStockNewsUrl('AAPL')).toBe(
      'https://stock.naver.com/worldstock/stock/AAPL.O/worldnews',
    );
    expect(buildNaverWorldStockNewsUrl('AAPL.O')).toBe(
      'https://stock.naver.com/worldstock/stock/AAPL.O/worldnews',
    );
  });

  it('normalizes article URLs, topics, and client-side filters', () => {
    const articles = normalizeBrowserNewsArticles(
      {
        articles: [
          {
            title: '삼성전자 HBM 공급 기대',
            link: '/news/worldnews/123',
            source: '한국경제',
            time: '2026.05.24 09:10',
            summary: 'AI 반도체 수요',
            sourceUrl: 'https://stock.naver.com/news/worldnews',
          },
          {
            title: '원달러 환율 상승',
            url: 'https://n.news.naver.com/article/001/0000000000',
          },
        ],
      },
      {
        topic: 'all',
        sourceUrls: getNaverStockNewsUrls('all'),
        companyName: '삼성전자',
        limit: 10,
      },
    );

    expect(articles).toEqual([
      {
        title: '삼성전자 HBM 공급 기대',
        url: 'https://stock.naver.com/news/worldnews/123',
        publisher: '한국경제',
        publishedAt: '2026.05.24 09:10',
        summary: 'AI 반도체 수요',
        topic: 'worldnews',
        sourceUrl: 'https://stock.naver.com/news/worldnews',
      },
    ]);
  });

  it('does not ticker-filter articles from stock-scoped news pages', () => {
    const domesticArticles = normalizeBrowserNewsArticles(
      {
        articles: [
          {
            title: '美 정부 양자컴 베팅 소식에 테마주 강세',
            url: 'https://n.news.naver.com/article/011/0004623839',
            source: '서울경제',
            date: '2026. 05. 23.',
          },
        ],
      },
      {
        topic: 'all',
        sourceUrls: getNaverStockNewsUrls('all', { ticker: '203650' }),
        ticker: '203650',
        limit: 10,
      },
    );

    expect(domesticArticles).toEqual([
      {
        title: '美 정부 양자컴 베팅 소식에 테마주 강세',
        url: 'https://n.news.naver.com/article/011/0004623839',
        publisher: '서울경제',
        publishedAt: '2026. 05. 23.',
        topic: 'company-analysis',
        sourceUrl: 'https://stock.naver.com/domestic/stock/203650/news',
      },
    ]);

    const worldArticles = normalizeBrowserNewsArticles(
      {
        articles: [
          {
            title: 'AI 투자 확대로 빅테크 실적 기대',
            url: 'https://n.news.naver.com/article/001/0000000002',
            source: '연합뉴스',
            date: '2026. 05. 24.',
          },
        ],
      },
      {
        topic: 'all',
        sourceUrls: getNaverStockNewsUrls('all', { ticker: 'AAPL' }),
        ticker: 'AAPL',
        limit: 10,
      },
    );

    expect(worldArticles).toEqual([
      {
        title: 'AI 투자 확대로 빅테크 실적 기대',
        url: 'https://n.news.naver.com/article/001/0000000002',
        publisher: '연합뉴스',
        publishedAt: '2026. 05. 24.',
        topic: 'worldnews',
        sourceUrl: 'https://stock.naver.com/worldstock/stock/AAPL.O/worldnews',
      },
    ]);
  });

  it('runs agent-browser with Naver topic URL and returns metadata only', async () => {
    const runner = {
      run: vi.fn(async () => ({
        stdout: JSON.stringify({
          articles: [
            {
              title: '삼성전자, AI 수요 확대',
              url: 'https://n.news.naver.com/article/001/0000000001',
              publisher: '연합뉴스',
              publishedAt: '2026.05.24',
            },
          ],
        }),
        stderr: '',
        exitCode: 0,
      })),
    };
    const client = new AgentBrowserClient({ runner, runDoctor: false });
    const tool = createBrowserNewsSearchTool({ client });

    const result = await tool.execute(
      'tool-1',
      {
        topic: 'company-analysis',
        query: '삼성',
        ticker: '005930',
        limit: 1,
        runId: 'run-news-1',
      },
      undefined,
      undefined,
      {} as never,
    );
    const payload = JSON.parse(result.content[0].text);

    expect(runner.run.mock.calls[0]?.[0].args.join('\n')).toContain(
      'https://stock.naver.com/domestic/stock/005930/news',
    );
    expect(payload).toMatchObject({
      source: 'naver-stock-news',
      topic: 'company-analysis',
      articles: [
        {
          title: '삼성전자, AI 수요 확대',
          publisher: '연합뉴스',
          topic: 'company-analysis',
        },
      ],
    });
    expect(payload.artifactPath).toContain('data/runs/run-news-1/news/005930/browser');
    expect(JSON.stringify(payload)).not.toContain('article body');
  });

  it('runs agent-browser with Naver worldstock URL for overseas tickers', async () => {
    const runner = {
      run: vi.fn(async () => ({
        stdout: JSON.stringify({
          articles: [
            {
              title: '애플, AI 투자 확대 기대',
              url: 'https://n.news.naver.com/article/001/0000000003',
              publisher: '연합뉴스',
              publishedAt: '2026.05.24',
            },
          ],
        }),
        stderr: '',
        exitCode: 0,
      })),
    };
    const client = new AgentBrowserClient({ runner, runDoctor: false });
    const tool = createBrowserNewsSearchTool({ client });

    const result = await tool.execute(
      'tool-2',
      {
        topic: 'worldnews',
        ticker: 'AAPL',
        limit: 1,
        runId: 'run-news-2',
      },
      undefined,
      undefined,
      {} as never,
    );
    const payload = JSON.parse(result.content[0].text);

    expect(runner.run.mock.calls[0]?.[0].args.join('\n')).toContain(
      'https://stock.naver.com/worldstock/stock/AAPL.O/worldnews',
    );
    expect(payload).toMatchObject({
      source: 'naver-stock-news',
      topic: 'worldnews',
      sourceUrls: ['https://stock.naver.com/worldstock/stock/AAPL.O/worldnews'],
      articles: [
        {
          title: '애플, AI 투자 확대 기대',
          publisher: '연합뉴스',
          topic: 'worldnews',
          sourceUrl: 'https://stock.naver.com/worldstock/stock/AAPL.O/worldnews',
        },
      ],
    });
    expect(payload.artifactPath).toContain('data/runs/run-news-2/news/AAPL/browser');
  });
});
