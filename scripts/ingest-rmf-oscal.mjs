#!/usr/bin/env node
/**
 * Noctis Deterministic RMF Authoritative Knowledge Ingestion Pipeline (Option B)
 *
 * Downloads version-pinned machine-readable standards directly from official
 * NIST OSCAL Content and MITRE Center for Threat-Informed Defense repositories,
 * verifies SHA-256 digests, resolves OSCAL parameter references & baselines,
 * and compiles `src/data/rmf-deterministic-db.json` for zero-hallucination Chat
 * verification and SFT/DPO training dataset generation.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "src", "data", "rmf-deterministic-db.json");

const SOURCES = {
  sp80053: {
    id: "nist-sp-800-53-r5.2.0",
    title: "NIST SP 800-53 Rev. 5.2.0 & SP 800-53A Rev. 5.2.0 OSCAL Catalog",
    url: "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog-min.json",
  },
  baselineLow: {
    id: "nist-sp-800-53b-low",
    title: "NIST SP 800-53B Low Impact Baseline Profile",
    url: "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_LOW-baseline_profile-min.json",
  },
  baselineMod: {
    id: "nist-sp-800-53b-moderate",
    title: "NIST SP 800-53B Moderate Impact Baseline Profile",
    url: "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_MODERATE-baseline_profile-min.json",
  },
  baselineHigh: {
    id: "nist-sp-800-53b-high",
    title: "NIST SP 800-53B High Impact Baseline Profile",
    url: "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_HIGH-baseline_profile-min.json",
  },
  baselinePrivacy: {
    id: "nist-sp-800-53b-privacy",
    title: "NIST SP 800-53B Privacy Baseline Profile",
    url: "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_PRIVACY-baseline_profile-min.json",
  },
  sp800171: {
    id: "nist-sp-800-171-r3",
    title: "NIST SP 800-171 Rev. 3 CUI Requirements OSCAL Catalog",
    url: "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-171/rev3/json/NIST_SP800-171_rev3_catalog-min.json",
  },
  csf2: {
    id: "nist-csf-2.0",
    title: "NIST Cybersecurity Framework (CSF) 2.0 OSCAL Catalog",
    url: "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/CSF/v2.0/json/NIST_CSF_v2.0_catalog-min.json",
  },
  mitreAttack: {
    id: "mitre-ctid-attack-16.1",
    title: "MITRE CTID ATT&CK v16.1 Enterprise <-> NIST SP 800-53 Rev. 5 Mappings",
    url: "https://raw.githubusercontent.com/center-for-threat-informed-defense/mappings-explorer/main/mappings/nist_800_53/attack-16.1/nist_800_53-rev5/enterprise/nist_800_53-rev5_attack-16.1-enterprise.json",
  },
  fedrampLow: {
    id: "fedramp-rev5-low-oscal",
    title: "FedRAMP Rev. 5 Low Impact Baseline OSCAL Profile",
    url: "https://raw.githubusercontent.com/oscal-compass-lab/fedramp-automation/master/dist/content/rev5/baselines/json/FedRAMP_rev5_LOW-baseline_profile-min.json",
  },
  fedrampMod: {
    id: "fedramp-rev5-moderate-oscal",
    title: "FedRAMP Rev. 5 Moderate Impact Baseline OSCAL Profile",
    url: "https://raw.githubusercontent.com/oscal-compass-lab/fedramp-automation/master/dist/content/rev5/baselines/json/FedRAMP_rev5_MODERATE-baseline_profile-min.json",
  },
  fedrampHigh: {
    id: "fedramp-rev5-high-oscal",
    title: "FedRAMP Rev. 5 High Impact Baseline OSCAL Profile",
    url: "https://raw.githubusercontent.com/oscal-compass-lab/fedramp-automation/master/dist/content/rev5/baselines/json/FedRAMP_rev5_HIGH-baseline_profile-min.json",
  },
};

const FEDRAMP_ODPS = {
  "AC-2": {
    low: "Review accounts at least annually (ac-02_odp.10); notify account managers/ISSO within 24h when accounts are no longer required or users terminated/transferred.",
    moderate: "Review accounts monthly for privileged access and every 6 months for non-privileged access (ac-02_odp.10); notify within 24h when no longer required (ac-02_odp.06) and 12h on termination/transfer (ac-02_odp.07); disable user accounts within 24h per AC-2(3).",
    high: "Review accounts monthly for privileged access and every 6 months for non-privileged access (ac-02_odp.10); notify account managers/designated roles within 24h when accounts are no longer required (ac-02_odp.06) and within 8h when users are terminated/transferred (ac-02_odp.07); disable separated user accounts within 24h per AC-2(3).",
    sla: "Program Guidance (non-statutory): High <= 30d, Mod <= 90d, Low <= 180d (subject to AO tailoring)",
  },
  "AC-2(3)": {
    low: "Included in Moderate/High FedRAMP baselines (agency-tailored under Low).",
    moderate: "Disable accounts within 24 hours for user accounts when expired/no longer associated/violating policy (ac-02.03_odp.01), or after thirty-five (35) days of inactivity (ac-02.03_odp.02); CSP defines non-user/device periods approved by JAB/AO.",
    high: "Disable user accounts within 24 hours when expired, terminated/no longer associated, or violating policy (ac-02.03_odp.01), or after thirty-five (35) days of inactivity (ac-02.03_odp.02); CSP defines non-user/device timeframes approved by JAB/AO.",
    sla: "Program Guidance (non-statutory): High <= 30d (subject to AO tailoring)",
  },
  "AC-3": {
    low: "Enforce least-privilege RBAC and default-deny access policies.",
    moderate: "Enforce least-privilege RBAC, API authorization, and disallow console/IAM bypass.",
    high: "Enforce hardware-backed least-privilege RBAC, explicit-deny SCP/IAM guardrails, and zero console bypass.",
    sla: "High 30d, Mod 90d",
  },
  "AC-7": {
    low: "Lock account for 15 minutes or admin unlock after max 5 consecutive invalid login attempts in 15 minutes.",
    moderate: "Max 3 consecutive invalid login attempts during 15-minute interval; lock 15 minutes or until admin unlock.",
    high: "Max 3 consecutive invalid login attempts during 15-minute interval; lock >= 15 minutes or until admin unlock.",
    sla: "High 30d, Mod 90d",
  },
  "AC-11": {
    low: "Initiate session lock after 15 minutes of inactivity.",
    moderate: "Initiate device/session lock after <= 15 minutes of inactivity; conceal prior display.",
    high: "Initiate device/session lock after <= 15 minutes of inactivity and require re-authentication with MFA.",
    sla: "Mod 90d, High 30d",
  },
  "AC-12": {
    low: "Terminate network/UI sessions after defined inactivity period.",
    moderate: "Terminate interactive sessions after <= 30 minutes (privileged <= 15 minutes) of inactivity.",
    high: "Terminate sessions after <= 15 minutes (standard & privileged <= 15 minutes) of inactivity.",
    sla: "High 30d, Mod 90d",
  },
  "AU-2": {
    low: "Log authentication, account creation/deletion, privilege escalation, and policy changes.",
    moderate: "Capture auth, priv-esc, object access/deletion, admin commands, and config changes correlated centrally.",
    high: "Capture comprehensive immutable security/admin telemetry, command-level privileged actions, and tamper logs.",
    sla: "High 30d, Mod 90d",
  },
  "AU-6": {
    low: "Review and analyze system audit records at least weekly.",
    moderate: "Review/analyze audit records at least weekly (<= 7 days) and correlate automated SIEM alerts.",
    high: "Review/analyze audit records at least weekly (<= 7 days) with real-time SIEM correlation and automated alerting.",
    sla: "ConMon review cadence <= 7 days",
  },
  "AU-11": {
    low: "Retain audit records at least 90 days online / 1 year archived.",
    moderate: "Retain audit records >= 90 days immediately searchable online and >= 1 year archived.",
    high: "Retain audit records >= 90 days hot online and >= 1 year WORM/immutable archive.",
    sla: "Mod 90d, High 30d",
  },
  "CA-7": {
    low: "Report ConMon metrics annually/monthly per FedRAMP PMO.",
    moderate: "Deliver monthly ConMon vulnerability scans, POA&M updates, and annual 3PAO subset assessment.",
    high: "Deliver monthly ConMon scans (OS, DB, Web/Container), real-time significant-change alerts, and annual 3PAO re-assessment.",
    sla: "Monthly <= 30 days ConMon deliverable",
  },
  "CM-2": {
    low: "Maintain and review baseline configuration annually and upon significant change.",
    moderate: "Maintain version-controlled IaC/gold-image baseline configuration; review >= annually and after major change.",
    high: "Maintain signed, version-controlled baseline configuration (IaC/CIS/DISA STIG); review >= annually and on every significant change.",
    sla: "Annual <= 365 days",
  },
  "CM-6": {
    low: "Apply CIS Level 1 / DISA STIG baseline configurations; document approved deviations.",
    moderate: "Enforce CIS/DISA STIG configuration settings across OS, DB, containers, and cloud control planes.",
    high: "Enforce DISA STIG / CIS hardened configurations with automated drift detection and >= 95% compliance threshold.",
    sla: "High 30d, Mod 90d",
  },
  "IA-2": {
    low: "Uniquely identify and authenticate organizational users; MFA implementations must adhere to NIST SP 800-63B and be phishing-resistant (IA-2 FedRAMP Additional Requirements).",
    moderate: "Uniquely identify organizational users; adhere to NIST SP 800-63B Digital Identity Guidelines and enforce phishing-resistant MFA per Additional FedRAMP Requirements.",
    high: "Uniquely identify organizational users; adhere to NIST SP 800-63B Digital Identity Guidelines and enforce phishing-resistant MFA across privileged and non-privileged enhancements (IA-2 Additional FedRAMP Requirements).",
    sla: "Program Guidance (non-statutory): High <= 30d (subject to AO tailoring)",
  },
  "IA-2(1)": {
    low: "Enforce phishing-resistant MFA for access to privileged accounts (not in Low baseline unless tailored; see IA-2(1) when applied).",
    moderate: "Implement phishing-resistant MFA for access to privileged accounts per SP 800-63-3 (63A/63B/63C). Guidance (ia-2.1_fr_gdn.1): MFA to subsequent components in the same user domain is not required.",
    high: "Implement phishing-resistant MFA for access to privileged accounts per SP 800-63-3 (63A/63B/63C). Guidance (ia-2.1_fr_gdn.1): MFA to subsequent components in the same user domain is not required (evaluate full end-to-end auth path including bastion/IdP).",
    sla: "Program Guidance (non-statutory): High <= 30d (subject to AO tailoring)",
  },
  "IA-2(2)": {
    low: "Phishing-resistant MFA for access to non-privileged accounts (when included/tailored).",
    moderate: "Phishing-resistant MFA for non-privileged accounts per SP 800-63-3; subsequent same-domain components exempt per ia-2.2_fr_gdn.1.",
    high: "Phishing-resistant MFA for non-privileged accounts per SP 800-63-3; subsequent same-domain components exempt per ia-2.2_fr_gdn.1.",
    sla: "Program Guidance (non-statutory): High <= 30d, Mod <= 90d",
  },
  "IA-2(6)": {
    low: "Included in Moderate/High baselines.",
    moderate: "Implement MFA for local, network, and remote access (ia-02.06_odp.01) to privileged and non-privileged accounts (ia-02.06_odp.02) using a separate device meeting FIPS-validated or NSA-approved cryptography (ia-02.06_odp.03; e.g., PIV/SP 800-157 or FIDO2).",
    high: "Implement MFA for local, network, and remote access (ia-02.06_odp.01) to privileged and non-privileged accounts (ia-02.06_odp.02) using a separate device meeting FIPS-validated or NSA-approved cryptography (ia-02.06_odp.03); evaluate end-to-end SSH/bastion/IdP auth path.",
    sla: "Program Guidance (non-statutory): High <= 30d (subject to AO tailoring)",
  },
  "RA-5": {
    low: "Monthly OS scans (ra-5_prm_1); remediate High <= 30d, Moderate <= 90d, Low <= 180d from discovery (ra-05_odp.03); CISA KEV catalog dates supersede RA-5(d) timelines where applicable.",
    moderate: "Monthly OS/infrastructure, web app/API, and database scans (ra-5_prm_1) + annual 3PAO scan; mitigate High <= 30d, Moderate <= 90d, Low <= 180d (ra-05_odp.03); CISA KEV catalog dates supersede where listed.",
    high: "Monthly OS/infrastructure, web app/API, and database scans (ra-5_prm_1) + annual 3PAO scan; mitigate High <= 30d, Moderate <= 90d, Low <= 180d (ra-05_odp.03); CISA KEV catalog dates supersede for KEV-listed CVEs only.",
    sla: "Scan <= 30d; RA-5(d) ODP: High 30d, Mod 90d, Low 180d (KEV supersedes for listed CVEs)",
  },
  "SI-2": {
    low: "Install security-relevant software and firmware updates within thirty (30) days of release of updates (si-02_odp).",
    moderate: "Install security-relevant software and firmware updates within thirty (30) days of release of updates (si-02_odp).",
    high: "Install security-relevant software and firmware updates within thirty (30) days of release of updates (si-02_odp); CISA BOD 22-01 applies specifically to CISA KEV-listed vulnerabilities.",
    sla: "SI-2(c) ODP: <= 30d of update release (program POA&M / BOD 22-01 KEV-scoped)",
  },
};

const RMF_STEPS = [
  {
    step: 0,
    code: "PREPARE",
    title: "Step 0: Prepare",
    pub: "NIST SP 800-37 Rev. 2",
    roles: ["Authorizing Official (AO)", "System Owner", "ISSM", "ISSO", "SCA"],
    deliverables: ["Authorization Boundary Diagram", "HW/SW/Firmware Inventory", "Risk Tolerance & Continuous Monitoring Strategy", "Common Control Identification"],
    summary: "Establish organizational & system-level governance, assign AO/ISSM/ISSO and independent SCA, register system, and define authorization boundary before selecting controls.",
  },
  {
    step: 1,
    code: "CATEGORIZE",
    title: "Step 1: Categorize",
    pub: "FIPS 199 / FIPS 200 / NIST SP 800-60",
    roles: ["System Owner", "ISSO", "ISSM", "AO"],
    deliverables: ["FIPS 199 Security Categorization", "Information Types & Rationale", "System Impact High-Water Mark"],
    summary: "Map system data types against SP 800-60/CUI/privacy rules, rate Confidentiality/Integrity/Availability (LOW/MODERATE/HIGH), and compute High-Water Mark max(C, I, A).",
  },
  {
    step: 2,
    code: "SELECT",
    title: "Step 2: Select",
    pub: "NIST SP 800-53B / FedRAMP",
    roles: ["System Owner", "ISSO", "ISSM", "Common Control Provider"],
    deliverables: ["Tailored Baseline Control Set", "ODP Assignments", "Customer Responsibility Matrix (CRM)", "Continuous Monitoring Strategy"],
    summary: "Select the SP 800-53B baseline matching categorization, apply FedRAMP/privacy/overlay rules, assign ODPs, and allocate controls as system-specific, inherited, or hybrid.",
  },
  {
    step: 3,
    code: "IMPLEMENT",
    title: "Step 3: Implement",
    pub: "NIST SP 800-53 Rev. 5 / SP 800-18",
    roles: ["System Owner", "Cloud/Platform Engineers", "ISSO"],
    deliverables: ["System Security Plan (SSP) in OSCAL/FedRAMP", "Hardened Configurations (CIS/STIG)", "As-Built Technical Evidence"],
    summary: "Implement controls consistently with enterprise architecture, harden endpoints/cloud infrastructure, eliminate 'TBD' placeholders, and document actual implementation statements in SSP.",
  },
  {
    step: 4,
    code: "ASSESS",
    title: "Step 4: Assess",
    pub: "NIST SP 800-53A Rev. 5 / 3PAO SAP & SAR",
    roles: ["Independent SCA / 3PAO", "ISSO", "System Owner"],
    deliverables: ["Security Assessment Plan (SAP)", "Security Assessment Report (SAR)", "Penetration Test Report", "Verified Test Artifacts"],
    summary: "Independent assessor/3PAO executes Examine, Interview, and Test procedures per SP 800-53A against actual evidence to determine control effectiveness and draft SAR.",
  },
  {
    step: 5,
    code: "AUTHORIZE",
    title: "Step 5: Authorize",
    pub: "NIST SP 800-37 Rev. 2 / FedRAMP JAB/Agency",
    roles: ["Authorizing Official (AO)"],
    deliverables: ["Authorization Decision Letter (ATO / ATO w/ Conditions / DATO)", "Accepted Risk Determination", "Approved POA&M"],
    summary: "Authorizing Official reviews SSP, SAR, POA&M, and residual risk; only the AO renders formal ATO, conditional ATO, or Denial of Authorization (DATO).",
  },
  {
    step: 6,
    code: "MONITOR",
    title: "Step 6: Monitor",
    pub: "NIST SP 800-137 / FedRAMP ConMon",
    roles: ["ISSO", "ISSM", "System Owner", "AO"],
    deliverables: ["Monthly RA-5 Scan & POA&M Package", "Significant Change Requests", "Ongoing Authorization Review"],
    summary: "Maintain continuous visibility: monthly authenticated RA-5 scans, weekly AU-6 log analysis, strict POA&M SLA closure (High 30d / Mod 90d / Low 180d), and CISA KEV mitigation.",
  },
];

const FIPS_199_TYPES = [
  { code: "D.8.1", name: "Personally Identifiable Information (PII)", c: "MODERATE", i: "MODERATE", a: "LOW", notes: "Typically triggers Privacy baseline + SP 800-122 protections." },
  { code: "D.19.1", name: "Protected Health Information (PHI / HIPAA)", c: "MODERATE", i: "MODERATE", a: "MODERATE", notes: "High sensitivity for patient safety & HIPAA Privacy/Security Rules." },
  { code: "CUI_BASIC", name: "Controlled Unclassified Information (CUI)", c: "MODERATE", i: "MODERATE", a: "LOW", notes: "32 CFR Part 2002 requires >= MODERATE Confidentiality; invokes NIST SP 800-171 for nonfederal systems." },
  { code: "ITAR_EXPORT", name: "ITAR / Export Controlled Technical Data", c: "HIGH", i: "HIGH", a: "MODERATE", notes: "Mandates HIGH Confidentiality under CNSSI 1253 / DoD IL5 overlays." },
  { code: "FED_FINANCE", name: "Federal Financial / Payment Transactions", c: "MODERATE", i: "HIGH", a: "MODERATE", notes: "High integrity requirement against unauthorized ledger manipulation." },
  { code: "MISSION_CRIT", name: "Critical Operational Telemetry / Emergency Response", c: "MODERATE", i: "HIGH", a: "HIGH", notes: "Loss or manipulation degrades safety-critical mission operations." },
  { code: "PUBLIC_INFO", name: "Publicly Releasable Information", c: "LOW", i: "LOW", a: "LOW", notes: "Integrity/availability still protected against defacement." },
];

function sha256(bufOrStr) {
  return crypto.createHash("sha256").update(bufOrStr).digest("hex");
}

function clamp(str, max) {
  const clean = String(str || "").replace(/\s+/g, " ").trim();
  if (!clean || clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > max * 0.55 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function canonicalControlId(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/^#/, "")
    .replace(/^(?:NIST|SP800-53)[_-]?/i, "")
    .replace(/\s+/g, "");
  // Match ac-2, ac-02, ac-2.3, ac-02(03), ac-2(3)
  const parenMatch = s.match(/^([a-z]{2})-?0*(\d+)\(0*(\d+)\)$/i);
  if (parenMatch) {
    return `${parenMatch[1].toUpperCase()}-${Number(parenMatch[2])}(${Number(parenMatch[3])})`;
  }
  const dotMatch = s.match(/^([a-z]{2})-?0*(\d+)[._]0*(\d+)$/i);
  if (dotMatch) {
    return `${dotMatch[1].toUpperCase()}-${Number(dotMatch[2])}(${Number(dotMatch[3])})`;
  }
  const baseMatch = s.match(/^([a-z]{2})-?0*(\d+)$/i);
  if (baseMatch) {
    return `${baseMatch[1].toUpperCase()}-${Number(baseMatch[2])}`;
  }
  return null;
}

function buildParamLookup(params = [], inherited = new Map()) {
  const map = new Map(inherited);
  for (const p of params) {
    const label = p.label
      ? `[Assignment: ${p.label}]`
      : p.select?.choice?.length
      ? `[Selection: ${p.select.choice.join("; ")}]`
      : p.guidelines?.[0]?.prose
      ? `[Assignment: ${clamp(p.guidelines[0].prose, 60)}]`
      : `[Assignment: ${p.id}]`;
    if (p.id) map.set(p.id, label);
    for (const prop of p.props || []) {
      if (prop.name === "alt-identifier" && prop.value) {
        map.set(prop.value, label);
      }
    }
  }
  return map;
}

function resolveProse(prose, paramMap) {
  return String(prose || "")
    .replace(/\{\{\s*insert:\s*param,\s*([^}\s]+)\s*\}\}/gi, (_, pid) => paramMap.get(pid) || `[Parameter: ${pid}]`)
    .replace(/\s+/g, " ")
    .trim();
}

function flattenPartText(part, paramMap, out = []) {
  if (!part) return out;
  const labelProp = (part.props || []).find((p) => p.name === "label")?.value;
  const text = part.prose ? resolveProse(part.prose, paramMap) : "";
  if (text) {
    out.push(labelProp && part.name === "item" ? `${labelProp} ${text}` : text);
  }
  for (const child of part.parts || []) {
    flattenPartText(child, paramMap, out);
  }
  return out;
}

function extractObjectives(parts = [], paramMap) {
  const objPart = parts.find((p) => p.name === "assessment-objective");
  if (!objPart) return [];
  const determinations = [];
  const walk = (node) => {
    if (!node) return;
    if (node.prose && !node.parts?.length) {
      const label = (node.props || []).find((p) => p.name === "label")?.value || "";
      const txt = resolveProse(node.prose, paramMap);
      if (txt) determinations.push(clamp(label ? `${label} ${txt}` : txt, 150));
      return;
    }
    if (node.prose && node.parts?.length) {
      // top branch text can stay implicit if leaf items exist
    }
    for (const c of node.parts || []) walk(c);
  };
  walk(objPart);
  return determinations.slice(0, 5);
}

function extractMethods(parts = [], paramMap) {
  const methods = { examine: "", interview: "", test: "" };
  for (const p of parts || []) {
    if (p.name !== "assessment-method") continue;
    const mProp = (p.props || []).find((pr) => pr.name === "method")?.value?.toUpperCase();
    if (!mProp || !(mProp.toLowerCase() in methods)) continue;
    const text = flattenPartText(p, paramMap).join("; ");
    if (text) {
      methods[mProp.toLowerCase()] = clamp(text, 200);
    }
  }
  return methods;
}

async function fetchSource(key, src) {
  process.stdout.write(`Fetching ${key} (${src.id})... `);
  const res = await fetch(src.url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} downloading ${src.url}`);
  }
  const text = await res.text();
  const digest = sha256(text);
  const json = JSON.parse(text);
  console.log(`OK (${(text.length / 1024).toFixed(0)} KB, sha256:${digest.slice(0, 12)})`);
  return { json, digest, bytes: text.length };
}

function extractProfileIds(profileJson) {
  const set = new Set();
  for (const imp of profileJson?.profile?.imports || []) {
    for (const inc of imp["include-controls"] || []) {
      for (const rawId of inc["with-ids"] || []) {
        const cid = canonicalControlId(rawId);
        if (cid) set.add(cid);
      }
    }
  }
  return set;
}

function paramIdToControlId(paramId) {
  const s = String(paramId || "").trim().toLowerCase();
  const m = s.match(/^([a-z]{2})-?0*(\d+)(?:\.0*(\d+))?(?:_|$)/i);
  if (!m) return null;
  const fam = m[1].toUpperCase();
  const num = Number(m[2]);
  const enh = m[3] ? `(${Number(m[3])})` : "";
  return `${fam}-${num}${enh}`;
}

function collectFedrampAlterText(parts = [], requirements = [], guidance = []) {
  for (const pt of parts || []) {
    const prose = String(pt.prose || "")
      .replace(/\\"/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    const labelVal = (pt.props || []).find((pr) => pr.name === "label")?.value || "";
    const isGuidance = pt.name === "guidance" || /^guidance/i.test(labelVal) || /_gdn\./i.test(pt.id || "");
    if (prose) {
      if (isGuidance) guidance.push(clamp(prose, 320));
      else requirements.push(clamp(prose, 320));
    }
    if (pt.parts?.length) {
      collectFedrampAlterText(pt.parts, requirements, guidance);
    }
  }
}

function parseFedrampProfile(profileJson, srcMeta) {
  const prof = profileJson?.profile || {};
  const meta = prof.metadata || {};
  const includedIds = extractProfileIds(profileJson);
  const byControl = {};

  const ensureEntry = (cid) => {
    if (!byControl[cid]) {
      byControl[cid] = { params: [], additionalRequirements: [], additionalGuidance: [] };
    }
    return byControl[cid];
  };

  for (const sp of prof.modify?.["set-parameters"] || []) {
    const cid = paramIdToControlId(sp["param-id"]);
    if (!cid) continue;
    const vals = [];
    for (const v of sp.values || []) if (v) vals.push(String(v).trim());
    if (vals.length === 0) {
      for (const c of sp.constraints || []) if (c?.description) vals.push(String(c.description).trim());
    }
    if (vals.length === 0 && sp.select?.choice?.length) {
      vals.push(`Selection: ${sp.select.choice.join("; ")}`);
    }
    const valStr = clamp(vals.join("; "), 340);
    if (valStr) {
      ensureEntry(cid).params.push({ id: sp["param-id"], value: valStr });
    }
  }

  for (const alt of prof.modify?.alters || []) {
    const cid = canonicalControlId(alt["control-id"]);
    if (!cid) continue;
    const reqs = [];
    const gdns = [];
    for (const add of alt.adds || []) {
      if (add.parts?.length) {
        collectFedrampAlterText(add.parts, reqs, gdns);
      }
    }
    if (reqs.length > 0 || gdns.length > 0) {
      const entry = ensureEntry(cid);
      for (const r of reqs) {
        if (!entry.additionalRequirements.includes(r) && entry.additionalRequirements.length < 6) {
          entry.additionalRequirements.push(r);
        }
      }
      for (const g of gdns) {
        if (!entry.additionalGuidance.includes(g) && entry.additionalGuidance.length < 5) {
          entry.additionalGuidance.push(g);
        }
      }
    }
  }

  return {
    meta: {
      id: srcMeta.id,
      title: String(meta.title || srcMeta.title).trim(),
      version: String(meta.version || "fedramp-rev5").trim(),
      published: String(meta.published || meta["last-modified"] || "2024-09-24T02:24:00Z").trim(),
      lastModified: String(meta["last-modified"] || meta.published || "").trim(),
      oscalVersion: String(meta["oscal-version"] || "1.0.4").trim(),
      url: srcMeta.url,
      sha256: srcMeta.sha256,
      bytes: srcMeta.bytes,
      includedControlsCount: includedIds.size,
      setParametersCount: (prof.modify?.["set-parameters"] || []).length,
    },
    includedIds,
    byControl,
  };
}

async function main() {
  const fetched = {};
  const manifestSources = [];

  for (const [key, src] of Object.entries(SOURCES)) {
    const { json, digest, bytes } = await fetchSource(key, src);
    fetched[key] = json;
    manifestSources.push({
      id: src.id,
      title: src.title,
      url: src.url,
      sha256: digest,
      bytes,
    });
  }

  // 1. Baselines (800-53B)
  const lowSet = extractProfileIds(fetched.baselineLow);
  const modSet = extractProfileIds(fetched.baselineMod);
  const highSet = extractProfileIds(fetched.baselineHigh);
  const privacySet = extractProfileIds(fetched.baselinePrivacy);

  // 1b. Official FedRAMP Rev. 5 OSCAL Baseline Profiles (Low / Moderate / High)
  const frMetaMap = new Map(manifestSources.map((s) => [s.id, s]));
  const parsedFrLow = parseFedrampProfile(fetched.fedrampLow, frMetaMap.get(SOURCES.fedrampLow.id));
  const parsedFrMod = parseFedrampProfile(fetched.fedrampMod, frMetaMap.get(SOURCES.fedrampMod.id));
  const parsedFrHigh = parseFedrampProfile(fetched.fedrampHigh, frMetaMap.get(SOURCES.fedrampHigh.id));

  const fedrampProfiles = {
    low: parsedFrLow.meta,
    moderate: parsedFrMod.meta,
    high: parsedFrHigh.meta,
  };

  const fedrampControlRegistry = {};
  const allFrControlIds = new Set([
    ...Object.keys(parsedFrLow.byControl),
    ...Object.keys(parsedFrMod.byControl),
    ...Object.keys(parsedFrHigh.byControl),
  ]);
  for (const cid of allFrControlIds) {
    const rec = {};
    if (parsedFrLow.byControl[cid]) rec.low = parsedFrLow.byControl[cid];
    if (parsedFrMod.byControl[cid]) rec.moderate = parsedFrMod.byControl[cid];
    if (parsedFrHigh.byControl[cid]) rec.high = parsedFrHigh.byControl[cid];
    fedrampControlRegistry[cid] = rec;
  }

  const authorityPolicies = {
    FEDRAMP_POAM_TIMELINES: {
      id: "FEDRAMP_POAM_TIMELINES",
      title: "FedRAMP Rev. 5 POA&M & Vulnerability Remediation Timelines",
      authorityType: "BASELINE_ODP_AND_PROGRAM_GUIDANCE",
      statutory: false,
      document: "FedRAMP Rev. 5 High/Moderate/Low Baseline OSCAL Profile (RA-5(d) ODP ra-05_odp.03) & FedRAMP Continuous Monitoring Strategy Guide / POA&M Completion Guide",
      version: parsedFrHigh.meta.version,
      section: "RA-5(d) Parameter ra-05_odp.03 (scanner findings); FedRAMP ConMon Strategy Guide & POA&M Template Completion Guide (control weaknesses)",
      url: "https://www.fedramp.gov/baselines/",
      effectiveDate: parsedFrHigh.meta.published.slice(0, 10),
      scope: "High <= 30 days, Moderate <= 90 days, Low <= 180 days from discovery. In FedRAMP Rev. 5 OSCAL, ra-05_odp.03 binds vulnerability-scan remediation. For non-vulnerability control weaknesses (e.g., AC-2, IA-2), FedRAMP ConMon/POA&M guidance applies Risk-adjusted timelines—it is program guidance, not a universal statute.",
      exceptions: "Subject to Authorizing Official (Agency AO / JAB) tailoring, approved Deviation Requests (False Positive, Operational Requirement, Vendor Dependency), and risk acceptance; CISA KEV dates supersede for KEV-listed CVEs only.",
    },
    CISA_BOD_22_01: {
      id: "CISA_BOD_22_01",
      title: "CISA Binding Operational Directive 22-01 (Reducing the Significant Risk of Known Exploited Vulnerabilities)",
      authorityType: "DIRECTIVE_SCOPED",
      statutory: false,
      document: "CISA BOD 22-01 & FedRAMP Rev. 5 RA-5 Additional Requirement ra-5_fr_smt.2",
      version: "BOD 22-01 (Nov 3, 2021) / " + parsedFrHigh.meta.version,
      section: "BOD 22-01 Required Actions; FedRAMP RA-5 ra-5_fr_smt.2",
      url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      effectiveDate: "2021-11-03",
      scope: "Applies strictly to known exploited vulnerabilities listed in the CISA KEV Catalog affecting FCEB / FedRAMP-authorized cloud systems (where CISA KEV due dates supersede standard RA-5(d) timelines).",
      exceptions: "Does NOT automatically govern general procedural or access-control deficiencies (such as AC-2 deprovisioning delays or IA-2 authentication configuration weaknesses) unless a listed KEV CVE is present.",
    },
  };

  // 2. SP 800-53 Rev. 5.2.0 + SP 800-53A Rev. 5.2.0
  const cat53 = fetched.sp80053.catalog;
  const controls = {};
  let baseCount = 0;
  let enhancementCount = 0;
  let withdrawnCount = 0;

  const ingestControl = (ctrl, familyId, familyTitle, parentId, inheritedParams) => {
    const cid = canonicalControlId(ctrl.id);
    if (!cid) return;

    const paramMap = buildParamLookup(ctrl.params || [], inheritedParams);
    const withdrawn = (ctrl.props || []).some((p) => p.name === "status" && p.value === "withdrawn");
    const withdrawnInto = [];
    const related = [];

    for (const lnk of ctrl.links || []) {
      const target = canonicalControlId(lnk.href);
      if (!target) continue;
      if (lnk.rel === "incorporated-into" || lnk.rel === "moved-to") {
        if (!withdrawnInto.includes(target)) withdrawnInto.push(target);
      } else if (lnk.rel === "related" && related.length < 6) {
        if (!related.includes(target)) related.push(target);
      }
    }

    const parts = ctrl.parts || [];
    const smtPart = parts.find((p) => p.name === "statement");
    const guidePart = parts.find((p) => p.name === "guidance");
    const statement = clamp(flattenPartText(smtPart, paramMap).join(" "), 420);
    const guidance = clamp(flattenPartText(guidePart, paramMap).join(" "), 220);
    const objectives = extractObjectives(parts, paramMap);
    const methods = extractMethods(parts, paramMap);

    const params = (ctrl.params || []).slice(0, 8).map((p) => ({
      id: (p.props || []).find((pr) => pr.name === "alt-identifier")?.value || p.id,
      label: clamp(p.label || p.guidelines?.[0]?.prose || p.id, 90),
    }));

    const baselines = [];
    if (lowSet.has(cid)) baselines.push("LOW");
    if (modSet.has(cid)) baselines.push("MODERATE");
    if (highSet.has(cid)) baselines.push("HIGH");
    if (privacySet.has(cid)) baselines.push("PRIVACY");

    if (parentId) enhancementCount += 1;
    else baseCount += 1;
    if (withdrawn) withdrawnCount += 1;

    controls[cid] = {
      id: cid,
      parentId: parentId || null,
      family: familyId.toUpperCase(),
      familyTitle,
      title: String(ctrl.title || "").trim(),
      statement,
      guidance,
      params,
      withdrawn,
      withdrawnInto,
      related,
      baselines,
      objectives,
      methods,
      ...(FEDRAMP_ODPS[cid] ? { fedrampOdp: FEDRAMP_ODPS[cid] } : {}),
    };

    for (const sub of ctrl.controls || []) {
      ingestControl(sub, familyId, familyTitle, cid, paramMap);
    }
  };

  for (const grp of cat53.groups || []) {
    const famId = String(grp.id || "").toUpperCase();
    const famTitle = String(grp.title || "").trim();
    for (const ctrl of grp.controls || []) {
      ingestControl(ctrl, famId, famTitle, null, new Map());
    }
  }

  // 3. SP 800-171 Rev. 3
  const cat171 = fetched.sp800171.catalog;
  const cui800171 = {};
  const cuiAliasMap = {};
  for (const grp of cat171.groups || []) {
    const famId = String(grp.id || "");
    const famTitle = String(grp.title || "").trim();
    const walk171 = (list) => {
      for (const req of list || []) {
        const rawId = String(req.id || "");
        const numMatch = rawId.match(/(\d{2}\.\d{2}\.\d{2})$/);
        const canon = numMatch ? numMatch[1] : rawId.replace(/^SP_800_171_/i, "");
        const shortId = canon
          .split(".")
          .map((seg) => String(Number(seg)))
          .join(".");
        const pMap = buildParamLookup(req.params || []);
        const smt = clamp(flattenPartText((req.parts || []).find((p) => p.name === "statement"), pMap).join(" "), 300);
        cui800171[canon] = {
          id: canon,
          shortId,
          family: famId,
          familyTitle: famTitle,
          title: String(req.title || "").trim(),
          statement: smt,
        };
        cuiAliasMap[shortId] = canon;
        if (req.controls?.length) walk171(req.controls);
      }
    };
    walk171(grp.controls);
  }

  // 4. NIST CSF 2.0
  const csfCat = fetched.csf2.catalog;
  const csf2 = {};
  for (const fn of csfCat.groups || []) {
    const fnId = String(fn.id || "").toUpperCase();
    csf2[fnId] = {
      id: fnId,
      level: "function",
      title: String(fn.title || "").trim(),
      statement: clamp(fn.parts?.find((p) => p.name === "statement")?.prose || "", 240),
    };
    for (const cat of fn.controls || []) {
      const catId = String(cat.id || "").toUpperCase();
      csf2[catId] = {
        id: catId,
        level: "category",
        title: String(cat.title || "").trim(),
        statement: clamp(cat.parts?.find((p) => p.name === "statement")?.prose || "", 240),
      };
      for (const sub of cat.controls || []) {
        const subId = String(sub.id || "").toUpperCase();
        csf2[subId] = {
          id: subId,
          level: "subcategory",
          title: String(sub.title || "").trim(),
          statement: clamp(sub.parts?.find((p) => p.name === "statement")?.prose || "", 240),
        };
      }
    }
  }

  // 5. MITRE CTID ATT&CK v16.1 <-> 800-53 Rev. 5
  const attackByControl = {};
  const controlsByAttack = {};
  let attackEdgeCount = 0;

  for (const m of fetched.mitreAttack.mapping_objects || []) {
    if (!m.capability_id || m.status === "non_mappable" || !m.attack_object_id) continue;
    const cid = canonicalControlId(m.capability_id);
    if (!cid) continue;
    const tid = String(m.attack_object_id).toUpperCase();
    const tname = String(m.attack_object_name || tid).trim();
    attackEdgeCount += 1;

    if (!attackByControl[cid]) attackByControl[cid] = [];
    if (!attackByControl[cid].some((x) => x.id === tid) && attackByControl[cid].length < 8) {
      attackByControl[cid].push({ id: tid, name: tname });
    }

    if (!controlsByAttack[tid]) {
      controlsByAttack[tid] = { name: tname, controls: [] };
    }
    if (!controlsByAttack[tid].controls.includes(cid) && controlsByAttack[tid].controls.length < 15) {
      controlsByAttack[tid].controls.push(cid);
    }
  }

  const payloadWithoutDigest = {
    schemaVersion: "1.1.0-option-b-fedramp-oscal",
    oscalVersion: cat53.metadata?.version || "5.2.0",
    rmfSteps: RMF_STEPS,
    fips199Types: FIPS_199_TYPES,
    fedrampOdps: FEDRAMP_ODPS,
    fedrampProfiles,
    fedrampControlRegistry,
    authorityPolicies,
    controls,
    cui800171,
    cuiAliasMap,
    csf2,
    attackByControl,
    controlsByAttack,
    sources: manifestSources,
  };

  const dbSha256 = sha256(JSON.stringify(payloadWithoutDigest));
  const finalDb = {
    manifest: {
      schemaVersion: "1.1.0-option-b-fedramp-oscal",
      nistVersion: cat53.metadata?.version || "5.2.0",
      fedrampVersion: parsedFrHigh.meta.version,
      fedrampPublished: parsedFrHigh.meta.published,
      generatedAt: new Date().toISOString(),
      dbSha256,
      counts: {
        totalControlsAndEnhancements: Object.keys(controls).length,
        baseControls: baseCount,
        enhancements: enhancementCount,
        withdrawnControls: withdrawnCount,
        baselineLow: lowSet.size,
        baselineModerate: modSet.size,
        baselineHigh: highSet.size,
        baselinePrivacy: privacySet.size,
        fedrampBaselineLow: parsedFrLow.includedIds.size,
        fedrampBaselineModerate: parsedFrMod.includedIds.size,
        fedrampBaselineHigh: parsedFrHigh.includedIds.size,
        fedrampControlRegistryCount: Object.keys(fedrampControlRegistry).length,
        cui800171Requirements: Object.keys(cui800171).length,
        csf2Items: Object.keys(csf2).length,
        mitreAttackEdges: attackEdgeCount,
        mitreAttackMappedControls: Object.keys(attackByControl).length,
        fedrampOdpsControls: Object.keys(FEDRAMP_ODPS).length,
      },
      sources: manifestSources,
    },
    rmfSteps: RMF_STEPS,
    fips199Types: FIPS_199_TYPES,
    fedrampOdps: FEDRAMP_ODPS,
    fedrampProfiles,
    fedrampControlRegistry,
    authorityPolicies,
    controls,
    cui800171,
    cuiAliasMap,
    csf2,
    attackByControl,
    controlsByAttack,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const serialized = JSON.stringify(finalDb);
  fs.writeFileSync(OUTPUT_PATH, serialized, "utf8");

  console.log("\n=== RMF Deterministic DB Compiled Successfully ===");
  console.log("Output:", OUTPUT_PATH);
  console.log("Size:", `${(serialized.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log("Counts:", JSON.stringify(finalDb.manifest.counts, null, 2));
  console.log("DB SHA-256:", dbSha256);
}

main().catch((err) => {
  console.error("RMF ingestion failed:", err);
  process.exit(1);
});
