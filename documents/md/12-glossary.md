# Glossary

| Term | Meaning |
|---|---|
| Agent Skill | a `SKILL.md` instruction file a coding agent may load; not a running process |
| Audit | `localsutra audit`: adversarial checks plus samples and a not-tested list |
| Bits per weight | storage precision of model parameters (4-bit, 8-bit, 16-bit) |
| Cold / warm run | first inference (includes model load) vs later runs |
| Evidence seal | SHA-256 over the canonical report; integrity, not identity |
| Failure code | stable machine-readable reason a probe failed |
| FitProof | this project's term for explaining estimate vs tested compatibility |
| GGUF | model file format used by llama.cpp and Ollama |
| Heuristic | an estimate from stated assumptions, not a measurement |
| Headroom | multiplier (1.35) added to weight size for runtime buffers; an assumption |
| KV cache | memory for attention keys/values; grows with context length |
| Loopback | the local-only network interface (`127.0.0.1`, `::1`) |
| Not run | a check that did not happen; never counted as a pass |
| Ollama | a local model runner exposing an HTTP API (third-party) |
| llama.cpp | a C/C++ inference engine with a server mode (third-party) |
| Offline boundary | validating that a client only talks to loopback; does not prove the runtime is offline |
| Quantization | storing weights at lower precision to save memory |
| RSS | resident set size: physical memory used by a process |
| Runtime-reported | numbers a local runtime supplied about itself |
| SSRF | tricking software into requesting an unintended address |
| Synthetic benchmark | a CPU loop used for timing; not model inference |
| Unknown | cannot be determined here; not the same as absent |
| VRAM | memory on a graphics card |
| WSL | Windows Subsystem for Linux; a virtualised environment whose figures may differ from the host |
