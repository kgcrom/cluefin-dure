import type { AuthClient, AuthToken, BrokerEnv } from "../types.js";
import type { KiwoomCredentials, KiwoomTokenRequest, KiwoomTokenResponse } from "./types.js";

const BASE_URLS: Record<BrokerEnv, string> = {
  prod: "https://api.kiwoom.com",
  dev: "https://mockapi.kiwoom.com",
};

export function createKiwoomAuthClient(env: BrokerEnv): AuthClient<KiwoomCredentials> {
  const baseUrl = BASE_URLS[env];
  if (!baseUrl) {
    throw new Error(`Invalid BrokerEnv: "${env}". Expected "prod" or "dev".`);
  }

  return {
    async getToken(credentials: KiwoomCredentials): Promise<AuthToken> {
      const body: KiwoomTokenRequest = {
        grant_type: "client_credentials",
        appkey: credentials.appkey,
        secretkey: credentials.secretkey,
      };

      const response = await fetch(`${baseUrl}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Kiwoom token request failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      const data: KiwoomTokenResponse = await response.json();

      if (data.return_code !== 0) {
        throw new Error(
          `Kiwoom token request failed: code: ${data.return_code}, msg: ${data.return_msg}`,
        );
      }

      return {
        token: data.token,
        tokenType: data.token_type,
        expiresAt: parseKiwoomDateTime(data.expires_dt),
      };
    },
  };
}

function parseKiwoomDateTime(dt: string): Date {
  // Kiwoom returns expires_dt as "yyyyMMddHHmmss"
  const year = dt.slice(0, 4);
  const month = dt.slice(4, 6);
  const day = dt.slice(6, 8);
  const hour = dt.slice(8, 10);
  const minute = dt.slice(10, 12);
  const second = dt.slice(12, 14);

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`);
}
