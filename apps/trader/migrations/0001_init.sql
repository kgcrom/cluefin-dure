CREATE TABLE entry_orders (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code        TEXT    NOT NULL,
    reference_price   INTEGER NOT NULL,
    quantity          INTEGER NOT NULL,
    trailing_stop_pct REAL    NOT NULL DEFAULT 5.0,
    broker            TEXT    NOT NULL CHECK (broker IN ('kis', 'kiwoom')),
    market            TEXT    NOT NULL DEFAULT 'kospi' CHECK (market IN ('kospi', 'kosdaq')),
    status            TEXT    NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'monitoring', 'executed', 'cancelled')),
    peak_price        INTEGER,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_entry_orders_status ON entry_orders(status);
CREATE INDEX idx_entry_orders_broker_status ON entry_orders(broker, status);

CREATE TABLE trade_executions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_order_id   INTEGER NOT NULL REFERENCES entry_orders(id),
    broker_order_id  TEXT    NOT NULL,
    requested_qty    INTEGER NOT NULL,
    requested_price  INTEGER NOT NULL,
    filled_qty       INTEGER,
    filled_price     INTEGER,
    status           TEXT    NOT NULL DEFAULT 'ordered'
                     CHECK (status IN ('ordered', 'filled', 'partial', 'rejected')),
    broker           TEXT    NOT NULL CHECK (broker IN ('kis', 'kiwoom')),
    broker_response  TEXT,
    ordered_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    filled_at        TEXT
);

CREATE INDEX idx_trade_executions_entry_order_id ON trade_executions(entry_order_id);
CREATE INDEX idx_trade_executions_status ON trade_executions(status);

CREATE TABLE broker_auth_tokens (
    broker     TEXT PRIMARY KEY,
    token      TEXT NOT NULL,
    token_type TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
