import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const INDEX_FILE = 'MEMORY.md';

export class MemoryStore {
  private baseDir: string;

  constructor(baseDir = path.resolve('data/memory')) {
    this.baseDir = baseDir;
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
  }

  async readIndex(): Promise<string> {
    try {
      return await readFile(path.join(this.baseDir, INDEX_FILE), 'utf-8');
    } catch {
      return '';
    }
  }

  async readTopic(name: string): Promise<string | null> {
    try {
      return await readFile(path.join(this.baseDir, `${name}.md`), 'utf-8');
    } catch {
      return null;
    }
  }

  async listTopics(): Promise<string[]> {
    try {
      const files = await readdir(this.baseDir);
      return files
        .filter((f) => f.endsWith('.md') && f !== INDEX_FILE)
        .map((f) => f.slice(0, -3));
    } catch {
      return [];
    }
  }

  async appendToTopic(name: string, entry: string): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(this.baseDir, `${name}.md`);
    const today = new Date().toISOString().slice(0, 10);
    const separator = `\n<!-- ${today} -->\n`;

    let existing: string;
    try {
      existing = await readFile(filePath, 'utf-8');
    } catch {
      existing = `# ${name}\n`;
      // 새 파일이면 인덱스에 추가
      await this._addToIndex(name);
    }

    await writeFile(filePath, `${existing}${separator}${entry}\n`);
  }

  async writeTopic(name: string, content: string): Promise<void> {
    await this.ensureDir();
    await writeFile(path.join(this.baseDir, `${name}.md`), content);
  }

  async writeIndex(content: string): Promise<void> {
    await this.ensureDir();
    await writeFile(path.join(this.baseDir, INDEX_FILE), content);
  }

  async getMemoryContext(): Promise<string> {
    const index = await this.readIndex();
    if (!index) return '';
    return `<agent-memory>\n${index}\n</agent-memory>`;
  }

  async searchTopics(query: string): Promise<{ topic: string; matches: string[] }[]> {
    const topics = await this.listTopics();
    const results: { topic: string; matches: string[] }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const topic of topics) {
      const content = await this.readTopic(topic);
      if (!content) continue;

      const paragraphs = content.split(/\n\n+/);
      const matches = paragraphs.filter((p) => p.toLowerCase().includes(lowerQuery));
      if (matches.length > 0) {
        results.push({ topic, matches });
      }
    }

    return results;
  }

  private async _addToIndex(name: string): Promise<void> {
    const index = await this.readIndex();
    const entry = `- [${name}.md](${name}.md)\n`;
    if (!index.includes(`${name}.md`)) {
      const newIndex = index ? `${index}${entry}` : `# Memory Index\n\n${entry}`;
      await writeFile(path.join(this.baseDir, INDEX_FILE), newIndex);
    }
  }
}
