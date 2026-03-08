import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createKiwoomAuthClient } from "./auth.js";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          return_code: 0,
          return_msg: "OK",
          token: "kiwoom-token-xyz",
          token_type: "Bearer",
          expires_dt: "20251231235959",
        }),
        { status: 200 },
      ),
    ),
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("createKiwoomAuthClient", () => {
  const credentials = { appkey: "my-appkey", secretkey: "my-secretkey" };

  test("sends correct request body", async () => {
    const client = createKiwoomAuthClient("prod");
    await client.getToken(credentials);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body).toEqual({
      grant_type: "client_credentials",
      appkey: "my-appkey",
      secretkey: "my-secretkey",
    });
  });

  test("parses response into AuthToken", async () => {
    const client = createKiwoomAuthClient("prod");
    const token = await client.getToken(credentials);

    expect(token.token).toBe("kiwoom-token-xyz");
    expect(token.tokenType).toBe("Bearer");
    expect(token.expiresAt).toBeInstanceOf(Date);
  });

  test("parses KST datetime correctly", async () => {
    const client = createKiwoomAuthClient("prod");
    const token = await client.getToken(credentials);

    const expected = new Date("2025-12-31T23:59:59+09:00");
    expect(token.expiresAt.getTime()).toBe(expected.getTime());
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 403, statusText: "Forbidden" })),
    );

    const client = createKiwoomAuthClient("prod");

    await expect(client.getToken(credentials)).rejects.toThrow(
      "Kiwoom token request failed: 403 Forbidden",
    );
  });
});
