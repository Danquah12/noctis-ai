#!/usr/bin/env python3
"""
NOCTIS AI — HUGGING FACE HUB PUBLISHING PIPELINE
Automates uploading Noctis-7B v3.0 standalone model, tokenizer, and model card
to the Hugging Face Hub under your namespace.
"""

import os
import argparse
from huggingface_hub import HfApi, create_repo

def main():
    parser = argparse.ArgumentParser(description="Upload Noctis model to Hugging Face Hub")
    parser.add_argument("--model-dir", type=str, default="./models/noctis-7b-v3.0-standalone",
                        help="Path to unified standalone model directory")
    parser.add_argument("--repo-id", type=str, default="Danquah12/noctis-7b-clinical-v3.0",
                        help="Target repository ID on Hugging Face (e.g. username/model-name)")
    parser.add_argument("--private", action="store_true", default=False,
                        help="Whether to create the repository as private")
    args = parser.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        print("[!] Error: HF_TOKEN environment variable not set.")
        print("    Please set it with: export HF_TOKEN='your_huggingface_write_token'")
        return

    api = HfApi(token=token)

    print("=" * 70)
    print(" NOCTIS AI — HUGGING FACE HUB PUBLISHING")
    print(f" Source Directory: {args.model_dir}")
    print(f" Target Repo:      {args.repo_id}")
    print(f" Private:          {args.private}")
    print("=" * 70)

    print(f"\n[+] Ensuring Hugging Face repository {args.repo_id} exists...")
    create_repo(repo_id=args.repo_id, token=token, private=args.private, exist_ok=True)

    print("\n[+] Uploading model card README.md...")
    if os.path.exists("MODEL_CARD.md"):
        api.upload_file(
            path_or_fileobj="MODEL_CARD.md",
            path_in_repo="README.md",
            repo_id=args.repo_id,
            token=token
        )

    print(f"\n[+] Uploading model weights and tokenizer from {args.model_dir}...")
    api.upload_folder(
        folder_path=args.model_dir,
        repo_id=args.repo_id,
        token=token
    )

    print("=" * 70)
    print(f"[✓] PUBLISHING COMPLETE! Model is live at:")
    print(f"    https://huggingface.co/{args.repo_id}")
    print("=" * 70)

if __name__ == "__main__":
    main()
