# Threat model (v0.2)

Assets: the user's machine, private hardware/model inventory, prompts, and trust in report claims. Trust boundary: everything read from files, runtimes, model cards and catalogs is untrusted data.

| # | Threat | Control | Test |
|---|---|---|---|
| T1 | SSRF / non-loopback endpoint | `safeUrl`: http, `127.0.0.1` or `[::1]`, no credentials/path/query/hash | audit A01, many unit cases |
| T2 | Redirect to a public URL | `redirect: "error"` | audit A03 (real 302 server) |
| T3 | Oversized or endless response | 256 KB cap on declared and received bytes | audit A04 |
| T4 | Hung runtime | `AbortSignal.timeout`, bounded 100 ms to 120 s | audit A05 |
| T5 | Malformed JSON posing as healthy | strict parse and payload shape check | audit A06, fuzz |
| T6 | IP-spelling tricks (`0x7f.1`, IPv4-mapped IPv6, `0.0.0.0`) | WHATWG canonicalisation, then exact host allow-list | unit |
| T7 | Prompt or secret leak into reports | hash-only prompts, no output text, `redact()` | audit B02, E03 |
| T8 | Fake hardware via hostile `nvidia-smi` text | strict regex parser, otherwise `unknown` | audit D02, fuzz (3,000) |
| T9 | Model card or catalog injection | descriptors validated and sanitised; text never executed | unit, fuzz |
| T10 | Report tampering | SHA-256 seal, `verify` | audit E01 |
| T11 | Report HTML/Markdown injection | escaping, control and bidi character stripping | audit E04, E05 |
| T12 | Installer symlink escape or overwrite | per-segment `lstat`, `wx` writes | audit H01, H03, H04 |
| T13 | Unauthenticated report API | 24+ char token, timing-safe compare, GET only, 127.0.0.1 | audit I01, I02 |
| T14 | Resource exhaustion | run, iteration, catalog and file limits | audit F01, J02, J03 |
| T15 | Command injection | no shell; fixed argv only | code review, tests |

## Residual risks (not mitigated here)
Ollama or llama.cpp may contact the internet (not monitored). A malicious local runtime can lie in its own counters (labelled `runtime_reported`). A hostile process running as the same user can read reports. The seal is not a signature. No independent security review yet. No timing-attack testing beyond a constant-time token compare.
