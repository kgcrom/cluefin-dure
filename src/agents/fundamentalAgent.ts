import { createPiSession } from "../runtime/createPiSession.js";
import { ArtifactStore } from "../runtime/artifactStore.js";
import { EventRecorder } from "../runtime/eventRecorder.js";
import { marketDataTool } from "../tools/marketDataTool.js";
import { secDartTool } from "../tools/secDartTool.js";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { loadPrompt, buildSessionLabel, extractJsonFromMessage } from "./_utils.js";
import type { FundamentalAnalysis } from "../schemas/analysis.js";

export interface FundamentalInput {
  ticker: string;
}

export async function runFundamentalAgent(
  runId: string,
  input: FundamentalInput,
  store: ArtifactStore,
  recorder: EventRecorder,
): Promise<FundamentalAnalysis> {
  const prompt = await loadPrompt("fundamental");
  const label = buildSessionLabel("fundamental", input.ticker);

  const session = await createPiSession({
    agentName: "fundamental",
    sessionLabel: label,
    systemPrompt: prompt,
    customTools: [marketDataTool, secDartTool] as unknown as ToolDefinition[],
    eventRecorder: recorder,
  });

  const userMessage = [
    `분석 대상: ${input.ticker}`,
    "",
    "market_data 도구로 재무지표와 재무제표를 조회하고, sec_dart_filing 도구로 최근 공시를 확인한 후 종합 펀더멘털 분석을 수행하세요.",
    "결과를 JSON으로 반환하세요.",
  ].join("\n");

  await session.prompt(userMessage);
  const result = extractJsonFromMessage<FundamentalAnalysis>(session.state.messages);
  await store.put(runId, "fundamental", input.ticker, result);
  return result;
}
