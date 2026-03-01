import path from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import { StdioJsonRpcClient } from "./stdio-jsonrpc-client.js";
import { ToolRegistry } from "./tool-registry.js";
import { buildSystemPrompt } from "./system-prompt.js";

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
  let client: StdioJsonRpcClient | null = null;
  let registry: ToolRegistry | null = null;
  const initializedBrokers = new Set<string>();
  const loadedCategories = new Set<string>();

  pi.on("session_start", async () => {
    client = createClient();
    client.start();
    registry = new ToolRegistry(client);
    await registry.discover();
    registerMetaTools(pi, registry, client, initializedBrokers, loadedCategories);
  });

  pi.on("session_shutdown", async () => {
    await client?.close();
    client = null;
    registry = null;
    initializedBrokers.clear();
    loadedCategories.clear();
  });

  pi.on("before_agent_start", async () => {
    return { systemPrompt: buildSystemPrompt() };
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
      const categories = registry.getCategories();
      const result = categories
        .filter((c) => !SYSTEM_CATEGORIES.has(c))
        .map((category) => {
          const methods = registry.getMethodsByCategory(category);
          return {
            category,
            method_count: methods.length,
            loaded: loadedCategories.has(category),
            sample_methods: methods.slice(0, 3).map((m) => m.name),
          };
        });
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
          content: [
            { type: "text" as const, text: `Category '${category}' is already loaded.` },
          ],
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

      const toolNames = tools.map((t) => t.name);
      return {
        content: [
          {
            type: "text" as const,
            text: `Loaded ${tools.length} tools from category '${category}':\n${toolNames.join("\n")}`,
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
      const { method: rpcMethod, params: rpcParams } = toolParams;

      // Look up broker from registry (method schema has broker field)
      const methodSchema = registry.getMethodByName(rpcMethod);
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
    },
  });
}

export default cluefinExtension;
