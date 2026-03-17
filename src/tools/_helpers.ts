import type { AgentToolResult } from "@mariozechner/pi-coding-agent";

export function toolResult(text: string): AgentToolResult<undefined> {
  return {
    content: [{ type: "text", text }],
    details: undefined,
  };
}
