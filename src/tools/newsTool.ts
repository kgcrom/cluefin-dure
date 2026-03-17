import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { toolResult } from './_helpers.js';

const parameters = Type.Object({
  query: Type.String({ description: '검색 쿼리' }),
  ticker: Type.Optional(Type.String({ description: '관련 종목 코드' })),
  dateRange: Type.Optional(Type.String({ description: '날짜 범위 (예: 2024-01-01~2024-12-31)' })),
  limit: Type.Optional(Type.Number({ description: '최대 결과 수' })),
});

type Params = Static<typeof parameters>;

const MOCK_NEWS: Record<string, unknown[]> = {
  AAPL: [
    {
      date: '2025-03-15',
      headline: 'Apple, AI 기반 Siri 대규모 업데이트 발표',
      source: 'Reuters',
      sentiment: 'positive',
    },
    {
      date: '2025-03-10',
      headline: 'iPhone 17 시리즈 사전 주문 역대 최고 기록',
      source: 'Bloomberg',
      sentiment: 'positive',
    },
    {
      date: '2025-03-05',
      headline: 'EU, Apple에 대한 추가 반독점 조사 착수',
      source: 'FT',
      sentiment: 'negative',
    },
    {
      date: '2025-02-28',
      headline: 'Apple Vision Pro 2세대 개발 보도',
      source: 'The Verge',
      sentiment: 'neutral',
    },
  ],
  '005930': [
    {
      date: '2025-03-14',
      headline: '삼성전자, HBM4 양산 시작 — 엔비디아 공급 계약 확보',
      source: '한국경제',
      sentiment: 'positive',
    },
    {
      date: '2025-03-12',
      headline: '갤럭시 S25 울트라 판매 호조, 전작 대비 15% 증가',
      source: '조선일보',
      sentiment: 'positive',
    },
    {
      date: '2025-03-08',
      headline: '파운드리 3나노 수율 50% 돌파, TSMC와 격차 축소',
      source: '매일경제',
      sentiment: 'positive',
    },
    {
      date: '2025-03-01',
      headline: '글로벌 메모리 가격 하락 전환, 1분기 실적 우려',
      source: '전자신문',
      sentiment: 'negative',
    },
  ],
};

export const newsTool: ToolDefinition<typeof parameters> = {
  name: 'news_search',
  label: '뉴스 검색',
  description:
    '종목 또는 주제 관련 뉴스를 검색합니다. 최근 뉴스, 이벤트, 시장 센티먼트를 파악하는 데 사용하세요.',
  parameters,
  async execute(_toolCallId, params: Params) {
    const { ticker, limit } = params;
    const key = ticker ?? Object.keys(MOCK_NEWS)[0] ?? 'AAPL';
    const articles = MOCK_NEWS[key];
    if (!articles) {
      return toolResult(JSON.stringify({ error: `뉴스를 찾을 수 없습니다.` }));
    }
    const result = limit ? articles.slice(0, limit) : articles;
    return toolResult(JSON.stringify({ ticker: key, articles: result }));
  },
};
