# Operations and Release

## Distribution
- npm package `localsutra-ai` (binaries `localsutra`, `localsutra-ai`), Apache-2.0.
- Source: https://github.com/shahvatsalofficial/localsutra-ai
- `npm pack` contents are limited by the `files` allow-list (packages, skills, agents, schemas, rules, policies, workflows, fixtures, docs, examples, notices).

## Continuous integration

@@diagram:ci@@

| Job | What it does |
|---|---|
| `test` matrix | Linux Node 22/24, Windows Node 22/24, macOS Node 24: tests, `doctor`, `demo`, `audit` |
| `package` | `npm pack`, install the tarball in an empty project, run the CLI through the npm shim, check audit files and skill install |
| `secrets-scan` | greps history for token patterns |
| Artifact | audit report uploaded from Linux Node 22 |

A workflow file is not proof that it ran. Check the Actions tab for the real results.

## Release process
1. Update version in `package.json` and `packages/core/version.mjs` (a test enforces equality), `CITATION.cff`, `CHANGELOG.md`.
2. `npm test`, `npm run proof`, `npm run audit`.
3. Commit, push, wait for CI.
4. Tag `vX.Y.Z`. The Release workflow re-runs tests, checks the tag matches, skips if the version already exists on npm, otherwise publishes with provenance (npm trusted publishing/OIDC).
5. Human sign-off recorded in the release notes.

## Rollback
Publish a new patch version; `npm deprecate` the bad one. Never unpublish after others may depend on it.

## Operations FAQ
| Question | Answer |
|---|---|
| Does it phone home? | No. |
| Does it need a daemon? | No. `serve` is manual and optional. |
| Where do reports go? | Where you point `--out`. Never overwritten without `--force`. |
| Upgrade? | `npm install -g localsutra-ai@latest` |
| Uninstall? | `npm uninstall -g localsutra-ai`; delete any skills you copied into projects. |

## Support
GitHub issues. Security issues via private advisory. No SLA.
