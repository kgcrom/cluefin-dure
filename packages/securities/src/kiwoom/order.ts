import type { BrokerEnv } from "../types.js";
import type {
  KiwoomBuyOrderParams,
  KiwoomBuyOrderResponse,
  KiwoomDailyOrderItem,
  KiwoomDailyOrderParams,
  KiwoomDailyOrderResponse,
  KiwoomSellOrderParams,
  KiwoomSellOrderResponse,
} from "./types.js";

const BASE_URLS: Record<BrokerEnv, string> = {
  prod: "https://api.kiwoom.com",
  dev: "https://mockapi.kiwoom.com",
};

interface RawOrderResponse {
  ord_no: string;
  dmst_stex_tp: string;
}

interface RawDailyOrderItem {
  ord_no: string;
  stk_nm: string;
  io_tp_nm: string;
  ord_pric: string;
  ord_qty: string;
  cntr_pric: string;
  cntr_qty: string;
  oso_qty: string;
  tdy_trde_cmsn: string;
  tdy_trde_tax: string;
  ord_stt: string;
  trde_tp: string;
  orig_ord_no: string;
  ord_tm: string;
  stk_cd: string;
  stex_tp: string;
  stex_tp_txt: string;
  sor_yn: string;
  stop_pric: string;
}

function mapDailyOrderItem(raw: RawDailyOrderItem): KiwoomDailyOrderItem {
  return {
    ordNo: raw.ord_no ?? "",
    stkNm: raw.stk_nm ?? "",
    ioTpNm: raw.io_tp_nm ?? "",
    ordPric: raw.ord_pric ?? "",
    ordQty: raw.ord_qty ?? "",
    cntrPric: raw.cntr_pric ?? "",
    cntrQty: raw.cntr_qty ?? "",
    osoQty: raw.oso_qty ?? "",
    tdyTrdeCmsn: raw.tdy_trde_cmsn ?? "",
    tdyTrdeTax: raw.tdy_trde_tax ?? "",
    ordStt: raw.ord_stt ?? "",
    trdeTp: raw.trde_tp ?? "",
    origOrdNo: raw.orig_ord_no ?? "",
    ordTm: raw.ord_tm ?? "",
    stkCd: raw.stk_cd ?? "",
    stexTp: raw.stex_tp ?? "",
    stexTpTxt: raw.stex_tp_txt ?? "",
    sorYn: raw.sor_yn ?? "",
    stopPric: raw.stop_pric ?? "",
  };
}

interface KiwoomOrderClient {
  buyOrder(token: string, params: KiwoomBuyOrderParams): Promise<KiwoomBuyOrderResponse>;
  sellOrder(token: string, params: KiwoomSellOrderParams): Promise<KiwoomSellOrderResponse>;
  getDailyOrders(token: string, params: KiwoomDailyOrderParams): Promise<KiwoomDailyOrderResponse>;
}

export function createKiwoomOrderClient(env: BrokerEnv): KiwoomOrderClient {
  const baseUrl = BASE_URLS[env];
  if (!baseUrl) {
    throw new Error(`Invalid BrokerEnv: "${env}". Expected "prod" or "dev".`);
  }

  return {
    async buyOrder(token: string, params: KiwoomBuyOrderParams): Promise<KiwoomBuyOrderResponse> {
      const body: Record<string, string> = {
        dmst_stex_tp: params.dmstStexTp,
        stk_cd: params.stkCd,
        ord_qty: params.ordQty,
        trde_tp: params.trdeTp,
      };
      if (params.ordUv) {
        body.ord_uv = params.ordUv;
      }
      if (params.condUv) {
        body.cond_uv = params.condUv;
      }

      const response = await fetch(`${baseUrl}/api/dostk/ordr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          authorization: `Bearer ${token}`,
          "api-id": "kt10000",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Kiwoom buy order request failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      const data: RawOrderResponse = await response.json();

      return {
        ordNo: data.ord_no ?? "",
        dmstStexTp: data.dmst_stex_tp ?? "",
      };
    },

    async sellOrder(
      token: string,
      params: KiwoomSellOrderParams,
    ): Promise<KiwoomSellOrderResponse> {
      const body: Record<string, string> = {
        dmst_stex_tp: params.dmstStexTp,
        stk_cd: params.stkCd,
        ord_qty: params.ordQty,
        trde_tp: params.trdeTp,
      };
      if (params.ordUv) {
        body.ord_uv = params.ordUv;
      }
      if (params.condUv) {
        body.cond_uv = params.condUv;
      }

      const response = await fetch(`${baseUrl}/api/dostk/ordr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          authorization: `Bearer ${token}`,
          "api-id": "kt10001",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Kiwoom sell order request failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      const data: RawOrderResponse = await response.json();

      return {
        ordNo: data.ord_no ?? "",
        dmstStexTp: data.dmst_stex_tp ?? "",
      };
    },

    async getDailyOrders(
      token: string,
      params: KiwoomDailyOrderParams,
    ): Promise<KiwoomDailyOrderResponse> {
      const body: Record<string, string> = {
        qry_tp: params.qryTp,
        sell_tp: params.sellTp,
        stex_tp: params.stexTp,
      };
      if (params.stkCd) {
        body.stk_cd = params.stkCd;
      }
      if (params.ordNo) {
        body.ord_no = params.ordNo;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json;charset=UTF-8",
        authorization: `Bearer ${token}`,
        "api-id": "ka10076",
      };
      if (params.contYn) {
        headers["cont-yn"] = params.contYn;
      }
      if (params.nextKey) {
        headers["next-key"] = params.nextKey;
      }

      const response = await fetch(`${baseUrl}/api/dostk/acnt`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Kiwoom daily order query failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      const data: { cntr?: RawDailyOrderItem[] } = await response.json();
      const contYn = response.headers.get("cont-yn") ?? undefined;
      const nextKey = response.headers.get("next-key") ?? undefined;

      return {
        cntr: (data.cntr ?? []).map(mapDailyOrderItem),
        contYn,
        nextKey,
      };
    },
  };
}
