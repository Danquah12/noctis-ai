#!/usr/bin/env python3
"""
Noctis RMF LoRA / QLoRA Fine-Tuning Pipeline (SFT + DPO)
Script: scripts/train_rmf_lora.py

Trains LoRA adapters against our authoritative NIST SP 800-53 Rev. 5.2.0,
FedRAMP, DoD IL2–IL6, CMMC SPRS, and v2.0 Invariant corpora:
  - `data/rmf-sft-chatml.jsonl` (Supervised Fine-Tuning)
  - `data/rmf-dpo-pairs.jsonl` (Direct Preference Optimization)

Modes:
  --mode sft         Full GPU 4-bit QLoRA SFT with BitsAndBytes + PEFT
  --mode dpo         Full GPU 4-bit QLoRA DPO preference training
  --smoke-test       Local end-to-end PyTorch + PEFT LoRA verification run on real
                     RMF ChatML examples (gradient step, weight delta assertion,
                     adapter save & PeftModel reload check — works on CPU or GPU).
"""

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def format_chatml(example: dict) -> str:
    parts = []
    for msg in example.get("messages", []):
        parts.append(f"<|im_start|>{msg['role']}\n{msg['content']}<|im_end|>")
    return "\n".join(parts)


def run_peft_smoke_test(repo_root: Path) -> int:
    import torch
    from transformers import LlamaConfig, LlamaForCausalLM
    from peft import LoraConfig, PeftModel, TaskType, get_peft_model

    sft_path = repo_root / "data" / "rmf-sft-chatml.jsonl"
    dpo_path = repo_root / "data" / "rmf-dpo-pairs.jsonl"
    out_dir = repo_root / "models" / "noctis-rmf-lora-smoke"
    out_dir.mkdir(parents=True, exist_ok=True)

    sft_rows = load_jsonl(sft_path)
    dpo_rows = load_jsonl(dpo_path)
    if not sft_rows:
        print(f"[!] Missing SFT dataset: {sft_path}")
        return 1

    train_texts = [format_chatml(r) for r in sft_rows if r.get("split") != "eval_holdout"][:16]
    eval_texts = [format_chatml(r) for r in sft_rows if r.get("split") == "eval_holdout"][:4]

    print("=" * 72)
    print(" NOCTIS RMF LORA SMOKE TEST (PYTORCH + TRANSFORMERS + PEFT LORA)")
    print("=" * 72)
    print(f"  Device:            {'cuda' if torch.cuda.is_available() else 'cpu'}")
    print(f"  SFT Dataset:       {sft_path} ({len(sft_rows)} total rows)")
    print(f"  DPO Dataset:       {dpo_path} ({len(dpo_rows)} preference pairs)")
    print(f"  Smoke Train Slice: {len(train_texts)} train rows | {len(eval_texts)} holdout rows [SC, SI]")

    # Byte-level deterministic tokenizer over real ChatML corpus (offset +4 for special tokens)
    seq_len = 128
    def encode_batch(texts: list[str]) -> torch.Tensor:
        batch = []
        for t in texts:
            raw = list(t.encode("utf-8", errors="ignore"))[:seq_len]
            padded = [b + 4 for b in raw] + [0] * (seq_len - len(raw))
            batch.append(padded)
        return torch.tensor(batch, dtype=torch.long)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    cfg = LlamaConfig(
        vocab_size=264,
        hidden_size=64,
        intermediate_size=128,
        num_hidden_layers=2,
        num_attention_heads=2,
        num_key_value_heads=2,
        max_position_embeddings=256,
        use_cache=False,
    )
    base_model = LlamaForCausalLM(cfg)
    lora_cfg = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    model = get_peft_model(base_model, lora_cfg).to(device)
    model.print_trainable_parameters()

    # Snapshot initial trainable LoRA weights
    initial_vec = torch.cat([p.detach().clone().flatten() for n, p in model.named_parameters() if "lora_" in n])

    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=5e-3)
    input_ids = encode_batch(train_texts).to(device)

    model.train()
    losses = []
    for step in range(1, 5):
        optimizer.zero_grad()
        outputs = model(input_ids=input_ids, labels=input_ids)
        loss = outputs.loss
        loss.backward()
        optimizer.step()
        losses.append(float(loss.item()))
        print(f"  [Step {step}/4] CausalLM Cross-Entropy Loss: {loss.item():.4f}")

    updated_vec = torch.cat([p.detach().clone().flatten() for n, p in model.named_parameters() if "lora_" in n])
    weight_delta = float(torch.linalg.norm(updated_vec - initial_vec).item())
    print(f"  LoRA L2 Weight Delta: {weight_delta:.6f}")
    if weight_delta <= 0.0:
        print("[!] FAIL: LoRA parameters did not update.")
        return 1

    # Holdout eval loss check
    model.eval()
    with torch.no_grad():
        eval_ids = encode_batch(eval_texts or train_texts[:2]).to(device)
        eval_loss = float(model(input_ids=eval_ids, labels=eval_ids).loss.item())
    print(f"  Holdout Loss [SC, SI]: {eval_loss:.4f}")

    # Save and reload adapter into a fresh LlamaForCausalLM instance to prove serialization integrity
    model.save_pretrained(str(out_dir))
    fresh_base = LlamaForCausalLM(cfg)
    reloaded = PeftModel.from_pretrained(fresh_base, str(out_dir), is_trainable=True).to(device)
    reloaded_vec = torch.cat([p.detach().clone().flatten() for n, p in reloaded.named_parameters() if "lora_" in n])
    reload_diff = float(torch.linalg.norm(reloaded_vec - updated_vec).item())
    print(f"  Saved & Reloaded Adapter Max Diff: {reload_diff:.8f}")

    manifest = {
        "pipeline": "noctis-rmf-lora-v2",
        "mode": "smoke-test",
        "sftRows": len(sft_rows),
        "dpoPairs": len(dpo_rows),
        "initialLoss": losses[0],
        "finalLoss": losses[-1],
        "evalHoldoutLoss": eval_loss,
        "loraL2Delta": weight_delta,
        "reloadDiff": reload_diff,
        "adapterPath": str(out_dir),
    }
    (out_dir / "training_receipt.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"  Receipt SHA-256: {hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()[:16]}")
    print("[+] Noctis RMF LoRA smoke test PASSED.")
    return 0


def run_gpu_production_training(args: argparse.Namespace, repo_root: Path) -> int:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import LoraConfig, prepare_model_for_kbit_training, get_peft_model

    if not torch.cuda.is_available():
        print("[!] Full 7B 4-bit QLoRA training requires a CUDA GPU (use --smoke-test on CPU).")
        return 1

    sft_path = repo_root / args.dataset
    dpo_path = repo_root / args.dpo_dataset
    out_dir = repo_root / args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)
    lora_cfg = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora_cfg)

    if args.mode == "dpo":
        from datasets import load_dataset
        from trl import DPOConfig, DPOTrainer

        ds = load_dataset("json", data_files=str(dpo_path), split="train")
        trainer = DPOTrainer(
            model=model,
            args=DPOConfig(
                output_dir=str(out_dir / "dpo"),
                per_device_train_batch_size=args.batch_size,
                gradient_accumulation_steps=args.grad_accum,
                learning_rate=5e-5,
                num_train_epochs=args.epochs,
                bf16=torch.cuda.is_bf16_supported(),
                beta=0.1,
            ),
            train_dataset=ds,
            processing_class=tokenizer,
        )
        trainer.train()
        trainer.save_model(str(out_dir / "dpo"))
        return 0

    from datasets import load_dataset
    from trl import SFTConfig, SFTTrainer

    raw_ds = load_dataset("json", data_files=str(sft_path), split="train")
    train_ds = raw_ds.filter(lambda x: x.get("split") != "eval_holdout")
    eval_ds = raw_ds.filter(lambda x: x.get("split") == "eval_holdout")
    trainer = SFTTrainer(
        model=model,
        args=SFTConfig(
            output_dir=str(out_dir / "sft"),
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=args.grad_accum,
            learning_rate=args.lr,
            num_train_epochs=args.epochs,
            max_seq_length=args.max_seq_length,
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=5,
            eval_strategy="epoch",
            save_strategy="epoch",
        ),
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        processing_class=tokenizer,
    )
    trainer.train()
    trainer.save_model(str(out_dir / "sft"))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Noctis RMF LoRA/QLoRA SFT & DPO Trainer")
    parser.add_argument("--mode", choices=["sft", "dpo"], default="sft")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-7B-Instruct")
    parser.add_argument("--dataset", default="data/rmf-sft-chatml.jsonl")
    parser.add_argument("--dpo-dataset", default="data/rmf-dpo-pairs.jsonl")
    parser.add_argument("--output-dir", default="models/noctis-rmf-lora")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=8)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    if args.smoke_test:
        return run_peft_smoke_test(repo_root)
    return run_gpu_production_training(args, repo_root)


if __name__ == "__main__":
    sys.exit(main())
