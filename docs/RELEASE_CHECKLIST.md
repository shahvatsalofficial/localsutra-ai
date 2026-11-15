# Release checklist
1. `npm test` green; `npm run proof` shows 0 failed and 0 unexpected fuzz crashes.
2. `npm run audit` verdict is not `BLOCKED_UNSAFE`; skipped checks are explained.
3. `package.json`, `packages/core/version.mjs`, `CITATION.cff` and `CHANGELOG.md` agree on the version (a test enforces the first two).
4. `npm pack --dry-run` lists only intended files; no secrets (`git grep` token patterns).
5. CI matrix green on Linux, Windows and macOS.
6. Tag `vX.Y.Z`; the Release workflow publishes with provenance and is idempotent for an existing version.
7. A human maintainer signs off. No automated tool approves a release.
