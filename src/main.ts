import { StrategyRepo } from './memory/strategyRepo.js';
import { runBacktestLoop } from './workflow/runBacktestLoop.js';
import { runEquityAnalysis } from './workflow/runEquityAnalysis.js';
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
        console.error('예시: equity AAPL');
        process.exit(1);
      }
      const result = await runEquityAnalysis({ ticker });
      console.log('\n=== 분석 결과 ===');
      console.log(JSON.stringify(result, null, 2));
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
      console.log('\n=== 스크리닝 결과 ===');
      console.log(JSON.stringify(result, null, 2));
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
      console.log('\n=== 전략 리서치 결과 ===');
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'backtest': {
      const strategyId = args[0];
      if (!strategyId) {
        console.error('사용법: backtest <strategyId>');
        process.exit(1);
      }
      const repo = new StrategyRepo();
      const stored = await repo.get(strategyId);
      if (!stored) {
        console.error(`전략 ${strategyId}를 찾을 수 없습니다.`);
        console.error('저장된 전략 목록:');
        const all = await repo.list();
        for (const s of all) console.error(`  - ${s.id}: ${s.strategy.name}`);
        process.exit(1);
      }
      const result = await runBacktestLoop({
        strategy: stored.strategy,
        tickers: ['AAPL', 'MSFT', '005930'],
        maxIterations: 3,
      });
      console.log('\n=== 백테스트 루프 결과 ===');
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.log('Dure - 투자 의사결정 Multi-Agent System\n');
      console.log('사용법:');
      console.log('  chat                     대화형 모드 (AI 라우터)');
      console.log('  equity <ticker>         종목 종합 분석');
      console.log('  screen [market] [style]  종목 스크리닝');
      console.log('  strategy <theme...>      전략 리서치');
      console.log('  backtest <strategyId>    백테스트 루프');
      console.log('\n예시:');
      console.log('  npx tsx src/main.ts chat');
      console.log('  npx tsx src/main.ts equity AAPL');
      console.log('  npx tsx src/main.ts screen KR value');
      console.log('  npx tsx src/main.ts strategy "저PER 고ROE 퀄리티 밸류"');
  }
}

main().catch((err) => {
  console.error('오류:', err);
  process.exit(1);
});
