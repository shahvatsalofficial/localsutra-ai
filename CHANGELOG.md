# Changelog

## 0.2.0 — 2026-11-16
### Added
- `audit` command: 37 adversarial assurance checks, sample outputs, evidence tiers and a not-tested list, written as **HTML, Markdown and JSON** (`audit-report.*` plus per-artifact reports). Verdicts: `APPROVED_WITH_EVIDENCE`, `REVIEW_REQUIRED`, `BLOCKED_UNSAFE`.
- Every report command now writes JSON + Markdown + HTML (`--out`) or prints any of them (`--format`). Accessible, responsive, light/dark, print-friendly HTML.
- Hardware: NVIDIA GPU name/VRAM/driver via `nvidia-smi` (fixed argv, strict parser), free disk space, WSL detection, single-GPU VRAM fit.
- Runtime probe failure codes (`timeout`, `redirect_refused`, `response_too_large`, `invalid_payload`, `unreachable`, `http_error`, `not_ready`), cold vs warm labelling for inference samples, benchmark warm-up and stdev.
- `--version`, `--force`, `--quiet`, `--dry-run`, `--format`; `privacy` now includes a data inventory.
- `scripts/proof.mjs` regenerates test logs, fuzz results, CLI transcripts and a real audit under `docs/proof/`.
- Documentation set under `documents/LocalSutra-AI/` (MD + HTML), `llms.txt`, `CITATION.cff`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `SUPPORT.md`.
- 122 tests (was 84), including seeded fuzzing and CLI end-to-end tests.
### Fixed
- Installer rejected valid project directories on Windows when the path used 8.3 short names (false "symlinked project" error). It now canonicalises the root and checks every deeper path segment with `lstat`.
- Windows CI: symlink tests now use junctions; no more `EPERM` failures; test runner no longer depends on shell globbing.
- `canonical()` serialised `undefined` members inconsistently, which could break a seal after a JSON round-trip.
- Report server now answers non-GET requests with 405 and no longer sends a permissive CORS header.
- Markdown reports now escape pipes and control characters; duplicate model ids and empty catalogs are rejected.
### Changed
- Published as `localsutra-ai` on npm (binary names `localsutra`, `localsutra-ai`).

## 0.1.0 — 2026-11-16
Working offline-first core, explicit loopback probe, benchmark/report APIs, initial specialist skills and workflow definitions.
