import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `memory-tools-test-${Date.now()}-${Math.random()}`);
  await mkdir(tmpDir, { recursive: true });
  process.chdir(tmpDir);
  vi.resetModules();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tmpDir, { recursive: true, force: true });
});

describe('getMemoryTools', () => {
  it('strategy와 critic에게만 write 도구를 제공한다', async () => {
    const { getMemoryTools } = await import('../../src/tools/memoryTools.js');

    expect(getMemoryTools('strategy').map((tool) => tool.name)).toEqual([
      'memory_read',
      'memory_write',
      'memory_search',
    ]);
    expect(getMemoryTools('critic').map((tool) => tool.name)).toContain('memory_write');
    expect(getMemoryTools('fundamental').map((tool) => tool.name)).toEqual([
      'memory_read',
      'memory_search',
    ]);
  });

  it('write 후 topic과 index를 읽고 검색할 수 있다', async () => {
    const { getMemoryTools } = await import('../../src/tools/memoryTools.js');
    const tools = getMemoryTools('strategy');
    const write = findTool(tools, 'memory_write');
    const read = findTool(tools, 'memory_read');
    const search = findTool(tools, 'memory_search');

    await executeText(write, {
      topic: 'strategy_patterns',
      content: 'ROE deterioration before price weakness is a warning sign.',
    });

    await expect(executeText(read, { topic: 'index' })).resolves.toContain('strategy_patterns.md');
    await expect(executeText(read, { topic: 'strategy_patterns' })).resolves.toContain(
      'ROE deterioration',
    );
    await expect(executeText(search, { query: 'warning sign' })).resolves.toContain(
      '## strategy_patterns',
    );
  });

  it('없는 topic과 검색 결과 없음 메시지를 명확히 반환한다', async () => {
    const { getMemoryTools } = await import('../../src/tools/memoryTools.js');
    const tools = getMemoryTools('fundamental');

    await expect(executeText(findTool(tools, 'memory_read'), { topic: 'missing' })).resolves.toBe(
      "(토픽 'missing'을 찾을 수 없습니다)",
    );
    await expect(executeText(findTool(tools, 'memory_search'), { query: 'absent' })).resolves.toBe(
      "'absent'에 대한 메모리 없음",
    );
  });
});

function findTool(tools: ToolDefinition[], name: string): ToolDefinition {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`missing tool: ${name}`);
  return tool;
}

async function executeText(tool: ToolDefinition, params: unknown): Promise<string> {
  const result = await tool.execute(
    'tool-call',
    params as never,
    undefined,
    undefined,
    {} as never,
  );
  return result.content[0].text;
}
