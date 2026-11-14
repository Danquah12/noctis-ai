# Noctis approved public-source acquisition — 2026-11-14

## Purpose and status

This development-only extension to draft PR #7 provides a **network-off-by-default public-source acquisition boundary** for the general-assistant training-data pipeline. It adds no user-upload portal, customer training-data submissions, user conversation harvesting, paid API calls, GPU training, model updates, or production changes. Sources are not silently promoted to training examples.

Only immutable **40-hex GitHub commit file URLs** hosted at `raw.githubusercontent.com` are eligible, and every source must include an independently reviewed internal usage-rights record, an expected SHA-256 of exact raw bytes, approved training usage under PR #7's narrow license allowlist, and explicit exclusion of private/customer/conversation records. Eight sources max per invocation; each source must be UTF-8 text and at most 2 MiB. Redirects, unknown hosts, query strings, wrong MIME types, oversized bodies and altered checksums are rejected.

**Rights and privacy caveat:** A license field and rights-review reference in a manifest are attestations, not independently proven rights. An open repository does not automatically permit training on all of its contents. Operators must independently examine upstream license terms, embedded third-party material, copyright and privacy. The tool does not run DLP, independent legal review or model-answer validation.

## Operation

Prepare a private local JSON catalog of separately reviewed public sources, such as this **nonfunctional example** (URL and hash intentionally illustrative, not a real approved dataset):

```json
{
  "sources": [{
    "id": "approved-source-01",
    "kind": "public_open",
    "license_id": "CC0-1.0",
    "origin_url": "https://raw.githubusercontent.com/REVIEWED-OWNER/REVIEWED-REPO/0123456789abcdef0123456789abcdef01234567/path/data.txt",
    "approved": true,
    "training_allowed": true,
    "usage_rights": "model_training",
    "reviewed_by": "source-approver",
    "expected_sha256": "<64-hex-digit-independently-reviewed-content-hash>",
    "license_review_reference": "internal-rights-record-01",
    "license_reviewed_by": "separate-rights-reviewer",
    "license_reviewed_on": "2026-11-14"
  }]
}
```

Perform a **no-network plan**:

```bash
node scripts/noctis-acquire-public-source.mjs --manifest /path/to/reviewed-sources.json
```

Only after separate operator authorization and approval to download these exact public sources:

```bash
NOCTIS_PUBLIC_SOURCE_FETCH_AUTHORIZED=YES node scripts/noctis-acquire-public-source.mjs --manifest /path/to/reviewed-sources.json --fetch
```

The fetch action uses no credentials, sends no user data, follows no redirects and checks **all** downloaded hashes before writing. The files and provenance manifest are stored in a new private OS temporary directory, not the public repository. Artifacts are marked `ACQUIRED_UNREVIEWED_CONTENT_NOT_TRAINING_DATA`. After authorized processing, securely clean up the temporary directory.

No extracted answer is automatically treated as ground truth. Independently validate any proposed examples, filter sensitive data and check evaluation contamination using the existing PR #7 preparation controls before any future SFT work.

## Validation and limitations

```bash
node --test scripts/noctis-public-source-acquisition.test.mjs
```

The tests use synthetic data and mocked HTTP responses; they do not download real public datasets or test a model. Validate this commit in the existing GitHub CI pipeline before reporting a repository-wide pass. The previous M3 MicroVM provider and simulated-control-plane tests are preserved unchanged; their passing status does not prove live cloud isolation.

Next: independently reviewed raw-public-content parsing and privacy/quality filtering, followed by an explicitly authorized live-model baseline, evaluation contamination checks, and a suitable licensed trainable base-model audit. **No model-weight training, checkpoint, or benchmark improvement is evidenced by this module.**
