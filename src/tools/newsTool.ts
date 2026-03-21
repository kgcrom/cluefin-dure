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
  '000660': [
    {
      date: '2025-03-15',
      headline: 'SK하이닉스, HBM 증설 투자 확대 검토',
      source: '한국경제',
      sentiment: 'positive',
    },
    {
      date: '2025-03-10',
      headline: 'AI 서버 투자 확대에 HBM 수요 강세 지속',
      source: '매일경제',
      sentiment: 'positive',
    },
    {
      date: '2025-03-05',
      headline: '메모리 가격 단기 변동성 확대 우려',
      source: '전자신문',
      sentiment: 'negative',
    },
    {
      date: '2025-02-28',
      headline: '고객사 재고 조정 종료 기대 확산',
      source: '조선일보',
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
      headline: '파운드리 3나노 수율 50% 돌파, 경쟁력 개선 기대',
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
    const key = ticker ?? Object.keys(MOCK_NEWS)[0] ?? '005930';
    const articles = MOCK_NEWS[key];
    if (!articles) {
      return toolResult(JSON.stringify({ error: `뉴스를 찾을 수 없습니다.` }));
    }
    const result = limit ? articles.slice(0, limit) : articles;
    return toolResult(JSON.stringify({ ticker: key, articles: result }));
  },
};
