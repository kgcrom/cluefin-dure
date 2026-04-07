import { describe, expect, it } from 'vitest';
import type { AgentSession } from '@mariozechner/pi-coding-agent';
import {
  extractJsonWithValidationRetry,
  validateCriticReportEnglish,
  validateStrategyEnglish,
} from '../../src/agents/_utils.js';
import type { CriticReport, StrategyDefinition } from '../../src/schemas/strategy.js';

function createSession(messages: Array<{ role: string; content: string }>): AgentSession {
  return {
    state: { messages },
    async prompt(text: string) {
      this.state.messages.push({ role: 'user', content: text });
      this.state.messages.push({
        role: 'assistant',
        content: [
          '```json',
          JSON.stringify(
            {
              name: 'Quality Value Strategy',
              hypothesis:
                'Companies with strong returns on equity and discounted valuation can outperform.',
              entryRules: ['PE < 15', 'ROE > 15%'],
              exitRules: ['PE > 25', 'ROE < 10%'],
              positionSizing: 'Equal weight',
              rebalancePeriod: 'Quarterly',
              config: { reviewNote: 'Use trailing fundamentals' },
            },
            null,
            2,
          ),
          '```',
        ].join('\n'),
      });
    },
  } as unknown as AgentSession;
}

describe('English normalization helpers', () => {
  it('validateStrategyEnglish detects Hangul in strategy fields', () => {
    const strategy: StrategyDefinition = {
      name: '퀄리티 밸류',
      hypothesis: 'Strong businesses can outperform.',
      entryRules: ['PE < 15'],
      exitRules: ['ROE < 10%'],
      positionSizing: 'Equal weight',
      rebalancePeriod: 'Quarterly',
      config: {},
    };

    expect(validateStrategyEnglish(strategy)).toBe('strategy.name');
  });

  it('validateCriticReportEnglish detects Hangul in recommendations', () => {
    const report: CriticReport = {
      overfittingRisk: 'Low due to limited rule count.',
      dataLeakageCheck: 'Pass because the rules use trailing data only.',
      survivorshipBias: 'Moderate because the universe is fixed.',
      regimeDependency: 'Medium in liquidity shocks.',
      verdict: 'revise',
      recommendations: ['리밸런싱 주기를 늦춰라'],
    };

    expect(validateCriticReportEnglish(report)).toBe('critic.recommendations[0]');
  });

  it('extractJsonWithValidationRetry repairs mixed-language strategy output once', async () => {
    const session = createSession([
      {
        role: 'assistant',
        content: [
          '```json',
          JSON.stringify(
            {
              name: '퀄리티 밸류 전략',
              hypothesis: 'Companies with strong profitability can outperform.',
              entryRules: ['PE < 15'],
              exitRules: ['ROE < 10%'],
              positionSizing: 'Equal weight',
              rebalancePeriod: 'Quarterly',
              config: {},
            },
            null,
            2,
          ),
          '```',
        ].join('\n'),
      },
    ]);

    const result = await extractJsonWithValidationRetry<StrategyDefinition>(
      session,
      validateStrategyEnglish,
      'Return every strategy field in English only.',
      'strategy',
    );

    expect(result.name).toBe('Quality Value Strategy');
    expect(validateStrategyEnglish(result)).toBeNull();
  });
});
