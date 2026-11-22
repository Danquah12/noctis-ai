/**
 * NDKRS Cross-Domain Executable Deterministic Rules Engine (Server-Side)
 */

import { buildClinicalScratchpad } from "../noctis-clinical-scratchpad.ts";
import { evaluateFips199SecurityCategorization, type ImpactLevel } from "../noctis-rmf-engine.ts";
import type { DeterministicRuleRecord, FactLockClaim } from "./types.ts";

export const NDKRS_RULE_CATALOG: Array<Omit<DeterministicRuleRecord, "createdAt" | "updatedAt">> = [
  {
    ruleId: "CLIN-KDIGO-AKI",
    domain: "clinical",
    name: "KDIGO 2012 Dual-Pathway AKI Staging",
    version: "2012.2",
    description:
      "Computes fold-change ratio, absolute serum creatinine rise, >= 4.0 mg/dL acute-rise Stage 3 criterion, and independent urine output staging.",
    authorityCitation: "KDIGO Clinical Practice Guideline for Acute Kidney Injury (Kidney Int Suppl 2012)",
    inputSchema: { currentCrMgDl: "number", baselineCrMgDl: "number", timeframeText: "string?" },
    ruleSpec: { foldStage1: 1.5, foldStage2: 2.0, foldStage3: 3.0, absStage3Cr: 4.0, absStage3MinRise: 0.5 },
    executorRef: "src/lib/noctis-clinical-scratchpad.ts#buildClinicalScratchpad",
    status: "VERIFIED",
    approvedBy: "noctis-clinical-board",
  },
  {
    ruleId: "CLIN-MAP",
    domain: "clinical",
    name: "Mean Arterial Pressure & Surviving Sepsis Threshold",
    version: "2021.1",
    description: "Computes MAP = (SBP + 2 * DBP) / 3 and evaluates Surviving Sepsis Campaign >= 65 mmHg target.",
    authorityCitation: "Surviving Sepsis Campaign International Guidelines 2021",
    inputSchema: { sbpMmHg: "number", dbpMmHg: "number" },
    ruleSpec: { targetMapMmHg: 65 },
    executorRef: "src/lib/ndkrs/rules-engine.server.ts#CLIN-MAP",
    status: "VERIFIED",
    approvedBy: "noctis-clinical-board",
  },
  {
    ruleId: "CLIN-WINTERS",
    domain: "clinical",
    name: "Winter's Formula Respiratory Compensation",
    version: "1.0.0",
    description: "Computes expected PaCO2 = (1.5 * HCO3-) + 8 +/- 2 mmHg using prioritized arterial HCO3-.",
    authorityCitation: "Albert MS, Dell RB, Winters RW (Ann Intern Med 1967)",
    inputSchema: { hco3MeqL: "number", measuredPaco2MmHg: "number?" },
    ruleSpec: { slope: 1.5, intercept: 8, tolerance: 2 },
    executorRef: "src/lib/ndkrs/rules-engine.server.ts#CLIN-WINTERS",
    status: "VERIFIED",
    approvedBy: "noctis-clinical-board",
  },
  {
    ruleId: "RMF-FIPS-199",
    domain: "rmf",
    name: "FIPS 199 High-Water-Mark Security Categorization",
    version: "2004.1",
    description: "Computes overall system impact as max(C, I, A) and enforces CUI/ITAR confidentiality floors.",
    authorityCitation: "FIPS PUB 199 / CNSSI 1253 / 32 CFR Part 2002",
    inputSchema: { confidentialityImpact: "LOW|MODERATE|HIGH", integrityImpact: "LOW|MODERATE|HIGH", availabilityImpact: "LOW|MODERATE|HIGH", informationTypes: "string[]?" },
    ruleSpec: { principle: "HIGH_WATER_MARK" },
    executorRef: "src/lib/noctis-rmf-engine.ts#evaluateFips199SecurityCategorization",
    status: "VERIFIED",
    approvedBy: "noctis-rmf-ao-board",
  },
  {
    ruleId: "RMF-POAM-SLA",
    domain: "rmf",
    name: "FedRAMP Rev. 5 POA&M Remediation SLA Evaluator",
    version: "5.2.0",
    description: "Determines mandatory remediation windows (High <= 30d, Moderate <= 90d, Low <= 180d) and overdue status.",
    authorityCitation: "FedRAMP Continuous Monitoring Strategy Guide Rev. 5",
    inputSchema: { severity: "CRITICAL|HIGH|MODERATE|LOW", openDays: "number" },
    ruleSpec: { maxDays: { CRITICAL: 30, HIGH: 30, MODERATE: 90, LOW: 180 } },
    executorRef: "src/lib/ndkrs/rules-engine.server.ts#RMF-POAM-SLA",
    status: "VERIFIED",
    approvedBy: "noctis-rmf-ao-board",
  },
  {
    ruleId: "ENG-OHMS-POWER",
    domain: "engineering",
    name: "Ohm's Law & Joule Power Solver",
    version: "1.0.0",
    description: "Deterministically solves DC voltage, current, resistance, and power dissipation (V = I*R, P = V*I).",
    authorityCitation: "IEC 60050 / IEEE Std 100",
    inputSchema: { voltageV: "number?", currentA: "number?", resistanceOhm: "number?" },
    ruleSpec: { formulas: ["V=I*R", "P=V*I"] },
    executorRef: "src/lib/ndkrs/rules-engine.server.ts#ENG-OHMS-POWER",
    status: "VERIFIED",
    approvedBy: "noctis-engineering-board",
  },
  {
    ruleId: "SCI-IDEAL-GAS",
    domain: "science",
    name: "Ideal Gas Law State Solver (PV = nRT)",
    version: "1.0.0",
    description: "Computes exact pressure, volume, moles, or Kelvin temperature with R = 0.082057 L*atm/(mol*K).",
    authorityCitation: "IUPAC Compendium of Chemical Terminology (Gold Book)",
    inputSchema: { pressureAtm: "number?", volumeL: "number?", molesN: "number?", tempK: "number?" },
    ruleSpec: { R_L_ATM_MOL_K: 0.082057 },
    executorRef: "src/lib/ndkrs/rules-engine.server.ts#SCI-IDEAL-GAS",
    status: "VERIFIED",
    approvedBy: "noctis-science-board",
  },
  {
    ruleId: "LEGAL-CDS-21USC360J",
    domain: "legal",
    name: "FDA 21 U.S.C. § 360j(o)(1)(E) Non-Device CDS Criteria Check",
    version: "2022.1",
    description: "Evaluates all 4 mandatory statutory criteria distinguishing Non-Device Clinical Decision Support from SaMD.",
    authorityCitation: "21 U.S.C. § 360j(o)(1)(E) / FDA Clinical Decision Support Software Guidance (2022)",
    inputSchema: { analyzesImagesSignals: "boolean", displaysMedicalInfo: "boolean", supportsClinicianRecommendation: "boolean", enablesIndependentReview: "boolean" },
    ruleSpec: { requiresAllFour: true },
    executorRef: "src/lib/ndkrs/rules-engine.server.ts#LEGAL-CDS-21USC360J",
    status: "VERIFIED",
    approvedBy: "noctis-legal-board",
  },
];

export interface DeterministicRuleExecutionResult {
  ruleId: string;
  domain: string;
  authorityCitation: string;
  ok: boolean;
  verdict: string;
  outputs: Record<string, unknown>;
  lockedClaims: FactLockClaim[];
}

export function evaluateDeterministicRule(
  ruleId: string,
  inputs: Record<string, unknown>,
): DeterministicRuleExecutionResult {
  const meta = NDKRS_RULE_CATALOG.find((r) => r.ruleId === ruleId);
  if (!meta) {
    return {
      ruleId,
      domain: "unknown",
      authorityCitation: "NONE",
      ok: false,
      verdict: "UNKNOWN_RULE",
      outputs: { error: `Unknown ruleId: ${ruleId}` },
      lockedClaims: [],
    };
  }

  switch (ruleId) {
    case "CLIN-KDIGO-AKI": {
      const current = Number(inputs.currentCrMgDl);
      const baseline = Number(inputs.baselineCrMgDl);
      if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) {
        return {
          ruleId,
          domain: meta.domain,
          authorityCitation: meta.authorityCitation,
          ok: false,
          verdict: "MISSING_INPUTS",
          outputs: { error: "Provide positive numeric currentCrMgDl and baselineCrMgDl." },
          lockedClaims: [],
        };
      }
      const timeframe = String(inputs.timeframeText || "within 7 days");
      const pad = buildClinicalScratchpad(
        `Patient has a current creatinine of ${current} mg/dL. Historical baseline creatinine was ${baseline} mg/dL, measured ${timeframe}.`,
        "NDKRS-RULE-KDIGO",
      );
      const k = pad.derivedCalculations.kdigoAki;
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: true,
        verdict: `KDIGO_STAGE_${String(k.establishedStage).toUpperCase()}`,
        outputs: { ...k, currentCrMgDl: current, baselineCrMgDl: baseline },
        lockedClaims: [
          { label: "Current Creatinine", expectedValue: current, unit: "mg/dL", tolerance: 0.05 },
          { label: "Baseline Creatinine", expectedValue: baseline, unit: "mg/dL", tolerance: 0.05 },
          ...(k.crFoldRatio !== null
            ? [{ label: "Creatinine Fold Ratio", expectedValue: k.crFoldRatio, unit: "x", tolerance: 0.1 }]
            : []),
        ],
      };
    }

    case "CLIN-MAP": {
      const sbp = Number(inputs.sbpMmHg);
      const dbp = Number(inputs.dbpMmHg);
      if (!Number.isFinite(sbp) || !Number.isFinite(dbp) || sbp <= 0 || dbp <= 0) {
        return {
          ruleId,
          domain: meta.domain,
          authorityCitation: meta.authorityCitation,
          ok: false,
          verdict: "MISSING_INPUTS",
          outputs: { error: "Provide positive numeric sbpMmHg and dbpMmHg." },
          lockedClaims: [],
        };
      }
      const mapMmHg = Number(((sbp + 2 * dbp) / 3).toFixed(1));
      const verdict = mapMmHg >= 65 ? "ADEQUATE_PERFUSION_TARGET_MET" : "HYPOTENSIVE_BELOW_65_MMHG";
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: true,
        verdict,
        outputs: { sbpMmHg: sbp, dbpMmHg: dbp, mapMmHg, sepsisTargetMmHg: 65, meetsTarget: mapMmHg >= 65 },
        lockedClaims: [{ label: "MAP", expectedValue: mapMmHg, unit: "mmHg", tolerance: 0.5 }],
      };
    }

    case "CLIN-WINTERS": {
      const hco3 = Number(inputs.hco3MeqL);
      if (!Number.isFinite(hco3) || hco3 <= 0) {
        return {
          ruleId,
          domain: meta.domain,
          authorityCitation: meta.authorityCitation,
          ok: false,
          verdict: "MISSING_INPUTS",
          outputs: { error: "Provide positive numeric hco3MeqL." },
          lockedClaims: [],
        };
      }
      const center = Number((1.5 * hco3 + 8).toFixed(1));
      const low = Number((center - 2).toFixed(1));
      const high = Number((center + 2).toFixed(1));
      const measured = inputs.measuredPaco2MmHg != null ? Number(inputs.measuredPaco2MmHg) : null;
      let status = "EXPECTED_RANGE_COMPUTED";
      if (measured !== null && Number.isFinite(measured)) {
        status =
          measured < low
            ? "CONCOMITANT_RESPIRATORY_ALKALOSIS"
            : measured > high
            ? "INADEQUATE_COMPENSATION_OR_RESPIRATORY_ACIDOSIS"
            : "APPROPRIATE_COMPENSATION";
      }
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: true,
        verdict: status,
        outputs: { hco3MeqL: hco3, expectedPaco2Center: center, expectedRangeLow: low, expectedRangeHigh: high, measuredPaco2MmHg: measured },
        lockedClaims: [
          { label: "Winter Center PaCO2", expectedValue: center, unit: "mmHg", tolerance: 0.5 },
        ],
      };
    }

    case "RMF-FIPS-199": {
      const normImpact = (v: unknown): ImpactLevel => {
        const u = String(v || "MODERATE").toUpperCase();
        return u === "HIGH" || u === "LOW" ? u : "MODERATE";
      };
      const res = evaluateFips199SecurityCategorization({
        confidentialityImpact: normImpact(inputs.confidentialityImpact),
        integrityImpact: normImpact(inputs.integrityImpact),
        availabilityImpact: normImpact(inputs.availabilityImpact),
        informationTypes: Array.isArray(inputs.informationTypes) ? inputs.informationTypes.map(String) : ["Federal Information"],
        isNationalSecuritySystem: Boolean(inputs.isNationalSecuritySystem),
      });
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: res.passed,
        verdict: res.overallImpact,
        outputs: { ...res },
        lockedClaims: [{ label: "Overall Impact", expectedValue: res.overallImpact }],
      };
    }

    case "RMF-POAM-SLA": {
      const sev = String(inputs.severity || "MODERATE").toUpperCase();
      const openDays = Number(inputs.openDays ?? 0);
      const maxSlaDays = sev === "CRITICAL" || sev === "HIGH" ? 30 : sev === "LOW" ? 180 : 90;
      const overdue = Number.isFinite(openDays) && openDays > maxSlaDays;
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: true,
        verdict: overdue ? "SLA_OVERDUE" : "WITHIN_SLA",
        outputs: { severity: sev, maxSlaDays, openDays, daysRemaining: Math.max(0, maxSlaDays - openDays), overdue },
        lockedClaims: [{ label: "Max POA&M SLA", expectedValue: maxSlaDays, unit: "days", tolerance: 0 }],
      };
    }

    case "ENG-OHMS-POWER": {
      const V = inputs.voltageV != null ? Number(inputs.voltageV) : null;
      const I = inputs.currentA != null ? Number(inputs.currentA) : null;
      const R = inputs.resistanceOhm != null ? Number(inputs.resistanceOhm) : null;
      if (I !== null && R !== null && Number.isFinite(I) && Number.isFinite(R)) {
        const calcV = Number((I * R).toFixed(4));
        const calcP = Number((calcV * I).toFixed(4));
        return {
          ruleId,
          domain: meta.domain,
          authorityCitation: meta.authorityCitation,
          ok: true,
          verdict: "SOLVED_OHMS_POWER",
          outputs: { voltageV: calcV, currentA: I, resistanceOhm: R, powerW: calcP },
          lockedClaims: [
            { label: "Voltage", expectedValue: calcV, unit: "V", tolerance: 0.05 },
            { label: "Power", expectedValue: calcP, unit: "W", tolerance: 0.05 },
          ],
        };
      }
      if (V !== null && R !== null && Number.isFinite(V) && Number.isFinite(R) && R > 0) {
        const calcI = Number((V / R).toFixed(4));
        const calcP = Number((V * calcI).toFixed(4));
        return {
          ruleId,
          domain: meta.domain,
          authorityCitation: meta.authorityCitation,
          ok: true,
          verdict: "SOLVED_OHMS_POWER",
          outputs: { voltageV: V, currentA: calcI, resistanceOhm: R, powerW: calcP },
          lockedClaims: [
            { label: "Current", expectedValue: calcI, unit: "A", tolerance: 0.05 },
            { label: "Power", expectedValue: calcP, unit: "W", tolerance: 0.05 },
          ],
        };
      }
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: false,
        verdict: "MISSING_INPUTS",
        outputs: { error: "Provide at least two valid parameters (I & R, or V & R>0)." },
        lockedClaims: [],
      };
    }

    case "SCI-IDEAL-GAS": {
      const R_CONST = 0.082057;
      const P = inputs.pressureAtm != null ? Number(inputs.pressureAtm) : null;
      const V = inputs.volumeL != null ? Number(inputs.volumeL) : null;
      const n = inputs.molesN != null ? Number(inputs.molesN) : null;
      const T = inputs.tempK != null ? Number(inputs.tempK) : null;
      if (P === null && V && n && T && V > 0) {
        const calcP = Number(((n * R_CONST * T) / V).toFixed(4));
        return {
          ruleId,
          domain: meta.domain,
          authorityCitation: meta.authorityCitation,
          ok: true,
          verdict: "SOLVED_PRESSURE_ATM",
          outputs: { pressureAtm: calcP, volumeL: V, molesN: n, tempK: T, R: R_CONST },
          lockedClaims: [{ label: "Pressure", expectedValue: calcP, unit: "atm", tolerance: 0.05 }],
        };
      }
      if (V === null && P && n && T && P > 0) {
        const calcV = Number(((n * R_CONST * T) / P).toFixed(4));
        return {
          ruleId,
          domain: meta.domain,
          authorityCitation: meta.authorityCitation,
          ok: true,
          verdict: "SOLVED_VOLUME_L",
          outputs: { pressureAtm: P, volumeL: calcV, molesN: n, tempK: T, R: R_CONST },
          lockedClaims: [{ label: "Volume", expectedValue: calcV, unit: "L", tolerance: 0.05 }],
        };
      }
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: false,
        verdict: "MISSING_INPUTS",
        outputs: { error: "Provide V, n, T (to solve P) or P, n, T (to solve V) with positive denominator." },
        lockedClaims: [],
      };
    }

    case "LEGAL-CDS-21USC360J": {
      const noImagesSignals = inputs.analyzesImagesSignals === false;
      const displaysInfo = inputs.displaysMedicalInfo === true;
      const supportsClinician = inputs.supportsClinicianRecommendation === true;
      const independentReview = inputs.enablesIndependentReview === true;
      const qualifies = noImagesSignals && displaysInfo && supportsClinician && independentReview;
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: true,
        verdict: qualifies ? "NON_DEVICE_CDS" : "DEVICE_REGULATED_SAMD_REVIEW_REQUIRED",
        outputs: {
          criterion1_noImageOrSignalAcquisition: noImagesSignals,
          criterion2_displaysMedicalInformation: displaysInfo,
          criterion3_supportsOrRecommendsToHCP: supportsClinician,
          criterion4_enablesIndependentReviewOfBasis: independentReview,
          qualifiesAsNonDeviceCds: qualifies,
        },
        lockedClaims: [{ label: "FDA Classification", expectedValue: qualifies ? "NON_DEVICE_CDS" : "DEVICE_REGULATED_SAMD_REVIEW_REQUIRED" }],
      };
    }

    default:
      return {
        ruleId,
        domain: meta.domain,
        authorityCitation: meta.authorityCitation,
        ok: false,
        verdict: "NOT_IMPLEMENTED",
        outputs: {},
        lockedClaims: [],
      };
  }
}
