#!/usr/bin/env python3
"""
NOCTIS AI — CLINICAL SAFETY DPO TRAINING ENGINE (PHASE 3)
Spec: NOCTIS-DPO-TRAIN-001

Applies Direct Preference Optimization (DPO) to penalize clinical hallucinations,
electrolyte conflations, and undertriage while reinforcing verified gold standards.
Target Hardware: 1x NVIDIA H100 (80GB SXM) / A100 (80GB).
"""

import os
import argparse
import json
import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, PeftModel
from trl import DPOTrainer, DPOConfig

try:
    import torch.distributed.tensor
except ImportError:
    pass

def parse_args():
    parser = argparse.ArgumentParser(description="Noctis DPO Alignment Engine")
    parser.add_argument("--model-path", default="./models/noctis-7b-v2.0-merged", help="Base or SFT merged model path")
    parser.add_argument("--dataset", default="data/noctis-dpo-clinical-safety.jsonl", help="Path to DPO JSONL dataset")
    parser.add_argument("--output-dir", default="./models/noctis-7b-v3.0-dpo", help="Output directory for aligned model")
    parser.add_argument("--epochs", type=int, default=1, help="Number of DPO epochs (1-2 recommended)")
    parser.add_argument("--batch-size", type=int, default=2, help="Per-device batch size")
    parser.add_argument("--grad-accum", type=int, default=8, help="Gradient accumulation steps")
    parser.add_argument("--lr", type=float, default=5e-6, help="Learning rate for DPO")
    parser.add_argument("--beta", type=float, default=0.1, help="DPO implicit reward scaling factor (beta)")
    parser.add_argument("--lora-r", type=int, default=16, help="LoRA rank")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha")
    parser.add_argument("--max-length", type=int, default=2048, help="Maximum sequence length")
    return parser.parse_args()

def load_dpo_dataset(file_path):
    print(f"[+] Loading DPO dataset from {file_path}...")
    records = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    print(f"[✓] Successfully loaded {len(records)} preference pairs.")
    return Dataset.from_list(records)

def main():
    args = parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("==========================================================")
    print(" NOCTIS AI — PHASE 3 CLINICAL DPO ALIGNMENT")
    print(f" Model:      {args.model_path}")
    print(f" Dataset:    {args.dataset}")
    print(f" Output Dir: {args.output_dir}")
    print(f" Device:     {device}")
    print("==========================================================")

    # 1. Load Tokenizer
    print("[+] Loading Tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(args.model_path, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 2. Load Base Model in BF16
    print(f"[+] Loading Model from {args.model_path} in bfloat16...")
    model = AutoModelForCausalLM.from_pretrained(
        args.model_path,
        torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
        device_map="auto" if device == "cuda" else None,
        trust_remote_code=True,
    )
    model.config.use_cache = False

    # 3. LoRA Configuration for DPO
    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias="none",
        task_type="CAUSAL_LM",
    )

    # 4. Load Dataset
    dpo_data = load_dpo_dataset(args.dataset)

    # 5. DPO Training Arguments
    dpo_args = DPOConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        beta=args.beta,
        max_length=args.max_length,
        max_prompt_length=1024,
        warmup_ratio=0.1,
        lr_scheduler_type="cosine",
        logging_steps=10,
        save_strategy="epoch",
        save_total_limit=2,
        bf16=(device == "cuda"),
        fp16=False,
        report_to="none",
        remove_unused_columns=False,
    )

    # 6. Initialize DPOTrainer
    print("[+] Initializing DPOTrainer...")
    trainer = DPOTrainer(
        model=model,
        ref_model=None,  # TRL automatically creates implicit reference model via PEFT adapter
        args=dpo_args,
        train_dataset=dpo_data,
        tokenizer=tokenizer,
        peft_config=peft_config,
    )

    # 7. Execute DPO Alignment
    print("[+] Starting authentic GPU DPO Alignment...")
    trainer.train()

    # 8. Save DPO Aligned Adapter
    print(f"[+] Saving DPO-aligned model to {args.output_dir}...")
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    print("==========================================================")
    print(f"[✓] PHASE 3 DPO ALIGNMENT COMPLETE! Saved to {args.output_dir}")
    print("==========================================================")

if __name__ == "__main__":
    main()
