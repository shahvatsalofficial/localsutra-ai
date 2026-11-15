# Third-party notices

**Runtime dependencies: none.** LocalSutra AI uses only Node.js built-in modules (`node:fs`, `node:path`, `node:os`, `node:crypto`, `node:http`, `node:child_process`, `node:test`).

**Development dependencies: none.** Tests use the built-in `node:test` runner.

**Bundled content:** all code, skills, schemas, rules, workflows, fixtures and documents are original works by Vatsal Shah under Apache-2.0. Model descriptors in `fixtures/` are synthetic; no model weights, tokenizer data or benchmark datasets are included.

**External programs the CLI may invoke (not bundled):** `nvidia-smi` (NVIDIA driver package), run with a fixed argument list and no shell, only when found on PATH. It is read-only. Ollama and llama.cpp are contacted over loopback HTTP only when you run `probe` or `infer`; they are not installed, bundled or controlled by this project, and carry their own licenses and network behaviour.

**CI actions used by workflows** (`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`) are used from their upstream repositories under their own licenses and are not redistributed in the npm package.

Verify yourself: `npm ls --all` shows no dependencies; `npm pack --dry-run` lists exactly what is published.
