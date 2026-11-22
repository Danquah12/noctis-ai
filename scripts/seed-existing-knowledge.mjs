#!/usr/bin/env node
/**
 * Idempotently populates all legacy/RMF knowledge & command tables in Managed Neon PostgreSQL:
 *  - public.rmf_controls & public.rmf_control_enhancements
 *  - public.rmf_baselines & public.rmf_baseline_controls
 *  - public.rmf_control_parameters (SP 800-53 params + FedRAMP ODPs)
 *  - public.rmf_assessment_objectives & public.rmf_assessment_procedures
 *  - public.rmf_crosswalks (NIST 800-53 <-> MITRE ATT&CK)
 *  - public.vibe_training_pair
 *  - public.source_provider & public.safety_case
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[seed-existing-knowledge] DATABASE_URL is not set.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cleanText = (v) => String(v ?? "").replace(/\u0000/g, "");

async function batchUpsert(client, tableClause, columns, rows, conflictClause, batchSize = 250) {
  if (!rows.length) return 0;
  const colCount = columns.length;
  let processed = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = [];
    const tuples = [];
    let paramIdx = 1;
    for (const row of chunk) {
      const placeholders = [];
      for (let c = 0; c < colCount; c++) {
        placeholders.push(`$${paramIdx++}`);
        values.push(row[c]);
      }
      tuples.push(`(${placeholders.join(",")})`);
    }
    const sql = `INSERT INTO ${tableClause} (${columns.join(",")}) VALUES ${tuples.join(",")} ${conflictClause}`;
    await client.query(sql, values);
    processed += chunk.length;
  }
  return processed;
}

const AUTHORITATIVE_SOURCE_PROVIDERS = [
  { id: "nist-csrc-800-53r5", label: "NIST SP 800-53 Rev. 5 / 53A / 53B", kind: "federal_standard", href: "https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final", note: "Security and privacy controls, assessment procedures, and federal baselines" },
  { id: "nist-800-171r3", label: "NIST SP 800-171 Rev. 3 (CUI)", kind: "federal_standard", href: "https://csrc.nist.gov/publications/detail/sp/800-171/rev-3/final", note: "Protecting Controlled Unclassified Information in nonfederal systems" },
  { id: "nist-csf-2", label: "NIST Cybersecurity Framework (CSF) 2.0", kind: "federal_standard", href: "https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final", note: "Govern, Identify, Protect, Detect, Respond, Recover outcomes" },
  { id: "fedramp-rev5", label: "FedRAMP Rev. 5 Baselines & ODPs", kind: "federal_authorization", href: "https://www.fedramp.gov/baselines/", note: "Agency and JAB cloud authorization baselines and organization-defined parameters" },
  { id: "cisa-kev", label: "CISA Known Exploited Vulnerabilities (KEV)", kind: "threat_intel", href: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", note: "Binding operational directive BOD 22-01 authoritative vulnerability catalog" },
  { id: "mitre-attack-v15", label: "MITRE ATT&CK Enterprise v15", kind: "threat_intel", href: "https://attack.mitre.org/", note: "Adversary tactics, techniques, and NIST SP 800-53 control mappings" },
  { id: "nvd-cve-api", label: "NVD / MITRE CVE Program", kind: "threat_intel", href: "https://nvd.nist.gov/", note: "Authoritative CVE vulnerability identifiers, CVSS vectors, and CPE ranges" },
  { id: "kdigo-aki-2012", label: "KDIGO 2012 Acute Kidney Injury Guideline", kind: "clinical_guideline", href: "https://kdigo.org/guidelines/acute-kidney-injury/", note: "Dual-pathway serum creatinine & urine output AKI staging rules" },
  { id: "ssc-sepsis-2021", label: "Surviving Sepsis Campaign 2021", kind: "clinical_guideline", href: "https://www.sccm.org/SurvivingSepsisCampaign/Guidelines/Adult-Patients", note: "Hemodynamic resuscitation, MAP >= 65 mmHg, and lactate clearance" },
  { id: "fda-cds-21usc360j", label: "FDA Non-Device CDS Guidance / 21 U.S.C. 360j(o)(1)(E)", kind: "regulatory_statute", href: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software", note: "Four-factor statutory test distinguishing Non-Device CDS from SaMD" },
  { id: "ecfr-hipaa-164", label: "eCFR 45 CFR Part 164 (HIPAA Security & Privacy)", kind: "regulatory_statute", href: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164", note: "Administrative, physical, and technical safeguards for ePHI" },
  { id: "pubmed-ncbi", label: "NCBI PubMed / Medline", kind: "scientific_literature", href: "https://pubmed.ncbi.nlm.nih.gov/", note: "Peer-reviewed biomedical citations and clinical evidence lookups" },
];

const INITIAL_SAFETY_CASES = [
  { caseNo: "SN-10421", category: "spam", priority: "normal", targetKind: "post", targetId: "feed-1", reason: "Repeated unsolicited clinic promo", ai: 72, reports: 6, assigned: "Queue" },
  { caseNo: "SN-10488", category: "copyright", priority: "high", targetKind: "post", targetId: "mu-hymn-grace", reason: "Claim on a recording — embed-only check", ai: 64, reports: 2, assigned: "Queue" },
  { caseNo: "SN-10502", category: "impersonation", priority: "high", targetKind: "user", targetId: "kofi", reason: "Username mimics a faculty clinic", ai: 81, reports: 4, assigned: "Queue" },
  { caseNo: "SN-10519", category: "fraud", priority: "urgent", targetKind: "job", targetId: "h-cisa", reason: "Off-board recruiter asking for fees", ai: 90, reports: 9, assigned: "Queue" },
  { caseNo: "SN-10540", category: "harassment", priority: "high", targetKind: "user", targetId: "nia", reason: "Targeted comments after a CTF drop", ai: 77, reports: 11, assigned: "Queue" },
];

async function main() {
  const rmf = JSON.parse(readFileSync(join(root, "src", "data", "rmf-deterministic-db.json"), "utf8"));
  const training = JSON.parse(readFileSync(join(root, "data", "vibe-training.json"), "utf8"));

  const allControls = Object.values(rmf.controls || {});
  const baseControls = allControls.filter((c) => !c.parentId);
  const enhancements = allControls.filter((c) => Boolean(c.parentId));
  const pairs = Array.isArray(training) ? training : [];

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const seenBase = new Set();
    const baseRows = [];
    for (const c of baseControls) {
      const id = cleanText(c.id).trim();
      if (!id || seenBase.has(id)) continue;
      seenBase.add(id);
      baseRows.push([
        id,
        cleanText(c.family),
        cleanText(c.familyTitle),
        cleanText(c.title),
        cleanText(c.statement),
        cleanText(c.guidance),
        Boolean(c.withdrawn),
        Array.isArray(c.withdrawnInto) ? c.withdrawnInto.map(cleanText) : [],
        Array.isArray(c.related) ? c.related.map(cleanText) : [],
      ]);
    }
    const baseInserted = await batchUpsert(
      client,
      "public.rmf_controls",
      ["control_id", "family_id", "family_title", "title", "statement", "guidance", "withdrawn", "withdrawn_into", "related_controls"],
      baseRows,
      `ON CONFLICT (control_id) DO UPDATE SET
         title = EXCLUDED.title,
         statement = EXCLUDED.statement,
         guidance = EXCLUDED.guidance,
         withdrawn = EXCLUDED.withdrawn,
         updated_at = now()`,
      150,
    );

    const seenEnh = new Set();
    const enhRows = [];
    for (const e of enhancements) {
      const id = cleanText(e.id).trim();
      if (!id || seenEnh.has(id)) continue;
      seenEnh.add(id);
      enhRows.push([
        id,
        cleanText(e.parentId),
        cleanText(e.title),
        cleanText(e.statement),
        cleanText(e.guidance),
        Boolean(e.withdrawn),
        Array.isArray(e.withdrawnInto) ? e.withdrawnInto.map(cleanText) : [],
      ]);
    }
    const enhInserted = await batchUpsert(
      client,
      "public.rmf_control_enhancements",
      ["enhancement_id", "parent_control_id", "title", "statement", "guidance", "withdrawn", "withdrawn_into"],
      enhRows,
      `ON CONFLICT (enhancement_id) DO UPDATE SET
         title = EXCLUDED.title,
         statement = EXCLUDED.statement,
         guidance = EXCLUDED.guidance,
         withdrawn = EXCLUDED.withdrawn`,
      150,
    );

    // Baselines
    const baselineCatalog = [
      ["LOW", "NIST SP 800-53B Low-Impact Baseline", "LOW", "federal_baseline", "NIST SP 800-53B"],
      ["MODERATE", "NIST SP 800-53B Moderate-Impact Baseline", "MODERATE", "federal_baseline", "NIST SP 800-53B"],
      ["HIGH", "NIST SP 800-53B High-Impact Baseline", "HIGH", "federal_baseline", "NIST SP 800-53B"],
      ["PRIVACY", "NIST SP 800-53B Privacy Control Baseline", "PRIVACY", "privacy_baseline", "NIST SP 800-53B"],
      ["CUI", "NIST SP 800-171 Rev. 3 CUI Baseline", "CUI", "cui_overlay", "NIST SP 800-171r3"],
    ];
    const baselinesInserted = await batchUpsert(
      client,
      "public.rmf_baselines",
      ["baseline_id", "name", "impact_level", "overlay_type", "governing_source"],
      baselineCatalog,
      `ON CONFLICT (baseline_id) DO UPDATE SET
         name = EXCLUDED.name,
         impact_level = EXCLUDED.impact_level,
         overlay_type = EXCLUDED.overlay_type,
         governing_source = EXCLUDED.governing_source`,
    );

    // Baseline <-> Controls, Parameters, Objectives, Procedures
    const baselineControlSet = new Set();
    const baselineControlRows = [];
    const paramKeySet = new Set();
    const paramRows = [];
    const objKeySet = new Set();
    const objRows = [];
    const procKeySet = new Set();
    const procRows = [];

    for (const c of allControls) {
      const cid = cleanText(c.id).trim();
      if (!cid) continue;
      for (const b of c.baselines || []) {
        const bid = cleanText(b).trim().toUpperCase();
        if (!["LOW", "MODERATE", "HIGH", "PRIVACY", "CUI"].includes(bid)) continue;
        const key = `${bid}::${cid}`;
        if (!baselineControlSet.has(key)) {
          baselineControlSet.add(key);
          baselineControlRows.push([bid, cid]);
        }
      }
      for (const prm of c.params || []) {
        const pid = cleanText(prm?.id).trim();
        if (!pid) continue;
        const pKey = `${cid}::${pid}::NIST_800_53B_CORE`;
        if (!paramKeySet.has(pKey)) {
          paramKeySet.add(pKey);
          paramRows.push([pid, cid, "NIST_800_53B_CORE", cleanText(prm?.label), "", ""]);
        }
      }
      let objIdx = 0;
      for (const rawObj of c.objectives || []) {
        const text = cleanText(rawObj).trim();
        if (!text) continue;
        objIdx += 1;
        const leading = text.split(/\s+/)[0] || `OBJ_${objIdx}`;
        let objId = `${cid}:${leading}`;
        if (objKeySet.has(objId)) {
          objId = `${cid}:${leading}:${objIdx}`;
        }
        objKeySet.add(objId);
        objRows.push([objId, cid, text]);
      }
      if (c.methods && typeof c.methods === "object") {
        for (const [mKey, mEnum] of [
          ["examine", "EXAMINE"],
          ["interview", "INTERVIEW"],
          ["test", "TEST"],
        ]) {
          const desc = cleanText(c.methods[mKey]).trim();
          const procId = `${cid}:${mEnum}`;
          if (desc && !procKeySet.has(procId)) {
            procKeySet.add(procId);
            procRows.push([procId, cid, mEnum, desc]);
          }
        }
      }
    }

    // Add FedRAMP Rev. 5 Organization-Defined Parameters (ODPs) into rmf_control_parameters
    for (const [ctrlIdRaw, odp] of Object.entries(rmf.fedrampOdps || {})) {
      const cid = cleanText(ctrlIdRaw).trim();
      if (!cid || !odp || typeof odp !== "object") continue;
      for (const [level, baselineId] of [
        ["low", "FEDRAMP_LOW"],
        ["moderate", "FEDRAMP_MODERATE"],
        ["high", "FEDRAMP_HIGH"],
      ]) {
        const val = cleanText(odp[level]).trim();
        if (!val) continue;
        const paramId = `${cid.toLowerCase()}_fedramp_odp`;
        const pKey = `${cid}::${paramId}::${baselineId}`;
        if (!paramKeySet.has(pKey)) {
          paramKeySet.add(pKey);
          paramRows.push([paramId, cid, baselineId, `FedRAMP ${level.toUpperCase()} ODP`, val, cleanText(odp.sla)]);
        }
      }
    }

    // Add CUI NIST 800-171 control mappings to CUI baseline & crosswalks
    const crosswalkRows = [];
    const crosswalkKeySet = new Set();
    for (const [cuiId, item] of Object.entries(rmf.cui800171 || {})) {
      const cid = cleanText(cuiId).trim();
      if (cid) {
        const bKey = `CUI::${cid}`;
        if (!baselineControlSet.has(bKey)) {
          baselineControlSet.add(bKey);
          baselineControlRows.push(["CUI", cid]);
        }
      }
      if (item && typeof item === "object" && Array.isArray(item.mapped80053)) {
        for (const nistId of item.mapped80053) {
          const src = cleanText(nistId).trim();
          const edgeId = `NIST80053:${src}->NIST800171:${cid}`;
          if (src && cid && !crosswalkKeySet.has(edgeId)) {
            crosswalkKeySet.add(edgeId);
            crosswalkRows.push([edgeId, "NIST_800_53_R5", src, "NIST_800_171_R3", cid, cleanText(item.title), "satisfies_cui", "NIST SP 800-171r3 CUI Crosswalk"]);
          }
        }
      }
    }

    for (const [ctrlId, attacks] of Object.entries(rmf.attackByControl || {})) {
      const src = cleanText(ctrlId).trim();
      if (!src || !Array.isArray(attacks)) continue;
      for (const att of attacks) {
        const dstId = cleanText(att?.id).trim();
        const dstName = cleanText(att?.name).trim();
        if (!dstId) continue;
        const edgeId = `NIST80053:${src}->ATTACK:${dstId}`;
        if (!crosswalkKeySet.has(edgeId)) {
          crosswalkKeySet.add(edgeId);
          crosswalkRows.push([edgeId, "NIST_800_53_R5", src, "MITRE_ATTACK", dstId, dstName, "mitigates_technique", "MITRE CTID Security Control Framework Mappings"]);
        }
      }
    }

    const baselineControlsInserted = await batchUpsert(
      client,
      "public.rmf_baseline_controls",
      ["baseline_id", "control_id"],
      baselineControlRows,
      "ON CONFLICT (baseline_id, control_id) DO NOTHING",
    );

    const paramsInserted = await batchUpsert(
      client,
      "public.rmf_control_parameters",
      ["param_id", "control_id", "baseline_id", "label", "odp_value", "unit"],
      paramRows,
      `ON CONFLICT (control_id, param_id, baseline_id) DO UPDATE SET
         label = EXCLUDED.label,
         odp_value = EXCLUDED.odp_value,
         unit = EXCLUDED.unit`,
    );

    const objectivesInserted = await batchUpsert(
      client,
      "public.rmf_assessment_objectives",
      ["objective_id", "control_id", "determination_statement"],
      objRows,
      `ON CONFLICT (objective_id) DO UPDATE SET determination_statement = EXCLUDED.determination_statement`,
    );

    const proceduresInserted = await batchUpsert(
      client,
      "public.rmf_assessment_procedures",
      ["procedure_id", "control_id", "method", "objects_text"],
      procRows,
      `ON CONFLICT (procedure_id) DO UPDATE SET objects_text = EXCLUDED.objects_text`,
    );

    const crosswalksInserted = await batchUpsert(
      client,
      "public.rmf_crosswalks",
      ["edge_id", "src_framework", "src_id", "dst_framework", "dst_id", "dst_name", "relation", "provenance"],
      crosswalkRows,
      `ON CONFLICT (edge_id) DO UPDATE SET dst_name = EXCLUDED.dst_name, provenance = EXCLUDED.provenance`,
    );

    const pairRows = [];
    for (const p of pairs) {
      const q = cleanText(p.question).trim();
      const a = cleanText(p.answer).trim();
      if (!q || !a) continue;
      const id =
        p.id && cleanText(p.id).trim()
          ? cleanText(p.id).trim()
          : `vt-${createHash("sha256").update(q.toLowerCase()).digest("hex").slice(0, 16)}`;
      pairRows.push([
        id,
        q.slice(0, 600),
        a.slice(0, 6000),
        cleanText(p.domain || "general"),
        cleanText(p.model || "vibe-seed"),
        Number(p.hits || 1),
        true,
      ]);
    }
    const pairsInserted = await batchUpsert(
      client,
      "public.vibe_training_pair",
      ["id", "question", "answer", "domain", "model", "hits", "verified"],
      pairRows,
      "ON CONFLICT (id) DO NOTHING",
      150,
    );

    const sourceRows = AUTHORITATIVE_SOURCE_PROVIDERS.map((s) => [
      cleanText(s.id),
      cleanText(s.label),
      cleanText(s.kind),
      cleanText(s.href),
      cleanText(s.note),
    ]);
    const sourcesInserted = await batchUpsert(
      client,
      "public.source_provider",
      ["id", "label", "kind", "href", "note"],
      sourceRows,
      `ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         kind = EXCLUDED.kind,
         href = EXCLUDED.href,
         note = EXCLUDED.note`,
    );

    const safetyCaseRows = INITIAL_SAFETY_CASES.map((c) => [
      cleanText(c.caseNo),
      cleanText(c.category),
      cleanText(c.priority),
      "open",
      cleanText(c.targetKind),
      cleanText(c.targetId),
      cleanText(c.reason),
      Number(c.ai),
      Number(c.reports),
      cleanText(c.assigned),
    ]);
    const safetyCasesInserted = await batchUpsert(
      client,
      "public.safety_case",
      ["case_no", "category", "priority", "status", "target_kind", "target_id", "reason", "ai_score", "reports", "assigned"],
      safetyCaseRows,
      "ON CONFLICT (case_no) DO NOTHING",
    );

    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        ok: true,
        baseControlsSeeded: baseInserted,
        controlEnhancementsSeeded: enhInserted,
        baselinesSeeded: baselinesInserted,
        baselineControlsSeeded: baselineControlsInserted,
        controlParametersSeeded: paramsInserted,
        assessmentObjectivesSeeded: objectivesInserted,
        assessmentProceduresSeeded: proceduresInserted,
        crosswalksSeeded: crosswalksInserted,
        vibeTrainingPairsSeeded: pairsInserted,
        sourceProvidersSeeded: sourcesInserted,
        safetyCasesSeeded: safetyCasesInserted,
      }),
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed-existing-knowledge] Failed:", err?.message || err);
  process.exit(1);
});
