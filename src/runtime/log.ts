import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';

let writer: (msg: string) => void = (msg) => console.log(msg);

export function muteStdout(): void {
  writer = (msg) => process.stderr.write(`${msg}\n`);
}

export function log(msg: string): void {
  writer(msg);
}

export function createOnUpdateLogger(
  onUpdate: AgentToolUpdateCallback<null>,
): (msg: string) => void {
  return (msg: string) => {
    onUpdate({
      content: [{ type: 'text', text: msg }],
      details: null,
    });
  };
}
