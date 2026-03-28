Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$nativeTools = Join-Path $root "scripts\\native-tools.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "node not found. Install Node.js 18+ first."
}

node $nativeTools bindings @args
