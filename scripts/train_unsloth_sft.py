#!/usr/bin/env python3
"""
============================================================================
NOCTIS SOVEREIGN QLORA SFT TRAINING PIPELINE
Reference Architecture: NOCTIS-TRAIN-SFT-001
Target: Qwen2.5-7B-Instruct Supervised Fine-Tuning with PEFT QLoRA
============================================================================
"""

import os
import sys
import json
import time
import argparse
import hashlib
import re

# PyTorch 2.6+ Checkpoint Unpickling Compatibility
try:
    import torch
    import numpy as np
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

def format_chatml_for_sft(example, tokenizer):
    """
    Formats ChatML messages into the exact prompt-completion format
    expected by the foundation tokenizer.
    """
    messages = example.get("messages", [])
    if hasattr(tokenizer, "apply_chat_template"):
        return {"text": tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)}
    
    # Fallback standard ChatML text format
    text = ""
    for msg in messages:
        text += f"<|im_start|>{msg['role']}\n{msg['content']}<|im_end|>\n"
    return {"text": text}

def main():
    parser = argparse.ArgumentParser(description="Noctis Sovereign QLoRA SFT Training Pipeline")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-7B-Instruct", help="Base model identifier on Hugging Face")
    parser.add_argument("--dataset", default="data/noctis-cot-training-3500.jsonl", help="Path to ChatML training dataset")
    parser.add_argument("--eval-dataset", default="data/noctis-cot-validation-250.jsonl", help="Path to locked held-out test set")
    parser.add_argument("--output-dir", default="./models/noctis-7b-v1.0-adapter", help="Directory to save trained LoRA adapter")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=2, help="Per-device train batch size")
    parser.add_argument("--grad-accum", type=int, default=8, help="Gradient accumulation steps (effective batch size = 16)")
    parser.add_argument("--lr", type=float, default=2e-4, help="Peak learning rate with cosine decay")
    parser.add_argument("--lora-r", type=int, default=16, help="LoRA rank dimension (default: 16)")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha scaling factor (default: 32)")
    parser.add_argument("--max-seq-length", type=int, default=2048, help="Maximum sequence token length (default: 2048)")
    parser.add_argument("--max-steps", type=int, default=-1, help="Max training steps (overrides epochs if > 0)")
    parser.add_argument("--resume-from-checkpoint", type=str, default=None, help="Resume training from a specific checkpoint directory")
    parser.add_argument("--smoke-test", action="store_true", help="Execute 3-step training test with weight update, save, and reload verification")
    parser.add_argument("--dry-run", action="store_true", help="Compile and validate setup without starting GPU training loop")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_file = os.path.join(repo_root, args.dataset)
    eval_file = os.path.join(repo_root, args.eval_dataset)
    output_dir = os.path.join(repo_root, args.output_dir)

    print("\n======================================================================")
    print(" NOCTIS SOVEREIGN MODEL TRAINING PIPELINE (NOCTIS-TRAIN-SFT-001)")
    print("======================================================================")
    print(f"  Target Foundation Model:  {args.base_model}")
    print(f"  Training Dataset:         {train_file}")
    print(f"  Locked Test Set:          {eval_file}")
    print(f"  LoRA Configuration:       r={args.lora_r}, alpha={args.lora_alpha}, dropout=0.05")
    print(f"  Target Linear Modules:    q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj")
    print(f"  Max Sequence Length:      {args.max_seq_length}")
    print(f"  Precision:                4-bit NormalFloat4 (NF4) with Double Quantization")
    print(f"  Optimizer & Scheduler:    AdamW (Paged 8-bit), Cosine Decay with 3% Warmup")
    print(f"  Effective Batch Size:     {args.batch_size * args.grad_accum} (batch={args.batch_size}, accum={args.grad_accum})")
    print(f"  Mode:                     {'SMOKE TEST (3 STEPS)' if args.smoke_test else ('DRY RUN' if args.dry_run else f'{args.epochs} EPOCHS FULL TRAINING')}")
    print(f"  Output Checkpoint Path:   {output_dir}")
    print("======================================================================\n")

    if not os.path.exists(train_file):
        print(f"[!] Error: Training dataset not found at {train_file}")
        return 1

    with open(train_file, "r", encoding="utf-8") as f:
        train_count = sum(1 for _ in f)
    with open(eval_file, "r", encoding="utf-8") as f:
        eval_count = sum(1 for _ in f)
    print(f"[+] Loaded {train_count} training examples and {eval_count} locked benchmark examples.")

    # Check for PyTorch & CUDA availability
    try:
        import torch
        cuda_ok = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if cuda_ok else "N/A (CPU-only)"
        print(f"[+] CUDA Runtime: {cuda_ok} | Device: {gpu_name}")
    except ImportError:
        print("[!] PyTorch is not installed in the active environment.")
        return 1

    if args.dry_run:
        print("\n[+] DRY-RUN SUCCESSFUL:")
        print(f"  - Dataset files verified: {train_file} ({train_count} rows), {eval_file} ({eval_count} rows)")
        print(f"  - Verified LoRA params: r={args.lora_r}, alpha={args.lora_alpha}, max_seq_length={args.max_seq_length}")
        print("  - Configuration is valid. Ready for GPU training execution.")
        return 0

    # 1. Imports for GPU Training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
    )
    from peft import (
        LoraConfig,
        get_peft_model,
        prepare_model_for_kbit_training,
        PeftModel,
    )
    from datasets import load_dataset
    from trl import SFTConfig, SFTTrainer

    # 2. Tokenizer Setup
    print(f"[+] Loading tokenizer for {args.base_model}...")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 3. Model Quantization Configuration (4-bit NF4)
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
    model = prepare_model_for_kbit_training(model)

    # Configure PEFT LoRA
    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 4. Load Datasets & Establish Grouped Internal Validation
    raw_train = load_dataset("json", data_files=train_file, split="train")

    def split_group(row):
        prompt = next((m.get("content", "") for m in row["messages"] if m.get("role") == "user"), "")
        clinical_case = re.search(r"NH-[A-Z]+-\d+", prompt.upper())
        if clinical_case:
            return clinical_case.group(0)
        return re.sub(r"\b\d+(?:\.\d+)?\b", "<N>", prompt.lower())

    groups = [split_group(raw_train[i]) for i in range(len(raw_train))]
    eval_indices = [i for i, g in enumerate(groups) if int(hashlib.sha256(g.encode()).hexdigest()[:8], 16) % 10 == 0]
    train_indices = [i for i in range(len(raw_train)) if i not in set(eval_indices)]

    # For smoke test, use a compact subset of 16 samples
    if args.smoke_test:
        train_indices = train_indices[:16]
        eval_indices = eval_indices[:4]

    train_data = raw_train.select(train_indices).map(lambda ex: format_chatml_for_sft(ex, tokenizer))
    eval_data = raw_train.select(eval_indices).map(lambda ex: format_chatml_for_sft(ex, tokenizer))
    print(f"[+] Internal grouped split: {len(train_data)} train / {len(eval_data)} internal validation.")
    print("[+] External 250-case benchmark remains completely locked until independent post-training evaluation.")

    # 5. SFTConfig Standard Interface
    bf16_supported = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    max_steps = 3 if args.smoke_test else (args.max_steps if args.max_steps > 0 else -1)

    sft_kwargs = {
        "output_dir": output_dir,
        "num_train_epochs": 1 if args.smoke_test else args.epochs,
        "max_steps": max_steps,
        "per_device_train_batch_size": args.batch_size,
        "gradient_accumulation_steps": 1 if args.smoke_test else args.grad_accum,
        "learning_rate": args.lr,
        "lr_scheduler_type": "cosine",
        "warmup_ratio": 0.03,
        "logging_steps": 1 if args.smoke_test else 10,
        "save_strategy": "no" if args.smoke_test else "steps",
        "save_steps": 100,
        "save_total_limit": 2,
        "fp16": not bf16_supported,
        "bf16": bf16_supported,
        "optim": "paged_adamw_8bit" if torch.cuda.is_available() else "adamw_torch",
        "report_to": "none",
        "dataset_text_field": "text",
        "max_seq_length": args.max_seq_length,
        "packing": False,
        "eval_strategy": "no" if args.smoke_test else "steps",
        "eval_steps": 50,
    }

    try:
        training_args = SFTConfig(**sft_kwargs)
    except TypeError as e:
        # If running on newer/different TRL version, strip kwargs that SFTConfig rejects
        import inspect
        sig = inspect.signature(SFTConfig.__init__)
        accepted = set(sig.parameters.keys())
        filtered = {k: v for k, v in sft_kwargs.items() if k in accepted or accepted == {"kwargs"}}
        print(f"[!] Warning: SFTConfig constructor mismatch ({e}). Using filtered configuration.")
        training_args = SFTConfig(**filtered)

    # 6. Initialize Trainer
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
            print(f"[!] SFTTrainer init with '{param_name}' raised: {err}")
            continue

    if trainer is None:
        raise last_err

    # Snapshot initial trainable weights before optimization
    initial_weights = {}
    for name, param in model.named_parameters():
        if param.requires_grad:
            initial_weights[name] = param.clone().detach().cpu()

    print(f"[+] Starting authentic GPU training (Mode: {'SMOKE TEST 3 STEPS' if args.smoke_test else 'FULL SFT'})...")
    start_time = time.time()
    resume_target = args.resume_from_checkpoint if args.resume_from_checkpoint else None
    if resume_target:
        print(f"[+] Resuming training directly from checkpoint: {resume_target}")
    train_result = trainer.train(resume_from_checkpoint=resume_target)
    elapsed = time.time() - start_time
    print(f"\n[+] Training loop finished in {elapsed:.1f} seconds.")

    # Verify actual weight updates across trainable parameters
    weight_deltas = []
    for name, param in model.named_parameters():
        if param.requires_grad and name in initial_weights:
            delta = (param.detach().cpu() - initial_weights[name]).abs().sum().item()
            weight_deltas.append(delta)
    total_delta = sum(weight_deltas)
    print(f"[+] Verified weight modification: Total L1 Parameter Delta = {total_delta:.6f}")

    if total_delta <= 1e-5:
        print("[-] ERROR: Trainable parameter weights did NOT update! Optimizer step failed.")
        return 1

    print(f"[+] Saving fine-tuned LoRA adapter to {output_dir}...")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    # Verify adapter reload
    print(f"[+] Verifying adapter reload from {output_dir}...")
    base_reload = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    reloaded_model = PeftModel.from_pretrained(base_reload, output_dir)
    reloaded_model.eval()

    test_input = tokenizer(["<|im_start|>user\nState Kepler's Third Law formula.<|im_end|>\n<|im_start|>assistant\n"], return_tensors="pt").to("cuda")
    with torch.no_grad():
        out = reloaded_model.generate(**test_input, max_new_tokens=32, do_sample=False)
    test_gen = tokenizer.decode(out[0], skip_special_tokens=True)
    print(f"[+] Reloaded model test generation verified ({len(test_gen)} chars).")

    if args.smoke_test:
        print("\n======================================================================")
        print(" NOCTIS GPU TRAINING SMOKE TEST: PASSED")
        print(f"  - Model initialized:            {args.base_model}")
        print(f"  - Optimizer steps executed:     {max_steps}")
        print(f"  - Weight updates verified:      L1 delta = {total_delta:.6f}")
        print(f"  - Checkpoint saved to:          {output_dir}")
        print(f"  - Adapter successfully reloaded and evaluated.")
        print("======================================================================\n")
        return 0

    # 7. Extract Loss Curves & Optimization Metrics for Full Run
    train_loss_history = [log["loss"] for log in trainer.state.log_history if "loss" in log]
    eval_loss_history = [log["eval_loss"] for log in trainer.state.log_history if "eval_loss" in log]

    initial_loss = train_loss_history[0] if train_loss_history else 0.0
    final_loss = train_result.training_loss
    loss_reduction_pct = ((initial_loss - final_loss) / max(1e-5, initial_loss)) * 100.0 if initial_loss else 0.0

    initial_val_loss = eval_loss_history[0] if eval_loss_history else 0.0
    final_val_loss = eval_loss_history[-1] if eval_loss_history else 0.0
    val_loss_reduction_pct = ((initial_val_loss - final_val_loss) / max(1e-5, initial_val_loss)) * 100.0 if initial_val_loss else 0.0

    divergence = final_val_loss - final_loss if (final_val_loss and final_loss) else 0.0
    is_generalization_valid = loss_reduction_pct > 0 and divergence <= 0.35

    # Save training report
    report_file = os.path.join(repo_root, "data", "noctis-training-run-report.md")
    report_content = f"""# Noctis Model Supervised Fine-Tuning Execution Report (Phase 1 Pilot)

**Execution Date:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}  
**Base Foundation Model:** `{args.base_model}`  
**Fine-Tuning Method:** QLoRA (4-bit NF4 Quantization, Rank {args.lora_r}, Alpha {args.lora_alpha})  
**Target Linear Layers:** `q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj`  
**Max Sequence Length:** {args.max_seq_length} tokens  
**Batch Configuration:** Batch size {args.batch_size}, Grad Accum {args.grad_accum} (Effective Batch = {args.batch_size * args.grad_accum})  
**Training Set:** `{args.dataset}` ({len(train_data)} examples)  
**Internal Validation Set:** {len(eval_data)} examples (Group-isolated)  
**External Benchmark:** `{args.eval_dataset}` (250 examples - Locked until post-training evaluation)  

## Loss Curves & Convergence Metrics
- **Initial Training Loss:** `{initial_loss:.4f}`
- **Final Training Loss:** `{final_loss:.4f}`
- **Training Loss Reduction:** `{loss_reduction_pct:.2f}%`
- **Initial Validation Loss:** `{initial_val_loss:.4f}`
- **Final Validation Loss:** `{final_val_loss:.4f}`
- **Validation Loss Reduction:** `{val_loss_reduction_pct:.2f}%`
- **Generalization Divergence:** `{divergence:.4f}`
- **Total L1 Parameter Weight Delta:** `{total_delta:.6f}`
- **Generalization Status:** `{'HEALTHY (CONVERGED WITHOUT OVERFITTING)' if is_generalization_valid else 'CHECK OVERFITTING'}`

## Deliverable Checkpoint
- **Saved Adapter Path:** `{output_dir}`
- **Configuration Files:** `adapter_config.json`, `adapter_model.safetensors`, `tokenizer.json`
"""
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"[+] Training run execution report exported to {report_file}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
