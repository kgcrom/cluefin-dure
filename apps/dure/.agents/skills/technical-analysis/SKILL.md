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

    cd apps/dure && npm run start -- call <method> '<json_params>'

## 분석 프레임워크

종목의 기술적 분석을 수행할 때 다음 **4단계 절차**를 따른다.
각 단계의 결과를 종합하여 0-100 기술적 점수를 산출한다.

### Step 1: 데이터 수집

1. `chart.period`로 최근 **60~120 거래일** OHLCV 조회 (params: `stk_cd`, `period_div_code="D"`, `start_date`, `end_date`)
2. 응답에서 `close`, `high`, `low`, `volume` 배열을 날짜 오름차순으로 추출
3. 배열 길이가 지표의 timeperiod보다 충분한지 확인 (최소 2× timeperiod 권장)

### Step 2: 추세 판단 (가중치 30점)

**사용 지표**: `ta.sma`, `ta.ema`

1. SMA를 3개 기간으로 계산: `timeperiod=5` (단기), `20` (중기), `60` (장기)
2. 최신값 기준 이평선 배열 확인:
   - **정배열** (5 > 20 > 60): 강한 상승 추세 → **25~30점**
   - **역배열** (5 < 20 < 60): 강한 하락 추세 → **0~5점**
   - **혼조** (교차 중): 추세 전환 가능 → **10~20점**
3. 현재가와 SMA(20) 비교: 현재가 > SMA(20)이면 추세 우호적 (+5점 보너스, 최대 30점)

### Step 3: 모멘텀 판단 (가중치 30점)

**사용 지표**: `ta.rsi`, `ta.macd`, `ta.stoch`

세 지표를 모두 계산하고 종합한다:

1. **RSI** (`ta.rsi`, timeperiod=14):
   - < 30: 과매도 — 반등 가능성 높음 → **10점**
   - 30~50: 약세 모멘텀 → **5점**
   - 50~70: 강세 모멘텀 → **8점**
   - > 70: 과매수 — 조정 가능성 → **3점**

2. **MACD** (`ta.macd`, fast=12/slow=26/signal=9):
   - MACD > Signal (macdhist > 0): 상승 모멘텀 → **10점**
   - MACD < Signal (macdhist < 0): 하락 모멘텀 → **2점**
   - 히스토그램 증가 추세면 추가 **+3점**, 감소 추세면 +0점

3. **Stochastic** (`ta.stoch`, fastk=14/slowk=3/slowd=3):
   - %K > %D 이고 %K < 80: 상승 신호 → **10점**
   - %K < %D 이고 %K > 20: 하락 신호 → **2점**
   - %K < 20: 과매도 영역 → **7점** (반등 기대)
   - %K > 80: 과매수 영역 → **3점**

### Step 4: 변동성·거래량 판단 (가중치 40점)

**사용 지표**: `ta.bbands`, `ta.atr`, `ta.obv`

1. **Bollinger Bands** (`ta.bbands`, timeperiod=20, nbdev=2.0) — **15점 배분**:
   - BB Z-score 계산: `(현재가 - middleband) / (upperband - middleband) * 2 - 1`
   - Z < -1 (하단 이탈): 과매도 → **12~15점**
   - -1 ≤ Z ≤ 0 (하단~중간): 매수 우호 → **8~12점**
   - 0 < Z ≤ 1 (중간~상단): 중립~약한 매도 → **4~8점**
   - Z > 1 (상단 이탈): 과매수 → **0~4점**

2. **ATR** (`ta.atr`, timeperiod=14) — **5점 배분**:
   - ATR / 현재가 = 변동성 비율 계산
   - 변동성 비율 < 2%: 안정적 → **5점**
   - 2~4%: 보통 → **3점**
   - > 4%: 고변동 → **1점** (리스크 높음)

3. **OBV** (`ta.obv`) — **20점 배분**:
   - 최근 20일 OBV 추세 방향 확인 (OBV의 SMA(5) vs SMA(20)):
   - 가격↑ & OBV↑: 수급 확인된 상승 → **18~20점**
   - 가격↓ & OBV↑: 매집 가능 (긍정적 다이버전스) → **14~17점**
   - 가격↑ & OBV↓: 유통량 부족 (부정적 다이버전스) → **4~8점**
   - 가격↓ & OBV↓: 이탈 진행 → **0~3점**

### Step 5: 종합 점수 및 판단

각 단계의 점수를 합산한다 (최대 100점):

| 점수 구간 | 판단 | 설명 |
|-----------|------|------|
| 80~100 | 강한 매수 | 추세·모멘텀·수급 모두 우호적 |
| 60~79 | 매수/보유 | 대체로 긍정적, 일부 지표 주의 |
| 40~59 | 중립 | 방향성 불명확, 관망 권장 |
| 20~39 | 매도/관망 | 부정적 신호 우세 |
| 0~19 | 강한 매도 | 추세·모멘텀·수급 모두 부정적 |

**필수 — ADX 추세 강도 보정**:

`ta.adx` (timeperiod=14)로 추세 강도를 측정하고, 모멘텀 점수(Step 3)에 보정 계수를 적용한다:
- ADX > 25: 추세 확인됨 — 모멘텀 점수 **×1.0** (유지)
- ADX 20~25: 약한 추세 — 모멘텀 점수 **×0.8**
- ADX < 20: 횡보장 — 모멘텀 점수 **×0.5**

보정된 모멘텀 점수 = Step 3 원점수 × ADX 보정 계수 (소수점 반올림)

**추가 분석 (선택)**:
- `ta.mdd`: 최근 수익률 기반 최대낙폭. 리스크 판단 참고
- `ta.sharpe`: 최근 수익률 기반 위험조정수익률. 성과 평가 참고

### Step 6: 복합 신호 확인 (보너스/감점)

Step 1-5 합산 후 지표 간 상호작용을 확인한다 (최대 ±5점, 0~100점 한도):

**상승 확인 신호 (보너스, 최대 +5점)**:
- RSI 과매도(< 30) + OBV 상승 추세 → 매집 가능성 **+5**
- MACD 골든크로스 + SMA 정배열 동시 → 강한 상승 전환 **+5**
- BB 하단 터치 + 거래량 감소 후 반등 → 바닥 형성 가능 **+3**

**하락 경고 신호 (감점, 최대 -5점)**:
- RSI 과매수(> 70) + OBV 하락 추세 → 유통 없는 상승 **-5**
- MACD 데드크로스 + SMA 역배열 → 하락 전환 확인 **-5**
- BB 상단 이탈 + 거래량 급감 → 모멘텀 소실 **-3**

**다이버전스 (강도에 따라 ±3-5점)**:
- 가격 신고가 + RSI 하락 → 베어리시 다이버전스 **-5**
- 가격 신저가 + RSI 상승 → 불리시 다이버전스 **+5**

### 신호 평활 원칙

단일 시점 값이 아닌 최근 추이를 확인하여 노이즈를 제거한다:

1. **RSI**: 최근 5거래일 RSI 값의 방향성(상승/하락/횡보)을 확인한다. 단일 날의 과매수/과매도 판정은 추이와 함께 해석한다.
2. **MACD**: macdhist의 최근 5거래일 부호 변화를 확인한다. 골든/데드크로스 후 3일 이상 유지되어야 유효 신호로 판단한다.
3. **OBV**: OBV의 5일 이동평균 방향으로 수급 추세를 판단한다. 단일 날의 급변은 무시한다.

---

## 메서드 상세

### 이동평균 (2개)

#### `ta.sma` — 단순이동평균 (Simple Moving Average)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `close` | number[] | O | | 종가 배열 (날짜 오름차순) |
| `timeperiod` | number | | 14 | 이동평균 기간 |

**반환값**: `{ "sma": number[] }`
- 배열 길이 = `close 길이 - timeperiod + 1`
- 첫 번째 값 = close[0..timeperiod-1]의 산술평균
- 단위: 입력과 동일 (원)

#### `ta.ema` — 지수이동평균 (Exponential Moving Average)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `close` | number[] | O | | 종가 배열 |
| `timeperiod` | number | | 14 | EMA 기간 |

**반환값**: `{ "ema": number[] }`
- SMA보다 최근 가격에 더 높은 가중치 부여
- 승수 = 2 / (timeperiod + 1)
- 단위: 입력과 동일 (원)

### 모멘텀 (4개)

#### `ta.rsi` — 상대강도지수 (Relative Strength Index)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `close` | number[] | O | | 종가 배열 |
| `timeperiod` | number | | 14 | RSI 기간 |

**반환값**: `{ "rsi": number[] }`
- 범위: 0 ~ 100
- 해석: < 30 과매도, > 70 과매수, 50 기준으로 강세/약세 구분
- 최소 입력 길이: timeperiod + 1

#### `ta.macd` — 이동평균수렴확산 (MACD)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `close` | number[] | O | | 종가 배열 |
| `fastperiod` | number | | 12 | 빠른 EMA 기간 |
| `slowperiod` | number | | 26 | 느린 EMA 기간 |
| `signalperiod` | number | | 9 | 시그널 EMA 기간 |

**반환값**: `{ "macd": number[], "macdsignal": number[], "macdhist": number[] }`
- `macd`: MACD 라인 = EMA(fast) - EMA(slow). 단위: 원
- `macdsignal`: 시그널 라인 = MACD의 EMA(signal). 단위: 원
- `macdhist`: 히스토그램 = MACD - Signal. 양수→상승 모멘텀, 음수→하락 모멘텀
- 해석: MACD가 Signal 상향 돌파 = 매수 신호 (골든크로스), 하향 돌파 = 매도 신호 (데드크로스)

#### `ta.stoch` — 스토캐스틱 (Stochastic Oscillator)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `high` | number[] | O | | 고가 배열 |
| `low` | number[] | O | | 저가 배열 |
| `close` | number[] | O | | 종가 배열 |
| `fastk_period` | number | | 14 | Fast %K 기간 |
| `slowk_period` | number | | 3 | Slow %K 평활 기간 |
| `slowd_period` | number | | 3 | Slow %D 평활 기간 |

**반환값**: `{ "slowk": number[], "slowd": number[] }`
- `slowk`: %K 라인. 범위 0~100
- `slowd`: %D 라인 (%K의 이동평균). 범위 0~100
- 해석: %K > %D → 상승 신호, %K < %D → 하락 신호
- < 20 과매도, > 80 과매수

#### `ta.adx` — 평균방향지수 (Average Directional Index)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `high` | number[] | O | | 고가 배열 |
| `low` | number[] | O | | 저가 배열 |
| `close` | number[] | O | | 종가 배열 |
| `timeperiod` | number | | 14 | ADX 기간 |

**반환값**: `{ "adx": number[] }`
- 범위: 0 ~ 100 (방향 없음, 추세 강도만 측정)
- < 20: 추세 없음 (횡보), 20~40: 약한 추세, 40~60: 강한 추세, > 60: 매우 강한 추세
- 추세 방향은 알 수 없으므로 SMA/MACD와 함께 사용

### 변동성 (2개)

#### `ta.bbands` — 볼린저 밴드 (Bollinger Bands)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `close` | number[] | O | | 종가 배열 |
| `timeperiod` | number | | 20 | 중심선(SMA) 기간 |
| `nbdevup` | number | | 2.0 | 상단밴드 표준편차 배수 |
| `nbdevdn` | number | | 2.0 | 하단밴드 표준편차 배수 |

**반환값**: `{ "upperband": number[], "middleband": number[], "lowerband": number[] }`
- `upperband`: 상단밴드 = SMA + nbdevup × σ. 단위: 원
- `middleband`: 중심선 = SMA(timeperiod). 단위: 원
- `lowerband`: 하단밴드 = SMA - nbdevdn × σ. 단위: 원
- BB 폭이 좁으면 → 변동성 수축 (스퀴즈), 곧 큰 움직임 예상
- 가격이 상단 밖 → 과매수, 하단 밖 → 과매도

#### `ta.atr` — 평균진폭 (Average True Range)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `high` | number[] | O | | 고가 배열 |
| `low` | number[] | O | | 저가 배열 |
| `close` | number[] | O | | 종가 배열 |
| `timeperiod` | number | | 14 | ATR 기간 |

**반환값**: `{ "atr": number[] }`
- 단위: 원 (절대 변동폭)
- True Range = max(high-low, |high-prev_close|, |low-prev_close|)
- ATR = TR의 이동평균
- 변동성 비율 = ATR / 현재가 × 100 (%)로 정규화하여 종목 간 비교

### 거래량 (1개)

#### `ta.obv` — On Balance Volume

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `close` | number[] | O | | 종가 배열 |
| `volume` | number[] | O | | 거래량 배열 |

**반환값**: `{ "obv": number[] }`
- 단위: 주 (누적 거래량)
- 종가 상승일 → OBV += volume, 하락일 → OBV -= volume
- OBV 절대값보다 **추세 방향**이 중요
- 가격과 OBV 추세가 다르면 다이버전스 (추세 전환 신호)

### 포트폴리오 (2개)

#### `ta.mdd` — 최대낙폭 (Maximum Drawdown)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `returns` | number[] | O | | 일간 수익률 배열 (소수, 예: 0.01 = 1%) |

**반환값**: `{ "mdd": number }`
- 범위: -1.0 ~ 0 (음수, 예: -0.25 = 25% 낙폭)
- 고점 대비 최대 하락 폭. 리스크 측정 지표
- -0.1 이내: 안정적, -0.2~-0.3: 보통, -0.3 이상: 고위험

#### `ta.sharpe` — 샤프 비율 (Sharpe Ratio)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `returns` | number[] | O | | 일간 수익률 배열 (소수) |
| `risk_free_rate` | number | | 0.0 | 무위험 수익률 (연율) |
| `periods_per_year` | number | | 252 | 연간 거래일수 |

**반환값**: `{ "sharpe": number }`
- 연율화된 위험조정수익률 = (평균수익률 - 무위험수익률) / 수익률표준편차 × √periods
- > 1.0: 우수, > 2.0: 매우 우수, < 0: 무위험 대비 손실

---

## 사용 예시

```bash
# Step 1: 삼성전자 최근 120일 일봉 조회
npm run start -- call chart.period '{"stk_cd":"005930","period_div_code":"D","start_date":"20251001","end_date":"20260303"}'

# Step 2: 추세 — SMA(5), SMA(20), SMA(60)
npm run start -- call ta.sma '{"close":[...종가배열...],"timeperiod":5}'
npm run start -- call ta.sma '{"close":[...종가배열...],"timeperiod":20}'
npm run start -- call ta.sma '{"close":[...종가배열...],"timeperiod":60}'

# Step 3: 모멘텀 — RSI, MACD, Stochastic
npm run start -- call ta.rsi '{"close":[...종가배열...],"timeperiod":14}'
npm run start -- call ta.macd '{"close":[...종가배열...]}'
npm run start -- call ta.stoch '{"high":[...],"low":[...],"close":[...]}'

# Step 4: 변동성/거래량 — Bollinger, ATR, OBV
npm run start -- call ta.bbands '{"close":[...종가배열...],"timeperiod":20}'
npm run start -- call ta.atr '{"high":[...],"low":[...],"close":[...]}'
npm run start -- call ta.obv '{"close":[...종가배열...],"volume":[...거래량배열...]}'
```
