import { afterEach, describe, expect, it } from 'vitest';
import { getAgentModel } from '../src/config.js';

describe('getAgentModel', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('개별 agent override가 전역 provider보다 우선한다', () => {
    process.env.DURE_PROVIDER = 'anthropic';
    process.env.DURE_MODEL_NEWS = 'openai-codex:gpt-custom';

    expect(getAgentModel('news')).toEqual({
      provider: 'openai-codex',
      modelId: 'gpt-custom',
    });
  });

  it('전역 provider preset을 사용한다', () => {
    process.env.DURE_PROVIDER = 'anthropic';

    expect(getAgentModel('critic')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-opus-4-6',
    });
  });

  it('알 수 없는 provider는 provider만 바꾸고 기본 modelId를 유지한다', () => {
    process.env.DURE_PROVIDER = 'local';

    expect(getAgentModel('router')).toEqual({
      provider: 'local',
      modelId: 'gpt-5.3-codex-spark',
    });
  });

  it('잘못된 개별 override는 무시하고 fallback한다', () => {
    process.env.DURE_MODEL_STRATEGY = 'malformed';

    expect(getAgentModel('strategy')).toEqual({
      provider: 'openai-codex',
      modelId: 'gpt-5.4',
    });
  });
});
