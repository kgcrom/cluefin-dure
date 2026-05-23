import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chatWorkflowTools } from '../../src/tools/workflowTools.js';
import { routerIntentFixtures } from './routerIntentFixtures.js';

describe('router intent eval fixtures', () => {
  it('각 fixture가 노출된 chat workflow tool과 매핑된다', () => {
    const toolsByName = new Map(chatWorkflowTools.map((tool) => [tool.name, tool]));

    for (const fixture of routerIntentFixtures) {
      const tool = toolsByName.get(fixture.expectedTool);
      expect(tool, `${fixture.id} expected missing tool ${fixture.expectedTool}`).toBeDefined();

      const schema = JSON.parse(JSON.stringify(tool?.parameters)) as {
        properties?: Record<string, unknown>;
      };

      for (const key of fixture.expectedParamKeys) {
        expect(
          schema.properties,
          `${fixture.id} expected ${fixture.expectedTool}.${key} parameter`,
        ).toHaveProperty(key);
      }
    }
  });

  it('router prompt가 fixture의 기대 tool들을 설명한다', async () => {
    const routerPrompt = await readFile(path.resolve('research/prompts/router.md'), 'utf-8');

    for (const fixture of routerIntentFixtures) {
      expect(fixture.utterance.trim().length).toBeGreaterThan(0);
      expect(routerPrompt).toContain(fixture.expectedTool);
    }
  });
});
