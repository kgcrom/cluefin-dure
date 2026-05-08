import { chatWorkflowTools } from '../../src/tools/workflowTools.js';

type CommandContext = {
  isIdle?: () => boolean;
  ui?: {
    notify?: (message: string, level: 'info' | 'warning') => void;
  };
};

type PiApi = {
  registerTool: (tool: unknown) => void;
  registerCommand: (
    name: string,
    command: {
      description: string;
      handler: (args: string, ctx: CommandContext) => Promise<void>;
    },
  ) => void;
  sendUserMessage: (message: string, options?: { deliverAs: 'followUp' }) => void;
};

const commands = {
  equity: {
    description: '종목 종합 분석을 실행합니다.',
    usage: 'Usage: /equity <ticker-or-request>',
    prompt: (args: string) => `종목 종합 분석을 실행하세요. 대상: ${args}`,
  },
  screen: {
    description: '종목 스크리닝을 실행합니다.',
    usage: 'Usage: /screen <criteria>',
    prompt: (args: string) => `종목 스크리닝을 실행하세요. 조건: ${args}`,
  },
  strategy: {
    description: '전략 리서치를 실행합니다.',
    usage: 'Usage: /strategy <theme>',
    prompt: (args: string) => `전략 리서치를 실행하세요. 주제: ${args}`,
  },
  scenario: {
    description: '시나리오 분석을 실행합니다.',
    usage: 'Usage: /scenario <scenario>',
    prompt: (args: string) => `시나리오 분석을 실행하세요. 시나리오: ${args}`,
  },
  review: {
    description: '투자 리뷰 체크리스트를 실행합니다.',
    usage: 'Usage: /review <request>',
    prompt: (args: string) => `투자 리뷰 체크리스트를 실행하세요. 요청: ${args}`,
  },
};

export default function financeCommands(pi: PiApi): void {
  const registeredToolNames = new Set<string>();
  for (const tool of chatWorkflowTools) {
    if (registeredToolNames.has(tool.name)) {
      continue;
    }
    registeredToolNames.add(tool.name);
    pi.registerTool(tool);
  }

  for (const [name, command] of Object.entries(commands)) {
    pi.registerCommand(name, {
      description: command.description,
      async handler(rawArgs, ctx) {
        const args = rawArgs.trim();
        if (!args) {
          ctx.ui?.notify?.(command.usage, 'warning');
          return;
        }

        const message = command.prompt(args);
        if (ctx.isIdle?.() ?? true) {
          pi.sendUserMessage(message);
          return;
        }

        pi.sendUserMessage(message, { deliverAs: 'followUp' });
        ctx.ui?.notify?.('요청을 현재 응답 이후에 실행하도록 큐에 넣었습니다.', 'info');
      },
    });
  }
}
