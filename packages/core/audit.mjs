import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {mkdtemp, mkdir, writeFile, readFile, symlink, rm} from 'node:fs/promises';
import {profileHost, fitModel, fitCatalog, parseNvidiaSmi} from './hardware.mjs';
import {probeRuntime, inferOllama, runtimeEndpoint} from './runtime.mjs';
import {benchmark, compare} from './bench.mjs';
import {privacyAudit} from './privacy.mjs';
import {installSkills, IDE_DIRS} from './install.mjs';
import {seal, verifySeal, safeUrl, redact, loadJSON} from './util.mjs';
import {formats} from '../reporting/index.mjs';
import {startServer} from '../server/index.mjs';
import {VERSION} from './version.mjs';

const SELF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_SYSTEM = {platform: () => 'linux', arch: () => 'x64', totalmem: () => 16e9, freemem: () => 8e9, cpus: () => [{model: 'Fixture CPU'}, {}], release: () => '6.0.0'};
const NO_TOOLS = () => false;
const NO_DISK = () => ({freeBytes: 100e9});

async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((ok, bad) => { server.once('error', bad); server.listen(0, '127.0.0.1', ok); });
  try { return await fn(`http://127.0.0.1:${server.address().port}/`); }
  finally { server.closeAllConnections?.(); await new Promise(ok => server.close(ok)); }
}
const jsonHandler = body => (_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };

// Each assurance check runs the real code on an adversarial or negative-control input and records what happened.
async function assurance(tmp) {
  const checks = [];
  const add = async (id, title, expected, fn) => {
    try { const r = await fn(); checks.push({id, title, expected, observed: r.observed, result: r.skip ? 'skipped' : r.ok ? 'pass' : 'fail'}); }
    catch (e) { checks.push({id, title, expected, observed: `threw: ${e.message}`.slice(0, 160), result: 'fail'}); }
  };
  const rejects = async (fn, re) => { try { await fn(); return {ok: false, observed: 'no error raised'}; } catch (e) { return {ok: re.test(e.message), observed: `rejected: ${e.message.slice(0, 80)}`}; } };
  const hw = profileHost({system: FIXTURE_SYSTEM, commands: NO_TOOLS, disk: NO_DISK});
  const model = {id: 'audit-3b', parametersB: 3, bitsPerWeight: 4, contextTokens: 4096};

  const badEndpoints = ['https://127.0.0.1:11434/', 'http://example.com:11434/', 'http://127.0.0.2:11434/', 'http://169.254.169.254/', 'http://localhost:11434/', 'http://user:pass@127.0.0.1:11434/', 'http://127.0.0.1:11434/x', 'http://127.0.0.1:11434/?a=1', 'http://[::ffff:7f00:1]:11434/', 'http://0.0.0.0:11434/'];
  await add('A01', `${badEndpoints.length} non-loopback or malformed endpoints are refused`, 'all refused', async () => {
    const accepted = badEndpoints.filter(u => { try { safeUrl(u); return true; } catch { return false; } });
    return {ok: accepted.length === 0, observed: accepted.length ? `ACCEPTED: ${accepted.join(', ')}` : `${badEndpoints.length}/${badEndpoints.length} refused`};
  });
  await add('A02', 'Blocked endpoint never reaches the network layer', 'fetch not called', async () => {
    let called = false;
    const r = await rejects(() => probeRuntime('ollama', {endpoint: 'http://cloud.example/', fetchFn: async () => { called = true; }}), /loopback/);
    return {ok: r.ok && !called, observed: `${r.observed}; fetch called=${called}`};
  });
  await add('A03', 'HTTP redirect from a runtime is refused, not followed', 'failureCode=redirect_refused', () => withServer((_q, res) => { res.writeHead(302, {location: 'http://127.0.0.1:1/'}); res.end(); }, async url => {
    const r = await probeRuntime('ollama', {endpoint: url});
    return {ok: r.status === 'unavailable' && r.failureCode === 'redirect_refused', observed: `status=${r.status}; code=${r.failureCode}`};
  }));
  await add('A04', 'Oversized runtime response is cut off', 'failureCode=response_too_large', () => withServer((_q, res) => { res.setHeader('content-type', 'application/json'); res.write('{"models":["' + 'x'.repeat(400000)); res.end('"]}'); }, async url => {
    const r = await probeRuntime('ollama', {endpoint: url});
    return {ok: r.failureCode === 'response_too_large', observed: `code=${r.failureCode}`};
  }));
  await add('A05', 'Hung runtime hits the timeout', 'failureCode=timeout', () => withServer(() => {}, async url => {
    const r = await probeRuntime('ollama', {endpoint: url, timeoutMs: 200});
    return {ok: r.failureCode === 'timeout', observed: `code=${r.failureCode}`};
  }));
  await add('A06', 'Malformed JSON from a runtime cannot pass as healthy', 'status=unavailable', () => withServer((_q, res) => res.end('not json {'), async url => {
    const r = await probeRuntime('ollama', {endpoint: url});
    return {ok: r.status === 'unavailable' && r.failureCode === 'invalid_payload', observed: `status=${r.status}; code=${r.failureCode}`};
  }));
  await add('A07', 'Closed port is reported unreachable, not healthy', 'failureCode=unreachable', async () => {
    const r = await probeRuntime('llama', {endpoint: 'http://127.0.0.1:1/', timeoutMs: 800});
    return {ok: r.status === 'unavailable' && r.failureCode === 'unreachable', observed: `code=${r.failureCode}`};
  });
  await add('B01', 'Model listing is never presented as inference speed', 'inference listed under notTested', () => withServer(jsonHandler({models: [{name: 'fixture-model', size: 123}]}), async url => {
    const r = await probeRuntime('ollama', {endpoint: url});
    return {ok: r.status === 'responding' && r.notTested.includes('inference speed') && r.models.length === 1, observed: `status=${r.status}; models=${r.models.length}`};
  }));
  await add('B02', 'Inference report never contains prompt or output text', 'no prompt/output in report', async () => {
    const r = await inferOllama({model: 'm', prompt: 'PRIVATE-PROMPT-TEXT', runs: 2, fetchFn: async () => new Response(JSON.stringify({done: true, eval_count: 8, eval_duration: 2e9, response: 'PRIVATE-OUTPUT-TEXT'}))});
    const s = JSON.stringify(r);
    return {ok: !s.includes('PRIVATE-PROMPT') && !s.includes('PRIVATE-OUTPUT') && r.samples.length === 2, observed: `prompt echoed=${s.includes('PRIVATE-PROMPT')}; output echoed=${s.includes('PRIVATE-OUTPUT')}`};
  });
  await add('B03', 'A failed inference creates no fake samples', 'error raised', () => rejects(() => inferOllama({model: 'm', fetchFn: async () => new Response('{"error":"nope"}', {status: 404})}), /HTTP 404/));
  await add('B04', 'Missing token counters stay null, not invented', 'evalTokens=null', async () => {
    const r = await inferOllama({model: 'm', runs: 1, fetchFn: async () => new Response(JSON.stringify({done: true}))});
    return {ok: r.samples[0].evalTokens === null && r.samples[0].reportedTokensPerSecond === null, observed: `tokens=${r.samples[0].evalTokens}; tok/s=${r.samples[0].reportedTokensPerSecond}`};
  });
  await add('C01', 'Fit estimate is labelled heuristic with speed unknown', 'heuristic_not_measured', async () => {
    const f = fitModel(model, hw);
    return {ok: f.estimate.kind === 'heuristic_not_measured' && f.estimate.speed === 'unknown' && f.estimate.modelQuality === 'unknown', observed: `${f.estimate.kind}; speed=${f.estimate.speed}`};
  });
  await add('C02', '90B model on a 8 GB free-RAM host is not marked fitting', 'likely_insufficient_ram', async () => {
    const f = fitModel({...model, parametersB: 90}, hw);
    return {ok: f.estimate.fitCategory === 'likely_insufficient_ram', observed: f.estimate.fitCategory};
  });
  await add('C03', 'Nonsense model descriptors are rejected', 'all rejected', async () => {
    const bad = [{...model, parametersB: -1}, {...model, bitsPerWeight: 0}, {...model, contextTokens: 1e9}, {...model, parametersB: 'NaN'}, null];
    const accepted = bad.filter(m => { try { fitModel(m, hw); return true; } catch { return false; } });
    return {ok: accepted.length === 0, observed: `${bad.length - accepted.length}/${bad.length} rejected`};
  });
  await add('C04', 'Duplicate model ids in a catalog are rejected', 'error', () => rejects(async () => fitCatalog([model, model], hw), /unique/));
  await add('D01', 'No GPU probe means GPU is "unknown", never invented', 'gpu.status=unknown', async () => ({ok: hw.profile.gpu.status === 'unknown' && hw.profile.npu.status === 'unknown', observed: `gpu=${hw.profile.gpu.status}; npu=${hw.profile.npu.status}`}));
  await add('D02', 'Garbage nvidia-smi output yields "unknown"', 'unknown', async () => {
    const bad = ['', 'Segmentation fault', 'RTX, abc, 1.0', 'a,b', '<script>,8192,550.1'].map(parseNvidiaSmi);
    return {ok: bad.every(x => x.status === 'unknown'), observed: bad.map(x => x.status).join(',')};
  });
  await add('D03', 'Valid nvidia-smi output is parsed from the probe only', 'detected, VRAM from output', async () => {
    const h = profileHost({system: FIXTURE_SYSTEM, commands: n => n === 'nvidia-smi', exec: () => 'Fixture GPU, 8192, 551.23\n', disk: NO_DISK});
    return {ok: h.profile.gpu.status === 'detected' && h.profile.gpu.vramBytes === 8192 * 1048576, observed: `gpu=${h.profile.gpu.status}; vramBytes=${h.profile.gpu.vramBytes}`};
  });
  await add('D04', 'A tool on PATH is reported as found, never "working"', 'no capability implied', async () => ({ok: !('ollamaWorking' in hw.profile.tools), observed: 'tools.* are PATH presence only'}));
  await add('E01', 'Tampered report fails the integrity seal', 'verify=false', async () => { const x = structuredClone(hw); x.profile.ramBytes = 1; return {ok: verifySeal(hw) && !verifySeal(x), observed: `original=${verifySeal(hw)}; tampered=${verifySeal(x)}`}; });
  await add('E02', 'Seal survives a JSON round-trip', 'verify=true', async () => ({ok: verifySeal(JSON.parse(JSON.stringify(fitModel(model, hw)))), observed: 'round-trip verified'}));
  await add('E03', 'Secret patterns are redacted from text', 'no token in output', async () => {
    const out = redact('ghp_123456789012345678901234 API_KEY=hunter2hunter2 sk-abcdefghijklmnopqrstuv Bearer abcdefghijklmnop1234');
    return {ok: !/ghp_1|hunter2|sk-abc|abcdefghijklmnop1234/.test(out), observed: out};
  });
  await add('E04', 'HTML report escapes untrusted markup', 'no <script> element', async () => {
    const h = formats(seal({schema: 'localsutra.x.v1', note: '<script>alert(1)</script>'})).html;
    return {ok: !/<script/i.test(h) && /&lt;script&gt;/.test(h), observed: /<script/i.test(h) ? 'script present' : 'escaped'};
  });
  await add('E05', 'Markdown report neutralises table-breaking input', 'pipes escaped', async () => {
    const md = formats(seal({schema: 'localsutra.runtime.v1', runtime: 'x|y', endpoint: 'e', networkScope: 's', status: 'a\nb', failureCode: null, httpStatus: null, detail: 'd|d', models: [{name: 'n|m', sizeBytes: 1}], notTested: []})).md;
    return {ok: !/\n\| n\|m/.test(md) && md.includes('n\\|m'), observed: 'pipe escaped in model name'};
  });
  await add('F01', 'Benchmark is labelled non-AI and bounded', 'type=synthetic_cpu_workload_not_ai_inference', async () => {
    const b = benchmark({runs: 3, iterations: 5000});
    const r = await rejects(async () => benchmark({runs: 1000}), /runs/);
    return {ok: b.type === 'synthetic_cpu_workload_not_ai_inference' && b.statistics.wallMs.samples === 3 && r.ok, observed: `${b.type}; samples=${b.statistics.wallMs.samples}; oversize run ${r.observed}`};
  });
  await add('F02', 'Unlike workloads are refused as not comparable', 'error', () => rejects(async () => compare(benchmark({runs: 2, iterations: 1000}), benchmark({runs: 2, iterations: 2000})), /not comparable/));
  await add('G01', 'Privacy audit does not claim runtime egress is safe', 'modelRuntimeEgress=not_tested', async () => { const p = privacyAudit({endpoint: 'https://api.example.com/'}); return {ok: p.claims.modelRuntimeEgress === 'not_tested' && p.endpointAllowed === false, observed: `egress=${p.claims.modelRuntimeEgress}; remote allowed=${p.endpointAllowed}`}; });
  await add('H01', 'Skill installer is idempotent and never overwrites', 'second run skips; custom file kept', async () => {
    const dest = await mkdtemp(path.join(tmp, 'inst-'));
    await mkdir(path.join(dest, '.claude', 'skills', 'localsutra-prime'), {recursive: true});
    await writeFile(path.join(dest, '.claude', 'skills', 'localsutra-prime', 'SKILL.md'), 'CUSTOM');
    const a = await installSkills(dest, 'claude'), b = await installSkills(dest, 'claude');
    const kept = await readFile(path.join(dest, '.claude', 'skills', 'localsutra-prime', 'SKILL.md'), 'utf8');
    return {ok: kept === 'CUSTOM' && a.skipped === 1 && b.written === 0 && b.skipped === a.planned, observed: `first written=${a.written}/skipped=${a.skipped}; second written=${b.written}; custom kept=${kept === 'CUSTOM'}`};
  });
  await add('H02', 'Installer writes the documented path for all six IDEs', '6 layouts, 25 skills each', async () => {
    const seen = [];
    for (const ide of Object.keys(IDE_DIRS)) { const d = await mkdtemp(path.join(tmp, 'ide-')); const r = await installSkills(d, ide); seen.push(`${ide}:${r.written}`); if (r.written !== 25 || r.target !== IDE_DIRS[ide]) return {ok: false, observed: seen.join(' ')}; }
    return {ok: true, observed: seen.join(' ')};
  });
  await add('H03', 'Installer refuses a symlinked project root', 'error (or skipped when the OS forbids symlinks)', async () => {
    const real = await mkdtemp(path.join(tmp, 'real-')), link = path.join(tmp, 'link');
    try { await symlink(real, link, 'junction'); } catch (e) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(e.code)) return {skip: true, observed: `symlink creation not permitted on this host (${e.code})`}; throw e; }
    return rejects(() => installSkills(link, 'claude'), /real directory/);
  });
  await add('H04', 'Installer refuses a symlinked .claude directory', 'error (or skipped)', async () => {
    const proj = await mkdtemp(path.join(tmp, 'proj-')), outside = await mkdtemp(path.join(tmp, 'out-'));
    try { await symlink(outside, path.join(proj, '.claude'), 'junction'); } catch (e) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(e.code)) return {skip: true, observed: `symlink creation not permitted on this host (${e.code})`}; throw e; }
    return rejects(() => installSkills(proj, 'claude'), /symlink/);
  });
  await add('H05', 'Installer dry-run writes nothing', 'no files created', async () => {
    const d = await mkdtemp(path.join(tmp, 'dry-')); const r = await installSkills(d, 'cursor', {dryRun: true});
    let exists = true; try { await readFile(path.join(d, '.cursor', 'skills', 'localsutra-prime', 'SKILL.md')); } catch { exists = false; }
    return {ok: r.dryRun && r.planned === 25 && !exists, observed: `planned=${r.planned}; file exists=${exists}`};
  });
  await add('I01', 'Report server: 401 without token, 405 for POST, 127.0.0.1 only', '401 / 200 / 405 / 127.0.0.1', async () => {
    const f = path.join(tmp, 'srv.json'); await writeFile(f, JSON.stringify(hw));
    let srv; try { srv = await startServer({reportFile: f, token: 'audit-probe-token-1234567890'}); } catch (e) { return {skip: true, observed: `could not bind loopback (${e.code || e.message})`}; }
    try {
      const base = `http://127.0.0.1:${srv.address.port}/report`, auth = {authorization: 'Bearer audit-probe-token-1234567890'};
      const none = await fetch(base), wrong = await fetch(base, {headers: {authorization: 'Bearer wrong-wrong-wrong-wrong-wrong'}}), ok = await fetch(base, {headers: auth}), post = await fetch(base, {method: 'POST', headers: auth});
      return {ok: none.status === 401 && wrong.status === 401 && ok.status === 200 && post.status === 405 && srv.address.address === '127.0.0.1', observed: `none=${none.status}; wrong=${wrong.status}; valid=${ok.status}; POST=${post.status}; bind=${srv.address.address}`};
    } finally { srv.server.closeAllConnections?.(); srv.server.close(); }
  });
  await add('I02', 'Server refuses a weak token and an unsealed report', 'both refused', async () => {
    const f = path.join(tmp, 'bad.json'); await writeFile(f, JSON.stringify({schema: 'localsutra.x.v1', evidence: {algorithm: 'sha256', sha256: 'a'.repeat(64)}}));
    const a = await rejects(() => startServer({reportFile: f, token: 'short'}), /token/), b = await rejects(() => startServer({reportFile: f, token: 'x'.repeat(32)}), /sealed/);
    return {ok: a.ok && b.ok, observed: `weak token: ${a.observed}; bad seal: ${b.observed}`};
  });
  await add('J01', 'Negative control: unsupported runtime kind is refused', 'error', () => rejects(async () => runtimeEndpoint('cloud'), /ollama or llama/));
  await add('J02', 'Negative control: empty catalog is refused', 'error', () => rejects(async () => fitCatalog([], hw), /catalog/));
  await add('J03', 'Negative control: oversized JSON input is refused', 'error', async () => { const f = path.join(tmp, 'big.json'); await writeFile(f, ' '.repeat(2000)); return rejects(() => loadJSON(f, 100), /bounded/); });
  return checks;
}

export async function runAudit({now = new Date().toISOString()} = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'localsutra-audit-'));
  try {
    const hostProfile = profileHost();
    const fixtureHw = profileHost({system: FIXTURE_SYSTEM, commands: NO_TOOLS, disk: NO_DISK});
    const catalogFile = await loadJSON(path.join(SELF, 'fixtures/model-catalog.json'));
    const fit = fitCatalog(catalogFile.models, fixtureHw);
    const runtime = await withServer(jsonHandler({models: [{name: 'mock-model:3b', size: 1900000000}]}), url => probeRuntime('ollama', {endpoint: url}));
    const bench = benchmark({runs: 5, iterations: 50000});
    const privacy = privacyAudit({endpoint: 'http://127.0.0.1:11434/'});
    const checks = await assurance(tmp);
    const failed = checks.filter(c => c.result === 'fail').length, skipped = checks.filter(c => c.result === 'skipped').length;
    const verdict = failed ? 'BLOCKED_UNSAFE' : skipped ? 'REVIEW_REQUIRED' : 'APPROVED_WITH_EVIDENCE';
    const summary = seal({
      schema: 'localsutra.audit.v1', toolVersion: VERSION, recordedAt: now, verdict,
      verdictRule: 'BLOCKED_UNSAFE if any safety-gate check fails; REVIEW_REQUIRED if every check passed but some were skipped on this host; APPROVED_WITH_EVIDENCE if all ran and passed. Even then this is evidence for a human reviewer, not certification, and live model inference is always listed as not tested.',
      environment: {node: process.version, platform: process.platform, arch: process.arch, cpuModel: hostProfile.profile.cpuModel, wsl: hostProfile.profile.wsl},
      assurance: {total: checks.length, passed: checks.filter(c => c.result === 'pass').length, failed, skipped, checks},
      samples: [
        {capability: 'Hardware profile (this host)', result: `${hostProfile.profile.os}/${hostProfile.profile.architecture}, ${hostProfile.profile.cpuLogical} logical CPUs, GPU ${hostProfile.profile.gpu.status}`},
        {capability: 'Model fit (fixture host, 8 GB free RAM, synthetic catalog)', result: `${fit.summary.possiblyFits} of ${fit.summary.total} possibly fit; heuristic only`},
        {capability: 'Runtime probe (mock loopback Ollama, not a real runtime)', result: `status ${runtime.status}; ${runtime.models.length} model listed; inference not tested`},
        {capability: 'Synthetic CPU benchmark (not AI)', result: `${bench.runs} runs, median ${bench.statistics.wallMs.median.toFixed(2)} ms, stdev ${bench.statistics.wallMs.stdev.toFixed(2)} ms`},
        {capability: 'Privacy boundary', result: `loopback endpoint allowed=${privacy.endpointAllowed}; runtime egress ${privacy.claims.modelRuntimeEgress}`}
      ],
      evidenceTiers: [
        {artifact: 'hardware-profile.json', tier: 'MEASURED_LOCAL', proves: 'Values Node and fixed nvidia-smi argv reported on this host at this time', doesNotProve: 'Capability of any other device, or that a model will run'},
        {artifact: 'model-fit-report.json', tier: 'HEURISTIC', proves: 'Result of a stated memory formula on synthetic descriptors', doesNotProve: 'That any model loads, its speed or its quality'},
        {artifact: 'runtime-diagnostics.json', tier: 'MOCK_FIXTURE', proves: 'Probe logic against a local mock HTTP service', doesNotProve: 'Behaviour of a real Ollama or llama.cpp install (not run)'},
        {artifact: 'benchmark-results.json', tier: 'MEASURED_LOCAL', proves: 'Timing of a synthetic CPU loop', doesNotProve: 'Any AI inference performance, GPU, power or quality'},
        {artifact: 'privacy-check.json', tier: 'RULE_CHECK', proves: 'Endpoint validation rules and the data inventory', doesNotProve: 'That an external runtime sends no network traffic'}
      ],
      notTested: [
        'Live inference against a real Ollama or llama.cpp model (live inference: not run; no model is assumed to be installed)',
        'GPU detection on AMD, Intel, Apple or NPU hardware (reported unknown, not absent)',
        'Native skill activation inside Claude Code, Cursor, Codex, Gemini CLI, Copilot or OpenCode (file copying is verified; host execution is not)',
        'Network egress of any external runtime (needs external monitoring)',
        'Results on other operating systems than the host named above; see the CI matrix for those',
        'Independent third-party security review, signed releases and SBOM (planned)'
      ]
    });
    const artifacts = {'hardware-profile': hostProfile, 'model-fit-report': fit, 'runtime-diagnostics': runtime, 'benchmark-results': bench, 'privacy-check': privacy};
    return {summary, artifacts};
  } finally { await rm(tmp, {recursive: true, force: true}).catch(() => {}); }
}
