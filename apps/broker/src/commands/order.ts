import { parseArgs } from "node:util";
import { escapeSQL, WRANGLER_CONFIG } from "../utils";

const DB_NAME = "cluefin-fsd-db";

const ORDER_HELP = `Usage: broker order <command> [options]

Commands:
  add       주문 추가
  list      주문 목록 조회
  cancel    주문 취소

공통 옵션:
  --remote          원격 D1 데이터베이스 사용 (기본: local)

각 명령의 상세 옵션은 --help 플래그로 확인:
  broker order add --help`;

const ADD_HELP = `Usage: broker order add [options]

D1 entry_orders 테이블에 새 진입 주문을 추가합니다.

필수 옵션:
  --stock-code <code>           종목코드 (예: 005930)
  --price <number>              기준가격
  --qty <number>                수량
  --broker <kis|kiwoom>         증권사
  --market <kospi|kosdaq>       시장 구분

선택 옵션:
  --trailing-stop <pct>         트레일링 스탑 비율 (기본: 5.0)
  -h, --help                    도움말 출력

예시:
  broker order add --stock-code 005930 --price 70000 --qty 10 --broker kis --market kospi
  broker order add --stock-code 005930 --price 70000 --qty 10 --broker kis --market kosdaq --trailing-stop 5.0`;

const LIST_HELP = `Usage: broker order list [options]

주문 목록을 조회합니다. 최신순으로 정렬됩니다.

선택 옵션:
  --broker <kis|kiwoom>                          증권사 필터
  --status <pending|monitoring|executed|cancelled> 상태 필터
  -h, --help                                     도움말 출력

예시:
  broker order list
  broker order list --broker kis --status pending`;

const CANCEL_HELP = `Usage: broker order cancel <id>

주문 상태를 cancelled로 변경합니다.

인자:
  id    취소할 주문 ID (숫자)

옵션:
  -h, --help    도움말 출력

예시:
  broker order cancel 3`;

async function execD1(sql: string, remote: boolean): Promise<string> {
  const args = [
    "bunx",
    "wrangler",
    "d1",
    "execute",
    DB_NAME,
    "--command",
    sql,
    "--config",
    WRANGLER_CONFIG,
  ];
  if (remote) args.push("--remote");

  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });

  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  if (exitCode !== 0) {
    console.error(`D1 명령 실패:\n${stderr}`);
    process.exit(1);
  }

  return stdout;
}

async function addOrder(args: string[], remote: boolean): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      "stock-code": { type: "string" },
      price: { type: "string" },
      qty: { type: "string" },
      broker: { type: "string" },
      market: { type: "string" },
      "trailing-stop": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(ADD_HELP);
    process.exit(0);
  }

  const stockCode = values["stock-code"];
  const price = values.price;
  const qty = values.qty;
  const broker = values.broker;
  const market = values.market;

  if (!stockCode || !price || !qty || !broker || !market) {
    console.error(ADD_HELP);
    process.exit(1);
  }

  if (!["kis", "kiwoom"].includes(broker)) {
    console.error('broker는 "kis" 또는 "kiwoom"이어야 합니다.');
    process.exit(1);
  }
  if (!["kospi", "kosdaq"].includes(market)) {
    console.error('market은 "kospi" 또는 "kosdaq"이어야 합니다.');
    process.exit(1);
  }

  const trailingStop = values["trailing-stop"] ?? "5.0";

  const sql = `INSERT INTO entry_orders (stock_code, reference_price, quantity, trailing_stop_pct, broker, market) VALUES ('${escapeSQL(stockCode)}', ${price}, ${qty}, ${trailingStop}, '${escapeSQL(broker)}', '${escapeSQL(market)}')`;
  const output = await execD1(sql, remote);
  console.log("주문 추가 완료");
  if (output.trim()) console.log(output);
}

async function listOrders(args: string[], remote: boolean): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      broker: { type: "string" },
      status: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(LIST_HELP);
    process.exit(0);
  }

  let sql = "SELECT * FROM entry_orders";
  const conditions: string[] = [];

  if (values.broker) {
    conditions.push(`broker = '${escapeSQL(values.broker)}'`);
  }
  if (values.status) {
    conditions.push(`status = '${escapeSQL(values.status)}'`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += " ORDER BY created_at DESC";

  const output = await execD1(sql, remote);
  console.log(output);
}

async function cancelOrder(args: string[], remote: boolean): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(CANCEL_HELP);
    process.exit(0);
  }

  const id = args[0];
  if (!id || Number.isNaN(Number(id))) {
    console.error(CANCEL_HELP);
    process.exit(1);
  }

  const sql = `UPDATE entry_orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ${Number(id)}`;
  const output = await execD1(sql, remote);
  console.log(`주문 #${id} 취소 완료`);
  if (output.trim()) console.log(output);
}

export async function runOrder(args: string[]): Promise<void> {
  const remoteIdx = args.indexOf("--remote");
  const remote = remoteIdx !== -1;
  const filtered = remote ? [...args.slice(0, remoteIdx), ...args.slice(remoteIdx + 1)] : args;

  const subcommand = filtered[0];
  const rest = filtered.slice(1);

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(ORDER_HELP);
    process.exit(0);
  }

  switch (subcommand) {
    case "add":
      return addOrder(rest, remote);
    case "list":
      return listOrders(rest, remote);
    case "cancel":
      return cancelOrder(rest, remote);
    default:
      console.error(ORDER_HELP);
      process.exit(1);
  }
}
