#!/usr/bin/env node
// Builds documents/html from documents/md with zero dependencies.
// Run: npm run docs   (after `npm run proof` and `npm run audit`). Scenario terminals and charts are produced by running the real CLI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {esc, icon, flow, decision, bars, terminal} from './site/diagrams.mjs';
import {logo, FAVICON, layers, trust, memchart, ladder, coldwarm} from './site/figures.mjs';
import {profileHost} from '../packages/core/hardware.mjs';
import {VERSION} from '../packages/core/version.mjs';

const HERE = import.meta.dirname, PROJECT = path.resolve(HERE, '..'), MD = path.join(HERE, 'md'), OUT = path.join(HERE, 'html');
const SITE = 'https://shahvatsalofficial.github.io/localsutra-ai/', REPO = 'https://github.com/shahvatsalofficial/localsutra-ai';
const readJ = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const env = readJ(path.join(PROJECT, 'docs/proof/environment.json')), fuzz = readJ(path.join(PROJECT, 'docs/proof/fuzz-results.json'));
const auditSample = readJ(path.join(PROJECT, 'docs/proof/audit-sample/audit-report.json'));
const sum = (o, suffix) => Object.entries(o).filter(([k]) => k.endsWith(suffix)).reduce((a, [, v]) => a + v, 0);
const V = {VERSION, TESTS: env.tests, PASS: env.pass, FAIL: env.fail, SKIPPED: env.skipped, NODE: env.node, PLATFORM: env.platform, RECORDED: env.recordedAt, DATE: env.recordedAt.slice(0, 10), FUZZ: sum(fuzz, 'Cases'), CRASHED: sum(fuzz, 'Unexpected'), CHECKS: auditSample.assurance.total, CHECKSPASS: auditSample.assurance.passed, VERDICT: auditSample.verdict};
const sub = t => t.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in V ? String(V[k]) : m));
const slug = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- real CLI runs for the scenarios ----------
const CLI = path.join(PROJECT, 'packages/cli/index.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-docs-'));
const cli = (...a) => new Promise(res => { const p = spawn(process.execPath, [CLI, ...a], {cwd: PROJECT}); let out = '', err = ''; p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (err += d)); p.on('close', code => res({code, out, err})); });
const cmd = a => { const p = a.split(' --'); return p.map((x, i) => (i ? '    --' : '$ localsutra ') + x + (i < p.length - 1 ? ' \\' : '')); };
const mdTable = md => md.split('\n').filter(l => l.startsWith('|')).map(l => l.replace(/^\|\s*|\s*\|$/g, '').split('|').map(c => c.trim()));
const pad = (rows, widths) => rows.map(r => r.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd());

const sys = (cpus, totalGB, freeGB) => ({platform: () => 'linux', arch: () => 'x64', totalmem: () => totalGB * 1e9, freemem: () => freeGB * 1e9, cpus: () => Array.from({length: cpus}, () => ({model: 'Example CPU'})), release: () => '6.8.0'});
const writeJ = (name, obj) => { const f = path.join(tmp, name); fs.writeFileSync(f, JSON.stringify(obj)); return f; };
const laptop = writeJ('laptop.json', profileHost({system: sys(8, 16, 8), commands: () => false, disk: () => ({freeBytes: 200e9})}));
const gamer = writeJ('gamer.json', profileHost({system: sys(16, 32, 22), commands: n => n === 'nvidia-smi', exec: () => 'NVIDIA GeForce RTX 3060, 12288, 551.23', disk: () => ({freeBytes: 500e9})}));
const catalog = writeJ('catalog.json', {models: [
  {id: 'tiny-1B-Q4', parametersB: 1, bitsPerWeight: 4, contextTokens: 4096},
  {id: 'small-3B-Q4', parametersB: 3, bitsPerWeight: 4, contextTokens: 4096},
  {id: 'mid-7B-Q4', parametersB: 7, bitsPerWeight: 4, contextTokens: 4096, kvBytesPerToken: 131072},
  {id: 'mid-7B-Q8', parametersB: 7, bitsPerWeight: 8, contextTokens: 4096, kvBytesPerToken: 131072},
  {id: 'large-13B-Q4', parametersB: 13, bitsPerWeight: 4, contextTokens: 4096, kvBytesPerToken: 204800},
  {id: 'xl-70B-Q4', parametersB: 70, bitsPerWeight: 4, contextTokens: 4096}]});
const SCN = {};

// S1: laptop fit (md for the terminal, json for the chart)
const f1m = await cli('fit', '--catalog', catalog, '--profile', laptop, '--format', 'md');
const f1j = JSON.parse((await cli('fit', '--catalog', catalog, '--profile', laptop)).out);
{
  const t = mdTable(f1m.out).filter((r, i) => i !== 1 && r.length >= 7).map(r => [r[0], r[3], r[4], r[6]]);
  SCN.s1 = [...cmd('fit --catalog catalog.json --profile laptop-16gb.json --format md'), '', ...pad(t, [14, 11, 12, 24])];
}
const memModels = f1j.results.map(r => ({id: r.model.id, paramsB: r.model.parametersB, bits: r.model.bitsPerWeight, weights: r.estimate.weightsGB, overhead: r.estimate.overheadGB, kv: r.estimate.kvCacheGB, required: r.estimate.estimatedRequiredGB, fits: r.estimate.fitCategory === 'possibly_fits'}));
const FREE1 = f1j.results[0].hardware.freeRamGB;
const MEM1 = memchart(memModels, FREE1, 'Which models fit a laptop with 16 GB RAM and 8 GB free?');

// S2: GPU desktop
const f2m = await cli('fit', '--catalog', catalog, '--profile', gamer, '--format', 'md');
{
  const t = mdTable(f2m.out).filter((r, i) => i !== 1 && r.length >= 8).map(r => [r[0], r[4], r[6], r[7]]);
  SCN.s2 = [...cmd('fit --catalog catalog.json --profile gaming-pc.json --format md'), '', ...pad(t, [14, 12, 24, 24])];
}
// S3: Ollama not running
const p3 = await cli('probe', '--runtime', 'ollama', '--endpoint', 'http://127.0.0.1:1/', '--timeout', '500');
{ const j = JSON.parse(p3.out); SCN.s3 = [...cmd('probe --runtime ollama --endpoint http://127.0.0.1:1/'), `status:       ${j.status}`, `failureCode:  ${j.failureCode}`, `scope:        ${j.networkScope}`, `exit code:    ${p3.code}`]; }
// S4: remote endpoints refused
const p4a = await cli('probe', '--runtime', 'ollama', '--endpoint', 'https://api.example.com/');
const p4b = await cli('probe', '--runtime', 'ollama', '--endpoint', 'http://localhost:11434/');
const p4c = await cli('probe', '--runtime', 'ollama', '--endpoint', 'http://user:pw@127.0.0.1:11434/');
SCN.s4 = [...cmd('probe --runtime ollama --endpoint https://api.example.com/'), p4a.err.trim(), `exit code: ${p4a.code}`, '', ...cmd('probe --runtime ollama --endpoint http://localhost:11434/'), p4b.err.trim(), `exit code: ${p4b.code}`, '', ...cmd('probe --runtime ollama --endpoint http://user:pw@127.0.0.1:11434/'), p4c.err.trim(), `exit code: ${p4c.code}`];
// S5: timing against a mock Ollama on loopback
let calls = 0;
const mock = http.createServer((req, res) => {
  if (req.method === 'POST') { let b = ''; req.on('data', d => (b += d)); req.on('end', () => { const delay = calls++ === 0 ? 420 : 110; setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({done: true, response: 'PRIVATE-OUTPUT', eval_count: 32, eval_duration: delay * 0.6e6 * 1})); }, delay); }); } else { res.end('{"models":[]}'); }
});
await new Promise(ok => mock.listen(0, '127.0.0.1', ok));
const mockUrl = `http://127.0.0.1:${mock.address().port}/`;
const i5 = await cli('infer', '--model', 'demo-model:3b', '--runs', '4', '--prompt', 'PRIVATE-PROMPT', '--endpoint', mockUrl);
mock.close();
const inf = JSON.parse(i5.out);
SCN.s5 = [...cmd('infer --model demo-model:3b --runs 4 --endpoint http://127.0.0.1:PORT/'), `runtime / model:  ${inf.runtime} / ${inf.model}`, `prompt sha256:    ${inf.promptHash.slice(0, 16)}...   (text is never stored)`, '', ...pad([['run', 'phase', 'wall time', 'runtime tok/s'], ...inf.samples.map(s => [s.run, s.phase, s.wallMs.toFixed(0) + ' ms', s.reportedTokensPerSecond == null ? 'not reported' : s.reportedTokensPerSecond.toFixed(1)])], [5, 14, 11, 14]), '', `prompt/output text in report: ${JSON.stringify(inf).includes('PRIVATE') ? 'YES (bug)' : 'none'}`];
const CW = coldwarm(inf.samples, 'First run includes model load (cold); later runs are warm. Measured through a mock loopback server while building this page.');
// S6: tamper detection
const bOut = path.join(tmp, 'bench');
await cli('benchmark', '--runs', '3', '--iterations', '5000', '--out', bOut);
const v1 = await cli('verify', '--report', bOut + '.json');
const bj = readJ(bOut + '.json'); bj.statistics.wallMs.median = 0.001; fs.writeFileSync(path.join(tmp, 'edited.json'), JSON.stringify(bj));
const v2 = await cli('verify', '--report', path.join(tmp, 'edited.json'));
SCN.s6 = ['$ localsutra benchmark --runs 3 --out bench', '$ localsutra verify --report bench.json', `verified: ${JSON.parse(v1.out).verified}   (exit ${v1.code})`, '', '# someone edits the median to look faster', '$ localsutra verify --report edited.json', `verified: ${JSON.parse(v2.out).verified}   (exit ${v2.code})`, JSON.parse(v2.out).note];
// S8: skills dry run
const dry = path.join(tmp, 'proj'); fs.mkdirSync(dry);
const d8 = JSON.parse((await cli('install-skills', '--project', dry, '--ide', 'claude', '--dry-run')).out);
SCN.s8 = [...cmd('install-skills --project . --ide claude --dry-run'), `ide: ${d8.ide}   dryRun: ${d8.dryRun}   planned: ${d8.planned}   written: ${d8.written}`, ...d8.files.slice(0, 4), `... ${d8.planned - 4} more`, `hostActivation: ${d8.hostActivation}`];
// S9: privacy
const pv = JSON.parse((await cli('privacy', '--endpoint', 'http://127.0.0.1:11434/')).out);
SCN.s9 = [...cmd('privacy --endpoint http://127.0.0.1:11434/'), `endpointAllowed: ${pv.endpointAllowed}`, ...Object.entries(pv.claims).map(([k, v]) => `${k}: ${v}`)];
SCN.hero = SCN.s1;
fs.rmSync(tmp, {recursive: true, force: true});

// ---------- figures ----------
const proofBars = () => bars([
  {label: 'Automated tests passing', value: V.PASS, total: V.TESTS, k: 'ok'},
  {label: 'Audit checks passing (this host)', value: V.CHECKSPASS, total: V.CHECKS, k: 'ok'},
  {label: 'Fuzz inputs without unexpected crash', value: V.FUZZ - V.CRASHED, total: V.FUZZ, k: 'ok', text: `${V.FUZZ - V.CRASHED} / ${V.FUZZ}`}
], `Measured ${V.DATE} on Node ${V.NODE} (${V.PLATFORM}). Reproduce with npm run proof.`);
const DIA = {
  pipeline: () => flow([{t: 'Profile', s: 'CPU, RAM, disk, GPU', k: 'brand'}, {t: 'Fit', s: 'will it fit? (estimate)'}, {t: 'Probe', s: 'is the runtime up?'}, {t: 'Time', s: 'opt-in, real model', k: 'warn'}, {t: 'Audit', s: 'sealed HTML/MD/JSON', k: 'ok'}], 'From hardware facts to sealed evidence'),
  canifit: () => decision([
    {q: 'Is the model description valid?', s: 'size, bits, context in range', on: 'no', out: 'REJECTED', k: 'warn'},
    {q: 'Free RAM below the estimate?', s: 'weights x 1.35 + overhead + KV', on: 'yes', out: 'INSUFFICIENT', k: 'bad'}], 'POSSIBLY FITS (try it)', 'How the RAM verdict is decided. VRAM is reported as a separate field.'),
  probe: () => decision([
    {q: 'Endpoint is http://127.0.0.1 or [::1]?', s: 'no creds, path, query, redirect', on: 'no', out: 'BLOCKED', k: 'bad'},
    {q: 'Server answers before the timeout?', s: '100 ms to 10 s', on: 'no', out: 'timeout', k: 'warn'},
    {q: 'Body under 256 KB and valid JSON?', s: 'shape is checked too', on: 'no', out: 'invalid payload', k: 'warn'}], 'RESPONDING (not inference)', 'How a probe result is decided'),
  verdict: () => decision([
    {q: 'Did any safety check fail?', s: `${V.CHECKS} checks on hostile input`, on: 'yes', out: 'BLOCKED_UNSAFE', k: 'bad'},
    {q: 'Was any check skipped on this host?', s: 'for example symlinks not allowed', on: 'yes', out: 'REVIEW_REQUIRED', k: 'warn'}], 'APPROVED_WITH_EVIDENCE', 'How the audit verdict is decided'),
  seal: () => flow([{t: 'Report', s: 'all fields', k: 'brand'}, {t: 'Canonical JSON', s: 'sorted keys'}, {t: 'SHA-256', s: 'evidence.sha256', k: 'ok'}, {t: 'Edit one byte', s: 'hash no longer matches', k: 'bad'}, {t: 'verify', s: 'exit code 1', k: 'warn'}], 'How the integrity seal works'),
  agents: () => flow([{t: 'Prime', s: 'plans the check', k: 'brand'}, {t: 'Hardware Atlas', s: 'reads host facts'}, {t: 'Model Fit', s: 'estimates memory'}, {t: 'Evidence Ledger', s: 'labels every claim'}, {t: 'Release Auditor', s: 'independent review', k: 'ok'}], 'An example skill flow (instructions for your coding agent)'),
  ci: () => flow([{t: 'Pull request', s: 'any change', k: 'brand'}, {t: 'audit', s: 'localsutra audit'}, {t: 'Gate', s: 'exit 1 if BLOCKED', k: 'warn'}, {t: 'Artifact', s: 'HTML + MD + JSON', k: 'ok'}, {t: 'Reviewer', s: 'opens the report', k: 'ok'}], 'Audit in a CI pipeline')
};
const HTMLF = {layers, trust, ladder, mem: () => MEM1, cw: () => CW};
function directive(l) {
  const m = l.match(/^@@(\w+)(?::(\w+))?@@$/); if (!m) return null; const [, k, n] = m;
  if (k === 'diagram') return DIA[n](); if (k === 'html') return HTMLF[n](); if (k === 'term') return terminal(SCN[n], 'terminal: real output'); if (k === 'bars') return proofBars();
  throw new Error('unknown directive ' + l);
}

// ---------- markdown ----------
function inline(s) {
  const codes = []; s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; }); s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => { if (!u.startsWith('samples/') && !u.startsWith('test-results/')) u = u.replace(/\.md(#|$)/, '.html$1'); return `<a href="${u}"${/^https?:/.test(u) ? ' rel="noopener"' : ''}>${t}</a>`; });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + esc(codes[i]) + '</code>');
}
function render(md) {
  const lines = md.split('\n'), out = [], toc = []; let i = 0, first = true;
  const BRK = /^(#{1,4} |```|\||[-*] |\d+\. |> |@@)/;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('```')) { const lang = l.slice(3).trim(), buf = []; i++; while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]); i++; out.push(`<div class="codewrap"${lang && lang !== 'text' ? ` data-lang="${esc(lang)}"` : ''}><pre><code>${esc(buf.join('\n'))}</code></pre></div>`); continue; }
    const d = directive(l.trim()); if (d !== null) { out.push(d); i++; continue; }
    let m = l.match(/^(#{1,4}) (.*)/);
    if (m) { const n = m[1].length, id = slug(m[2]); if (n === 1 && first) { first = false; out.push(`<h1>${inline(m[2])}</h1>`); i++; continue; } if (n === 2) toc.push([id, m[2].replace(/`/g, '')]); out.push(`<h${n} id="${id}">${inline(m[2])}${n < 4 ? `<a class="anc" href="#${id}" aria-label="Link to this section">#</a>` : ''}</h${n}>`); i++; continue; }
    if (l.startsWith('|') && lines[i + 1]?.match(/^\|[\s:|-]+\|$/)) { const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]); const cells = r => r.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|')); out.push(`<div class="tw"><table><thead><tr>${cells(rows[0]).map(h => `<th scope="col">${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(2).map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
    if (/^[-*] /.test(l)) { const it = []; while (i < lines.length && /^[-*] /.test(lines[i])) it.push(lines[i++].slice(2)); out.push('<ul>' + it.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>'); continue; }
    if (/^\d+\. /.test(l)) { const it = []; while (i < lines.length && /^\d+\. /.test(lines[i])) it.push(lines[i++].replace(/^\d+\. /, '')); out.push('<ol>' + it.map(x => `<li>${inline(x)}</li>`).join('') + '</ol>'); continue; }
    if (l.startsWith('> ')) { const b = []; while (i < lines.length && lines[i].startsWith('> ')) b.push(lines[i++].slice(2)); out.push(`<blockquote><p>${inline(b.join(' '))}</p></blockquote>`); continue; }
    if (!l.trim()) { i++; continue; }
    const p = []; while (i < lines.length && lines[i].trim() && !BRK.test(lines[i])) p.push(lines[i++]); out.push(`<p>${inline(p.join(' '))}</p>`);
  }
  return {html: out.join('\n'), toc};
}

// ---------- site structure ----------
const GROUPS = [
  ['Start here', ['05-user-guide', '14-real-world-scenarios', '15-how-it-works', '01-executive-summary']],
  ['Concepts', ['02-functional-specification', '03-architecture', '07-evidence-model-and-rules']],
  ['Reference', ['04-technical-reference', '06-security-and-privacy', '08-test-report', '13-assurance-and-evidence']],
  ['Project', ['09-operations-and-release', '10-legal-and-governance', '11-roadmap-and-faq', '12-glossary']]
];
const ORDER = GROUPS.flatMap(g => g[1]);
const docs = Object.fromEntries(fs.readdirSync(MD).filter(f => f.endsWith('.md')).map(f => { const k = f.replace('.md', ''); const raw = sub(fs.readFileSync(path.join(MD, f), 'utf8')); return [k, {k, out: k + '.html', title: raw.match(/^# (.*)/)[1], raw}]; }));
for (const k of ORDER) if (!docs[k]) throw new Error('missing doc ' + k);
for (const k of Object.keys(docs)) if (!ORDER.includes(k)) throw new Error('doc not in navigation: ' + k);
const lede = raw => raw.split('\n').find(l => l && !/^(#|\||`|-|>|@@|\d\.)/.test(l))?.replace(/[*`]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').slice(0, 180) ?? '';
fs.rmSync(OUT, {recursive: true, force: true}); fs.mkdirSync(path.join(OUT, 'assets'), {recursive: true}); fs.mkdirSync(path.join(OUT, 'samples'));
for (const f of ['site.css', 'site.js']) fs.copyFileSync(path.join(HERE, 'site', f), path.join(OUT, 'assets', f));
// Content hash in asset URLs so a redeploy is never served with a stale stylesheet.
const ASSET = createHash('sha256').update(['site.css', 'site.js'].map(f => fs.readFileSync(path.join(OUT, 'assets', f))).join('')).digest('hex').slice(0, 10);
const themeJs = fs.readFileSync(path.join(HERE, 'site/theme.js'), 'utf8').replace(/\/\/.*\n/g, '\n');
const NAV = [['index.html', 'Home'], ['05-user-guide.html', 'Docs'], ['14-real-world-scenarios.html', 'Scenarios'], ['15-how-it-works.html', 'How it works'], ['samples/index.html', 'Samples']];
const SPECIAL = new Set(['14-real-world-scenarios.html', '15-how-it-works.html', 'samples/index.html']);
const LD = (title, desc, url) => `<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@graph': [{'@type': 'SoftwareApplication', name: 'LocalSutra AI', applicationCategory: 'DeveloperApplication', operatingSystem: 'Windows, macOS, Linux (Node.js 22+)', softwareVersion: V.VERSION, license: 'https://www.apache.org/licenses/LICENSE-2.0', url: SITE, codeRepository: REPO, author: {'@type': 'Person', name: 'Vatsal Shah', url: 'https://github.com/shahvatsalofficial'}, offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'}, description: 'Offline-first local AI readiness CLI: hardware profile, model-fit estimates, loopback runtime diagnostics and independent audit reports.'}, {'@type': 'TechArticle', headline: title, description: desc, url, author: {'@type': 'Person', name: 'Vatsal Shah'}, dateModified: V.DATE}]})}</script>`;
const WM = '<span class="wm">Local<b>Sutra</b> AI</span>';
function shell({file, title, desc, body, cur, landing = false, toc = []}) {
  const rel = file.includes('/') ? '../' : '', url = SITE + (file === 'index.html' ? '' : file);
  const isCur = h => cur === h || (cur && cur !== 'index.html' && h === '05-user-guide.html' && !SPECIAL.has(cur));
  const nav = `<header class="nav"><div class="nav-in"><button class="icon-btn" id="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="side">${icon('menu', 20).replace('class="ic"', 'class="ic i-menu"')}${icon('close', 20).replace('class="ic"', 'class="ic i-close"')}</button><a class="brand" href="${rel}index.html">${logo(30)}${WM}<small>v${V.VERSION}</small></a><nav class="nav-links" aria-label="Primary">${NAV.map(([h, t]) => `<a href="${rel}${h}"${isCur(h) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav><span class="sp"></span><a class="icon-btn" href="${REPO}" rel="noopener" aria-label="GitHub repository">${icon('github', 20)}</a><button class="icon-btn" id="theme-btn" aria-label="Switch to dark theme" aria-pressed="false">${icon('moon', 20).replace('class="ic"', 'class="ic i-moon"')}${icon('sun', 20).replace('class="ic"', 'class="ic i-sun"')}</button></div></header><div class="scrim"></div>`;
  const sidebar = `<aside class="side" id="side" aria-label="Documentation"><div class="side-top">${NAV.map(([h, t]) => `<a href="${rel}${h}">${t}</a>`).join('')}</div>${GROUPS.map(([g, ks]) => `<h4>${g}</h4>${ks.map(k => `<a href="${rel}${docs[k].out}"${cur === docs[k].out ? ' aria-current="page"' : ''}>${esc(docs[k].title)}</a>`).join('')}`).join('')}<h4>Evidence</h4><a href="${rel}samples/index.html"${cur === 'samples/index.html' ? ' aria-current="page"' : ''}>Sample reports</a><a href="${rel}llms.txt">llms.txt</a></aside>`;
  const foot = `<footer class="site"><div class="container"><div class="foot"><div><a class="brand" href="${rel}index.html">${logo(28)}${WM}</a><p>Know your hardware. Choose your model. Keep AI local. Offline-first, evidence-first.</p></div><div><h5>Learn</h5><a href="${rel}05-user-guide.html">User guide</a><a href="${rel}14-real-world-scenarios.html">Real-world scenarios</a><a href="${rel}15-how-it-works.html">How it works</a><a href="${rel}11-roadmap-and-faq.html">FAQ</a></div><div><h5>Trust</h5><a href="${rel}08-test-report.html">Test report</a><a href="${rel}06-security-and-privacy.html">Security</a><a href="${rel}10-legal-and-governance.html">Legal</a><a href="${rel}samples/index.html">Sample reports</a></div><div><h5>Project</h5><a href="${REPO}" rel="noopener">GitHub</a><a href="https://www.npmjs.com/package/localsutra-ai" rel="noopener">npm</a><a href="${REPO}/releases" rel="noopener">Releases</a><a href="${REPO}/issues" rel="noopener">Issues</a></div></div><p class="legal">Apache-2.0 &middot; Created by Vatsal Shah &middot; Estimates are not guarantees; nothing here is a certification or legal advice. Built ${V.DATE} from ${V.TESTS} passing tests.</p></div></footer>`;
  const tocHtml = toc.length ? `<nav class="toc-r" aria-label="On this page"><strong>On this page</strong>${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</nav>` : '<div></div>';
  const main = landing ? `<main id="main">${body}</main>` : `<div class="doc">${sidebar}<main class="prose" id="main">${body}</main>${tocHtml}</div>`;
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}${title.includes('LocalSutra') ? '' : ' | LocalSutra AI'}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#ffffff"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><meta name="author" content="Vatsal Shah"><meta name="keywords" content="local LLM, can my computer run this model, Ollama, llama.cpp, model fit, VRAM calculator, hardware profile, offline AI, privacy, audit report, agent skills"><script>${themeJs}</script><link rel="icon" type="image/svg+xml" href="${FAVICON}"><link rel="stylesheet" href="${rel}assets/site.css?v=${ASSET}">${LD(title, desc, url)}</head><body${landing ? ' class="landing"' : ''}><a class="skip" href="#main">Skip to content</a>${nav}${landing ? `<div class="doc">${sidebar}</div>` : ''}${main}${landing ? '' : '<div class="page-foot">Estimates are not guarantees. Nothing here is a certification or legal advice.</div>'}${foot}<script src="${rel}assets/site.js?v=${ASSET}" defer></script></body></html>`;
}

// doc pages
ORDER.forEach((k, i) => {
  const d = docs[k], {html, toc} = render(d.raw), prev = docs[ORDER[i - 1]], next = docs[ORDER[i + 1]];
  const grp = GROUPS.find(g => g[1].includes(k))[0];
  const body = `<div class="crumbs"><a href="index.html">Home</a> / ${esc(grp)}</div>${html}<div class="pager">${prev ? `<a href="${prev.out}"><small>Previous</small>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="nx" href="${next.out}"><small>Next</small>${esc(next.title)}</a>` : '<span></span>'}</div><div class="edit"><a href="${REPO}/edit/main/documents/md/${k}.md" rel="noopener">Edit this page on GitHub</a><a href="${REPO}/issues/new" rel="noopener">Report a problem</a></div>`;
  fs.writeFileSync(path.join(OUT, d.out), shell({file: d.out, title: d.title, desc: lede(d.raw) || d.title, body, cur: d.out, toc}));
});

// landing
const ic = (n, c = '') => `<div class="ico ${c}">${icon(n, 24)}</div>`;
const card = (href, n, t, p, c = '') => `<a class="card" href="${href}">${ic(n, c)}<h3>${t}</h3><p>${p}</p><span class="more">Read more ${icon('arrow', 16)}</span></a>`;
const INSTALL = 'npx localsutra-ai doctor';
const landing = `<section class="hero"><div class="container hero-in"><div><span class="badge"><b>v${V.VERSION}</b> Apache-2.0 &middot; zero dependencies &middot; works offline</span><h1>Can your computer run that <span class="grad">local AI model?</span> Find out, with proof.</h1><p class="lead">LocalSutra AI profiles your hardware, estimates model memory fit, checks that your Ollama or llama.cpp server really is local, and writes audit reports you can trust. No API key. No cloud.</p><div class="cta"><a class="btn primary" href="05-user-guide.html">Get started ${icon('arrow', 18)}</a><a class="btn" href="14-real-world-scenarios.html">See real scenarios</a></div><div class="install"><code>${INSTALL}</code><button class="copy" type="button" data-copy="${INSTALL}" aria-label="Copy command">${icon('copy', 16)}<span class="lbl">Copy</span></button></div></div><div class="hero-term">${terminal(SCN.hero, 'terminal: real output')}</div></div></section>`
+ `<section class="container" style="margin-top:-6px"><div class="stats"><div class="stat"><b>${V.PASS}/${V.TESTS}</b><span>tests passing</span></div><div class="stat"><b>${V.CHECKSPASS}/${V.CHECKS}</b><span>audit checks pass</span></div><div class="stat"><b>${V.FUZZ.toLocaleString('en-US')}</b><span>fuzz inputs, ${V.CRASHED} crashes</span></div><div class="stat"><b>0</b><span>runtime dependencies</span></div></div></section>`
+ `<section class="section"><div class="container"><span class="eyebrow">How it works</span><h2>From hardware facts to sealed evidence</h2><p class="sub">Five small commands, each honest about what it measured and what it only estimated.</p>${DIA.pipeline()}<div class="steps"><div class="step"><h3>1. Look</h3><p>Read CPU, RAM, disk and NVIDIA GPU facts.</p><div class="codewrap"><pre><code>localsutra doctor\nlocalsutra doctor --out my-pc</code></pre></div></div><div class="step"><h3>2. Estimate</h3><p>Check which models plausibly fit.</p><div class="codewrap"><pre><code>localsutra fit \\\n  --catalog catalog.json</code></pre></div></div><div class="step"><h3>3. Prove</h3><p>Run the audit and open the HTML report.</p><div class="codewrap"><pre><code>localsutra audit --out my-audit\nlocalsutra verify \\\n  --report my-audit/audit-report.json</code></pre></div></div></div></div></section>`
+ `<section class="section alt"><div class="container"><span class="eyebrow">Will it fit?</span><h2>See memory need against your free RAM</h2><p class="sub">The chart below is generated by the real <code>fit</code> command for an example 16 GB laptop. The descriptors are illustrative, not download recommendations.</p>${MEM1}<p><a class="btn" href="14-real-world-scenarios.html#1-can-my-16-gb-laptop-run-these-models">How to read this chart ${icon('arrow', 18)}</a></p></div></section>`
+ `<section class="section"><div class="container"><span class="eyebrow">Private by construction</span><h2>It only ever talks to your own machine</h2><p class="sub">Endpoints must be <code>127.0.0.1</code> or <code>[::1]</code>. Everything else is refused before any connection is made.</p>${trust()}<div class="grid g3">${card('06-security-and-privacy.html', 'lock', 'Loopback only', 'No redirects, credentials, paths, localhost aliases or public hosts.', 'ok')}${card('06-security-and-privacy.html', 'shield', 'Prompts never stored', 'Opt-in timing keeps a hash of the prompt and discards the output.', 'ok')}${card('06-security-and-privacy.html', 'wifi', 'Honest about egress', 'A local URL does not prove a runtime is offline, so the report says "not tested".', 'warn')}</div></div></section>`
+ `<section class="section alt"><div class="container"><span class="eyebrow">Why it is different</span><h2>Estimates look like estimates</h2><p class="sub">Every value in every report carries one of these labels. Nothing unknown is dressed up as a result.</p>${ladder()}<div class="grid g3">${card('15-how-it-works.html', 'gauge', 'FitProof', 'Heuristic memory estimate with printed assumptions, never "it will run".')}${card('15-how-it-works.html', 'chain', 'Sealed reports', 'SHA-256 seal detects edits. Verify any report offline.', 'ok')}${card('13-assurance-and-evidence.html', 'check', 'Self-audit', `${V.CHECKS} adversarial checks, real servers that redirect, hang and flood.`, 'ok')}</div></div></section>`
+ `<section class="section"><div class="container"><span class="eyebrow">Real-world scenarios</span><h2>See it on situations you recognise</h2><p class="sub">Each scenario shows real CLI output generated when this site was built.</p><div class="grid g3">${card('14-real-world-scenarios.html#1-can-my-16-gb-laptop-run-these-models', 'cpu', 'Will it fit my laptop?', 'Six model sizes against 8 GB of free RAM.')}${card('14-real-world-scenarios.html#5-how-fast-is-my-model-cold-vs-warm', 'clock', 'How fast is my model?', 'Cold start versus warm runs, without storing your prompt.', 'warn')}${card('14-real-world-scenarios.html#6-someone-edits-the-report-after-the-fact', 'shield', 'A report gets edited', 'The seal fails and verify exits with code 1.', 'ok')}</div><p style="margin-top:22px"><a class="btn" href="14-real-world-scenarios.html">All nine scenarios ${icon('arrow', 18)}</a></p></div></section>`
+ `<section class="section alt"><div class="container"><span class="eyebrow">Proof</span><h2>Evidence you can reproduce</h2><p class="sub">Run <code>npm run proof</code> to regenerate everything below. The latest audit verdict on the recording host is <strong>${V.VERDICT}</strong>.</p>${proofBars()}<div class="honest"><h3>${icon('alert', 22)} What it does not do</h3><ul><li>It estimates memory. It does not promise a model will load or how fast it will run.</li><li>GPU facts come from NVIDIA <code>nvidia-smi</code> only. Other GPUs and NPUs are reported <strong>unknown</strong>.</li><li>Live inference on a real model is <strong>not run</strong> by the audit; <code>infer</code> is opt-in.</li><li>Skills are instructions for your coding agent. Native IDE activation is not verified.</li><li>The audit is a reproducible self-assessment, not a certification.</li></ul></div></div></section>`
+ `<section class="section"><div class="container"><span class="eyebrow">Documentation</span><h2>Everything in one place</h2><div class="grid g4">${ORDER.map(k => `<a class="card" href="${docs[k].out}"><h3>${esc(docs[k].title)}</h3><p>${esc(lede(docs[k].raw).slice(0, 95))}…</p></a>`).join('')}</div></div></section>`
+ `<section class="section"><div class="container"><div class="band"><h2>Try it in two minutes</h2><p>Node.js 22+ is all you need. No account, no API key, no network.</p><a class="btn" href="05-user-guide.html">Open the user guide</a></div></div></section>`;
fs.writeFileSync(path.join(OUT, 'index.html'), shell({file: 'index.html', title: 'LocalSutra AI: can your computer run that local AI model?', desc: 'Offline-first CLI that profiles your hardware, estimates local LLM memory fit, checks Ollama and llama.cpp on loopback, and writes sealed HTML, Markdown and JSON audit reports. Zero dependencies.', body: landing, cur: 'index.html', landing: true}));

// samples
const SAMP = path.join(OUT, 'samples'), TR = path.join(OUT, 'test-results'), copied = [];
fs.mkdirSync(TR, {recursive: true});
const proof = path.join(PROJECT, 'docs/proof');
for (const f of fs.readdirSync(proof)) { const src = path.join(proof, f); if (f.startsWith('cli-')) { fs.copyFileSync(src, path.join(SAMP, f)); copied.push(f); } else if (!['README.md', 'audit-sample'].includes(f)) fs.copyFileSync(src, path.join(TR, f)); }
fs.cpSync(path.join(proof, 'audit-sample'), path.join(SAMP, 'audit'), {recursive: true});
fs.cpSync(path.join(PROJECT, 'examples/reports'), path.join(SAMP, 'reports'), {recursive: true});
const sbody = `<div class="crumbs"><a href="../index.html">Home</a> / Evidence</div><h1>Sample reports and results</h1><p>Real output generated by LocalSutra AI v${V.VERSION}. Nothing here is hand-edited. The hardware figures in these samples come from the machine that recorded them.</p><div class="grid g2" style="margin-top:20px"><a class="card" href="audit/audit-report.html"><span class="chip s">Open in browser</span><h3>Independent audit report</h3><p>${V.CHECKS} checks with expected versus observed results, evidence tiers and a not-tested list.</p></a><a class="card" href="reports/fit.html"><span class="chip s">Open in browser</span><h3>Model-fit report</h3><p>Heuristic memory estimates with assumptions and limitations.</p></a></div><h2>Report families</h2><div class="tw"><table><thead><tr><th>Report</th><th>HTML</th><th>Markdown</th><th>JSON</th></tr></thead><tbody>${['hardware', 'fit', 'runtime', 'benchmark', 'privacy'].map(n => `<tr><td>${n}</td><td><a href="reports/${n}.html">html</a></td><td><a href="reports/${n}.md">md</a></td><td><a href="reports/${n}.json">json</a></td></tr>`).join('')}<tr><td>audit report</td><td><a href="audit/audit-report.html">html</a></td><td><a href="audit/audit-report.md">md</a></td><td><a href="audit/audit-report.json">json</a></td></tr></tbody></table></div><h2>Proof and transcripts</h2><div class="tw"><table><thead><tr><th>File</th><th>What it is</th></tr></thead><tbody><tr><td><a href="../test-results/test-run.tap">test-results/test-run.tap</a></td><td>Unedited TAP output of the full test run</td></tr><tr><td><a href="../test-results/fuzz-results.json">test-results/fuzz-results.json</a></td><td>Seeded fuzz summary</td></tr><tr><td><a href="../test-results/environment.json">test-results/environment.json</a></td><td>Machine-readable run record</td></tr><tr><td><a href="../test-results/SHA256SUMS.txt">test-results/SHA256SUMS.txt</a></td><td>SHA-256 of every proof file</td></tr>${copied.map(n => `<tr><td><a href="${n}">${n}</a></td><td>CLI transcript</td></tr>`).join('')}</tbody></table></div>`;
fs.writeFileSync(path.join(SAMP, 'index.html'), shell({file: 'samples/index.html', title: 'Sample reports and results', desc: 'Real generated audit, fit, hardware, runtime, benchmark and privacy reports plus test, fuzz and CLI transcript evidence.', body: sbody, cur: 'samples/index.html'}));
fs.copyFileSync(path.join(PROJECT, 'llms.txt'), path.join(OUT, 'llms.txt')); fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const urls = ['', ...ORDER.map(k => docs[k].out), 'samples/index.html'];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${V.DATE}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
console.log(JSON.stringify({pages: ORDER.length + 2, samples: copied.length, out: OUT}));
