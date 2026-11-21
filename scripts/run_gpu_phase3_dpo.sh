#!/usr/bin/env bash
# ============================================================================
# NOCTIS AI — PHASE 3 DIRECT PREFERENCE OPTIMIZATION (DPO) ALIGNMENT
# Target Hardware: 1x NVIDIA H100 (80GB SXM) / A100 (80GB)
# ============================================================================

set -euo pipefail

RUN_ID="noctis-phase3-dpo-$(date -u +%Y%m%d-%H%M%S)"
DELIVERABLES_DIR="./deliverables"
LOG_FILE="${DELIVERABLES_DIR}/${RUN_ID}.log"

mkdir -p "${DELIVERABLES_DIR}"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "======================================================================"
echo " NOCTIS AI — STARTING PHASE 3 DPO CLINICAL SAFETY ALIGNMENT"
echo " Run Identifier: ${RUN_ID}"
echo " Timestamp:      $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " Working Dir:    $(pwd)"
echo "======================================================================"

# Step 1: Verify Dependencies
echo "[+] Step 1/3: Checking DPO dependencies..."
pip install -q "transformers==4.45.2" "trl==0.11.4" peft accelerate bitsandbytes datasets rich

# Step 2: Run DPO Alignment
echo ""
echo "[+] Step 2/3: Executing Direct Preference Optimization..."
python scripts/train_clinical_dpo.py \
  --model-path ./models/noctis-7b-v2.0-merged \
  --dataset data/noctis-dpo-clinical-safety.jsonl \
  --output-dir ./models/noctis-7b-v3.0-dpo \
  --epochs 1 \
  --batch-size 2 \
  --grad-accum 8 \
  --lr 5e-6 \
  --beta 0.1 \
  --lora-r 16 \
  --lora-alpha 32

echo "======================================================================"
echo " NOCTIS PHASE 3 DPO ALIGNMENT SUCCESSFUL!"
echo " Model: ./models/noctis-7b-v3.0-dpo"
echo " Log:   ${LOG_FILE}"
echo "======================================================================"
