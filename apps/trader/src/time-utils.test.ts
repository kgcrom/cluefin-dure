import { describe, expect, test } from "bun:test";
import { getTodayKst } from "./time-utils";

describe("getTodayKst", () => {
  test("UTC 2025-01-05 23:00 → KST 2025-01-06 08:00", () => {
    const utc = new Date(Date.UTC(2025, 0, 5, 23, 0));
    expect(getTodayKst(utc)).toBe("20250106");
  });
  test("UTC 2025-01-06 00:00 → KST 2025-01-06 09:00", () => {
    const utc = new Date(Date.UTC(2025, 0, 6, 0, 0));
    expect(getTodayKst(utc)).toBe("20250106");
  });
  test("UTC 2025-01-06 14:59 → KST 2025-01-06 23:59", () => {
    const utc = new Date(Date.UTC(2025, 0, 6, 14, 59));
    expect(getTodayKst(utc)).toBe("20250106");
  });
  test("UTC 2025-01-06 15:00 → KST 2025-01-07 00:00", () => {
    const utc = new Date(Date.UTC(2025, 0, 6, 15, 0));
    expect(getTodayKst(utc)).toBe("20250107");
  });
});
