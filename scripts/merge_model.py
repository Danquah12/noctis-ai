import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base_model_name = "Qwen/Qwen2.5-7B-Instruct"
adapter_path = "./models/noctis-7b-v2.0-adapter"
output_dir = "./models/noctis-7b-v2.0-merged"

print("==========================================================")
print("[+] Loading base model:", base_model_name)
print("==========================================================")
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True,
)

print(f"[+] Loading LoRA adapter from {adapter_path}...")
model = PeftModel.from_pretrained(base_model, adapter_path)

print("[+] Merging adapter weights into base model (merge_and_unload)...")
merged_model = model.merge_and_unload()

print(f"[+] Saving full standalone model to {output_dir}...")
os.makedirs(output_dir, exist_ok=True)
merged_model.save_pretrained(output_dir)

print(f"[+] Saving tokenizer to {output_dir}...")
tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
tokenizer.save_pretrained(output_dir)

print("==========================================================")
print("[✓] MERGE COMPLETE! Standalone model ready at:", output_dir)
print("==========================================================")
