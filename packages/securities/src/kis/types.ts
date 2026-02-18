export interface KisCredentials {
  appkey: string;
  appsecret: string;
}

export interface KisTokenRequest {
  grant_type: string;
  appkey: string;
  appsecret: string;
}

export interface KisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  access_token_token_expired: string;
}

export interface KisIntradayChartParams {
  marketCode: "J" | "NX" | "UN";
  stockCode: string;
  inputHour: string;
  includePrevData: string;
  etcClassCode: string;
}

export interface KisIntradayChartOutput1 {
  prdyVrss: string;
  prdyVrssSign: string;
  prdyCtrt: string;
  stckPrdyClpr: string;
  acmlVol: string;
  acmlTrPbmn: string;
  htsKorIsnm: string;
  stckPrpr: string;
}

export interface KisIntradayChartOutput2 {
  stckBsopDate: string;
  stckCntgHour: string;
  stckPrpr: string;
  stckOprc: string;
  stckHgpr: string;
  stckLwpr: string;
  cntgVol: string;
  acmlTrPbmn: string;
}

export interface KisIntradayChartResponse {
  rtCd: string;
  msgCd: string;
  msg1: string;
  output1: KisIntradayChartOutput1;
  output2: KisIntradayChartOutput2[];
}

/** 국내주식주문(현금) 파라미터 */
export interface KisOrderParams {
  /** 계좌번호 체계(8-2)의 앞 8자리 */
  accountNo: string;
  /** 계좌번호 체계(8-2)의 뒤 2자리 */
  accountProductCode: string;
  /** 종목코드(6자리), ETN은 7자리 */
  stockCode: string;
  /** 주문구분 (00:지정가, 01:시장가, ...) */
  orderType: string;
  /** 주문수량 */
  quantity: string;
  /** 주문단가 (시장가 등은 "0") */
  price: string;
  /** 매도유형 (매도주문 시): 01@일반매도, 02@임의매매, 05@대차매도 */
  sellType?: string;
  /** 조건가격 (스탑지정가 주문시, ORD_DVSN=22) */
  conditionPrice?: string;
  /** 거래소ID구분코드: KRX, NXT, SOR */
  exchangeId?: string;
}

export interface KisOrderOutput {
  /** 거래소코드 */
  krxFwdgOrdOrgno: string;
  /** 주문번호 */
  odno: string;
  /** 주문시간 */
  ordTmd: string;
}

export interface KisOrderResponse {
  rtCd: string;
  msgCd: string;
  msg1: string;
  output: KisOrderOutput;
}

/** 주식일별주문체결조회 파라미터 */
export interface KisDailyOrderParams {
  /** 계좌번호 체계(8-2)의 앞 8자리 */
  accountNo: string;
  /** 계좌번호 체계(8-2)의 뒤 2자리 */
  accountProductCode: string;
  /** 조회시작일자 (YYYYMMDD) */
  startDate: string;
  /** 조회종료일자 (YYYYMMDD) */
  endDate: string;
  /** 매도매수구분코드 (00:전체, 01:매도, 02:매수) */
  sellBuyDivision?: string;
  /** 종목번호 6자리 (빈값: 전체) */
  stockCode?: string;
  /** 주문채번지점번호 (5자리) */
  orderBranchNo?: string;
  /** 주문번호 (빈값: 전체) */
  orderNo?: string;
  /** 체결구분 (00:전체, 01:체결, 02:미체결) */
  executionDivision?: string;
  /** 조회구분 (00:역순, 01:정순) */
  inquiryDivision?: string;
  /** 조회구분1 (빈값:전체, 1:ELW, 2:프리보드) */
  inquiryDivision1?: string;
  /** 조회구분3 (00:전체, 01:현금, 02:융자, 03:대출, 04:대주) */
  inquiryDivision3?: string;
  /** 거래소ID구분코드 (KRX, NXT, SOR, ALL) */
  exchangeId?: string;
  /** 연속조회검색조건 */
  ctxAreaFk100?: string;
  /** 연속조회키 */
  ctxAreaNk100?: string;
}

/** 주식일별주문체결조회 응답 - 개별 주문 */
export interface KisDailyOrderItem {
  /** 주문일자 (YYYYMMDD) */
  ordDt: string;
  /** 주문채번지점번호 */
  ordGnoNo: string;
  /** 주문번호 */
  odno: string;
  /** 원주문번호 */
  orgnOdno: string;
  /** 매도매수구분명 */
  sllBuyDvsnCdName: string;
  /** 매도매수구분코드 */
  sllBuyDvsnCd: string;
  /** 종목번호 */
  pdno: string;
  /** 종목명 */
  prdt_name: string;
  /** 주문수량 */
  ordQty: string;
  /** 주문단가 */
  ordUnpr: string;
  /** 주문시간 */
  ordTmd: string;
  /** 총체결수량 */
  totCcldQty: string;
  /** 총체결금액 */
  totCcldAmt: string;
  /** 평균가 */
  avgPrvs: string;
  /** 체결단가 */
  ccldCndt: string;
  /** 주문구분명 */
  ordDvsnName: string;
  /** 주문구분코드 */
  ordDvsnCd: string;
  /** 정정확인수량 */
  mdfyCnfmQty: string;
  /** 취소확인수량 */
  cncl_cnfm_qty: string;
  /** 잔여수량 */
  rmnQty: string;
  /** 거부수량 */
  rjctQty: string;
  /** 통신매체코드 */
  commMediaCd: string;
  /** 통신매체구분명 */
  commMediaDvsnName: string;
  /** 조건부지정가구분코드 */
  cndiOrdDvsnCd: string;
  /** 조건부지정가구분명 */
  cndiOrdDvsnCdName: string;
  /** 거래소ID구분코드 */
  excgIdDvsnCd: string;
  /** 거래소ID구분코드명 */
  excgIdDvsnCdName: string;
}

/** 주식일별주문체결조회 응답 - 합계 */
export interface KisDailyOrderSummary {
  /** 총주문수량 */
  totOrdQty: string;
  /** 총체결수량 */
  totCcldQty: string;
  /** 총체결금액 */
  totCcldAmt: string;
  /** 매도체결금액 */
  prdySllAmt: string;
  /** 매수체결금액 */
  prdyBuyAmt: string;
  /** 매도체결수량 */
  sllCcldAmt: string;
  /** 매수체결수량 */
  buyCcldAmt: string;
}

/** 주식현재가 시세조회 파라미터 */
export interface KisStockPriceParams {
  marketCode: "J" | "NX" | "UN";
  stockCode: string;
}

/** 주식현재가 시세조회 응답 output */
export interface KisStockPriceOutput {
  // 종목 상태
  iscdStatClsCode: string;
  margRate: string;
  rprsMrktKorName: string;
  newHgprLwprClsCode: string;
  bstpKorIsnm: string;
  tempStopYn: string;
  oprcRangContYn: string;
  clprRangContYn: string;
  crdtAbleYn: string;
  grmnRateClsCode: string;
  elwPblcYn: string;
  // 현재가·등락
  stckPrpr: string;
  prdyVrss: string;
  prdyVrssSign: string;
  prdyCtrt: string;
  // 거래
  acmlTrPbmn: string;
  acmlVol: string;
  prdyVrssVolRate: string;
  // 가격
  stckOprc: string;
  stckHgpr: string;
  stckLwpr: string;
  stckMxpr: string;
  stckLlam: string;
  stckSdpr: string;
  wghnAvrgStckPrc: string;
  // 외국인·프로그램
  htsFrgnEhrt: string;
  frgnNtbyQty: string;
  pgtrNtbyQty: string;
  // 피벗
  pvtScndDmrsPrc: string;
  pvtFrstDmrsPrc: string;
  pvtPontVal: string;
  pvtFrstDmspPrc: string;
  pvtScndDmspPrc: string;
  dmrsVal: string;
  dmspVal: string;
  // 기업 정보
  cpfn: string;
  rstcWdthPrc: string;
  stckFcam: string;
  stckSspr: string;
  asprUnit: string;
  htsDealQtyUnitVal: string;
  lstnStcn: string;
  htsAvls: string;
  per: string;
  pbr: string;
  stacMonth: string;
  volTnrt: string;
  eps: string;
  bps: string;
  // 250일·연중·52주
  d250Hgpr: string;
  d250HgprDate: string;
  d250HgprVrssPrprRate: string;
  d250Lwpr: string;
  d250LwprDate: string;
  d250LwprVrssPrprRate: string;
  stckDryyHgpr: string;
  dryyHgprVrssPrprRate: string;
  dryyHgprDate: string;
  stckDryyLwpr: string;
  dryyLwprVrssPrprRate: string;
  dryyLwprDate: string;
  w52Hgpr: string;
  w52HgprVrssPrprCtrt: string;
  w52HgprDate: string;
  w52Lwpr: string;
  w52LwprVrssPrprCtrt: string;
  w52LwprDate: string;
  // 기타
  wholLoanRmndRate: string;
  sstsYn: string;
  stckShrnIscd: string;
  fcamCnnm: string;
  cpfnCnnm: string;
  apprchRate: string;
  frgnHldnQty: string;
  viClsCode: string;
  ovtmViClsCode: string;
  lastSstsCntgQty: string;
  invtCafulYn: string;
  mrktWarnClsCode: string;
  shortOverYn: string;
  sltrYn: string;
  mangIssuClsCode: string;
}

/** 주식현재가 시세조회 응답 */
export interface KisStockPriceResponse {
  rtCd: string;
  msgCd: string;
  msg1: string;
  output: KisStockPriceOutput;
}

/** 주식일별주문체결조회 응답 */
export interface KisDailyOrderResponse {
  rtCd: string;
  msgCd: string;
  msg1: string;
  output1: KisDailyOrderItem[];
  output2: KisDailyOrderSummary;
  /** 연속조회 여부 (M: 다음 데이터 있음) */
  trCont?: string;
  /** 연속조회검색조건 */
  ctxAreaFk100?: string;
  /** 연속조회키 */
  ctxAreaNk100?: string;
}

/** 주식잔고조회 파라미터 */
export interface KisBalanceParams {
  /** 계좌번호 체계(8-2)의 앞 8자리 */
  accountNo: string;
  /** 계좌번호 체계(8-2)의 뒤 2자리 */
  accountProductCode: string;
  /** 시간외단일가여부 (N/Y/X, 기본 N) */
  afterHoursFloorPrice?: string;
  /** 조회구분 (01:대출일별, 02:종목별, 기본 02) */
  inquiryDivision?: string;
  /** 단가구분 (01:기본값) */
  unitPriceDivision?: string;
  /** 펀드결제분포함여부 (N/Y, 기본 N) */
  fundSettlementIncluded?: string;
  /** 융자금액자동상환여부 (기본 N) */
  loanAutoRepayment?: string;
  /** 처리구분 (00:전일매매포함, 01:미포함, 기본 00) */
  processDivision?: string;
  /** 연속조회검색조건 */
  ctxAreaFk100?: string;
  /** 연속조회키 */
  ctxAreaNk100?: string;
}

/** 주식잔고조회 응답 - 보유종목 */
export interface KisBalanceItem {
  /** 종목번호 */
  pdno: string;
  /** 종목명 */
  prdtName: string;
  /** 매매구분명 */
  tradDvsnName: string;
  /** 전일매수수량 */
  bfdyBuyQty: string;
  /** 전일매도수량 */
  bfdySllQty: string;
  /** 금일매수수량 */
  thdtBuyqty: string;
  /** 금일매도수량 */
  thdtSllQty: string;
  /** 보유수량 */
  hldgQty: string;
  /** 주문가능수량 */
  ordPsblQty: string;
  /** 매입평균가격 */
  pchsAvgPric: string;
  /** 매입금액 */
  pchsAmt: string;
  /** 현재가 */
  prpr: string;
  /** 평가금액 */
  evluAmt: string;
  /** 평가손익금액 */
  evluPflsAmt: string;
  /** 평가손익율 */
  evluPflsRt: string;
  /** 평가수익율 */
  evluErngRt: string;
  /** 대출일자 */
  loanDt: string;
  /** 대출금액 */
  loanAmt: string;
  /** 대주매각대금 */
  stlnSlngChgs: string;
  /** 만기일자 */
  expdDt: string;
  /** 등락율 */
  flttRt: string;
  /** 전일대비증감 */
  bfdyCprsIcdc: string;
  /** 종목증거금율명 */
  itemMgnaRtName: string;
  /** 보증금율명 */
  grtaRtName: string;
  /** 대용가격 */
  sbstPric: string;
  /** 주식대출단가 */
  stckLoanUnpr: string;
}

/** 주식잔고조회 응답 - 계좌 요약 */
export interface KisBalanceSummary {
  /** 예수금총금액 */
  dncaTotAmt: string;
  /** 익일정산금액 (D+1) */
  nxdyExccAmt: string;
  /** 가수도정산금액 (D+2) */
  prvsRcdlExccAmt: string;
  /** CMA평가금액 */
  cmaEvluAmt: string;
  /** 전일매수금액 */
  bfdyBuyAmt: string;
  /** 금일매수금액 */
  thdtBuyAmt: string;
  /** 익일자동상환금액 */
  nxdyAutoRdptAmt: string;
  /** 전일매도금액 */
  bfdySllAmt: string;
  /** 금일매도금액 */
  thdtSllAmt: string;
  /** D+2자동상환금액 */
  d2AutoRdptAmt: string;
  /** 전일제비용금액 */
  bfdyTlexAmt: string;
  /** 금일제비용금액 */
  thdtTlexAmt: string;
  /** 총대출금액 */
  totLoanAmt: string;
  /** 유가평가금액 */
  sctsEvluAmt: string;
  /** 총평가금액 */
  totEvluAmt: string;
  /** 순자산금액 */
  nassAmt: string;
  /** 융자금자동상환여부 */
  fncgGldAutoRdptYn: string;
  /** 매입금액합계 */
  pchsAmtSmtlAmt: string;
  /** 평가금액합계 */
  evluAmtSmtlAmt: string;
  /** 평가손익합계 */
  evluPflsSmtlAmt: string;
  /** 총대주매각대금 */
  totStlnSlngChgs: string;
  /** 전일총자산평가금액 */
  bfdyTotAsstEvluAmt: string;
  /** 자산증감액 */
  asstIcdcAmt: string;
  /** 자산증감수익율 */
  asstIcdcErngRt: string;
}

/** 주식잔고조회 응답 */
export interface KisBalanceResponse {
  rtCd: string;
  msgCd: string;
  msg1: string;
  output1: KisBalanceItem[];
  output2: KisBalanceSummary;
  /** 연속조회 여부 (M: 다음 데이터 있음) */
  trCont?: string;
  /** 연속조회검색조건 */
  ctxAreaFk100?: string;
  /** 연속조회키 */
  ctxAreaNk100?: string;
}

/** 주식현재가 일자별 조회 파라미터 */
export interface KisDailyPriceParams {
  /** 시장 분류 코드 (J:주식, NX:넥스트, UN:유닛) */
  marketCode: "J" | "NX" | "UN";
  /** 종목코드 (6자리) */
  stockCode: string;
  /** 기간 분류 코드 (D:일, W:주, M:월) */
  periodDivCode: "D" | "W" | "M";
  /** 수정주가 반영 여부 (0:미반영, 1:반영) */
  orgAdjPrc: "0" | "1";
}

/** 주식현재가 일자별 조회 응답 output */
export interface KisDailyPriceOutput {
  stckBsopDate: string;
  stckOprc: string;
  stckHgpr: string;
  stckLwpr: string;
  stckClpr: string;
  acmlVol: string;
  prdyVrssVolRate: string;
  prdyVrss: string;
  prdyVrssSign: string;
  prdyCtrt: string;
  htsFrgnEhrt: string;
  frgnNtbyQty: string;
  flngClsCode: string;
  acmlPrttRate: string;
}

/** 주식현재가 일자별 조회 응답 */
export interface KisDailyPriceResponse {
  rtCd: string;
  msgCd: string;
  msg1: string;
  output: KisDailyPriceOutput[];
}

/** 국내업종 현재지수 조회 파라미터 */
export interface KisIndexPriceParams {
  /** 업종코드 (코스피: 0001, 코스닥: 1001, 코스피200: 2001 등) */
  sectorCode: string;
}

/** 국내업종 현재지수 조회 응답 output */
export interface KisIndexPriceOutput {
  bstpNmixPrpr: string;
  bstpNmixPrdyVrss: string;
  prdyVrssSign: string;
  bstpNmixPrdyCtrt: string;
  acmlVol: string;
  prdyVol: string;
  acmlTrPbmn: string;
  prdyTrPbmn: string;
  bstpNmixOprc: string;
  prdyNmixVrssNmixOprc: string;
  oprcVrssPrprSign: string;
  bstpNmixOprcPrdyCtrt: string;
  bstpNmixHgpr: string;
  prdyNmixVrssNmixHgpr: string;
  hgprVrssPrprSign: string;
  bstpNmixHgprPrdyCtrt: string;
  bstpNmixLwpr: string;
  prdyClprVrssLwpr: string;
  lwprVrssPrprSign: string;
  prdyClprVrssLwprRate: string;
  ascnIssuCnt: string;
  uplmIssuCnt: string;
  stnrIssuCnt: string;
  downIssuCnt: string;
  lslmIssuCnt: string;
  dryyBstpNmixHgpr: string;
  dryyHgprVrssPrprRate: string;
  dryyBstpNmixHgprDate: string;
  dryyBstpNmixLwpr: string;
  dryyLwprVrssPrprRate: string;
  dryyBstpNmixLwprDate: string;
  totalAskpRsqn: string;
  totalBidpRsqn: string;
  selnRsqnRate: string;
  shnuRsqnRate: string;
  ntbyRsqn: string;
}

/** 국내업종 현재지수 조회 응답 */
export interface KisIndexPriceResponse {
  rtCd: string;
  msgCd: string;
  msg1: string;
  output: KisIndexPriceOutput;
}
