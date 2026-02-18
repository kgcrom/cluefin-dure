import type { TradeExecution, TradeExecutionRow, TradeOrder, TradeOrderRow } from "./types";

export function toTradeExecution(row: TradeExecutionRow): TradeExecution {
  return {
    id: row.id,
    orderId: row.order_id,
    brokerOrderId: row.broker_order_id,
    requestedQty: row.requested_qty,
    requestedPrice: row.requested_price,
    filledQty: row.filled_qty,
    filledPrice: row.filled_price,
    status: row.status,
    broker: row.broker,
    brokerResponse: row.broker_response,
    orderedAt: row.ordered_at,
    filledAt: row.filled_at,
  };
}

export function toTradeOrder(row: TradeOrderRow): TradeOrder {
  return {
    id: row.id,
    stockCode: row.stock_code,
    side: row.side,
    referencePrice: row.reference_price,
    quantity: row.quantity,
    trailingStopPct: row.trailing_stop_pct,
    broker: row.broker,
    market: row.market,
    status: row.status,
    peakPrice: row.peak_price,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
