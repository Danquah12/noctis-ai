# Noctis offline SFT compatibility preflight — 2026-11-18

## Purpose and lineage

This development-only bridge prepares *already reviewed and privately exported* Noctis train/development splits as ChatML records consumable by future genuine supervised fine-tuning. No end-user training submissions or reviewer portal. It is stacked on draft PR #11, preserving PRs #1–#11 and their M3 cloud MicroVM adapter and simulated control-plane tests.

The independent draft PR #12 on main, feature/noctis-genuine-sft-pilot, introduces a proposed QLoRA/Unsloth trainer and synthetic files. The two lines are **not integrated or merged**. Its training and scoring logic, source rights, dependencies, model revision, benchmark independence and GPU compatibility need independent assessment before any job is run. A code path capable of gradient updates is not evidence that training has executed, checkpoints exist or performance improved.

## Contract and isolation

Input must be the private directory produced with explicit authorization by scripts/noctis-prepare-internal-dataset.mjs --write, with three nonempty partitions and its export manifest. No public/customer submission route is created. Every row must retain approved-source provenance, a declared training-compatible license, a validation reference, an unchanged SHA-256 prompt/completion fingerprint and source-group fingerprint. The bridge fails closed on duplicate record IDs, cross-partition source groups, detectable lexical contamination and substantial repeated completions. It does not certify authorizations, reviewer independence, copyright, factual correctness, privacy or semantic isolation.

Only train.jsonl and development.jsonl are returned or exported as ChatML messages. Heldout rows participate in integrity checks but **no heldout messages are returned, exported, used for training or used for tuning choices**. The report contains only counts and fingerprints for the sealed heldout. Keep an independently frozen external benchmark outside the tuning process.

A known interface limitation: upstream dataset preparation currently trims saved prompt/completion text but computes the example digest from the original untrimmed input. Such rows fail this stricter bridge fingerprint check. Reconcile canonical hashing in the upstream preparer and regenerate those exports instead of bypassing or weakening the preflight.

## Offline invocation

No-network functional tests:

    node --test scripts/noctis-sft-preflight.test.mjs scripts/noctis-prepare-sft.test.mjs

Dry run, no model calls and no output files:

    node scripts/noctis-prepare-sft.mjs --input-dir /private/path/to/reviewed-export

With *separate* authorization for local nonsensitive export only:

    NOCTIS_SFT_EXPORT_AUTHORIZED=YES node scripts/noctis-prepare-sft.mjs --input-dir /private/path/to/reviewed-export --write

Inputs must be private regular files with restrictive permissions (0600) under a private directory (0700). Write mode creates a fresh private OS temporary directory, with only train.jsonl, development.jsonl and manifest.json. These are *model-ready records*, not a completed training job. Never commit or send real licensed corpora, user conversations, case files, patient data or local exports to this public GitHub repository. The original dataset manifest stores a source attestation, **not an independently authenticated license approval**. Regeneration and source permission verification are needed before real training.

## Required next tasks

1. Audit PR #12's independent pilot, repair its provenance and split contract, and compare candidate base models under their actual license and operational constraints; do not silently select its default model.
2. Independently verify permissions/quality for real approved source groups and populate train/development/heldout; all must be nonempty. Fix upstream canonical example fingerprint drift.
3. Run the existing live-model evaluation only after specific authorization for provider calls or costs. Use frozen, independently graded criteria across general assistant and specialist capabilities, including abstentions, factuality and tool execution evidence.
4. After explicit authorization of a paid or GPU job, implement reproducible SFT: pin model revision/tokenizer and Python libraries, record training config/seed, job status, dataset provenance, checkpoint/adapters and hashes, and resume/recovery.
5. Compare genuine candidate model completions with the same untouched baseline. No parity claim with ChatGPT, Gemini or Grok without comparable evidence.

This milestone adds **only an offline schema/compatibility boundary and controlled local export**. It neither executes the QLoRA trainer nor proves model improvement, neural updates, live cloud isolation, or production readiness. No merge, deployment or migration authorized.
