# LocalSutra AI — Independent Audit Report

**Schema:** localsutra.audit.v1  
**Integrity:** SHA-256 seal verified (d278712fbeb0e2df…)  
**Trust boundary:** Loopback only. No cloud calls, no telemetry. Unknown and not-run values are not successes.  

> **Verdict: APPROVED_WITH_EVIDENCE** — BLOCKED_UNSAFE if any safety-gate check fails; REVIEW_REQUIRED if every check passed but some were skipped on this host; APPROVED_WITH_EVIDENCE if all ran and passed. Even then this is evidence for a human reviewer, not certification, and live model inference is always listed as not tested.

**Tool:** LocalSutra AI 0.2.1  
**Recorded:** 2026-11-17T17:19:45.274Z  
**Environment:** Node v24.15.0 · win32/x64 · Intel(R) Core(TM) Ultra 7 155U  
**Assurance checks:** 37 passed · 0 failed · 0 skipped of 37  

## Assurance checks (each runs the real code on a hostile input)

| ID | Check | Expected | Observed | Result |
|---|---|---|---|---|
| A01 | 10 non-loopback or malformed endpoints are refused | all refused | 10/10 refused | pass |
| A02 | Blocked endpoint never reaches the network layer | fetch not called | rejected: Non-loopback runtime endpoint blocked; fetch called=false | pass |
| A03 | HTTP redirect from a runtime is refused, not followed | failureCode=redirect_refused | status=unavailable; code=redirect_refused | pass |
| A04 | Oversized runtime response is cut off | failureCode=response_too_large | code=response_too_large | pass |
| A05 | Hung runtime hits the timeout | failureCode=timeout | code=timeout | pass |
| A06 | Malformed JSON from a runtime cannot pass as healthy | status=unavailable | status=unavailable; code=invalid_payload | pass |
| A07 | Closed port is reported unreachable, not healthy | failureCode=unreachable | code=unreachable | pass |
| B01 | Model listing is never presented as inference speed | inference listed under notTested | status=responding; models=1 | pass |
| B02 | Inference report never contains prompt or output text | no prompt/output in report | prompt echoed=false; output echoed=false | pass |
| B03 | A failed inference creates no fake samples | error raised | rejected: Local Ollama inference returned HTTP 404 | pass |
| B04 | Missing token counters stay null, not invented | evalTokens=null | tokens=null; tok/s=null | pass |
| C01 | Fit estimate is labelled heuristic with speed unknown | heuristic_not_measured | heuristic_not_measured; speed=unknown | pass |
| C02 | 90B model on a 8 GB free-RAM host is not marked fitting | likely_insufficient_ram | likely_insufficient_ram | pass |
| C03 | Nonsense model descriptors are rejected | all rejected | 5/5 rejected | pass |
| C04 | Duplicate model ids in a catalog are rejected | error | rejected: Model ids in a catalog must be unique | pass |
| D01 | No GPU probe means GPU is "unknown", never invented | gpu.status=unknown | gpu=unknown; npu=unknown | pass |
| D02 | Garbage nvidia-smi output yields "unknown" | unknown | unknown,unknown,unknown,unknown,unknown | pass |
| D03 | Valid nvidia-smi output is parsed from the probe only | detected, VRAM from output | gpu=detected; vramBytes=8589934592 | pass |
| D04 | A tool on PATH is reported as found, never "working" | no capability implied | tools.* are PATH presence only | pass |
| E01 | Tampered report fails the integrity seal | verify=false | original=true; tampered=false | pass |
| E02 | Seal survives a JSON round-trip | verify=true | round-trip verified | pass |
| E03 | Secret patterns are redacted from text | no token in output | [REDACTED] API_KEY=[REDACTED] [REDACTED] [REDACTED] | pass |
| E04 | HTML report escapes untrusted markup | no &lt;script&gt; element | escaped | pass |
| E05 | Markdown report neutralises table-breaking input | pipes escaped | pipe escaped in model name | pass |
| F01 | Benchmark is labelled non-AI and bounded | type=synthetic_cpu_workload_not_ai_inference | synthetic_cpu_workload_not_ai_inference; samples=3; oversize run rejected: runs must be 2..30 | pass |
| F02 | Unlike workloads are refused as not comparable | error | rejected: Workloads are not comparable | pass |
| G01 | Privacy audit does not claim runtime egress is safe | modelRuntimeEgress=not_tested | egress=not_tested; remote allowed=false | pass |
| H01 | Skill installer is idempotent and never overwrites | second run skips; custom file kept | first written=24/skipped=1; second written=0; custom kept=true | pass |
| H02 | Installer writes the documented path for all six IDEs | 6 layouts, 25 skills each | claude:25 cursor:25 codex:25 gemini:25 copilot:25 opencode:25 | pass |
| H03 | Installer refuses a symlinked project root | error (or skipped when the OS forbids symlinks) | rejected: Project must be a real directory (not a symlink) | pass |
| H04 | Installer refuses a symlinked .claude directory | error (or skipped) | rejected: Refusing to traverse a symlink or non-directory: .claude | pass |
| H05 | Installer dry-run writes nothing | no files created | planned=25; file exists=false | pass |
| I01 | Report server: 401 without token, 405 for POST, 127.0.0.1 only | 401 / 200 / 405 / 127.0.0.1 | none=401; wrong=401; valid=200; POST=405; bind=127.0.0.1 | pass |
| I02 | Server refuses a weak token and an unsealed report | both refused | weak token: rejected: A strong 24+ character token required; bad seal: rejected: Not a valid sealed LocalSutra report | pass |
| J01 | Negative control: unsupported runtime kind is refused | error | rejected: Runtime must be ollama or llama | pass |
| J02 | Negative control: empty catalog is refused | error | rejected: Bounded model catalog (1..200 entries) required | pass |
| J03 | Negative control: oversized JSON input is refused | error | rejected: Input must be a bounded regular file | pass |

## Sample outputs

| Capability | Result |
|---|---|
| Hardware profile (this host) | win32/x64, 14 logical CPUs, GPU unknown |
| Model fit (fixture host, 8 GB free RAM, synthetic catalog) | 2 of 3 possibly fit; heuristic only |
| Runtime probe (mock loopback Ollama, not a real runtime) | status responding; 1 model listed; inference not tested |
| Synthetic CPU benchmark (not AI) | 5 runs, median 0.37 ms, stdev 0.22 ms |
| Privacy boundary | loopback endpoint allowed=true; runtime egress not_tested |

## Evidence tiers

| Artifact | Tier | Proves | Does not prove |
|---|---|---|---|
| hardware-profile.json | MEASURED_LOCAL | Values Node and fixed nvidia-smi argv reported on this host at this time | Capability of any other device, or that a model will run |
| model-fit-report.json | HEURISTIC | Result of a stated memory formula on synthetic descriptors | That any model loads, its speed or its quality |
| runtime-diagnostics.json | MOCK_FIXTURE | Probe logic against a local mock HTTP service | Behaviour of a real Ollama or llama.cpp install (not run) |
| benchmark-results.json | MEASURED_LOCAL | Timing of a synthetic CPU loop | Any AI inference performance, GPU, power or quality |
| privacy-check.json | RULE_CHECK | Endpoint validation rules and the data inventory | That an external runtime sends no network traffic |

## Not tested / not claimed

- Live inference against a real Ollama or llama.cpp model (live inference: not run; no model is assumed to be installed)
- GPU detection on AMD, Intel, Apple or NPU hardware (reported unknown, not absent)
- Native skill activation inside Claude Code, Cursor, Codex, Gemini CLI, Copilot or OpenCode (file copying is verified; host execution is not)
- Network egress of any external runtime (needs external monitoring)
- Results on other operating systems than the host named above; see the CI matrix for those
- Independent third-party security review, signed releases and SBOM (planned)

## Artifact hashes

| File | SHA-256 |
|---|---|
| artifacts/hardware-profile.json | 467a6ffc3377a76745b9f70301458af0dbe8fb31446ff0197ad88b523941e5f5 |
| artifacts/model-fit-report.json | 9baa46edf34e88432bcc2529c023ae041482ce8c0676eb65e41f1325fcbf7bee |
| artifacts/runtime-diagnostics.json | 29412584af395a1ea9900de583e59d54e9997a5cf761d2f4f30452d752ebb4d9 |
| artifacts/benchmark-results.json | 973ddaab15c7d54b871b1a87b66cc48d01f2dc46a74bbfb8ac65cf9deec46816 |
| artifacts/privacy-check.json | 8b82ddb5b7c038c11e2db9e80992b1480eaa47e2a6af58163b3369103d9931b3 |

_A SHA-256 seal detects change; it is not a signature and does not prove who produced the report. Only a human maintainer can approve a release._

---
LocalSutra AI 0.2.1 · created by Vatsal Shah · Apache-2.0
