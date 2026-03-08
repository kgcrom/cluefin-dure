# ClueFin DURE

AI Agent 기반 증권 분석·트레이딩 플랫폼

## About

ClueFin DURE는 cluefin-rpc를 통해 시세·분석·계좌 데이터를 조회하며 스스로 학습하고 발전하는 AI agent(dure)가 핵심인 모노레포 프로젝트입니다. broker(주문)와 trader(체결)가 실행을 담당하고, dure가 이를 제외한 모든 지능적 역할을 수행합니다.

**지원 증권사 / 데이터 소스**

- KIS (한국투자증권)
- Kiwoom (키움증권)
- DART (전자공시 API)

## Built With

- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/) (런타임)
- npm Workspaces (모노레포 관리)
- [pi-coding-agent](https://github.com/niclas3d/pi-coding-agent) (AI agent 프레임워크)
- [Hono](https://hono.dev/) (trader 웹 프레임워크)
- [Cloudflare Workers](https://workers.cloudflare.com/) (trader 배포)
- [@clack/prompts](https://github.com/bombshell-dev/clack) (인터랙티브 CLI 프롬프트)
- [Biome](https://biomejs.dev/) (lint & format)

## Project Structure

```
cluefin-dure/
├── apps/
│   ├── dure/            # AI agent — pi-coding-agent 확장 (@cluefin/dure)
│   ├── broker/          # 증권사 인증 및 주문 관리 CLI (@cluefin/broker)
│   └── trader/          # 트레이딩 API + 자동 매매 Cron — Cloudflare Workers (@cluefin/trader)
├── packages/
│   ├── cloudflare/      # Cloudflare 런타임 유틸리티 (@cluefin/cloudflare)
│   └── securities/      # 증권사 API 클라이언트 라이브러리 (@cluefin/securities)
├── package.json
└── tsconfig.json
```

| 워크스페이스 | 설명 |
|---|---|
| `@cluefin/dure` | AI agent — pi-coding-agent 확장, cluefin-rpc JSON-RPC client |
| `@cluefin/broker` | 증권사 인증 토큰 발급 및 주문 관리 CLI |
| `@cluefin/trader` | 트레이딩 API + 자동 매매 Cron (Hono + Cloudflare Workers) |
| `@cluefin/cloudflare` | Cloudflare 런타임 유틸리티 (Secrets Store 등) |
| `@cluefin/securities` | KIS/Kiwoom 증권사 API 클라이언트 라이브러리 |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS 이상

### Installation

```sh
git clone https://github.com/<username>/cluefin-dure.git
cd cluefin-dure
npm install
```

### Environment Variables

프로젝트 루트에 `.env` 파일을 생성하고 필요한 환경변수를 설정합니다.

| 변수 | 설명 | 값 |
|---|---|---|
| `KIS_ENV` | KIS 환경 설정 | `prod` \| `dev` |
| `KIS_APP_KEY` | KIS 앱 키 | 한국투자증권에서 발급 |
| `KIS_SECRET_KEY` | KIS 시크릿 키 | 한국투자증권에서 발급 |
| `KIS_ACCOUNT_NO` | KIS 계좌번호 (앞 8자리) | 한국투자증권 계좌 |
| `KIS_ACCOUNT_PRODUCT_CODE` | KIS 계좌 상품코드 (뒤 2자리) | 한국투자증권 계좌 |
| `KIWOOM_ENV` | Kiwoom 환경 설정 | `prod` \| `dev` |
| `KIWOOM_APP_KEY` | Kiwoom 앱 키 | 키움증권에서 발급 |
| `KIWOOM_SECRET_KEY` | Kiwoom 시크릿 키 | 키움증권에서 발급 |

## Usage

### Lint & Format

```sh
# 전체 검사 (lint + format)
npm run check

# 자동 수정
npm run check:fix

# lint만
npm run lint
npm run lint:fix

# format만
npm run format
npm run format:fix
```

앱별 상세 설정(D1, 로컬 개발, API 사용법 등)은 [apps/README.md](apps/README.md)를 참고하세요.

## Testing

```sh
# 전체 테스트
npm test

# securities 패키지 테스트
npm run test --workspace @cluefin/securities
```
