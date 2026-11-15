# Noctis reviewed-public-source bridge — 2026-11-15

## What this milestone does

This is a **development-only, offline connection** between PR #8's pinned public-source acquisition and PR #7's internal dataset preparation. It makes the lineage of every candidate answer explicit: a reviewed public source, its exact acquired SHA-256, a byte-range evidence excerpt, and a separately reviewed training example. It neither trains a model nor establishes that a candidate answer is correct.

**No users or customers submit materials to Noctis.** Operators maintain an internal controlled source catalog and candidate review record. The new CLI does not fetch data, extract answers automatically, read customer chats, call an LLM or send data to third-party providers.

## Input and review chain

This tool consumes three local inputs:

1. The same separately approved public-source catalog used for PR #8's acquisition CLI. Its immutable URL, exact content SHA-256, declared permissible model-training use, source approver and separate usage-rights reviewer must still pass PR #8's rules.
2. The **private directory** produced by that acquisition CLI, containing an acquisition manifest and raw text files. The bridge re-hashes every exact raw file and requires the manifest to match the original approved catalog, including its unreviewed acquisition status.
3. A **separately authored and independently reviewed** candidate file. Each example must carry the source ID, exact full-source SHA-256, exact byte-start/byte-end of a reviewed supporting excerpt, SHA-256 of that excerpt, prompt, completion, and a passed independent-review record. The independent example reviewer must not be the source approver or the license reviewer.

Example candidate file shape (illustrative; no genuine source or verified answer supplied here):

~~~json
{
  "candidates": [{
    "id": "example-001",
    "source_id": "reviewed-public-source-001",
    "source_sha256": "<64-hex-sha256-of-approved-acquired-file>",
    "evidence": {
      "byte_start": 0,
      "byte_end": 200,
      "sha256": "<64-hex-sha256-of-exact-raw-byte-range>"
    },
    "prompt": "Explain a specific documented mechanism.",
    "completion": "An independently reviewed factual explanation.",
    "validation": {
      "kind": "independent_review",
      "passed": true,
      "verified_by": "distinct-content-reviewer",
      "reference": "internal-review-record-001",
      "reviewed_on": "2026-11-15"
    }
  }]
}
~~~

The review record is a **structured attestation**. The software checks the byte span's identity but **cannot prove the excerpt entails the response**. A reviewer must actually check that link and consider omissions, provenance, privacy and licensing, including embedded third-party material. A permissive file license is not independent evidence that all its contents are available for model training.

Every example passes through the existing internal preparation checks, including the reserved V1 baseline prompts, privacy/secret heuristics, exact-prompt duplication checks, and stable train/development/heldout split assignment. If any candidate fails, the **entire output batch is blocked** rather than exporting a partial set. Prepared records gain source-digest, excerpt-digest, byte-offset, and example-review-date metadata.

## How to use safely

First, independently review and acquire specific approved public sources with the PR #8 command, saving the resulting *private directory*. Then create a separately reviewed candidate manifest in a private location.

Default **no-network, no-write** preflight:

    node scripts/noctis-review-acquired-public-sources.mjs \
      --catalog /private/reviewed-source-catalog.json \
      --acquired /private/noctis-private-public-corpus-DIR \
      --candidates /private/independently-reviewed-examples.json

Only when approved for local export of nonsensitive and licensed content:

    NOCTIS_DATASET_EXPORT_AUTHORIZED=YES \
      node scripts/noctis-review-acquired-public-sources.mjs \
      --catalog /private/reviewed-source-catalog.json \
      --acquired /private/noctis-private-public-corpus-DIR \
      --candidates /private/independently-reviewed-examples.json \
      --write

The optional output is a **new private OS temporary directory** containing train, development and heldout JSONL files plus a manifest with input and output SHA-256 digests. The CLI does not write into the public Git checkout and prints only metadata/counts, not source text or prompts. Securely delete private temporary copies after permitted use.

Network-free tests (synthetic fixtures only):

    node --test scripts/noctis-reviewed-public-bundle.test.mjs

Then verify the *exact PR-head commit* using the repository's existing CI. The public source catalog and example review have **not** been populated with a real licensed dataset in this milestone.

## Boundaries and next work

- The bridge verifies file identity and review attestations; it does not independently establish licenses, detect all personal/private material, prove the answer's correctness, or validate a cited passage's logical support.
- Exact prompt checking does not prevent paraphrase/semantic leakage, overlapping source passages or contamination from external pretrained sources. The split is not yet source-group-aware.
- **No GPU, weights, adapters, training runs, checkpoints, model scores, new cloud resources or paid provider requests** are produced by this work.
- The main branch continues to evolve separately. Its purported continuous-training counters, its ChatML exports and its current QLoRA script must not be confused with actual model-weight training. Do not rebase the unmerged PR chain onto main without inspecting divergence and conflicts.
- The pre-existing M3 MicroVM provider and simulator tests remain unchanged. Simulator success does not verify live cloud isolation.

Next: add source-group-aware and near-duplicate leakage checks to the offline dataset preparer; independently audit a real rights-cleared source; then perform an authorized live-model baseline and specify a reproducible model-training backend after selecting and validating a trainable foundation model.
