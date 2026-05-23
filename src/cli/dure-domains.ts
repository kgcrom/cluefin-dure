export type DureDomainName =
  | 'equity-research'
  | 'market-screening'
  | 'strategy-research'
  | 'scenario-analysis'
  | 'review-checklist';

export type DureDomainCliMapping = {
  domains: string[];
  tags: string[];
};

export const DURE_DOMAIN_CLI_MAPPINGS: Record<DureDomainName, DureDomainCliMapping> = {
  'equity-research': {
    domains: [
      'statements',
      'quote',
      'chart',
      'news',
      'corporate-actions',
      'trading-flow',
      'technical-indicator',
    ],
    tags: [
      'financial-statement',
      'financial-ratio',
      'current-price',
      'ohlcv',
      'announcement',
      'disclosure',
      'dividend',
      'foreign',
      'institution',
      'momentum',
      'moving-average',
    ],
  },
  'market-screening': {
    domains: ['market', 'sector', 'theme', 'etf', 'statements'],
    tags: [
      'ranking',
      'volume-rank',
      'market-cap',
      'sector-index',
      'theme-group',
      'financial-ratio',
    ],
  },
  'strategy-research': {
    domains: [
      'chart',
      'technical-indicator',
      'statements',
      'trading-flow',
      'market',
      'portfolio-metric',
      'risk-metric',
    ],
    tags: [
      'ohlcv',
      'moving-average',
      'momentum',
      'volatility',
      'financial-ratio',
      'foreign',
      'institution',
      'portfolio-risk',
    ],
  },
  'scenario-analysis': {
    domains: ['market', 'sector', 'theme', 'news', 'statements', 'quote'],
    tags: [
      'announcement',
      'disclosure',
      'sector-index',
      'theme-group',
      'current-price',
      'financial-ratio',
    ],
  },
  'review-checklist': {
    domains: ['statements', 'news', 'quote', 'trading-flow', 'corporate-actions'],
    tags: [
      'financial-statement',
      'financial-ratio',
      'announcement',
      'disclosure',
      'current-price',
      'foreign',
      'institution',
      'dividend',
    ],
  },
};

const AGENT_DURE_DOMAINS: Record<string, DureDomainName> = {
  universe: 'market-screening',
  fundamental: 'equity-research',
  news: 'scenario-analysis',
  strategy: 'strategy-research',
  critic: 'review-checklist',
  scenario: 'scenario-analysis',
};

export function getDureCliMappingForAgent(agentName: string): DureDomainCliMapping | undefined {
  const domain = AGENT_DURE_DOMAINS[agentName];
  return domain ? DURE_DOMAIN_CLI_MAPPINGS[domain] : undefined;
}
