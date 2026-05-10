import { describe, expect, it } from 'vitest';
import { newsTool } from '../../src/tools/newsTool.js';

describe('newsTool', () => {
  it('ticker와 limit을 적용해 최신 mock 뉴스를 제한한다', async () => {
    const result = await newsTool.execute(
      'tool-1',
      { query: 'HBM', ticker: '005930', limit: 2 },
      undefined,
      undefined,
      {} as never,
    );
    const payload = JSON.parse(result.content[0].text);

    expect(payload.ticker).toBe('005930');
    expect(payload.articles).toHaveLength(2);
    expect(payload.articles[0]).toMatchObject({
      headline: expect.stringContaining('HBM4'),
      sentiment: 'positive',
    });
  });

  it('ticker가 없으면 기본 mock ticker를 사용한다', async () => {
    const result = await newsTool.execute(
      'tool-2',
      { query: 'memory cycle' },
      undefined,
      undefined,
      {} as never,
    );
    const payload = JSON.parse(result.content[0].text);

    expect(payload.ticker).toBe('000660');
    expect(payload.articles.length).toBeGreaterThan(0);
  });

  it('지원하지 않는 ticker는 error payload로 반환한다', async () => {
    const result = await newsTool.execute(
      'tool-3',
      { query: 'unknown', ticker: '999999' },
      undefined,
      undefined,
      {} as never,
    );

    expect(JSON.parse(result.content[0].text)).toEqual({
      error: '뉴스를 찾을 수 없습니다.',
    });
  });
});
