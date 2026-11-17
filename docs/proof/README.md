# Proof of the recorded run

Regenerate: `npm run proof`. These files are machine output, not hand-written.

| Field | Value |
|---|---|
| Tool | localsutra-ai 0.2.1 |
| Node / platform | v24.15.0 · win32/x64 |
| Recorded | 2026-11-17T17:19:18.302Z |
| Tests | 126 |
| Passed | 126 |
| Failed | 0 |
| Skipped | 0 |
| Fuzz | 9500 hostile inputs, 0 unexpected crashes |
| Audit sample exit code | 0 |

Files: `test-run.tap`, `environment.json`, `fuzz-results.json`, `cli-*.txt`, `audit-sample/` (real JSON + MD + HTML audit), `SHA256SUMS.txt`.

**Limits:** one machine, one run. It shows the software behaves as documented on that host. It does not show results on other operating systems (see the GitHub Actions matrix), live inference on a real Ollama or llama.cpp model (not run), GPU detection on non-NVIDIA hardware, native IDE skill activation, or real-world adoption.
