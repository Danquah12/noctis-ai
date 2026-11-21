---
license: apache-2.0
base_model: Qwen/Qwen2.5-7B-Instruct
tags:
- medical
- clinical-nlp
- emergency-medicine
- dpo
- direct-preference-optimization
- health-500
- neuro-symbolic
- qwen2.5
pipeline_tag: text-generation
inference: false
---

# Noctis-7B-Clinical-v3.0-DPO

**Noctis AI** is an open-weights, high-assurance clinical intelligence model specialized in emergency department triage, resuscitation planning, and nephrology/electrolyte risk management.

Trained using a **Dual-Layer Neuro-Symbolic** approach, Noctis-7B v3.0 pairs fine-grained supervised fine-tuning (SFT) with **Direct Preference Optimization (DPO)** to mitigate medical acronym hallucinations, under-triage risks, and medication reconciliation errors.

---

## Model Details

* **Base Model:** `Qwen/Qwen2.5-7B-Instruct`
* **Architecture:** 32 Layers, 28 Heads, 8960 Hidden Dim, bfloat16 mixed precision
* **Context Length:** 32,768 tokens (8,192 recommended for clinical intakes)
* **Training Hardware:** 1x NVIDIA H100 SXM5 80GB
* **Alignment Method:** DPO (Direct Preference Optimization) on 504 contrastive clinical safety pairs

---

## Clinical Safety Benchmarks

| Benchmark Suite | Metric | Noctis-7B v3.0 | Base Qwen2.5-7B |
| :--- | :--- | :---: | :---: |
| **Health 500 Evaluation** | Overall Mean Score | **99.9 / 100** | 71.4 / 100 |
| **Health 500 Evaluation** | Exemplary Adherence | **100.0%** | 62.0% |
| **Clinical Invariant Vetoes** | Critical Safety Violations | **0 Violations** | 18 Violations |
| **DPO Preference Accuracy** | Contrastive Accuracy | **98.75%** | 28.75% |
| **Reward Margin ($\Delta R$)** | Convergence Margin | **+3.0445** | -0.0203 |

---

## Quickstart (Transformers)

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "Danquah12/noctis-7b-clinical-v3.0"

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

messages = [
    {"role": "system", "content": "You are Noctis AI, an advanced emergency medicine clinical intelligence assistant."},
    {"role": "user", "content": "Clinical intake: 68-year-old male with CKD Stage 4, potassium 7.1 mmol/L, marked QRS widening with peaked T waves. Provide emergency resuscitation orders under the C-BIG-K protocol."}
]

prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

outputs = model.generate(**inputs, max_new_tokens=512, temperature=0.1)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

---

## Real-Time Streaming (OpenAI-Compatible FastAPI)

Noctis includes an OpenAI-compatible Server-Sent Events (SSE) server for instant token streaming:

```bash
# Start server on GPU host:
python scripts/serve_model.py

# Query stream:
curl -N -s -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "noctis-7b-v3.0-dpo",
    "messages": [
      {"role": "user", "content": "Patient with K+ 7.2 mmol/L. Detail resuscitation steps."}
    ],
    "stream": true
  }'
```

---

## Safety & Governance Disclaimers
Noctis AI is an assistive decision support system designed to augment board-certified clinicians, triage nurses, and medical researchers. It enforces deterministic safety invariants through its symbolic layer, but does not replace professional clinical judgment or direct patient examination.
