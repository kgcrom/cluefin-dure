import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CliCommand, CliExecutionResult, JsonValue } from "./types.js";

const DEFAULT_OPENAPI_CWD = join(homedir(), "workspace", "cluefin");

export function getOpenApiCwd(): string {
  return process.env.CLUEFIN_OPENAPI_CWD || DEFAULT_OPENAPI_CWD;
}

function compactParams(params: Record<string, JsonValue | undefined> | undefined): Record<string, JsonValue> {
  const compacted: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) compacted[key] = value;
  }
  return compacted;
}

export function buildCliArgs(command: CliCommand): string[] {
  const args = ["run", "cluefin-openapi-cli", command.broker];
  if (command.category) args.push(command.category);
  args.push(command.name);

  const params = compactParams(command.params);
  if (Object.keys(params).length > 0) {
    args.push("--params-json", JSON.stringify(params));
  }
  args.push("--json");

  return args;
}

export async function runOpenApiCli(command: CliCommand, signal?: AbortSignal): Promise<CliExecutionResult> {
  return runUv(buildCliArgs(command), signal);
}

export async function runOpenApiCliHelp(signal?: AbortSignal): Promise<CliExecutionResult> {
  return runUv(["run", "cluefin-openapi-cli", "--help", "--json"], signal);
}

async function runUv(args: string[], signal?: AbortSignal): Promise<CliExecutionResult> {
  const cwd = getOpenApiCwd();

  return new Promise((resolve, reject) => {
    const child = spawn("uv", args, {
      cwd,
      env: process.env,
      signal,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to run uv in ${cwd}: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`cluefin-openapi-cli exited with code ${code} in ${cwd}\n${stderr.trim()}`));
        return;
      }

      try {
        resolve({
          command: ["uv", ...args],
          cwd,
          data: JSON.parse(stdout) as JsonValue,
          stderr: stderr.trim() || undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reject(new Error(`Failed to parse cluefin-openapi-cli JSON output: ${message}`));
      }
    });
  });
}
