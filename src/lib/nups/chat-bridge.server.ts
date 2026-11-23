/**
 * NUPS Chat Bridge (`noctis-desk.server.ts` Integration)
 *
 * Routes Master Capability Matrix questions, multi-domain NUPS scenarios
 * (e.g., Hospital Power Outage spanning electrical, healthcare, cyber & regulatory),
 * and newly closed deterministic industry solvers directly through Chat while
 * strictly preserving clinical patient, DoD/IC STIG, FedRAMP RMF, and Command Center routing.
 */

import { isEnterpriseChatQuery } from "../enterprise/chat-bridge.server.ts";
import { renderMasterCapabilityMatrixMarkdown } from "./master-capability-matrix.ts";
import { solveUniversalProblem } from "./orchestrator.server.ts";

const CLINICAL_PATIENT_EXCLUSION_RE =
  /\b(?:patient\s+[ab]|\d{1,3}-year-old\s+(?:male|female)|chief\s+complaint|bp\s+\d{2,3}\/\d{2,3}\s*mmhg|serum\s+lipase|creatinine\s+of|troponin|kdigo|hyperkalemia|septic\s+shock)\b/i;

const DOD_IC_RMF_EXCLUSION_RE =
  /\b(?:rhel\s+9\s+stig|v-\d{5,6}|dodi\s+8510|icd\s+503|fedramp\s+(?:high|moderate)\s+system\s+uses)\b/i;

const EXPLICIT_NUPS_MATRIX_RE =
  /\b(?:universal\s+problem\s+solver|noctis\s+universal\s+problem\s+solver|\bnups\b|master\s+capability\s+matrix|40-?engine\s+matrix|20\s+(?:additional\s+)?industries|10\s+(?:advanced\s+)?scientific(?:\s+and\s+technical)?\s+engines|10\s+cross-?platform\s+capabilities)\b/i;

const MULTI_DOMAIN_OUTAGE_SCENARIO_RE =
  /(?=.*\b(?:hospital|icu|medical\s+center|port|airport|nuclear\s+plant|factory|facility)\b)(?=.*\b(?:power\s+outage|blackout|backup\s+(?:power|generator)|cyber|ransomware|regulatory|emergency\s+(?:preparedness|management))\b).+/is;

const DIRECT_NEW_DOMAIN_SOLVER_RE =
  /\b(?:combined\s+ratio|loss\s+ratio|pure\s+premium|noi\s+(?:and|&|\/)\s*(?:cap\s*rate|dscr)|cap\s+rate.*dscr|\bdscr\b|single\s+audit\s+threshold|2\s+cfr\s+(?:part\s+)?200|far\s+part\s+(?:13|15)\s+(?:sat|threshold)|half-?value\s+layer|\bhvl\b.*shield|alara\s+dose|free-?space\s+path\s+loss|\bfspl\b.*link\s+budget|\boee\b.*availability|metacentric\s+height|\bgm\s*=\s*kb|pm\s*2\.5.*aqi)\b/i;

export function isNupsChatQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;
  if (CLINICAL_PATIENT_EXCLUSION_RE.test(q)) return false;
  if (DOD_IC_RMF_EXCLUSION_RE.test(q)) return false;
  if (isEnterpriseChatQuery(q) && !EXPLICIT_NUPS_MATRIX_RE.test(q) && !MULTI_DOMAIN_OUTAGE_SCENARIO_RE.test(q)) {
    return false;
  }

  return (
    EXPLICIT_NUPS_MATRIX_RE.test(q) ||
    MULTI_DOMAIN_OUTAGE_SCENARIO_RE.test(q) ||
    DIRECT_NEW_DOMAIN_SOLVER_RE.test(q)
  );
}

export async function tryHandleNupsChatQuery(question: string): Promise<string | null> {
  const q = (question || "").trim();
  if (!isNupsChatQuery(q)) return null;

  // 1. Master Capability Matrix request
  if (
    EXPLICIT_NUPS_MATRIX_RE.test(q) &&
    !/\b(?:solve|hospital|outage|combined\s+ratio|dscr|hvl|fspl|single\s+audit)\b/i.test(q)
  ) {
    const wantsIndustry = /\b20\s+(?:additional\s+)?industries\b/i.test(q) && !/\bscientific|cross-?platform|matrix\b/i.test(q);
    const wantsSci = /\b10\s+(?:advanced\s+)?scientific\b/i.test(q) && !/\bindustr|cross-?platform|matrix\b/i.test(q);
    const wantsXpl = /\b10\s+cross-?platform\b/i.test(q) && !/\bindustr|scientific|matrix\b/i.test(q);
    const cat = wantsIndustry ? "INDUSTRY" : wantsSci ? "SCIENTIFIC_TECHNICAL" : wantsXpl ? "CROSS_PLATFORM" : "ALL";
    return renderMasterCapabilityMatrixMarkdown({ category: cat });
  }

  // 2. Full 5-stage NUPS Multi-Domain or Deterministic Industry Problem Solver
  const solved = await solveUniversalProblem({
    query: q,
    actorId: "noctis-chat-nups",
    tenantId: "tenant:public-sandbox",
    persist: true,
  });

  if (/\b(?:matrix|40\s*engines)\b/i.test(q)) {
    return `${solved.synthesizedMarkdown}\n\n---\n\n${renderMasterCapabilityMatrixMarkdown()}`;
  }
  return solved.synthesizedMarkdown;
}
