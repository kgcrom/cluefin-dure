---
name: sector-market
description: >
  업종 지수 분석, 거시 지표(금리/휴장일), ETF NAV 및 괴리율, 테마 그룹 조회.
  섹터 로테이션 분석, ETF 차익 기회 발굴, 테마 편입 종목 확인에 사용한다.
---

# Sector & Market — 업종/거시/ETF/테마

## 실행 방법

    cd apps/dure && npm run start -- call <method> '<json_params>'

---

## 활용 시나리오

- **섹터 로테이션**: `sector.all_index` → 강세/약세 업종 파악 → `sector.stocks`로 종목 발굴
- **업종 수급 분석**: `sector.investor_net_buy` → 특정 업종 기관/외인 매수 동향
- **거시 환경 확인**: `market.interest_rate` → 금리 레벨 → 성장주 vs 가치주 판단
- **ETF 괴리율 기회**: `etf.current_price`에서 괴리율 > 0.3% → 차익 가능성
- **테마 편입 확인**: `theme.group` → `theme.group_stocks` 순서로 조회

---

## 업종 지수

### `sector.all_index` — 전체 업종 지수 일람 ★

파라미터 없음.

**반환**: 전체 업종의 현재 지수, 등락률, 거래대금
**활용**: 업종 로테이션 파악. 등락률 기준 정렬 → 강세/약세 업종 즉시 파악

---

### `sector.current_index` — 업종 현재가 지수

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |

**반환**: 현재 지수, 전일 대비, 등락률, 구성 종목 수

---

### `sector.daily` — 업종 일별 지수 이력

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |
| `start_date` | string | O | 시작일 (YYYYMMDD) |
| `end_date` | string | O | 종료일 (YYYYMMDD) |

---

### `sector.period` — 업종 기간 시세

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |
| `period_div_code` | string | O | D=일, W=주, M=월, Y=연 |

---

### `sector.time_minute` — 업종 분 단위 지수

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |

---

## 업종 구성 및 수급

### `sector.stocks` — 업종 구성 종목 목록

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |

**반환**: 업종 구성 종목 목록 + 각 종목의 현재가, 등락률, 시총 비중

---

### `sector.investor_net_buy` — 업종별 투자자 순매수

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |
| `date` | string | | 기준일 (YYYYMMDD) |

**반환**: 기관, 외국인, 개인별 업종 순매수 금액

---

### `sector.program` — 업종 프로그램 매매

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `industry_cd` | string | O | 업종코드 |

---

## 시장 거시 지표

### `market.interest_rate` — 금리 요약

파라미터 없음.

**반환**: 국채(1Y/3Y/5Y/10Y), CD(91일), CP, KORIBOR 금리
**해석**:
- 단기/장기 금리차(스프레드) 확대 → 경기 회복 기대
- 금리 급등 → 성장주 밸류에이션 압박, 가치주 상대적 유리
- 금리 하락 → 리츠, 배당주, 성장주 우호

---

### `market.announcement` — 시장 뉴스/공지

시장 관련 공지 및 주요 뉴스 제목.

---

### `market.holiday` — 휴장일 조회

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `year` | number | O | 연도 (예: 2026) |

**반환**: 해당 연도의 증권시장 휴장일 목록

---

## ETF

### `etf.current_price` — ETF 현재가 + NAV + 괴리율 ★

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | ETF 종목코드 |

**반환 주요 필드**: 현재가, NAV, 괴리율(%), 추적오차
**해석**:
- 괴리율 > +0.3%: ETF가 NAV보다 고평가 → 매도 or 차익 기회
- 괴리율 < -0.3%: ETF가 NAV보다 저평가 → 매수 기회
- 괴리율 ±0.1% 내: 정상 범위

---

### `etf.component_stocks` — ETF 구성 종목 + 비중

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | ETF 종목코드 |

**반환**: 구성 종목명, 비중(%), 수량

---

### `etf.nav_trend` — ETF NAV 비교 추이

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | ETF 종목코드 |

**반환**: 일별 NAV vs 시장가 비교 추이

---

### `etf.daily` — ETF 일별 NAV 비교

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | ETF 종목코드 |

---

### `etf.hourly` — ETF 시간별 NAV 비교

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | ETF 종목코드 |

---

## 테마

### `theme.group` — 테마 그룹 목록

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `date` | string | | 기준일 (YYYYMMDD, 기본: 최근 거래일) |

**반환**: 테마명, 테마코드, 소속 종목 수, 테마 등락률

---

### `theme.group_stocks` — 테마 구성 종목

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `theme_code` | string | O | 테마코드 |

**반환**: 테마 소속 종목 목록 + 각 종목 현재가, 등락률

---

## 사용 예시

```bash
# 전체 업종 지수 현황
npm run start -- call sector.all_index '{}'

# 반도체 업종 구성 종목
npm run start -- call sector.stocks '{"industry_cd":"IT"}'

# 금리 현황
npm run start -- call market.interest_rate '{}'

# KODEX 200 ETF 괴리율 확인
npm run start -- call etf.current_price '{"stk_cd":"069500"}'

# 테마 그룹 목록 (최근 거래일)
npm run start -- call theme.group '{}'

# AI/반도체 테마 구성 종목
npm run start -- call theme.group_stocks '{"theme_code":"테마코드"}'
```
