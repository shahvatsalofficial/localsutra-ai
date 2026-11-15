import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {readFile, lstat} from 'node:fs/promises';
import {assert, verifySeal} from '../core/util.mjs';

// Read-only report API. Binds 127.0.0.1 only, requires a bearer token, serves one sealed report.
export async function startServer({reportFile, token, port = 0} = {}) {
  assert(typeof token === 'string' && token.length >= 24, 'A strong 24+ character token required');
  assert(Number.isInteger(port) && port >= 0 && port <= 65535, 'Invalid port');
  const st = await lstat(reportFile);
  assert(st.isFile() && !st.isSymbolicLink() && st.size < 3_000_000, 'Report must be a bounded regular file');
  let report;
  try { report = JSON.parse(await readFile(reportFile, 'utf8')); } catch { throw new Error('Report is not valid JSON'); }
  assert(typeof report?.schema === 'string' && report.schema.startsWith('localsutra.') && verifySeal(report), 'Not a valid sealed LocalSutra report');
  const expected = Buffer.from(`Bearer ${token}`);
  const body = JSON.stringify(report);
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    const got = Buffer.from(String(req.headers.authorization || ''));
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) { res.writeHead(401, {'content-type': 'application/json'}); res.end('{"error":"unauthorized"}'); return; }
    if (req.method !== 'GET') { res.writeHead(405, {allow: 'GET'}); res.end(); return; }
    if (req.url !== '/report') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'content-type': 'application/json; charset=utf-8'});
    res.end(body);
  });
  server.headersTimeout = 5000; server.requestTimeout = 5000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {server, address: server.address()};
}
