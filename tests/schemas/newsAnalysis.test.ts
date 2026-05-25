import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { NewsAnalysisSchema } from '../../src/schemas/analysis.js';

describe('NewsAnalysisSchema', () => {
  it('accepts existing news analysis JSON without sources', () => {
    expect(
      Value.Check(NewsAnalysisSchema, {
        ticker: '005930',
        eventTimeline: [
          {
            date: '2026-05-24',
            headline: '삼성전자 HBM 공급 기대',
            impact: '긍정: AI 수요 확대',
          },
        ],
        sentimentSummary: '우호적',
        catalysts: ['HBM 수요'],
        risks: ['메모리 가격 변동성'],
      }),
    ).toBe(true);
  });

  it('accepts Naver browser source metadata', () => {
    expect(
      Value.Check(NewsAnalysisSchema, {
        ticker: '005930',
        eventTimeline: [
          {
            date: '2026-05-24',
            headline: '삼성전자 HBM 공급 기대',
            impact: '긍정: AI 수요 확대',
          },
        ],
        sentimentSummary: '우호적',
        catalysts: ['HBM 수요'],
        risks: ['메모리 가격 변동성'],
        sources: [
          {
            title: '삼성전자 HBM 공급 기대',
            url: 'https://n.news.naver.com/article/001/0000000001',
            publisher: '연합뉴스',
            publishedAt: '2026.05.24',
            topic: 'company-analysis',
            sourceUrl: 'https://stock.naver.com/news/section?tab=company-analysis',
          },
        ],
      }),
    ).toBe(true);
  });
});
