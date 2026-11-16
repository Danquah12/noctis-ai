# Noctis source-grouped partitioning and lexical leakage gate — 2026-11-16

## Verified scope of this change

This development-only milestone extends the offline governed dataset preparer from draft PRs #7–#9. It does **not** introduce customer uploads, customer review interfaces, API inference, neural training, GPU jobs, model weights or model scores. All scripts remain offline by default, and the separately authorized private-directory export controls are unchanged.

1. **Source-group-aware partitions.** A prepared example is assigned to train/development/heldout by SHA-256 of its approved source's `dataset_group_id` when provided, else its pinned `expected_sha256` digest when supplied, else its source ID. The same group cannot be split between partitions within a batch. Exact duplicate and conflicting prompts continue to be quarantined.
2. **Held-out lexical screening.** In addition to exact normalized V1 evaluation prompts, the preparer quarantines long, strongly overlapping lexical variants of those prompts. This is a conservative word/trigram heuristic, **not** a semantic or embedding-based paraphrase detector.
3. **Cross-partition fail-closed gate.** After partitioning, the preparer uses an indexed word-trigram comparison to detect strong lexical overlap between distinct partitions. Potential overlap aborts the entire preparation or reviewed-public-bundle export. If the index becomes too dense to inspect within its bounded limits, preparation fails closed for manual review instead of silently ignoring candidates.
4. **Sanitized audit metadata.** Successful preparation includes the source-group digest, `partition_strategy`, number checked and zero detected cross-partition lexical collisions. The dry-run reports do not include prompts, completions or source text.

## Important limitations

- A source group can land entirely in one partition. A small corpus with one or two source groups **will not** provide independent development and held-out evaluations. Do not force percentages by breaking source isolation. Report actual partition counts and require a sufficiently diverse, separately approved corpus before training.
- Distinct sources can contain overlapping passages. Reviewers should assign the same `dataset_group_id` to related editions, mirrors, content families and transformations, even if content hashes differ. Identical pinned content digests group automatically only when no different explicit grouping identifier overrides them. This guard cannot independently establish that two sources have shared provenance.
- The threshold-based lexical check can produce false positives and false negatives. It intentionally ignores short questions, prompts longer than 128 tokens, and certain number-changing prompts to reduce erroneous flags. It does not detect true semantic paraphrases, copied answer content, retrieval leakage, pretrained-model contamination or hidden license violations. An external similarity and independently reviewed contamination audit remains mandatory before a real training run.
- Index resource bounds are intentionally conservative. If repeated wording saturates the index, reject the package for review or partition and deduplicate upstream. Do not increase limits without a measured runtime and memory assessment.
- The existing application model APIs, main-branch ChatML/QLoRA script, M3 cloud MicroVM simulator adapter and specialist engines remain untouched.
- All source rights, privacy and answer-quality attestations still require **independent human or deterministic verification**; a source digest or a synthetic test is not proof of permission or factual correctness.

## Validation and release status

Synthetic offline tests: `node --test scripts/noctis-dataset-leakage.test.mjs scripts/noctis-internal-dataset.test.mjs scripts/noctis-reviewed-public-bundle.test.mjs`. Run repository CI against the **exact final development commit**, including `npm ci`, inventory, integration audit, typecheck, `npm test`, and **migration-free** `npm run build:dev`.

Only claim tests passed once their results are observed. No real licensed dataset, paid inference, model benchmark, adapter/checkpoint training, cloud provisioning, migration, merge or production release is authorized by this work.

## Next objective

Independently rights-check a specific public or project-authored corpus and review enough separate source groups to populate meaningful train/development/heldout partitions. Add semantic and answer-overlap contamination checks with an independently validated benchmark. Establish a controlled, authorized live-model baseline; assess trainable foundation-model license and hardware before selecting and implementing actual SFT/LoRA.
