export interface DeterministicEvalExpectations {
  runIdPrefix?: string;
  requiredPaths?: string[];
  minArrayLengths?: Record<string, number>;
  equals?: Record<string, unknown>;
  includes?: Record<string, string[]>;
  oneOf?: Record<string, unknown[]>;
}

export interface EvalCheckResult {
  key: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

export interface EvalGrade {
  passed: boolean;
  checks: EvalCheckResult[];
}

export function gradeDeterministicOutput(
  actual: unknown,
  expectations: DeterministicEvalExpectations,
): EvalGrade {
  const checks: EvalCheckResult[] = [];

  if (expectations.runIdPrefix) {
    const runId = getPathValue(actual, 'runId');
    checks.push({
      key: 'runIdPrefix',
      passed: typeof runId === 'string' && runId.startsWith(expectations.runIdPrefix),
      expected: expectations.runIdPrefix,
      actual: runId,
    });
  }

  for (const path of expectations.requiredPaths ?? []) {
    const value = getPathValue(actual, path);
    checks.push({
      key: `required:${path}`,
      passed: value !== undefined && value !== null,
      actual: value,
    });
  }

  for (const [path, minLength] of Object.entries(expectations.minArrayLengths ?? {})) {
    const value = getPathValue(actual, path);
    checks.push({
      key: `minArrayLength:${path}`,
      passed: Array.isArray(value) && value.length >= minLength,
      expected: minLength,
      actual: Array.isArray(value) ? value.length : value,
    });
  }

  for (const [path, expected] of Object.entries(expectations.equals ?? {})) {
    const value = getPathValue(actual, path);
    checks.push({
      key: `equals:${path}`,
      passed: valuesEqual(value, expected),
      expected,
      actual: value,
    });
  }

  for (const [path, expectedValues] of Object.entries(expectations.oneOf ?? {})) {
    const value = getPathValue(actual, path);
    checks.push({
      key: `oneOf:${path}`,
      passed: expectedValues.some((expected) => valuesEqual(value, expected)),
      expected: expectedValues,
      actual: value,
    });
  }

  for (const [path, snippets] of Object.entries(expectations.includes ?? {})) {
    const value = getPathValue(actual, path);
    for (const snippet of snippets) {
      checks.push({
        key: `includes:${path}`,
        passed: typeof value === 'string' && value.includes(snippet),
        expected: snippet,
        actual: value,
      });
    }
  }

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}

export function summarizeFailedChecks(grade: EvalGrade): string {
  return grade.checks
    .filter((check) => !check.passed)
    .map((check) =>
      [
        check.key,
        `expected=${JSON.stringify(check.expected)}`,
        `actual=${JSON.stringify(check.actual)}`,
      ].join(' '),
    )
    .join('\n');
}

function getPathValue(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
