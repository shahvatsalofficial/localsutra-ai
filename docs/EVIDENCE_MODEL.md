# Evidence model

| Label | Meaning | Example |
|---|---|---|
| `measured` | read or timed on this host at this moment | CPU, RAM, free disk, synthetic loop timing |
| `heuristic` | computed from stated assumptions | model-fit estimate |
| `runtime_reported` | a local runtime told us | Ollama `eval_count`, `eval_duration` |
| `not_run` | the test did not happen; never a pass | live inference, egress test |
| `unknown` | cannot be determined here | AMD GPU, NPU |
| `blocked` / `failed` | refused by policy / attempted and failed | remote endpoint; timeout |

## Audit evidence tiers
`MEASURED_LOCAL`, `HEURISTIC`, `MOCK_FIXTURE`, `RULE_CHECK`. Each audit artifact states what it proves and what it does not.

## Seal
`evidence.sha256` is SHA-256 over canonical JSON (sorted keys, `undefined` dropped) of everything except `evidence`. It detects edits relative to the stored hash. It does not identify the author and cannot stop someone re-sealing a modified report. Signed attestations are planned.

## Reporting discipline
Reports show host, versions, sample counts, units, assumptions, limitations and what was not tested. Two measurements are comparable only with identical workload, platform and settings; otherwise the tool refuses.
