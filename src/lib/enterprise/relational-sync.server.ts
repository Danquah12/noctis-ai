/**
 * Noctis Relational Database Sync & Live Schema Persistence
 *
 * Bridges Noctis Enterprise & RMF runtime engines directly into the normalized SQL
 * schemas created by `0015_rmf_v2_enterprise.sql` (`rmf.*`, `governance.*`, `assessment.*`,
 * `monitoring.*`, `cyber.*`, `graph.*`, `agents.*`, `intelligence.*`, `training.*`, `security.*`),
 * `enterprise.policy_bundles`, `enterprise.telemetry_events`, and `ndkrs.clinical_enclave_records`.
 */

import { sha256Sync } from "../universal-crypto.ts";
import { listDirectiveLineages } from "../dod-ic/policy-change-engine.server.ts";
import { searchStigLibrary } from "../dod-ic/stig-library.ts";
import { decryptClinicalPayload, storeEncryptedClinicalEnclaveRecord } from "../ndkrs/enclave-crypto.server.ts";
import { ensureNdkrsSchema } from "../ndkrs/persistence.server.ts";
import { listPolicyAsCodePacks } from "./policy-as-code-engine.ts";
import { evaluateAuthorizationTwin, getDefaultAuthorizationTwin } from "./authorization-digital-twin.ts";
import { runContinuousControlValidation } from "./evidence-and-ccv-engine.ts";
import { queryComplianceKnowledgeGraph } from "./graph-and-mission-risk.ts";
import { getAllProductionSbomComponents } from "./government-readiness.ts";
import { listGovernedAgents } from "./ai-agent-governance.ts";
import {
  ensureEnterpriseSchema,
  persistTelemetryEvents,
  savePolicyBundle,
  type EnterpriseSql,
} from "./persistence.server.ts";
import type {
  AuthorizationBoundaryTwin,
  CcvValidationResult,
  TwinEvaluationResult,
} from "./types.ts";

export function deterministicUuid(seed: string): string {
  const hex = sha256Sync(`uuid:noctis:${seed}`).slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = "8";
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

const DEFAULT_TENANT_UUID = deterministicUuid("tenant:default-enclave");
let ensured0015Promise: Promise<void> | null = null;

async function ensure0015TablesExist(sql: EnterpriseSql): Promise<void> {
  if (!ensured0015Promise) {
    ensured0015Promise = (async () => {
      const check = await sql
        .query<{ ok: boolean }>(
          "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'governance' AND table_name = 'packages') AS ok",
        )
        .catch(() => [{ ok: false }]);
      if (check[0]?.ok) return;

      for (const s of ["rmf", "governance", "assessment", "monitoring", "cyber", "graph", "agents", "intelligence", "training", "security"]) {
        await sql.query(`CREATE SCHEMA IF NOT EXISTS ${s}`);
      }
      await sql.query(`
        CREATE TABLE IF NOT EXISTS rmf.baselines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          baseline_key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          impact_level TEXT NOT NULL CHECK (impact_level IN ('LOW', 'MODERATE', 'HIGH', 'PRIVACY')),
          source_version TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS rmf.systems (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          system_key TEXT NOT NULL,
          name TEXT NOT NULL,
          boundary_description TEXT NOT NULL DEFAULT '',
          classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED_FEDRAMP',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id),
          UNIQUE (tenant_id, system_key)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS rmf.evidence (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          system_id UUID NOT NULL,
          control_id TEXT NOT NULL,
          origin TEXT NOT NULL,
          sha256 CHAR(64) NOT NULL,
          lifecycle_state TEXT NOT NULL,
          collected_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS governance.packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          system_id UUID NOT NULL,
          package_type TEXT NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'DRAFT',
          baseline_id UUID NOT NULL REFERENCES rmf.baselines (id),
          boundary_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id),
          UNIQUE (tenant_id, system_id, version)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS governance.artifacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          package_id UUID NOT NULL,
          artifact_type TEXT NOT NULL,
          version INTEGER NOT NULL,
          object_key TEXT NOT NULL,
          sha256 CHAR(64) NOT NULL,
          oscal_model TEXT,
          validation_status TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, package_id, artifact_type, version)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS governance.approval_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          package_id UUID NOT NULL,
          decision TEXT NOT NULL,
          approver_subject TEXT NOT NULL,
          approver_role TEXT NOT NULL,
          reason TEXT NOT NULL,
          decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS governance.control_inheritance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          package_id UUID NOT NULL,
          provider TEXT NOT NULL,
          consumer TEXT NOT NULL,
          control_id TEXT NOT NULL,
          responsibility TEXT NOT NULL,
          approval_status TEXT NOT NULL DEFAULT 'DRAFT',
          effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
          effective_to TIMESTAMPTZ,
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS governance.tailoring_decisions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          baseline_id UUID NOT NULL REFERENCES rmf.baselines (id),
          control_id TEXT NOT NULL,
          action TEXT NOT NULL,
          rationale TEXT NOT NULL,
          source_citation TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'DRAFT',
          approver TEXT,
          decided_at TIMESTAMPTZ,
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS governance.authorization_conditions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          package_id UUID NOT NULL,
          condition_text TEXT NOT NULL,
          owner TEXT NOT NULL,
          due_date DATE,
          verification_status TEXT NOT NULL DEFAULT 'OPEN',
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS assessment.objective_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          package_id UUID NOT NULL,
          control_id TEXT NOT NULL,
          objective_id TEXT NOT NULL,
          assessor_subject TEXT NOT NULL,
          evidence_id UUID,
          method TEXT NOT NULL,
          determination TEXT NOT NULL,
          evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS assessment.findings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          objective_result_id UUID,
          control_id TEXT NOT NULL,
          severity TEXT NOT NULL,
          cause TEXT NOT NULL,
          impact TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'OPEN',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS assessment.poam_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          finding_id UUID NOT NULL,
          owner TEXT NOT NULL,
          milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
          deadline DATE NOT NULL,
          closure_evidence_id UUID,
          status TEXT NOT NULL DEFAULT 'OPEN',
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS monitoring.policies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          metric TEXT NOT NULL,
          scope TEXT NOT NULL,
          cadence_hours INTEGER NOT NULL,
          rule_version TEXT NOT NULL,
          escalation_target TEXT NOT NULL,
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS monitoring.runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          policy_id UUID NOT NULL,
          scheduled_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          status TEXT NOT NULL,
          source_snapshot_hash CHAR(64),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS monitoring.drift_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          run_id UUID,
          expected_state JSONB NOT NULL,
          observed_state JSONB NOT NULL,
          affected_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
          detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS cyber.assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          system_id UUID NOT NULL,
          asset_key TEXT NOT NULL,
          asset_type TEXT NOT NULL,
          criticality TEXT,
          attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
          UNIQUE (tenant_id, id),
          UNIQUE (tenant_id, system_id, asset_key)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS cyber.vulnerabilities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vulnerability_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          published_at TIMESTAMPTZ,
          is_kev BOOLEAN NOT NULL DEFAULT false,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS cyber.asset_findings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          asset_id UUID NOT NULL,
          vulnerability_id UUID NOT NULL REFERENCES cyber.vulnerabilities (id),
          first_seen TIMESTAMPTZ NOT NULL,
          last_seen TIMESTAMPTZ NOT NULL,
          status TEXT NOT NULL,
          evidence_id UUID,
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS cyber.attack_paths (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          path_nodes JSONB NOT NULL,
          graph_version TEXT NOT NULL,
          exposure_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
          assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS cyber.risk_scenarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          threat_description TEXT NOT NULL,
          likelihood_model TEXT NOT NULL,
          impact_model TEXT NOT NULL,
          uncertainty_notes TEXT NOT NULL,
          model_version TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS cyber.sbom_components (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          asset_id UUID NOT NULL,
          package_name TEXT NOT NULL,
          version TEXT NOT NULL,
          supplier TEXT NOT NULL DEFAULT '',
          sha256 CHAR(64),
          license TEXT NOT NULL DEFAULT '',
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS graph.nodes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          node_type TEXT NOT NULL,
          entity_id UUID NOT NULL,
          label TEXT NOT NULL,
          attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
          UNIQUE (tenant_id, id),
          UNIQUE (tenant_id, node_type, entity_id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS graph.edges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          source_node_id UUID NOT NULL,
          target_node_id UUID NOT NULL,
          relation_type TEXT NOT NULL,
          provenance JSONB NOT NULL,
          valid_from TIMESTAMPTZ NOT NULL,
          valid_to TIMESTAMPTZ
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS agents.runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          agent_name TEXT NOT NULL,
          task_name TEXT NOT NULL,
          model_id TEXT NOT NULL,
          tools_used JSONB NOT NULL DEFAULT '[]'::jsonb,
          inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
          outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
          status TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS agents.review_decisions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          run_id UUID NOT NULL,
          reviewer_subject TEXT NOT NULL,
          outcome TEXT NOT NULL,
          reason TEXT NOT NULL,
          decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS intelligence.policy_diffs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          old_version TEXT NOT NULL,
          new_version TEXT NOT NULL,
          changes JSONB NOT NULL,
          impact_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
          computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS intelligence.explanation_bundles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          evaluation_ref TEXT NOT NULL,
          source_hashes JSONB NOT NULL,
          rule_trace JSONB NOT NULL,
          canonical_sha256 CHAR(64) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS training.feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          original_output TEXT NOT NULL,
          correction TEXT NOT NULL,
          reviewer_subject TEXT NOT NULL,
          human_approved BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS training.dataset_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          manifest JSONB NOT NULL,
          split TEXT NOT NULL,
          hashes JSONB NOT NULL,
          approved_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await sql.query(`
        CREATE TABLE IF NOT EXISTS security.audit_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          actor_subject TEXT NOT NULL,
          action TEXT NOT NULL,
          target_ref TEXT NOT NULL,
          before_hash CHAR(64),
          after_hash CHAR(64) NOT NULL,
          recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
    })().catch((err) => {
      ensured0015Promise = null;
      throw err;
    });
  }
  await ensured0015Promise;
}

export async function syncPolicyBundlesToSql(actorId = "system"): Promise<number> {
  const packs = listPolicyAsCodePacks();
  for (const p of packs) {
    await savePolicyBundle({
      id: p.packId,
      name: p.name,
      version: p.version,
      authoritySource: p.authoritySource,
      rules: p.rules,
      bundleSha256: p.bundleSha256,
      createdBy: actorId,
    });
  }
  return packs.length;
}

export async function persistTwinToGovernanceSql(
  twin: AuthorizationBoundaryTwin,
  evalRes?: TwinEvaluationResult,
): Promise<{ systemUuid: string; packageUuid: string; inheritanceCount: number }> {
  const { sql } = await ensureEnterpriseSchema();
  await ensure0015TablesExist(sql);
  const evaluation = evalRes || evaluateAuthorizationTwin(twin);

  const baselineId = deterministicUuid(`baseline:${twin.impactLevel}`);
  const impactMapped = twin.impactLevel === "IL2" ? "MODERATE" : "HIGH";
  await sql.query(
    `INSERT INTO rmf.baselines (id, baseline_key, name, impact_level, source_version)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (baseline_key) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [
      baselineId,
      `FED-DOD-${twin.impactLevel}`,
      `NIST SP 800-53B / CNSSI 1253 (${twin.impactLevel})`,
      impactMapped,
      "5.2.0",
    ],
  );
  const bRow = await sql.query<{ id: string }>("SELECT id FROM rmf.baselines WHERE baseline_key = $1 LIMIT 1", [
    `FED-DOD-${twin.impactLevel}`,
  ]);
  const actualBaselineId = bRow[0]?.id || baselineId;

  const sysId = deterministicUuid(`sys:${twin.systemId}`);
  await sql.query(
    `INSERT INTO rmf.systems (id, tenant_id, system_key, name, boundary_description, classification)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, system_key) DO UPDATE SET name = EXCLUDED.name`,
    [
      sysId,
      DEFAULT_TENANT_UUID,
      twin.systemId,
      twin.systemName,
      `Impact Level ${twin.impactLevel} authorization boundary managed by Noctis Digital Twin`,
      twin.impactLevel === "IL6" ? "SECRET" : "CUI_IL5",
    ],
  );
  const sRow = await sql.query<{ id: string }>(
    "SELECT id FROM rmf.systems WHERE tenant_id = $1 AND system_key = $2 LIMIT 1",
    [DEFAULT_TENANT_UUID, twin.systemId],
  );
  const actualSysId = sRow[0]?.id || sysId;

  const pkgId = deterministicUuid(`pkg:${twin.systemId}:v1`);
  const pkgStatus = evaluation.effectivePosture === "AUTHORIZED" ? "EFFECTIVE" : "UNDER_REVIEW";
  await sql.query(
    `INSERT INTO governance.packages (id, tenant_id, system_id, package_type, version, status, baseline_id, boundary_snapshot)
     VALUES ($1, $2, $3, 'INITIAL', 1, $4, $5, $6::jsonb)
     ON CONFLICT (tenant_id, system_id, version) DO UPDATE SET status = EXCLUDED.status, boundary_snapshot = EXCLUDED.boundary_snapshot`,
    [
      pkgId,
      DEFAULT_TENANT_UUID,
      actualSysId,
      pkgStatus,
      actualBaselineId,
      JSON.stringify({ twin, evaluation }),
    ],
  );
  const pRow = await sql.query<{ id: string }>(
    "SELECT id FROM governance.packages WHERE tenant_id = $1 AND system_id = $2 AND version = 1 LIMIT 1",
    [DEFAULT_TENANT_UUID, actualSysId],
  );
  const actualPkgId = pRow[0]?.id || pkgId;

  // Artifacts, Approval Event, Inheritance, Tailoring & Conditions
  const artId = deterministicUuid(`gov-art:${twin.systemId}:SSP:1`);
  await sql.query(
    `INSERT INTO governance.artifacts (id, tenant_id, package_id, artifact_type, version, object_key, sha256, oscal_model, validation_status)
     VALUES ($1, $2, $3, 'SSP', 1, $4, $5, 'OSCAL-SSP-1.0.4', 'VALIDATED')
     ON CONFLICT (tenant_id, package_id, artifact_type, version) DO UPDATE SET sha256 = EXCLUDED.sha256`,
    [artId, DEFAULT_TENANT_UUID, actualPkgId, `emass/${twin.systemId}/ssp-v1.json`, evaluation.snapshotSha256],
  );

  const appId = deterministicUuid(`gov-approval:${twin.systemId}:${pkgStatus}`);
  await sql.query(
    `INSERT INTO governance.approval_events (id, tenant_id, package_id, decision, approver_subject, approver_role, reason)
     VALUES ($1, $2, $3, $4, $5, 'AO_HUMAN', $6)
     ON CONFLICT DO NOTHING`,
    [
      appId,
      DEFAULT_TENANT_UUID,
      actualPkgId,
      evaluation.effectivePosture === "AUTHORIZED" ? "APPROVE" : "REQUEST_CHANGES",
      twin.authorizingOfficial,
      `Twin evaluation posture=${evaluation.effectivePosture}; aiCanIssueAto=false`,
    ],
  );

  let inheritanceCount = 0;
  for (const prov of twin.inheritedProviders) {
    for (const ctrl of prov.inheritedControls) {
      const inhId = deterministicUuid(`inh:${twin.systemId}:${prov.providerId}:${ctrl}`);
      await sql.query(
        `INSERT INTO governance.control_inheritance (id, tenant_id, package_id, provider, consumer, control_id, responsibility, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'INHERITED', $7)
         ON CONFLICT (tenant_id, id) DO UPDATE SET approval_status = EXCLUDED.approval_status`,
        [inhId, DEFAULT_TENANT_UUID, actualPkgId, prov.providerName, twin.systemName, ctrl, prov.paStatus],
      );
      inheritanceCount += 1;
    }
  }

  const tailId = deterministicUuid(`tail:${twin.systemId}:CNSSI-1253-NSS`);
  await sql.query(
    `INSERT INTO governance.tailoring_decisions (id, tenant_id, baseline_id, control_id, action, rationale, source_citation, status, approver)
     VALUES ($1, $2, $3, 'IA-2(6)', 'OVERLAY', 'NSS / DoD PKI Alt Token Hardware MFA Overlay', 'CNSSI 1253 / DoDI 8520.03', 'APPROVED', 'ao-human@dod.mil')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [tailId, DEFAULT_TENANT_UUID, actualBaselineId],
  );

  const condId = deterministicUuid(`cond:${twin.systemId}:CONMON-30D`);
  await sql.query(
    `INSERT INTO governance.authorization_conditions (id, tenant_id, package_id, condition_text, owner, due_date, verification_status)
     VALUES ($1, $2, $3, 'Maintain <= 30-day credentialed ACAS scan cadence & fail-closed OCSP stapling', 'ISSM_HUMAN', '2027-11-30', 'OPEN')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [condId, DEFAULT_TENANT_UUID, actualPkgId],
  );

  return { systemUuid: actualSysId, packageUuid: actualPkgId, inheritanceCount };
}

export async function persistCcvRunToMonitoringSql(ccv: CcvValidationResult): Promise<{ runUuid: string; driftInserted: number }> {
  const { sql } = await ensureEnterpriseSchema();
  await ensure0015TablesExist(sql);

  const polId = deterministicUuid("mon-policy:ccv-daily");
  await sql.query(
    `INSERT INTO monitoring.policies (id, tenant_id, metric, scope, cadence_hours, rule_version, escalation_target)
     VALUES ($1, $2, 'CONTINUOUS_CONTROL_EFFECTIVENESS', 'IA-2(1),AC-2(3),SC-13,SC-8,AU-9,CM-6,CP-9,SC-7', 24, 'CCV-1.0.0', 'issm-soc@noctis.gov')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [polId, DEFAULT_TENANT_UUID],
  );

  const runId = deterministicUuid(`mon-run:${ccv.snapshotSha256}`);
  await sql.query(
    `INSERT INTO monitoring.runs (id, tenant_id, policy_id, scheduled_at, completed_at, status, source_snapshot_hash)
     VALUES ($1, $2, $3, $4, $4, 'SUCCEEDED', $5)
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [runId, DEFAULT_TENANT_UUID, polId, ccv.assessedAt, ccv.snapshotSha256],
  );

  let driftInserted = 0;
  for (const ch of ccv.checks.filter((c) => c.paperComplianceDrift || c.liveTelemetryStatus === "INEFFECTIVE")) {
    const dId = deterministicUuid(`mon-drift:${ccv.snapshotSha256}:${ch.controlId}`);
    await sql.query(
      `INSERT INTO monitoring.drift_events (id, tenant_id, run_id, expected_state, observed_state, affected_assets, detected_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
       ON CONFLICT (tenant_id, id) DO NOTHING`,
      [
        dId,
        DEFAULT_TENANT_UUID,
        runId,
        JSON.stringify({ controlId: ch.controlId, sspClaim: ch.sspClaim, expected: "EFFECTIVE" }),
        JSON.stringify({ liveTelemetryStatus: ch.liveTelemetryStatus, paperComplianceDrift: ch.paperComplianceDrift, detail: ch.detail }),
        JSON.stringify([ch.controlId]),
        ccv.assessedAt,
      ],
    );
    driftInserted += 1;
  }

  return { runUuid: runId, driftInserted };
}

export async function persistKnowledgeGraphToSql(): Promise<{ nodesSynced: number; edgesSynced: number }> {
  const { sql } = await ensureEnterpriseSchema();
  await ensure0015TablesExist(sql);

  const g = queryComplianceKnowledgeGraph({ tenantId: "tenant:public-sandbox", maxClassification: "TS_SCI" });
  const nodeUuidByKey = new Map<string, string>();
  let nodesSynced = 0;
  for (const n of g.nodes) {
    const nUuid = deterministicUuid(`graph-node:${n.id}`);
    const entityUuid = deterministicUuid(`graph-entity:${n.id}`);
    const insertedNodes = await sql.query<{ id: string }>(
      `INSERT INTO graph.nodes (id, tenant_id, node_type, entity_id, label, attributes)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (tenant_id, node_type, entity_id) DO UPDATE SET label = EXCLUDED.label
       RETURNING id`,
      [nUuid, DEFAULT_TENANT_UUID, n.nodeType, entityUuid, n.label, JSON.stringify({ ...n.attributes, key: n.id, classification: n.classification })],
    );
    nodeUuidByKey.set(n.id, String(insertedNodes[0]?.id || nUuid));
    nodesSynced += 1;
  }

  let edgesSynced = 0;
  const nowIso = new Date().toISOString();
  for (const e of g.edges) {
    const sUuid = nodeUuidByKey.get(e.sourceId);
    const tUuid = nodeUuidByKey.get(e.targetId);
    if (!sUuid || !tUuid) continue;
    const eUuid = deterministicUuid(`graph-edge:${e.sourceId}:${e.relation}:${e.targetId}`);
    await sql.query(
      `INSERT INTO graph.edges (id, tenant_id, source_node_id, target_node_id, relation_type, provenance, valid_from)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       ON CONFLICT (id) DO NOTHING`,
      [eUuid, DEFAULT_TENANT_UUID, sUuid, tUuid, e.relation, JSON.stringify({ source: "noctis-compliance-graph", graphSha: g.graphSha256 }), nowIso],
    );
    edgesSynced += 1;
  }

  return { nodesSynced, edgesSynced };
}

export async function syncAllRelationalEnterpriseSchemas(opts: { triggeredBy?: string } = {}) {
  const triggeredBy = opts.triggeredBy || "enterprise-sync";
  const { sql } = await ensureEnterpriseSchema();
  await ensure0015TablesExist(sql);
  const ndkrsSql = await ensureNdkrsSchema();

  // 1. Enterprise Policy Bundles + Governance / RMF Twin
  const policyBundlesSynced = await syncPolicyBundlesToSql(triggeredBy);
  const twin = getDefaultAuthorizationTwin();
  const twinEval = evaluateAuthorizationTwin(twin);
  const { systemUuid, packageUuid, inheritanceCount } = await persistTwinToGovernanceSql(twin, twinEval);

  // 2. Assessment + RMF Evidence (Examining SC-13, IA-2(1), AC-2(3))
  const evSha = sha256Sync("RHEL9-FIPS-SCAP-EVIDENCE-2026");
  const evUuid = deterministicUuid("rmf-ev:SC-13:FIPS");
  await sql.query(
    `INSERT INTO rmf.evidence (id, tenant_id, system_id, control_id, origin, sha256, lifecycle_state, collected_at, payload)
     VALUES ($1, $2, $3, 'SC-13', 'SCAP-Compliance-Checker', $4, 'VERIFIED', now(), $5::jsonb)
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [evUuid, DEFAULT_TENANT_UUID, systemUuid, evSha, JSON.stringify({ fips_enabled: 1, stigRule: "V-257777" })],
  );

  const objOkId = deterministicUuid("assess-obj:SC-13:a");
  await sql.query(
    `INSERT INTO assessment.objective_results (id, tenant_id, package_id, control_id, objective_id, assessor_subject, evidence_id, method, determination)
     VALUES ($1, $2, $3, 'SC-13', 'SC-13(a)', 'sca-assessor@dod.mil', $4, 'TEST', 'SATISFIED')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [objOkId, DEFAULT_TENANT_UUID, packageUuid, evUuid],
  );

  const objFailId = deterministicUuid("assess-obj:AC-2(3):b");
  await sql.query(
    `INSERT INTO assessment.objective_results (id, tenant_id, package_id, control_id, objective_id, assessor_subject, method, determination)
     VALUES ($1, $2, $3, 'AC-2(3)', 'AC-02(03)(b)', 'sca-assessor@dod.mil', 'EXAMINE', 'OTHER_THAN_SATISFIED')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [objFailId, DEFAULT_TENANT_UUID, packageUuid],
  );

  const findingId = deterministicUuid("assess-finding:AC-2(3)");
  await sql.query(
    `INSERT INTO assessment.findings (id, tenant_id, objective_result_id, control_id, severity, cause, impact, status)
     VALUES ($1, $2, $3, 'AC-2(3)', 'HIGH', 'Manual IAM offboarding exceeded 24h SLA (38h observed)', 'Former user session exposure (+14h)', 'OPEN')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [findingId, DEFAULT_TENANT_UUID, objFailId],
  );

  const poamId = deterministicUuid("assess-poam:AC-2(3)");
  await sql.query(
    `INSERT INTO assessment.poam_items (id, tenant_id, finding_id, owner, milestones, deadline, status)
     VALUES ($1, $2, $3, 'ISSO-IAM-Team', $4::jsonb, '2026-12-22', 'IN_PROGRESS')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [
      poamId,
      DEFAULT_TENANT_UUID,
      findingId,
      JSON.stringify(["1. Enable SCIM termination webhook", "2. Re-test disablement latency <= 15m"]),
    ],
  );

  // 3. Monitoring (CCV sample baseline + drift row)
  const ccvSample = runContinuousControlValidation(
    {
      phishingResistantMfaEnforced: true,
      maxTerminationDisablementHours: 38,
      fips140KernelModeEnabled: true,
      ocspFailClosedEnabled: true,
      siemTlsForwardingActive: true,
      privilegedContainersPresent: false,
      lastBackupRestoreDrillDaysAgo: 18,
      defaultDenyNetworkPoliciesActive: true,
    },
    { "AC-2(3)": "Implemented" },
  );
  const { driftInserted } = await persistCcvRunToMonitoringSql(ccvSample);

  // 4. Cyber Assets, Vulnerabilities (STIGs + KEV), Findings, Attack Paths, Risk Scenarios & Full SBOM
  let primaryAssetUuid = deterministicUuid(`cyber-asset:${twin.components[0]!.id}`);
  for (const comp of twin.components) {
    const aUuid = deterministicUuid(`cyber-asset:${comp.id}`);
    await sql.query(
      `INSERT INTO cyber.assets (id, tenant_id, system_id, asset_key, asset_type, criticality, attributes)
       VALUES ($1, $2, $3, $4, $5, 'HIGH', $6::jsonb)
       ON CONFLICT (tenant_id, system_id, asset_key) DO NOTHING`,
      [aUuid, DEFAULT_TENANT_UUID, systemUuid, comp.id, comp.category, JSON.stringify({ name: comp.name, classification: comp.classification })],
    );
  }
  const aRow = await sql.query<{ id: string }>(
    "SELECT id FROM cyber.assets WHERE tenant_id = $1 AND system_id = $2 LIMIT 1",
    [DEFAULT_TENANT_UUID, systemUuid],
  );
  if (aRow[0]?.id) primaryAssetUuid = aRow[0].id;

  const kevVulnId = deterministicUuid("cyber-vuln:CVE-2024-3400");
  await sql.query(
    `INSERT INTO cyber.vulnerabilities (id, vulnerability_key, title, is_kev, metadata)
     VALUES ($1, 'CVE-2024-3400', 'PAN-OS GlobalProtect Command Injection (CISA KEV)', true, $2::jsonb)
     ON CONFLICT (vulnerability_key) DO NOTHING`,
    [kevVulnId, JSON.stringify({ cvss3: 10.0, cwe: ["CWE-78", "CWE-73"] })],
  );
  const kvRow = await sql.query<{ id: string }>(
    "SELECT id FROM cyber.vulnerabilities WHERE vulnerability_key = 'CVE-2024-3400' LIMIT 1",
  );
  const actualKevUuid = kvRow[0]?.id || kevVulnId;

  for (const rule of searchStigLibrary({ limit: 100 })) {
    const vUuid = deterministicUuid(`cyber-vuln:${rule.groupId}`);
    await sql.query(
      `INSERT INTO cyber.vulnerabilities (id, vulnerability_key, title, is_kev, metadata)
       VALUES ($1, $2, $3, false, $4::jsonb)
       ON CONFLICT (vulnerability_key) DO NOTHING`,
      [vUuid, rule.groupId, rule.title, JSON.stringify({ benchmark: rule.benchmarkId, severity: rule.severity, nistRev5: rule.nistRev5Controls })],
    );
  }

  const afUuid = deterministicUuid("cyber-finding:CVE-2024-3400:MITIGATED");
  await sql.query(
    `INSERT INTO cyber.asset_findings (id, tenant_id, asset_id, vulnerability_id, first_seen, last_seen, status, evidence_id)
     VALUES ($1, $2, $3, $4, now(), now(), 'MITIGATED', $5)
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [afUuid, DEFAULT_TENANT_UUID, primaryAssetUuid, actualKevUuid, evUuid],
  );

  const apUuid = deterministicUuid("cyber-attack-path:scca-choke-01");
  await sql.query(
    `INSERT INTO cyber.attack_paths (id, tenant_id, path_nodes, graph_version, exposure_facts, assumptions)
     VALUES ($1, $2, $3::jsonb, 'TWIN-2.0', $4::jsonb, $5::jsonb)
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [
      apUuid,
      DEFAULT_TENANT_UUID,
      JSON.stringify(["PERIMETER-GW", "COMP-GW-01", "COMP-API-01", "COMP-DB-01"]),
      JSON.stringify(["Protected behind SCCA BCAP + fail-closed OCSP"]),
      JSON.stringify(["HYPOTHETICAL_SIMULATED_PATH"]),
    ],
  );

  const rsUuid = deterministicUuid("cyber-risk-scenario:cred-access-01");
  await sql.query(
    `INSERT INTO cyber.risk_scenarios (id, tenant_id, threat_description, likelihood_model, impact_model, uncertainty_notes, model_version)
     VALUES ($1, $2, 'Lateral movement via unrevoked separated user session (AC-2(3) drift)', 'MITRE ATT&CK T1078 Empirical Rate', 'CNSSI 1253 High Water Mark Impact', 'Bounded by 24h vs 38h observed disablement delta', 'NOCTIS-RISK-2.0')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [rsUuid, DEFAULT_TENANT_UUID],
  );

  const sbomPkgs = getAllProductionSbomComponents();
  for (const pkg of sbomPkgs) {
    const sUuid = deterministicUuid(`sbom:${pkg.name}:${pkg.version}`);
    await sql.query(
      `INSERT INTO cyber.sbom_components (id, tenant_id, asset_id, package_name, version, supplier, sha256, license)
       VALUES ($1, $2, $3, $4, $5, 'npm-registry', $6, 'MIT/Apache-2.0')
       ON CONFLICT (tenant_id, id) DO NOTHING`,
      [sUuid, DEFAULT_TENANT_UUID, primaryAssetUuid, pkg.name, pkg.version, sha256Sync(`${pkg.name}@${pkg.version}`)],
    );
  }

  // 5. Graph Nodes & Edges
  const { nodesSynced, edgesSynced } = await persistKnowledgeGraphToSql();

  // 6. Bounded Agents, Intelligence Lineages, Training & Security Audit
  for (const ag of listGovernedAgents()) {
    const runUuid = deterministicUuid(`agent-run:${ag.agentId}:init`);
    await sql.query(
      `INSERT INTO agents.runs (id, tenant_id, agent_name, task_name, model_id, tools_used, inputs, outputs, status)
       VALUES ($1, $2, $3, 'Governance & Verification Alignment Probe', 'noctis-deterministic-core', $4::jsonb, '{}'::jsonb, $5::jsonb, 'ESCALATED_FOR_HUMAN_REVIEW')
       ON CONFLICT (tenant_id, id) DO NOTHING`,
      [runUuid, DEFAULT_TENANT_UUID, ag.agentId, JSON.stringify(ag.allowedTools), JSON.stringify({ canIssueAto: false, canApproveConsequential: false })],
    );
    const decUuid = deterministicUuid(`agent-dec:${ag.agentId}:init`);
    await sql.query(
      `INSERT INTO agents.review_decisions (id, tenant_id, run_id, reviewer_subject, outcome, reason)
       VALUES ($1, $2, $3, 'issm-reviewer@dod.mil', 'APPROVED', 'Permission envelope verified: human authorization mandatory for consequential changes.')
       ON CONFLICT (tenant_id, id) DO NOTHING`,
      [decUuid, DEFAULT_TENANT_UUID, runUuid],
    );
  }

  for (const lin of listDirectiveLineages()) {
    const dUuid = deterministicUuid(`intel-diff:${lin.policyId}:${lin.currentEffectiveDate}`);
    await sql.query(
      `INSERT INTO intelligence.policy_diffs (id, old_version, new_version, changes, impact_summary)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        dUuid,
        `${lin.policyId} (${lin.priorVersion})`,
        `${lin.policyId} (${lin.currentVersion})`,
        JSON.stringify({ added: lin.addedRequirements, deprecated: lin.deprecatedOrSuperseded }),
        JSON.stringify({ severity: lin.severity, impactedControls: lin.impactedNistControls }),
      ],
    );
  }

  const explUuid = deterministicUuid("intel-expl:enterprise-sync-01");
  await sql.query(
    `INSERT INTO intelligence.explanation_bundles (id, tenant_id, evaluation_ref, source_hashes, rule_trace, canonical_sha256)
     VALUES ($1, $2, 'ENTERPRISE-RELATIONAL-SYNC', $3::jsonb, $4::jsonb, $5)
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [
      explUuid,
      DEFAULT_TENANT_UUID,
      JSON.stringify({ rmfDb: "5.2.0", disaCci: "2025-01-23" }),
      JSON.stringify(["PAC-IL5-001", "DOD-ZT-7PILLAR-001", "CRIT-046", "CRIT-047"]),
      twinEval.snapshotSha256,
    ],
  );

  const dsUuid = deterministicUuid("train-ds:clinical-safety-2026");
  await sql.query(
    `INSERT INTO training.dataset_versions (id, manifest, split, hashes, approved_by)
     VALUES ($1, $2::jsonb, 'eval_holdout', $3::jsonb, 'clinical-safety-board@noctis.gov')
     ON CONFLICT (id) DO NOTHING`,
    [dsUuid, JSON.stringify({ suite: "NH-AI-001..016 + CRIT-046 + CRIT-047", cases: 30 }), JSON.stringify({ sha256: twinEval.snapshotSha256 })],
  );

  const fbUuid = deterministicUuid("train-fb:crit-047-remediation");
  await sql.query(
    `INSERT INTO training.feedback (id, tenant_id, original_output, correction, reviewer_subject, human_approved)
     VALUES ($1, $2, 'Historic baseline creatinine 1.4 swapped as current', 'Typed current (3.6 mg/dL) vs historical_baseline (1.4 mg/dL 5 days ago) with exact char source spans', 'clinical-safety-board@noctis.gov', true)
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [fbUuid, DEFAULT_TENANT_UUID],
  );

  const secUuid = deterministicUuid(`sec-audit:${triggeredBy}:sync`);
  await sql.query(
    `INSERT INTO security.audit_events (id, tenant_id, actor_subject, action, target_ref, before_hash, after_hash)
     VALUES ($1, $2, $3, 'RELATIONAL_SCHEMA_SYNC', 'enterprise+0015-schemas', $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [secUuid, DEFAULT_TENANT_UUID, triggeredBy, sha256Sync("BEFORE_SYNC"), twinEval.snapshotSha256],
  );

  // 7. Synthetic Encrypted AES-256-GCM Clinical Enclave Regression Anchors + Roundtrip Decrypt Check
  const enclaveSeedA = { syntheticTestId: "NOCTIS-ICU-CRIT-046", creatinineMgDl: 2.7, baselineCreatinineMgDl: 1.3, timeframe: "3 months ago", kdigoStage: 2, syntheticNonPhi: true };
  const enclaveSeedB = { syntheticTestId: "NOCTIS-ICU-CRIT-047", creatinineMgDl: 3.6, baselineCreatinineMgDl: 1.4, timeframe: "5 days ago", kdigoStage: 2, syntheticNonPhi: true };
  const encA = await storeEncryptedClinicalEnclaveRecord({ tenantId: "tenant:clinical-regression", encounterId: "CRIT-046-SYNTH", payload: enclaveSeedA });
  const encB = await storeEncryptedClinicalEnclaveRecord({ tenantId: "tenant:clinical-regression", encounterId: "CRIT-047-SYNTH", payload: enclaveSeedB });

  const verifyRow = await ndkrsSql.query<Record<string, unknown>>(
    "SELECT id, tenant_id, encounter_id, encrypted_payload_b64, iv_b64, auth_tag_b64, key_version, payload_sha256 FROM ndkrs.clinical_enclave_records WHERE id = $1 LIMIT 1",
    [encA.id],
  );
  let enclaveDecryptVerified = false;
  if (verifyRow[0]) {
    const decrypted = decryptClinicalPayload(
      {
        encryptedPayloadB64: String(verifyRow[0].encrypted_payload_b64),
        ivB64: String(verifyRow[0].iv_b64),
        authTagB64: String(verifyRow[0].auth_tag_b64),
        keyVersion: String(verifyRow[0].key_version),
        payloadSha256: String(verifyRow[0].payload_sha256),
      },
      `${verifyRow[0].tenant_id}::${verifyRow[0].encounter_id}`,
    );
    enclaveDecryptVerified = decrypted.creatinineMgDl === 2.7;
  }

  // 8. Persisted Baseline Operational Telemetry Events
  const baselineTelemetryCount = await persistTelemetryEvents("INGEST-BASELINE-BOOT", [
    {
      eventId: "TEL-BOOT-SYSLOG-01",
      detectedProtocol: "SYSLOG_RFC5424",
      targetSovereignSuite: "noctis-cyber",
      sqdecPillar: "Control",
      severity: "INFORMATIONAL",
      summary: "Centralized TLS syslog audit collector heartbeat healthy on il5-siem-01.",
      auditSha256: sha256Sync("TEL-BOOT-SYSLOG-01"),
      normalizedEntities: { hostname: "il5-siem-01.dod.mil" },
    },
    {
      eventId: "TEL-BOOT-ACAS-02",
      detectedProtocol: "ACAS_NESSUS_SCAN",
      targetSovereignSuite: "noctis-rmf",
      sqdecPillar: "Quality",
      severity: "HIGH",
      summary: "Credentialed ACAS baseline scan verified zero overdue CISA KEV items.",
      auditSha256: sha256Sync("TEL-BOOT-ACAS-02"),
      normalizedEntities: { hostname: "enclave-app-01.dod.mil" },
    },
    {
      eventId: "TEL-BOOT-SCAP-03",
      detectedProtocol: "DISA_STIG_SCAP",
      targetSovereignSuite: "noctis-rmf",
      sqdecPillar: "Safety",
      severity: "LOW",
      summary: "RHEL 9 V-257777 FIPS 140 kernel check passed (fips_enabled=1).",
      auditSha256: sha256Sync("TEL-BOOT-SCAP-03"),
      normalizedEntities: { hostname: "rhel9-node-01.dod.mil" },
    },
  ]);

  return {
    ok: true,
    policyBundlesSynced,
    inheritanceCount,
    driftInserted,
    nodesSynced,
    edgesSynced,
    sbomComponentsSynced: sbomPkgs.length,
    clinicalEnclaveIds: [encA.id, encB.id],
    enclaveDecryptVerified,
    baselineTelemetryCount,
  };
}
