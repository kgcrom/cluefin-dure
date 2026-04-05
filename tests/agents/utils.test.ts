import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../../src/memory/memoryStore.js';
import {
  buildSessionLabel,
  extractJsonFromMessage,
  extractTextFromMessage,
  loadPrompt,
} from '../../src/agents/_utils.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("buildSessionLabel", () => {
  it("agentName:context 포맷으로 반환", () => {
    expect(buildSessionLabel("fundamental", "005930")).toBe("fundamental:005930");
  });
});

describe("extractJsonFromMessage", () => {
  it("```json 블록에서 JSON 추출", () => {
    const messages = [
      {
        role: "assistant",
        content: '분석 결과입니다:\n```json\n{"ticker": "005930", "score": 85}\n```',
      },
    ];
    const result = extractJsonFromMessage<{ ticker: string; score: number }>(messages);
    expect(result).toEqual({ ticker: "005930", score: 85 });
  });

  it("bare JSON object 추출", () => {
    const messages = [
      {
        role: "assistant",
        content: '결과: {"ticker": "000660", "score": 90}',
      },
    ];
    const result = extractJsonFromMessage<{ ticker: string; score: number }>(messages);
    expect(result).toEqual({ ticker: "000660", score: 90 });
  });

  it("JSON이 없으면 에러 발생", () => {
    const messages = [
      { role: "assistant", content: "JSON이 없는 응답입니다." },
    ];
    expect(() => extractJsonFromMessage(messages)).toThrow(
      "에이전트 응답에서 JSON을 추출할 수 없습니다."
    );
  });

  it("여러 메시지 중 마지막 assistant 메시지에서 추출", () => {
    const messages = [
      { role: "user", content: "분석해주세요" },
      { role: "assistant", content: '{"old": true}' },
      { role: "user", content: "다시 해주세요" },
      { role: "assistant", content: '{"latest": true}' },
    ];
    const result = extractJsonFromMessage<{ latest: boolean }>(messages);
    expect(result).toEqual({ latest: true });
  });
});

describe('extractTextFromMessage', () => {
  it('마지막 assistant 텍스트를 그대로 추출', () => {
    const result = extractTextFromMessage([
      { role: 'assistant', content: '첫 번째 응답' },
      { role: 'assistant', content: '최종 Markdown 응답' },
    ]);

    expect(result).toBe('최종 Markdown 응답');
  });
});

describe('loadPrompt', () => {
  it('공통 SOUL 이후에 역할 프롬프트를 조합한다', async () => {
    const prompt = await loadPrompt('fundamental');

    expect(prompt).toContain('## Who We Are');
    expect(prompt).toContain('# 역할: 펀더멘털 분석 에이전트');
    expect(prompt.indexOf('## Who We Are')).toBeLessThan(
      prompt.indexOf('# 역할: 펀더멘털 분석 에이전트'),
    );
  });

  it('메모리가 있으면 메모리 지침과 컨텍스트를 함께 붙인다', async () => {
    const tempDir = path.join(os.tmpdir(), `prompt-memory-${Date.now()}`);
    tempDirs.push(tempDir);
    const memoryStore = new MemoryStore(tempDir);
    await memoryStore.writeIndex('# Memory Index\n- [market_observations.md](market_observations.md)\n');

    const prompt = await loadPrompt('strategy', { memoryStore });

    expect(prompt).toContain('## 메모리 시스템 사용 지침');
    expect(prompt).toContain('<agent-memory>');
    expect(prompt).toContain('market_observations.md');
  });

  it('메모리가 없으면 메모리 블록 없이 안전하게 반환한다', async () => {
    const tempDir = path.join(os.tmpdir(), `prompt-memory-${Date.now()}`);
    tempDirs.push(tempDir);
    const prompt = await loadPrompt('news', { memoryStore: new MemoryStore(tempDir) });

    expect(prompt).not.toContain('## 메모리 시스템 사용 지침');
    expect(prompt).not.toContain('<agent-memory>');
  });

  it('router도 동일한 공통 프롬프트 조합 경로를 사용한다', async () => {
    const prompt = await loadPrompt('router', { includeMemory: false });

    expect(prompt).toContain('## Who We Are');
    expect(prompt).toContain('# Dure 투자 분석 어시스턴트');
    expect(prompt).not.toContain('<agent-memory>');
  });

  it('review checklist prompt bundle도 동일한 helper로 로드된다', async () => {
    const prompt = await loadPrompt(
      ['review_checklist_base', 'review_checklist_company'],
      { includeMemory: false },
    );

    expect(prompt).toContain('# 역할: 투자 결과 리뷰 체크리스트');
    expect(prompt).toContain('# 역할: 회사 분석 완결성 리뷰어');
    expect(prompt).not.toContain('<agent-memory>');
  });
});
