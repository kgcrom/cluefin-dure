import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { StrategyDefinition } from "../schemas/backtest.js";

export interface StoredStrategy {
  id: string;
  strategy: StrategyDefinition;
  lastCriticVerdict: "keep" | "revise" | "reject";
  iterationCount: number;
  createdAt: string;
  updatedAt: string;
}

const DATA_PATH = path.resolve("data/processed/strategies.json");

export class StrategyRepo {
  private data: StoredStrategy[] = [];
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

  async list(): Promise<StoredStrategy[]> {
    await this.ensureLoaded();
    return this.data;
  }

  async get(id: string): Promise<StoredStrategy | undefined> {
    await this.ensureLoaded();
    return this.data.find((r) => r.id === id);
  }

  async add(record: StoredStrategy): Promise<void> {
    await this.ensureLoaded();
    this.data.push(record);
    await this.save();
  }

  async update(id: string, patch: Partial<StoredStrategy>): Promise<void> {
    await this.ensureLoaded();
    const idx = this.data.findIndex((r) => r.id === id);
    if (idx >= 0) {
      this.data[idx] = { ...this.data[idx]!, ...patch, updatedAt: new Date().toISOString() };
      await this.save();
    }
  }
}
