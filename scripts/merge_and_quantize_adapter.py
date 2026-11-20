#!/usr/bin/env python3
"""
Noctis-7B V2.0 Adapter Merge & Serving Export Tool
==================================================
Merges the fine-tuned 154MB LoRA adapter weights (adapter_model.safetensors)
with the base Qwen/Qwen2.5-7B-Instruct model, creating a standalone unified model
ready for local or cloud inference via Ollama, vLLM, LM Studio, or llama.cpp.

Usage:
  # Fast: Generate Ollama Modelfile directly using native ADAPTER directive:
  python scripts/merge_and_quantize_adapter.py --modelfile-only

  # Full: Merge weights into standalone 16-bit safetensors:
  python scripts/merge_and_quantize_adapter.py \
    --base-model "Qwen/Qwen2.5-7B-Instruct" \
    --adapter-dir "./models/noctis-7b-v2.0-adapter" \
    --output-dir "./models/noctis-7b-v2.0-merged" \
    --export-modelfile
"""

import os
import sys
import argparse
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description="Merge Noctis LoRA adapter with base model.")
    parser.add_argument("--base-model", type=str, default="Qwen/Qwen2.5-7B-Instruct", help="Base model identifier or path.")
    parser.add_argument("--adapter-dir", type=str, default="./models/noctis-7b-v2.0-adapter", help="Directory containing adapter_model.safetensors.")
    parser.add_argument("--output-dir", type=str, default="./models/noctis-7b-v2.0-merged", help="Directory to save merged model.")
    parser.add_argument("--export-modelfile", action="store_true", help="Generate Ollama Modelfile for direct serving.")
    parser.add_argument("--modelfile-only", action="store_true", help="Generate Ollama Modelfiles immediately without running full weight merge.")
    return parser.parse_args()

def generate_ollama_modelfiles(adapter_dir: str, merged_dir: str):
    # 1. Native lightweight adapter Modelfile (points to base qwen2.5:7b-instruct + local adapter)
    adapter_modelfile = Path("Modelfile.noctis-7b-adapter")
    adapter_abs = Path(adapter_dir).resolve().as_posix()
    content_adapter = f"""# Noctis-7B V2.0 Sovereign Intelligence Engine (LoRA Adapter)
FROM qwen2.5:7b-instruct
ADAPTER "{adapter_abs}"

TEMPLATE \"\"\"<|im_start|>system
You are Noctis-7B V2.0, a sovereign technical, mathematical, clinical, and regulatory reasoning intelligence.
Enforce dimensional conservation, zero unverified assumptions, and strict NIST RMF compliance.<|im_end|>
<|im_start|>user
{{{{ .Prompt }}}}<|im_end|>
<|im_start|>assistant
\"\"\"

PARAMETER temperature 0.1
PARAMETER top_p 0.95
PARAMETER top_k 40
PARAMETER stop "<|im_end|>"
PARAMETER stop "<|endoftext|>"
"""
    adapter_modelfile.write_text(content_adapter, encoding="utf-8")
    print(f"[✓] Generated Lightweight Ollama Modelfile: {adapter_modelfile}")
    print(f"    Run: ollama create noctis-7b -f {adapter_modelfile}")

    # 2. Standalone merged Modelfile (for when fully merged weights exist)
    merged_modelfile = Path("Modelfile.noctis-7b-merged")
    merged_abs = Path(merged_dir).resolve().as_posix()
    content_merged = f"""# Noctis-7B V2.0 Sovereign Intelligence Engine (Merged 16-bit Standalone)
FROM "{merged_abs}"

TEMPLATE \"\"\"<|im_start|>system
You are Noctis-7B V2.0, a sovereign technical, mathematical, clinical, and regulatory reasoning intelligence.
Enforce dimensional conservation, zero unverified assumptions, and strict NIST RMF compliance.<|im_end|>
<|im_start|>user
{{{{ .Prompt }}}}<|im_end|>
<|im_start|>assistant
\"\"\"

PARAMETER temperature 0.1
PARAMETER top_p 0.95
PARAMETER top_k 40
PARAMETER stop "<|im_end|>"
PARAMETER stop "<|endoftext|>"
"""
    merged_modelfile.write_text(content_merged, encoding="utf-8")
    print(f"[✓] Generated Standalone Merged Ollama Modelfile: {merged_modelfile}")

def main():
    args = parse_args()
    adapter_path = Path(args.adapter_dir)
    safetensors_file = adapter_path / "adapter_model.safetensors"
    config_file = adapter_path / "adapter_config.json"

    print("=" * 70)
    print("NOCTIS-7B V2.0 ADAPTER MERGE & SERVING PIPELINE")
    print("=" * 70)
    print(f"Base Model    : {args.base_model}")
    print(f"Adapter Dir   : {args.adapter_dir}")
    print(f"Output Dir    : {args.output_dir}")

    if args.modelfile_only or args.export_modelfile:
        generate_ollama_modelfiles(args.adapter_dir, args.output_dir)
        if args.modelfile_only:
            print("\n[✓] Modelfiles generated successfully. Ready for Ollama serving.")
            sys.exit(0)

    if not safetensors_file.exists() or not config_file.exists():
        print(f"\n[!] Note: Adapter files not found locally at {args.adapter_dir}.")
        print(f"    Expected: {safetensors_file}")
        sys.exit(1)

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
    except ImportError:
        print("\n[!] PyTorch/Transformers/PEFT not installed in local environment.")
        print("    Install dependencies via: pip install torch transformers peft")
        sys.exit(1)

    print("\n[1/3] Loading base tokenizer & model...")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )

    print("[2/3] Merging LoRA weights (40,370,176 parameters)...")
    lora_model = PeftModel.from_pretrained(base_model, args.adapter_dir)
    merged_model = lora_model.merge_and_unload()

    print(f"[3/3] Saving merged 16-bit model to {args.output_dir}...")
    os.makedirs(args.output_dir, exist_ok=True)
    merged_model.save_pretrained(args.output_dir, safe_serialization=True)
    tokenizer.save_pretrained(args.output_dir)

    print("\n[✓] Noctis-7B V2.0 model merge complete!")
    generate_ollama_modelfiles(args.adapter_dir, args.output_dir)

if __name__ == "__main__":
    main()
