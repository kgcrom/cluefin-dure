import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  InteractiveMode,
  ModelRegistry,
  SessionManager,
} from '@mariozechner/pi-coding-agent';
import { loadPrompt } from '../agents/_utils.js';
import { getAgentModel } from '../config.js';
import { muteStdout } from '../runtime/log.js';
import { workflowTools } from '../tools/workflowTools.js';

export async function startInteractive(): Promise<void> {
  muteStdout();
  const systemPrompt = await loadPrompt('router', { includeMemory: false });
  const cwd = process.cwd();

  const agentDir = getAgentDir();
  const authStorage = AuthStorage.create(`${agentDir}/auth.json`);
  const modelRegistry = new ModelRegistry(authStorage);

  const modelConfig = getAgentModel('router');
  const model = modelRegistry.find(modelConfig.provider, modelConfig.modelId);

  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    systemPrompt,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    sessionManager: SessionManager.create(cwd),
    modelRegistry,
    model: model ?? undefined,
    tools: [],
    customTools: workflowTools,
    resourceLoader,
  });

  const interactive = new InteractiveMode(session);
  await interactive.run();
}
