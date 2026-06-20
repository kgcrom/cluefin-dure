#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { type TSchema, Type } from '@sinclair/typebox';
import { getOpenApiCwd, runOpenApiCliHelp } from './cli.js';
import { getCompanyOverview, lookupCorpCodes, searchDisclosures } from './providers/dart.js';
import {
  getCurrentPrice,
  getFinancials,
  getFinancialsWindowed,
  getMarketAnnouncement,
  getPriceHistory,
} from './providers/kis.js';
import type { CliExecutionResult, JsonValue } from './types.js';

// The cluefin providers (cli.ts, providers/*) are framework-agnostic: they shell
// out to `uv run cluefin-openapi-cli` and return CliExecutionResult. This MCP
// server is a thin transport replacing the Pi extension entrypoint (index.ts).

const marketDivision = Type.Union([Type.Literal('J'), Type.Literal('NX'), Type.Literal('UN')]);

/** Narrow MCP's loosely-typed arguments object onto a provider param type. */
function coerce<T>(value: Record<string, unknown>): T {
  return value as unknown as T;
}

interface ToolDef {
  name: string;
  description: string;
  inputSchema: TSchema;
  run: (args: Record<string, unknown>, signal: AbortSignal) => Promise<CliExecutionResult>;
}

const TOOLS: ToolDef[] = [
  {
    name: 'market_data_health',
    description:
      'Check whether cluefin-openapi-cli can run from the configured cwd. Does not expose credential values.',
    inputSchema: Type.Object({}),
    async run(_args, signal) {
      const result = await runOpenApiCliHelp(signal);
      const data = {
        cwd: result.cwd,
        command: result.command,
        env: {
          KIS_APP_KEY: Boolean(process.env.KIS_APP_KEY),
          KIS_SECRET_KEY: Boolean(process.env.KIS_SECRET_KEY),
          DART_AUTH_KEY: Boolean(process.env.DART_AUTH_KEY),
        },
        cli: result.data,
      } satisfies JsonValue;
      return { command: result.command, cwd: result.cwd, data };
    },
  },
  {
    name: 'kis_stock_current_price',
    description: 'Get current domestic stock price data from KIS using cluefin-openapi-cli.',
    inputSchema: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      market: Type.Optional(marketDivision),
    }),
    run: (args, signal) => getCurrentPrice(coerce(args), signal),
  },
  {
    name: 'kis_price_history',
    description: 'Get OHLCV price history from KIS for technical analysis.',
    inputSchema: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      startDate: Type.String({ description: 'Start date in YYYYMMDD format' }),
      endDate: Type.String({ description: 'End date in YYYYMMDD format' }),
      market: Type.Optional(marketDivision),
      period: Type.Optional(
        Type.Union([Type.Literal('D'), Type.Literal('W'), Type.Literal('M'), Type.Literal('Y')]),
      ),
      adjPrice: Type.Optional(Type.Union([Type.Literal('0'), Type.Literal('1')])),
    }),
    run: (args, signal) => getPriceHistory(coerce(args), signal),
  },
  {
    name: 'kis_financials',
    description: 'Get bundled financial statement and ratio data from KIS.',
    inputSchema: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      market: Type.Optional(Type.String({ description: 'Market division code. Default is J.' })),
      divClsCode: Type.Optional(Type.Union([Type.Literal('0'), Type.Literal('1')])),
    }),
    run: (args, signal) => getFinancials(coerce(args), signal),
  },
  {
    name: 'kis_financials_windowed',
    description:
      'Prefer the latest 5 annual periods (YYYY12). If fewer than 5 annual periods are available, fall back to the latest 12 reporting periods.',
    inputSchema: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      market: Type.Optional(Type.String({ description: 'Market division code. Default is J.' })),
    }),
    run: (args, signal) => getFinancialsWindowed(coerce(args), signal),
  },
  {
    name: 'kis_market_announcement',
    description: 'Get KIS market news and announcement titles.',
    inputSchema: Type.Object({
      stockCode: Type.Optional(Type.String({ description: '6-digit stock code' })),
      title: Type.Optional(Type.String({ description: 'Title keyword filter' })),
      startDate: Type.Optional(
        Type.String({ description: 'Date filter. CLI expects provider-specific format.' }),
      ),
    }),
    run: (args, signal) => getMarketAnnouncement(coerce(args), signal),
  },
  {
    name: 'dart_corp_code_lookup',
    description: 'Download DART corporate code list using cluefin-openapi-cli.',
    inputSchema: Type.Object({}),
    run: (_args, signal) => lookupCorpCodes(signal),
  },
  {
    name: 'dart_company_overview',
    description: 'Get DART company overview by 8-digit corp code.',
    inputSchema: Type.Object({
      corpCode: Type.String({ description: 'DART corporate unique code, 8 digits' }),
    }),
    run: (args, signal) => getCompanyOverview(coerce(args), signal),
  },
  {
    name: 'dart_disclosure_search',
    description: 'Search DART disclosures by corp code, date range, and disclosure type.',
    inputSchema: Type.Object({
      corpCode: Type.Optional(Type.String({ description: 'DART corporate unique code, 8 digits' })),
      beginDate: Type.Optional(Type.String({ description: 'Start date in YYYYMMDD format' })),
      endDate: Type.Optional(Type.String({ description: 'End date in YYYYMMDD format' })),
      lastReportOnly: Type.Optional(Type.Union([Type.Literal('Y'), Type.Literal('N')])),
      disclosureType: Type.Optional(
        Type.Union(
          ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((value) => Type.Literal(value)),
        ),
      ),
      corpClass: Type.Optional(
        Type.Union([Type.Literal('Y'), Type.Literal('K'), Type.Literal('N'), Type.Literal('E')]),
      ),
      pageNo: Type.Optional(Type.Number()),
      pageCount: Type.Optional(Type.Number()),
    }),
    run: (args, signal) => searchDisclosures(coerce(args), signal),
  },
];

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

const server = new Server(
  { name: 'market-data', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as Record<string, unknown>,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const tool = TOOLS_BY_NAME.get(request.params.name);
  if (!tool) {
    return {
      content: [{ type: 'text' as const, text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }

  try {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const result = await tool.run(args, extra.signal);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        { type: 'text' as const, text: `${tool.name} failed in ${getOpenApiCwd()}: ${message}` },
      ],
      isError: true,
    };
  }
});

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  process.stderr.write(`market-data MCP server failed to start: ${error}\n`);
  process.exit(1);
});
