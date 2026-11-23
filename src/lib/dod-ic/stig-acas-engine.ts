/**
 * Noctis Defense & Intelligence Community (NDIMP Wave 1 — Step 2)
 * DISA STIG / CCI / ACAS (.nessus) / SCAP XCCDF & DoDI 8531.01 / 8530.03 Engine
 *
 * Implements:
 *  - Authoritative DISA U_CCI_List (2025-01-23) lookup & NIST SP 800-53 Rev. 5 / Rev. 4 crosswalk
 *  - DOD-ACAS-001: Raw ACAS / Nessus (.nessus XML & JSON) multi-host parser, dedup, live CISA KEV correlation & credentialed-scan diagnostics
 *  - DOD-STIG-001: DISA STIG Viewer (.ckl) & SCAP XCCDF XML parser, CCI->NIST crosswalk, CAT I ATO veto & unsubstantiated assertion detection
 *  - DOD-VULN-8531-001: DoDI 8531.01 (Sept 15, 2020) vulnerability remediation & rescan verification rule
 *  - DOD-CIR-8530-001: DoDI 8530.03 (Aug 9, 2023) cyber incident CSSP/JFHQ-DODIN escalation & forensic preservation rule
 *
 * Non-negotiable invariants:
 *  - Scanner / checklist output NEVER equals independently validated exploitability or confirmed remediation closure without a verified post-patch credentialed rescan.
 *  - Only digits immediately following XX-NN count as control enhancements (`IA-2 (1)` -> `IA-2(1)`, `AC-1 a 1 (a)` -> `AC-1`).
 *  - Noctis never grants ATO or claims AI authority over DoD AO decisions (`aiCanIssueAto: false`).
 */

import disaCciDbJson from "../../data/disa-cci-db.json" with { type: "json" };
import { lookupRmfControl } from "../noctis-rmf-db.ts";
import { fetchLiveCisaKevCatalog, type CisaKevEntry } from "../rmf-v2/cyber-intelligence.ts";
import { sha256Sync } from "../universal-crypto.ts";
import type { AssessmentMode, DodIcRuleResult, DodVerdict } from "./dod-rmf-engine.ts";
import { DOD_IC_POLICY_REGISTRY } from "./policy-registry.ts";

// ----------------------------------------------------------------------------
// 1. Official DISA CCI Registry & NIST SP 800-53 Rev. 5 / Rev. 4 Crosswalk
// ----------------------------------------------------------------------------

interface RawCciEntry {
  s: string;
  t: string;
  p: string;
  d: string;
  r5: string[];
  r4: string[];
}

interface RawDisaCciDb {
  manifest: {
    schemaVersion: string;
    sourceTitle: string;
    sourceUrl: string;
    extractedFile?: string;
    version: string;
    publishDate: string;
    generatedAt: string;
    zipSha256: string;
    xmlSha256: string;
    dbSha256: string;
    counts: {
      totalCcis: number;
      rev5MappedCcis: number;
      rev4MappedCcis: number;
      distinctRev5Controls: number;
    };
  };
  ccis: Record<string, RawCciEntry>;
}

const RAW_CCI_DB = disaCciDbJson as unknown as RawDisaCciDb;

export interface DisaCciRecord {
  cciId: string;
  status: string;
  type: string;
  publishDate: string;
  definition: string;
  nistRev5References: string[];
  nistRev5Controls: string[];
  nistRev4References: string[];
  nistRev4Controls: string[];
  nistControlTitles: Record<string, string>;
  manifestVersion: string;
  dbSha256: string;
}

export interface DisaCciControlSummary {
  cciId: string;
  status: string;
  type: string;
  definition: string;
  revision: "REV5" | "REV4";
  references: string[];
}

export function getDisaCciManifest() {
  return RAW_CCI_DB.manifest;
}

/**
 * Extracts canonical base or enhancement control ID from DISA CCI reference index.
 * Preserves numeric enhancements (`IA-2 (1) (a)` -> `IA-2(1)`) while stripping
 * sub-element letters (`AC-1 a 1 (a)` -> `AC-1`).
 */
export function extractNistControlIdFromCciIndex(index: string): string | null {
  const m = String(index || "")
    .trim()
    .match(/^([A-Z]{2}-\d+)(?:\s*\((\d+)\))?/i);
  if (!m) return null;
  return m[2] ? `${m[1].toUpperCase()}(${m[2]})` : m[1].toUpperCase();
}

export function normalizeCciId(rawId: string): string | null {
  const cleaned = String(rawId || "").trim().toUpperCase();
  const digitsMatch = cleaned.match(/^(?:CCI[-_\s]*)?(\d{1,6})$/i);
  if (!digitsMatch) return null;
  return `CCI-${digitsMatch[1]!.padStart(6, "0")}`;
}

export function extractCciIdsFromText(text: string): string[] {
  const matches = String(text || "").match(/\bCCI-\d{1,6}\b/gi) || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const norm = normalizeCciId(m);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

function uniqueControlsFromRefs(refs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ref of refs) {
    const ctrl = extractNistControlIdFromCciIndex(ref);
    if (ctrl && !seen.has(ctrl)) {
      seen.add(ctrl);
      out.push(ctrl);
    }
  }
  return out;
}

export function lookupDisaCci(rawId: string): DisaCciRecord | null {
  const id = normalizeCciId(rawId);
  if (!id) return null;
  const entry = RAW_CCI_DB.ccis[id];
  if (!entry) return null;

  const rev5Controls = uniqueControlsFromRefs(entry.r5 || []);
  const rev4Controls = uniqueControlsFromRefs(entry.r4 || []);
  const nistControlTitles: Record<string, string> = {};
  for (const ctrlId of [...rev5Controls, ...rev4Controls]) {
    if (!nistControlTitles[ctrlId]) {
      const rmfCtrl = lookupRmfControl(ctrlId);
      if (rmfCtrl?.title) {
        nistControlTitles[ctrlId] = rmfCtrl.title;
      }
    }
  }

  return {
    cciId: id,
    status: entry.s,
    type: entry.t,
    publishDate: entry.p,
    definition: entry.d,
    nistRev5References: entry.r5 || [],
    nistRev5Controls: rev5Controls,
    nistRev4References: entry.r4 || [],
    nistRev4Controls: rev4Controls,
    nistControlTitles,
    manifestVersion: RAW_CCI_DB.manifest.version,
    dbSha256: RAW_CCI_DB.manifest.dbSha256,
  };
}

let lazyControlReverseIndex: Map<string, { cciId: string; rev: "REV5" | "REV4" }[]> | null = null;

function getControlReverseIndex(): Map<string, { cciId: string; rev: "REV5" | "REV4" }[]> {
  if (lazyControlReverseIndex) return lazyControlReverseIndex;
  const idx = new Map<string, { cciId: string; rev: "REV5" | "REV4" }[]>();
  const add = (ctrl: string, cciId: string, rev: "REV5" | "REV4") => {
    const arr = idx.get(ctrl) || [];
    if (!arr.some((x) => x.cciId === cciId && x.rev === rev)) {
      arr.push({ cciId, rev });
      idx.set(ctrl, arr);
    }
  };

  for (const [cciId, entry] of Object.entries(RAW_CCI_DB.ccis)) {
    for (const ctrl of uniqueControlsFromRefs(entry.r5 || [])) add(ctrl, cciId, "REV5");
    for (const ctrl of uniqueControlsFromRefs(entry.r4 || [])) add(ctrl, cciId, "REV4");
  }
  lazyControlReverseIndex = idx;
  return idx;
}

export function normalizeNistControlQuery(controlId: string): string {
  return String(controlId || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^([A-Z]{2})-?0*(\d+)/, "$1-$2");
}

export function listCcisForNistControl(controlId: string): DisaCciControlSummary[] {
  const norm = normalizeNistControlQuery(controlId);
  if (!norm) return [];
  const entries = getControlReverseIndex().get(norm) || [];
  const bestByCci = new Map<string, "REV5" | "REV4">();
  for (const item of entries) {
    const prev = bestByCci.get(item.cciId);
    if (!prev || (prev === "REV4" && item.rev === "REV5")) {
      bestByCci.set(item.cciId, item.rev);
    }
  }

  return [...bestByCci.entries()]
    .sort((a, b) => {
      if (a[1] !== b[1]) return a[1] === "REV5" ? -1 : 1;
      return a[0].localeCompare(b[0]);
    })
    .map(([cciId, revision]) => {
      const raw = RAW_CCI_DB.ccis[cciId]!;
      return {
        cciId,
        status: raw.s,
        type: raw.t,
        definition: raw.d,
        revision,
        references: revision === "REV5" ? raw.r5 : raw.r4,
      };
    });
}

// ----------------------------------------------------------------------------
// 2. Shared Lightweight Pure-TS XML Utilities (Zero External Deps)
// ----------------------------------------------------------------------------

function decodeXml(input: string): string {
  if (!input) return "";
  return String(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function parseXmlAttrs(attrBlock: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of attrBlock.matchAll(/([a-zA-Z0-9_:-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1]!] = decodeXml(m[2]!);
  }
  for (const m of attrBlock.matchAll(/([a-zA-Z0-9_:-]+)\s*=\s*'([^']*)'/g)) {
    if (!(m[1]! in attrs)) {
      attrs[m[1]!] = decodeXml(m[2]!);
    }
  }
  return attrs;
}

function extractXmlTagText(block: string, tagName: string): string {
  const m = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return m ? decodeXml(m[1]!) : "";
}

function extractAllXmlTagTexts(block: string, tagName: string): string[] {
  const out: string[] = [];
  for (const m of block.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi"))) {
    const val = decodeXml(m[1]!);
    if (val) out.push(val);
  }
  return out;
}

// ----------------------------------------------------------------------------
// 3. ACAS / Nessus (.nessus XML & JSON) Analyzer + DOD-ACAS-001
// ----------------------------------------------------------------------------

export interface AcasJsonFindingInput {
  pluginId?: string;
  pluginName?: string;
  pluginFamily?: string;
  host?: string;
  port?: string;
  severity?: number | "CRITICAL" | "HIGH" | "MEDIUM" | "MODERATE" | "LOW" | "INFO";
  cves?: string[];
  cve?: string;
  iavms?: string[];
  cvss3?: number;
  cvss2?: number;
  daysOpen?: number;
  pluginOutput?: string;
  solution?: string;
  credentialedScanPassed?: boolean;
  poamTracked?: boolean;
  aoRiskAccepted?: boolean;
}

export interface AcasCredentialHostIssue {
  host: string;
  ip: string | null;
  operatingSystem: string | null;
  credentialedScanProperty: string | null;
  pluginIds: string[];
  reason: string;
  remediationSteps: string[];
}

export interface AcasDeduplicatedFinding {
  findingKey: string;
  pluginId: string;
  pluginName: string;
  pluginFamily: string;
  severityNumeric: 4 | 3 | 2 | 1;
  severityLabel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  catMapping: "CAT_I" | "CAT_II" | "CAT_III";
  priority: "P0_KEV_IMMEDIATE" | "P1_CRITICAL_CAT_I" | "P2_HIGH_CAT_II" | "P3_MEDIUM_CAT_II" | "P4_LOW_CAT_III";
  slaDays: number;
  governingAuthority: string;
  isCisaKev: boolean;
  kevEntries: {
    cveID: string;
    vendor: string;
    product: string;
    dueDate: string;
    ransomwareUse: string;
  }[];
  cves: string[];
  iavms: string[];
  maxCvss: number;
  daysOpen: number;
  overdueDays: number;
  assetCount: number;
  affectedHosts: string[];
  ports: string[];
  mappedControls: ["RA-5", "SI-2"];
  validationStatus: "SCANNER_REPORTED_UNVALIDATED";
  independentExploitValidation: "NOT_VALIDATED_BY_SCANNER";
  remediationVerification: "UNVERIFIED_REQUIRES_CREDENTIALED_RESCAN";
  solutionSummary: string;
}

export interface AcasDraftPoamItem {
  poamId: string;
  controlIds: string[];
  weaknessTitle: string;
  severity: string;
  priority: string;
  assetCount: number;
  affectedHosts: string[];
  cves: string[];
  isCisaKev: boolean;
  targetSlaDays: number;
  status: "DRAFT_REQUIRES_ISSM_AND_AO_APPROVAL";
  requiredClosureEvidence: string;
}

export interface AcasAnalysisResult {
  sourceFormat: "NESSUS_XML" | "JSON";
  kevFeedSource: "CISA_LIVE_JSON" | "AUTHORITATIVE_SEED_CACHE";
  credentialedScanDiagnostics: {
    totalHosts: number;
    credentialedHosts: number;
    uncredentialedHosts: number;
    failedCredentialHosts: string[];
    hostIssues: AcasCredentialHostIssue[];
  };
  summary: {
    rawReportItems: number;
    deduplicatedActiveFindings: number;
    kevMatches: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    overdueCount: number;
    hostsImpacted: number;
    controlsImpacted: ["RA-5", "SI-2"];
  };
  findings: AcasDeduplicatedFinding[];
  draftPoamItems: AcasDraftPoamItem[];
  ruleResult: DodIcRuleResult;
  epistemicBoundary: string;
  auditHash: string;
}

const CREDENTIAL_FAILURE_PLUGIN_REASONS: Record<string, { reason: string; fix: string }> = {
  "19506": {
    reason: "Nessus Scan Information (Plugin 19506) reported `Credentialed checks : no`.",
    fix: "Verify SSH key/sudoers or Windows SMB/WinRM scan service account credentials and host firewall reachability on TCP 22/445.",
  },
  "21745": {
    reason: "Plugin 21745: Authentication Failure - Local Checks Not Run.",
    fix: "Repair ACAS service account password/SSH key rotation in SecurityCenter/Tenable, test authentication on host, and re-run full credentialed scan.",
  },
  "110385": {
    reason: "Plugin 110385: Authentication Success with Insufficient Privilege - Local Checks May Be Incomplete.",
    fix: "Grant least-privilege elevation (`sudo` NOPASSWD or local Administrators audit rights) per DISA ACAS Best Practices Guide.",
  },
  "104410": {
    reason: "Plugin 104410: Target Credential Status by Authentication Protocol - Failure for Provided Credentials.",
    fix: "Confirm credential target mapping and domain/SSH username formatting in ACAS scan policy.",
  },
  "24786": {
    reason: "Plugin 24786: Microsoft Windows SMB Log In Possible - Scan Not Performed with Admin Privileges.",
    fix: "Enable Remote Registry/Admin$ access or disable UAC remote token filtering for the dedicated ACAS scan account.",
  },
  "12634": {
    reason: "Plugin 12634: Authenticated Check / OS & Package Enumeration Failure.",
    fix: "Confirm supported shell, `uname`/`rpm`/`dpkg` path access, and non-corrupted package database on target host.",
  },
  "117885": {
    reason: "Plugin 117885: Authentication Success with Intermittent Failure.",
    fix: "Inspect rate limiting, MFA prompts on service accounts, or PAM lockout thresholds interrupting mid-scan SSH/SMB sessions.",
  },
};

function normalizeNumericSeverity(raw: unknown): 4 | 3 | 2 | 1 | 0 {
  if (typeof raw === "number") {
    if (raw >= 4) return 4;
    if (raw === 3) return 3;
    if (raw === 2) return 2;
    if (raw === 1) return 1;
    return 0;
  }
  const s = String(raw || "").trim().toUpperCase();
  if (s === "4" || s === "CRITICAL" || s === "CAT_I" || s === "CAT I") return 4;
  if (s === "3" || s === "HIGH") return 3;
  if (s === "2" || s === "MEDIUM" || s === "MODERATE" || s === "CAT_II") return 2;
  if (s === "1" || s === "LOW" || s === "CAT_III") return 1;
  return 0;
}

export async function parseAndEvaluateAcasNessus(input: {
  nessusXml?: string;
  findings?: AcasJsonFindingInput[];
  forceOfflineKev?: boolean;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): Promise<AcasAnalysisResult> {
  const kevCatalog = await fetchLiveCisaKevCatalog(Boolean(input.forceOfflineKev));
  const xmlText = typeof input.nessusXml === "string" ? input.nessusXml.trim() : "";
  const isXml = xmlText.length > 0 && /<(?:NessusClientData_v2|ReportHost|ReportItem)\b/i.test(xmlText);

  interface RawParsedItem {
    pluginId: string;
    pluginName: string;
    pluginFamily: string;
    host: string;
    port: string;
    severityNumeric: 4 | 3 | 2 | 1;
    cves: string[];
    iavms: string[];
    cvss: number;
    daysOpen: number;
    solution: string;
    poamTracked?: boolean;
    aoRiskAccepted?: boolean;
  }

  const hostDiagMap = new Map<
    string,
    {
      ip: string | null;
      os: string | null;
      credProp: string | null;
      cred19506: boolean | null;
      failedPlugins: Set<string>;
      extraReasons: Set<string>;
      fixes: Set<string>;
    }
  >();

  const ensureHost = (host: string) => {
    let rec = hostDiagMap.get(host);
    if (!rec) {
      rec = {
        ip: null,
        os: null,
        credProp: null,
        cred19506: null,
        failedPlugins: new Set(),
        extraReasons: new Set(),
        fixes: new Set(),
      };
      hostDiagMap.set(host, rec);
    }
    return rec;
  };

  const activeRawItems: RawParsedItem[] = [];
  let rawReportItems = 0;

  if (isXml) {
    const hostBlocks = [...xmlText.matchAll(/<ReportHost\b([^>]*)>([\s\S]*?)<\/ReportHost>/gi)];
    for (const hMatch of hostBlocks) {
      const hAttrs = parseXmlAttrs(hMatch[1]!);
      const hBody = hMatch[2]!;
      const hostName = hAttrs.name || "host-unknown";
      const hd = ensureHost(hostName);

      const propsBlock = hBody.match(/<HostProperties>([\s\S]*?)<\/HostProperties>/i)?.[1] || "";
      for (const tagMatch of propsBlock.matchAll(/<tag\b([^>]*)>([\s\S]*?)<\/tag>/gi)) {
        const tagName = parseXmlAttrs(tagMatch[1]!).name || "";
        const val = decodeXml(tagMatch[2]!);
        if (tagName === "host-ip") hd.ip = val;
        if (tagName === "operating-system") hd.os = val;
        if (tagName === "Credentialed_Scan") {
          hd.credProp = val;
          if (/^false$/i.test(val)) {
            hd.extraReasons.add("HostProperties reported Credentialed_Scan=false.");
          }
        }
      }

      for (const itemMatch of hBody.matchAll(/<ReportItem\b([^>]*)>([\s\S]*?)<\/ReportItem>/gi)) {
        rawReportItems++;
        const attrs = parseXmlAttrs(itemMatch[1]!);
        const body = itemMatch[2]!;
        const pluginId = String(attrs.pluginID || "0").trim();
        const pluginName = attrs.pluginName || `Plugin ${pluginId}`;
        const pluginFamily = attrs.pluginFamily || "General";
        const port = `${attrs.port || "0"}/${attrs.protocol || "tcp"}`;
        const pluginOutput = extractXmlTagText(body, "plugin_output");

        // Credentialed scan check logic
        if (pluginId === "19506") {
          if (/Credentialed checks\s*:\s*no\b/i.test(pluginOutput)) {
            hd.cred19506 = false;
            hd.failedPlugins.add("19506");
            hd.extraReasons.add(CREDENTIAL_FAILURE_PLUGIN_REASONS["19506"]!.reason);
            hd.fixes.add(CREDENTIAL_FAILURE_PLUGIN_REASONS["19506"]!.fix);
          } else if (/Credentialed checks\s*:\s*yes\b/i.test(pluginOutput)) {
            hd.cred19506 = true;
          }
        } else if (pluginId in CREDENTIAL_FAILURE_PLUGIN_REASONS) {
          const is12634Success =
            pluginId === "12634" &&
            !/\b(?:fail|error|unable|denied|cannot|could not|not run)\b/i.test(`${pluginName} ${pluginOutput}`);
          if (!is12634Success) {
            hd.failedPlugins.add(pluginId);
            const meta = CREDENTIAL_FAILURE_PLUGIN_REASONS[pluginId]!;
            hd.extraReasons.add(meta.reason);
            hd.fixes.add(meta.fix);
          }
        }

        const sevNum = normalizeNumericSeverity(Number(attrs.severity ?? 0));
        if (sevNum === 0) continue;

        const cves = extractAllXmlTagTexts(body, "cve").map((c) => c.toUpperCase());
        const iavms = [
          ...extractAllXmlTagTexts(body, "iava"),
          ...extractAllXmlTagTexts(body, "iavb"),
          ...extractAllXmlTagTexts(body, "iavt"),
        ].map((x) => x.toUpperCase());
        const cvss3Str = extractXmlTagText(body, "cvss3_base_score");
        const cvss2Str = extractXmlTagText(body, "cvss_base_score");
        const cvss = Number(cvss3Str || cvss2Str || (sevNum === 4 ? 9.8 : sevNum === 3 ? 7.8 : sevNum === 2 ? 5.3 : 3.1));
        const solution = extractXmlTagText(body, "solution") || extractXmlTagText(body, "synopsis") || "Apply vendor patch and verify with credentialed ACAS rescan.";
        const daysOpenMatch = `${body} ${pluginOutput}`.match(/\bdays_open[:=]\s*(\d+)/i);
        const daysOpen = daysOpenMatch ? Number(daysOpenMatch[1]) : 0;

        activeRawItems.push({
          pluginId,
          pluginName,
          pluginFamily,
          host: hostName,
          port,
          severityNumeric: sevNum,
          cves,
          iavms,
          cvss: Number.isFinite(cvss) ? cvss : 7.0,
          daysOpen,
          solution,
        });
      }
    }
  } else {
    const list = Array.isArray(input.findings) ? input.findings : [];
    for (let idx = 0; idx < list.length; idx++) {
      rawReportItems++;
      const f = list[idx]!;
      const host = (f.host || `host-${idx + 1}`).trim();
      const hd = ensureHost(host);
      const pid = String(f.pluginId || "").trim();
      if (f.credentialedScanPassed === false || (pid && pid in CREDENTIAL_FAILURE_PLUGIN_REASONS && pid !== "12634")) {
        hd.cred19506 = false;
        if (pid) hd.failedPlugins.add(pid);
        const meta = CREDENTIAL_FAILURE_PLUGIN_REASONS[pid || "21745"]!;
        hd.extraReasons.add(meta.reason);
        hd.fixes.add(meta.fix);
      }

      const sevNum = normalizeNumericSeverity(f.severity ?? 2);
      if (sevNum === 0) continue;

      const cves = [
        ...(Array.isArray(f.cves) ? f.cves : []),
        ...(f.cve ? [f.cve] : []),
      ]
        .map((c) => String(c).trim().toUpperCase())
        .filter(Boolean);

      activeRawItems.push({
        pluginId: pid || cves[0] || `JSON-ITEM-${idx + 1}`,
        pluginName: f.pluginName || (cves[0] ? `Vulnerability ${cves[0]}` : `ACAS Finding ${idx + 1}`),
        pluginFamily: f.pluginFamily || "Vulnerability Scanner",
        host,
        port: f.port || "0/tcp",
        severityNumeric: sevNum,
        cves,
        iavms: Array.isArray(f.iavms) ? f.iavms.map((x) => x.toUpperCase()) : [],
        cvss: Number(f.cvss3 ?? f.cvss2 ?? (sevNum === 4 ? 9.8 : sevNum === 3 ? 7.8 : sevNum === 2 ? 5.3 : 3.1)),
        daysOpen: Math.max(0, Number(f.daysOpen ?? 0)),
        solution: f.solution || "Apply vendor patch and verify with credentialed ACAS rescan.",
        poamTracked: f.poamTracked,
        aoRiskAccepted: f.aoRiskAccepted,
      });
    }
  }

  // Credentialed diagnostics summary
  const hostIssues: AcasCredentialHostIssue[] = [];
  let credentialedHosts = 0;
  let uncredentialedHosts = 0;
  for (const [host, diag] of hostDiagMap.entries()) {
    const failed =
      diag.failedPlugins.size > 0 ||
      diag.cred19506 === false ||
      (diag.credProp !== null && /^false$/i.test(diag.credProp));
    if (failed) {
      uncredentialedHosts++;
      hostIssues.push({
        host,
        ip: diag.ip,
        operatingSystem: diag.os,
        credentialedScanProperty: diag.credProp,
        pluginIds: [...diag.failedPlugins],
        reason: [...diag.extraReasons].join(" ") || "Credentialed ACAS scan failed on target host.",
        remediationSteps:
          diag.fixes.size > 0
            ? [...diag.fixes]
            : ["Verify ACAS scan account credentials, elevation, and local port access before trusting patch posture."],
      });
    } else {
      credentialedHosts++;
    }
  }

  // Deduplicate multi-host vulnerabilities by Plugin ID (or finding key)
  interface DedupBucket {
    findingKey: string;
    pluginId: string;
    pluginName: string;
    pluginFamily: string;
    severityNumeric: 4 | 3 | 2 | 1;
    cves: Set<string>;
    iavms: Set<string>;
    maxCvss: number;
    maxDaysOpen: number;
    hosts: Set<string>;
    ports: Set<string>;
    solution: string;
    aoRiskAccepted: boolean;
  }

  const buckets = new Map<string, DedupBucket>();
  for (const item of activeRawItems) {
    const key = item.pluginId !== "0" ? `PLUGIN:${item.pluginId}` : `NAME:${item.pluginName}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        findingKey: key,
        pluginId: item.pluginId,
        pluginName: item.pluginName,
        pluginFamily: item.pluginFamily,
        severityNumeric: item.severityNumeric,
        cves: new Set(),
        iavms: new Set(),
        maxCvss: item.cvss,
        maxDaysOpen: item.daysOpen,
        hosts: new Set(),
        ports: new Set(),
        solution: item.solution,
        aoRiskAccepted: Boolean(item.aoRiskAccepted),
      };
      buckets.set(key, b);
    }
    if (item.severityNumeric > b.severityNumeric) b.severityNumeric = item.severityNumeric;
    for (const c of item.cves) b.cves.add(c);
    for (const iavm of item.iavms) b.iavms.add(iavm);
    if (item.cvss > b.maxCvss) b.maxCvss = item.cvss;
    if (item.daysOpen > b.maxDaysOpen) b.maxDaysOpen = item.daysOpen;
    b.hosts.add(item.host);
    b.ports.add(item.port);
    if (item.aoRiskAccepted) b.aoRiskAccepted = true;
  }

  const findings: AcasDeduplicatedFinding[] = [];
  const draftPoamItems: AcasDraftPoamItem[] = [];

  for (const b of buckets.values()) {
    const cveList = [...b.cves];
    const kevHits: { cveID: string; entry: CisaKevEntry }[] = [];
    for (const cve of cveList) {
      const hit = kevCatalog.entries.get(cve);
      if (hit) kevHits.push({ cveID: cve, entry: hit });
    }
    const isKev = kevHits.length > 0;
    const sevLabel: AcasDeduplicatedFinding["severityLabel"] =
      b.severityNumeric === 4 ? "CRITICAL" : b.severityNumeric === 3 ? "HIGH" : b.severityNumeric === 2 ? "MEDIUM" : "LOW";
    const catMapping: AcasDeduplicatedFinding["catMapping"] =
      isKev || b.severityNumeric === 4 ? "CAT_I" : b.severityNumeric >= 2 ? "CAT_II" : "CAT_III";
    const priority: AcasDeduplicatedFinding["priority"] = isKev
      ? "P0_KEV_IMMEDIATE"
      : b.severityNumeric === 4
      ? "P1_CRITICAL_CAT_I"
      : b.severityNumeric === 3
      ? "P2_HIGH_CAT_II"
      : b.severityNumeric === 2
      ? "P3_MEDIUM_CAT_II"
      : "P4_LOW_CAT_III";
    const slaDays = isKev ? 15 : b.severityNumeric >= 3 ? 30 : b.severityNumeric === 2 ? 90 : 180;
    const governingAuthority = isKev
      ? "CISA BOD 22-01 KEV / DoDI 8531.01 (KEV supersedes baseline)"
      : b.severityNumeric >= 3
      ? "DoDI 8531.01 / DoDI 8510.01 (verify active IAVA/TASKORD for shorter window)"
      : "DoDI 8531.01 / Component Vulnerability SLA";
    const overdueDays = Math.max(0, b.maxDaysOpen - slaDays);

    findings.push({
      findingKey: b.findingKey,
      pluginId: b.pluginId,
      pluginName: b.pluginName,
      pluginFamily: b.pluginFamily,
      severityNumeric: b.severityNumeric,
      severityLabel: sevLabel,
      catMapping,
      priority,
      slaDays,
      governingAuthority,
      isCisaKev: isKev,
      kevEntries: kevHits.map((k) => ({
        cveID: k.cveID,
        vendor: k.entry.vendorProject,
        product: k.entry.product,
        dueDate: k.entry.dueDate,
        ransomwareUse: k.entry.knownRansomwareCampaignUse,
      })),
      cves: cveList,
      iavms: [...b.iavms],
      maxCvss: Number(b.maxCvss.toFixed(1)),
      daysOpen: b.maxDaysOpen,
      overdueDays,
      assetCount: b.hosts.size,
      affectedHosts: [...b.hosts],
      ports: [...b.ports],
      mappedControls: ["RA-5", "SI-2"],
      validationStatus: "SCANNER_REPORTED_UNVALIDATED",
      independentExploitValidation: "NOT_VALIDATED_BY_SCANNER",
      remediationVerification: "UNVERIFIED_REQUIRES_CREDENTIALED_RESCAN",
      solutionSummary: b.solution.slice(0, 280),
    });
  }

  findings.sort((a, b) => {
    const rank = (p: AcasDeduplicatedFinding["priority"]) =>
      p === "P0_KEV_IMMEDIATE" ? 0 : p === "P1_CRITICAL_CAT_I" ? 1 : p === "P2_HIGH_CAT_II" ? 2 : p === "P3_MEDIUM_CAT_II" ? 3 : 4;
    const diff = rank(a.priority) - rank(b.priority);
    if (diff !== 0) return diff;
    return b.assetCount - a.assetCount;
  });

  findings.forEach((f, idx) => {
    draftPoamItems.push({
      poamId: `POAM-ACAS-${String(idx + 1).padStart(3, "0")}`,
      controlIds: ["RA-5", "SI-2"],
      weaknessTitle: f.pluginName,
      severity: f.severityLabel,
      priority: f.priority,
      assetCount: f.assetCount,
      affectedHosts: f.affectedHosts,
      cves: f.cves,
      isCisaKev: f.isCisaKev,
      targetSlaDays: f.slaDays,
      status: "DRAFT_REQUIRES_ISSM_AND_AO_APPROVAL",
      requiredClosureEvidence:
        "Verified post-remediation credentialed ACAS rescan showing plugin resolved across all affected hosts.",
    });
  });

  const kevMatches = findings.filter((f) => f.isCisaKev).length;
  const criticalCount = findings.filter((f) => f.severityLabel === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severityLabel === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severityLabel === "MEDIUM").length;
  const lowCount = findings.filter((f) => f.severityLabel === "LOW").length;
  const overdueCount = findings.filter((f) => f.overdueDays > 0).length;
  const uniqueHosts = new Set<string>(hostDiagMap.keys());

  const mode: AssessmentMode =
    input.assessmentMode === "FORMAL_EVIDENCE_AUDIT" && input.evidenceVerified ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION";
  const isScenario = mode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  const blockers: string[] = [];
  if (kevMatches > 0) blockers.push(`${kevMatches} CISA KEV finding(s) matched (P0_KEV_IMMEDIATE)`);
  if (criticalCount > 0) blockers.push(`${criticalCount} Critical/CAT I finding(s) detected`);
  if (uncredentialedHosts > 0) {
    blockers.push(`${uncredentialedHosts} host(s) failed credentialed ACAS authentication (local checks unverified)`);
  }
  if (overdueCount > 0) blockers.push(`${overdueCount} finding(s) exceeded remediation SLA`);

  const verdict: DodVerdict =
    hostDiagMap.size === 0 && findings.length === 0
      ? "INSUFFICIENT_EVIDENCE"
      : blockers.length > 0
      ? "FAIL"
      : "PASS";

  const formalDetermination: DodVerdict | "PENDING_EVIDENCE" =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE"
      : input.evidenceVerified === true && uncredentialedHosts === 0
      ? verdict
      : "PENDING_EVIDENCE";

  const ruleObservedFacts: Record<string, string | number | boolean | null> = {
    sourceFormat: isXml ? "NESSUS_XML" : "JSON",
    totalHosts: uniqueHosts.size,
    credentialedHosts,
    uncredentialedHosts,
    deduplicatedActiveFindings: findings.length,
    kevMatches,
    criticalCount,
    highCount,
    overdueCount,
    independentExploitValidation: false,
    remediationVerified: false,
  };

  const ruleAuditHash = sha256Sync(JSON.stringify({ ruleId: "DOD-ACAS-001", ruleObservedFacts, verdict }));

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-ACAS-001",
    ruleVersion: "2020.09.15",
    jurisdiction: "DOD",
    title: "ACAS / Nessus Enterprise Vulnerability Analysis (DoDI 8531.01)",
    verdict,
    assessmentMode: mode,
    formalDetermination,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: ${blockers.join("; ")}. Scanner output remains SCANNER_REPORTED_UNVALIDATED until independent exploitation/applicability review and post-patch credentialed rescan.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: No ACAS .nessus hosts or structured findings supplied."
        : "PASS: No open KEV, Critical, overdue findings, or credentialed-scan failures detected.",
    observedFacts: ruleObservedFacts,
    threshold: "Zero unmitigated KEV/Critical findings; 100% credentialed ACAS scan coverage; DoDI 8531.01 SLA adherence.",
    variance: blockers.length > 0 ? blockers.join(" | ") : "All scanned ACAS hosts credentialed with zero KEV/CAT I blockers.",
    missingEvidence: [
      ...(uncredentialedHosts > 0 ? [`Repair credentialed ACAS authentication on: ${hostIssues.map((h) => h.host).join(", ")}`] : []),
      "Independent ISSM/analyst confirmation of exploitability and applicability beyond raw scanner output",
      "Post-patch credentialed ACAS rescan artifact required prior to marking any finding closed in VMS/eMASS",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8531.01"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    aiCanIssueAto: false,
    auditHash: ruleAuditHash,
  };

  const result: AcasAnalysisResult = {
    sourceFormat: isXml ? "NESSUS_XML" : "JSON",
    kevFeedSource: kevCatalog.source,
    credentialedScanDiagnostics: {
      totalHosts: uniqueHosts.size,
      credentialedHosts,
      uncredentialedHosts,
      failedCredentialHosts: hostIssues.map((h) => h.host),
      hostIssues,
    },
    summary: {
      rawReportItems,
      deduplicatedActiveFindings: findings.length,
      kevMatches,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      overdueCount,
      hostsImpacted: uniqueHosts.size,
      controlsImpacted: ["RA-5", "SI-2"],
    },
    findings,
    draftPoamItems,
    ruleResult,
    epistemicBoundary:
      "Scanner output reports unvalidated vulnerability detections (`SCANNER_REPORTED_UNVALIDATED`). Noctis never treats raw ACAS findings as proof of exploitability or as remediation closure without verified post-patch credentialed rescan artifacts.",
    auditHash: sha256Sync(JSON.stringify({ summary: { totalHosts: uniqueHosts.size, findings: findings.length }, findings })),
  };

  return result;
}

// ----------------------------------------------------------------------------
// 4. DISA STIG Viewer (.ckl) & SCAP XCCDF Evaluator + DOD-STIG-001
// ----------------------------------------------------------------------------

export interface StigJsonCheckInput {
  vulnId?: string;
  ruleId: string;
  title?: string;
  severity?: "CAT_I" | "CAT_II" | "CAT_III" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "FAIL" | "NOT_A_FINDING" | "PASS" | "NOT_APPLICABLE" | "NOT_REVIEWED";
  ccis?: string[];
  findingDetails?: string;
  comments?: string;
}

export interface NormalizedStigEvaluationItem {
  vulnId: string;
  ruleId: string;
  title: string;
  severityCategory: "CAT_I" | "CAT_II" | "CAT_III";
  status: "FAIL" | "PASS" | "NOT_APPLICABLE" | "NOT_REVIEWED";
  ccis: string[];
  cciMapped: boolean;
  nistRev5Controls: string[];
  nistRev4Controls: string[];
  unsubstantiatedAssertion: boolean;
  slaDays: number;
  validationStatus: "CHECKLIST_REPORTED_UNVALIDATED";
  remediationVerified: false;
}

export interface StigChecklistAnalysisResult {
  sourceFormat: "CKL" | "XCCDF" | "JSON";
  benchmarkMeta: {
    title: string;
    version: string | null;
    cciListVersion: string;
  };
  summary: {
    totalChecks: number;
    applicableChecks: number;
    passedChecks: number;
    failedChecks: number;
    notApplicableChecks: number;
    notReviewedCount: number;
    unsubstantiatedNonOpenCount: number;
    compliancePercent: number;
    cat1Open: number;
    cat2Open: number;
    cat3Open: number;
    atoVetoTriggered: boolean;
    impactedNistRev5Controls: string[];
  };
  failedFindings: NormalizedStigEvaluationItem[];
  unsubstantiatedAssertions: NormalizedStigEvaluationItem[];
  notReviewedItems: NormalizedStigEvaluationItem[];
  draftPoamItems: {
    poamId: string;
    vulnId: string;
    ruleId: string;
    severityCategory: "CAT_I" | "CAT_II" | "CAT_III";
    ccis: string[];
    controlIds: string[];
    title: string;
    targetSlaDays: number;
    status: "DRAFT_REQUIRES_ISSM_AND_AO_APPROVAL";
    remediationVerified: false;
    validationStatus: "CHECKLIST_REPORTED_UNVALIDATED";
  }[];
  ruleResult: DodIcRuleResult;
  auditHash: string;
}

function normalizeStigSeverity(raw: string | undefined): "CAT_I" | "CAT_II" | "CAT_III" {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "HIGH" || s === "CAT_I" || s === "CAT I" || s === "I" || s === "1" || s === "CRITICAL") return "CAT_I";
  if (s === "LOW" || s === "CAT_III" || s === "CAT III" || s === "III" || s === "3") return "CAT_III";
  return "CAT_II";
}

function normalizeStigStatus(raw: string | undefined): NormalizedStigEvaluationItem["status"] {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "OPEN" || s === "FAIL" || s === "ERROR") return "FAIL";
  if (s === "NOTAFINDING" || s === "NOT_A_FINDING" || s === "PASS" || s === "FIXED") return "PASS";
  if (s === "NOT_APPLICABLE" || s === "NOTAPPLICABLE" || s === "NA") return "NOT_APPLICABLE";
  return "NOT_REVIEWED";
}

function mapCcisToControls(ccis: string[]): { cciMapped: boolean; rev5: string[]; rev4: string[] } {
  const rev5Set = new Set<string>();
  const rev4Set = new Set<string>();
  let anyMapped = false;
  for (const rawCci of ccis) {
    const rec = lookupDisaCci(rawCci);
    if (!rec) continue;
    for (const c of rec.nistRev5Controls) {
      rev5Set.add(c);
      anyMapped = true;
    }
    for (const c of rec.nistRev4Controls) {
      rev4Set.add(c);
      anyMapped = true;
    }
  }
  if (!anyMapped) {
    return { cciMapped: false, rev5: ["CM-6"], rev4: ["CM-6"] };
  }
  const rev5 = rev5Set.size > 0 ? [...rev5Set] : [...rev4Set];
  const rev4 = [...rev4Set];
  return { cciMapped: true, rev5, rev4 };
}

export function parseAndEvaluateStigXccdfOrCkl(input: {
  cklXml?: string;
  xccdfXml?: string;
  checks?: StigJsonCheckInput[];
  benchmarkTitle?: string;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): StigChecklistAnalysisResult {
  const cklText = typeof input.cklXml === "string" ? input.cklXml.trim() : "";
  const xccdfText = typeof input.xccdfXml === "string" ? input.xccdfXml.trim() : "";

  let sourceFormat: "CKL" | "XCCDF" | "JSON" = "JSON";
  let title = input.benchmarkTitle || "DISA STIG / SCAP Compliance Assessment";
  let version: string | null = null;

  interface ParsedCheck {
    vulnId: string;
    ruleId: string;
    title: string;
    severityCategory: "CAT_I" | "CAT_II" | "CAT_III";
    status: NormalizedStigEvaluationItem["status"];
    ccis: string[];
    findingDetails: string;
    comments: string;
    fromAutomatedXccdf: boolean;
  }

  const parsed: ParsedCheck[] = [];

  if (cklText && /<(?:CHECKLIST|STIG_INFO|VULN)\b/i.test(cklText)) {
    sourceFormat = "CKL";
    const stigInfoBlock = cklText.match(/<STIG_INFO>([\s\S]*?)<\/STIG_INFO>/i)?.[1] || "";
    for (const siMatch of stigInfoBlock.matchAll(/<SI_DATA>([\s\S]*?)<\/SI_DATA>/gi)) {
      const sidName = extractXmlTagText(siMatch[1]!, "SID_NAME").toLowerCase();
      const sidData = extractXmlTagText(siMatch[1]!, "SID_DATA");
      if (sidName === "title" && sidData) title = sidData;
      if ((sidName === "version" || sidName === "releaseinfo") && sidData && !version) version = sidData;
    }

    for (const vMatch of cklText.matchAll(/<VULN>([\s\S]*?)<\/VULN>/gi)) {
      const vBody = vMatch[1]!;
      let vulnId = "";
      let ruleId = "";
      let ruleTitle = "";
      let sev = "medium";
      const ccis: string[] = [];

      for (const sdMatch of vBody.matchAll(/<STIG_DATA>([\s\S]*?)<\/STIG_DATA>/gi)) {
        const attr = extractXmlTagText(sdMatch[1]!, "VULN_ATTRIBUTE").trim();
        const data = extractXmlTagText(sdMatch[1]!, "ATTRIBUTE_DATA").trim();
        if (attr === "Vuln_Num") vulnId = data;
        else if (attr === "Rule_ID") ruleId = data;
        else if (attr === "Rule_Title") ruleTitle = data;
        else if (attr === "Severity") sev = data;
        else if (attr === "CCI_REF" && data) {
          const norm = normalizeCciId(data);
          if (norm && !ccis.includes(norm)) ccis.push(norm);
        }
      }

      const rawStatus = extractXmlTagText(vBody, "STATUS") || "Not_Reviewed";
      const findingDetails = extractXmlTagText(vBody, "FINDING_DETAILS");
      const comments = extractXmlTagText(vBody, "COMMENTS");

      parsed.push({
        vulnId: vulnId || ruleId || `V-UNSPEC-${parsed.length + 1}`,
        ruleId: ruleId || vulnId || `SV-UNSPEC-${parsed.length + 1}`,
        title: ruleTitle || vulnId || "DISA STIG Check",
        severityCategory: normalizeStigSeverity(sev),
        status: normalizeStigStatus(rawStatus),
        ccis,
        findingDetails,
        comments,
        fromAutomatedXccdf: false,
      });
    }
  } else if (xccdfText && /<(?:[a-zA-Z0-9_.-]+:)?(?:rule-result|TestResult|Benchmark)\b/i.test(xccdfText)) {
    sourceFormat = "XCCDF";
    const benchTitle = extractXmlTagText(xccdfText, "(?:[a-zA-Z0-9_.-]+:)?title");
    if (benchTitle && !input.benchmarkTitle) title = benchTitle;

    // Optional Rule metadata lookup from XCCDF <Rule id="...">
    const ruleMeta = new Map<string, { title: string; severity: string; ccis: string[] }>();
    for (const rMatch of xccdfText.matchAll(/<(?:[a-zA-Z0-9_.-]+:)?Rule\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_.-]+:)?Rule>/gi)) {
      const attrs = parseXmlAttrs(rMatch[1]!);
      const rBody = rMatch[2]!;
      const id = attrs.id || "";
      if (!id) continue;
      const rTitle = extractXmlTagText(rBody, "(?:[a-zA-Z0-9_.-]+:)?title") || id;
      const identCcis = extractCciIdsFromText(rBody);
      ruleMeta.set(id, { title: rTitle, severity: attrs.severity || "medium", ccis: identCcis });
    }

    for (const rrMatch of xccdfText.matchAll(/<(?:[a-zA-Z0-9_.-]+:)?rule-result\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_.-]+:)?rule-result>/gi)) {
      const attrs = parseXmlAttrs(rrMatch[1]!);
      const rrBody = rrMatch[2]!;
      const idref = attrs.idref || `XCCDF-${parsed.length + 1}`;
      const meta = ruleMeta.get(idref);
      const resultText =
        rrBody.match(/<(?:[a-zA-Z0-9_.-]+:)?result\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_.-]+:)?result>/i)?.[1] || "notchecked";
      const ccis = [...new Set([...(meta?.ccis || []), ...extractCciIdsFromText(rrBody)])];
      const msg = extractXmlTagText(rrBody, "(?:[a-zA-Z0-9_.-]+:)?message");
      const vulnMatch = idref.match(/V-\d+/i);

      parsed.push({
        vulnId: vulnMatch?.[0] || idref,
        ruleId: idref,
        title: meta?.title || idref,
        severityCategory: normalizeStigSeverity(attrs.severity || meta?.severity),
        status: normalizeStigStatus(resultText),
        ccis,
        findingDetails: msg,
        comments: "",
        fromAutomatedXccdf: true,
      });
    }
  } else {
    sourceFormat = "JSON";
    const list = Array.isArray(input.checks) ? input.checks : [];
    for (let idx = 0; idx < list.length; idx++) {
      const c = list[idx]!;
      parsed.push({
        vulnId: c.vulnId || c.ruleId || `V-${idx + 1}`,
        ruleId: c.ruleId || c.vulnId || `SV-${idx + 1}`,
        title: c.title || c.ruleId || "DISA STIG Check",
        severityCategory: normalizeStigSeverity(c.severity),
        status: normalizeStigStatus(c.status),
        ccis: (Array.isArray(c.ccis) ? c.ccis : []).map((x) => normalizeCciId(x) || x).filter(Boolean),
        findingDetails: (c.findingDetails || "").trim(),
        comments: (c.comments || "").trim(),
        fromAutomatedXccdf: false,
      });
    }
  }

  const items: NormalizedStigEvaluationItem[] = parsed.map((p) => {
    const mapped = mapCcisToControls(p.ccis);
    const hasJustification = p.comments.trim().length > 0 || p.findingDetails.trim().length > 0;
    const unsubstantiated =
      p.status === "NOT_APPLICABLE"
        ? !hasJustification
        : p.status === "PASS" && !p.fromAutomatedXccdf && !hasJustification;

    return {
      vulnId: p.vulnId,
      ruleId: p.ruleId,
      title: p.title,
      severityCategory: p.severityCategory,
      status: p.status,
      ccis: p.ccis,
      cciMapped: mapped.cciMapped,
      nistRev5Controls: mapped.rev5,
      nistRev4Controls: mapped.rev4,
      unsubstantiatedAssertion: unsubstantiated,
      slaDays: p.severityCategory === "CAT_I" ? 30 : p.severityCategory === "CAT_II" ? 90 : 180,
      validationStatus: "CHECKLIST_REPORTED_UNVALIDATED",
      remediationVerified: false,
    };
  });

  const applicable = items.filter((i) => i.status !== "NOT_APPLICABLE");
  const passed = applicable.filter((i) => i.status === "PASS");
  const failed = items.filter((i) => i.status === "FAIL");
  const notApplicable = items.filter((i) => i.status === "NOT_APPLICABLE");
  const notReviewed = items.filter((i) => i.status === "NOT_REVIEWED");
  const unsubstantiatedList = items.filter((i) => i.unsubstantiatedAssertion);

  const cat1Open = failed.filter((f) => f.severityCategory === "CAT_I").length;
  const cat2Open = failed.filter((f) => f.severityCategory === "CAT_II").length;
  const cat3Open = failed.filter((f) => f.severityCategory === "CAT_III").length;
  const compliancePercent = applicable.length > 0 ? Number(((passed.length / applicable.length) * 100).toFixed(2)) : 0;
  const atoVetoTriggered = cat1Open > 0;

  const impactedRev5 = new Set<string>();
  for (const f of [...failed, ...notReviewed, ...unsubstantiatedList]) {
    for (const c of f.nistRev5Controls) impactedRev5.add(c);
  }

  const draftPoamItems = failed.map((f, idx) => ({
    poamId: `POAM-STIG-${String(idx + 1).padStart(3, "0")}`,
    vulnId: f.vulnId,
    ruleId: f.ruleId,
    severityCategory: f.severityCategory,
    ccis: f.ccis,
    controlIds: f.nistRev5Controls,
    title: f.title,
    targetSlaDays: f.slaDays,
    status: "DRAFT_REQUIRES_ISSM_AND_AO_APPROVAL" as const,
    remediationVerified: false as const,
    validationStatus: "CHECKLIST_REPORTED_UNVALIDATED" as const,
  }));

  const mode: AssessmentMode =
    input.assessmentMode === "FORMAL_EVIDENCE_AUDIT" && input.evidenceVerified ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION";

  const blockers: string[] = [];
  if (cat1Open > 0) blockers.push(`${cat1Open} CAT I Open STIG finding(s) trigger DoDI 8510.01 ATO veto absent AO risk acceptance`);
  if (applicable.length > 0 && compliancePercent < 90) blockers.push(`STIG compliance ${compliancePercent}% below 90% threshold`);
  const reviewReasons: string[] = [];
  if (notReviewed.length > 0) reviewReasons.push(`${notReviewed.length} check(s) remain Not_Reviewed`);
  if (unsubstantiatedList.length > 0) {
    reviewReasons.push(`${unsubstantiatedList.length} Not_Applicable/NotAFinding assertion(s) lack supporting comments or finding details`);
  }

  const verdict: DodVerdict =
    items.length === 0
      ? "INSUFFICIENT_EVIDENCE"
      : blockers.length > 0
      ? "FAIL"
      : reviewReasons.length > 0
      ? "MANUAL_REVIEW_REQUIRED"
      : "PASS";

  const formalDetermination: DodVerdict | "PENDING_EVIDENCE" =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE"
      : input.evidenceVerified === true && notReviewed.length === 0 && unsubstantiatedList.length === 0
      ? verdict
      : "PENDING_EVIDENCE";

  const summary =
    verdict === "FAIL"
      ? `FAIL: ${[...blockers, ...reviewReasons].join("; ")}. Compliance=${compliancePercent}% (${passed.length}/${applicable.length}).`
      : verdict === "MANUAL_REVIEW_REQUIRED"
      ? `MANUAL_REVIEW_REQUIRED: ${reviewReasons.join("; ")}. SCA/ISSM review needed before closure.`
      : verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE: No DISA STIG .ckl, SCAP XCCDF, or structured STIG checks provided."
      : `PASS: Compliance=${compliancePercent}%, zero CAT I open findings, and zero unsubstantiated assertions.`;

  const observedFacts: Record<string, string | number | boolean | null> = {
    sourceFormat,
    benchmarkTitle: title,
    totalChecks: items.length,
    applicableChecks: applicable.length,
    cat1Open,
    cat2Open,
    cat3Open,
    notReviewedCount: notReviewed.length,
    unsubstantiatedNonOpenCount: unsubstantiatedList.length,
    compliancePercent,
    atoVetoTriggered,
  };

  const ruleResult: DodIcRuleResult = {
    ruleId: "DOD-STIG-001",
    ruleVersion: RAW_CCI_DB.manifest.version,
    jurisdiction: "DOD",
    title: "DISA STIG / SCAP Compliance & CCI-to-NIST SP 800-53 Evaluation",
    verdict,
    assessmentMode: mode,
    formalDetermination,
    summary,
    observedFacts,
    threshold: "Zero unmitigated CAT I Open findings; >= 90% applicable pass rate; documented proof for every Not_Applicable/NotAFinding check.",
    variance: [...blockers, ...reviewReasons].join(" | ") || `Compliant (${compliancePercent}%)`,
    missingEvidence: [
      ...(unsubstantiatedList.length > 0
        ? [`Document technical justification/comments for: ${unsubstantiatedList.map((u) => u.vulnId).join(", ")}`]
        : []),
      ...(notReviewed.length > 0 ? [`Complete manual STIG review for: ${notReviewed.map((u) => u.vulnId).join(", ")}`] : []),
      "Signed SCA review and post-remediation SCAP/.ckl verification scan prior to closure",
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DISA-STIG-CCI"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId: "DOD-STIG-001", observedFacts, verdict })),
  };

  return {
    sourceFormat,
    benchmarkMeta: {
      title,
      version,
      cciListVersion: RAW_CCI_DB.manifest.version,
    },
    summary: {
      totalChecks: items.length,
      applicableChecks: applicable.length,
      passedChecks: passed.length,
      failedChecks: failed.length,
      notApplicableChecks: notApplicable.length,
      notReviewedCount: notReviewed.length,
      unsubstantiatedNonOpenCount: unsubstantiatedList.length,
      compliancePercent,
      cat1Open,
      cat2Open,
      cat3Open,
      atoVetoTriggered,
      impactedNistRev5Controls: [...impactedRev5],
    },
    failedFindings: failed,
    unsubstantiatedAssertions: unsubstantiatedList,
    notReviewedItems: notReviewed,
    draftPoamItems,
    ruleResult,
    auditHash: sha256Sync(JSON.stringify({ totalChecks: items.length, cat1Open, compliancePercent, impactedRev5: [...impactedRev5] })),
  };
}

// ----------------------------------------------------------------------------
// 5. DoDI 8531.01 Vulnerability Management Rule (DOD-VULN-8531-001)
// ----------------------------------------------------------------------------

export function evaluateDodi8531VulnerabilityCompliance(input: {
  cveId?: string | null;
  severityCategory?: "CRITICAL" | "HIGH" | "MODERATE" | "MEDIUM" | "LOW" | "CAT_I" | "CAT_II" | "CAT_III";
  isCisaKev?: boolean | null;
  hasActiveIava?: boolean | null;
  iavaDueDays?: number | null;
  daysOpen?: number | null;
  credentialedScanPassed?: boolean | null;
  poamTracked?: boolean | null;
  aoRiskAccepted?: boolean | null;
  remediationRescanVerified?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodIcRuleResult {
  const ruleId = "DOD-VULN-8531-001";
  const ruleVersion = "2020.09.15";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  const rawSev = (input.severityCategory || "HIGH").toUpperCase();
  const isKev = input.isCisaKev === true;
  const baselineSlaDays = isKev
    ? 15
    : rawSev === "CRITICAL" || rawSev === "CAT_I" || rawSev === "HIGH"
    ? 30
    : rawSev === "MODERATE" || rawSev === "MEDIUM" || rawSev === "CAT_II"
    ? 90
    : 180;
  const governingSlaDays =
    typeof input.iavaDueDays === "number" && input.iavaDueDays > 0
      ? Math.min(baselineSlaDays, input.iavaDueDays)
      : baselineSlaDays;

  const daysOpen = typeof input.daysOpen === "number" ? Math.max(0, input.daysOpen) : null;
  const overdueDays = daysOpen !== null ? Math.max(0, daysOpen - governingSlaDays) : 0;

  const blockers: string[] = [];
  if (input.credentialedScanPassed === false) {
    blockers.push("ACAS credentialed scan authentication failed (local vulnerability status is unverified)");
  }
  if (daysOpen !== null && overdueDays > 0 && input.aoRiskAccepted !== true && input.remediationRescanVerified !== true) {
    blockers.push(
      `Finding open ${daysOpen} day(s), exceeding ${governingSlaDays}-day ${isKev ? "CISA KEV/DoDI 8531.01" : "DoDI 8531.01"} window by ${overdueDays} day(s)`,
    );
  }
  if (input.poamTracked === false && input.remediationRescanVerified !== true) {
    blockers.push("Unremediated vulnerability lacks required eMASS/VMS POA&M tracking");
  }

  const hasSignal =
    input.daysOpen != null ||
    input.credentialedScanPassed != null ||
    input.poamTracked != null ||
    input.isCisaKev != null ||
    input.remediationRescanVerified != null;

  const verdict: DodVerdict = !hasSignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : input.remediationRescanVerified === false && daysOpen !== null
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const formalDetermination: DodVerdict | "PENDING_EVIDENCE" =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE"
      : input.evidenceVerified === true && input.credentialedScanPassed !== false
      ? verdict
      : "PENDING_EVIDENCE";

  const observedFacts: Record<string, string | number | boolean | null> = {
    cveId: input.cveId ?? null,
    severityCategory: rawSev,
    isCisaKev: isKev,
    hasActiveIava: input.hasActiveIava ?? null,
    governingSlaDays,
    daysOpen,
    overdueDays,
    credentialedScanPassed: input.credentialedScanPassed ?? null,
    poamTracked: input.poamTracked ?? null,
    aoRiskAccepted: input.aoRiskAccepted ?? null,
    remediationRescanVerified: input.remediationRescanVerified ?? false,
  };

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "DOD",
    title: "DoDI 8531.01 Vulnerability Remediation & Credentialed Verification",
    verdict,
    assessmentMode: isScenario ? "SCENARIO_ASSUMPTION" : "FORMAL_EVIDENCE_AUDIT",
    formalDetermination,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: ${blockers.join("; ")}. Scanner findings remain unvalidated for closure until a post-patch credentialed ACAS rescan confirms mitigation.`
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? "MANUAL_REVIEW_REQUIRED: Within SLA window, but post-patch credentialed ACAS rescan has not verified closure."
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Provide age in days, KEV/IAVA status, and credentialed ACAS scan telemetry."
        : "PASS: Finding within governing DoDI 8531.01/KEV SLA with credentialed verification.",
    observedFacts,
    threshold: `Remediate within ${governingSlaDays} day(s) (${isKev ? "CISA KEV supersedes baseline" : rawSev}); maintain 100% credentialed scan verification.`,
    variance: blockers.join(" | ") || `Open ${daysOpen ?? 0}d vs ${governingSlaDays}d SLA (+${overdueDays}d overdue)`,
    missingEvidence: [
      "Post-remediation credentialed ACAS scan (.nessus) confirming plugin 19506=yes and vulnerability cleared",
      "Active VMS / eMASS POA&M milestone or signed DoD AO risk acceptance if remediation cannot meet SLA",
      ...(input.hasActiveIava ? ["Verify exact USCYBERCOM / JFHQ-DODIN IAVA or TASKORD due date"] : []),
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8531.01"]!, DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, observedFacts, verdict })),
  };
}

// ----------------------------------------------------------------------------
// 6. DoDI 8530.03 Cyber Incident Response Rule (DOD-CIR-8530-001)
// ----------------------------------------------------------------------------

export function evaluateDodi8530IncidentReporting(input: {
  incidentCategory?: "ROOT_COMPROMISE" | "CLASSIFIED_SPILLAGE" | "USER_COMPROMISE" | "MALICIOUS_LOGIC" | "DOS" | "SUSPICIOUS_ACTIVITY";
  hoursSinceDiscovery?: number | null;
  csspNotified?: boolean | null;
  uscybercomJfhqNotified?: boolean | null;
  containmentInitiated?: boolean | null;
  forensicEvidencePreserved?: boolean | null;
  affectsClassifiedOrNss?: boolean | null;
  assessmentMode?: AssessmentMode;
  evidenceVerified?: boolean;
}): DodIcRuleResult {
  const ruleId = "DOD-CIR-8530-001";
  const ruleVersion = "2023.08.09";
  const isScenario = input.assessmentMode === "SCENARIO_ASSUMPTION" && input.evidenceVerified !== true;

  const cat = input.incidentCategory || (input.affectsClassifiedOrNss ? "CLASSIFIED_SPILLAGE" : "ROOT_COMPROMISE");
  const maxInitialReportHours =
    cat === "ROOT_COMPROMISE" || cat === "CLASSIFIED_SPILLAGE"
      ? 1
      : cat === "SUSPICIOUS_ACTIVITY"
      ? 24
      : 2;

  const hours = typeof input.hoursSinceDiscovery === "number" ? Math.max(0, input.hoursSinceDiscovery) : null;
  const blockers: string[] = [];

  if (input.csspNotified === false) {
    blockers.push(
      hours !== null && hours > maxInitialReportHours
        ? `Aligned CSSP / Component CERT NOT notified (${hours}h elapsed exceeds ${maxInitialReportHours}h benchmark by ${(hours - maxInitialReportHours).toFixed(1)}h)`
        : `Aligned CSSP / Component CERT has not been notified for ${cat}`,
    );
  }
  if (cat === "CLASSIFIED_SPILLAGE" && input.affectsClassifiedOrNss !== false) {
    if (input.containmentInitiated === false) blockers.push("Spillage containment/isolation NOT initiated per DoDM 5200.01 & DoDI 8530.03");
  }
  if (input.forensicEvidencePreserved === false) {
    blockers.push("Forensic volatile memory/logs NOT preserved prior to eradication/re-imaging");
  }

  const hasSignal =
    input.hoursSinceDiscovery != null ||
    input.csspNotified != null ||
    input.uscybercomJfhqNotified != null ||
    input.containmentInitiated != null ||
    input.forensicEvidencePreserved != null;

  const verdict: DodVerdict = !hasSignal
    ? "INSUFFICIENT_EVIDENCE"
    : blockers.length > 0
    ? "FAIL"
    : input.uscybercomJfhqNotified === false
    ? "MANUAL_REVIEW_REQUIRED"
    : "PASS";

  const formalDetermination: DodVerdict | "PENDING_EVIDENCE" =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "INSUFFICIENT_EVIDENCE"
      : input.evidenceVerified === true
      ? verdict
      : "PENDING_EVIDENCE";

  const observedFacts: Record<string, string | number | boolean | null> = {
    incidentCategory: cat,
    maxInitialReportHours,
    hoursSinceDiscovery: hours,
    csspNotified: input.csspNotified ?? null,
    uscybercomJfhqNotified: input.uscybercomJfhqNotified ?? null,
    containmentInitiated: input.containmentInitiated ?? null,
    forensicEvidencePreserved: input.forensicEvidencePreserved ?? null,
    affectsClassifiedOrNss: input.affectsClassifiedOrNss ?? null,
  };

  return {
    ruleId,
    ruleVersion,
    jurisdiction: "DOD",
    title: "DoDI 8530.03 Cyber Incident Response & CSSP Escalation",
    verdict,
    assessmentMode: isScenario ? "SCENARIO_ASSUMPTION" : "FORMAL_EVIDENCE_AUDIT",
    formalDetermination,
    summary:
      verdict === "FAIL"
        ? `${isScenario ? "SCENARIO FAIL" : "FAIL"}: DoDI 8530.03 (${ruleVersion}) deficiency — ${blockers.join("; ")}.`
        : verdict === "INSUFFICIENT_EVIDENCE"
        ? "INSUFFICIENT_EVIDENCE: Missing discovery timeline, CSSP notification state, or forensic preservation facts under DoDI 8530.03."
        : verdict === "MANUAL_REVIEW_REQUIRED"
        ? "MANUAL_REVIEW_REQUIRED: CSSP notified; verify JFHQ-DODIN / Component CERT escalation ticket."
        : `PASS: Initial DoDI 8530.03 CSSP reporting (${maxInitialReportHours}h benchmark for ${cat}) and forensic preservation controls satisfied.`,
    observedFacts,
    threshold: `Initial CSSP/CERT report <= ${maxInitialReportHours}h for ${cat}; preserve forensic evidence before wipe; isolate spillage immediately.`,
    variance: blockers.join(" | ") || `Within ${maxInitialReportHours}h CSSP reporting benchmark`,
    missingEvidence: [
      "CSSP / JFHQ-DODIN incident ticket timestamp & CND incident report",
      "Chain-of-custody SHA-256 hashes for captured memory/disk/audit log images",
      ...(cat === "CLASSIFIED_SPILLAGE" ? ["DoDM 5200.01 Security Officer spillage report & sanitization certificate"] : []),
    ],
    authorityCitations: [DOD_IC_POLICY_REGISTRY["DODI-8530.03"]!, DOD_IC_POLICY_REGISTRY["EO-13526-DODM-5200.01"]!],
    aiCanIssueAto: false,
    auditHash: sha256Sync(JSON.stringify({ ruleId, observedFacts, verdict })),
  };
}
