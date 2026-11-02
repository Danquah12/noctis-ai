import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Heart,
  ShieldAlert,
  Sparkles,
  X,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Send,
  HelpCircle,
  Thermometer,
  User,
  Clock,
  Zap,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  PatientReportedData,
  buildPatientDiagnosticReport,
  evaluateEmergencyTriage,
  computeDifferentialDiagnosis,
  generateAdaptiveQuestions,
  generateClinicianSoapNote,
  PatientDiagnosticDossier,
  DifferentialDiagnosisItem,
} from "@/lib/noctis-patient-diagnosis";

interface NoctisPatientDiagnosisModalProps {
  open: boolean;
  onClose: () => void;
  onSend?: (prompt: string) => void;
}

interface PresetScenario {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  data: Partial<PatientReportedData>;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "acs_emergency",
    name: "Crushing Chest Pain & Sweating (Possible ACS)",
    badge: "P0 EMERGENCY",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    data: {
      chiefComplaint: "Crushing central chest pressure radiating to my left arm and neck for the past 45 minutes",
      ageYears: 58,
      biologicalSex: "male",
      painQuality: "crushing",
      painSeverity: 8,
      painRadiation: "left arm and neck",
      onsetTiming: "45 minutes ago during yard work",
      associatedSymptoms: ["diaphoresis (profuse sweating)", "shortness of breath", "nausea"],
      pastMedicalHistory: ["Hypertension (High Blood Pressure)", "Tobacco Smoking History"],
      vitals: { systolicBp: 154, diastolicBp: 96, heartRate: 98, spo2: 96, temperatureC: 37.0 },
    },
  },
  {
    id: "stroke_fast",
    name: "Sudden Slurred Speech & Arm Weakness (Stroke)",
    badge: "P0 EMERGENCY",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    data: {
      chiefComplaint: "Sudden difficulty speaking, word slurring, and right arm drift starting 25 minutes ago",
      ageYears: 67,
      biologicalSex: "female",
      painQuality: "dull",
      painSeverity: 3,
      onsetTiming: "25 minutes ago while eating breakfast",
      associatedSymptoms: ["unilateral facial droop", "unilateral arm weakness", "slurred speech / aphasia"],
      pastMedicalHistory: ["Hypertension (High Blood Pressure)", "Atrial Fibrillation"],
      vitals: { systolicBp: 182, diastolicBp: 104, heartRate: 84, spo2: 97, temperatureC: 36.8 },
    },
  },
  {
    id: "pe_suspected",
    name: "Pleuritic Chest Pain after 10-Hour Flight (PE)",
    badge: "P1 URGENT ED",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    data: {
      chiefComplaint: "Sharp right-sided chest pain worse with breathing and new shortness of breath after long flight",
      ageYears: 42,
      biologicalSex: "female",
      painQuality: "sharp",
      painSeverity: 7,
      painRadiation: "none",
      onsetTiming: "2 hours ago shortly after landing",
      associatedSymptoms: ["shortness of breath", "palpitations (racing heart)", "leg / calf swelling"],
      pastMedicalHistory: ["Deep Vein Thrombosis / Prior PE"],
      vitals: { systolicBp: 110, diastolicBp: 72, heartRate: 114, spo2: 91, temperatureC: 37.2 },
    },
  },
  {
    id: "appendicitis",
    name: "RLQ Abdominal Pain & Anorexia (Appendicitis)",
    badge: "P1 URGENT ED",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    data: {
      chiefComplaint: "Severe belly pain that started around my belly button and moved to my lower right side",
      ageYears: 24,
      biologicalSex: "male",
      painQuality: "sharp",
      painSeverity: 8,
      painRadiation: "right lower quadrant",
      onsetTiming: "14 hours ago",
      associatedSymptoms: ["nausea", "vomiting", "fever"],
      pastMedicalHistory: [],
      vitals: { systolicBp: 122, diastolicBp: 78, heartRate: 94, spo2: 99, temperatureC: 38.2 },
    },
  },
  {
    id: "gerd_reflux",
    name: "Postprandial Burning Epigastric Pain (GERD)",
    badge: "P3 ROUTINE",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    data: {
      chiefComplaint: "Burning pain in the center of my upper chest and throat after eating spicy food",
      ageYears: 36,
      biologicalSex: "female",
      painQuality: "burning",
      painSeverity: 4,
      painRadiation: "throat",
      onsetTiming: "1 hour after dinner",
      associatedSymptoms: ["nausea"],
      pastMedicalHistory: [],
      vitals: { systolicBp: 118, diastolicBp: 74, heartRate: 72, spo2: 99, temperatureC: 36.6 },
    },
  },
];

const AVAILABLE_SYMPTOMS = [
  "fever",
  "chills / rigors",
  "shortness of breath",
  "diaphoresis (profuse sweating)",
  "nausea",
  "vomiting",
  "dizziness / lightheadedness",
  "syncope (loss of consciousness)",
  "palpitations (racing heart)",
  "cough",
  "sputum production",
  "hemoptysis (coughing blood)",
  "leg / calf swelling",
  "unilateral facial droop",
  "unilateral arm weakness",
  "slurred speech / aphasia",
  "stiff neck",
  "photophobia (light sensitivity)",
  "unprovoked weight loss",
  "drenching night sweats",
];

const AVAILABLE_PMH = [
  "Hypertension (High Blood Pressure)",
  "Diabetes Mellitus",
  "Coronary Artery Disease / Prior MI",
  "Atrial Fibrillation",
  "Asthma / COPD",
  "Deep Vein Thrombosis / Prior PE",
  "Active Malignancy / Cancer",
  "Tobacco Smoking History",
];

export function NoctisPatientDiagnosisModal({
  open,
  onClose,
  onSend,
}: NoctisPatientDiagnosisModalProps) {
  // Form State
  const [chiefComplaint, setChiefComplaint] = useState(
    "Crushing central chest pressure radiating to my left arm for 45 minutes"
  );
  const [ageYears, setAgeYears] = useState<number | undefined>(58);
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female" | "other">("male");
  const [painQuality, setPainQuality] = useState("crushing");
  const [painSeverity, setPainSeverity] = useState(8);
  const [painRadiation, setPainRadiation] = useState("left arm");
  const [onsetTiming, setOnsetTiming] = useState("45 minutes ago");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    "diaphoresis (profuse sweating)",
    "shortness of breath",
  ]);
  const [selectedPmh, setSelectedPmh] = useState<string[]>([
    "Hypertension (High Blood Pressure)",
  ]);

  // Vitals State
  const [vitalsEnabled, setVitalsEnabled] = useState(true);
  const [systolicBp, setSystolicBp] = useState<number | undefined>(154);
  const [diastolicBp, setDiastolicBp] = useState<number | undefined>(96);
  const [heartRate, setHeartRate] = useState<number | undefined>(98);
  const [spo2, setSpo2] = useState<number | undefined>(96);
  const [temperatureC, setTemperatureC] = useState<number | undefined>(37.0);

  // Dynamic Adaptive Responses State (User clicks Yes/No to adaptive questions)
  const [answeredAdaptiveQuestions, setAnsweredAdaptiveQuestions] = useState<
    Record<string, string>
  >({});

  const [copiedSoap, setCopiedSoap] = useState(false);
  const [activeTab, setActiveTab] = useState<"intake" | "differentials" | "adaptive" | "soap">("differentials");

  // Construct patient data object
  const patientData: PatientReportedData = useMemo(() => {
    const explicitMissing: string[] = [];
    if (!vitalsEnabled) {
      explicitMissing.push("blood_pressure", "heart_rate", "spo2", "temperature");
    }

    return {
      ageYears,
      biologicalSex,
      chiefComplaint,
      onsetTiming,
      painQuality,
      painSeverity,
      painRadiation,
      associatedSymptoms: selectedSymptoms,
      pastMedicalHistory: selectedPmh,
      currentMedications: [],
      allergies: [],
      vitals: vitalsEnabled
        ? {
            systolicBp,
            diastolicBp,
            heartRate,
            spo2,
            temperatureC,
          }
        : {},
      explicitMissingFields: explicitMissing,
    };
  }, [
    ageYears,
    biologicalSex,
    chiefComplaint,
    onsetTiming,
    painQuality,
    painSeverity,
    painRadiation,
    selectedSymptoms,
    selectedPmh,
    vitalsEnabled,
    systolicBp,
    diastolicBp,
    heartRate,
    spo2,
    temperatureC,
  ]);

  // Compute Triage & Differentials
  const triage = useMemo(() => evaluateEmergencyTriage(patientData), [patientData]);
  const { differentials, mustNotMissEmergencies } = useMemo(
    () => computeDifferentialDiagnosis(patientData),
    [patientData]
  );
  const adaptiveQuestions = useMemo(
    () => generateAdaptiveQuestions(patientData, differentials),
    [patientData, differentials]
  );
  const soapNote = useMemo(
    () => generateClinicianSoapNote(patientData, triage, differentials),
    [patientData, triage, differentials]
  );

  const loadPreset = (preset: PresetScenario) => {
    if (preset.data.chiefComplaint) setChiefComplaint(preset.data.chiefComplaint);
    if (preset.data.ageYears !== undefined) setAgeYears(preset.data.ageYears);
    if (preset.data.biologicalSex) setBiologicalSex(preset.data.biologicalSex);
    if (preset.data.painQuality) setPainQuality(preset.data.painQuality);
    if (preset.data.painSeverity !== undefined) setPainSeverity(preset.data.painSeverity);
    if (preset.data.painRadiation) setPainRadiation(preset.data.painRadiation);
    if (preset.data.onsetTiming) setOnsetTiming(preset.data.onsetTiming);
    if (preset.data.associatedSymptoms) setSelectedSymptoms(preset.data.associatedSymptoms);
    if (preset.data.pastMedicalHistory) setSelectedPmh(preset.data.pastMedicalHistory);

    if (preset.data.vitals) {
      setVitalsEnabled(true);
      setSystolicBp(preset.data.vitals.systolicBp);
      setDiastolicBp(preset.data.vitals.diastolicBp);
      setHeartRate(preset.data.vitals.heartRate);
      setSpo2(preset.data.vitals.spo2);
      setTemperatureC(preset.data.vitals.temperatureC);
    } else {
      setVitalsEnabled(false);
    }
    setAnsweredAdaptiveQuestions({});
  };

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const togglePmh = (pmh: string) => {
    setSelectedPmh((prev) =>
      prev.includes(pmh) ? prev.filter((p) => p !== pmh) : [...prev, pmh]
    );
  };

  const handleAnswerAdaptive = (qId: string, answer: string, questionText: string) => {
    setAnsweredAdaptiveQuestions((prev) => ({ ...prev, [qId]: answer }));
    if (answer === "Yes, definitely") {
      // Append finding to chief complaint / symptoms
      setChiefComplaint((prev) => `${prev} (Confirmed: ${questionText.slice(0, 50)}...)`);
    }
  };

  const copySoapToClipboard = () => {
    const text = `[S - SUBJECTIVE]\n${soapNote.subjective}\n\n[O - OBJECTIVE]\n${soapNote.objective}\n\n[A - ASSESSMENT]\n${soapNote.assessment}\n\n[P - PLAN]\n${soapNote.plan}`;
    navigator.clipboard.writeText(text);
    setCopiedSoap(true);
    setTimeout(() => setCopiedSoap(false), 2000);
  };

  const sendToChat = () => {
    if (!onSend) return;
    const prompt = `[Patient Diagnostic Intake Encounter]\nChief Complaint: ${patientData.chiefComplaint}\nAge/Sex: ${patientData.ageYears || "Unknown"}yo ${patientData.biologicalSex || "patient"}\nPain Quality/Severity: ${patientData.painQuality || "unspecified"} (${patientData.painSeverity || "unrated"}/10)\nAssociated Symptoms: ${patientData.associatedSymptoms.join(", ") || "None reported"}\nVitals: BP ${patientData.vitals.systolicBp ? `${patientData.vitals.systolicBp}/${patientData.vitals.diastolicBp}` : "Not measured"}, HR ${patientData.vitals.heartRate || "Not measured"}, SpO2 ${patientData.vitals.spo2 || "Not measured"}%\n\nPlease provide complete clinical reasoning, differential diagnosis rankings, and recommended next diagnostic workup.`;
    onSend(prompt);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  Noctis Patient Diagnostic & Triage Engine
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  FDA Jan 2026 CDS Compliant
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Evidence-weighted syndromic differential matching, emergency rule-out gate & adaptive clinical interviewer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                triage.isEmergency
                  ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                  : triage.triageCategory === "P1_URGENT_EMERGENCY_DEPT"
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {triage.isEmergency ? <AlertTriangle className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
              {triage.urgencyLabel.split("(")[0].trim()}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Scenarios Carousel */}
        <div className="px-6 py-2.5 bg-neutral-950/40 border-b border-neutral-800/80 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-neutral-500 font-medium whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Presets:
          </span>
          {PRESET_SCENARIOS.map((p) => (
            <button
              key={p.id}
              onClick={() => loadPreset(p)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-neutral-300 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span>{p.name}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border ${p.badgeColor}`}>
                {p.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Emergency P0 Lockout Banner */}
        {triage.isEmergency && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-3 text-red-200">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="flex-1 text-xs space-y-1">
              <div className="font-bold text-red-300 text-sm tracking-wide flex items-center gap-2">
                🚨 CRITICAL EMERGENCY TRIAGE DIRECTIVE (911 LOCKOUT)
              </div>
              <p className="text-red-200/90 leading-relaxed">
                {triage.escalationBanner}
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                {triage.triggeredRedFlags.map((flag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/60 border border-red-700/60 text-[11px] text-red-200 font-medium"
                  >
                    • {flag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 px-6 pt-3 bg-neutral-900/50 gap-2">
          {[
            { id: "differentials", label: "Ranked Differentials", count: differentials.length, icon: Activity },
            { id: "adaptive", label: "Adaptive Interviewer", count: adaptiveQuestions.length, icon: HelpCircle },
            { id: "intake", label: "Patient Intake & Vitals", count: null, icon: User },
            { id: "soap", label: "Clinical SOAP Dossier", count: null, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
                  isActive
                    ? "border-blue-500 text-blue-400 bg-neutral-800/60"
                    : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? "bg-blue-500/20 text-blue-300" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DIFFERENTIALS */}
          {activeTab === "differentials" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Differential Diagnosis Rankings ({differentials.length} Evaluated)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Calculated using Bayesian symptom-likelihood weights and red-flag exclusion gates
                  </p>
                </div>
                <div className="text-xs text-neutral-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Primary
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Must-Not-Miss
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-500"></span> Alternative
                </div>
              </div>

              <div className="space-y-3">
                {differentials.map((diff) => {
                  const isPrimary = diff.category === "PRIMARY_HYPOTHESIS";
                  const isMustNotMiss = diff.category === "MUST_NOT_MISS_RULEOUT";
                  return (
                    <div
                      key={diff.diseaseName}
                      className={`p-4 rounded-xl border transition-all ${
                        isPrimary
                          ? "bg-blue-950/20 border-blue-500/40 shadow-sm"
                          : isMustNotMiss
                          ? "bg-red-950/20 border-red-500/40"
                          : "bg-neutral-950/40 border-neutral-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 ${
                              isPrimary
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : isMustNotMiss
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            #{diff.rank}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-white">{diff.diseaseName}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                                {diff.icd10}
                              </span>
                              {isPrimary && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  ⭐ PRIMARY HYPOTHESIS
                                </span>
                              )}
                              {isMustNotMiss && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" /> MUST-NOT-MISS
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                              {diff.clinicalRationale}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-white">{diff.probabilityPct}%</div>
                          <span className="text-[10px] text-neutral-400">Likelihood</span>
                          <div className="w-20 bg-neutral-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isPrimary ? "bg-blue-500" : isMustNotMiss ? "bg-red-500" : "bg-neutral-500"
                              }`}
                              style={{ width: `${diff.probabilityPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic Tests & Supporting Findings */}
                      <div className="mt-3 pt-3 border-t border-neutral-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-500 font-medium block mb-1">
                            Supporting Clinical Findings:
                          </span>
                          <ul className="list-disc list-inside text-neutral-300 space-y-0.5">
                            {diff.supportingEvidence.map((ev, i) => (
                              <li key={i} className="truncate">
                                {ev}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-neutral-500 font-medium block mb-1">
                            Confirmatory Diagnostic Tests:
                          </span>
                          <ul className="list-disc list-inside text-blue-300/90 space-y-0.5">
                            {diff.goldStandardDiagnosticTests.map((t, i) => (
                              <li key={i} className="truncate">
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ADAPTIVE INTERVIEWER */}
          {activeTab === "adaptive" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Adaptive Discriminative Questions ({adaptiveQuestions.length})
                </h3>
                <p className="text-xs text-neutral-400">
                  These dynamic questions yield the highest clinical information gain to differentiate candidate conditions
                </p>
              </div>

              <div className="space-y-4">
                {adaptiveQuestions.map((aq) => {
                  const currentAnswer = answeredAdaptiveQuestions[aq.questionId];
                  return (
                    <div
                      key={aq.questionId}
                      className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/40 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Target: {aq.associatedDifferential}
                          </span>
                          <h4 className="text-sm font-medium text-white pt-1">
                            "{aq.promptText}"
                          </h4>
                          <p className="text-xs text-neutral-400">
                            <strong>Objective:</strong> {aq.clinicalObjective}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            <strong>Impact:</strong> {aq.potentialImpact}
                          </p>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {aq.options?.map((opt) => {
                          const isSelected = currentAnswer === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleAnswerAdaptive(aq.questionId, opt, aq.promptText)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                                  : "bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700 hover:text-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: INTAKE & VITALS */}
          {activeTab === "intake" && (
            <div className="space-y-6">
              {/* Chief Complaint */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300">
                  Chief Complaint (Patient Free-Text Description):
                </label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Describe your primary symptom, when it started, and how it feels..."
                />
              </div>

              {/* Patient Demographics & Onset */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-400">Age (Years):</label>
                  <input
                    type="number"
                    value={ageYears || ""}
                    onChange={(e) => setAgeYears(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 58"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400">Biological Sex:</label>
                  <select
                    value={biologicalSex}
                    onChange={(e) => setBiologicalSex(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Unspecified</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400">Onset / Timing:</label>
                  <input
                    type="text"
                    value={onsetTiming}
                    onChange={(e) => setOnsetTiming(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 45 minutes ago"
                  />
                </div>
              </div>

              {/* OPQRST: Quality & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-400">Pain Quality:</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {["crushing", "pressure", "sharp", "burning", "dull", "cramping", "tearing"].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setPainQuality(q)}
                        className={`px-2.5 py-1 rounded-md text-xs border capitalize transition-colors ${
                          painQuality === q
                            ? "bg-blue-600 text-white border-blue-500"
                            : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-400 flex justify-between">
                    <span>Severity (1–10 Scale):</span>
                    <span className="font-bold text-white">{painSeverity} / 10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={painSeverity}
                    onChange={(e) => setPainSeverity(parseInt(e.target.value, 10))}
                    className="w-full mt-2 accent-blue-500"
                  />
                </div>
              </div>

              {/* Associated Symptoms Multi-Select */}
              <div>
                <label className="text-xs font-semibold text-neutral-300">
                  Associated Symptoms (Select All Present):
                </label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {AVAILABLE_SYMPTOMS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                          isSelected
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:text-neutral-200"
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Past Medical History Multi-Select */}
              <div>
                <label className="text-xs font-semibold text-neutral-300">
                  Past Medical History (Risk Factors):
                </label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {AVAILABLE_PMH.map((pmh) => {
                    const isSelected = selectedPmh.includes(pmh);
                    return (
                      <button
                        key={pmh}
                        type="button"
                        onClick={() => togglePmh(pmh)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                          isSelected
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:text-neutral-200"
                        }`}
                      >
                        {pmh}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Objective Vitals Section */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">Objective Vital Signs</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vitalsEnabled}
                      onChange={(e) => setVitalsEnabled(e.target.checked)}
                      className="accent-blue-500 rounded"
                    />
                    <span>Vitals Measured / Available</span>
                  </label>
                </div>

                {vitalsEnabled ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] text-neutral-400">Systolic BP</span>
                      <input
                        type="number"
                        value={systolicBp || ""}
                        onChange={(e) => setSystolicBp(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        placeholder="120"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-400">Diastolic BP</span>
                      <input
                        type="number"
                        value={diastolicBp || ""}
                        onChange={(e) => setDiastolicBp(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        placeholder="80"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-400">Heart Rate (bpm)</span>
                      <input
                        type="number"
                        value={heartRate || ""}
                        onChange={(e) => setHeartRate(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        placeholder="72"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-400">SpO2 (%)</span>
                      <input
                        type="number"
                        value={spo2 || ""}
                        onChange={(e) => setSpo2(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        placeholder="98"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-400">Temp (°C)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={temperatureC || ""}
                        onChange={(e) => setTemperatureC(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="37.0"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    ℹ️ Vitals marked as unprovided. Noctis strictly enforces the zero-fabricated data rule and will not assume normal values.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CLINICAL SOAP NOTE */}
          {activeTab === "soap" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Structured Clinician SOAP Note
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Ready to hand to attending physicians, triage nurses, or export to EHR systems
                  </p>
                </div>
                <button
                  onClick={copySoapToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5"
                >
                  {copiedSoap ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSoap ? "Copied SOAP Note" : "Copy to Clipboard"}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 space-y-4 leading-relaxed">
                <div>
                  <span className="text-blue-400 font-bold block mb-1">[S - SUBJECTIVE]</span>
                  <p className="text-neutral-300">{soapNote.subjective}</p>
                </div>
                <div>
                  <span className="text-emerald-400 font-bold block mb-1">[O - OBJECTIVE]</span>
                  <pre className="text-neutral-300 whitespace-pre-wrap font-mono text-xs">{soapNote.objective}</pre>
                </div>
                <div>
                  <span className="text-amber-400 font-bold block mb-1">[A - ASSESSMENT]</span>
                  <pre className="text-neutral-300 whitespace-pre-wrap font-mono text-xs">{soapNote.assessment}</pre>
                </div>
                <div>
                  <span className="text-purple-400 font-bold block mb-1">[P - PLAN]</span>
                  <pre className="text-neutral-300 whitespace-pre-wrap font-mono text-xs">{soapNote.plan}</pre>
                </div>
              </div>

              {/* Questions for Physician */}
              {differentials[0] && differentials[0].questionsForPhysician.length > 0 && (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/20 space-y-2">
                  <h4 className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-400" /> Recommended Questions to Ask Your Physician:
                  </h4>
                  <ul className="list-disc list-inside text-xs text-neutral-300 space-y-1">
                    {differentials[0].questionsForPhysician.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs">
          <div className="text-neutral-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>CDS support only · Does not replace formal in-person clinical physician evaluation.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Close
            </button>
            {onSend && (
              <button
                onClick={sendToChat}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Discuss Case in Noctis Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
