import type { BrokerEnv } from "../types.js";
import type {
  KiwoomRankItem,
  KiwoomRankParams,
  KiwoomRankResponse,
  KiwoomVolumeSurgeItem,
  KiwoomVolumeSurgeParams,
  KiwoomVolumeSurgeResponse,
} from "./types.js";

const BASE_URLS: Record<BrokerEnv, string> = {
  prod: "https://api.kiwoom.com",
  dev: "https://mockapi.kiwoom.com",
};

interface KiwoomMarketClient {
  getRank(token: string, params: KiwoomRankParams): Promise<KiwoomRankResponse>;
  getVolumeSurge(
    token: string,
    params: KiwoomVolumeSurgeParams,
  ): Promise<KiwoomVolumeSurgeResponse>;
}

interface RawRankItem {
  for_netslmt_stk_cd: string;
  for_netslmt_stk_nm: string;
  for_netslmt_amt: string;
  for_netslmt_qty: string;
  for_netprps_stk_cd: string;
  for_netprps_stk_nm: string;
  for_netprps_amt: string;
  for_netprps_qty: string;
  orgn_netslmt_stk_cd: string;
  orgn_netslmt_stk_nm: string;
  orgn_netslmt_amt: string;
  orgn_netslmt_qty: string;
  orgn_netprps_stk_cd: string;
  orgn_netprps_stk_nm: string;
  orgn_netprps_amt: string;
  orgn_netprps_qty: string;
}

interface RawRankResponse {
  frgnr_orgn_trde_upper: RawRankItem[];
}

interface RawVolumeSurgeItem {
  stk_cd: string;
  stk_nm: string;
  cur_prc: string;
  pred_pre_sig: string;
  pred_pre: string;
  flu_rt: string;
  prev_trde_qty: string;
  now_trde_qty: string;
  sdnin_qty: string;
  sdnin_rt: string;
}

interface RawVolumeSurgeResponse {
  trde_qty_sdnin: RawVolumeSurgeItem[];
}

function mapVolumeSurgeItem(raw: RawVolumeSurgeItem): KiwoomVolumeSurgeItem {
  return {
    stkCd: raw.stk_cd,
    stkNm: raw.stk_nm,
    curPrc: raw.cur_prc,
    predPreSig: raw.pred_pre_sig,
    predPre: raw.pred_pre,
    fluRt: raw.flu_rt,
    prevTrdeQty: raw.prev_trde_qty,
    nowTrdeQty: raw.now_trde_qty,
    sdninQty: raw.sdnin_qty,
    sdninRt: raw.sdnin_rt,
  };
}

function mapRankItem(raw: RawRankItem): KiwoomRankItem {
  return {
    forNetslmtStkCd: raw.for_netslmt_stk_cd,
    forNetslmtStkNm: raw.for_netslmt_stk_nm,
    forNetslmtAmt: raw.for_netslmt_amt,
    forNetslmtQty: raw.for_netslmt_qty,
    forNetprpsStkCd: raw.for_netprps_stk_cd,
    forNetprpsStkNm: raw.for_netprps_stk_nm,
    forNetprpsAmt: raw.for_netprps_amt,
    forNetprpsQty: raw.for_netprps_qty,
    orgnNetslmtStkCd: raw.orgn_netslmt_stk_cd,
    orgnNetslmtStkNm: raw.orgn_netslmt_stk_nm,
    orgnNetslmtAmt: raw.orgn_netslmt_amt,
    orgnNetslmtQty: raw.orgn_netslmt_qty,
    orgnNetprpsStkCd: raw.orgn_netprps_stk_cd,
    orgnNetprpsStkNm: raw.orgn_netprps_stk_nm,
    orgnNetprpsAmt: raw.orgn_netprps_amt,
    orgnNetprpsQty: raw.orgn_netprps_qty,
  };
}

export function createKiwoomMarketClient(env: BrokerEnv): KiwoomMarketClient {
  const baseUrl = BASE_URLS[env];
  if (!baseUrl) {
    throw new Error(`Invalid BrokerEnv: "${env}". Expected "prod" or "dev".`);
  }

  return {
    async getRank(token: string, params: KiwoomRankParams): Promise<KiwoomRankResponse> {
      const body: Record<string, string> = {
        mrkt_tp: params.mrktTp,
        amt_qty_tp: params.amtQtyTp,
        qry_dt_tp: params.qryDtTp,
        stex_tp: params.stexTp,
      };
      if (params.date) {
        body.date = params.date;
      }

      const response = await fetch(`${baseUrl}/api/dostk/rkinfo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          authorization: `Bearer ${token}`,
          "api-id": "ka90009",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Kiwoom rank request failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      const data: RawRankResponse = await response.json();
      console.log("[kiwoom/getRank] params:", JSON.stringify(body));

      return {
        frgOrgnTrdeUpper: (data.frgnr_orgn_trde_upper ?? []).map(mapRankItem),
      };
    },

    async getVolumeSurge(
      token: string,
      params: KiwoomVolumeSurgeParams,
    ): Promise<KiwoomVolumeSurgeResponse> {
      const body: Record<string, string> = {
        mrkt_tp: params.mrktTp,
        sort_tp: params.sortTp,
        tm_tp: params.tmTp,
        trde_qty_tp: params.trdeQtyTp,
        stk_cnd: params.stkCnd,
        pric_tp: params.pricTp,
        stex_tp: params.stexTp,
      };
      if (params.tm) {
        body.tm = params.tm;
      }

      const response = await fetch(`${baseUrl}/api/dostk/rkinfo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          authorization: `Bearer ${token}`,
          "api-id": "ka10023",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Kiwoom volume surge request failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      const data: RawVolumeSurgeResponse = await response.json();

      return {
        trdeQtySdnin: (data.trde_qty_sdnin ?? []).map(mapVolumeSurgeItem),
      };
    },
  };
}
