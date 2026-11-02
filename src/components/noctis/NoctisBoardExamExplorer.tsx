import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ExternalLink,
  BookOpen,
  Sparkles,
  Award,
  ChevronRight,
  GraduationCap,
  RotateCcw,
  CheckCircle2,
  Stethoscope,
  Pill,
  Syringe,
  Activity,
  Cloud,
  Shield,
  Network,
  Cpu,
  Briefcase,
  TrendingUp,
  Scale,
  X,
  Zap,
  HelpCircle,
  Clock,
  Layers,
  FileText,
  ArrowRight,
  Compass,
  Calendar,
  CheckSquare,
  ListOrdered,
  Loader2,
  AlertCircle,
  Check
} from "lucide-react";
import { findPregeneratedQuiz } from "../../lib/generated-quizzes-data.ts";
import {
  BoardExam,
  BOARD_EXAMS,
  EXAM_CATEGORIES,
  searchBoardExams,
  FreeResource,
  HowToPassTTP,
  getNextThreeExams,
  getExamRoadmap,
  NextStep,
  RoadmapPhase
} from "../../lib/board-exams.ts";

interface NoctisBoardExamExplorerProps {
  onSend: (prompt: string) => void;
  onSelectExam?: (exam: BoardExam) => void;
  selectedExamId?: string | null;
  compact?: boolean;
}

export function NoctisBoardExamExplorer({
  onSend,
  onSelectExam,
  selectedExamId,
  compact = false
}: NoctisBoardExamExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("health_all");
  const [activeExam, setActiveExam] = useState<BoardExam | null>(() => {
    if (selectedExamId) {
      return BOARD_EXAMS.find((e) => e.id === selectedExamId) || null;
    }
    return BOARD_EXAMS.find((e) => e.id === "usmle") || BOARD_EXAMS[0];
  });

  // 7 Stages:
  // 1: Exam Blueprint
  // 2: Certificate Vendor
  // 3: Free Resources
  // 4: How to Pass (TTPs)
  // 5: Next Three (Progression)
  // 6: Create Quiz (10-Q Practice)
  // 7: Create Roadmap (12-Week Milestones)
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(compact);
  const stageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Antigravity AI Quiz State
  const [liveQuiz, setLiveQuiz] = useState<{
    exam: string;
    domain: string;
    vignette: string;
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correct_answer: "A" | "B" | "C" | "D";
    high_yield_pearl: string;
    tactics_and_technique: string;
  } | null>(null);
  const [liveQuizLoading, setLiveQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const fetchLiveAntigravityQuiz = async (examName: string, topic?: string) => {
    setLiveQuizLoading(true);
    setSelectedOption(null);
    setShowExplanation(false);

    // 1. Instant local match (0ms latency, always works offline and online)
    const localMatch = findPregeneratedQuiz(activeExam?.id || "", examName);
    if (localMatch) {
      setLiveQuiz(localMatch);
      setLiveQuizLoading(false);
      return;
    }

    // 2. Fetch from backend API bridge
    try {
      const url = `/api/noctis?antigravity_quiz=1&exam=${encodeURIComponent(examName)}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.quiz) {
        setLiveQuiz(data.quiz);
      } else {
        throw new Error("No quiz in payload");
      }
    } catch (err) {
      console.warn("Falling back to synthesized board simulation:", err);
      // 3. Fallback high-yield blueprint tailored to the active exam
      setLiveQuiz({
        exam: examName,
        domain: topic || (activeExam?.domain || "Clinical & Technical Mastery Blueprint"),
        vignette: `During a standardized ${examName} examination simulation, the examinee is presented with a patient/system presenting acute instability and conflicting diagnostic telemetry. The candidate must evaluate competing priorities, verify governing protocols, and enact immediate stabilization while eliminating high-frequency test-trap distractors.`,
        question: `Under current ${examName} examination criteria, what is the mandatory first-order action?`,
        options: {
          A: "Enact primary stabilization protocol, confirm airway/security baseline, and document telemetry.",
          B: "Defer intervention pending secondary panel review and delayed longitudinal monitoring.",
          C: "Override standard safety constraints and deploy an unvalidated bypass sequence.",
          D: "Document findings and observe passively without corrective action."
        },
        correct_answer: "A",
        high_yield_pearl: `For ${examName}, always select the answer that directly stabilizes the subject, eliminates acute catastrophic risk, and verifies baseline metrics before secondary administrative or non-urgent steps.`,
        tactics_and_technique: `1. Identify the acute presentation; 2. Eliminate deferral or passive monitoring distractors (Options B and D); 3. Reject reckless unverified overrides (Option C); 4. Choose definitive stabilization (Option A).`
      });
    } finally {
      setLiveQuizLoading(false);
    }
  };

  // Sync external selectedExamId
  useEffect(() => {
    if (selectedExamId) {
      const found = BOARD_EXAMS.find((e) => e.id === selectedExamId);
      if (found) {
        setActiveExam(found);
        setStage(1);
        setAutoPlay(true);
      }
    }
  }, [selectedExamId]);

  // Automated 4-stage initial lighting up sequence (1 -> 2 -> 3 -> 4)
  useEffect(() => {
    if (!autoPlay || !activeExam) return;

    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
    }

    if (stage < 4) {
      stageTimerRef.current = setTimeout(() => {
        setStage((prev) => ((prev + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7));
      }, 1600); // 1.6s between automatic reveals
    }

    return () => {
      if (stageTimerRef.current) {
        clearTimeout(stageTimerRef.current);
      }
    };
  }, [stage, autoPlay, activeExam]);

  const handleSelectExam = (exam: BoardExam) => {
    setActiveExam(exam);
    setStage(1);
    setAutoPlay(true);
    if (onSelectExam) {
      onSelectExam(exam);
    }
  };

  const handleManualStageClick = (targetStage: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    setAutoPlay(false);
    setStage(targetStage);
  };

  const handleReplaySequence = () => {
    setStage(1);
    setAutoPlay(true);
  };

  const handleResearchExamInChat = (customPrompt?: string) => {
    if (!activeExam) return;
    const promptToSend =
      customPrompt ||
      `Conduct exhaustive board research on ${activeExam.name} by ${activeExam.provider}.\n` +
      `1) Official Exam Blueprint & Core Topics: structure, scoring target, question format.\n` +
      `2) Official Certificate Vendor (${activeExam.provider} — ${activeExam.vendorUrl}): registration portals, eligibility, and test center details.\n` +
      `3) Free Resources: official guides, sample tests, and open textbooks.\n` +
      `4) How to Pass: detailed Tactics, Techniques, and Procedures (TTPs) for first-time pass mastery.\n` +
      `Followed by 5 high-yield multiple choice practice questions with detailed clinical/technical explanations.`;

    onSend(promptToSend);
  };

  const filteredExams = searchBoardExams(searchQuery, selectedCategory);
  const nextThreeSteps: NextStep[] = activeExam ? getNextThreeExams(activeExam) : [];
  const roadmapPhases: RoadmapPhase[] = activeExam ? getExamRoadmap(activeExam) : [];

  // Category Icon Resolver
  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case "health_all":
      case "health_doctor":
        return <Stethoscope className="size-3.5 text-rose-400" />;
      case "health_nurse":
        return <Syringe className="size-3.5 text-pink-400" />;
      case "health_pharmacy":
        return <Pill className="size-3.5 text-emerald-400" />;
      case "health_allied":
        return <Activity className="size-3.5 text-cyan-400" />;
      case "law":
        return <Scale className="size-3.5 text-amber-300" />;
      case "cloud":
        return <Cloud className="size-3.5 text-sky-400" />;
      case "cyber":
        return <Shield className="size-3.5 text-amber-400" />;
      case "network":
        return <Network className="size-3.5 text-teal-400" />;
      case "data_ai":
        return <Cpu className="size-3.5 text-purple-400" />;
      case "mgmt_business":
        return <Briefcase className="size-3.5 text-indigo-400" />;
      case "finance":
        return <TrendingUp className="size-3.5 text-green-400" />;
      default:
        return <GraduationCap className="size-3.5 text-amber-400" />;
    }
  };

  // If user collapsed the explorer to keep board area ultra neat:
  if (isCollapsed && activeExam) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-3 rounded-2xl border border-white/10 bg-[#161616]/90 p-2.5 backdrop-blur-md shadow-lg flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <GraduationCap className="size-4" />
          </div>
          <div className="truncate">
            <span className="font-semibold text-zinc-100">{activeExam.name}</span>
            <span className="text-zinc-400 ml-1.5 hidden sm:inline">({activeExam.provider})</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="rounded-full bg-white/10 hover:bg-white/15 px-3 py-1 font-medium text-zinc-300 transition"
          >
            Expand Exam Explorer
          </button>
          <button
            type="button"
            onClick={() => handleResearchExamInChat()}
            className="inline-flex items-center gap-1 rounded-full bg-[#e4b86a] hover:bg-[#d6a95b] px-3 py-1 font-semibold text-[#1a1408] transition shadow-xs"
          >
            <Sparkles className="size-3" />
            <span>Research in Chat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[#141414]/95 p-3.5 sm:p-5 backdrop-blur-xl shadow-2xl transition-all">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-rose-500/15 to-sky-500/15 border border-amber-500/30 text-amber-300">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Board & Certification Exam Directory</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                235+ Verified Boards
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Doctors, Nurses, Pharmacists, Law & Bar Exams, Allied Health & Technical Certifications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Collapse Button to keep Board Area Neat */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg hover:bg-white/5 transition flex items-center gap-1"
            title="Minimize explorer to keep board area spacious"
          >
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {/* Live Search Input & Filter Pills */}
      <div className="mt-3.5 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 235+ certified exams (USMLE, Bar Exam, UBE, NCLEX, Patent Bar, AWS, Cisco, CompTIA, SQE...)"
            className="w-full rounded-2xl border border-white/10 bg-black/40 pl-9 pr-9 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#e4b86a]/60 focus:outline-none focus:ring-1 focus:ring-[#e4b86a]/50"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Category Filter Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {EXAM_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold shadow-xs"
                    : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive 7-Stage Showcase Card */}
      {activeExam ? (
        <div className="mt-4 rounded-2xl border border-[#e4b86a]/30 bg-[#181818] p-3.5 sm:p-5 shadow-xl transition-all relative overflow-hidden">
          {/* Active Exam Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-bold text-zinc-100">{activeExam.name}</span>
                <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {activeExam.categoryLabel}
                </span>
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                  {activeExam.role}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{activeExam.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReplaySequence}
                className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] text-zinc-300 transition"
                title="Replay automated lighting up sequence"
              >
                <RotateCcw className="size-3 text-amber-400" />
                <span>Replay Sequence</span>
              </button>
            </div>
          </div>

          {/* 7 Interactive Stage Navigation Tabs (Neat, clean, horizontal scroll / responsive wrap) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 mt-2">
            {/* Tab 1: Exam */}
            <button
              type="button"
              onClick={() => handleManualStageClick(1)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition relative border ${
                stage === 1
                  ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${stage === 1 ? "bg-amber-400 text-black font-bold" : "bg-white/10 text-zinc-400"}`}>1</span>
              <span>Exam</span>
              {stage === 1 ? <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" /> : null}
            </button>

            {/* Tab 2: Certification vendor */}
            <button
              type="button"
              onClick={() => handleManualStageClick(2)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition relative border ${
                stage === 2
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${stage === 2 ? "bg-emerald-400 text-black font-bold" : "bg-white/10 text-zinc-400"}`}>2</span>
              <span>Certification vendor</span>
              {stage === 2 ? <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> : null}
            </button>

            {/* Tab 3: Free resources */}
            <button
              type="button"
              onClick={() => handleManualStageClick(3)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition relative border ${
                stage === 3
                  ? "bg-sky-500/20 border-sky-400 text-sky-200 ring-2 ring-sky-400/40 shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${stage === 3 ? "bg-sky-400 text-black font-bold" : "bg-white/10 text-zinc-400"}`}>3</span>
              <span>Free resources</span>
              {stage === 3 ? <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" /> : null}
            </button>

            {/* Tab 4: How to pass */}
            <button
              type="button"
              onClick={() => handleManualStageClick(4)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition relative border ${
                stage === 4
                  ? "bg-rose-500/20 border-rose-400 text-rose-200 ring-2 ring-rose-400/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${stage === 4 ? "bg-rose-400 text-black font-bold" : "bg-white/10 text-zinc-400"}`}>4</span>
              <span>How to pass</span>
              {stage === 4 ? <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" /> : null}
            </button>

            {/* Tab 5: Next three */}
            <button
              type="button"
              onClick={() => handleManualStageClick(5)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition relative border ${
                stage === 5
                  ? "bg-purple-500/20 border-purple-400 text-purple-200 ring-2 ring-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${stage === 5 ? "bg-purple-400 text-black font-bold" : "bg-white/10 text-zinc-400"}`}>5</span>
              <span>Next three</span>
              {stage === 5 ? <span className="size-1.5 rounded-full bg-purple-400 animate-pulse" /> : null}
            </button>

            {/* Tab 6: Create quiz */}
            <button
              type="button"
              onClick={() => handleManualStageClick(6)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition relative border ${
                stage === 6
                  ? "bg-teal-500/20 border-teal-400 text-teal-200 ring-2 ring-teal-400/40 shadow-[0_0_12px_rgba(20,184,166,0.3)]"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${stage === 6 ? "bg-teal-400 text-black font-bold" : "bg-white/10 text-zinc-400"}`}>6</span>
              <span>Create quiz</span>
              {stage === 6 ? <span className="size-1.5 rounded-full bg-teal-400 animate-pulse" /> : null}
            </button>

            {/* Tab 7: Create roadmap */}
            <button
              type="button"
              onClick={() => handleManualStageClick(7)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition relative border ${
                stage === 7
                  ? "bg-amber-500/25 border-amber-300 text-amber-200 ring-2 ring-amber-300/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${stage === 7 ? "bg-amber-300 text-black font-bold" : "bg-white/10 text-zinc-400"}`}>7</span>
              <span>Create roadmap</span>
              {stage === 7 ? <span className="size-1.5 rounded-full bg-amber-300 animate-pulse" /> : null}
            </button>
          </div>

          {/* Dynamic Content Panel for the Lit-Up Stage */}
          <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3.5 sm:p-4 min-h-[140px]">
            {/* Stage 1: Exam */}
            {stage === 1 && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <BookOpen className="size-4" />
                    <span>Exam Blueprint, Structure & Competencies</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">Exam Count: {activeExam.examCount} Track(s)</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{activeExam.description}</p>

                {activeExam.popularExams && activeExam.popularExams.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-zinc-400 mb-1.5">Key Core Sub-Exams & Modules:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeExam.popularExams.map((sub, i) => (
                        <span key={i} className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-zinc-200">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 2: Certification vendor */}
            {stage === 2 && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Award className="size-4" />
                    <span>Official Certification Vendor & Registration Details</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">Accredited Governing Body</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-lg bg-white/5 p-2.5 border border-white/5">
                    <p className="text-[11px] text-zinc-400">Official Exam Vendor:</p>
                    <p className="text-sm font-bold text-zinc-100">{activeExam.provider}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Professional credential issued upon passing and meeting experience prerequisites. Delivered via Pearson VUE, Prometric, or vendor secure portal.
                    </p>
                  </div>

                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-300">Verified Registration Portal</p>
                      <p className="text-[11px] text-zinc-300 mt-0.5 truncate">{activeExam.vendorUrl}</p>
                    </div>
                    <a
                      href={activeExam.vendorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition"
                    >
                      <span>Visit Official Vendor Portal</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 3: Free resources */}
            {stage === 3 && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Layers className="size-4" />
                    <span>Curated Free Study Resources & Open Materials</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">{(activeExam.freeResources || []).length} Verified Sources</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(activeExam.freeResources || []).map((res, i) => (
                    <a
                      key={i}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col justify-between rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-200 group-hover:text-sky-300 transition">
                            {res.name}
                          </span>
                          <ExternalLink className="size-3 text-zinc-500 group-hover:text-sky-300" />
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{res.description}</p>
                      </div>
                      <span className="mt-2 text-[10px] font-medium text-sky-400 uppercase tracking-wider">
                        {res.type.replace("_", " ")}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Stage 4: How to pass */}
            {stage === 4 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Zap className="size-4" />
                    <span>How to Pass: Tactics, Techniques & Procedures (TTPs)</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono">Mastery Playbook</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  {/* Tactics */}
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
                    <p className="text-xs font-bold text-amber-300 flex items-center gap-1 mb-1">
                      <span>⚔️ Tactics</span>
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activeExam.howToPassTTP?.tactics || "Master official syllabus weights and complete 1,000+ practice questions."}
                    </p>
                  </div>

                  {/* Techniques */}
                  <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-3">
                    <p className="text-xs font-bold text-sky-300 flex items-center gap-1 mb-1">
                      <span>🎯 Techniques</span>
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activeExam.howToPassTTP?.techniques || "Process of elimination: identify whether scenario requires emergency diagnosis or stable maintenance."}
                    </p>
                  </div>

                  {/* Procedures */}
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3">
                    <p className="text-xs font-bold text-emerald-300 flex items-center gap-1 mb-1">
                      <span>📋 Procedures</span>
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activeExam.howToPassTTP?.procedures || "Score >=80% on 2 consecutive full-length timed mock exams before scheduling test day."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 5: Next three */}
            {stage === 5 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Compass className="size-4" />
                    <span>Next Three: Recommended Career & Specialty Milestone Progression</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">Next 3 Career Moves</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  {nextThreeSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col justify-between rounded-xl bg-purple-500/10 border border-purple-500/25 p-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                            Step #{idx + 1}
                          </span>
                          <span className="text-[10px] text-zinc-400">{step.provider}</span>
                        </div>
                        <h5 className="text-xs font-bold text-zinc-100 mt-1">{step.name}</h5>
                        <p className="text-[11px] text-purple-300 font-medium mt-0.5">{step.role}</p>
                        <p className="text-[11px] text-zinc-300 mt-1.5 leading-snug">{step.why}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResearchExamInChat(`Research credential: ${step.name} by ${step.provider}. What are the prerequisites, exam format, syllabus, and how does it advance a career from ${activeExam.name}?`)}
                        className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 px-2.5 py-1 text-[11px] font-semibold transition"
                      >
                        <span>Explore Step #{idx + 1} in Chat</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stage 6: Create quiz */}
            {stage === 6 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <CheckSquare className="size-4" />
                    <span>Create Quiz: High-Yield Board Simulation & Live AI Vignette</span>
                  </h4>
                  <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-bold text-teal-300 border border-teal-500/30">
                    ⚡ Powered by Antigravity Python Engine
                  </span>
                </div>

                {/* Live Vignette Interactive Card */}
                {liveQuiz ? (
                  <div className="rounded-2xl border border-teal-500/30 bg-[#16201e]/90 p-4 space-y-3 shadow-lg animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-teal-500/20 pb-2.5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 font-mono">
                          {liveQuiz.exam} • {liveQuiz.domain}
                        </span>
                        <h5 className="text-xs font-bold text-zinc-100 mt-0.5">Live Clinical / Technical Case Scenario</h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchLiveAntigravityQuiz(activeExam.name)}
                        disabled={liveQuizLoading}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 px-2.5 py-1 text-[11px] font-semibold transition"
                      >
                        {liveQuizLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                        <span>New Vignette</span>
                      </button>
                    </div>

                    {/* Vignette narrative */}
                    <div className="rounded-xl bg-black/40 border border-white/5 p-3 text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-line">
                      {liveQuiz.vignette}
                    </div>

                    {/* Stem question */}
                    <p className="text-xs font-bold text-teal-200 pt-1">
                      {liveQuiz.question}
                    </p>

                    {/* Options A, B, C, D */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {(["A", "B", "C", "D"] as const).map((key) => {
                        const optText = liveQuiz.options[key];
                        if (!optText) return null;
                        const isChosen = selectedOption === key;
                        const isCorrect = key === liveQuiz.correct_answer;
                        let btnStyle = "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200";

                        if (selectedOption) {
                          if (isCorrect) {
                            btnStyle = "border-emerald-500/60 bg-emerald-500/20 text-emerald-100 font-medium";
                          } else if (isChosen) {
                            btnStyle = "border-rose-500/60 bg-rose-500/20 text-rose-100";
                          } else {
                            btnStyle = "border-white/5 bg-black/20 text-zinc-500 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setSelectedOption(key);
                              setShowExplanation(true);
                            }}
                            className={`flex items-start gap-2.5 text-left rounded-xl border p-2.5 text-xs transition ${btnStyle}`}
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold">
                              {key}
                            </span>
                            <span className="flex-1 leading-snug">{optText}</span>
                            {selectedOption && isCorrect && (
                              <Check className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanations & Pearls */}
                    {showExplanation && (
                      <div className="space-y-2 pt-2 animate-fadeIn">
                        {/* Result notification */}
                        <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold ${
                          selectedOption === liveQuiz.correct_answer
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                        }`}>
                          {selectedOption === liveQuiz.correct_answer ? (
                            <span>✓ Correct! Answer is Option {liveQuiz.correct_answer}.</span>
                          ) : (
                            <span>✗ Incorrect. Correct option is {liveQuiz.correct_answer}.</span>
                          )}
                        </div>

                        {/* High-Yield Pearl */}
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs">
                          <p className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                            <Sparkles className="size-3.5" />
                            <span>High-Yield Board Pearl</span>
                          </p>
                          <p className="text-zinc-200 leading-relaxed text-[11px]">
                            {liveQuiz.high_yield_pearl}
                          </p>
                        </div>

                        {/* Tactics & Technique */}
                        <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-3 text-xs">
                          <p className="font-bold text-sky-300 flex items-center gap-1.5 mb-1">
                            <Zap className="size-3.5" />
                            <span>Solving Tactics & Procedures (TTP)</span>
                          </p>
                          <p className="text-zinc-200 leading-relaxed text-[11px] whitespace-pre-line">
                            {liveQuiz.tactics_and_technique}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 p-3.5 space-y-2.5">
                    <p className="text-xs text-zinc-200 leading-relaxed">
                      Generate an interactive high-yield board simulation quiz tailored to <span className="font-bold text-teal-300">{activeExam.name}</span>.
                      Uses your authenticated local Antigravity Python runtime to generate live case vignettes, distractors, and diagnostic pearls.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fetchLiveAntigravityQuiz(activeExam.name)}
                        disabled={liveQuizLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 px-4 py-2 text-xs font-bold text-black transition shadow-sm disabled:opacity-50"
                      >
                        {liveQuizLoading ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Spawning Local Antigravity Engine...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5" />
                            <span>Generate Live Case Vignette (Local AI) ⚡</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResearchExamInChat(
                          `Generate a high-yield 10-question board simulation practice quiz for ${activeExam.name} by ${activeExam.provider}.\n` +
                          `Format:\n` +
                          `- 10 scenario-based clinical/technical multiple choice questions with 4-5 options (A-E).\n` +
                          `- Provide detailed explanations for why the correct option is right and why each incorrect option is wrong.\n` +
                          `- Include a high-yield exam takeaway pearl for each question.`
                        )}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-zinc-200 transition"
                      >
                        <span>Launch 10-Question Quiz in Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResearchExamInChat(
                          `Generate 5 difficult rapid-fire board review questions for ${activeExam.name} testing the highest failure-rate topics and tricky trap answers.`
                        )}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-zinc-200 transition"
                      >
                        <span>5 Rapid-Fire Trap Questions</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 7: Create roadmap */}
            {stage === 7 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Calendar className="size-4" />
                    <span>Create Roadmap: 12-Week Master Study Schedule & Milestones</span>
                  </h4>
                  <span className="text-[10px] text-amber-300 font-mono">12-Week Blueprint</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                  {roadmapPhases.map((phase, idx) => (
                    <div key={idx} className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="rounded-md bg-amber-400/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                            {phase.timeframe}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-zinc-100 mt-1">{phase.phase}</h5>
                        <p className="text-[11px] text-zinc-300 mt-1.5 leading-snug">{phase.objective}</p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-amber-500/20 space-y-1">
                        <p className="text-[10px] text-zinc-400"><strong className="text-zinc-300">Target:</strong> {phase.weeklyTarget}</p>
                        <p className="text-[10px] text-amber-300"><strong className="text-zinc-300">Goal:</strong> {phase.benchmark}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleResearchExamInChat(
                      `Create a comprehensive, week-by-week master study roadmap for ${activeExam.name} by ${activeExam.provider} over 12 weeks.\n` +
                      `Break down each week with:\n` +
                      `1) Weekly topic focus and textbook chapters\n` +
                      `2) Daily question bank targets (e.g. 40 Qs/day)\n` +
                      `3) Spaced repetition flashcard review schedule\n` +
                      `4) Mock exam benchmark milestones (weeks 4, 8, 10, 11).`
                    )}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#e4b86a] hover:from-amber-300 hover:to-[#d6a95b] px-4 py-2 text-xs font-bold text-[#1a1408] transition shadow-md"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Generate Detailed Week-by-Week Roadmap in Chat ⚡</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer: The Exact 7 Study Pills From User Screenshot */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  handleManualStageClick(1);
                  handleResearchExamInChat(`Provide a complete official exam blueprint for ${activeExam.name}: who issues the exam, test format, syllabus domains with percentage weights, duration, and passing score benchmarks.`);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm border ${
                  stage === 1
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold border-[#e4b86a] shadow-sm"
                    : "bg-white/10 text-zinc-200 border-white/5 hover:bg-white/15 hover:border-white/20"
                }`}
              >
                Exam
              </button>

              <button
                type="button"
                onClick={() => {
                  handleManualStageClick(2);
                  handleResearchExamInChat(`Who is the official certification vendor for ${activeExam.name}? Where do I register, what is the verified portal URL, testing delivery partners (Pearson VUE / Prometric), and credential validity?`);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm border ${
                  stage === 2
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold border-[#e4b86a] shadow-sm"
                    : "bg-white/10 text-zinc-200 border-white/5 hover:bg-white/15 hover:border-white/20"
                }`}
              >
                Certification vendor
              </button>

              <button
                type="button"
                onClick={() => {
                  handleManualStageClick(3);
                  handleResearchExamInChat(`What free study resources, official candidate blueprints, open textbooks (NCBI, OpenStax), practice question banks, and video courses can I use to study ${activeExam.name}?`);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm border ${
                  stage === 3
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold border-[#e4b86a] shadow-sm"
                    : "bg-white/10 text-zinc-200 border-white/5 hover:bg-white/15 hover:border-white/20"
                }`}
              >
                Free resources
              </button>

              <button
                type="button"
                onClick={() => {
                  handleManualStageClick(4);
                  handleResearchExamInChat(`What are the exact Tactics, Techniques, and Procedures (TTPs) to pass ${activeExam.name} on the first attempt? Detail study pacing, active recall strategies, question dissection methods, and mock exam benchmarks.`);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm border ${
                  stage === 4
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold border-[#e4b86a] shadow-sm"
                    : "bg-white/10 text-zinc-200 border-white/5 hover:bg-white/15 hover:border-white/20"
                }`}
              >
                How to pass
              </button>

              <button
                type="button"
                onClick={() => {
                  handleManualStageClick(5);
                  handleResearchExamInChat(`What are the next three logical exams, certifications, or sub-specialty credentials to pursue after ${activeExam.name} to maximize career progression and seniority? Provide the strategic rationale, prerequisites, and syllabus overlap for each.`);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm border ${
                  stage === 5
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold border-[#e4b86a] shadow-sm"
                    : "bg-white/10 text-zinc-200 border-white/5 hover:bg-white/15 hover:border-white/20"
                }`}
              >
                Next three
              </button>

              <button
                type="button"
                onClick={() => {
                  handleManualStageClick(6);
                  handleResearchExamInChat(`Generate a high-yield 10-question board simulation practice quiz for ${activeExam.name} with 4-5 multiple choice options (A-E) and comprehensive rationales explaining why the correct answer is right and why each distractor is wrong.`);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm border ${
                  stage === 6
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold border-[#e4b86a] shadow-sm"
                    : "bg-white/10 text-zinc-200 border-white/5 hover:bg-white/15 hover:border-white/20"
                }`}
              >
                Create quiz
              </button>

              <button
                type="button"
                onClick={() => {
                  handleManualStageClick(7);
                  handleResearchExamInChat(`Create a comprehensive, week-by-week master study roadmap for ${activeExam.name} (e.g. 8-12 weeks), structured into foundation, intensive question bank application, full timed simulation, and final taper milestones with daily hour targets.`);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm border ${
                  stage === 7
                    ? "bg-[#e4b86a] text-[#1a1408] font-bold border-[#e4b86a] shadow-sm"
                    : "bg-white/10 text-zinc-200 border-white/5 hover:bg-white/15 hover:border-white/20"
                }`}
              >
                Create roadmap
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleResearchExamInChat()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e4b86a] to-amber-500 hover:from-[#d6a95b] hover:to-amber-400 px-4 py-2 text-xs font-bold text-[#1a1408] transition shadow-md touch-manipulation shrink-0"
            >
              <Sparkles className="size-4" />
              <span>Research in Chat with Noctis ⚡</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Compact Exam Grid for Search Results & Browsing */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-zinc-300">
            Available Board Exams & Vendors ({filteredExams.length} matches):
          </p>
          <span className="text-[11px] text-zinc-500">Click any exam to trigger the walkthrough</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
          {filteredExams.slice(0, 48).map((exam) => {
            const isSelected = activeExam?.id === exam.id;
            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => handleSelectExam(exam)}
                className={`flex items-center justify-between gap-2 rounded-xl p-2.5 text-left transition border ${
                  isSelected
                    ? "bg-[#e4b86a]/15 border-[#e4b86a]/50 text-white font-semibold shadow-xs"
                    : "bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs truncate font-medium">{exam.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{exam.provider}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">
                    {exam.examCount}
                  </span>
                  <ChevronRight className="size-3.5 text-zinc-500" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}