import { runOpenApiCli } from "../cli.js";

type Signal = AbortSignal | undefined;

export function lookupCorpCodes(signal?: Signal) {
  return runOpenApiCli(
    {
      broker: "dart",
      name: "corp-code-lookup",
    },
    signal,
  );
}

export function getCompanyOverview(params: { corpCode: string }, signal?: Signal) {
  return runOpenApiCli(
    {
      broker: "dart",
      name: "company-overview",
      params: {
        corp_code: params.corpCode,
      },
    },
    signal,
  );
}

export function searchDisclosures(params: {
  corpCode?: string;
  beginDate?: string;
  endDate?: string;
  lastReportOnly?: "Y" | "N";
  disclosureType?: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
  corpClass?: "Y" | "K" | "N" | "E";
  pageNo?: number;
  pageCount?: number;
}, signal?: Signal) {
  return runOpenApiCli(
    {
      broker: "dart",
      name: "disclosure-search",
      params: {
        corp_code: params.corpCode,
        bgn_de: params.beginDate,
        end_de: params.endDate,
        last_reprt_at: params.lastReportOnly,
        pblntf_ty: params.disclosureType,
        corp_cls: params.corpClass,
        page_no: params.pageNo,
        page_count: params.pageCount,
      },
    },
    signal,
  );
}
