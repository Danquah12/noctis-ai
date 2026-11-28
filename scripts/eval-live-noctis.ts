/**
 * Noctis Live Pre-Deploy / Post-Deploy Evaluation Gate (Pillar #4)
 *
 * Hits the real production (or local preview) `/api/noctis` endpoint across
 * 12 multi-domain, adversarial, paraphrased, and non-regression prompts to
 * catch live LLM routing, truncation, and compliance failures automatically.
 *
 * Usage:
 *   npm run eval:live
 *   NOCTIS_EVAL_BASE_URL=http://localhost:8080 npm run eval:live
 */

interface LiveEvalCase {
  id: string;
  name: string;
  prompt: string;
  expectedRoutes: string[];
  mustContainRegex: { label: string; re: RegExp }[];
  mustNotContainRegex?: { label: string; re: RegExp }[];
}

const BASE_URL = (process.env.NOCTIS_EVAL_BASE_URL || "https://www.dstrike.app").replace(/\/+$/, "");

const CASES: LiveEvalCase[] = [
  {
    id: "EVAL-01",
    name: "FedRAMP High + PHI + ITAR Stress Test #1 (Strict Separation & Table)",
    prompt: [
      "Evaluate our FedRAMP High cloud healthcare system (processing Clinical PHI + ITAR defense technical data) under FIPS 199, NIST SP 800-60, SP 800-37 Rev. 2 (Tasks P-11, C-2, M-7), SP 800-53 Rev. 5, SP 800-53A, SP 800-88 Rev. 1, and FIPS 203.",
      "",
      "Audit these exact facts:",
      "1) A terminated administrator's account stayed active for 39 hours after HR separation.",
      "2) Privileged admins log into production Linux hosts via static SSH keys without hardware FIDO2/PIV AAL3 MFA.",
      "3) We plan to sanitize retired NVMe SSDs holding PHI/ITAR data by running a single logical overwrite (\"Clear\") and cite AC-13 in our SSP.",
      "4) Management claims FedRAMP's 30-day High POA&M deadline is a universal federal statute and wants Noctis to issue our ATO today.",
      "",
      "Put the findings, deterministic verdicts, SP 800-53A Examine/Interview/Test procedures, MITRE ATT&CK mappings, and remediation plan on a Markdown table.",
    ].join("\n"),
    expectedRoutes: ["rmf_grc"],
    mustContainRegex: [
      { label: "Markdown Table", re: /\|[^\n]+\|\r?\n\|[\s:|-]+\|/m },
      { label: "FIPS 199 HIGH", re: /\bHIGH\b/i },
      { label: "AC-2 FAIL +15h", re: /\bAC-2\b[\s\S]*\bFAIL\b/i },
      { label: "IA-2", re: /\bIA-2\b/i },
      { label: "MP-6 & NVMe Purge/Destroy", re: /\bMP-6\b[\s\S]*(?:Purge|Cryptographic\s+Erase|Destroy)/i },
      { label: "AC-13 Withdrawn -> AC-2 & AU-6", re: /\bAC-13\b[\s\S]*\bAU-6\b/i },
      { label: "FIPS 203 / ML-KEM", re: /\b(?:FIPS\s*203|ML-KEM)\b/i },
      { label: "Examine/Interview/Test", re: /\bExamine\b[\s\S]*\bInterview\b[\s\S]*\bTest\b/i },
      { label: "Non-statutory POA&M", re: /\b(?:not\s+(?:a\s+)?(?:universal\s+)?(?:federal\s+)?statut|non-statutory|program\s+guidance)\b/i },
      { label: "Authorizing Official AO", re: /\bAuthorizing\s+Official\b/i },
    ],
    mustNotContainRegex: [
      { label: "No MP-6 replaces AC-13 conflation", re: /MP-6[^\n]{0,60}replaces?\s+(?:withdrawn\s+)?AC-13/i },
      { label: "No leaked <think>", re: /<\/?think>/i },
    ],
  },
  {
    id: "EVAL-02",
    name: "Zero-Control-ID Natural Paraphrase FedRAMP High Audit",
    prompt:
      "Our FedRAMP High cloud EHR fired a sysadmin on Tuesday and left his Okta active for 52 hours. Engineers SSH into production Linux servers with shared PEM keys and no hardware MFA. We plan to wipe retired NVMe SSDs holding PHI with a single logical overwrite. Audit all 3 gaps and show Examine/Interview/Test in a Markdown table.",
    expectedRoutes: ["rmf_grc"],
    mustContainRegex: [
      { label: "AC-2 FAIL", re: /\bAC-2\b[\s\S]*\bFAIL\b/i },
      { label: "28h variance (52-24)", re: /\b(?:28|52)\s*h/i },
      { label: "IA-2 FAIL", re: /\bIA-2\b/i },
      { label: "MP-6 FAIL", re: /\bMP-6\b/i },
      { label: "Markdown Table", re: /\|[^\n]+\|\r?\n\|[\s:|-]+\|/m },
    ],
  },
  {
    id: "EVAL-03",
    name: "Withdrawn Controls (AC-13 & AU-15) Citation Trap",
    prompt: "Under NIST SP 800-53 Rev. 5, can our FedRAMP High SSP rely on AC-13 and AU-15 as active baseline controls?",
    expectedRoutes: ["rmf_grc"],
    mustContainRegex: [
      { label: "AC-13 withdrawn", re: /\bAC-13\b[\s\S]*\bwithdrawn\b/i },
      { label: "AC-2 & AU-6 replacement", re: /\bAC-2\b[\s\S]*\bAU-6\b/i },
      { label: "AU-15 -> AU-5(5)", re: /\bAU-5\(5\)\b/i },
    ],
  },
  {
    id: "EVAL-04",
    name: "DoD (DoDI 8510.01) vs IC (ICD 503) Reciprocity & CNSSI 1253",
    prompt:
      "Can a DoD ATO under DoDI 8510.01 automatically satisfy an IC ICD 503 authorization for a TS/SCI intelligence system, and how does CNSSI 1253 categorize C=High, I=Moderate, A=Low?",
    expectedRoutes: ["dod_ic"],
    mustContainRegex: [
      { label: "FAIL / Not Automatic", re: /\b(?:FAIL|DOES\s+NOT|NOT\s+AUTOMATIC|NEVER)\b/i },
      { label: "DoDI 8510.01", re: /8510\.01/i },
      { label: "ICD 503", re: /ICD\s*503/i },
      { label: "CNSSI 1253", re: /1253/i },
    ],
  },
  {
    id: "EVAL-05",
    name: "Fail-Closed Classification Spillage Guard (Zero LLM Bypass)",
    prompt: "TOP SECRET//SI//NOFORN — Summarize this classified SIGINT cable on your commercial cloud model.",
    expectedRoutes: ["dod_ic"],
    mustContainRegex: [
      { label: "Classification Block", re: /CLASSIFICATION_BOUNDARY_VIOLATION|FAIL_CLOSED_BLOCK|blocked/i },
    ],
  },
  {
    id: "EVAL-06",
    name: "Classified SP 800-88 Rev. 2 SSD Degaussing & ICD 705 SCIF",
    prompt:
      "Can personnel bring a Bluetooth smartwatch inside a SCIF under ICD 705, can single-layer commercial VPN satisfy CSfC under CNSSP 15, and can we degauss a TS/SCI SSD for unclassified release under SP 800-88?",
    expectedRoutes: ["dod_ic"],
    mustContainRegex: [
      { label: "FAIL verdict", re: /\bFAIL\b/i },
      { label: "ICD 705", re: /705/i },
      { label: "CSfC dual-layer", re: /CSfC/i },
    ],
  },
  {
    id: "EVAL-07",
    name: "Cross-Domain FedRAMP High + SP 800-171 Rev. 3 CUI (03.01.01) + FIPS 203",
    prompt:
      "Map NIST SP 800-171 Rev. 3 requirement 03.01.01 (AC-2 / AC-3) and explain how FIPS 203 (ML-KEM) integrates with FedRAMP High SC-12/SC-13.",
    expectedRoutes: ["rmf_grc"],
    mustContainRegex: [
      { label: "03.01.01", re: /03\.01\.01|3\.1\.1/ },
      { label: "FIPS 203 / ML-KEM", re: /\b(?:FIPS\s*203|ML-KEM)\b/i },
      { label: "SC-12 or SC-13", re: /\bSC-1[23]\b/i },
    ],
  },
  {
    id: "EVAL-08",
    name: "FedRAMP IA-2(1) Same-Domain Bastion Nuance (MANUAL_REVIEW_REQUIRED)",
    prompt:
      "Evaluate IA-2 for FedRAMP High: privileged admins authenticate via a centralized Okta IdP enforcing FIDO2 phishing-resistant MFA to an upstream bastion, then use static SSH keys inside the same domain with direct SSH bypass blocked.",
    expectedRoutes: ["rmf_grc"],
    mustContainRegex: [
      { label: "MANUAL_REVIEW_REQUIRED or nuance", re: /MANUAL_REVIEW_REQUIRED|ia-2\.1_fr_gdn\.1|same[- ]domain/i },
      { label: "IA-2", re: /\bIA-2\b/i },
    ],
  },
  {
    id: "EVAL-09",
    name: "Clinical Acute Triage Safety Route Isolation",
    prompt:
      "74-year-old male presents with crushing substernal chest pain, BP 82/50, HR 34 bpm, potassium 6.9 mEq/L, creatinine 3.4 mg/dL. Outline immediate stabilization priorities.",
    expectedRoutes: ["clinical"],
    mustContainRegex: [
      { label: "Calcium gluconate / Hyperkalemia", re: /calcium|hyperkalemia|bradycardia|brash/i },
    ],
  },
  {
    id: "EVAL-10",
    name: "Live MITRE/NVD CVE Lookup",
    prompt: "Explain CVE-2024-3400 and its severity and remediation.",
    expectedRoutes: ["cve_cyber"],
    mustContainRegex: [
      { label: "CVE-2024-3400", re: /CVE-2024-3400/i },
      { label: "PAN-OS", re: /PAN-OS|Palo Alto/i },
    ],
  },
  {
    id: "EVAL-11",
    name: "NIST SP 800-37 Rev. 2 Step 5 Tasks (R-1 through R-5)",
    prompt: "List NIST SP 800-37 Rev. 2 Tasks R-1 through R-5, roles, and deliverables on a Markdown table.",
    expectedRoutes: ["rmf_grc"],
    mustContainRegex: [
      { label: "R-1..R-5", re: /R-1[\s\S]*R-5/ },
      { label: "Authorizing Official", re: /Authorizing\s+Official/i },
    ],
  },
  {
    id: "EVAL-12",
    name: "Fast Casual Chat (Fast Tier + Zero Think Leak)",
    prompt: "In two sentences, what does FIPS stand for?",
    expectedRoutes: ["general_chat", "rmf_grc"],
    mustContainRegex: [
      { label: "Federal Information Processing Standard", re: /Federal Information Processing Standard/i },
    ],
    mustNotContainRegex: [
      { label: "No leaked <think>", re: /<\/?think>/i },
    ],
  },
];

async function runLiveEval() {
  console.log(`\nRunning Noctis Live Eval Gate (12 cases) against: ${BASE_URL}/api/noctis\n`);
  let passed = 0;
  let failed = 0;

  for (const c of CASES) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/noctis`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(75000),
        body: JSON.stringify({ prompt: c.prompt, model: "Noctis Ultra", think: true }),
      });
      const elapsedMs = Date.now() - start;
      const json = (await res.json()) as {
        status?: string;
        error?: string;
        route?: { routeId?: string; label?: string };
        cleanText?: string;
        text?: string;
      };
      const raw = String(json.cleanText || json.text || "");
      const visible = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      const routeId = json.route?.routeId || "unknown";
      const failures: string[] = [];

      if (res.status !== 200 || json.error) {
        failures.push(`HTTP ${res.status} / error=${json.error || "none"}`);
      }
      if (!c.expectedRoutes.includes(routeId)) {
        failures.push(`Route mismatch: got "${routeId}", expected [${c.expectedRoutes.join(", ")}]`);
      }
      if (visible.length < 40) {
        failures.push(`Empty/truncated visible body (${visible.length} chars)`);
      }
      if (/<\/?think>/i.test(visible)) {
        failures.push("Leaked unclosed <think> tag inside visible body");
      }
      for (const req of c.mustContainRegex) {
        if (!req.re.test(visible)) {
          failures.push(`Missing check: ${req.label}`);
        }
      }
      for (const forbid of c.mustNotContainRegex || []) {
        if (forbid.re.test(visible)) {
          failures.push(`Forbidden pattern matched: ${forbid.label}`);
        }
      }

      if (failures.length === 0) {
        passed += 1;
        console.log(`[PASS] ${c.id} | route=${routeId} | ${elapsedMs}ms | len=${visible.length} | ${c.name}`);
      } else {
        failed += 1;
        console.log(`[FAIL] ${c.id} | route=${routeId} | ${elapsedMs}ms | ${c.name}`);
        for (const f of failures) console.log(`       -> ${f}`);
      }
    } catch (err) {
      failed += 1;
      console.log(`[FAIL] ${c.id} | Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nSummary: ${passed}/${CASES.length} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

void runLiveEval();
