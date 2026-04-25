export class SessionPool {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent = getDefaultMaxConcurrentSessions()) {}

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

export function getDefaultMaxConcurrentSessions(): number {
  const raw = process.env.DURE_MAX_CONCURRENT_SESSIONS;
  if (!raw) return 3;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return 3;

  return parsed;
}
