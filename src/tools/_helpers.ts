import type { AgentToolResult } from '@earendil-works/pi-coding-agent';

export function toolResult<TDetails = undefined>(
  text: string,
  details?: TDetails,
): AgentToolResult<TDetails> {
  return {
    content: [{ type: 'text', text }],
    details: details as TDetails,
  };
}
