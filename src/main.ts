import { fileURLToPath } from 'node:url';
import { generateReport, printTerminalSummary } from './report/generateReport.js';
import { closeRpcClient } from './rpc/rpc-client.js';
import { runEquityAnalysis } from './workflow/runEquityAnalysis.js';
import { runScenarioAnalysis } from './workflow/runScenarioAnalysis.js';
import { runScreening } from './workflow/runScreening.js';
import { runStrategyResearch } from './workflow/runStrategyResearch.js';

const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case 'chat': {
      const { startInteractive } = await import('./interactive/startInteractive.js');
      await startInteractive();
      break;
    }

    case 'equity': {
      const ticker = args[0];
      if (!ticker) {
        console.error('사용법: equity <ticker>');
        console.error('예시: equity 005930');
        process.exit(1);
      }
      const result = await runEquityAnalysis({ ticker });
      const input = { type: 'equity' as const, result };
      const reportPath = await generateReport(input);
      printTerminalSummary(input);
      console.log(`\n  리포트: ${reportPath}`);
      break;
    }

    case 'screen': {
      const market = args[0];
      const style = args[1];
      const result = await runScreening({
        market,
        style,
        filterRules: args.slice(2).join(' ') || undefined,
      });
      const input = { type: 'screen' as const, result };
      const reportPath = await generateReport(input);
      printTerminalSummary(input);
      console.log(`\n  리포트: ${reportPath}`);
      break;
    }

    case 'strategy': {
      const theme = args.join(' ');
      if (!theme) {
        console.error('사용법: strategy <테마/가설>');
        console.error('예시: strategy "저PER 고ROE 퀄리티 밸류"');
        process.exit(1);
      }
      const result = await runStrategyResearch({ theme });
      const input = { type: 'strategy' as const, result };
      const reportPath = await generateReport(input);
      printTerminalSummary(input);
      console.log(`\n  리포트: ${reportPath}`);
      break;
    }

    case 'scenario': {
      const scenario = args.join(' ');
      if (!scenario) {
        console.error('사용법: scenario <시나리오>');
        console.error('예시: scenario "연준이 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"');
        process.exit(1);
      }
      const result = await runScenarioAnalysis({ scenario });
      const input = { type: 'scenario' as const, result };
      const reportPath = await generateReport(input);
      printTerminalSummary(input);
      console.log(`\n  리포트: ${reportPath}`);
      break;
    }

    default:
      console.log('Dure - 투자 의사결정 Multi-Agent System\n');
      console.log('사용법:');
      console.log('  chat                     대화형 모드 (AI 라우터)');
      console.log('  equity <ticker>         종목 종합 분석');
      console.log('  screen [market] [style]  종목 스크리닝');
      console.log('  strategy <theme...>      전략 리서치');
      console.log('  scenario <시나리오>        What-if 시나리오 분석');
      console.log('\n예시:');
      console.log('  npx tsx src/main.ts chat');
      console.log('  npx tsx src/main.ts equity 005930');
      console.log('  npx tsx src/main.ts screen KR value');
      console.log('  npx tsx src/main.ts strategy "저PER 고ROE 퀄리티 밸류"');
      console.log(
        '  npx tsx src/main.ts scenario "연준이 50bp 긴급 인하하면 반도체 섹터 어떻게 되나?"',
      );
  }
}

async function shutdown() {
  await closeRpcClient();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then(shutdown)
    .catch(async (err) => {
      console.error('오류:', err);
      await closeRpcClient();
      process.exit(1);
    });
}
