# Assurance and Evidence

This page lists what a skeptical reviewer can check, how to check it, and what remains unproven.

## Verify it yourself in five commands
```bash
git clone https://github.com/shahvatsalofficial/localsutra-ai && cd localsutra-ai
npm test                                   # {{TESTS}} tests on the recorded run
npm run proof                              # regenerates docs/proof/*
npm run audit                              # writes examples/audit/audit-report.{html,md,json}
node packages/cli/index.mjs verify --report examples/audit/audit-report.json
```

## Evidence index

@@bars@@

@@diagram:verdict@@

| Claim | Evidence | How to re-check |
|---|---|---|
| Tests pass | [test-run.tap](test-results/test-run.tap): {{PASS}} passed, {{FAIL}} failed, {{SKIPPED}} skipped | `npm test` |
| Hostile inputs handled | [fuzz-results.json](test-results/fuzz-results.json): {{FUZZ}} cases, {{CRASHED}} unexpected crashes | `npm run proof` |
| Safety gates work | [audit report](samples/audit/audit-report.html): 37 checks with expected vs observed | `npm run audit` |
| Files unchanged | [SHA256SUMS.txt](test-results/SHA256SUMS.txt) | `sha256sum -c` style comparison |
| Runs on 3 OS families | GitHub Actions matrix | Actions tab (not asserted here) |
| No dependencies | `package.json` | `npm ls --all` |
| No network beyond loopback | code: only `fetch` calls in `core/runtime.mjs` go through `safeUrl` | read the file; audit A01-A03 |

## Independent-auditor view
Questions an auditor would ask, with honest answers:
| Question | Answer |
|---|---|
| Were the safety checks written by the same author as the code? | Yes. This is a self-assessment. A third-party review is planned. |
| Do checks use real I/O or only mocks? | Probe checks use real loopback HTTP servers that redirect, hang, flood and send junk. Inference uses a mocked `fetch`. |
| Was a real model ever run? | No. Live inference: **not run**. |
| Was a real GPU ever probed? | No GPU on the recording host. The parser was tested with fixture text. |
| Does the verdict mean "safe"? | No. It means the listed checks passed on that host. |
| What did the audit find during development? | Six defects, listed in the Test Report. The checks caught two of them. |
| Could the seal be forged? | Anyone can re-seal an edited file. Signatures are planned. |

## Not proven
Behaviour with a real Ollama or llama.cpp install; non-NVIDIA GPU detection; native skill activation in each IDE; absence of egress from external runtimes; performance of any real model; third-party review.

## Reproducibility notes
Timings vary by machine and load; the proof records them with sample counts and spread. The fuzz run is seeded for repeatability. All commands need only Node.js 22+.
