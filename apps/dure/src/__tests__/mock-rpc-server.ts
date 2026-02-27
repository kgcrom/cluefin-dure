/**
 * Mock JSON-RPC server for integration testing.
 * Reads NDJSON from stdin, dispatches to mock handlers, writes responses to stdout.
 *
 * Usage: bun run src/__tests__/mock-rpc-server.ts
 */

const METHODS = [
  {
    name: "rpc.ping",
    description: "Health check",
    category: "rpc",
    broker: null,
    parameters: { type: "object", properties: {} },
    returns: { type: "object" },
    requires_session: false,
  },
  {
    name: "quote.kis.stock_current",
    description: "Get current stock price from KIS",
    category: "quote",
    broker: "kis",
    parameters: {
      type: "object",
      properties: {
        stock_code: { type: "string", pattern: "^[0-9]{6}$" },
        market: { type: "string", enum: ["J", "NX", "UN"] },
      },
      required: ["stock_code"],
    },
    returns: { type: "object" },
    requires_session: true,
  },
  {
    name: "ta.sma",
    description: "Simple Moving Average",
    category: "ta",
    broker: null,
    parameters: {
      type: "object",
      properties: {
        close: { type: "array", items: { type: "number" } },
        timeperiod: { type: "integer" },
      },
      required: ["close"],
    },
    returns: { type: "object" },
    requires_session: false,
  },
  {
    name: "test.echo",
    description: "Echo params back (test only)",
    category: "test",
    broker: null,
    parameters: { type: "object" },
    returns: { type: "object" },
    requires_session: false,
  },
  {
    name: "test.slow",
    description: "Delayed response (test only)",
    category: "test",
    broker: null,
    parameters: {
      type: "object",
      properties: { delay_ms: { type: "integer" } },
      required: ["delay_ms"],
    },
    returns: { type: "object" },
    requires_session: false,
  },
];

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

function writeResponse(id: number | string | null, result: unknown): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function writeError(id: number | string | null, code: number, message: string): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

async function dispatch(req: JsonRpcRequest): Promise<void> {
  const { id, method, params } = req;

  // Notifications (no id) don't get responses
  if (id === undefined || id === null) {
    if (method === "rpc.shutdown") process.exit(0);
    return;
  }

  switch (method) {
    case "rpc.ping":
      writeResponse(id, { pong: true });
      break;

    case "rpc.list_methods": {
      let filtered = METHODS;
      if (params?.category) {
        filtered = filtered.filter((m) => m.category === params.category);
      }
      if (params?.broker) {
        filtered = filtered.filter((m) => m.broker === params.broker);
      }
      writeResponse(id, filtered);
      break;
    }

    case "quote.kis.stock_current":
      writeResponse(id, {
        stock_code: params?.stock_code ?? "000000",
        current_price: 72300,
        volume: 1234567,
        change_rate: 1.25,
      });
      break;

    case "ta.sma": {
      const close = (params?.close as number[]) ?? [];
      const period = (params?.timeperiod as number) ?? close.length;
      const sma =
        close.length >= period
          ? close.slice(close.length - period).reduce((a, b) => a + b, 0) / period
          : null;
      writeResponse(id, { sma, period, count: close.length });
      break;
    }

    case "test.echo":
      writeResponse(id, params ?? {});
      break;

    case "test.slow": {
      const delayMs = (params?.delay_ms as number) ?? 1000;
      await Bun.sleep(delayMs);
      writeResponse(id, { delayed: true, delay_ms: delayMs });
      break;
    }

    default:
      writeError(id, -32601, `Method not found: ${method}`);
  }
}

// Main loop: read NDJSON from stdin
const reader = Bun.stdin.stream().getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  let newlineIndex = buffer.indexOf("\n");
  while (newlineIndex >= 0) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);

    if (line.length > 0) {
      try {
        const req = JSON.parse(line) as JsonRpcRequest;
        await dispatch(req);
      } catch {
        writeError(null, -32700, "Parse error");
      }
    }

    newlineIndex = buffer.indexOf("\n");
  }
}
