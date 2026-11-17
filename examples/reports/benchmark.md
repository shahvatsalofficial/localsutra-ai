# LocalSutra AI — Synthetic CPU Benchmark (not AI)

**Schema:** localsutra.benchmark.v1  
**Integrity:** SHA-256 seal verified (6922259298aa18f5…)  
**Trust boundary:** Loopback only. No cloud calls, no telemetry. Unknown and not-run values are not successes.  

> **Verdict: NOT_AI_INFERENCE** — A synthetic CPU loop. It says nothing about model speed, tokens per second, GPU, power or quality.

**Runs / iterations:** 5 / 50000  
**Warm-up:** discarded  
**Environment:** Node v24.15.0 win32/x64  

## Statistics

| Metric | N | Median | p95 | Min | Max | Stdev |
|---|---|---|---|---|---|---|
| Wall time | 5 | 0.349 ms | 0.787 ms | 0.315 ms | 0.787 ms | 0.232 ms |
| CPU user | 5 | 0.000 ms | 0.000 ms | 0.000 ms | 0.000 ms | 0.000 ms |

## Limits

- Not an LLM or runtime benchmark
- Process RSS is not GPU VRAM
- Host load and thermal state affect results
- No power, energy or model quality measured
- Small sample counts give wide uncertainty; see stdev

---
LocalSutra AI 0.2.1 · created by Vatsal Shah · Apache-2.0
