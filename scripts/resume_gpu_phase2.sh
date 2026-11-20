#!/usr/bin/env bash
# ============================================================================
# NOCTIS AI — RESUME PHASE 2 TRAINING FROM CHECKPOINT-2100 TO STEP 3,939
# Script: scripts/resume_gpu_phase2.sh
# Target: 1x NVIDIA H100 (80GB SXM)
# ============================================================================

set -euo pipefail

RUN_ID="noctis-phase2-resume-$(date -u +%Y%m%d-%H%M%S)"
DELIVERABLES_DIR="./deliverables"
LOG_FILE="${DELIVERABLES_DIR}/${RUN_ID}.log"

mkdir -p "${DELIVERABLES_DIR}"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "======================================================================"
echo " NOCTIS AI — RESUMING PHASE 2 TRAINING (STEP 2,101 -> 3,939)"
echo " Run Identifier: ${RUN_ID}"
echo " Timestamp:      $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " Working Dir:    $(pwd)"
echo "======================================================================"

# Step 0: Git pull latest code
echo "[+] Step 0/4: Pulling latest code..."
git fetch origin main
git checkout main
git pull origin main

# Step 1: Check dependencies
echo ""
echo "[+] Step 1/4: Checking dependencies..."
pip install -q transformers peft accelerate bitsandbytes datasets trl

# Step 2: Resume Training from checkpoint-2100
echo ""
echo "[+] Step 2/4: Resuming QLoRA fine-tuning from checkpoint-2100..."
python scripts/train_unsloth_sft.py \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --dataset data/noctis-cot-training-25k.jsonl \
  --eval-dataset data/noctis-cot-validation-250.jsonl \
  --epochs 3 \
  --batch-size 4 \
  --grad-accum 4 \
  --lr 2e-4 \
  --lora-r 16 \
  --lora-alpha 32 \
  --max-seq-length 2048 \
  --output-dir ./models/noctis-7b-v2.0-adapter \
  --resume-from-checkpoint ./models/noctis-7b-v2.0-adapter/checkpoint-2100

# Step 3: Run Post-Training Held-Out Benchmark on 250 Locked Cases
echo ""
echo "[+] Step 3/4: Evaluating final 3-epoch checkpoint on held-out benchmark..."
python scripts/eval_held_out_benchmark.py \
  --mode model \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --adapter-path ./models/noctis-7b-v2.0-adapter \
  --limit 250 \
  --output-file data/noctis-trained-qwen7b-v2-responses.jsonl

# Step 4: Package Final 3-Epoch Deliverable Archive
echo ""
echo "[+] Step 4/4: Packaging final 3-epoch deliverable archive..."
WEIGHTS_FILE="./models/noctis-7b-v2.0-adapter/adapter_model.safetensors"
CONFIG_FILE="./models/noctis-7b-v2.0-adapter/adapter_config.json"
CHECKSUMS_FILE="${DELIVERABLES_DIR}/CHECKSUMS-PHASE2-FINAL.sha256"

sha256sum "${WEIGHTS_FILE}" > "${CHECKSUMS_FILE}"
sha256sum "${CONFIG_FILE}" >> "${CHECKSUMS_FILE}"
sha256sum "data/noctis-baseline-qwen7b-responses.jsonl" >> "${CHECKSUMS_FILE}"
sha256sum "data/noctis-trained-qwen7b-v2-responses.jsonl" >> "${CHECKSUMS_FILE}"

ARCHIVE_NAME="noctis-phase2-results-final-3epochs.tar.gz"
tar -czf "${DELIVERABLES_DIR}/${ARCHIVE_NAME}" \
  "./models/noctis-7b-v2.0-adapter" \
  "data/noctis-baseline-qwen7b-responses.jsonl" \
  "data/noctis-trained-qwen7b-v2-responses.jsonl" \
  "${CHECKSUMS_FILE}" \
  "${LOG_FILE}"

echo "======================================================================"
echo " NOCTIS PHASE 2 FULL 3-EPOCH TRAINING COMPLETE!"
echo " Archive: ${DELIVERABLES_DIR}/${ARCHIVE_NAME}"
echo " Size:    $(du -h "${DELIVERABLES_DIR}/${ARCHIVE_NAME}" | cut -f1)"
echo "======================================================================"
