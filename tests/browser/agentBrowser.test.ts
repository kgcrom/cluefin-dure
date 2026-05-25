import { describe, expect, it, vi } from 'vitest';
import {
  AgentBrowserClient,
  type AgentBrowserCommand,
  type AgentBrowserRunnerOptions,
  deterministicSessionName,
  redactBrowserOutput,
} from '../../src/browser/agentBrowser.js';

describe('AgentBrowserClient', () => {
  it('passes deterministic session name and timeout to the runner', async () => {
    const calls: Array<{ command: AgentBrowserCommand; options: AgentBrowserRunnerOptions }> = [];
    const runner = {
      run: vi.fn(async (command: AgentBrowserCommand, options: AgentBrowserRunnerOptions) => {
        calls.push({ command, options });
        return { stdout: '{"ok":true}', stderr: '', exitCode: 0 };
      }),
    };
    const client = new AgentBrowserClient({
      runner,
      bin: 'agent-browser-test',
      timeoutMs: 1234,
      runDoctor: false,
    });

    const result = await client.runTask({
      instruction: 'Open Naver news and extract articles',
      sessionNameSeed: 'News: 005930 / Latest',
    });

    expect(result).toMatchObject({ ok: true, sessionName: 'dure-news-005930-latest' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toEqual({
      command: 'agent-browser-test',
      args: [
        'run',
        '--session',
        'dure-news-005930-latest',
        '--output',
        'json',
        '--prompt',
        'Open Naver news and extract articles',
      ],
    });
    expect(calls[0]?.options.timeoutMs).toBe(1234);
  });

  it('runs doctor lazily once before browser tasks', async () => {
    const runner = {
      run: vi.fn(async () => ({ stdout: '{}', stderr: '', exitCode: 0 })),
    };
    const client = new AgentBrowserClient({ runner });

    await client.runTask({ instruction: 'first', sessionNameSeed: 'first' });
    await client.runTask({ instruction: 'second', sessionNameSeed: 'second' });

    expect(runner.run.mock.calls.map(([command]) => command.args[0])).toEqual([
      'doctor',
      'run',
      'run',
    ]);
  });

  it('returns doctor failure without running the task', async () => {
    const runner = {
      run: vi.fn(async (command: AgentBrowserCommand) => {
        if (command.args[0] === 'doctor') {
          return { stdout: '', stderr: 'token=secret', exitCode: 1 };
        }
        return { stdout: '{}', stderr: '', exitCode: 0 };
      }),
    };
    const client = new AgentBrowserClient({ runner });

    const result = await client.runTask({ instruction: 'task', sessionNameSeed: 'task' });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'AGENT_BROWSER_DOCTOR_FAILED',
        message: 'agent-browser doctor failed with exit code 1',
        stdout: '',
        stderr: 'token=[REDACTED]',
      },
    });
    expect(runner.run).toHaveBeenCalledTimes(1);
  });

  it('returns install guidance when agent-browser is missing', async () => {
    const missing = Object.assign(new Error('spawn agent-browser ENOENT'), { code: 'ENOENT' });
    const runner = {
      run: vi.fn(async () => {
        throw missing;
      }),
    };
    const client = new AgentBrowserClient({ runner });

    const result = await client.doctor();

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'AGENT_BROWSER_NOT_INSTALLED',
      },
    });
  });
});

describe('agent-browser helpers', () => {
  it('redacts token, query, cookie, and authorization shaped secrets', () => {
    const redacted = redactBrowserOutput(
      [
        'https://example.test/path?token=secret&ok=1',
        'api_key: abc123',
        'Cookie: sid=abc; theme=light',
        'Authorization: Bearer secret',
      ].join('\n'),
    );

    expect(redacted).toContain('token=[REDACTED]');
    expect(redacted).toContain('api_key: [REDACTED]');
    expect(redacted).toContain('Cookie: [REDACTED]');
    expect(redacted).toContain('Authorization: [REDACTED]');
    expect(redacted).not.toContain('abc123');
    expect(redacted).not.toContain('Bearer secret');
  });

  it('builds stable session names', () => {
    expect(deterministicSessionName(' News: 005930 / 최신 ')).toBe('dure-news-005930');
  });
});
