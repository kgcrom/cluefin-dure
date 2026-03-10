# ClueFin DURE

AI Agent 기반 증권 분석·트레이딩 플랫폼

## About

ClueFin DURE는 AI agent(dure)가 cluefin-rpc를 통해 시세·분석·공시 데이터를 조회하며, broker(주문)와 trader(체결)가 실행을 담당하는 모노레포 프로젝트입니다.

**지원 증권사 / 데이터 소스**: KIS (한국투자증권), Kiwoom (키움증권), DART (전자공시 API)

## Built With

TypeScript, Node.js, npm Workspaces, [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent), [Hono](https://hono.dev/), [Cloudflare Workers](https://workers.cloudflare.com/), [Biome](https://biomejs.dev/)

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

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS 이상

### Installation

```sh
git clone https://github.com/kgcrom/cluefin-dure.git
cd cluefin-dure
npm install
```

### Environment Variables

프로젝트 루트에 `.env` 파일을 생성하고 필요한 환경변수를 설정합니다.

| 변수 | 설명 |
|---|---|
| `KIS_ENV` | KIS 환경 설정 (`prod` \| `dev`) |
| `KIS_APP_KEY` | KIS 앱 키 |
| `KIS_SECRET_KEY` | KIS 시크릿 키 |
| `KIS_ACCOUNT_NO` | KIS 계좌번호 (앞 8자리) |
| `KIS_ACCOUNT_PRODUCT_CODE` | KIS 계좌 상품코드 (뒤 2자리) |
| `KIWOOM_ENV` | Kiwoom 환경 설정 (`prod` \| `dev`) |
| `KIWOOM_APP_KEY` | Kiwoom 앱 키 |
| `KIWOOM_SECRET_KEY` | Kiwoom 시크릿 키 |

## Usage

```sh
npm install              # 의존성 설치
npm test                 # 전체 테스트
npm run check            # lint + format 검사
npm run check:fix        # 자동 수정
```

앱별 상세 설정(D1, 로컬 개발, API 사용법 등)은 [apps/README.md](apps/README.md)를 참고하세요.
