import type { BrokerEnv } from "../types.js";
import type {
  KisBalanceItem,
  KisBalanceParams,
  KisBalanceResponse,
  KisBalanceSummary,
  KisCredentials,
  KisDailyOrderItem,
  KisDailyOrderParams,
  KisDailyOrderResponse,
  KisDailyOrderSummary,
  KisOrderOutput,
  KisOrderParams,
  KisOrderResponse,
} from "./types.js";

const BASE_URLS: Record<BrokerEnv, string> = {
  prod: "https://openapi.koreainvestment.com:9443",
  dev: "https://openapivts.koreainvestment.com:29443",
};

const BUY_TR_IDS: Record<BrokerEnv, string> = {
  prod: "TTTC0012U",
  dev: "VTTC0012U",
};

const SELL_TR_IDS: Record<BrokerEnv, string> = {
  prod: "TTTC0011U",
  dev: "VTTC0011U",
};

const DAILY_ORDER_TR_IDS: Record<BrokerEnv, { recent: string; old: string }> = {
  prod: { recent: "TTTC0081R", old: "CTSC9215R" },
  dev: { recent: "VTTC0081R", old: "VTSC9215R" },
};

const BALANCE_TR_IDS: Record<BrokerEnv, string> = {
  prod: "TTTC8434R",
  dev: "VTTC8434R",
};

interface KisOrderClient {
  buyOrder(
    credentials: KisCredentials,
    token: string,
    params: KisOrderParams,
  ): Promise<KisOrderResponse>;
  sellOrder(
    credentials: KisCredentials,
    token: string,
    params: KisOrderParams,
  ): Promise<KisOrderResponse>;
  getDailyOrders(
    credentials: KisCredentials,
    token: string,
    params: KisDailyOrderParams,
    withinThreeMonths?: boolean,
  ): Promise<KisDailyOrderResponse>;
  getBalance(
    credentials: KisCredentials,
    token: string,
    params: KisBalanceParams,
  ): Promise<KisBalanceResponse>;
}

interface RawOrderOutput {
  KRX_FWDG_ORD_ORGNO: string;
  ODNO: string;
  ORD_TMD: string;
}

interface RawOrderResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: RawOrderOutput;
}

function mapOutput(raw: RawOrderOutput): KisOrderOutput {
  return {
    krxFwdgOrdOrgno: raw.KRX_FWDG_ORD_ORGNO,
    odno: raw.ODNO,
    ordTmd: raw.ORD_TMD,
  };
}

interface RawDailyOrderItem {
  ord_dt: string;
  ord_gno_brno: string;
  odno: string;
  orgn_odno: string;
  sll_buy_dvsn_cd_name: string;
  sll_buy_dvsn_cd: string;
  pdno: string;
  prdt_name: string;
  ord_qty: string;
  ord_unpr: string;
  ord_tmd: string;
  tot_ccld_qty: string;
  tot_ccld_amt: string;
  avg_prvs: string;
  ccld_cndt: string;
  ord_dvsn_name: string;
  ord_dvsn_cd: string;
  mdfy_cnfm_qty: string;
  cncl_cnfm_qty: string;
  rmn_qty: string;
  rjct_qty: string;
  comm_media_cd: string;
  comm_media_dvsn_name: string;
  cndi_ord_dvsn_cd: string;
  cndi_ord_dvsn_cd_name: string;
  excg_id_dvsn_cd: string;
  excg_id_dvsn_cd_name: string;
}

interface RawDailyOrderSummary {
  tot_ord_qty: string;
  tot_ccld_qty: string;
  tot_ccld_amt: string;
  prdy_sll_amt: string;
  prdy_buy_amt: string;
  sll_ccld_amt: string;
  buy_ccld_amt: string;
}

interface RawDailyOrderResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1: RawDailyOrderItem[];
  output2: RawDailyOrderSummary;
  tr_cont?: string;
  ctx_area_fk100?: string;
  ctx_area_nk100?: string;
}

function mapDailyOrderItem(raw: RawDailyOrderItem): KisDailyOrderItem {
  return {
    ordDt: raw.ord_dt,
    ordGnoNo: raw.ord_gno_brno,
    odno: raw.odno,
    orgnOdno: raw.orgn_odno,
    sllBuyDvsnCdName: raw.sll_buy_dvsn_cd_name,
    sllBuyDvsnCd: raw.sll_buy_dvsn_cd,
    pdno: raw.pdno,
    prdt_name: raw.prdt_name,
    ordQty: raw.ord_qty,
    ordUnpr: raw.ord_unpr,
    ordTmd: raw.ord_tmd,
    totCcldQty: raw.tot_ccld_qty,
    totCcldAmt: raw.tot_ccld_amt,
    avgPrvs: raw.avg_prvs,
    ccldCndt: raw.ccld_cndt,
    ordDvsnName: raw.ord_dvsn_name,
    ordDvsnCd: raw.ord_dvsn_cd,
    mdfyCnfmQty: raw.mdfy_cnfm_qty,
    cncl_cnfm_qty: raw.cncl_cnfm_qty,
    rmnQty: raw.rmn_qty,
    rjctQty: raw.rjct_qty,
    commMediaCd: raw.comm_media_cd,
    commMediaDvsnName: raw.comm_media_dvsn_name,
    cndiOrdDvsnCd: raw.cndi_ord_dvsn_cd,
    cndiOrdDvsnCdName: raw.cndi_ord_dvsn_cd_name,
    excgIdDvsnCd: raw.excg_id_dvsn_cd,
    excgIdDvsnCdName: raw.excg_id_dvsn_cd_name,
  };
}

function mapDailyOrderSummary(raw: RawDailyOrderSummary): KisDailyOrderSummary {
  return {
    totOrdQty: raw.tot_ord_qty,
    totCcldQty: raw.tot_ccld_qty,
    totCcldAmt: raw.tot_ccld_amt,
    prdySllAmt: raw.prdy_sll_amt,
    prdyBuyAmt: raw.prdy_buy_amt,
    sllCcldAmt: raw.sll_ccld_amt,
    buyCcldAmt: raw.buy_ccld_amt,
  };
}

interface RawBalanceItem {
  pdno: string;
  prdt_name: string;
  trad_dvsn_name: string;
  bfdy_buy_qty: string;
  bfdy_sll_qty: string;
  thdt_buyqty: string;
  thdt_sll_qty: string;
  hldg_qty: string;
  ord_psbl_qty: string;
  pchs_avg_pric: string;
  pchs_amt: string;
  prpr: string;
  evlu_amt: string;
  evlu_pfls_amt: string;
  evlu_pfls_rt: string;
  evlu_erng_rt: string;
  loan_dt: string;
  loan_amt: string;
  stln_slng_chgs: string;
  expd_dt: string;
  fltt_rt: string;
  bfdy_cprs_icdc: string;
  item_mgna_rt_name: string;
  grta_rt_name: string;
  sbst_pric: string;
  stck_loan_unpr: string;
}

interface RawBalanceSummary {
  dnca_tot_amt: string;
  nxdy_excc_amt: string;
  prvs_rcdl_excc_amt: string;
  cma_evlu_amt: string;
  bfdy_buy_amt: string;
  thdt_buy_amt: string;
  nxdy_auto_rdpt_amt: string;
  bfdy_sll_amt: string;
  thdt_sll_amt: string;
  d2_auto_rdpt_amt: string;
  bfdy_tlex_amt: string;
  thdt_tlex_amt: string;
  tot_loan_amt: string;
  scts_evlu_amt: string;
  tot_evlu_amt: string;
  nass_amt: string;
  fncg_gld_auto_rdpt_yn: string;
  pchs_amt_smtl_amt: string;
  evlu_amt_smtl_amt: string;
  evlu_pfls_smtl_amt: string;
  tot_stln_slng_chgs: string;
  bfdy_tot_asst_evlu_amt: string;
  asst_icdc_amt: string;
  asst_icdc_erng_rt: string;
}

interface RawBalanceResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1: RawBalanceItem[];
  output2: RawBalanceSummary[];
  tr_cont?: string;
  ctx_area_fk100?: string;
  ctx_area_nk100?: string;
}

function mapBalanceItem(raw: RawBalanceItem): KisBalanceItem {
  return {
    pdno: raw.pdno,
    prdtName: raw.prdt_name,
    tradDvsnName: raw.trad_dvsn_name,
    bfdyBuyQty: raw.bfdy_buy_qty,
    bfdySllQty: raw.bfdy_sll_qty,
    thdtBuyqty: raw.thdt_buyqty,
    thdtSllQty: raw.thdt_sll_qty,
    hldgQty: raw.hldg_qty,
    ordPsblQty: raw.ord_psbl_qty,
    pchsAvgPric: raw.pchs_avg_pric,
    pchsAmt: raw.pchs_amt,
    prpr: raw.prpr,
    evluAmt: raw.evlu_amt,
    evluPflsAmt: raw.evlu_pfls_amt,
    evluPflsRt: raw.evlu_pfls_rt,
    evluErngRt: raw.evlu_erng_rt,
    loanDt: raw.loan_dt,
    loanAmt: raw.loan_amt,
    stlnSlngChgs: raw.stln_slng_chgs,
    expdDt: raw.expd_dt,
    flttRt: raw.fltt_rt,
    bfdyCprsIcdc: raw.bfdy_cprs_icdc,
    itemMgnaRtName: raw.item_mgna_rt_name,
    grtaRtName: raw.grta_rt_name,
    sbstPric: raw.sbst_pric,
    stckLoanUnpr: raw.stck_loan_unpr,
  };
}

function mapBalanceSummary(raw: RawBalanceSummary): KisBalanceSummary {
  return {
    dncaTotAmt: raw.dnca_tot_amt,
    nxdyExccAmt: raw.nxdy_excc_amt,
    prvsRcdlExccAmt: raw.prvs_rcdl_excc_amt,
    cmaEvluAmt: raw.cma_evlu_amt,
    bfdyBuyAmt: raw.bfdy_buy_amt,
    thdtBuyAmt: raw.thdt_buy_amt,
    nxdyAutoRdptAmt: raw.nxdy_auto_rdpt_amt,
    bfdySllAmt: raw.bfdy_sll_amt,
    thdtSllAmt: raw.thdt_sll_amt,
    d2AutoRdptAmt: raw.d2_auto_rdpt_amt,
    bfdyTlexAmt: raw.bfdy_tlex_amt,
    thdtTlexAmt: raw.thdt_tlex_amt,
    totLoanAmt: raw.tot_loan_amt,
    sctsEvluAmt: raw.scts_evlu_amt,
    totEvluAmt: raw.tot_evlu_amt,
    nassAmt: raw.nass_amt,
    fncgGldAutoRdptYn: raw.fncg_gld_auto_rdpt_yn,
    pchsAmtSmtlAmt: raw.pchs_amt_smtl_amt,
    evluAmtSmtlAmt: raw.evlu_amt_smtl_amt,
    evluPflsSmtlAmt: raw.evlu_pfls_smtl_amt,
    totStlnSlngChgs: raw.tot_stln_slng_chgs,
    bfdyTotAsstEvluAmt: raw.bfdy_tot_asst_evlu_amt,
    asstIcdcAmt: raw.asst_icdc_amt,
    asstIcdcErngRt: raw.asst_icdc_erng_rt,
  };
}

async function fetchBalance(
  baseUrl: string,
  credentials: KisCredentials,
  token: string,
  params: KisBalanceParams,
  trId: string,
): Promise<KisBalanceResponse> {
  const queryParams = new URLSearchParams({
    CANO: params.accountNo,
    ACNT_PRDT_CD: params.accountProductCode,
    AFHR_FLPR_YN: params.afterHoursFloorPrice ?? "N",
    OFL_YN: "",
    INQR_DVSN: params.inquiryDivision ?? "02",
    UNPR_DVSN: params.unitPriceDivision ?? "01",
    FUND_STTL_ICLD_YN: params.fundSettlementIncluded ?? "N",
    FNCG_AMT_AUTO_RDPT_YN: params.loanAutoRepayment ?? "N",
    PRCS_DVSN: params.processDivision ?? "00",
    CTX_AREA_FK100: params.ctxAreaFk100 ?? "",
    CTX_AREA_NK100: params.ctxAreaNk100 ?? "",
  });

  const headers: Record<string, string> = {
    "content-type": "application/json; charset=UTF-8",
    authorization: `Bearer ${token}`,
    appkey: credentials.appkey,
    appsecret: credentials.appsecret,
    tr_id: trId,
    custtype: "P",
  };

  if (params.ctxAreaFk100 || params.ctxAreaNk100) {
    headers.tr_cont = "N";
  }

  const response = await fetch(
    `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?${queryParams}`,
    {
      method: "GET",
      headers,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `KIS balance inquiry failed: ${response.status} ${response.statusText}\n${errorBody}`,
    );
  }

  const data: RawBalanceResponse = await response.json();

  return {
    rtCd: data.rt_cd,
    msgCd: data.msg_cd,
    msg1: data.msg1,
    output1: data.output1.map(mapBalanceItem),
    output2: mapBalanceSummary(data.output2[0]),
    trCont: data.tr_cont,
    ctxAreaFk100: data.ctx_area_fk100,
    ctxAreaNk100: data.ctx_area_nk100,
  };
}

async function placeOrder(
  baseUrl: string,
  credentials: KisCredentials,
  token: string,
  params: KisOrderParams,
  trId: string,
): Promise<KisOrderResponse> {
  const body: Record<string, string> = {
    CANO: params.accountNo,
    ACNT_PRDT_CD: params.accountProductCode,
    PDNO: params.stockCode,
    ORD_DVSN: params.orderType,
    ORD_QTY: params.quantity,
    ORD_UNPR: params.price,
  };

  if (params.sellType) {
    body.SLL_TYPE = params.sellType;
  }
  if (params.conditionPrice) {
    body.CNDT_PRIC = params.conditionPrice;
  }
  if (params.exchangeId) {
    body.EXCG_ID_DVSN_CD = params.exchangeId;
  }

  const response = await fetch(`${baseUrl}/uapi/domestic-stock/v1/trading/order-cash`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${token}`,
      appkey: credentials.appkey,
      appsecret: credentials.appsecret,
      tr_id: trId,
      custtype: "P",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `KIS order request failed: ${response.status} ${response.statusText}\n${errorBody}`,
    );
  }

  const data: RawOrderResponse = await response.json();

  if (data.rt_cd !== "0") {
    throw new Error(`KIS order rejected: [${data.msg_cd}] ${data.msg1}`);
  }

  return {
    rtCd: data.rt_cd,
    msgCd: data.msg_cd,
    msg1: data.msg1,
    output: mapOutput(data.output),
  };
}

async function fetchDailyOrders(
  baseUrl: string,
  credentials: KisCredentials,
  token: string,
  params: KisDailyOrderParams,
  trId: string,
): Promise<KisDailyOrderResponse> {
  const queryParams = new URLSearchParams({
    CANO: params.accountNo,
    ACNT_PRDT_CD: params.accountProductCode,
    INQR_STRT_DT: params.startDate,
    INQR_END_DT: params.endDate,
    SLL_BUY_DVSN_CD: params.sellBuyDivision ?? "00",
    INQR_DVSN: params.inquiryDivision ?? "00",
    PDNO: params.stockCode ?? "",
    CCLD_DVSN: params.executionDivision ?? "00",
    ORD_GNO_BRNO: params.orderBranchNo ?? "",
    ODNO: params.orderNo ?? "",
    INQR_DVSN_3: params.inquiryDivision3 ?? "00",
    INQR_DVSN_1: params.inquiryDivision1 ?? "",
    CTX_AREA_FK100: params.ctxAreaFk100 ?? "",
    CTX_AREA_NK100: params.ctxAreaNk100 ?? "",
  });

  const headers: Record<string, string> = {
    "content-type": "application/json; charset=UTF-8",
    authorization: `Bearer ${token}`,
    appkey: credentials.appkey,
    appsecret: credentials.appsecret,
    tr_id: trId,
    custtype: "P",
  };

  if (params.ctxAreaFk100 || params.ctxAreaNk100) {
    headers.tr_cont = "N";
  }

  const response = await fetch(
    `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${queryParams}`,
    {
      method: "GET",
      headers,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `KIS daily order inquiry failed: ${response.status} ${response.statusText}\n${errorBody}`,
    );
  }

  const data: RawDailyOrderResponse = await response.json();

  return {
    rtCd: data.rt_cd,
    msgCd: data.msg_cd,
    msg1: data.msg1,
    output1: data.output1.map(mapDailyOrderItem),
    output2: mapDailyOrderSummary(data.output2),
    trCont: data.tr_cont,
    ctxAreaFk100: data.ctx_area_fk100,
    ctxAreaNk100: data.ctx_area_nk100,
  };
}

export function createKisOrderClient(env: BrokerEnv): KisOrderClient {
  const baseUrl = BASE_URLS[env];
  if (!baseUrl) {
    throw new Error(`Invalid BrokerEnv: "${env}". Expected "prod" or "dev".`);
  }

  return {
    async buyOrder(
      credentials: KisCredentials,
      token: string,
      params: KisOrderParams,
    ): Promise<KisOrderResponse> {
      return placeOrder(baseUrl, credentials, token, params, BUY_TR_IDS[env]);
    },

    async sellOrder(
      credentials: KisCredentials,
      token: string,
      params: KisOrderParams,
    ): Promise<KisOrderResponse> {
      return placeOrder(baseUrl, credentials, token, params, SELL_TR_IDS[env]);
    },

    async getDailyOrders(
      credentials: KisCredentials,
      token: string,
      params: KisDailyOrderParams,
      withinThreeMonths = true,
    ): Promise<KisDailyOrderResponse> {
      const trIds = DAILY_ORDER_TR_IDS[env];
      const trId = withinThreeMonths ? trIds.recent : trIds.old;
      return fetchDailyOrders(baseUrl, credentials, token, params, trId);
    },

    async getBalance(
      credentials: KisCredentials,
      token: string,
      params: KisBalanceParams,
    ): Promise<KisBalanceResponse> {
      return fetchBalance(baseUrl, credentials, token, params, BALANCE_TR_IDS[env]);
    },
  };
}
