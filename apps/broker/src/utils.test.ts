import { describe, expect, test } from "bun:test";
import { escapeSQL, parseBrokerEnv, requireEnv } from "./utils";

describe("parseBrokerEnv", () => {
  test("잘못된 값이면 에러", () => {
    expect(() => parseBrokerEnv("invalid")).toThrow("잘못된 환경값");
  });
});

describe("requireEnv", () => {
  test("환경변수가 없으면 에러", () => {
    delete process.env.TEST_MISSING_VAR;
    expect(() => requireEnv("TEST_MISSING_VAR")).toThrow("설정되지 않았습니다");
  });
});

describe("escapeSQL", () => {
  test("작은따옴표 → 두 개로 이스케이프", () => {
    expect(escapeSQL("O'Brien")).toBe("O''Brien");
  });
  test("작은따옴표 여러 개", () => {
    expect(escapeSQL("It's a 'test'")).toBe("It''s a ''test''");
  });
});
