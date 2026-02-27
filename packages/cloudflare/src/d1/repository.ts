import { toEntryOrder, toTradeExecution } from "./mapper";
import type {
  CreateEntryOrderInput,
  CreateTradeExecutionInput,
  EntryOrder,
  EntryOrderRow,
  ExecutionStatus,
  OrderBroker,
  OrderStatus,
  TradeExecution,
  TradeExecutionRow,
} from "./types";

export function createOrderRepository(db: D1Database) {
  return {
    async getActiveOrders(broker?: OrderBroker): Promise<EntryOrder[]> {
      const activeStatuses = ["pending", "monitoring"];
      let stmt: D1PreparedStatement;

      if (broker) {
        stmt = db
          .prepare(
            "SELECT * FROM entry_orders WHERE status IN (?, ?) AND broker = ? ORDER BY created_at DESC",
          )
          .bind(activeStatuses[0], activeStatuses[1], broker);
      } else {
        stmt = db
          .prepare("SELECT * FROM entry_orders WHERE status IN (?, ?) ORDER BY created_at DESC")
          .bind(activeStatuses[0], activeStatuses[1]);
      }

      const result = await stmt.all<EntryOrderRow>();
      return result.results.map(toEntryOrder);
    },

    async getEntryOrderById(id: number): Promise<EntryOrder | null> {
      const result = await db
        .prepare("SELECT * FROM entry_orders WHERE id = ?")
        .bind(id)
        .first<EntryOrderRow>();

      return result ? toEntryOrder(result) : null;
    },

    async updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
      await db
        .prepare("UPDATE entry_orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(status, id)
        .run();
    },

    async getRequestedQuantity(entryOrderId: number): Promise<number> {
      const result = await db
        .prepare(
          "SELECT COALESCE(SUM(requested_qty), 0) as total FROM trade_executions WHERE entry_order_id = ? AND status != 'rejected'",
        )
        .bind(entryOrderId)
        .first<{ total: number }>();

      return result?.total ?? 0;
    },

    async createExecution(input: CreateTradeExecutionInput): Promise<TradeExecution> {
      const result = await db
        .prepare(
          `INSERT INTO trade_executions (entry_order_id, broker_order_id, requested_qty, requested_price, broker, broker_response)
           VALUES (?, ?, ?, ?, ?, ?)
           RETURNING *`,
        )
        .bind(
          input.entryOrderId,
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
          "UPDATE entry_orders SET peak_price = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(peakPrice, id)
        .run();
    },

    async getUnfilledCountForEntryOrder(entryOrderId: number): Promise<number> {
      const result = await db
        .prepare(
          "SELECT COUNT(*) as cnt FROM trade_executions WHERE entry_order_id = ? AND status = 'ordered'",
        )
        .bind(entryOrderId)
        .first<{ cnt: number }>();
      return result?.cnt ?? 0;
    },

    async getFilledQuantityForEntryOrder(entryOrderId: number): Promise<number> {
      const result = await db
        .prepare(
          "SELECT COALESCE(SUM(filled_qty), 0) as total FROM trade_executions WHERE entry_order_id = ? AND status IN ('filled', 'partial')",
        )
        .bind(entryOrderId)
        .first<{ total: number }>();

      return result?.total ?? 0;
    },

    async createEntryOrder(input: CreateEntryOrderInput): Promise<EntryOrder> {
      const result = await db
        .prepare(
          `INSERT INTO entry_orders (stock_code, reference_price, quantity, trailing_stop_pct, broker, market)
           VALUES (?, ?, ?, ?, ?, ?)
           RETURNING *`,
        )
        .bind(
          input.stockCode,
          input.referencePrice,
          input.quantity,
          input.trailingStopPct ?? 5,
          input.broker,
          input.market ?? "kospi",
        )
        .first<EntryOrderRow>();

      if (!result) {
        throw new Error("Failed to create entry order");
      }
      return toEntryOrder(result);
    },

    async getSummary(): Promise<{
      orders: { total: number; byStatus: Record<string, number> };
      executions: { total: number; byStatus: Record<string, number> };
    }> {
      const orderRows = await db
        .prepare("SELECT status, COUNT(*) as cnt FROM entry_orders GROUP BY status")
        .all<{ status: string; cnt: number }>();

      const executionRows = await db
        .prepare(
          `SELECT te.status, COUNT(*) as cnt FROM trade_executions te
           JOIN entry_orders eo ON te.entry_order_id = eo.id
           GROUP BY te.status`,
        )
        .all<{ status: string; cnt: number }>();

      const ordersByStatus: Record<string, number> = {};
      let orderTotal = 0;
      for (const row of orderRows.results) {
        ordersByStatus[row.status] = row.cnt;
        orderTotal += row.cnt;
      }

      const executionsByStatus: Record<string, number> = {};
      let executionTotal = 0;
      for (const row of executionRows.results) {
        executionsByStatus[row.status] = row.cnt;
        executionTotal += row.cnt;
      }

      return {
        orders: { total: orderTotal, byStatus: ordersByStatus },
        executions: { total: executionTotal, byStatus: executionsByStatus },
      };
    },

    async deleteAllRecords(): Promise<{ deletedOrders: number; deletedExecutions: number }> {
      // trade_executions 먼저 삭제 (FK 참조)
      const execResult = await db.prepare("DELETE FROM trade_executions").run();

      const orderResult = await db.prepare("DELETE FROM entry_orders").run();

      return {
        deletedOrders: orderResult.meta.changes,
        deletedExecutions: execResult.meta.changes,
      };
    },
  };
}
