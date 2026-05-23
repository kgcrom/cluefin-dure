import { chatWorkflowTools } from '../../src/tools/workflowTools.js';

type PiApi = {
  registerTool: (tool: unknown) => void;
};

export default function dureWorkflowTools(pi: PiApi): void {
  const registeredToolNames = new Set<string>();

  for (const tool of chatWorkflowTools) {
    if (registeredToolNames.has(tool.name)) {
      continue;
    }
    registeredToolNames.add(tool.name);
    pi.registerTool(tool);
  }
}
