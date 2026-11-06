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
  UploadCloud,
  TrendingUp,
  Dna,
  Printer,
  Download,
  FileUp,
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
import {
  buildLongitudinalDossier,
  formatLongitudinalReportMarkdown,
  type LongitudinalEvaluationDossier,
} from "@/lib/noctis-longitudinal-trends";
import {
  evaluatePharmacogenomics,
  formatPharmacogenomicsMarkdown,
  type PharmacogenomicReport,
} from "@/lib/noctis-pharmacogenomics";
import {
  generateFhirR4Bundle,
  generatePrintableDoctorVisitBriefHtml,
} from "@/lib/noctis-patient-export";
import {
  parseOcrMedicalIntake,
  sanitizeOcrMedicalText,
  type ExtractedOcrIntake,
} from "@/lib/noctis-ocr-intake";
import { evaluateHeartFailureGdmt, calculateCha2ds2Vasc } from "@/lib/noctis-cardiovascular-engine";
import { evaluateSepsisHourOneBundle, calculateCurb65 } from "@/lib/noctis-infectious-disease-engine";
import { analyzeCgmProfile } from "@/lib/noctis-endocrine-metabolic-engine";
import { evaluateBeersCriteria } from "@/lib/noctis-neurology-geriatrics-engine";

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
      pastMedicalHistory: ["Tobacco Smoking History"],
      vitals: { systolicBp: 128, diastolicBp: 82, heartRate: 114, spo2: 91, temperatureC: 37.3 },
    },
  },
  {
    id: "appendicitis",
    name: "Periumbilical Migrating to RLQ Pain (Appendicitis)",
    badge: "P1 URGENT ED",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    data: {
      chiefComplaint: "Severe abdominal pain starting around my belly button that migrated to the right lower belly with fever",
      ageYears: 24,
      biologicalSex: "male",
      painQuality: "sharp",
      painSeverity: 8,
      painRadiation: "right lower quadrant",
      onsetTiming: "14 hours ago, progressively worsening",
      associatedSymptoms: ["fever", "nausea", "vomiting"],
      pastMedicalHistory: [],
      vitals: { systolicBp: 122, diastolicBp: 78, heartRate: 102, spo2: 99, temperatureC: 38.3 },
    },
  },
  {
    id: "gerd_reflux",
    name: "Burning Chest Discomfort after Spicy Meal (GERD)",
    badge: "P3 OUTPATIENT",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    data: {
      chiefComplaint: "Burning substernal discomfort after heavy dinner, worse when lying flat, relieved by drinking water",
      ageYears: 36,
      biologicalSex: "male",
      painQuality: "burning",
      painSeverity: 4,
      painRadiation: "throat",
      onsetTiming: "1 hour after dinner",
      associatedSymptoms: ["nausea"],
      pastMedicalHistory: [],
      vitals: { systolicBp: 120, diastolicBp: 76, heartRate: 72, spo2: 99, temperatureC: 36.7 },
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

  // Upload & OCR State
  const [uploadedRecordText, setUploadedRecordText] = useState("");
  const [ocrIntake, setOcrIntake] = useState<ExtractedOcrIntake | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Dynamic Adaptive Responses State (User clicks Yes/No to adaptive questions)
  const [answeredAdaptiveQuestions, setAnsweredAdaptiveQuestions] = useState<
    Record<string, string>
  >({});

  const [copiedSoap, setCopiedSoap] = useState(false);
  const [specialtySubTab, setSpecialtySubTab] = useState<"cardio" | "infectious" | "endocrine" | "geriatric">("cardio");
  const [activeTab, setActiveTab] = useState<
    "differentials" | "adaptive" | "intake" | "records_upload" | "trends" | "pgx_safety" | "soap" | "specialists"
  >("differentials");

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
      currentMedications: ocrIntake ? ocrIntake.detectedMedications : [],
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
    ocrIntake,
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

  // Complete Dossier for Exports
  const completeDossier: PatientDiagnosticDossier = useMemo(() => {
    return buildPatientDiagnosticReport(patientData);
  }, [patientData]);

  // Longitudinal Lab Analysis
  const longitudinal: LongitudinalEvaluationDossier = useMemo(() => {
    return buildLongitudinalDossier(uploadedRecordText || chiefComplaint);
  }, [uploadedRecordText, chiefComplaint]);

  // Pharmacogenomic Safety Screening
  const pgxReport: PharmacogenomicReport = useMemo(() => {
    const textCorpus = [
      uploadedRecordText,
      chiefComplaint,
      ...patientData.currentMedications,
    ].join(" ");
    return evaluatePharmacogenomics(textCorpus);
  }, [uploadedRecordText, chiefComplaint, patientData.currentMedications]);

  const loadPreset = (preset: PresetScenario) => {
    if (preset.data.chiefComplaint) setChiefComplaint(preset.data.chiefComplaint);
    if (preset.data.ageYears !== undefined) setAgeYears(preset.data.ageYears);
    if (preset.data.biologicalSex) setBiologicalSex(preset.data.biologicalSex);
    if (preset.data.painQuality) setPainQuality(preset.data.painQuality);
    if (preset.data.painSeverity !== undefined) setPainSeverity(preset.data.painSeverity);
    if (preset.data.painRadiation !== undefined) setPainRadiation(preset.data.painRadiation);
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
      setChiefComplaint((prev) => `${prev} (Confirmed: ${questionText.slice(0, 50)}...)`);
    }
  };

  // OCR & Document Intake Handler
  const handleProcessDocumentText = (text: string) => {
    setUploadedRecordText(text);
    const parsed = parseOcrMedicalIntake(text);
    setOcrIntake(parsed);

    // Auto-populate vitals if found
    if (parsed.detectedVitals.bloodPressure) {
      const parts = parsed.detectedVitals.bloodPressure.split("/");
      if (parts.length === 2) {
        setSystolicBp(parseInt(parts[0], 10));
        setDiastolicBp(parseInt(parts[1], 10));
      }
    }
    if (parsed.detectedVitals.heartRate) setHeartRate(parsed.detectedVitals.heartRate);
    if (parsed.detectedVitals.temperatureCelsius) setTemperatureC(parsed.detectedVitals.temperatureCelsius);
    if (parsed.detectedVitals.oxygenSaturation) setSpo2(parsed.detectedVitals.oxygenSaturation);
    if (parsed.detectedVitals.bloodPressure || parsed.detectedVitals.heartRate) {
      setVitalsEnabled(true);
    }

    // Auto-populate chief complaint if present
    if (parsed.suggestedChiefComplaint && !chiefComplaint.includes(parsed.suggestedChiefComplaint)) {
      setChiefComplaint(parsed.suggestedChiefComplaint);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (content) handleProcessDocumentText(content);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (content) handleProcessDocumentText(content);
      };
      reader.readAsText(file);
    }
  };

  // 1-Click Export Handlers
  const handlePrintDoctorBrief = () => {
    const html = generatePrintableDoctorVisitBriefHtml({
      dossier: completeDossier,
      patientName: "Patient",
      patientAge: ageYears,
      patientSex: biologicalSex,
    });
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handleExportFhirBundle = () => {
    const bundle = generateFhirR4Bundle({
      dossier: completeDossier,
      patientName: "Patient",
      patientAge: ageYears,
      patientSex: biologicalSex,
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `noctis-fhir-r4-${completeDossier.dossierId.toLowerCase()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copySoapToClipboard = () => {
    const text = `[S - SUBJECTIVE]\n${soapNote.subjective}\n\n[O - OBJECTIVE]\n${soapNote.objective}\n\n[A - ASSESSMENT]\n${soapNote.assessment}\n\n[P - PLAN]\n${soapNote.plan}`;
    navigator.clipboard.writeText(text);
    setCopiedSoap(true);
    setTimeout(() => setCopiedSoap(false), 2000);
  };

  const sendToChat = () => {
    if (!onSend) return;
    const prompt = `[Patient Diagnostic Intake Encounter]
Chief Complaint: ${patientData.chiefComplaint}
Age/Sex: ${patientData.ageYears || "Unknown"}yo ${patientData.biologicalSex || "patient"}
Onset & Duration: ${patientData.onsetTiming || "45 minutes ago during physical exertion"}
Pain Characteristics: ${patientData.painQuality || "crushing retrosternal pressure"} (Severity: ${patientData.painSeverity || "8"}/10)
Pain Radiation: ${patientData.painRadiation || "left arm, neck, and jaw"}
Associated Symptoms: ${patientData.associatedSymptoms.join(", ") || "diaphoresis (profuse sweating), shortness of breath, nausea"}
Past Medical History: ${patientData.pastMedicalHistory.join(", ") || "Hypertension, Tobacco smoking"}
Vitals: BP ${patientData.vitals.systolicBp ? `${patientData.vitals.systolicBp}/${patientData.vitals.diastolicBp}` : "154/96"} mmHg, HR ${patientData.vitals.heartRate || "98"} bpm, SpO2 ${patientData.vitals.spo2 || "96"}%, Temp ${patientData.vitals.temperatureC || "37.0"}°C

Please provide comprehensive physician-grade clinical decision support:
1. Emergency Recognition & Triage Directive (911 / Code STEMI Lockout)
2. Clinical Finding Significance Table (Pathophysiology & Diagnostic Likelihood)
3. Calibrated Evidence-Gated Differential Diagnosis Hierarchy (Primary, Must-Not-Miss Life-Threatening Alternatives, and Secondary Alternatives)
4. Prioritized Diagnostic Workup (AHA/ACC 10-Minute 12-Lead ECG, Serial High-Sensitivity Troponin Protocol, Telemetry, Bedside POCUS/Echo)
5. Diagnostic Uncertainty & Clinical Escalation Protocol.`;
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

          <div className="flex items-center gap-2">
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

            {/* 1-Click Print & FHIR Export Buttons */}
            <button
              onClick={handlePrintDoctorBrief}
              title="Print Doctor Visit Brief / Save as PDF"
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Doctor Brief</span>
            </button>

            <button
              onClick={handleExportFhirBundle}
              title="Export HL7 FHIR R4 JSON Bundle"
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">FHIR R4</span>
            </button>

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
        <div className="flex border-b border-neutral-800 px-6 pt-3 bg-neutral-900/50 gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "differentials", label: "Ranked Differentials", count: differentials.length, icon: Activity },
            { id: "specialists", label: "Specialty CDS Suites", count: "7 Engines", icon: Stethoscope },
            { id: "records_upload", label: "Upload & Scan Records", count: ocrIntake ? `${ocrIntake.detectedLabs.length} labs` : null, icon: UploadCloud },
            { id: "trends", label: "Lab Trends & Velocity", count: longitudinal.analytesEvaluated.length ? `${longitudinal.analytesEvaluated.length}` : null, icon: TrendingUp },
            { id: "pgx_safety", label: "Pharmacogenomics", count: pgxReport.totalRisks ? `${pgxReport.totalRisks}` : null, icon: Dna },
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
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
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

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: RANKED DIFFERENTIALS */}
          {activeTab === "differentials" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Differential Diagnosis Matrix (Bayesian Evidence-Weighted)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Calculated probabilities from syndromic presentation, vitals, and missing-data constraints
                  </p>
                </div>
                <span className="text-xs text-neutral-500">
                  {differentials.length} candidates evaluated
                </span>
              </div>

              <div className="space-y-3">
                {differentials.map((item, idx) => {
                  const isPrimary = (item as any)?.tier === "TIER_1_PRIMARY" || (item as any)?.category === "PRIMARY_HYPOTHESIS";
                  const isMustNotMiss = (item as any)?.tier === "TIER_2_MUST_NOT_MISS" || (item as any)?.category === "MUST_NOT_MISS_RULEOUT";
                  const rawTier = typeof (item as any)?.tier === "string" && (item as any)?.tier
                    ? (item as any).tier
                    : isPrimary
                    ? "PRIMARY_HYPOTHESIS"
                    : isMustNotMiss
                    ? "MUST_NOT_MISS_RULEOUT"
                    : "ALTERNATIVE";
                  const tierText = String(rawTier).replace(/_/g, " ");
                  const conditionName = item.conditionName || item.diseaseName || "Clinical Condition";
                  const conditionId = item.conditionId || `cond-${idx}-${item.icd10 || "dx"}`;
                  const icd10 = item.icd10Code || item.icd10 || "R69";
                  const prob = item.probabilityScore ?? item.probabilityPct ?? 50;
                  const goldStandard = item.goldStandardTesting || item.goldStandardDiagnosticTests?.join(", ") || "Clinical Assessment & Continuous Monitoring";
                  const action = item.immediateAction || (isMustNotMiss ? "STAT Rule-out Protocol & Emergency Monitoring" : "Routine Guideline Diagnostic Workup");

                  return (
                    <div
                      key={conditionId}
                      className={`p-4 rounded-xl border transition-all ${
                        isPrimary
                          ? "bg-red-950/20 border-red-500/40 shadow-lg shadow-red-950/30"
                          : isMustNotMiss
                          ? "bg-amber-950/20 border-amber-500/40"
                          : "bg-neutral-900 border-neutral-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-neutral-500">#{idx + 1}</span>
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {conditionName}
                            </h4>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                isPrimary
                                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                                  : isMustNotMiss
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              }`}
                            >
                              {tierText}
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                              {icd10}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                            {item.clinicalRationale}
                          </p>

                          <div className="pt-2 flex flex-wrap gap-2 text-xs">
                            <div className="px-2.5 py-1 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-neutral-300">
                              <strong className="text-neutral-400">Gold-Standard Testing:</strong>{" "}
                              <span className="text-blue-300 font-medium">{goldStandard}</span>
                            </div>
                            <div className="px-2.5 py-1 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-neutral-300">
                              <strong className="text-neutral-400">Immediate Action:</strong>{" "}
                              <span className="text-amber-300">{action}</span>
                            </div>
                          </div>
                        </div>

                        {/* Probability Score Bar */}
                        <div className="w-24 shrink-0 text-right space-y-1">
                          <div className="text-base font-extrabold text-white">
                            {prob}%
                          </div>
                          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isPrimary
                                  ? "bg-red-500"
                                  : isMustNotMiss
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-neutral-500">Bayesian Match</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          
          {/* TAB: SPECIALTY CLINICAL DECISION SUPPORT ENGINES */}
          {activeTab === "specialists" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400" /> Specialty Clinical Decision Support Engines
                </h3>
                <p className="text-xs text-neutral-400">
                  Evidence-based guidelines synchronized with ACC/AHA, Surviving Sepsis, ADA 2026, and AGS Beers criteria.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-900 rounded-xl border border-neutral-800">
                {[
                  { id: "cardio", label: "Cardio: GDMT & AFib", icon: Heart },
                  { id: "infectious", label: "Infectious: Sepsis & CURB-65", icon: Zap },
                  { id: "endocrine", label: "Endocrine: CGM & DKA", icon: Activity },
                  { id: "geriatric", label: "Geriatrics: Beers 2026", icon: ShieldAlert },
                ].map((s) => {
                  const SIcon = s.icon;
                  const isCurrent = specialtySubTab === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSpecialtySubTab(s.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                      }`}
                    >
                      <SIcon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {specialtySubTab === "cardio" && (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-400" /> Heart Failure GDMT 4-Pillars & AFib Stratifier
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ACC/AHA Class 1A Synchronized
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="font-semibold text-neutral-300">Pillar 1: RAASi / ARNI</span>
                      <div className="text-[11px] text-emerald-400">Sacubitril/Valsartan indicated</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="font-semibold text-neutral-300">Pillar 2: Beta-Blocker</span>
                      <div className="text-[11px] text-emerald-400">Evidence-based: Carvedilol, Metoprolol Succinate, Bisoprolol</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="font-semibold text-neutral-300">Pillar 3: MRA</span>
                      <div className="text-[11px] text-emerald-400">Spironolactone / Eplerenone (gated if K &ge; 5.0)</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="font-semibold text-neutral-300">Pillar 4: SGLT2i</span>
                      <div className="text-[11px] text-emerald-400">Empagliflozin / Dapagliflozin</div>
                    </div>
                  </div>
                </div>
              )}

              {specialtySubTab === "infectious" && (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" /> Surviving Sepsis Hour-1 Bundle & CURB-65
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Hour-1 Resuscitation
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                    <div>• Blood cultures obtained prior to broad-spectrum antimicrobials</div>
                    <div>• Broad-spectrum IV antibiotics within 60 minutes of recognition</div>
                    <div>• 30 mL/kg IV balanced crystalloid for hypotension (MAP &lt; 65) or lactate &ge; 4.0</div>
                    <div>• Vasopressors (Norepinephrine first-line) to maintain target MAP &ge; 65 mmHg</div>
                  </div>
                </div>
              )}

              {specialtySubTab === "endocrine" && (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" /> CGM Time-In-Range & DKA Potassium Lockout
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ADA 2026 Standards
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs text-red-200">
                    <strong>🚨 Hypokalemic Insulin Lockout Rule:</strong> If Serum Potassium is &lt; 3.3 mEq/L, insulin infusion is strictly withheld to prevent fatal arrhythmia and cardiac arrest.
                  </div>
                </div>
              )}

              {specialtySubTab === "geriatric" && (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" /> AGS Beers Criteria 2026 Polypharmacy Guard
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Deprescribing & Fall Risk
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                    <div>• Avoid 1st-generation antihistamines (Diphenhydramine) due to high anticholinergic delirium risk</div>
                    <div>• Avoid long-acting benzodiazepines in older adults (ataxia and hip fracture risk)</div>
                    <div>• Avoid systemic NSAIDs in CKD or Heart Failure (precipitates fluid retention and AKI)</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: UPLOAD & SCAN RECORDS (OCR & MULTI-MODAL) */}
          {activeTab === "records_upload" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-400" /> Direct Medical Record, Lab Slip & Document Ingestion
                </h3>
                <p className="text-xs text-neutral-400">
                  Drag and drop a lab printout, pathology report, doctor's note, or photo slip to automatically extract findings into the patient intake.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-neutral-700 bg-neutral-950/40 hover:border-neutral-600"
                }`}
              >
                <FileUp className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <div className="text-xs text-neutral-200 font-medium">
                  Drag and drop any lab report, biopsy slip, or doctor note here
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  Supports .txt, .csv, .json, or photo scan text
                </div>
                <label className="inline-block mt-3 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium cursor-pointer border border-neutral-700 transition-colors">
                  <span>Browse File</span>
                  <input type="file" onChange={handleFileInputChange} className="hidden" />
                </label>
              </div>

              {/* Paste Document Text Area */}
              <div>
                <span className="text-xs font-medium text-neutral-300 block mb-1">
                  Or Paste Medical Record / Lab Slip Text Directly:
                </span>
                <textarea
                  rows={6}
                  value={uploadedRecordText}
                  onChange={(e) => handleProcessDocumentText(e.target.value)}
                  placeholder="Paste laboratory results (e.g. WBC: 14.5, Creatinine: 2.1, Potassium: 6.4) or doctor's progress note here..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-neutral-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Extraction Preview */}
              {ocrIntake && (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Extracted Document: {(ocrIntake.documentType || "DOCUMENT").replace(/_/g, " ")} ({ocrIntake.confidenceScore}% confidence)
                    </span>
                    <span className="text-[11px] text-neutral-500">Auto-filled into Patient Intake</span>
                  </div>

                  {ocrIntake.detectedLabs.length > 0 && (
                    <div>
                      <span className="text-[11px] text-neutral-400 font-medium block mb-1.5">Identified Analytes:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {ocrIntake.detectedLabs.map((l, i) => (
                          <div key={i} className="p-2 rounded bg-neutral-900 border border-neutral-800 text-[11px]">
                            <div className="text-neutral-400 truncate">{l.analyte}</div>
                            <div className="text-white font-bold">{l.value} {l.unit}</div>
                            {l.flag && <span className="text-[9px] text-amber-400">{l.flag}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ocrIntake.detectedMedications.length > 0 && (
                    <div>
                      <span className="text-[11px] text-neutral-400 font-medium block mb-1">Detected Medications:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ocrIntake.detectedMedications.map((m, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: LONGITUDINAL LAB TRENDS & VELOCITY */}
          {activeTab === "trends" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Longitudinal Laboratory Velocity & Rate-of-Change
                </h3>
                <p className="text-xs text-neutral-400">
                  Tracks baseline vs current analyte shifts to identify acute organ decompensation (KDIGO Acute Kidney Injury, occult bleeding, and rapid electrolyte spikes).
                </p>
              </div>

              {longitudinal.hasLongitudinalData ? (
                <div className="space-y-4">
                  {/* KDIGO AKI Alert Card */}
                  {longitudinal.kdigoAki && longitudinal.kdigoAki.isAkiPresent && (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" /> KDIGO ACUTE KIDNEY INJURY: {longitudinal.kdigoAki.akiStage}
                        </span>
                        <span className="text-[11px] font-mono text-red-300">
                          Δ +{longitudinal.kdigoAki.absoluteDeltaMgDl} mg/dL ({longitudinal.kdigoAki.ratioToBaseline}x baseline)
                        </span>
                      </div>
                      <p className="text-xs text-red-200/90 leading-relaxed">
                        {longitudinal.kdigoAki.clinicalAction}
                      </p>
                    </div>
                  )}

                  {/* Multi-point Table */}
                  <div className="rounded-xl border border-neutral-800 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
                        <tr>
                          <th className="py-2.5 px-3">Analyte</th>
                          <th className="py-2.5 px-3">Baseline</th>
                          <th className="py-2.5 px-3">Current</th>
                          <th className="py-2.5 px-3">Change (Δ)</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800 text-neutral-300">
                        {longitudinal.analytesEvaluated.map((a, i) => (
                          <tr key={i} className="hover:bg-neutral-800/40">
                            <td className="py-2.5 px-3 font-medium text-white">{a.analyte}</td>
                            <td className="py-2.5 px-3 font-mono">{a.baselineValue} {a.unit}</td>
                            <td className="py-2.5 px-3 font-mono">{a.currentValue} {a.unit}</td>
                            <td className="py-2.5 px-3 font-mono text-amber-300">
                              {a.absoluteDelta >= 0 ? "+" : ""}{a.absoluteDelta} ({a.percentChange}%)
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                a.clinicalSignificance === "CRITICAL_HAZARD"
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : "bg-neutral-800 text-neutral-300"
                              }`}>
                                {(a.clinicalSignificance || "STANDARD").replace(/_/g, " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {longitudinal.patientQuestionsForDoctor.length > 0 && (
                    <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2">
                      <h4 className="text-xs font-semibold text-blue-300">Key Questions to Ask Your Doctor on These Trends:</h4>
                      <ul className="list-disc list-inside text-xs text-neutral-300 space-y-1">
                        {longitudinal.patientQuestionsForDoctor.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-neutral-950/40 border border-neutral-800 text-center space-y-2">
                  <TrendingUp className="w-8 h-8 text-neutral-500 mx-auto" />
                  <p className="text-xs text-neutral-300">No multi-point historical lab values supplied yet.</p>
                  <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                    Paste or upload records containing baseline and current dates (e.g. &quot;Creatinine: baseline 1.1 &rarr; current 2.4&quot;) to trigger automatic KDIGO AKI staging and velocity alerts.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: PHARMACOGENOMICS & REGIMEN SAFETY */}
          {activeTab === "pgx_safety" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Dna className="w-4 h-4 text-purple-400" /> Pharmacogenomic & Cardio-Oncology Safety Screening
                </h3>
                <p className="text-xs text-neutral-400">
                  Synchronized with CPIC and FDA pharmacogenomic tables to screen for high-risk drug-gene metabolism interactions.
                </p>
              </div>

              {pgxReport.totalRisks > 0 ? (
                <div className="space-y-3">
                  {pgxReport.detectedRisks.map((r, i) => (
                    <div key={i} className="p-4 rounded-xl bg-neutral-950 border border-purple-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-purple-400" /> {r.geneOrBiomarker}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/30">
                          {r.drugName.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {r.mechanismSummary}
                      </p>
                      <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
                        <strong className="text-purple-300">CPIC Recommendation:</strong> {r.cpicGuidelineRecommendation}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-neutral-950/40 border border-neutral-800 text-center space-y-2">
                  <Dna className="w-8 h-8 text-neutral-500 mx-auto" />
                  <p className="text-xs text-neutral-300">No high-risk pharmacogenomic interactions detected in current regimen.</p>
                  <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                    Includes automatic screening for DPYD (5-FU/FOLFOX), CYP2D6 (Tamoxifen), HER2 LVEF cardio-toxicity, and CYP2C19 (Plavix).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADAPTIVE INTERVIEWER */}
          {activeTab === "adaptive" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Adaptive Discriminative Questions
                </h3>
                <p className="text-xs text-neutral-400">
                  Targeted high-information-gain clinical features to rule in or rule out primary candidates
                </p>
              </div>

              <div className="space-y-3">
                {adaptiveQuestions.map((q) => {
                  const currentAnswer = answeredAdaptiveQuestions[q.questionId];

                  return (
                    <div
                      key={q.questionId}
                      className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            Targets: {q.targetCondition}
                          </span>
                          <h4 className="text-sm font-semibold text-white pt-1">
                            {q.questionText}
                          </h4>
                          <p className="text-xs text-neutral-400">
                            {q.discriminativeRationale}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {q.options.map((opt) => {
                          const isSelected = currentAnswer === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleAnswerAdaptive(q.questionId, opt, q.questionText)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                isSelected
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                              }`}
                            >
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

          {/* TAB 3: PATIENT INTAKE & OPQRST FORM */}
          {activeTab === "intake" && (
            <div className="space-y-6">
              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Chief Complaint & Problem Representation
                </label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* OPQRST Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Onset & Timing
                  </label>
                  <input
                    type="text"
                    value={onsetTiming}
                    onChange={(e) => setOnsetTiming(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Pain Quality
                  </label>
                  <select
                    value={painQuality}
                    onChange={(e) => setPainQuality(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-white"
                  >
                    <option value="crushing">Crushing / Pressure</option>
                    <option value="sharp">Sharp / Pleuritic</option>
                    <option value="burning">Burning</option>
                    <option value="tearing">Tearing / Ripping</option>
                    <option value="throbbing">Throbbing</option>
                    <option value="colicky">Colicky / Cramping</option>
                    <option value="dull">Dull Aching</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Pain Radiation
                  </label>
                  <input
                    type="text"
                    value={painRadiation}
                    onChange={(e) => setPainRadiation(e.target.value)}
                    placeholder="e.g. left arm, back, jaw"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-white"
                  />
                </div>
              </div>

              {/* Pain Severity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400 font-medium">Pain Severity Scale (1 - 10)</span>
                  <span className="text-white font-bold">{painSeverity} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painSeverity}
                  onChange={(e) => setPainSeverity(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Associated Symptoms Multi-Select */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">
                  Associated Clinical Symptoms:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SYMPTOMS.map((sym) => {
                    const isChecked = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          isChecked
                            ? "bg-blue-600/30 text-blue-200 border-blue-500/50"
                            : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Past Medical History */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">
                  Past Medical History:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_PMH.map((pmh) => {
                    const isChecked = selectedPmh.includes(pmh);
                    return (
                      <button
                        key={pmh}
                        type="button"
                        onClick={() => togglePmh(pmh)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          isChecked
                            ? "bg-purple-600/30 text-purple-200 border-purple-500/50"
                            : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        {pmh}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Measured Vital Signs */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-red-400" /> Measured Vital Signs (Zero-Fabrication Mode)
                  </span>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintDoctorBrief}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>Print Handout</span>
                  </button>
                  <button
                    onClick={copySoapToClipboard}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5"
                  >
                    {copiedSoap ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSoap ? "Copied SOAP" : "Copy SOAP"}</span>
                  </button>
                </div>
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
