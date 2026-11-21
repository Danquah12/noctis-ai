#!/usr/bin/env python3
"""
NOCTIS AI — MERGE DPO ADAPTER INTO STANDALONE MODEL
Merges Phase 3 DPO clinical safety adapter into the SFT base model to produce
a 100% unified, standalone checkpoint for Ollama, vLLM, and Hugging Face Hub.
"""

import os
import argparse
import torch

try:
    import torch.distributed.tensor  # Fix for PyTorch 2.x lazy loading
except ImportError:
    pass

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

def parse_args():
    parser = argparse.ArgumentParser(description="Merge DPO adapter into standalone model")
    parser.add_argument("--base-model", type=str, default="./models/noctis-7b-v2.0-merged",
                        help="Path to SFT merged base model")
    parser.add_argument("--adapter", type=str, default="./models/noctis-7b-v3.0-dpo",
                        help="Path to Phase 3 DPO adapter directory")
    parser.add_argument("--output-dir", type=str, default="./models/noctis-7b-v3.0-standalone",
                        help="Destination for unified standalone model")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu",
                        help="Device to perform merge on")
    return parser.parse_args()

def main():
    args = parse_args()
    print("=" * 70)
    print(" NOCTIS AI — STANDALONE DPO MODEL MERGER")
    print(f" Base Model:  {args.base_model}")
    print(f" DPO Adapter: {args.adapter}")
    print(f" Output Dir:  {args.output_dir}")
    print(f" Device:      {args.device}")
    print("=" * 70)

    os.makedirs(args.output_dir, exist_ok=True)

    print("\n[+] Loading base model tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)

    print("\n[+] Loading base model weights in bfloat16...")
    dtype = torch.bfloat16 if args.device == "cuda" else torch.float32
    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        device_map="auto" if args.device == "cuda" else None,
        trust_remote_code=True,
    )

    print(f"\n[+] Attaching Phase 3 DPO adapter from {args.adapter}...")
    peft_model = PeftModel.from_pretrained(base_model, args.adapter)

    print("\n[+] Merging LoRA matrices into base transformer layers (zero precision loss)...")
    merged_model = peft_model.merge_and_unload()

    print(f"\n[+] Saving standalone model to {args.output_dir}...")
    merged_model.save_pretrained(args.output_dir, safe_serialization=True)
    tokenizer.save_pretrained(args.output_dir)

    print("=" * 70)
    print(f"[✓] SUCCESS: Unified standalone model saved to {args.output_dir}")
    print(" Ready for GGUF quantization, Ollama deployment, and Hugging Face export!")
    print("=" * 70)

if __name__ == "__main__":
    main()
