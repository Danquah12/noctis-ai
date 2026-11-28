/**
 * Noctis NDIMP Waves 2, 3 & 4 Deterministic NLP Extractors & Render Helpers
 *
 * Keeps `dod-ic-reasoning.server.ts` modular and readable while ensuring every Wave 2–4
 * capability routes seamlessly through Noctis Chat (`/api/noctis`) with reproducible
 * deterministic rule evaluation and SQL `EXPL-...` audit tracing.
 */

import type { AssessmentMode, DodIcRuleResult } from "./dod-rmf-engine.ts";
import type { SecurityClassification } from "./classification-gateway.ts";
import {
  evaluateClassifiedMediaSanitizationAndSpillage,
  evaluateComsecAndCsfcArchitecture,
  evaluateScifIcd705Compliance,
  evaluateTempestRedBlackCompliance,
  type ComsecCsfcResult,
  type MediaSanitizationResult,
  type ScifAssessmentResult,
  type TempestAssessmentResult,
} from "./classified-systems-engine.ts";
import {
  evaluateDcoSocDetectionCoverage,
  evaluateDigitalForensicsChainOfCustody,
  evaluateInsiderThreatProgram,
  type DcoDetectionResult,
  type ForensicsCustodyResult,
  type InsiderThreatResult,
} from "./dco-forensics-engine.ts";
import {
  evaluateDevSecOpsCatoAndSsdf,
  evaluateDodCloudSrgInheritance,
  evaluateKubernetesAndContainerHardening,
  type CloudSrgInheritanceResult,
  type DevSecOpsCatoResult,
  type K8sHardeningResult,
} from "./devsecops-cloud-engine.ts";
import {
  evaluateAiAdversarialRedTeam,
  evaluateDefenseAiGovernanceAndRai,
  type AiRedTeamResult,
  type DefenseAiRaiResult,
} from "./defense-ai-governance-engine.ts";
import {
  evaluateIcd203AndAchAnalysis,
  evaluateMultiIntSyntheticFusion,
  type Icd203AchResult,
  type MultiIntFusionResult,
} from "./intel-tradecraft-fusion-engine.ts";
import {
  evaluateAcquisitionCmmcAndFoci,
  evaluateDigitalEngineeringSpaceSpectrum,
  evaluateMissionAssuranceDag,
  type AcquisitionCmmcResult,
  type MissionAssuranceDagResult,
  type SpaceMbseSpectrumResult,
} from "./mission-acquisition-space-engine.ts";

export interface Waves234Context {
  scif: ScifAssessmentResult | null;
  comsecCsfc: ComsecCsfcResult | null;
  tempest: TempestAssessmentResult | null;
  sanitization: MediaSanitizationResult | null;
  dcoDetection: DcoDetectionResult | null;
  forensics: ForensicsCustodyResult | null;
  insiderThreat: InsiderThreatResult | null;
  devSecOps: DevSecOpsCatoResult | null;
  k8sHardening: K8sHardeningResult | null;
  cloudInheritance: CloudSrgInheritanceResult | null;
  defenseAiRai: DefenseAiRaiResult | null;
  aiRedTeam: AiRedTeamResult | null;
  icd203Ach: Icd203AchResult | null;
  multiIntFusion: MultiIntFusionResult | null;
  missionAssuranceDag: MissionAssuranceDagResult | null;
  acquisitionCmmcFoci: AcquisitionCmmcResult | null;
  spaceMbseSpectrum: SpaceMbseSpectrumResult | null;
}

export function extractWaves234FromText(
  q: string,
  assessmentMode: AssessmentMode,
  evidenceVerified: boolean,
): Waves234Context {
  const ctx: Waves234Context = {
    scif: null,
    comsecCsfc: null,
    tempest: null,
    sanitization: null,
    dcoDetection: null,
    forensics: null,
    insiderThreat: null,
    devSecOps: null,
    k8sHardening: null,
    cloudInheritance: null,
    defenseAiRai: null,
    aiRedTeam: null,
    icd203Ach: null,
    multiIntFusion: null,
    missionAssuranceDag: null,
    acquisitionCmmcFoci: null,
    spaceMbseSpectrum: null,
  };

  // Wave 2 Step 1: SCIF (ICD 705)
  if (
    /\b(?:scif\b|icd\s*705|ics\s*705|fixed\s+facility\s+checklist|\bffc\b)\b/i.test(q) &&
    /\b(?:evaluat\w*|assess\w*|ped|bluetooth|smartwatch|smartphone|phone|ids\b|ul\s*2050|accredit\w*|ffc\b|visitor|escort|allow|bring)\b/i.test(q)
  ) {
    const pedViolation =
      /\b(?:smartwatch|bluetooth\s+headset|bluetooth|personal\s+phone|smartphone|wireless\s+ped|unauthorized\s+ped)\b[^.\n]{0,50}\b(?:inside|into|in\s+(?:a|an|the)?\s*scif|permitted|allow\w*|bring)\b/i.test(
        q,
      ) ||
      /\b(?:ped\s+prohibition\s+(?:not\s+enforced|violated|bypassed)|allows?\s+(?:peds?|smartwatches?|bluetooth|smartphones?))\b/i.test(q);
    ctx.scif = evaluateScifIcd705Compliance({
      aoAccreditationActive: /\b(?:no|missing|lacks?|expired)\s+(?:written\s+)?(?:ao\s+)?(?:scif\s+)?accreditation\b/i.test(q)
        ? false
        : /\bactive\s+(?:ao\s+)?accreditation\b/i.test(q)
        ? true
        : null,
      fixedFacilityChecklistCurrent: /\b(?:missing|stale)\s+(?:fixed\s+facility\s+checklist|ffc)\b/i.test(q) ? false : null,
      idsUl2050Monitored: /\bno\s+(?:ul\s*2050|ids)\b/i.test(q) ? false : null,
      pedProhibitionEnforced: pedViolation ? false : /\bped\s+prohibition\s+enforced\b/i.test(q) ? true : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 2 Step 1: COMSEC / CNSA 2.0 / CSfC
  if (
    /\b(?:comsec\b|dodi?\s*8523|cnssi?\s*4005|csfc\b|cnssp\s*15|cnsa\s*2\.0|ml-?kem|ml-?dsa|two[- ]person\s+integrity|\btpi\b|single[- ]layer\s+(?:commercial|vpn|tls))\b/i.test(
      q,
    ) &&
    /\b(?:evaluat\w*|assess\w*|single[- ]layer|dual[- ]layer|rsa\b|ecdh|ml-?kem|ml-?dsa|aes|type\s*1|tpi\b|zeroiz|2027|2030|2031|classified)\b/i.test(q)
  ) {
    const isSingleLayer = /\bsingle[- ]layer\s+(?:commercial|vpn|tls|encrypt\w*)\b/i.test(q);
    const isDualLayer = !isSingleLayer && /\b(?:dual[- ]layer|csfc)\b/i.test(q);
    const kex = /\bml-?kem-?1024\b/i.test(q)
      ? "ML-KEM-1024"
      : /\brsa\b|\becdh\b/i.test(q)
      ? q.match(/\b(rsa(?:-\d+)?|ecdh)\b/i)?.[1]?.toUpperCase() ?? "RSA"
      : null;
    const sig = /\bml-?dsa-?87\b/i.test(q) ? "ML-DSA-87" : null;
    const sym = /\baes-?256\b/i.test(q) ? "AES-256" : /\baes-?128\b/i.test(q) ? "AES-128" : null;
    const yearMatch = q.match(/\b(202[6-9]|203[0-5])\b/);

    ctx.comsecCsfc = evaluateComsecAndCsfcArchitecture({
      architectureMode: isSingleLayer ? "SINGLE_LAYER_COMMERCIAL" : /\btype\s*1\b/i.test(q) ? "TYPE_1" : isDualLayer ? "CSFC_DUAL_LAYER" : null,
      twoIndependentEncryptionLayers: isSingleLayer ? false : isDualLayer && /\bsame\s+vendor|single\s+vendor\b/i.test(q) ? true : null,
      distinctVendorsAcrossLayers: /\bsame\s+vendor|single\s+vendor\b/i.test(q) ? false : null,
      symmetricAlgorithm: sym,
      asymmetricKeyExchange: kex,
      signatureAlgorithm: sig,
      targetAcquisitionYear: yearMatch ? Number(yearMatch[1]) : kex ? 2027 : null,
      twoPersonIntegrityEnforced: /\b(?:no|without|missing|lacks?)\s+(?:two[- ]person\s+integrity|tpi)\b/i.test(q) ? false : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 2 Step 1: TEMPEST RED/BLACK
  if (/\b(?:tempest\b|red\/?black|ctta\b|protected\s+distribution\s+system|\bpds\b)\b/i.test(q)) {
    const rfNearRed = /\b(?:wi-?fi|bluetooth|cellular|unshielded\s+rf)\b[^.\n]{0,50}\b(?:near\s+red|red\s+equipment|red\s+room)\b/i.test(q);
    ctx.tempest = evaluateTempestRedBlackCompliance({
      redBlackCablingSeparated: /\b(?:mixed|unseparated)\s+red\/?black\b/i.test(q) ? false : null,
      cttaAssessmentCompleted: /\b(?:no|without|missing)\s+ctta\b/i.test(q) ? false : /\bctta\s+(?:approved|completed)\b/i.test(q) ? true : null,
      protectedDistributionSystemIfOutsideScif: /\bno\s+pds\b|\bunprotected\s+cable\s+outside\b/i.test(q) ? false : null,
      unshieldedRfTransmitterNearRedEquipment: rfNearRed ? true : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 2 Step 1: Media Sanitization & Spillage (NIST SP 800-88 R2)
  if (
    /\b(?:800-88|media\s+sanitiz\w*|degauss\w*|format(?:ting)?\s+(?:a|an|the)?\s*(?:ts\/?sci|top\s*secret|secret|classified)|wipe\w*\s+without\s+forensic)\b/i.test(
      q,
    ) ||
    (/\bdegauss\b/i.test(q) && /\b(?:ssd|flash|nvme)\b/i.test(q))
  ) {
    const media = /\b(?:ssd|flash|nvme)\b/i.test(q) ? "SSD_FLASH" : /\bhdd|magnetic\b/i.test(q) ? "HDD_MAGNETIC" : null;
    const cls: SecurityClassification | null = /\bts\/?sci\b/i.test(q)
      ? "TS_SCI"
      : /\btop\s*secret\b/i.test(q)
      ? "TOP_SECRET"
      : /\bsecret\b/i.test(q)
      ? "SECRET"
      : /\bcui\b/i.test(q)
      ? "CUI"
      : null;
    const method = /\bdegauss\w*\b/i.test(q)
      ? "DEGAUSS_NSA_EPL"
      : /\b(?:clear|format(?:ting)?|single[- ]pass\s+overwrite)\b/i.test(q)
      ? "CLEAR_FORMAT"
      : /\b(?:destroy|shred|disintegrat\w*|incinerat\w*)\b/i.test(q)
      ? "DESTROY_NSA_EPL_SHRED_DISINTEGRATE"
      : /\bpurge|crypto\s*erase\b/i.test(q)
      ? "PURGE_CRYPTO_ERASE"
      : null;
    const dest = /\b(?:unclassified\s+release|dispose|disposal|outside|lower\s+enclave|public)\b/i.test(q)
      ? "LOWER_OR_UNCLASSIFIED_RELEASE"
      : null;
    ctx.sanitization = evaluateClassifiedMediaSanitizationAndSpillage({
      mediaType: media,
      highestClassification: cls,
      proposedMethod: method,
      destinationBoundary: dest,
      spillageEvent: /\bspillage\b/i.test(q) ? true : null,
      deviceWipedWithoutForensicApproval: /\bwiped?\s+without\s+forensic\b/i.test(q) ? true : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 2 Step 2: DCO Detection / Forensics / Insider Threat
  const missingEdr =
    /\b(?:no|missing|without)\s+edr\b/i.test(q) ||
    /\bedr\b[^.\n]{0,60}\b(?:were|was|are|is)?\s*(?:offline|down|disabled|missing|unavailable|absent|not\s+collecting)\b/i.test(q);
  const missingDns =
    /\b(?:no|missing|without)\s+dns\s+logs?\b/i.test(q) ||
    /\bdns(?:\s+logs?)?\b[^.\n]{0,60}\b(?:were|was|are|is)?\s*(?:offline|down|disabled|missing|unavailable|absent|not\s+collecting)\b/i.test(q);
  const missingNetflow =
    /\b(?:no|missing|without)\s+(?:netflow|firewall)\b/i.test(q) ||
    /\b(?:netflow|firewall)(?:\s+logs?)?\b[^.\n]{0,60}\b(?:were|was|are|is)?\s*(?:offline|down|disabled|missing|unavailable|absent|not\s+collecting)\b/i.test(q);
  const missingSiem =
    /\b(?:no|missing|without)\s+siem\b/i.test(q) ||
    /\bsiem\b[^.\n]{0,60}\b(?:were|was|are|is)?\s*(?:offline|down|disabled|missing|unavailable|absent|not\s+collecting)\b/i.test(q);
  const claimsClean = /\b(?:no\s+intrusion|confirm\s+no\s+compromise|clean\s+bill(?:\s+of\s+health)?)\b/i.test(q);
  const anyTelemetryOfflineOrMissing =
    missingEdr ||
    missingDns ||
    missingNetflow ||
    missingSiem ||
    /\b(?:no|missing|without)\s+(?:telemetry|logs?)\b/i.test(q) ||
    /\b(?:telemetry|logs?)\b[^.\n]{0,60}\b(?:were|was|are|is)?\s*(?:offline|down|disabled|missing|unavailable|absent|not\s+collecting)\b/i.test(q);
  if (
    (claimsClean && anyTelemetryOfflineOrMissing) ||
    (/\b(?:dco\b|soc\s+telemetry)\b/i.test(q) && anyTelemetryOfflineOrMissing)
  ) {
    ctx.dcoDetection = evaluateDcoSocDetectionCoverage({
      edrTelemetryPresent: missingEdr ? false : null,
      dnsLogsPresent: missingDns ? false : null,
      netflowOrFirewallLogsPresent: missingNetflow ? false : null,
      siemCorrelationActive: missingSiem ? false : null,
      claimsNoIntrusionOccurred: claimsClean,
      assessmentMode,
      evidenceVerified,
    });
  }

  if (/\b(?:800-86|forensic\s+chain|write[- ]?block\w*|volatile\s+memory)\b/i.test(q)) {
    const wipedBefore = /\b(?:wiped?|re-?imaged?|rebooted?)\s+(?:before|prior\s+to)\s+(?:ram|memory|forensic)\b/i.test(q);
    ctx.forensics = evaluateDigitalForensicsChainOfCustody({
      volatileMemoryCapturedBeforeReboot: wipedBefore ? false : /\bvolatile\s+(?:ram|memory)\s+captured\b/i.test(q) ? true : null,
      hardwareWriteBlockerUsed: /\bno\s+write[- ]?blocker\b|\bwithout\s+write[- ]?blocker\b/i.test(q) ? false : null,
      hostWipedOrReimagedBeforeAcquisition: wipedBefore ? true : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  if (/\b(?:5205\.16|eo\s*13587|insider\s+threat|\buam\b|user\s+activity\s+monitoring)\b/i.test(q)) {
    ctx.insiderThreat = evaluateInsiderThreatProgram({
      insiderThreatHubActive: /\bno\s+(?:insider\s+threat\s+)?hub\b/i.test(q) ? false : true,
      classifiedNetworkUamEnabled: /\bno\s+uam\b|\bwithout\s+uam\b/i.test(q) ? false : true,
      legalAndPrivacyOversightActive: /\b(?:no|without)\s+(?:legal|privacy)\s+oversight\b/i.test(q) ? false : true,
      humanAdjudicationRequired: /\bautomated\s+punitive\b/i.test(q) ? false : true,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 2 Step 3: DevSecOps (cATO/SSDF), K8s STIG, DoD CC SRG Cloud Inheritance
  if (/\b(?:cato\b|continuous\s+ato|800-218|ssdf\b|certificate\s+to\s+field|\bctf\b)\b/i.test(q)) {
    const oneTimeScan = /\b(?:one[- ]time|single)\s+(?:pipeline\s+)?scan\b|\bno\s+continuous\s+(?:runtime\s+)?monitoring\b/i.test(q);
    ctx.devSecOps = evaluateDevSecOpsCatoAndSsdf({
      sastPassed: /\bfailed\s+sast\b/i.test(q) ? false : true,
      sbomGeneratedAndScanned: /\b(?:no|missing)\s+sbom\b/i.test(q) ? false : true,
      continuousRuntimeMonitoringActive: oneTimeScan ? false : /\bcontinuous\s+runtime\s+monitoring\b/i.test(q) ? true : null,
      criticalOrKevVulnsOpenCount: /\bopen\s+(?:critical|kev)\b/i.test(q) ? 1 : 0,
      assessmentMode,
      evidenceVerified,
    });
  }

  if (/\b(?:kubernetes|k8s\b|privileged\s+container|uid\s*0|root\s+container|hostnetwork)\b/i.test(q)) {
    ctx.k8sHardening = evaluateKubernetesAndContainerHardening({
      privilegedContainersPresent: /\bprivileged\s+containers?\b/i.test(q) && !/\bno\s+privileged\b/i.test(q) ? true : null,
      runningAsRootUid0: /\buid\s*0\b|\brunning\s+as\s+root\b/i.test(q) ? true : null,
      hostNetworkOrPidShared: /\bhostnetwork|hostpid\b/i.test(q) ? true : null,
      etcdEncryptedAtRest: /\bunencrypted\s+etcd\b/i.test(q) ? false : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  if (
    (/\b(?:cc\s*srg|provisional\s+authorization|\bcsp\s+pa\b|fedramp\s+high)\b/i.test(q) &&
      /\b(?:il[456]\b|mission\s+(?:owner\s+)?ato|workload\s+ato|automatically\s+(?:grant|authoriz)|scca)\b/i.test(q)) ||
    /\bcsp\s+pa\b/i.test(q)
  ) {
    const il = /\bil6\b|\bsecret\b/i.test(q) ? "IL6" : /\bil5\b/i.test(q) ? "IL5" : /\bil4\b/i.test(q) ? "IL4" : "IL5";
    const missingMissionAto =
      /\b(?:no|without|skip(?:ping)?)\s+mission\s+(?:owner\s+)?(?:workload\s+)?ato\b|\bcsp\s+pa\b[^.\n]{0,50}\b(?:enough|sufficient|automatically|grants?\s+(?:an?\s+)?ato)\b/i.test(
        q,
      );
    const fedrampClaimedIl5 = /\bfedramp\s+high\b[^.\n]{0,50}\b(?:satisf(?:y|ies)|equals?|covers?)\b[^.\n]{0,40}\bil[56]\b/i.test(q);
    ctx.cloudInheritance = evaluateDodCloudSrgInheritance({
      impactLevel: il,
      cspProvisionalAuthActive: true,
      missionOwnerWorkloadAtoIssued: missingMissionAto ? false : null,
      sccaComponentsEnforced: /\b(?:no|without)\s+scca\b/i.test(q) ? false : null,
      fedrampHighClaimedSufficientForIl5OrIl6: fedrampClaimedIl5 ? true : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 2 Step 4: Defense AI Governance (DoDD 3000.09 / RAI / NIST AI RMF) & Red Team
  if (/\b(?:3000\.09|responsible\s+ai|\brai\b|autonomous\s+weapon|lethal\s+autonom\w*|human\s+judgment|ai\s*100-1|ai\s*600-1|nist\s+ai\s+rmf)\b/i.test(q)) {
    const isLethal = /\b(?:lethal|weapon|kinetic|firing|targeting)\b/i.test(q);
    const noHuman = /\b(?:no|without|lacks?|removing|unsupervised)\s+(?:appropriate\s+)?human\s+(?:judgment|oversight|in\s+the\s+loop)\b|\bfully\s+unsupervised\b/i.test(
      q,
    );
    const noSenior = /\b(?:no|without)\s+senior\s+review\b/i.test(q);
    ctx.defenseAiRai = evaluateDefenseAiGovernanceAndRai({
      isLethalOrWeaponSystem: isLethal ? true : null,
      appropriateHumanJudgmentEnforced: noHuman ? false : /\bhuman\s+judgment\s+enforced\b/i.test(q) ? true : null,
      seniorReviewCompleted: noSenior ? false : null,
      traceableAuditLoggingActive: /\b(?:no|without)\s+audit\b/i.test(q) ? false : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  if (/\b(?:owasp\s+llm|prompt\s+injection|indirect\s+tool\s+injection|red[- ]?team\w*)\b/i.test(q) && /\b(?:ai|llm|agent|model|defense)\b/i.test(q)) {
    const passMatch = q.match(/(\d{1,3})%\s*(?:pass|red[- ]?team)/i);
    ctx.aiRedTeam = evaluateAiAdversarialRedTeam({
      promptInjectionDefensesTested: /\buntested\s+prompt\s+injection\b|\bbypassed\s+prompt\b/i.test(q) ? false : true,
      agentAutonomousApprovalBlocked: /\ballow\w*\s+agent\s+(?:auto[- ]?)?approv/i.test(q) ? false : true,
      adversarialRedTeamPassRatePercent: passMatch ? Number(passMatch[1]) : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 3: ICD 203 / 206 / ACH / NATO 6x6
  if (
    /\b(?:icd\s*20[36]|competing\s+hypothes|analysis\s+of\s+competing\s+hypotheses|admiralty|nato\s+6x6)\b/i.test(q) ||
    (/\b(?:[EF][56]|[A-F][1-6]\s+(?:source|reporting|intel)|source\s+[A-F][1-6])\b/i.test(q) && /\b(?:confidence|icd|analytic|single[- ]source|corroborat)\b/i.test(q))
  ) {
    const codeMatch =
      q.match(/(?:rated|grade[d]?|admiralty|nato|source(?:\s+code)?)\s+([A-F][1-6])\b/i) ||
      q.match(/\b([A-F][1-6])\s+(?:source|reporting|intel)\b/i) ||
      q.match(/\b(F6|E5|E6|F5)\b/i);
    const highConf = /\bhigh[- ]confidence\b/i.test(q);
    const singleSource = /\b(?:single[- ]source|uncorroborated|one\s+unverified)\b/i.test(q);
    ctx.icd203Ach = evaluateIcd203AndAchAnalysis({
      admiraltyCodes: codeMatch ? [codeMatch[1]!.toUpperCase()] : [],
      sourceCount: singleSource ? 1 : null,
      claimedConfidence: highConf ? "HIGH" : /\bmoderate[- ]confidence\b/i.test(q) ? "MODERATE" : /\blow[- ]confidence\b/i.test(q) ? "LOW" : null,
      alternativesConsidered: /\b(?:no|without|ignored)\s+alternative\s+hypothes/i.test(q) ? false : true,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 3: Multi-INT Fusion
  if (/\b(?:multi[- ]?int|osint\b|geoint\b|sigint\b|masint\b|haversine)\b/i.test(q) && /\b(?:ground\s+truth|correlat\w*|evaluat\w*|assess\w*|band|mhz|ghz|single[- ]source)\b/i.test(q)) {
    const discs: ("OSINT" | "GEOINT" | "SIGINT" | "MASINT" | "CI")[] = [];
    if (/\bosint\b/i.test(q)) discs.push("OSINT");
    if (/\bgeoint\b/i.test(q)) discs.push("GEOINT");
    if (/\bsigint\b/i.test(q)) discs.push("SIGINT");
    if (/\bmasint\b/i.test(q)) discs.push("MASINT");
    const mhzMatch = q.match(/(\d+(?:\.\d+)?)\s*mhz\b/i);
    ctx.multiIntFusion = evaluateMultiIntSyntheticFusion({
      summaryText: q,
      disciplinesPresent: discs,
      sigintFrequencyMhz: mhzMatch ? Number(mhzMatch[1]) : null,
      claimsMultiIntVerifiedGroundTruth: /\b(?:ground\s+truth|confirmed\s+fact|verified\s+truth)\b/i.test(q),
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 4: Mission Assurance DAG (DoDI 3020.45)
  if (/\b(?:3020\.45|3020\.40|mission\s+assurance|\bmef\b|\bpmef\b|single\s+point\s+of\s+failure|\bspof\b)\b/i.test(q)) {
    const hasSpof = /\b(?:unmitigated\s+spof|single\s+point\s+of\s+failure|non[- ]redundant|no\s+backup)\b/i.test(q);
    ctx.missionAssuranceDag = evaluateMissionAssuranceDag({
      mefs: [{ id: "MEF-1", name: "Primary Mission Essential Function", critical: true }],
      assets: [
        {
          id: "ASSET-CORE-1",
          name: "Primary Power/Comms Node",
          redundant: !hasSpof,
          operationalStatus: /\bdown\b/i.test(q) ? "DOWN" : "UP",
        },
      ],
      dependencies: [{ fromId: "MEF-1", toId: "ASSET-CORE-1" }],
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 4: Acquisition / CMMC 32 CFR Part 170 / DFARS 7012 / NISPOM FOCI
  if (/\b(?:32\s+cfr\s*(?:part\s*)?170|\bcmmc\b|dfars\s*252\.204|32\s+cfr\s*(?:part\s*)?117|nispom|\bfoci\b)\b/i.test(q)) {
    const poamDaysMatch = q.match(/(\d+)\s*[- ]?days?\s*(?:poa&?m|closeout|to\s+close)/i) || q.match(/poa&?m[^.\n]{0,30}(\d+)\s*[- ]?days?/i);
    const pctMatch = q.match(/(\d+(?:\.\d+)?)%\b/);
    const repHoursMatch = q.match(/(\d+(?:\.\d+)?)\s*hours?\b/i);
    const hasFociNoMitigation = /\bfoci\b/i.test(q) && /\b(?:no|without|lacks?|missing|unmitigated)\s+(?:foci\s+)?(?:mitigation|ssa|proxy|voting\s+trust)\b/i.test(q);
    ctx.acquisitionCmmcFoci = evaluateAcquisitionCmmcAndFoci({
      cmmcLevel: /\blevel\s*3\b/i.test(q) ? "LEVEL_3_DIBCAC" : /\blevel\s*2\b/i.test(q) ? "LEVEL_2_C3PAO" : "LEVEL_2_SELF",
      nist800171PercentMet: pctMatch ? Number(pctMatch[1]) : null,
      poamCloseoutDays: poamDaysMatch ? Number(poamDaysMatch[1]) : null,
      dfars7012IncidentReportedHours: repHoursMatch && /\b(?:7012|dibnet|incident|report\w*)\b/i.test(q) ? Number(repHoursMatch[1]) : null,
      hasForeignOwnershipOrControl: /\bfoci\b/i.test(q) ? true : null,
      fociMitigationInstrument: hasFociNoMitigation ? "NONE" : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // Wave 4: Space (SPD-5) / Spectrum (DoDI 4650.01) / MBSE (DoDI 5000.97) / Logistics Ao
  if (/\b(?:spd-?5|space\s+policy\s+directive|4650\.01|5000\.97|tt&c\b|mtbf\b|mttr\b|operational\s+availability)\b/i.test(q)) {
    const mtbfMatch = q.match(/\bmtbf\s*(?:=|is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const mttrMatch = q.match(/\bmttr\s*(?:=|is|of|:)?\s*(\d+(?:\.\d+)?)/i);
    const unencTtc = /\bunencrypted\s+(?:space\s+)?tt&c\b|\bunauthenticated\s+tt&c\b/i.test(q);
    ctx.spaceMbseSpectrum = evaluateDigitalEngineeringSpaceSpectrum({
      ttcCommandLinkEncryptedAndAuthenticated: unencTtc ? false : /\bencrypted\s+tt&c\b/i.test(q) ? true : null,
      spectrumCertificationObtained: /\b(?:no|missing|without)\s+spectrum\s+cert/i.test(q) ? false : null,
      mbseAuthoritativeSourceOfTruthActive: /\b(?:no|missing|without)\s+(?:asot|mbse)\b/i.test(q) ? false : null,
      mtbfHours: mtbfMatch ? Number(mtbfMatch[1]) : null,
      mttrHours: mttrMatch ? Number(mttrMatch[1]) : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  return ctx;
}

export function collectWaves234Rules(w: Waves234Context): DodIcRuleResult[] {
  const candidates = [
    w.scif?.ruleResult,
    w.comsecCsfc?.ruleResult,
    w.tempest?.ruleResult,
    w.sanitization?.ruleResult,
    w.dcoDetection?.ruleResult,
    w.forensics?.ruleResult,
    w.insiderThreat?.ruleResult,
    w.devSecOps?.ruleResult,
    w.k8sHardening?.ruleResult,
    w.cloudInheritance?.ruleResult,
    w.defenseAiRai?.ruleResult,
    w.aiRedTeam?.ruleResult,
    w.icd203Ach?.ruleResult,
    w.multiIntFusion?.ruleResult,
    w.missionAssuranceDag?.ruleResult,
    w.acquisitionCmmcFoci?.ruleResult,
    w.spaceMbseSpectrum?.ruleResult,
  ];
  return candidates.filter((r): r is DodIcRuleResult => Boolean(r));
}

export function collectWaves234PolicyIds(w: Waves234Context): string[] {
  const ids = new Set<string>();
  for (const r of collectWaves234Rules(w)) {
    for (const p of r.authorityCitations) ids.add(p.id);
  }
  return [...ids];
}

export function renderWaves234SummaryLines(w: Waves234Context): string[] {
  const lines: string[] = [];
  if (w.scif) {
    lines.push(
      `## SCIF Physical & PED Readiness (\`ICD 705\` / \`ICS 705-1\`)`,
      `- **Accrediting Authority:** \`${w.scif.accreditingAuthority}\` · **PED Violation Detected:** \`${w.scif.pedViolationDetected}\` · **Verdict:** **${w.scif.ruleResult.verdict}**`,
      "",
    );
  }
  if (w.comsecCsfc) {
    lines.push(
      `## COMSEC, NSA CSfC & CNSA 2.0 Cryptography (\`CNSSP 15\` \`2025-03-04\`)`,
      `- **CSfC Dual-Layer Compliant:** \`${w.comsecCsfc.csfcDualLayerCompliant}\` · **CNSA 2.0 Compliant:** \`${w.comsecCsfc.cnsa2Compliant}\` · **Verdict:** **${w.comsecCsfc.ruleResult.verdict}**`,
      "",
    );
  }
  if (w.tempest) {
    lines.push(
      `## TEMPEST / RED-BLACK Separation (\`CNSSAM TEMPEST/01-13\`)`,
      `- **CTTA Authority Required:** \`true\` · **Classified Attenuation Specs Withheld:** \`${w.tempest.classifiedSpecsWithheld}\` · **Verdict:** **${w.tempest.ruleResult.verdict}**`,
      "",
    );
  }
  if (w.sanitization) {
    lines.push(
      `## Classified Media Sanitization (\`NIST SP 800-88 Rev. 2\`)`,
      `- **Sanitization Sufficient:** \`${w.sanitization.sanitizationSufficient}\` · **Verdict:** **${w.sanitization.ruleResult.verdict}**`,
      "",
    );
  }
  if (w.dcoDetection || w.forensics || w.insiderThreat) {
    lines.push(`## DCO Telemetry, Digital Forensics (\`NIST SP 800-86\`) & Insider Threat (\`DoDI 5205.16\`)`);
    if (w.dcoDetection) lines.push(`- **DCO Coverage:** ${w.dcoDetection.telemetryCoveragePercent}% · **Missing-Telemetry Claim Blocked:** \`${w.dcoDetection.claimBlockedMissingTelemetry}\` · **Verdict:** **${w.dcoDetection.ruleResult.verdict}**`);
    if (w.forensics) lines.push(`- **Forensic Chain Integrity Preserved:** \`${w.forensics.evidenceIntegrityPreserved}\` · **Verdict:** **${w.forensics.ruleResult.verdict}**`);
    if (w.insiderThreat) lines.push(`- **Insider Threat Risk Indicators:** ${w.insiderThreat.elevatedRiskIndicatorsCount} · **Verdict:** **${w.insiderThreat.ruleResult.verdict}**`);
    lines.push("");
  }
  if (w.devSecOps || w.k8sHardening || w.cloudInheritance) {
    lines.push(`## DevSecOps (\`SSDF / cATO\`), K8s STIG & DoD CC SRG Cloud Inheritance`);
    if (w.devSecOps) lines.push(`- **cATO Eligible:** \`${w.devSecOps.catoEligible}\` · **Verdict:** **${w.devSecOps.ruleResult.verdict}**`);
    if (w.k8sHardening) lines.push(`- **K8s Hardened:** \`${w.k8sHardening.hardenedCompliant}\` · **Verdict:** **${w.k8sHardening.ruleResult.verdict}**`);
    if (w.cloudInheritance) lines.push(`- **CSP PA == Mission ATO:** \`false\` · **Verdict:** **${w.cloudInheritance.ruleResult.verdict}**`);
    lines.push("");
  }
  if (w.defenseAiRai || w.aiRedTeam) {
    lines.push(`## Defense AI Governance (\`DoDD 3000.09\` / \`NIST AI 100-1/600-1\`) & Adversarial Red-Team`);
    if (w.defenseAiRai) lines.push(`- **DoDD 3000.09 Human Judgment Satisfied:** \`${w.defenseAiRai.dodd300009HumanJudgmentSatisfied}\` · **Verdict:** **${w.defenseAiRai.ruleResult.verdict}**`);
    if (w.aiRedTeam) lines.push(`- **Red-Team Gate Passed:** \`${w.aiRedTeam.redTeamGatePassed}\` · **Verdict:** **${w.aiRedTeam.ruleResult.verdict}**`);
    lines.push("");
  }
  if (w.icd203Ach || w.multiIntFusion) {
    lines.push(`## Analytic Tradecraft (\`ICD 203/206\` / \`ACH\`) & Synthetic Multi-INT Fusion`);
    if (w.icd203Ach) lines.push(`- **ICD 203/206 Verdict:** **${w.icd203Ach.ruleResult.verdict}** · Strongest ACH Hypothesis: \`${w.icd203Ach.rankings[0]?.id || "N/A"}\` · Admiralty: ${w.icd203Ach.admiraltySummaries.map((a) => `\`${a.code}\``).join(", ") || "N/A"}`);
    if (w.multiIntFusion) lines.push(`- **Multi-INT Verdict:** **${w.multiIntFusion.ruleResult.verdict}** · Haversine Delta: ${w.multiIntFusion.haversineDistanceKm ?? "N/A"} km · RF Band: ${w.multiIntFusion.ituRfBand || "N/A"}`);
    lines.push("");
  }
  if (w.missionAssuranceDag || w.acquisitionCmmcFoci || w.spaceMbseSpectrum) {
    lines.push(`## Mission Assurance (\`DoDI 3020.45\`), CMMC/DFARS/FOCI & Space/Spectrum/MBSE`);
    if (w.missionAssuranceDag) lines.push(`- **Mission Assurance DAG Readiness:** ${w.missionAssuranceDag.missionReadinessScore}/100 · SPOFs: ${w.missionAssuranceDag.spofs.length} · **Verdict:** **${w.missionAssuranceDag.ruleResult.verdict}**`);
    if (w.acquisitionCmmcFoci) lines.push(`- **CMMC Conditional POA&M Eligible:** \`${w.acquisitionCmmcFoci.cmmcConditionalPoamEligible}\` · **Verdict:** **${w.acquisitionCmmcFoci.ruleResult.verdict}**`);
    if (w.spaceMbseSpectrum) lines.push(`- **Operational Availability Ao:** ${w.spaceMbseSpectrum.operationalAvailabilityAo ?? "N/A"} · **Verdict:** **${w.spaceMbseSpectrum.ruleResult.verdict}**`);
    lines.push("");
  }
  return lines;
}
