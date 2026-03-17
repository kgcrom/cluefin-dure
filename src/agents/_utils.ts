import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PROMPTS_DIR = path.resolve('research/prompts');

export async function loadPrompt(name: string): Promise<string> {
  const filePath = path.join(PROMPTS_DIR, `${name}.md`);
  return readFile(filePath, 'utf-8');
}

export function buildSessionLabel(agentName: string, context: string): string {
  return `${agentName}:${context}`;
}

interface Message {
  role: string;
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: string;
  text?: string;
}

export function extractJsonFromMessage<T>(messages: Message[]): T {
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

  throw new Error('에이전트 응답에서 JSON을 추출할 수 없습니다.');
}
