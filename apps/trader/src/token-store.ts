import type { AuthToken, BrokerEnv } from "@cluefin/securities";
import { createKisAuthClient, createKiwoomAuthClient } from "@cluefin/securities";
import type { Env } from "./bindings.js";

export type BrokerName = "kis" | "kiwoom";

export type StoredBrokerToken = {
  broker: BrokerName;
  token: string;
  tokenType: string;
  expiresAt: Date;
  updatedAt: Date;
};

function hasD1(db: unknown): db is D1Database {
  return !!db && typeof (db as { prepare?: unknown }).prepare === "function";
}

function envFallbackToken(env: Env, broker: BrokerName): string | null {
  if (broker === "kis") return null;
  const raw = env.BROKER_TOKEN_KIWOOM;
  if (!raw) return null;
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getStoredBrokerToken(
  env: Env,
  broker: BrokerName,
): Promise<StoredBrokerToken | null> {
  if (!hasD1(env.cluefin_fsd_db)) return null;

  const row = await env.cluefin_fsd_db
    .prepare(
      "SELECT broker, token, token_type, expires_at, updated_at FROM broker_auth_tokens WHERE broker = ?1 LIMIT 1",
    )
    .bind(broker)
    .first<{
      broker: BrokerName;
      token: string;
      token_type: string;
      expires_at: string;
      updated_at: string;
    }>();

  if (!row) return null;

  return {
    broker: row.broker,
    token: row.token,
    tokenType: row.token_type,
    expiresAt: new Date(row.expires_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function upsertBrokerToken(
  env: Env,
  broker: BrokerName,
  token: AuthToken,
): Promise<void> {
  if (!hasD1(env.cluefin_fsd_db)) return;

  const nowIso = new Date().toISOString();
  await env.cluefin_fsd_db
    .prepare(
      `INSERT INTO broker_auth_tokens (broker, token, token_type, expires_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(broker) DO UPDATE SET
         token = excluded.token,
         token_type = excluded.token_type,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`,
    )
    .bind(broker, token.token, token.tokenType, token.expiresAt.toISOString(), nowIso)
    .run();
}

export async function refreshBrokerToken(env: Env, broker: BrokerName): Promise<AuthToken> {
  const bEnv = (broker === "kis" ? env.KIS_ENV : env.KIWOOM_ENV) as BrokerEnv;

  if (broker === "kis") {
    const client = createKisAuthClient(bEnv);
    const token = await client.getToken({ appkey: env.KIS_APP_KEY, appsecret: env.KIS_SECRET_KEY });
    await upsertBrokerToken(env, broker, token);
    return token;
  }

  const client = createKiwoomAuthClient(bEnv);
  const token = await client.getToken({
    appkey: env.KIWOOM_APP_KEY,
    secretkey: env.KIWOOM_SECRET_KEY,
  });
  await upsertBrokerToken(env, broker, token);
  return token;
}

export async function getBrokerToken(env: Env, broker: BrokerName): Promise<string | null> {
  const stored = await getStoredBrokerToken(env, broker);

  // Token expiring very soon is treated as missing; cron should refresh it.
  const SKEW_MS = 60_000;
  if (stored && stored.expiresAt.getTime() - Date.now() > SKEW_MS) {
    return stored.token;
  }

  return envFallbackToken(env, broker);
}
