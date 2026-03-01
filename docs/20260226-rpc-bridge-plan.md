# JSON-RPC 2.0 Bridge: cluefin ↔ dure 구현 계획

## Architecture

```
cluefin-fsd (Node.js/TypeScript)              cluefin (Python/uv)
================================          ================================
apps/dure/                       apps/cluefin-rpc/
  tool-registry.ts (AI tool 변환)           server.py (main loop)
  stdio-jsonrpc-client.ts (child_process.spawn)       dispatcher.py (routing)
  index.ts (CLI)                            handlers/ (quote, ta, account, dart)
        ─── stdin/stdout NDJSON ───>          middleware/ (auth, errors)
        <───────────────────────              config.py (settings)
```

## Phase 의존성

```
Phase 0 (Foundation) ✅ DONE
  ├── A0: Python RPC 서버 코어 (protocol, dispatcher, session, config) ✅
  └── B0: TS Tool Registry + 클라이언트 개선 ✅
          │
Phase 1~4: 핸들러 구현 ✅ DONE (Phase 0에서 모두 구현 완료)
  ├── Quote (12 methods): KIS 시세 6 + Kiwoom 차트 4 + KRX 2
  ├── TA (11 methods): SMA, EMA, RSI, MACD, BBANDS, STOCH, ADX, ATR, OBV, MDD, SHARPE
  └── DART (4 methods): 공시검색, 기업개황, 고유번호조회, 대주주
```

---

## 등록된 RPC 메서드 (32개)

### Meta (5)
| RPC 메서드 | 설명 | requires_session |
|---|---|---|
| `rpc.ping` | 헬스 체크 | No |
| `rpc.list_methods` | 등록된 메서드 JSON Schema 목록 (category/broker 필터) | No |
| `session.initialize` | 브로커 세션 초기화 (`{broker: "kis"\|"kiwoom"\|"krx"\|"dart"}`) | No |
| `session.status` | 활성 세션 상태 조회 | No |
| `session.close` | 브로커 세션 종료 | No |

### Quote — KIS (6)
| RPC 메서드 | Python 호출 |
|---|---|
| `quote.kis.stock_current` | `kis.domestic_basic_quote.get_stock_current_price("J", stock_code)` |
| `quote.kis.stock_daily` | `kis.domestic_basic_quote.get_stock_current_price_daily(...)` |
| `quote.kis.stock_period` | `kis.domestic_basic_quote.get_stock_period_quote(...)` |
| `quote.kis.stock_investor` | `kis.domestic_basic_quote.get_stock_current_price_investor(...)` |
| `quote.kis.etf_current` | `kis.domestic_basic_quote.get_etfetn_current_price(fid_input_iscd)` |
| `quote.kis.sector_index` | `kis.domestic_issue_other.get_sector_current_index(...)` |

### Quote — Kiwoom (4)
| RPC 메서드 | Python 호출 |
|---|---|
| `quote.kiwoom.stock_daily` | `kiwoom.chart.get_stock_daily(stk_cd, base_dt, upd_stkpc_tp)` |
| `quote.kiwoom.stock_minute` | `kiwoom.chart.get_stock_minute(stk_cd, tic_scope)` |
| `quote.kiwoom.stock_weekly` | `kiwoom.chart.get_stock_weekly(...)` |
| `quote.kiwoom.stock_monthly` | `kiwoom.chart.get_stock_monthly(...)` |

### Quote — KRX (2)
| RPC 메서드 | Python 호출 |
|---|---|
| `quote.krx.kospi` | `krx.stock.get_kospi(base_date)` |
| `quote.krx.kosdaq` | `krx.stock.get_kosdaq(base_date)` |

### TA (11)
모든 메서드 `requires_session=False`. numpy 배열 입출력.

| RPC 메서드 | cluefin-ta 함수 |
|---|---|
| `ta.sma` | `SMA(close, timeperiod)` |
| `ta.ema` | `EMA(close, timeperiod)` |
| `ta.rsi` | `RSI(close, timeperiod)` |
| `ta.macd` | `MACD(close, fast, slow, signal)` |
| `ta.bbands` | `BBANDS(close, timeperiod, nbdevup, nbdevdn)` |
| `ta.stoch` | `STOCH(high, low, close, fastk, slowk, slowd)` |
| `ta.adx` | `ADX(high, low, close, timeperiod)` |
| `ta.atr` | `ATR(high, low, close, timeperiod)` |
| `ta.obv` | `OBV(close, volume)` |
| `ta.mdd` | `MDD(returns)` → scalar |
| `ta.sharpe` | `SHARPE(returns, rf, periods)` → scalar |

### DART (4)
| RPC 메서드 | Python 호출 |
|---|---|
| `dart.disclosure_search` | `dart.public_disclosure.public_disclosure_search(...)` |
| `dart.company_overview` | `dart.public_disclosure.company_overview(corp_code)` |
| `dart.corp_code_lookup` | `dart.public_disclosure.corp_code()` → XML 파싱 |
| `dart.major_shareholder` | `dart.periodic_report_key_information.get_major_shareholder_status(...)` |

---

## 통신 프로토콜
- **전송**: NDJSON (한 줄 = 한 JSON 메시지, `\n` 구분)
- **stdout**: JSON-RPC 메시지 전용
- **stderr**: 로그/디버깅 (loguru → stderr)
- **요청/응답 매칭**: 숫자 `id`로 추적, 타임아웃 30초
- **RPC 메서드 명명**: `{category}.{broker?}.{action}`

## 에러 코드
| 코드 | 의미 |
|---|---|
| `-32700` | Parse error |
| `-32600` | Invalid Request |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |
| `-32001` | 인증 실패 |
| `-32002` | Rate limit |
| `-32003` | 브로커 API 오류 |
| `-32004` | 세션 미초기화 |

---

## 사용법

### Python RPC 서버 단독 테스트
```sh
cd cluefin
echo '{"jsonrpc":"2.0","id":1,"method":"rpc.ping"}' | uv run -m cluefin_rpc
```

### TS → Python 연동
```sh
cd cluefin-fsd/apps/dure
npm run start -- tools                                              # 사용 가능한 메서드 목록
npm run start -- call rpc.ping                                      # 핑
npm run start -- call session.initialize '{"broker":"kis"}'         # KIS 세션 초기화
npm run start -- call quote.kis.stock_current '{"stock_code":"005930"}'  # 삼성전자 현재가
npm run start -- quote 005930                                       # 위와 동일 (단축 커맨드)
```

### AI Agent 통합 예시
```typescript
const registry = new ToolRegistry(client);
await registry.discover();
const tools = registry.toAnthropicTools();  // Anthropic tool_use 형식

// LLM tool_use 응답 처리
const result = await registry.callTool("quote_kis_stock_current", { stock_code: "005930" });
```

---

## 향후 확장 가능 방향
- 해외주식 시세/계좌 조회 메서드 추가
- `ta.analyze` 복합 메서드 (시세 fetch + 멀티 지표 계산)
- 실시간 WebSocket 스트리밍 (현재는 요청-응답만)
- `dart.financial_statement` 재무제표 조회 메서드 구체화
