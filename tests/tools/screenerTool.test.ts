import { describe, it, expect } from "vitest";
import { evalOp } from "../../src/tools/screenerTool.js";

describe("evalOp", () => {
  it("gt: 큰 값이면 true", () => {
    expect(evalOp(10, "gt", 5)).toBe(true);
    expect(evalOp(5, "gt", 10)).toBe(false);
    expect(evalOp(5, "gt", 5)).toBe(false);
  });

  it("lt: 작은 값이면 true", () => {
    expect(evalOp(3, "lt", 5)).toBe(true);
    expect(evalOp(5, "lt", 3)).toBe(false);
    expect(evalOp(5, "lt", 5)).toBe(false);
  });

  it("gte: 크거나 같으면 true", () => {
    expect(evalOp(10, "gte", 5)).toBe(true);
    expect(evalOp(5, "gte", 5)).toBe(true);
    expect(evalOp(3, "gte", 5)).toBe(false);
  });

  it("lte: 작거나 같으면 true", () => {
    expect(evalOp(3, "lte", 5)).toBe(true);
    expect(evalOp(5, "lte", 5)).toBe(true);
    expect(evalOp(10, "lte", 5)).toBe(false);
  });

  it("eq: 같으면 true", () => {
    expect(evalOp(5, "eq", 5)).toBe(true);
    expect(evalOp(5, "eq", 3)).toBe(false);
  });

  it("잘못된 연산자는 false 반환", () => {
    expect(evalOp(5, "invalid", 5)).toBe(false);
    expect(evalOp(5, "", 5)).toBe(false);
  });
});
