---
name: dart
description: >
  DART(전자공시시스템) 데이터를 조회할 때 사용한다.
  공시 검색, 기업 개황, 법인코드 조회, 주요주주 현황 등을 포함한다.
  사업보고서/분기보고서의 재무 및 지배구조 정보를 확인할 수 있다.
---

# DART

## 실행 방법

    cd apps/dure && bun run start call <method> '<json_params>'

## 파라미터 규칙

- corp_code: 8자리 법인코드 (예: "00126380")
- 날짜: YYYYMMDD 형식
- bsns_year: 4자리 사업연도 (예: "2024")
- reprt_code: 보고서 코드 — "11013"(1분기), "11012"(반기), "11014"(3분기), "11011"(사업보고서)

## 메서드

### DART (4개)

| 메서드 | 설명 | 필수 파라미터 | 선택 파라미터 |
|---|---|---|---|
| `dart.disclosure_search` | 공시 검색 | | `corp_code`, `bgn_de`, `end_de`, `last_reprt_at`, `pblntf_ty`, `corp_cls`, `page_no`, `page_count` |
| `dart.company_overview` | 기업 개황 | `corp_code` | |
| `dart.corp_code_lookup` | 법인코드 목록 다운로드 | | |
| `dart.major_shareholder` | 주요주주 현황 | `corp_code`, `bsns_year`, `reprt_code` | |

## 사용 예시

```bash
# 삼성전자 공시 검색 (2024년)
bun run start call dart.disclosure_search '{"corp_code":"00126380","bgn_de":"20240101","end_de":"20241231"}'

# 삼성전자 기업 개황
bun run start call dart.company_overview '{"corp_code":"00126380"}'

# 삼성전자 주요주주 현황 (2024년 사업보고서)
bun run start call dart.major_shareholder '{"corp_code":"00126380","bsns_year":"2024","reprt_code":"11011"}'
```
