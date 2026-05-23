import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authStorageCreate: vi.fn(() => ({ kind: 'auth' })),
  modelRegistryCreate: vi.fn(() => ({
    find: vi.fn(() => ({ kind: 'router-model' })),
  })),
  sessionManagerCreate: vi.fn(() => ({ kind: 'session-manager' })),
  createAgentSessionRuntime: vi.fn(async (factory, options) => {
    await factory({
      cwd: options.cwd,
      agentDir: options.agentDir,
      sessionManager: options.sessionManager,
      sessionStartEvent: { kind: 'session-start' },
    });
    return { modelFallbackMessage: undefined };
  }),
  createAgentSessionServices: vi.fn(async () => ({
    diagnostics: [],
  })),
  createAgentSessionFromServices: vi.fn(async () => ({
    session: { kind: 'session' },
  })),
  interactiveRun: vi.fn(async () => undefined),
  getAgentDir: vi.fn(() => '/tmp/pi-agent'),
}));

vi.mock('@earendil-works/pi-coding-agent', () => {
  class InteractiveMode {
    constructor(
      readonly runtime: unknown,
      readonly options: unknown,
    ) {}

    run = mocks.interactiveRun;
  }

  return {
    AuthStorage: { create: mocks.authStorageCreate },
    ModelRegistry: { create: mocks.modelRegistryCreate },
    SessionManager: { create: mocks.sessionManagerCreate },
    createAgentSessionRuntime: mocks.createAgentSessionRuntime,
    createAgentSessionServices: mocks.createAgentSessionServices,
    createAgentSessionFromServices: mocks.createAgentSessionFromServices,
    getAgentDir: mocks.getAgentDir,
    InteractiveMode,
  };
});

vi.mock('../../src/agents/_utils.js', () => ({
  loadPrompt: vi.fn(async () => 'router prompt'),
}));

vi.mock('../../src/config.js', () => ({
  getAgentModel: vi.fn(() => ({ provider: 'openai', modelId: 'router-model' })),
}));

vi.mock('../../src/runtime/log.js', () => ({
  muteStdout: vi.fn(),
}));

describe('startInteractive', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('router 세션에서 project extensions, prompts, skills discovery를 비활성화하지 않는다', async () => {
    const { startInteractive } = await import('../../src/interactive/startInteractive.js');

    await startInteractive();

    const servicesOptions = mocks.createAgentSessionServices.mock.calls[0]?.[0];
    expect(servicesOptions).toMatchObject({
      resourceLoaderOptions: {
        systemPrompt: 'router prompt',
        noThemes: true,
      },
    });
    expect(servicesOptions.resourceLoaderOptions).not.toHaveProperty('noExtensions');
    expect(servicesOptions.resourceLoaderOptions).not.toHaveProperty('additionalExtensionPaths');
    expect(servicesOptions.resourceLoaderOptions).not.toHaveProperty('noSkills');
    expect(servicesOptions.resourceLoaderOptions).not.toHaveProperty('noPromptTemplates');
  });
});
