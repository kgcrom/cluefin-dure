import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(currentDir, "../.agents/skills");

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

      const descMatch = fmMatch[1].match(/description:\s*>\s*\n([\s\S]*?)(?=\n\w|\n---)/);
      const nameMatch = fmMatch[1].match(/name:\s*(.+)/);
      const name = nameMatch?.[1]?.trim() ?? entry.name;
      const desc = descMatch?.[1]
        ?.split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ")
        ?? "";

      if (desc) {
        summaries.push(`- **${name}**: ${desc}`);
      }
    }

    return summaries.join("\n");
  } catch {
    return "";
  }
}

export function buildSystemPrompt(): string {
  const skillSummaries = loadSkillSummaries();

  return `You are a Korean securities analysis AI agent (dure). You help users query and analyze Korean stock market data using RPC tools connected to KIS (한국투자증권), Kiwoom (키움증권), DART (전자공시), and technical analysis libraries.

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
3. Call \`load_category_tools\` with the relevant category (e.g., "basic_quote")
4. Call the registered tool directly (e.g., \`basic_quote_stock_current_price\`)

## Key Conventions

- **종목코드**: Always 6-digit string (e.g., "005930" for 삼성전자, "000660" for SK하이닉스)
- **날짜**: KST (UTC+9). Format varies: YYYYMMDD (most RPC methods)
- **기간 구분**: D=일, W=주, M=월, Y=연
- **수정주가 구분**: 0=수정주가, 1=원주가
- **시장 구분**: J=주식(KIS), NX=넥스트(KIS), 001=코스피(Kiwoom), 101=코스닥(Kiwoom)

## Technical Analysis Rules

When performing technical analysis:
1. First fetch OHLCV data using chart/quote methods (date ascending order)
2. Pass close[], high[], low[], volume[] arrays to ta.* methods
3. Use the 100-point scoring framework:
   - Trend (30pts): SMA(5/20/60) alignment
   - Momentum (30pts): RSI, MACD, Stochastic
   - Volatility & Volume (40pts): Bollinger Bands (15pts), ATR (5pts), OBV (20pts)

## Response Guidelines

- Respond in Korean unless the user writes in English
- Format numbers with commas (e.g., 72,300원)
- Include relevant context (change rate, volume, etc.) when reporting prices
- For analysis, provide structured summaries with key metrics`;
}
