# Architecture

## Layers
| Layer | Components | Trust |
|---|---|---|
| Presentation | `packages/cli`, HTML/Markdown/JSON reports | untrusted input from argv and files |
| Domain | `core/hardware`, `core/runtime`, `core/bench`, `core/privacy`, `core/install`, `core/audit` | validates everything it receives |
| Infrastructure | `node:os`, `statfs`, `nvidia-smi` (fixed argv), loopback `fetch` | external, treated as untrusted data |
| Optional service | `packages/server` | token, GET only, 127.0.0.1 |
| Agent layer | `skills/`, `.claude/agents/`, `agents/manifest.json` | instructions only; no execution authority |

## Context diagram
```
user / IDE agent --argv--> CLI --> core --> node:os, statfs, nvidia-smi    (measured)
                                     |--> http://127.0.0.1:PORT           (runtime-reported, on request)
                          CLI --> reporting --> JSON + Markdown + HTML
                          optional: server --> one sealed report, bearer token
```

## Key design decisions
1. **Zero dependencies** to shrink supply-chain risk.
2. **Concrete loopback IPs** (`127.0.0.1`, `[::1]`) instead of `localhost`, to avoid resolver ambiguity.
3. **Shell-free `nvidia-smi`** with fixed arguments, a 4-second timeout and a strict parser; unparseable output means `unknown`.
4. **Create-only file writes** protect user data.
5. **Single block model** feeds both Markdown and HTML renderers so they stay identical.
6. **Seals are integrity, not identity**; signatures are planned.
7. **The audit executes real code on hostile inputs** (real loopback servers that redirect, hang, flood and send junk).

## Data flow for `probe`
argv &rarr; `runtimeEndpoint` (policy check) &rarr; `fetch` with `redirect: error`, timeout &rarr; bounded body read (256 KB) &rarr; JSON parse and shape check &rarr; sealed report with a stable failure code.

## Data flow for `audit`
Create temp dir &rarr; run 37 checks (each in try/catch, recorded as pass/fail/skipped) &rarr; build samples from fixture host and mock loopback runtime &rarr; compute verdict &rarr; seal &rarr; write JSON, Markdown, HTML and per-artifact reports &rarr; delete temp dir.

## Quality attributes
| Attribute | How |
|---|---|
| Portability | Node 20+, Linux/macOS/Windows in CI |
| Safety | loopback only, bounded, create-only |
| Honesty | evidence labels, not-tested list |
| Maintainability | small modules, one renderer model, tests per control |
| Accessibility | semantic HTML, `lang`, table headers, contrast, light/dark, print |

## Extension points
Runtime adapters (llama.cpp completion, ONNX Runtime, MLX), GPU probes per vendor, signed attestations, dashboard. Each must keep the loopback policy, bounds and evidence labels. All **planned**.
