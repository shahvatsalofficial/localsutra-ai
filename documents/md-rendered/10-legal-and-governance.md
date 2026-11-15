# Legal and Governance

*Engineering documentation, not legal advice.*

## License
Apache-2.0 for all original material, with an express patent grant and a warranty disclaimer. `NOTICE` must accompany redistributions.

## Third-party content
Zero runtime and development dependencies. No model weights, tokenizers or datasets are bundled. Fixtures are synthetic. See `THIRD_PARTY_NOTICES.md`.

## Interaction with other software
| Program | Relationship |
|---|---|
| Ollama, llama.cpp | contacted over loopback HTTP only on request; not bundled; their licenses and network behaviour apply |
| NVIDIA `nvidia-smi` | run read-only with fixed arguments if already installed; not bundled |
| IDEs and coding agents | receive copies of skill files you choose to install; no affiliation |

## Models you run
Each model has its own license and use restrictions. LocalSutra does not check, grant or enforce them. License fields in reports are copied from your descriptors and unverified.

## Trademarks and names
Third-party names are used only to describe compatibility. "LocalSutra" has not been trademark-cleared; the GitHub and npm names were unused on 2026-11-16, which is not legal clearance.

## Privacy and data protection
No telemetry, no accounts, no network beyond loopback. Reports may contain machine details and model names; the user controls storage and sharing. No compliance certification (GDPR, SOC 2, HIPAA) is claimed.

## Honest-claims policy
No guarantees that a model will run, that a setup is private or air-gapped, or that skills work in a given IDE unless verified. No testimonials or adoption numbers.

## Governance
Maintainer: Vatsal Shah. Decisions are made by the maintainer after public discussion in issues. Contributions follow `CONTRIBUTING.md` and the Code of Conduct. Security reports go through private advisories. Releases require human sign-off.

## Risk register (summary)
| Risk | Level | Mitigation |
|---|---|---|
| Users read a fit estimate as a guarantee | medium | labels, assumptions, `unknown` speed |
| Runtime egress unnoticed | medium | explicit not-tested statements; external monitoring advice |
| Skill misuse by an over-permissive agent | medium | skills are instructions; rules forbid installs and downloads |
| Name conflict | low-medium | not trademark-cleared; documented |
| No third-party review | medium | roadmap item; claims limited |
