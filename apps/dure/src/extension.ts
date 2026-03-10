import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { JsonRpcRemoteError } from "./jsonrpc.js";
import { StdioJsonRpcClient } from "./stdio-jsonrpc-client.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { ToolRegistry } from "./tool-registry.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

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

const SYSTEM_CATEGORIES = new Set(["rpc", "session"]);

const cluefinExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  console.error("[cluefin] extension factory called");

  let client: StdioJsonRpcClient | null = null;
  let registry: ToolRegistry | null = null;
  const initializedBrokers = new Set<string>();
  const loadedCategories = new Set<string>();

  pi.on("session_start", async () => {
    console.error("[cluefin] session_start fired");
    try {
      client = createClient();
      client.start();
      console.error("[cluefin] RPC client started");
      registry = new ToolRegistry(client);
      await registry.discover();
      console.error(
        "[cluefin] registry discovered, categories:",
        registry.getCategories().join(", "),
      );
      registerMetaTools(pi, registry, client, initializedBrokers, loadedCategories);
      console.error("[cluefin] meta tools registered");
    } catch (err) {
      console.error("[cluefin] session_start ERROR:", err);
      throw err;
    }
  });

  pi.on("session_shutdown", async () => {
    console.error("[cluefin] session_shutdown fired");
    await client?.close();
    client = null;
    registry = null;
    initializedBrokers.clear();
    loadedCategories.clear();
  });

  pi.on("before_agent_start", async () => {
    const systemPrompt = buildSystemPrompt(registry ?? undefined);
    console.error("[cluefin] before_agent_start fired, prompt length:", systemPrompt.length);
    return { systemPrompt };
  });
};

function registerMetaTools(
  pi: ExtensionAPI,
  registry: ToolRegistry,
  client: StdioJsonRpcClient,
  initializedBrokers: Set<string>,
  loadedCategories: Set<string>,
): void {
  // Tool 1: list available RPC categories
  pi.registerTool({
    name: "list_tool_categories",
    label: "List Categories",
    description:
      "List available RPC tool categories. Call this first to see what categories of financial data tools are available before loading them.",
    parameters: Type.Object({}),
    async execute() {
      const result = registry
        .getCategorySummary()
        .filter((s) => !SYSTEM_CATEGORIES.has(s.category))
        .map((s) => ({
          category: s.category,
          method_count: s.count,
          loaded: loadedCategories.has(s.category),
          methods: s.methods,
        }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        details: null,
      };
    },
  });

  // Tool 2: dynamically load a category's tools
  pi.registerTool({
    name: "load_category_tools",
    label: "Load Category",
    description:
      "Load all tools from a specific RPC category, making them available for direct calls. Use list_tool_categories first to see available categories.",
    parameters: Type.Object({
      category: Type.String({ description: "Category name to load (e.g. 'stock', 'chart', 'ta')" }),
    }),
    async execute(_toolCallId, params) {
      const { category } = params;

      if (loadedCategories.has(category)) {
        return {
          content: [{ type: "text" as const, text: `Category '${category}' is already loaded.` }],
          details: null,
        };
      }

      const methods = registry.getMethodsByCategory(category);
      if (methods.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Category '${category}' not found. Use list_tool_categories to see available categories.`,
            },
          ],
          details: null,
        };
      }

      const tools = registry.toPiTools({ methods, initializedBrokers });
      for (const tool of tools) {
        pi.registerTool(tool);
      }
      loadedCategories.add(category);

      const toolSummaries = methods
        .map((m) => {
          const toolName = m.name.replaceAll(".", "_");
          const params = registry.getParamSummary(m);
          return `### ${toolName}\n${m.description}\n${params}`;
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Loaded ${tools.length} tools from category '${category}':\n\n${toolSummaries}`,
          },
        ],
        details: null,
      };
    },
  });

  // Tool 3: direct RPC call fallback
  pi.registerTool({
    name: "call_rpc_method",
    label: "Call RPC",
    description:
      "Call any RPC method directly by name and parameters. Use this as a fallback when a specific tool is not loaded.",
    parameters: Type.Object({
      method: Type.String({ description: "RPC method name (e.g. 'stock.current_price')" }),
      params: Type.Optional(
        Type.Record(Type.String(), Type.Unknown(), {
          description: "Method parameters as key-value pairs",
        }),
      ),
    }),
    async execute(_toolCallId, toolParams) {
      const { method, params: explicitParams, ...flatParams } = toolParams;
      let rpcMethod = method;
      // 에이전트가 { method, stock_code } 형태로 flat하게 전달하는 경우 처리
      const rpcParams =
        Object.keys(flatParams).length > 0
          ? { ...flatParams, ...(explicitParams ?? {}) }
          : (explicitParams ?? {});

      // 언더스코어 표기법이면 도트 표기법으로 변환 시도
      if (!rpcMethod.includes(".") && rpcMethod.includes("_")) {
        const resolved = registry.getMethodByToolName(rpcMethod);
        if (resolved) {
          rpcMethod = resolved.name;
        }
      }

      // 필수 파라미터 누락 시 사전 검증
      const methodSchema = registry.getMethodByName(rpcMethod);
      if (methodSchema) {
        const schema = methodSchema.parameters as { required?: string[] };
        const required = schema.required ?? [];
        const missing = required.filter((k) => !(k in (rpcParams ?? {})));
        if (missing.length > 0) {
          const paramInfo = registry.getParamSummary(methodSchema);
          return {
            content: [
              {
                type: "text" as const,
                text: `[ERROR] ${rpcMethod}: 필수 파라미터 누락: ${missing.join(", ")}\n\nParameters:\n${paramInfo}`,
              },
            ],
            details: null,
          };
        }
      }

      try {
        const broker = methodSchema?.broker ?? null;
        if (broker && !initializedBrokers.has(broker)) {
          await client.request("session.initialize", { broker });
          initializedBrokers.add(broker);
        }

        const result = await client.request(rpcMethod, rpcParams ?? {});
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          details: null,
        };
      } catch (err) {
        const msg =
          err instanceof JsonRpcRemoteError
            ? `RPC error (${err.code}): ${err.message}${err.data ? `\n${JSON.stringify(err.data)}` : ""}`
            : err instanceof Error
              ? err.message
              : String(err);
        return {
          content: [{ type: "text" as const, text: `[ERROR] ${rpcMethod}: ${msg}` }],
          details: null,
        };
      }
    },
  });
}

export default cluefinExtension;
