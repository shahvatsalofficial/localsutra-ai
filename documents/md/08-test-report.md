# Test Report

*Machine-generated figures from the recorded run. Regenerate with `npm run proof`.*

## Environment
| Field | Value |
|---|---|
| Tool | LocalSutra AI {{VERSION}} |
| Node.js | {{NODE}} |
| Platform | {{PLATFORM}} |
| Recorded | {{RECORDED}} |

## Result
| Metric | Value |
|---|---|
| Tests | {{TESTS}} |
| Passed | {{PASS}} |
| Failed | {{FAIL}} |
| Skipped | {{SKIPPED}} |
| Fuzz cases | {{FUZZ}} |
| Unexpected fuzz crashes | {{CRASHED}} |

Raw logs: [test-run.tap](test-results/test-run.tap), [fuzz-results.json](test-results/fuzz-results.json), [environment.json](test-results/environment.json), [SHA256SUMS.txt](test-results/SHA256SUMS.txt).

## Test pyramid
| Level | Examples |
|---|---|
| Unit | numeric bounds, statistics, canonical JSON, seal, redaction, URL policy |
| Boundary / negative | malformed JSON, oversized bodies, remote endpoints, hostile `nvidia-smi` output, invalid descriptors |
| Integration | real loopback servers: healthy, redirecting, hanging, flooding, junk, 503 |
| Filesystem | installer idempotence, overwrite refusal, symlink and junction refusal, dry-run |
| Server | token, method, bind address, tampered report |
| End-to-end | CLI commands via child process, `audit` file outputs, `verify` tamper detection |
| Fuzz | seeded hostile model descriptors, GPU text, runtime payloads, seal round-trips |

## Sample transcripts (real output)
- [doctor](samples/cli-doctor.txt), [fit](samples/cli-fit.txt), [probe with nothing listening](samples/cli-probe-no-runtime.txt), [probe with remote endpoint blocked](samples/cli-probe-remote-blocked.txt), [benchmark](samples/cli-benchmark.txt), [privacy](samples/cli-privacy.txt), [install-skills dry run](samples/cli-install-skills-dry-run.txt).
- [Full audit report (HTML)](samples/audit/audit-report.html), [Markdown](samples/audit/audit-report.md), [JSON](samples/audit/audit-report.json).

## Bugs found and fixed during this release (honest log)
1. Installer rejected valid Windows project paths that used 8.3 short names (false symlink error). Fixed with segment-wise `lstat` checks.
2. Symlink tests failed with `EPERM` on Windows. Fixed by using junctions.
3. `canonical()` handled `undefined` inconsistently and could break a seal after a JSON round-trip. Fixed and tested.
4. Markdown tables were not escaping `|` (caught by the audit's own check E05). Fixed.
5. A GPU name containing markup was accepted by the first parser draft (caught by check D02). Parser now allow-lists characters.
6. Report server sent a permissive CORS header and answered POST with 404. Now no CORS header and 405.

## What this report does not show
Results on other operating systems (see the CI matrix), live inference on a real Ollama/llama.cpp model (**not run**), GPU detection on real NVIDIA hardware (parser tested with fixtures; no GPU on the recording host), native IDE skill activation, independent review.
