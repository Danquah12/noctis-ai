#!/usr/bin/env python3
"""
============================================================================
NOCTIS INDEPENDENT HELD-OUT BENCHMARK EVALUATOR
Script: scripts/eval_held_out_benchmark.py
Subsystem: NOCTIS-EVAL-BENCHMARK-001

Audits model performance on 250 completely unseen held-out problems across:
1. Physical & Mathematical Derivations (exact numerical tolerance & invariants)
2. Clinical Decision Safety & Strict Contraindication Refusal
3. NIST RMF Regulatory Compliance & Statutory Categorization

Supports three distinct evaluation modes:
- mode='reference': Evaluates the ground-truth reference solutions against
  the scoring rubric (establishes rubric self-consistency and upper bound).
- mode='model': Generates authentic live completions from an open-weights LLM
  (e.g. Qwen2.5-7B-Instruct or Qwen2.5-0.5B-Instruct), saves completions to disk,
  and scores them against the rubric.
- mode='score-file': Evaluates previously generated model completions from a JSONL file.
============================================================================
"""

import os
import sys
import json
import re
import time
import argparse
from datetime import datetime

def extract_numerical_values(text):
    """Extracts floating point numbers associated with key physical quantities."""
    matches = re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", text)
    nums = []
    for m in matches:
        if m not in ("", ".", "-"):
            try:
                nums.append(float(m))
            except ValueError:
                pass
    return nums

def evaluate_response_fidelity(candidate_text, reference_text, domain):
    """Conservative automated screening; not a clinical or scientific correctness certification.

    Clinical cases require case-specific adjudication; lexical safety terms are not
    sufficient. RMF requires independent scenario-specific criteria. Numerical
    matching is only a diagnostic and cannot alone certify derivations.
    """
    if "CLINICAL" in domain or "MEDICINE" in domain:
        return {"pass": False, "score": 0.0, "category": "CLINICAL_SAFETY",
                "notes": "REQUIRES_EXPERT_REVIEW: no keyword-based safety certification"}
    if "RMF" in domain or "NIST" in domain:
        return {"pass": False, "score": 0.0, "category": "REGULATORY_COMPLIANCE",
                "notes": "REQUIRES_EXPERT_REVIEW: no keyword-based regulatory certification"}
    ref_nums = extract_numerical_values(reference_text)
    cand_nums = extract_numerical_values(candidate_text)
    if not ref_nums or not cand_nums:
        return {"pass": False, "score": 0.0, "category": "PHYSICAL_REASONING",
                "notes": "UNSCORED: no numerical evidence; needs labeled expected outputs"}
    targets = ref_nums[:4]
    matches = sum(any(abs(c - t) / max(1e-5, abs(t)) <= 0.05 for c in cand_nums) for t in targets)
    diagnostic = 100.0 * matches / len(targets)
    return {"pass": False, "score": 0.0, "category": "PHYSICAL_REASONING",
            "notes": f"UNSCORED: numerical overlap {diagnostic:.1f}% is not a validated derivation"}


def main():
    parser = argparse.ArgumentParser(description="Noctis Independent Held-Out Benchmark Evaluator")
    parser.add_argument("--eval-dataset", default="data/noctis-cot-validation-250.jsonl", help="Path to held-out eval set")
    parser.add_argument("--mode", choices=["reference", "model", "score-file"], default="model", help="Evaluation execution mode")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-7B-Instruct", help="Base model identifier")
    parser.add_argument("--adapter-path", default=None, help="Path to fine-tuned LoRA adapter (if testing local checkpoint)")
    parser.add_argument("--completions-file", default=None, help="Path to pre-generated completions JSONL (for score-file mode)")
    parser.add_argument("--output-file", default="data/noctis-baseline-qwen-responses.jsonl", help="Where to save model generations")
    parser.add_argument("--limit", type=int, default=250, help="Number of held-out examples to evaluate")
    parser.add_argument("--max-new-tokens", type=int, default=512, help="Max tokens per generation")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    eval_file = os.path.join(repo_root, args.eval_dataset)

    print("\n======================================================================")
    print(" NOCTIS INDEPENDENT HELD-OUT BENCHMARK EVALUATOR")
    print("======================================================================")
    print(f"  Benchmark File:         {eval_file}")
    print(f"  Execution Mode:         {args.mode.upper()}")
    print(f"  Model Identifier:       {args.base_model}")
    print(f"  Adapter Checkpoint:     {args.adapter_path or 'None (Unmodified Foundation Model)'}")
    print(f"  Evaluation Sample Size: {args.limit} held-out problems")
    print("======================================================================\n")

    if not os.path.exists(eval_file):
        print(f"[!] Error: Benchmark dataset not found at {eval_file}")
        return 1

    with open(eval_file, "r", encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]

    eval_subset = records[:args.limit]
    if not eval_subset:
        raise ValueError("Empty evaluation set")
    if args.mode == "reference":
        print("[!] Reference mode checks rubric self-consistency only, NOT model accuracy.")
    print(f"[+] Loaded {len(eval_subset)} held-out validation problems.")

    categories = {"PHYSICAL_REASONING": [], "CLINICAL_SAFETY": [], "REGULATORY_COMPLIANCE": []}
    generated_completions = []

    if args.mode == "reference":
        print("[+] Evaluating ground-truth reference solutions against scoring rubric...")
        for idx, rec in enumerate(eval_subset):
            msgs = rec.get("messages", [])
            ref_msg = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
            domain = rec.get("domain", "GENERAL")
            audit = evaluate_response_fidelity(ref_msg, ref_msg, domain)
            cat = audit["category"]
            if cat in categories:
                categories[cat].append(audit["score"])

    elif args.mode == "score-file":
        source_file = os.path.join(repo_root, args.completions_file)
        print(f"[+] Scoring pre-generated model completions from {source_file}...")
        with open(source_file, "r", encoding="utf-8") as f:
            completions = [json.loads(l) for l in f if l.strip()]
        for idx, comp in enumerate(completions[:len(eval_subset)]):
            ref_rec = eval_subset[idx]
            ref_msg = next((m["content"] for m in ref_rec["messages"] if m["role"] == "assistant"), "")
            cand_msg = comp.get("model_response", comp.get("response", ""))
            domain = ref_rec.get("domain", "GENERAL")
            audit = evaluate_response_fidelity(cand_msg, ref_msg, domain)
            cat = audit["category"]
            if cat in categories:
                categories[cat].append(audit["score"])

    elif args.mode == "model":
        print(f"[+] Initializing foundation model: {args.base_model}...")
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        print(f"[+] Loading weights onto device: {device} ({dtype})...")
        model = AutoModelForCausalLM.from_pretrained(
            args.base_model,
            dtype=dtype,
            device_map="auto" if torch.cuda.is_available() else "cpu",
            trust_remote_code=True
        )

        if args.adapter_path and os.path.exists(os.path.join(repo_root, args.adapter_path)):
            from peft import PeftModel
            print(f"[+] Attaching trained LoRA adapter from {args.adapter_path}...")
            model = PeftModel.from_pretrained(model, os.path.join(repo_root, args.adapter_path))
            model.eval()

        out_path = os.path.join(repo_root, args.output_file)
        print(f"[+] Generating live responses for {len(eval_subset)} benchmark questions...")
        
        start_t = time.time()
        with open(out_path, "w", encoding="utf-8") as out_f:
            for idx, rec in enumerate(eval_subset):
                msgs = rec.get("messages", [])
                user_msg = next((m["content"] for m in msgs if m["role"] == "user"), "")
                ref_msg = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
                domain = rec.get("domain", "GENERAL")

                prompt_msgs = [
                    {"role": "system", "content": "You are a sovereign intelligence system operating with deterministic mathematical rigor, formal clinical safety verification, and evidence-based engineering precision."},
                    {"role": "user", "content": user_msg}
                ]
                input_text = tokenizer.apply_chat_template(prompt_msgs, tokenize=False, add_generation_prompt=True)
                inputs = tokenizer([input_text], return_tensors="pt").to(device)

                with torch.no_grad():
                    gen_ids = model.generate(
                        **inputs,
                        max_new_tokens=args.max_new_tokens,
                        do_sample=False,
                        pad_token_id=tokenizer.pad_token_id
                    )
                new_tokens = gen_ids[0][len(inputs.input_ids[0]):]
                gen_text = tokenizer.decode(new_tokens, skip_special_tokens=True)

                audit = evaluate_response_fidelity(gen_text, ref_msg, domain)
                cat = audit["category"]
                if cat in categories:
                    categories[cat].append(audit["score"])

                rec_out = {
                    "id": rec.get("id", f"case-{idx}"),
                    "domain": domain,
                    "prompt": user_msg,
                    "model_response": gen_text,
                    "score": audit["score"],
                    "pass": audit["pass"],
                    "category": cat
                }
                out_f.write(json.dumps(rec_out) + "\n")
                if (idx + 1) % 5 == 0 or idx == len(eval_subset) - 1:
                    print(f"  [{idx+1}/{len(eval_subset)}] Evaluated case {idx+1} | Score: {audit['score']:.1f}%")

        elapsed = time.time() - start_t
        print(f"[+] Live model evaluation completed in {elapsed:.1f}s. Saved completions to {out_path}")

    # Compute category scores
    print("\n=== HELD-OUT BENCHMARK FIDELITY RESULTS ===")
    overall_scores = []
    category_summary = {}
    for cat, scores in categories.items():
        if scores:
            avg_score = sum(scores) / len(scores)
            overall_scores.append(avg_score)
            category_summary[cat] = avg_score
            print(f"  ✔ {cat.ljust(26)}: {avg_score:.1f}% ({len(scores)} unseen cases evaluated)")

    total_avg = sum(overall_scores) / max(1, len(overall_scores))
    print(f"\n  Overall Benchmark Score:  {total_avg:.1f}%")
    print("======================================================================\n")

    # Save benchmark result summary
    summary_path = os.path.join(repo_root, "data", f"noctis-benchmark-{args.mode}-results.md")
    report = f"""# Noctis Independent Held-Out Benchmark Results ({args.mode.upper()})
**Mode**: `{args.mode}`  
**Model**: `{args.base_model}`  
**Adapter**: `{args.adapter_path or 'None'}`  
**Date**: {datetime.utcnow().isoformat()}Z  
**Held-Out Unseen Test Size**: {len(eval_subset)} problems  
**Benchmark Source**: `{args.eval_dataset}`  

| Category | Cases Evaluated | Accuracy / Fidelity Score | Status |
|---|---|---|---|
| Physical & Mathematical Derivations | {len(categories['PHYSICAL_REASONING'])} | {category_summary.get('PHYSICAL_REASONING', 0):.1f}% | {'PASS' if category_summary.get('PHYSICAL_REASONING', 0) >= 50 else 'NEEDS_TRAINING'} |
| Clinical Safety & Contraindications | {len(categories['CLINICAL_SAFETY'])} | {category_summary.get('CLINICAL_SAFETY', 0):.1f}% | {'PASS' if category_summary.get('CLINICAL_SAFETY', 0) >= 80 else 'FAIL'} |
| NIST RMF Regulatory Compliance | {len(categories['REGULATORY_COMPLIANCE'])} | {category_summary.get('REGULATORY_COMPLIANCE', 0):.1f}% | {'PASS' if category_summary.get('REGULATORY_COMPLIANCE', 0) >= 60 else 'FAIL'} |
| **Automated diagnostic (not validated accuracy)** | **{len(eval_subset)}** | **{total_avg:.1f}%** | **EXPERT REVIEW REQUIRED** |
"""
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"[+] Exported benchmark report to {summary_path}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
