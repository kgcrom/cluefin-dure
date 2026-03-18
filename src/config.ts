export const agentModelConfig = {
  universe: { provider: 'google-antigravity', modelId: 'gemini-3-flash' },
  fundamental: { provider: 'google-antigravity', modelId: 'claude-sonnet-4-6' },
  news: { provider: 'google-antigravity', modelId: 'gemini-3-flash' },
  strategy: { provider: 'google-antigravity', modelId: 'claude-sonnet-4-6' },
  backtest: { provider: 'google-antigravity', modelId: 'claude-sonnet-4-6' },
  critic: { provider: 'google-antigravity', modelId: 'claude-opus-4-6-thinking' },
  scenario: { provider: 'google-antigravity', modelId: 'claude-sonnet-4-6' },
  router: { provider: 'google-antigravity', modelId: 'gemini-3-flash' },
} as const;

export type AgentName = keyof typeof agentModelConfig;

export function getAgentModel(name: AgentName): { provider: string; modelId: string } {
  const envKey = `DURE_MODEL_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) {
    const [provider, modelId] = envVal.split(':');
    if (provider && modelId) return { provider, modelId };
  }
  return agentModelConfig[name];
}
