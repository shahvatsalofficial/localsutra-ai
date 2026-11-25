# LocalSutra AI — Hardware Profile

**Schema:** localsutra.hardware.v1  
**Integrity:** SHA-256 seal verified (bc52f55465d83384…)  
**Trust boundary:** Loopback only. No cloud calls, no telemetry. Unknown and not-run values are not successes.  

**OS / architecture:** win32/x64  
**CPU:** Intel(R) Core(TM) Ultra 7 155U (14 logical)  
**RAM total / free:** 33.77 GB / 0.49 GB  
**Free disk (working volume):** 160.94 GB  
**GPU:** unknown: No supported GPU probe found (only nvidia-smi is implemented).  
**NPU:** unknown: No portable NPU probe is implemented  

## Tools on PATH (found, not verified working)

| Tool | Found |
|---|---|
| ollama | no |
| llamaServer | no |
| nvidiaSmi | no |
| node | yes |

## Limitations

- Node reports host properties, not the capability of a different target device
- GPU detection covers NVIDIA via nvidia-smi only; AMD, Intel, Apple and NPUs are reported unknown, not absent
- No virtualisation restriction detected
- A tool found on PATH is not proof it is installed correctly or can run a model
- No model has been executed by this command

---
LocalSutra AI 0.2.2 · created by Vatsal Shah · Apache-2.0
