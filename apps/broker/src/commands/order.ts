import { parseArgs } from "node:util";
import { cancel, intro, isCancel, log, outro, select, text } from "@clack/prompts";
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
  broker order list --help`;

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

async function addOrder(): Promise<void> {
  intro("주문 추가");

  const stockCode = await text({
    message: "종목코드를 입력하세요",
    placeholder: "005930",
    validate: (v) => (v.length === 0 ? "종목코드는 필수입니다" : undefined),
  });
  if (isCancel(stockCode)) {
    cancel("취소됨");
    process.exit(0);
  }

  const price = await text({
    message: "기준가격을 입력하세요",
    placeholder: "70000",
    validate: (v) => (Number.isNaN(Number(v)) || v.length === 0 ? "숫자를 입력하세요" : undefined),
  });
  if (isCancel(price)) {
    cancel("취소됨");
    process.exit(0);
  }

  const qty = await text({
    message: "수량을 입력하세요",
    placeholder: "10",
    validate: (v) => (Number.isNaN(Number(v)) || v.length === 0 ? "숫자를 입력하세요" : undefined),
  });
  if (isCancel(qty)) {
    cancel("취소됨");
    process.exit(0);
  }

  let broker: string;
  while (true) {
    const selected = await select({
      message: "증권사를 선택하세요",
      options: [
        { value: "kis", label: "KIS (한국투자증권)" },
        { value: "kiwoom", label: "Kiwoom (키움증권) — 지원예정", hint: "coming soon" },
      ],
    });
    if (isCancel(selected)) {
      cancel("취소됨");
      process.exit(0);
    }
    if (selected === "kiwoom") {
      log.warn("키움증권은 아직 지원되지 않습니다. 다른 증권사를 선택하세요.");
      continue;
    }
    broker = selected;
    break;
  }

  const target = await select({
    message: "실행 환경을 선택하세요",
    options: [
      { value: "remote", label: "Remote (원격 D1)" },
      { value: "local", label: "Local (로컬 D1)" },
    ],
  });
  if (isCancel(target)) {
    cancel("취소됨");
    process.exit(0);
  }

  const market = await select({
    message: "시장을 선택하세요",
    options: [
      { value: "kospi", label: "KOSPI" },
      { value: "kosdaq", label: "KOSDAQ" },
    ],
  });
  if (isCancel(market)) {
    cancel("취소됨");
    process.exit(0);
  }

  const remote = target === "remote";
  const trailingStop = "5.0";

  const sql = `INSERT INTO entry_orders (stock_code, reference_price, quantity, trailing_stop_pct, broker, market) VALUES ('${escapeSQL(stockCode)}', ${price}, ${qty}, ${trailingStop}, '${escapeSQL(broker)}', '${escapeSQL(market)}')`;
  const output = await execD1(sql, remote);
  outro("주문 추가 완료");
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
      return addOrder();
    case "list":
      return listOrders(rest, remote);
    case "cancel":
      return cancelOrder(rest, remote);
    default:
      console.error(ORDER_HELP);
      process.exit(1);
  }
}
