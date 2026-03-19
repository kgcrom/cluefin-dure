/** 공통 HTML 레이아웃 + CSS + 헬퍼 함수 */

export function wrapLayout(title: string, runId: string, bodyHtml: string): string {
  const timestamp = new Date().toISOString();
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} - ${esc(runId)}</title>
<style>
*,*::before,*::after{box-sizing:border-box}
body{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  line-height:1.6;color:#1a1a2e;background:#f8f9fa;margin:0;padding:0;
}
.container{max-width:960px;margin:0 auto;padding:24px 16px}
header{border-bottom:2px solid #e0e0e0;padding-bottom:16px;margin-bottom:32px}
header h1{margin:0 0 4px;font-size:1.8rem;color:#1a1a2e}
header .meta{color:#666;font-size:0.85rem}

.section{margin-bottom:32px}
.section h2{font-size:1.3rem;color:#2d3436;border-left:4px solid #0984e3;padding-left:12px;margin-bottom:16px}
.section h3{font-size:1.1rem;color:#636e72;margin-bottom:8px}

table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:0.9rem}
thead th{background:#dfe6e9;text-align:left;padding:10px 12px;font-weight:600;border-bottom:2px solid #b2bec3}
tbody td{padding:8px 12px;border-bottom:1px solid #e0e0e0}
tbody tr:nth-child(even){background:#f1f3f5}
tbody tr:hover{background:#e8f4fd}

.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;text-transform:uppercase}
.badge-positive,.badge-bullish,.badge-keep,.badge-up{background:#d4edda;color:#155724}
.badge-negative,.badge-bearish,.badge-reject,.badge-down{background:#f8d7da;color:#721c24}
.badge-neutral,.badge-mixed,.badge-revise{background:#fff3cd;color:#856404}
.badge-high{background:#cce5ff;color:#004085}
.badge-medium{background:#e2e3e5;color:#383d41}
.badge-low{background:#f5f5f5;color:#6c757d}

.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px}
.metric-card{background:#fff;border:1px solid #dee2e6;border-radius:8px;padding:16px;text-align:center}
.metric-card .label{font-size:0.8rem;color:#636e72;margin-bottom:4px}
.metric-card .value{font-size:1.4rem;font-weight:700;color:#2d3436}

ul.bullet-list{padding-left:20px;margin:8px 0}
ul.bullet-list li{margin-bottom:4px}

details{margin-bottom:16px}
details summary{cursor:pointer;font-weight:600;padding:8px 0;color:#0984e3}
details[open] summary{margin-bottom:8px}

.assessment-box{background:#fff;border:1px solid #dee2e6;border-radius:8px;padding:16px;margin-bottom:16px;white-space:pre-wrap}

@media print{
  body{background:#fff}
  .container{max-width:100%;padding:0}
  details{display:block!important}
  details>*{display:block!important}
}
</style>
</head>
<body>
<div class="container">
<header>
  <h1>${esc(title)}</h1>
  <div class="meta">Run ID: ${esc(runId)} &middot; ${esc(timestamp)}</div>
</header>
${bodyHtml}
</div>
</body>
</html>`;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function badge(text: string, variant?: string): string {
  const cls = variant ? `badge badge-${variant}` : 'badge';
  return `<span class="${cls}">${esc(text)}</span>`;
}

export function table(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const trs = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n');
  return `<table><thead><tr>${ths}</tr></thead><tbody>\n${trs}\n</tbody></table>`;
}

export function metricCards(items: { label: string; value: string }[]): string {
  const cards = items
    .map(
      (m) =>
        `<div class="metric-card"><div class="label">${esc(m.label)}</div><div class="value">${esc(m.value)}</div></div>`,
    )
    .join('\n');
  return `<div class="metric-grid">${cards}</div>`;
}

export function section(title: string, content: string): string {
  return `<div class="section"><h2>${esc(title)}</h2>${content}</div>`;
}

export function bulletList(items: string[]): string {
  if (items.length === 0) return '';
  const lis = items.map((i) => `<li>${esc(i)}</li>`).join('');
  return `<ul class="bullet-list">${lis}</ul>`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function detailsBlock(summary: string, content: string): string {
  return `<details><summary>${esc(summary)}</summary>${content}</details>`;
}
