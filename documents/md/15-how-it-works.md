# How It Works

A visual tour of the ideas behind LocalSutra AI. Read it in five minutes; every figure follows your light or dark theme.

## The big picture

LocalSutra answers four questions in order, and each answer carries a label that says how much to trust it.

@@diagram:pipeline@@

| Question | Command | Answer type |
|---|---|---|
| What hardware do I have? | `doctor` | measured |
| Will this model plausibly fit? | `fit` | heuristic estimate |
| Is my local runtime up? | `probe` | runtime-reported |
| How fast is it? | `infer` (opt-in) | runtime-reported and measured |
| What does it all prove? | `audit`, `verify` | sealed evidence |

## What it will and will not talk to

@@html:trust@@

## How a fit estimate is made

```text
weights   = parameters x bits per weight / 8
required  = weights x 1.35 + fixed overhead + KV cache (if supplied)
verdict   = free RAM >= required ?  possibly_fits : likely_insufficient_ram
```

The 1.35 headroom and the overhead are assumptions, printed in every report. Download size is not resident memory, and a bigger context window grows the KV cache.

@@diagram:canifit@@

## How a probe is decided

@@diagram:probe@@

## Evidence labels

Every value in a report is one of these. A missing value is never silently turned into a pass.

@@html:ladder@@

## How the seal works

@@diagram:seal@@

The canonical form sorts keys and ignores `undefined`, so the same data always produces the same hash, even after a round-trip through JSON. A seal detects change but proves nothing about the author.

## How the audit decides

The audit runs real code on hostile inputs: local servers that redirect, hang, flood and send junk; tampered reports; symlinked directories; garbage `nvidia-smi` text. Each check records expected, observed and result.

@@diagram:verdict@@

## Architecture in layers

@@html:layers@@

## Skills and agents

The 25 skills are instruction files for your coding agent. A typical flow, executed sequentially if your host has no sub-agents:

@@diagram:agents@@

Skills never replace the deterministic CLI. An agent cannot approve a permission or bypass a safety check, because the checks live in code.

## Where to go next

- [User guide](05-user-guide.html): install and run each command.
- [Real-world scenarios](14-real-world-scenarios.html): nine situations with real output.
- [Security and privacy](06-security-and-privacy.html): every threat and its test.
- [Assurance and evidence](13-assurance-and-evidence.html): how to verify it yourself.
