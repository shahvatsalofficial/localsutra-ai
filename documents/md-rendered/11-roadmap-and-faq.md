# Roadmap and FAQ

## Roadmap
| Version | Status | Scope |
|---|---|---|
| 0.2 | done | audit HTML/MD/JSON, NVIDIA GPU/VRAM, disk, WSL, failure codes, hardened installer, proof pipeline, docs |
| 0.3 | planned | live-runtime integration suite (skipped without a model), llama.cpp completion timing, Ollama version details, AMD/Intel/Apple probes, KV-cache presets |
| 0.4 | planned | consent-based install planning with checksum and license gates, SBOM |
| 0.5 | research | egress-test harness, signed audit capsules, local dashboard |
| 1.0 | planned | independent security review, per-IDE native activation matrix, externally reproduced demo |

## FAQ
**Can my computer run a 7B model?** Run `localsutra fit`. If it says `possibly_fits`, memory looks plausible. Load it in Ollama to find out for real.

**Why does GPU say unknown?** Only NVIDIA via `nvidia-smi` is implemented. Unknown means not determined.

**Is my local AI private if the URL is 127.0.0.1?** Not necessarily. The runtime may still use the internet. Test with a firewall or network monitor.

**Does `infer` send my prompt anywhere?** Only to your loopback Ollama. The report stores a SHA-256 of the prompt, not the text, and discards the output.

**Why will `compare` not compare my two models?** Different workloads or hardware are not comparable. The tool refuses instead of inventing a ranking.

**Do skills run by themselves?** No. They are instructions your coding agent may follow. The CLI works alone.

**Is the audit a certification?** No. It is a reproducible self-assessment with a not-tested list.

**Can I trust a report I received?** Run `localsutra verify`. A match proves the file is unchanged since sealing, not who made it.

**Does it work offline?** Yes. Everything except `probe`/`infer` needs no network at all, and those only use loopback.

**How do I report a bug or vulnerability?** Bugs: GitHub issues. Vulnerabilities: private advisory (see `SECURITY.md`).
