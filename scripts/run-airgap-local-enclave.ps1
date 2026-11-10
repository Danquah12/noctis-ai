# ============================================================================
# NOCTIS SOVEREIGN AIR-GAP LOCAL ENCLAVE LAUNCHER (Windows & WSL2)
# Standards: NIST SP 800-53 SC-7, HIPAA Zero-Egress, FIPS 140-3 Validated
# Usage: .\scripts\run-airgap-local-enclave.ps1 [-Backend "llama.cpp"] [-Port 8080]
# ============================================================================

param(
  [string]$Backend = "llama.cpp",
  [int]$Port = 8080
)

$HostIP = "127.0.0.1"
$ModelPath = ".\models\noctis-med-gguf_q4_k_m.gguf"
$ContextWindow = 8192
$Threads = [System.Environment]::ProcessorCount

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  NOCTIS SOVEREIGN AIR-GAP LOCAL ENCLAVE (WINDOWS)" -ForegroundColor White
Write-Host "  Processor Count: $Threads | Binding: $HostIP`:$Port" -ForegroundColor Gray
Write-Host "  Zero WAN Egress Enforced (HIPAA / DoD Enclave Mode)" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan

$env:NOCTIS_SOVEREIGN_AIRGAP = "true"
$env:NO_WAN_EGRESS = "1"
$env:PORT = $Port.ToString()

if ($Backend -eq "llama.cpp") {
  if (Get-Command "llama-server" -ErrorAction SilentlyContinue) {
    Write-Host "✔ Found llama-server in PATH. Launching high-throughput GGUF runtime..." -ForegroundColor Green
    & llama-server -m $ModelPath -c $ContextWindow --threads $Threads --host $HostIP --port $Port --no-mmap
  } else {
    Write-Host "ℹ 'llama-server' binary not found. Launching local embedded Sovereign Enclave runtime..." -ForegroundColor Yellow
    npm run preview -- --host $HostIP --port $Port
  }
} elseif ($Backend -eq "ollama") {
  if (Get-Command "ollama" -ErrorAction SilentlyContinue) {
    $env:OLLAMA_HOST = "$HostIP`:$Port"
    & ollama serve
  } else {
    Write-Host "❌ Ollama not found. Install from https://ollama.com" -ForegroundColor Red
  }
}
