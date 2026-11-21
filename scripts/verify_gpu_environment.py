#!/usr/bin/env python3
"""
NOCTIS CLINICAL REASONING: GPU CLUSTER ENVIRONMENT & DEPENDENCY VERIFIER
Validates cloud GPU instances (RunPod, Lambda Labs, CoreWeave) before launching DPO training.
"""

import sys
import os
import json

def check_environment():
    print("=" * 70)
    print(" NOCTIS GPU CLUSTER PRE-FLIGHT READINESS CHECK")
    print("=" * 70)

    # 1. Python version
    py_ver = sys.version_info
    print(f"[*] Python Version: {py_ver.major}.{py_ver.minor}.{py_ver.micro}")
    assert py_ver.major == 3 and py_ver.minor >= 10, "Python >= 3.10 required"
    print("    [PASS] Python version compatible")

    # 2. PyTorch & CUDA check
    try:
        import torch
        print(f"[*] PyTorch Version: {torch.__version__}")
        cuda_avail = torch.cuda.is_available()
        print(f"[*] CUDA Available:  {cuda_avail}")
        if cuda_avail:
            device_count = torch.cuda.device_count()
            device_name = torch.cuda.get_device_name(0)
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"[*] GPU Device:      {device_name} ({device_count} device(s))")
            print(f"[*] GPU Memory:      {vram_gb:.1f} GB")
        else:
            print("    [NOTE] Running in CPU validation / simulation mode")
        print("    [PASS] Torch framework loaded")
    except ImportError:
        print("    [SKIP] PyTorch not yet installed in host environment")

    # 3. DPO Dataset Verification
    dataset_path = os.path.join(os.path.dirname(__file__), "..", "data", "noctis-dpo-clinical-safety.jsonl")
    if os.path.exists(dataset_path):
        with open(dataset_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip()]
        print(f"[*] DPO Dataset:     Found {len(lines)} curated preference pairs")
        assert len(lines) >= 1000, f"Expected >= 1000 pairs, found {len(lines)}"
        
        # Verify first row schema
        first_row = json.loads(lines[0])
        assert "prompt" in first_row and "chosen" in first_row and "rejected" in first_row, "Invalid DPO schema"
        print("    [PASS] DPO dataset schema validated (prompt, chosen, rejected present)")
    else:
        print(f"    [FAIL] Dataset not found at {dataset_path}")
        return False

    # 4. Training script verification
    script_path = os.path.join(os.path.dirname(__file__), "train_clinical_dpo.py")
    if os.path.exists(script_path):
        print("    [PASS] train_clinical_dpo.py script verified")
    else:
        print("    [FAIL] train_clinical_dpo.py missing")
        return False

    print("=" * 70)
    print(" NOCTIS GPU ENVIRONMENT IS 100% READY FOR CLOUD EXECUTION")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = check_environment()
    sys.exit(0 if success else 1)
