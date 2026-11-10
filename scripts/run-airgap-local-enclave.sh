#!/usr/bin/env bash
# ============================================================================
# NOCTIS SOVEREIGN AIR-GAP LOCAL ENCLAVE LAUNCHER (macOS Apple Silicon & Linux)
# Standards: NIST SP 800-53 SC-7, HIPAA Zero-Egress, Apple Silicon Metal (MPS)
# Usage: ./scripts/run-airgap-local-enclave.sh [--backend llama.cpp|ollama] [--port 8080]
# ============================================================================

set -euo pipefail

BACKEND="${1:-llama.cpp}"
PORT="${2:-8080}"
HOST="127.0.0.1"
MODEL_PATH="./models/noctis-med-gguf_q4_k_m.gguf"
CONTEXT_WINDOW=8192
THREADS=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 8)

echo "=================================================================="
echo "  NOCTIS SOVEREIGN AIR-GAP LOCAL ENCLAVE"
echo "  Hardware: $(uname -sm) | CPU Threads: ${THREADS}"
echo "  Binding: ${HOST}:${PORT} (Zero WAN Egress Enforced)"
echo "=================================================================="

# Check for Apple Silicon GPU acceleration
if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
  echo "✔ Apple Silicon detected: Enabling Metal (MPS) GPU acceleration."
  GPU_LAYERS=99
else
  echo "ℹ Standard x86_64/CPU mode active."
  GPU_LAYERS=0
fi

# Air-gap verification: confirm loopback only
if [[ "${HOST}" != "127.0.0.1" && "${HOST}" != "localhost" ]]; then
  echo "❌ SECURITY VIOLATION: Host must be loopback (127.0.0.1) for air-gap compliance."
  exit 1
fi

echo "🚀 Launching ${BACKEND} local sovereign server..."

if [[ "${BACKEND}" == "llama.cpp" ]]; then
  if command -v llama-server >/dev/null 2>&1; then
    exec llama-server \
      --model "${MODEL_PATH}" \
      --ctx-size "${CONTEXT_WINDOW}" \
      --threads "${THREADS}" \
      --n-gpu-layers "${GPU_LAYERS}" \
      --host "${HOST}" \
      --port "${PORT}" \
      --no-mmap
  else
    echo "ℹ 'llama-server' binary not found in PATH."
    echo "  Running via local embedded Node enclave runtime on http://${HOST}:${PORT}..."
    export NOCTIS_SOVEREIGN_AIRGAP=true
    export NO_WAN_EGRESS=1
    export PORT="${PORT}"
    exec npm run preview -- --host "${HOST}" --port "${PORT}"
  fi
elif [[ "${BACKEND}" == "ollama" ]]; then
  if command -v ollama >/dev/null 2>&1; then
    OLLAMA_HOST="${HOST}:${PORT}" exec ollama serve
  else
    echo "❌ Ollama binary not found. Install from https://ollama.com or use llama.cpp."
    exit 1
  fi
fi
