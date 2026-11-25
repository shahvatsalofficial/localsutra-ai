# Functional Specification

## Users
Students and hobbyists with ordinary laptops, privacy-minded individuals, educators, developers using Ollama or llama.cpp, researchers comparing hardware, and teams who want evidence before choosing a local-AI setup.

## Jobs to be done

@@diagram:pipeline@@

1. "Can this machine run this model?" Answered by `fit` with assumptions.
2. "Is my local server up and really loopback?" Answered by `probe` and `privacy`.
3. "How fast is my installed model here?" Answered by opt-in `infer` (cold vs warm runs).
4. "What does this report actually prove?" Answered by evidence labels, `verify` and `audit`.
5. "Give my coding agent safe instructions." Answered by `install-skills`.

## Commands
| Command | Input | Output | Side effects |
|---|---|---|---|
| `doctor` | none | hardware profile | none (one `nvidia-smi` call if present) |
| `fit` | catalog JSON, optional profile JSON | per-model fit table | none |
| `probe` | runtime, optional loopback endpoint | status, failure code, model list | one GET to loopback |
| `infer` | installed model name, runs, prompt | timing samples, prompt hash | up to 5 POSTs to loopback; model is loaded by the runtime |
| `benchmark` | runs, iterations | statistics of a CPU loop | CPU use for a short time |
| `compare` | two sealed benchmark reports | ratio, or refusal | none |
| `privacy` | optional endpoint | rule verdict, data inventory | none |
| `audit` | output directory | `audit-report.{json,md,html}` plus 15 per-artifact files | writes files; opens a loopback test server briefly |
| `verify` | report JSON | seal match or mismatch (exit 1) | none |
| `install-skills` | project dir, IDE, `--dry-run` | files written or planned | creates files, never overwrites |
| `serve` | sealed report, env token | local read-only API | listens on 127.0.0.1 |
| `demo` | optional out dir | sample reports | writes files |

## Report formats
Every report command can print `--format json|md|html` or write all three with `--out`. Existing files are never overwritten unless `--force`.

## Fit model

@@diagram:canifit@@

`required = weights x headroom(1.35) + overhead + KV cache` where `weights = parameters x bits / 8`. KV cache is included only when `kvBytesPerToken` is supplied. Category `possibly_fits` means free RAM is at least the estimate; `likely_insufficient_ram` means it is not. With a detected NVIDIA GPU the report adds a single-GPU VRAM verdict. Speed and quality are always `unknown`.

## Acceptance criteria (verified by tests)
- Remote, credentialed, path-bearing or redirecting endpoints are refused before any network call.
- No GPU is reported unless `nvidia-smi` returned parseable output.
- Inference reports never contain prompt or output text.
- A tampered report fails `verify` with exit code 1.
- Installer never overwrites an existing file and refuses symlinked paths.
- The audit verdict is `BLOCKED_UNSAFE` if any check fails.

## Out of scope
Downloading or installing models/runtimes, hosted APIs, multi-user service, power measurement, model quality evaluation, leaderboard ranking.
