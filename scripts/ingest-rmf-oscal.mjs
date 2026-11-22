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
};

const FEDRAMP_ODPS = {
  "AC-2": {
    low: "Review accounts at least annually; enforce automated provisioning/deprovisioning workflows.",
    moderate: "Review accounts annually (privileged at least semi-annually); disable inactive accounts after 90 days; remove/disable separated user access per agency SLA.",
    high: "Review accounts at least semi-annually (privileged quarterly); disable inactive accounts after 35 days; remove/disable separated accounts immediately or within 24 hours; notify ISSO of atypical usage.",
    sla: "High/Crit findings 30d, Mod 90d, Low 180d",
  },
  "AC-2(3)": {
    low: "Disable inactive accounts after [FedRAMP: 90 days].",
    moderate: "Disable inactive accounts after [FedRAMP: 90 days for non-privileged; 35 days recommended].",
    high: "Automatically disable inactive accounts after [FedRAMP High: 35 days] of inactivity.",
    sla: "High 30d",
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
    low: "Uniquely identify and authenticate organizational users and processes.",
    moderate: "Uniquely identify users/services (no shared accounts) and enforce strong authentication + MFA.",
    high: "Uniquely identify every human and non-human workload identity with phishing-resistant MFA or mutual TLS/X.509.",
    sla: "High 30d",
  },
  "IA-2(1)": {
    low: "MFA required for network access to privileged accounts.",
    moderate: "Phishing-resistant MFA enforced for all privileged network access (SSO/IAM/SSH/K8s).",
    high: "Hardware-token / FIDO2 / PIV phishing-resistant MFA enforced without bypass for all privileged access.",
    sla: "High 30d (CAT I blocker if absent)",
  },
  "IA-2(2)": {
    low: "MFA for network access to non-privileged accounts (FedRAMP Required).",
    moderate: "MFA required for all non-privileged interactive network access.",
    high: "Phishing-resistant MFA required for all non-privileged interactive network access.",
    sla: "High 30d, Mod 90d",
  },
  "IA-2(6)": {
    low: "Protect remote privileged access via replay-resistant authentication.",
    moderate: "Separate hardware/FIDO2 device MFA required for network access to privileged and non-privileged accounts.",
    high: "Phishing-resistant MFA (PIV/CAC/FIDO2/WebAuthn) on separate authenticator device required; static SSH keys prohibited.",
    sla: "High 30d",
  },
  "RA-5": {
    low: "Monthly OS scans; remediate High 30d, Moderate 90d, Low 180d.",
    moderate: "Authenticated OS scans at least monthly (<= 30d) + web/DB/container scans <= 30d; POA&M SLAs: High 30d, Moderate 90d, Low 180d.",
    high: "Authenticated OS, database, web app, and container scans at least monthly (<= 30d); POA&M SLAs: Critical/KEV per CISA BOD 22-01 (often <= 14-21d), High 30d, Moderate 90d, Low 180d.",
    sla: "Scan <= 30d; High 30d, Mod 90d, Low 180d",
  },
  "SI-2": {
    low: "Remediate known flaws within FedRAMP timelines.",
    moderate: "Identify, report, and remediate software/firmware flaws: High 30d, Moderate 90d, Low 180d.",
    high: "Identify and patch security flaws within FedRAMP SLAs (Critical/KEV immediate/BOD 22-01, High <= 30d, Moderate <= 90d, Low <= 180d); enforce central patch management.",
    sla: "High <= 30d, Mod <= 90d, Low <= 180d",
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
    schemaVersion: "1.0.0-option-b",
    oscalVersion: cat53.metadata?.version || "5.2.0",
    rmfSteps: RMF_STEPS,
    fips199Types: FIPS_199_TYPES,
    fedrampOdps: FEDRAMP_ODPS,
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
      schemaVersion: "1.0.0-option-b",
      nistVersion: cat53.metadata?.version || "5.2.0",
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
