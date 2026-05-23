import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/cli/client.js', () => ({
  executeCliCommand: vi.fn(),
  getCliCommandByName: vi.fn(),
  getCliCommandsForCategories: vi.fn(),
  getCliCommandsForTaxonomy: vi.fn(),
  getParamSummary: vi.fn().mockReturnValue('  stock_code: string'),
  validateRequiredParams: vi.fn(),
}));

import { createCallCliTool, getToolsForAgent } from '../../src/cli/agent-tools.js';
import {
  executeCliCommand,
  getCliCommandByName,
  getCliCommandsForTaxonomy,
  validateRequiredParams,
} from '../../src/cli/client.js';

const mockExecuteCliCommand = vi.mocked(executeCliCommand);
const mockGetCliCommandByName = vi.mocked(getCliCommandByName);
const mockGetCliCommandsForTaxonomy = vi.mocked(getCliCommandsForTaxonomy);
const mockValidateRequiredParams = vi.mocked(validateRequiredParams);

const sampleCommand = {
  app: 'openapi' as const,
  broker: 'kis',
  category: 'stock',
  name: 'current-price',
  qualifiedName: 'kis.stock.current-price',
  pathSegments: ['kis', 'stock', 'current-price'],
  description: 'Get current price.',
  hasExecutor: true,
  domains: ['quote'],
  tags: ['current-price'],
  useCases: [],
  examples: [],
  agentNotes: null,
  alias: 'kis_stock_current_price',
  parameters: {
    type: 'object',
    properties: { stock_code: { type: 'string' } },
    required: ['stock_code'],
  },
  returns: { type: 'object' },
};

describe('cli agent tools', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockValidateRequiredParams.mockReturnValue([]);
  });

  it('strategy 에이전트는 Dure 도메인 taxonomy와 category fallback을 요청한다', async () => {
    mockGetCliCommandsForTaxonomy.mockResolvedValue([sampleCommand]);

    await getToolsForAgent('strategy');

    expect(mockGetCliCommandsForTaxonomy).toHaveBeenCalledWith(
      expect.objectContaining({
        domains: expect.arrayContaining(['chart', 'technical-indicator', 'statements']),
        tags: expect.arrayContaining(['ohlcv', 'momentum', 'portfolio-risk']),
        fallbackCategories: ['stock', 'chart', 'ta', 'financial'],
      }),
    );
  });

  it('command alias를 tool name으로 노출한다', async () => {
    mockGetCliCommandsForTaxonomy.mockResolvedValue([sampleCommand]);

    const tools = await getToolsForAgent('fundamental');

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe('kis_stock_current_price');
    expect(tools[0]?.description).toContain('CLI path: kis stock current-price');
    expect(tools[0]?.description).toContain('Domains: quote');
  });

  it('도구 실행 시 CLI 결과를 JSON 텍스트로 반환한다', async () => {
    mockGetCliCommandsForTaxonomy.mockResolvedValue([sampleCommand]);
    mockExecuteCliCommand.mockResolvedValue({ price: 70000 });

    const tools = await getToolsForAgent('fundamental');
    const [tool] = tools;
    if (!tool) throw new Error('expected fundamental CLI tool');
    const result = await tool.execute(
      'call-1',
      { stock_code: '005930' },
      undefined,
      undefined,
      {} as never,
    );

    expect(mockExecuteCliCommand).toHaveBeenCalledWith(sampleCommand, { stock_code: '005930' });
    expect(result.content[0]?.text).toContain('70000');
  });

  it('필수 파라미터 누락 시 사전 에러를 반환한다', async () => {
    mockGetCliCommandsForTaxonomy.mockResolvedValue([sampleCommand]);
    mockValidateRequiredParams.mockReturnValue(['stock_code']);

    const tools = await getToolsForAgent('fundamental');
    const [tool] = tools;
    if (!tool) throw new Error('expected fundamental CLI tool');
    const result = await tool.execute('call-1', {}, undefined, undefined, {} as never);

    expect(result.content[0]?.text).toContain('필수 파라미터 누락');
    expect(result.content[0]?.text).toContain('stock_code');
  });

  it('fallback tool은 qualifiedName으로 command를 찾는다', async () => {
    mockGetCliCommandByName.mockResolvedValue(sampleCommand);
    mockExecuteCliCommand.mockResolvedValue({ ok: true });

    const tool = createCallCliTool();
    const result = await tool.execute(
      'call-1',
      { qualifiedName: 'kis.stock.current-price', params: { stock_code: '005930' } },
      undefined,
      undefined,
      {} as never,
    );

    expect(mockGetCliCommandByName).toHaveBeenCalledWith('kis.stock.current-price');
    expect(result.content[0]?.text).toContain('"ok": true');
  });

  it('fallback tool은 command가 없으면 에러를 반환한다', async () => {
    mockGetCliCommandByName.mockResolvedValue(undefined);

    const tool = createCallCliTool();
    const result = await tool.execute(
      'call-1',
      { qualifiedName: 'missing.command', params: {} },
      undefined,
      undefined,
      {} as never,
    );

    expect(result.content[0]?.text).toContain('찾지 못했습니다');
  });
});
