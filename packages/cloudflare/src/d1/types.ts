export type OrderSide = "buy" | "sell";
export type OrderStatus = "pending" | "monitoring" | "executed" | "cancelled";
export type OrderBroker = "kis" | "kiwoom";
export type OrderMarket = "kospi" | "kosdaq";

export interface TradeOrder {
  id: number;
  stockCode: string;
  stockName: string | null;
  side: OrderSide;
  referencePrice: number;
  quantity: number;
  trailingStopPct: number;
  volumeThreshold: number | null;
  broker: OrderBroker;
  market: OrderMarket;
  status: OrderStatus;
  peakPrice: number | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradeOrderRow {
  id: number;
  stock_code: string;
  stock_name: string | null;
  side: OrderSide;
  reference_price: number;
  quantity: number;
  trailing_stop_pct: number;
  volume_threshold: number | null;
  broker: OrderBroker;
  market: OrderMarket;
  status: OrderStatus;
  peak_price: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export type ExecutionStatus = "ordered" | "filled" | "partial" | "rejected";

export interface TradeExecution {
  id: number;
  orderId: number;
  brokerOrderId: string;
  requestedQty: number;
  requestedPrice: number;
  filledQty: number | null;
  filledPrice: number | null;
  status: ExecutionStatus;
  broker: OrderBroker;
  brokerResponse: string | null;
  orderedAt: string;
  filledAt: string | null;
}

export interface TradeExecutionRow {
  id: number;
  order_id: number;
  broker_order_id: string;
  requested_qty: number;
  requested_price: number;
  filled_qty: number | null;
  filled_price: number | null;
  status: ExecutionStatus;
  broker: OrderBroker;
  broker_response: string | null;
  ordered_at: string;
  filled_at: string | null;
}

export interface CreateTradeExecutionInput {
  orderId: number;
  brokerOrderId: string;
  requestedQty: number;
  requestedPrice: number;
  broker: OrderBroker;
  brokerResponse?: string;
}

export interface CreateTradeOrderInput {
  stockCode: string;
  stockName?: string;
  side: OrderSide;
  referencePrice: number;
  quantity: number;
  trailingStopPct?: number;
  volumeThreshold?: number;
  broker: OrderBroker;
  market?: OrderMarket;
  memo?: string;
}
