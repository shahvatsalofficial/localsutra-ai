#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir, writeFile, realpath} from 'node:fs/promises';
import {profileHost, fitCatalog} from '../core/hardware.mjs';
import {probeRuntime, inferOllama} from '../core/runtime.mjs';
import {benchmark, compare} from '../core/bench.mjs';
import {privacyAudit} from '../core/privacy.mjs';
import {assert, number, loadJSON, verifySeal} from '../core/util.mjs';
import {formats, renderMarkdown, renderHtml} from '../reporting/index.mjs';
import {installSkills} from '../core/install.mjs';
import {runAudit} from '../core/audit.mjs';
import {startServer} from '../server/index.mjs';
import {VERSION} from '../core/version.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOLEAN = new Set(['force', 'quiet', 'dry-run']);

export function parse(args) {
  const opt = {};
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    assert(k.startsWith('--') && k.length > 2, `Invalid argument: ${k}`);
    const name = k.slice(2);
    assert(!Object.hasOwn(opt, name), `Duplicate option: ${k}`);
    if (BOOLEAN.has(name)) { opt[name] = true; continue; }
    assert(args[i + 1] !== undefined && !args[i + 1].startsWith('--'), `Missing value for ${k}`);
    opt[name] = args[++i];
  }
  return opt;
}
const required = (o, k) => { assert(o[k], `Missing --${k}`); return o[k]; };
const int = (o, k, min, max, dflt) => (o[k] === undefined ? dflt : number(o[k], k, min, max));

// Writes <stem>.json/.md/.html. Existing files are never overwritten unless --force.
export async function save(file, report, {force = false} = {}) {
  const p = path.resolve(file);
  await mkdir(path.dirname(p), {recursive: true});
  const stem = p.replace(/\.(json|md|html)$/i, '');
  for (const [type, body] of Object.entries(formats(report))) await writeFile(`${stem}.${type}`, body, {flag: force ? 'w' : 'wx'});
  return stem;
}

function emit(report, o) {
  const fmt = o.format ?? 'json';
  assert(['json', 'md', 'html'].includes(fmt), '--format must be json, md or html');
  if (fmt === 'md') console.log(renderMarkdown(report)); else if (fmt === 'html') console.log(renderHtml(report)); else console.log(JSON.stringify(report, null, 2));
}

const HELP = `LocalSutra AI ${VERSION}  (created by Vatsal Shah, Apache-2.0)
Know your hardware. Choose your model. Keep AI local. No API keys. No cloud. Loopback only.

Reports (JSON + Markdown + HTML when --out is given; otherwise printed. --format json|md|html):
  doctor    [--out FILE]                                      hardware profile (CPU/RAM/disk/GPU if nvidia-smi)
  fit       --catalog FILE [--profile FILE] [--out FILE]      approximate model-memory fit (heuristic)
  probe     --runtime ollama|llama [--endpoint URL] [--out]   loopback runtime health (not inference)
  infer     --model NAME [--runs 2] [--prompt TEXT] [--out]   OPT-IN real Ollama timing, prompt/output not stored
  benchmark [--runs 5] [--iterations 100000] [--out FILE]     synthetic CPU loop (NOT AI inference)
  compare   --a A.json --b B.json [--out FILE]                compare two benchmark reports
  privacy   [--endpoint URL] [--out FILE]                     endpoint rule check and data inventory
  audit     [--out DIR] [--quiet] [--force]                   independent audit: ${'40+'} adversarial checks -> audit-report.{json,md,html}
Tools:
  verify          --report FILE                               check a report's SHA-256 seal (exit 1 on mismatch)
  install-skills  --project DIR --ide claude|cursor|codex|gemini|copilot|opencode [--dry-run]
  serve           --report FILE [--port N]                    read-only 127.0.0.1 API; needs LOCALSUTRA_SERVER_TOKEN (24+ chars)
  demo            [--out DIR] [--force]                       write sample reports for every capability
  --version | help

Options: --force overwrites existing report files (default: refuse). --quiet suppresses the audit summary.`;

export async function main(args = process.argv.slice(2)) {
  const command = args[0] ?? 'help';
  if (command === '--version' || command === '-v' || command === 'version') { console.log(`LocalSutra AI ${VERSION}`); return; }
  if (command === 'help' || command === '--help' || command === '-h') { console.log(HELP); return; }
  const o = parse(args.slice(1));
  let report;
  switch (command) {
    case 'doctor': report = profileHost(); break;
    case 'fit': {
      const catalog = await loadJSON(required(o, 'catalog'));
      report = fitCatalog(catalog.models ?? catalog, o.profile ? await loadJSON(o.profile) : profileHost());
      break;
    }
    case 'probe': report = await probeRuntime(required(o, 'runtime'), {endpoint: o.endpoint, timeoutMs: int(o, 'timeout', 100, 10000, 2500)}); break;
    case 'infer': report = await inferOllama({model: required(o, 'model'), prompt: o.prompt, endpoint: o.endpoint, runs: int(o, 'runs', 1, 5, 2), timeoutMs: int(o, 'timeout', 200, 120000, 30000)}); break;
    case 'benchmark': report = benchmark({runs: int(o, 'runs', 2, 30, 5), iterations: int(o, 'iterations', 1000, 2000000, 100000)}); break;
    case 'compare': {
      const a = await loadJSON(required(o, 'a')), b = await loadJSON(required(o, 'b'));
      assert(verifySeal(a) && verifySeal(b), 'Both inputs must have valid evidence seals');
      report = compare(a, b);
      break;
    }
    case 'privacy': report = privacyAudit({endpoint: o.endpoint}); break;
    case 'verify': {
      const x = await loadJSON(required(o, 'report'));
      const ok = verifySeal(x);
      console.log(JSON.stringify({verified: ok, schema: x.schema ?? null, note: ok ? 'Seal matches content. This detects change, not who made the report.' : 'Seal missing or content changed.'}, null, 2));
      if (!ok) process.exitCode = 1;
      return;
    }
    case 'install-skills': console.log(JSON.stringify(await installSkills(required(o, 'project'), required(o, 'ide'), {dryRun: Boolean(o['dry-run'])}), null, 2)); return;
    case 'serve': {
      const started = await startServer({reportFile: required(o, 'report'), token: process.env.LOCALSUTRA_SERVER_TOKEN, port: int(o, 'port', 0, 65535, 0)});
      console.log(`LocalSutra report API listening on 127.0.0.1:${started.address.port}. Token not printed. Ctrl+C to stop.`);
      return;
    }
    case 'demo': {
      const dir = path.resolve(o.out ?? 'localsutra-demo');
      const {artifacts} = await runAudit();
      const demo = {hardware: artifacts['hardware-profile'], fit: artifacts['model-fit-report'], runtime: artifacts['runtime-diagnostics'], benchmark: artifacts['benchmark-results'], privacy: artifacts['privacy-check']};
      for (const [name, r] of Object.entries(demo)) await save(path.join(dir, name), r, {force: Boolean(o.force)});
      console.log(`Demo complete: ${dir}${path.sep}{hardware,fit,runtime,benchmark,privacy}.{json,md,html}`);
      return;
    }
    case 'audit': {
      const outDir = path.resolve(o.out ?? 'localsutra-audit');
      const {summary, artifacts} = await runAudit();
      const hashes = {};
      const {sha256} = await import('../core/util.mjs');
      for (const [name, r] of Object.entries(artifacts)) {
        await save(path.join(outDir, 'artifacts', name), r, {force: Boolean(o.force)});
        hashes[`artifacts/${name}.json`] = sha256(formats(r).json);
      }
      const {seal} = await import('../core/util.mjs');
      const {evidence: _drop, ...bare} = summary;
      const final = seal({...bare, artifacts: hashes});
      await save(path.join(outDir, 'audit-report'), final, {force: Boolean(o.force)});
      if (!o.quiet) console.log(`Audit verdict: ${final.verdict} (${final.assurance.passed} passed, ${final.assurance.failed} failed, ${final.assurance.skipped} skipped of ${final.assurance.total})\nReports: ${path.join(outDir, 'audit-report.html')}  (.md, .json alongside)`);
      if (final.verdict === 'BLOCKED_UNSAFE') process.exitCode = 1;
      return;
    }
    default: throw new Error(`Unknown command: ${command}. Run "localsutra help".`);
  }
  if (o.out) console.log(`Report: ${await save(o.out, report, {force: Boolean(o.force)})}.{json,md,html}`); else emit(report, o);
}

const invoked = process.argv[1] && await realpath(process.argv[1]).then(p => p === fileURLToPath(import.meta.url), () => false);
if (invoked) main().catch(e => { console.error('LocalSutra: ' + e.message); process.exitCode = 1; });
export {ROOT};
