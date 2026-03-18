import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../../src/memory/memoryStore.js';

let tmpDir: string;
let store: MemoryStore;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `memoryStore-test-${Date.now()}`);
  store = new MemoryStore(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('readIndex', () => {
  it('파일 없으면 빈 문자열 반환', async () => {
    expect(await store.readIndex()).toBe('');
  });

  it('writeIndex 후 readIndex로 읽기', async () => {
    await store.writeIndex('# Memory Index\n');
    expect(await store.readIndex()).toBe('# Memory Index\n');
  });
});

describe('readTopic / writeTopic', () => {
  it('없는 토픽은 null 반환', async () => {
    expect(await store.readTopic('nonexistent')).toBeNull();
  });

  it('writeTopic 후 readTopic으로 읽기', async () => {
    await store.writeTopic('test', '# Test\n내용');
    expect(await store.readTopic('test')).toBe('# Test\n내용');
  });
});

describe('listTopics', () => {
  it('디렉토리 없으면 빈 배열', async () => {
    expect(await store.listTopics()).toEqual([]);
  });

  it('토픽 파일 목록 반환 (MEMORY.md 제외)', async () => {
    await store.writeTopic('alpha', '내용');
    await store.writeTopic('beta', '내용');
    await store.writeIndex('인덱스');
    const topics = await store.listTopics();
    expect(topics).toContain('alpha');
    expect(topics).toContain('beta');
    expect(topics).not.toContain('MEMORY');
  });
});

describe('appendToTopic', () => {
  it('새 토픽 생성 및 인덱스 자동 추가', async () => {
    await store.appendToTopic('lessons', '첫 번째 교훈');
    const content = await store.readTopic('lessons');
    expect(content).toContain('첫 번째 교훈');

    const index = await store.readIndex();
    expect(index).toContain('lessons.md');
  });

  it('기존 토픽에 내용 추가', async () => {
    await store.appendToTopic('lessons', '첫 번째 교훈');
    await store.appendToTopic('lessons', '두 번째 교훈');
    const content = await store.readTopic('lessons');
    expect(content).toContain('첫 번째 교훈');
    expect(content).toContain('두 번째 교훈');
  });

  it('날짜 구분자 포함', async () => {
    await store.appendToTopic('test', '내용');
    const content = await store.readTopic('test');
    expect(content).toMatch(/<!-- \d{4}-\d{2}-\d{2} -->/);
  });
});

describe('getMemoryContext', () => {
  it('메모리 없으면 빈 문자열', async () => {
    expect(await store.getMemoryContext()).toBe('');
  });

  it('메모리 있으면 <agent-memory> 태그로 감싸 반환', async () => {
    await store.writeIndex('# Memory Index\n- test');
    const ctx = await store.getMemoryContext();
    expect(ctx).toContain('<agent-memory>');
    expect(ctx).toContain('</agent-memory>');
    expect(ctx).toContain('# Memory Index');
  });
});

describe('searchTopics', () => {
  it('매칭 없으면 빈 배열', async () => {
    await store.writeTopic('topic1', '관련 없는 내용');
    const results = await store.searchTopics('찾을수없는키워드');
    expect(results).toEqual([]);
  });

  it('키워드 포함 단락 추출', async () => {
    await store.writeTopic('strategy', '저PER 전략이 효과적이었다\n수익률 15%\n\n다른 단락 내용');
    const results = await store.searchTopics('저PER');
    expect(results).toHaveLength(1);
    expect(results[0].topic).toBe('strategy');
    expect(results[0].matches[0]).toContain('저PER');
  });

  it('여러 토픽에서 검색', async () => {
    await store.writeTopic('a', '공통 키워드 포함');
    await store.writeTopic('b', '공통 키워드 다른 내용');
    const results = await store.searchTopics('공통 키워드');
    expect(results).toHaveLength(2);
  });
});
