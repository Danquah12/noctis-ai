# Noctis Training Implementation Log

## Milestone 1 — Governed submission and quarantine

**Branch:** `noctis/training-foundation`  
**Pull request:** [#1](https://github.com/Danquah12/noctis-ai/pull/1)

### Implemented in this branch

- Added additive migration `0014_noctis_learning_governance.sql`.
- Added provenance/review metadata to training pairs.
- Added source, claim, and audit tables.
- Added approval-state metadata to training rules.
- Removed the startup/hydration SQL deletion of `vibe`, `vibe-native`, and `vibe-gadget` training records.
- Database hydration now loads only records marked both verified and approved.
- User/model-taught examples are saved as unverified and quarantined.
- User-taught examples and rules are excluded from active retrieval and fine-tuning JSONL export until approval.
- Added per-user authentication requirement and rate limiting to the training endpoint.
- Recorded submitter identity and audit events for new pair/rule submissions.
- Added status counts for approved and quarantined pairs.
- Added an owner-only, active-MFA reviewer gate, pending-submission queue, and audited approve/reject actions for pairs and rules.
- Returned submission IDs to the submitter so a record can be referenced for review.
- Limited ordinary status output to approved recent questions so quarantined submissions are not disclosed to every signed-in user.

### Important behavior change

A user teaching Noctis no longer causes the submitted answer to become active knowledge immediately. It is accepted as a quarantined submission. This avoids treating an unsupported answer as verified merely because it was submitted.

### Not yet implemented

- Source upload and source-version ingestion service.
- Claim extraction with exact source locators.
- Domain-specific approval policies.
- Retrieval trace and provider/model provenance.
- Independent live-model evaluation harness.
- Fine-tuning pipeline and provider training jobs.

### Validation status

- GitHub Actions CI has been triggered repeatedly; earlier runs failed at `npm ci` before TypeScript checks or build could run. A newer run is pending/in progress; see the PR checks for the latest status.
- No local TypeScript test, build, migration, database write, or model training job has been executed in the user's environment.
- The migration has been committed but **has not been applied to any database**.
- No production branch merge or deployment has occurred.

### Safety notes

- The changes are isolated on the feature branch.
- The migration is additive and does not delete training records.
- Legacy user/model-taught records are moved to quarantine and marked unverified.
- The existing built-in seed corpus remains part of the application code; this milestone does not claim that all seed content has been independently source-validated.
