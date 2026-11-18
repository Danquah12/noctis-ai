#!/usr/bin/env bash
# ============================================================================
# NOCTIS AI — GENUINE QLORA SFT PILOT AUTOMATED CLOUD GPU RUNNER
# Script: scripts/run_gpu_pilot.sh
# Target Hardware: 1x NVIDIA A100 (80GB) or 1x RTX 4090 (24GB)
# Base Image: runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04
# ============================================================================

set -euo pipefail

echo "======================================================================"
echo " NOCTIS AI — GENUINE MODEL TRAINING & BENCHMARK SUITE (PILOT V1.0)"
echo "======================================================================"
echo " Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader || true
echo "======================================================================"

# 1. Install & Verify Required ML Packages
echo "[+] Step 1/4: Installing verified ML dependencies..."
pip install -q --upgrade pip
pip install -q trl peft bitsandbytes datasets transformers accelerate sentencepiece

# 2. Step 0 Baseline: Evaluate Unmodified Foundation Model
echo ""
echo "[+] Step 2/4: Establishing genuine baseline on unmodified Qwen2.5-7B-Instruct..."
python scripts/eval_held_out_benchmark.py \
  --mode model \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --limit 250 \
  --output-file data/noctis-baseline-qwen7b-responses.jsonl

echo "[+] Baseline evaluation complete. Baseline scores saved to data/noctis-baseline-qwen7b-responses.jsonl"

# 3. Step 1 Model Weight Training: Execute Genuine QLoRA SFT
echo ""
echo "[+] Step 3/4: Executing authentic supervised fine-tuning (QLoRA) on Qwen2.5-7B..."
python scripts/train_unsloth_sft.py \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --epochs 3 \
  --batch-size 2 \
  --grad-accum 8 \
  --lr 2e-4 \
  --output-dir ./models/noctis-7b-v1.0-adapter

echo "[+] Model weight training complete. Adapter saved to ./models/noctis-7b-v1.0-adapter"

# 4. Step 2 Post-Training Evaluation: Evaluate Fine-Tuned Model Delta
echo ""
echo "[+] Step 4/4: Evaluating fine-tuned Noctis checkpoint on locked 250-case benchmark..."
python scripts/eval_held_out_benchmark.py \
  --mode model \
  --base-model Qwen/Qwen2.5-7B-Instruct \
  --adapter-path ./models/noctis-7b-v1.0-adapter \
  --limit 250 \
  --output-file data/noctis-trained-qwen7b-responses.jsonl

# 5. Package Deliverables
echo ""
echo "[+] Packaging deliverables (checkpoint weights, evaluation completions, and loss curves)..."
mkdir -p ./deliverables
tar -czvf ./deliverables/noctis-pilot-results.tar.gz \
  ./models/noctis-7b-v1.0-adapter \
  ./data/noctis-baseline-qwen7b-responses.jsonl \
  ./data/noctis-trained-qwen7b-responses.jsonl \
  ./data/noctis-training-run-report.md \
  ./data/noctis-benchmark-model-results.md || true

echo ""
echo "======================================================================"
echo " NOCTIS TRAINING & EVALUATION PILOT COMPLETE"
echo " Deliverables archive: ./deliverables/noctis-pilot-results.tar.gz"
echo " Checkpoint size: $(du -sh ./models/noctis-7b-v1.0-adapter | cut -f1)"
echo "======================================================================"
