import type { AgentToolResult, ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from '@sinclair/typebox';
import { getOpenApiCwd, runOpenApiCliHelp } from './cli.js';
import { getCompanyOverview, lookupCorpCodes, searchDisclosures } from './providers/dart.js';
import {
  getCurrentPrice,
  getFinancials,
  getFinancialsWindowed,
  getMarketAnnouncement,
  getPriceHistory,
} from './providers/kis.js';
import type { CliExecutionResult, JsonValue, ToolResultDetails } from './types.js';

function ok(
  provider: ToolResultDetails['provider'],
  result: CliExecutionResult,
): AgentToolResult<ToolResultDetails> {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
    details: {
      provider,
      command: result.command,
      cwd: result.cwd,
      data: result.data,
      stderr: result.stderr,
    } satisfies ToolResultDetails,
  };
}

function fail(
  provider: ToolResultDetails['provider'],
  error: unknown,
): AgentToolResult<ToolResultDetails> {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: message }],
    details: {
      provider,
      cwd: getOpenApiCwd(),
      error: message,
    } satisfies ToolResultDetails,
  };
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: 'market_data_health',
    label: 'Market Data Health',
    description:
      'Check whether cluefin-openapi-cli can run from the configured cwd. Does not expose credential values.',
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      try {
        const result = await runOpenApiCliHelp(signal);
        const env = {
          KIS_APP_KEY: Boolean(process.env.KIS_APP_KEY),
          KIS_SECRET_KEY: Boolean(process.env.KIS_SECRET_KEY),
          DART_AUTH_KEY: Boolean(process.env.DART_AUTH_KEY),
        };
        const data = {
          cwd: result.cwd,
          command: result.command,
          env,
          cli: result.data,
        } satisfies JsonValue;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
          details: {
            provider: 'market-data',
            cwd: result.cwd,
            command: result.command,
            data,
          } satisfies ToolResultDetails,
        };
      } catch (error) {
        return fail('market-data', error);
      }
    },
  });

  pi.registerTool({
    name: 'kis_stock_current_price',
    label: 'KIS Current Price',
    description: 'Get current domestic stock price data from KIS using cluefin-openapi-cli.',
    parameters: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      market: Type.Optional(
        Type.Union([Type.Literal('J'), Type.Literal('NX'), Type.Literal('UN')]),
      ),
    }),
    async execute(_toolCallId, params, signal) {
      try {
        return ok('kis', await getCurrentPrice(params, signal));
      } catch (error) {
        return fail('kis', error);
      }
    },
  });

  pi.registerTool({
    name: 'kis_price_history',
    label: 'KIS Price History',
    description: 'Get OHLCV price history from KIS for technical analysis.',
    parameters: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      startDate: Type.String({ description: 'Start date in YYYYMMDD format' }),
      endDate: Type.String({ description: 'End date in YYYYMMDD format' }),
      market: Type.Optional(
        Type.Union([Type.Literal('J'), Type.Literal('NX'), Type.Literal('UN')]),
      ),
      period: Type.Optional(
        Type.Union([Type.Literal('D'), Type.Literal('W'), Type.Literal('M'), Type.Literal('Y')]),
      ),
      adjPrice: Type.Optional(Type.Union([Type.Literal('0'), Type.Literal('1')])),
    }),
    async execute(_toolCallId, params, signal) {
      try {
        return ok('kis', await getPriceHistory(params, signal));
      } catch (error) {
        return fail('kis', error);
      }
    },
  });

  pi.registerTool({
    name: 'kis_financials',
    label: 'KIS Financials',
    description: 'Get bundled financial statement and ratio data from KIS.',
    parameters: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      market: Type.Optional(Type.String({ description: 'Market division code. Default is J.' })),
      divClsCode: Type.Optional(Type.Union([Type.Literal('0'), Type.Literal('1')])),
    }),
    async execute(_toolCallId, params, signal) {
      try {
        return ok('kis', await getFinancials(params, signal));
      } catch (error) {
        return fail('kis', error);
      }
    },
  });

  pi.registerTool({
    name: 'kis_financials_windowed',
    label: 'KIS Financials Windowed',
    description:
      'Prefer the latest 5 annual periods (YYYY12). If fewer than 5 annual periods are available, fall back to the latest 12 reporting periods.',
    parameters: Type.Object({
      stockCode: Type.String({ description: '6-digit stock code, e.g. 005930' }),
      market: Type.Optional(Type.String({ description: 'Market division code. Default is J.' })),
    }),
    async execute(_toolCallId, params, signal) {
      try {
        return ok('kis', await getFinancialsWindowed(params, signal));
      } catch (error) {
        return fail('kis', error);
      }
    },
  });

  pi.registerTool({
    name: 'kis_market_announcement',
    label: 'KIS Market Announcement',
    description: 'Get KIS market news and announcement titles.',
    parameters: Type.Object({
      stockCode: Type.Optional(Type.String({ description: '6-digit stock code' })),
      title: Type.Optional(Type.String({ description: 'Title keyword filter' })),
      startDate: Type.Optional(
        Type.String({ description: 'Date filter. CLI expects provider-specific format.' }),
      ),
    }),
    async execute(_toolCallId, params, signal) {
      try {
        return ok('kis', await getMarketAnnouncement(params, signal));
      } catch (error) {
        return fail('kis', error);
      }
    },
  });

  pi.registerTool({
    name: 'dart_corp_code_lookup',
    label: 'DART Corp Code Lookup',
    description: 'Download DART corporate code list using cluefin-openapi-cli.',
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      try {
        return ok('dart', await lookupCorpCodes(signal));
      } catch (error) {
        return fail('dart', error);
      }
    },
  });

  pi.registerTool({
    name: 'dart_company_overview',
    label: 'DART Company Overview',
    description: 'Get DART company overview by 8-digit corp code.',
    parameters: Type.Object({
      corpCode: Type.String({ description: 'DART corporate unique code, 8 digits' }),
    }),
    async execute(_toolCallId, params, signal) {
      try {
        return ok('dart', await getCompanyOverview(params, signal));
      } catch (error) {
        return fail('dart', error);
      }
    },
  });

  pi.registerTool({
    name: 'dart_disclosure_search',
    label: 'DART Disclosure Search',
    description: 'Search DART disclosures by corp code, date range, and disclosure type.',
    parameters: Type.Object({
      corpCode: Type.Optional(Type.String({ description: 'DART corporate unique code, 8 digits' })),
      beginDate: Type.Optional(Type.String({ description: 'Start date in YYYYMMDD format' })),
      endDate: Type.Optional(Type.String({ description: 'End date in YYYYMMDD format' })),
      lastReportOnly: Type.Optional(Type.Union([Type.Literal('Y'), Type.Literal('N')])),
      disclosureType: Type.Optional(
        Type.Union([
          Type.Literal('A'),
          Type.Literal('B'),
          Type.Literal('C'),
          Type.Literal('D'),
          Type.Literal('E'),
          Type.Literal('F'),
          Type.Literal('G'),
          Type.Literal('H'),
          Type.Literal('I'),
          Type.Literal('J'),
        ]),
      ),
      corpClass: Type.Optional(
        Type.Union([Type.Literal('Y'), Type.Literal('K'), Type.Literal('N'), Type.Literal('E')]),
      ),
      pageNo: Type.Optional(Type.Number()),
      pageCount: Type.Optional(Type.Number()),
    }),
    async execute(_toolCallId, params, signal) {
      try {
        return ok('dart', await searchDisclosures(params, signal));
      } catch (error) {
        return fail('dart', error);
      }
    },
  });
}
