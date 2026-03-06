import { describe, expect, test } from "vitest";
import { buildSystemPrompt } from "./system-prompt.js";

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt();

  test("동종업종 비교 프로토콜 포함", () => {
    expect(prompt).toContain("동종업종 비교 프로토콜");
    expect(prompt).toContain("업종 내 상대 순위");
    expect(prompt).toContain("ranking.market_value");
  });

  test("데이터 품질 검증 포함", () => {
    expect(prompt).toContain("데이터 품질 검증");
    expect(prompt).toContain("OHLCV 배열 길이");
    expect(prompt).toContain("저유동성 종목");
  });

  test("추세 지속성 원칙 포함", () => {
    expect(prompt).toContain("추세 지속성 원칙");
    expect(prompt).toContain("5거래일");
    expect(prompt).toContain("3거래일 미만");
  });

  test("peer-comparison skill이 summaries에 포함", () => {
    expect(prompt).toContain("peer-comparison");
    expect(prompt).toContain("동종업종 피어 비교");
  });
});
