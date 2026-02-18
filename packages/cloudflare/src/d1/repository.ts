import { toTradeExecution, toTradeOrder } from "./mapper";
import type {
  CreateTradeExecutionInput,
  CreateTradeOrderInput,
  ExecutionStatus,
  OrderBroker,
  OrderStatus,
  TradeExecution,
  TradeExecutionRow,
  TradeOrder,
  TradeOrderRow,
} from "./types";

export function createOrderRepository(db: D1Database) {
  return {
    async getActiveOrders(broker?: OrderBroker): Promise<TradeOrder[]> {
      const activeStatuses = ["pending", "monitoring"];
      let stmt: D1PreparedStatement;

      if (broker) {
        stmt = db
          .prepare(
            "SELECT * FROM trade_orders WHERE status IN (?, ?) AND broker = ? ORDER BY created_at DESC",
          )
          .bind(activeStatuses[0], activeStatuses[1], broker);
      } else {
        stmt = db
          .prepare("SELECT * FROM trade_orders WHERE status IN (?, ?) ORDER BY created_at DESC")
          .bind(activeStatuses[0], activeStatuses[1]);
      }

      const result = await stmt.all<TradeOrderRow>();
      return result.results.map(toTradeOrder);
    },

    async getOrderById(id: number): Promise<TradeOrder | null> {
      const result = await db
        .prepare("SELECT * FROM trade_orders WHERE id = ?")
        .bind(id)
        .first<TradeOrderRow>();

      return result ? toTradeOrder(result) : null;
    },

    async updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
      await db
        .prepare("UPDATE trade_orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(status, id)
        .run();
    },

    async getRequestedQuantity(orderId: number): Promise<number> {
      const result = await db
        .prepare(
          "SELECT COALESCE(SUM(requested_qty), 0) as total FROM trade_executions WHERE order_id = ? AND status != 'rejected'",
        )
        .bind(orderId)
        .first<{ total: number }>();

      return result?.total ?? 0;
    },

    async createExecution(input: CreateTradeExecutionInput): Promise<TradeExecution> {
      const result = await db
        .prepare(
          `INSERT INTO trade_executions (order_id, broker_order_id, requested_qty, requested_price, broker, broker_response)
           VALUES (?, ?, ?, ?, ?, ?)
           RETURNING *`,
        )
        .bind(
          input.orderId,
          input.brokerOrderId,
          input.requestedQty,
          input.requestedPrice,
          input.broker,
          input.brokerResponse ?? null,
        )
        .first<TradeExecutionRow>();

      if (!result) {
        throw new Error("Failed to create execution");
      }
      return toTradeExecution(result);
    },

    async getUnfilledExecutions(broker?: OrderBroker): Promise<TradeExecution[]> {
      let stmt: D1PreparedStatement;

      if (broker) {
        stmt = db
          .prepare(
            "SELECT * FROM trade_executions WHERE status = 'ordered' AND broker = ? ORDER BY ordered_at ASC",
          )
          .bind(broker);
      } else {
        stmt = db.prepare(
          "SELECT * FROM trade_executions WHERE status = 'ordered' ORDER BY ordered_at ASC",
        );
      }

      const result = await stmt.all<TradeExecutionRow>();
      return result.results.map(toTradeExecution);
    },

    async updateExecutionFill(
      id: number,
      filledQty: number,
      filledPrice: number,
      status: ExecutionStatus,
    ): Promise<void> {
      await db
        .prepare(
          "UPDATE trade_executions SET filled_qty = ?, filled_price = ?, status = ?, filled_at = datetime('now') WHERE id = ?",
        )
        .bind(filledQty, filledPrice, status, id)
        .run();
    },

    async updatePeakPrice(id: number, peakPrice: number): Promise<void> {
      await db
        .prepare(
          "UPDATE trade_orders SET peak_price = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(peakPrice, id)
        .run();
    },

    async getFilledQuantityForOrder(orderId: number): Promise<number> {
      const result = await db
        .prepare(
          "SELECT COALESCE(SUM(filled_qty), 0) as total FROM trade_executions WHERE order_id = ? AND status IN ('filled', 'partial')",
        )
        .bind(orderId)
        .first<{ total: number }>();

      return result?.total ?? 0;
    },

    async createOrder(input: CreateTradeOrderInput): Promise<TradeOrder> {
      const result = await db
        .prepare(
          `INSERT INTO trade_orders (stock_code, side, reference_price, quantity, trailing_stop_pct, broker, market)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           RETURNING *`,
        )
        .bind(
          input.stockCode,
          input.side,
          input.referencePrice,
          input.quantity,
          input.trailingStopPct ?? 5,
          input.broker,
          input.market ?? "kospi",
        )
        .first<TradeOrderRow>();

      if (!result) {
        throw new Error("Failed to create order");
      }
      return toTradeOrder(result);
    },
  };
}
