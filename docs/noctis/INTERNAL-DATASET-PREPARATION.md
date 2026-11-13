# Noctis internal dataset preparation foundation — 2026-11-13

## Objective

Advance the existing Noctis general-purpose assistant toward genuine model training with an **offline, internal-only preparation stage**. **Nobody submits training materials to Noctis.** This is not a customer upload system. It does not download public datasets, use user conversations, call model providers, perform live evaluations, train model weights, create checkpoints, or alter production systems.

**The GitHub repository is public. Never commit private customer records, case documents, user conversations, proprietary corpora, API keys or exported training data to it.** Developer-curated source manifests must be checked for usage permissions and privacy before processing.

This draft branch builds on the existing unmerged PRs #1–#6. M3 cloud MicroVM implementation and simulated-control-plane tests remain untouched.

## Input contract and protection

Source records must include an ID, kind (project_authored or public_open), license ID, training_allowed=true, approved=true, usage_rights=model_training, and a reviewed_by identifier. Public sources also require an HTTPS source URL. Project-authored content uses the NOCTIS-ORIGINAL label; public license IDs currently allowed are CC0-1.0, CC-BY-4.0, MIT, Apache-2.0. This list is deliberately narrow. A declared permission or license in a JSON manifest is an **attestation**, not independent legal verification.

Each example includes id, source_id, prompt, completion, and validation metadata. Validation must identify independent_review or deterministic_test, passed=true, verified_by and a review/test reference. Self-scored or model-self-asserted examples are rejected. Sources or examples explicitly marked as private records, customer records or user conversations are rejected. A conservative heuristic detects email addresses, phone numbers, common secret markers, and private-key blocks. **These checks are not a full privacy, DLP or copyright audit. Never feed sensitive records into the tool.**

Synthetic example input file for internal testing:

~~~json
{
  "sources": [{
    "id": "noctis-original-v1",
    "kind": "project_authored",
    "license_id": "NOCTIS-ORIGINAL",
    "usage_rights": "model_training",
    "training_allowed": true,
    "approved": true,
    "reviewed_by": "internal-reviewer"
  }],
  "examples": [{
    "id": "original-example-1",
    "source_id": "noctis-original-v1",
    "prompt": "Explain what a deterministic algorithm does.",
    "completion": "It produces the same result for the same inputs under the same defined conditions.",
    "validation": {
      "kind": "independent_review",
      "passed": true,
      "verified_by": "second-reviewer",
      "reference": "internal-reviewed-example-1"
    }
  }]
}
~~~

## How to run

Network-free tests:

    node --test scripts/noctis-internal-dataset.test.mjs scripts/noctis-prepare-internal-dataset.test.mjs

Dry run, using only an already approved internal-only local manifest (no output files, no network):

    node scripts/noctis-prepare-internal-dataset.mjs --input /path/to/approved-manifest.json

Only after separate operator approval to export nonsensitive internal data:

    NOCTIS_DATASET_EXPORT_AUTHORIZED=YES node scripts/noctis-prepare-internal-dataset.mjs --input /path/to/approved-manifest.json --write

The CLI always excludes exact normalized matches with the user questions in the existing V1 general-assistant held-out evaluation suite. Default output contains only counts, rejection *codes*, and input SHA-256—not the text or rejected identifiers. A permitted write produces train/development/heldout JSONL and a metadata manifest in a fresh OS temporary directory. On POSIX, the directory is private (0700) and export files are 0600. It does not write to the Git checkout.

## Data-integrity guarantees and non-guarantees

Accepted prompts are grouped by normalized exact text, with duplicate and conflicting repetitions rejected. Prompt-derived SHA-256 stably partitions examples 80% training, 10% development, 10% internal heldout; tiny batches may have empty partitions. Every export carries a source identifier, source kind, declared license, source URI when available, content fingerprint, and validation reference. CC-BY material is marked as requiring attribution.

**Limits:** There is no network acquisition, independent license verification, full personal-data detection, near-duplicate similarity filtering, semantic held-out contamination analysis, representation-balanced partitioning or model training in this milestone. Hashes verify content identity, not source rights. Training/test leakage from paraphrases or a pretrained model's prior knowledge remains possible. Additional inspection and governed data-source controls are required before using real, non-synthetic corpora.

Passing these preparation tests is **not proof of higher intelligence**. The next milestones are a vetted internal dataset acquisition adapter; stronger safety and similarity checks; authorized live model evaluation using the existing baseline; selection of an appropriately licensed trainable base model; and a reproducible SFT/adapter trainer with actual checkpoints and comparisons on unseen tasks. Paid work, provider transmission of private data, production changes and merges require separate authorization.

Run all project verification on the exact final development commit, including typecheck, tests and migration-free development build. Never use the production migration-bearing build for verification.
