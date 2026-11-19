#!/usr/bin/env bash
# ============================================================================
# NOCTIS AI — GENUINE QLORA SFT PILOT AUTOMATED CLOUD GPU RUNNER
# Script: scripts/run_gpu_pilot.sh
# Target Hardware: 1x NVIDIA A100 (80GB) or 1x RTX 4090 (24GB)
# Base Environment: PyTorch 2.4.0, CUDA 12.4, Python 3.10/3.11
# ============================================================================

set -euo pipefail

RUN_ID="noctis-run-$(date -u +%Y%m%d-%H%M%S)"
DELIVERABLES_DIR="./deliverables"
LOG_FILE="${DELIVERABLES_DIR}/${RUN_ID}.log"

mkdir -p "${DELIVERABLES_DIR}"
mkdir -p "./models"
mkdir -p "./data"

# Direct all standard output and standard error to both console and log file
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "======================================================================"
echo " NOCTIS AI — GENUINE MODEL TRAINING & BENCHMARK SUITE (PILOT V1.0)"
echo " Run Identifier: ${RUN_ID}"
echo " Timestamp:      $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " Working Dir:    $(pwd)"
echo "======================================================================"

# Step 0: Pre-flight Hardware Verification (Strict, aborts on failure)
echo "[+] Step 0/6: Hardware and CUDA Environment Check..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "[-] ERROR: nvidia-smi not found. A CUDA-capable GPU is required."
    exit 1
fi

nvidia-smi --query-gpu=name,memory.total,memory.free,driver_version --format=csv,noheader

# Step 1: Install & Verify Pinned ML Dependencies
echo ""
echo "[+] Step 1/6: Installing pinned ML dependencies from requirements-gpu.txt..."
python -m pip install -q --upgrade pip
if [ -f "requirements-gpu.txt" ]; then
    python -m pip install -q -r requirements-gpu.txt
else
    echo "[-] ERROR: requirements-gpu.txt not found in current directory."
    exit 1
fi

# Verify Python ML stack versions
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

# Step 2: GPU Training Smoke Test (Model Initialization, Optimizer Steps, Weight Update & Reload)
echo ""
echo "[+] Step 2/6: Executing GPU training smoke test (3 steps with weight verification)..."
timeout 600s python scripts/train_unsloth_sft.py \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --smoke-test \
  --output-dir ./models/smoke-test-adapter

echo "[+] GPU initialization, optimizer update, and adapter reload verified."

# Step 3: Establish Pre-Training Foundation Model Baseline (Locked 250 Held-Out Cases)
echo ""
echo "[+] Step 3/6: Establishing genuine baseline on unmodified Qwen2.5-7B-Instruct..."
echo "    Executing 250 benchmark queries (resumable, strict 75-minute timeout)..."
timeout 4500s python scripts/eval_held_out_benchmark.py \
  --mode model \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --limit 250 \
  --output-file data/noctis-baseline-qwen7b-responses.jsonl

if [ ! -f "data/noctis-baseline-qwen7b-responses.jsonl" ]; then
    echo "[-] ERROR: Baseline output data/noctis-baseline-qwen7b-responses.jsonl was not generated."
    exit 1
fi
BASELINE_LINES=$(wc -l < data/noctis-baseline-qwen7b-responses.jsonl)
if [ "${BASELINE_LINES}" -ne 250 ]; then
    echo "[-] ERROR: Baseline evaluation yielded ${BASELINE_LINES} responses. Expected exactly 250."
    exit 1
fi
echo "[+] Baseline evaluation complete: exactly 250 responses generated and scored."

# Step 4: Execute Authentic Supervised Fine-Tuning (QLoRA)
echo ""
echo "[+] Step 4/6: Executing authentic supervised fine-tuning (QLoRA) on Qwen2.5-7B..."
echo "    Target: 3 Epochs, Rank 16, Alpha 32, Max Seq Length 2048"
echo "    Linear targets: q, k, v, o, gate, up, down proj"
echo "    Executing training with strict 120-minute timeout..."
timeout 7200s python scripts/train_unsloth_sft.py \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --epochs 3 \
  --batch-size 2 \
  --grad-accum 8 \
  --lr 2e-4 \
  --lora-r 16 \
  --lora-alpha 32 \
  --max-seq-length 2048 \
  --output-dir ./models/noctis-7b-v1.0-adapter

# Step 5: Evaluate Post-Training Noctis Checkpoint on the Same Locked 250-Case Benchmark
echo ""
echo "[+] Step 5/6: Evaluating fine-tuned Noctis adapter checkpoint on locked 250 cases..."
echo "    Executing evaluation (resumable, strict 75-minute timeout)..."
timeout 4500s python scripts/eval_held_out_benchmark.py \
  --mode model \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --adapter-path ./models/noctis-7b-v1.0-adapter \
  --limit 250 \
  --output-file data/noctis-trained-qwen7b-responses.jsonl

if [ ! -f "data/noctis-trained-qwen7b-responses.jsonl" ]; then
    echo "[-] ERROR: Post-training output data/noctis-trained-qwen7b-responses.jsonl was not generated."
    exit 1
fi
POST_LINES=$(wc -l < data/noctis-trained-qwen7b-responses.jsonl)
if [ "${POST_LINES}" -ne 250 ]; then
    echo "[-] ERROR: Post-training evaluation yielded ${POST_LINES} responses. Expected exactly 250."
    exit 1
fi
echo "[+] Post-training evaluation complete: exactly 250 responses generated and scored."

# Step 6: Deliverable Verification, Checksums, and Packaging
echo ""
echo "[+] Step 6/6: Verifying deliverable integrity, generating checksums, and packaging archive..."

# Verify adapter weights file exists and is substantial (> 50MB)
WEIGHTS_FILE="./models/noctis-7b-v1.0-adapter/adapter_model.safetensors"
CONFIG_FILE="./models/noctis-7b-v1.0-adapter/adapter_config.json"

if [ ! -f "${WEIGHTS_FILE}" ]; then
    echo "[-] ERROR: Trained adapter weights file ${WEIGHTS_FILE} does not exist!"
    exit 1
fi

WEIGHTS_SIZE_BYTES=$(wc -c < "${WEIGHTS_FILE}")
if [ "${WEIGHTS_SIZE_BYTES}" -lt 50000000 ]; then
    echo "[-] ERROR: Trained adapter weights file ${WEIGHTS_FILE} is suspiciously small (${WEIGHTS_SIZE_BYTES} bytes). Expected > 50MB."
    exit 1
fi
echo "[+] Verified weights file: ${WEIGHTS_FILE} (${WEIGHTS_SIZE_BYTES} bytes)"

if [ ! -f "${CONFIG_FILE}" ]; then
    echo "[-] ERROR: Adapter config file ${CONFIG_FILE} does not exist!"
    exit 1
fi

# Compute SHA-256 Checksums for all primary deliverables
CHECKSUM_FILE="${DELIVERABLES_DIR}/CHECKSUMS.sha256"
echo "[+] Computing SHA-256 checksums..."
sha256sum \
  "${WEIGHTS_FILE}" \
  "${CONFIG_FILE}" \
  "./data/noctis-baseline-qwen7b-responses.jsonl" \
  "./data/noctis-trained-qwen7b-responses.jsonl" \
  "./data/noctis-training-run-report.md" \
  "./data/noctis-benchmark-model-results.md" \
  > "${CHECKSUM_FILE}"

cat "${CHECKSUM_FILE}"

# Archive package
ARCHIVE_FILE="${DELIVERABLES_DIR}/noctis-pilot-results-${RUN_ID}.tar.gz"
echo "[+] Creating deliverables archive: ${ARCHIVE_FILE}..."
tar -czvf "${ARCHIVE_FILE}" \
  ./models/noctis-7b-v1.0-adapter \
  ./data/noctis-baseline-qwen7b-responses.jsonl \
  ./data/noctis-trained-qwen7b-responses.jsonl \
  ./data/noctis-training-run-report.md \
  ./data/noctis-benchmark-model-results.md \
  "${CHECKSUM_FILE}" \
  "${LOG_FILE}"

ARCHIVE_SIZE=$(du -sh "${ARCHIVE_FILE}" | cut -f1)

# Ensure checkpoint artifacts and logs are copied to durable storage before container shutdown
if [ -d "/workspace" ] && [ "$(pwd)" != "/workspace" ]; then
    echo "[+] Syncing deliverables to /workspace/deliverables for persistence across pod restarts..."
    mkdir -p "/workspace/deliverables"
    cp -r "${DELIVERABLES_DIR}/"* "/workspace/deliverables/"
fi

echo ""
echo "======================================================================"
echo " NOCTIS TRAINING & EVALUATION PILOT COMPLETED SUCCESSFULLY"
echo " Run Identifier:       ${RUN_ID}"
echo " Deliverables Archive: ${ARCHIVE_FILE} (${ARCHIVE_SIZE})"
echo " Checksums:            ${CHECKSUM_FILE}"
echo " Run Log:              ${LOG_FILE}"
echo " Deliverables copied to persistent storage."
echo "======================================================================"
