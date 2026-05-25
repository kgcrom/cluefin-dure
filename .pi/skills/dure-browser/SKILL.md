---
name: dure-browser
description: Use Dure browser tools for Naver stock news and concise browser-backed evidence checks.
---

# Dure Browser

Use this skill when a user asks Dure to verify investment news with a browser, inspect Naver stock news topics, or capture concise page evidence.

## News Source

Use `browser_news_search` for Naver stock news at `https://stock.naver.com/news`.
When a six digit Korean stock ticker is available for company-specific research, the tool uses the stock-scoped page `https://stock.naver.com/domestic/stock/{ticker}/news` first.
When an overseas ticker such as `AAPL` is available, the tool uses the stock-scoped world news page `https://stock.naver.com/worldstock/stock/{code}.O/worldnews` first.

Supported topics:

- `flashnews`: 실시간 속보
- `mainnews`: 주요뉴스
- `ranknews`: 많이 본 뉴스
- `worldnews`: 해외뉴스
- `market-outlook`: 시황·전망
- `company-analysis`: 기업·종목분석
- `global-market`: 해외증시
- `bond-futures`: 채권·선물
- `disclosure-memo`: 공시·메모
- `exchange-rate`: 환율
- `marketNotice`: 공시정보
- `all`: 빠른 기본 묶음

Use `query`, `ticker`, or `companyName` to filter extracted article metadata. Treat those fields as filters over Naver page results, not as a separate web search engine. On stock-scoped domestic or worldstock news pages, the ticker path already scopes the company, so use `query` only for additional filtering.

Use `browser_capture_evidence` for concise page metadata checks that should be stored as evidence.

## Boundaries

- Use `browser_news_search` for Naver stock news.
- Keep tool responses concise: return titles, URLs, publishers, timestamps, topics, and artifact paths rather than full article bodies.
