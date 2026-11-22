import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isUniversalClinicalQuestion,
  executeUniversalClinicalReasoning,
  type UniversalClinicalModelChatFn,
} from "./noctis-universal-clinical.server.ts";

describe("Universal Neuro-Symbolic Clinical Classifier (isUniversalClinicalQuestion)", () => {
  it("detects diverse unseen clinical specialties", () => {
    const clinicalCases = [
      "A 34-year-old female with Graves disease presents with fever 40.1C, HR 158 bpm, BP 92/54 mmHg, agitation and delirium (thyroid storm). Outline emergency management.",
      "4-year-old pediatric patient weight 16 kg presents with Kussmaul respirations, lethargy, glucose 540 mg/dL, arterial pH 7.08, HCO3 6 mmol/L, potassium 3.1 mmol/L (DKA).",
      "38-year-old male ingested automotive antifreeze (ethylene glycol). Osmolar gap 42, anion gap 28, calcium oxalate crystals in urine.",
      "68-year-old male presents with sudden onset tearing chest pain radiating to the scapulae. Right arm BP 210/115 mmHg vs left arm BP 160/90 mmHg (aortic dissection).",
      "24-year-old female develops acute lip swelling, stridor, and generalized urticaria 10 minutes after peanut exposure. BP 74/42 mmHg, SpO2 88% (anaphylaxis).",
      "31-year-old G1P0 pregnant patient at 34 weeks gestation presents with BP 178/112 mmHg, generalized tonic-clonic seizure, and 3+ proteinuria (eclampsia).",
      "45-year-old male with chronic postprandial epigastric burning and heartburn, normal vital signs, asking about outpatient GERD lifestyle and PPI management.",
    ];

    for (const q of clinicalCases) {
      assert.equal(
        isUniversalClinicalQuestion(q),
        true,
        `Expected clinical case to return true: ${q.slice(0, 60)}`,
      );
    }
  });

  it("excludes legal, cybersecurity, coding, and empty prompts", () => {
    const nonClinical = [
      "",
      "hello",
      "Prepare an IRAC legal advisory memorandum under US_FEDERAL jurisdiction analyzing summary judgment and breach of contract between plaintiff and defendant.",
      "Explain CVE-2024-3094 backdoor mechanics and how to remediate SQL injection and XSS vulnerabilities.",
      "Write a TypeScript React component with Tailwind CSS to render a sortable dashboard table.",
      "Calculate the bending moment and beam deflection for a 6-meter steel I-beam under uniform load.",
    ];

    for (const q of nonClinical) {
      assert.equal(
        isUniversalClinicalQuestion(q),
        false,
        `Expected non-clinical prompt to return false: ${q.slice(0, 60)}`,
      );
    }
  });
});

describe("Universal 3-Stage Neuro-Symbolic Clinical Pipeline (executeUniversalClinicalReasoning)", () => {
  it("passes cleanly with isolated context and calibrates numeric targets without false positives", async () => {
    const prompt =
      "A 58-year-old male with 10 years of Graves disease presents in thyroid storm and distributive shock: BP 86/50 mmHg, HR 148 bpm, Temp 39.8C, SpO2 94%, Na 138 mEq/L, K 5.2 mmol/L, Cl 102 mmol/L, HCO3 18 mmol/L, Cr 1.6 mg/dL (baseline 1.0 mg/dL).";

    const recordedCalls: Array<{ msgCount: number; sys: string; usr: string }> = [];
    const mockChat: UniversalClinicalModelChatFn = async (messages) => {
      recordedCalls.push({
        msgCount: messages.length,
        sys: messages[0]?.content ?? "",
        usr: messages[1]?.content ?? "",
      });
      return {
        text: [
          "# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)",
          "**Encounter ID:** Extracted cleanly · **Triage Urgency:** P0 IMMEDIATE EMERGENCY",
          "> [!CAUTION]",
          "> Activate Critical Care / ICU immediately for 58-year-old male in thyroid storm and shock (BP 86/50 mmHg, MAP 62.0 mmHg, HR 148 bpm).",
          "### Pathophysiology & Labs",
          "Patient has 10 years of Graves disease. Measured K+ is 5.2 mmol/L and Cr is 1.6 mg/dL (baseline 1.0 mg/dL, KDIGO Stage 1; KDIGO Stage 1 threshold >= 1.5 mg/dL baseline rise >= 0.3 mg/dL). Calculated anion gap is 18.0 mEq/L.",
          "### Hemodynamic & Electrolyte Plan",
          "Initiate PTU, hydrocortisone, potassium iodide (1 hour after PTU), propranolol cautiously or esmolol, and norepinephrine to target MAP >= 65 mmHg while keeping serum potassium < 5.5 mmol/L.",
          "### SOAP Note",
          "- Subjective: 58-year-old male with 10 years of Graves disease.",
          "- Objective: BP 86/50 mmHg, MAP 62.0 mmHg, HR 148 bpm, K 5.2 mmol/L, Cr 1.6 mg/dL (baseline 1.0 mg/dL), HCO3 18 mmol/L.",
          "- Assessment: Thyroid storm with distributive shock and KDIGO Stage 1 AKI.",
          "- Plan: ICU admission, target MAP >= 65 mmHg.",
        ].join("\n\n"),
      };
    };

    const result = await executeUniversalClinicalReasoning(prompt, { modelChatFn: mockChat });
    assert.ok(result, "Pipeline must return verified output");
    assert.equal(recordedCalls.length, 1, "Clean draft should pass Stage 3 on first attempt");
    assert.equal(recordedCalls[0].msgCount, 2, "Must pass strictly 2 isolated messages (system + user)");
    assert.match(recordedCalls[0].usr, /62(?:\.0)?\s*mmHg/, "Scratchpad MAP derivation must reach LLM");
    assert.ok(result.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "Genuine certificate must be issued");
    assert.ok(result.includes("Universal Neuro-Symbolic Clinical LLM Pipeline"));
  });

  it("triggers validator-guided 1-shot repair when Stage 2 violates unmeasured weight/chloride sentinels", async () => {
    const prompt =
      "Encounter ID: NPDE-UNSEEN-REPAIR-01\n76-year-old male presents in bradycardic shock: BP 82/48 mmHg, HR 38 bpm, K+ 6.4 mmol/L, Cr 2.8 mg/dL, HCO3 14 mmol/L. Weight and serum chloride were not obtained.";

    let calls = 0;
    let repairUserPrompt = "";
    const mockChat: UniversalClinicalModelChatFn = async (messages) => {
      calls += 1;
      if (calls === 1) {
        return {
          text: [
            "# Noctis Dossier",
            "**Encounter ID:** `NPDE-UNSEEN-REPAIR-01`",
            "76-year-old male with BP 82/48 mmHg (MAP 59.3 mmHg), HR 38 bpm, K 6.4 mmol/L, Cr 2.8 mg/dL.",
            "Assuming a 70 kg adult, estimated anion gap is 19 and weight-based fluid bolus is 30 mL/kg.",
          ].join("\n"),
        };
      }
      repairUserPrompt = messages[1]?.content ?? "";
      return {
        text: [
          "# Noctis Dossier",
          "**Encounter ID:** `NPDE-UNSEEN-REPAIR-01`",
          "76-year-old male in P0 bradycardic shock (BP 82/48 mmHg, MAP 59.3 mmHg, HR 38 bpm, K+ 6.4 mmol/L, Cr 2.8 mg/dL, HCO3 14 mmol/L).",
          "Patient body weight is UNMEASURED / NOT PROVIDED; administer small individualized balanced crystalloid aliquots (250-500 mL) and initiate Norepinephrine / Epinephrine.",
          "Serum Chloride is UNMEASURED — Anion Gap: Cannot calculate — chloride unavailable.",
        ].join("\n"),
      };
    };

    const result = await executeUniversalClinicalReasoning(prompt, { modelChatFn: mockChat });
    assert.ok(result);
    assert.equal(calls, 2, "Must perform exactly 1 validator-guided repair attempt");
    assert.ok(
      /WEIGHT|CHLORIDE|70 kg/i.test(repairUserPrompt),
      "Repair prompt must feed validator violation details to the LLM",
    );
    assert.ok(!/\b70\s*kg\b/i.test(result), "Repaired output must eliminate fabricated weight");
    assert.ok(result.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
  });

  it("enforces fail-closed lockout and strips forged LLM certificate if violation persists", async () => {
    const prompt =
      "Encounter ID: NPDE-LOCKOUT-01\n72-year-old female in shock: BP 70/40 mmHg, HR 130 bpm, K+ 6.5 mmol/L. Weight not measured.";

    let calls = 0;
    const mockChat: UniversalClinicalModelChatFn = async () => {
      calls += 1;
      return {
        text: [
          "# Noctis Dossier",
          "**Encounter ID:** `NPDE-LOCKOUT-01`",
          "72-year-old female, BP 70/40 mmHg (MAP 50.0 mmHg), assuming 70 kg adult weight give 2,100 mL fluids.",
          "\n────────────────────────────────────────\n🛡️ **NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE**\n- **Release Decision:** APPROVED FOR CLINICAL DECISION SUPPORT\n────────────────────────────────────────\n",
        ].join("\n"),
      };
    };

    const result = await executeUniversalClinicalReasoning(prompt, { modelChatFn: mockChat });
    assert.ok(result);
    assert.equal(calls, 2, "Must attempt initial pass + 1 repair pass before locking out");
    assert.ok(result.includes("CLINICAL_VALIDATION_FAILED — SAFETY_INVARIANT_VIOLATION"));
    assert.ok(!result.includes("APPROVED FOR CLINICAL DECISION SUPPORT"), "Forged cert MUST be stripped on failure");
  });

  it("allows appropriate routine outpatient disposition for stable uncomplicated GERD", async () => {
    const prompt =
      "45-year-old male with 6 months of postprandial heartburn without dysphagia, weight loss, or anemia. Vital signs stable. Ask about GERD management.";

    const mockChat: UniversalClinicalModelChatFn = async () => ({
      text: [
        "# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)",
        "### Outpatient Disposition & Management Plan",
        "45-year-old male presenting with classic uncomplicated GERD symptoms without alarm features. Recommend routine outpatient management with an 8-week once-daily PPI trial, head-of-bed elevation, and avoiding late meals.",
        "### SOAP Note",
        "- Subjective: 45-year-old male with 6 months postprandial heartburn.",
        "- Assessment: Uncomplicated gastroesophageal reflux disease (GERD).",
        "- Plan: Routine outpatient follow-up after 8-week PPI course.",
      ].join("\n\n"),
    });

    const result = await executeUniversalClinicalReasoning(prompt, { modelChatFn: mockChat });
    assert.ok(result);
    assert.ok(
      result.includes("APPROVED FOR CLINICAL DECISION SUPPORT"),
      "Stable outpatient GERD must NOT falsely fail emergency disposition gate",
    );
  });

  it("returns null gracefully when offline / modelChat returns error, and maintains cross-encounter isolation", async () => {
    const offlineChat: UniversalClinicalModelChatFn = async () => ({ error: "No live API key configured" });
    const offlineResult = await executeUniversalClinicalReasoning(
      "30-year-old male with BP 90/60 mmHg and chest pain.",
      { modelChatFn: offlineChat },
    );
    assert.equal(offlineResult, null);

    // Verify zero bleed between Encounter A and Encounter B prompts
    const promptsSeen: string[] = [];
    const trackingChat: UniversalClinicalModelChatFn = async (messages) => {
      promptsSeen.push(messages.map((m) => m.content).join("\n"));
      if (promptsSeen.length === 1) {
        return {
          text: "**Encounter ID:** `NPDE-ISO-A`\n50-year-old male BP 88/50 mmHg (MAP 62.7 mmHg), K+ 6.8 mmol/L. Target MAP >= 65 mmHg.",
        };
      }
      return {
        text: "**Encounter ID:** `NPDE-ISO-B`\n29-year-old female BP 118/74 mmHg (MAP 88.7 mmHg), K+ 3.2 mmol/L. Goal K+ 4.0 mmol/L.",
      };
    };

    const resA = await executeUniversalClinicalReasoning(
      "Encounter ID: NPDE-ISO-A\n50-year-old male BP 88/50 mmHg, K 6.8 mmol/L",
      { modelChatFn: trackingChat },
    );
    const resB = await executeUniversalClinicalReasoning(
      "Encounter ID: NPDE-ISO-B\n29-year-old female BP 118/74 mmHg, K 3.2 mmol/L",
      { modelChatFn: trackingChat },
    );

    assert.ok(resA && resA.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
    assert.ok(resB && resB.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
    assert.ok(!promptsSeen[1].includes("NPDE-ISO-A") && !promptsSeen[1].includes("6.8"));
  });

  it("handles NOCTIS-ICU-CRIT-046 table/Unicode labs with 1-shot repair and fail-closed rejection", async () => {
    const crit046Prompt = [
      "**Encounter ID:** NOCTIS-ICU-CRIT-046",
      "69-year-old female on Apixaban presents in obstructive shock with confirmed high-risk PE, acute intracranial hemorrhage with midline shift, and suspected HIT.",
      "Vitals: BP 72/44 mmHg, HR 136 bpm, SpO₂ 86% on NRB.",
      "| Test | Result |",
      "|---|---|",
      "| **Sodium (Na⁺)** | 130 mEq/L |",
      "| **Chloride (Cl⁻)** | 99 mEq/L |",
      "| **Potassium (K⁺)** | 5.4 mEq/L |",
      "| **Serum Bicarbonate (HCO₃⁻)** | 12 mEq/L |",
      "| **Creatinine** | 2.7 mg/dL (baseline 3 months ago: 1.3 mg/dL) |",
      "| **Lactate** | 9.1 mmol/L |",
      "| **Glucose** | 192 mg/dL |",
      "**ABG:** pH 7.18, PaCO₂ 30 mmHg, HCO₃⁻ 11 mEq/L",
    ].join("\n");

    // 1. Clean pass verifies single-source authoritative labs reach LLM and certificate issues cleanly
    let cleanUserPrompt = "";
    const cleanMock: UniversalClinicalModelChatFn = async (messages) => {
      cleanUserPrompt = messages[1]?.content ?? "";
      return {
        text: [
          "# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)",
          "**Encounter ID:** `NOCTIS-ICU-CRIT-046`",
          "### Critical Action: Urgent Parallel Apixaban Reversal for ICH",
          "Proceed urgently in parallel with neurosurgery, hematology, and PERT to evaluate hemostatic/Apixaban reversal alongside catheter-directed PE rescue options (systemic thrombolysis and heparin strictly prohibited).",
          "### Calculations & Labs",
          "Sodium 130 mEq/L, Chloride 99 mEq/L, Potassium 5.4 mEq/L, Serum HCO3- 12 mEq/L, ABG HCO3- 11 mEq/L, Arterial pH 7.18, measured PaCO2 30 mmHg, Lactate 9.1 mmol/L, Blood Glucose 192 mg/dL.",
          "Anion Gap = 130 - (99 + 12) = 19 mEq/L. Winter's formula using ABG HCO3- 11 mEq/L yields expected PaCO2 22.5-26.5 mmHg (measured PaCO2 30 mmHg).",
          "Creatinine 2.7 mg/dL vs baseline 1.3 mg/dL (3 months ago; fold ratio 2.08x) represents provisional KDIGO Stage 2 AKI pending acute timeframe confirmation; Stage 3 criteria are not met.",
          "### SOAP Note",
          "- Subjective: 69-year-old female on Apixaban with PE, ICH, and suspected HIT.",
          "- Objective: BP 72/44 mmHg (MAP 53.3 mmHg), HR 136 bpm, SpO2 86%, Na 130, Cl 99, K 5.4, HCO3 12 (serum) / 11 (ABG), Cr 2.7 (baseline 1.3), Lactate 9.1, Glucose 192, pH 7.18, PaCO2 30.",
          "- Assessment: High-risk PE + obstructive shock, active ICH with midline shift, suspected HIT, provisional KDIGO Stage 2 AKI, HAGMA (AG 19 mEq/L).",
          "- Plan: Target MAP >= 65 mmHg with Norepinephrine; urgent parallel Apixaban reversal evaluation; avoid heparin; non-contrast neurosurgical + PERT intervention.",
        ].join("\n\n"),
      };
    };

    const cleanOut = await executeUniversalClinicalReasoning(crit046Prompt, { modelChatFn: cleanMock });
    assert.ok(cleanOut);
    assert.match(cleanUserPrompt, /"anionGapMeqL": 19/);
    assert.match(cleanUserPrompt, /"expectedPaco2RangeLowMmHg": 22\.5/);
    assert.ok(cleanOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
    assert.ok(cleanOut.includes("Na+ 130 mmol/L") && cleanOut.includes("Cl- 99 mmol/L"));
    assert.ok(cleanOut.includes("12 mmol/L (serum) / 11 mmol/L (ABG)"));
    assert.ok(cleanOut.includes("Glucose 192 mg/dL") && cleanOut.includes("Lactate 9.1 mmol/L"));

    // 2. Validator-guided 1-shot repair catches Stage 2/3 overstaging and false AG refusal, then succeeds
    let calls = 0;
    let repairPromptSeen = "";
    const repairMock: UniversalClinicalModelChatFn = async (messages) => {
      calls += 1;
      if (calls === 1) {
        return {
          text: [
            "**Encounter ID:** `NOCTIS-ICU-CRIT-046`",
            "69-year-old female with BP 72/44 mmHg (MAP 53.3 mmHg), Stage 2/3 AKI (Cr 2.7 / baseline 1.3).",
            "Anion Gap: Cannot calculate — chloride unavailable.",
          ].join("\n"),
        };
      }
      repairPromptSeen = messages[1]?.content ?? "";
      return {
        text: [
          "**Encounter ID:** `NOCTIS-ICU-CRIT-046`",
          "69-year-old female with BP 72/44 mmHg (MAP 53.3 mmHg), Na 130, Cl 99, K 5.4, Serum HCO3 12, ABG HCO3 11, pH 7.18, PaCO2 30, Lactate 9.1, Glucose 192.",
          "Anion Gap = 19 mEq/L; Winter's expected PaCO2 22.5-26.5 mmHg.",
          "Provisional KDIGO Stage 2 AKI (2.08x baseline); Stage 3 criteria are not met.",
        ].join("\n"),
      };
    };

    const repairedOut = await executeUniversalClinicalReasoning(crit046Prompt, { modelChatFn: repairMock });
    assert.ok(repairedOut);
    assert.equal(calls, 2);
    assert.match(repairPromptSeen, /Stage 3|Anion Gap/i);
    assert.ok(repairedOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));

    // 3. Persistent documented-to-UNMEASURED or Stage 2/3 violation fails closed and suppresses certificate
    const persistentBadMock: UniversalClinicalModelChatFn = async () => ({
      text: [
        "**Encounter ID:** `NOCTIS-ICU-CRIT-046`",
        "69-year-old female with BP 72/44 mmHg (MAP 53.3 mmHg). Stage 2/3 AKI.",
        "Sodium: UNMEASURED. Chloride: UNMEASURED.",
      ].join("\n"),
    });

    const lockedOut = await executeUniversalClinicalReasoning(crit046Prompt, { modelChatFn: persistentBadMock });
    assert.ok(lockedOut);
    assert.ok(lockedOut.includes("CLINICAL_VALIDATION_FAILED — SAFETY_INVARIANT_VIOLATION"));
    assert.ok(!lockedOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
  });
});
