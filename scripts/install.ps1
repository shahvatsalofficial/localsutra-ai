$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
Write-Host "LocalSutra AI: project-local CLI uses only Node.js 20+. No model download or global install."
Write-Host "Run: npm test; npm run demo"
