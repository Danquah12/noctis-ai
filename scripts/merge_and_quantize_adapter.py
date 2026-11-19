#!/usr/bin/env python3
"""
Noctis-7B V1.0 Adapter Merge & Serving Export Tool
==================================================
Merges the fine-tuned 155MB LoRA adapter weights (adapter_model.safetensors)
with the base Qwen/Qwen2.5-7B-Instruct model, creating a standalone unified model
ready for local or cloud inference via Ollama, vLLM, LM Studio, or llama.cpp.

Usage:
  python scripts/merge_and_quantize_adapter.py \
    --base-model "Qwen/Qwen2.5-7B-Instruct" \
    --adapter-dir "./models/noctis-7b-v1.0-adapter" \
    --output-dir "./models/noctis-7b-v1.0-merged" \
    --export-modelfile
"""

import os
import sys
import argparse
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description="Merge Noctis LoRA adapter with base model.")
    parser.add_argument("--base-model", type=str, default="Qwen/Qwen2.5-7B-Instruct", help="Base model identifier or path.")
    parser.add_argument("--adapter-dir", type=str, default="./models/noctis-7b-v1.0-adapter", help="Directory containing adapter_model.safetensors.")
    parser.add_argument("--output-dir", type=str, default="./models/noctis-7b-v1.0-merged", help="Directory to save merged model.")
    parser.add_argument("--export-modelfile", action="store_true", help="Generate Ollama Modelfile for direct serving.")
    return parser.parse_args()

def generate_ollama_modelfile(merged_dir: str, output_path: str = "Modelfile.noctis-7b"):
    content = f"""# Noctis-7B V1.0 Sovereign Intelligence Engine (Fine-Tuned Adapter)
FROM {merged_dir}

TEMPLATE \"\"\"<|im_start|>system
You are Noctis-7B, a sovereign technical, mathematical, clinical, and regulatory reasoning intelligence.
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
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[✓] Generated Ollama Modelfile: {output_path}")
    print(f"    Run: ollama create noctis-7b -f {output_path}")

def main():
    args = parse_args()
    adapter_path = Path(args.adapter_dir)
    safetensors_file = adapter_path / "adapter_model.safetensors"
    config_file = adapter_path / "adapter_config.json"

    print("=" * 70)
    print("NOCTIS-7B V1.0 ADAPTER MERGE & SERVING PIPELINE")
    print("=" * 70)
    print(f"Base Model    : {args.base_model}")
    print(f"Adapter Dir   : {args.adapter_dir}")
    print(f"Output Dir    : {args.output_dir}")

    if not safetensors_file.exists() or not config_file.exists():
        print(f"\n[!] Note: Adapter files not found locally at {args.adapter_dir}.")
        print(f"    Expected: {safetensors_file}")
        print(f"    If using the downloaded RunPod archive (noctis-pilot-results-*.tar.gz),")
        print(f"    extract it into {args.adapter_dir} first:")
        print(f"      tar -xzf noctis-pilot-results-*.tar.gz -C ./")
        if args.export_modelfile:
            generate_ollama_modelfile(args.output_dir)
        sys.exit(0)

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
    except ImportError:
        print("\n[!] PyTorch/Transformers/PEFT not installed in local environment.")
        print("    Install dependencies via: pip install torch transformers peft")
        if args.export_modelfile:
            generate_ollama_modelfile(args.output_dir)
        sys.exit(0)

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

    print("\n[✓] Noctis-7B V1.0 model merge complete!")
    if args.export_modelfile:
        generate_ollama_modelfile(args.output_dir)

if __name__ == "__main__":
    main()
