import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import type { RpcMethodSchema } from '../../src/rpc/tool-registry.js';
import { ToolRegistry } from '../../src/rpc/tool-registry.js';
import { JsonRpcRemoteError } from '../../src/rpc/jsonrpc.js';

// StdioJsonRpcClient 모킹
function createMockClient() {
  return {
    request: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
    notify: vi.fn(),
  };
}

const SAMPLE_METHODS: RpcMethodSchema[] = [
  {
    name: 'stock.current_price',
    description: '종목 현재가 조회',
    category: 'stock',
    broker: 'kiwoom',
    parameters: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: '종목코드' },
      },
      required: ['ticker'],
    },
    returns: { type: 'object' },
    requires_session: true,
  },
  {
    name: 'ranking.volume',
    description: '거래량 순위',
    category: 'ranking',
    broker: 'kiwoom',
    parameters: {
      type: 'object',
      properties: {
        market: { type: 'string', description: '시장구분' },
        count: { type: 'integer', description: '조회 건수' },
      },
      required: ['market'],
    },
    returns: { type: 'object' },
    requires_session: true,
  },
  {
    name: 'dart.search',
    description: '공시 검색',
    category: 'dart',
    broker: null,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
    returns: { type: 'object' },
    requires_session: false,
  },
];

describe('ToolRegistry', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let registry: ToolRegistry;

  beforeEach(() => {
    mockClient = createMockClient();
    registry = new ToolRegistry(mockClient as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('discover()', () => {
    it('rpc.list_methods 호출', async () => {
      mockClient.request.mockResolvedValue(SAMPLE_METHODS);
      await registry.discover();
      expect(mockClient.request).toHaveBeenCalledWith('rpc.list_methods', {});
      expect(registry.getMethods()).toHaveLength(3);
    });

    it('필터 전달', async () => {
      mockClient.request.mockResolvedValue([SAMPLE_METHODS[0]]);
      await registry.discover({ category: 'stock' });
      expect(mockClient.request).toHaveBeenCalledWith('rpc.list_methods', { category: 'stock' });
    });
  });

  describe('getCategories()', () => {
    it('중복 없이 정렬된 카테고리 반환', async () => {
      mockClient.request.mockResolvedValue(SAMPLE_METHODS);
      await registry.discover();
      expect(registry.getCategories()).toEqual(['dart', 'ranking', 'stock']);
    });
  });

  describe('getMethodsByCategory()', () => {
    it('카테고리별 필터링', async () => {
      mockClient.request.mockResolvedValue(SAMPLE_METHODS);
      await registry.discover();
      const stockMethods = registry.getMethodsByCategory('stock');
      expect(stockMethods).toHaveLength(1);
      expect(stockMethods[0].name).toBe('stock.current_price');
    });
  });

  describe('toPiTools()', () => {
    beforeEach(async () => {
      mockClient.request.mockResolvedValue(SAMPLE_METHODS);
      await registry.discover();
    });

    it('ToolDefinition 생성, dot→underscore 이름 변환', () => {
      const tools = registry.toPiTools({ initializedBrokers: new Set() });
      expect(tools).toHaveLength(3);
      expect(tools[0].name).toBe('stock_current_price');
      expect(tools[1].name).toBe('ranking_volume');
      expect(tools[2].name).toBe('dart_search');
    });

    it('execute: broker 미초기화 시 session.initialize 자동 호출', async () => {
      const initializedBrokers = new Set<string>();
      mockClient.request.mockResolvedValue({ price: 70000 });

      const tools = registry.toPiTools({ initializedBrokers });
      const tool = tools[0]; // stock.current_price (broker: kiwoom)

      await tool.execute('call-1', { ticker: '005930' }, undefined, undefined, {} as never);

      expect(mockClient.request).toHaveBeenCalledWith('session.initialize', { broker: 'kiwoom' });
      expect(mockClient.request).toHaveBeenCalledWith('stock.current_price', { ticker: '005930' });
      expect(initializedBrokers.has('kiwoom')).toBe(true);
    });

    it('execute: initializedBrokers에 이미 있으면 session.initialize 스킵', async () => {
      const initializedBrokers = new Set<string>(['kiwoom']);
      mockClient.request.mockResolvedValue({ price: 70000 });

      const tools = registry.toPiTools({ initializedBrokers });
      await tools[0].execute('call-1', { ticker: '005930' }, undefined, undefined, {} as never);

      // session.initialize는 호출되지 않아야 함 (discover의 rpc.list_methods + stock.current_price만)
      const calls = mockClient.request.mock.calls;
      const initCalls = calls.filter(
        (c: unknown[]) => c[0] === 'session.initialize',
      );
      expect(initCalls).toHaveLength(0);
    });

    it('execute: broker가 null이면 session.initialize 스킵', async () => {
      const initializedBrokers = new Set<string>();
      mockClient.request.mockResolvedValue({ results: [] });

      const tools = registry.toPiTools({ initializedBrokers });
      const dartTool = tools[2]; // dart.search (broker: null)

      await dartTool.execute('call-1', { query: '삼성' }, undefined, undefined, {} as never);

      const calls = mockClient.request.mock.calls;
      const initCalls = calls.filter(
        (c: unknown[]) => c[0] === 'session.initialize',
      );
      expect(initCalls).toHaveLength(0);
    });

    it('execute: RPC 에러 시 에러 텍스트 반환', async () => {
      const initializedBrokers = new Set<string>(['kiwoom']);
      mockClient.request.mockRejectedValue(
        new JsonRpcRemoteError(-32602, 'Invalid params', { detail: 'ticker required' }),
      );

      const tools = registry.toPiTools({ initializedBrokers });
      const result = await tools[0].execute(
        'call-1',
        {},
        undefined,
        undefined,
        {} as never,
      );

      expect(result.content[0].text).toContain('[ERROR]');
      expect(result.content[0].text).toContain('RPC error (-32602)');
      expect(result.content[0].text).toContain('Invalid params');
    });

    it('execute: 결과를 JSON.stringify로 직렬화', async () => {
      const initializedBrokers = new Set<string>(['kiwoom']);
      const mockResult = { price: 70000, volume: 123456 };
      mockClient.request.mockResolvedValue(mockResult);

      const tools = registry.toPiTools({ initializedBrokers });
      const result = await tools[0].execute(
        'call-1',
        { ticker: '005930' },
        undefined,
        undefined,
        {} as never,
      );

      expect(result.content[0].text).toBe(JSON.stringify(mockResult, null, 2));
    });
  });

  describe('Type.Unsafe 스키마 직렬화 검증', () => {
    it('JSON Schema 원본과 동일하게 직렬화', () => {
      const originalSchema = {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: '종목코드' },
          count: { type: 'integer', description: '조회 건수' },
        },
        required: ['ticker'],
      };

      const unsafeSchema = Type.Unsafe(originalSchema);
      const serialized = JSON.parse(JSON.stringify(unsafeSchema));

      expect(serialized.type).toBe('object');
      expect(serialized.properties.ticker).toEqual({ type: 'string', description: '종목코드' });
      expect(serialized.properties.count).toEqual({ type: 'integer', description: '조회 건수' });
      expect(serialized.required).toEqual(['ticker']);
    });
  });
});
