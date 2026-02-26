import path from "node:path";
import { StdioJsonRpcClient } from "./stdio-jsonrpc-client";
import { ToolRegistry } from "./tool-registry";

const HELP = `Usage: dure <command> [options]

Commands:
  tools                         사용 가능한 RPC 메서드 목록
  call <method> [json_params]   RPC 메서드 직접 호출
  quote <stock_code>            KIS 주식 현재가 조회

Examples:
  bun run start tools
  bun run start call rpc.ping
  bun run start call quote.kis.stock_current '{"stock_code":"005930"}'
  bun run start quote 005930`;

function createClient(): StdioJsonRpcClient {
  return new StdioJsonRpcClient({
    cmd: ["uv", "run", "-m", "cluefin_rpc"],
    cwd: path.resolve(import.meta.dir, "../../../../cluefin"),
    defaultTimeoutMs: 30_000,
  });
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }

  const client = createClient();
  client.start();

  try {
    if (command === "tools") {
      const registry = new ToolRegistry(client);
      await registry.discover();
      const tools = registry.toAnthropicTools();
      console.log(JSON.stringify(tools, null, 2));
      return;
    }

    if (command === "call") {
      const method = args[0];
      if (!method) {
        throw new Error("method is required. Example: bun run start call rpc.ping");
      }
      const params = args[1] ? JSON.parse(args[1]) : {};
      const result = await client.request(method, params);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (command === "quote") {
      const stockCode = args[0];
      if (!stockCode) {
        throw new Error("stock_code is required. Example: bun run start quote 005930");
      }
      await client.request("session.initialize", { broker: "kis" });
      const result = await client.request("quote.kis.stock_current", {
        stock_code: stockCode,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    throw new Error(`Unknown command: ${command}\n\n${HELP}`);
  } finally {
    await client.close();
  }
}

await main();
