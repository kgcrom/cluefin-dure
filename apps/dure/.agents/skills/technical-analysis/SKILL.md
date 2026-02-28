---
name: technical-analysis
description: >
  기술적 분석(Technical Analysis)을 수행할 때 사용한다.
  이동평균(SMA, EMA), 모멘텀(RSI, MACD, Stochastic, ADX),
  변동성(Bollinger Bands, ATR), 거래량(OBV),
  포트폴리오 지표(MDD, Sharpe Ratio) 등을 계산한다.
  세션 초기화가 필요 없으며, 시세 데이터의 close 배열을 입력으로 사용한다.
---

# Technical Analysis

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- close: 종가 배열 (필수, 대부분의 지표)
- high, low: 고가/저가 배열 (stoch, adx, atr에 필요)
- volume: 거래량 배열 (obv에 필요)
- returns: 수익률 배열 (mdd, sharpe에 필요)
- timeperiod: 기간 (기본값 14)

## 워크플로우

기술적 분석을 수행하려면:

1. 시세 조회: `kis.basic_quote.stock_daily` 또는 `kiwoom.chart.stock_daily`로 OHLCV 데이터 조회
2. 배열 추출: 응답에서 `close`, `high`, `low`, `volume` 배열 추출
3. 지표 계산: `ta.*` 메서드 호출

## 메서드

### 이동평균 (2개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `ta.sma` | 단순이동평균 (SMA) | `close` | `timeperiod` (기본 14) |
| `ta.ema` | 지수이동평균 (EMA) | `close` | `timeperiod` (기본 14) |

### 모멘텀 (4개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `ta.rsi` | 상대강도지수 (RSI) | `close` | `timeperiod` (기본 14) |
| `ta.macd` | MACD | `close` | `fastperiod` (12), `slowperiod` (26), `signalperiod` (9) |
| `ta.stoch` | 스토캐스틱 | `high`, `low`, `close` | `fastk_period` (14), `slowk_period` (3), `slowd_period` (3) |
| `ta.adx` | 평균방향지수 (ADX) | `high`, `low`, `close` | `timeperiod` (기본 14) |

### 변동성 (2개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `ta.bbands` | 볼린저 밴드 | `close` | `timeperiod` (20), `nbdevup` (2.0), `nbdevdn` (2.0) |
| `ta.atr` | 평균진폭 (ATR) | `high`, `low`, `close` | `timeperiod` (기본 14) |

### 거래량 (1개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `ta.obv` | OBV (On Balance Volume) | `close`, `volume` | |

### 포트폴리오 (2개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `ta.mdd` | 최대낙폭 (MDD) | `returns` | |
| `ta.sharpe` | 샤프 비율 | `returns` | `risk_free_rate` (0.0), `periods_per_year` (252) |

## 사용 예시

```bash
# SMA 계산
bun run start call ta.sma '{"close":[100,200,300,400,500],"timeperiod":3}'

# RSI 계산
bun run start call ta.rsi '{"close":[44,44.34,44.09,43.61,44.33,44.83,45.10,45.42,45.84]}'

# MACD 계산
bun run start call ta.macd '{"close":[26,26.5,27,26.8,27.2,27.5,28,27.8,28.2,28.5,29,28.8,29.2]}'
```
