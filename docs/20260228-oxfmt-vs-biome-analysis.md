# Oxfmt vs Biome 기술 비교 분석

> 작성일: 2026-02-28
> 대상 프로젝트: cluefin-dure (npm workspace monorepo)

## Context

현재 프로젝트(`cluefin-dure`)는 Biome v2.3.13을 사용 중이며, formatter + linter를 단일 도구로 운영하고 있다. Oxfmt(Oxc Formatter)가 2025.12 Alpha → 2026.02.24 Beta로 빠르게 성숙하면서 대안으로서의 가능성을 평가한다.

---

## 1. 현재 프로젝트 Biome 사용 현황

- **설정**: `biome.json` (schema v2.2.2) — formatter + linter + import organize 통합
- **포맷터**: space indent 2, line width 100
- **린터**: recommended rules, `useLiteralKeys: off`
- **스크립트**: `npm run check` / `npm run check:fix` (lint + format 통합)
- **CI/Hook**: 미설정 (수동 실행)

---

## 2. 도구 비교

### 2-1. 성능

| 항목 | Oxfmt | Biome |
|------|-------|-------|
| vs Prettier | **30x+** 빠름 | **20x+** 빠름 |
| 직접 비교 | Biome 대비 **~3x** 빠름 (캐시 없는 초기 실행) | 기준 |

> 단, 이 프로젝트 규모(monorepo 5개 패키지)에서는 두 도구 모두 1초 이내 완료되므로 **체감 차이 없음**.

### 2-2. Prettier 호환성

| 항목 | Oxfmt | Biome |
|------|-------|-------|
| JS/TS 적합성 | **100%** (Beta 기준) | **~97%** |
| 의미 | Prettier→Oxfmt 전환 시 diff 거의 없음 | 일부 edge case에서 Prettier와 다른 출력 |

> Biome는 의도적으로 Prettier와 다른 포맷팅을 선택한 케이스가 있어 97%에 머물고 있다.

### 2-3. 언어 지원

| 언어/포맷 | Oxfmt | Biome |
|-----------|-------|-------|
| JS/TS/JSX/TSX | O | O |
| JSON/JSONC | O | O |
| JSON5/YAML/TOML | O | X |
| CSS/SCSS/Less | O | O (CSS는 안정, SCSS는 진행 중) |
| HTML/Vue/Angular | O | X (HTML 미지원) |
| Markdown/MDX | O | X |
| GraphQL | O | O |
| Embedded (CSS-in-JS) | O | 부분 |

> **Oxfmt의 언어 지원 범위가 압도적으로 넓다.** 단, 이 프로젝트는 TS/JSON만 사용하므로 실질적 차이는 크지 않다.

### 2-4. 기능 비교

| 기능 | Oxfmt | Biome |
|------|-------|-------|
| 코드 포맷팅 | O | O |
| **린팅** | **X (별도 oxlint 필요)** | **O (통합)** |
| Import 정렬 | O (내장, Beta) | O (내장, 안정) |
| Tailwind CSS 클래스 정렬 | O (내장) | X (별도 플러그인) |
| `--migrate biome` | O | - |
| `--migrate prettier` | O | O |
| `.editorconfig` 지원 | O | X |
| package.json 필드 정렬 | O (기본 활성) | X |
| Overrides (파일별 설정) | O | O |

### 2-5. 생태계 & 툴체인

| 항목 | Oxfmt + Oxlint | Biome |
|------|----------------|-------|
| 아키텍처 | **2개 도구 조합** (formatter + linter 분리) | **단일 도구** (all-in-one) |
| 설정 파일 | `.oxfmtrc.json` + `.oxlintrc.json` | `biome.json` 하나 |
| CLI 명령 | `oxfmt` + `oxlint` | `biome check` 하나 |
| 패키지 | `oxfmt` + `oxlint` | `@biomejs/biome` |
| 스폰서/후원 | VoidZero (Evan You) | 독립 오픈소스 |
| VS Code 확장 | O | O |
| 성숙도 | **Beta** (2026.02) | **Stable** (v2.3.x) |

---

## 3. 핵심 분석

### Oxfmt의 강점

1. **Prettier 100% 호환** — 팀 내 마이그레이션 비용이 거의 없다
2. **압도적 성능** — 대규모 모노레포에서 의미 있는 차이
3. **넓은 언어 지원** — Markdown, YAML, HTML, Vue 등 올인원 포맷팅
4. **Tailwind 내장** — 별도 플러그인 불필요
5. **VoidZero/Evan You 후원** — Vue, Vite 생태계와의 통합 가속 예상
6. **빠른 성장세** — Alpha→Beta 3개월, 주요 프로젝트(Vue core, Turborepo, Sentry) 이미 채택

### Oxfmt의 약점/리스크

1. **Beta 단계** — 프로덕션 안정성 미검증, import sorting 패닉 이슈 보고([#17788](https://github.com/oxc-project/oxc/issues/17788))
2. **린터 미포함** — `oxlint` 별도 설치/설정 필요, 설정 파일 2개 관리
3. **통합 `check` 명령 부재** — lint+format을 한 번에 돌리려면 스크립트 조합 필요
4. **Oxlint 자체도 성숙 과정** — type-aware linting은 2026년 7월 목표
5. **Breaking changes 가능성** — Beta→Stable 과정에서 설정/동작 변경 예상
6. **Biome의 `organizeImports` 수준의 안정적 import 정렬인지 미확인**

### Biome의 강점 (현재 유지의 이유)

1. **단일 도구** — format + lint + import organize가 `biome check` 하나로 동작
2. **Stable 릴리즈** — v2.3.x, 프로덕션 검증 완료
3. **설정 최소화** — `biome.json` 하나로 모든 것을 관리
4. **이 프로젝트에 이미 잘 동작** — 기존 워크플로우와 완벽 통합

### Biome의 약점

1. **Prettier 97% 호환** — 3% 차이가 팀 협업 시 friction 유발 가능 (이 프로젝트에서는 문제 아님)
2. **성능 열세** — Oxfmt 대비 ~3x 느림 (절대 속도는 충분히 빠름)
3. **언어 지원 제한** — HTML, Markdown, YAML 미지원

---

## 4. 이 프로젝트에 대한 판단

### 현실적 평가

| 평가 기준 | 판단 |
|-----------|------|
| 성능 필요성 | 소규모 모노레포, 두 도구 모두 즉시 완료 → **차이 없음** |
| 언어 커버리지 | TS/JSON만 사용 → **차이 없음** |
| 린터 필요성 | 현재 Biome lint 활발 사용 → Oxfmt 전환 시 **oxlint 추가 설정 필요** |
| 안정성 | Biome Stable vs Oxfmt Beta → **Biome 우위** |
| 관리 복잡도 | biome.json 1개 vs oxfmtrc + oxlintrc 2개 → **Biome 우위** |
| 마이그레이션 비용 | `--migrate biome` 제공되지만 lint 규칙 매핑은 수동 → **비용 발생** |

---

## 5. 결론 및 권장

### 현 시점 결론: **Biome 유지 권장**

이유:

1. **"포맷터만" 바꾸는 게 아니다** — 이 프로젝트는 Biome의 lint + format + import organize를 통합 사용 중. Oxfmt은 포맷터만 대체하므로 린터를 oxlint로 별도 세팅해야 하며, 이는 관리 포인트 증가.
2. **Beta 리스크** — import sorting 패닉 이슈 등 안정성 우려. 작은 팀/개인 프로젝트에서 도구 불안정은 생산성 직결.
3. **실질적 이득 없음** — 이 프로젝트 규모에서 3x 성능 차이는 체감 불가. Prettier 100% 호환도 Prettier를 안 쓰고 있으므로 의미 없음.
4. **All-in-one의 가치** — `biome check` 하나로 lint + format + import sort. 설정 파일 1개. 이 단순함은 과소평가할 수 없다.

### 전환을 재검토할 시점

아래 조건이 **모두** 충족되면 Oxfmt+Oxlint 전환을 다시 고려:

1. Oxfmt **Stable 1.0** 릴리즈
2. Oxlint **type-aware linting** 안정화
3. Oxfmt+Oxlint **통합 CLI 또는 단일 설정** 지원 (또는 프로젝트에서 lint를 별도로 관리해도 괜찮다고 판단)
4. 프로젝트가 HTML/Vue/Markdown 등 **Biome 미지원 언어를 포맷팅해야 하는 상황** 발생

### 대안: 점진적 도입

급하게 전면 교체하지 않되, 관심이 있다면:

- **Oxlint를 Biome lint와 병행** — Oxlint의 추가 규칙만 보조적으로 활용 (Biome가 커버 못 하는 규칙)
- Oxfmt Stable 이후 **포맷터만 교체** 테스트 — `--migrate biome`로 빠르게 시도 가능

---

## Sources

- [Oxfmt Beta 발표 (2026.02.24)](https://oxc.rs/blog/2026-02-24-oxfmt-beta)
- [Oxfmt Alpha 발표 (2025.12.01)](https://oxc.rs/blog/2025-12-01-oxfmt-alpha.html)
- [Oxfmt 설정 레퍼런스](https://oxc.rs/docs/guide/usage/formatter/config-file-reference)
- [Biome vs OXC 커뮤니티 토론](https://github.com/biomejs/biome/discussions/1281)
- [Evan You의 Oxfmt 성능 언급](https://x.com/youyuxi/status/1979839137323864073)
- [InfoQ: VoidZero Oxfmt Alpha 소개](https://www.infoq.com/news/2026/01/oxfmt-rust-prettier/)
- [Oxlint vs Biome 벤치마크](https://www.peterbe.com/plog/benchmarking-oxlint-vs-biome)
- [TypeScript 포맷팅/린팅 도구 비교](https://sph.sh/en/posts/compare-typescript-formatting-linting-tools/)
- [import sorting 패닉 이슈 #17788](https://github.com/oxc-project/oxc/issues/17788)
