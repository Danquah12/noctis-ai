/**
 * Noctis Defense & IC Neuro-Symbolic Reasoning Engine (NDIMP Wave 1 — Steps 1–3)
 *
 * Orchestrates:
 *   Gate 0: Classification & Boundary Guard BEFORE any external LLM dispatch
 *   Stage 1: Deterministic DoDI 8510.01 / 8531.01 / 8530.03 / 8540.01 / 8520.02 / 8520.03 /
 *            DoD ZT 7-Pillar Strategy / NSM-8 / CISA ZTMM v2.0 / CNSSI 1253 / ICD 503-501 / DISA CCI-STIG-ACAS Rules
 *            + Live NDIMP Platform Inventory & SQL EXPL-... Trace Replay
 *   Stage 2: Constrained Synthesis (temperature: 0.0) + Deterministic Offline Fallback
 *   Stage 3: Anti-Conflation, Anti-Fabrication & ICAM/PKI Safety Verifier + 1-Shot Repair + SQL EXPLANATION Persistence
 */

import { parseThinkEnvelope } from "../noctis-engine-registry.ts";
import { fetchLiveCisaKevCatalog } from "../rmf-v2/cyber-intelligence.ts";
import { type ZtPillarScore } from "../rmf-v2/cyber-intelligence.ts";
import { createExplanationBundle, replayExplanationBundle, type ExplanationBundle } from "../rmf-v2/graph-and-trace.ts";
import { getRmfExplanationArtifactById, saveRmfArtifact } from "../rmf-v2/persistence.server.ts";
import { sha256Sync } from "../universal-crypto.ts";
import {
  evaluateClassificationGate,
  evaluateCrossDomainTransfer,
  type ClassificationGateResult,
  type DeploymentBoundary,
  type SecurityClassification,
} from "./classification-gateway.ts";
import {
  evaluateCnssi1253Categorization,
  evaluateDod8510Authorization,
  evaluateDodReciprocity,
  type DodIcRuleResult,
  type ImpactLevel,
} from "./dod-rmf-engine.ts";
import { evaluateIcd501SharingGovernance, evaluateIcd503Authorization, evaluateIcReciprocity } from "./ic-security-engine.ts";
import { DOD_IC_POLICY_REGISTRY, listDodIcPolicies, searchDodIcPolicies, type DodIcPolicyRecord } from "./policy-registry.ts";
import {
  evaluateDodi8530IncidentReporting,
  evaluateDodi8531VulnerabilityCompliance,
  extractCciIdsFromText,
  getDisaCciManifest,
  listCcisForNistControl,
  lookupDisaCci,
  parseAndEvaluateAcasNessus,
  parseAndEvaluateStigXccdfOrCkl,
  type AcasAnalysisResult,
  type DisaCciControlSummary,
  type DisaCciRecord,
  type StigChecklistAnalysisResult,
} from "./stig-acas-engine.ts";
import {
  evaluateDodIcamPkiAuthentication,
  evaluateDodZeroTrust7Pillar,
  evaluatePrivilegedAccessAndAbac,
  getDodZeroTrustCatalog,
  type DodCredentialType,
  type DodIcamPkiResult,
  type DodPamAbacResult,
  type DodZeroTrustAssessmentResult,
} from "./zero-trust-icam-engine.ts";
import {
  checkUpstreamAuthoritativeDrift,
  diffHistoricalDirectiveRevision,
  evaluatePolicyRolloutGovernance,
  listDirectiveLineages,
  type DirectiveDiffReport,
  type PolicyRolloutGovernanceCheckResult,
  type UpstreamDriftReport,
} from "./policy-change-engine.server.ts";
import {
  collectWaves234PolicyIds,
  collectWaves234Rules,
  extractWaves234FromText,
  renderWaves234SummaryLines,
  type Waves234Context,
} from "./waves234-extractors.ts";
import { lookupStigRuleById, searchStigLibrary, type StigLibraryRuleHydrated } from "./stig-library.ts";

export interface DodIcModelChatFn {
  (
    messages: { role: string; content: string }[],
    opts?: {
      maxTokens?: number;
      temperature?: number;
      brain?: { provider?: string; apiKey?: string; model?: string; endpoint?: string };
      thinkingLevel?: "minimal" | "low" | "medium" | "high";
    },
  ): Promise<{ text: string } | { error: string }>;
}

export interface DodIcReasoningOptions {
  turns?: { role: "user" | "assistant"; content: string }[];
  brain?: { provider?: string; apiKey?: string; model?: string; endpoint?: string };
  engineName?: string;
  language?: string;
  shouldThink?: boolean;
  modelChatFn?: DodIcModelChatFn;
  deploymentBoundary?: DeploymentBoundary;
  claimedUserClearance?: SecurityClassification | null;
  tenantId?: string;
  persistTrace?: boolean;
}

const CIVILIAN_FEDRAMP_RMF_RE =
  /\b(?:fedramp|sp\s*800-53a?|nist\s+(?:sp\s*)?800-53a?|sp\s*800-37|sp\s*800-60|fips\s*199|3pao|poa&m|poam)\b/i;

const EXPLICIT_DOD_IC_AUTHORITY_RE =
  /<(?:NessusClientData_v2|ReportHost|CHECKLIST|STIG_INFO|(?:[a-zA-Z0-9_.-]+:)?rule-result)\b|\b(?:replay|verify|inspect|show)\s+(?:explanation\s+)?(?:trace\s+)?EXPL-[A-Z0-9]+\b|\b(?:ndimp\b|CCI-\d{4,6}|DISA\s+(?:CCIs?|STIG)|dodi?\s*8510(?:\.01)?|dodi?\s*853[01](?:\.\d+)?|dodi?\s*8540(?:\.\d+)?|dodi?\s*8520(?:\.0[23])?|dodi?\s*8523(?:\.\d+)?|dodi?\s*5205\.16|dodd?\s*5205\.16|dodd?\s*3000\.09|dodi?\s*3020\.45|dodd?\s*3020\.40|dodi?\s*4650\.01|dodi?\s*5000\.97|dodm\s*5200(?:\.01)?|eo\s*13526|eo\s*13587|nsm[- ]?8|omb\s+m-?22-?09|cisa\s+ztmm|\bztmm\b|fy\s*2027|dod\s+zero\s+trust|dod\s+rmf|dod\s+ato|dod\s+reciproc\w*|dod\s+il[2456]\b|dow\s+il[2456]\b|dod\s+pki|emass\b|iatt\b|dato\b|atowc\b|icd\s*50[123]|icd\s*705|ics\s*705|icd\s*20[36]|ic\s+ie\b|ic\s+rmf|ic\s+ato|ic\s+reciproc\w*|ic\s+cloud|ic\s+security|odni\b|cnssi?\s*1253|cnssi?\s*4005|cnssp\s*15|cnssam\s+tempest|national\s+security\s+system|cross[- ]?domain\s+(?:solution|transfer|guard|governance)|ncdsmo\b|ts\/?sci\b|\bscif\b|\bsipr\b|\bjwics\b|\bcomsec\b|\bcsfc\b|cnsa\s*2\.0|\btempest\b|red\/?black|\bctta\b|degauss\w*|800-88\s*(?:r2|rev\.?\s*2)|classified\s+(?:spillage|system|systems|enclave|handling|payload|cable|material|ssd|media|data)|\bsecret\b[^.\n]{0,30}(?:enclave|system|ssd|hdd|media|network|classified|data)|cc\s*srg|\bcsp\s+pa\b|mission\s+owner\s+ato|32\s+cfr\s*(?:part\s*)?(?:170|117)|\bcmmc\b|dfars\s*252\.204|nispom|\bfoci\b|spd-?5|space\s+policy\s+directive|\btt&c\b|\bmbse\b|stig\b|scap\b|xccdf\b|\.ckl\b|acas\b|nessus\b|iava\b|iavm\b|iavb\b|cssp\b|jfhq-?dodin|\bcac\b|alt\s+token|ocsp\b|npe\s+cert\w*|ic-?pe\b|\bcato\b|continuous\s+ato|800-218|\bssdf\b|800-207|800-86|autonomous\s+weapon|admiralty|nato\s+6x6|competing\s+hypothes|multi[- ]?int|geoint\b|sigint\b|rhel\s*9\s+stig|windows\s*server\s*2022\s+stig|postgresql\s+stig|asd\s+stig)\b/i;

export function isDodIcQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;
  if (CIVILIAN_FEDRAMP_RMF_RE.test(q) && !EXPLICIT_DOD_IC_AUTHORITY_RE.test(q)) {
    return false;
  }
  return (
    /<(?:NessusClientData_v2|ReportHost|CHECKLIST|STIG_INFO|(?:[a-zA-Z0-9_.-]+:)?rule-result)\b/i.test(q) ||
    /\b(?:replay|verify|inspect|show)\s+(?:explanation\s+)?(?:trace\s+)?EXPL-[A-Z0-9]+\b/i.test(q) ||
    /\b(?:ndimp\b|policy\s+change\s+intelligence|policy\s+(?:diff|drift|rollout|proposal|supersession|lineage)|upstream\s+(?:oscal|cci|kev|policy|directive)\s+drift|(?:what\s+changed|changes?\s+between|compare|diff)\b[^.\n]{0,50}\b(?:icd\s*503|dodi?\s*8510|cnssi?\s*1253|dodi?\s*8520|ztmm|cci|oscal)|(?:ai|agent|llm|self)[- ]?(?:auto[- ]?)?approv\w*[^.\n]{0,45}\b(?:policy|directive|rollout)|(?:dod|ic)\s+(?:engines?|capabilities|policies|roadmap|status)\b[^.\n]{0,40}\b(?:noctis|live|active|loaded|list|show|what|right\s+now))\b/i.test(
      q,
    ) ||
    /\b(?:CCI-\d{4,6}|DISA\s+CCIs?|CCIs?\b[^.\n]{0,35}(?:NIST|800-53|STIG|control|map)|dodi?\s*8510(?:\.01)?|dodi?\s*8531(?:\.01)?|dodi?\s*8530(?:\.03)?|dodi?\s*8540(?:\.01)?|dodi?\s*8520(?:\.0[23])?|dodi?\s*8523(?:\.01)?|dodi?\s*5205\.16|dodd?\s*5205\.16|dodd?\s*3000\.09|dodi?\s*3020\.45|dodd?\s*3020\.40|dodi?\s*4650\.01|dodi?\s*5000\.97|dodm\s*5200(?:\.01)?|eo\s*13526|eo\s*13587|nsm[- ]?8|omb\s+m-?22-?09|cisa\s+ztmm|\bztmm\b|fips\s*201(?:-?3)?|800-207|dod\s+zero\s+trust|zero\s+trust\b[^.\n]{0,50}(?:pillar|fy\s*2027|target|advanced|dod|ic|icd|nsm|ztmm|cisa|icam|microsegment|pdp|pep|pam|jit|abac|cac|piv|pki)|(?:7[- ]?pillars?|fy\s*2027)[^.\n]{0,40}zero\s+trust|dod\s+rmf|dod\s+ato|dod\s+reciproc\w*|emass\b|iatt\b|dato\b|atowc\b|icd\s*50[123]|icd\s*705|ics\s*705|icd\s*20[36]|ic\s+ie\b|ic\s+rmf|ic\s+ato|ic\s+reciproc\w*|ic\s+cloud|ic\s+security|odni\b|cnssi?\s*1253|cnssi?\s*4005|cnssp\s*15|cnssam\s+tempest|national\s+security\s+system|nss\s+categoriz\w*|cross[- ]?domain\s+(?:solution|transfer|guard|governance)|ncdsmo\b|ts\/?sci\b|\bscif\b|\bcomsec\b|\bcsfc\b|cnsa\s*2\.0|ml-?kem|ml-?dsa|\btempest\b|red\/?black|\bctta\b|protected\s+distribution\s+system|800-88|media\s+sanitiz\w*|degauss\w*[^.\n]{0,30}(?:ssd|flash|classified)|800-86|forensic\s+chain|volatile\s+memory|insider\s+threat|\buam\b|dco\s+telemetry|soc\s+telemetry|800-218|\bssdf\b|\bcato\b|continuous\s+ato|certificate\s+to\s+field|devsecops\b|kubernetes\s+(?:stig|harden\w*)|k8s\s+(?:stig|harden\w*)|privileged\s+container|cc\s*srg|\bcsp\s+pa\b|mission\s+owner\s+ato|responsible\s+ai|\brai\b[^.\n]{0,30}(?:dod|3000\.09|principle|weapon)|autonomous\s+weapon|lethal\s+autonom\w*|human\s+judgment|nist\s+ai\s*(?:rmf|100-1|600-1)|owasp\s+llm|competing\s+hypothes|analysis\s+of\s+competing\s+hypotheses|admiralty|nato\s+6x6|multi[- ]?int|osint\b[^.\n]{0,40}(?:geoint|sigint|ground\s+truth)|geoint\b|sigint\b|mission\s+assurance|\bspof\b[^.\n]{0,35}(?:mission|3020|mef)|32\s+cfr\s*(?:part\s*)?170|\bcmmc\b|dfars\s*252\.204|32\s+cfr\s*(?:part\s*)?117|nispom|\bfoci\b[^.\n]{0,40}(?:nispom|mitigat\w*|dcsa|32\s+cfr|clearance|foreign)|spd-?5|space\s+policy\s+directive|\btt&c\b|\bmbse\b|digital\s+engineering|operational\s+availability|\bmtbf\b[^.\n]{0,25}\bmttr\b|disa\s+stig\b|stig\s+(?:cat\s*(?:i|ii|iii|1|2|3)|check\w*|checklist\w*|finding\w*|rule\w*|viewer|evaluat\w*|compliance|waiver|v-\d+)|scap\b|xccdf\b|\.ckl\b|acas\b|nessus\b|iava\b|iavm\b|iavb\b|cssp\b|jfhq-?dodin|credentialed\s+scan\b|v-\d{5,7}\b|sv-\d{5,7}r\d+_rule\b|\bicam\b|\bcac\b(?:\s*(?:\/|\bor\b|\band\b|\bcard|\btoken|\bauth|\blogon|\bmfa|\bpiv|\bwithout))|\bdaily\s+cac\b|\buser\s+cac\b|\bpiv\b(?:\s*(?:card|token|auth|mfa|fips|cac))|alt\s+token|alternate\s+logon\s+token|dod\s+pki|pki\s+enabl\w*|\bocsp\b|\bcrl\b(?:\s*(?:check|revocation|fail|valid|ocsp))|revocation\s+fail[- ]?(?:open|closed)|soft[- ]?fail\s+ocsp|npe\s+cert\w*|ic-?pe\b|standing\s+(?:privileged|domain\s+admin|admin)\s+(?:access|rights|privileges)|microsegmentation|flat\s+network[^.\n]{0,40}(?:zero\s+trust|microsegment|mtls|dod|ic)|classified\s+(?:spillage|system|systems|enclave|handling|payload|cable|material|ssd|media)|commercial\s+cloud[^.\n]{0,40}classified|classified[^.\n]{0,40}commercial\s+cloud)\b/i.test(
      q,
    ) ||
    (/\b(?:f6|e5|e6)\b/i.test(q) && /\b(?:confidence|icd\s*20[36]|source|analytic)\b/i.test(q)) ||
    /\b(?:rhel\s*9\s+stig|windows\s*server\s*2022\s+stig|postgresql\s+stig|asd\s+stig)\b/i.test(q) ||
    (/\bno\s+intrusion\b/i.test(q) && /\b(?:missing|without|no)\s+(?:edr|dns|netflow|siem|telemetry|logs?)\b/i.test(q)) ||
    (/\b(?:acas|nessus|plugin|credential\w*|scan)\b/i.test(q) && /\b(?:19506|21745|110385|104410|24786|117885)\b/.test(q))
  );
}

interface Step3Extracted {
  ztAssessment: DodZeroTrustAssessmentResult | null;
  icamAssessment: DodIcamPkiResult | null;
  pamAbacAssessment: DodPamAbacResult | null;
}

function extractStep3FromText(q: string, assessmentMode: "SCENARIO_ASSUMPTION" | "FORMAL_EVIDENCE_AUDIT", evidenceVerified: boolean): Step3Extracted {
  let ztAssessment: DodZeroTrustAssessmentResult | null = null;
  let icamAssessment: DodIcamPkiResult | null = null;
  let pamAbacAssessment: DodPamAbacResult | null = null;

  const parseScore = (pattern: RegExp): ZtPillarScore | null => {
    const m = q.match(pattern);
    if (!m) return null;
    const n = Number(m[1]);
    if (n >= 4) return 4;
    if (n >= 3) return 3;
    if (n >= 2) return 2;
    return 1;
  };

  // Zero Trust 7-Pillar extraction
  const hasZtIntent =
    /\b(?:zero\s+trust|7[- ]?pillars?|fy\s*2027|ztmm|nsm[- ]?8|m-?22-?09|800-207|microsegment|pdp\/pep)\b/i.test(q) &&
    /\b(?:evaluat\w*|assess\w*|score|stage|pillar|flat\s+network|no\s+microsegment\w*|without\s+microsegment\w*|no\s+edr|unencrypted|no\s+phishing|sms|static\s+ssh|fy\s*2027|target|ready|readiness)\b/i.test(
      q,
    );

  if (hasZtIntent) {
    const userScore = parseScore(/\buser\s*(?:pillar\s*)?(?:score|=|:)?\s*([1-4])\b/i);
    const deviceScore = parseScore(/\bdevice\s*(?:pillar\s*)?(?:score|=|:)?\s*([1-4])\b/i);
    const networkScore = parseScore(/\bnetwork\s*(?:pillar\s*)?(?:score|=|:)?\s*([1-4])\b/i);
    const applicationsScore = parseScore(/\bapplications?\s*(?:pillar\s*)?(?:score|=|:)?\s*([1-4])\b/i);
    const dataScore = parseScore(/\bdata\s*(?:pillar\s*)?(?:score|=|:)?\s*([1-4])\b/i);
    const visibilityScore = parseScore(/\bvisibility\s*(?:pillar\s*)?(?:score|=|:)?\s*([1-4])\b/i);
    const automationScore = parseScore(/\bautomation\s*(?:pillar\s*)?(?:score|=|:)?\s*([1-4])\b/i);

    const noMfa = /\b(?:no|without|lacks?|missing)\s+phishing[- ]?resistant\s+mfa\b|\b(?:sms|otp|password[- ]only)\b/i.test(q);
    const hasMfa = /\b(?:phishing[- ]?resistant\s+mfa\s+(?:enforced|active|enabled)|cac|piv|alt\s+token|fido2)\b/i.test(q) && !noMfa;
    const noMicro = /\b(?:flat\s+network|no\s+microsegment\w*|without\s+microsegment\w*|lacks?\s+microsegment\w*)\b/i.test(q);
    const hasMicro = /\bmicrosegment\w*\s+(?:enforced|active|enabled)\b/i.test(q) && !noMicro;
    const noEdr = /\b(?:no\s+edr|without\s+edr|unmanaged\s+devices?)\b/i.test(q);
    const noDataEnc = /\b(?:unencrypted\s+data|no\s+data\s+tagging|no\s+dlp)\b/i.test(q);
    const noPdp = /\b(?:no\s+pdp|without\s+pdp)\b/i.test(q);
    const noSiem = /\b(?:no\s+siem|without\s+siem|no\s+soar)\b/i.test(q);

    ztAssessment = evaluateDodZeroTrust7Pillar({
      isNationalSecuritySystem: /\b(?:nss|national\s+security\s+system|nsm[- ]?8|secret|ts\/?sci|classified)\b/i.test(q),
      userScore,
      deviceScore,
      networkScore,
      applicationsScore,
      dataScore,
      visibilityScore,
      automationScore,
      phishingResistantMfaEnforced: noMfa ? false : hasMfa ? true : null,
      devicePostureAndEdrVerified: noEdr ? false : /\bedr\s+(?:deployed|verified|active)\b/i.test(q) ? true : null,
      microsegmentationAndMtlsEnforced: noMicro ? false : hasMicro ? true : null,
      dataTaggingAndEncryptionEnforced: noDataEnc ? false : null,
      continuousPdpPepEnforced: noPdp ? false : null,
      centralizedSiemsAndSoarActive: noSiem ? false : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // ICAM / PKI / CAC / ALT / OCSP-CRL extraction
  const hasIcamIntent =
    /\b(?:dodi?\s*8520|\bicam\b|\bcac\b|\bpiv\b|alt\s+token|alternate\s+logon|dod\s+pki|\bocsp\b|\bcrl\b|fips\s*201)\b/i.test(q) &&
    /\b(?:evaluat\w*|assess\w*|fail[- ]?open|soft[- ]?fail|fail[- ]?closed|without\s+a?\s*separate\s+alt|no\s+alt|daily\s+cac|shared\s+cac|sms|otp|password|static\s+ssh|disabled|privileged|admin|revocation|mfa|check)\b/i.test(
      q,
    );

  if (hasIcamIntent) {
    const credentialType: DodCredentialType | null = /\b(?:sms|otp|email\s+code)\b/i.test(q)
      ? "SMS_OTP"
      : /\bpassword[- ]?only\b/i.test(q)
      ? "PASSWORD_ONLY"
      : /\bstatic\s+ssh\s+key\b/i.test(q)
      ? "STATIC_SSH_KEY"
      : /\b(?:alt\s+token|alternate\s+logon)\b/i.test(q) && !/\b(?:no|without|lacks?|missing)\s+(?:a\s+)?(?:separate\s+)?(?:privileged\s+)?alt\s+token\b/i.test(q)
      ? "DOD_PKI_ALT_TOKEN"
      : /\bfido2\b/i.test(q)
      ? "FIDO2_HARDWARE"
      : /\bpiv\b/i.test(q)
      ? "PIV"
      : /\bcac\b/i.test(q)
      ? "CAC"
      : /\bnpe\b/i.test(q)
      ? "NPE_CERT"
      : null;

    const isPrivilegedAccount = /\b(?:privileged|admin|administrator|domain\s+admin|root)\b/i.test(q);
    const missingAlt =
      /\b(?:without|no|lacks?|missing)\s+(?:a\s+)?(?:separate\s+)?(?:privileged\s+)?(?:alt\s+token|alternate\s+logon|privileged\s+account)\b|\bdaily\s+(?:user\s+)?cac\b[^.\n]{0,40}\b(?:admin|privileged|without\s+alt)\b/i.test(
        q,
      );
    const hasAlt = /\bseparate\s+(?:admin|privileged)\s+account[^.\n]{0,40}alt\s+token\b/i.test(q) && !missingAlt;

    const ocspDisabled = /\b(?:ocsp|crl|revocation)\s+(?:is\s+)?(?:disabled|off|skipped|bypassed|not\s+checked)\b/i.test(q);
    const ocspFailOpen = /\b(?:ocsp|crl|revocation)\b[^.\n]{0,40}\b(?:fail[- ]?open|soft[- ]?fail)\b|\b(?:fail[- ]?open|soft[- ]?fail)\s+(?:ocsp|crl)\b/i.test(
      q,
    );
    const ocspFailClosed = /\b(?:ocsp|crl|revocation)\b[^.\n]{0,40}\bfail[- ]?closed\b/i.test(q) && !ocspFailOpen && !ocspDisabled;

    icamAssessment = evaluateDodIcamPkiAuthentication({
      credentialType,
      isPrivilegedAccount,
      separatePrivilegedAccountAndAltToken: missingAlt ? false : hasAlt ? true : null,
      ocspOrCrlRevocationChecked: ocspDisabled ? false : ocspFailOpen || ocspFailClosed ? true : null,
      revocationFailClosed: ocspFailOpen ? false : ocspFailClosed ? true : null,
      dodRootCaChainVerified: /\b(?:untrusted|self[- ]signed)\s+(?:root|ca)\b/i.test(q)
        ? false
        : /\bdod\s+root\s+ca\s+verified\b/i.test(q)
        ? true
        : null,
      fips140ValidatedCrypto: /\bnon[- ]?fips\b/i.test(q) ? false : null,
      upstreamBastionEnforcesHardwareMfa: /\bupstream\s+bastion[^.\n]{0,30}(?:hardware|cac|piv)\b/i.test(q) ? true : null,
      assessmentMode,
      evidenceVerified,
    });
  }

  // PAM / JIT / ABAC / Microsegmentation extraction
  const hasPamAbacIntent =
    /\b(?:standing\s+(?:privileged|domain\s+admin|admin)|pam\b|jit\b|just[- ]in[- ]time|abac\b|ic-?pe\b|rbac[- ]only|east[- ]west|microsegment\w*|npe\s+mtls)\b/i.test(
      q,
    ) &&
    /\b(?:evaluat\w*|assess\w*|standing|flat\s+network|no\s+microsegment\w*|without\s+microsegment\w*|no\s+jit|no\s+abac|rbac[- ]only|no\s+mtls|without\s+mtls|enforce|check)\b/i.test(
      q,
    );

  if (hasPamAbacIntent) {
    const standingBad = /\bstanding\s+(?:privileged|domain\s+admin|admin)\b/i.test(q) && !/\b(?:zero|no|eliminated)\s+standing\b/i.test(q);
    const standingGood = /\b(?:zero|no|eliminated)\s+standing\b/i.test(q);
    const jitBad = /\b(?:no|without|lacks?)\s+(?:jit|session\s+recording)\b/i.test(q);
    const rbacOnly = /\brbac[- ]only\b|\bwithout\s+abac\b|\bno\s+abac\b/i.test(q);
    const abacGood = /\babac\b[^.\n]{0,40}\b(?:enforced|active)\b/i.test(q) && !rbacOnly;
    const microBad = /\b(?:flat\s+network|no\s+microsegment\w*|without\s+microsegment\w*)\b/i.test(q);
    const microGood = /\bmicrosegment\w*\s+(?:enforced|active)\b/i.test(q) && !microBad;
    const mtlsBad = /\b(?:no|without|unauthenticated)\s+(?:east[- ]west\s+)?(?:npe\s+)?mtls\b/i.test(q);

    pamAbacAssessment = evaluatePrivilegedAccessAndAbac({
      standingPrivilegedAccessEliminated: standingBad ? false : standingGood ? true : null,
      jitApprovalAndSessionRecording: jitBad ? false : /\bjit\s+approval\b/i.test(q) ? true : null,
      rbacOnlyWithoutAttributeChecks: rbacOnly ? true : null,
      abacClassificationAttributesEnforced: rbacOnly ? false : abacGood ? true : null,
      eastWestMicrosegmentationEnforced: microBad ? false : microGood ? true : null,
      workloadMtlsWithNpeCerts: mtlsBad ? false : null,
      isIcOrClassifiedEnvironment: /\b(?:ic\b|ic-?pe|icd\s*50[13]|secret|ts\/?sci|classified|noforn)\b/i.test(q),
      assessmentMode,
      evidenceVerified,
    });
  }

  return { ztAssessment, icamAssessment, pamAbacAssessment };
}

export function extractAndEvaluateDodIcRulesFromText(question: string): DodIcRuleResult[] {
  const q = (question || "").trim();
  if (!q) return [];
  const results: DodIcRuleResult[] = [];
  const evidenceVerified = /\b(?:verified\s+(?:audit\s+)?evidence|attached\s+(?:audit\s+)?artifacts?|immutable\s+logs?\s+attached|sha-?256\s*[:=])\b/i.test(
    q,
  );
  const assessmentMode = evidenceVerified ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION";

  const parseImpact = (label: string): ImpactLevel | null => {
    const m = q.match(new RegExp(`\\b${label}\\s*(?:impact|=|:|\\bis\\b)?\\s*(low|moderate|high)\\b`, "i"));
    if (!m) return null;
    return m[1]!.toUpperCase() as ImpactLevel;
  };

  // 1. CNSSI 1253 Security Categorization & Overlays
  if (
    /\b(?:cnssi?\s*1253|nss\s+categoriz\w*|national\s+security\s+system)\b/i.test(q) ||
    (parseImpact("confidentiality") && /\b(?:ts\/?sci|secret|classified|icd\s*503|dodi?\s*8510)\b/i.test(q))
  ) {
    const c = parseImpact("confidentiality") || (/\b(ts\/?sci|top\s*secret|secret)\b/i.test(q) ? "HIGH" : "MODERATE");
    const i = parseImpact("integrity") || "MODERATE";
    const a = parseImpact("availability") || "LOW";
    const cls: SecurityClassification = /\b(ts\/?sci|sci\b)\b/i.test(q)
      ? "TS_SCI"
      : /\btop\s*secret\b/i.test(q)
      ? "TOP_SECRET"
      : /\bsecret\b/i.test(q)
      ? "SECRET"
      : /\bcui\b/i.test(q)
      ? "CUI"
      : "UNCLASSIFIED";
    results.push(
      evaluateCnssi1253Categorization({
        confidentiality: c,
        integrity: i,
        availability: a,
        classification: cls,
        isIntelligenceSystem: /\b(ic\b|icd\s*503|intelligence|ts\/?sci|\bsci\b)\b/i.test(q),
        hasCrossDomainSolution: /\b(cross[- ]?domain|\bcds\b|ncdsmo)\b/i.test(q),
        isSpaceSystem: /\bspace\b|\bsatellite\b/i.test(q),
        processesPiiPrivacy: /\bpii\b|\bprivacy\b/i.test(q),
        isCloudSystem: /\bcloud\b|\bsrg\b|\bc2s\b|\bil[456]\b/i.test(q),
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 2. IC vs. DoD Reciprocity Check
  if (
    (/\breciproc\w*|automatically\s+satisf(?:y|ies)|reuse\s+(?:an?\s+)?(?:dod\s+)?ato|cross[- ]?community\b/i.test(q) &&
      /\b(?:icd\s*503|ic\s+authorization|ic\s+rmf|ic\s+ato|intelligence\s+community|dod\s+ato)\b/i.test(q)) ||
    (/\bdod\s+ato\b/i.test(q) && /\bicd\s*503\b/i.test(q))
  ) {
    if (/\b(?:icd\s*503|ic\s+authorization|ic\s+ato|ic\s+system|intelligence\s+community)\b/i.test(q)) {
      const sourceAuthorizationType = /\b(?:dod\s+ato|dodi?\s*8510)\b/i.test(q)
        ? "DOD_ATO"
        : /\bfedramp\b/i.test(q)
        ? "FEDRAMP_ATO"
        : "IC_ICD503_ATO";
      results.push(
        evaluateIcReciprocity({
          sourceAuthorizationType,
          sourceAtoActiveAndUnexpired: /\bexpired\b/i.test(q) ? false : null,
          icOverlaysAndSciVerified: /\bverified\s+(?:ic|sci)\s+overlays\b/i.test(q)
            ? true
            : sourceAuthorizationType !== "IC_ICD503_ATO"
            ? false
            : null,
          assessmentMode,
          evidenceVerified,
        }),
      );
    } else {
      results.push(
        evaluateDodReciprocity({
          targetJurisdiction: "DOD",
          sourceAtoActiveAndUnexpired: /\bexpired\b/i.test(q) ? false : null,
          cat1OpenWithoutAoAcceptance: /\bcat\s*i\b|\bcat[- ]?1\b/i.test(q) ? true : null,
          assessmentMode,
          evidenceVerified,
        }),
      );
    }
  }

  // 3. DoDI 8510.01 DoD RMF Authorization Readiness
  if (
    /\bdodi?\s*8510|emass|dod\s+ato|dod\s+rmf|cat\s*i\b|cat\s*1\b/i.test(q) &&
    /\b(evaluat\w*|assess\w*|ready|readiness|authorize|authorization|can\s+.*issue|gap|missing|cat\s*i|cat\s*1|no\s+independent\s+sca)\b/i.test(
      q,
    )
  ) {
    const cat1Match = q.match(/(\d+)\s+(?:unmitigated\s+|open\s+)?cat\s*(?:i|1)\b/i);
    const noSca = /\b(?:no|without|lacks?|missing)\s+independent\s+sca\b|\bself[- ]assess/i.test(q);
    const noEmass = /\b(?:not\s+(?:registered|in)\s+emass|missing\s+emass|no\s+emass)\b/i.test(q);
    results.push(
      evaluateDod8510Authorization({
        emassRegistered: noEmass ? false : /\bemass\s+(?:registered|active)\b/i.test(q) ? true : null,
        independentScaAssigned: noSca ? false : null,
        cat1UnmitigatedCount: cat1Match ? Number(cat1Match[1]) : null,
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 4. ICD 503 IC Authorization Readiness
  if (
    /\bicd\s*503|ic\s+cloud|ic\s+rmf|ic\s+ie\b/i.test(q) &&
    /\b(evaluat\w*|assess\w*|commercial\s+cloud|zero\s+trust|authorize|authorization|requirements?|ts\/?sci)\b/i.test(q)
  ) {
    const isCommercial = /\bcommercial\s+(?:cloud|llm|saas|public\s+cloud)\b/i.test(q);
    const noZt = /\bwithout\s+zero\s+trust|no\s+zero\s+trust\b/i.test(q);
    const no502 = /\b(?:no|without)\s+icd\s*502\b/i.test(q);
    if (isCommercial || noZt || no502 || /\bevaluat\w*|assess\w*/i.test(q)) {
      results.push(
        evaluateIcd503Authorization({
          deploymentBoundary: isCommercial ? "COMMERCIAL_UNCLASSIFIED" : "IC_C2S_TS_SCI",
          zeroTrustAligned: noZt ? false : /\bzero\s+trust\b/i.test(q) ? true : null,
          icd502ConMonEnrolled: no502 ? false : null,
          assessmentMode,
          evidenceVerified,
        }),
      );
    }
  }

  // 5. Cross-Domain Solution (DoDI 8540.01)
  if (
    /\b(?:cross[- ]?domain|ncdsmo|\bcds\b|high[- ]to[- ]low|low[- ]to[- ]high|dodi?\s*8540)\b/i.test(q) &&
    /\b(evaluat\w*|assess\w*|transfer|without|bypass|check|missing|script)\b/i.test(q)
  ) {
    const srcCls: SecurityClassification = /\b(?:ts\/?sci|top\s*secret)\b/i.test(q)
      ? "TS_SCI"
      : /\bsecret\b/i.test(q)
      ? "SECRET"
      : "CUI";
    const dstCls: SecurityClassification = /\b(?:unclass|low[- ]side|nipr)\b/i.test(q) ? "UNCLASSIFIED" : "CUI";
    const noCds = /\b(?:without|no|bypass(?:ing)?)\s+(?:an?\s+)?(?:accredited\s+)?(?:cds|cross[- ]?domain)\b|\bdual[- ]homed\b/i.test(
      q,
    );
    results.push(
      evaluateCrossDomainTransfer({
        sourceClassification: srcCls,
        targetClassification: dstCls,
        accreditedCdsPresent: noCds ? false : null,
        securityLabelingVerified: /\bmissing\s+(?:security\s+)?label\b/i.test(q) ? false : null,
        releaseAuthorityApproved: /\bno\s+release\s+approv\w*|without\s+release\b/i.test(q) ? false : null,
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 6. ICD 501 Sharing / Commercial Cloud Scenario
  if (
    /\bicd\s*501\b/i.test(q) &&
    /\b(commercial\s+cloud|orcon|noforn|need[- ]to[- ]know|clearance|share|disseminat)\b/i.test(q)
  ) {
    const isCom = /\bcommercial\s+(?:cloud|model|llm|saas)\b/i.test(q);
    results.push(
      evaluateIcd501SharingGovernance({
        dataClassification: /\bts\/?sci|top\s*secret\b/i.test(q) ? "TS_SCI" : /\bsecret\b/i.test(q) ? "SECRET" : "CUI",
        targetBoundary: isCom ? "COMMERCIAL_UNCLASSIFIED" : "IC_C2S_TS_SCI",
        userClearance: /\bts\/?sci\b/i.test(q) ? "TS_SCI" : "SECRET",
        requiresOrconApproval: /\borcon\b/i.test(q),
        orconOriginatorApproved: /\bno\s+orcon|without\s+orcon|unapproved\b/i.test(q) ? false : null,
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 7. DoDI 8530.03 Cyber Incident Response Scenario
  if (
    /\b(?:dodi?\s*8530|cssp\b|jfhq-?dodin|cyber\s+incident\s+response)\b/i.test(q) &&
    /\b(?:compromise|spillage|discovered|hours?|notified|forensic|evaluat\w*|assess\w*|incident)\b/i.test(q)
  ) {
    const hoursMatch = q.match(/(\d+(?:\.\d+)?)\s*hours?\b/i);
    const notCssp = /\bcssp\s+(?:not\s+(?:yet\s+)?notified|unnotified)|not\s+(?:yet\s+)?notified\s+(?:to\s+)?cssp|without\s+cssp\b/i.test(
      q,
    );
    const noForensics = /\b(?:without|no|failed?\s+to)\s+(?:forensic|memory|log)\s+preserv\w*|\bwiped\s+before\b/i.test(q);
    const cat = /\bspillage\b/i.test(q)
      ? "CLASSIFIED_SPILLAGE"
      : /\broot\s+compromise|admin\s+compromise|privileged\s+compromise\b/i.test(q)
      ? "ROOT_COMPROMISE"
      : /\buser\s+compromise\b/i.test(q)
      ? "USER_COMPROMISE"
      : /\bmalicious\s+logic|malware|ransomware\b/i.test(q)
      ? "MALICIOUS_LOGIC"
      : "ROOT_COMPROMISE";
    results.push(
      evaluateDodi8530IncidentReporting({
        incidentCategory: cat,
        hoursSinceDiscovery: hoursMatch ? Number(hoursMatch[1]) : null,
        csspNotified: notCssp ? false : /\bcssp\s+notified\b/i.test(q) ? true : null,
        forensicEvidencePreserved: noForensics ? false : null,
        affectsClassifiedOrNss: /\b(?:secret|ts\/?sci|classified|nss)\b/i.test(q),
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 8. Step 3: Zero Trust 7-Pillar, DoDI 8520.02/8520.03 PKI/ICAM & PAM/JIT/ABAC
  const step3 = extractStep3FromText(q, assessmentMode, evidenceVerified);
  if (step3.ztAssessment) results.push(step3.ztAssessment.ruleResult);
  if (step3.icamAssessment) results.push(step3.icamAssessment.ruleResult);
  if (step3.pamAbacAssessment) results.push(step3.pamAbacAssessment.ruleResult);

  // 9. Waves 2, 3 & 4 deterministic extractors
  const w234 = extractWaves234FromText(q, assessmentMode, evidenceVerified);
  for (const r of collectWaves234Rules(w234)) {
    results.push(r);
  }

  return results;
}

export interface DodIcAsyncContext {
  rules: DodIcRuleResult[];
  resolvedCcis: DisaCciRecord[];
  controlCciMatches: { controlId: string; matches: DisaCciControlSummary[] }[];
  stigLibraryHits: StigLibraryRuleHydrated[];
  acasAnalysis: AcasAnalysisResult | null;
  stigAnalysis: StigChecklistAnalysisResult | null;
  ztAssessment: DodZeroTrustAssessmentResult | null;
  icamAssessment: DodIcamPkiResult | null;
  pamAbacAssessment: DodPamAbacResult | null;
  waves234: Waves234Context;
  policyDiffReports: DirectiveDiffReport[];
  driftReport: UpstreamDriftReport | null;
  rolloutCheck: PolicyRolloutGovernanceCheckResult | null;
  ndimpInventoryRequested: boolean;
}

export async function extractDodIcContextAsync(question: string): Promise<DodIcAsyncContext> {
  const q = (question || "").trim();
  const evidenceVerified = /\b(?:verified\s+(?:audit\s+)?evidence|attached\s+(?:audit\s+)?artifacts?|immutable\s+logs?\s+attached|sha-?256\s*[:=])\b/i.test(
    q,
  );
  const assessmentMode = evidenceVerified ? "FORMAL_EVIDENCE_AUDIT" : "SCENARIO_ASSUMPTION";

  const step3 = extractStep3FromText(q, assessmentMode, evidenceVerified);
  const waves234 = extractWaves234FromText(q, assessmentMode, evidenceVerified);
  const rules = extractAndEvaluateDodIcRulesFromText(q);
  const seenRuleIds = new Set(rules.map((r) => r.ruleId));
  const pushUniqueRule = (r: DodIcRuleResult) => {
    if (!seenRuleIds.has(r.ruleId)) {
      seenRuleIds.add(r.ruleId);
      rules.push(r);
    }
  };

  // 1. Resolve DISA CCIs mentioned in prompt text
  const cciIds = new Set<string>(extractCciIdsFromText(q));
  if (step3.icamAssessment) {
    for (const c of step3.icamAssessment.resolvedDisaCcis) cciIds.add(c.cciId);
  }
  const controlCciMatches: { controlId: string; matches: DisaCciControlSummary[] }[] = [];
  if (/\bCCIs?\b[^.\n]{0,40}\b(?:map|for|under|of)\b/i.test(q)) {
    const ctrlMatches = [...q.matchAll(/\b([A-Z]{2}-\d+(?:\s*\(\d+\))?)\b/gi)];
    for (const cm of ctrlMatches.slice(0, 3)) {
      const ctrlId = cm[1]!.toUpperCase().replace(/\s+/g, "");
      const matches = listCcisForNistControl(ctrlId).slice(0, 12);
      if (matches.length > 0) {
        controlCciMatches.push({ controlId: ctrlId, matches });
      }
    }
  }

  // 2. Raw ACAS / .nessus XML payload evaluation
  let acasAnalysis: AcasAnalysisResult | null = null;
  if (/<(?:NessusClientData_v2|ReportHost|ReportItem)\b/i.test(q)) {
    acasAnalysis = await parseAndEvaluateAcasNessus({
      nessusXml: q,
      assessmentMode,
      evidenceVerified,
    });
    pushUniqueRule(acasAnalysis.ruleResult);
  } else if (
    /\b(?:dodi?\s*8531|acas\b|nessus\b|credentialed\s+scan\b|19506|21745|110385|104410|24786)\b/i.test(q) &&
    (/\b(?:CVE-\d{4}-\d{4,7})\b/i.test(q) ||
      /\b(?:open\s+\d+\s*days?|\d+\s*days?\s+open|credential\w*|failure|evaluat\w*|assess\w*|19506|21745|110385)\b/i.test(q))
  ) {
    const cveMatch = q.match(/\b(CVE-\d{4}-\d{4,7})\b/i);
    const cveId = cveMatch ? cveMatch[1]!.toUpperCase() : null;
    const kevCatalog = await fetchLiveCisaKevCatalog(false);
    const isCisaKev = cveId ? kevCatalog.entries.has(cveId) || /\bkev\b/i.test(q) : /\bkev\b/i.test(q);
    const daysMatch = q.match(/(?:open\s+(?:for\s+)?(\d+)\s*days?|(\d+)\s*days?\s*open)/i);
    const daysOpen = daysMatch ? Number(daysMatch[1] || daysMatch[2]) : null;
    const iavaMatch = q.match(/iava\b[^.\n]{0,20}(\d+)\s*days?/i);
    const credFail =
      /\b(?:plugin\s*(?:21745|110385|104410|24786)|19506\b[^.\n]{0,30}\bno\b|credentialed\s+scan\s+fail\w*|authentication\s+fail\w*)\b/i.test(
        q,
      );
    const credPass = /\bcredentialed\s+scan\s+(?:passed|succeeded)|19506\b[^.\n]{0,30}\byes\b/i.test(q);
    const poamMissing = /\b(?:no|without|missing)\s+poa&?m\b/i.test(q);
    const rescanVerified = /\bverified\s+(?:post[- ]patch\s+)?credentialed\s+rescan\b/i.test(q);

    const sev: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" = /\b(critical|cat\s*i|cat[- ]?1)\b/i.test(q)
      ? "CRITICAL"
      : /\b(moderate|medium|cat\s*ii|cat[- ]?2)\b/i.test(q)
      ? "MODERATE"
      : /\b(low|cat\s*iii|cat[- ]?3)\b/i.test(q)
      ? "LOW"
      : "HIGH";

    pushUniqueRule(
      evaluateDodi8531VulnerabilityCompliance({
        cveId,
        severityCategory: sev,
        isCisaKev,
        hasActiveIava: /\biava\b|\btaskord\b/i.test(q),
        iavaDueDays: iavaMatch ? Number(iavaMatch[1]) : null,
        daysOpen,
        credentialedScanPassed: credFail ? false : credPass ? true : null,
        poamTracked: poamMissing ? false : null,
        remediationRescanVerified: rescanVerified,
        assessmentMode,
        evidenceVerified,
      }),
    );
  }

  // 3. Raw STIG .ckl or SCAP XCCDF XML payload evaluation
  let stigAnalysis: StigChecklistAnalysisResult | null = null;
  if (/<(?:CHECKLIST|STIG_INFO|VULN)\b/i.test(q)) {
    stigAnalysis = parseAndEvaluateStigXccdfOrCkl({ cklXml: q, assessmentMode, evidenceVerified });
    pushUniqueRule(stigAnalysis.ruleResult);
    for (const item of [...stigAnalysis.failedFindings, ...stigAnalysis.unsubstantiatedAssertions]) {
      for (const c of item.ccis) cciIds.add(c);
    }
  } else if (/<(?:[a-zA-Z0-9_.-]+:)?(?:rule-result|TestResult|Benchmark)\b/i.test(q)) {
    stigAnalysis = parseAndEvaluateStigXccdfOrCkl({ xccdfXml: q, assessmentMode, evidenceVerified });
    pushUniqueRule(stigAnalysis.ruleResult);
    for (const item of [...stigAnalysis.failedFindings, ...stigAnalysis.unsubstantiatedAssertions]) {
      for (const c of item.ccis) cciIds.add(c);
    }
  }

  const resolvedCcis: DisaCciRecord[] = [];
  for (const id of [...cciIds].slice(0, 20)) {
    const rec = lookupDisaCci(id);
    if (rec) resolvedCcis.push(rec);
  }

  const stigLibraryHits: StigLibraryRuleHydrated[] = [];
  const seenStig = new Set<string>();
  for (const vm of q.matchAll(/\b(V-\d{5,7}|SV-\d{5,7}(?:r\d+_rule)?)\b/gi)) {
    const rule = lookupStigRuleById(vm[1]!);
    if (rule && !seenStig.has(rule.groupId)) {
      seenStig.add(rule.groupId);
      stigLibraryHits.push(rule);
      for (const c of rule.cciIds) {
        const cr = lookupDisaCci(c);
        if (cr && !resolvedCcis.some((x) => x.cciId === cr.cciId)) resolvedCcis.push(cr);
      }
    }
  }
  if (
    stigLibraryHits.length === 0 &&
    /\b(?:rhel\s*9|windows\s*server\s*2022|kubernetes\s+stig|k8s\s+stig|postgresql\s+stig|asd\s+stig)\b/i.test(q)
  ) {
    const bm = /\brhel\s*9\b/i.test(q)
      ? "RHEL_9_STIG"
      : /\bwindows\s*server\s*2022\b/i.test(q)
      ? "WIN_2022_STIG"
      : /\b(?:kubernetes|k8s)\b/i.test(q)
      ? "K8S_STIG"
      : /\bpostgresql\b/i.test(q)
      ? "PGSQL_STIG"
      : "ASD_STIG";
    for (const r of searchStigLibrary({ benchmarkId: bm, limit: 6 })) {
      if (!seenStig.has(r.groupId)) {
        seenStig.add(r.groupId);
        stigLibraryHits.push(r);
      }
    }
  }

  const ndimpInventoryRequested =
    /\b(?:ndimp\b|(?:dod|ic)\s+(?:engines?|capabilities|policies|roadmap|status)\b[^.\n]{0,40}\b(?:noctis|live|active|loaded|list|show|what|right\s+now))\b/i.test(
      q,
    ) ||
    (/\b(?:7\s+pillars?|zero\s+trust\s+pillars?)\b/i.test(q) && /\b(?:what\s+are|list|explain|show)\b/i.test(q));

  // 4. Step 4: Policy Change Intelligence (Directive Lineage Diffing, Live Upstream Drift, Dual-Control Rollout)
  const policyDiffReports: DirectiveDiffReport[] = [];
  if (/\b(?:what\s+changed|changes?\s+between|revision|revisions?|supersession|supersedes?|diff|compare|lineage|impacted)\b/i.test(q)) {
    const lineageMap: [RegExp, string][] = [
      [/\bicd\s*503\b/i, "ICD-503"],
      [/\bdodi?\s*8510(?:\.01)?\b/i, "DODI-8510.01"],
      [/\bcnssi?\s*1253\b/i, "CNSSI-1253"],
      [/\bdodi?\s*8520\.02\b/i, "DODI-8520.02"],
      [/\bdodi?\s*8520\.03\b/i, "DODI-8520.03"],
      [/\b(?:ztmm|m-?22-?09|cisa\s+zero\s+trust)\b/i, "CISA-ZTMM-2.0-OMB-M22-09"],
      [/\b(?:cnssp\s*15|cnsa\s*2\.0|csfc)\b/i, "CNSSP-15-CNSA-2.0-CSFC"],
      [/\b800-88\b/i, "NIST-SP-800-88-R2"],
      [/\b(?:5205\.16|insider\s+threat)\b/i, "DODI-5205.16-EO-13587"],
      [/\b3000\.09\b/i, "DODD-3000.09-RAI"],
      [/\bicd\s*20[36]\b/i, "ICD-203-206-ANALYTIC"],
      [/\b(?:cmmc|32\s+cfr\s*(?:part\s*)?170|dfars)\b/i, "CMMC-32CFR-170-DFARS"],
    ];
    for (const [rx, pid] of lineageMap) {
      if (rx.test(q)) {
        const rep = diffHistoricalDirectiveRevision(pid);
        if (rep) {
          policyDiffReports.push(rep);
          pushUniqueRule(rep.ruleResult);
        }
      }
    }
  }

  let driftReport: UpstreamDriftReport | null = null;
  if (
    /\b(?:drift|upstream\s+(?:oscal|cci|kev|policy|directive)|policy\s+drift)\b/i.test(q) &&
    /\b(?:check|monitor|scan|audit|status|detect|live|oscal|cci|kev)\b/i.test(q)
  ) {
    driftReport = await checkUpstreamAuthoritativeDrift({
      liveCheck: !/\boffline\b/i.test(q),
      assessmentMode,
    });
    pushUniqueRule(driftReport.ruleResult);
  }

  let rolloutCheck: PolicyRolloutGovernanceCheckResult | null = null;
  if (
    /\b(?:(?:ai|agent|llm|self)[- ]?(?:auto[- ]?)?approv\w*|auto[- ]?approv\w*)\b/i.test(q) &&
    /\b(?:policy|directive|rollout|proposal|dual[- ]?control|update)\b/i.test(q)
  ) {
    const isSelfApprove = /\bself[- ]?approv\w*\b/i.test(q);
    rolloutCheck = evaluatePolicyRolloutGovernance({
      proposedBy: "human-author@dod.mil",
      reviewerId: isSelfApprove ? "human-author@dod.mil" : "agent:noctis-ai",
      reviewerRole: isSelfApprove ? "ISSO_HUMAN" : "AGENT",
      regressionSuitePassed: !/\bfail(?:ing|ed)\s+regression\b/i.test(q),
      classificationCleared: true,
      decision: "APPROVE",
      assessmentMode,
    });
    pushUniqueRule(rolloutCheck.ruleResult);
  }

  return {
    rules,
    resolvedCcis,
    controlCciMatches,
    stigLibraryHits,
    acasAnalysis,
    stigAnalysis,
    ztAssessment: step3.ztAssessment,
    icamAssessment: step3.icamAssessment,
    pamAbacAssessment: step3.pamAbacAssessment,
    waves234,
    policyDiffReports,
    driftReport,
    rolloutCheck,
    ndimpInventoryRequested,
  };
}

export interface DodIcVerificationReport {
  passed: boolean;
  violations: string[];
}

export function verifyDodIcResponse(
  _question: string,
  draftBody: string,
  ruleResults: DodIcRuleResult[],
): DodIcVerificationReport {
  const violations: string[] = [];

  // Block DoD ATO == IC ATO conflation
  if (
    /\bdod\s+ato\b[^.\n]{0,80}\bautomatically\s+satisf(?:y|ies)\b[^.\n]{0,60}\bic(?:d\s*503)?\b/i.test(draftBody) &&
    !/\bdoes\s+not\s+automatically\b|\bnot\s+automatically\b|\bcannot\s+automatically\b/i.test(draftBody)
  ) {
    violations.push(
      "DOD_IC_RECIPROCITY_CONFLATION: Response claimed a DoD ATO automatically satisfies IC ICD 503. Per ODNI ICD 503 (Oct 25, 2024), DoD and IC authorizations remain distinct.",
    );
  }

  // Block claiming user clearance authorizes commercial cloud processing of classified material
  if (
    /\bclearance\b[^.\n]{0,80}\b(?:authorizes?|allows?|permits?)\b[^.\n]{0,80}\bcommercial\s+(?:cloud|llm|model)\b[^.\n]{0,40}\b(?:secret|classified|ts\/?sci)\b/i.test(
      draftBody,
    ) &&
    !/\bdoes\s+not\s+authorize\b|\bnever\s+authorizes\b|\bprohibited\b/i.test(draftBody)
  ) {
    violations.push(
      "CLASSIFICATION_BOUNDARY_VIOLATION: User security clearance never authorizes classified/SCI material in a commercial cloud model or lower-classification enclave.",
    );
  }

  // Block AI ATO issuance claims
  if (/\bnoctis\s+(?:grants?|issues?|approves?)\s+(?:an?\s+)?(?:ato|iatt|authorization\s+to\s+operate)\b/i.test(draftBody)) {
    violations.push("AI_ATO_CLAIM: Only a designated DoD or IC Authorizing Official (AO) can render an ATO decision.");
  }

  // Block OCSP/CRL fail-open compliance endorsement
  if (
    /\b(?:ocsp|crl|revocation)\b[^.\n]{0,70}\b(?:fail[- ]?open|soft[- ]?fail|disabled)\b[^.\n]{0,70}\b(?:compl(?:ies|iant)|satisf(?:y|ies)|allowed\s+by\s+dodi?\s*8520)\b/i.test(
      draftBody,
    ) &&
    !/\b(?:violates?|fails?\s+(?:dodi|nsm|pki|mfa|the|to)|non[- ]compliant|not\s+compliant|does\s+not\s+(?:comply|satisfy)|prohibited|insufficient)\b/i.test(
      draftBody,
    )
  ) {
    violations.push(
      "PKI_REVOCATION_FAIL_OPEN_ENDORSEMENT: Soft-fail / fail-open or disabled OCSP/CRL revocation checking violates DoDI 8520.02 (May 18, 2023).",
    );
  }

  // Block SMS/OTP or password-only phishing-resistant MFA claims
  if (
    /\b(?:sms|otp|password[- ]only)\b[^.\n]{0,70}\b(?:satisf(?:y|ies)|compl(?:ies|iant)\s+with|meets?)\b[^.\n]{0,70}\b(?:dodi?\s*8520\.03|phishing[- ]resistant|nsm[- ]?8|fips\s*201)\b/i.test(
      draftBody,
    ) &&
    !/\b(?:does\s+not\s+satisfy|fails?\s+(?:dodi|nsm|phishing|mfa|to)|not\s+phishing[- ]resistant|violates?|insufficient|prohibited)\b/i.test(
      draftBody,
    )
  ) {
    violations.push(
      "PHISHABLE_MFA_DOD_COMPLIANCE_CLAIM: SMS/OTP or password-only authentication does NOT satisfy DoDI 8520.03 (May 19, 2023), NSM-8, or FIPS 201-3 phishing-resistant MFA.",
    );
  }

  // Block AI policy auto-approval or self-approval claims
  if (
    /\b(?:ai\s+agents?|llm|noctis|self[- ]?approval)\b[^.\n]{0,75}\b(?:can|may|is\s+permitted\s+to|will)\s+(?:auto[- ]?approve|autonomously\s+(?:approve|promote|roll\s*out)|self[- ]?approve)\b[^.\n]{0,60}\b(?:policy|directive|rollout|baseline)\b/i.test(
      draftBody,
    ) &&
    !/\b(?:forbidden|prohibited|cannot|never|not\s+permitted|does\s+not\s+(?:permit|allow|satisfy)|rejected|disallowed)\b/i.test(
      draftBody,
    )
  ) {
    violations.push(
      "AI_POLICY_AUTO_APPROVAL_CLAIM: Dual-control governance strictly enforces AGENT_APPROVAL_FORBIDDEN and SELF_APPROVAL_FORBIDDEN on policy rollouts.",
    );
  }

  // Block claiming single-layer commercial VPN/TLS satisfies NSA CSfC classified transit
  if (
    /\bsingle[- ]?layer\b[^.\n]{0,75}\b(?:commercial\s+(?:vpn|tls)|encrypt\w*)[^.\n]{0,75}\b(?:satisf(?:y|ies)|suffices?|compl(?:ies|iant)\s+with|meets?)\b[^.\n]{0,50}\b(?:csfc|classified|cnssp\s*15)\b/i.test(
      draftBody,
    ) &&
    !/\b(?:never|does\s+not|cannot|not\s+compliant|non[- ]compliant|prohibited|violates?|fails?\s+(?:to|csfc|cnssp)|insufficient)\b/i.test(
      draftBody,
    )
  ) {
    violations.push(
      "SINGLE_LAYER_COMMERCIAL_CLASSIFIED_CLAIM: Single-layer commercial VPN/TLS NEVER satisfies NSA CSfC dual-layer encryption requirements.",
    );
  }

  const draftSentences = draftBody.split(/(?<=[.!?])\s+|\n+/);

  // Block claiming magnetic degaussing erases SSD / NAND flash
  for (const s of draftSentences) {
    if (
      /\bdegauss\w*\b/i.test(s) &&
      /\b(?:ssd|flash|nvme)\b/i.test(s) &&
      /\b(?:erases?|sanitizes?|wipes?|destroys?|declassifies?|sufficient)\b/i.test(s) &&
      !/\b(?:does\s+not|never|cannot|fails?\s+(?:to|sp|nist)|insufficient|not\s+erase|not\s+sanitize|invalid|prohibited)\b/i.test(s)
    ) {
      violations.push(
        "DEGAUSS_SSD_MISINFORMATION: Magnetic degaussing does NOT erase SSD / NAND flash storage under NIST SP 800-88 Rev. 2 (Sept 2025).",
      );
      break;
    }
  }

  // Block claiming Clear/formatting sanitizes TS/SCI media for unclassified release
  for (const s of draftSentences) {
    if (
      /\b(?:clear|format(?:ting)?)\b/i.test(s) &&
      /\b(?:ts\/?sci|top\s*secret|secret)\b/i.test(s) &&
      /\b(?:sanitizes?|declassifies?|sufficient\s+for\s+unclassified|permits?\s+unclassified\s+release|unclassified\s+release)\b/i.test(s) &&
      !/\b(?:never|does\s+not|cannot|prohibited|violates?|fails?\s+(?:to|sp|nist)|insufficient|requires?\s+.*\s*destroy)\b/i.test(s)
    ) {
      violations.push(
        "CLEAR_CLASS_RELEASE_CLAIM: NIST SP 800-88 Rev. 2 Clear/formatting NEVER sanitizes SECRET or TS/SCI media for unclassified release.",
      );
      break;
    }
  }

  // Block claiming CSP PA or FedRAMP High automatically grants a DoD Mission Owner ATO
  if (
    /\b(?:csp\s+pa|provisional\s+authorization|fedramp\s+high)\b[^.\n]{0,70}\b(?:automatically\s+(?:grants?|satisfies?|confers?)|replaces?)\b[^.\n]{0,60}\b(?:mission\s+(?:owner\s+)?ato|il[56])\b/i.test(
      draftBody,
    ) &&
    !/\b(?:never|does\s+not|cannot|not\s+automatically|prohibited|still\s+requires?)\b/i.test(draftBody)
  ) {
    violations.push(
      "CSP_PA_EQUALS_MISSION_ATO_CLAIM: A DISA Provisional Authorization (PA) or FedRAMP High ATO never replaces or automatically grants a DoD Mission Owner workload ATO.",
    );
  }

  // Block endorsing unsupervised autonomous lethal weapons without human judgment (DoDD 3000.09)
  if (
    /\bunsupervised\s+autonomous\s+(?:lethal|weapon)\b[^.\n]{0,70}\b(?:exempt|permitted|compl(?:ies|iant)\s+with|allowed\s+without\s+human)\b/i.test(
      draftBody,
    ) &&
    !/\b(?:violates?|prohibited|never|cannot|does\s+not|fails?\s+(?:to|dodd|3000)|forbidden|requires?\s+.*human\s+judgment)\b/i.test(
      draftBody,
    )
  ) {
    violations.push(
      "UNSUPERVISED_AUTONOMOUS_LETHAL_CLAIM: DoDD 3000.09 (Jan 25, 2023) mandates appropriate levels of human judgment and Senior Review over weapon systems.",
    );
  }

  // Block endorsing single-source F6 intel as High Confidence under ICD 203
  if (
    /\b(?:single[- ]source|f6)\b[^.\n]{0,70}\b(?:justifies?|supports?|warrants?|grants?)\b[^.\n]{0,50}\bhigh\s+confidence\b/i.test(
      draftBody,
    ) &&
    !/\b(?:cannot|never|does\s+not|fails?\s+(?:to|icd)|violates?|insufficient|prohibited)\b/i.test(draftBody)
  ) {
    violations.push(
      "SINGLE_SOURCE_F6_HIGH_CONFIDENCE_CLAIM: Uncorroborated single-source F6 reporting CANNOT justify High Confidence under ODNI ICD 203 / ICD 206.",
    );
  }

  // Block fabricated exploit verification or remediation closure claims on unvalidated scanner/STIG rules
  const hasUnverifiedScannerOrStigRule = ruleResults.some(
    (r) =>
      (r.ruleId === "DOD-ACAS-001" || r.ruleId === "DOD-VULN-8531-001" || r.ruleId === "DOD-STIG-001") &&
      r.observedFacts.remediationRescanVerified !== true &&
      r.observedFacts.remediationVerified !== true,
  );
  if (hasUnverifiedScannerOrStigRule) {
    const sentences = draftBody.split(/(?<=[.!?])\s+|\n+/);
    for (const s of sentences) {
      const claimsClosureOrValidatedExploit =
        /\b(?:is\s+confirmed\s+(?:remediated|patched|closed|mitigated)|successfully\s+(?:remediated|closed)\s+(?:and\s+)?verified|independently\s+validated\s+as\s+exploitable|exploitability\s+is\s+proven\s+by\s+(?:the\s+)?scanner)\b/i.test(
          s,
        );
      const hasNegativeQualifier =
        /\b(?:not\s+yet|never|does\s+not|cannot|unverified|unvalidated|without\s+a?\s*post[- ]patch|requires?\s+.*rescan|pending)\b/i.test(
          s,
        );
      if (claimsClosureOrValidatedExploit && !hasNegativeQualifier) {
        violations.push(
          "FABRICATED_REMEDIATION_OR_EXPLOIT_CLAIM: Draft claimed scanner findings are confirmed remediated/closed or exploitability is validated without a post-patch credentialed rescan or independent validation artifact.",
        );
        break;
      }
    }
  }

  // Per-rule verdict fidelity check
  for (const r of ruleResults) {
    const scopeId = r.ruleId.includes("RECIP") ? "reciprocity" : r.ruleId.includes("CNSSI") ? "cnssi" : r.ruleId;
    if (r.verdict === "FAIL") {
      const hasFailWord = /\b(?:FAIL|FAILED|DOES NOT|NOT PERMITTED|PROHIBITED|DENIED|BLOCKED|NON[- ]COMPLIANT|EXCEEDS|DEFICIENCY|OVERDUE|VIOLATES?|INSUFFICIENT|INVALID)\b/i.test(
        draftBody,
      );
      if (!hasFailWord) {
        violations.push(
          `RULE_VERDICT_CONTRADICTION: Rule ${r.ruleId} [${scopeId}] evaluated to FAIL, but draft omitted FAIL / deficiency language.`,
        );
      }
    }
  }

  return { passed: violations.length === 0, violations };
}

function buildLiveNdimpInventoryMarkdown(): string {
  const allPolicies = listDodIcPolicies();
  const cciMeta = getDisaCciManifest();
  const ztCatalog = getDodZeroTrustCatalog();
  const lineages = listDirectiveLineages();
  return [
    "## Live Noctis NDIMP Architecture Inventory (Waves 1–4 Complete — All 12 Core + Extended + Analytical Engines)",
    `- **Authoritative DoD/IC Policy Registry:** **${allPolicies.length} verified public directives** (${allPolicies.map((p) => `\`${p.id}\` [${p.effectiveDate}]`).join(", ")})`,
    `- **DISA CCI Crosswalk Database:** Version \`${cciMeta.version}\` (**${cciMeta.counts.totalCcis.toLocaleString()} CCIs**, **${cciMeta.counts.rev5MappedCcis.toLocaleString()}** Rev. 5 mappings across **${cciMeta.counts.distinctRev5Controls.toLocaleString()}** controls)`,
    `- **DoD Zero Trust Strategy Catalog:** **${ztCatalog.summary.pillarsCount} Pillars** · **${ztCatalog.summary.capabilitiesCount} Capabilities** · **${ztCatalog.summary.targetActivities} Target Activities (${ztCatalog.summary.targetDeadline})** + **${ztCatalog.summary.advancedActivities} Advanced** (**${ztCatalog.summary.totalActivities} Total**), crosswalked to CISA ZTMM v2.0`,
    `- **Policy Change Intelligence:** **${lineages.length} tracked directive revision lineages**, live upstream DISA CCI/OSCAL/KEV drift monitor (\`autoApplyToProduction: false\`), and dual-control human rollout queue (\`AGENT_APPROVAL_FORBIDDEN\`, \`SELF_APPROVAL_FORBIDDEN\`)`,
    `- **Wave 2–4 Engines Live:** Classified Systems (\`ICD 705\` SCIF, \`DoDI 8523.01\`/\`CNSSI 4005\` COMSEC, \`CNSSP 15\` CNSA 2.0 & CSfC dual-layer, \`CNSSAM TEMPEST/01-13\`, \`NIST SP 800-88 Rev. 2\`), DCO/Forensics/Insider Threat (\`SP 800-86\`, \`DoDI 5205.16\`), DevSecOps/Cloud (\`SP 800-218 SSDF\`, \`cATO\`, K8s STIG, CC SRG inheritance), Defense AI (\`DoDD 3000.09\`, DoD RAI, \`NIST AI 100-1/600-1\`, OWASP Red-Team), Analytic Tradecraft & Synthetic Multi-INT Fusion (\`ICD 203/206\`, ACH, NATO 6x6), Mission Assurance DAG (\`DoDI 3020.45\`), CMMC/DFARS/FOCI (\`32 CFR Part 170\`/\`117\`), and Space/Spectrum/MBSE (\`SPD-5\`, \`DoDI 4650.01\`, \`DoDI 5000.97\`, Logistics \`Ao\`)`,
    `- **Live REST API Endpoints (\`/api/v2/dod-ic/*\`):** \`/status\`, \`/policies\`, \`/explanations/:id\`, \`/classification/check\`, \`/cross-domain/evaluate\`, \`/dod-rmf/*\`, \`/cnssi1253/categorize\`, \`/ic/*\`, \`/cci/*\`, \`/acas/analyze\`, \`/stig/evaluate\`, \`/vuln/dodi8531\`, \`/incident/dodi8530\`, \`/zero-trust/*\`, \`/icam/*\`, \`/policy-change/*\`, \`/classified/scif\`, \`/classified/comsec-csfc\`, \`/classified/tempest\`, \`/classified/sanitize\`, \`/dco/detection\`, \`/dco/forensics\`, \`/dco/insider-threat\`, \`/devsecops/cato-ssdf\`, \`/devsecops/k8s-hardening\`, \`/cloud/cc-srg-inheritance\`, \`/ai/rai-governance\`, \`/ai/red-team\`, \`/intel/icd203-ach\`, \`/intel/multi-int-fusion\`, \`/mission/assurance-dag\`, \`/acquisition/cmmc-foci\`, \`/space/mbse-spectrum\`, \`/investigate\``,
    `- **7 DoD Zero Trust Pillars:** ${ztCatalog.pillars.map((p) => `**${p.name}** (${p.cisaZtmmCounterpart})`).join(" · ")}`,
    "",
  ].join("\n");
}

export function renderDeterministicDodIcFallback(
  question: string,
  policies: DodIcPolicyRecord[],
  ruleResults: DodIcRuleResult[],
  ctx?: Partial<DodIcAsyncContext>,
): string {
  const out: string[] = [];
  out.push("# Noctis DoD & Intelligence Community Security Assessment (NDIMP Waves 1–4 Complete)");
  out.push(`**Query Scope:** ${question.trim().slice(0, 220)}\n`);

  if (ctx?.ndimpInventoryRequested) {
    out.push(buildLiveNdimpInventoryMarkdown());
  }

  if (ctx?.waves234) {
    out.push(...renderWaves234SummaryLines(ctx.waves234));
  }

  if (ctx?.policyDiffReports && ctx.policyDiffReports.length > 0) {
    for (const d of ctx.policyDiffReports) {
      out.push(`## Directive Revision Diff & Blast Radius (\`${d.policyId}\` · \`${d.severity}\`)`);
      out.push(
        `- **Transition:** ${d.priorVersion} (\`${d.priorEffectiveDate}\`) -> **${d.currentVersion}** (\`${d.currentEffectiveDate}\`)`,
      );
      out.push(
        `- **Blast Radius:** ${d.blastRadius.mappedDisaCciCount} DISA CCIs across ${d.blastRadius.impactedNistControls.map((c) => `\`${c}\``).join(", ")} · Impacted Noctis Rules: ${d.blastRadius.impactedRuleIds.map((r) => `\`${r}\``).join(", ")}`,
      );
      if (d.addedItems.length > 0) {
        out.push("- **Added / Strengthened Requirements:**");
        for (const item of d.addedItems) out.push(`  - ${item}`);
      }
      if (d.removedItems.length > 0) {
        out.push("- **Deprecated / Superseded:**");
        for (const item of d.removedItems) out.push(`  - ${item}`);
      }
      out.push("");
    }
  }

  if (ctx?.driftReport) {
    const dr = ctx.driftReport;
    out.push(`## Live Upstream Authoritative Drift Monitor (\`${dr.overallStatus}\`)`);
    out.push(
      `- **Auto-Apply to Production:** \`${dr.autoApplyToProduction}\` · **Human Dual-Control Required:** \`${dr.humanDualControlRequired}\` · **CISA KEV:** \`${dr.kevStatus.source}\` (${dr.kevStatus.catalogCount} entries)`,
    );
    for (const src of dr.sources) {
      out.push(
        `- **${src.sourceId}** (Pinned \`${src.pinnedVersion}\`): \`${src.status}\` — ${src.note}`,
      );
    }
    out.push("");
  }

  if (ctx?.rolloutCheck) {
    const rc = ctx.rolloutCheck;
    out.push("## Dual-Control Policy Rollout Governance");
    out.push(
      `- **Permitted:** \`${rc.allowed}\` · **Gate Code:** \`${rc.errorCode || "APPROVED"}\` · ${rc.ruleResult.summary}`,
    );
    out.push("");
  }

  if (ctx?.ztAssessment) {
    const z = ctx.ztAssessment;
    out.push(`## DoD Zero Trust 7-Pillar Assessment (${z.framework})`);
    out.push(
      `- **Target FY 2027 Readiness:** ${z.targetReadinessPercent ?? "N/A"}% (\`${z.fy2027Status}\`) · **Avg Supplied Score:** ${z.averageSuppliedScore ?? "N/A"}/4 · **NSS / NSM-8:** \`${z.isNationalSecuritySystem}\``,
    );
    out.push(
      `- **DoD 7 Pillars:** ${z.pillarRatings.map((p) => `${p.pillar}: \`${p.stage}${p.score ? ` (${p.score}/4)` : ""}\``).join(" | ")}`,
    );
    if (z.cisaZtmmCrosswalk) {
      out.push(
        `- **CISA ZTMM v2.0 Crosswalk:** Overall \`${z.cisaZtmmCrosswalk.overallStage}\` (${z.cisaZtmmCrosswalk.averageScore}/4) · Weakest Pillar: **${z.cisaZtmmCrosswalk.weakestPillar}**`,
      );
    }
    out.push("");
  }

  if (ctx?.icamAssessment) {
    const ic = ctx.icamAssessment;
    out.push("## DoD PKI & ICAM Assessment (`DoDI 8520.02` / `DoDI 8520.03`)");
    out.push(
      `- **Credential Type:** \`${ic.credentialType || "UNSPECIFIED"}\` · **Privileged Account:** \`${ic.isPrivilegedAccount}\` · **Phishing-Resistant:** \`${String(ic.phishingResistant)}\` · **OCSP/CRL Fail-Closed:** \`${String(ic.revocationFailClosedEnforced)}\``,
    );
    out.push("");
  }

  if (ctx?.resolvedCcis && ctx.resolvedCcis.length > 0) {
    const cciMeta = getDisaCciManifest();
    out.push(`## DISA CCI Crosswalk (\`${cciMeta.version}\`, ${cciMeta.counts.totalCcis.toLocaleString()} Official CCIs)`);
    for (const c of ctx.resolvedCcis) {
      out.push(`- **\`${c.cciId}\`** (${c.type}, status: \`${c.status}\`): ${c.definition}`);
      out.push(
        `  - **NIST SP 800-53 Rev. 5:** ${c.nistRev5Controls.length ? c.nistRev5Controls.map((id) => `\`${id}\`${c.nistControlTitles[id] ? ` (${c.nistControlTitles[id]})` : ""}`).join(", ") : "None mapped"}`,
      );
      if (c.nistRev5References.length > 0) {
        out.push(`  - **Rev. 5 Index References:** \`${c.nistRev5References.join("`, `")}\``);
      }
      if (c.nistRev4Controls.length > 0) {
        out.push(`  - **NIST SP 800-53 Rev. 4:** ${c.nistRev4Controls.map((id) => `\`${id}\``).join(", ")}`);
      }
    }
    out.push("");
  }

  if (ctx?.controlCciMatches && ctx.controlCciMatches.length > 0) {
    out.push("## DISA CCIs Mapped to NIST Controls");
    for (const grp of ctx.controlCciMatches) {
      out.push(`- **\`${grp.controlId}\`** (showing ${grp.matches.length} mapped CCIs):`);
      for (const m of grp.matches.slice(0, 8)) {
        out.push(`  - \`${m.cciId}\` [${m.revision}]: ${m.definition.slice(0, 180)}`);
      }
    }
    out.push("");
  }

  if (ctx?.stigLibraryHits && ctx.stigLibraryHits.length > 0) {
    out.push("## Pre-Indexed Public DISA STIG Benchmark Rules");
    for (const s of ctx.stigLibraryHits) {
      out.push(`- **\`${s.groupId}\` (\`${s.ruleId}\` · \`${s.severity}\` · ${s.benchmarkTitle}):** ${s.title}`);
      out.push(`  - **CCIs:** \`${s.cciIds.join("`, `")}\` · **NIST SP 800-53 Rev. 5:** \`${s.nistRev5Controls.join("`, `") || "None"}\``);
      out.push(`  - **Check:** ${s.checkText}`);
      out.push(`  - **Fix:** ${s.fixText}`);
    }
    out.push("");
  }

  if (ctx?.acasAnalysis) {
    const a = ctx.acasAnalysis;
    out.push("## ACAS / Nessus (.nessus) Vulnerability & Credential Diagnostics");
    out.push(
      `- **Hosts:** ${a.credentialedScanDiagnostics.totalHosts} scanned (${a.credentialedScanDiagnostics.credentialedHosts} credentialed, **${a.credentialedScanDiagnostics.uncredentialedHosts} failed/uncredentialed**) · **KEV Feed:** \`${a.kevFeedSource}\``,
    );
    out.push(
      `- **Deduplicated Active Findings:** ${a.summary.deduplicatedActiveFindings} (from ${a.summary.rawReportItems} raw items) · **CISA KEV:** ${a.summary.kevMatches} · **Critical:** ${a.summary.criticalCount} · **High:** ${a.summary.highCount}`,
    );
    if (a.credentialedScanDiagnostics.hostIssues.length > 0) {
      out.push("- **Credentialed Scan Failures:**");
      for (const hi of a.credentialedScanDiagnostics.hostIssues) {
        out.push(`  - Host \`${hi.host}\` (plugins: ${hi.pluginIds.join(", ") || "HostProperties"}): ${hi.reason}`);
      }
    }
    if (a.findings.length > 0) {
      out.push("- **Top Prioritized Findings (`SCANNER_REPORTED_UNVALIDATED`):**");
      for (const f of a.findings.slice(0, 8)) {
        out.push(
          `  - \`[${f.priority}]\` **${f.pluginName}** (Plugin \`${f.pluginId}\`, ${f.assetCount} host(s), CVSS ${f.maxCvss}${f.isCisaKev ? ", **CISA KEV**" : ""}) -> SLA: \`${f.slaDays}d\` (\`${f.mappedControls.join("/")}\`)`,
        );
      }
    }
    out.push("");
  }

  if (ctx?.stigAnalysis) {
    const s = ctx.stigAnalysis;
    out.push(`## DISA STIG / SCAP Checklist Assessment (\`${s.sourceFormat}\`)`);
    out.push(
      `- **Compliance:** ${s.summary.compliancePercent}% (${s.summary.passedChecks}/${s.summary.applicableChecks} applicable) · **CAT I Open:** ${s.summary.cat1Open} · **CAT II Open:** ${s.summary.cat2Open} · **Not_Reviewed:** ${s.summary.notReviewedCount} · **Unsubstantiated Non-Open Assertions:** ${s.summary.unsubstantiatedNonOpenCount} · **ATO Veto:** \`${s.summary.atoVetoTriggered}\``,
    );
    out.push(
      `- **Impacted NIST SP 800-53 Rev. 5 Controls:** ${s.summary.impactedNistRev5Controls.map((c) => `\`${c}\``).join(", ") || "None"}`,
    );
    out.push("");
  }

  if (ruleResults.length > 0) {
    out.push("## Deterministic Rule Evaluations");
    for (const r of ruleResults) {
      out.push(`### ${r.title} (\`${r.ruleId}\` · Jurisdiction: \`${r.jurisdiction}\`)`);
      out.push(`- **Scenario / Rule Verdict:** **${r.verdict}** *(Mode: \`${r.assessmentMode}\`)*`);
      out.push(`- **Formal Assessor Determination:** **${r.formalDetermination}**`);
      out.push(`- **Summary:** ${r.summary}`);
      out.push(`- **Threshold:** ${r.threshold}`);
      out.push(`- **Variance:** ${r.variance}`);
      out.push(`- **Audit Hash:** \`${r.auditHash}\` · \`aiCanIssueAto: ${r.aiCanIssueAto}\``);
      if (r.missingEvidence.length > 0) {
        out.push(`- **Formal Evidence Required:** ${r.missingEvidence.join("; ")}`);
      }
      out.push("");
    }
  }

  out.push("## Authoritative Policy Citations & Boundary Rules");
  for (const p of policies) {
    out.push(`### ${p.id} — ${p.title}`);
    out.push(
      `- **Jurisdiction:** \`${p.jurisdiction}\` | **Version:** ${p.version} | **Effective:** \`${p.effectiveDate}\` | **Issuing Authority:** ${p.issuingAuthority}`,
    );
    if (p.supersededVersion) out.push(`- **Supersedes:** ${p.supersededVersion}`);
    out.push(`- **Scope:** ${p.scope}`);
    out.push(`- **Key Requirements:** ${p.keyRequirements.join(" ")}`);
    out.push(`- **Distinct Boundary Invariant:** ${p.distinctBoundaryNote}`);
    out.push("");
  }

  out.push(
    "> **Governance & Accreditation Boundary:** Noctis enforces strict DoD vs. IC reciprocity separation (`DoD ATO != IC ICD 503`), strict classification-aware boundaries, strict separation between raw ACAS/STIG scanner reports and verified remediation rescans, fail-closed PKI OCSP/CRL checks, phishing-resistant hardware MFA, and human Authorizing Official (AO) authority for all ATO/DATO decisions.",
  );
  return out.join("\n");
}

function buildDodIcSystemPrompt(lang: string, shouldThink: boolean): string {
  return [
    "You are Noctis Defense & Intelligence Community Security Architect (NDIMP Waves 1–4 Complete), strictly grounded in verified public DoD Directives, ODNI ICDs, CNSS Directives, NIST Standards, and Federal Regulations.",
    "",
    shouldThink
      ? "Begin with a concise `<think>...</think>` block (strictly 3-5 brief bullet lines, under 120 words) verifying policy effective dates, DoD-vs-IC reciprocity boundaries, CNSSI 1253 C/I/A vectors, DISA CCI crosswalks, ACAS/STIG invariants, Zero Trust/ICAM, Classified Systems (SCIF/CSfC/CNSA 2.0/TEMPEST/SP 800-88 R2), DCO/DevSecOps/CC SRG, Defense AI (DoDD 3000.09), ICD 203/ACH, Mission Assurance DAG, CMMC 32 CFR 170, and Space SPD-5 rules. Always close `</think>` immediately before writing the full Markdown response."
      : "Respond concisely with no raw XML tags.",
    "",
    "NON-NEGOTIABLE INVARIANTS:",
    "1. DOD VS. IC DISTINCTION: A DoD ATO (DoDI 8510.01, July 19, 2022) NEVER automatically satisfies an ODNI ICD 503 (Oct 25, 2024) IC IE authorization.",
    "2. CNSSI 1253 VECTORS: Under CNSSI 1253 (July 2022), Confidentiality, Integrity, and Availability remain INDEPENDENT control-selection vectors.",
    "3. CLASSIFICATION BOUNDARY: User clearance and need-to-know NEVER authorize sending classified or TS/SCI data to commercial cloud LLMs or lower-classification enclaves.",
    "4. SCANNER VS. VALIDATED EVIDENCE: Raw ACAS/Nessus and DISA STIG/.ckl findings are `SCANNER_REPORTED_UNVALIDATED`. Never claim remediation closure or exploitability without a verified post-patch credentialed rescan.",
    "5. ZERO TRUST & ICAM PKI: DoD Zero Trust Strategy (`2022-11-22`) mandates 7 Pillars, 45 Capabilities, 91 Target FY 2027 activities (152 total). OCSP/CRL fail-open violates DoDI 8520.02 (`2023-05-18`). SMS/OTP/passwords fail phishing-resistant MFA under DoDI 8520.03 (`2023-05-19`), FIPS 201-3, and NSM-8 (`2022-01-19`).",
    "6. CLASSIFIED SYSTEMS (WAVE 2 STEP 1): Single-layer commercial VPN/TLS NEVER satisfies NSA CSfC dual-layer encryption. Magnetic degaussing does NOT erase SSD/flash storage, and SP 800-88 R2 (`2025-09-01`) Clear/formatting never declassifies SECRET/TS/SCI media. Noctis NEVER fabricates classified CTTA TEMPEST distance/attenuation specs.",
    "7. DCO, DEVSECOPS, CLOUD & AI: Absence of telemetry never proves absence of intrusion (`SP 800-86` / `DoDI 5205.16`). One-time scans never qualify for DoD `cATO`. Inheriting a CSP PA or FedRAMP High NEVER replaces a DoD Mission Owner workload ATO (`DoD CC SRG`). Autonomous lethal systems require human judgment & Senior Review (`DoDD 3000.09`, `2023-01-25`).",
    "8. INTEL, MISSION & ACQUISITION (WAVES 3–4): Single-source `F6` intel NEVER justifies `HIGH` confidence (`ICD 203`, `2015-01-02`); uncorroborated single-INT OSINT is not ground truth. CMMC Level 2 POA&Ms cap at `180 days` & `>=80%` (`32 CFR § 170.21`, `2024-12-16`); DFARS 7012 incident reporting caps at `72 hours`; FOCI requires DCSA mitigation (`32 CFR 117`). Space TT&C requires encryption (`SPD-5`, `2020-09-04`).",
    "9. POLICY CHANGE GOVERNANCE: Upstream drift is NEVER auto-applied (`autoApplyToProduction: false`); rollouts require dual-control human approval (`AGENT_APPROVAL_FORBIDDEN`, `SELF_APPROVAL_FORBIDDEN`).",
    "10. AUTHORITIES: Cite ONLY exact versions and effective dates present in the Knowledge Packet.",
    `11. LANGUAGE: ${!/^english$/i.test(lang) ? `Respond in ${lang} while keeping US DoD/IC directive IDs and CCI/CVE codes in English.` : "Write in authoritative English."}`,
  ].join("\n");
}

async function handleChatTraceReplay(
  traceId: string,
  tenantId: string,
  shouldThink: boolean,
): Promise<string> {
  let stored = await getRmfExplanationArtifactById<ExplanationBundle>(traceId, tenantId);
  if (!stored.artifact && !stored.forbidden && tenantId === "chat-session") {
    stored = await getRmfExplanationArtifactById<ExplanationBundle>(traceId, "tenant:public-sandbox");
  }
  if (stored.forbidden) {
    const denied = `# Audit Trace Access Denied (\`${traceId}\`)\n- **Status:** \`403 CROSS_TENANT_ACCESS\`\n- Trace belongs to another tenant boundary and cannot be inspected across tenants.`;
    return shouldThink ? `<think>\nCross-tenant access denied for ${traceId}.\n</think>\n\n${denied}` : denied;
  }
  if (!stored.artifact) {
    const missing = `# Audit Trace Not Found (\`${traceId}\`)\n- No persisted SQL explanation artifact found with ID \`${traceId}\` under authorized tenant scope.`;
    return shouldThink ? `<think>\nTrace ${traceId} not found in SQL artifact store.\n</think>\n\n${missing}` : missing;
  }

  const bundle = stored.artifact.payload;
  const replay = replayExplanationBundle(bundle);
  const body = [
    `# SQL Explanation Trace Replay & Integrity Verification (\`${bundle.bundleId}\`)`,
    `- **Persisted in PostgreSQL (\`rmf.v2_artifacts\`):** \`true\` (stored at \`${stored.artifact.createdAt}\`)`,
    `- **Deterministic SHA-256 Replay Reproducible:** **\`${replay.reproducible}\`**`,
    `- **Stored Canonical Hash:** \`${bundle.canonicalTraceHash}\``,
    `- **Recomputed Hash:** \`${replay.recomputedHash}\``,
    `- **Evaluation Reference:** \`${bundle.evaluationRef}\` | **Rule ID(s):** \`${bundle.ruleId}\` | **Rule Version:** \`${bundle.ruleVersion}\``,
    `- **Overall Verdict:** **\`${bundle.verdict}\`** | **SQL Row Payload SHA-256:** \`${stored.artifact.payloadSha256.slice(0, 16)}...\``,
    ...(bundle.deterministicClassifications.length > 0
      ? [
          "",
          "## Verified Deterministic Classifications",
          ...bundle.deterministicClassifications.map((line) => `- ${line}`),
        ]
      : []),
    "",
    "---",
    `**Noctis Deterministic Trace Verification** · Replay Status: \`${replay.reproducible ? "VERIFIED_IMMUTABLE" : "HASH_MISMATCH"}\``,
  ].join("\n");

  return shouldThink
    ? `<think>\nRetrieved persisted SQL ExplanationBundle ${bundle.bundleId} and replayed canonical SHA-256 trace -> reproducible=${replay.reproducible}.\n</think>\n\n${body}`
    : body;
}

export async function executeDodIcReasoning(
  rawQuestion: string,
  opts: DodIcReasoningOptions = {},
): Promise<string> {
  const q = (rawQuestion || "").trim();
  const shouldThink = opts.shouldThink !== false;
  const tenantId = opts.tenantId?.trim() || "chat-session";

  // GATE 0: Fail-Closed Classification & Commercial Cloud Boundary Check BEFORE any LLM call
  const gate: ClassificationGateResult = evaluateClassificationGate({
    text: q,
    targetBoundary: opts.deploymentBoundary || "COMMERCIAL_UNCLASSIFIED",
    claimedUserClearance: opts.claimedUserClearance ?? null,
    requestedModelTarget: "COMMERCIAL_CLOUD_LLM",
  });

  if (gate.action === "FAIL_CLOSED_BLOCK") {
    const blockBundle = createExplanationBundle({
      tenantId,
      evaluationRef: "CLASSIFICATION_GATE_BLOCK",
      nistVersion: "5.2.0",
      dbSha256: gate.auditHash,
      ruleId: "DOD-IC-CLASSIFICATION-GATE-001",
      ruleVersion: "1.0.0",
      evidenceSha256: gate.inputSha256,
      observedFacts: {
        action: gate.action,
        targetBoundary: gate.targetBoundary,
        detectedClassification: gate.detectedClassification,
        detectedMarkings: gate.detectedMarkings.join(","),
        blockExternalLlm: true,
        rawTextStored: false,
      },
      deterministicClassifications: [
        `FAIL_CLOSED_BLOCK: ${gate.detectedClassification} markings blocked from ${gate.targetBoundary}`,
      ],
      analyticalEstimates: [],
      verdict: "FAIL_CLOSED_BLOCK",
      ruleEvaluations: [
        {
          ruleId: "DOD-IC-CLASSIFICATION-GATE-001",
          ruleVersion: "1.0.0",
          controlId: "CLASSIFICATION-GATE",
          assessmentMode: "DETERMINISTIC_BOUNDARY_GUARD",
          verdict: "FAIL_CLOSED_BLOCK",
          formalDetermination: "FAIL_CLOSED_BLOCK",
          variance: `${gate.detectedClassification} > ${gate.boundaryMaxClassification}`,
          auditHash: gate.auditHash,
          observedFacts: {
            targetBoundary: gate.targetBoundary,
            detectedClassification: gate.detectedClassification,
            blockExternalLlm: true,
          },
          authorityDocs: gate.authorityCitations.map((a) => `${a.id} (${a.effectiveDate})`),
        },
      ],
    });

    if (opts.persistTrace !== false) {
      try {
        await saveRmfArtifact({
          id: blockBundle.bundleId,
          tenantId,
          artifactType: "EXPLANATION",
          systemId: "noctis-classification-gateway",
          title: `Classification Boundary Block (${gate.detectedClassification})`,
          status: "BLOCKED",
          payload: blockBundle as unknown as Record<string, unknown>,
          createdBy: tenantId,
        });
      } catch {
        /* Non-fatal if DB unavailable */
      }
    }

    const body = `${gate.refusalMarkdown}\n\n**Audit Trace:** \`${blockBundle.bundleId}\` (\`${blockBundle.canonicalTraceHash.slice(0, 12)}\`)`;
    return shouldThink
      ? `<think>\nClassification Gate FAIL_CLOSED_BLOCK triggered (${gate.detectedClassification} markings detected; external LLM dispatch aborted).\n</think>\n\n${body}`
      : body;
  }

  // Deterministic SQL Trace Replay Short-Circuit (after Gate 0!)
  const replayMatch = q.match(/\b(?:replay|verify|inspect|show)\s+(?:explanation\s+)?(?:trace\s+)?(EXPL-[A-Z0-9]+)\b/i);
  if (replayMatch && replayMatch[1]) {
    try {
      return await handleChatTraceReplay(replayMatch[1].toUpperCase(), tenantId, shouldThink);
    } catch {
      /* Fall through if storage unavailable */
    }
  }

  // STAGE 1: Deterministic Policy, CCI Crosswalk, ACAS/STIG, Zero Trust & ICAM Execution
  const policySet = new Map<string, DodIcPolicyRecord>();
  for (const p of searchDodIcPolicies(q)) policySet.set(p.id, p);

  const ctx = await extractDodIcContextAsync(q);
  const rules = ctx.rules;

  if (ctx.resolvedCcis.length > 0 || ctx.controlCciMatches.length > 0 || ctx.stigAnalysis) {
    policySet.set("DISA-STIG-CCI", DOD_IC_POLICY_REGISTRY["DISA-STIG-CCI"]!);
  }
  if (ctx.acasAnalysis) {
    policySet.set("DODI-8531.01", DOD_IC_POLICY_REGISTRY["DODI-8531.01"]!);
  }
  if (ctx.ztAssessment) {
    policySet.set("DOD-ZT-STRATEGY-2022", DOD_IC_POLICY_REGISTRY["DOD-ZT-STRATEGY-2022"]!);
    policySet.set("CISA-ZTMM-2.0-OMB-M22-09", DOD_IC_POLICY_REGISTRY["CISA-ZTMM-2.0-OMB-M22-09"]!);
  }
  if (ctx.icamAssessment) {
    policySet.set("DODI-8520.02", DOD_IC_POLICY_REGISTRY["DODI-8520.02"]!);
    policySet.set("DODI-8520.03", DOD_IC_POLICY_REGISTRY["DODI-8520.03"]!);
  }
  if (ctx.policyDiffReports.length > 0) {
    for (const d of ctx.policyDiffReports) {
      const p = DOD_IC_POLICY_REGISTRY[d.policyId];
      if (p) policySet.set(p.id, p);
    }
  }
  if (ctx.waves234) {
    for (const pid of collectWaves234PolicyIds(ctx.waves234)) {
      const p = DOD_IC_POLICY_REGISTRY[pid];
      if (p) policySet.set(p.id, p);
    }
  }
  if (ctx.driftReport) {
    policySet.set("DISA-STIG-CCI", DOD_IC_POLICY_REGISTRY["DISA-STIG-CCI"]!);
    policySet.set("DODI-8510.01", DOD_IC_POLICY_REGISTRY["DODI-8510.01"]!);
  }
  if (ctx.ndimpInventoryRequested) {
    for (const p of listDodIcPolicies()) policySet.set(p.id, p);
  }
  const policies = [...policySet.values()];

  const combinedEvidenceSha = sha256Sync(
    JSON.stringify({
      policies: policies.map((p) => `${p.id}:${p.effectiveDate}`),
      rules: rules.map((r) => `${r.ruleId}:${r.auditHash}`),
      ccis: ctx.resolvedCcis.map((c) => c.cciId),
    }),
  );

  const bundle: ExplanationBundle = createExplanationBundle({
    tenantId,
    evaluationRef:
      rules.length > 0
        ? rules.map((r) => r.ruleId).join("+")
        : ctx.resolvedCcis.length > 0
        ? ctx.resolvedCcis.map((c) => c.cciId).join("+")
        : ctx.ndimpInventoryRequested
        ? "NDIMP-LIVE-INVENTORY"
        : policies.map((p) => p.id).join("+"),
    nistVersion: "5.2.0",
    dbSha256: getDisaCciManifest().dbSha256,
    ruleId:
      rules.length > 0
        ? rules.map((r) => r.ruleId).join("+")
        : ctx.resolvedCcis.length > 0
        ? "DISA-CCI-CROSSWALK"
        : ctx.ndimpInventoryRequested
        ? "NDIMP-LIVE-INVENTORY"
        : "DOD-IC-POLICY-GROUNDED",
    ruleVersion: "ndimp-complete-4.0.0",
    evidenceSha256: combinedEvidenceSha,
    observedFacts:
      rules.length === 1
        ? rules[0]!.observedFacts
        : {
            rulesExecuted: rules.length,
            resolvedCciCount: ctx.resolvedCcis.length,
            policiesLoaded: policies.map((p) => p.id).join(", "),
            verdicts: rules.map((r) => `${r.ruleId}:${r.verdict}`).join(", "),
          },
    deterministicClassifications:
      rules.length > 0
        ? rules.map((r) => `${r.ruleId}: Scenario=${r.verdict} | Formal=${r.formalDetermination} — ${r.variance}`)
        : ctx.resolvedCcis.length > 0
        ? ctx.resolvedCcis.map((c) => `${c.cciId} -> Rev5:[${c.nistRev5Controls.join(",")}] Rev4:[${c.nistRev4Controls.join(",")}]`)
        : policies.map((p) => `${p.id} (${p.effectiveDate}): Grounded Policy Citation`),
    analyticalEstimates: [],
    verdict:
      rules.length > 0
        ? rules.map((r) => `${r.ruleId}:${r.verdict}`).join("|")
        : ctx.resolvedCcis.length > 0
        ? "CCI_CROSSWALK_GROUNDED"
        : ctx.ndimpInventoryRequested
        ? "NDIMP_INVENTORY_VERIFIED"
        : "POLICY_GROUNDED",
    ruleEvaluations: rules.map((r) => ({
      ruleId: r.ruleId,
      ruleVersion: r.ruleVersion,
      controlId: r.jurisdiction + ":" + r.ruleId,
      assessmentMode: r.assessmentMode,
      verdict: r.verdict,
      formalDetermination: r.formalDetermination,
      variance: r.variance,
      auditHash: r.auditHash,
      observedFacts: r.observedFacts,
      authorityDocs: r.authorityCitations.map((a) => `${a.id} (${a.effectiveDate})`),
    })),
  });

  // Build deterministic knowledge packet for LLM Stage 2
  const packetParts: string[] = [];
  if (ctx.ndimpInventoryRequested) {
    packetParts.push(buildLiveNdimpInventoryMarkdown());
  }
  if (ctx.waves234) {
    const wLines = renderWaves234SummaryLines(ctx.waves234);
    if (wLines.length > 0) packetParts.push(...wLines);
  }

  if (ctx.policyDiffReports.length > 0) {
    packetParts.push("### POLICY REVISION LINEAGE DIFF & BLAST RADIUS (IMMUTABLE)");
    for (const d of ctx.policyDiffReports) {
      packetParts.push(
        `- **${d.policyId} [${d.severity}]**: ${d.priorVersion} (${d.priorEffectiveDate}) -> ${d.currentVersion} (${d.currentEffectiveDate})`,
        `  - Blast Radius: ${d.blastRadius.mappedDisaCciCount} DISA CCIs across [${d.blastRadius.impactedNistControls.join(", ")}] | Impacted Noctis Rules: [${d.blastRadius.impactedRuleIds.join(", ")}]`,
        `  - Added: ${d.addedItems.join(" | ")}`,
        `  - Deprecated: ${d.removedItems.join(" | ")}`,
      );
    }
    packetParts.push("");
  }

  if (ctx.driftReport) {
    const dr = ctx.driftReport;
    packetParts.push("### LIVE UPSTREAM AUTHORITATIVE DRIFT MONITOR (IMMUTABLE)");
    packetParts.push(
      `- Overall=${dr.overallStatus} | DriftCount=${dr.driftCount} | AutoApplyToProduction=${dr.autoApplyToProduction} | KEV=${dr.kevStatus.source} (${dr.kevStatus.catalogCount})`,
    );
    for (const s of dr.sources) {
      packetParts.push(`- ${s.sourceId} (Pinned=${s.pinnedVersion}): Status=${s.status} | ${s.note}`);
    }
    packetParts.push("");
  }

  if (ctx.rolloutCheck) {
    const rc = ctx.rolloutCheck;
    packetParts.push("### POLICY ROLLOUT DUAL-CONTROL GOVERNANCE");
    packetParts.push(`- Allowed=${rc.allowed} | Code=${rc.errorCode || "APPROVED"} | ${rc.ruleResult.summary}`);
    packetParts.push("");
  }

  packetParts.push(
    "### AUTHORITATIVE DOD & IC POLICY REGISTRY (VERIFIED PUBLIC METADATA)",
    ...policies.map(
      (p) =>
        `- **${p.id} (${p.title})** | Version: ${p.version} | Effective: ${p.effectiveDate} | Authority: ${p.issuingAuthority}\n  - Requirements: ${p.keyRequirements.join(" ")}\n  - Boundary Invariant: ${p.distinctBoundaryNote}`,
    ),
    "",
  );

  if (ctx.ztAssessment) {
    const z = ctx.ztAssessment;
    packetParts.push("### DOD ZERO TRUST 7-PILLAR ASSESSMENT + CISA ZTMM CROSSWALK");
    packetParts.push(
      `- Readiness=${z.targetReadinessPercent ?? "N/A"}% | Status=${z.fy2027Status} | AvgScore=${z.averageSuppliedScore ?? "N/A"}/4 | NSS=${z.isNationalSecuritySystem} | Pillars: ${z.pillarRatings.map((p) => `${p.pillar}=${p.stage}`).join(", ")}`,
    );
    if (z.cisaZtmmCrosswalk) {
      packetParts.push(
        `- CISA ZTMM v2.0 Crosswalk: Overall=${z.cisaZtmmCrosswalk.overallStage} (${z.cisaZtmmCrosswalk.averageScore}/4), Weakest=${z.cisaZtmmCrosswalk.weakestPillar}`,
      );
    }
    packetParts.push("");
  }

  if (ctx.icamAssessment) {
    const ic = ctx.icamAssessment;
    packetParts.push("### DOD PKI & ICAM ASSESSMENT");
    packetParts.push(
      `- Credential=${ic.credentialType || "UNSPECIFIED"} | Privileged=${ic.isPrivilegedAccount} | PhishingResistant=${String(ic.phishingResistant)} | OCSP/CRL FailClosed=${String(ic.revocationFailClosedEnforced)}`,
    );
    packetParts.push("");
  }

  if (ctx.resolvedCcis.length > 0) {
    packetParts.push(`### OFFICIAL DISA CCI CROSSWALK (Version ${getDisaCciManifest().version})`);
    for (const c of ctx.resolvedCcis) {
      packetParts.push(
        `- **${c.cciId}** (${c.type}, status=${c.status}): ${c.definition} | Rev5=[${c.nistRev5Controls.join(", ")}] (Refs: ${c.nistRev5References.join(", ") || "none"}) | Rev4=[${c.nistRev4Controls.join(", ")}]`,
      );
    }
    packetParts.push("");
  }

  if (ctx.controlCciMatches.length > 0) {
    packetParts.push("### REVERSE NIST-TO-DISA CCI LOOKUP");
    for (const g of ctx.controlCciMatches) {
      packetParts.push(
        `- **${g.controlId}**: ${g.matches.map((m) => `${m.cciId} (${m.revision}: ${m.references.join("/")})`).join("; ")}`,
      );
    }
    packetParts.push("");
  }

  if (ctx.acasAnalysis) {
    const a = ctx.acasAnalysis;
    packetParts.push("### ACAS / NESSUS ANALYSIS SUMMARY (SCANNER_REPORTED_UNVALIDATED)");
    packetParts.push(
      `- Hosts: ${a.credentialedScanDiagnostics.totalHosts} (${a.credentialedScanDiagnostics.uncredentialedHosts} credential failed: ${a.credentialedScanDiagnostics.failedCredentialHosts.join(", ") || "none"}) | KEVSource=${a.kevFeedSource} | DedupActive=${a.summary.deduplicatedActiveFindings} | KEV=${a.summary.kevMatches}`,
    );
    for (const f of a.findings.slice(0, 10)) {
      packetParts.push(
        `- [${f.priority}] Plugin ${f.pluginId} (${f.pluginName}): Hosts=${f.assetCount} [${f.affectedHosts.join(", ")}] | CVEs=${f.cves.join(",") || "none"} | SLA=${f.slaDays}d | Validation=${f.validationStatus} | Rescan=${f.remediationVerification}`,
      );
    }
    packetParts.push("");
  }

  if (ctx.stigLibraryHits.length > 0) {
    packetParts.push("### PRE-INDEXED PUBLIC DISA STIG BENCHMARK RULES (HYDRATED WITH DISA CCI)");
    for (const s of ctx.stigLibraryHits) {
      packetParts.push(
        `- **${s.groupId} (${s.ruleId} | ${s.severity} | ${s.benchmarkTitle})**: ${s.title} | CCIs=[${s.cciIds.join(", ")}] | Rev5=[${s.nistRev5Controls.join(", ")}] | Check: ${s.checkText} | Fix: ${s.fixText}`,
      );
    }
    packetParts.push("");
  }

  if (ctx.stigAnalysis) {
    const s = ctx.stigAnalysis;
    packetParts.push(`### DISA STIG / SCAP CHECKLIST SUMMARY (${s.sourceFormat})`);
    packetParts.push(
      `- Compliance=${s.summary.compliancePercent}% (${s.summary.passedChecks}/${s.summary.applicableChecks}) | CAT_I_OPEN=${s.summary.cat1Open} | CAT_II_OPEN=${s.summary.cat2Open} | NOT_REVIEWED=${s.summary.notReviewedCount} | UNSUBSTANTIATED_NON_OPEN=${s.summary.unsubstantiatedNonOpenCount} | ATO_VETO=${s.summary.atoVetoTriggered} | ImpactedRev5=[${s.summary.impactedNistRev5Controls.join(", ")}]`,
    );
    packetParts.push("");
  }

  if (rules.length > 0) {
    packetParts.push("### DETERMINISTIC DOD/IC RULE VERDICTS (IMMUTABLE)");
    for (const r of rules) {
      packetParts.push(
        `- **${r.ruleId} [${r.jurisdiction}]: VERDICT = \`${r.verdict}\` | MODE = \`${r.assessmentMode}\` | FORMAL = \`${r.formalDetermination}\`**\n  - Summary: ${r.summary}\n  - Threshold: ${r.threshold}\n  - Variance: ${r.variance}\n  - Missing Evidence: ${r.missingEvidence.join("; ")}\n  - Audit Hash: \`${r.auditHash}\``,
      );
    }
    packetParts.push("");
  }

  packetParts.push(`Trace Bundle: \`${bundle.bundleId}\` (Canonical SHA-256: \`${bundle.canonicalTraceHash}\`)`);
  const packetText = packetParts.join("\n");

  let chatFn = opts.modelChatFn;
  if (!chatFn) {
    const mod = await import("../video-mind.server.ts");
    chatFn = mod.modelChat as unknown as DodIcModelChatFn;
  }

  let finalBody = "";
  let activeThought = "";
  let audit = verifyDodIcResponse(q, "", rules);

  try {
    const sys = buildDodIcSystemPrompt(opts.language || "English", shouldThink);
    const first = await chatFn(
      [
        { role: "system", content: sys },
        ...(opts.turns || []).slice(-4, -1).map((t) => ({ role: t.role, content: t.content.slice(0, 1500) })),
        { role: "user", content: `QUESTION:\n${q}\n\nIMMUTABLE DOD/IC PACKET:\n${packetText}` },
      ],
      { temperature: 0.0, maxTokens: 8192, thinkingLevel: "medium", brain: opts.brain },
    );

    if ("text" in first && first.text.trim()) {
      const parsed = parseThinkEnvelope(first.text);
      activeThought = parsed.thought;
      if (parsed.body.length >= 120 && !/<\/?think>/i.test(parsed.body)) {
        finalBody = parsed.body;
        audit = verifyDodIcResponse(q, finalBody, rules);
        if (!audit.passed) {
          const repaired = await chatFn(
            [
              { role: "system", content: sys },
              {
                role: "user",
                content: `Fix ALL violations:\n${audit.violations.join("\n")}\n\nPACKET:\n${packetText}\n\nDRAFT:\n${finalBody}`,
              },
            ],
            { temperature: 0.0, maxTokens: 8192, thinkingLevel: "medium", brain: opts.brain },
          );
          if ("text" in repaired && repaired.text.trim()) {
            const p2 = parseThinkEnvelope(repaired.text);
            if (p2.body.length >= 120 && !/<\/?think>/i.test(p2.body)) {
              const a2 = verifyDodIcResponse(q, p2.body, rules);
              if (a2.passed) {
                finalBody = p2.body;
                if (p2.thought) activeThought = p2.thought;
                audit = a2;
              }
            }
          }
        }
      }
    }
  } catch {
    /* Deterministic fallback below */
  }

  if (!finalBody || !audit.passed) {
    finalBody = renderDeterministicDodIcFallback(q, policies, rules, ctx);
  }

  let persistedSql = false;
  if (opts.persistTrace !== false) {
    try {
      await saveRmfArtifact({
        id: bundle.bundleId,
        tenantId,
        artifactType: "EXPLANATION",
        systemId: "noctis-dod-ic-engine",
        title: `DoD/IC Trace ${bundle.evaluationRef} (${bundle.verdict})`,
        status: "RECORDED",
        payload: bundle as unknown as Record<string, unknown>,
        createdBy: tenantId,
      });
      persistedSql = true;
    } catch {
      /* Non-fatal when offline */
    }
  }

  const citeSummary = policies.map((p) => `${p.id} (${p.effectiveDate})`).join(", ");
  const footer =
    `\n\n---\n**Noctis DoD & IC Security Verification** · Jurisdictions Segregated (` +
    `\`DoDI 8510.01 != ICD 503\`) · Verified Directives: \`${citeSummary}\`` +
    ` · Trace: \`${bundle.bundleId}\` (\`${bundle.canonicalTraceHash.slice(0, 12)}\`${persistedSql ? ", SQL Replayable" : ""})`;

  if (!shouldThink) return `${finalBody.trim()}${footer}`;
  const detTrace = `DoD/IC Trace: Policies=[${policies.map((p) => p.id).join(", ")}]; Rules=[${rules.map((r) => `${r.ruleId}=${r.verdict}`).join(", ") || "policy"}]; CCIs=${ctx.resolvedCcis.length}; ClassificationGate=${gate.action}`;
  const thought = [activeThought, detTrace].filter(Boolean).join("\n\n");
  return `<think>\n${thought}\n</think>\n\n${finalBody.trim()}${footer}`;
}
