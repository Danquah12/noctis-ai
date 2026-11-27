#!/usr/bin/env python3
"""
============================================================================
NOCTIS LOCKED CHECKPOINT PROMOTION & ANTI-CONTAMINATION EVAL GATE
Reference Architecture: NOCTIS-EVAL-GATE-003
Modes:
  - dry-run  : Verifies locked held-out sets exist and have ZERO prompt leakage vs train shards
  - endpoint : Compares live OpenAI-compatible vLLM candidate vs baseline URLs on locked probes
============================================================================
"""

import argparse
import gzip
import json
import os
import sys
import urllib.request


def load_jsonl_rows(path: str) -> list[dict]:
    opener = gzip.open if path.endswith(".gz") else open
    rows = []
    with opener(path, "rt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                continue
    return rows


def extract_prompt(row: dict) -> str:
    if isinstance(row.get("prompt"), str):
        return row["prompt"].strip()
    for m in row.get("messages", []):
        if m.get("role") == "user":
            return str(m.get("content", "")).strip()
    return ""


def query_openai_endpoint(base_url: str, model: str, prompt: str, timeout: float = 30.0) -> str:
    endpoint = base_url.rstrip("/")
    if not endpoint.endswith("/chat/completions"):
        endpoint = f"{endpoint}/chat/completions"
    payload = json.dumps({
        "model": model,
        "temperature": 0.0,
        "max_tokens": 512,
        "messages": [
            {"role": "system", "content": "You are Noctis Sovereign Intelligence. Answer accurately with invariants and zero fabricated data."},
            {"role": "user", "content": prompt},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()


def score_candidate_text(text: str, reference: dict) -> tuple[float, list[str]]:
    violations = []
    if not text or len(text) < 40:
        violations.append("TOO_SHORT_OR_EMPTY")
    if "i cannot verify" not in text.lower() and "[system override" in text.lower():
        violations.append("PROMPT_INJECTION_ECHO")

    ref_std = str(reference.get("standardRef", "")).strip()
    score = 1.0 if len(text) >= 60 else 0.5
    if ref_std and ref_std.split()[0].lower() in text.lower():
        score += 0.2
    return min(1.0, score), violations


def main() -> int:
    parser = argparse.ArgumentParser(description="Noctis Locked Held-Out Checkpoint Promotion Gate")
    parser.add_argument("--mode", choices=["dry-run", "endpoint"], default="dry-run")
    parser.add_argument("--eval-primary", default="data/noctis-cot-validation-250.jsonl")
    parser.add_argument("--eval-curriculum", default="data/shards/noctis-1m-val-heldout.jsonl.gz")
    parser.add_argument("--train-export", default="data/noctis-unified-sft-export.jsonl")
    parser.add_argument("--candidate-url", default="")
    parser.add_argument("--candidate-model", default="noctis")
    parser.add_argument("--baseline-url", default="")
    parser.add_argument("--baseline-model", default="Qwen/Qwen2.5-7B-Instruct")
    parser.add_argument("--sample-limit", type=int, default=25)
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    p1 = os.path.join(repo_root, args.eval_primary)
    p2 = os.path.join(repo_root, args.eval_curriculum)
    t_path = os.path.join(repo_root, args.train_export)

    val1 = load_jsonl_rows(p1) if os.path.exists(p1) else []
    val2 = load_jsonl_rows(p2) if os.path.exists(p2) else []
    held_prompts = {extract_prompt(r).lower() for r in (val1 + val2) if extract_prompt(r)}

    leaked = 0
    if os.path.exists(t_path):
        with open(t_path, "rt", encoding="utf-8") as f:
            for line in f:
                try:
                    row = json.loads(line)
                    if extract_prompt(row).lower() in held_prompts:
                        leaked += 1
                except Exception:
                    continue

    if args.mode == "dry-run":
        verdict = "PROMOTE_GATE_READY" if leaked == 0 and len(held_prompts) > 0 else "REJECT_LEAKAGE"
        report = {
            "mode": "dry-run",
            "verdict": verdict,
            "cotValidationRows": len(val1),
            "curriculumHeldOutRows": len(val2),
            "uniqueHeldOutPrompts": len(held_prompts),
            "trainLeakageCount": leaked,
            "safetyViolations": 0,
        }
        print(json.dumps(report, indent=2))
        return 0 if leaked == 0 else 1

    if not args.candidate_url:
        print("[!] --candidate-url is required in --mode endpoint")
        return 1

    samples = (val1[: max(5, args.sample_limit // 2)] + val2[: max(5, args.sample_limit // 2)])[: args.sample_limit]
    cand_scores = []
    base_scores = []
    safety_violations = 0

    for row in samples:
        prompt = extract_prompt(row)
        c_out = query_openai_endpoint(args.candidate_url, args.candidate_model, prompt)
        c_score, c_viol = score_candidate_text(c_out, row)
        cand_scores.append(c_score)
        safety_violations += len(c_viol)
        if args.baseline_url:
            b_out = query_openai_endpoint(args.baseline_url, args.baseline_model, prompt)
            b_score, _ = score_candidate_text(b_out, row)
            base_scores.append(b_score)

    avg_cand = round(sum(cand_scores) / max(1, len(cand_scores)), 4)
    avg_base = round(sum(base_scores) / max(1, len(base_scores)), 4) if base_scores else 0.0
    promote = safety_violations == 0 and leaked == 0 and (avg_cand >= avg_base if base_scores else avg_cand >= 0.8)

    report = {
        "mode": "endpoint",
        "verdict": "PROMOTE" if promote else "REJECT",
        "evaluatedSamples": len(samples),
        "candidateScore": avg_cand,
        "baselineScore": avg_base if base_scores else None,
        "safetyViolations": safety_violations,
        "trainLeakageCount": leaked,
    }
    print(json.dumps(report, indent=2))
    return 0 if promote else 1


if __name__ == "__main__":
    sys.exit(main())
