# Evidence Model and Rules

## Evidence labels

@@html:ladder@@

| Label | Meaning | Example |
|---|---|---|
| `measured` | read or timed on this host now | CPU, RAM, disk, CPU-loop timing |
| `heuristic` | computed from stated assumptions | model fit |
| `runtime_reported` | a local runtime said so | Ollama `eval_count` |
| `not_run` | not done; never a pass | live inference, egress test |
| `unknown` | cannot be determined | AMD GPU, NPU |
| `blocked` / `failed` | refused by policy / attempted and failed | remote endpoint, timeout |

## Audit evidence tiers
| Tier | Proves | Does not prove |
|---|---|---|
| `MEASURED_LOCAL` | values this host reported at that time | other hardware; that a model will run |
| `HEURISTIC` | a stated formula's output | load success, speed, quality |
| `MOCK_FIXTURE` | probe logic against a local mock service | behaviour of a real Ollama or llama.cpp |
| `RULE_CHECK` | endpoint rules and the data inventory | that a runtime sends no traffic |

## The seal

@@diagram:seal@@

`evidence.sha256` covers the canonical payload. It detects change. It is not a signature, does not name an author and can be recomputed by someone who edits the report. Signed attestations are planned.

## The ten operating rules (`rules/`)
| Rule | Enforced by tests? |
|---|---|
| read-only-by-default | yes: no writes except explicit outputs |
| no-cloud-fallback | yes: no code path reaches a non-loopback host |
| loopback-boundary | yes: A01, A02, unit tests |
| no-fabricated-gpu | yes: D01-D03, fuzz |
| benchmark-honesty | yes: F01, F02 |
| model-fit-uncertainty | yes: C01, C02 |
| secret-and-prompt-safety | yes: B02, E03 |
| bounded-execution | yes: limits tests |
| provenance-and-evidence | partly: seal and labels tested; signatures planned |
| human-release-approval | instruction-only (process rule) |

## Comparability
Two benchmark reports are compared only when workload, iteration count, platform and architecture match; otherwise the tool refuses. Different models, quantizations, context lengths or hardware are never ranked.

## Claims discipline
A statement appears in docs only if a test, a proof file or a CI run backs it. Everything else is marked planned, unknown or not run.
