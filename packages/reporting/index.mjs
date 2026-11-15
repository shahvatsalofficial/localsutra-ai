import {markdownSafe, esc, verifySeal} from '../core/util.mjs';
import {VERSION} from '../core/version.mjs';

const TITLES = {
  'localsutra.hardware.v1': 'Hardware Profile', 'localsutra.fit.v1': 'Model Fit (FitProof)', 'localsutra.catalog.v1': 'Model Fit Catalog',
  'localsutra.runtime.v1': 'Runtime Diagnostics', 'localsutra.inference.v1': 'Local Inference Samples', 'localsutra.benchmark.v1': 'Synthetic CPU Benchmark (not AI)',
  'localsutra.compare.v1': 'Benchmark Comparison', 'localsutra.privacy.v1': 'Privacy and Offline-Boundary Check', 'localsutra.audit.v1': 'Independent Audit Report'
};
const gb = b => (Number.isFinite(b) ? `${(b / 1e9).toFixed(2)} GB` : 'unknown');
const ms = v => (Number.isFinite(v) ? `${v.toFixed(3)} ms` : 'n/a');
const list = a => (a && a.length ? a.join('; ') : 'none');
const stat = (label, s) => [label, s.samples, ms(s.median), ms(s.p95), ms(s.min), ms(s.max), ms(s.stdev)];

// One neutral block list feeds both renderers so Markdown and HTML always agree.
function blocks(r) {
  const b = [];
  const sealed = r.evidence ? (verifySeal(r) ? `SHA-256 seal verified (${r.evidence.sha256.slice(0, 16)}…)` : 'SEAL MISMATCH: content changed after sealing') : 'no seal';
  b.push({t: 'meta', rows: [['Schema', r.schema ?? 'n/a'], ['Integrity', sealed], ['Trust boundary', 'Loopback only. No cloud calls, no telemetry. Unknown and not-run values are not successes.']]});
  switch (r.schema) {
    case 'localsutra.hardware.v1': {
      const p = r.profile;
      b.push({t: 'meta', rows: [['OS / architecture', `${p.os}/${p.architecture}${p.wsl ? ' (WSL)' : ''}`], ['CPU', `${p.cpuModel} (${p.cpuLogical} logical)`], ['RAM total / free', `${gb(p.ramBytes)} / ${gb(p.freeRamBytes)}`], ['Free disk (working volume)', p.storage?.status === 'measured' ? gb(p.storage.freeBytes) : 'unknown'], ['GPU', p.gpu.status === 'detected' ? p.gpu.devices.map(d => `${d.name} ${gb(d.vramBytes)} (driver ${d.driver})`).join('; ') : `unknown: ${p.gpu.reason}`], ['NPU', `unknown: ${p.npu.reason}`]]});
      b.push({t: 'h', x: 'Tools on PATH (found, not verified working)'}, {t: 'table', head: ['Tool', 'Found'], rows: Object.entries(p.tools).map(([k, v]) => [k, v ? 'yes' : 'no'])});
      b.push({t: 'h', x: 'Limitations'}, {t: 'list', items: r.limitations});
      break;
    }
    case 'localsutra.fit.v1': {
      const e = r.estimate;
      b.push({t: 'verdict', v: e.fitCategory, note: 'A heuristic memory estimate. It is not a measurement and does not promise the model will load or run at a useful speed.'});
      b.push({t: 'meta', rows: [['Model', `${r.model.id} (${r.model.parametersB}B @ ${r.model.bitsPerWeight}-bit, ctx ${r.model.contextTokens})`], ['License / source (unverified)', `${r.model.license} / ${r.model.source}`], ['Weights', `${e.weightsGB.toFixed(2)} GB`], ['KV cache', e.kvCacheGB == null ? 'unknown (not supplied)' : `${e.kvCacheGB.toFixed(2)} GB`], ['Required (estimate)', `${e.estimatedRequiredGB.toFixed(2)} GB`], ['Free RAM', `${r.hardware.freeRamGB.toFixed(2)} GB`], ['VRAM', e.vram.status === 'evaluated' ? `${e.vram.category} (${e.vram.vramGB.toFixed(2)} GB)` : `not evaluated: ${e.vram.reason}`], ['Speed / quality', 'unknown / unknown']]});
      b.push({t: 'h', x: 'Assumptions'}, {t: 'list', items: e.assumptions}, {t: 'h', x: 'Limitations'}, {t: 'list', items: r.limitations});
      break;
    }
    case 'localsutra.catalog.v1':
      b.push({t: 'meta', rows: [['Models', String(r.summary.total)], ['Possibly fit (RAM)', String(r.summary.possiblyFits)], ['Likely insufficient RAM', String(r.summary.likelyInsufficient)]]});
      b.push({t: 'h', x: 'Fit by model (heuristic)'}, {t: 'table', head: ['Model', 'Params', 'Bits', 'Weights GB', 'Required GB', 'Free RAM GB', 'RAM fit', 'VRAM'], rows: r.results.map(x => [x.model.id, `${x.model.parametersB}B`, x.model.bitsPerWeight, x.estimate.weightsGB.toFixed(2), x.estimate.estimatedRequiredGB.toFixed(2), x.hardware.freeRamGB.toFixed(2), x.estimate.fitCategory, x.estimate.vram.status === 'evaluated' ? x.estimate.vram.category : 'not_evaluated'])});
      b.push({t: 'note', x: 'possibly_fits is not a guarantee. Speed and quality are unknown. Heuristic, not measured.'});
      break;
    case 'localsutra.runtime.v1':
      b.push({t: 'verdict', v: r.status, note: r.detail});
      b.push({t: 'meta', rows: [['Runtime', r.runtime], ['Endpoint', r.endpoint], ['Scope', r.networkScope], ['Failure code', r.failureCode ?? 'none'], ['HTTP status', r.httpStatus ?? 'n/a']]});
      if (r.models.length) b.push({t: 'h', x: 'Installed models (listing only)'}, {t: 'table', head: ['Name', 'Size'], rows: r.models.map(m => [m.name, gb(m.sizeBytes)])});
      b.push({t: 'h', x: 'Not tested'}, {t: 'list', items: r.notTested});
      break;
    case 'localsutra.inference.v1':
      b.push({t: 'meta', rows: [['Runtime / model', `${r.runtime} / ${r.model}`], ['Mode', r.mode], ['Runs', String(r.runs)], ['Prompt SHA-256', r.promptHash]]});
      b.push({t: 'h', x: 'Samples'}, {t: 'table', head: ['Run', 'Phase', 'Wall', 'Tokens', 'Reported tok/s'], rows: r.samples.map(s => [s.run, s.phase, ms(s.wallMs), s.evalTokens ?? 'not reported', s.reportedTokensPerSecond == null ? 'not reported' : s.reportedTokensPerSecond.toFixed(2)])});
      b.push({t: 'h', x: 'Limitations'}, {t: 'list', items: r.limitations});
      break;
    case 'localsutra.benchmark.v1':
      b.push({t: 'verdict', v: 'NOT_AI_INFERENCE', note: 'A synthetic CPU loop. It says nothing about model speed, tokens per second, GPU, power or quality.'});
      b.push({t: 'meta', rows: [['Runs / iterations', `${r.runs} / ${r.iterations}`], ['Warm-up', r.warmupDiscarded ? 'discarded' : 'none'], ['Environment', `Node ${r.environment.node} ${r.environment.platform}/${r.environment.arch}`]]});
      b.push({t: 'h', x: 'Statistics'}, {t: 'table', head: ['Metric', 'N', 'Median', 'p95', 'Min', 'Max', 'Stdev'], rows: [stat('Wall time', r.statistics.wallMs), stat('CPU user', r.statistics.cpuUserMs)]});
      b.push({t: 'h', x: 'Limits'}, {t: 'list', items: r.limits});
      break;
    case 'localsutra.compare.v1':
      b.push({t: 'meta', rows: [['A median', ms(r.aMedianMs)], ['B median', ms(r.bMedianMs)], ['Ratio A/B', r.ratio.toFixed(3)], ['Classification', r.classification]]}, {t: 'note', x: r.warning});
      break;
    case 'localsutra.privacy.v1':
      b.push({t: 'verdict', v: r.endpointAllowed ? 'ENDPOINT_ALLOWED' : 'ENDPOINT_BLOCKED', note: r.reason});
      b.push({t: 'h', x: 'Claims'}, {t: 'table', head: ['Claim', 'Value'], rows: Object.entries(r.claims).map(([k, v]) => [k, String(v)])});
      b.push({t: 'h', x: 'Data inventory'}, {t: 'table', head: ['Field', 'Stored in', 'Retention', 'Shared'], rows: r.dataInventory.map(d => [d.field, d.storedIn, d.retention, d.shared])});
      b.push({t: 'h', x: 'Notes'}, {t: 'list', items: r.notes});
      break;
    case 'localsutra.audit.v1':
      b.push({t: 'verdict', v: r.verdict, note: r.verdictRule});
      b.push({t: 'meta', rows: [['Tool', `LocalSutra AI ${r.toolVersion}`], ['Recorded', r.recordedAt], ['Environment', `Node ${r.environment.node} · ${r.environment.platform}/${r.environment.arch} · ${r.environment.cpuModel}`], ['Assurance checks', `${r.assurance.passed} passed · ${r.assurance.failed} failed · ${r.assurance.skipped} skipped of ${r.assurance.total}`]]});
      b.push({t: 'h', x: 'Assurance checks (each runs the real code on a hostile input)'}, {t: 'table', head: ['ID', 'Check', 'Expected', 'Observed', 'Result'], rows: r.assurance.checks.map(c => [c.id, c.title, c.expected, c.observed, c.result])});
      b.push({t: 'h', x: 'Sample outputs'}, {t: 'table', head: ['Capability', 'Result'], rows: r.samples.map(s => [s.capability, s.result])});
      b.push({t: 'h', x: 'Evidence tiers'}, {t: 'table', head: ['Artifact', 'Tier', 'Proves', 'Does not prove'], rows: r.evidenceTiers.map(e => [e.artifact, e.tier, e.proves, e.doesNotProve])});
      b.push({t: 'h', x: 'Not tested / not claimed'}, {t: 'list', items: r.notTested});
      if (r.artifacts) b.push({t: 'h', x: 'Artifact hashes'}, {t: 'table', head: ['File', 'SHA-256'], rows: Object.entries(r.artifacts)});
      b.push({t: 'note', x: 'A SHA-256 seal detects change; it is not a signature and does not prove who produced the report. Only a human maintainer can approve a release.'});
      break;
    default:
      b.push({t: 'code', x: JSON.stringify(r, null, 2)});
  }
  return b;
}

const title = r => `LocalSutra AI — ${TITLES[r.schema] ?? r.schema ?? 'Evidence Report'}`;
const cell = v => markdownSafe(v);

export function renderMarkdown(r) {
  const out = [`# ${markdownSafe(title(r))}`, ''];
  for (const x of blocks(r)) {
    if (x.t === 'meta') out.push(...x.rows.map(([k, v]) => `**${k}:** ${cell(v)}  `), '');
    else if (x.t === 'verdict') out.push(`> **Verdict: ${cell(x.v)}** — ${cell(x.note)}`, '');
    else if (x.t === 'h') out.push(`## ${x.x}`, '');
    else if (x.t === 'table') out.push(`| ${x.head.join(' | ')} |`, `|${x.head.map(() => '---').join('|')}|`, ...x.rows.map(row => `| ${row.map(cell).join(' | ')} |`), '');
    else if (x.t === 'list') out.push(...x.items.map(i => `- ${cell(i)}`), '');
    else if (x.t === 'note') out.push(`_${cell(x.x)}_`, '');
    else out.push('```json', x.x.replaceAll('```', "'''"), '```', '');
  }
  out.push('---', `LocalSutra AI ${VERSION} · created by Vatsal Shah · Apache-2.0`, '');
  return out.join('\n');
}

const CSS = `:root{--bg:#f5f8fb;--card:#fff;--ink:#14202b;--mute:#566574;--line:#d8e0e9;--brand:#0f6b5c;--ok:#13795b;--warn:#a15c00;--bad:#b3261e}@media(prefers-color-scheme:dark){:root{--bg:#0e1416;--card:#162024;--ink:#e6edf0;--mute:#9fb3b8;--line:#2a3a40;--brand:#4cd6b3;--ok:#4cd6a3;--warn:#f0b254;--bad:#ff8a80}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1040px;margin:0 auto;padding:2rem 1rem 4rem}h1{font-size:1.6rem;margin:.2rem 0 1rem}h2{font-size:1.15rem;margin:2rem 0 .6rem;border-bottom:1px solid var(--line);padding-bottom:.3rem}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem 1.25rem;margin:1rem 0}dl{display:grid;grid-template-columns:max-content 1fr;gap:.25rem 1rem;margin:0}dt{color:var(--mute)}dd{margin:0;overflow-wrap:anywhere}.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--card)}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;padding:.5rem .65rem;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}th{color:var(--mute);font-weight:600}tr:last-child td{border-bottom:0}.verdict{border-left:6px solid var(--warn);font-size:1.05rem}.verdict.bad{border-color:var(--bad)}.verdict.good{border-color:var(--ok)}.verdict b{font-size:1.3rem}.pill{display:inline-block;padding:.02rem .55rem;border-radius:99px;font-size:.78rem;border:1px solid currentColor;white-space:nowrap}.pill.ok{color:var(--ok)}.pill.warn{color:var(--warn)}.pill.bad{color:var(--bad)}.note{color:var(--mute);font-style:italic}pre{overflow:auto;background:var(--card);border:1px solid var(--line);padding:1rem;border-radius:8px;white-space:pre-wrap}footer{color:var(--mute);font-size:.85rem;margin-top:2rem}@media(max-width:640px){dl{grid-template-columns:1fr}}@media print{body{background:#fff;color:#000}}`;
const OK = new Set(['pass', 'yes', 'APPROVED_WITH_EVIDENCE', 'responding', 'possibly_fits', 'possibly_fits_vram', 'ENDPOINT_ALLOWED', 'true']);
const BAD = new Set(['fail', 'BLOCKED_UNSAFE', 'ENDPOINT_BLOCKED', 'likely_insufficient_ram', 'exceeds_single_gpu_vram', 'unavailable', 'SEAL MISMATCH']);
const WARN = new Set(['skipped', 'no', 'REVIEW_REQUIRED', 'NOT_TESTED', 'not_run', 'not_ready', 'NOT_AI_INFERENCE', 'not_evaluated', 'unknown']);
const pill = v => { const s = String(v); const c = OK.has(s) ? 'ok' : BAD.has(s) ? 'bad' : WARN.has(s) ? 'warn' : null; return c ? `<span class="pill ${c}">${esc(s)}</span>` : esc(s); };

export function renderHtml(r) {
  const body = blocks(r).map(x => {
    if (x.t === 'meta') return `<section class="card"><dl>${x.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>`;
    if (x.t === 'verdict') { const cls = OK.has(x.v) ? 'good' : BAD.has(x.v) ? 'bad' : ''; return `<section class="card verdict ${cls}" role="status"><b>Verdict: ${esc(x.v)}</b><br>${esc(x.note)}</section>`; }
    if (x.t === 'h') return `<h2>${esc(x.x)}</h2>`;
    if (x.t === 'table') return `<div class="scroll"><table><thead><tr>${x.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${x.rows.map(row => `<tr>${row.map(c => `<td>${pill(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (x.t === 'list') return `<ul>${x.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    if (x.t === 'note') return `<p class="note">${esc(x.x)}</p>`;
    return `<pre>${esc(x.x)}</pre>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(title(r))}</title><style>${CSS}</style></head><body><main><h1>${esc(title(r))}</h1>\n${body}\n<footer>LocalSutra AI ${esc(VERSION)} · Know your hardware. Choose your model. Keep AI local. · created by Vatsal Shah · Apache-2.0</footer></main></body></html>\n`;
}

export function formats(report) { return {json: JSON.stringify(report, null, 2) + '\n', md: renderMarkdown(report), html: renderHtml(report)}; }
