import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ExperimentRecord } from "../schemas/signal.js";

const DATA_PATH = path.resolve("data/processed/experiments.json");

export class ExperimentRepo {
  private data: ExperimentRecord[] = [];
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(DATA_PATH, "utf-8");
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

  async list(): Promise<ExperimentRecord[]> {
    await this.ensureLoaded();
    return this.data;
  }

  async get(id: string): Promise<ExperimentRecord | undefined> {
    await this.ensureLoaded();
    return this.data.find((r) => r.id === id);
  }

  async add(record: ExperimentRecord): Promise<void> {
    await this.ensureLoaded();
    this.data.push(record);
    await this.save();
  }

  async update(id: string, patch: Partial<ExperimentRecord>): Promise<void> {
    await this.ensureLoaded();
    const idx = this.data.findIndex((r) => r.id === id);
    if (idx >= 0) {
      this.data[idx] = { ...this.data[idx]!, ...patch };
      await this.save();
    }
  }
}
