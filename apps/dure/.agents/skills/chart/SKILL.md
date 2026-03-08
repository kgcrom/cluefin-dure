---
name: chart
description: >
  OHLCV 차트 데이터 조회 (일/주/월/분봉/틱).
  기술적 분석의 입력 데이터로 사용하며, close 배열을 ta.* 함수에 전달한다.
  일봉, 주봉, 월봉, 분봉(1/3/5/10/30/60분), 틱 차트를 지원한다.
---

# Chart — 주가 차트 데이터

## 실행 방법

    cd apps/dure && npm run start -- call <method> '<json_params>'

---

## TA 연동 워크플로우

기술적 분석 시 반드시 이 순서를 따른다:

```
1. chart.period 호출 → close, high, low, volume 배열 추출 (날짜 오름차순)
2. ta.sma(close, 5), ta.sma(close, 20), ta.sma(close, 60) → 추세 파악
3. ta.rsi(close, 14) → 과매수/과매도
4. ta.macd(close) → 추세 전환 신호
5. ta.bbands(close) → 변동성 밴드
6. ta.obv(close, volume) → 수급 확인
→ technical-analysis skill의 100점 프레임워크로 종합
```

---

## 일봉 / 기간봉

### `chart.period` — 기간별 OHLCV ★ 기술적 분석 기본 데이터 소스

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 (6자리) |
| `period_div_code` | string | O | D=일봉, W=주봉, M=월봉, Y=연봉 |
| `start_date` | string | O | 시작일 (YYYYMMDD) |
| `end_date` | string | O | 종료일 (YYYYMMDD) |

**반환**: OHLCV 배열 (날짜 오름차순)
- `date`: YYYYMMDD
- `open`, `high`, `low`, `close`: 가격 (원)
- `volume`: 거래량 (주)
- `trading_value`: 거래대금 (원)

**권장 기간**:
- 기술적 분석 (120일): `start_date = 오늘 - 180일`, `period_div_code = "D"`
- 중기 추세 (1년): `period_div_code = "W"` 또는 1년치 일봉

---

### `chart.daily` — 당일 포함 일별 시세

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |

**반환**: 최근 거래일 포함 일별 OHLCV (당일 실시간 반영)

---

## 분봉

### `chart.minute` — 당일 분봉

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |
| `interval` | number | O | 분 단위: 1, 3, 5, 10, 30, 60 |

**반환**: 당일 분봉 OHLCV (장 시작부터 현재까지)

---

### `chart.daily_minute` — 여러 날 분봉

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |
| `interval` | number | O | 분 단위: 1, 3, 5, 10, 30, 60 |

**반환**: 최근 여러 거래일의 분봉 데이터

---

## 틱

### `chart.tick` — 틱 차트

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |
| `tick_scope` | number | O | 틱 단위: 1, 3, 5, 10, 30 |

---

### `chart.industry_tick` — 업종 틱

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |

---

## 투자자 / 기관 차트

### `chart.institutional` — 기관 매매 흐름 차트

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |

**반환**: 일별 기관 순매수/순매도 + 종가 (기관 매매와 주가 관계 분석)

---

### `chart.intraday_investor` — 당일 투자자 유형별 차트

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |

**반환**: 분 단위 투자자별(기관/외인/개인) 누적 순매수 흐름

---

## 사용 예시

```bash
# 삼성전자 최근 120일 일봉 (기술적 분석용)
npm run start -- call chart.period '{"stk_cd":"005930","period_div_code":"D","start_date":"20251001","end_date":"20260303"}'

# 5분봉 당일 데이터
npm run start -- call chart.minute '{"stk_cd":"005930","interval":5}'

# 주봉 1년치 (중기 추세)
npm run start -- call chart.period '{"stk_cd":"005930","period_div_code":"W","start_date":"20250101","end_date":"20260303"}'
```
