import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonRpcRemoteError } from "./jsonrpc.js";
import { detectBroker } from "./session.js";
import { StdioJsonRpcClient } from "./stdio-jsonrpc-client.js";
import { ToolRegistry } from "./tool-registry.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const HELP = `Usage: dure <command> [options]

Commands:
  tools                         사용 가능한 RPC 메서드 목록
  call <method> [json_params]   RPC 메서드 직접 호출
  quote <stock_code>            KIS 주식 현재가 조회

Examples:
  npm run start -- tools
  npm run start -- call rpc.ping
  npm run start -- call kis.basic_quote.stock_current_price '{"stock_code":"005930"}'
  npm run start -- quote 005930`;

function createClient(): StdioJsonRpcClient {
  return new StdioJsonRpcClient({
    cmd: ["uv", "run", "-m", "cluefin_rpc"],
    cwd: path.resolve(currentDir, "../../../../cluefin"),
    env: {
      UV_CACHE_DIR: path.resolve(currentDir, "../.uv-cache"),
    },
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
        throw new Error("method is required. Example: npm run start -- call rpc.ping");
      }
      const params = args[1] ? JSON.parse(args[1]) : {};

      const broker = detectBroker(method);
      if (broker) {
        await client.request("session.initialize", { broker });
      }

      const result = await client.request(method, params);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (command === "quote") {
      const stockCode = args[0];
      if (!stockCode) {
        throw new Error("stock_code is required. Example: npm run start -- quote 005930");
      }
      await client.request("session.initialize", { broker: "kis" });
      const result = await client.request("kis.basic_quote.stock_current_price", {
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

try {
  await main();
} catch (error) {
  if (error instanceof JsonRpcRemoteError) {
    console.error(JSON.stringify({ error: true, code: error.code, message: error.message }));
    process.exit(1);
  }
  throw error;
}
