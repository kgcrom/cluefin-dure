import { Type, type Static } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { toolResult } from "./_helpers.js";

const parameters = Type.Object({
  ticker: Type.String({ description: "종목 코드" }),
  filingType: Type.String({ description: "공시 유형 (예: annual, quarterly, material)" }),
  year: Type.Optional(Type.Number({ description: "조회 연도" })),
});

type Params = Static<typeof parameters>;

const MOCK_FILINGS: Record<string, Record<string, unknown>[]> = {
  AAPL: [
    { filingType: "annual", year: 2024, title: "10-K Annual Report", summary: "매출 $383.3B, 영업이익 $114.3B. Services 부문 지속 성장. iPhone 매출 비중 52%." },
    { filingType: "quarterly", year: 2024, quarter: "Q4", title: "10-Q Quarterly Report", summary: "4분기 매출 $119.6B (+4% YoY). Mac, iPad 라인 반등." },
  ],
  "005930": [
    { filingType: "annual", year: 2024, title: "사업보고서", summary: "매출 258.9조원, 영업이익 6.6조원. 반도체 업황 부진 영향. HBM 투자 확대 계획." },
    { filingType: "quarterly", year: 2024, quarter: "Q4", title: "분기보고서", summary: "4분기 매출 67.8조원. 메모리 가격 회복 조짐. 파운드리 수율 개선 중." },
  ],
};

export const secDartTool: ToolDefinition<typeof parameters> = {
  name: "sec_dart_filing",
  label: "공시 조회",
  description: "SEC(미국) 또는 DART(한국) 공시 데이터를 조회합니다. 기업의 공식 재무보고서와 주요 공시를 반환합니다.",
  parameters,
  async execute(_toolCallId, params: Params) {
    const { ticker, filingType, year } = params;
    const filings = MOCK_FILINGS[ticker];
    if (!filings) {
      return toolResult(JSON.stringify({ error: `종목 ${ticker}에 대한 공시가 없습니다.` }));
    }
    let filtered = filings.filter((f) => f.filingType === filingType);
    if (year) filtered = filtered.filter((f) => f.year === year);
    return toolResult(JSON.stringify({ ticker, filingType, filings: filtered }));
  },
};
