# User Guide

LocalSutra AI is a command-line tool. You need **Node.js 22 or newer** and nothing else: no account, no API key and no network connection.

> **Three commands to start:** `npx localsutra-ai doctor`, then `npx localsutra-ai fit --catalog catalog.json`, then `npx localsutra-ai audit --out my-audit`. Want examples first? See [Real-world scenarios](14-real-world-scenarios.html).

@@diagram:pipeline@@

## Install
```bash
npx localsutra-ai doctor              # no install
npm install -g localsutra-ai          # optional; gives `localsutra`
localsutra --version
```

## 1. See your hardware
```bash
localsutra doctor                     # JSON
localsutra doctor --format md         # readable
localsutra doctor --out my-pc         # writes my-pc.json, .md, .html
```
GPU shows `unknown` unless `nvidia-smi` is available. That means "not determined", not "no GPU".

## 2. Will a model fit?

@@diagram:canifit@@

@@html:mem@@

Create a catalog (see `fixtures/model-catalog.json`):
```json
{"models":[{"id":"my-7b-q4","parametersB":7,"bitsPerWeight":4,"contextTokens":4096,"kvBytesPerToken":131072}]}
```
```bash
localsutra fit --catalog catalog.json --format md
```
Read `possibly_fits` as "memory looks plausible", never as "it will run". Provide `kvBytesPerToken` for a closer estimate. Check the runtime's own documentation too.

## 3. Check a local runtime

@@diagram:probe@@

```bash
localsutra probe --runtime ollama          # http://127.0.0.1:11434/
localsutra probe --runtime llama --endpoint http://127.0.0.1:8080/
```
`responding` only means the service answered. Failure codes tell you why (`unreachable`, `timeout`, ...).

## 4. Time a model you already installed (opt-in)

@@html:cw@@

```bash
localsutra infer --model llama3.2:3b --runs 3
```
Run 1 includes model loading (cold); later runs are warm. Tokens per second appear only if Ollama reported counters. Your prompt is hashed, never saved; output is discarded.

## 5. Benchmark honesty
`localsutra benchmark` runs a CPU loop. It is **not** an AI benchmark. Use `compare` only on reports from the same machine and settings.

## 6. Run the audit

@@diagram:verdict@@

```bash
localsutra audit --out my-audit
```
Open `my-audit/audit-report.html`. Verdict meanings: `APPROVED_WITH_EVIDENCE`, `REVIEW_REQUIRED`, `BLOCKED_UNSAFE`. Read the "Not tested" section.

## 7. Verify a report
```bash
localsutra verify --report my-audit/audit-report.json
```
Exit code 1 means the content changed after sealing.

## 8. Use the skills with your coding agent
```bash
localsutra install-skills --project . --ide claude --dry-run
localsutra install-skills --project . --ide claude
```
Then ask your agent to use `localsutra-prime`. Skills never grant permissions by themselves.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `Non-loopback runtime endpoint blocked` | use `http://127.0.0.1:PORT/` |
| `EEXIST` when writing a report | file exists; choose another `--out` or add `--force` |
| `probe` says `unreachable` | start Ollama or llama-server; check the port |
| GPU `unknown` | install NVIDIA drivers or accept unknown; other vendors are not probed yet |
| Windows: symlink errors in tests | not an issue for users; tests use junctions |

## Privacy tips
Reports contain your CPU model, RAM, disk size and model names. Review before posting them in public issues.
