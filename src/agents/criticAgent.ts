import { createPiSession } from "../runtime/createPiSession.js";
import { ArtifactStore } from "../runtime/artifactStore.js";
import { EventRecorder } from "../runtime/eventRecorder.js";
import { loadPrompt, buildSessionLabel, extractJsonFromMessage } from "./_utils.js";
import type { CriticReport, StrategyDefinition, BacktestResult } from "../schemas/backtest.js";

export interface CriticInput {
  strategy: StrategyDefinition;
  backtestResult: BacktestResult;
  additionalArtifacts?: Record<string, unknown>;
}

export async function runCriticAgent(
  runId: string,
  input: CriticInput,
  store: ArtifactStore,
  recorder: EventRecorder,
): Promise<CriticReport> {
  const prompt = await loadPrompt("critic");
  const label = buildSessionLabel("critic", input.strategy.name);

  const session = await createPiSession({
    agentName: "critic",
    sessionLabel: label,
    systemPrompt: prompt,
    eventRecorder: recorder,
  });

  const parts: string[] = [
    "=== 전략 정의 ===",
    JSON.stringify(input.strategy, null, 2),
    "",
    "=== 백테스트 결과 ===",
    JSON.stringify(input.backtestResult, null, 2),
  ];

  if (input.additionalArtifacts) {
    parts.push("", "=== 추가 분석 데이터 ===");
    for (const [key, val] of Object.entries(input.additionalArtifacts)) {
      parts.push(`--- ${key} ---`, JSON.stringify(val, null, 2));
    }
  }

  parts.push("", "위 전략과 백테스트 결과를 비판적으로 검토하세요. 과적합 위험, 데이터 유출, 생존편향, 레짐 의존성을 평가하고 verdict를 내려주세요.");
  parts.push("결과를 JSON으로 반환하세요.");

  await session.prompt(parts.join("\n"));
  const result = extractJsonFromMessage<CriticReport>(session.state.messages);
  await store.put(runId, "critic", "output", result);
  return result;
}
