# LocalSutra AI — Runtime Diagnostics

**Schema:** localsutra.runtime.v1  
**Integrity:** SHA-256 seal verified (58423dde7cd4f59c…)  
**Trust boundary:** Loopback only. No cloud calls, no telemetry. Unknown and not-run values are not successes.  

> **Verdict: responding** — Ollama list endpoint responded; inference has not been tested

**Runtime:** ollama  
**Endpoint:** http://127.0.0.1:49674/api/tags  
**Scope:** loopback_get_only  
**Failure code:** none  
**HTTP status:** 200  

## Installed models (listing only)

| Name | Size |
|---|---|
| mock-model:3b | 1.90 GB |

## Not tested

- inference speed
- prompt privacy within runtime
- network egress by external runtime

---
LocalSutra AI 0.2.1 · created by Vatsal Shah · Apache-2.0
