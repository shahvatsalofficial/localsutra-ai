# LocalSutra AI architecture (v0.2)

## Context
A deterministic CLI (`packages/cli`) calls core modules and renders reports. Agent skills (`skills/`) are instruction files for coding agents that call the same CLI. Nothing requires a model, an account or the network.

```
 user / IDE agent
      |  argv
      v
 packages/cli  --->  packages/core  (hardware, runtime, bench, privacy, install, audit, util)
      |                    |
      |                    +--> node:os, statfs, nvidia-smi (fixed argv)            [measured]
      |                    +--> http://127.0.0.1:PORT (probe/infer, on request)      [runtime-reported]
      v
 packages/reporting  --->  JSON + Markdown + HTML (one block list feeds both renderers)
      |
      +--> packages/server (optional): read-only 127.0.0.1 API for one sealed report
```

## Modules
| Module | Responsibility |
|---|---|
| `core/util.mjs` | assertions, numeric bounds, canonical JSON, SHA-256 seal/verify, endpoint policy (`safeUrl`), redaction, text sanitising, statistics |
| `core/hardware.mjs` | `profileHost`, strict `parseNvidiaSmi`, `fitModel`, `fitCatalog` |
| `core/runtime.mjs` | `probeRuntime`, `inferOllama`, bounded body reader, `classifyFailure` |
| `core/bench.mjs` | synthetic CPU benchmark and strict `compare` |
| `core/privacy.mjs` | endpoint rule check and data inventory |
| `core/install.mjs` | project-local skill copier, segment-wise symlink refusal, dry-run |
| `core/audit.mjs` | 37 assurance checks against hostile inputs, sample generation, verdict |
| `reporting/index.mjs` | one block model, two renderers (Markdown, accessible HTML) |
| `server/index.mjs` | token-protected, GET-only, loopback-only report API |

## Data model
Every report is `{schema: "localsutra.<kind>.v1", ..., evidence: {algorithm: "sha256", sha256}}`. The hash covers the canonical (sorted-key) payload. Status vocabulary: `measured`, `heuristic`, `runtime_reported`, `not_run`, `unknown`, `blocked`, `failed`. See `docs/EVIDENCE_MODEL.md`.

## Decisions
- **Zero dependencies:** smaller supply-chain surface; runs wherever Node 22+ runs.
- **Concrete loopback IPs only:** avoids DNS and `localhost` resolution ambiguity.
- **Fixed-argv `execFileSync` for `nvidia-smi`:** no shell, short timeout, strict parser; anything unexpected becomes `unknown`.
- **Create-only writes:** user files are never overwritten (reports need `--force`).
- **One block list, two renderers:** Markdown and HTML cannot drift apart.
- **Audit runs the real code on hostile input** instead of asserting policy in prose.

## Deployment
CLI via npm (`npx localsutra-ai`). CI on Linux, Windows and macOS with Node 22/24. The optional report server binds 127.0.0.1 only.

## Future (all **planned**, see `ROADMAP.md`)
Runtime adapters (llama.cpp completion, ONNX Runtime, MLX), AMD/Intel/Apple GPU probes, signed attestations, local dashboard.
