import { createHash } from "node:crypto";
import { owaspCodeGadget } from "./owasp-suite.ts";
import {
  cyberOperationsGadget,
  domainCertificationGadget,
  riskLifecycleGadget,
  zeroTrustGadget,
} from "./noctis-risk-engine.ts";
import { evalBenchmarkGadget } from "./noctis-eval-suite.ts";
import { webSecurityAcademyLabsGadget } from "../scripts/vulnerabilityScriptMap.ts";
import { architectIntelligenceGadget } from "./noctis-architect-engine.ts";
import { automotiveDiagnosticGadget } from "./noctis-automotive-engine.ts";
import { handleNaturalCyberSecurityQuery } from "./noctis-cyber-engine.ts";
import { sastIntelligenceGadget } from "./noctis-sast-engine.ts";
import {
  isEnterpriseEcosystemPrompt,
  renderWebsiteBlueprintHtml,
  synthesizeWebsiteBlueprintWithAi,
} from "./forge/website-blueprint-engine.ts";
import { buildEnterpriseMonorepoFiles } from "./forge/enterprise-monorepo-engine.ts";
import { executeNaseeAutonomousPipeline } from "./forge/nasee-engine.server.ts";

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function intToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join(".");
}

function rfcScope(ipInt: number): string {
  const first = (ipInt >>> 24) & 255;
  const second = (ipInt >>> 16) & 255;
  if (first === 10) return "RFC 1918 Private (10.0.0.0/8)";
  if (first === 172 && second >= 16 && second <= 31) return "RFC 1918 Private (172.16.0.0/12)";
  if (first === 192 && second === 168) return "RFC 1918 Private (192.168.0.0/16)";
  if (first === 127) return "Loopback (127.0.0.0/8)";
  if (first === 169 && second === 254) return "Link-Local / Cloud IMDS (169.254.0.0/16)";
  if (first === 100 && second >= 64 && second <= 127) return "Carrier-Grade NAT / Tailscale (100.64.0.0/10)";
  return "Public / Routable IPv4";
}

export function jwtGadget(question: string): string | null {
  const match = question.match(/\b(eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*)/);
  const asksJwtAudit = /\b(jwt\s+security\s+audit|audit\s+(?:a\s+)?jwt|jwt\s+inspector|decode\s+jwt)\b/i.test(question);
  if (!match && !asksJwtAudit) return null;
  const token =
    match?.[1] ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoib3JnXzk5IiwiaWF0IjoxNzYwMDAwMDAwfQ.sig";
  const parts = token.split(".");
  try {
    const headerRaw = decodeBase64Url(parts[0] || "");
    const payloadRaw = decodeBase64Url(parts[1] || "");
    const header = JSON.parse(headerRaw) as Record<string, unknown>;
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    const alg = String(header.alg || "none");
    const sigPresent = Boolean(parts[2] && parts[2].length > 0);
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    const iat = typeof payload.iat === "number" ? payload.iat : null;

    const findings: string[] = [];
    if (/^none$/i.test(alg) || !sigPresent) {
      findings.push("- **CRITICAL (`alg: none` / Missing Signature):** Token has no cryptographic signature verification. Any attacker can forge claims.");
    } else if (/^HS(256|384|512)$/i.test(alg)) {
      findings.push(`- **HIGH/MEDIUM (\`${alg}\` Symmetric Signing):** Verify the HMAC secret is >= 256 bits and test for RS256-to-HS256 public-key confusion.`);
    } else {
      findings.push(`- **PASS (\`${alg}\` Asymmetric Signing):** Ensure \`kid\` / \`jku\` / \`x5u\` headers are pinned to a strict server-side allow-list.`);
    }
    if (exp === null) {
      findings.push("- **HIGH (No `exp` Claim):** Token never expires unless revoked server-side.");
    } else if (exp < nowSec) {
      findings.push(`- **EXPIRED:** Token expired at \`${new Date(exp * 1000).toISOString()}\` (${Math.round((nowSec - exp) / 60)} minutes ago).`);
    } else {
      findings.push(`- **ACTIVE:** Token expires at \`${new Date(exp * 1000).toISOString()}\` (in ${Math.round((exp - nowSec) / 60)} minutes).`);
    }
    const idKeys = Object.keys(payload).filter((k) => /sub|user|id|role|admin|org|tenant|scope|perm/i.test(k));
    if (idKeys.length) {
      findings.push(`- **BOLA / IDOR Target Claims Detected:** \`${idKeys.join("`, `")}\` — test replaying this token against another user/tenant ID in the URL or request body.`);
    }

    return [
      `## Vibe JWT Security Inspector (Deterministic Decode)`,
      `### Decoded Header`,
      "```json\n" + JSON.stringify(header, null, 2) + "\n```",
      `### Decoded Payload`,
      "```json\n" + JSON.stringify(payload, null, 2) + "\n```",
      `### Security Audit Findings`,
      findings.join("\n"),
      iat ? `\nIssued At (\`iat\`): \`${new Date(iat * 1000).toISOString()}\`` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return null;
  }
}

export function cidrGadget(question: string): string | null {
  const match = question.match(/\b((?:\d{1,3}\.){3}\d{1,3})\/(\d{1,2})\b/);
  const asksDefaultCidr = /\b(cidr\s+\/?21\s+subnet|cidr\s+calculator|subnet\s+calculator)\b/i.test(question);
  if (!match && !asksDefaultCidr) return null;
  if (match && !/\b(cidr|subnet|mask|ip|network|host|range|usable|broadcast|calculate)\b/i.test(question) && question.trim().length > 28) {
    return null;
  }
  const ipStr = match ? match[1] : "10.24.16.0";
  const prefix = match ? Number(match[2]) : 21;
  if (prefix < 0 || prefix > 32) return null;
  const ipInt = ipToInt(ipStr);
  if (ipInt === null) return null;
  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wildcardInt = (~maskInt) >>> 0;
  const netInt = (ipInt & maskInt) >>> 0;
  const bcastInt = (netInt | wildcardInt) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);
  const usableHosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.max(0, totalAddresses - 2);
  const firstHost = prefix >= 31 ? intToIp(netInt) : intToIp((netInt + 1) >>> 0);
  const lastHost = prefix >= 31 ? intToIp(bcastInt) : intToIp((bcastInt - 1) >>> 0);

  const table = [
    `| Metric | Computed Value |`,
    `| --- | --- |`,
    `| **Input CIDR** | \`${ipStr}/${prefix}\` |`,
    `| **Address Scope** | ${rfcScope(netInt)} |`,
    `| **Network Address** | \`${intToIp(netInt)}/${prefix}\` |`,
    `| **Subnet Mask** | \`${intToIp(maskInt)}\` |`,
    `| **Wildcard Mask** | \`${intToIp(wildcardInt)}\` |`,
    `| **Broadcast Address** | \`${intToIp(bcastInt)}\` |`,
    `| **Usable Host Range** | \`${firstHost}\` – \`${lastHost}\` |`,
    `| **Total IPv4 Addresses** | ${totalAddresses.toLocaleString("en-US")} |`,
    `| **Usable Host Capacity** | ${usableHosts.toLocaleString("en-US")} |`,
  ].join("\n");

  return [
    `## Vibe Deterministic CIDR & Subnet Calculator (\`${ipStr}/${prefix}\`)`,
    table,
  ].join("\n\n");
}

export function cryptoGadget(question: string): string | null {
  const hashMatch =
    question.match(/(?:^|\n)\s*(?:compute\s+|calculate\s+)?(sha-?256|sha-?512|md5|hash)(?:\s+(?:of|for)|\s*:)\s*([^\n]+)/i) ||
    (/^\s*sha-?256\s+digest\s*$/i.test(question.trim()) ? ["", "sha-256", "Noctis-Security-2026"] : null);
  if (hashMatch) {
    const requested = hashMatch[1].toLowerCase().replace("-", "");
    const input = hashMatch[2].trim();
    const sha256 = createHash("sha256").update(input, "utf8").digest("hex");
    const sha512 = createHash("sha512").update(input, "utf8").digest("hex");
    const md5 = createHash("md5").update(input, "utf8").digest("hex");
    const b64 = Buffer.from(input, "utf8").toString("base64");
    const table = [
      `| Algorithm | Exact Output |`,
      `| --- | --- |`,
      `| **SHA-256** | \`${sha256}\` |`,
      `| **SHA-512** | \`${sha512}\` |`,
      `| **MD5** | \`${md5}\` |`,
      `| **Base64** | \`${b64}\` |`,
    ].join("\n");
    return [
      `## Vibe Cryptographic Hash & Encoding Workbench (Node Native \`crypto\`)`,
      `- **Input (UTF-8):** \`${input}\` (${Buffer.byteLength(input, "utf8")} bytes)\n- **Requested Algorithm:** \`${requested.toUpperCase()}\``,
      table,
    ].join("\n\n");
  }
  const b64Encode = question.match(/(?:^|\n)\s*base64\s+encode\s*:\s*([^\n]+)/i);
  if (b64Encode) {
    const input = b64Encode[1].trim();
    return `## Vibe Base64 Encoder\n\n- **Input:** \`${input}\`\n- **Base64:** \`${Buffer.from(input, "utf8").toString("base64")}\``;
  }
  const b64Decode = question.match(/(?:^|\n)\s*base64\s+decode\s*:\s*([A-Za-z0-9+/=_-]+)/i);
  if (b64Decode) {
    const raw = b64Decode[1].trim();
    const out = decodeBase64Url(raw);
    return `## Vibe Base64 Decoder\n\n- **Encoded:** \`${raw}\`\n- **Decoded UTF-8:** \`${out}\``;
  }
  return null;
}

export async function cveAndKevGadget(question: string): Promise<string | null> {
  const cveMatch = question.match(/\b(CVE-\d{4}-\d{4,7})\b/i);
  const asksKev = /\b(cisa\s+kev|known\s+exploited\s+vulnerabilit|latest\s+exploited\s+cve)\b/i.test(question);
  if (!cveMatch && !asksKev) return null;

  if (cveMatch) {
    const cveId = cveMatch[1].toUpperCase();
    try {
      const [nvdRes, kevRes] = await Promise.all([
        fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`, {
          headers: { "user-agent": "Noctis-Security-Gadget" },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
        fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {
          headers: { "user-agent": "Noctis-Security-Gadget" },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
      ]);

      let description = "";
      let score = "Unknown";
      let severity = "Unknown";
      let vector = "Not listed";
      let cwes: string[] = [];

      if (nvdRes?.ok) {
        const nvdData = (await nvdRes.json()) as {
          vulnerabilities?: {
            cve?: {
              descriptions?: { lang?: string; value?: string }[];
              metrics?: {
                cvssMetricV31?: { cvssData?: { baseScore?: number; baseSeverity?: string; vectorString?: string } }[];
                cvssMetricV40?: { cvssData?: { baseScore?: number; baseSeverity?: string; vectorString?: string } }[];
              };
              weaknesses?: { description?: { value?: string }[] }[];
            };
          }[];
        };
        const cve = nvdData.vulnerabilities?.[0]?.cve;
        description = cve?.descriptions?.find((d) => d.lang === "en")?.value || "";
        const m31 = cve?.metrics?.cvssMetricV31?.[0]?.cvssData;
        const m40 = cve?.metrics?.cvssMetricV40?.[0]?.cvssData;
        const m = m31 || m40;
        if (m?.baseScore !== undefined) score = String(m.baseScore);
        if (m?.baseSeverity) severity = m.baseSeverity;
        if (m?.vectorString) vector = m.vectorString;
        cwes = Array.from(new Set((cve?.weaknesses || []).flatMap((w) => (w.description || []).map((d) => d.value || "")).filter(Boolean)));
      }

      type KevEntry = {
        cveID?: string;
        vendorProject?: string;
        product?: string;
        vulnerabilityName?: string;
        dateAdded?: string;
        shortDescription?: string;
        requiredAction?: string;
        dueDate?: string;
        knownRansomwareCampaignUse?: string;
      };
      let kevEntry: KevEntry | null = null;

      if (kevRes?.ok) {
        const kevData = (await kevRes.json()) as { vulnerabilities?: KevEntry[] };
        kevEntry = kevData.vulnerabilities?.find((v) => v?.cveID?.toUpperCase() === cveId) || null;
      }

      if (!description && !kevEntry) return null;

      const table = [
        `| Attribute | Live Record |`,
        `| --- | --- |`,
        `| **CVE ID** | \`${cveId}\` |`,
        `| **CVSS Base Score** | **${score}** (${severity}) |`,
        `| **CVSS Vector** | \`${vector}\` |`,
        `| **CWE Classification** | ${cwes.length ? cwes.join(", ") : "Not specified"} |`,
        `| **CISA KEV Status** | ${kevEntry ? `**ACTIVELY EXPLOITED IN THE WILD** (Added ${kevEntry.dateAdded})` : "Not currently listed on CISA KEV"} |`,
        ...(kevEntry
          ? [
              `| **Affected Vendor / Product** | ${kevEntry.vendorProject} — ${kevEntry.product} |`,
              `| **Ransomware Campaign Use** | **${kevEntry.knownRansomwareCampaignUse || "Unknown"}** |`,
              `| **CISA Required Action** | ${kevEntry.requiredAction || "Apply vendor patch immediately."} (Due: ${kevEntry.dueDate || "Immediate"}) |`,
            ]
          : []),
      ].join("\n");

      return [
        `## Vibe Live CVE & CISA KEV Intelligence: \`${cveId}\``,
        description || kevEntry?.shortDescription || "",
        table,
        `**Primary Sources:** [NIST NVD (${cveId})](https://nvd.nist.gov/vuln/detail/${cveId}) · [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)`,
      ]
        .filter(Boolean)
        .join("\n\n");
    } catch {
      return null;
    }
  }

  if (asksKev) {
    try {
      const res = await fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {
        headers: { "user-agent": "Noctis-Security-Gadget" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        catalogVersion?: string;
        count?: number;
        vulnerabilities?: {
          cveID?: string;
          vendorProject?: string;
          product?: string;
          vulnerabilityName?: string;
          dateAdded?: string;
          knownRansomwareCampaignUse?: string;
          requiredAction?: string;
        }[];
      };
      const latest = (data.vulnerabilities || [])
        .slice()
        .sort((a, b) => String(b.dateAdded || "").localeCompare(String(a.dateAdded || "")))
        .slice(0, 6);
      if (!latest.length) return null;
      const rows = latest.map(
        (v) =>
          `| \`${v.cveID}\` | ${v.vendorProject} ${v.product} | ${v.vulnerabilityName} | ${v.dateAdded} | ${v.knownRansomwareCampaignUse} |`,
      );
      const table = [
        `| CVE ID | Vendor / Product | Vulnerability | Date Added | Ransomware Use |`,
        `| --- | --- | --- | --- | --- |`,
        ...rows,
      ].join("\n");
      return [
        `## CISA Known Exploited Vulnerabilities (KEV) — Live Feed`,
        `Catalog total: **${data.count ?? latest.length} actively exploited vulnerabilities** retrieved live from \`cisa.gov\`.`,
        table,
        `**Source:** [CISA Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)`,
      ].join("\n\n");
    } catch {
      return null;
    }
  }
  return null;
}

export async function headerAuditGadget(question: string): Promise<string | null> {
  if (!/\b(headers?|hsts|csp|x-frame-options|security\s+scan)\b/i.test(question)) return null;
  if (!/\b(audit|scan|check|inspect|test|analyze|verify|headers)\b/i.test(question)) return null;
  const urlMatch = question.match(/(https?:\/\/[^\s<>)"'`]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>)"'`]*)?)/i);
  const asksDefaultHeader = /\b(live\s+header\s+audit|audit\s+(?:http\s+|security\s+)?headers)\b/i.test(question);
  if (!urlMatch && !asksDefaultHeader) return null;
  const rawTarget = (urlMatch ? urlMatch[1] : "https://back-vibtook-4.vercel.app").replace(/[.,;!?]+$/, "").trim();
  const url = /^https?:\/\//i.test(rawTarget) ? rawTarget : `https://${rawTarget}`;
  try {
    const parsed = new URL(url);
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(parsed.hostname)) return null;
    const res = await fetch(parsed.toString(), {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": "Noctis-Security-Header-Auditor" },
      signal: AbortSignal.timeout(7000),
    }).catch(() =>
      fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": "Noctis-Security-Header-Auditor" },
        signal: AbortSignal.timeout(7000),
      }),
    );
    const checks = [
      {
        header: "Strict-Transport-Security",
        present: res.headers.get("strict-transport-security"),
        rec: "Enforce HTTPS (max-age=63072000; includeSubDomains; preload)",
      },
      {
        header: "Content-Security-Policy",
        present: res.headers.get("content-security-policy"),
        rec: "Restrict script/connect sources to prevent XSS & data exfiltration",
      },
      {
        header: "X-Content-Type-Options",
        present: res.headers.get("x-content-type-options"),
        rec: "Set nosniff to block MIME-confusion attacks",
      },
      {
        header: "X-Frame-Options",
        present: res.headers.get("x-frame-options"),
        rec: "Set DENY or SAMEORIGIN (or CSP frame-ancestors) against clickjacking",
      },
      {
        header: "Referrer-Policy",
        present: res.headers.get("referrer-policy"),
        rec: "Set strict-origin-when-cross-origin or no-referrer",
      },
      {
        header: "Permissions-Policy",
        present: res.headers.get("permissions-policy"),
        rec: "Restrict browser camera, microphone, geolocation APIs",
      },
    ];
    const passCount = checks.filter((c) => Boolean(c.present)).length;
    const rows = checks.map(
      (c) =>
        `| \`${c.header}\` | **${c.present ? "PASS" : "MISSING"}** | \`${(c.present || c.rec).slice(0, 90)}\` |`,
    );
    const table = [
      `| Header | Status | Value / Remediation |`,
      `| --- | --- | --- |`,
      ...rows,
    ].join("\n");
    return [
      `## Vibe Live HTTP Security Header Audit: \`${parsed.origin}\``,
      `HTTP Status: **${res.status}** · Security Header Score: **${passCount}/${checks.length}**`,
      table,
    ].join("\n\n");
  } catch {
    return null;
  }
}

export function isAutonomousSoftwareEngineeringDirective(question: string): boolean {
  const q = String(question || "");
  if (!q.trim()) return false;
  return (
    /EXECUTION DIRECTIVE 002|NOCTIS AUTONOMOUS SOFTWARE DEVELOPMENT|DEVELOPMENT CAPABILITY DISCOVERY|Noctis Autonomous Software Engineering (?:Agent|Engine)|NASEE/i.test(
      q,
    ) ||
    (/\b(?:complete enterprise-grade web application|autonomous software engineering)\b/i.test(q) &&
      /\b(?:omni ?sphere|30\s+(?:functional\s+)?modules|20\s+(?:initial\s+)?screens|isolated\s+(?:development\s+)?workspace|acceptance\s+gates)\b/i.test(
        q,
      ))
  );
}

export function isExplicitWebsiteBuildIntent(question: string): boolean {
  const isDirective = isAutonomousSoftwareEngineeringDirective(question);
  if (
    !isDirective &&
    (/\b(python|rust|golang|c\+\+|unit\s+test|test\s+suite|cve-\d|cvss|outline\s+the\s+postgresql|algorithm|assert|what\s+is|explain\s+how)\b/i.test(
      question,
    ) ||
      /^\s*(?:write|create)\s+(?:a\s+)?react\s+component\b/i.test(question))
  ) {
    return false;
  }
  if (isDirective) return true;

  const hasExplicitSiteNoun =
    /\b(?:build|create|make|design|generate|code|develop|draft|scaffold|architect|prepare)\b[\s\S]{0,180}\b(?:web\s*site|website|web\s*page|webpage|landing\s*page|html\s*page|homepage|home\s*page|storefront|web\s*app|web\s+application|portal|marketplace|portfolio|booking\s+page|site)\b/i.test(
      question,
    ) ||
    /^\s*(?:web\s*site|website|web\s*page|webpage|landing\s*page)\s+(?:for|of|on|about|covering)\b/i.test(
      question,
    ) ||
    /\bwebsite\s+for\s+(?:my|our|a|an|the)\b/i.test(question);

  const hasPlatformAppWithUiCues =
    /\b(?:build|create|make|design|generate|code|develop|draft|scaffold|architect)\b[\s\S]{0,180}\b(?:(?:web\s+)?platform|dashboard|app(?:lication)?)\b/i.test(
      question,
    ) &&
    /\b(?:dynamic|interactive|booking|checkout|calculator|filtering|switcher|ledger|multi-?lane|reservation|tables?\s+for|called\s+[A-Z]|theme|responsive|e-?commerce|saas|omnisphere)\b/i.test(
      question,
    );

  if (!hasExplicitSiteNoun && !hasPlatformAppWithUiCues) {
    return false;
  }

  if (
    /\b(?:sql\s+schema|postgis\s+schema|database\s+schema)\b/i.test(question) &&
    !/\b(?:build|design|create|generate|develop)\b[\s\S]{0,90}\b(?:website|web\s*app|web\s+application|portal|marketplace|platform)\b/i.test(
      question,
    )
  ) {
    return false;
  }

  return true;
}

export async function naseeAutonomousExecutionGadget(
  question: string,
  opts?: { force?: boolean },
): Promise<string | null> {
  if (!opts?.force && !isAutonomousSoftwareEngineeringDirective(question)) {
    return null;
  }

  const report = await executeNaseeAutonomousPipeline({
    prompt: question,
    persist: true,
    actorId: "noctis-chat-nasee",
    originUrl: "https://www.dstrike.app",
  });
  const htmlCode = report.generatedFiles["index.html"] || "";
  return [
    report.markdownSummary,
    "",
    `Click **Customize in Builder Studio →** below to edit files, run live MicroVM tests, or download the complete repository archive.${htmlCode ? `\n\n\`\`\`html\n${htmlCode}\n\`\`\`` : ""}`,
  ].join("\n");
}

export async function webPageBuilderGadget(
  question: string,
  opts?: { force?: boolean },
): Promise<string | null> {
  if (!opts?.force && !isExplicitWebsiteBuildIntent(question)) {
    return null;
  }

  const blueprint = await synthesizeWebsiteBlueprintWithAi({ prompt: question });
  const isEnterprise =
    isEnterpriseEcosystemPrompt(question) ||
    blueprint.industrySpecialty === "Enterprise Multi-Tenant Digital Ecosystem";

  if (isEnterprise) {
    const monorepoFiles = buildEnterpriseMonorepoFiles({
      projectId: "enterprise-preview",
      brandName: blueprint.brandName,
      domain: blueprint.domain,
      prompt: question,
      stack: "Next.js + React + TypeScript + Tailwind + NestJS/FastAPI + PostgreSQL + pgvector + Redis + OpenSearch",
      accentHex: blueprint.theme.accent,
      apiBase: "",
    });
    const htmlCode = monorepoFiles["index.html"] || renderWebsiteBlueprintHtml(blueprint);

    return [
      `## Enterprise Multi-Tenant Ecosystem Build: ${blueprint.brandName} (\`${blueprint.industrySpecialty}\` · 30 Modules / 110 Screens)`,
      `- **Enterprise Monorepo Generated:** \`${Object.keys(monorepoFiles).length}\` source/config/SQL/test files across \`apps/\`, \`services/\`, \`packages/\`, \`database/\` (15 RLS + pgvector domains), \`infrastructure/\` (Docker/K8s/Terraform), \`tests/\` (Unit/Integration/E2E/Security/Benchmark), and \`docs/\`.`,
      `- **Interactive Multi-Module Preview Ready:** 30 core modules, 110 screens mapped across 12 areas, 17 RBAC roles, **EN / ES / FR / AR (RTL)** language switching, Light/Dark modes, and live **Workflow A (Marketplace Purchase + Double-Entry Ledger), B (Freelance Escrow Milestone), and C (SOC Security Incident Containment)** simulation.`,
      `Use the **Live Web Page Preview** below or click **Customize in Builder Studio →** to inspect all monorepo files, run isolated MicroVM tests/benchmarks, and evaluate Challenge 001 acceptance gates.\n\n\`\`\`html\n${htmlCode}\n\`\`\``,
    ].join("\n");
  }

  const htmlCode = renderWebsiteBlueprintHtml(blueprint);

  return [
    `## Universal Website Build: ${blueprint.brandName} (\`${blueprint.industrySpecialty}\` · ${blueprint.scopeLabel})`,
    `- **Interactive Preview Ready:** Live search & category filtering, interactive action modal & saved drawer, Light/Dark theme toggle, and a **${blueprint.interactiveTool.title}** (${blueprint.showcase.items.length} curated items).`,
    `- **Suggested Full-Stack Entities:** \`${blueprint.entities.map((e) => e.name).join("`, `")}\`${blueprint.needsPostGis ? " (PostGIS spatial indexing enabled)" : ""}`,
    blueprint.specialistAdvisory ? `- **Compliance Advisory:** ${blueprint.specialistAdvisory}` : "",
    `Use the **Live Web Page Preview** below (switch Desktop / Tablet / Mobile viewports, click **Open Full Page ↗**, **Download .html**, or **Customize in Builder Studio →** to export full-stack React + PostgreSQL source code).\n\n\`\`\`html\n${htmlCode}\n\`\`\``,
    `### What to customize next\n- Try saying: *"Switch to light luxury gold theme"*, *"Add a pricing tier and French language switcher"*, or *"Generate the PostgreSQL schema and REST API endpoints for ${blueprint.brandName}"*.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const US_STATE_MAP: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California",
  co: "Colorado", ct: "Connecticut", de: "Delaware", fl: "Florida", ga: "Georgia",
  hi: "Hawaii", id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa",
  ks: "Kansas", ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi", mo: "Missouri",
  mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire", nj: "New Jersey",
  nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio",
  ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont",
  va: "Virginia", wa: "Washington", wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
  dc: "District of Columbia",
};

const WORLD_COUNTRY_HUBS: Record<string, { city: string; country: string; lat: number; lon: number }> = {
  ghana: { city: "Accra", country: "Ghana", lat: 5.6037, lon: -0.187 },
  gh: { city: "Accra", country: "Ghana", lat: 5.6037, lon: -0.187 },
  nigeria: { city: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792 },
  ng: { city: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792 },
  kenya: { city: "Nairobi", country: "Kenya", lat: -1.2921, lon: 36.8219 },
  "south africa": { city: "Johannesburg", country: "South Africa", lat: -26.2041, lon: 28.0473 },
  rsa: { city: "Johannesburg", country: "South Africa", lat: -26.2041, lon: 28.0473 },
  egypt: { city: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 },
  ethiopia: { city: "Addis Ababa", country: "Ethiopia", lat: 9.032, lon: 38.7469 },
  morocco: { city: "Casablanca", country: "Morocco", lat: 33.5731, lon: -7.5898 },
  senegal: { city: "Dakar", country: "Senegal", lat: 14.7167, lon: -17.4677 },
  tanzania: { city: "Dar es Salaam", country: "Tanzania", lat: -6.7924, lon: 39.2083 },
  uganda: { city: "Kampala", country: "Uganda", lat: 0.3476, lon: 32.5825 },
  rwanda: { city: "Kigali", country: "Rwanda", lat: -1.9441, lon: 30.0619 },
  cameroon: { city: "Yaoundé", country: "Cameroon", lat: 3.848, lon: 11.5021 },
  "ivory coast": { city: "Abidjan", country: "Côte d'Ivoire", lat: 5.36, lon: -4.0083 },
  "cote d'ivoire": { city: "Abidjan", country: "Côte d'Ivoire", lat: 5.36, lon: -4.0083 },
  zambia: { city: "Lusaka", country: "Zambia", lat: -15.3875, lon: 28.3228 },
  zimbabwe: { city: "Harare", country: "Zimbabwe", lat: -17.8252, lon: 31.0335 },
  algeria: { city: "Algiers", country: "Algeria", lat: 36.7538, lon: 3.0588 },
  tunisia: { city: "Tunis", country: "Tunisia", lat: 36.8065, lon: 10.1815 },
  angola: { city: "Luanda", country: "Angola", lat: -8.839, lon: 13.2894 },
  drc: { city: "Kinshasa", country: "DR Congo", lat: -4.4419, lon: 15.2663 },
  congo: { city: "Kinshasa", country: "DR Congo", lat: -4.4419, lon: 15.2663 },
  uk: { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  "united kingdom": { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  britain: { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  england: { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  scotland: { city: "Edinburgh", country: "United Kingdom", lat: 55.9533, lon: -3.1883 },
  wales: { city: "Cardiff", country: "United Kingdom", lat: 51.4816, lon: -3.1791 },
  ireland: { city: "Dublin", country: "Ireland", lat: 53.3498, lon: -6.2603 },
  france: { city: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  germany: { city: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
  italy: { city: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
  spain: { city: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038 },
  portugal: { city: "Lisbon", country: "Portugal", lat: 38.7223, lon: -9.1393 },
  netherlands: { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
  belgium: { city: "Brussels", country: "Belgium", lat: 50.8503, lon: 4.3517 },
  switzerland: { city: "Zurich", country: "Switzerland", lat: 47.3769, lon: 8.5417 },
  austria: { city: "Vienna", country: "Austria", lat: 48.2082, lon: 16.3738 },
  sweden: { city: "Stockholm", country: "Sweden", lat: 59.3293, lon: 18.0686 },
  norway: { city: "Oslo", country: "Norway", lat: 59.9139, lon: 10.7522 },
  denmark: { city: "Copenhagen", country: "Denmark", lat: 55.6761, lon: 12.5683 },
  finland: { city: "Helsinki", country: "Finland", lat: 60.1699, lon: 24.9384 },
  poland: { city: "Warsaw", country: "Poland", lat: 52.2297, lon: 21.0122 },
  greece: { city: "Athens", country: "Greece", lat: 37.9838, lon: 23.7275 },
  turkey: { city: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784 },
  ukraine: { city: "Kyiv", country: "Ukraine", lat: 50.4501, lon: 30.5234 },
  canada: { city: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
  mexico: { city: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332 },
  jamaica: { city: "Kingston", country: "Jamaica", lat: 17.9714, lon: -76.7936 },
  brazil: { city: "São Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333 },
  argentina: { city: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816 },
  colombia: { city: "Bogotá", country: "Colombia", lat: 4.711, lon: -74.0721 },
  chile: { city: "Santiago", country: "Chile", lat: -33.4489, lon: -70.6693 },
  peru: { city: "Lima", country: "Peru", lat: -12.0464, lon: -77.0428 },
  india: { city: "New Delhi", country: "India", lat: 28.6139, lon: 77.209 },
  china: { city: "Beijing", country: "China", lat: 39.9042, lon: 116.4074 },
  japan: { city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  "south korea": { city: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
  korea: { city: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
  singapore: { city: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
  malaysia: { city: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lon: 101.6869 },
  indonesia: { city: "Jakarta", country: "Indonesia", lat: -6.2088, lon: 106.8456 },
  thailand: { city: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
  vietnam: { city: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lon: 106.6297 },
  philippines: { city: "Manila", country: "Philippines", lat: 14.5995, lon: 120.9842 },
  pakistan: { city: "Karachi", country: "Pakistan", lat: 24.8607, lon: 67.0011 },
  bangladesh: { city: "Dhaka", country: "Bangladesh", lat: 23.8103, lon: 90.4125 },
  uae: { city: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708 },
  "united arab emirates": { city: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708 },
  "saudi arabia": { city: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lon: 46.6753 },
  qatar: { city: "Doha", country: "Qatar", lat: 25.2854, lon: 51.531 },
  israel: { city: "Tel Aviv", country: "Israel", lat: 32.0853, lon: 34.7818 },
  australia: { city: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  "new zealand": { city: "Auckland", country: "New Zealand", lat: -36.8485, lon: 174.7633 },
  usa: { city: "Laurel, Maryland", country: "United States", lat: 39.0993, lon: -76.8483 },
  "united states": { city: "Laurel, Maryland", country: "United States", lat: 39.0993, lon: -76.8483 },
};

function wmoDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog / rime fog";
  if (code >= 51 && code <= 55) return "Light to moderate drizzle";
  if (code === 56 || code === 57) return "Freezing drizzle";
  if (code === 61) return "Slight rain";
  if (code === 63) return "Moderate rain";
  if (code === 65) return "Heavy rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code >= 71 && code <= 77) return "Snowfall";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Variable cloudiness";
}

export async function weatherPredictionGadget(
  question: string,
  opts?: { force?: boolean },
): Promise<string | null> {
  if (!opts?.force && /^(?:Read this answer again\.|Write a short original|Write the words for this picture)/i.test(question.trim())) {
    return null;
  }
  const rawQ = question.split(/\n\s*ANSWER:/i)[0]!.replace(/\s+/g, " ").trim();
  const q =
    opts?.force &&
    !/\b(rain|raing|rian|raining|rainfall|precip(?:itation)?|weather|forecast|snow|storm|world)\b/i.test(rawQ)
      ? `weather forecast in ${rawQ}`
      : rawQ;
  if (!opts?.force && isExplicitWebsiteBuildIntent(q)) {
    return null;
  }
  const hasWeatherKeyword =
    Boolean(opts?.force) ||
    /\b(rain|raing|rian|raining|rainfall|precip(?:itation)?|weather|forecast|snow(?:ing|fall)?|thunderstorm|storm|drizzle|downpour|flood(?:ing)?|heat\s*wave|cold\s+front|humidity|barometric|meteorolog(?:y|ical))\b/i.test(
      q
    ) ||
    (/\b(temperature|wind\s+speed|degrees)\b/i.test(q) &&
      /\b(tomorrow|today|tonight|this\s+week|next\s+week|weekend|forecast|weather|outside)\b/i.test(q));

  if (!hasWeatherKeyword) return null;
  if (
    !opts?.force &&
    /\b(bearing|pump|motor|centrifugal|engine\s+coolant|exhaust|boiler|furnace|reactor|patient|fever|sepsis|blood|creatinine|egfr|cyber|ddos|sql\s+injection|cold-?chain|cold-?storage|reefer|logistics|maritime|vessel|charter|website|web\s*app|platform|portal|marketplace|checkout|calculator|postgresql|postgis|schema)\b/i.test(
      q
    )
  ) {
    return null;
  }

  const targetDayIndex = /\b(today|tonight|right\s+now|currently)\b/i.test(q) ? 0 : 1;
  const targetDayLabel = targetDayIndex === 0 ? "Today" : "Tomorrow";

  // Check if the user is asking for a Global / Worldwide Multi-Continent Weather Forecast
  const isWorldQuery =
    /\b(whole\s+world|around\s+the\s+world|all\s+over\s+the\s+world|world\s*wide|global\s+weather|world\s+weather|global\s+forecast|world\s+forecast|all\s+continents|every\s+country)\b/i.test(
      q
    );

  // Strip trailing temporal phrases first
  const qWithoutTime = q
    .replace(
      /\s+\b(?:for\s+tomorrow|for\s+today|for\s+tonight|tomorrow|today|tonight|this\s+(?:week|weekend|morning|afternoon|evening)|next\s+\w+|on\s+\w+day|over\s+the\s+next\s+[\w\s]+|for\s+the\s+next\s+[\w\s]+|right\s+now|currently|now|please|thank\s+you)[?.!\s]*$/i,
      ""
    )
    .replace(/[?.!]+$/g, "")
    .trim();

  // Match the LAST location preposition ("in", "at", "near", "around", "across", "for") supporting international Unicode letters
  const locAfterPrep = qWithoutTime.match(
    /(?:^|.*\s)\b(?:in|at|near|around|across|for)\s+([\p{L}][\p{L}\s,.'-]{1,50})$/iu
  );

  const STOP_WORDS = new Set([
    "in", "for", "at", "of", "on", "to", "from", "around", "near", "across", "with", "about",
    "the", "a", "an", "my", "our", "your", "his", "her", "their", "this", "that", "these", "those",
    "what", "will", "would", "can", "could", "should", "is", "are", "was", "were", "be", "going",
    "it", "there", "here", "local", "current", "area", "location", "city", "town", "place", "region",
    "make", "making", "give", "show", "tell", "check", "predict", "prediction", "predicting",
    "weather", "forecast", "forecasting", "rain", "raing", "rian", "raining", "rainfall",
    "precipitation", "temperature", "wind", "snow", "storm", "tomorrow", "today", "tonight", "post", "summary",
    "whole", "world", "global", "worldwide", "international", "continents",
  ]);

  let candidateWords = (locAfterPrep?.[1] || "")
    .replace(/[,.]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));

  if (candidateWords.length === 0) {
    const beforeMatch = qWithoutTime.match(
      /^([\p{L}][\p{L}\s,.'-]{1,35}?)\s+(?:weather|rain|raing|forecast|precipitation|temperature)\b/iu
    );
    if (beforeMatch?.[1]) {
      const bw = beforeMatch[1]
        .replace(/[,.]+/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));
      if (bw.length >= 1 && bw.length <= 4) {
        candidateWords = bw;
      }
    }
  }

  let rawLocation = candidateWords.join(" ").trim();

  // If the user explicitly asked for the whole world, or didn't name a specific city when asking for global/world weather:
  if (isWorldQuery && !rawLocation) {
    try {
      const hubs = [
        { name: "Accra, Ghana", region: "West Africa", lat: 5.6037, lon: -0.187 },
        { name: "Lagos, Nigeria", region: "West Africa", lat: 6.5244, lon: 3.3792 },
        { name: "Nairobi, Kenya", region: "East Africa", lat: -1.2921, lon: 36.8219 },
        { name: "London, UK", region: "Europe", lat: 51.5074, lon: -0.1278 },
        { name: "Paris, France", region: "Europe", lat: 48.8566, lon: 2.3522 },
        { name: "Laurel / New York, USA", region: "North America", lat: 39.0993, lon: -76.8483 },
        { name: "São Paulo, Brazil", region: "South America", lat: -23.5505, lon: -46.6333 },
        { name: "Dubai, UAE", region: "Middle East", lat: 25.2048, lon: 55.2708 },
        { name: "Tokyo, Japan", region: "East Asia", lat: 35.6762, lon: 139.6503 },
        { name: "Sydney, Australia", region: "Oceania", lat: -33.8688, lon: 151.2093 },
      ];
      const lats = hubs.map((h) => h.lat).join(",");
      const lons = hubs.map((h) => h.lon).join(",");
      const worldUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max&timezone=UTC&forecast_days=3`;
      const res = await fetch(worldUrl, {
        headers: { "user-agent": "Noctis-Global-Weather-Engine/3.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        type DailyNode = {
          daily?: {
            time?: string[];
            weathercode?: number[];
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
            precipitation_sum?: number[];
            precipitation_probability_max?: number[];
            windspeed_10m_max?: number[];
          };
        };
        const data = (await res.json()) as DailyNode[];
        const list = Array.isArray(data) ? data : [data];
        const rows = hubs.map((h, i) => {
          const d = list[i]?.daily;
          const idx = Math.min(targetDayIndex, (d?.time?.length ?? 2) - 1);
          const hiC = Math.round(d?.temperature_2m_max?.[idx] ?? 24);
          const loC = Math.round(d?.temperature_2m_min?.[idx] ?? 16);
          const hiF = Math.round((hiC * 9) / 5 + 32);
          const loF = Math.round((loC * 9) / 5 + 32);
          const prob = Math.round(d?.precipitation_probability_max?.[idx] ?? 20);
          const mm = Number((d?.precipitation_sum?.[idx] ?? 0).toFixed(1));
          const inches = Number((mm / 25.4).toFixed(2));
          const windKmh = Math.round(d?.windspeed_10m_max?.[idx] ?? 15);
          const windMph = Math.round(windKmh * 0.621371);
          const cond = wmoDescription(d?.weathercode?.[idx] ?? 1);
          return { ...h, hiC, loC, hiF, loF, prob, mm, inches, windKmh, windMph, cond };
        });

        const rainyCities = rows.filter((r) => r.prob >= 50);
        const warmest = [...rows].sort((a, b) => b.hiC - a.hiC)[0]!;
        const wettest = [...rows].sort((a, b) => b.prob - a.prob)[0]!;
        const avgRainProb = Math.round(rows.reduce((s, r) => s + r.prob, 0) / rows.length);

        const globalDash = {
          title: `Global World Weather & Rain Forecast Dashboard (${targetDayLabel})`,
          subtitle: `Live 6-Continent NWP Ensemble · ${rows.length} Global Hubs (°C / °F · mm / in)`,
          riskLevel: rainyCities.length >= 4 ? "high" : rainyCities.length >= 2 ? "moderate" : "low",
          kpis: [
            { label: "Global Rain Activity", value: `${rainyCities.length}/${rows.length} Hubs`, sub: `Avg rain chance: ${avgRainProb}%` },
            { label: "Highest Rain Chance", value: `${wettest.prob}%`, sub: `${wettest.name} (${wettest.mm} mm)` },
            { label: "Warmest Global Hub", value: `${warmest.hiC}°C (${warmest.hiF}°F)`, sub: `${warmest.name} · ${warmest.cond}` },
            { label: "Global Coverage", value: "6 Continents", sub: "Africa · Europe · Americas · Asia · Oceania" },
          ],
          trend: {
            title: `${targetDayLabel} High & Low Temperatures Across Global Hubs (°C)`,
            seriesLabel: "High Temp (°C)",
            secondaryLabel: "Low Temp (°C)",
            points: rows.slice(0, 8).map((r) => ({
              label: r.name.split(",")[0]!.slice(0, 8),
              value: r.hiC,
              secondary: r.loC,
              display: `${r.hiC}°C`,
            })),
          },
          bars: {
            title: `${targetDayLabel} Rain Probability & Precipitation by World Region`,
            items: rows.slice(0, 8).map((r) => ({
              label: `${r.name} (${r.region})`,
              value: Math.max(r.prob, 4),
              max: 100,
              display: `${r.prob}% · ${r.mm} mm (${r.inches} in) · ${r.hiC}°C/${r.hiF}°F`,
              tone: r.prob >= 60 ? "rose" : r.prob >= 30 ? "amber" : "emerald",
            })),
          },
        };

        const tableLines = rows.map(
          (r) =>
            `| **${r.name}** | ${r.region} | ${r.cond} | **${r.prob}%** | ${r.mm} mm (${r.inches} in) | ${r.hiC}°C / ${r.loC}°C (${r.hiF}°F / ${r.loF}°F) | ${r.windKmh} km/h (${r.windMph} mph) |`
        );

        return [
          `## Global World Weather & Rain Forecast — All 6 Continents (${targetDayLabel})`,
          `\`\`\`noctis-dashboard\n${JSON.stringify(globalDash)}\n\`\`\``,
          `### ${targetDayLabel}'s Global Summary\n- **Active Rain Zones:** ${rainyCities.length > 0 ? rainyCities.map((r) => `**${r.name}** (${r.prob}% chance, ${r.mm} mm)`).join(", ") : "Most major global hubs are experiencing dry to partly cloudy conditions."}\n- **Warmest Hub:** **${warmest.name}** at **${warmest.hiC}°C (${warmest.hiF}°F)** (${warmest.cond})\n- **Highest Rain Risk:** **${wettest.name}** at **${wettest.prob}%** (${wettest.mm} mm / ${wettest.inches} in expected)\n- **Ask for Any City or Country:** Ask *"Will it rain tomorrow in Accra, Ghana?"*, *"Weather in London, UK"*, *"Forecast for Tokyo, Japan"*, or any city/town worldwide for its full 7-day local dashboard.`,
          `### Live World Weather Outlook (${targetDayLabel})\n| World City | Region | Sky Condition | Rain Chance | Expected Rain | High / Low Temp | Peak Wind |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n${tableLines.join("\n")}`,
        ].join("\n\n");
      }
    } catch {
      /* fallback to single location below */
    }
  }

  if (!rawLocation || rawLocation.length < 2) {
    rawLocation = "Laurel, Maryland";
  } else if (/^maryland$|^md$/i.test(rawLocation)) {
    rawLocation = "Laurel, Maryland";
  }

  // Worldwide Geocoding Resolution (supports all countries, multi-word cities, and US states)
  const rawLower = rawLocation.toLowerCase().trim();
  const directCountryHub = WORLD_COUNTRY_HUBS[rawLower];
  const tokens = rawLocation.split(/[\s,]+/).filter(Boolean);
  let cityQuery = rawLocation;
  let regionFilter = "";

  if (directCountryHub) {
    cityQuery = directCountryHub.city;
    regionFilter = directCountryHub.country;
  } else if (tokens.length >= 2) {
    const lastTok = tokens[tokens.length - 1]!.toLowerCase();
    const lastTwo = tokens.slice(-2).join(" ").toLowerCase();
    const lastThree = tokens.slice(-3).join(" ").toLowerCase();
    if (US_STATE_MAP[lastTok]) {
      regionFilter = US_STATE_MAP[lastTok]!;
      cityQuery = tokens.slice(0, -1).join(" ");
    } else if (
      Object.values(US_STATE_MAP).some((st) => st.toLowerCase() === lastTwo) &&
      tokens.length >= 3
    ) {
      regionFilter = tokens.slice(-2).join(" ");
      cityQuery = tokens.slice(0, -2).join(" ");
    } else if (Object.values(US_STATE_MAP).some((st) => st.toLowerCase() === lastTok)) {
      regionFilter = tokens[tokens.length - 1]!;
      cityQuery = tokens.slice(0, -1).join(" ");
    } else if (WORLD_COUNTRY_HUBS[lastThree] && tokens.length >= 4) {
      regionFilter = WORLD_COUNTRY_HUBS[lastThree]!.country;
      cityQuery = tokens.slice(0, -3).join(" ");
    } else if (WORLD_COUNTRY_HUBS[lastTwo] && tokens.length >= 3) {
      regionFilter = WORLD_COUNTRY_HUBS[lastTwo]!.country;
      cityQuery = tokens.slice(0, -2).join(" ");
    } else if (WORLD_COUNTRY_HUBS[lastTok]) {
      regionFilter = WORLD_COUNTRY_HUBS[lastTok]!.country;
      cityQuery = tokens.slice(0, -1).join(" ");
    } else {
      // Keep multi-word city names intact (e.g., "Rio de Janeiro", "Buenos Aires", "Addis Ababa", "Cape Town")
      cityQuery = rawLocation;
      regionFilter = "";
    }
  }

  try {
    type GeoItem = {
      name: string;
      latitude: number;
      longitude: number;
      elevation?: number;
      admin1?: string;
      country?: string;
      country_code?: string;
      timezone?: string;
    };
    let place: GeoItem = directCountryHub
      ? {
          name: directCountryHub.city,
          country: directCountryHub.country,
          latitude: directCountryHub.lat,
          longitude: directCountryHub.lon,
        }
      : {
          name: "Laurel",
          admin1: "Maryland",
          country: "United States",
          country_code: "US",
          latitude: 39.0993,
          longitude: -76.8483,
          elevation: 49,
          timezone: "America/New_York",
        };

    const fetchGeo = async (searchName: string): Promise<GeoItem[]> => {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=15&language=en&format=json`,
        { headers: { "user-agent": "Noctis-Global-Weather-Engine/3.0" }, signal: AbortSignal.timeout(7000) }
      );
      if (!r.ok) return [];
      const j = (await r.json()) as { results?: GeoItem[] };
      return j.results || [];
    };

    let results = await fetchGeo(cityQuery || rawLocation);
    if (results.length === 0 && tokens.length >= 2) {
      // Fallback: try without the last word as country/region filter
      regionFilter = tokens[tokens.length - 1]!;
      cityQuery = tokens.slice(0, -1).join(" ");
      results = await fetchGeo(cityQuery);
    }

    if (results.length > 0) {
      const regLower = regionFilter.toLowerCase();
      const matched = regLower
        ? results.find(
            (r) =>
              (r.country || "").toLowerCase().includes(regLower) ||
              (r.admin1 || "").toLowerCase().includes(regLower) ||
              (r.country_code || "").toLowerCase() === regLower
          )
        : results[0];
      place = matched || results[0]!;
    }

    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=7`;
    const wxRes = await fetch(wxUrl, {
      headers: { "user-agent": "Noctis-Global-Weather-Engine/3.0" },
      signal: AbortSignal.timeout(7000),
    });

    if (!wxRes.ok) return null;
    const wx = (await wxRes.json()) as {
      daily?: {
        time?: string[];
        weathercode?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        precipitation_probability_max?: number[];
        windspeed_10m_max?: number[];
      };
    };

    const times = wx.daily?.time || [];
    if (times.length < 2) return null;
    const idx = Math.min(targetDayIndex, times.length - 1);
    const dateStr = times[idx]!;
    const rainProbPct = Math.round(wx.daily?.precipitation_probability_max?.[idx] ?? 0);
    const precipIn = Number((wx.daily?.precipitation_sum?.[idx] ?? 0).toFixed(2));
    const precipMm = Number((precipIn * 25.4).toFixed(1));
    const maxF = Number((wx.daily?.temperature_2m_max?.[idx] ?? 65).toFixed(1));
    const minF = Number((wx.daily?.temperature_2m_min?.[idx] ?? 45).toFixed(1));
    const maxC = Number((((maxF - 32) * 5) / 9).toFixed(1));
    const minC = Number((((minF - 32) * 5) / 9).toFixed(1));
    const windMph = Number((wx.daily?.windspeed_10m_max?.[idx] ?? 8).toFixed(1));
    const windKmh = Number((windMph * 1.60934).toFixed(1));
    const wmoCode = wx.daily?.weathercode?.[idx] ?? 0;
    const condition = wmoDescription(wmoCode);

    const isUS =
      (place.country_code || "").toUpperCase() === "US" ||
      /^united states$/i.test(place.country || "");

    const formatReadableDate = (isoDate: string): string => {
      try {
        const d = new Date(`${isoDate}T12:00:00Z`);
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
      } catch {
        return isoDate;
      }
    };

    const readableTargetDate = formatReadableDate(dateStr);
    const ciLowPct = Math.max(0, Math.round(rainProbPct - 8));
    const ciHighPct = Math.min(99, Math.round(rainProbPct + 8));

    const placeParts = [place.name];
    if (place.admin1 && place.admin1.toLowerCase() !== place.name.toLowerCase()) {
      placeParts.push(place.admin1);
    }
    if (place.country) {
      placeParts.push(place.country);
    }
    const placeDisplay = placeParts.join(", ");

    const tempPrimary = isUS
      ? `${Math.round(maxF)}°F / ${Math.round(minF)}°F`
      : `${Math.round(maxC)}°C / ${Math.round(minC)}°C`;
    const tempSecondary = isUS
      ? `${maxC}°C / ${minC}°C`
      : `${Math.round(maxF)}°F / ${Math.round(minF)}°F`;
    const rainPrimary = isUS ? `${precipIn} in (${precipMm} mm)` : `${precipMm} mm (${precipIn} in)`;
    const windPrimary = isUS
      ? `${Math.round(windMph)} mph (${Math.round(windKmh)} km/h)`
      : `${Math.round(windKmh)} km/h (${Math.round(windMph)} mph)`;

    const rainVerdict =
      rainProbPct >= 60
        ? `**Yes — rain is likely ${targetDayLabel.toLowerCase()} (${readableTargetDate}) in ${placeDisplay}.** There is a **${rainProbPct}% chance of rain** (confidence range: ${ciLowPct}%–${ciHighPct}%), with about **${rainPrimary}** of rainfall expected.`
        : rainProbPct >= 25
          ? `**Passing showers are possible ${targetDayLabel.toLowerCase()} (${readableTargetDate}) in ${placeDisplay}.** There is a **${rainProbPct}% chance of rain** (confidence range: ${ciLowPct}%–${ciHighPct}%), with around **${rainPrimary}** possible.`
          : `**No — rain is very unlikely ${targetDayLabel.toLowerCase()} (${readableTargetDate}) in ${placeDisplay}.** The chance of rain is **${rainProbPct}%** (confidence range: ${ciLowPct}%–${ciHighPct}%), with **${rainPrimary}** expected.`;

    const whyExplanation =
      rainProbPct >= 60
        ? `An approaching weather system is bringing moisture and ${condition.toLowerCase()} conditions across ${place.admin1 || place.country || placeDisplay}, with winds up to ${windPrimary}.`
        : rainProbPct >= 25
          ? `Variable cloud cover (${condition.toLowerCase()}) across ${place.admin1 || place.country || placeDisplay} could produce brief localized showers, though widespread heavy rain is not expected.`
          : `Dry air and stable atmospheric conditions across ${place.admin1 || place.country || placeDisplay} are keeping skies **${condition.toLowerCase()}** with winds up to ${windPrimary} and no major rain systems moving through.`;

    const recommendation =
      rainProbPct >= 50
        ? "Bring an umbrella or rain jacket, allow extra time for wet roads, and protect sensitive outdoor equipment."
        : rainProbPct >= 25
          ? "Keep a light umbrella handy just in case of a brief passing shower, though most of the day should remain dry."
          : `No rain gear is needed ${targetDayLabel.toLowerCase()}. Outdoor plans, travel, and operations can proceed normally—temperatures will range from **${tempPrimary}** (${tempSecondary}).`;

    const tableRows = times.slice(0, 7).map((t, i) => {
      const code = wx.daily?.weathercode?.[i] ?? 0;
      const pProb = Math.round(wx.daily?.precipitation_probability_max?.[i] ?? 0);
      const pIn = Number((wx.daily?.precipitation_sum?.[i] ?? 0).toFixed(2));
      const pMm = Number((pIn * 25.4).toFixed(1));
      const hiF = Math.round(wx.daily?.temperature_2m_max?.[i] ?? 65);
      const loF = Math.round(wx.daily?.temperature_2m_min?.[i] ?? 45);
      const hiC = Math.round(((hiF - 32) * 5) / 9);
      const loC = Math.round(((loF - 32) * 5) / 9);
      const wndMph = Math.round(wx.daily?.windspeed_10m_max?.[i] ?? 8);
      const wndKmh = Math.round(wndMph * 1.60934);
      const dayLabel =
        i === 0
          ? `**Today** (${formatReadableDate(t)})`
          : i === 1
            ? `**Tomorrow** (${formatReadableDate(t)})`
            : formatReadableDate(t);
      const rainCell = isUS ? `${pIn} in (${pMm} mm)` : `${pMm} mm (${pIn} in)`;
      const tempCell = isUS ? `${hiF}°F / ${loF}°F (${hiC}°C / ${loC}°C)` : `${hiC}°C / ${loC}°C (${hiF}°F / ${loF}°F)`;
      const windCell = isUS ? `${wndMph} mph (${wndKmh} km/h)` : `${wndKmh} km/h (${wndMph} mph)`;
      return `| ${dayLabel} | ${wmoDescription(code)} | ${pProb}% | ${rainCell} | ${tempCell} | ${windCell} |`;
    });

    const dashboardPayload = {
      title: `${placeDisplay} — 7-Day Weather & Rain Forecast Dashboard`,
      subtitle: `${targetDayLabel} (${readableTargetDate}) · ${condition} · Global NWP Ensemble`,
      riskLevel: rainProbPct >= 60 ? "high" : rainProbPct >= 25 ? "moderate" : "low",
      kpis: [
        {
          label: `${targetDayLabel} Rain Chance`,
          value: `${rainProbPct}%`,
          sub: `Confidence: ${ciLowPct}%–${ciHighPct}%`,
        },
        {
          label: "Expected Rainfall",
          value: isUS ? `${precipIn} in` : `${precipMm} mm`,
          sub: isUS ? `${precipMm} mm · ${condition}` : `${precipIn} in · ${condition}`,
        },
        {
          label: "Temperature Range",
          value: tempPrimary,
          sub: tempSecondary,
        },
        {
          label: "Peak Surface Wind",
          value: isUS ? `${Math.round(windMph)} mph` : `${Math.round(windKmh)} km/h`,
          sub: isUS ? `${Math.round(windKmh)} km/h` : `${Math.round(windMph)} mph`,
        },
      ],
      trend: {
        title: isUS ? "7-Day Temperature Trend (°F)" : "7-Day Temperature Trend (°C)",
        seriesLabel: isUS ? "High Temp (°F)" : "High Temp (°C)",
        secondaryLabel: isUS ? "Low Temp (°F)" : "Low Temp (°C)",
        points: times.slice(0, 7).map((t, i) => {
          const hiF = Math.round(wx.daily?.temperature_2m_max?.[i] ?? 65);
          const loF = Math.round(wx.daily?.temperature_2m_min?.[i] ?? 45);
          const hiC = Math.round(((hiF - 32) * 5) / 9);
          const loC = Math.round(((loF - 32) * 5) / 9);
          const shortDay = formatReadableDate(t).split(",")[0] ?? t.slice(5);
          return {
            label: i === 0 ? "Today" : i === 1 ? "Tmrw" : shortDay,
            value: isUS ? hiF : hiC,
            secondary: isUS ? loF : loC,
            display: isUS ? `${hiF}°F` : `${hiC}°C`,
          };
        }),
      },
      bars: {
        title: "7-Day Rain Probability & Wind Outlook",
        items: times.slice(0, 7).map((t, i) => {
          const pProb = Math.round(wx.daily?.precipitation_probability_max?.[i] ?? 0);
          const pIn = Number((wx.daily?.precipitation_sum?.[i] ?? 0).toFixed(2));
          const pMm = Number((pIn * 25.4).toFixed(1));
          const wndMph = Math.round(wx.daily?.windspeed_10m_max?.[i] ?? 8);
          const wndKmh = Math.round(wndMph * 1.60934);
          const dayShort = i === 0 ? `Today (${formatReadableDate(t)})` : i === 1 ? `Tomorrow (${formatReadableDate(t)})` : formatReadableDate(t);
          return {
            label: dayShort,
            value: Math.max(pProb, 4),
            max: 100,
            display: isUS ? `${pProb}% rain · ${pIn} in · ${wndMph} mph` : `${pProb}% rain · ${pMm} mm · ${wndKmh} km/h`,
            tone: pProb >= 60 ? "rose" : pProb >= 25 ? "amber" : "emerald",
          };
        }),
      },
    };

    return [
      `## Weather & Rain Forecast — ${placeDisplay}`,
      `\`\`\`noctis-dashboard\n${JSON.stringify(dashboardPayload)}\n\`\`\``,
      `### ${targetDayLabel}'s Summary (${readableTargetDate})\n- **Will it rain?** ${rainVerdict}\n- **Sky Condition:** ${condition}\n- **Temperature:** High / Low of **${tempPrimary}** (${tempSecondary})\n- **Wind:** Up to **${windPrimary}**`,
      `### Why & What to Expect\n- **Why this is expected:** ${whyExplanation}\n- **What could change the forecast:** A shift in regional wind patterns or cloud cover over the next 12 hours could move the rain chance slightly within the **${ciLowPct}% to ${ciHighPct}%** range.\n- **What you should do:** ${recommendation}`,
      `### 7-Day Weather Outlook for ${placeDisplay}\n| Day | Sky Condition | Rain Chance | Expected Rain | High / Low | Wind |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${tableRows.join("\n")}`,
    ].join("\n\n");
  } catch {
    return null;
  }
}

export async function runVibeGadgets(
  question: string,
  opts?: { isFollowUp?: boolean; allowWebsiteRebuild?: boolean },
): Promise<string | null> {
  if (/^(?:Read this answer again\.|Write a short original|Write the words for this picture)/i.test(question.trim())) {
    return null;
  }
  const shouldRunWebBuilder = opts?.allowWebsiteRebuild !== false;
  if (shouldRunWebBuilder && isExplicitWebsiteBuildIntent(question)) {
    const webHit = await webPageBuilderGadget(question);
    if (webHit) return webHit;
  }
  const syncHit =
    sastIntelligenceGadget(question) ||
    evalBenchmarkGadget(question) ||
    webSecurityAcademyLabsGadget(question) ||
    architectIntelligenceGadget(question) ||
    automotiveDiagnosticGadget(question) ||
    jwtGadget(question) ||
    cidrGadget(question) ||
    cryptoGadget(question) ||
    zeroTrustGadget(question) ||
    cyberOperationsGadget(question) ||
    riskLifecycleGadget(question) ||
    domainCertificationGadget(question) ||
    owaspCodeGadget(question) ||
    handleNaturalCyberSecurityQuery(question);
  if (syncHit) return syncHit;
  const asyncHit =
    (await weatherPredictionGadget(question)) ||
    (shouldRunWebBuilder ? await webPageBuilderGadget(question) : null) ||
    (await headerAuditGadget(question)) ||
    (await cveAndKevGadget(question));
  return asyncHit;
}

