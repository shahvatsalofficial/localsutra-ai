// LocalSutra-specific figures. Colours come from CSS variables, so they follow the light/dark theme.
import {esc, ICONS} from './diagrams.mjs';

Object.assign(ICONS, {
  cpu: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/><rect x="10" y="10" width="4" height="4" rx=".6"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-6"/><circle cx="12" cy="17" r="1.2"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  rocket: '<path d="M5 19c0-3 1.500-4.500 3-5l-2-2c2-5 6-8 12-8 0 6-3 10-8 12l-2-2c-.5 1.500-2 3-3 5z"/><circle cx="15" cy="9" r="1.500"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.500a10 10 0 0 1 14 0M8.500 16a5 5 0 0 1 7 0"/><path d="M12 19.500h.01"/><path d="M4 4l16 16"/>'
});

const TILE = id => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#22a06b"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#${id})"/><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9.500" y="9.500" width="13" height="13" rx="3"/><path d="M13.500 5.500v4M18.500 5.500v4M13.500 22.500v4M18.500 22.500v4M5.500 13.500h4M5.500 18.500h4M22.500 13.500h4M22.500 18.500h4"/><path d="M13.500 16.200l1.800 1.800 3.400-3.600"/></g>`;
let uid = 0;
export const logo = (size = 30) => `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${TILE('lg' + (++uid))}</svg>`;
export const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${TILE('g')}</svg>`);

/** Architecture layers. */
export function layers() {
  const mods = a => `<div class="mods">${a.map(m => `<span>${esc(m)}</span>`).join('')}</div>`;
  return `<div class="layers"><div class="layer b"><h4>Shell</h4><p>Parses arguments, writes report files, sets exit codes. The only layer that touches disk output.</p>${mods(['cli/index', 'server (127.0.0.1, token)', 'audit command'])}</div>`
    + `<div class="layer"><h4>Domain</h4><p>Validates every input, returns sealed reports.</p>${mods(['hardware', 'runtime', 'bench', 'privacy', 'install', 'audit'])}</div>`
    + `<div class="layer"><h4>Reporting</h4><p>One block model feeds two renderers, so Markdown and HTML can never disagree.</p>${mods(['reporting: JSON', 'Markdown', 'accessible HTML'])}</div>`
    + `<div class="layer"><h4>Shared utilities</h4><p>Endpoint policy, bounded reads, canonical JSON, SHA-256 seal, redaction.</p>${mods(['util'])}</div>`
    + `<div class="layer g"><h4>Runtime</h4><p>Node.js 22+ built-ins only. Zero dependencies. No telemetry.</p></div></div>`;
}

/** Trust boundary: what the tool may talk to, and what it never does. */
export function trust() {
  const item = (t, d) => `<li><b>${t}</b><span>${d}</span></li>`;
  const phone = `<div class="trust-v"><div class="zone ok"><h4>Your machine</h4><ul>${item("You / IDE agent", "runs a command")}${item("localsutra CLI", "zero dependencies")}${item("OS facts", "CPU, RAM, disk, nvidia-smi (fixed argv)")}${item("Ollama / llama.cpp", "only http://127.0.0.1: GET, or opt-in POST")}${item("Report files", "JSON, Markdown, HTML")}${item("Skills", "copied, never overwritten")}</ul></div><div class="zone bad"><h4>Never contacted</h4><ul>${item("Cloud model APIs", "no fallback, no keys")}${item("Telemetry", "none")}${item("Public hosts", "refused before connect")}</ul></div></div>`;
  return `<figure class="trust">${phone}<svg viewBox="0 0 760 330" role="img" aria-label="Trust boundary diagram: LocalSutra talks only to loopback runtimes and local tools; the internet is never contacted."><title>Trust boundary</title>
<rect class="t-zone ok" x="14" y="14" width="500" height="302" rx="18"/><text class="t-ok" x="32" y="38">YOUR MACHINE</text>
<rect class="t-zone bad" x="540" y="14" width="206" height="302" rx="18"/><text class="t-bad" x="558" y="38">NEVER CONTACTED</text>
<rect class="t-box" x="34" y="62" width="130" height="70" rx="12"/><text class="t-lbl" x="99" y="92" text-anchor="middle">You / IDE agent</text><text class="t-sm" x="99" y="112" text-anchor="middle">runs a command</text>
<rect class="t-box" x="196" y="62" width="150" height="70" rx="12"/><text class="t-lbl" x="271" y="92" text-anchor="middle">localsutra CLI</text><text class="t-sm" x="271" y="112" text-anchor="middle">zero dependencies</text>
<rect class="t-box" x="378" y="62" width="120" height="70" rx="12"/><text class="t-lbl" x="438" y="92" text-anchor="middle">Report files</text><text class="t-sm" x="438" y="112" text-anchor="middle">JSON · MD · HTML</text>
<rect class="t-box" x="34" y="190" width="130" height="86" rx="12"/><text class="t-lbl" x="99" y="222" text-anchor="middle">OS facts</text><text class="t-sm" x="99" y="242" text-anchor="middle">CPU · RAM · disk</text><text class="t-sm" x="99" y="258" text-anchor="middle">nvidia-smi (fixed argv)</text>
<rect class="t-box" x="196" y="190" width="150" height="86" rx="12"/><text class="t-lbl" x="271" y="222" text-anchor="middle">Ollama / llama.cpp</text><text class="t-sm" x="271" y="242" text-anchor="middle">only http://127.0.0.1</text><text class="t-sm" x="271" y="258" text-anchor="middle">GET, or opt-in POST</text>
<rect class="t-box" x="378" y="190" width="120" height="86" rx="12"/><text class="t-lbl" x="438" y="222" text-anchor="middle">Skills</text><text class="t-sm" x="438" y="242" text-anchor="middle">copied, never</text><text class="t-sm" x="438" y="258" text-anchor="middle">overwritten</text>
<rect class="t-box" x="570" y="70" width="150" height="62" rx="12"/><text class="t-lbl" x="645" y="98" text-anchor="middle">Cloud model APIs</text><text class="t-sm" x="645" y="116" text-anchor="middle">no fallback, no keys</text>
<rect class="t-box" x="570" y="150" width="150" height="62" rx="12"/><text class="t-lbl" x="645" y="178" text-anchor="middle">Telemetry</text><text class="t-sm" x="645" y="196" text-anchor="middle">none</text>
<rect class="t-box" x="570" y="230" width="150" height="62" rx="12"/><text class="t-lbl" x="645" y="258" text-anchor="middle">Public hosts</text><text class="t-sm" x="645" y="276" text-anchor="middle">refused before connect</text>
<path class="t-ln" d="M164 97h30M346 97h30M271 132v56M164 233h30"/>
<path class="t-ln x" d="M498 233h40M498 97h40"/><text class="t-bad" x="520" y="170" text-anchor="middle">&#x2715;</text>
</svg><figcaption>Everything the tool touches stays on your machine. Anything outside is refused before a connection is attempted.</figcaption></figure>`;
}

/** Stacked memory bars with a free-RAM marker. models: [{id,paramsB,bits,weights,overhead,kv,required,fits}] */
export function memchart(models, freeGB, label) {
  // Scale is capped so one huge model cannot squash the rows that are actually close to the limit.
  const max = Math.min(freeGB * 2.4, Math.max(freeGB * 1.25, ...models.map(m => m.required * 1.05)));
  const pct = v => (v / max * 100).toFixed(2);
  const rows = models.map((m, i) => {
    const w = m.weights * 1.35 - m.weights, base = m.weights;
    const segs = [['w', 0, base, 'Weights'], ['h', base, w, 'Runtime headroom (35%)'], ['o', base + w, m.overhead, 'Fixed overhead'], ['k', base + w + m.overhead, m.kv || 0, 'KV cache']]
      .map(([c, from, len, t]) => [c, Math.min(from, max), Math.max(0, Math.min(from + len, max) - Math.min(from, max)), t, len]).filter(s => s[2] > 0);
    return `<div class="mem-row"><div class="nm">${esc(m.id)}<small>${m.paramsB}B at ${m.bits}-bit</small></div><div class="mem-track" role="img" aria-label="${esc(m.id)} needs about ${m.required.toFixed(1)} GB; ${freeGB.toFixed(1)} GB free">${segs.map(s => `<span class="mem-seg ${s[0]}" style="left:${pct(s[1])}%;width:${pct(s[2])}%" title="${s[3]}: ${s[4].toFixed(2)} GB"></span>`).join('')}${m.required > max ? '<span class="mem-over" aria-hidden="true">off the chart &#9654;</span>' : ''}<span class="mem-limit" style="left:${pct(freeGB)}%">${i === 0 ? `<span>${freeGB.toFixed(1)} GB free</span>` : ''}</span></div><div class="mem-val">${m.required.toFixed(2)} GB<br><span class="pill ${m.fits ? 'ok' : 'bad'}">${m.fits ? 'possibly fits' : 'too large'}</span></div></div>`;
  }).join('');
  return `<figure class="mem"><h4>${esc(label)}</h4><p class="sub">Estimated memory need versus free RAM (dashed line). Computed by <code>localsutra fit</code> when this site was built.</p>${rows}<div class="legend"><span><i style="background:var(--brand)"></i>Weights</span><span><i style="background:color-mix(in srgb,var(--brand) 55%,var(--bg))"></i>Headroom</span><span><i style="background:var(--brand-2)"></i>Overhead</span><span><i style="background:var(--warn)"></i>KV cache</span></div></figure>`;
}

/** Evidence ladder. */
export function ladder() {
  const r = [['r1', 'measured', 'Read or timed on this host now. Example: RAM, disk, CPU loop timing.'], ['r2', 'heuristic', 'Calculated from stated assumptions. Example: model-fit estimate.'], ['r3', 'runtime_reported', 'A local runtime told us. Example: Ollama token counters.'], ['r4', 'not_run', 'The test did not happen. Never counted as a pass.'], ['r5', 'unknown', 'Cannot be determined here. Not the same as absent.']];
  return `<div class="ladder">${r.map(x => `<div class="rung ${x[0]}"><b>${x[1]}</b><span>${x[2]}</span></div>`).join('')}</div>`;
}

/** Cold vs warm bars from real samples [{run,phase,wallMs}]. */
export function coldwarm(samples, label) {
  const W = 640, H = 230, pl = 52, pb = 34, pt = 20, bw = Math.min(80, (W - pl - 20) / samples.length - 24);
  const max = Math.max(...samples.map(s => s.wallMs)) * 1.15 || 1;
  const gap = (W - pl - 20 - bw * samples.length) / (samples.length + 1);
  let g = `<line class="ax" x1="${pl}" y1="${H - pb}" x2="${W - 10}" y2="${H - pb}"/><line class="ax" x1="${pl}" y1="${pt}" x2="${pl}" y2="${H - pb}"/>`;
  [0, 0.5, 1].forEach(t => { const y = H - pb - t * (H - pb - pt) * (1 / 1.15 * 1.15); g += `<text x="${pl - 8}" y="${(H - pb - t * (H - pb - pt)) + 4}" text-anchor="end">${(max * t).toFixed(0)} ms</text>`; });
  samples.forEach((s, i) => {
    const h = s.wallMs / max * (H - pb - pt), x = pl + gap + i * (bw + gap), y = H - pb - h;
    g += `<rect class="${i === 0 ? 'bar-c' : 'bar-w'}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="6"/><text class="v" x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${s.wallMs.toFixed(0)} ms</text><text x="${(x + bw / 2).toFixed(1)}" y="${H - pb + 18}" text-anchor="middle">run ${s.run} (${i === 0 ? 'cold' : 'warm'})</text>`;
  });
  return `<figure class="cw"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg><figcaption>${esc(label)}</figcaption></figure>`;
}
