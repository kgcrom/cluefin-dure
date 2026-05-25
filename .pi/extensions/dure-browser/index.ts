import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import {
  AgentBrowserClient,
  type AgentBrowserCommand,
  type AgentBrowserRunner,
  type AgentBrowserRunnerOptions,
} from '../../../src/browser/agentBrowser.js';
import { saveBrowserTextArtifact } from '../../../src/runtime/browserArtifacts.js';
import { toolResult } from '../../../src/tools/_helpers.js';
import { createBrowserNewsSearchTool } from '../../../src/tools/browserNewsTool.js';

type PiExecResult = {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
};

type PiApi = {
  exec?: (
    command: string,
    args: string[],
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ) => Promise<PiExecResult>;
  registerTool: (tool: ToolDefinition) => void;
};

const captureEvidenceParams = Type.Object({
  url: Type.String({ description: '브라우저로 확인할 URL' }),
  instruction: Type.Optional(
    Type.String({ description: 'URL에서 확인할 증거 또는 추출할 메타데이터 설명' }),
  ),
  runId: Type.Optional(Type.String({ description: 'evidence artifact를 저장할 run ID' })),
  ticker: Type.Optional(Type.String({ description: '관련 종목 코드' })),
});

type CaptureEvidenceParams = Static<typeof captureEvidenceParams>;

export function createDureBrowserTools(pi: PiApi): ToolDefinition[] {
  const client = new AgentBrowserClient({ runner: createPiAgentBrowserRunner(pi) });
  return [
    createBrowserDoctorTool(client),
    createBrowserNewsSearchTool({ client }) as ToolDefinition,
    createBrowserCaptureEvidenceTool(client),
  ];
}

export default function dureBrowserExtension(pi: PiApi): void {
  for (const tool of createDureBrowserTools(pi)) {
    pi.registerTool(tool);
  }
}

function createBrowserDoctorTool(client: AgentBrowserClient): ToolDefinition {
  const parameters = Type.Object({});
  return {
    name: 'browser_doctor',
    label: 'Agent Browser Doctor',
    description:
      'agent-browser CLI 사용 가능 여부를 확인합니다. 미설치 상태여도 Dure 시작은 실패하지 않고 안내를 반환합니다.',
    parameters,
    async execute(_toolCallId, _params, signal) {
      return toolResult(JSON.stringify(await client.doctor(signal)));
    },
  } satisfies ToolDefinition<typeof parameters>;
}

function createBrowserCaptureEvidenceTool(client: AgentBrowserClient): ToolDefinition {
  return {
    name: 'browser_capture_evidence',
    label: '브라우저 증거 캡처',
    description:
      'agent-browser로 URL을 열어 사용자가 지정한 증거나 메타데이터를 확인하고, runId가 있으면 artifact로 저장합니다.',
    parameters: captureEvidenceParams,
    async execute(_toolCallId, params: CaptureEvidenceParams, signal) {
      const browserResult = await client.runTask({
        instruction: [
          `Open this URL: ${params.url}`,
          params.instruction ?? 'Capture concise evidence metadata from the page.',
          'Return only concise JSON metadata. Do not include full article body text.',
        ].join('\n'),
        sessionNameSeed: `browser-evidence-${params.ticker ?? params.url}`,
        signal,
      });

      if (!browserResult.ok) {
        return toolResult(
          JSON.stringify({ url: params.url, ok: false, error: browserResult.error }),
        );
      }

      const result: { url: string; ok: true; artifactPath?: string } = {
        url: params.url,
        ok: true,
      };
      if (params.runId) {
        const artifact = await saveBrowserTextArtifact({
          runId: params.runId,
          scope: 'generic',
          fileName: 'browser-evidence.json',
          contentType: 'application/json',
          text: browserResult.stdout,
        });
        result.artifactPath = artifact.path;
      }
      return toolResult(JSON.stringify(result));
    },
  } satisfies ToolDefinition<typeof captureEvidenceParams>;
}

function createPiAgentBrowserRunner(pi: PiApi): AgentBrowserRunner {
  return {
    async run(
      command: AgentBrowserCommand,
      options: AgentBrowserRunnerOptions,
    ): Promise<{ stdout: string; stderr: string; exitCode?: number }> {
      if (!pi.exec) {
        throw Object.assign(new Error('pi.exec is not available for agent-browser'), {
          code: 'ENOENT',
        });
      }
      const result = await pi.exec(command.command, command.args, {
        timeoutMs: options.timeoutMs,
        signal: options.signal,
      });
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.exitCode ?? 0,
      };
    },
  };
}
