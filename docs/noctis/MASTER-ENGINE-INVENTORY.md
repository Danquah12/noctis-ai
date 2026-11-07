# Noctis Master Engine Inventory

**Audit branch:** `noctis/training-foundation`  
**Audited head:** `669068514c607c16b87a8d1c8bd94e2b0e890b61`  
**Audit date:** 2026-11-07  
**Purpose:** Establish a repository-backed baseline before engine refactoring or expansion.

## 1. Executive inventory

The recursive Git tree for the audited branch contained 1,006 tracked files. The following Noctis-specific source inventory was identified:

| Artifact | Count | What the count proves |
|---|---:|---|
| Files under `src/lib/noctis-*` | 187 | Noctis-prefixed library artifacts exist |
| Implementation source files (.ts/.tsx/.py, excluding tests) | 127 | Implementation source files exist; behavior is not thereby validated |
| Test files | 58 | Test source files exist; pass status and coverage require execution |
| Components under `src/components/noctis/` | 55 | Noctis UI components exist |
| Dedicated Noctis routes | 2 | `/noctis` and `/api/noctis` route files exist |
| Professional specification | 1 principal specification identified | A source taxonomy/specification exists |

The historical professional registry reports 42 profession categories, 22 specialist professional engines, 20 advanced execution engines and 6 shared technical engines. Treat those as **historical specification claims** until reconciled against implementation exports, runtime registration and tests.

## 2. Evidence and status definitions

This inventory deliberately distinguishes source presence from capability maturity.

- **Source-present:** A relevant source file exists.
- **Test-present:** A corresponding test file exists.
- **Integrated:** Runtime routing or a documented call path connects the capability to an application workflow.
- **Validated:** Relevant tests have been executed and passed against the current commit.
- **Operational:** Deployed runtime behavior, monitoring and support have been demonstrated.
- **Production-approved:** Security, privacy, operational, data and release gates have passed.

A filename, UI modal, specification, seed record or acceptance-test definition is not sufficient evidence of a working production capability.

## 3. Existing Noctis source inventory

The following source paths were present at the audited head. Grouping is based on module names and visible source declarations; it is not a certification of completeness.

### 3.1 Core intelligence, orchestration, reasoning and agents

- `src/lib/noctis-api.ts`
- `src/lib/noctis-brain.ts`
- `src/lib/noctis-checks.ts`
- `src/lib/noctis-council.ts`
- `src/lib/noctis-custom-agents.ts`
- `src/lib/noctis-decisions.ts`
- `src/lib/noctis-memory.ts`
- `src/lib/noctis-orchestrator.ts`
- `src/lib/noctis-professional-engine.ts`
- `src/lib/noctis-response-intelligence.ts`
- `src/lib/noctis-skills.ts`
- `src/lib/noctis-specialist-router.ts`
- `src/lib/noctis-vocabulary.ts`

### 3.2 Knowledge, research, evidence, training and evaluation

- `src/lib/noctis-autonomous-trainer.ts`
- `src/lib/noctis-benchmark.ts`
- `src/lib/noctis-deep-research.ts`
- `src/lib/noctis-document-intelligence.ts`
- `src/lib/noctis-eval-suite.ts`
- `src/lib/noctis-evidence-retrieval.server.ts`
- `src/lib/noctis-excellence-rag-engine.ts`
- `src/lib/noctis-live-connectors.ts`
- `src/lib/noctis-live-search.server.ts`
- `src/lib/noctis-source-ingestion.server.ts`
- `src/lib/noctis-train.server.ts`
- `src/lib/noctis-training-catalog.ts`
- `src/lib/noctis-truth-ledger.ts`

### 3.3 Cybersecurity, application security and defensive operations

- `src/lib/noctis-attack-path-engine.ts`
- `src/lib/noctis-auto-remediation.ts`
- `src/lib/noctis-blast-radius.ts`
- `src/lib/noctis-canary-engine.ts`
- `src/lib/noctis-circuit-breaker.ts`
- `src/lib/noctis-cve-knowledge.ts`
- `src/lib/noctis-cyber-engine.ts`
- `src/lib/noctis-defense-subsystem.ts`
- `src/lib/noctis-enclave-attestation.ts`
- `src/lib/noctis-fuzzer.ts`
- `src/lib/noctis-git-remediator.server.ts`
- `src/lib/noctis-llm-redteam.ts`
- `src/lib/noctis-pqc-shield.ts`
- `src/lib/noctis-sast-engine.ts`
- `src/lib/noctis-steganography.ts`
- `src/lib/noctis-verified-execution.ts`
- `src/lib/noctis-vuln-engine.ts`
- `src/lib/noctis-vuln-eval.ts`
- `src/lib/noctis-vuln-query.ts`
- `src/lib/noctis-wasm-runner.ts`
- `src/lib/noctis-zk-proof.ts`

### 3.4 Health and clinical intelligence

- `src/lib/noctis-cardiovascular-engine.ts`
- `src/lib/noctis-clinical-engine.ts`
- `src/lib/noctis-clinical-validation-engine.ts`
- `src/lib/noctis-endocrine-metabolic-engine.ts`
- `src/lib/noctis-global-conditions-engine.ts`
- `src/lib/noctis-health-500-engine.ts`
- `src/lib/noctis-health-500-schema.ts`
- `src/lib/noctis-hematology-autoimmune-engine.ts`
- `src/lib/noctis-infectious-disease-engine.ts`
- `src/lib/noctis-longitudinal-trends.ts`
- `src/lib/noctis-medical-benchmark.ts`
- `src/lib/noctis-medical-record-interpreter.ts`
- `src/lib/noctis-neurology-geriatrics-engine.ts`
- `src/lib/noctis-obstetrics-pediatrics-engine.ts`
- `src/lib/noctis-oncology-chronic-engine.ts`
- `src/lib/noctis-ocr-intake.ts`
- `src/lib/noctis-patient-diagnosis.ts`
- `src/lib/noctis-patient-export.ts`
- `src/lib/noctis-pharmacogenomics.ts`

### 3.5 Science, engineering, architecture and simulation

- `src/lib/noctis-architect-benchmarks.ts`
- `src/lib/noctis-architect-engine.ts`
- `src/lib/noctis-architect-showcase.ts`
- `src/lib/noctis-automotive-engine.ts`
- `src/lib/noctis-digital-twin.ts`
- `src/lib/noctis-grid.ts`
- `src/lib/noctis-holodeck-3d.ts`
- `src/lib/noctis-pde.ts`
- `src/lib/noctis-science-platform.ts`
- `src/lib/noctis-science-subsystem.ts`
- `src/lib/noctis-universal-science-engine.ts`

### 3.6 Risk, legal, finance, Bible and professional services

- `src/lib/noctis-bible-engine.ts`
- `src/lib/noctis-investment-engine.ts`
- `src/lib/noctis-legal-engine.ts`
- `src/lib/noctis-risk-engine.ts`
- `src/lib/noctis-rmf-engine.ts`

### 3.7 Execution, workspace, collaboration, integration and platform services

- `src/lib/noctis-air-gap.ts`
- `src/lib/noctis-audio-synth.ts`
- `src/lib/noctis-code-interpreter.ts`
- `src/lib/noctis-cognitive-sandbox.ts`
- `src/lib/noctis-crisis-negotiation.ts`
- `src/lib/noctis-desk.server.ts`
- `src/lib/noctis-diff.ts`
- `src/lib/noctis-distributed-plugins.ts`
- `src/lib/noctis-execute.ts`
- `src/lib/noctis-gadgets.server.ts`
- `src/lib/noctis-github-dispatcher.ts`
- `src/lib/noctis-gmail-connector.ts`
- `src/lib/noctis-ledger.ts`
- `src/lib/noctis-lex-synthesizer.ts`
- `src/lib/noctis-mesh-swarm.ts`
- `src/lib/noctis-os.ts`
- `src/lib/noctis-outside.server.ts`
- `src/lib/noctis-passport.ts`
- `src/lib/noctis-pipeline.ts`
- `src/lib/noctis-plugin-scenarios.ts`
- `src/lib/noctis-plugin-synthesizer.ts`
- `src/lib/noctis-real-world-mesh.ts`
- `src/lib/noctis-ric.ts`
- `src/lib/noctis-scenarios.ts`
- `src/lib/noctis-sovereign-factory.ts`
- `src/lib/noctis-vault.ts`
- `src/lib/noctis-voice-hud.ts`
- `src/lib/noctis-voice.ts`
- `src/lib/noctis-war-room.ts`
- `src/lib/noctis-work-swarm.ts`
- `src/lib/noctis-workspace-integrations.ts`

### 3.8 Career, profession and workforce intelligence

- `src/lib/noctis-career-expansion.ts`
- `src/lib/noctis-career-intents.ts`
- `src/lib/noctis-career-pathways.ts`
- `src/lib/noctis-career-professions-data.ts`
- `src/lib/noctis-career-query.ts`
- `src/lib/noctis-career-regions-data.ts`
- `src/lib/noctis-career-soc-map.ts`
- `src/lib/noctis-career-wages-data.ts`

### 3.9 Additional source artifacts

- `src/lib/noctis-automotive-engine.ts` is also relevant to vehicle diagnostics.
- `src/lib/noctis-frontier-pillars.ts`
- `src/lib/noctis-hard.ts`
- `src/lib/noctis-voice.ts`
- `src/lib/noctis_validation_engine.py`

The complete machine-discovered list should be regenerated from the Git tree in CI rather than maintained manually.

## 4. Existing UI and routes

Noctis-specific UI components include agent builder/stepper, air-gap, auto-remediation, blast-radius, board exam, brain, canary, capability matrix, circuit breaker, code interpreter, cognitive, console, context, council, crisis negotiation, connectors, deep research, defense, desk, digital twin, enclave, forge, GitHub, holodeck, legal, CVE ticker, live preview, memory, model picker, passport, patient diagnosis, plugins, PQC, red team, science, swarm, terminal, truth ledger, vault, voice, war room, workspace explorer and ZK proof interfaces.

Dedicated route files:
- `src/routes/noctis.tsx`
- `src/routes/api/noctis.ts`

Route existence does not imply every UI action or API branch is authenticated, safe, or operational. The API route requires a dedicated security review, especially its CORS policy, tenant scoping, and query parameter handling.

## 5. Professional taxonomy and existing specifications

Primary source:
- `specs/inbox/01-professional-intelligence-and-42-professions.md`

The specification describes six initial engineering specialist engines:
1. Construction and Building Intelligence.
2. Mechanical Engineering.
3. Automotive Engineering and Diagnostics.
4. Civil and Structural Engineering.
5. Electrical, Electronics and Energy.
6. Manufacturing and Industrial Engineering.

It also defines a 42-category professions and skilled-trades taxonomy. Some category numbers are not visible in the retrieved excerpt; the source document remains authoritative and must be parsed in full before creating a normalized registry.

The professional engine source describes:
- 42-category profession directory.
- 6 core specialist engineering engines plus 16 extended profession engines.
- 6 shared technical engines.
- 20 advanced professional work execution engines.
- Automated specification/taxonomy ingestion.
- Deterministic engineering and diagnostic calculators.
- A 10-criterion professional acceptance suite.

These are implementation/specification declarations to be independently checked against exports, callers, tests and runtime behavior.

## 6. Existing evaluation assets

The repository contains a 15-division evaluation taxonomy in `src/lib/noctis-eval-suite.ts`, covering cybersecurity, risk management, AI/data science, software/IT, engineering/physical sciences, business/finance/economics, law/governance/compliance, education/certifications, healthcare/life sciences, humanities/culture/religion, environment/agriculture, architecture/construction, psychology/social sciences, transportation/logistics, and research/critical reasoning.

Important evaluation integrity finding:
- The current evaluation implementation must be reviewed to determine whether it invokes a live model or evaluates a generated/synthetic response. A deterministic rubric self-check is not equivalent to an independent live-model benchmark.
- Reported pass rates must always identify the evaluator, test set version, model/provider, run timestamp and whether results were live, deterministic, human-reviewed or synthetic.

## 7. Current maturity assessment

This audit has not yet run the full test suite or completed a call-graph review. Therefore, the following is the honest baseline:

| Area | Current evidence | Maturity conclusion |
|---|---|---|
| Source inventory | Git tree inspection | Source-present |
| Professional taxonomy | Specification and implementation file | Spec-present; reconciliation required |
| Specialist modules | Source files present | Source-present; per-module review required |
| UI | 57 Noctis UI components and 2 routes confirmed by CI inventory | UI-present; action wiring requires review |
| Automated tests | 58 Noctis test files present | Test-present; pass status not asserted |
| Learning governance | Prior branch implementation and migrations 0014/0015 | Implemented on branch; DB migrations unapplied |
| Source ingestion | Quarantined text intake implementation | Implemented foundation; operational integration requires review |
| Evidence retrieval | Approved-public lexical retrieval implementation | Implemented foundation; not yet answer-generation integrated |
| Model connection security | Authentication, rate limit, endpoint allowlist changes | Implemented on branch; SSRF and shared rate-limit gaps remain |
| Full CI | Latest reported run failed TypeScript validation | Failing; release blocked |
| Production readiness | No production deployment evidence | Not established |

## 8. Registry foundation added after baseline audit

The branch now includes `src/lib/noctis-engine-registry.ts`, a typed metadata registry for an initial 11-engine cohort (core orchestration, cyber vulnerability/SAST, RMF, clinical, science, engineering, legal, defense, research and professional intelligence). It supports listing, domain filtering, capability discovery and request-contract validation. An authenticated metadata-only server function exposes the registry. It deliberately does not execute specialist modules or claim runtime integration.

A focused test suite covers registry identity uniqueness, discovery, defensive copies, unsupported capabilities, evidence requirements, execution-mode boundaries and human approval gates. The suite is included in the typecheck/test gate.

## 9. Immediate audit actions

1. Build a machine-readable inventory from the repository tree.
2. Parse the full professional taxonomy and compare declared engines to implementation exports.
3. Build an import/call graph for every engine.
4. Link each engine to routes, UI entry points, tools, schemas and tests.
5. Execute tests by isolated suite and record exact commit and outcome.
6. Identify dead code, duplicate capabilities, unsafe API surfaces and unreferenced UI.
7. Assign maturity only after evidence is collected.
8. Publish an approved baseline before refactoring.

## 10. Non-negotiable preservation rules

- Do not delete or rename existing engines merely to fit a new taxonomy.
- Do not silently change existing exported function signatures.
- Do not apply migrations to production as part of the inventory.
- Do not enable unreviewed source content for retrieval or training.
- Do not claim model-weight training unless an actual training job and resulting artifact exist.
- Do not promote engines based on UI presence or synthetic acceptance scores.
- Keep all work on the development branch until CI, security, migration and human review gates pass.
