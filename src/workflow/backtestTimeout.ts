export const DEFAULT_BACKTEST_TIMEOUT_MINUTES = 7;
export const DEFAULT_BACKTEST_TIMEOUT_MS = DEFAULT_BACKTEST_TIMEOUT_MINUTES * 60_000;

export function resolveBacktestTimeoutMs(timeoutMs?: number): number | undefined {
  if (timeoutMs === undefined) {
    return DEFAULT_BACKTEST_TIMEOUT_MS;
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error('backtest timeoutMs는 0 이상의 유한한 숫자여야 합니다.');
  }

  if (timeoutMs === 0) {
    return undefined;
  }

  return timeoutMs;
}

export function timeoutMinutesToMs(timeoutMinutes?: number): number | undefined {
  if (timeoutMinutes === undefined) {
    return undefined;
  }

  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes < 0) {
    throw new Error('timeoutMinutes는 0 이상의 유한한 숫자여야 합니다.');
  }

  if (timeoutMinutes === 0) {
    return 0;
  }

  return Math.round(timeoutMinutes * 60_000);
}

export async function withBacktestTimeout<T>(
  operation: () => Promise<T>,
  options: {
    timeoutMs?: number;
    onTimeout?: () => Promise<void> | void;
    errorMessage?: string;
  } = {},
): Promise<T> {
  const resolvedTimeoutMs = resolveBacktestTimeoutMs(options.timeoutMs);
  if (resolvedTimeoutMs === undefined) {
    return operation();
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const operationPromise = operation().finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;

      Promise.resolve(options.onTimeout?.())
        .catch(() => undefined)
        .finally(() => {
          reject(
            new Error(
              options.errorMessage ??
                `백테스트가 ${Math.round(resolvedTimeoutMs / 60_000)}분 제한 시간을 초과했습니다.`,
            ),
          );
        });
    }, resolvedTimeoutMs);
  });

  try {
    return await Promise.race([operationPromise, timeoutPromise]);
  } catch (error) {
    if (timedOut && error instanceof Error) {
      throw error;
    }
    throw error;
  }
}
