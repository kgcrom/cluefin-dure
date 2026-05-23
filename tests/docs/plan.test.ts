import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const planDir = new URL('../../docs/plan/', import.meta.url);

function readPlanFile(name: string): string {
  return readFileSync(new URL(name, planDir), 'utf-8');
}

describe('plan artifacts', () => {
  it('feature_list.json is valid and records verification gates', () => {
    const featureList = JSON.parse(readPlanFile('feature_list.json')) as {
      status?: string;
      completion_policy?: { phase_end_commands?: string[]; requires_tests?: boolean };
      phases?: Array<{ id: string; status?: string; verification?: string[] }>;
    };

    expect(featureList.status).toBe('completed');
    expect(featureList.completion_policy?.requires_tests).toBe(true);
    expect(featureList.completion_policy?.phase_end_commands).toEqual([
      'npm run format',
      'npm run lint',
      'npm test',
    ]);
    expect(featureList.phases?.map((phase) => phase.id)).toEqual([
      'phase-1',
      'phase-2',
      'phase-3',
      'phase-4',
      'phase-5',
      'phase-6',
      'phase-7',
    ]);
    expect(featureList.phases?.every((phase) => phase.verification?.includes('npm test'))).toBe(
      true,
    );
    expect(featureList.phases?.every((phase) => phase.status === 'completed')).toBe(true);
  });

  it('PRD defines Pi resource responsibility boundaries', () => {
    const prd = readPlanFile('pi-resource-structure-prd.md');

    expect(prd).toContain('Extension');
    expect(prd).toContain('Prompt template');
    expect(prd).toContain('Skill');
    expect(prd).toContain('Interactive router 세션');
    expect(prd).toContain('내부 workflow agent 세션');
  });

  it('taxonomy map keeps Dure domains separate from cluefin taxonomy', () => {
    const taxonomyMap = readPlanFile('pi-resource-taxonomy-map.md');

    expect(taxonomyMap).toContain('equity-research');
    expect(taxonomyMap).toContain('market-screening');
    expect(taxonomyMap).toContain('cluefin domains');
    expect(taxonomyMap).toContain('Fallback Rule');
  });

  it('README and architecture document Pi resources and taxonomy fallback', () => {
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf-8');
    const architecture = readFileSync(
      new URL('../../docs/architecture.md', import.meta.url),
      'utf-8',
    );

    expect(readme).toContain('Pi Project Resources');
    expect(readme).toContain('.pi/extensions/dure-workflow-tools.ts');
    expect(readme).toContain('cluefin CLI fallback');
    expect(architecture).toContain('Pi Resources');
    expect(architecture).toContain('taxonomy metadata가 없는 오래된 CLI 응답');
  });
});
