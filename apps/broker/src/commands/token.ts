import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import type { AuthToken } from "@cluefin/securities";
import { createKisAuthClient, createKiwoomAuthClient } from "@cluefin/securities";
import { DEV_VARS_PATH, escapeSQL, parseBrokerEnv, requireEnv, WRANGLER_CONFIG } from "../utils.js";

export type RunTokenPersistMode = "all" | "token-only";
export type RunTokenOptions = {
  /**
   * 로컬 개발용 vars 파일(apps/trader/.dev.vars)에 반영할지 여부.
   * - true: wrangler secret put + .dev.vars upsert (기존 동작)
   * - false: wrangler secret put만 수행 (요구사항: "secret만 업데이트")
   */
  local?: boolean;
  /**
   * 어떤 시크릿을 저장할지.
   * - all: 토큰 + 관련 자격정보(기존 동작)
   * - token-only: 토큰만 저장 (스케줄러 기본)
   */
  persist?: RunTokenPersistMode;
};

async function putSecret(key: string, value: string): Promise<void> {
  console.log(`wrangler secret put ${key} 실행 중...`);

  const exitCode = await new Promise<number>((resolve, reject) => {
    const proc = spawn("npx", ["wrangler", "secret", "put", key, "--config", WRANGLER_CONFIG], {
      stdio: ["pipe", "inherit", "inherit"],
    });

    proc.on("error", reject);
    proc.on("close", (code) => resolve(code ?? 1));
    proc.stdin.write(value, "utf8");
    proc.stdin.end();
  });

  if (exitCode !== 0) {
    console.error(`wrangler secret put ${key} 실패 (exit code: ${exitCode})`);
    process.exit(1);
  }
  console.log(`${key} 시크릿 저장 완료`);
}

// Broker CLI는 개발 편의를 위해 apps/trader/.dev.vars를 업데이트하곤 했는데,
// Cloudflare Worker 크론(런타임)에서는 파일/시크릿을 직접 수정할 수 없으므로
// 스케줄링은 apps/trader 쪽에서 D1 등에 저장하는 방식으로 처리한다.
async function upsertDevVar(key: string, value: string): Promise<void> {
  let lines: string[] = [];
  try {
    const content = await readFile(DEV_VARS_PATH, "utf8");
    lines = content.split("\n");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const prefix = `${key}=`;
  const newLine = `${prefix}${value}`;
  const idx = lines.findIndex((l) => l.startsWith(prefix));

  if (idx >= 0) {
    lines[idx] = newLine;
  } else {
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.splice(lines.length - 1, 0, newLine);
    } else {
      lines.push(newLine);
    }
  }

  await writeFile(DEV_VARS_PATH, lines.join("\n"), "utf8");
  console.log(`.dev.vars에 ${key} 저장 완료\n`);
}

async function upsertD1Token(broker: string, token: AuthToken): Promise<void> {
  const nowIso = new Date().toISOString();
  const sql = `INSERT INTO broker_auth_tokens (broker, token, token_type, expires_at, updated_at)
    VALUES ('${escapeSQL(broker)}', '${escapeSQL(token.token)}', '${escapeSQL(token.tokenType)}', '${escapeSQL(token.expiresAt.toISOString())}', '${escapeSQL(nowIso)}')
    ON CONFLICT(broker) DO UPDATE SET
      token = excluded.token,
      token_type = excluded.token_type,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at`;

  const exitCode = await new Promise<number>((resolve, reject) => {
    const proc = spawn(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "cluefin-fsd-db",
        "--remote",
        "--command",
        sql,
        "--config",
        WRANGLER_CONFIG,
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );

    proc.on("error", reject);
    proc.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    console.error(`D1 broker_auth_tokens upsert 실패 (exit code: ${exitCode})`);
    process.exit(1);
  }
  console.log(`broker_auth_tokens에 ${broker} 토큰 저장 완료`);
}

async function saveSecret(
  key: string,
  value: string,
  opts: Required<Pick<RunTokenOptions, "local">>,
): Promise<void> {
  await putSecret(key, value);
  if (opts.local) {
    await upsertDevVar(key, value);
  }
}

// TODO: broker에서 토큰 발급하는게 아니라 cloudflare cron으로 실행
export async function runToken(broker: string, options: RunTokenOptions = {}): Promise<void> {
  if (!["kis", "kiwoom"].includes(broker)) {
    console.error("Usage: npm run start -- token <kis|kiwoom>");
    process.exit(1);
  }

  const opts: Required<RunTokenOptions> = {
    local: options.local ?? true,
    persist: options.persist ?? "all",
  };

  let token: AuthToken;

  if (broker === "kis") {
    const env = parseBrokerEnv(requireEnv("KIS_ENV"));
    const client = createKisAuthClient(env);
    token = await client.getToken({
      appkey: requireEnv("KIS_APP_KEY"),
      appsecret: requireEnv("KIS_SECRET_KEY"),
    });
  } else {
    const env = parseBrokerEnv(requireEnv("KIWOOM_ENV"));
    const client = createKiwoomAuthClient(env);
    token = await client.getToken({
      appkey: requireEnv("KIWOOM_APP_KEY"),
      secretkey: requireEnv("KIWOOM_SECRET_KEY"),
    });
  }

  console.log(`토큰 발급 완료: ${token.token.substring(0, 10)}...`);

  await upsertD1Token(broker, token);
  if (opts.local && broker !== "kis") {
    await upsertDevVar("BROKER_TOKEN_KIWOOM", token.token);
  }

  if (opts.persist === "token-only") return;

  if (broker === "kis") {
    await saveSecret("KIS_APP_KEY", requireEnv("KIS_APP_KEY"), { local: opts.local });
    await saveSecret("KIS_SECRET_KEY", requireEnv("KIS_SECRET_KEY"), { local: opts.local });
    await saveSecret("KIS_ACCOUNT_NO", requireEnv("KIS_ACCOUNT_NO"), { local: opts.local });
    await saveSecret("KIS_ACCOUNT_PRODUCT_CODE", requireEnv("KIS_ACCOUNT_PRODUCT_CODE"), {
      local: opts.local,
    });
  } else {
    await saveSecret("KIWOOM_APP_KEY", requireEnv("KIWOOM_APP_KEY"), { local: opts.local });
    await saveSecret("KIWOOM_SECRET_KEY", requireEnv("KIWOOM_SECRET_KEY"), { local: opts.local });
  }
}
