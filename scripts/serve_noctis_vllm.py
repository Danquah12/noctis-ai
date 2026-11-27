#!/usr/bin/env python3
"""
============================================================================
NOCTIS vLLM PRODUCTION SERVING LAUNCHER & ENDPOINT PROBE
Reference Architecture: NOCTIS-SERVE-VLLM-004
Outputs the exact vLLM LoRA serving command + Vercel env wiring (`NOCTIS_LLM_URL`)
and optionally probes a running OpenAI-compatible vLLM endpoint.
============================================================================
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(description="Noctis vLLM Production Serving & Health Probe")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-7B-Instruct")
    parser.add_argument("--lora-path", default="./models/noctis-7b-v1.0-dpo-adapter")
    parser.add_argument("--lora-name", default="noctis-7b-v2.0")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--max-model-len", type=int, default=8192)
    parser.add_argument("--tp-size", type=int, default=1)
    parser.add_argument("--probe-url", default="", help="Probe a running vLLM endpoint (/v1/models)")
    parser.add_argument("--launch", action="store_true", help="Actually execute vllm serve")
    parser.add_argument("--dry-run", action="store_true", help="Print command & Vercel env wiring only")
    args = parser.parse_args()

    if args.probe_url:
        base = args.probe_url.rstrip("/")
        models_url = f"{base}/models" if base.endswith("/v1") else f"{base}/v1/models"
        with urllib.request.urlopen(models_url, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        print(json.dumps({"status": "healthy", "endpoint": models_url, "models": data.get("data", [])}, indent=2))
        return 0

    cmd = [
        "vllm", "serve", args.base_model,
        "--host", args.host,
        "--port", str(args.port),
        "--dtype", "bfloat16",
        "--max-model-len", str(args.max_model_len),
        "--tensor-parallel-size", str(args.tp_size),
        "--enable-lora",
        "--lora-modules", f"{args.lora_name}={args.lora_path}",
    ]

    print("vLLM Serving Command:")
    print(" ", " ".join(cmd))
    print("\nVercel Production Env Wiring (https://www.dstrike.app):")
    print(f"  NOCTIS_LLM_URL=https://<your-gpu-host>/v1")
    print(f"  NOCTIS_LLM_MODEL={args.lora_name}")

    if args.launch and not args.dry_run:
        return subprocess.call(cmd)
    return 0


if __name__ == "__main__":
    sys.exit(main())
