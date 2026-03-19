import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { MemoryStore } from '../memory/memoryStore.js';
import { toolResult } from './_helpers.js';

const store = new MemoryStore();

// ── memory_read ──

const readParams = Type.Object({
  topic: Type.String({ description: '읽을 토픽 이름. "index"이면 MEMORY.md 반환' }),
});

const memoryReadTool: ToolDefinition<typeof readParams> = {
  name: 'memory_read',
  label: '메모리 읽기',
  description:
    '에이전트 메모리에서 토픽을 읽습니다. "index"를 지정하면 전체 목록을 확인할 수 있습니다.',
  parameters: readParams,
  async execute(_id, params: Static<typeof readParams>) {
    if (params.topic === 'index') {
      const content = await store.readIndex();
      return toolResult(content || '(메모리 인덱스 없음)');
    }
    const content = await store.readTopic(params.topic);
    return toolResult(content ?? `(토픽 '${params.topic}'을 찾을 수 없습니다)`);
  },
};

// ── memory_write ──

const writeParams = Type.Object({
  topic: Type.String({ description: '저장할 토픽 이름 (예: strategy_patterns, backtest_lessons)' }),
  content: Type.String({ description: '저장할 내용 (5줄 이내, 구체적 수치 포함)' }),
});

const memoryWriteTool: ToolDefinition<typeof writeParams> = {
  name: 'memory_write',
  label: '메모리 쓰기',
  description:
    '에이전트 메모리 토픽에 새 엔트리를 추가합니다. 반복 패턴, 교훈, 시장 관찰을 저장하세요.',
  parameters: writeParams,
  async execute(_id, params: Static<typeof writeParams>) {
    await store.appendToTopic(params.topic, params.content);
    return toolResult(`메모리 저장 완료: ${params.topic}`);
  },
};

// ── memory_search ──

const searchParams = Type.Object({
  query: Type.String({ description: '검색할 키워드' }),
});

const memorySearchTool: ToolDefinition<typeof searchParams> = {
  name: 'memory_search',
  label: '메모리 검색',
  description: '전체 메모리에서 키워드를 검색합니다.',
  parameters: searchParams,
  async execute(_id, params: Static<typeof searchParams>) {
    const results = await store.searchTopics(params.query);
    if (results.length === 0) {
      return toolResult(`'${params.query}'에 대한 메모리 없음`);
    }
    const text = results.map((r) => `## ${r.topic}\n${r.matches.join('\n\n')}`).join('\n\n---\n\n');
    return toolResult(text);
  },
};

// ── 에이전트별 도구 세트 ──

const READ_WRITE_AGENTS = new Set(['strategy', 'backtest', 'critic']);

export function getMemoryTools(agentName: string): ToolDefinition[] {
  const read = memoryReadTool as unknown as ToolDefinition;
  const search = memorySearchTool as unknown as ToolDefinition;
  const write = memoryWriteTool as unknown as ToolDefinition;

  if (READ_WRITE_AGENTS.has(agentName)) {
    return [read, write, search];
  }
  return [read, search];
}
