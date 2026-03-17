import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data/runs");

export class ArtifactStore {
  private cache = new Map<string, unknown>();

  private key(runId: string, agentName: string, artifactType: string): string {
    return `${runId}/${agentName}/${artifactType}`;
  }

  async put(runId: string, agentName: string, artifactType: string, data: unknown): Promise<void> {
    const k = this.key(runId, agentName, artifactType);
    this.cache.set(k, data);

    const dir = path.join(DATA_DIR, runId, agentName);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${artifactType}.json`), JSON.stringify(data, null, 2));
  }

  async get<T>(runId: string, agentName: string, artifactType: string): Promise<T | undefined> {
    const k = this.key(runId, agentName, artifactType);
    if (this.cache.has(k)) return this.cache.get(k) as T;

    try {
      const filePath = path.join(DATA_DIR, runId, agentName, `${artifactType}.json`);
      const raw = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as T;
      this.cache.set(k, parsed);
      return parsed;
    } catch {
      return undefined;
    }
  }

  async getRunArtifacts(runId: string): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();
    for (const [k, v] of this.cache) {
      if (k.startsWith(`${runId}/`)) result.set(k, v);
    }
    return result;
  }
}
