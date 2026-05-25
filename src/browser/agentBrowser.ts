import { execFile } from 'node:child_process';

export interface AgentBrowserCommand {
  command: string;
  args: string[];
}

export interface AgentBrowserRunnerOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface AgentBrowserRunnerResult {
  stdout: string;
  stderr: string;
  exitCode?: number;
}

export interface AgentBrowserRunner {
  run(
    command: AgentBrowserCommand,
    options: AgentBrowserRunnerOptions,
  ): Promise<AgentBrowserRunnerResult>;
}

export type AgentBrowserErrorCode =
  | 'AGENT_BROWSER_NOT_INSTALLED'
  | 'AGENT_BROWSER_DOCTOR_FAILED'
  | 'AGENT_BROWSER_RUN_FAILED';

export interface AgentBrowserError {
  code: AgentBrowserErrorCode;
  message: string;
  stdout?: string;
  stderr?: string;
}

export type AgentBrowserResult =
  | {
      ok: true;
      stdout: string;
      stderr: string;
      sessionName?: string;
    }
  | {
      ok: false;
      error: AgentBrowserError;
    };

export interface AgentBrowserClientOptions {
  runner?: AgentBrowserRunner;
  bin?: string;
  timeoutMs?: number;
  doctorTimeoutMs?: number;
  runDoctor?: boolean;
}

export interface AgentBrowserTaskOptions {
  instruction: string;
  sessionNameSeed: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_DOCTOR_TIMEOUT_MS = 10_000;

export class AgentBrowserClient {
  private readonly runner: AgentBrowserRunner;
  private readonly bin: string;
  private readonly timeoutMs: number;
  private readonly doctorTimeoutMs: number;
  private readonly runDoctor: boolean;
  private doctorPromise?: Promise<AgentBrowserResult>;

  constructor(options: AgentBrowserClientOptions = {}) {
    this.runner = options.runner ?? createExecFileAgentBrowserRunner();
    this.bin = options.bin ?? 'agent-browser';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.doctorTimeoutMs = options.doctorTimeoutMs ?? DEFAULT_DOCTOR_TIMEOUT_MS;
    this.runDoctor = options.runDoctor ?? true;
  }

  async doctor(signal?: AbortSignal): Promise<AgentBrowserResult> {
    if (!this.doctorPromise) {
      this.doctorPromise = this.runCommand(
        { command: this.bin, args: ['doctor', '--json'] },
        { timeoutMs: this.doctorTimeoutMs, signal },
        'AGENT_BROWSER_DOCTOR_FAILED',
      );
    }
    return this.doctorPromise;
  }

  async runTask(options: AgentBrowserTaskOptions): Promise<AgentBrowserResult> {
    const sessionName = deterministicSessionName(options.sessionNameSeed);
    if (this.runDoctor) {
      const doctor = await this.doctor(options.signal);
      if (!doctor.ok) return doctor;
    }

    const command = {
      command: this.bin,
      args: ['run', '--session', sessionName, '--output', 'json', '--prompt', options.instruction],
    };
    const result = await this.runCommand(
      command,
      { timeoutMs: options.timeoutMs ?? this.timeoutMs, signal: options.signal },
      'AGENT_BROWSER_RUN_FAILED',
    );
    return result.ok ? { ...result, sessionName } : result;
  }

  private async runCommand(
    command: AgentBrowserCommand,
    options: AgentBrowserRunnerOptions,
    failureCode: Exclude<AgentBrowserErrorCode, 'AGENT_BROWSER_NOT_INSTALLED'>,
  ): Promise<AgentBrowserResult> {
    try {
      const result = await this.runner.run(command, options);
      const stdout = redactBrowserOutput(result.stdout);
      const stderr = redactBrowserOutput(result.stderr);
      if (result.exitCode && result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            code: failureCode,
            message: `${command.command} ${command.args[0] ?? ''} failed with exit code ${result.exitCode}`,
            stdout,
            stderr,
          },
        };
      }
      return { ok: true, stdout, stderr };
    } catch (error) {
      return agentBrowserErrorFromUnknown(error, failureCode);
    }
  }
}

export function createExecFileAgentBrowserRunner(): AgentBrowserRunner {
  return {
    run(command, options) {
      return new Promise<AgentBrowserRunnerResult>((resolve, reject) => {
        execFile(
          command.command,
          command.args,
          {
            timeout: options.timeoutMs,
            signal: options.signal,
            encoding: 'utf-8',
          },
          (error, stdout, stderr) => {
            if (error) {
              reject(Object.assign(error, { stdout, stderr }));
              return;
            }
            resolve({ stdout, stderr, exitCode: 0 });
          },
        );
      });
    },
  };
}

export function deterministicSessionName(seed: string): string {
  const normalized = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `dure-${normalized || 'browser'}`;
}

export function redactBrowserOutput(value: string): string {
  return value
    .replace(
      /([?&](?:access_token|api_key|apikey|authorization|cookie|session|token)=)[^&#\s]+/gi,
      '$1[REDACTED]',
    )
    .replace(
      /\b(access_token|api_key|apikey|authorization|cookie|session|token)(\s*[:=]\s*)[^&\s,;]+/gi,
      '$1$2[REDACTED]',
    )
    .replace(/\bCookie:\s*[^\n\r]+/gi, 'Cookie: [REDACTED]')
    .replace(/\bAuthorization:\s*[^\n\r]+/gi, 'Authorization: [REDACTED]');
}

function agentBrowserErrorFromUnknown(
  error: unknown,
  failureCode: Exclude<AgentBrowserErrorCode, 'AGENT_BROWSER_NOT_INSTALLED'>,
): AgentBrowserResult {
  const maybeError = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
  const stdout = redactBrowserOutput(maybeError.stdout ?? '');
  const stderr = redactBrowserOutput(maybeError.stderr ?? '');

  if (maybeError.code === 'ENOENT') {
    return {
      ok: false,
      error: {
        code: 'AGENT_BROWSER_NOT_INSTALLED',
        message:
          'agent-browser CLI is not installed or not available on PATH. Install agent-browser and retry this tool.',
        stdout,
        stderr,
      },
    };
  }

  return {
    ok: false,
    error: {
      code: failureCode,
      message: maybeError.message || 'agent-browser command failed',
      stdout,
      stderr,
    },
  };
}
