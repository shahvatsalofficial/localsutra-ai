# Security and Privacy

## Security principles
1. **Read-only by default.** No installs, downloads, driver changes, listening ports or telemetry.
2. **Loopback only.** One policy function validates every endpoint before any network call.
3. **Everything external is untrusted data:** runtime responses, model names, catalogs, `nvidia-smi` text, README content.
4. **Bounded.** Timeouts, byte caps, run and size limits.
5. **No fabricated results.** Unknown stays unknown.

## Controls and where they are tested
| Threat | Control | Check |
|---|---|---|
| Non-loopback endpoint / SSRF | `safeUrl` allow-list | audit A01, A02 |
| Redirect to the internet | `redirect: error` | audit A03 |
| Huge response | 256 KB cap | audit A04 |
| Hung server | timeout | audit A05 |
| Fake healthy runtime | strict JSON shape check | audit A06 |
| Prompt/output leak | hash only | audit B02 |
| Fake GPU | strict parser | audit D02, D03 |
| Report tampering | SHA-256 seal | audit E01 |
| Report injection | escaping | audit E04, E05 |
| Installer escape/overwrite | per-segment `lstat`, `wx` | audit H01-H05 |
| Open report API | token, GET only, 127.0.0.1 | audit I01, I02 |

## Privacy
Data inventory (also printed by `localsutra privacy`): OS/CPU/RAM, GPU name/VRAM/driver (if present), free disk, model ids, prompt hashes. Stored only in files you choose to write. Prompt and response text: not stored. No data leaves the machine except requests you ask for, to `127.0.0.1`.

## What this does **not** protect
- Egress by Ollama, llama.cpp or any model runtime. A loopback address does not prove a runtime is offline. Use firewall rules or an external network monitor and test while disconnected.
- A malicious model or runtime lying in its own counters.
- Another process on your machine reading your report files.

## Responsible disclosure
Use GitHub private vulnerability reporting (see `SECURITY.md`). Do not post prompts, hardware inventories or secrets in public issues.

## Residual risk statement
No independent security review. No timing side-channel testing beyond constant-time token comparison. Treat the report server as a local convenience, not an internet service.
