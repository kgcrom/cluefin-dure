import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORY_DESCRIPTIONS } from "./category-descriptions.js";
import type { ToolRegistry } from "./tool-registry.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(currentDir, "../.agents/skills");
const SOUL_PATH = path.resolve(currentDir, "../.agents/SOUL.md");

console.error("[cluefin] currentDir:", currentDir);
console.error("[cluefin] SOUL_PATH:", SOUL_PATH, "exists:", fs.existsSync(SOUL_PATH));
console.error("[cluefin] SKILLS_DIR:", SKILLS_DIR, "exists:", fs.existsSync(SKILLS_DIR));

function loadSoul(): string {
  try {
    return fs.readFileSync(SOUL_PATH, "utf-8");
  } catch {
    return "";
  }
}

function loadSkillSummaries(): string {
  try {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    const summaries: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(SKILLS_DIR, entry.name, "SKILL.md");
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, "utf-8");
      // Extract frontmatter description
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;

      const descMatch = fmMatch[1].match(/description:\s*>\s*\n([\s\S]*?)(?=\n\w|\n---|$)/);
      const nameMatch = fmMatch[1].match(/name:\s*(.+)/);
      const name = nameMatch?.[1]?.trim() ?? entry.name;
      const desc =
        descMatch?.[1]
          ?.split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .join(" ") ?? "";

      if (desc) {
        summaries.push(`- **${name}**: ${desc}`);
      }
    }

    return summaries.join("\n");
  } catch {
    return "";
  }
}

const SYSTEM_CATEGORIES = new Set(["rpc", "session"]);

function buildCategoryTable(registry?: ToolRegistry): string {
  if (!registry) {
    return "## RPC Categories\n\n`list_tool_categories`를 호출하여 사용 가능한 카테고리를 확인하세요.";
  }

  const summaries = registry.getCategorySummary().filter((s) => !SYSTEM_CATEGORIES.has(s.category));
  const totalCount = summaries.reduce((sum, s) => sum + s.count, 0);

  const rows = summaries
    .map((s) => `| ${s.category} | ${s.count} | ${CATEGORY_DESCRIPTIONS[s.category] ?? ""} |`)
    .join("\n");

  return `## RPC Categories (${summaries.length}, ${totalCount} methods)

| Category | Count | Description |
|----------|-------|-------------|
${rows}`;
}

export function buildSystemPrompt(registry?: ToolRegistry): string {
  const soul = loadSoul();
  const skillSummaries = loadSkillSummaries();

  const categoryTable = buildCategoryTable(registry);

  return `${soul}

You are a Korean securities analysis AI agent (dure). You help users query and analyze Korean stock market data using RPC tools connected to KIS (한국투자증권), Kiwoom (키움증권), DART (전자공시), and technical analysis libraries.

## Available Tool Domains
${skillSummaries}

## Tool Usage Workflow

You have access to three meta tools for discovering and using RPC methods:

1. **list_tool_categories** — Call this first to see available categories and their method counts
2. **load_category_tools** — Load a specific category to register its methods as callable tools
3. **call_rpc_method** — Fallback: call any RPC method directly by name without loading its category

Typical flow:
1. User asks a question (e.g., "삼성전자 현재가 알려줘")
2. Call \`list_tool_categories\` to see available categories
3. Call \`load_category_tools\` with the relevant category (e.g., "stock")
4. Call the registered tool directly (e.g., \`stock_current_price\`)

${categoryTable}

## Key Conventions

- **종목코드**: Always 6-digit string (e.g., "005930" for 삼성전자, "000660" for SK하이닉스)
- **날짜**: KST (UTC+9). Format varies: YYYYMMDD (most RPC methods)
- **기간 구분**: D=일, W=주, M=월, Y=연
- **수정주가 구분**: 0=수정주가, 1=원주가
- **시장 구분**: J=주식(KIS), NX=넥스트(KIS), 001=코스피(Kiwoom), 101=코스닥(Kiwoom)

## 복합 분석 도구 (Analysis Tools)

스코어링과 데이터 수집을 자동으로 수행하는 복합 도구 4개를 사용할 수 있다.
종합 분석, 기술적 분석, 정량 분석 요청 시 아래 도구를 우선 사용한다.
개별 데이터 조회("삼성전자 호가 보여줘")는 기존 meta-tool(list_tool_categories → load_category_tools)을 사용한다.

### analyze_comprehensive — 종합 분석 (권장)

"종합 분석", "투자 분석", "종합 평가" 요청 시 이 도구 하나로 전체 분석을 수행한다.
- 내부에서 TA + Quant + 수급 + 피어비교를 병렬 수행
- 최종 점수 = TA Score × 0.4 + Quant Score × 0.6
- 판단: 80-100 강한매수, 65-79 매수우위, 45-64 중립, 25-44 매도우위, 0-24 강한매도
- 반환값: final_score, judgment, ta_result(상세), quant_result(상세), supply_summary, peer_comparison

### analyze_technical — 기술적 분석

- OHLCV 수집 → 10개 지표 병렬 계산 → 100점 스코어링
- 추세(30) + 모멘텀(30, ADX 보정) + 변동성·거래량(40) + 복합신호(±5)
- 반환값: ta_score(breakdown 포함), data_quality, warnings

### analyze_fundamental — 정량 분석

- 수익성/안전성/밸류에이션/성장성/효율성 데이터 병렬 수집 → 100점 스코어링
- 수익성(25) + 안전성(20) + 밸류에이션(25) + 성장성(20) + 효율성(10)
- 반환값: quant_score(breakdown 포함), raw_data, warnings

### analyze_peer_comparison — 업종 내 비교

- 업종코드 자동 확인 → PER/PBR/ROE/부채비율 백분위 산출
- 상위 25% = 강점, 하위 25% = 약점
- 반환값: percentiles[], peer_count, divergence

### 결과 해석 가이드

분석 도구가 반환한 점수와 breakdown을 사용자에게 보고할 때:
1. 각 영역별 점수와 판단 근거를 설명
2. warnings가 있으면 "[데이터 품질 주의]" 태그와 함께 고지
3. 점수만 제시하지 말고, 맥락적 해석을 추가 (예: "TA 78점이지만 ADX 18로 횡보장이라 모멘텀 신뢰도 낮음")
4. 주요 리스크 요인과 핵심 근거를 2-3문장으로 요약

## 데이터 품질 검증

RPC에서 수신한 데이터를 분석에 사용하기 전 품질을 검증한다.

1. **OHLCV 배열 길이**: 요청 기간 대비 수신 데이터 길이가 80% 미만이면 경고 표시
2. **거래량 0일 비율**: 전체 거래일 중 거래량 0인 날이 10% 이상이면 "저유동성 종목" 경고
3. **재무 데이터 누락**: 핵심 항목(매출액, 영업이익, 순이익) 중 하나라도 null/0이면 해당 분기 데이터 신뢰도 경고
4. 품질 문제 발견 시 분석 결과에 "[데이터 품질 주의]" 태그를 붙인다

## 추세 지속성 원칙

단일 시점의 스냅샷이 아닌 최근 추이를 확인하여 신호의 신뢰도를 판단한다.

1. 모든 기술적 신호(RSI, MACD, OBV 등)는 최근 **5거래일** 방향성을 함께 확인한다
2. **3거래일 미만** 연속된 신호는 "[미확인]"으로 표시하고 신뢰도를 낮춘다
3. 5거래일 이상 일관된 방향의 신호만 "[확인됨]"으로 표시한다
4. 추세 전환 판단 시 최소 3일 연속 반전 신호를 요구한다

## Response Guidelines

- Respond in Korean unless the user writes in English
- Format numbers with commas (e.g., 72,300원)
- Include relevant context (change rate, volume, etc.) when reporting prices
- For analysis, provide structured summaries with key metrics`;
}
