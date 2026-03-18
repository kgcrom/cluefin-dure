import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonRpcRemoteError } from '../../src/rpc/jsonrpc.js';

// getRpcContext 모킹
vi.mock('../../src/rpc/rpc-client.js', () => ({
  getRpcContext: vi.fn(),
}));

import { getRpcContext } from '../../src/rpc/rpc-client.js';
import { createCallRpcTool, getToolsForAgent } from '../../src/rpc/agent-tools.js';

const mockGetRpcContext = vi.mocked(getRpcContext);

function createMockRpcContext() {
  const mockClient = {
    request: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
    notify: vi.fn(),
  };

  const mockRegistry = {
    fetchMethodsByCategory: vi.fn().mockResolvedValue([]),
    toPiTools: vi.fn().mockReturnValue([]),
    getMethodByToolName: vi.fn(),
    getMethodByName: vi.fn(),
    getParamSummary: vi.fn().mockReturnValue('  ticker: string — 종목코드'),
  };

  return {
    client: mockClient,
    registry: mockRegistry,
    initializedBrokers: new Set<string>(),
  };
}

describe('getToolsForAgent', () => {
  let ctx: ReturnType<typeof createMockRpcContext>;

  beforeEach(() => {
    ctx = createMockRpcContext();
    mockGetRpcContext.mockResolvedValue(ctx as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('universe 에이전트: 올바른 카테고리 fetch', async () => {
    await getToolsForAgent('universe');

    const fetchCalls = ctx.registry.fetchMethodsByCategory.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(fetchCalls).toEqual(['ranking', 'stock', 'sector', 'theme', 'market', 'etf']);
  });

  it('critic 에이전트: 빈 배열', async () => {
    const tools = await getToolsForAgent('critic');
    expect(tools).toEqual([]);
    expect(ctx.registry.fetchMethodsByCategory).not.toHaveBeenCalled();
  });

  it('미등록 에이전트: 빈 배열', async () => {
    const tools = await getToolsForAgent('unknown_agent');
    expect(tools).toEqual([]);
  });

  it('toPiTools에 수집된 메서드 전달', async () => {
    const mockMethods = [
      { name: 'ranking.volume', category: 'ranking' },
      { name: 'stock.current_price', category: 'stock' },
    ];
    ctx.registry.fetchMethodsByCategory.mockImplementation(async (category: string) => {
      return mockMethods.filter((m) => m.category === category);
    });

    await getToolsForAgent('universe');

    expect(ctx.registry.toPiTools).toHaveBeenCalledWith({
      methods: expect.arrayContaining(mockMethods),
      initializedBrokers: ctx.initializedBrokers,
    });
  });
});

describe('createCallRpcTool', () => {
  let ctx: ReturnType<typeof createMockRpcContext>;

  beforeEach(() => {
    ctx = createMockRpcContext();
    mockGetRpcContext.mockResolvedValue(ctx as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('스키마 구조 검증', () => {
    const tool = createCallRpcTool();
    expect(tool.name).toBe('call_rpc_method');
    expect(tool.parameters).toBeDefined();

    const schema = JSON.parse(JSON.stringify(tool.parameters));
    expect(schema.properties.method).toBeDefined();
    expect(schema.properties.params).toBeDefined();
    expect(schema.required).toContain('method');
  });

  it('execute: 정상 호출', async () => {
    ctx.client.request.mockResolvedValue({ price: 70000 });
    ctx.registry.getMethodByName.mockReturnValue({
      name: 'stock.current_price',
      broker: 'kiwoom',
      parameters: { required: ['ticker'] },
    });

    const tool = createCallRpcTool();
    const result = await tool.execute(
      'call-1',
      { method: 'stock.current_price', params: { ticker: '005930' } },
      undefined,
      undefined,
      {} as never,
    );

    expect(result.content[0].text).toContain('70000');
    expect(ctx.client.request).toHaveBeenCalledWith('stock.current_price', { ticker: '005930' });
  });

  it('execute: 필수 파라미터 누락 시 에러 메시지', async () => {
    ctx.registry.getMethodByName.mockReturnValue({
      name: 'stock.current_price',
      broker: 'kiwoom',
      parameters: {
        required: ['ticker'],
        properties: { ticker: { type: 'string', description: '종목코드' } },
      },
    });

    const tool = createCallRpcTool();
    const result = await tool.execute(
      'call-1',
      { method: 'stock.current_price', params: {} },
      undefined,
      undefined,
      {} as never,
    );

    expect(result.content[0].text).toContain('[ERROR]');
    expect(result.content[0].text).toContain('필수 파라미터 누락');
    expect(result.content[0].text).toContain('ticker');
  });

  it('execute: 언더스코어→도트 표기법 변환', async () => {
    ctx.registry.getMethodByToolName.mockReturnValue({
      name: 'stock.current_price',
    });
    ctx.registry.getMethodByName.mockReturnValue({
      name: 'stock.current_price',
      broker: null,
      parameters: { required: [] },
    });
    ctx.client.request.mockResolvedValue({ price: 70000 });

    const tool = createCallRpcTool();
    await tool.execute(
      'call-1',
      { method: 'stock_current_price', params: {} },
      undefined,
      undefined,
      {} as never,
    );

    expect(ctx.client.request).toHaveBeenCalledWith('stock.current_price', {});
  });

  it('execute: RPC 에러 시 에러 텍스트 반환', async () => {
    ctx.registry.getMethodByName.mockReturnValue({
      name: 'stock.current_price',
      broker: null,
      parameters: { required: [] },
    });
    ctx.client.request.mockRejectedValue(
      new JsonRpcRemoteError(-32602, 'Invalid params'),
    );

    const tool = createCallRpcTool();
    const result = await tool.execute(
      'call-1',
      { method: 'stock.current_price', params: {} },
      undefined,
      undefined,
      {} as never,
    );

    expect(result.content[0].text).toContain('[ERROR]');
    expect(result.content[0].text).toContain('RPC error (-32602)');
  });

  it('execute: broker 초기화 자동 호출', async () => {
    ctx.registry.getMethodByName.mockReturnValue({
      name: 'stock.current_price',
      broker: 'kiwoom',
      parameters: { required: [] },
    });
    ctx.client.request.mockResolvedValue({ price: 70000 });

    const tool = createCallRpcTool();
    await tool.execute(
      'call-1',
      { method: 'stock.current_price', params: {} },
      undefined,
      undefined,
      {} as never,
    );

    expect(ctx.client.request).toHaveBeenCalledWith('session.initialize', { broker: 'kiwoom' });
    expect(ctx.initializedBrokers.has('kiwoom')).toBe(true);
  });
});
