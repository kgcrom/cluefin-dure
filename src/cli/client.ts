import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { log } from '../runtime/log.js';

export type CliAppName = 'openapi' | 'ta';

type JsonSchema = Record<string, unknown>;

type RawListCommand = {
  broker?: string | null;
  category: string;
  name: string;
  qualified_name: string;
  path_segments: string[];
  description: string;
  parameters: JsonSchema;
  returns: JsonSchema;
  has_executor: boolean;
};

type RawListResponse = {
  commands: RawListCommand[];
};

type RawDescribeResponse = {
  command: RawListCommand;
};

export type CliCommandSummary = {
  app: CliAppName;
  broker: string | null;
  category: string;
  name: string;
  qualifiedName: string;
  pathSegments: string[];
  description: string;
  hasExecutor: boolean;
};

export type CliCommandSpec = CliCommandSummary & {
  alias: string;
  parameters: JsonSchema;
  returns: JsonSchema;
};

type CliProcessResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const CLI_APPS: Record<CliAppName, { packageName: string; appDirName: string }> = {
  openapi: {
    packageName: 'cluefin-openapi-cli',
    appDirName: 'cluefin-openapi-cli',
  },
  ta: {
    packageName: 'cluefin-ta-cli',
    appDirName: 'cluefin-ta-cli',
  },
};

const listCache = new Map<CliAppName, Promise<CliCommandSummary[]>>();
const detailCache = new Map<string, Promise<CliCommandSpec>>();

function getDefaultWorkspaceRoot(): string {
  return resolve(process.cwd(), '..', 'cluefin');
}

export function resolveCliWorkspaceRoot(configuredRoot = process.env.CLUEFIN_CLI_CWD): string {
  return resolve(configuredRoot ?? getDefaultWorkspaceRoot());
}

export function resolveCliLaunchOptions(
  app: CliAppName,
  configuredRoot = process.env.CLUEFIN_CLI_CWD,
): { cwd: string; cmd: string[]; root: string } {
  const root = resolveCliWorkspaceRoot(configuredRoot);
  const appDir = join(root, 'apps', CLI_APPS[app].appDirName);

  if (existsSync(join(appDir, 'pyproject.toml'))) {
    return {
      cwd: root,
      root,
      cmd: ['uv', 'run', CLI_APPS[app].packageName],
    };
  }

  throw new Error(
    [
      `CLUEFIN_CLI_CWD='${root}' 경로에서 ${CLI_APPS[app].packageName} 앱을 찾지 못했습니다.`,
      `기대 경로: ${appDir}`,
      'cluefin 워크스페이스 루트를 지정해주세요.',
    ].join(' '),
  );
}

function toAlias(pathSegments: string[]): string {
  return pathSegments.join('_').replaceAll('-', '_').replaceAll('.', '_');
}

function listArgs(app: CliAppName): string[] {
  return [...resolveCliLaunchOptions(app).cmd.slice(1), 'list', '--json'];
}

function describeArgs(app: CliAppName, pathSegments: string[]): string[] {
  return [...resolveCliLaunchOptions(app).cmd.slice(1), 'describe', ...pathSegments, '--json'];
}

function buildParamShape(params: Record<string, unknown>): string {
  if (Object.keys(params).length === 0) return 'none';
  return Object.entries(params)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}:array`;
      if (value && typeof value === 'object') return `${key}:object`;
      return `${key}:scalar`;
    })
    .join(',');
}

function parseJson<T>(stdout: string, context: string): T {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error(`${context}: stdout이 비어 있습니다.`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (_error) {
    log(`[cli] invalid json: ${context}`);
    throw new Error(`${context}: JSON 파싱에 실패했습니다.`);
  }
}

function spawnProcess(cwd: string, cmd: string[], context: string): Promise<CliProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const [command, ...args] = cmd;
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? '/tmp/uv-cache',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      reject(new Error(`${context}: ${error.message}`));
    });

    child.on('close', (code) => {
      resolvePromise({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

async function runCli(
  app: CliAppName,
  args: string[],
  logContext: string,
): Promise<CliProcessResult> {
  const { cwd, cmd } = resolveCliLaunchOptions(app);
  const fullCmd = [cmd[0] ?? 'uv', ...args];
  const result = await spawnProcess(cwd, fullCmd, logContext);
  log(`[cli] ${logContext} exit=${result.exitCode}`);
  if (result.exitCode !== 0) {
    throw new Error(
      [
        `${logContext}: CLI 실행 실패 (exit=${result.exitCode})`,
        result.stderr.trim(),
        result.stdout.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
  return result;
}

function toSummary(app: CliAppName, command: RawListCommand): CliCommandSummary {
  return {
    app,
    broker: command.broker ?? null,
    category: command.category,
    name: command.name,
    qualifiedName: command.qualified_name,
    pathSegments: [...command.path_segments],
    description: command.description,
    hasExecutor: command.has_executor,
  };
}

function toSpec(app: CliAppName, command: RawListCommand): CliCommandSpec {
  const summary = toSummary(app, command);
  return {
    ...summary,
    alias: toAlias(summary.pathSegments),
    parameters: command.parameters,
    returns: command.returns,
  };
}

export async function listCliCommands(app: CliAppName): Promise<CliCommandSummary[]> {
  const cached = listCache.get(app);
  if (cached) return cached;

  const promise = (async () => {
    const args = listArgs(app);
    const result = await runCli(app, args, `${app} list`);
    const payload = parseJson<RawListResponse>(result.stdout, `${app} list`);
    return (payload.commands ?? []).map((command) => toSummary(app, command));
  })();

  listCache.set(app, promise);
  return promise;
}

export async function describeCliCommand(
  app: CliAppName,
  pathSegments: string[],
): Promise<CliCommandSpec> {
  const key = `${app}:${pathSegments.join('/')}`;
  const cached = detailCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const args = describeArgs(app, pathSegments);
    const result = await runCli(app, args, `${app} describe ${pathSegments.join(' ')}`);
    const payload = parseJson<RawDescribeResponse>(
      result.stdout,
      `${app} describe ${pathSegments.join(' ')}`,
    );
    return toSpec(app, payload.command);
  })();

  detailCache.set(key, promise);
  return promise;
}

export async function getCliCommandByName(name: string): Promise<CliCommandSpec | undefined> {
  const all = await Promise.all([listCliCommands('openapi'), listCliCommands('ta')]);
  const matched = all
    .flat()
    .find((command) => command.qualifiedName === name || toAlias(command.pathSegments) === name);

  if (!matched) return undefined;
  return describeCliCommand(matched.app, matched.pathSegments);
}

export async function getCliCommandsForCategories(categories: string[]): Promise<CliCommandSpec[]> {
  const unique = [...new Set(categories)];
  const all = await Promise.all([listCliCommands('openapi'), listCliCommands('ta')]);
  const listed = all.flat();

  for (const category of unique) {
    if (!listed.some((command) => command.category === category && command.hasExecutor)) {
      throw new Error(`필수 CLI 카테고리 '${category}'를 discovery 결과에서 찾지 못했습니다.`);
    }
  }

  const matched = listed.filter(
    (command) => unique.includes(command.category) && command.hasExecutor,
  );

  return Promise.all(
    matched.map((command) => describeCliCommand(command.app, command.pathSegments)),
  );
}

function splitParams(
  schema: JsonSchema,
  params: Record<string, unknown>,
): { scalarArgs: string[]; paramsJson: Record<string, unknown> } {
  const properties = (schema.properties as Record<string, { type?: string }> | undefined) ?? {};
  const scalarArgs: string[] = [];
  const paramsJson: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!(key in properties)) {
      throw new Error(`알 수 없는 파라미터입니다: ${key}`);
    }

    const type = properties[key]?.type;
    if (type === 'array' || type === 'object') {
      paramsJson[key] = value;
      continue;
    }

    scalarArgs.push(`--${key.replaceAll('_', '-')}`, String(value));
  }

  return { scalarArgs, paramsJson };
}

export function getParamSummary(command: CliCommandSpec): string {
  const schema = command.parameters as {
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
  const props = schema.properties;
  if (!props || Object.keys(props).length === 0) return '(파라미터 없음)';

  const required = new Set(schema.required ?? []);
  return Object.entries(props)
    .map(([key, value]) => {
      const suffix = required.has(key) ? '' : '?';
      const type = value.type ?? 'unknown';
      const description = value.description ? ` — ${value.description}` : '';
      return `  ${key}${suffix}: ${type}${description}`;
    })
    .join('\n');
}

export function validateRequiredParams(
  command: CliCommandSpec,
  params: Record<string, unknown>,
): string[] {
  const required = ((command.parameters.required as string[] | undefined) ?? []).filter(
    (key) => params[key] === undefined || params[key] === null,
  );
  return required;
}

export async function executeCliCommand(
  command: CliCommandSpec,
  params: Record<string, unknown>,
): Promise<unknown> {
  const { cmd } = resolveCliLaunchOptions(command.app);
  const { scalarArgs, paramsJson } = splitParams(command.parameters, params);
  const args = [...cmd.slice(1), ...command.pathSegments];

  if (Object.keys(paramsJson).length > 0) {
    args.push('--params-json', JSON.stringify(paramsJson));
  }
  args.push(...scalarArgs, '--json');

  log(
    `[cli] exec app=${command.app} path=${command.pathSegments.join(' ')} params=${buildParamShape(params)}`,
  );
  const result = await runCli(
    command.app,
    args,
    `${command.app} ${command.pathSegments.join(' ')}`,
  );
  return parseJson(result.stdout, `${command.app} ${command.pathSegments.join(' ')}`);
}

export function resetCliDiscoveryCache(): void {
  listCache.clear();
  detailCache.clear();
}
