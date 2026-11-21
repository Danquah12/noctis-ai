import os
import time
import json
from threading import Thread
import torch
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

app = FastAPI(title="Noctis AI Inference Server — Real-Time Streaming")

# Enable CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_dir = os.environ.get("NOCTIS_MODEL_DIR", "./models/noctis-7b-v2.0-merged")
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"[+] Loading Noctis model from {model_dir} on {device}...")
tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_dir,
    torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
    device_map="auto" if device == "cuda" else None,
    trust_remote_code=True,
)

dpo_adapter_path = os.environ.get("NOCTIS_DPO_ADAPTER", "./models/noctis-7b-v3.0-dpo")
active_version = "v2.0-merged"
if os.path.exists(os.path.join(dpo_adapter_path, "adapter_config.json")):
    try:
        from peft import PeftModel
        print(f"[+] Applying Phase 3 DPO Clinical Safety Adapter from {dpo_adapter_path}...")
        model = PeftModel.from_pretrained(model, dpo_adapter_path)
        model = model.merge_and_unload()
        active_version = "v3.0-dpo-aligned"
        print("[✓] Phase 3 DPO Adapter successfully merged into active inference model!")
    except Exception as e:
        print(f"[!] Warning: Failed to apply DPO adapter: {e}. Falling back to v2.0-merged.")

model.eval()
print(f"[✓] Noctis Inference Engine ({active_version}) Ready with Real-Time SSE Token Streaming!")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": model_dir,
        "version": active_version,
        "device": device,
        "streaming_supported": True,
        "api_spec": "OpenAI-compatible v1",
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    max_tokens = data.get("max_tokens", 2048)
    temperature = data.get("temperature", 0.0)
    stream = data.get("stream", False)

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    # 1. Real-Time Token Streaming Mode (ChatGPT-style SSE)
    if stream:
        streamer = TextIteratorStreamer(
            tokenizer,
            skip_prompt=True,
            skip_special_tokens=True
        )
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=max_tokens,
            do_sample=temperature > 0,
            temperature=temperature if temperature > 0 else None,
            pad_token_id=tokenizer.eos_token_id,
        )
        thread = Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()

        def sse_event_stream():
            created = int(time.time())
            chat_id = f"chatcmpl-noctis-{created}"
            for new_text in streamer:
                chunk = {
                    "id": chat_id,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": "noctis-7b-v2.0",
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": new_text},
                            "finish_reason": None,
                        }
                    ],
                }
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # Final completion chunk
            stop_chunk = {
                "id": chat_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": "noctis-7b-v2.0",
                "choices": [
                    {
                        "index": 0,
                        "delta": {},
                        "finish_reason": "stop",
                    }
                ],
            }
            yield f"data: {json.dumps(stop_chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(sse_event_stream(), media_type="text/event-stream")

    # 2. Standard Synchronous Batch Mode
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
