# AGENTS.md

한국 주식시장 데이터 조회 & 분석 에이전트.

## 실행

```sh
cd apps/dure && npm run start
```

## 도구 체계

에이전트는 3단계 Meta Tool 패턴으로 RPC 메서드에 접근한다:

1. `list_tool_categories` — 사용 가능한 카테고리 목록 조회
2. `load_category_tools` — 특정 카테고리의 도구를 동적 로딩 (서버에서 카테고리별 메서드 조회)
3. 개별 도구 호출 — 로딩된 메서드를 직접 호출

`call_rpc_method`는 도구를 로딩하지 않고 메서드를 직접 호출하는 폴백 도구이다.

## 카테고리 (15개)

| Category | Description |
|---|---|
| stock | 종목 현재가, 호가, 체결, 시세 조회 |
| chart | OHLCV 차트 데이터 (일봉, 주봉, 월봉, 분봉) |
| ta | 기술적 분석 지표 (이동평균, RSI, MACD, 볼린저밴드 등) |
| financial | 재무제표, 수익성, 안정성 지표 |
| ranking | 거래량, 등락률, 시가총액 등 순위 조회 |
| analysis | 종목 분석, 투자 의견, 목표가 |
| sector | 업종별 시세, 업종 분류 |
| market | 시장 전체 지표, 투자자별 매매동향 |
| etf | ETF 시세, 구성종목, 괴리율 |
| program | 프로그램 매매 동향 |
| schedule | 경제 일정, IPO, 배당 |
| dart | DART 전자공시 조회 |
| theme | 테마별 종목 분류, 테마 시세 |
| session | 증권사 세션 초기화/관리 (시스템용) |
| rpc | RPC 서버 메타 정보 (시스템용) |

## 메서드 명명 규칙

```
{category}.{action}
```

예: `stock.current_price`, `ta.sma`, `chart.daily_ohlcv`, `dart.disclosure_list`

## 규칙

1. 주가 데이터는 반드시 도구로 조회한다. 추측하지 않는다.
2. `stock_code`: 6자리 숫자 문자열 (예: `"005930"`)
3. 날짜: KST 기준, `YYYYMMDD` 형식
4. 기술적 분석: 시세 조회 → close 배열 추출 → `ta.*` 호출
5. 세션 초기화는 도구 실행 시 자동 처리된다.

## Skills

`.agents/skills/` 하위 8개 도메인별 스킬:

- **stock** — 종목 기본 조회 및 시세 분석
- **chart** — 차트 데이터 조회 및 시각화
- **financial** — 재무제표 분석
- **ranking-analysis** — 순위 기반 종목 탐색
- **sector-market** — 업종/시장 분석
- **dart** — 공시 정보 조회
- **technical-analysis** — 기술적 지표 분석
- **peer-comparison** — 동종업계 비교 분석
