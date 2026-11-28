# Governed SFT trainer input boundary — 2026-11-26

Draft, based on main `dd0dade48d956de58c91baf4bb0df35c07e6e33b`. This is a Python consumer of [PR #14](https://github.com/Danquah12/noctis-ai/pull/14)'s private ChatML export, not a public training-material submission flow. The upstream PR remains separate and unmerged. No real corpus, GPU job, external API, checkpoint or model inference was accessed.

The new dependency-free loader requires an independently recorded SHA-256 of the exact manifest bytes. It accepts only the three private files emitted by the PR #14 converter. It validates the manifest schema, counts and file digests, recomputes the sorted per-example fingerprints using the producer's UTF-8 algorithm, validates the two-message ChatML schema, detects normalized duplicate prompts across train/development, and returns the exact verified records in memory. A future trainer can pass them directly to Dataset.from_list instead of rereading mutable files or re-splitting the training partition. Heldout content is neither needed nor accepted. The CLI prints only counts and hashes, not the examples.

Offline usage (digest must come from a separately trusted record, not merely a manifest next to the data):

    python scripts/noctis_governed_sft_input.py --input-dir /private/approved-sft-export --expected-manifest-sha256 <trusted-digest>

    python -m unittest discover -s scripts -p test_noctis_governed_sft_input.py -v

This is integrity checking, not authentication of the source attestation, license review, proof of independent validation, semantic isolation, complete PII filtering, model revision or training authorization. It supports POSIX private directories and regular files; it intentionally refuses extra files and non-private inputs. Synthetic test fixtures are created only in temporary folders.

## Integration blocker and next change

Main's scripts/train_unsloth_sft.py still loads a default generated corpus and internally re-splits it. It counts lines in the nominal held-out benchmark, does not consume PR #14's verified development split, defaults to unpinned model loads with trust_remote_code=True, and globally changes torch.load's default weights_only to False. Do not run it against real governed inputs or untrusted checkpoints. The new loader deliberately does not modify those training execution or security-sensitive paths. Before enabling actual governed training, review the existing loading behavior, explicitly authorize the selected model and immutable revision, connect Dataset.from_list to this loader, keep the held-out path out of the trainer entirely, record the manifest pin/config/seed/dependencies and job evidence, and bind any resume checkpoint to the same run. The existing pilot launcher still initiates training if run; it was not executed.

## Reconciliation

Main CI run 45814891850 passed at the audited base. PR #18 head 7594986eee78362dd0a8c92ee2dfbdbcdf3328f6 had successful CI 45629829482, but its public smoke fixture is not a private held-out benchmark. PRs #1–#11 and #13–#14 retain their draft governed-source pipeline, and PRs #16–#19 retain their evidence/evaluation safeguards. PRs #12 and #15 were merged previously. The M3 MicroVM adapter and simulated tests remain on the training-foundation branch. Main's model routing still has provider fallback; the model card's clinical claims are not validated by this patch. No trained adapter/checkpoint files were found in the inspected main tree and releases were empty. External artifacts remain unverified.

No production, migration, model publication, paid evaluation or merge is authorized by this change.
