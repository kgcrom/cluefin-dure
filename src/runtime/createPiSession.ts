import {
  createAgentSession,
  SessionManager,
  ModelRegistry,
  AuthStorage,
  DefaultResourceLoader,
  readOnlyTools,
  codingTools,
  getAgentDir,
  type ToolDefinition,
  type AgentSession,
} from "@mariozechner/pi-coding-agent";
import { getAgentModel, type AgentName } from "../config.js";
import { EventRecorder } from "./eventRecorder.js";

export interface AgentSessionOptions {
  agentName: AgentName;
  sessionLabel: string;
  systemPrompt: string;
  customTools?: ToolDefinition[];
  useCodeTools?: boolean;
  eventRecorder?: EventRecorder;
}

export async function createPiSession(options: AgentSessionOptions): Promise<AgentSession> {
  const { agentName, sessionLabel, systemPrompt, customTools, useCodeTools, eventRecorder } = options;

  const agentDir = getAgentDir();
  const authStorage = AuthStorage.create(`${agentDir}/auth.json`);
  const modelRegistry = new ModelRegistry(authStorage);

  const modelConfig = getAgentModel(agentName);
  const model = modelRegistry.find(modelConfig.provider, modelConfig.modelId);

  const resourceLoader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir,
    systemPrompt,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
  });
  await resourceLoader.reload();

  const builtInTools = useCodeTools ? codingTools : readOnlyTools;

  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    modelRegistry,
    model: model ?? undefined,
    tools: builtInTools,
    customTools: customTools ?? [],
    resourceLoader,
  });

  if (eventRecorder) {
    eventRecorder.attachToSession(sessionLabel, session);
  }

  return session;
}
