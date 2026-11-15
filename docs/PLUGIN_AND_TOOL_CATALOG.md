# LocalSutra integration catalog — research candidates, not installed

| Technology | Priority | Purpose | Permission / caveat |
|---|---|---|---|
| Ollama | P0 | Locally installed model inventory and generation timing | Optional local runtime; opt-in localhost HTTP; model pull never automatic |
| llama.cpp | P0 | Local server health and GGUF inference | /health probe implemented; actual completion benchmark planned |
| ONNX Runtime | P1 | On-device runtime execution and EP checks | Execution providers vary by hardware, check installed build |
| OpenVINO | P1 | Intel CPU/GPU/NPU device selection | Driver/hardware permissions and OS dependencies |
| LocalAI | P2 | Additional self-hosted inference backend | Separate adapter and authentication model |
| MLX | P2 | Apple Silicon local inference | macOS only and model compatibility constraints |
| Gitleaks | P1 | Privacy/secret scanning in CI | Install only with consent and maintained version |
| OSV-Scanner | P1 | Dependency vulnerability scanning | No automatic external queries without policy |
| MCP Inspector | P2 | Verify future local MCP adapter | Use local test server, no arbitrary protocol probing |
| Docker/Podman | P2 | Sandboxed model runtime tests | Consent for downloads, network and resource use |
| OpenTelemetry | P3 | Opt-in internal diagnostics | Never leak hardware inventory/prompt text by default |
| Agent Skills | P0 | SKILL.md portability across IDEs | Native activation must be tested per host/version |

Sources: https://docs.ollama.com/api/ ; https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md ; https://onnxruntime.ai/docs/execution-providers/ ; https://agentskills.io/specification ; https://github.com/modelcontextprotocol/inspector .

Never assume a tool is installed. Inventory local software, assess licensing/release authenticity/security and obtain permission before global plugin/skill install, large downloads, paid services or driver changes.
