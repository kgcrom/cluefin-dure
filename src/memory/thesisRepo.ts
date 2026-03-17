import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface Thesis {
  id: string;
  ticker: string;
  hypothesis: string;
  evidence: string[];
  status: 'active' | 'invalidated' | 'confirmed';
  createdAt: string;
  updatedAt: string;
}

const DATA_PATH = path.resolve('data/processed/theses.json');

export class ThesisRepo {
  private data: Thesis[] = [];
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(DATA_PATH, 'utf-8');
      this.data = JSON.parse(raw);
    } catch {
      this.data = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await mkdir(path.dirname(DATA_PATH), { recursive: true });
    await writeFile(DATA_PATH, JSON.stringify(this.data, null, 2));
  }

  async list(): Promise<Thesis[]> {
    await this.ensureLoaded();
    return this.data;
  }

  async get(id: string): Promise<Thesis | undefined> {
    await this.ensureLoaded();
    return this.data.find((r) => r.id === id);
  }

  async add(record: Thesis): Promise<void> {
    await this.ensureLoaded();
    this.data.push(record);
    await this.save();
  }

  async update(id: string, patch: Partial<Thesis>): Promise<void> {
    await this.ensureLoaded();
    const idx = this.data.findIndex((r) => r.id === id);
    if (idx >= 0) {
      this.data[idx] = {
        ...this.data[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      } as Thesis;
      await this.save();
    }
  }
}
