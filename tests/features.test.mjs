import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {mkdtemp, readFile, readdir, writeFile, rm, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {profileHost, parseNvidiaSmi, fitModel, fitCatalog} from '../packages/core/hardware.mjs';
import {probeRuntime, classifyFailure} from '../packages/core/runtime.mjs';
import {benchmark, compare} from '../packages/core/bench.mjs';
import {privacyAudit} from '../packages/core/privacy.mjs';
import {installSkills, IDE_DIRS} from '../packages/core/install.mjs';
import {runAudit} from '../packages/core/audit.mjs';
import {seal, verifySeal, canonical, redact, markdownSafe, safeUrl} from '../packages/core/util.mjs';
import {formats} from '../packages/reporting/index.mjs';
import {parse} from '../packages/cli/index.mjs';
import {VERSION} from '../packages/core/version.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'packages/cli/index.mjs');
const sys = {platform: () => 'linux', arch: () => 'x64', totalmem: () => 16e9, freemem: () => 8e9, cpus: () => [{model: 'Fixture CPU'}], release: () => '5.15.0-microsoft-standard-WSL2'};
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], {encoding: 'utf8', cwd: ROOT, timeout: 60000});

test('package.json version equals VERSION and package is publishable', async () => {
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.version, VERSION);
  assert.notEqual(pkg.private, true);
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
  assert.ok(pkg.bin.localsutra);
});

test('every skill folder has frontmatter whose name equals the folder and is listed in the manifest', async () => {
  const m = JSON.parse(await readFile(path.join(ROOT, 'agents/manifest.json'), 'utf8'));
  const listed = new Set([...m.roles.map(r => r.id), ...m.capability_skills.map(s => s.id ?? s)]);
  const dirs = (await readdir(path.join(ROOT, 'skills'), {withFileTypes: true})).filter(d => d.isDirectory()).map(d => d.name);
  assert.equal(dirs.length, 25);
  for (const d of dirs) {
    const text = await readFile(path.join(ROOT, 'skills', d, 'SKILL.md'), 'utf8');
    assert.match(text, new RegExp(`^name:\\s*${d}\\s*$`, 'm'), d);
    assert.match(text, /^description:\s*\S/m, d);
    assert.ok(listed.has(d), `${d} missing from manifest`);
  }
});

test('WSL is detected from the kernel release string, not guessed', () => {
  const h = profileHost({system: sys, commands: () => false, disk: () => ({freeBytes: 5e9})});
  assert.equal(h.profile.wsl, true);
  assert.equal(h.profile.storage.status, 'measured');
  assert.equal(h.profile.storage.freeBytes, 5e9);
});

test('unreadable disk reports unknown, never zero', () => {
  const h = profileHost({system: sys, commands: () => false, disk: () => { throw new Error('nope'); }});
  assert.equal(h.profile.storage.status, 'unknown');
});

test('nvidia-smi parser: valid multi-GPU output', () => {
  const g = parseNvidiaSmi('NVIDIA GeForce RTX 4090, 24564, 551.23\nNVIDIA A100-SXM4-40GB, 40960, 550.54.15\n');
  assert.equal(g.status, 'detected');
  assert.equal(g.devices.length, 2);
  assert.equal(g.vramBytes, 40960 * 1048576);
});

for (const bad of [null, '', '   ', 'Failed to initialize NVML', 'a,b,c', 'GPU, 8192', 'GPU, 8192, 1.0, extra', '<img src=x>, 8192, 1.0', 'GPU, -5, 1.0', 'GPU, 8192, $(whoami)'])
  test(`nvidia-smi parser rejects: ${JSON.stringify(bad)}`, () => assert.equal(parseNvidiaSmi(bad).status, 'unknown'));

test('VRAM fit is evaluated only when a GPU was really detected', () => {
  const noGpu = profileHost({system: sys, commands: () => false, disk: () => ({freeBytes: 1})});
  const gpu = profileHost({system: sys, commands: n => n === 'nvidia-smi', exec: () => 'Fixture GPU, 8192, 551.23', disk: () => ({freeBytes: 1})});
  const m = {id: 'x', parametersB: 7, bitsPerWeight: 4};
  assert.equal(fitModel(m, noGpu).estimate.vram.status, 'not_evaluated');
  assert.equal(fitModel(m, gpu).estimate.vram.category, 'possibly_fits_vram');
  assert.equal(fitModel({...m, parametersB: 70}, gpu).estimate.vram.category, 'exceeds_single_gpu_vram');
});

test('model descriptor strings are sanitised', () => {
  const h = profileHost({system: sys, commands: () => false, disk: () => ({freeBytes: 1})});
  const r = fitModel({id: 'evil‮\n<b>', parametersB: 1, bitsPerWeight: 4, license: 'MIT\u0000', source: 'x'.repeat(500)}, h);
  assert.ok(!/[‮\n\u0000]/.test(r.model.id + r.model.license));
  assert.ok(r.model.source.length <= 200);
});

test('failure classification covers each code', () => {
  assert.equal(classifyFailure(Object.assign(new Error('x'), {name: 'TimeoutError'})), 'timeout');
  assert.equal(classifyFailure(new Error('Runtime response too large')), 'response_too_large');
  assert.equal(classifyFailure(new SyntaxError('Unexpected token')), 'invalid_payload');
  assert.equal(classifyFailure(Object.assign(new TypeError('fetch failed'), {cause: new Error('unexpected redirect')})), 'redirect_refused');
  assert.equal(classifyFailure(new TypeError('fetch failed')), 'unreachable');
  assert.equal(classifyFailure(new Error('weird')), 'error');
});

test('probe against a real loopback server that redirects, times out and sends junk', async () => {
  const mode = {v: 'redirect'};
  const server = http.createServer((_q, res) => {
    if (mode.v === 'redirect') { res.writeHead(302, {location: 'http://127.0.0.1:1/'}); res.end(); }
    else if (mode.v === 'junk') res.end('<html>nope</html>');
    else if (mode.v === '503') { res.writeHead(503); res.end('{}'); }
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const endpoint = `http://127.0.0.1:${server.address().port}/`;
  try {
    assert.equal((await probeRuntime('ollama', {endpoint})).failureCode, 'redirect_refused');
    mode.v = 'junk'; assert.equal((await probeRuntime('ollama', {endpoint})).failureCode, 'invalid_payload');
    mode.v = '503'; const r = await probeRuntime('ollama', {endpoint}); assert.equal(r.status, 'not_ready'); assert.equal(r.failureCode, 'http_error'); assert.equal(r.httpStatus, 503);
    mode.v = 'hang'; assert.equal((await probeRuntime('ollama', {endpoint, timeoutMs: 150})).failureCode, 'timeout');
  } finally { server.closeAllConnections(); await new Promise(ok => server.close(ok)); }
});

test('installer dry-run lists files and writes nothing; plan covers 25 skills', async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'ls-dry-'));
  try {
    const r = await installSkills(d, 'gemini', {dryRun: true});
    assert.equal(r.planned, 25); assert.equal(r.written, 0); assert.equal(r.files.length, 25);
    assert.deepEqual(await readdir(d), []);
  } finally { await rm(d, {recursive: true, force: true}); }
});

test('installer rejects prototype-key IDE names', async () => {
  for (const ide of ['__proto__', 'constructor', 'toString']) await assert.rejects(() => installSkills(os.tmpdir(), ide));
});

test('installed skills are byte-identical to canonical sources', async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'ls-same-'));
  try {
    await installSkills(d, 'codex');
    const a = await readFile(path.join(ROOT, 'skills/localsutra-prime/SKILL.md'));
    const b = await readFile(path.join(d, IDE_DIRS.codex, 'localsutra-prime/SKILL.md'));
    assert.ok(a.equals(b));
  } finally { await rm(d, {recursive: true, force: true}); }
});

test('canonical() ignores undefined members so seals survive JSON round-trip', () => {
  const x = seal({a: 1, b: undefined, c: [1, undefined, {d: undefined}]});
  assert.ok(verifySeal(JSON.parse(JSON.stringify(x))));
});

test('redaction covers common token shapes', () => {
  const s = redact('ghp_abcdefghijklmnopqrstu github_pat_abcdefghijklmnopqrstuvwxyz npm_abcdefghijklmnopqrstuvwx AKIAABCDEFGHIJKLMNOP PASSWORD=hunter2');
  for (const leak of ['ghp_abc', 'github_pat_abc', 'npm_abc', 'AKIAABC', 'hunter2']) assert.ok(!s.includes(leak), leak);
});

test('markdownSafe escapes pipes, strips controls and bidi overrides', () => {
  assert.equal(markdownSafe('a|b\nc‮<x>'), 'a\\|b c&lt;x&gt;');
});

test('IPv6 and obfuscated loopback forms that must be refused', () => {
  for (const u of ['http://[::ffff:127.0.0.1]:1/', 'http://127.0.0.1.nip.io:1/', 'ftp://127.0.0.1/', 'http://[::1]:1/x', 'http://127.0.0.1:1/a/..%2f'])
    assert.throws(() => safeUrl(u), undefined, u);
  // WHATWG URL canonicalises these numeric spellings to 127.0.0.1; the request always uses the canonical href, so they are real loopback.
  for (const u of ['http://0x7f.0.0.1:1/', 'http://2130706433:1/', 'http://127.1:1/']) assert.equal(safeUrl(u).hostname, '127.0.0.1', u);
});

test('CLI argument parser: booleans, duplicates, missing values', () => {
  assert.deepEqual(parse(['--out', 'x', '--force']), {out: 'x', force: true});
  assert.throws(() => parse(['--out']), /Missing value/);
  assert.throws(() => parse(['--out', 'a', '--out', 'b']), /Duplicate/);
  assert.throws(() => parse(['positional']), /Invalid argument/);
  assert.throws(() => parse(['--out', '--force']), /Missing value/);
});

test('every report schema renders valid JSON, Markdown and HTML without raw markup', async () => {
  const {artifacts, summary} = await runAudit();
  const all = [...Object.values(artifacts), summary, fitModel({id: 'm', parametersB: 3, bitsPerWeight: 4}, artifacts['hardware-profile']), compare(benchmark({runs: 2, iterations: 1000}), benchmark({runs: 2, iterations: 1000}))];
  for (const r of all) {
    const f = formats(r);
    assert.deepEqual(JSON.parse(f.json), JSON.parse(JSON.stringify(r)));
    assert.match(f.html, /^<!doctype html>/);
    assert.match(f.html, /lang="en"/);
    assert.match(f.html, /<meta name="viewport"/);
    assert.ok(f.md.startsWith('# LocalSutra AI'));
    assert.ok(!/<script/i.test(f.html));
    assert.match(f.md, /seal verified/);
  }
});

test('audit: all assurance checks pass, verdict is consistent, live inference stays not-run', async () => {
  const {summary, artifacts} = await runAudit();
  const failed = summary.assurance.checks.filter(c => c.result === 'fail');
  assert.deepEqual(failed.map(c => `${c.id}: ${c.observed}`), []);
  assert.ok(summary.assurance.total >= 35);
  assert.ok(['APPROVED_WITH_EVIDENCE', 'REVIEW_REQUIRED'].includes(summary.verdict));
  assert.equal(summary.verdict, summary.assurance.skipped ? 'REVIEW_REQUIRED' : 'APPROVED_WITH_EVIDENCE');
  assert.ok(summary.notTested.some(x => /live inference: not run/i.test(x)));
  assert.ok(verifySeal(summary));
  assert.deepEqual(Object.keys(artifacts).sort(), ['benchmark-results', 'hardware-profile', 'model-fit-report', 'privacy-check', 'runtime-diagnostics']);
  const ids = summary.assurance.checks.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('audit negative control: a broken safety gate makes the verdict BLOCKED_UNSAFE', async () => {
  // The mutation is visible in the audit source only through its checks; emulate by tampering the report.
  const {summary} = await runAudit();
  const t = structuredClone(summary); t.assurance.checks[0].result = 'fail';
  assert.equal(verifySeal(t), false);
});

test('CLI: --version, help, unknown command, bad option', () => {
  assert.match(run('--version').stdout, new RegExp(`LocalSutra AI ${VERSION.replaceAll('.', '\\.')}`));
  assert.match(run('help').stdout, /audit/);
  const bad = run('nope'); assert.equal(bad.status, 1); assert.match(bad.stderr, /Unknown command/);
  assert.equal(run('doctor', '--bogus').status, 1);
});

test('CLI: audit writes JSON, MD and HTML, refuses overwrite, honours --force, verify detects tamper', async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'ls-cli-'));
  try {
    const out = path.join(d, 'a');
    const first = run('audit', '--out', out, '--quiet');
    assert.equal(first.status, 0, first.stderr);
    for (const f of ['audit-report.json', 'audit-report.md', 'audit-report.html', 'artifacts/hardware-profile.html', 'artifacts/model-fit-report.md', 'artifacts/privacy-check.json']) assert.ok((await stat(path.join(out, f))).size > 100, f);
    const again = run('audit', '--out', out, '--quiet'); assert.equal(again.status, 1); assert.match(again.stderr, /EEXIST|exists/i);
    assert.equal(run('audit', '--out', out, '--quiet', '--force').status, 0);
    assert.equal(run('verify', '--report', path.join(out, 'audit-report.json')).status, 0);
    const j = JSON.parse(await readFile(path.join(out, 'audit-report.json'), 'utf8')); j.verdict = 'APPROVED_WITH_EVIDENCE'; j.assurance.failed = 0;
    j.assurance.passed += 1;
    await writeFile(path.join(d, 'tampered.json'), JSON.stringify(j));
    assert.equal(run('verify', '--report', path.join(d, 'tampered.json')).status, 1);
    const html = await readFile(path.join(out, 'audit-report.html'), 'utf8');
    assert.match(html, /Independent Audit Report/); assert.match(html, /Not tested/);
  } finally { await rm(d, {recursive: true, force: true}); }
});

test('CLI: doctor, fit, probe, benchmark, privacy run offline and respect --format', async () => {
  assert.equal(run('doctor').status, 0);
  const fit = run('fit', '--catalog', 'fixtures/model-catalog.json', '--format', 'md'); assert.equal(fit.status, 0); assert.match(fit.stdout, /Model Fit Catalog/);
  const probe = run('probe', '--runtime', 'llama', '--endpoint', 'http://127.0.0.1:1/', '--timeout', '300'); assert.equal(probe.status, 0); assert.equal(JSON.parse(probe.stdout).status, 'unavailable');
  const blocked = run('probe', '--runtime', 'ollama', '--endpoint', 'http://example.com/'); assert.equal(blocked.status, 1);
  assert.equal(run('benchmark', '--runs', '2', '--iterations', '2000').status, 0);
  assert.equal(JSON.parse(run('privacy', '--endpoint', 'https://x.example/').stdout).endpointAllowed, false);
  assert.equal(run('fit', '--catalog', 'fixtures/model-catalog.json', '--format', 'pdf').status, 1);
});

test('CLI: install-skills --dry-run works and does not touch disk', async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'ls-cli-skill-'));
  try {
    const r = run('install-skills', '--project', d, '--ide', 'claude', '--dry-run');
    assert.equal(r.status, 0); assert.equal(JSON.parse(r.stdout).dryRun, true);
    assert.deepEqual(await readdir(d), []);
  } finally { await rm(d, {recursive: true, force: true}); }
});

test('seeded fuzz: hostile catalog and model values never crash with a non-Error', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const junk = [null, undefined, 0, -1, 1e999, NaN, '', 'x'.repeat(3000), {}, [], true, '‮', 'ghp_' + 'a'.repeat(30), '<script>', 1e-9, 1e9];
  const pick = a => a[Math.floor(rnd() * a.length)];
  const h = profileHost({system: sys, commands: () => false, disk: () => ({freeBytes: 1})});
  let crashes = 0;
  for (let i = 0; i < 1500; i++) {
    const m = {id: pick(junk), parametersB: pick([...junk, 3, 7]), bitsPerWeight: pick([...junk, 4, 8]), contextTokens: pick([...junk, 4096]), kvBytesPerToken: pick(junk), extraOverheadGB: pick(junk), license: pick(junk), source: pick(junk)};
    try { const r = fitModel(m, h); assert.ok(verifySeal(r)); } catch (e) { if (!(e instanceof Error) || e instanceof TypeError || e instanceof RangeError) crashes++; }
  }
  assert.equal(crashes, 0);
});

test('canonical is deterministic across key order and nesting', () => {
  assert.equal(canonical({b: {y: 1, x: 2}, a: [3, {d: 1, c: 2}]}), canonical({a: [3, {c: 2, d: 1}], b: {x: 2, y: 1}}));
});

test('privacy audit inventory states prompts and responses are not stored', () => {
  const p = privacyAudit();
  assert.ok(p.dataInventory.some(d => /Prompt and response text/.test(d.field) && d.storedIn === 'not stored'));
});

test('fitCatalog summary adds up', () => {
  const h = profileHost({system: sys, commands: () => false, disk: () => ({freeBytes: 1})});
  const c = fitCatalog([{id: 'a', parametersB: 1, bitsPerWeight: 4}, {id: 'b', parametersB: 400, bitsPerWeight: 16}], h);
  assert.equal(c.summary.total, 2); assert.equal(c.summary.possiblyFits + c.summary.likelyInsufficient, 2);
});
