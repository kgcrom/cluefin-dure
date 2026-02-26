export type JsonRpcId = number | string | null;

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

export type JsonRpcSuccessResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
};

export type JsonRpcErrorResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: JsonRpcError;
};

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

export class JsonRpcRemoteError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "JsonRpcRemoteError";
    this.code = code;
    this.data = data;
  }
}

export function createRequest(id: JsonRpcId, method: string, params?: unknown): JsonRpcRequest {
  return { jsonrpc: "2.0", id, method, params };
}

export function createErrorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

export function serializeMessage(message: JsonRpcMessage): string {
  return `${JSON.stringify(message)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function parseMessageLine(line: string): JsonRpcMessage {
  const parsed: unknown = JSON.parse(line);

  if (!isRecord(parsed) || parsed.jsonrpc !== "2.0") {
    throw new Error("Invalid JSON-RPC 2.0 message");
  }

  return parsed as JsonRpcMessage;
}
