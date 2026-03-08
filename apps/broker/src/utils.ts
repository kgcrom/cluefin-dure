import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrokerEnv } from "@cluefin/securities";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT_DIR = path.resolve(currentDir, "../../..");
export const WRANGLER_CONFIG = path.join(PROJECT_ROOT_DIR, "apps/trader/wrangler.jsonc");
export const DEV_VARS_PATH = path.join(PROJECT_ROOT_DIR, "apps/trader/.dev.vars");

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}이(가) 설정되지 않았습니다.`);
  }
  return value;
}

export function parseBrokerEnv(raw: string): BrokerEnv {
  switch (raw) {
    case "prod":
      return "prod";
    case "dev":
      return "dev";
    default:
      throw new Error(`잘못된 환경값: "${raw}". "prod" 또는 "dev"를 사용하세요.`);
  }
}

export function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}
