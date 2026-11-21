#!/usr/bin/env bash
set -euo pipefail

echo "[+] Ensuring server dependencies are installed..."
pip install -q fastapi uvicorn "transformers==4.45.2" peft accelerate rich

echo "[+] Launching Noctis Inference Server with Real-Time Streaming..."
python scripts/serve_model.py
