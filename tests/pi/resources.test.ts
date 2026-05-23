import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const root = new URL('../../', import.meta.url);

function readProjectFile(path: string): string {
  return readFileSync(new URL(path, root), 'utf-8');
}

function parseFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match?.[1]) return {};

  return Object.fromEntries(
    match[1].split('\n').map((line) => {
      const [key, ...value] = line.split(':');
      return [key.trim(), value.join(':').trim().replace(/^"|"$/g, '')];
    }),
  );
}

describe('Pi project resources', () => {
  it('workflow extension registers chat workflow tools without slash commands', async () => {
    const extension = await import('../../.pi/extensions/dure-workflow-tools.ts');
    const pi = {
      registerTool: vi.fn(),
      registerCommand: vi.fn(),
    };

    extension.default(pi);

    const toolNames = pi.registerTool.mock.calls.map(([tool]) => tool.name);
    expect(toolNames).toEqual([
      'run_equity_analysis',
      'run_screening',
      'run_strategy_research',
      'run_scenario_analysis',
      'run_review_checklist',
    ]);
    expect(new Set(toolNames).size).toBe(toolNames.length);
    expect(pi.registerCommand).not.toHaveBeenCalled();
  });

  it('slash UX is represented as project prompt templates', () => {
    const prompts = ['equity', 'screen', 'strategy', 'scenario', 'review'];

    for (const prompt of prompts) {
      const path = `.pi/prompts/${prompt}.md`;
      expect(existsSync(new URL(path, root))).toBe(true);

      const content = readProjectFile(path);
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.description).toBeTruthy();
      expect(frontmatter['argument-hint']).toMatch(/^<.+>$/);
      expect(content).toContain('$ARGUMENTS');
    }
  });

  it('initial skills follow Pi skill naming and description rules', () => {
    const skills = ['dure-investing-workflows', 'cluefin-data-discovery'];

    for (const skill of skills) {
      const path = `.pi/skills/${skill}/SKILL.md`;
      expect(existsSync(new URL(path, root))).toBe(true);

      const content = readProjectFile(path);
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBe(skill);
      expect(frontmatter.description.length).toBeGreaterThan(20);
      expect(frontmatter.description.length).toBeLessThanOrEqual(1024);
    }
  });
});
