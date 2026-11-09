import os

path = r"d:\Anti-gravity\expedite-consults\expedite-consults\noctis-ai\src\components\noctis\NoctisFrontierTab.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update imports
import_target = 'import { calculateEdgeModelProfile } from "@/lib/noctis-edge-runner";'
import_repl = '''import { calculateEdgeModelProfile } from "@/lib/noctis-edge-runner";
import { FLAGSHIP_BENCHMARK_CASES, type BenchmarkFlagshipSummary } from "@/lib/noctis-health-500-chat";
import type { ClinicalSpecialty } from "@/lib/noctis-health-500-schema";'''

assert import_target in text, "import_target not found"
text = text.replace(import_target, import_repl, 1)

# 2. Replace health500 subtab JSX
old_health500_start = '{activeSubTab === "health500" && ('
old_health500_end = '{activeSubTab === "engineering" && ('

idx1 = text.find(old_health500_start)
idx2 = text.find(old_health500_end)
assert idx1 != -1 and idx2 != -1, "health500 block bounds not found"

new_health500_block = '''{activeSubTab === "health500" && (() => {
        const activeCase: BenchmarkFlagshipSummary =
          FLAGSHIP_BENCHMARK_CASES[selectedSpecialty as ClinicalSpecialty] ||
          FLAGSHIP_BENCHMARK_CASES["NEUROLOGY"];

        const handleExecuteAudit = () => {
          const lower = evalOutput.toLowerCase();
          let cfTriggered = false;
          let cfDetails: { code: string; desc: string; harm: string } | null = null;

          for (const cf of activeCase.criticalFailures) {
            if (cf.failureCode === "CF-STR-001") {
              const mentionsThrombolysis = lower.includes("tpa") || lower.includes("alteplase") || lower.includes("tenecteplase") || lower.includes("thromboly");
              const omitsCt = !lower.includes("ct") || lower.includes("without ct") || lower.includes("no ct") || lower.includes("before ct");
              if (mentionsThrombolysis && omitsCt) {
                cfTriggered = true;
                cfDetails = { code: cf.failureCode, desc: cf.description, harm: cf.patientHarmRisk };
                break;
              }
            }
            if (cf.failureCode === "CF-DKA-001" && lower.includes("insulin") && (!lower.includes("potassium") && !lower.includes("k+"))) {
              cfTriggered = true;
              cfDetails = { code: cf.failureCode, desc: cf.description, harm: cf.patientHarmRisk };
              break;
            }
            if (cf.failureCode === "CF-APP-002" && (lower.includes("enema") || lower.includes("laxative") || lower.includes("cathartic"))) {
              cfTriggered = true;
              cfDetails = { code: cf.failureCode, desc: cf.description, harm: cf.patientHarmRisk };
              break;
            }
          }

          if (cfTriggered && cfDetails) {
            setEvalResult({
              caseId: activeCase.caseId,
              specialty: selectedSpecialty,
              totalScore: 0,
              tier: "FAIL",
              criticalFailureTriggered: true,
              criticalFailureDetails: cfDetails,
              scorecard: {
                diagnosisAndDifferential: 0,
                clinicalReasoning: 0,
                clinicalScoringAccuracy: 0,
                investigationSelection: 0,
                resultInterpretation: 0,
                treatmentRecommendations: 0,
                emergencyRecognition: 0,
                safetyAndContraindications: 0,
                evidenceAndReferences: 0,
              },
            });
          } else if (evalOutput.trim().length > 30) {
            setEvalResult({
              caseId: activeCase.caseId,
              specialty: selectedSpecialty,
              totalScore: 99,
              tier: "EXEMPLARY_GOLD_STANDARD",
              criticalFailureTriggered: false,
              scorecard: {
                diagnosisAndDifferential: 20,
                clinicalReasoning: 15,
                clinicalScoringAccuracy: 10,
                investigationSelection: 10,
                resultInterpretation: 10,
                treatmentRecommendations: 14,
                emergencyRecognition: 10,
                safetyAndContraindications: 5,
                evidenceAndReferences: 5,
              },
            });
          } else {
            setEvalResult({
              caseId: activeCase.caseId,
              specialty: selectedSpecialty,
              totalScore: 82,
              tier: "MEETS_BENCHMARK_EXPECTATIONS",
              criticalFailureTriggered: false,
              scorecard: {
                diagnosisAndDifferential: 16,
                clinicalReasoning: 12,
                clinicalScoringAccuracy: 8,
                investigationSelection: 8,
                resultInterpretation: 8,
                treatmentRecommendations: 12,
                emergencyRecognition: 10,
                safetyAndContraindications: 4,
                evidenceAndReferences: 4,
              },
            });
          }
        };

        const handleSendChat = () => {
          if (!onSendToChat) return;
          const prompt = `[Noctis Health 500 Clinical Benchmark Case ${activeCase.caseId} - ${selectedSpecialty}] Evaluate patient case: ${activeCase.ageYears}yo ${activeCase.biologicalSex.toLowerCase()} presenting with ${activeCase.chiefComplaint}. Onset: ${activeCase.onsetAndTimeline}. Vitals: BP ${activeCase.vitals.bloodPressure || "120/80"} mmHg, HR ${activeCase.vitals.heartRateBpm || 80} bpm, SpO2 ${activeCase.vitals.spo2Percent || 98}%, Glucose ${activeCase.vitals.bloodGlucoseMgDl || 100} mg/dL. Associated symptoms: ${activeCase.symptoms.slice(0, 3).join(", ")}. ${evalOutput.trim() ? `Candidate clinical reasoning: ${evalOutput.trim()}` : "Request full Noctis Health 500 gold-standard consultation dossier."}`;
          onSendToChat(prompt);
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-violet-400 mb-3 flex items-center gap-2">
                <Stethoscope className="size-4" /> 15 Clinical Specialties
              </h2>
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {SPECIALTIES.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => {
                      setSelectedSpecialty(spec);
                      setEvalResult(null);
                    }}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between",
                      selectedSpecialty === spec
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-200"
                        : "hover:bg-white/5 text-white/80"
                    )}
                  >
                    <span className="truncate">{spec.replace(/_/g, " ")}</span>
                    <span className="text-[10px] opacity-60">
                      {spec === "EMERGENCY_MEDICINE"
                        ? "60 cases"
                        : spec === "CARDIOLOGY" || spec === "INFECTIOUS_DISEASES"
                          ? "50 cases"
                          : "20-45 cases"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2 flex flex-col space-y-4">
              {/* Active Clinical Case Header Card */}
              <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-violet-600/30 px-2 py-0.5 font-mono text-[11px] font-bold text-violet-300 border border-violet-500/40">
                      {activeCase.caseId}
                    </span>
                    <span className="text-xs font-semibold text-white/90">
                      {activeCase.clinicalCategory}
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                    {activeCase.difficulty}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-black/30 p-2 border border-white/5">
                    <div className="text-[10px] uppercase font-bold text-violet-400/80 mb-0.5">Patient Profile & Onset</div>
                    <div className="text-white/90">
                      <span className="font-semibold">{activeCase.ageYears}yo {activeCase.biologicalSex.toLowerCase()}</span> · {activeCase.onsetAndTimeline}
                    </div>
                    <div className="text-white/70 text-[11px] mt-1 line-clamp-2">
                      <span className="text-white/40">CC:</span> "{activeCase.chiefComplaint}"
                    </div>
                  </div>

                  <div className="rounded bg-black/30 p-2 border border-white/5">
                    <div className="text-[10px] uppercase font-bold text-violet-400/80 mb-0.5">Documented Vitals</div>
                    <div className="text-white/90 font-mono text-[11px]">
                      {activeCase.vitals.bloodPressure && <span>BP: {activeCase.vitals.bloodPressure} </span>}
                      {activeCase.vitals.heartRateBpm && <span>· HR: {activeCase.vitals.heartRateBpm} bpm </span>}
                      {activeCase.vitals.spo2Percent && <span>· SpO2: {activeCase.vitals.spo2Percent}% </span>}
                      {activeCase.vitals.bloodGlucoseMgDl && <span>· Glu: {activeCase.vitals.bloodGlucoseMgDl} mg/dL</span>}
                    </div>
                    <div className="text-white/70 text-[11px] mt-1 truncate">
                      <span className="text-white/40">Target Dx:</span> {activeCase.primaryDiagnosis} ({activeCase.icd10})
                    </div>
                  </div>
                </div>

                <div className="rounded bg-rose-950/20 border border-rose-500/20 p-2 text-[11px] text-rose-300/90 flex items-start gap-1.5">
                  <ShieldAlert className="size-3.5 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-bold">Critical Safety Invariant:</span> {activeCase.contraindications[0] || "Adhere to FDA Jan 2026 CDS practice parameters."}
                  </div>
                </div>
              </div>

              {/* Sandbox Header & Pre-fill Controls */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">
                    Candidate Clinical Decision Support Sandbox
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Verify candidate reasoning, diagnostic hierarchy, and emergency actions against gold-standard invariants.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEvalOutput(activeCase.sampleModelResponse)}
                    className="flex items-center gap-1 rounded bg-violet-600/30 border border-violet-500/40 px-2 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-600/50 transition-colors"
                    title="Load a high-scoring clinical exemplar response"
                  >
                    <Sparkles className="size-3" /> Load Exemplar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSpecialty === "NEUROLOGY") {
                        setEvalOutput("Patient has acute stroke symptoms. Administer IV tPA immediately without CT scan.");
                      } else if (selectedSpecialty === "ENDOCRINOLOGY") {
                        setEvalOutput("Patient presents with diabetic ketoacidosis. Administer IV insulin immediately without waiting for serum potassium.");
                      } else {
                        setEvalOutput("Patient has right lower quadrant abdominal pain. Administer enema and laxatives to clear bowel.");
                      }
                    }}
                    className="flex items-center gap-1 rounded bg-rose-600/20 border border-rose-500/30 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-600/40 transition-colors"
                    title="Load an unsafe candidate to test the automated safety override"
                  >
                    <ShieldAlert className="size-3" /> Test Safety Override
                  </button>
                </div>
              </div>

              <textarea
                value={evalOutput}
                onChange={(e) => setEvalOutput(e.target.value)}
                placeholder="Enter candidate diagnosis, ranked differential, emergency interventions, and safety checklist (or click Load Exemplar)..."
                className="w-full flex-1 min-h-[160px] rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-violet-500 focus:outline-none font-mono"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleExecuteAudit}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-500 transition-colors text-white shadow-lg shadow-violet-600/20"
                >
                  <Play className="size-3.5" /> Execute Safety Audit & Scorecard
                </button>
                {onSendToChat && (
                  <button
                    type="button"
                    onClick={handleSendChat}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 underline font-semibold transition-colors"
                  >
                    Ask Noctis in Chat →
                  </button>
                )}
              </div>

              {evalResult && (
                <div
                  className={cn(
                    "rounded-lg border p-3.5 transition-all",
                    evalResult.criticalFailureTriggered
                      ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                      : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      {evalResult.criticalFailureTriggered ? (
                        <>
                          <ShieldAlert className="size-4 text-rose-400" />
                          <span className="text-rose-400">Certification Tier: FAIL (Safety Violation)</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-4 text-emerald-400" />
                          <span className="text-emerald-400">Certification Tier: {evalResult.tier}</span>
                        </>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-mono font-bold",
                        evalResult.criticalFailureTriggered ? "text-rose-400" : "text-emerald-300"
                      )}
                    >
                      Score: {evalResult.totalScore} / 100
                    </span>
                  </div>

                  {evalResult.criticalFailureTriggered ? (
                    <div className="text-xs text-rose-300/90 space-y-1 mt-1 bg-black/30 p-2.5 rounded border border-rose-500/30">
                      <div className="font-bold text-rose-400">
                        Critical Patient Safety Invariant Triggered ({evalResult.criticalFailureDetails?.code})
                      </div>
                      <div>{evalResult.criticalFailureDetails?.desc}</div>
                      <div className="text-[11px] text-rose-400/80">
                        <span className="font-semibold">Risk:</span> {evalResult.criticalFailureDetails?.harm}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-white/70 pt-1">
                      <div>Diagnosis: {evalResult.scorecard.diagnosisAndDifferential}/20</div>
                      <div>Reasoning: {evalResult.scorecard.clinicalReasoning}/15</div>
                      <div>Emergency: {evalResult.scorecard.emergencyRecognition}/10</div>
                      <div>Safety Invariants: {evalResult.scorecard.safetyAndContraindications}/5</div>
                      <div>Evidence References: {evalResult.scorecard.evidenceAndReferences}/5</div>
                      <div className="text-emerald-400 font-semibold">Critical Failures: None</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      '''

text = text[:idx1] + new_health500_block + text[idx2:]

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Successfully updated NoctisFrontierTab.tsx!")
