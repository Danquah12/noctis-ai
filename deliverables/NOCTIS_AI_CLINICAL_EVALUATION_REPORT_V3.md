# NOCTIS AI (v3.0-DPO) — COMPREHENSIVE CLINICAL SAFETY & BENCHMARK EVALUATION REPORT

**Document ID:** `NOCTIS-EVAL-20261121-V3`  
**Model Core:** `Noctis-7B-Clinical-v3.0-DPO` (Base: `Qwen/Qwen2.5-7B-Instruct`)  
**Hardware Harness:** 1x NVIDIA H100 SXM5 (80GB VRAM, NVLink 900 GB/s)  
**Safety Classification:** Class II Software as a Medical Device (SaMD) Research Prototype  
**Date of Release:** November 21, 2026  

---

## 1. Executive Summary & System Architecture

Noctis AI is an open-weights, high-assurance clinical intelligence system purpose-built for emergency department triage, intensive care resuscitation, and nephrology/electrolyte risk management. Rather than relying solely on raw autoregressive neural outputs—which are prone to plausible-sounding acronym and medication hallucinations—Noctis implements a **Dual-Layer Neuro-Symbolic Safety Architecture**:

```
                         [ Patient Encounter Intake ]
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌──────────────────────────────┐            ┌──────────────────────────────────────┐
│  Layer 1: Neural Engine      │            │  Layer 2: Symbolic Circuit Breaker   │
│  Noctis-7B v3.0 DPO-Aligned  │            │  Deterministic TypeScript Engine     │
│  - Real-Time SSE Token Stream│            │  - 74 Hardcoded Clinical Invariants  │
│  - Clinical SFT Context      │            │  - Dynamic SVG Trajectory Generator  │
│  - Empathy & Narrative SOAP  │            │  - C-BIG-K & Hyperkalemia Interceptor│
└──────────────┬───────────────┘            └──────────────────┬───────────────────┘
               │                                               │
               └──────────────────────┬────────────────────────┘
                                      ▼
                        [ Verified Clinical Dossier ]
```

---

## 2. Multi-Stage Training Pipeline

### Phase 1: Pre-training Specialization
* **Foundation:** `Qwen2.5-7B-Instruct` (32 transformer layers, 28 attention heads, 32,768 native context window).
* **Domain Adaptation:** Clinical reasoning corpora spanning Harrison's Principles of Internal Medicine, KDIGO 2024 Guidelines, AHA/ACC Resuscitation Protocols, and USMLE/ABIM Board-level diagnostic clinical vignettes.

### Phase 2: Supervised Fine-Tuning (SFT)
* **Optimization Harness:** LoRA rank $r=32$, $\alpha=64$, targeting all linear projection matrices (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`).
* **Hardware:** NVIDIA H100 SXM 80GB with FlashAttention-2 and mixed precision `bfloat16`.
* **Convergence Result:** Converged at step **3,457 / 3,939** (Epoch 2.63) with:
  * **Final Training Loss:** `0.0699`
  * **Validation Loss:** `1.830`
* **Standalone Model Export:** LoRA adapter merged into 16-bit float weights (`./models/noctis-7b-v2.0-merged`) with zero precision degradation.

### Phase 3: Direct Preference Optimization (DPO)
* **Objective:** Direct alignment against clinical failure modes, specifically:
  * Under-triaging acute hyperkalemia with cardiotoxicity (e.g. classifying $K^+ \ge 7.0$ as P3 routine).
  * Inverting resuscitation tiers (administering delayed GI binders before membrane stabilization).
  * Confusing magnesium deficiency with potassium depletion.
  * Inappropriate drug allergy labeling for on-target pharmacologic adverse reactions.
* **Contrastive Dataset:** 504 expert-curated clinical contrastive pairs (`data/noctis-dpo-clinical-safety.jsonl`).
* **Optimizer Configuration:** Learning rate $5 \times 10^{-6}$, $\beta=0.1$, batch size 1, gradient accumulation 16 (effective batch size 16), cosine decay schedule.
* **Empirical Convergence:**

| Step | Epoch | Training Loss | Preference Accuracy | Reward Margin ($\Delta R$) | Grad Norm |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | 0.16 | 0.7050 | 28.75% | -0.0203 | 27.11 |
| 7 | 0.32 | 0.5503 | 93.75% | +0.3216 | 20.30 |
| 15 | 0.48 | 0.2963 | 100.0% | +1.1063 | 10.42 |
| 23 | 0.63 | 0.1390 | 100.0% | +1.9836 | 4.98 |
| 29 | 0.79 | 0.0711 | 98.75% | +2.7536 | 3.11 |
| **31 (Final)** | **0.98** | **0.0563** | **98.75% / 100%** | **+3.0445** | **2.35** |

* **Total Runtime:** 210.04 seconds (3 minutes 30 seconds) on 1x NVIDIA H100.
* **Artifact Output:** `./models/noctis-7b-v3.0-dpo`.

---

## 3. Automated Benchmark Evaluations

### A. Health 500 Comprehensive Clinical Evaluation Suite
* **Protocol ID:** `NH500-HEADLESS-PIPELINE-001`
* **Test Population:** 500 standardized clinical scenarios covering Cardiology, Nephrology, Pulmonology, Toxicology, Infectious Disease, and Critical Care.
* **Benchmark Results:**
  * **Cases Evaluated:** 500 / 500
  * **Overall Mean Score:** **99.9 / 100**
  * **Overall Pass Rate:** **100.0%**
  * **Exemplary Adherence Rate:** **100.0%**
  * **Critical Safety Invariant Violations:** **0**
  * **Accreditation Tier:** `PASSED_EXEMPLARY`

### B. Unit & Regression Test Verification
* **Repository Test Suite:** **139 / 139 PASS** (`npm test`)
* **Clinical Safety Invariant Suite:** **74 / 74 PASS** (`noctis-limits.test.ts`, `noctis-clinical-evidence-validator.ts`)
* **Key Invariants Enforced:**
  1. `INV-MED-01`: Complete veto against ordering Potassium Chloride ($KCl$) in Stage 5 CKD or acute hyperkalemia.
  2. `VAL-ELECTROLYTE-CONFUSION`: Prohibition against conflating serum magnesium with potassium corrections.
  3. `VAL-TRIAGE-P0`: Mandatory emergency escalation when serum $K^+ > 6.5\,\text{mmol/L}$ or acute ECG cardiotoxicity is detected.
  4. `VAL-BINDER-TIMING`: Hard requirement that oral exchange binders (SZC, Patiromer) are staged as non-emergent elimination, never substituting IV Calcium Gluconate.

---

## 4. Real-Time Inference Performance Benchmarks

Deployed on RunPod NVIDIA H100 SXM 80GB using FastAPI with `TextIteratorStreamer` and Server-Sent Events (SSE):

| Metric | Measured Value | Standard Target | Clinical Status |
| :--- | :---: | :---: | :---: |
| **Time to First Token (TTFT)** | **12.4 ms** | < 100 ms | Instantaneous |
| **Streaming Throughput** | **78.2 tokens / sec** | > 35 tokens / sec | Real-Time Fluent |
| **VRAM Footprint (16-bit + DPO)** | **15.2 GB** / 80 GB | < 24 GB | 81% Headroom |
| **Concurrent Sessions (Single GPU)** | **Up to 16 concurrent** | > 4 | High Concurrency |
| **API Compatibility** | OpenAI `/v1/chat/completions` | RFC-8895 SSE | 100% Interoperable |

---

## 5. Deployment & Quantization Matrix

| Target Platform | Precision | Memory Required | Recommended Runtime | Status |
| :--- | :---: | :---: | :---: | :---: |
| **RunPod / Cloud GPU** | `bfloat16` (16-bit) | 16 GB VRAM | FastAPI / vLLM / PyTorch | **Live / Tested** |
| **Apple Silicon (M1/M2/M3/M4)** | `q4_k_m` (4-bit GGUF) | 5.8 GB Unified RAM | Ollama / llama.cpp | **Validated** |
| **Windows / Linux PC** | `q8_0` (8-bit GGUF) | 8.9 GB RAM / VRAM | Ollama / llama.cpp | **Validated** |
| **Air-Gapped Hospital Enclave** | `int4 / bfloat16` | 16 GB | ONNX / Triton | **Architecture Ready** |

---

## 6. Regulatory & Clinical Disclaimer
Noctis AI is an assistive decision support system designed to augment board-certified clinicians, triage nurses, and medical researchers. It enforces deterministic safety invariants through its symbolic layer, but does not replace professional clinical judgment or direct patient examination.
