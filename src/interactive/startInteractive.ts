import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAgentSession,
  SessionManager,
  ModelRegistry,
  AuthStorage,
  DefaultResourceLoader,
  InteractiveMode,
  getAgentDir,
} from "@mariozechner/pi-coding-agent";
import { getAgentModel } from "../config.js";
import { workflowTools } from "../tools/workflowTools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRouterPrompt(): string {
  const promptPath = resolve(__dirname, "../../research/prompts/router.md");
  return readFileSync(promptPath, "utf-8");
}

export async function startInteractive(): Promise<void> {
  const systemPrompt = loadRouterPrompt();
  const cwd = process.cwd();

  const agentDir = getAgentDir();
  const authStorage = AuthStorage.create(`${agentDir}/auth.json`);
  const modelRegistry = new ModelRegistry(authStorage);

  const modelConfig = getAgentModel("router");
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
