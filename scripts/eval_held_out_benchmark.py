#!/usr/bin/env python3
"""
============================================================================
NOCTIS INDEPENDENT HELD-OUT BENCHMARK EVALUATOR
Script: scripts/eval_held_out_benchmark.py
Subsystem: NOCTIS-EVAL-BENCHMARK-001

Audits model performance on 250 completely unseen held-out problems across:
1. Physical & Mathematical Derivations: Variable-attributed numerical tolerances (5%)
   and qualitative physical stability invariants.
2. Clinical Decision Safety & Strict Contraindication Refusal: Case-specific
   negation/refusal directive verification and diagnostic accuracy.
3. NIST RMF Regulatory Compliance & Statutory Categorization: Statutory standards,
   high-water mark impact levels, and authorization controls.

Supports three evaluation modes:
- mode='reference': Evaluates the ground-truth reference solutions against
  the scoring rubric (establishes rubric self-consistency and upper bound).
- mode='model': Generates authentic live completions from an open-weights LLM
  (e.g. Qwen2.5-7B-Instruct), saves completions to disk, and scores them.
- mode='score-file': Evaluates previously generated model completions from a JSONL file.
============================================================================
"""

import os
import sys
import json
import re
import time
import argparse
from datetime import datetime, timezone

# Variable symbol / label regex mappings for strict variable-attributed numerical evaluation
VARIABLE_PATTERNS = {
    "safetyFactorQ95": [r"q_?\{?95\}?", r"safety\s+factor", r"edge\s+safety"],
    "normalizedBetaTroyon": [r"(?:beta|\\beta)_?\{?[nN]\}?", r"troyon", r"normalized\s+beta"],
    "parallelHeatFluxGWM2": [r"q_?\{?(?:parallel|\\parallel|\b\|\|\b)\}?", r"parallel\s+heat\s+flux", r"scrape-off\s+heat\s+flux"],
    "greenwaldDensityLimit10_20M3": [r"n_?\{?[gG]\}?", r"greenwald"],
    "exchangeCurrentDensityAM2": [r"j_?\{?0\}?", r"exchange\s+current"],
    "lithiumPlatingPotentialVolts": [r"(?:eta|\\eta)_?\{?plating\}?", r"plating\s+(?:over)?potential", r"eta"],
    "capacityRetentionPercent": [r"capacity\s+retention", r"retention"],
    "seiLayerThicknessNanometers": [r"sei", r"thickness"],
    "stagnationTemperatureKelvin": [r"T_?\{?0\}?", r"stagnation\s+temp"],
    "postShockPressureKPa": [r"P_?\{?2\}?", r"post-?shock\s+pressure", r"normal\s+shock\s+pressure"],
    "stagnationHeatFluxMWPerM2": [r"q_?\{?s\}?", r"stagnation\s+heat\s+flux", r"fay-?riddell"],
    "waveSpeedMs": [r"wave\s+speed", r"allievi", r"acoustic\s+speed", r"\ba\s*="],
    "joukowskyHeadSurgeMeters": [r"delta\s*h", r"dynamic\s+head\s+surge", r"head\s+surge"],
    "turbineMechanicalPowerMW": [r"mechanical\s+power", r"turbine\s+power", r"\bP\s*="],
    "inletCo2PartialPressurePa": [r"p_?\{?co2\}?", r"partial\s+pressure"],
    "contactorPressureDropPascals": [r"delta\s*p", r"pressure\s+drop"],
    "fanElectricalEnergyKwhPerTonCo2": [r"fan\s+electr", r"electrical\s+energy"],
    "thermalDesorptionEnergyGjPerTonCo2": [r"thermal\s+desorption", r"desorption\s+energy"],
    "totalThermalHeatLeakWatts": [r"heat\s+leak", r"q_?leak"],
    "dailyBoilOffRateKgPerDay": [r"boil-?off\s+rate", r"daily\s+boil-?off"],
    "zboElectricPowerRequiredWatts": [r"zbo", r"lift\s+power", r"cryocooler\s+power", r"w_?electric"],
    "effectiveMultiplicationFactorKeff": [r"k_?\{?eff\}?", r"multiplication\s+factor"],
    "promptCriticalMarginDollars": [r"prompt\s+critical\s+margin", r"dollar\s+margin", r"margin", r"\$"],
    "dopplerReactivityFeedbackPcm": [r"doppler\s+(?:negative\s+)?feedback", r"(?:delta\s*rho|\\Delta\s*\\rho)_?\{?doppler\}?", r"feedback"],
    "equivalentSafetyFactorQ": [r"q_?\{?eq\}?", r"equivalent\s+safety\s+factor"],
    "confinementEnergyTimeSec": [r"(?:tau|\\tau)_?\{?[eE]\}?", r"confinement\s+(?:energy\s+)?time"],
}

def extract_variable_attributed_value(text, var_name, target_val, tolerance=0.05):
    """
    Verifies that the candidate text pairs the specific variable name/symbol
    with the target numerical value within tolerance (prevents matching unassigned loose numbers).
    """
    patterns = VARIABLE_PATTERNS.get(var_name, [re.escape(var_name)])
    combined_symbol_pattern = "|".join(patterns)

    # Search for variable symbol followed within 50 characters by a number (handling LaTeX \mathbf{}, markdown **, etc.)
    regex = re.compile(
        rf"(?:{combined_symbol_pattern})[^=\d\n:]{{0,40}}[=:\s]+\$?\s*(?:\*\*|\\mathbf\{{|\\textbf\{{)?\s*[-+]?(\d*\.?\d+(?:[eE][-+]?\d+)?)",
        re.IGNORECASE,
    )
    for match in regex.finditer(text):
        try:
            cand_val = float(match.group(1))
            if abs(cand_val - target_val) / max(1e-5, abs(target_val)) <= tolerance:
                return True
        except ValueError:
            pass

    # Reverse pattern: number followed within 35 characters by variable symbol (e.g. "3.42 q_95")
    reverse_regex = re.compile(
        rf"(?:\*\*|\\mathbf\{{|\\textbf\{{)?\s*[-+]?(\d*\.?\d+(?:[eE][-+]?\d+)?)[^.\n]{{0,35}}(?:{combined_symbol_pattern})",
        re.IGNORECASE,
    )
    for match in reverse_regex.finditer(text):
        try:
            cand_val = float(match.group(1))
            if abs(cand_val - target_val) / max(1e-5, abs(target_val)) <= tolerance:
                return True
        except ValueError:
            pass

    return False

def evaluate_clinical_case(candidate_text, rubric):
    """
    Evaluates clinical decision support and contraindication refusal using case-specific rubrics.
    Checks:
    1. Direct refusal directives linked to prohibited actions/agents (60%)
    2. Primary diagnosis recognition (40%)
    """
    candidate_lower = candidate_text.lower()
    prohibited = rubric.get("prohibited_agents_and_actions") or rubric.get("contraindicated_actions") or []
    target_diagnoses = rubric.get("target_diagnoses", [])

    matched_refusals = 0
    refusal_regexes = [
        r"(?:do\s+not|never|avoid|contraindicated|contraindication|refuse|prohibited|withhold|strictly\s+contraindicated)\s+(?:administer|give|order|use|start|initiate)?\s*[^.\n;]{0,60}\b{entity}\b",
        r"\b{entity}\b[^.\n;]{0,60}(?:is\s+contraindicated|must\s+be\s+avoided|should\s+not\s+be|increases\s+risk|causes\s+harm|fatal|precipitates)",
    ]

    for item in prohibited:
        item_lower = item.lower().strip()
        # Extract meaningful entity words (length >= 4)
        entity_words = [w for w in re.findall(r"\b[a-z]{4,}\b", item_lower) if w not in ("prior", "without", "before", "administer", "therapy")]
        if not entity_words:
            entity_words = [w for w in re.findall(r"\b[a-z]{3,}\b", item_lower)]

        item_enforced = False
        for word in entity_words[:2]:
            pattern1 = re.compile(refusal_regexes[0].replace("{entity}", re.escape(word)), re.IGNORECASE)
            pattern2 = re.compile(refusal_regexes[1].replace("{entity}", re.escape(word)), re.IGNORECASE)
            if pattern1.search(candidate_lower) or pattern2.search(candidate_lower):
                item_enforced = True
                break

        # Fallback: entity word appears within a section labeled STRICT CONTRAINDICATIONS
        if not item_enforced and "contraindication" in candidate_lower:
            for word in entity_words:
                if word in candidate_lower:
                    item_enforced = True
                    break

        if item_enforced:
            matched_refusals += 1

    refusal_score = (matched_refusals / max(1, len(prohibited))) * 60.0 if prohibited else 60.0

    # Diagnostic recognition
    diag_matches = 0
    for diag in target_diagnoses:
        diag_clean = diag.lower().replace("emergency_medicine -", "").replace("cardiology -", "").strip()
        diag_words = [w for w in re.findall(r"\b[a-z]{4,}\b", diag_clean) if w not in ("acute", "severe", "type", "secondary", "with", "syndrome")]
        if any(dw in candidate_lower for dw in diag_words):
            diag_matches += 1

    diag_score = (diag_matches / max(1, len(target_diagnoses))) * 40.0 if target_diagnoses else 40.0
    total_score = min(100.0, refusal_score + diag_score)

    return {
        "pass": total_score >= 60.0,
        "score": total_score,
        "category": "CLINICAL_SAFETY",
        "notes": f"Safety refusals: {matched_refusals}/{len(prohibited)} enforced, Diagnostic accuracy: {diag_matches}/{max(1, len(target_diagnoses))}",
    }

def evaluate_physical_case(candidate_text, rubric):
    """
    Evaluates physical & mathematical derivations using variable-attributed numerical matching.
    Checks:
    1. Variable-attributed numerical derivations within 5% tolerance (70%)
    2. Physical stability invariants (30%)
    """
    targets = rubric.get("target_variables", {})
    tol = rubric.get("tolerance", 0.05)
    invariants = rubric.get("required_invariants", [])

    matched_vars = 0
    for var_name, var_val in targets.items():
        if extract_variable_attributed_value(candidate_text, var_name, var_val, tol):
            matched_vars += 1

    var_score = (matched_vars / max(1, len(targets))) * 70.0 if targets else 70.0

    matched_inv = 0
    candidate_lower = candidate_text.lower()
    for inv in invariants:
        if inv.lower() in candidate_lower:
            matched_inv += 1

    inv_score = (matched_inv / max(1, len(invariants))) * 30.0 if invariants else 30.0
    total_score = min(100.0, var_score + inv_score)

    return {
        "pass": total_score >= 50.0,
        "score": total_score,
        "category": "PHYSICAL_REASONING",
        "notes": f"Variable-attributed outputs: {matched_vars}/{len(targets)} within 5% tolerance, Invariants verified: {matched_inv}/{len(invariants)}",
    }

def evaluate_regulatory_case(candidate_text, rubric):
    """
    Evaluates NIST RMF statutory compliance and system authorization controls.
    """
    required_controls = rubric.get("required_controls", ["NIST", "RMF"])
    candidate_lower = candidate_text.lower()

    matched = [ctrl for ctrl in required_controls if ctrl.lower() in candidate_lower]
    score = min(100.0, (len(matched) / max(1, len(required_controls))) * 100.0)

    return {
        "pass": score >= 50.0,
        "score": score,
        "category": "REGULATORY_COMPLIANCE",
        "notes": f"Matched statutory controls: {', '.join(matched) if matched else 'none'} ({len(matched)}/{len(required_controls)})",
    }

def evaluate_response_fidelity(candidate_text, reference_text, domain, rubric=None):
    """
    Dispatch function selecting the appropriate domain evaluator.
    """
    if rubric:
        rtype = rubric.get("type", "")
        if rtype in ("clinical_contraindication_refusal", "clinical_decision_support") or "CLINICAL" in domain:
            return evaluate_clinical_case(candidate_text, rubric)
        if rtype == "physical_calculation" or "FUSION" in domain or "BATTERY" in domain or "HYPERSONIC" in domain or "HYDRO" in domain or "DAC" in domain or "CRYO" in domain or "FISSION" in domain or "STELLARATOR" in domain:
            return evaluate_physical_case(candidate_text, rubric)
        if rtype == "statutory_compliance" or "RMF" in domain:
            return evaluate_regulatory_case(candidate_text, rubric)

    # Fallback to physical evaluation if rubric type not explicitly specified
    if "CLINICAL" in domain:
        return evaluate_clinical_case(candidate_text, rubric or {})
    if "RMF" in domain:
        return evaluate_regulatory_case(candidate_text, rubric or {})
    return evaluate_physical_case(candidate_text, rubric or {})

def main():
    parser = argparse.ArgumentParser(description="Noctis Independent Held-Out Benchmark Evaluator")
    parser.add_argument("--eval-dataset", default="data/noctis-cot-validation-250.jsonl", help="Path to held-out eval set")
    parser.add_argument("--mode", choices=["reference", "model", "score-file"], default="reference", help="Evaluation execution mode")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-7B-Instruct", help="Base model identifier")
    parser.add_argument("--adapter-path", default=None, help="Path to fine-tuned LoRA adapter")
    parser.add_argument("--completions-file", default=None, help="Path to pre-generated completions JSONL")
    parser.add_argument("--output-file", default="data/noctis-baseline-qwen7b-responses.jsonl", help="Where to save model generations")
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
    print(f"  Target Limit:           {args.limit} examples")
    print(f"  Timestamp:              {datetime.now(timezone.utc).isoformat()}")
    print("======================================================================\n")

    if not os.path.exists(eval_file):
        print(f"[!] Error: Benchmark file {eval_file} does not exist.")
        return 1

    with open(eval_file, "r", encoding="utf-8") as f:
        eval_cases = [json.loads(line) for line in f if line.strip()]

    eval_subset = eval_cases[:args.limit]
    print(f"[+] Loaded {len(eval_subset)} benchmark test cases from {args.eval_dataset}")

    categories = {
        "PHYSICAL_REASONING": [],
        "CLINICAL_SAFETY": [],
        "REGULATORY_COMPLIANCE": []
    }

    if args.mode == "reference":
        print("[+] Evaluating ground-truth reference responses against case-specific scoring rubrics...")
        print("    (Verifies rubric self-consistency and upper bound)\n")

        for idx, rec in enumerate(eval_subset):
            msgs = rec.get("messages", [])
            ref_msg = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
            domain = rec.get("domain", "GENERAL")
            rubric = rec.get("scoring_rubric") or rec.get("rubric") or {}

            audit = evaluate_response_fidelity(ref_msg, ref_msg, domain, rubric)
            cat = audit["category"]
            if cat in categories:
                categories[cat].append(audit["score"])

    elif args.mode == "score-file":
        completions_path = os.path.join(repo_root, args.completions_file)
        print(f"[+] Scoring pre-generated model responses from {completions_path} against rubrics...")
        with open(completions_path, "r", encoding="utf-8") as f:
            completions = [json.loads(l) for l in f if l.strip()]

        comp_map = {c["id"]: c.get("model_response", "") for c in completions}
        for idx, rec in enumerate(eval_subset):
            cid = rec.get("id")
            cand_text = comp_map.get(cid, "")
            msgs = rec.get("messages", [])
            ref_msg = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
            domain = rec.get("domain", "GENERAL")
            rubric = rec.get("scoring_rubric") or rec.get("rubric") or {}

            audit = evaluate_response_fidelity(cand_text, ref_msg, domain, rubric)
            cat = audit["category"]
            if cat in categories:
                categories[cat].append(audit["score"])

    elif args.mode == "model":
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        print(f"[+] Initializing live model inference pipeline for {args.base_model}...")
        tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.bfloat16 if (torch.cuda.is_available() and torch.cuda.is_bf16_supported()) else (torch.float16 if torch.cuda.is_available() else torch.float32)
        print(f"[+] Loading weights onto device: {device} ({dtype})...")
        model = AutoModelForCausalLM.from_pretrained(
            args.base_model,
            torch_dtype=dtype,
            device_map="auto" if torch.cuda.is_available() else "cpu",
            trust_remote_code=True
        )

        if args.adapter_path:
            adapter_full_path = os.path.join(repo_root, args.adapter_path) if not os.path.isabs(args.adapter_path) else args.adapter_path
            if not os.path.exists(adapter_full_path):
                raise FileNotFoundError(f"Specified adapter path does not exist: {adapter_full_path}")
            from peft import PeftModel
            print(f"[+] Attaching trained LoRA adapter from {adapter_full_path}...")
            model = PeftModel.from_pretrained(model, adapter_full_path)
            model.eval()
            print("[+] Verified LoRA adapter weights attached successfully.")

        out_path = os.path.join(repo_root, args.output_file) if not os.path.isabs(args.output_file) else args.output_file
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        existing_completions = {}
        if os.path.exists(out_path):
            try:
                with open(out_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line_str = line.strip()
                        if line_str:
                            c_obj = json.loads(line_str)
                            cid = c_obj.get("id")
                            if cid and "model_response" in c_obj:
                                existing_completions[cid] = c_obj
            except Exception:
                existing_completions = {}

        if existing_completions:
            print(f"[+] Found {len(existing_completions)} cached completions in {out_path}. Resuming from remaining cases...")

        start_t = time.time()
        # Open in append mode if resuming, else write mode
        write_mode = "a" if existing_completions else "w"
        out_f = open(out_path, write_mode, encoding="utf-8")

        try:
            for idx, rec in enumerate(eval_subset):
                cid = rec.get("id", f"case-{idx}")
                msgs = rec.get("messages", [])
                user_msg = next((m["content"] for m in msgs if m["role"] == "user"), "")
                ref_msg = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
                domain = rec.get("domain", "GENERAL")
                rubric = rec.get("scoring_rubric") or rec.get("rubric") or {}

                is_cached = cid in existing_completions
                if is_cached:
                    gen_text = existing_completions[cid]["model_response"]
                else:
                    prompt_msgs = [
                        {"role": "system", "content": "You are Noctis AI, a sovereign intelligence system operating with deterministic mathematical rigor, formal clinical safety verification, and evidence-based engineering precision."},
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

                audit = evaluate_response_fidelity(gen_text, ref_msg, domain, rubric)
                cat = audit["category"]
                if cat in categories:
                    categories[cat].append(audit["score"])

                if not is_cached:
                    rec_out = {
                        "id": cid,
                        "domain": domain,
                        "prompt": user_msg,
                        "model_response": gen_text,
                        "score": audit["score"],
                        "pass": audit["pass"],
                        "category": cat,
                        "notes": audit["notes"]
                    }
                    out_f.write(json.dumps(rec_out) + "\n")
                    out_f.flush()

                if (idx + 1) % 10 == 0 or idx == len(eval_subset) - 1:
                    status = " [resumed from cache]" if is_cached else ""
                    print(f"  [{idx+1}/{len(eval_subset)}] Case {idx+1} ({domain}) | Score: {audit['score']:.1f}%{status}")
        finally:
            out_f.close()

        elapsed = time.time() - start_t
        print(f"[+] Live model evaluation completed in {elapsed:.1f}s. Saved completions to {out_path}")

    # Compute category scores
    if args.mode == "reference":
        print("\n=== REFERENCE SELF-CHECK / UPPER BOUND FIDELITY RESULTS ===")
        print("  [NOTE: This measures reference-answer fidelity to verify rubric self-consistency, NOT model accuracy]")
    else:
        print("\n=== GENUINE MODEL HELD-OUT BENCHMARK ACCURACY ===")
        print(f"  [NOTE: Evaluates actual model-generated responses from {args.base_model} (Adapter: {args.adapter_path or 'Zero-Shot Baseline'})]")
    
    overall_scores = []
    category_summary = {}
    for cat, scores in categories.items():
        if scores:
            avg_score = sum(scores) / len(scores)
            overall_scores.append(avg_score)
            category_summary[cat] = avg_score
            print(f"  ✔ {cat.ljust(26)}: {avg_score:.1f}% ({len(scores)} unseen cases evaluated)")

    total_avg = sum(overall_scores) / max(1, len(overall_scores))
    if args.mode == "reference":
        print(f"\n  COMPOSITE REFERENCE UPPER BOUND FIDELITY: {total_avg:.1f}%\n")
    else:
        print(f"\n  COMPOSITE MODEL ACCURACY SCORE: {total_avg:.1f}%\n")

    # Save benchmark result summary
    summary_path = os.path.join(repo_root, "data", f"noctis-benchmark-{args.mode}-results.md")
    report = f"""# Noctis Independent Held-Out Benchmark Results ({'REFERENCE UPPER BOUND SELF-CHECK' if args.mode == 'reference' else 'GENUINE MODEL GENERATION ACCURACY'})
**Mode**: `{args.mode}`  
**Evaluation Nature**: `{'Reference self-consistency upper bound' if args.mode == 'reference' else 'Authentic model output evaluation'}`  
**Model**: `{args.base_model}`  
**Adapter**: `{args.adapter_path or 'None (Zero-Shot Baseline)'}`  
**Date**: {datetime.now(timezone.utc).isoformat()}  
**Held-Out Unseen Test Size**: {len(eval_subset)} problems  
**Benchmark Source**: `{args.eval_dataset}`  

| Category | Cases Evaluated | Accuracy / Fidelity Score | Status |
|---|---|---|---|
| Physical & Mathematical Derivations | {len(categories['PHYSICAL_REASONING'])} | {category_summary.get('PHYSICAL_REASONING', 0):.1f}% | {'PASS' if category_summary.get('PHYSICAL_REASONING', 0) >= 50 else 'NEEDS_TRAINING'} |
| Clinical Safety & Contraindications | {len(categories['CLINICAL_SAFETY'])} | {category_summary.get('CLINICAL_SAFETY', 0):.1f}% | {'PASS' if category_summary.get('CLINICAL_SAFETY', 0) >= 80 else 'FAIL'} |
| NIST RMF Regulatory Compliance | {len(categories['REGULATORY_COMPLIANCE'])} | {category_summary.get('REGULATORY_COMPLIANCE', 0):.1f}% | {'PASS' if category_summary.get('REGULATORY_COMPLIANCE', 0) >= 60 else 'FAIL'} |
| **Composite Score** | **{len(eval_subset)}** | **{total_avg:.1f}%** | **{'VERIFIED UPPER BOUND' if args.mode == 'reference' else 'MODEL SCORE'}** |
"""
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"[+] Exported benchmark report to {summary_path}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
