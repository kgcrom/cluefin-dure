import type { AgentToolResult, ToolDefinition } from '@mariozechner/pi-coding-agent';
import { type TSchema, Type } from '@sinclair/typebox';
import {
  type CliCommandSpec,
  executeCliCommand,
  getCliCommandByName,
  getCliCommandsForCategories,
  getParamSummary,
  validateRequiredParams,
} from './client.js';

const AGENT_CATEGORIES: Record<string, string[]> = {
  universe: ['ranking', 'stock', 'sector', 'theme', 'market', 'etf'],
  fundamental: ['financial', 'stock', 'dart', 'schedule'],
  news: ['dart'],
  strategy: ['stock', 'chart', 'ta', 'financial'],
  critic: [],
  scenario: ['stock', 'market', 'financial'],
  router: [],
};

function formatError(commandName: string, error: unknown): string {
  if (error instanceof Error) {
    return `[ERROR] ${commandName}: ${error.message}`;
  }
  return `[ERROR] ${commandName}: ${String(error)}`;
}

async function executeTool(
  command: CliCommandSpec,
  params: Record<string, unknown>,
): Promise<AgentToolResult<null>> {
  const missing = validateRequiredParams(command, params);
  if (missing.length > 0) {
    return {
      content: [
        {
          type: 'text',
          text: `[ERROR] ${command.qualifiedName}: 필수 파라미터 누락: ${missing.join(', ')}\n\nParameters:\n${getParamSummary(command)}`,
        },
      ],
      details: null,
    };
  }

  try {
    const result = await executeCliCommand(command, params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      details: null,
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatError(command.qualifiedName, error) }],
      details: null,
    };
  }
}

export async function getToolsForAgent(agentName: string): Promise<ToolDefinition[]> {
  const categories = AGENT_CATEGORIES[agentName];
  if (!categories || categories.length === 0) return [];

  const commands = await getCliCommandsForCategories(categories);
  return commands.map((command) => ({
    name: command.alias,
    label: command.alias,
    description: `${command.description}\nCLI path: ${command.pathSegments.join(' ')}`,
    parameters: Type.Unsafe(command.parameters as TSchema),
    async execute(_toolCallId: string, toolParams: Record<string, unknown>) {
      return executeTool(command, toolParams);
    },
  }));
}

export function createCallCliTool(): ToolDefinition {
  const parameters = Type.Object({
    qualifiedName: Type.String({
      description: "CLI command qualified name or alias (e.g. 'kis.stock.current-price')",
    }),
    params: Type.Optional(
      Type.Record(Type.String(), Type.Unknown(), {
        description: 'Command parameters as key-value pairs',
      }),
    ),
  });

  return {
    name: 'call_cli_command',
    label: 'Call CLI Command',
    description: 'Discovered cluefin CLI command를 직접 호출합니다.',
    parameters,
    async execute(
      _toolCallId: string,
      toolParams: { qualifiedName: string; params?: Record<string, unknown> },
    ): Promise<AgentToolResult<null>> {
      const command = await getCliCommandByName(toolParams.qualifiedName);
      if (!command) {
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] ${toolParams.qualifiedName}: discovery 결과에서 해당 CLI command를 찾지 못했습니다.`,
            },
          ],
          details: null,
        };
      }

      return executeTool(command, toolParams.params ?? {});
    },
  } satisfies ToolDefinition;
}
