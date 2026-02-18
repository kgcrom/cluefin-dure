export type OrderStatus = "pending" | "monitoring" | "executed" | "cancelled";
export type OrderBroker = "kis" | "kiwoom";
export type OrderMarket = "kospi" | "kosdaq";

export interface EntryOrder {
  id: number;
  stockCode: string;
  referencePrice: number;
  quantity: number;
  trailingStopPct: number;
  broker: OrderBroker;
  market: OrderMarket;
  status: OrderStatus;
  peakPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntryOrderRow {
  id: number;
  stock_code: string;
  reference_price: number;
  quantity: number;
  trailing_stop_pct: number;
  broker: OrderBroker;
  market: OrderMarket;
  status: OrderStatus;
  peak_price: number | null;
  created_at: string;
  updated_at: string;
}

export type ExecutionStatus = "ordered" | "filled" | "partial" | "rejected";

export interface TradeExecution {
  id: number;
  entryOrderId: number;
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
  entry_order_id: number;
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
  entryOrderId: number;
  brokerOrderId: string;
  requestedQty: number;
  requestedPrice: number;
  broker: OrderBroker;
  brokerResponse?: string;
}

export interface CreateEntryOrderInput {
  stockCode: string;
  referencePrice: number;
  quantity: number;
  trailingStopPct?: number;
  broker: OrderBroker;
  market?: OrderMarket;
}
