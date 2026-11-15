# LocalSutra AI — Synthetic CPU Benchmark (not AI)

**Schema:** localsutra.benchmark.v1  
**Integrity:** SHA-256 seal verified (f206b61a6281d4c9…)  
**Trust boundary:** Loopback only. No cloud calls, no telemetry. Unknown and not-run values are not successes.  

> **Verdict: NOT_AI_INFERENCE** — A synthetic CPU loop. It says nothing about model speed, tokens per second, GPU, power or quality.

**Runs / iterations:** 5 / 50000  
**Warm-up:** discarded  
**Environment:** Node v24.15.0 win32/x64  

## Statistics

| Metric | N | Median | p95 | Min | Max | Stdev |
|---|---|---|---|---|---|---|
| Wall time | 5 | 0.294 ms | 1.390 ms | 0.272 ms | 1.390 ms | 0.524 ms |
| CPU user | 5 | 0.000 ms | 15.000 ms | 0.000 ms | 15.000 ms | 6.708 ms |

## Limits

- Not an LLM or runtime benchmark
- Process RSS is not GPU VRAM
- Host load and thermal state affect results
- No power, energy or model quality measured
- Small sample counts give wide uncertainty; see stdev

---
LocalSutra AI 0.2.0 · created by Vatsal Shah · Apache-2.0
