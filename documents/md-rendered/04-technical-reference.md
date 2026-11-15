# Technical Reference

## Requirements
Node.js 20 or newer. No runtime or development dependencies. Optional: `nvidia-smi` for GPU facts; Ollama or llama.cpp for `probe`/`infer`.

## Repository layout
| Path | Purpose |
|---|---|
| `packages/core/` | domain logic (`util`, `hardware`, `runtime`, `bench`, `privacy`, `install`, `audit`, `version`) |
| `packages/cli/index.mjs` | command parser and dispatcher |
| `packages/reporting/index.mjs` | JSON, Markdown, HTML renderers |
| `packages/server/index.mjs` | read-only report API |
| `skills/` | 25 `SKILL.md` files; `agents/manifest.json` lists roles |
| `schemas/`, `rules/`, `policies/`, `workflows/` | contracts and operating rules |
| `tests/` | `core.test.mjs`, `features.test.mjs` (node:test) |
| `scripts/` | `run-tests`, `demo`, `proof` |
| `docs/proof/` | regenerated evidence |

## Report schemas
`localsutra.hardware.v1`, `fit.v1`, `catalog.v1`, `runtime.v1`, `inference.v1`, `benchmark.v1`, `compare.v1`, `privacy.v1`, `audit.v1`. Each has `schema` and `evidence.sha256`.

## Endpoint policy (`safeUrl`)
Accept only `http://127.0.0.1[:port]/` or `http://[::1][:port]/` with path `/`. Reject any other scheme, host (including `localhost`, `0.0.0.0`, IPv4-mapped IPv6, private and link-local addresses), credentials, query, fragment or non-root path. The WHATWG parser canonicalises numeric spellings (`0x7f.1`, `2130706433`) to `127.0.0.1` before the check, and requests use the canonical URL.

## Failure codes (`probe`)
`unreachable`, `timeout`, `redirect_refused`, `response_too_large`, `invalid_payload`, `http_error`, `not_ready`, `error`; `null` when responding.

## Limits
| Item | Limit |
|---|---|
| Probe timeout | 100 ms to 10 s (default 2.5 s) |
| Inference timeout / runs | 200 ms to 120 s; 1 to 5 runs; prompt 2,000 chars; 32 tokens |
| Response body | 256 KB (probe), 300 KB (inference) |
| Benchmark | 2 to 30 runs; 1,000 to 2,000,000 iterations |
| Catalog | 1 to 200 models; unique ids |
| JSON input | 1 MB, regular file, not a symlink |
| Report server | token 24+ chars; reports under 3 MB |

## Seal
`sha256(canonical(report without evidence))`. `canonical` sorts keys, drops `undefined`, and is stable across JSON round-trips.

## Exit codes
`0` success; `1` error, tamper detected, or audit `BLOCKED_UNSAFE`.

## Programmatic use
The packages are ES modules: `import {profileHost, fitCatalog} from 'localsutra-ai/packages/core/hardware.mjs'`. Only the CLI interface is versioned as a public contract in 0.x.

## Environment variables
`LOCALSUTRA_SERVER_TOKEN` (only for `serve`; never printed). Nothing else is read.
