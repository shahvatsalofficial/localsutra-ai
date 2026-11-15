# IDE compatibility

| Host | Target path | File placement | Native discovery/activation |
|---|---|---|---|
| Claude Code | `.claude/skills` | tested (25 skills) | not verified |
| Cursor | `.cursor/skills` | tested | not verified |
| OpenAI Codex | `.agents/skills` | tested | not verified |
| Gemini CLI | `.gemini/skills` | tested | not verified |
| GitHub Copilot | `.github/skills` | tested | not verified |
| OpenCode | `.opencode/skills` | tested | not verified |

Placement is verified byte-for-byte against the canonical sources (`tests/features.test.mjs`). Whether a given IDE version loads and applies a skill, and what permissions it grants, must be checked per product version because paths and rules change. Guidance files shipped: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, `.github/instructions`. The CLI gives the same deterministic results with no IDE at all.
