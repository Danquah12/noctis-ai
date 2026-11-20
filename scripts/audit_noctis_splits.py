#!/usr/bin/env python3
"""
CPU-only preflight: validate ChatML shape, deduplication, and detect prompt/template/case leakage across splits.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

def normalize_exact(text):
    """Collapses whitespace and lowercases text for exact deduplication."""
    return re.sub(r"\s+", " ", text.lower()).strip()

def normalize_template(text):
    """Replaces numeric literals with <NUM> to detect parameterized template leakage."""
    text = re.sub(r"\b[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?\b", "<NUM>", text.lower())
    return re.sub(r"\s+", " ", text).strip()

def load(path):
    rows = [json.loads(s) for s in Path(path).read_text(encoding="utf-8").splitlines() if s.strip()]
    if not rows:
        raise ValueError(f"Empty dataset: {path}")
    prompts, cases, templates = set(), set(), set()
    for n, row in enumerate(rows, 1):
        msgs = row.get("messages")
        if not isinstance(msgs, list):
            raise ValueError(f"{path}:{n}: missing messages list")
        user = next((m.get("content", "") for m in msgs if m.get("role") == "user"), "")
        answer = next((m.get("content", "") for m in msgs if m.get("role") == "assistant"), "")
        if not user.strip() or not answer.strip():
            raise ValueError(f"{path}:{n}: empty user or assistant content")
        
        # Verify prompt uniqueness within split
        exact_prompt = normalize_exact(user)
        if exact_prompt in prompts:
            raise ValueError(f"{path}:{n}: duplicate prompt within split")
        prompts.add(exact_prompt)
        
        # Track masked template for cross-split leakage check
        templates.add(normalize_template(user))
        
        # Extract clinical case identifiers (e.g. NH-EM-012, NH-CARD-004)
        cases.update(re.findall(r"\bNH-[A-Z]+-\d+\b", user.upper()))
    return rows, prompts, cases, templates

def audit(train_path, eval_path):
    tr, tp, tc, tt = load(train_path)
    ev, ep, ec, et = load(eval_path)
    issues = []
    if tp & ep:
        issues.append(f"{len(tp & ep)} duplicate prompts across splits")
    if tc & ec:
        issues.append(f"{len(tc & ec)} shared clinical case IDs across splits")
    if tt & et:
        issues.append(f"{len(tt & et)} shared normalized templates across splits")
    
    result = {
        "train_count": len(tr),
        "eval_count": len(ev),
        "train_unique_prompts": len(tp),
        "eval_unique_prompts": len(ep),
        "shared_exact_prompts": len(tp & ep),
        "shared_case_ids": sorted(tc & ec)[:20],
        "shared_templates": len(tt & et),
        "issues": issues
    }
    print(json.dumps(result, indent=2))
    if issues:
        raise SystemExit("FAILED: split leakage detected; rebuild grouped evaluation split")
    print("PASS: 100% split integrity and isolation verified (zero shared prompts, zero shared case IDs, zero shared templates).")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--train", default="data/noctis-cot-training-3500.jsonl")
    p.add_argument("--eval", default="data/noctis-cot-validation-250.jsonl")
    a = p.parse_args()
    audit(a.train, a.eval)
