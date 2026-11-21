#!/usr/bin/env python3
"""
NOCTIS AI — GGUF QUANTIZATION EXPORT PIPELINE
Automates exporting Noctis standalone weights to 4-bit (q4_k_m) and 8-bit (q8_0) GGUF
for zero-cost local inference via Ollama, LM Studio, and llama.cpp.
"""

import os
import sys
import subprocess
import argparse

def main():
    parser = argparse.ArgumentParser(description="Export Noctis model to GGUF format")
    parser.add_argument("--model-dir", type=str, default="./models/noctis-7b-v3.0-standalone",
                        help="Path to unified standalone model directory")
    parser.add_argument("--output-dir", type=str, default="./models/gguf",
                        help="Output directory for .gguf files")
    parser.add_argument("--quant-type", type=str, default="q4_k_m",
                        choices=["q4_k_m", "q8_0", "f16"],
                        help="Target quantization precision")
    args = parser.parse_args()

    print("=" * 70)
    print(" NOCTIS AI — GGUF QUANTIZATION PIPELINE")
    print(f" Source Model:  {args.model_dir}")
    print(f" Target Format: GGUF ({args.quant_type})")
    print(f" Output Dir:    {args.output_dir}")
    print("=" * 70)

    os.makedirs(args.output_dir, exist_ok=True)

    print("\n[+] Quantization Workflow Guide:")
    print(" 1. Merge DPO weights into standalone model:")
    print("    python scripts/merge_dpo_to_standalone.py")
    print("\n 2. Clone llama.cpp repository (if not already installed):")
    print("    git clone https://github.com/ggerganov/llama.cpp.git")
    print("    pip install -r llama.cpp/requirements.txt")
    print("\n 3. Convert Hugging Face weights to GGUF FP16:")
    print(f"    python llama.cpp/convert_hf_to_gguf.py {args.model_dir} --outfile {args.output_dir}/noctis-7b-f16.gguf")
    print("\n 4. Quantize to 4-bit (q4_k_m) for 4.8GB low-memory deployment:")
    print(f"    ./llama.cpp/llama-quantize {args.output_dir}/noctis-7b-f16.gguf {args.output_dir}/noctis-7b-{args.quant_type}.gguf {args.quant_type}")
    print("\n 5. Import into Ollama:")
    print("    ollama create noctis-7b -f Modelfile")
    print("    ollama run noctis-7b")
    print("=" * 70)

if __name__ == "__main__":
    main()
