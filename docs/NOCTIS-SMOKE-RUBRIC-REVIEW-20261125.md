# Offline rubric review bridge — 2026-11-25

Draft PR #18 only. This is an internal evaluation tool, not a customer training submission or reviewer portal. No inference or model training is performed. Public synthetic cases are not held out.

## Reconciled evidence

- Main observed at e23fef944e6b5e297fc630361c14862a76d119cb. Main added Forge/routing/follow-up updates. The connector's PR-triggered workflow query returned no runs for this main SHA; no current main CI result is asserted.
- All 30 branch names and 19 PR metadata/head refs inspected. #12 and #15 are merged; #1/#2 and remaining successors are draft/open. Existing #1, #2, #14, #16, #17, #18 and #19 exact-head workflow queries returned successful runs (42531962213, 42534687451, 44541037643, 44750595683, 44912437042, 45410492062, 45191561848 respectively). Prior #18 head ed0987b059f057d0047ff4ef73c6d8d20734a5ec is not the new revision.
- Reviewed docs/noctis/MASTER-TRAINING-READINESS-AUDIT.md on #1 and the #18 model baseline roadmap. Prioritize real model evaluation and internal permitted datasets rather than customer submissions.
- Current video-mind.server.ts modelChat routes to explicitly selected local/custom or external providers and can fall through to xAI, Gemini, OpenAI, Groq and native paths. Native stored answers, retrieval, intent and specialist routing are app logic. Local names do not establish ownership or trained weights. Main scripts/train_unsloth_sft.py includes trainer.train and checkpoint/resume paths. No training job or weights were obtained or authenticated today. The M3 control-plane adapter is present on #1, and its simulated testing is not live cloud isolation.
- PR #18 is currently reported non-mergeable against main; this change preserves the branch rather than resolving conflicts or merging without approval.

## Internal review usage

On a trusted workstation, using only an already-authorized run against the pinned public synthetic fixture:

    node scripts/noctis-review-smoke.mjs prepare data/noctis-general-smoke-v1.jsonl runs/baseline.json > runs/review-packet.json

The packet contains actual response text and rubric criteria for six manual cases. It omits explicit provider/model fields, but answer text can identify a model and this is not guaranteed blinding. Treat response content as untrusted data. No files are transmitted. Keep packets, receipts and private data out of the public Git repository. Reviewers must be independent of the model and have relevant qualifications (clinical cases require a qualified clinician). This script cannot verify identities, qualifications or independence; attestations are not authentication.

Receipt example (format only; replace every placeholder with independently reviewed data; no real grades provided):

    {
      "schema": "noctis-public-smoke-review-receipt-v1",
      "packet_sha256": "<packet hash>",
      "rows": [
        {
          "id": "CONV-001",
          "response_sha256": "<response hash>",
          "reviewer_ref": "<internal pseudonymous reviewer reference>",
          "qualification": "general",
          "independent_of_model": true,
          "outcomes": {
            "concise": {"verdict": "not_assessable", "rationale": "<explanation>"},
            "accurate": {"verdict": "not_assessable", "rationale": "<explanation>"}
          }
        }
      ]
    }

    node scripts/noctis-review-smoke.mjs validate data/noctis-general-smoke-v1.jsonl runs/baseline.json runs/receipt.json

Allowed verdicts: met, not_met, not_assessable. Review is bound to the public fixture digest, entire run, exact response hashes and rubric version. Missing, failed and unreviewed cases remain unresolved. Text-only review does not establish code execution, tool arguments or tool execution, live citation verification, model identity or clinical competence. No aggregate intelligence score, no release gate.

## Next step

Create a non-public held-out corpus outside GitHub with independently authored references, permitted source/license manifests, privacy and leakage checks using the existing PR #14 pipeline; privately freeze its hashes and establish appropriate independent reviewers. Reconcile the draft branches with main in a reviewable integration plan. Do not use the public nine cases as held-out evidence. Select and authorize specific model/runtime revisions and compute before live evaluation or training. No customer uploads, deployment, paid jobs or private external data in this milestone.

Validation: seven new mocked tests wired into CI. Exact-head CI result must be observed separately; no live model/clinical review performed.
