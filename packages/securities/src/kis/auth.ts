import type { AuthClient, AuthToken, BrokerEnv } from "../types.js";
import type { KisCredentials, KisTokenRequest, KisTokenResponse } from "./types.js";

const BASE_URLS: Record<BrokerEnv, string> = {
  prod: "https://openapi.koreainvestment.com:9443",
  dev: "https://openapivts.koreainvestment.com:29443",
};

export function createKisAuthClient(env: BrokerEnv): AuthClient<KisCredentials> {
  const baseUrl = BASE_URLS[env];
  if (!baseUrl) {
    throw new Error(`Invalid BrokerEnv: "${env}". Expected "prod" or "dev".`);
  }

  return {
    async getToken(credentials: KisCredentials): Promise<AuthToken> {
      const body: KisTokenRequest = {
        grant_type: "client_credentials",
        appkey: credentials.appkey,
        appsecret: credentials.appsecret,
      };

      const response = await fetch(`${baseUrl}/oauth2/tokenP`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `KIS token request failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      const data: KisTokenResponse = await response.json();

      return {
        token: data.access_token,
        tokenType: data.token_type,
        expiresAt: parseKisDateTime(data.access_token_token_expired),
      };
    },
  };
}

function parseKisDateTime(dt: string): Date {
  // KIS returns access_token_token_expired as "yyyy-MM-dd HH:mm:ss"
  return new Date(`${dt.replace(" ", "T")}+09:00`);
}
