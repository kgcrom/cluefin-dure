import {
  type AgentSession,
  type AgentToolUpdateCallback,
  AuthStorage,
  codingTools,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRegistry,
  readOnlyTools,
  SessionManager,
  SettingsManager,
  type ToolDefinition,
} from '@mariozechner/pi-coding-agent';
import { type AgentName, getAgentModel } from '../config.js';
import type { EventRecorder } from './eventRecorder.js';

export interface AgentSessionOptions {
  agentName: AgentName;
  sessionLabel: string;
  systemPrompt: string;
  customTools?: ToolDefinition[];
  useCodeTools?: boolean;
  eventRecorder?: EventRecorder;
  onUpdate?: AgentToolUpdateCallback<null>;
}

interface PiRuntimeServices {
  agentDir: string;
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
  settingsManager: SettingsManager;
}

let servicesCache: PiRuntimeServices | undefined;
const resourceLoaderCache = new Map<string, Promise<DefaultResourceLoader>>();

function getPiRuntimeServices(): PiRuntimeServices {
  if (!servicesCache) {
    const agentDir = getAgentDir();
    const authStorage = AuthStorage.create(`${agentDir}/auth.json`);
    const modelRegistry = ModelRegistry.create(authStorage);
    const settingsManager = SettingsManager.inMemory({
      retry: {
        enabled: true,
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      },
      compaction: {
        enabled: true,
      },
    });

    servicesCache = {
      agentDir,
      authStorage,
      modelRegistry,
      settingsManager,
    };
  }

  return servicesCache;
}

async function getResourceLoader(params: {
  cwd: string;
  agentDir: string;
  settingsManager: SettingsManager;
  systemPrompt: string;
}): Promise<DefaultResourceLoader> {
  const key = JSON.stringify({
    cwd: params.cwd,
    agentDir: params.agentDir,
    systemPrompt: params.systemPrompt,
  });
  let cached = resourceLoaderCache.get(key);
  if (!cached) {
    cached = (async () => {
      const loader = new DefaultResourceLoader({
        cwd: params.cwd,
        agentDir: params.agentDir,
        settingsManager: params.settingsManager,
        systemPrompt: params.systemPrompt,
        noExtensions: true,
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
      });
      await loader.reload();
      return loader;
    })();
    resourceLoaderCache.set(key, cached);
  }

  return cached;
}

export async function createPiSession(options: AgentSessionOptions): Promise<AgentSession> {
  const {
    agentName,
    sessionLabel,
    systemPrompt,
    customTools,
    useCodeTools,
    eventRecorder,
    onUpdate,
  } = options;

  const { agentDir, modelRegistry, settingsManager } = getPiRuntimeServices();

  const modelConfig = getAgentModel(agentName);
  const model = modelRegistry.find(modelConfig.provider, modelConfig.modelId);

  const resourceLoader = await getResourceLoader({
    cwd: process.cwd(),
    agentDir,
    settingsManager,
    systemPrompt,
  });

  const builtInTools = useCodeTools ? codingTools : readOnlyTools;

  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    modelRegistry,
    model: model ?? undefined,
    tools: builtInTools,
    customTools: customTools ?? [],
    resourceLoader,
    settingsManager,
  });

  if (eventRecorder) {
    eventRecorder.attachToSession(sessionLabel, session, onUpdate);
  }

  return session;
}
