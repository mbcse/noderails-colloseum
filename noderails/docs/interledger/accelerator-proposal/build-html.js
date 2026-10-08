#!/usr/bin/env node
/**
 * Builds print-ready HTML from the accelerator proposal markdown.
 * Usage: node build-html.js
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const mdPath = path.join(dir, 'NodeRails-Open-Payments-Accelerator-Proposal.md');
const outPath = path.join(dir, 'NodeRails-Open-Payments-Accelerator-Proposal.html');

const md = fs.readFileSync(mdPath, 'utf8');

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function parseTable(lines) {
  const rows = lines.filter((l) => l.trim().startsWith('|'));
  if (rows.length < 2) return '';
  const parseRow = (row) =>
    row
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

  const header = parseRow(rows[0]);
  const bodyRows = rows.slice(2).map(parseRow);
  let html = '<table><thead><tr>';
  for (const h of header) html += `<th>${inlineFormat(h)}</th>`;
  html += '</tr></thead><tbody>';
  for (const row of bodyRows) {
    html += '<tr>';
    for (const cell of row) html += `<td>${inlineFormat(cell)}</td>`;
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function mdToHtml(source) {
  const lines = source.split('\n');
  const out = [];
  let i = 0;
  let inCode = false;
  let codeLang = '';
  let codeBuf = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCode) {
        closeLists();
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuf = [];
      } else {
        inCode = false;
        const body = codeBuf.join('\n');
        if (codeLang === 'mermaid') {
          out.push(`<div class="mermaid">${body}</div>`);
        } else {
          out.push(`<pre><code>${escapeHtml(body)}</code></pre>`);
        }
        codeLang = '';
        codeBuf = [];
      }
      i++;
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    if (line.trim().startsWith('|')) {
      closeLists();
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(parseTable(tableLines));
      continue;
    }

    if (line.startsWith('# ')) {
      closeLists();
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      closeLists();
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      closeLists();
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inUl) {
        closeLists();
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      if (!inOl) {
        closeLists();
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${inlineFormat(line.replace(/^\d+\.\s/, ''))}</li>`);
      i++;
      continue;
    }

    if (line.trim() === '---') {
      closeLists();
      out.push('<hr />');
      i++;
      continue;
    }

    if (line.trim() === '') {
      closeLists();
      i++;
      continue;
    }

    closeLists();
    out.push(`<p>${inlineFormat(line)}</p>`);
    i++;
  }

  closeLists();
  return out.join('\n');
}

const body = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NodeRails Open Payments Accelerator Proposal</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --ink: #18181b;
      --muted: #52525b;
      --accent: #4f46e5;
      --border: #e4e4e7;
      --bg: #ffffff;
      --soft: #fafafa;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: var(--ink);
      background: var(--bg);
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1.25rem;
      background: #18181b;
      color: #fff;
      font-size: 0.875rem;
    }

    .toolbar button {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 0.5rem 1rem;
      font-weight: 600;
      cursor: pointer;
    }

    .toolbar button:hover { background: #4338ca; }

    .doc {
      max-width: 820px;
      margin: 0 auto;
      padding: 2.5rem 2rem 4rem;
    }

    .cover {
      text-align: center;
      padding: 3rem 1rem 2.5rem;
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--border);
      page-break-after: always;
    }

    .cover .badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1rem;
    }

    .cover h1 {
      font-size: 2rem;
      line-height: 1.15;
      margin: 0 0 0.5rem;
      border: none;
      padding: 0;
    }

    .cover .subtitle {
      font-size: 1.125rem;
      color: var(--muted);
      margin-bottom: 1.5rem;
    }

    .cover .meta {
      font-size: 0.9rem;
      color: var(--muted);
    }

    .cover .meta a { color: var(--accent); }

    h1 {
      font-size: 1.65rem;
      margin: 2rem 0 1rem;
      padding-bottom: 0.35rem;
      border-bottom: 2px solid var(--accent);
      page-break-after: avoid;
    }

    h2 {
      font-size: 1.25rem;
      margin: 1.75rem 0 0.75rem;
      color: #27272a;
      page-break-after: avoid;
    }

    h3 {
      font-size: 1.05rem;
      margin: 1.25rem 0 0.5rem;
      page-break-after: avoid;
    }

    p { margin: 0.65rem 0; }

    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    ul, ol { margin: 0.5rem 0 0.75rem; padding-left: 1.35rem; }
    li { margin: 0.25rem 0; }

    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2rem 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0 1.25rem;
      font-size: 0.92rem;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 0.5rem 0.65rem;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: var(--soft);
      font-weight: 600;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.88em;
      background: #f4f4f5;
      padding: 0.1em 0.35em;
      border-radius: 4px;
    }

    pre {
      background: #18181b;
      color: #f4f4f5;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85rem;
      page-break-inside: avoid;
    }

    pre code { background: none; padding: 0; color: inherit; }

    .mermaid {
      margin: 1.25rem 0;
      padding: 1rem;
      background: var(--soft);
      border: 1px solid var(--border);
      border-radius: 8px;
      page-break-inside: avoid;
    }

    @media print {
      .toolbar { display: none !important; }
      .doc { max-width: none; padding: 0; }
      body { font-size: 10pt; }
      a { color: var(--ink); }
      h2 { page-break-before: auto; }
    }

    @page {
      margin: 18mm 16mm;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>NodeRails Open Payments Accelerator Proposal</span>
    <button type="button" onclick="window.print()">Save as PDF (Print)</button>
  </div>

  <div class="doc">
    <div class="cover">
      <div class="badge">Interledger Open Payments Accelerator</div>
      <h1>NodeRails Universal Settlement</h1>
      <p class="subtitle">Hybrid crypto commerce and Open Payments for merchants worldwide</p>
      <p class="meta">
        <strong>NodeRails</strong> · <a href="https://www.noderails.com">noderails.com</a><br />
        <strong>WallCard</strong> · <a href="https://wallcard.noderails.com">wallcard.noderails.com</a><br />
        hello@noderails.com
      </p>
    </div>

    ${body}
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true },
      sequence: { useMaxWidth: true }
    });
  </script>
</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log('Wrote', outPath);

const landingPublicPath = path.join(
  dir,
  '../../../apps/landing/public/openpayments-interledger/index.html',
);
fs.mkdirSync(path.dirname(landingPublicPath), { recursive: true });
fs.copyFileSync(outPath, landingPublicPath);
console.log('Synced to', landingPublicPath);
