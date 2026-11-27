#!/usr/bin/env bash
set -euo pipefail

# Noctis 1B-Token Cloud GPU Training & Promotion Pipeline
# Designed for single/multi-GPU H100/A100 cloud instances (RunPod, Lambda, Modal, AWS EC2).
#
# Environment overrides:
#   BASE_MODEL     (default: unsloth/Qwen2.5-14B-Instruct-bnb-4bit)
#   TARGET_TOKENS  (default: 1000000000)
#   SFT_CKPT_DIR   (default: ./checkpoints/noctis-1b-sft)
#   DPO_CKPT_DIR   (default: ./checkpoints/noctis-1b-dpo)
#   VLLM_PORT      (default: 8000)

TARGET_TOKENS="${TARGET_TOKENS:-1000000000}"
SFT_CKPT_DIR="${SFT_CKPT_DIR:-./checkpoints/noctis-1b-sft}"
DPO_CKPT_DIR="${DPO_CKPT_DIR:-./checkpoints/noctis-1b-dpo}"
VLLM_PORT="${VLLM_PORT:-8000}"

echo "=== [1/5] Checking NVIDIA GPU & Python Dependencies ==="
if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "ERROR: nvidia-smi not found. Run this script on an A100/H100 Linux GPU host."
  exit 1
fi
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader

python3 -m pip install --upgrade pip
python3 -m pip install -q unsloth trl datasets accelerate bitsandbytes peft vllm huggingface_hub

echo "=== [2/5] Running 1B-Token Streaming Unsloth QLoRA SFT ==="
python3 scripts/train_unsloth_sft.py \
  --stream-open-corpora \
  --target-tokens "${TARGET_TOKENS}" \
  --output-dir "${SFT_CKPT_DIR}"

echo "=== [3/5] Running DPO Alignment over 51k+ Preference Pairs ==="
python3 scripts/train_dpo.py \
  --model-dir "${SFT_CKPT_DIR}" \
  --output-dir "${DPO_CKPT_DIR}"

echo "=== [4/5] Running Held-Out Checkpoint Promotion Gate ==="
python3 scripts/eval_checkpoint.py \
  --checkpoint "${DPO_CKPT_DIR}" \
  --strict

echo "=== [5/5] Launching vLLM OpenAI-Compatible Serving Endpoint on :${VLLM_PORT} ==="
echo "Once healthy, point Vercel production traffic with:"
echo "  vercel env add VLLM_BASE_URL production  # https://<gpu-host>:${VLLM_PORT}/v1"
exec python3 scripts/serve_noctis_vllm.py \
  --model "${DPO_CKPT_DIR}" \
  --port "${VLLM_PORT}"
