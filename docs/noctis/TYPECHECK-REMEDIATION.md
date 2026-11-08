# Noctis TypeScript and CI Remediation Register

**Observed branch:** `noctis/training-foundation`  
**Evidence run:** CI run `42427365396`, merge commit containing branch head `d22effcf178302904ba777e271023ec1b17f85a7`  
**Follow-up run:** CI run `42427528107`, registry test revision `6660e397dce470ed64de61b8b1589a5c7b24fe69`

## 1. Validation facts

- `npm ci` passed in the evidence run.
- `npm run inventory:noctis` passed and emitted the expected JSON inventory.
- `npm run typecheck` failed with 339 TypeScript diagnostics in the evidence run.
- The follow-up registry-test revision had 340 diagnostics, one of which was the new registry test's readonly-array mutation. That isolated test diagnostic was fixed in commit `faa2b0e85ff286883bd98966b5780399a713089b`; its next CI result must be checked before declaring it resolved.
- The build step was skipped because the workflow runs typecheck before build.
- The latest `main` CI run available during this audit failed at `npm ci`, so it did not provide a valid TypeScript baseline. Do not label all diagnostics as newly introduced or pre-existing without a successful baseline comparison.

## 2. Latest remediation result

A later CI run for commit `ec67e81108f7f2de8bcc1c3b11bf84f001f6176b` reported 181 TypeScript diagnostics, down from 339 in the earlier evidence run (a reduction of 158 diagnostics). The board-exam cohort was reduced from 157 diagnostics to zero after:
- Adding the actually used `open_textbook` resource type to the catalog union.
- Replacing a UI access to nonexistent `BoardExam.domain` with the existing `categoryLabel`.

That run also reported zero diagnostics in `noctis-engine-registry` and `noctis-desk.server.ts`. The overall typecheck still failed; the build step remained blocked. Subsequent prompt-integrity and training-copy changes have new CI runs pending.

## 3. Diagnostic distribution

The 339-diagnostic run grouped as follows by source file:

| File | Diagnostics |
|---|---:|
| `src/lib/board-exams.ts` | 157 |
| `src/lib/noctis-health-engine.ts` | 38 |
| `src/lib/noctis-verified-execution.ts` | 19 |
| `src/lib/noctis-limits.test.ts` | 18 |
| `src/components/noctis/NoctisDesk.tsx` | 16 |
| `src/lib/noctis-professional-engine.ts` | 12 |
| `src/components/noctis/NoctisSovereignFactoryStudio.tsx` | 9 |
| `src/components/noctis/NoctisPatientDiagnosisModal.tsx` | 6 |
| `src/lib/noctis-predictive-intelligence.ts` | 6 |
| `src/components/noctis/NoctisTerminal.tsx` | 5 |
| `src/lib/autonomous-agent-engine.ts` | 5 |
| `src/lib/noctis-patient-diagnosis.ts` | 5 |
| Remaining files | 42 |

The remaining files include API route, authentication, cyber/defense, architecture, legal, OCR, truth-ledger, science, vault and test modules. The exact CI log is the source of truth for line-level details.

## 4. Main diagnostic clusters

### A. Board exam catalog and UI contract drift
- `BoardExam` lacks properties consumed by the UI (for example, `domain`).
- `FreeResource.type` and UI consumers disagree on supported resource kinds (repeated `open_textbook` diagnostics).
- Fix by reconciling the catalog's canonical schema with all consumers, not by broadening unions blindly.

### B. Health engine and clinical data contracts
- `noctis-health-engine.ts` has incompatible type shapes and inferred values across clinical records, workflows and result objects.
- Clinical UI expects fields absent from current dossier/question types.
- Fix using explicit versioned domain interfaces and adapters; preserve missing-data behavior and clinical safety checks.

### C. Professional engineering calculators and digital thread
- Callers reference result properties not returned by calculator functions (e.g. current/length/conductor and process-statistic fields).
- Digital-thread node properties are inconsistent.
- Fix each calculator contract with units, input bounds, calculation tests and compatibility adapters.

### D. Verified execution and sovereign factory
- Execution result shapes and UI consumers disagree on lifecycle and advanced-system fields.
- Some enum literals use inconsistent capitalization or naming.
- Fix the canonical lifecycle enum and output schema first; then migrate UI consumers.

### E. Noctis Desk UI integration
- Missing handler symbols and action types.
- Brain provider shape mismatch.
- UI references unsupported skill and tool identifiers.
- Fix by defining a single typed action/skill contract shared by server API and UI, then wiring each handler or disabling the incomplete control.

### F. Shared platform and routes
- Auth session identity type drift.
- Missing exports and stale imports across real-world mesh, legal, defense and other modules.
- API response/header type issues and route registration mismatch.
- Fix with explicit shared interfaces and route contract tests.

## 5. Safe remediation order

1. Keep TypeScript strict; do not suppress diagnostics or use broad `any` casts.
2. Establish a successful install baseline on both the PR merge ref and a controlled main-branch baseline.
3. Fix high-volume leaf schemas first: board exams and shared clinical data types.
4. Fix calculator return types and consumers with unit tests.
5. Fix shared execution lifecycle and professional engine contracts.
6. Fix Noctis Desk's API/skill/action types and actual event handlers.
7. Fix authentication, tenant, route and server-function contracts.
8. Re-run typecheck after each cohort; record diagnostic delta.
9. Run all targeted tests, full tests, build and security checks.
10. Review migrations and security before merge.

## 6. Rules for fixing diagnostics

- Do not add fields to a type unless the data is actually produced and validated.
- Do not fabricate default clinical values to satisfy types.
- Do not map unknown lifecycle values to a success state.
- Do not mark an engine validated or operational based on a compile pass.
- Do not disable `strict`, `noImplicitAny`, or other compiler gates.
- Do not remove failing tests to make CI green.
- Keep each fix cohort small enough to review and revert independently.

## 7. Dependency audit observation

The CI install log reported 14 npm audit findings (2 low, 8 moderate, 3 high, 1 critical). This is a summary only; package names, paths and fix availability must be collected from a full audit report before changing dependencies. Do not run `npm audit fix --force` as an automatic remediation.

## 8. Current release status

The branch is not release-ready. Typecheck has failed, build has not run after those failures, no production migrations have been applied, and no deployment is authorized by this remediation plan.
