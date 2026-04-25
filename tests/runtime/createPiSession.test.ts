import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authStorageCreate: vi.fn(() => ({ kind: 'auth' })),
  modelRegistryCreate: vi.fn(() => ({
    find: vi.fn(() => ({ kind: 'model' })),
  })),
  settingsManagerInMemory: vi.fn(() => ({ kind: 'settings' })),
  resourceLoaderReload: vi.fn(async () => undefined),
  createAgentSession: vi.fn(async () => ({
    session: {
      subscribe: vi.fn(() => () => undefined),
    },
  })),
  getAgentDir: vi.fn(() => '/tmp/pi-agent'),
  resourceLoaderConstructs: [] as unknown[],
}));

vi.mock('@mariozechner/pi-coding-agent', () => {
  class DefaultResourceLoader {
    constructor(options: unknown) {
      mocks.resourceLoaderConstructs.push(options);
    }

    reload = mocks.resourceLoaderReload;
  }

  return {
    AuthStorage: { create: mocks.authStorageCreate },
    ModelRegistry: { create: mocks.modelRegistryCreate },
    SettingsManager: { inMemory: mocks.settingsManagerInMemory },
    DefaultResourceLoader,
    SessionManager: { inMemory: vi.fn(() => ({ kind: 'session-manager' })) },
    createAgentSession: mocks.createAgentSession,
    getAgentDir: mocks.getAgentDir,
    codingTools: ['coding-tool'],
    readOnlyTools: ['read-only-tool'],
  };
});

describe('createPiSession', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.resourceLoaderConstructs.length = 0;
  });

  it('process-local runtime services와 같은 systemPrompt resource loader를 재사용한다', async () => {
    const { createPiSession } = await import('../../src/runtime/createPiSession.js');

    await createPiSession({
      agentName: 'news',
      sessionLabel: 'news:005930',
      systemPrompt: 'news prompt',
    });
    await createPiSession({
      agentName: 'news',
      sessionLabel: 'news:000660',
      systemPrompt: 'news prompt',
    });

    expect(mocks.getAgentDir).toHaveBeenCalledTimes(1);
    expect(mocks.authStorageCreate).toHaveBeenCalledTimes(1);
    expect(mocks.modelRegistryCreate).toHaveBeenCalledTimes(1);
    expect(mocks.settingsManagerInMemory).toHaveBeenCalledTimes(1);
    expect(mocks.resourceLoaderConstructs).toHaveLength(1);
    expect(mocks.resourceLoaderReload).toHaveBeenCalledTimes(1);
    expect(mocks.createAgentSession).toHaveBeenCalledTimes(2);
    expect(mocks.createAgentSession.mock.calls[0]?.[0]).toMatchObject({
      settingsManager: { kind: 'settings' },
      tools: ['read-only-tool'],
    });
  });

  it('useCodeTools가 켜지면 codingTools를 전달한다', async () => {
    const { createPiSession } = await import('../../src/runtime/createPiSession.js');

    await createPiSession({
      agentName: 'strategy',
      sessionLabel: 'strategy:quality',
      systemPrompt: 'strategy prompt',
      useCodeTools: true,
    });

    expect(mocks.createAgentSession.mock.calls.at(-1)?.[0]).toMatchObject({
      tools: ['coding-tool'],
    });
  });
});
