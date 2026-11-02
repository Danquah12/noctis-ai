"""
Antigravity Board Exam Quiz & Vignette Generator
Uses the local Antigravity Python SDK session to generate high-yield clinical,
legal, and technical examination vignettes for the Noctis Board Exam Directory.

Usage:
    python antigravity_board_quiz_generator.py --exam "California Bar Exam" --topic "Civil Procedure - Personal Jurisdiction"
    python antigravity_board_quiz_generator.py --exam "USMLE Step 1" --topic "Cardiovascular Pathology"
    python antigravity_board_quiz_generator.py --exam "CISSP" --topic "Security & Risk Management"
    python antigravity_board_quiz_generator.py --interactive
"""
import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig

SYSTEM_PROMPT = """
You are an elite psychometrician and board examination authority covering Healthcare, Law, Cloud, and Cybersecurity.
When given an exam name and topic, generate a high-yield exam vignette and question.
Format your output strictly as a valid JSON object matching this schema:
{
  "exam": string,
  "domain": string,
  "vignette": string (realistic, detailed case vignette or architecture scenario),
  "question": string (concise question stem),
  "options": {
    "A": string,
    "B": string,
    "C": string,
    "D": string
  },
  "correct_answer": "A" | "B" | "C" | "D",
  "high_yield_pearl": string (critical mnemonic or underlying core concept),
  "tactics_and_technique": string (step-by-step reasoning strategy to solve this type of problem under exam conditions)
}
Return ONLY the raw JSON object with NO surrounding markdown backticks or commentary.
"""

async def generate_vignette(exam_name: str, topic: str, save_output: bool = True, quiet: bool = False):
    config = LocalAgentConfig(
        system_instructions=SYSTEM_PROMPT
    )
    if not quiet:
        print(f"\n[Antigravity SDK] Connecting to local runtime session...")
        print(f"[Target Exam] {exam_name}")
        print(f"[Domain / Topic] {topic}\n")

    async with Agent(config) as agent:
        prompt = (
            f"Generate a rigorous board exam question for {exam_name} "
            f"focusing on the topic '{topic}'."
        )
        response = await agent.chat(prompt)
        raw_text = ""
        async for token in response:
            raw_text += token
            if not quiet:
                sys.stdout.write(token)
                sys.stdout.flush()

    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
        if save_output:
            out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "generated-quizzes")
            os.makedirs(out_dir, exist_ok=True)
            safe_exam = "".join(c if c.isalnum() else "_" for c in exam_name).lower()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = os.path.join(out_dir, f"{safe_exam}_{timestamp}.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            if not quiet:
                print(f"\n\n[Success] Saved to {filepath}")
        if quiet:
            print(json.dumps(data))
        return data
    except json.JSONDecodeError:
        if not quiet:
            print("\n\n[Notice] Response was received but could not be parsed as strict JSON.")
        return raw_text

async def main():
    parser = argparse.ArgumentParser(description="Antigravity Board Exam Question Generator")
    parser.add_argument("--exam", type=str, default="USMLE Step 1", help="Target Board Exam Name")
    parser.add_argument("--topic", type=str, default="Renal Physiology & Tubular Transport", help="Domain or Topic")
    parser.add_argument("--save", action="store_true", default=True, help="Save JSON to disk")
    parser.add_argument("--quiet", action="store_true", default=False, help="Output JSON only to stdout")
    args = parser.parse_args()

    await generate_vignette(args.exam, args.topic, save_output=args.save, quiet=args.quiet)

if __name__ == "__main__":
    asyncio.run(main())
