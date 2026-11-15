import {assert, safeUrl, redact, seal, summary, number, hash, cleanText} from './util.mjs';

const PORTS = {ollama: 11434, llama: 8080};
const PATHS = {ollama: '/api/tags', llama: '/health'};
const MAX_PROBE_BYTES = 262144;

export function runtimeEndpoint(kind, base) {
  assert(PORTS[kind], 'Runtime must be ollama or llama');
  const u = safeUrl(base ?? `http://127.0.0.1:${PORTS[kind]}/`);
  return new URL(PATHS[kind], u).href;
}

// Reads at most maxBytes; refuses on content-length or on bytes actually received.
async function limitedResponse(res, maxBytes = MAX_PROBE_BYTES) {
  const declared = Number(res.headers.get('content-length') || 0);
  assert(!declared || declared <= maxBytes, 'Runtime response too large');
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      assert(size <= maxBytes, 'Runtime response too large');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}

// Stable failure codes so callers can branch without parsing prose.
export function classifyFailure(e) {
  const text = `${e?.name ?? ''} ${e?.message ?? ''} ${e?.cause?.message ?? ''} ${e?.cause?.code ?? ''}`;
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'timeout';
  if (/redirect/i.test(text)) return 'redirect_refused';
  if (/too large/i.test(text)) return 'response_too_large';
  if (e instanceof SyntaxError || /Invalid (Ollama|response)|payload/i.test(text)) return 'invalid_payload';
  if (/ECONNREFUSED|refused|fetch failed|ECONNRESET|ENOTFOUND/i.test(text)) return 'unreachable';
  return 'error';
}

export async function probeRuntime(kind, {endpoint, fetchFn = fetch, timeoutMs = 2500} = {}) {
  const target = runtimeEndpoint(kind, endpoint);
  number(timeoutMs, 'timeoutMs', 100, 10000);
  let status = 'unavailable', detail = 'Unable to reach loopback service', failureCode = 'unreachable', models = [], httpStatus = null;
  try {
    const res = await fetchFn(target, {method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs)});
    assert(res.status >= 100 && res.status < 600, 'Invalid response');
    httpStatus = res.status;
    const body = await limitedResponse(res);
    if (res.ok) {
      const parsed = JSON.parse(body);
      if (kind === 'ollama') {
        assert(parsed && Array.isArray(parsed.models), 'Invalid Ollama tags payload');
        models = parsed.models.slice(0, 50).map(m => ({name: cleanText(m?.name ?? 'unknown'), sizeBytes: Number.isFinite(m?.size) ? m.size : null}));
        status = 'responding'; failureCode = null;
        detail = 'Ollama list endpoint responded; inference has not been tested';
      } else {
        const ready = parsed?.status === 'ok';
        status = ready ? 'responding' : 'not_ready'; failureCode = ready ? null : 'not_ready';
        detail = ready ? 'llama.cpp /health returned ok; inference not tested' : 'llama.cpp /health not ready';
      }
    } else { status = 'not_ready'; failureCode = 'http_error'; detail = `Runtime returned HTTP ${res.status}`; }
  } catch (e) {
    failureCode = classifyFailure(e);
    detail = `Loopback check failed (${failureCode}): ${redact(e?.name === 'TimeoutError' ? 'request timed out' : e?.message).slice(0, 160)}`;
  }
  return seal({
    schema: 'localsutra.runtime.v1', runtime: kind, endpoint: target, networkScope: 'loopback_get_only', status, failureCode, httpStatus, detail, models,
    notTested: ['inference speed', 'prompt privacy within runtime', 'network egress by external runtime']
  });
}

export async function inferOllama({model, prompt = 'LocalSutra benchmark: respond with one word.', runs = 2, endpoint, fetchFn = fetch, timeoutMs = 30000} = {}) {
  assert(typeof model === 'string' && model.trim() && model.length <= 120 && !/[\r\n]/.test(model), 'Installed model ID required');
  assert(typeof prompt === 'string' && prompt.length <= 2000, 'Prompt too long');
  number(runs, 'runs', 1, 5);
  number(timeoutMs, 'timeoutMs', 200, 120000);
  const url = new URL('/api/generate', safeUrl(endpoint ?? 'http://127.0.0.1:11434/')).href;
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const started = process.hrtime.bigint(), rssBefore = process.memoryUsage().rss;
    const res = await fetchFn(url, {method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs), headers: {'content-type': 'application/json'}, body: JSON.stringify({model, prompt, stream: false, options: {num_predict: 32}})});
    const text = await limitedResponse(res, 300000);
    assert(res.ok, `Local Ollama inference returned HTTP ${res.status}`);
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error('Local Ollama returned a non-JSON response'); }
    assert(parsed.done === true, 'Local Ollama response did not indicate completion');
    const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
    const evalTokens = Number.isFinite(parsed.eval_count) ? parsed.eval_count : null;
    const evalDurationNs = Number.isFinite(parsed.eval_duration) ? parsed.eval_duration : null;
    samples.push({
      run: i + 1, phase: i === 0 ? 'cold_or_first' : 'warm', wallMs, processRssBeforeBytes: rssBefore, processRssAfterBytes: process.memoryUsage().rss, evalTokens, evalDurationNs,
      reportedTokensPerSecond: evalTokens !== null && evalDurationNs > 0 ? evalTokens / (evalDurationNs / 1e9) : null
    });
  }
  return seal({
    schema: 'localsutra.inference.v1', runtime: 'ollama', model: cleanText(model), endpoint: url, mode: 'explicit_opt_in', runs, promptHash: hash(prompt),
    timing: summary(samples.map(s => s.wallMs)), samples,
    limitations: [
      'Wall timing includes HTTP overhead and, on the first run, model load time',
      'Process RSS measures this CLI, not the Ollama process',
      'Token counters are used only where Ollama reported them',
      'A loopback destination does not prove the external runtime has no egress',
      'Prompt and output text are intentionally not recorded (hash only)'
    ]
  });
}
