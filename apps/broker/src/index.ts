import { runOrder } from "./commands/order.js";
import { runToken } from "./commands/token.js";

const HELP = `Usage: broker <command> [options]

Commands:
  token <kis|kiwoom>        증권사 인증 토큰 발급
  order <add|list|cancel>   주문 관리

옵션:
  -h, --help                도움말 출력

예시:
  broker token kis
  broker order add --help`;

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "token": {
    const broker = args[1];
    if (!broker) {
      console.error("Usage: broker token <kis|kiwoom>");
      process.exit(1);
    }
    await runToken(broker);
    break;
  }
  case "order":
    await runOrder(args.slice(1));
    break;
  case "--help":
  case "-h":
    console.log(HELP);
    process.exit(0);
    break;
  default:
    // 기존 호환: 인자가 broker 이름이면 token 커맨드로 처리
    if (command && ["kis", "kiwoom"].includes(command)) {
      await runToken(command);
    } else {
      console.log(HELP);
      process.exit(command ? 1 : 0);
    }
}
