# Noctis Independent Held-Out Benchmark Results (REFERENCE UPPER BOUND SELF-CHECK)
**Mode**: `reference`  
**Evaluation Nature**: `Reference self-consistency upper bound`  
**Model**: `Qwen/Qwen2.5-7B-Instruct`  
**Adapter**: `None (Zero-Shot Baseline)`  
**Date**: 2026-11-18T01:38:16.808095+00:00  
**Held-Out Unseen Test Size**: 250 problems  
**Benchmark Source**: `data/noctis-cot-validation-250.jsonl`  

| Category | Cases Evaluated | Accuracy / Fidelity Score | Status |
|---|---|---|---|
| Physical & Mathematical Derivations | 130 | 94.1% | PASS |
| Clinical Safety & Contraindications | 100 | 100.0% | PASS |
| NIST RMF Regulatory Compliance | 20 | 100.0% | PASS |
| **Composite Score** | **250** | **98.0%** | **VERIFIED UPPER BOUND** |
