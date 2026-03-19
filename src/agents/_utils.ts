import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentSession } from '@mariozechner/pi-coding-agent';
import { MemoryStore } from '../memory/memoryStore.js';

const PROMPTS_DIR = path.resolve('research/prompts');
const SOUL_PROMPT_FILE = 'SOUL.md';
const MEMORY_INSTRUCTIONS_FILE = '_memory_instructions.md';

type PromptName =
  | 'router'
  | 'universe'
  | 'fundamental'
  | 'news'
  | 'strategy'
  | 'backtest'
  | 'critic'
  | 'scenario';

export interface LoadPromptOptions {
  includeMemory?: boolean;
  memoryStore?: MemoryStore;
}

export async function loadPrompt(
  name: PromptName,
  options: LoadPromptOptions = {},
): Promise<string> {
  const { includeMemory = name !== 'router', memoryStore = new MemoryStore() } = options;
  const sections = [await readPromptFile(SOUL_PROMPT_FILE), await readPromptFile(`${name}.md`)];

  if (!includeMemory) {
    return sections.join('\n\n');
  }

  const memoryContext = await memoryStore.getMemoryContext();
  if (!memoryContext) {
    return sections.join('\n\n');
  }

  const instructions = await readPromptFile(MEMORY_INSTRUCTIONS_FILE, true);
  if (instructions) {
    sections.push(instructions);
  }
  sections.push(memoryContext);

  return sections.join('\n\n');
}

async function readPromptFile(fileName: string, optional = false): Promise<string> {
  try {
    return await readFile(path.join(PROMPTS_DIR, fileName), 'utf-8');
  } catch (error) {
    if (optional) return '';
    throw error;
  }
}

export function buildSessionLabel(agentName: string, context: string): string {
  return `${agentName}:${context}`;
}

interface Message {
  role: string;
  content?: string | ContentBlock[];
}

interface ContentBlock {
  type: string;
  text?: string;
}

export function extractJsonFromMessage<T>(messages: Message[], callerContext?: string): T {
  // 마지막 assistant 메시지에서 JSON 추출
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== 'assistant') continue;

    const text =
      typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content
              .filter((b) => b.type === 'text')
              .map((b) => b.text ?? '')
              .join('\n')
          : '';

    if (!text) continue;

    // ```json 블록 추출
    const jsonBlockMatch = text.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch?.[1]) {
      return JSON.parse(jsonBlockMatch[1]) as T;
    }

    // bare JSON object 추출
    const bareMatch = text.match(/(\{[\s\S]*\})/);
    if (bareMatch?.[1]) {
      try {
        return JSON.parse(bareMatch[1]) as T;
      } catch {
        // 파싱 실패 시 다음 시도
      }
    }
  }

  // 디버깅을 위해 마지막 assistant 메시지 일부를 에러에 포함
  let lastText = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== 'assistant') continue;
    lastText =
      typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content
              .filter((b) => b.type === 'text')
              .map((b) => b.text ?? '')
              .join('\n')
          : '';
    if (lastText) break;
  }

  const prefix = callerContext ? `[${callerContext}] ` : '';
  throw new Error(
    `${prefix}에이전트 응답에서 JSON을 추출할 수 없습니다. 마지막 응답: "${lastText.slice(0, 200)}"`,
  );
}

/**
 * extractJsonFromMessage 실패 시 세션에 재프롬프트하여 JSON 추출을 재시도한다.
 */
export async function extractJsonWithRetry<T>(
  session: AgentSession,
  agentName?: string,
  maxRetries = 2,
): Promise<T> {
  // 첫 시도: 현재 메시지에서 추출
  try {
    return extractJsonFromMessage<T>(session.state.messages, agentName);
  } catch {
    // 재시도
  }

  const prefix = agentName ? `[${agentName}] ` : '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await session.prompt(
      '이전 응답에서 JSON을 추출할 수 없었습니다. 분석 결과를 유효한 JSON 형식으로 다시 반환해주세요. ```json 블록으로 감싸주세요.',
    );

    try {
      return extractJsonFromMessage<T>(session.state.messages, agentName);
    } catch {
      if (attempt === maxRetries) {
        // 마지막 응답 텍스트 추출
        let lastText = '';
        for (let i = session.state.messages.length - 1; i >= 0; i--) {
          const msg = session.state.messages[i] as Message;
          if (msg?.role !== 'assistant') continue;
          lastText =
            typeof msg.content === 'string'
              ? msg.content
              : Array.isArray(msg.content)
                ? (msg.content as ContentBlock[])
                    .filter((b) => b.type === 'text')
                    .map((b) => b.text ?? '')
                    .join('\n')
                : '';
          if (lastText) break;
        }
        throw new Error(
          `${prefix}${maxRetries}회 재시도 후에도 에이전트 응답에서 JSON을 추출할 수 없습니다. 마지막 응답: "${lastText.slice(0, 200)}"`,
        );
      }
    }
  }

  // unreachable but satisfies TypeScript
  throw new Error('extractJsonWithRetry: unreachable');
}
