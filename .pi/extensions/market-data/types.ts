export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type CliCommand = {
  broker: 'kis' | 'dart';
  category?: string;
  name: string;
  params?: Record<string, JsonValue | undefined>;
};

export type CliExecutionResult = {
  command: string[];
  cwd: string;
  data: JsonValue;
  stderr?: string;
};

export type ToolResultDetails = {
  provider: 'kis' | 'dart' | 'market-data';
  command?: string[];
  cwd: string;
  data?: JsonValue;
  stderr?: string;
  error?: string;
};
