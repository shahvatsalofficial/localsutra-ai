# Real-World Scenarios

Nine everyday situations, each with the exact commands and the **real output** produced by the CLI when this site was built. Hardware figures for the laptop and GPU desktop are examples; your numbers will come from your own machine.

> Nothing on this page ran a real language model. Timing in scenario 5 comes from a small mock server on loopback so the chart is reproducible. On your machine, `infer` talks to your own Ollama.

## 1. Can my 16 GB laptop run these models?

**Who:** a student with a 16 GB laptop, no GPU, who wants to try a local assistant for notes.
**Problem:** forum posts say "a 7B model needs 8 GB" and "a 13B model needs 16 GB". The student has about 8 GB free right now.

```bash
localsutra fit --catalog catalog.json --profile laptop-16gb.json --format md
```

@@term:s1@@

@@html:mem@@

How to read it: the bar is the estimated memory need (weights plus 35% runtime headroom, fixed overhead and, when you supply it, KV cache). The dashed line is free RAM. A bar that ends before the line is `possibly_fits`. That means "memory looks plausible", never "it will run quickly".

> **Takeaway:** the 1B and 3B models fit comfortably, the 7B 4-bit model is tight but plausible, and the 8-bit 7B, the 13B and the 70B models do not fit in 8 GB of free RAM. Close other programs to free memory before concluding anything.

## 2. I have an NVIDIA GPU. Does VRAM change the answer?

**Who:** a gamer with 32 GB RAM and an RTX 3060 with 12 GB of VRAM.
**Problem:** is it worth running the model on the GPU, or will it spill into system RAM?

```bash
localsutra doctor --out my-pc       # detects the GPU through nvidia-smi
localsutra fit --catalog catalog.json --profile my-pc.json
```

@@term:s2@@

The VRAM column appears only when `nvidia-smi` returned parseable output. The sample above uses a fixture line shaped like real `nvidia-smi` output, not a real card. On a machine without a detected GPU the column reads `not_evaluated`. It never guesses.

> **Takeaway:** by this estimate everything up to the 13B 4-bit model fits within 12 GB of VRAM, while the 70B model does not. The 8-bit 7B and the 13B leave less than 3 GB spare, so a longer context could push them over. Partial offload is **not** modelled: treat "exceeds VRAM" as "check your runtime's offload settings".

## 3. Ollama is not running. What does the tool say?

**Who:** a developer who just installed Ollama and gets connection errors in an app.
**Problem:** is the server up, on which port, and why not?

```bash
localsutra probe --runtime ollama
```

@@term:s3@@

@@diagram:probe@@

The stable `failureCode` lets scripts react: `unreachable` (nothing listening), `timeout`, `redirect_refused`, `response_too_large`, `invalid_payload`, `http_error`, `not_ready`. A healthy answer sets `status: responding` and `failureCode: null`, and still reports **inference not tested**.

> **Takeaway:** `responding` means the HTTP service answered. It does not mean a model can load or run.

## 4. A config points the tool at a cloud endpoint

**Who:** a team lead reviewing a shared script that sets `--endpoint` to a hosted API.
**Problem:** will this tool send anything off the machine?

@@term:s4@@

The policy check runs before any socket is opened. Three different mistakes are refused: a public HTTPS host, the hostname `localhost` (which depends on DNS and hosts-file resolution) and credentials embedded in the URL.

> **Takeaway:** there is no flag that disables the loopback rule and no cloud fallback. If you need a remote endpoint, this is the wrong tool by design.

## 5. How fast is my model? Cold vs warm

**Who:** a developer comparing two quantizations on their own laptop.
**Problem:** the first request is slow, later ones are fast. Which number is "the speed"?

```bash
localsutra infer --model llama3.2:3b --runs 4
```

@@term:s5@@

@@html:cw@@

Run 1 includes loading the model into memory (cold). Runs 2 to 4 are warm. Tokens per second are shown only when the runtime reported counters; otherwise the field says `not reported`. Your prompt is stored as a SHA-256 hash and the output is discarded. The last line of the terminal checks that neither appears in the report.

> **Takeaway:** quote warm timings for steady-state speed and cold timings for "time to first answer". Never compare timings across different hardware, context length or quantization. The tool refuses to rank them.

## 6. Someone edits the report after the fact

**Who:** a reviewer who receives a benchmark report from a colleague.
**Problem:** the numbers look too good. Was the file changed?

@@term:s6@@

@@diagram:seal@@

The seal is a SHA-256 over the canonical JSON of the report. It detects a changed byte. It does **not** say who made the report: someone who edits a file can re-seal it, so treat a seal as tamper evidence, not a signature.

> **Takeaway:** `verify` exits with code 1 on mismatch, so a CI job or a script can reject an edited report automatically.

## 7. Attach the audit to every pull request

**Who:** a maintainer who ships a project that depends on local AI tooling.
**Problem:** reviewers need evidence, not a "works on my machine" comment.

@@diagram:ci@@

```yaml
# .github/workflows/localsutra.yml
name: LocalSutra audit
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: {node-version: '24'}
      - run: npx --yes localsutra-ai audit --out audit-out
      - uses: actions/upload-artifact@v7
        with: {name: localsutra-audit, path: audit-out}
```

The job fails (exit 1) only when the verdict is `BLOCKED_UNSAFE`. Reviewers open `audit-report.html` from the artifact. See the [audit explained](13-assurance-and-evidence.html).

## 8. Roll the skills out to a team

**Who:** a team that uses Claude Code, Cursor and Copilot on the same repository.
**Problem:** everyone should use the same instructions without anyone overwriting local customisations.

@@term:s8@@

@@diagram:agents@@

Run the dry-run first. The real command writes only files that do not already exist, one folder per skill, and refuses symlinked paths. Whether each IDE loads the skills is **not verified** by this project: check your product version.

> **Takeaway:** skills are text instructions. They cannot grant a tool permission or run a model by themselves.

## 9. Is my local setup really private?

**Who:** a privacy-minded user who runs Ollama and wants to say "my data stays local".
**Problem:** a `127.0.0.1` address looks reassuring, but is it proof?

@@term:s9@@

@@html:ladder@@

`modelRuntimeEgress: not_tested` is deliberate. LocalSutra validates the address it talks to. It cannot see what Ollama or llama.cpp do on the network. To make an offline claim, disconnect the network or use a firewall rule and watch for traffic with an external tool.

> **Takeaway:** "local" is a property of your whole setup. This tool reports exactly what it checked and what it did not.
