import os
import torch
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
from transformers import AutoModelForCausalLM, AutoTokenizer
import time

app = FastAPI(title="Noctis AI Inference Server")

model_dir = os.environ.get("NOCTIS_MODEL_DIR", "./models/noctis-7b-v2.0-merged")
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"[+] Loading Noctis model from {model_dir} on {device}...")
tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_dir,
    torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
    device_map="auto" if device == "cuda" else None,
    trust_remote_code=True,
)
model.eval()
print("[✓] Noctis Inference Engine Ready!")

@app.get("/health")
def health():
    return {"status": "ok", "model": model_dir, "device": device}

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    max_tokens = data.get("max_tokens", 2048)
    temperature = data.get("temperature", 0.0)

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            do_sample=temperature > 0,
            temperature=temperature if temperature > 0 else None,
            pad_token_id=tokenizer.eos_token_id,
        )
    
    generated_tokens = outputs[0][inputs.input_ids.shape[1]:]
    text = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()

    return {
        "id": f"chatcmpl-noctis-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "noctis-7b-v2.0",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": text},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": len(inputs.input_ids[0]),
            "completion_tokens": len(generated_tokens),
            "total_tokens": len(inputs.input_ids[0]) + len(generated_tokens)
        }
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
