import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  handleNaturalLegalQuery,
  isLegalQuery,
  resolveJurisdiction,
  verifyLegalCitation,
  PRIMARY_AUTHORITY_VAULT,
  runCourtroomAdvocacyEngine,
  runEvidenceIntelligenceEngine,
  runDepositionIntelligenceEngine,
  runContractNegotiationEngine,
  runMultiAgentLegalAdversarialAnalysis,
  generateLegalVoiceResponse,
  TWENTY_FOUR_LEGAL_AGENTS,
  executeAutonomousLegalWorkflow,
  queryHistoricalLegalVersion,
  verifyMatterAccess,
  parseAndAuditLegalDocument,
  resolveStateJurisprudencePack,
  calculateLitigationDeadlines,
  applyFirmNegotiationPlaybook,
} from "./noctis-legal-engine.ts";

describe("Noctis Legal Intelligence & Attorney Persona Engine (NOCTIS-LEGAL-001)", () => {
  it("LEG-001: should accurately identify legal and jurisprudence queries", () => {
    assert.strictEqual(isLegalQuery("What are the remedies for breach of contract under FAR Part 49?"), true);
    assert.strictEqual(isLegalQuery("Opposing party filed a motion alleging breach without documentary evidence"), true);
    assert.strictEqual(isLegalQuery("Assess ePHI breach under HIPAA Security Rule"), true);
    assert.strictEqual(isLegalQuery("Administrative Procedure Act APA challenge under 5 U.S.C. 706 post-Chevron Loper Bright"), true);
    assert.strictEqual(isLegalQuery("Differentiate negligence, gross negligence, recklessness, and intentional misconduct in tort law"), true);
    assert.strictEqual(isLegalQuery("Analyze breach of contract under Maryland state law"), true);
    assert.strictEqual(isLegalQuery("Calculate the voltage drop on a 3-phase feeder"), false);
  });

  it("LEG-002: should generate formal IRAC dossier for Federal Contract Law (FAR Part 49)", () => {
    const res = handleNaturalLegalQuery("Federal government contract breach remedies under FAR Part 49");
    assert.ok(res, "Dossier must not be null");
    assert.ok(res.includes("STATEMENT OF THE ISSUE"));
    assert.ok(res.includes("CONTROLLING LEGAL RULES & AUTHORITIES"));
    assert.ok(res.includes("FAR Part 49"));
    assert.ok(res.includes("APPLICATION & LEGAL ANALYSIS"));
    assert.ok(res.includes("CONCLUSION & RECOMMENDED DISPOSITION"));
    assert.ok(res.includes("Cure Notice"));
    assert.ok(res.includes("Show Cause Notice"));
    assert.ok(res.includes("Excess Reprocurement Costs"));
  });

  it("LEG-003: should generate formal litigation defense dossier for lack of documentary evidence (FRCP 56)", () => {
    const res = handleNaturalLegalQuery("Commercial litigation opposing party alleging breach without documentary evidence response");
    assert.ok(res, "Dossier must not be null");
    assert.ok(res.includes("Federal Rule of Civil Procedure 56"));
    assert.ok(res.includes("Celotex Corp. v. Catrett"));
    assert.ok(res.includes("Bell Atlantic Corp. v. Twombly"));
    assert.ok(res.includes("Ashcroft v. Iqbal"));
    assert.ok(res.includes("Summary Judgment"));
  });

  it("LEG-004: should generate regulatory & cybersecurity dossier for HIPAA ePHI breach", () => {
    const res = handleNaturalLegalQuery("Assess ePHI unauthorized access breach under HIPAA Security Rule");
    assert.ok(res, "Dossier must not be null");
    assert.ok(res.includes("45 CFR Part 160") || res.includes("160"));
    assert.ok(res.includes("45 CFR Part 164"));
    assert.ok(res.includes("Four-Factor Risk Assessment"));
    assert.ok(res.includes("60 calendar days"));
    assert.ok(res.includes("HHS Office for Civil Rights"));
  });

  it("LEG-005: should generate administrative law dossier under APA § 706 and Loper Bright", () => {
    const res = handleNaturalLegalQuery("Administrative Procedure Act APA challenge under 5 U.S.C. 706 federal agency action Loper Bright");
    assert.ok(res, "Dossier must not be null");
    assert.ok(res.includes("5 U.S.C. § 706"));
    assert.ok(res.includes("Loper Bright Enterprises v. Raimondo"));
    assert.ok(res.includes("Motor Vehicle Mfrs. Ass'n v. State Farm"));
    assert.ok(res.includes("De Novo"));
    assert.ok(res.includes("Arbitrary and Capricious") || res.includes("Arbitrary & Capricious"));
  });

  it("LEG-006: should generate tort law culpability spectrum dossier", () => {
    const res = handleNaturalLegalQuery("Analyze tort law culpability tiers: negligence vs gross negligence vs recklessness vs intentional misconduct");
    assert.ok(res, "Dossier must not be null");
    assert.ok(res.includes("Restatement (Second) of Torts"));
    assert.ok(res.includes("Restatement (Third) of Torts"));
    assert.ok(res.includes("Ordinary Negligence"));
    assert.ok(res.includes("Gross Negligence"));
    assert.ok(res.includes("Recklessness"));
    assert.ok(res.includes("Intentional Misconduct"));
    assert.ok(res.includes("Piercing Contractual Limitations of Liability"));
    assert.ok(res.includes("Punitive Damages"));
  });

  it("LEG-007: should resolve and generate Maryland state jurisprudence dossier", () => {
    const res = handleNaturalLegalQuery("Analyze personal jurisdiction and choice of law under Maryland state law");
    assert.ok(res, "Dossier must not be null");
    assert.ok(res.includes("Maryland Long-Arm Jurisdiction"));
    assert.ok(res.includes("Md. Code Ann., Cts. & Jud. Proc. § 6-103"));
    assert.ok(res.includes("Lex loci contractus"));
    assert.ok(res.includes("Lex loci delicti"));
    assert.ok(res.includes("Adler v. American Standard Corp."));
    assert.ok(res.includes("COMAR"));
    assert.ok(res.includes("Md. Rule 1-104"));
  });

  it("LEG-008: should resolve jurisdictions accurately with procedural rules", () => {
    const mdJuris = resolveJurisdiction("Maryland breach of contract claim");
    assert.strictEqual(mdJuris.primaryJurisdiction, "MARYLAND");
    assert.ok(mdJuris.governingLaw.includes("Maryland State Law"));

    const farJuris = resolveJurisdiction("Federal contract dispute under FAR Part 49");
    assert.strictEqual(farJuris.primaryJurisdiction, "US_FEDERAL");
    assert.ok(farJuris.subjectMatterJurisdiction.includes("Contract Disputes Act"));

    const hipaaJuris = resolveJurisdiction("HIPAA ePHI disclosure to OCR");
    assert.strictEqual(hipaaJuris.primaryJurisdiction, "US_FEDERAL");
    assert.ok(hipaaJuris.governingLaw.includes("45 CFR"));
  });

  it("LEG-009: should verify citations and reject fabricated authorities without hallucination", () => {
    const celotex = verifyLegalCitation("477 U.S. 317");
    assert.strictEqual(celotex.status, "VERIFIED");
    assert.strictEqual(celotex.caseOrStatuteName, "Celotex Corp. v. Catrett");
    assert.strictEqual(celotex.year, 1986);

    const loperBright = verifyLegalCitation("Loper Bright Enterprises v. Raimondo");
    assert.strictEqual(loperBright.status, "VERIFIED");
    assert.strictEqual(loperBright.court, "Supreme Court of the United States");

    const fakeCase = verifyLegalCitation("Fictitious Corp. v. Phantom LLC, 999 F.9th 1234 (2099)");
    assert.strictEqual(fakeCase.status, "UNVERIFIED");
    assert.strictEqual(fakeCase.caseOrStatuteName, "Unindexed / Unverified Legal Authority");
  });

  it("LEG-010: should execute Courtroom Advocacy oral argument and objection simulation", () => {
    const courtroom = runCourtroomAdvocacyEngine("Breach of Contract Motion for Summary Judgment", "DEFENSE");
    assert.ok(courtroom.oralArgumentPreamble.includes("May it please the Court"));
    assert.ok(courtroom.benchQuestions.length > 0);
    assert.ok(courtroom.evidentiaryObjections.some(o => o.legalGround.includes("FRE 802")));
    assert.ok(courtroom.closingArgumentDraft.includes("Members of the Jury"));
  });

  it("LEG-011: should audit evidence contradictions and gaps", () => {
    const evidenceAudit = runEvidenceIntelligenceEngine(["Exhibit A", "Exhibit B"]);
    assert.ok(evidenceAudit.materialContradictions.length > 0);
    assert.ok(evidenceAudit.admissibilityRisks.some(r => r.includes("FRE 902(11)")));
    assert.ok(evidenceAudit.evidentiaryGaps.length > 0);
  });

  it("LEG-012: should generate deposition examination batteries and impeachment lines", () => {
    const depo = runDepositionIntelligenceEngine("John Doe", "VP of Engineering");
    assert.ok(depo.examinationOutline.length > 0);
    assert.ok(depo.trapQuestions.length > 0);
  });

  it("LEG-013: should analyze contracts for unfavorable clauses and generate redlines", () => {
    const contract = runContractNegotiationEngine(["indemnity", "consequential damages"]);
    assert.ok(contract.riskScore > 50);
    assert.ok(contract.unfavorableTerms.some(t => t.clause.includes("Indemnification")));
  });

  it("LEG-014: should execute 4-agent adversarial legal simulation with auditor validation", () => {
    const adversarial = runMultiAgentLegalAdversarialAnalysis("Software vendor delay dispute under supply agreement");
    assert.ok(adversarial.claimantAgentArgument.includes("AGENT A"));
    assert.ok(adversarial.defenseAgentArgument.includes("AGENT B"));
    assert.ok(adversarial.judicialAnalystEvaluation.includes("AGENT C"));
    assert.ok(adversarial.legalCitationAuditorReport.citatorIntegrityScore === 100);
    assert.ok(adversarial.consensusSynthesis.includes("LEGAL SYNTHESIS"));
  });

  it("LEG-015: should generate attorney spoken voice in multiple registers", () => {
    const courtroomVoice = generateLegalVoiceResponse("Why should the court dismiss?", "COURTROOM_ADVOCACY");
    assert.ok(courtroomVoice.includes("May it please the Court"));
    assert.ok(courtroomVoice.includes("Your Honor"));

    const benchVoice = generateLegalVoiceResponse("Why should the court dismiss?", "JUDICIAL_DELIBERATION");
    assert.ok(benchVoice.includes("MEMORANDUM DECISION"));

    const advisoryVoice = generateLegalVoiceResponse("Should we file suit?", "ATTORNEY_CONVERSATION");
    assert.ok(advisoryVoice.includes("Counsel Assessment"));
  });


  it("LIP-001: should register all 24 autonomous specialist legal agents across 6 teams", () => {
    const agents = Object.values(TWENTY_FOUR_LEGAL_AGENTS);
    assert.strictEqual(agents.length, 24);

    const teams = new Set(agents.map(a => a.team));
    assert.strictEqual(teams.size, 6);
    assert.ok(teams.has("TEAM_A_RESEARCH"));
    assert.ok(teams.has("TEAM_B_ADVOCACY"));
    assert.ok(teams.has("TEAM_C_LITIGATION"));
    assert.ok(teams.has("TEAM_D_TRANSACTIONS"));
    assert.ok(teams.has("TEAM_E_REGULATORY"));
    assert.ok(teams.has("TEAM_F_GOVERNANCE"));
  });

  it("LIP-002: should execute all 5 autonomous end-to-end legal workflows", () => {
    const wf1 = executeAutonomousLegalWorkflow("RESEARCH_AND_OPINION", "MATTER-101", "ORG-Alpha", "Breach query");
    assert.strictEqual(wf1.status, "COMPLETED");
    assert.strictEqual(wf1.humanApprovalRequired, false);
    assert.ok(wf1.participatingAgents.includes("A1_RESEARCH"));

    const wf2 = executeAutonomousLegalWorkflow("LITIGATION_PREPARATION", "MATTER-101", "ORG-Alpha", "Case prep");
    assert.strictEqual(wf2.status, "COMPLETED");
    assert.ok(wf2.participatingAgents.includes("C1_EVIDENCE"));

    const wf3 = executeAutonomousLegalWorkflow("CONTRACT_REVIEW_REDLINE", "MATTER-101", "ORG-Alpha", "SLA contract");
    assert.strictEqual(wf3.status, "COMPLETED");
    assert.ok(wf3.participatingAgents.includes("D2_CONTRACTS"));

    const wf4 = executeAutonomousLegalWorkflow("REGULATORY_CHANGE_INTELLIGENCE", "MATTER-101", "ORG-Alpha", "eCFR change");
    assert.strictEqual(wf4.status, "COMPLETED");
    assert.ok(wf4.participatingAgents.includes("E1_REGULATORY"));

    const wf5 = executeAutonomousLegalWorkflow("COURT_FILING_PREPARATION", "MATTER-101", "ORG-Alpha", "Motion filing");
    assert.strictEqual(wf5.status, "PENDING_HUMAN_APPROVAL");
    assert.strictEqual(wf5.humanApprovalRequired, true);
    assert.ok(wf5.findingsSummary.includes("HOLD"));
  });

  it("LIP-003: should perform legal knowledge time travel across historical statutory amendments", () => {
    const historicalPre = queryHistoricalLegalVersion("5 U.S.C. § 706", "2023-01-15");
    assert.ok(historicalPre.governingVersionText.includes("Chevron"));
    assert.ok(historicalPre.subsequentHistoryNote.includes("Chevron deference active"));

    const historicalPost = queryHistoricalLegalVersion("5 U.S.C. § 706", "2024-07-01");
    assert.ok(historicalPost.governingVersionText.includes("Loper Bright"));
    assert.ok(historicalPost.subsequentHistoryNote.includes("Loper Bright Enterprises v. Raimondo"));
  });

  it("LIP-004: should enforce multi-tenant matter isolation and ethical wall conflict screening", () => {
    const context = {
      tenantId: "FIRM_A",
      matterId: "MATTER_101",
      authorizedAttorneys: ["USER_1", "USER_2"],
      classificationLevel: "CONFIDENTIAL" as const,
      ethicalWallActive: true,
      walledParties: ["USER_3"]
    };

    // 1. Cross-tenant attempt
    const res1 = verifyMatterAccess(context, { tenantId: "COMPANY_B", userId: "USER_X", assignedMatters: ["MATTER_101"] });
    assert.strictEqual(res1.accessGranted, false);
    assert.ok(res1.reason.includes("Cross-tenant access strictly forbidden"));

    // 2. Matter mismatch attempt
    const res2 = verifyMatterAccess(context, { tenantId: "FIRM_A", userId: "USER_4", assignedMatters: ["MATTER_999"] });
    assert.strictEqual(res2.accessGranted, false);
    assert.ok(res2.reason.includes("User not authorized on this matter docket"));

    // 3. Ethical wall conflict
    const res3 = verifyMatterAccess(context, { tenantId: "FIRM_A", userId: "USER_3", assignedMatters: ["MATTER_101"] });
    assert.strictEqual(res3.accessGranted, false);
    assert.ok(res3.reason.includes("ETHICAL_WALL_BARRIER"));

    // 4. Authorized access
    const res4 = verifyMatterAccess(context, { tenantId: "FIRM_A", userId: "USER_1", assignedMatters: ["MATTER_101"] });
    assert.strictEqual(res4.accessGranted, true);
  });


  it("LIP-005: should parse contracts and audit indemnification, liability caps, and restrictive covenants", () => {
    const docSample = "Contractor shall indemnify Client. Limitation of liability shall not apply to breach of Section 7. Contractor covenants not to compete for 24 months.";
    const audit = parseAndAuditLegalDocument(docSample, "Enterprise Master Agreement");
    assert.strictEqual(audit.documentType, "COMMERCIAL_AGREEMENT");
    assert.ok(audit.clausesAudited.length >= 3);
    assert.ok(audit.clausesAudited.some(c => c.clauseType === "INDEMNIFICATION" && c.riskRating === "UNACCEPTABLE"));
    assert.ok(audit.clausesAudited.some(c => c.clauseType === "LIMITATION_OF_LIABILITY" && c.riskRating === "HIGH"));
    assert.ok(audit.statutoryComplianceViolations.some(v => v.includes("California Bus. & Prof. Code § 16600.5")));
  });

  it("LIP-006: should retrieve state jurisprudence packs for DE, NY, VA, and CA", () => {
    const dePack = resolveStateJurisprudencePack("DELAWARE");
    assert.ok(dePack.governingStatutes.some(s => s.citation.includes("8 Del. C. § 102(b)(7)")));
    assert.ok(dePack.pivotalDoctrines.some(d => d.includes("Business Judgment Rule")));

    const nyPack = resolveStateJurisprudencePack("NEW_YORK");
    assert.ok(nyPack.governingStatutes.some(s => s.citation.includes("N.Y. Gen. Oblig. Law § 5-1401")));
    assert.ok(nyPack.pivotalDoctrines.some(d => d.includes("Truck Rent-A-Center")));

    const vaPack = resolveStateJurisprudencePack("VIRGINIA");
    assert.ok(vaPack.governingStatutes.some(s => s.citation.includes("8.01-38.1")));
    assert.ok(vaPack.pivotalDoctrines.some(d => d.includes("Dillon's Rule")));

    const caPack = resolveStateJurisprudencePack("CALIFORNIA");
    assert.ok(caPack.governingStatutes.some(s => s.citation.includes("16600")));
    assert.ok(caPack.pivotalDoctrines.some(d => d.includes("Edwards v. Arthur Andersen")));
  });

  it("LIP-007: should calculate federal and state litigation deadlines accounting for service method and Rule 6(d)", () => {
    // Federal Electronic Service
    const fedElec = calculateLitigationDeadlines("2026-03-01", "ELECTRONIC", "FEDERAL");
    assert.strictEqual(fedElec.deadlines.length >= 4, true);
    const answerElec = fedElec.deadlines.find(d => d.eventTitle.includes("Answer"));
    assert.strictEqual(answerElec?.daysAllowed, 21);

    // Federal Mail Service (+3 days under Rule 6(d))
    const fedMail = calculateLitigationDeadlines("2026-03-01", "MAIL_OR_CARRIER", "FEDERAL");
    const answerMail = fedMail.deadlines.find(d => d.eventTitle.includes("Answer"));
    assert.strictEqual(answerMail?.daysAllowed, 24);

    // Maryland State Service
    const mdState = calculateLitigationDeadlines("2026-03-01", "ELECTRONIC", "MARYLAND_STATE");
    const mdAnswer = mdState.deadlines.find(d => d.ruleCitation.includes("Md. Rule 2-321"));
    assert.strictEqual(mdAnswer?.daysAllowed, 30);
  });

  it("LIP-008: should apply firm negotiation playbook fallbacks and walk-away thresholds", () => {
    const playbook = applyFirmNegotiationPlaybook();
    assert.ok(playbook["INDEMNITY"]);
    assert.ok(playbook["LIABILITY_CAP"]);
    assert.ok(playbook["GOVERNING_LAW"]);
    assert.ok(playbook["INDEMNITY"].walkAwayCondition.includes("Uncapped, unilateral indemnity"));
    assert.ok(playbook["LIABILITY_CAP"].fallbackLevel1.includes("2.0x annual fees"));
  });

});
