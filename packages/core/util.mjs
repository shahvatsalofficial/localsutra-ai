import {createHash, timingSafeEqual} from 'node:crypto';
import {readFile, lstat, mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';

export function assert(ok, msg) { if (!ok) throw new Error(msg); }

export function number(v, name, min, max) {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v);
  assert(Number.isFinite(n) && n >= min && n <= max, `${name} must be ${min}..${max}`);
  return n;
}

export const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
export const sha256 = hash;

// Stable serialisation: sorted keys, `undefined` members dropped so a JSON round-trip never changes the seal.
export function canonical(x) {
  if (Array.isArray(x)) return `[${x.map(v => (v === undefined ? 'null' : canonical(v))).join(',')}]`;
  if (x !== null && typeof x === 'object') {
    return `{${Object.keys(x).filter(k => x[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`;
  }
  return JSON.stringify(x);
}

// A seal is integrity (detects change), not identity (it proves no signer).
export function seal(payload) { return {...payload, evidence: {algorithm: 'sha256', sha256: hash(canonical(payload))}}; }

export function verifySeal(x) {
  if (!x || typeof x !== 'object' || !x.evidence || typeof x.evidence !== 'object') return false;
  const {evidence, ...bare} = x;
  const expected = evidence.sha256;
  if (typeof expected !== 'string' || expected.length !== 64) return false;
  return timingSafeEqual(Buffer.from(hash(canonical(bare))), Buffer.from(expected));
}

export async function loadJSON(file, max = 1000000) {
  const st = await lstat(file);
  assert(st.isFile() && !st.isSymbolicLink() && st.size <= max, 'Input must be a bounded regular file');
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { throw new Error('Input is not valid JSON'); }
}

export async function saveJSON(file, x) {
  const dest = resolve(file);
  await mkdir(dirname(dest), {recursive: true});
  await writeFile(dest, JSON.stringify(x, null, 2) + '\n', {flag: 'wx'});
  return dest;
}

// Endpoint policy: http, concrete loopback IP only, no credentials, path, query or fragment.
export function safeUrl(endpoint) {
  let u;
  try { u = new URL(endpoint); } catch { throw new Error('Invalid runtime endpoint URL'); }
  assert(u.protocol === 'http:', 'Only http loopback is allowed');
  assert(['127.0.0.1', '[::1]'].includes(u.hostname), 'Non-loopback runtime endpoint blocked');
  assert(!u.username && !u.password && !u.search && !u.hash && u.pathname === '/', 'Runtime endpoint must be a bare loopback origin without credentials/path/query');
  return u;
}

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{12,}/g, /gh[pousr]_[a-zA-Z0-9]{12,}/g, /github_pat_[a-zA-Z0-9_]{20,}/g, /npm_[a-zA-Z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g, /Bearer\s+[a-zA-Z0-9_.-]{12,}/g, /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g
];
export function redact(text) {
  let s = String(text);
  for (const re of SECRET_PATTERNS) s = s.replace(re, '[REDACTED]');
  return s.replace(/([A-Z_]*(?:TOKEN|PASSWORD|SECRET|API_KEY)[A-Z_]*\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

export const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
// C0 controls and bidirectional-override characters are removed from text that reaches reports.
const CONTROLS = /[\u0000-\u0008\u000b-\u001f\u007f‪-‮⁦-⁩]/g;
// Markdown table/inline safety: neutralise pipes, newlines, HTML and control characters.
export const markdownSafe = v => String(v ?? '').replace(CONTROLS, '').replace(/\r?\n/g, ' ').replaceAll('|', '\\|').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const cleanText = (v, max = 120) => String(v ?? '').replace(CONTROLS, ' ').replace(/[\r\n\t]/g, ' ').trim().slice(0, max);

export const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
export function median(xs) { const a = [...xs].sort((x, y) => x - y), m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
export function summary(xs) {
  assert(Array.isArray(xs) && xs.length > 0, 'At least one sample required');
  const a = [...xs].sort((x, y) => x - y), m = mean(xs);
  const stdev = xs.length > 1 ? Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1)) : 0;
  return {samples: a.length, mean: m, median: median(xs), p95: a[Math.ceil(0.95 * a.length) - 1], min: a[0], max: a.at(-1), stdev};
}
