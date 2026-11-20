#!/usr/bin/env bash
# ============================================================================
# NOCTIS AI — PHASE 2 FULL DOMAIN TRAINING & BENCHMARK SUITE (28k SAMPLES)
# Script: scripts/run_gpu_phase2.sh
# Target Hardware: 1x NVIDIA H100 (80GB SXM) or 1x A100 (80GB)
# Base Environment: PyTorch 2.4.0, CUDA 12.4, Python 3.10/3.11
# ============================================================================

set -euo pipefail

RUN_ID="noctis-phase2-$(date -u +%Y%m%d-%H%M%S)"
DELIVERABLES_DIR="./deliverables"
LOG_FILE="${DELIVERABLES_DIR}/${RUN_ID}.log"

mkdir -p "${DELIVERABLES_DIR}"
mkdir -p "./models/noctis-7b-v2.0-adapter"
mkdir -p "./data"

# Direct all standard output and standard error to both console and log file
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "======================================================================"
echo " NOCTIS AI — PHASE 2 SCALED DOMAIN TRAINING (28,463 SAMPLES)"
echo " Run Identifier: ${RUN_ID}"
echo " Timestamp:      $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " Working Dir:    $(pwd)"
echo "======================================================================"

# Step 0: Pre-flight Hardware Verification
echo "[+] Step 0/5: Hardware and CUDA Environment Check..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "[-] ERROR: nvidia-smi not found. A CUDA-capable GPU is required."
    exit 1
fi

nvidia-smi --query-gpu=name,memory.total,memory.free,driver_version --format=csv,noheader

# Step 1: Install & Verify Pinned ML Dependencies
echo ""
echo "[+] Step 1/5: Checking ML dependencies..."
python -m pip install -q --upgrade pip
if [ -f "requirements-gpu.txt" ]; then
    python -m pip install -q -r requirements-gpu.txt
fi

python -c "
import torch, transformers, peft, trl, bitsandbytes
print(f'PyTorch:      {torch.__version__} (CUDA available: {torch.cuda.is_available()})')
if torch.cuda.is_available():
    print(f'GPU Device:   {torch.cuda.get_device_name(0)}')
    print(f'VRAM Total:   {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB')
print(f'Transformers: {transformers.__version__}')
print(f'PEFT:         {peft.__version__}')
print(f'TRL:          {trl.__version__}')
print(f'bitsandbytes: {bitsandbytes.__version__}')
"

# Step 2: Verify Baseline Responses (Reuse existing or generate if missing)
echo ""
echo "[+] Step 2/5: Checking pre-training foundation model baseline..."
if [ -f "data/noctis-baseline-qwen7b-responses.jsonl" ] && [ "$(wc -l < data/noctis-baseline-qwen7b-responses.jsonl)" -eq 250 ]; then
    echo "    Reusing verified Phase 1 baseline (250 cases already evaluated, saving 45 minutes of compute)."
else
    echo "    Running fresh 250 benchmark queries against base Qwen2.5-7B-Instruct..."
    timeout 4500s python scripts/eval_held_out_benchmark.py \
      --mode model \
      --base-model Qwen/Qwen2.5-7B-Instruct \
      --limit 250 \
      --output-file data/noctis-baseline-qwen7b-responses.jsonl
fi

# Step 3: Execute Phase 2 Supervised Fine-Tuning (28,463 samples)
echo ""
echo "[+] Step 3/5: Executing Phase 2 supervised fine-tuning on 28,463 CoT samples..."
echo "    Target: Qwen2.5-7B-Instruct with QLoRA (r=16, alpha=32, batch_size=4, grad_accum=4)"
echo "    Dataset: data/noctis-cot-training-25k.jsonl"
echo "    Output:  ./models/noctis-7b-v2.0-adapter"

timeout 18000s python scripts/train_unsloth_sft.py \
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
  --output-dir ./models/noctis-7b-v2.0-adapter

# Step 4: Evaluate Post-Training Phase 2 Checkpoint on Locked 250 Cases
echo ""
echo "[+] Step 4/5: Evaluating Phase 2 Noctis-7B V2.0 checkpoint on held-out benchmark..."
timeout 4500s python scripts/eval_held_out_benchmark.py \
  --mode model \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --adapter-path ./models/noctis-7b-v2.0-adapter \
  --limit 250 \
  --output-file data/noctis-trained-qwen7b-v2-responses.jsonl

# Step 5: Deliverable Verification, Checksums, and Packaging
echo ""
echo "[+] Step 5/5: Verifying Phase 2 deliverables, generating checksums, and packaging archive..."

WEIGHTS_FILE="./models/noctis-7b-v2.0-adapter/adapter_model.safetensors"
CONFIG_FILE="./models/noctis-7b-v2.0-adapter/adapter_config.json"

if [ ! -f "${WEIGHTS_FILE}" ]; then
    echo "[-] ERROR: Adapter weights file ${WEIGHTS_FILE} was not created."
    exit 1
fi

WEIGHTS_SIZE_MB=$(du -m "${WEIGHTS_FILE}" | cut -f1)
echo "[+] Phase 2 adapter weights confirmed: ${WEIGHTS_FILE} (${WEIGHTS_SIZE_MB} MB)"

# Generate SHA256 Checksums
CHECKSUMS_FILE="${DELIVERABLES_DIR}/CHECKSUMS-PHASE2.sha256"
sha256sum "${WEIGHTS_FILE}" > "${CHECKSUMS_FILE}"
sha256sum "${CONFIG_FILE}" >> "${CHECKSUMS_FILE}"
sha256sum "data/noctis-baseline-qwen7b-responses.jsonl" >> "${CHECKSUMS_FILE}"
sha256sum "data/noctis-trained-qwen7b-v2-responses.jsonl" >> "${CHECKSUMS_FILE}"
if [ -f "data/noctis-benchmark-model-results.md" ]; then
    sha256sum "data/noctis-benchmark-model-results.md" >> "${CHECKSUMS_FILE}"
fi

cat "${CHECKSUMS_FILE}"

# Package Final Deliverables Archive
ARCHIVE_NAME="noctis-phase2-results-${RUN_ID}.tar.gz"
echo "[+] Creating final archive: ${DELIVERABLES_DIR}/${ARCHIVE_NAME}..."
tar -czf "${DELIVERABLES_DIR}/${ARCHIVE_NAME}" \
  "./models/noctis-7b-v2.0-adapter" \
  "data/noctis-baseline-qwen7b-responses.jsonl" \
  "data/noctis-trained-qwen7b-v2-responses.jsonl" \
  "${CHECKSUMS_FILE}" \
  "${LOG_FILE}"

echo "======================================================================"
echo " NOCTIS PHASE 2 TRAINING & BENCHMARK COMPLETE!"
echo " Archive: ${DELIVERABLES_DIR}/${ARCHIVE_NAME}"
echo " Size:    $(du -h "${DELIVERABLES_DIR}/${ARCHIVE_NAME}" | cut -f1)"
echo "======================================================================"
