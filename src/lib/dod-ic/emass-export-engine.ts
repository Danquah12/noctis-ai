/**
 * Noctis DoD eMASS / Xacta `.xlsx` OpenXML Workbook & Compliance Binder Exporter
 *
 * Zero-dependency pure-Node OOXML (`.xlsx`) generator using `node:zlib` + IEEE 802.3 CRC32
 * so Vercel Serverless Functions and local runtimes export genuine multi-sheet Excel workbooks
 * without external binary dependencies.
 */

import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { sha256Sync } from "../universal-crypto.ts";

// Precompute CRC32 table for ZIP headers
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function xmlEscape(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function colIndexToLetter(idx: number): string {
  let n = idx + 1;
  let col = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col;
}

export interface XlsxSheetInput {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

function buildWorksheetXml(sheet: XlsxSheetInput): string {
  const allRows = [sheet.headers, ...sheet.rows];
  const rowsXml = allRows
    .map((cells, rIdx) => {
      const rNum = rIdx + 1;
      const cellXml = cells
        .map((v, cIdx) => {
          const ref = `${colIndexToLetter(cIdx)}${rNum}`;
          if (typeof v === "number" && Number.isFinite(v)) {
            return `<c r="${ref}"><v>${v}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v ?? "")}</t></is></c>`;
        })
        .join("");
      return `<row r="${rNum}">${cellXml}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;
}

/** Packages multiple worksheets into an authentic OpenXML `.xlsx` ZIP binary buffer. */
export function buildXlsxBuffer(sheets: XlsxSheetInput[]): Buffer {
  const safeSheets = sheets.slice(0, 12).map((s, i) => ({
    ...s,
    name: s.name.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || `Sheet${i + 1}`,
  }));

  const entries: { path: string; content: Buffer }[] = [
    {
      path: "[Content_Types].xml",
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${safeSheets
    .map(
      (_s, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("\n  ")}
</Types>`,
        "utf8",
      ),
    },
    {
      path: "_rels/.rels",
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
        "utf8",
      ),
    },
    {
      path: "xl/workbook.xml",
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${safeSheets
      .map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("\n    ")}
  </sheets>
</workbook>`,
        "utf8",
      ),
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${safeSheets
    .map(
      (_s, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("\n  ")}
</Relationships>`,
        "utf8",
      ),
    },
    ...safeSheets.map((s, i) => ({
      path: `xl/worksheets/sheet${i + 1}.xml`,
      content: Buffer.from(buildWorksheetXml(s), "utf8"),
    })),
  ];

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.path, "utf8");
    const raw = entry.content;
    const compressed = deflateRawSync(raw);
    const sum = crc32(raw);

    const localHdr = Buffer.alloc(30 + nameBuf.length);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4); // version needed 2.0
    localHdr.writeUInt16LE(0, 6); // flags
    localHdr.writeUInt16LE(8, 8); // deflate
    localHdr.writeUInt16LE(0, 10);
    localHdr.writeUInt16LE(0, 12);
    localHdr.writeUInt32LE(sum, 14);
    localHdr.writeUInt32LE(compressed.length, 18);
    localHdr.writeUInt32LE(raw.length, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);
    nameBuf.copy(localHdr, 30);

    const centralHdr = Buffer.alloc(46 + nameBuf.length);
    centralHdr.writeUInt32LE(0x02014b50, 0);
    centralHdr.writeUInt16LE(20, 4);
    centralHdr.writeUInt16LE(20, 6);
    centralHdr.writeUInt16LE(0, 8);
    centralHdr.writeUInt16LE(8, 10);
    centralHdr.writeUInt16LE(0, 12);
    centralHdr.writeUInt16LE(0, 14);
    centralHdr.writeUInt32LE(sum, 16);
    centralHdr.writeUInt32LE(compressed.length, 20);
    centralHdr.writeUInt32LE(raw.length, 24);
    centralHdr.writeUInt16LE(nameBuf.length, 28);
    centralHdr.writeUInt16LE(0, 30);
    centralHdr.writeUInt16LE(0, 32);
    centralHdr.writeUInt16LE(0, 34);
    centralHdr.writeUInt16LE(0, 36);
    centralHdr.writeUInt32LE(0, 38);
    centralHdr.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHdr, 46);

    localParts.push(localHdr, compressed);
    centralParts.push(centralHdr);
    offset += localHdr.length + compressed.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

export interface EmassControlExportRow {
  controlId: string;
  cciId: string;
  assessmentProcedure?: string;
  status: "Compliant" | "Non-Compliant" | "Not Applicable" | "Planned";
  narrative: string;
  inheritedFrom?: string;
  responsibleRole?: string;
}

export interface EmassPoamExportRow {
  poamId: string;
  controlId: string;
  weakness: string;
  severity: "CAT_I" | "CAT_II" | "CAT_III";
  scheduledCompletionDate: string;
  status: "Ongoing" | "Completed" | "Risk Accepted";
  milestones: string;
}

export interface EmassXlsxExportInput {
  systemName?: string;
  emassSystemId?: string;
  impactLevel?: "IL2" | "IL4" | "IL5" | "IL6";
  jurisdiction?: "DOD" | "IC";
  controls?: EmassControlExportRow[];
  poams?: EmassPoamExportRow[];
}

export interface EmassXlsxExportResult {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  base64: string;
  sha256: string;
  sheetNames: string[];
  rowCounts: Record<string, number>;
  aiCanIssueAto: false;
}

const DEFAULT_CONTROLS: EmassControlExportRow[] = [
  {
    controlId: "AC-2",
    cciId: "CCI-000015",
    assessmentProcedure: "AC-2a.(1)",
    status: "Compliant",
    narrative: "Automated IdP lifecycle deprovisioning within 24 hours tied to authoritative HR termination feed.",
    inheritedFrom: "DoD Identity Provider Common Control",
    responsibleRole: "ISSM / IAM Admin",
  },
  {
    controlId: "IA-2(1)",
    cciId: "CCI-000765",
    assessmentProcedure: "IA-2(1)",
    status: "Compliant",
    narrative: "Enforced phishing-resistant DoD PKI CAC / ALT token authentication across privileged SSH/bastion paths.",
    inheritedFrom: "System-Specific",
    responsibleRole: "ISSO / System Admin",
  },
  {
    controlId: "IA-5(2)",
    cciId: "CCI-000186",
    assessmentProcedure: "IA-5(2)(a)",
    status: "Compliant",
    narrative: "Strict fail-closed OCSP/CRL revocation verification anchored to DoD Root CA per DoDI 8520.02.",
    inheritedFrom: "SCCA Boundary Stack",
    responsibleRole: "PKI Engineering",
  },
  {
    controlId: "RA-5",
    cciId: "CCI-001066",
    assessmentProcedure: "RA-5a",
    status: "Non-Compliant",
    narrative: "Quarterly credentialed ACAS scan detected CISA KEV finding requiring verified post-patch rescan.",
    inheritedFrom: "System-Specific",
    responsibleRole: "Vulnerability Mgmt Team",
  },
];

const DEFAULT_POAMS: EmassPoamExportRow[] = [
  {
    poamId: "POAM-2026-001",
    controlId: "RA-5",
    weakness: "Apply vendor security update and run verified post-patch ACAS credentialed rescan for CISA KEV item.",
    severity: "CAT_I",
    scheduledCompletionDate: "2026-12-06",
    status: "Ongoing",
    milestones: "1. Stage patch (Day 3) -> 2. Deploy production (Day 7) -> 3. Verified ACAS credentialed rescan (Day 14)",
  },
];

/** Generates a genuine 3-sheet DoD eMASS / IC Xacta-compatible `.xlsx` workbook. */
export function exportEmassXlsxWorkbook(input: EmassXlsxExportInput = {}): EmassXlsxExportResult {
  const sysName = (input.systemName || "Noctis Sovereign Enclave Workload").trim();
  const emassId = (input.emassSystemId || "EMASS-90421").trim();
  const il = input.impactLevel || "IL5";
  const jurisdiction = input.jurisdiction || "DOD";
  const controls = input.controls?.length ? input.controls : DEFAULT_CONTROLS;
  const poams = input.poams?.length ? input.poams : DEFAULT_POAMS;
  const exportedAt = new Date().toISOString();

  const metaSha = sha256Sync(JSON.stringify({ sysName, emassId, il, jurisdiction, controls, poams }));

  const sheets: XlsxSheetInput[] = [
    {
      name: "Control_Implementation",
      headers: [
        "Control ID",
        "DISA CCI",
        "Assessment Procedure",
        "Implementation Status",
        "Implementation Narrative",
        "Inherited From",
        "Responsible Role",
      ],
      rows: controls.map((c) => [
        c.controlId,
        c.cciId,
        c.assessmentProcedure || c.controlId,
        c.status,
        c.narrative,
        c.inheritedFrom || "System-Specific",
        c.responsibleRole || "ISSO",
      ]),
    },
    {
      name: "POAM_Items",
      headers: [
        "POA&M ID",
        "Control ID",
        "Weakness Description",
        "CAT Severity",
        "Scheduled Completion Date",
        "Status",
        "Milestones",
      ],
      rows: poams.map((p) => [p.poamId, p.controlId, p.weakness, p.severity, p.scheduledCompletionDate, p.status, p.milestones]),
    },
    {
      name: "Test_Results_Summary",
      headers: ["Field", "Value"],
      rows: [
        ["System Name", sysName],
        ["eMASS / Xacta Package ID", emassId],
        ["Jurisdiction & Governing Authority", jurisdiction === "IC" ? "ODNI ICD 503 (2024-10-25)" : "DoDI 8510.01 (2022-07-19)"],
        ["DoD Impact Level", il],
        ["Exported Timestamp (UTC)", exportedAt],
        ["Total Exported Controls", controls.length],
        ["Open POA&M Items", poams.filter((p) => p.status !== "Completed").length],
        ["Canonical Payload SHA-256", metaSha],
        ["Authorizing Official Boundary Note", "aiCanIssueAto=false; AO retains exclusive authorization authority."],
      ],
    },
  ];

  const buffer = buildXlsxBuffer(sheets);
  const slug = sysName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "system";

  return {
    filename: `noctis-${emassId.toLowerCase()}-${slug}-emass.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
    base64: buffer.toString("base64"),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    sheetNames: sheets.map((s) => s.name),
    rowCounts: {
      Control_Implementation: controls.length,
      POAM_Items: poams.length,
      Test_Results_Summary: 9,
    },
    aiCanIssueAto: false,
  };
}

/** Generates a formatted SSP / SAP / SAR / POA&M Compliance Binder in Markdown with attestation hash. */
export function generateComplianceBinderMarkdown(input: EmassXlsxExportInput = {}): {
  title: string;
  markdown: string;
  sha256: string;
  aiCanIssueAto: false;
} {
  const sysName = (input.systemName || "Noctis Sovereign Enclave Workload").trim();
  const emassId = (input.emassSystemId || "EMASS-90421").trim();
  const il = input.impactLevel || "IL5";
  const jurisdiction = input.jurisdiction || "DOD";
  const controls = input.controls?.length ? input.controls : DEFAULT_CONTROLS;
  const poams = input.poams?.length ? input.poams : DEFAULT_POAMS;

  const binderSha = sha256Sync(JSON.stringify({ sysName, emassId, il, jurisdiction, controls, poams }));
  const md = [
    `# ${jurisdiction === "IC" ? "ODNI ICD 503" : "DoDI 8510.01"} Authorization Compliance Binder — ${sysName}`,
    `- **Package ID:** \`${emassId}\` · **Impact Level:** \`${il}\` · **Jurisdiction:** \`${jurisdiction}\``,
    `- **Governing Framework:** ${jurisdiction === "IC" ? "ODNI ICD 503 (2024-10-25) / CNSSI 1253" : "DoDI 8510.01 (2022-07-19) / CNSSI 1253 / DISA CCI 2025-01-23"}`,
    `- **Attestation SHA-256:** \`${binderSha}\` · **\`aiCanIssueAto: false\`**`,
    "",
    "## Section 1 — System Security Plan (SSP) Control Implementation Summary",
    "| Control | DISA CCI | Status | Inheritance | Responsible Role | Narrative |",
    "| :--- | :--- | :---: | :--- | :--- | :--- |",
    ...controls.map(
      (c) =>
        `| \`${c.controlId}\` | \`${c.cciId}\` | **${c.status}** | ${c.inheritedFrom || "System-Specific"} | ${c.responsibleRole || "ISSO"} | ${c.narrative} |`,
    ),
    "",
    "## Section 2 — Security Assessment Plan (SAP) & Security Assessment Report (SAR) Posture",
    `- **Controls Evaluated:** ${controls.length} · **Compliant:** ${controls.filter((c) => c.status === "Compliant").length} · **Non-Compliant:** ${controls.filter((c) => c.status === "Non-Compliant").length}`,
    `- **Assessment Rule:** Independent Security Control Assessor (SCA) Examine/Interview/Test evidence required prior to SAR sign-off; post-patch credentialed ACAS rescan mandatory before closing scanner POA&Ms.`,
    "",
    "## Section 3 — Plan of Action & Milestones (POA&M)",
    "| POA&M ID | Control | CAT | Target Date | Status | Weakness & Milestones |",
    "| :--- | :--- | :---: | :---: | :---: | :--- |",
    ...poams.map((p) => `| \`${p.poamId}\` | \`${p.controlId}\` | \`${p.severity}\` | \`${p.scheduledCompletionDate}\` | **${p.status}** | ${p.weakness} (${p.milestones}) |`),
    "",
    "---",
    "> **Governance Notice:** This artifact prepares eMASS/Xacta authorization documentation for human ISSO, ISSM, SCA, and Authorizing Official (AO) review. Only the designated AO can render an ATO decision.",
  ].join("\n");

  return {
    title: `${emassId} — ${sysName} Compliance Binder`,
    markdown: md,
    sha256: binderSha,
    aiCanIssueAto: false,
  };
}
