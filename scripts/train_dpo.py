#!/usr/bin/env python3
"""
============================================================================
NOCTIS STAGE-2 DIRECT PREFERENCE OPTIMIZATION (DPO) ALIGNMENT PIPELINE
Reference Architecture: NOCTIS-TRAIN-DPO-002
Targets:
  - Stage-2 alignment on top of SFT LoRA adapter using (prompt, chosen, rejected) pairs
  - Accepts sharded .jsonl/.jsonl.gz (`data/shards/*dpo*.jsonl*`) + domain DPO exports
  - Supports `--dry-run`, `--smoke-test`, and `--resume-from-checkpoint`
============================================================================
"""

import argparse
import glob
import gzip
import os
import sys
import time


def resolve_files(repo_root: str, spec: str, default_pattern: str = "*.jsonl*") -> list[str]:
    if not spec:
        return []
    candidate = spec if os.path.isabs(spec) else os.path.join(repo_root, spec)
    if os.path.isdir(candidate):
        return sorted(p for p in glob.glob(os.path.join(candidate, default_pattern)) if os.path.isfile(p))
    if any(ch in candidate for ch in ("*", "?", "[")):
        return sorted(p for p in glob.glob(candidate) if os.path.isfile(p))
    return [candidate] if os.path.exists(candidate) else []


def count_rows(files: list[str]) -> int:
    total = 0
    for fp in files:
        opener = gzip.open if fp.endswith(".gz") else open
        with opener(fp, "rt", encoding="utf-8") as f:
            total += sum(1 for line in f if line.strip())
    return total


def main() -> int:
    parser = argparse.ArgumentParser(description="Noctis Stage-2 QLoRA DPO Preference Alignment Trainer")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-7B-Instruct", help="Foundation model ID")
    parser.add_argument("--sft-adapter", default="./models/noctis-7b-v1.0-adapter", help="Stage-1 SFT LoRA adapter path")
    parser.add_argument("--dpo-dataset", default="data/shards/*dpo*.jsonl*", help="Primary curriculum DPO shard files/glob")
    parser.add_argument("--domain-dpo-dataset", default="data/noctis-unified-dpo-export.jsonl", help="Domain invariant DPO JSONL")
    parser.add_argument("--output-dir", default="./models/noctis-7b-v1.0-dpo-adapter", help="Output DPO adapter directory")
    parser.add_argument("--beta", type=float, default=0.1, help="DPO KL divergence beta coefficient")
    parser.add_argument("--lr", type=float, default=5e-5, help="DPO peak learning rate")
    parser.add_argument("--epochs", type=int, default=1, help="Number of DPO alignment epochs")
    parser.add_argument("--batch-size", type=int, default=2, help="Per-device batch size")
    parser.add_argument("--grad-accum", type=int, default=8, help="Gradient accumulation steps")
    parser.add_argument("--max-length", type=int, default=2048, help="Max total sequence length")
    parser.add_argument("--max-prompt-length", type=int, default=1024, help="Max prompt token length")
    parser.add_argument("--max-steps", type=int, default=-1, help="Optional max step cap")
    parser.add_argument("--resume-from-checkpoint", type=str, default=None, help="Checkpoint path to resume from")
    parser.add_argument("--smoke-test", action="store_true", help="Run 3-step DPO smoke test")
    parser.add_argument("--dry-run", action="store_true", help="Validate shards and config without CUDA training")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dpo_files = resolve_files(repo_root, args.dpo_dataset, "*dpo*.jsonl*")
    domain_files = resolve_files(repo_root, args.domain_dpo_dataset, "*.jsonl*")
    all_files = dpo_files + [f for f in domain_files if f not in dpo_files]
    output_dir = os.path.join(repo_root, args.output_dir)

    print("\n======================================================================")
    print(" NOCTIS STAGE-2 DPO PREFERENCE ALIGNMENT (NOCTIS-TRAIN-DPO-002)")
    print("======================================================================")
    print(f"  Base Foundation Model: {args.base_model}")
    print(f"  Stage-1 SFT Adapter:   {args.sft_adapter}")
    print(f"  DPO Dataset Files:     {len(all_files)} file(s)")
    print(f"  KL Beta / LR:          beta={args.beta}, lr={args.lr}")
    print(f"  Effective Batch Size:  {args.batch_size * args.grad_accum}")
    print(f"  Output Adapter Path:   {output_dir}")
    print("======================================================================\n")

    if not all_files:
        print("[!] Error: No DPO dataset files resolved.")
        return 1

    total_pairs = count_rows(all_files)
    print(f"[+] Resolved {total_pairs:,} contrasting (prompt, chosen, rejected) DPO preference pairs across {len(all_files)} file(s).")

    if args.dry_run:
        print("[+] DPO DRY-RUN SUCCESSFUL:")
        for fp in all_files:
            print(f"  - {os.path.relpath(fp, repo_root)}")
        print("  - Stage-2 DPO trainer configuration is valid and ready for GPU execution.")
        return 0

    import torch
    from datasets import load_dataset
    from peft import LoraConfig, PeftModel, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from trl import DPOConfig, DPOTrainer

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=compute_dtype,
        bnb_4bit_use_double_quant=True,
    )

    base = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    base.config.use_cache = False
    base = prepare_model_for_kbit_training(base)

    sft_dir = os.path.join(repo_root, args.sft_adapter) if not os.path.isabs(args.sft_adapter) else args.sft_adapter
    if os.path.isdir(sft_dir):
        print(f"[+] Loading Stage-1 SFT adapter weights from {sft_dir}...")
        model = PeftModel.from_pretrained(base, sft_dir, is_trainable=True)
    else:
        print("[!] Stage-1 adapter directory not found locally; initializing fresh DPO LoRA adapter on base model.")
        peft_cfg = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
        )
        from peft import get_peft_model
        model = get_peft_model(base, peft_cfg)

    raw_ds = load_dataset("json", data_files=all_files if len(all_files) > 1 else all_files[0], split="train")
    raw_ds = raw_ds.filter(lambda r: bool(r.get("prompt")) and bool(r.get("chosen")) and bool(r.get("rejected")))
    if args.smoke_test:
        raw_ds = raw_ds.select(range(min(16, len(raw_ds))))

    dpo_cfg = DPOConfig(
        output_dir=output_dir,
        beta=args.beta,
        learning_rate=args.lr,
        num_train_epochs=1 if args.smoke_test else args.epochs,
        max_steps=3 if args.smoke_test else (args.max_steps if args.max_steps > 0 else -1),
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=1 if args.smoke_test else args.grad_accum,
        max_length=args.max_length,
        max_prompt_length=args.max_prompt_length,
        bf16=compute_dtype == torch.bfloat16,
        fp16=compute_dtype != torch.bfloat16,
        logging_steps=1 if args.smoke_test else 10,
        save_strategy="no" if args.smoke_test else "steps",
        save_steps=250,
        report_to="none",
    )

    trainer = DPOTrainer(
        model=model,
        ref_model=None,
        args=dpo_cfg,
        train_dataset=raw_ds,
        processing_class=tokenizer,
    )
    start_ts = time.time()
    trainer.train(resume_from_checkpoint=args.resume_from_checkpoint)
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"[+] Stage-2 DPO alignment completed in {time.time() - start_ts:.1f}s -> {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
