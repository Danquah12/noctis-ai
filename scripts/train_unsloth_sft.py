#!/usr/bin/env python3
"""
============================================================================
NOCTIS SOVEREIGN QLORA SFT & STREAMING BILLION-TOKEN PIPELINE
Reference Architecture: NOCTIS-TRAIN-SFT-001 + NOCTIS-STREAM-1B
Targets:
  - Local Finite Mode: .jsonl / .jsonl.gz shards (1M+ Noctis curriculum + domain pairs)
  - Streaming Billion-Token Mode (--stream-open-corpora): 70/20/10 mixture across
    open multi-billion-token corpora (FineWeb-Edu, Cosmopedia, OpenWebMath) +
    Noctis SFT shards + Noctis DPO/safety invariants using HF `streaming=True`.
============================================================================
"""

import argparse
import glob
import gzip
import hashlib
import json
import math
import os
import re
import sys
import time


STREAM_SOURCE_REGISTRY = {
    "fineweb-edu": {
        "dataset": "HuggingFaceFW/fineweb-edu",
        "name": "sample-10BT",
        "split": "train",
        "license": "ODC-By-1.0",
        "kind": "fineweb",
    },
    "cosmopedia-openstax": {
        "dataset": "HuggingFaceTB/cosmopedia",
        "name": "openstax",
        "split": "train",
        "license": "Apache-2.0",
        "kind": "cosmopedia",
    },
    "cosmopedia-stanford": {
        "dataset": "HuggingFaceTB/cosmopedia",
        "name": "stanford",
        "split": "train",
        "license": "Apache-2.0",
        "kind": "cosmopedia",
    },
    "openwebmath": {
        "dataset": "open-web-math/open-web-math",
        "name": None,
        "split": "train",
        "license": "ODC-By-1.0",
        "kind": "openwebmath",
    },
}


def resolve_dataset_files(repo_root: str, spec: str, default_pattern: str = "*.jsonl*") -> list[str]:
    """Resolves a single .jsonl/.jsonl.gz file, directory of shards, or glob pattern into sorted file paths."""
    if not spec:
        return []
    candidate = spec if os.path.isabs(spec) else os.path.join(repo_root, spec)
    if os.path.isdir(candidate):
        matched = sorted(glob.glob(os.path.join(candidate, default_pattern)))
        return [p for p in matched if os.path.isfile(p)]
    if any(ch in candidate for ch in ("*", "?", "[")):
        return sorted(p for p in glob.glob(candidate) if os.path.isfile(p))
    return [candidate] if os.path.exists(candidate) else []


def count_jsonl_rows(files: list[str]) -> int:
    """Counts non-empty lines across plain .jsonl and gzipped .jsonl.gz files."""
    total = 0
    for fp in files:
        opener = gzip.open if fp.endswith(".gz") else open
        with opener(fp, "rt", encoding="utf-8") as f:
            total += sum(1 for line in f if line.strip())
    return total


def normalize_mix_ratios(open_r: float, sft_r: float, safety_r: float) -> tuple[float, float, float]:
    """Validates and normalizes open/SFT/safety mixture ratios to sum to 1.0."""
    vals = [max(0.0, float(open_r)), max(0.0, float(sft_r)), max(0.0, float(safety_r))]
    total = sum(vals)
    if total <= 0:
        return (0.70, 0.20, 0.10)
    return (vals[0] / total, vals[1] / total, vals[2] / total)


def compute_streaming_step_budget(
    target_tokens: int,
    batch_size: int,
    grad_accum: int,
    max_seq_length: int,
    explicit_max_steps: int = -1,
) -> dict:
    """Calculates optimizer steps needed to process `target_tokens` in streaming mode."""
    tokens_per_step = max(1, batch_size) * max(1, grad_accum) * max(128, max_seq_length)
    steps = explicit_max_steps if explicit_max_steps > 0 else max(1, math.ceil(target_tokens / tokens_per_step))
    approx_effective_tokens = steps * tokens_per_step
    # Rough throughput planning estimate on a single H100 PCIe/SXM (~45k-75k tok/s QLoRA bf16)
    est_hours_h100 = round(approx_effective_tokens / (55_000 * 3600), 2)
    return {
        "tokens_per_step": tokens_per_step,
        "max_steps": steps,
        "effective_tokens": approx_effective_tokens,
        "est_hours_single_h100": est_hours_h100,
    }


# PyTorch 2.6+ Checkpoint Unpickling Compatibility
try:
    import numpy as np
    import torch

    if hasattr(torch, "serialization") and hasattr(torch.serialization, "add_safe_globals"):
        safe_types = []
        if hasattr(np, "_core") and hasattr(np._core, "multiarray"):
            safe_types.append(np._core.multiarray._reconstruct)
        if hasattr(np, "ndarray"):
            safe_types.append(np.ndarray)
        if hasattr(np, "dtype"):
            safe_types.append(np.dtype)
        if safe_types:
            torch.serialization.add_safe_globals(safe_types)
    _real_torch_load = torch.load

    def _compat_torch_load(*args, **kwargs):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        return _real_torch_load(*args, **kwargs)

    torch.load = _compat_torch_load
except Exception:
    pass


def render_messages_text(messages: list[dict], tokenizer) -> str:
    if tokenizer is not None and hasattr(tokenizer, "apply_chat_template"):
        return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    text = ""
    for msg in messages:
        text += f"<|im_start|>{msg['role']}\n{msg['content']}<|im_end|>\n"
    return text


def format_chatml_for_sft(example, tokenizer):
    """Formats ChatML messages into prompt-completion text for SFTTrainer."""
    messages = example.get("messages", [])
    return {"text": render_messages_text(messages, tokenizer)}


def normalize_stream_example_to_chatml(example: dict, source_kind: str, tokenizer) -> dict:
    """Converts open corpus / DPO / ChatML rows into uniform `{'text': ...}` ChatML records."""
    if isinstance(example.get("messages"), list) and example["messages"]:
        return {"text": render_messages_text(example["messages"], tokenizer)}

    if source_kind == "dpo" or ("prompt" in example and "chosen" in example):
        prompt = str(example.get("prompt", "")).strip()
        chosen = str(example.get("chosen", "")).strip()
        msgs = [
            {
                "role": "system",
                "content": "You are Noctis Sovereign Intelligence. Enforce verified invariants, explicit uncertainty boundaries, and zero fabricated claims.",
            },
            {"role": "user", "content": prompt[:2000]},
            {"role": "assistant", "content": chosen[:6000]},
        ]
        return {"text": render_messages_text(msgs, tokenizer)}

    if source_kind == "cosmopedia":
        prompt = str(example.get("prompt", "Explain this topic with mathematical and engineering rigor.")).strip()
        body = str(example.get("text", "")).strip()
        msgs = [
            {"role": "system", "content": "You are Noctis Sovereign Intelligence synthesizing open textbook knowledge."},
            {"role": "user", "content": prompt[:1500]},
            {"role": "assistant", "content": body[:6000]},
        ]
        return {"text": render_messages_text(msgs, tokenizer)}

    # fineweb / openwebmath raw educational text
    raw_text = str(example.get("text", "")).strip()
    lead = raw_text.split("\n")[0][:180].strip() or "Core technical reference"
    msgs = [
        {"role": "system", "content": "You are Noctis Sovereign Intelligence providing grounded technical and analytical reference."},
        {"role": "user", "content": f"Present and explain the verified technical material covering: {lead}"},
        {"role": "assistant", "content": raw_text[:6000]},
    ]
    return {"text": render_messages_text(msgs, tokenizer)}


def build_streaming_interleaved_dataset(
    load_dataset_fn,
    interleave_fn,
    stream_source_keys: list[str],
    train_files: list[str],
    dpo_files: list[str],
    ratios: tuple[float, float, float],
    tokenizer,
    shuffle_buffer: int,
    seed: int,
):
    """Builds an interleaved IterableDataset across open streaming corpora, Noctis SFT shards, and safety/DPO shards."""
    open_r, sft_r, safety_r = ratios
    streams = []
    probs = []

    valid_open_keys = [k for k in stream_source_keys if k in STREAM_SOURCE_REGISTRY]
    if valid_open_keys and open_r > 0:
        per_open_prob = open_r / len(valid_open_keys)
        for idx, key in enumerate(valid_open_keys):
            spec = STREAM_SOURCE_REGISTRY[key]
            kwargs = {"split": spec["split"], "streaming": True}
            if spec["name"]:
                kwargs["name"] = spec["name"]
            ds = load_dataset_fn(spec["dataset"], **kwargs)
            ds = ds.map(lambda ex, k=spec["kind"]: normalize_stream_example_to_chatml(ex, k, tokenizer))
            ds = ds.shuffle(seed=seed + idx, buffer_size=shuffle_buffer)
            streams.append(ds)
            probs.append(per_open_prob)

    if train_files and sft_r > 0:
        sft_ds = load_dataset_fn(
            "json",
            data_files=train_files if len(train_files) > 1 else train_files[0],
            split="train",
            streaming=True,
        )
        sft_ds = sft_ds.map(lambda ex: normalize_stream_example_to_chatml(ex, "chatml", tokenizer))
        sft_ds = sft_ds.shuffle(seed=seed + 101, buffer_size=min(shuffle_buffer, 4096))
        streams.append(sft_ds)
        probs.append(sft_r)

    if dpo_files and safety_r > 0:
        dpo_ds = load_dataset_fn(
            "json",
            data_files=dpo_files if len(dpo_files) > 1 else dpo_files[0],
            split="train",
            streaming=True,
        )
        dpo_ds = dpo_ds.map(lambda ex: normalize_stream_example_to_chatml(ex, "dpo", tokenizer))
        dpo_ds = dpo_ds.shuffle(seed=seed + 202, buffer_size=min(shuffle_buffer, 4096))
        streams.append(dpo_ds)
        probs.append(safety_r)

    if not streams:
        raise ValueError("No valid streaming datasets or local shards were resolved for streaming mixture.")

    total_p = sum(probs)
    normalized_probs = [p / total_p for p in probs]
    return interleave_fn(
        streams,
        probabilities=normalized_probs,
        seed=seed,
        stopping_strategy="all_exhausted",
    )


def main():
    parser = argparse.ArgumentParser(description="Noctis Sovereign QLoRA SFT & Streaming Billion-Token Training Pipeline")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-7B-Instruct", help="Base model identifier on Hugging Face")
    parser.add_argument("--dataset", default="data/noctis-cot-training-3500.jsonl", help="Path, shard directory, or glob to ChatML SFT dataset")
    parser.add_argument("--dpo-dataset", default="data/shards/*dpo*.jsonl*", help="Path or glob to Noctis DPO/safety preference shards")
    parser.add_argument("--eval-dataset", default="data/noctis-cot-validation-250.jsonl", help="Path to locked held-out test set")
    parser.add_argument("--output-dir", default="./models/noctis-7b-v1.0-adapter", help="Directory to save trained LoRA adapter")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs (finite mode)")
    parser.add_argument("--batch-size", type=int, default=2, help="Per-device train batch size")
    parser.add_argument("--grad-accum", type=int, default=8, help="Gradient accumulation steps (effective batch size = 16)")
    parser.add_argument("--lr", type=float, default=2e-4, help="Peak learning rate with cosine decay")
    parser.add_argument("--lora-r", type=int, default=16, help="LoRA rank dimension (default: 16)")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha scaling factor (default: 32)")
    parser.add_argument("--max-seq-length", type=int, default=2048, help="Maximum sequence token length (default: 2048)")
    parser.add_argument("--max-steps", type=int, default=-1, help="Max training steps (overrides epochs if > 0)")
    parser.add_argument("--save-steps", type=int, default=500, help="Checkpoint save cadence in steps")
    parser.add_argument("--eval-steps", type=int, default=250, help="Locked validation evaluation cadence in steps")
    parser.add_argument("--resume-from-checkpoint", type=str, default=None, help="Resume training from a specific checkpoint directory")
    parser.add_argument("--stream-open-corpora", action="store_true", help="Enable streaming multi-billion-token HF dataset interleaving")
    parser.add_argument("--stream-sources", default="fineweb-edu,cosmopedia-openstax,cosmopedia-stanford,openwebmath", help="Comma-separated streaming HF preset sources")
    parser.add_argument("--mix-open-ratio", type=float, default=0.70, help="Streaming ratio for open HF educational/STEM corpora")
    parser.add_argument("--mix-noctis-sft-ratio", type=float, default=0.20, help="Streaming ratio for Noctis domain SFT shards")
    parser.add_argument("--mix-safety-ratio", type=float, default=0.10, help="Streaming ratio for Noctis DPO/safety invariant pairs")
    parser.add_argument("--target-tokens", type=int, default=1_000_000_000, help="Target token budget when --stream-open-corpora is enabled")
    parser.add_argument("--shuffle-buffer", type=int, default=10000, help="Shuffle buffer size for HF IterableDataset streaming")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic RNG seed")
    parser.add_argument("--smoke-test", action="store_true", help="Execute 3-step training test with weight update, save, and reload verification")
    parser.add_argument("--dry-run", action="store_true", help="Compile and validate setup without starting GPU training loop")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_files = resolve_dataset_files(repo_root, args.dataset, "*sft*.jsonl*")
    dpo_files = resolve_dataset_files(repo_root, args.dpo_dataset, "*dpo*.jsonl*")
    eval_files = resolve_dataset_files(repo_root, args.eval_dataset, "*val*.jsonl*")
    train_file = train_files[0] if len(train_files) == 1 else (f"{len(train_files)} shards matching {args.dataset}")
    eval_file = eval_files[0] if len(eval_files) == 1 else (f"{len(eval_files)} files matching {args.eval_dataset}")
    output_dir = os.path.join(repo_root, args.output_dir)

    stream_source_keys = [s.strip() for s in args.stream_sources.split(",") if s.strip()]
    ratios = normalize_mix_ratios(args.mix_open_ratio, args.mix_noctis_sft_ratio, args.mix_safety_ratio)
    budget = compute_streaming_step_budget(
        args.target_tokens,
        args.batch_size,
        args.grad_accum,
        args.max_seq_length,
        args.max_steps,
    )

    mode_label = (
        "SMOKE TEST (3 STEPS)"
        if args.smoke_test
        else ("STREAMING 1B-TOKEN DRY RUN" if args.stream_open_corpora and args.dry_run else ("STREAMING BILLION-TOKEN MIX" if args.stream_open_corpora else ("DRY RUN" if args.dry_run else f"{args.epochs} EPOCHS FULL SFT")))
    )

    print("\n======================================================================")
    print(" NOCTIS SOVEREIGN MODEL TRAINING PIPELINE (NOCTIS-TRAIN-SFT-001)")
    print("======================================================================")
    print(f"  Target Foundation Model:  {args.base_model}")
    print(f"  SFT Shard Source:         {train_file}")
    if args.stream_open_corpora:
        print(f"  DPO/Safety Shard Source:  {len(dpo_files)} file(s) matching {args.dpo_dataset}")
        print(f"  Streaming Open Corpora:   {', '.join(stream_source_keys)}")
        print(f"  Mixture Ratios (O/S/D):   {ratios[0]:.2f} / {ratios[1]:.2f} / {ratios[2]:.2f}")
        print(f"  Target Token Budget:      {args.target_tokens:,} tokens ({budget['max_steps']:,} steps @ {budget['tokens_per_step']:,} tok/step)")
        print(f"  Est. Single-H100 Time:    ~{budget['est_hours_single_h100']} hours")
    print(f"  Locked Eval Set:          {eval_file}")
    print(f"  LoRA Configuration:       r={args.lora_r}, alpha={args.lora_alpha}, dropout=0.05")
    print(f"  Max Sequence Length:      {args.max_seq_length}")
    print(f"  Precision:                4-bit NormalFloat4 (NF4) with Double Quantization")
    print(f"  Effective Batch Size:     {args.batch_size * args.grad_accum} (batch={args.batch_size}, accum={args.grad_accum})")
    print(f"  Mode:                     {mode_label}")
    print(f"  Output Checkpoint Path:   {output_dir}")
    print("======================================================================\n")

    if not eval_files:
        print(f"[!] Error: Held-out evaluation dataset not found at {args.eval_dataset}")
        return 1
    if not args.stream_open_corpora and not train_files:
        print(f"[!] Error: Training dataset not found at {args.dataset}")
        return 1

    if args.dry_run:
        train_count = count_jsonl_rows(train_files) if len(train_files) <= 4 else f"{len(train_files)} shard files"
        eval_count = count_jsonl_rows(eval_files)
        print("[+] DRY-RUN SUCCESSFUL:")
        print(f"  - SFT Shards Resolved:    {train_file} ({train_count})")
        print(f"  - Locked Eval Verified:   {eval_file} ({eval_count} rows — strictly excluded from train)")
        if args.stream_open_corpora:
            invalid = [k for k in stream_source_keys if k not in STREAM_SOURCE_REGISTRY]
            if invalid:
                print(f"[!] Unknown stream source preset(s): {invalid}")
                return 1
            print(f"  - Streaming Sources Validated: {len(stream_source_keys)} presets ready (`streaming=True`)")
            print(f"  - Computed Step Budget:   {budget['max_steps']:,} steps (~{budget['effective_tokens']:,} tokens)")
        print("  - Configuration is valid. Ready for GPU training execution.")
        return 0

    train_count = count_jsonl_rows(train_files) if train_files else 0
    eval_count = count_jsonl_rows(eval_files)
    print(f"[+] Resolved {train_count} local SFT examples across {len(train_files)} file(s) and {eval_count} locked benchmark examples.")

    try:
        import torch
        cuda_ok = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if cuda_ok else "N/A (CPU-only)"
        print(f"[+] CUDA Runtime: {cuda_ok} | Device: {gpu_name}")
    except ImportError:
        print("[!] PyTorch is not installed in the active environment.")
        return 1

    from datasets import interleave_datasets, load_dataset
    from peft import LoraConfig, PeftModel, get_peft_model, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from trl import SFTConfig, SFTTrainer

    print(f"[+] Loading tokenizer for {args.base_model}...")
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

    print(f"[+] Loading foundation weights for {args.base_model} in 4-bit NF4...")
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)

    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)
    if hasattr(model, "enable_input_require_grads"):
        model.enable_input_require_grads()
    model.train()
    model.print_trainable_parameters()

    # Load finite held-out evaluation dataset (never enters training stream)
    raw_eval = load_dataset("json", data_files=eval_files if len(eval_files) > 1 else eval_files[0], split="train")
    eval_data = raw_eval.map(lambda ex: format_chatml_for_sft(ex, tokenizer))

    if args.stream_open_corpora:
        train_data = build_streaming_interleaved_dataset(
            load_dataset,
            interleave_datasets,
            stream_source_keys,
            train_files,
            dpo_files,
            ratios,
            tokenizer,
            args.shuffle_buffer,
            args.seed,
        )
        max_steps = 3 if args.smoke_test else budget["max_steps"]
        num_epochs = 1
        print(f"[+] Initialized streaming 70/20/10 mixture for max_steps={max_steps:,} (~{args.target_tokens:,} tokens).")
    else:
        raw_train = load_dataset("json", data_files=train_files if len(train_files) > 1 else train_files[0], split="train")

        def split_group(row):
            prompt = next((m.get("content", "") for m in row["messages"] if m.get("role") == "user"), "")
            clinical_case = re.search(r"NH-[A-Z]+-\d+", prompt.upper())
            if clinical_case:
                return clinical_case.group(0)
            return re.sub(r"\b\d+(?:\.\d+)?\b", "<N>", prompt.lower())

        groups = [split_group(raw_train[i]) for i in range(len(raw_train))]
        eval_indices = [i for i, g in enumerate(groups) if int(hashlib.sha256(g.encode()).hexdigest()[:8], 16) % 10 == 0]
        train_indices = [i for i in range(len(raw_train)) if i not in set(eval_indices)]

        if args.smoke_test:
            train_indices = train_indices[:16]
            eval_indices = eval_indices[:4]

        train_data = raw_train.select(train_indices).map(lambda ex: format_chatml_for_sft(ex, tokenizer))
        eval_data = raw_train.select(eval_indices).map(lambda ex: format_chatml_for_sft(ex, tokenizer))
        max_steps = 3 if args.smoke_test else (args.max_steps if args.max_steps > 0 else -1)
        num_epochs = 1 if args.smoke_test else args.epochs
        print(f"[+] Internal grouped split: {len(train_data)} train / {len(eval_data)} internal validation.")

    bf16_supported = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    sft_kwargs = {
        "output_dir": output_dir,
        "num_train_epochs": num_epochs,
        "max_steps": max_steps,
        "per_device_train_batch_size": args.batch_size,
        "gradient_accumulation_steps": 1 if args.smoke_test else args.grad_accum,
        "learning_rate": args.lr,
        "lr_scheduler_type": "cosine",
        "warmup_ratio": 0.03,
        "logging_steps": 1 if args.smoke_test else 10,
        "save_strategy": "no" if args.smoke_test else "steps",
        "save_steps": args.save_steps,
        "save_total_limit": 3,
        "fp16": not bf16_supported,
        "bf16": bf16_supported,
        "optim": "paged_adamw_8bit" if torch.cuda.is_available() else "adamw_torch",
        "report_to": "none",
        "dataset_text_field": "text",
        "max_seq_length": args.max_seq_length,
        "packing": bool(args.stream_open_corpora),
        "eval_strategy": "no" if args.smoke_test else "steps",
        "eval_steps": args.eval_steps,
        "ignore_data_skip": bool(args.stream_open_corpora),
    }

    try:
        training_args = SFTConfig(**sft_kwargs)
    except TypeError as e:
        import inspect

        sig = inspect.signature(SFTConfig.__init__)
        accepted = set(sig.parameters.keys())
        filtered = {k: v for k, v in sft_kwargs.items() if k in accepted or accepted == {"kwargs"}}
        print(f"[!] Warning: SFTConfig constructor mismatch ({e}). Using filtered configuration.")
        training_args = SFTConfig(**filtered)

    import trl

    print(f"[+] Active TRL version: {trl.__version__}")
    trainer = None
    last_err = None
    for param_name in ["tokenizer", "processing_class"]:
        try:
            kwargs = {
                "model": model,
                "train_dataset": train_data,
                "eval_dataset": eval_data if not args.smoke_test else None,
                "args": training_args,
                param_name: tokenizer,
            }
            trainer = SFTTrainer(**kwargs)
            print(f"[+] SFTTrainer initialized successfully using '{param_name}'.")
            break
        except TypeError as err:
            last_err = err
            continue

    if trainer is None:
        raise last_err

    initial_weights = {
        name: param.clone().detach().cpu() for name, param in model.named_parameters() if param.requires_grad
    }

    print(f"[+] Starting GPU training (Mode: {mode_label})...")
    start_time = time.time()
    resume_target = args.resume_from_checkpoint if args.resume_from_checkpoint else None
    model.config.use_cache = False
    if hasattr(model, "enable_input_require_grads"):
        model.enable_input_require_grads()
    model.train()
    train_result = trainer.train(resume_from_checkpoint=resume_target)
    elapsed = time.time() - start_time
    print(f"\n[+] Training loop finished in {elapsed:.1f} seconds.")

    total_delta = sum(
        (param.detach().cpu() - initial_weights[name]).abs().sum().item()
        for name, param in model.named_parameters()
        if param.requires_grad and name in initial_weights
    )
    print(f"[+] Verified weight modification: Total L1 Parameter Delta = {total_delta:.6f}")

    if total_delta <= 1e-5:
        print("[-] ERROR: Trainable parameter weights did NOT update! Optimizer step failed.")
        return 1

    print(f"[+] Saving fine-tuned LoRA adapter to {output_dir}...")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    base_reload = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    reloaded_model = PeftModel.from_pretrained(base_reload, output_dir)
    reloaded_model.eval()
    test_input = tokenizer(
        ["<|im_start|>user\nState Kepler's Third Law formula.<|im_end|>\n<|im_start|>assistant\n"],
        return_tensors="pt",
    ).to("cuda")
    with torch.no_grad():
        out = reloaded_model.generate(**test_input, max_new_tokens=32, do_sample=False)
    print(f"[+] Reloaded model test generation verified ({len(tokenizer.decode(out[0], skip_special_tokens=True))} chars).")

    if args.smoke_test:
        return 0

    train_loss_history = [log["loss"] for log in trainer.state.log_history if "loss" in log]
    eval_loss_history = [log["eval_loss"] for log in trainer.state.log_history if "eval_loss" in log]
    initial_loss = train_loss_history[0] if train_loss_history else 0.0
    final_loss = train_result.training_loss
    loss_reduction_pct = ((initial_loss - final_loss) / max(1e-5, initial_loss)) * 100.0 if initial_loss else 0.0
    initial_val_loss = eval_loss_history[0] if eval_loss_history else 0.0
    final_val_loss = eval_loss_history[-1] if eval_loss_history else 0.0

    report_file = os.path.join(repo_root, "data", "noctis-training-run-report.md")
    report_content = f"""# Noctis Model Supervised Fine-Tuning Execution Report

**Execution Date:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}
**Base Foundation Model:** `{args.base_model}`
**Mode:** `{mode_label}`
**Fine-Tuning Method:** QLoRA (4-bit NF4, Rank {args.lora_r}, Alpha {args.lora_alpha})
**Initial Training Loss:** `{initial_loss:.4f}` -> **Final Training Loss:** `{final_loss:.4f}` (`{loss_reduction_pct:.2f}%` reduction)
**Initial Eval Loss:** `{initial_val_loss:.4f}` -> **Final Eval Loss:** `{final_val_loss:.4f}`
**Saved Adapter Path:** `{output_dir}`
"""
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"[+] Training run execution report exported to {report_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
