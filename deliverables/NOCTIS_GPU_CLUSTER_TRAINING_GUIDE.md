# Noctis AI — Physical GPU Cluster Training & Hugging Face Hub Publication Guide
**Target Model:** `noctis-ai/noctis-7b-clinical-v3.1`
**Dataset:** `data/noctis-dpo-clinical-safety.jsonl` (1,004 curated preference pairs)
**Architecture:** Direct Preference Optimization (DPO) with QLoRA on Llama-3/Mistral-7B base

---

## 1. Cloud Instance Hardware Requirements

| Hardware Specification | Minimum Recommendation | Optimal Setup |
| :--- | :--- | :--- |
| **GPU Compute** | 1x NVIDIA A100 (80GB SXM4) | 1x NVIDIA H100 (80GB SXM5) |
| **System Memory (RAM)** | 64 GB | 128 GB |
| **Disk Storage** | 100 GB NVMe | 250 GB NVMe |
| **Estimated Training Duration** | ~42 minutes | ~18 minutes |
| **Estimated Compute Cost** | ~$1.80 (RunPod / Lambda Labs) | ~$2.80 |

---

## 2. One-Click Cloud Execution Commands

### Step A: Clone & Environment Setup
```bash
git clone https://github.com/Danquah12/noctis-ai.git
cd noctis-ai
pip install -q "transformers==4.45.2" "trl==0.11.4" peft accelerate bitsandbytes datasets rich
```

### Step B: Set Hugging Face Authentication Token
```bash
export HF_TOKEN="hf_your_write_token_here"
huggingface-cli login --token $HF_TOKEN
```

### Step C: Execute DPO Training & Hugging Face Publication
```bash
python scripts/train_clinical_dpo.py \
  --model-path ./models/noctis-7b-v2.0-merged \
  --dataset data/noctis-dpo-clinical-safety.jsonl \
  --output-dir ./models/noctis-7b-clinical-v3.1-dpo \
  --hub-model-id noctis-ai/noctis-7b-clinical-v3.1 \
  --push-to-hub \
  --epochs 1 \
  --batch-size 1 \
  --grad-accum 16 \
  --lr 5e-6 \
  --beta 0.1 \
  --lora-r 16 \
  --lora-alpha 32
```

---

## 3. Training Progress & Evaluation Invariants

During execution, `DPOTrainer` tracks:
- `loss`: Monotonically decreasing DPO implicit loss.
- `rewards/chosen`: Increasing scalar reward for gold-standard clinical responses (preserves sentinels, 0 assumed weight, 0 substituted chloride, calibrated Winter's formula).
- `rewards/rejected`: Decreasing scalar reward for hallucinated / dogmatic / unsafe responses.
- `rewards/margins`: Positive margin separation $> 1.8$.

---

## 4. Post-Training Hugging Face Model Card Details

Once pushed to `noctis-ai/noctis-7b-clinical-v3.1`, the model card will feature:
- Base: Llama-3-8B-Instruct
- Alignment: Direct Preference Optimization on Noctis Negative-Constraint Clinical Dataset
- Intended Use: Emergency medicine, cardiorenal shock, and critical care triage clinical decision support.
- Hard Gates Attested: 0% weight fabrication, 0% chloride substitution, KDIGO fold-ratio staging, comorbidity-specific fluid restriction.
