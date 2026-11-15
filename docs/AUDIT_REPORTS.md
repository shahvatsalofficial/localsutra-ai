# Audit reports (HTML, Markdown, JSON)

```bash
localsutra audit --out my-audit          # --force overwrites, --quiet silences the summary
```

Writes `my-audit/audit-report.{html,md,json}` and `my-audit/artifacts/<name>.{html,md,json}` for the hardware profile, model-fit report, runtime diagnostics (mock fixture), benchmark and privacy check.

- Open the `.html` in any browser: self-contained, responsive, light/dark, printable.
- Paste the `.md` into an issue or pull request.
- Machine-read the `.json`; check it with `localsutra verify --report my-audit/audit-report.json`.

## Contents
Verdict and rule, environment, 37 assurance checks (expected vs observed vs result), sample outputs, evidence tiers (what each artifact proves and does not prove), a not-tested list, and SHA-256 hashes of the artifact JSON files.

## Verdicts
- `APPROVED_WITH_EVIDENCE`: every check ran and passed.
- `REVIEW_REQUIRED`: no failures, but a check was skipped on this host (for example an OS that forbids creating links).
- `BLOCKED_UNSAFE`: at least one safety check failed. `localsutra audit` exits 1.

None of these is a certification. Live inference is always listed as not tested. The checks are in `packages/core/audit.mjs`; a real sample is in `docs/proof/audit-sample/`. CI uploads the audit as a build artifact.
