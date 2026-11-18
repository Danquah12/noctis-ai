#!/usr/bin/env python3
"""CPU-only preflight: validate ChatML shape and detect prompt/template/case leakage."""
import argparse
import hashlib
import json
import re
from pathlib import Path

def normalized(text):
    text = re.sub(r"\\b[-+]?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?\\b", "<NUM>", text.lower())
    return re.sub(r"\\s+", " ", text).strip()

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
        prompt = normalized(user)
        if prompt in prompts:
            raise ValueError(f"{path}:{n}: duplicate normalized prompt")
        prompts.add(prompt)
        templates.add(normalized(user))
        # Clinical case identifiers are shared by diagnosis and safety variants.
        cases.update(re.findall(r"\\bNH-[A-Z]+-\\d+\\b", user.upper()))
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
    print(json.dumps({"train_count": len(tr), "eval_count": len(ev),
                      "shared_case_ids": sorted(tc & ec)[:20],
                      "shared_templates": len(tt & et),
                      "issues": issues}, indent=2))
    if issues:
        raise SystemExit("FAILED: split leakage detected; rebuild grouped evaluation split")
    print("PASS: basic split integrity checks (not proof of full semantic independence)")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--train", default="data/noctis-cot-training-3500.jsonl")
    p.add_argument("--eval", default="data/noctis-cot-validation-250.jsonl")
    a = p.parse_args()
    audit(a.train, a.eval)
