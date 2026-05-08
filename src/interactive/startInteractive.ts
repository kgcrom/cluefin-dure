import {
  AuthStorage,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  InteractiveMode,
  ModelRegistry,
  SessionManager,
} from '@earendil-works/pi-coding-agent';
import { loadPrompt } from '../agents/_utils.js';
import { getAgentModel } from '../config.js';
import { muteStdout } from '../runtime/log.js';

export async function startInteractive(): Promise<void> {
  muteStdout();
  const systemPrompt = await loadPrompt('router', { includeMemory: false });
  const cwd = process.cwd();
  const agentDir = getAgentDir();
  const authStorage = AuthStorage.create(`${agentDir}/auth.json`);
  const modelRegistry = ModelRegistry.create(authStorage);
  const modelConfig = getAgentModel('router');
  const model = modelRegistry.find(modelConfig.provider, modelConfig.modelId);
  const sessionManager = SessionManager.create(cwd);
  const runtime = await createAgentSessionRuntime(
    async ({ cwd: runtimeCwd, agentDir: runtimeAgentDir, sessionManager, sessionStartEvent }) => {
      const services = await createAgentSessionServices({
        cwd: runtimeCwd,
        agentDir: runtimeAgentDir,
        authStorage,
        modelRegistry,
        resourceLoaderOptions: {
          systemPrompt,
          noExtensions: true,
          additionalExtensionPaths: ['.pi/extensions/finance-commands.ts'],
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
        },
      });

      return {
        ...(await createAgentSessionFromServices({
          services,
          sessionManager,
          sessionStartEvent,
          model: model ?? undefined,
          noTools: 'builtin',
        })),
        services,
        diagnostics: services.diagnostics,
      };
    },
    {
      cwd,
      agentDir,
      sessionManager,
    },
  );

  const interactive = new InteractiveMode(runtime, {
    modelFallbackMessage: runtime.modelFallbackMessage,
  });
  await interactive.run();
}
