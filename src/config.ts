export const agentModelConfig = {
  universe: { provider: 'openai-codex', modelId: 'gpt-5.4-mini' },
  fundamental: { provider: 'openai-codex', modelId: 'gpt-5.4' },
  news: { provider: 'openai-codex', modelId: 'gpt-5.4-mini' },
  strategy: { provider: 'openai-codex', modelId: 'gpt-5.4' },
  backtest: { provider: 'openai-codex', modelId: 'gpt-5.4' },
  critic: { provider: 'openai-codex', modelId: 'gpt-5.4' },
  scenario: { provider: 'openai-codex', modelId: 'gpt-5.4' },
  router: { provider: 'openai-codex', modelId: 'gpt-5.3-codex-spark' },
} as const;

export type AgentName = keyof typeof agentModelConfig;

const providerPresets: Record<string, Record<AgentName, { provider: string; modelId: string }>> = {
  'openai-codex': {
    universe: { provider: 'openai-codex', modelId: 'gpt-5.4-mini' },
    fundamental: { provider: 'openai-codex', modelId: 'gpt-5.4' },
    news: { provider: 'openai-codex', modelId: 'gpt-5.4-mini' },
    strategy: { provider: 'openai-codex', modelId: 'gpt-5.4' },
    backtest: { provider: 'openai-codex', modelId: 'gpt-5.4' },
    critic: { provider: 'openai-codex', modelId: 'gpt-5.4' },
    scenario: { provider: 'openai-codex', modelId: 'gpt-5.4' },
    router: { provider: 'openai-codex', modelId: 'gpt-5.3-codex-spark' },
  },
  anthropic: {
    universe: { provider: 'anthropic', modelId: 'claude-haiku-4-5' },
    fundamental: { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
    news: { provider: 'anthropic', modelId: 'claude-haiku-4-5' },
    strategy: { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
    backtest: { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
    critic: { provider: 'anthropic', modelId: 'claude-opus-4-6' },
    scenario: { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
    router: { provider: 'anthropic', modelId: 'claude-haiku-4-5' },
  },
};

export function getAgentModel(name: AgentName): { provider: string; modelId: string } {
  // 1) 개별 에이전트 오버라이드 (최우선)
  const envKey = `DURE_MODEL_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) {
    const [provider, modelId] = envVal.split(':');
    if (provider && modelId) return { provider, modelId };
  }

  // 2) 전역 프로바이더 프리셋
  const globalProvider = process.env.DURE_PROVIDER;
  if (globalProvider) {
    const preset = providerPresets[globalProvider];
    if (preset) return preset[name];
    // 프리셋에 없는 프로바이더: 해당 프로바이더명 + 기존 modelId 폴백
    return { provider: globalProvider, modelId: agentModelConfig[name].modelId };
  }

  // 3) 하드코딩 기본값
  return agentModelConfig[name];
}
