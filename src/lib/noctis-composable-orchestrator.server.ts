/**
 * Composable Multi-Domain Tool Orchestrator (Pillar #1)
 *
 * Executes independent deterministic tools in parallel in a single turn
 * (Post-Quantum FIPS 203/204/205, Withdrawn Control Lineage, DoD/IC Overlay
 * notes when cross-domain defense/ITAR data appears, and live NIST SP PDF
 * chunk retrieval from PostgreSQL `rmf_pdf_chunks`).
 */

import { searchDodIcPolicies } from "./dod-ic/policy-registry.ts";
import { searchRmfPdfChunksInDb } from "./noctis-knowledge-retrieval.server.ts";
import type { RmfGroundingPacket } from "./noctis-rmf-db.ts";
import type { StructuredComplianceFacts } from "./noctis-structured-extractor.server.ts";

export interface ComposableToolBundle {
  toolsInvoked: string[];
  markdownAppendix: string;
  pdfChunksUsed: number;
}

export async function runComposableComplianceTools(
  question: string,
  packet: RmfGroundingPacket,
  _facts: StructuredComplianceFacts | null = null,
  opts: { allowDbQueries?: boolean } = {},
): Promise<ComposableToolBundle> {
  const q = (question || "").trim();
  const toolsInvoked: string[] = [];
  const sections: string[] = [];
  let pdfChunksUsed = 0;

  const withdrawnCtrls = packet.controls.filter((c) => c.withdrawn);
  const needsPqc = /\b(?:fips\s*20[345]|ml-?kem|ml-?dsa|slh-?dsa|post[- ]?quantum|\bpqc\b|kyber|dilithium)\b/i.test(q);
  const needsDodOverlay = /\b(?:itar|cnssi\s*1253|dod\b|defense\s+technical\s+data|dfars|cmmc|il[456])\b/i.test(q);
  const needsPdfChunks =
    opts.allowDbQueries !== false &&
    Boolean(process.env.DATABASE_URL?.trim()) &&
    q.length >= 25;

  const [pdfRecords] = await Promise.all([
    needsPdfChunks
      ? Promise.race([
          searchRmfPdfChunksInDb(q, { domain: "cybersecurity", limit: 3, forceInclude: true }),
          new Promise<never[]>((resolve) => setTimeout(() => resolve([]), 2500)),
        ]).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Tool 1: Exact Withdrawn Control Lineage Guard (prevents conflating MP-6 with AC-13)
  if (withdrawnCtrls.length > 0) {
    toolsInvoked.push("tool_withdrawn_control_lineage");
    sections.push("### TOOL OUTPUT [tool_withdrawn_control_lineage] — MANDATORY SEPARATION");
    for (const c of withdrawnCtrls) {
      sections.push(
        `- **${c.id} (${c.title}) is WITHDRAWN in NIST SP 800-53 Rev. 5.** Its ONLY official replacement controls are **${c.withdrawnInto.join(" and ")}**. Keep **MP-6 (Media Sanitization under SP 800-88)** strictly separate from **${c.id} -> ${c.withdrawnInto.join(", ")} (account supervision and audit review)**.`,
      );
    }
    sections.push("");
  }

  // Tool 2: Post-Quantum Cryptography (FIPS 203 / 204 / 205) Reference
  if (needsPqc) {
    toolsInvoked.push("tool_pqc_fips203");
    sections.push("### TOOL OUTPUT [tool_pqc_fips203] — POST-QUANTUM CRYPTOGRAPHY GROUNDING");
    sections.push(
      "- **FIPS 203 (ML-KEM / Module-Lattice Key-Encapsulation Mechanism):** Approved August 13, 2024 as the primary federal PQC key-establishment standard replacing ECDH/RSA key exchange for TLS 1.3, VPNs, and SSH (mapped to **NIST SP 800-53 SC-12 & SC-13**, paired with FIPS 140-3 validated modules).",
    );
    sections.push(
      "- **Companions & Migration Timeline:** Pair with **FIPS 204 (ML-DSA)** / **FIPS 205 (SLH-DSA)** for digital signatures per **NIST IR 8547** transition guidance (prioritize inventory of HNDL — Harvest Now, Decrypt Later — exposure on long-retention Clinical PHI and ITAR technical data).",
    );
    sections.push("");
  }

  // Tool 3: Cross-Domain Defense / ITAR Overlay (enriches FedRAMP High without hijacking route)
  if (needsDodOverlay) {
    const dodPolicies = searchDodIcPolicies(q).slice(0, 3);
    toolsInvoked.push("tool_dod_ic_overlay");
    sections.push("### TOOL OUTPUT [tool_dod_ic_overlay] — ITAR / DEFENSE TECHNICAL DATA OVERLAY");
    sections.push(
      "- **Jurisdiction Boundary:** Evaluating as civilian/agency **FedRAMP High (FIPS 199 High-Water Mark)** layered with ITAR / export-controlled defense data constraints (22 CFR 120–130 + NIST SP 800-171 Rev. 3 CUI / DFARS 252.204-7012 / US Persons & CONUS access controls; if DoD mission data enters DoD boundaries, **DoD CC SRG IL5 + CNSSI 1253** apply, and a FedRAMP High P-ATO does NOT automatically grant a DoD Mission Owner ATO).",
    );
    for (const p of dodPolicies) {
      sections.push(`- **Overlay Policy (${p.id}, effective ${p.effectiveDate}):** ${p.title}`);
    }
    sections.push("");
  }

  // Tool 4: Verbatim NIST SP PDF Chunks from Neon pgvector/FTS
  if (pdfRecords.length > 0) {
    toolsInvoked.push("tool_nist_pdf_chunks");
    pdfChunksUsed = pdfRecords.length;
    sections.push("### TOOL OUTPUT [tool_nist_pdf_chunks] — VERBATIM NIST SP PDF EXCERPTS");
    for (const rec of pdfRecords.slice(0, 3)) {
      sections.push(`- **${rec.title}:** ${rec.summary}`);
    }
    sections.push("");
  }

  return {
    toolsInvoked,
    markdownAppendix: sections.join("\n"),
    pdfChunksUsed,
  };
}
