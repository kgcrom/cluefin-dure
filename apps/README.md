# Apps

ClueFin FSD 애플리케이션 모음.

## Broker

증권사 인증 토큰 발급 및 주문 관리 CLI. 루트 `.env` 파일의 환경변수를 읽어 토큰을 발급합니다.

```sh
cd apps/broker

# KIS (한국투자증권) 토큰 발급
bun run start kis

# Kiwoom (키움증권) 토큰 발급
bun run start kiwoom

# 주문 관리
bun run start order add                        # 주문 추가 (인터랙티브)
bun run start order list [--broker kis]        # 주문 목록 조회
bun run start order cancel <id>                # 주문 취소
```

`order add`는 인터랙티브 프롬프트로 종목코드, 기준가격, 수량, 증권사, 실행환경, 시장을 순서대로 입력받습니다.

## Trader

Hono + Cloudflare Workers 기반 트레이딩 API + 자동 매매 Cron 서비스.

### D1 데이터베이스 설정

Trader 앱은 Cloudflare D1을 사용하여 주문 데이터를 관리합니다.

```sh
# 0. apps/trader 이동
cd apps/trader

# 1. D1 데이터베이스 생성
npx wrangler d1 create cluefin-fsd-db

# 2. 출력된 database_id를 apps/trader/wrangler.jsonc에 입력
#    "database_id": "<생성된 database_id>"

# 3. 마이그레이션 실행 (리모트)
npx wrangler d1 migrations apply cluefin-fsd-db --remote

# 로컬 개발용 마이그레이션 실행
npx wrangler d1 migrations apply cluefin-fsd-db --local
```

마이그레이션 파일은 `apps/trader/migrations/` 디렉토리에 위치합니다.

새로운 마이그레이션을 추가하려면:

```sh
npx wrangler d1 migrations create cluefin-fsd-db <마이그레이션_이름>
```

### 로컬 개발

```sh
# 1. .dev.vars 파일 생성
cp apps/trader/.dev.vars.example apps/trader/.dev.vars

# 2. .dev.vars에 증권사 앱키 및 계좌 정보 입력
#    KIS_APP_KEY=<한국투자증권 앱키>
#    KIS_SECRET_KEY=<한국투자증권 시크릿키>
#    KIS_ACCOUNT_NO=<계좌번호 앞 8자리>
#    KIS_ACCOUNT_PRODUCT_CODE=<계좌 상품코드 뒤 2자리>
#    KIWOOM_APP_KEY=<키움증권 앱키>
#    KIWOOM_SECRET_KEY=<키움증권 시크릿키>

# 3. 토큰 발급 후 .dev.vars에 설정
cd ../broker && bun run start kis
bun run start kiwoom
#    BROKER_TOKEN_KIWOOM=<토큰>

# 4. 로컬 D1 마이그레이션 적용
npx wrangler d1 migrations apply cluefin-fsd-db --local

# 5. 로컬 서버 실행
cd apps/trader && bun run dev
```

### API curl 예시

로컬 서버(`http://localhost:8787`) 기준:

```sh
# KIS 인트라데이 차트
curl "http://localhost:8787/kis/intraday-chart?market_code=J&stock_code=005930&input_hour=0900"

# Kiwoom 외국인/기관 순위
curl "http://localhost:8787/kiwoom/rank?mrkt_tp=000&amt_qty_tp=1&qry_dt_tp=0&stex_tp=1"

# Kiwoom 거래량급증
curl "http://localhost:8787/kiwoom/volume-surge?mrkt_tp=000&sort_tp=1&tm_tp=1&trde_qty_tp=5&stk_cnd=0&pric_tp=0&stex_tp=1"
```

### Cron 자동 매매

Trader는 Cloudflare Workers Cron Triggers를 통해 자동 매매를 실행합니다.

| KST 시간 | 동작 | 간격 |
|-----------|------|------|
| 09:10~15:00 (평일) | `entry_orders` 기반 주문 실행 | 5분 |
| 16:00~17:59 (평일) | 체결 정보 갱신 | 5분 |

`broker CLI`의 `order add` 인터랙티브 프롬프트로 등록된 주문(`entry_orders`)을 cron이 읽어 증권사에 주문을 보내고, 실행 내역을 `trade_executions` 테이블에 기록합니다.

로컬에서 cron을 수동 트리거하려면:

```sh
cd apps/trader && bun run dev
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```
