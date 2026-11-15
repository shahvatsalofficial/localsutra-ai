# Status: verified, partial, planned (v0.2.0, 2026-11-16)

Source of truth for verification: `npm test`, `npm run proof`, `npm run audit` and the GitHub Actions matrix. Numbers come from `docs/proof/` (regenerated, not hand-edited).

## Implemented and tested
| Capability | Test evidence | Notes |
|---|---|---|
| Host profile (OS, CPU, RAM, free disk, WSL flag) | unit tests, fixtures | Measured via Node |
| NVIDIA GPU name / VRAM / driver | parser tests incl. hostile outputs, fuzz | Uses `nvidia-smi` only; never run live in CI (no GPU) |
| Model-fit heuristic incl. KV cache and single-GPU VRAM | unit, fuzz (3,000 hostile descriptors) | Heuristic; speed/quality unknown |
| Loopback probe: Ollama `/api/tags`, llama.cpp `/health` | mock loopback servers: redirect, timeout, oversize, junk | Not tested against a real runtime |
| Opt-in Ollama `/api/generate` timing | mock `fetch`, privacy assertions | Live inference: **not run** |
| Synthetic CPU benchmark and compare | unit | Not AI inference |
| Report seal, `verify`, JSON/MD/HTML reports | unit, tamper tests, CLI end-to-end | Integrity, not signature |
| Skill installer for 6 IDE layouts, `--dry-run` | idempotence, overwrite, symlink/junction tests | File placement only |
| Read-only report server | auth, method, bind, tamper tests | Not production |
| `audit` command (37 checks, HTML/MD/JSON) | CLI end-to-end | See `docs/AUDIT_REPORTS.md` |

## Not implemented / not verified
- Live inference against a real Ollama or llama.cpp model (live inference: not run).
- GPU detection for AMD, Intel, Apple Silicon, NPUs (reported `unknown`).
- Native skill discovery and invocation in Claude Code, Cursor, Codex, Gemini CLI, Copilot, OpenCode.
- External-runtime network egress measurement; air-gap proof.
- Power, energy, thermal metrics.
- Model downloads, installers, license scanning, signed provenance, SBOM, signed releases.
- Independent third-party security review; accessibility audit with assistive technology.
- Dashboard UI, authenticated multi-user service, MCP server.

## Known limitations
Fit headroom (1.35) and overhead are assumptions. Free RAM is a point-in-time reading. The disk figure is for the working-directory volume. Under WSL the Linux guest is reported, not the Windows host.
