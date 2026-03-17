export const agentModelConfig = {
  universe: { provider: "anthropic", modelId: "claude-haiku-4-5-20251001" },
  fundamental: { provider: "anthropic", modelId: "claude-sonnet-4-6" },
  news: { provider: "anthropic", modelId: "claude-haiku-4-5-20251001" },
  strategy: { provider: "anthropic", modelId: "claude-sonnet-4-6" },
  backtest: { provider: "anthropic", modelId: "claude-sonnet-4-6" },
  critic: { provider: "anthropic", modelId: "claude-opus-4-6" },
  router: { provider: "anthropic", modelId: "claude-sonnet-4-6" },
} as const;

export type AgentName = keyof typeof agentModelConfig;

export function getAgentModel(name: AgentName): { provider: string; modelId: string } {
  const envKey = `DURE_MODEL_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) {
    const [provider, modelId] = envVal.split(":");
    if (provider && modelId) return { provider, modelId };
  }
  return agentModelConfig[name];
}
