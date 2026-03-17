import { createPiSession } from "../runtime/createPiSession.js";
import { ArtifactStore } from "../runtime/artifactStore.js";
import { EventRecorder } from "../runtime/eventRecorder.js";
import { screenerTool } from "../tools/screenerTool.js";
import { marketDataTool } from "../tools/marketDataTool.js";
import { loadPrompt, buildSessionLabel, extractJsonFromMessage } from "./_utils.js";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { UniverseResult } from "../schemas/analysis.js";

export interface UniverseInput {
  market?: string;
  style?: string;
  filterRules?: string;
}

export async function runUniverseAgent(
  runId: string,
  input: UniverseInput,
  store: ArtifactStore,
  recorder: EventRecorder,
): Promise<UniverseResult> {
  const prompt = await loadPrompt("universe");
  const label = buildSessionLabel("universe", input.market ?? "global");

  const session = await createPiSession({
    agentName: "universe",
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [screenerTool, marketDataTool] as unknown as ToolDefinition[],
    eventRecorder: recorder,
  });

  const userMessage = [
    `시장: ${input.market ?? "전체"}`,
    `스타일: ${input.style ?? "없음"}`,
    `필터규칙: ${input.filterRules ?? "없음"}`,
    "",
    "위 조건으로 투자 유니버스를 구성해주세요. stock_screener 도구를 사용하여 조건에 맞는 종목을 필터링한 후, 결과를 JSON으로 반환하세요.",
  ].join("\n");

  await session.prompt(userMessage);
  const result = extractJsonFromMessage<UniverseResult>(session.state.messages);
  await store.put(runId, "universe", "output", result);
  return result;
}
