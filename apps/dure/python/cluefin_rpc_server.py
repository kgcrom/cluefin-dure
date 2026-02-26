#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timezone


def now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def write_response(payload: dict) -> None:
  sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
  sys.stdout.flush()


def write_error(request_id, code: int, message: str, data=None) -> None:
  response = {
    "jsonrpc": "2.0",
    "id": request_id,
    "error": {
      "code": code,
      "message": message,
    },
  }
  if data is not None:
    response["error"]["data"] = data

  write_response(response)


def handle_stock_get_quote(params: dict) -> dict:
  symbol = params.get("symbol")
  if not isinstance(symbol, str) or not symbol:
    raise ValueError("'symbol' must be a non-empty string")

  tail = symbol[-2:] if len(symbol) >= 2 else symbol
  base = int(tail) if tail.isdigit() else len(symbol)

  return {
    "symbol": symbol,
    "market": "KRX",
    "price": 70000 + (base * 10),
    "currency": "KRW",
    "as_of": now_iso(),
  }


def handle_news_search(params: dict) -> dict:
  query = params.get("query")
  if not isinstance(query, str) or not query:
    raise ValueError("'query' must be a non-empty string")

  limit = params.get("limit", 5)
  if not isinstance(limit, int) or limit < 1:
    raise ValueError("'limit' must be a positive integer")

  items = []
  for idx in range(limit):
    items.append(
      {
        "title": f"[{query}] 샘플 뉴스 {idx + 1}",
        "source": "cluefin-sample",
        "published_at": now_iso(),
        "url": f"https://example.com/news/{query}/{idx + 1}",
      }
    )

  return {
    "query": query,
    "items": items,
  }


def handle_request(request: dict):
  request_id = request.get("id")
  method = request.get("method")
  params = request.get("params", {})

  if method == "stock.get_quote":
    return request_id, handle_stock_get_quote(params)

  if method == "news.search":
    return request_id, handle_news_search(params)

  raise KeyError(f"Method not found: {method}")


def main() -> int:
  for raw_line in sys.stdin:
    line = raw_line.strip()
    if not line:
      continue

    try:
      request = json.loads(line)
    except json.JSONDecodeError as error:
      write_error(None, -32700, "Parse error", str(error))
      continue

    if not isinstance(request, dict) or request.get("jsonrpc") != "2.0":
      write_error(request.get("id") if isinstance(request, dict) else None, -32600, "Invalid Request")
      continue

    if "method" not in request:
      write_error(request.get("id"), -32600, "Invalid Request: missing method")
      continue

    request_id = request.get("id")

    try:
      rpc_id, result = handle_request(request)
    except KeyError as error:
      if request_id is not None:
        write_error(request_id, -32601, str(error))
      continue
    except ValueError as error:
      if request_id is not None:
        write_error(request_id, -32602, "Invalid params", str(error))
      continue
    except Exception as error:  # pragma: no cover
      if request_id is not None:
        write_error(request_id, -32000, "Server error", str(error))
      continue

    if request_id is not None:
      write_response({"jsonrpc": "2.0", "id": rpc_id, "result": result})

  return 0


if __name__ == "__main__":
  raise SystemExit(main())
