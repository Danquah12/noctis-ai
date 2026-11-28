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

    // 1. Clean pass verifies single-source authoritative labs reach LLM, thinkingLevel="high", <think> block present, and certificate issues cleanly
    let cleanUserPrompt = "";
    let seenThinkingLevel: string | undefined;
    const cleanMock: UniversalClinicalModelChatFn = async (messages, opts) => {
      seenThinkingLevel = opts?.thinkingLevel;
      cleanUserPrompt = messages[1]?.content ?? "";
      return {
        text: [
          "<think>",
          "Step 1: Verified Na 130, Cl 99, Serum HCO3 12, ABG HCO3 11, Cr 2.7 vs remote baseline 1.3 (3 months ago).",
          "Step 2: AG = 19, Winter's = 22.5-26.5, KDIGO Stage 2 only; parallel Apixaban reversal urgent for ICH.",
          "</think>",
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
    assert.equal(seenThinkingLevel, "high", "Clinical reasoning must invoke modelChat with thinkingLevel=high");
    assert.match(cleanOut, /^<think>[\s\S]+<\/think>/i, "Approved response must lead with <think>...</think> deliberation");
    assert.match(cleanOut, /Stage 3 Independent Validator \(NOCTIS-VAL-v2\.4-CLINICAL\)/);
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
    assert.match(repairedOut, /^<think>[\s\S]+<\/think>/i);
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

  it("handles NOCTIS-ICU-CRIT-047 end-to-end with prior Cr before current, ABG HCO3- Winter's, and zero med gap contamination", async () => {
    const crit047Prompt = [
      "**Encounter ID:** NOCTIS-ICU-CRIT-047",
      "71-year-old male (Weight: 72 kg) presents in shock (BP 68/40 mmHg, HR 128 bpm, SpO2 87%).",
      "5 days ago outpatient Creatinine: 1.4 mg/dL.",
      "Current Medications: Metformin 1000 mg BID, Lisinopril 20 mg daily.",
      "Current Labs: Na 128 mEq/L, K 5.9 mEq/L, Cl 94 mEq/L, Serum Bicarbonate 8 mEq/L, Creatinine 3.6 mg/dL.",
      "ABG: pH 7.14, PaCO2 24 mmHg, HCO3- 7 mEq/L. Urine output 100 mL over 8 hours.",
      "Clinical Question: What are the risks if an anticoagulant is considered?",
    ].join("\n");

    let userPayloadSeen = "";
    const mock047: UniversalClinicalModelChatFn = async (messages) => {
      userPayloadSeen = messages[1]?.content ?? "";
      return {
        text: [
          "<think>",
          "Verified Current Cr 3.6 vs baseline 1.4 (5 days ago; 2.57x KDIGO Stage 2), AG = 26, Winter's (ABG HCO3 7) = 16.5-20.5 mmHg.",
          "</think>",
          "**Encounter ID:** `NOCTIS-ICU-CRIT-047`",
          "71-year-old male (72 kg) in P0 shock: BP 68/40 mmHg (MAP 49.3 mmHg), HR 128 bpm, SpO2 87%.",
          "Cr 3.6 mg/dL (baseline 1.4 mg/dL 5 days ago; 2.57x ratio, +2.2 mg/dL rise = KDIGO Stage 2 AKI; Stage 3 criteria are not met).",
          "Na 128 mEq/L, K 5.9 mEq/L, Cl 94 mEq/L, Serum HCO3 8 mEq/L, ABG pH 7.14, PaCO2 24 mmHg, ABG HCO3 7 mEq/L.",
          "Anion Gap = 26 mEq/L. Winter's expected PaCO2 = 16.5-20.5 mmHg using ABG HCO3- 7; measured PaCO2 24 mmHg indicates inadequate compensation.",
          "Target MAP >= 65 mmHg with Norepinephrine.",
        ].join("\n\n"),
      };
    };

    const res047 = await executeUniversalClinicalReasoning(crit047Prompt, { modelChatFn: mock047 });
    assert.ok(res047);
    assert.match(userPayloadSeen, /"creatinineMgDl": 3\.6/);
    assert.match(userPayloadSeen, /"baselineCreatinineMgDl": 1\.4/);
    assert.match(userPayloadSeen, /"anionGapMeqL": 26/);
    assert.match(userPayloadSeen, /"expectedPaco2RangeLowMmHg": 16\.5/);
    assert.match(res047, /^<think>[\s\S]+<\/think>/i);
    assert.ok(res047.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
    assert.doesNotMatch(res047.slice(res047.indexOf("Actionable Clinical Data Gaps")), /Digoxin|Anticoagulant\/DOAC/i);
  });

  it("handles NOCTIS-ICU-CRIT-048 & CRIT-048-R1 encounter isolation, DigiFab/KDIGO clarity, data gaps, and completeness gates", async () => {
    const crit048Prompt = [
      "**Encounter ID:** NOCTIS-ICU-CRIT-048-R1",
      "73-year-old male (Weight: 79 kg) with historical LVEF 28%, current LVEF approximately 25%, and mild RV dilation.",
      "Do not introduce severe RV dilation, acute cor pulmonale, massive pulmonary embolism, or any findings from previous encounters.",
      "Current Medications: Digoxin 0.125 mg daily, Apixaban 5 mg BID.",
      "Presentation: GI hemorrhage (melena), BP 66/36 mmHg, HR 34 bpm, Temp 38.4°C, urine output 110 mL over 8 hours.",
      "Labs: Na 130 mEq/L, K 6.8 mmol/L, Cl 101 mEq/L, Serum HCO3 9 mEq/L, Creatinine 5.1 mg/dL, historical baseline 1.8 mg/dL measured six days earlier, Digoxin 3.8 ng/mL.",
      "ABG: pH 7.10, PaCO2 22 mmHg, HCO3- 9 mEq/L.",
      "Missing Clinical Data: Exact time of last digoxin dose unavailable; exact time of last apixaban dose unavailable; blood and urine cultures pending; chest radiograph unavailable; endoscopic GI bleeding source pending; response to calcium, insulin, DigiFab, vasopressors, transfusion, or dialysis unobserved.",
      "1. Emergency triage and resuscitation priorities.",
      "2. Hemodynamics (MAP 46 mmHg) and LV systolic dysfunction fluid precautions.",
      "3. Dual-pathway KDIGO AKI staging and separate urine-output evaluation.",
      "4. DigiFab formula estimate vs. empiric emergency dosing and timing caveat.",
      "5. GI hemorrhage vs. Apixaban conflict and complete SOAP note with fact-reconciliation matrix.",
    ].join("\n");

    const cleanDraft = [
      "<think>",
      "Verified 73yo male 79 kg, LVEF ~25%, mild RV dilation ONLY (NO severe RV dilation or cor pulmonale), Cr 5.1 vs 1.8 six days earlier, MAP 46, AG 20, Winter's 19.5-23.5, DigiFab 3.002 (4 vials) vs empiric 5-10 vials.",
      "</think>",
      "**Encounter ID:** `NOCTIS-ICU-CRIT-048-R1`",
      "73-year-old male (79 kg) with LVEF 28% historical / ~25% current and mild RV dilation only (severe RV dilation and acute cor pulmonale are absent).",
      "1. Emergency Triage: P0 immediate emergency for mixed shock (BP 66/36 mmHg, MAP 46.0 mmHg, HR 34 bpm, Temp 38.4°C), GI bleed, K 6.8 mmol/L, digoxin 3.8 ng/mL.",
      "2. Hemodynamics & Fluid Management: Early Norepinephrine targeting MAP >= 65 mmHg with cautious small fluid aliquots given severe LV dysfunction.",
      "3. KDIGO AKI Evaluation: Creatinine 5.1 mg/dL vs baseline 1.8 mg/dL (six days earlier) = 2.83× fold ratio (Stage 2 ratio) and >= 4.0 mg/dL acute rise (+3.3 mg/dL) within 6 days meeting Stage 3 absolute-creatinine criterion; UO 110 mL/8h = 0.174 mL/kg/h evaluated separately.",
      "4. DigiFab Dosing: Formula estimate (3.8 × 79 / 100 = 3.002 -> 4 vials) assumes post-distribution steady state; empiric emergency dosing 5–10 vials IV applies in acute life-threatening shock while 3–6 vials titrated may apply in chronic toxicity pending Medical Toxicology review.",
      "5. GI Hemorrhage vs Apixaban + Missing Data Gaps: Hold Apixaban, pursue urgent 4F-PCC/Andexanet reversal + GI endoscopy alongside pending cultures/CXR and unobserved response to calcium, insulin, DigiFab, vasopressors, transfusion, and dialysis.",
      "### Independent Fact-Reconciliation Matrix",
      "| Domain | Grounded Intake Fact | Reconciliation |",
      "|---|---|---|",
      "| Ventricular Echo | LVEF ~25%, mild RV dilation | Severe RV dilation / cor pulmonale absent |",
      "| Missing Data | Digoxin/Apixaban timing, cultures, CXR, EGD, treatment responses | Explicitly unresolved |",
      "### SOAP Note",
      "- **Subjective:** 73-year-old male with melena, severe hypotension, and digoxin/apixaban exposure.",
      "- **Objective:** BP 66/36 mmHg (MAP 46 mmHg), HR 34 bpm, Temp 38.4°C, Na 130, K 6.8, Cl 101, HCO3 9, Cr 5.1 (baseline 1.8 six days earlier), pH 7.10, PaCO2 22, Digoxin 3.8, UO 110 mL/8h (0.174 mL/kg/h).",
      "- **Assessment:** P0 shock, GI hemorrhage on Apixaban, hyperkalemia, digoxin toxicity, KDIGO Stage 3 AKI by absolute creatinine, HAGMA (AG 20 mEq/L, Winter's 19.5–23.5 mmHg).",
      "- **Plan:** Norepinephrine to target MAP >= 65 mmHg, cautious calcium gluconate + insulin/dextrose, DigiFab + toxicology consult, Apixaban reversal + urgent endoscopy, pending cultures/CXR.",
    ].join("\n\n");

    let seenMaxTokens: number | undefined;
    let seenUserPayload = "";
    const cleanMock: UniversalClinicalModelChatFn = async (messages, opts) => {
      seenMaxTokens = opts?.maxTokens;
      seenUserPayload = messages[1]?.content ?? "";
      return { text: cleanDraft };
    };

    const cleanOut = await executeUniversalClinicalReasoning(crit048Prompt, { modelChatFn: cleanMock });
    assert.ok(cleanOut);
    assert.equal(seenMaxTokens, 12000);
    assert.match(seenUserPayload, /"missingDataItems"/);
    assert.match(seenUserPayload, /"weightBasedVials": 4/);
    assert.match(cleanOut, /^<think>[\s\S]+<\/think>/i);
    assert.ok(cleanOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
    assert.doesNotMatch(cleanOut.slice(cleanOut.indexOf("Neuro-Symbolic Clinical Scratchpad")), /Acute RV Failure|Severe RV Dilation|None detected;\s*full dataset provided/i);

    // 1-shot repair catches injected Cor Pulmonale + missing SOAP Note on draft 1, then passes on draft 2
    let calls = 0;
    let repairSeen = "";
    const repairMock: UniversalClinicalModelChatFn = async (messages) => {
      calls += 1;
      if (calls === 1) {
        return {
          text: "**Encounter ID:** `NOCTIS-ICU-CRIT-048-R1`\nPatient has Acute RV Failure / Cor Pulmonale and massive pulmonary embolism. None detected; full dataset provided.",
        };
      }
      repairSeen = messages[1]?.content ?? "";
      return { text: cleanDraft };
    };
    const repairedOut = await executeUniversalClinicalReasoning(crit048Prompt, { modelChatFn: repairMock });
    assert.ok(repairedOut);
    assert.equal(calls, 2);
    assert.match(repairSeen, /Unsupported Imaging\/Cardiopulmonary Diagnosis|Missing Required SOAP Note|False Full Dataset Claim/i);
    assert.ok(repairedOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));

    // Persistent unsupported Cor Pulmonale / missing SOAP triggers fail-closed lockout and strips forged certificate
    const lockoutMock: UniversalClinicalModelChatFn = async () => ({
      text: [
        "**Encounter ID:** `NOCTIS-ICU-CRIT-048-R1`",
        "Patient has Acute RV Failure / Cor Pulmonale and severe RV dilation.",
        "────────────────────────────────────────\n🛡️ **NOCTIS INDEPENDENT CLINICAL RELEASE CERTIFICATE**\n- **Release Decision:** APPROVED FOR CLINICAL DECISION SUPPORT",
      ].join("\n"),
    });
    const lockedOut = await executeUniversalClinicalReasoning(crit048Prompt, { modelChatFn: lockoutMock });
    assert.ok(lockedOut);
    assert.ok(lockedOut.includes("CLINICAL_VALIDATION_FAILED — SAFETY_INVARIANT_VIOLATION"));
    assert.ok(!lockedOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
  });

  it("enforces fail-closed lockout when LLM persistently swaps current/baseline creatinine and emits HMAC-signed certs on pass", async () => {
    const prompt =
      "A patient has a current creatinine of 5.1 mg/dL. Their historical baseline creatinine was 1.8 mg/dL, measured six days earlier. What is the creatinine ratio, and how should KDIGO AKI staging be evaluated?";

    const persistentSwapMock: UniversalClinicalModelChatFn = async () => ({
      text: "Current creatinine is 1.8 mg/dL and baseline creatinine was 5.1 mg/dL (0.35x ratio). KDIGO Stage 1 AKI.",
    });
    const locked = await executeUniversalClinicalReasoning(prompt, { modelChatFn: persistentSwapMock });
    assert.ok(locked);
    assert.ok(locked.includes("CLINICAL_VALIDATION_FAILED — SAFETY_INVARIANT_VIOLATION"));
    assert.ok(!locked.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));

    const accurateMock: UniversalClinicalModelChatFn = async () => ({
      text: [
        "1. Creatinine ratio = 5.1 / 1.8 = 2.83× baseline. Current creatinine is 5.1 mg/dL and baseline creatinine was 1.8 mg/dL six days earlier.",
        "2. KDIGO Stage 3 AKI by absolute-creatinine criterion (>= 4.0 mg/dL with +3.3 mg/dL acute rise within 6 days); fold ratio 2.83× alone is in Stage 2 range.",
        "### Missing Clinical Data Gaps\n- Body weight [UNMEASURED], serum chloride [UNMEASURED], ABG [UNMEASURED], urine output [UNMEASURED].",
        "### Independent Fact-Reconciliation Matrix\n| Item | Intake |\n|---|---|\n| Cr | 5.1 (baseline 1.8 six days earlier) |",
        "### SOAP Note\n- Subjective: Renal assessment.\n- Objective: Cr 5.1 mg/dL, baseline 1.8 mg/dL.\n- Assessment: KDIGO Stage 3 AKI.\n- Plan: Urgent nephrology evaluation; weight/Cl-/ABG/UO acquisition.",
      ].join("\n\n"),
    });
    const signed = await executeUniversalClinicalReasoning(prompt, { modelChatFn: accurateMock });
    assert.ok(signed);
    assert.ok(signed.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
    assert.match(signed, /Output Hash \(SHA-256\):\*\* `[a-f0-9]{64}`/i);
    assert.match(signed, /Certificate Signature \(HMAC-SHA256\):\*\* `[a-f0-9]{64}`/i);
  });

  it("sanitizes raw LaTeX and table <br/> tags in clinical dossiers before certificate signing", async () => {
    const prompt =
      "A 68-year-old male (175 cm tall, actual body weight 118 kg) with severe ARDS (PaO2/FiO2 88) and septic shock has K+ 7.1 mEq/L, HR 32 bpm, BP 74/42 mmHg, and peaked T waves on ECG. Audit every order immediately.";

    const rawLatexDraft = [
      "# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)",
      "**Triage Urgency:** P0 IMMEDIATE EMERGENCY",
      "68-year-old male (175 cm, 118 kg) with BP 74/42 mmHg (MAP 52.7 mmHg), HR 32 bpm, K+ 7.1 mmol/L, and severe ARDS (PaO2/FiO2 88).",
      "$$\\text{PBW} = 50 + 0.91 \\times (175 - 152.4) \\approx 70.6\\text{ kg}$$",
      "Size tidal volume to 424 mL using PBW $\\approx$ 70.6 kg, maintain MAP $\\ge$ 65 mmHg with norepinephrine, consider prone positioning when P/F $< 150$, administer IV calcium before regular insulin with point-of-care glucose checks, maintain epinephrine and transcutaneous pacing standby, and verify deep sedation before cisatracurium.",
      "### Missing Clinical Data Gaps\n- Serum chloride [UNMEASURED], baseline creatinine [UNMEASURED], ABG pH/PaCO2 [UNMEASURED], lactate [UNMEASURED], glucose [UNMEASURED], urine output [UNMEASURED].",
      "### Independent Fact-Reconciliation Matrix\n| Parameter | Value |\n|---|---|\n| TV | 708 mL<br/>Unsafe |",
      "### SOAP Note\n- Subjective: Acute ICU resuscitation.\n- Objective: 118 kg, 175 cm, BP 74/42 mmHg (MAP 52.7 mmHg), HR 32 bpm, K+ 7.1 mmol/L.\n- Assessment: Septic shock, severe ARDS, critical hyperkalemia.\n- Plan: IV calcium first, norepinephrine target MAP ≥ 65 mmHg, TV ~424 mL, verify sedation prior to cisatracurium.",
    ].join("\n\n");

    const mockChat: UniversalClinicalModelChatFn = async () => ({ text: rawLatexDraft });
    const out = await executeUniversalClinicalReasoning(prompt, { modelChatFn: mockChat });
    assert.ok(out);
    assert.ok(out.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
    const visible = out.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    assert.ok(!visible.includes("$$"));
    assert.ok(!visible.includes("\\text{"));
    assert.ok(!visible.includes("$\\"));
    assert.ok(!visible.includes("$<"));
    assert.ok(!visible.includes("<br"));
    assert.ok(!visible.includes("$"), `Expected zero raw '$' in sanitized output:\n${visible}`);
    assert.ok(visible.includes("`PBW = 50 + 0.91 × (175 - 152.4) ≈ 70.6 kg`"));
    assert.ok(visible.includes("708 mL · Unsafe"));
    assert.ok(visible.includes("MAP ≥ 65 mmHg"));
    assert.ok(visible.includes("P/F < 150"));
  });

  it("does not trigger false Narrative-vs-Scratchpad Chloride/Bicarbonate/Glucose lockouts on Calcium Chloride, Sodium Bicarbonate, or glucose targets while still locking out fabricated serum Cl-", async () => {
    const prompt =
      "A 68-year-old male (175 cm tall, actual body weight 118 kg) with severe ARDS (PaO2/FiO2 88) and septic shock has K+ 7.1 mEq/L, HR 32 bpm, BP 74/42 mmHg, and peaked T waves on ECG. Audit every order immediately.";

    const safeMedicationSaltsDraft = [
      "# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)",
      "**Triage Urgency:** P0 IMMEDIATE EMERGENCY",
      "68-year-old male (175 cm, 118 kg) with BP 74/42 mmHg (MAP 52.7 mmHg), HR 32 bpm, K+ 7.1 mmol/L, severe ARDS (PaO2/FiO2 88).",
      "Immediately administer IV Calcium Gluconate (1–2 g) or Calcium Chloride 10% (500–1000 mg IV over 2–5 minutes). Consider Sodium Bicarbonate 50 mEq IV only if acidemia is confirmed, give balanced crystalloids or 0.9% Sodium Chloride cautiously in small aliquots alongside early norepinephrine (target MAP ≥ 65 mmHg), check point-of-care blood glucose every 30 min (give D50W unless glucose 250 mg/dL), size tidal volume to 424 mL (6 mL/kg PBW 70.6 kg), and verify deep sedation prior to cisatracurium.",
      "### Missing Clinical Data Gaps\n- Serum chloride [UNMEASURED], serum bicarbonate [UNMEASURED], creatinine [UNMEASURED], ABG [UNMEASURED], lactate [UNMEASURED], glucose [UNMEASURED], urine output [UNMEASURED].",
      "### Independent Fact-Reconciliation Matrix\n| Parameter | Status |\n|---|---|\n| Electrolytes | K+ 7.1 mmol/L; Cl- [UNMEASURED]; HCO3- [UNMEASURED] |",
      "### SOAP Note\n- Subjective: ICU emergency.\n- Objective: 118 kg, 175 cm, BP 74/42 mmHg (MAP 52.7 mmHg), HR 32 bpm, K+ 7.1 mmol/L.\n- Assessment: Septic shock, severe ARDS, critical hyperkalemia.\n- Plan: IV Calcium Chloride 10% (500–1000 mg) or Calcium Gluconate first, norepinephrine, tidal volume 424 mL, verify deep sedation before cisatracurium.",
    ].join("\n\n");

    const approvedOut = await executeUniversalClinicalReasoning(prompt, {
      modelChatFn: async () => ({ text: safeMedicationSaltsDraft }),
    });
    assert.ok(approvedOut);
    assert.ok(
      approvedOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"),
      `Expected approval despite Calcium Chloride / Sodium Bicarbonate / glucose monitoring text, got:\n${approvedOut}`,
    );

    const fabricatedChlorideDraft = [
      "# Noctis Patient Diagnostic & Triage Intelligence Dossier (Clinical Decision Support)",
      "68-year-old male (175 cm, 118 kg) with BP 74/42 mmHg (MAP 52.7 mmHg), HR 32 bpm, K+ 7.1 mmol/L.",
      "Serum chloride is 98 mmol/L, giving a normal anion gap.",
      "### Missing Clinical Data Gaps\n- Serum creatinine [UNMEASURED].",
      "### Independent Fact-Reconciliation Matrix\n| Parameter | Value |\n|---|---|\n| Cl- | 98 mmol/L |",
      "### SOAP Note\n- Subjective: ICU.\n- Objective: K+ 7.1, Cl- 98.\n- Assessment: Shock.\n- Plan: Treat.",
    ].join("\n\n");

    const lockedOut = await executeUniversalClinicalReasoning(prompt, {
      modelChatFn: async () => ({ text: fabricatedChlorideDraft }),
    });
    assert.ok(lockedOut);
    assert.ok(lockedOut.includes("CLINICAL_VALIDATION_FAILED — SAFETY_INVARIANT_VIOLATION"));
    assert.ok(!lockedOut.includes("APPROVED FOR CLINICAL DECISION SUPPORT"));
  });
});
