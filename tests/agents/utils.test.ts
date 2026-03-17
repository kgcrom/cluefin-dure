import { describe, it, expect } from "vitest";
import { buildSessionLabel, extractJsonFromMessage } from "../../src/agents/_utils.js";

describe("buildSessionLabel", () => {
  it("agentName:context 포맷으로 반환", () => {
    expect(buildSessionLabel("fundamental", "AAPL")).toBe("fundamental:AAPL");
  });
});

describe("extractJsonFromMessage", () => {
  it("```json 블록에서 JSON 추출", () => {
    const messages = [
      {
        role: "assistant",
        content: '분석 결과입니다:\n```json\n{"ticker": "AAPL", "score": 85}\n```',
      },
    ];
    const result = extractJsonFromMessage<{ ticker: string; score: number }>(messages);
    expect(result).toEqual({ ticker: "AAPL", score: 85 });
  });

  it("bare JSON object 추출", () => {
    const messages = [
      {
        role: "assistant",
        content: '결과: {"ticker": "MSFT", "score": 90}',
      },
    ];
    const result = extractJsonFromMessage<{ ticker: string; score: number }>(messages);
    expect(result).toEqual({ ticker: "MSFT", score: 90 });
  });

  it("JSON이 없으면 에러 발생", () => {
    const messages = [
      { role: "assistant", content: "JSON이 없는 응답입니다." },
    ];
    expect(() => extractJsonFromMessage(messages)).toThrow(
      "에이전트 응답에서 JSON을 추출할 수 없습니다."
    );
  });

  it("여러 메시지 중 마지막 assistant 메시지에서 추출", () => {
    const messages = [
      { role: "user", content: "분석해주세요" },
      { role: "assistant", content: '{"old": true}' },
      { role: "user", content: "다시 해주세요" },
      { role: "assistant", content: '{"latest": true}' },
    ];
    const result = extractJsonFromMessage<{ latest: boolean }>(messages);
    expect(result).toEqual({ latest: true });
  });
});
