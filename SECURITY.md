# Security policy

## Reporting a vulnerability
Use GitHub private vulnerability reporting: https://github.com/shahvatsalofficial/localsutra-ai/security/advisories/new . Do not open a public issue. Do not include model files, API keys, prompts, hardware inventories or system identifiers; send a minimal redacted proof of concept. Expect an acknowledgement within 7 days (volunteer project, no SLA).

## Supported versions
Only the latest published `0.x` release receives fixes.

## Scope
In scope: endpoint validation bypass (SSRF, redirects, DNS/IP spellings), unbounded reads or resource exhaustion, installer path or symlink escape, overwrite of existing files, secret or prompt leakage into reports, report-seal bypass, report-server authentication bypass, HTML/Markdown report injection.
Out of scope: vulnerabilities in Ollama, llama.cpp, NVIDIA drivers, Node.js or your IDE; telemetry or egress of those programs; social engineering.

## Current controls
Loopback-only URL validation (no credentials, path, query, redirect, `localhost`, public or `0.0.0.0` hosts); fetch with `redirect: "error"`, timeouts and a 256 KB response cap; bounded runs, iterations, catalog and JSON size; create-only report writes; segment-by-segment symlink refusal in the installer; fixed-argv, shell-free `nvidia-smi` call with strict output parsing; secret redaction; HTML/Markdown escaping; bearer-token (24+ chars, constant-time compare) read-only report server on `127.0.0.1`; no prompt or response text stored.

## Known limits
No independent third-party security review has been done. Runtime egress and telemetry of Ollama/llama.cpp are not monitored. A SHA-256 seal is integrity, not a signature. No SBOM or signed release artifacts yet (npm provenance is used when published from CI). See `docs/THREAT_MODEL.md`.
