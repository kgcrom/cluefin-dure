---
name: dart
description: >
  DART(전자공시시스템) 공시 검색 및 기업 개황 조회.
  공시 검색, 기업 기본정보, 법인코드 조회, 대주주 현황 등을 제공한다.
  세션 초기화가 필요 없으며, 종목코드 또는 법인등록번호로 조회한다.
---

# DART — 전자공시시스템

## 실행 방법

    cd apps/dure && npm run start -- call <method> '<json_params>'

---

## 메서드 상세

### `dart.company_overview` — 기업 개황

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 (6자리) |

**반환 주요 필드**:
- 회사명, 영문명, 대표이사, 법인등록번호
- 업종코드, 주요사업, 결산월
- 홈페이지 URL, 지역
- 상장일, 상장시장

---

### `dart.disclosure_search` — 공시 검색

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | | 종목코드 (특정 기업 공시) |
| `start_date` | string | | 시작일 (YYYYMMDD) |
| `end_date` | string | | 종료일 (YYYYMMDD) |
| `report_type` | string | | 공시 유형 (A=정기공시, B=주요사항, C=발행공시 등) |

**반환**: 공시 목록 (접수번호, 공시명, 접수일시, 제출인명)
**활용**:
- 특정 기업 최근 공시 확인: `stk_cd` + `start_date`/`end_date`
- 전체 시장 정기공시 검색: `report_type="A"` + 기간 지정

---

### `dart.corp_code_lookup` — 법인코드 조회

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 (6자리) |

**반환**: DART 고유 법인코드 (corp_code), 법인명, 종목코드, 수정일
**활용**: 다른 DART API 호출 시 필요한 corp_code를 종목코드로부터 조회

---

### `dart.major_shareholder` — 대주주 현황

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `stk_cd` | string | O | 종목코드 |

**반환**: 5% 이상 보유 주주 목록 (주주명, 보유 주식수, 보유 비율, 보고 기준일)
**활용**: 최대주주 변경, 지분 매입/매도 이력 파악

---

## 사용 예시

```bash
# 삼성전자 기업 개황
npm run start -- call dart.company_overview '{"stk_cd":"005930"}'

# 삼성전자 최근 1개월 공시 검색
npm run start -- call dart.disclosure_search '{"stk_cd":"005930","start_date":"20260201","end_date":"20260303"}'

# 삼성전자 법인코드 조회
npm run start -- call dart.corp_code_lookup '{"stk_cd":"005930"}'

# 삼성전자 대주주 현황
npm run start -- call dart.major_shareholder '{"stk_cd":"005930"}'
```
