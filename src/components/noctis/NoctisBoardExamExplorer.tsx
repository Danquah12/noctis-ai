import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  Cloud,
  Compass,
  Cpu,
  ExternalLink,
  GraduationCap,
  Layers,
  Loader2,
  Network,
  Pill,
  RotateCcw,
  Scale,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
  Syringe,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { findPregeneratedQuiz } from "../../lib/generated-quizzes-data.ts";
import {
  BOARD_EXAMS,
  EXAM_CATEGORIES,
  getExamRoadmap,
  getNextThreeExams,
  searchBoardExams,
  type BoardExam,
  type NextStep,
  type RoadmapPhase,
} from "../../lib/board-exams.ts";

interface NoctisBoardExamExplorerProps {
  onSend: (prompt: string) => void;
  onSelectExam?: (exam: BoardExam) => void;
  selectedExamId?: string | null;
  compact?: boolean;
}

type BoardWorkspaceTab = "overview" | "strategy" | "resources" | "quiz" | "roadmap";

function cleanCategoryLabel(rawLabel: string): string {
  return rawLabel.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

export function NoctisBoardExamExplorer({
  onSend,
  onSelectExam,
  selectedExamId,
  compact = false,
}: NoctisBoardExamExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("health_all");
  const [activeExam, setActiveExam] = useState<BoardExam>(() => {
    if (selectedExamId) {
      const matched = BOARD_EXAMS.find((e) => e.id === selectedExamId);
      if (matched) return matched;
    }
    return BOARD_EXAMS.find((e) => e.id === "usmle") || BOARD_EXAMS[0];
  });
  const [activeTab, setActiveTab] = useState<BoardWorkspaceTab>("overview");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(compact);

  // Interactive Quiz Vignette State
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

  const resetQuizState = () => {
    setLiveQuiz(null);
    setSelectedOption(null);
    setShowExplanation(false);
  };

  useEffect(() => {
    if (!selectedExamId) return;
    const found = BOARD_EXAMS.find((e) => e.id === selectedExamId);
    if (found) {
      setActiveExam(found);
      resetQuizState();
    }
  }, [selectedExamId]);

  const fetchLiveAntigravityQuiz = async (exam: BoardExam, topic?: string) => {
    setLiveQuizLoading(true);
    setSelectedOption(null);
    setShowExplanation(false);

    const localMatch = findPregeneratedQuiz(exam.id, exam.name);
    if (localMatch) {
      setLiveQuiz(localMatch);
      setLiveQuizLoading(false);
      return;
    }

    try {
      const url = `/api/noctis?antigravity_quiz=1&exam=${encodeURIComponent(exam.name)}${
        topic ? `&topic=${encodeURIComponent(topic)}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.quiz) {
        setLiveQuiz(data.quiz);
      } else {
        throw new Error("No quiz in payload");
      }
    } catch {
      setLiveQuiz({
        exam: exam.name,
        domain: topic || "Core Certification & Clinical / Technical Mastery",
        vignette:
          `During a standardized ${exam.name} examination scenario, the candidate encounters acute instability with competing operational priorities and diagnostic distractors. Apply the governing standards of ${exam.provider} to determine the highest-priority stabilizing action.`,
        question: `Under current ${exam.name} examination criteria, what is the mandatory first-order action?`,
        options: {
          A: "Enact primary stabilization protocol, confirm safety/baseline metrics, and document findings.",
          B: "Defer intervention pending secondary committee review and passive monitoring.",
          C: "Bypass standard safety safeguards and deploy an unvalidated workaround.",
          D: "Observe passively without corrective action.",
        },
        correct_answer: "A",
        high_yield_pearl: `For ${exam.name}, prioritize interventions that directly stabilize life-safety or core system integrity and confirm baseline telemetry before administrative steps.`,
        tactics_and_technique:
          "1. Identify acute instability in the stem; 2. Eliminate passive deferral distractors (Options B & D); 3. Reject unsafe bypass shortcuts (Option C); 4. Select primary stabilization (Option A).",
      });
    } finally {
      setLiveQuizLoading(false);
    }
  };

  const selectExam = (exam: BoardExam) => {
    setActiveExam(exam);
    resetQuizState();
    onSelectExam?.(exam);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    const matching = searchBoardExams(searchQuery, catId);
    if (matching.length > 0 && !matching.some((e) => e.id === activeExam.id)) {
      selectExam(matching[0]);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const matching = searchBoardExams(value, selectedCategory);
    if (matching.length > 0 && !matching.some((e) => e.id === activeExam.id)) {
      setActiveExam(matching[0]);
      resetQuizState();
      onSelectExam?.(matching[0]);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    const firstAll = searchBoardExams("", "all")[0];
    if (firstAll) selectExam(firstAll);
  };

  const handleResearchExamInChat = (customPrompt?: string) => {
    const promptToSend =
      customPrompt ||
      `Conduct exhaustive board research on ${activeExam.name} by ${activeExam.provider}.\n` +
        `1) Official Exam Blueprint & Core Topics: structure, scoring target, question format.\n` +
        `2) Official Certificate Vendor (${activeExam.provider} — ${activeExam.vendorUrl}): registration portals, eligibility, and test center details.\n` +
        `3) Free Resources: official guides, sample tests, and open textbooks.\n` +
        `4) How to Pass: detailed Tactics, Techniques, and Procedures (TTPs) for first-time pass mastery.\n` +
        `Followed by 5 high-yield multiple choice practice questions with detailed rationales.`;
    onSend(promptToSend);
  };

  const filteredExams = searchBoardExams(searchQuery, selectedCategory);
  const nextThreeSteps: NextStep[] = getNextThreeExams(activeExam);
  const roadmapPhases: RoadmapPhase[] = getExamRoadmap(activeExam);

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case "health_all":
      case "health_doctor":
        return <Stethoscope className="size-3.5 shrink-0" />;
      case "health_nurse":
        return <Syringe className="size-3.5 shrink-0" />;
      case "health_pharmacy":
        return <Pill className="size-3.5 shrink-0" />;
      case "health_allied":
        return <Activity className="size-3.5 shrink-0" />;
      case "law":
        return <Scale className="size-3.5 shrink-0" />;
      case "cloud":
        return <Cloud className="size-3.5 shrink-0" />;
      case "cyber":
        return <Shield className="size-3.5 shrink-0" />;
      case "network":
        return <Network className="size-3.5 shrink-0" />;
      case "data_ai":
        return <Cpu className="size-3.5 shrink-0" />;
      case "mgmt_business":
        return <Briefcase className="size-3.5 shrink-0" />;
      case "finance":
        return <TrendingUp className="size-3.5 shrink-0" />;
      default:
        return <GraduationCap className="size-3.5 shrink-0" />;
    }
  };

  const WORKSPACE_TABS: Array<{ id: BoardWorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: "overview", label: "Overview & Vendor", icon: <BookOpen className="size-3.5" /> },
    { id: "strategy", label: "How to Pass", icon: <Zap className="size-3.5" /> },
    { id: "resources", label: "Free Resources", icon: <Layers className="size-3.5" /> },
    { id: "quiz", label: "Practice Quiz", icon: <CheckSquare className="size-3.5" /> },
    { id: "roadmap", label: "Roadmap & Next", icon: <Calendar className="size-3.5" /> },
  ];

  if (isCollapsed) {
    return (
      <div className="w-full max-w-5xl mx-auto mb-3 rounded-2xl border border-white/10 bg-[#161616]/90 px-3.5 py-2.5 backdrop-blur-md shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e4b86a]/15 border border-[#e4b86a]/30 text-[#e4b86a]">
            <GraduationCap className="size-4" />
          </div>
          <div className="truncate">
            <span className="font-semibold text-zinc-100">{activeExam.name}</span>
            <span className="text-zinc-400 ml-1.5 hidden sm:inline">· {activeExam.provider}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="rounded-full bg-white/10 hover:bg-white/15 px-3 py-1 font-medium text-zinc-200 transition"
          >
            Switch Exam
          </button>
          <button
            type="button"
            onClick={() => handleResearchExamInChat()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b86a] hover:bg-[#d6a95b] px-3.5 py-1 font-semibold text-[#1a1408] transition shadow-xs"
          >
            <Sparkles className="size-3" />
            <span>Study in Chat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-white/10 bg-[#141414]/95 p-3.5 sm:p-5 backdrop-blur-xl shadow-2xl">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e4b86a]/15 border border-[#e4b86a]/30 text-[#e4b86a]">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                Board & Certification Prep
              </h3>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                {BOARD_EXAMS.length}+ Boards
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              Step 1: Pick a field & exam on the left · Step 2: Study blueprint, quiz, or launch AI coaching
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="text-xs text-zinc-400 hover:text-zinc-100 px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/5 transition"
          title="Collapse Board directory"
        >
          Minimize
        </button>
      </div>

      {/* Unified Search + Single-Icon Category Filter Strip */}
      <div className="mt-3 space-y-2.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search certified exams (USMLE, NCLEX, Bar Exam, NAPLEX, AWS, CISSP, CompTIA, CFA...)"
            className="w-full rounded-2xl border border-white/10 bg-black/40 pl-10 pr-24 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#e4b86a]/60 focus:outline-none focus:ring-1 focus:ring-[#e4b86a]/40"
          />
          <div className="absolute right-3 flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-zinc-500">
              {filteredExams.length} {filteredExams.length === 1 ? "match" : "matches"}
            </span>
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear exam search"
                onClick={() => handleSearchChange("")}
                className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {EXAM_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition border ${
                  isActive
                    ? "bg-[#e4b86a] text-[#1a1408] border-[#e4b86a] font-semibold shadow-xs"
                    : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cleanCategoryLabel(cat.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Master-Detail Board Workspace */}
      <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Step 1 (Left Column): Searchable Exam Selector Always Above the Fold */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl border border-white/10 bg-[#181818]/90 p-3">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
              1. Select Exam
            </span>
            <span className="text-[11px] text-zinc-500">
              {filteredExams.length} found
            </span>
          </div>

          {filteredExams.length > 0 ? (
            <div className="max-h-[360px] overflow-y-auto noctis-thin-scroll space-y-1.5 pr-1">
              {filteredExams.slice(0, 60).map((exam) => {
                const isSelected = activeExam.id === exam.id;
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => selectExam(exam)}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition border ${
                      isSelected
                        ? "bg-[#e4b86a]/15 border-[#e4b86a]/55 text-white shadow-xs"
                        : "bg-white/[0.03] border-white/5 text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-xs truncate ${isSelected ? "font-bold text-[#f3d492]" : "font-medium"}`}>
                        {exam.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {exam.provider}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-md bg-black/40 border border-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                        {exam.examCount}
                      </span>
                      <ChevronRight
                        className={`size-3.5 ${isSelected ? "text-[#e4b86a]" : "text-zinc-500"}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center py-10 px-3 space-y-2.5">
              <p className="text-xs text-zinc-400">No board exams match “{searchQuery}”.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-zinc-100 transition"
              >
                <RotateCcw className="size-3" />
                <span>Reset filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 2 (Right Column): Active Exam Workspace */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-2xl border border-[#e4b86a]/30 bg-[#181818] p-3.5 sm:p-4 shadow-xl">
          <div>
            {/* Focused Exam Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-3 border-b border-white/10">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#e4b86a]">
                    2. Active Study Board
                  </span>
                  <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                    {activeExam.categoryLabel}
                  </span>
                  <span className="rounded-md bg-zinc-800/90 px-2 py-0.5 text-[10px] text-zinc-300">
                    {activeExam.role}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
                  {activeExam.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {activeExam.description}
                </p>
              </div>

              <a
                href={activeExam.vendorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition self-start"
              >
                <span>Official Portal</span>
                <ExternalLink className="size-3 text-[#e4b86a]" />
              </a>
            </div>

            {/* Clean Single 5-Tab Segmented Bar (Wraps Cleanly, Zero Horizontal Scrollbar) */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {WORKSPACE_TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition border ${
                      isSelected
                        ? "bg-[#e4b86a]/20 border-[#e4b86a] text-[#f3d492] font-semibold shadow-xs"
                        : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content Panel */}
            <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3.5 min-h-[220px]">
              {activeTab === "overview" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Governing Body & Vendor
                      </p>
                      <p className="text-sm font-bold text-zinc-100 mt-1">{activeExam.provider}</p>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Administered via accredited testing centers (Pearson VUE, Prometric, or vendor proctored portal). Contains {activeExam.examCount} core track(s).
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                          <Award className="size-3.5" />
                          <span>Verified Candidate Portal</span>
                        </p>
                        <p className="text-[11px] text-zinc-300 mt-1 truncate">{activeExam.vendorUrl}</p>
                      </div>
                      <a
                        href={activeExam.vendorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition"
                      >
                        <span>Open Vendor Registration</span>
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </div>

                  {activeExam.popularExams && activeExam.popularExams.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-400 mb-1.5">
                        Key Modules & Tracks Covered:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeExam.popularExams.map((sub, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-zinc-200"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "strategy" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <Zap className="size-4" />
                      <span>Tactics, Techniques & Procedures (TTPs)</span>
                    </h5>
                    <span className="text-[10px] font-mono text-emerald-400">First-Pass Playbook</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
                      <p className="text-xs font-bold text-amber-300 mb-1">Tactics</p>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeExam.howToPassTTP?.tactics ||
                          "Master official syllabus weights and complete 1,000+ timed practice questions."}
                      </p>
                    </div>
                    <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-3">
                      <p className="text-xs font-bold text-sky-300 mb-1">Techniques</p>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeExam.howToPassTTP?.techniques ||
                          "Identify acute vs. routine framing first, then eliminate distractor tiers methodically."}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3">
                      <p className="text-xs font-bold text-emerald-300 mb-1">Procedures</p>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeExam.howToPassTTP?.procedures ||
                          "Score ≥ 80% across two consecutive full-length timed mock simulations before exam day."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "resources" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Layers className="size-4" />
                      <span>Free Study Guides & Open Materials</span>
                    </h5>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {(activeExam.freeResources || []).length} Verified Links
                    </span>
                  </div>

                  {(activeExam.freeResources || []).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[210px] overflow-y-auto noctis-thin-scroll pr-1">
                      {(activeExam.freeResources || []).map((res, i) => (
                        <a
                          key={i}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-col justify-between rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 p-2.5 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-zinc-100 group-hover:text-sky-300 transition">
                                {res.name}
                              </span>
                              <ExternalLink className="size-3 shrink-0 text-zinc-500 group-hover:text-sky-300" />
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{res.description}</p>
                          </div>
                          <span className="mt-2 text-[10px] font-medium uppercase tracking-wider text-sky-400">
                            {res.type.replace("_", " ")}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      Use the official vendor link above or ask Noctis in chat for curated open textbooks and sample banks.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "quiz" && (
                <div className="space-y-3">
                  {liveQuiz ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 font-mono">
                            {liveQuiz.exam} · {liveQuiz.domain}
                          </span>
                          <h5 className="text-xs font-bold text-zinc-100 mt-0.5">
                            Interactive Vignette Drill
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchLiveAntigravityQuiz(activeExam)}
                          disabled={liveQuizLoading}
                          className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 px-3 py-1 text-[11px] font-semibold transition"
                        >
                          {liveQuizLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                          <span>New Vignette</span>
                        </button>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                        {liveQuiz.vignette}
                      </div>

                      <p className="text-xs font-bold text-teal-200">{liveQuiz.question}</p>

                      <div className="grid grid-cols-1 gap-1.5">
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
                              btnStyle = "border-white/5 bg-black/20 text-zinc-500 opacity-65";
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
                              {selectedOption && isCorrect ? (
                                <Check className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {showExplanation && (
                        <div className="space-y-2 pt-1">
                          <div
                            className={`p-2.5 rounded-xl border text-xs font-semibold ${
                              selectedOption === liveQuiz.correct_answer
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                            }`}
                          >
                            {selectedOption === liveQuiz.correct_answer
                              ? `Correct — Option ${liveQuiz.correct_answer}.`
                              : `Incorrect — Correct Answer is Option ${liveQuiz.correct_answer}.`}
                          </div>
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-[11px] text-zinc-200 leading-relaxed">
                            <span className="font-bold text-amber-300 block mb-0.5">High-Yield Pearl</span>
                            {liveQuiz.high_yield_pearl}
                          </div>
                          <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-3 text-[11px] text-zinc-200 leading-relaxed whitespace-pre-line">
                            <span className="font-bold text-sky-300 block mb-0.5">Solving Tactics</span>
                            {liveQuiz.tactics_and_technique}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 p-3.5 space-y-3">
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                          <CheckSquare className="size-4" />
                          <span>Practice Quiz & Live Board Simulation</span>
                        </h5>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                          Run an interactive single-question board vignette right here for{" "}
                          <span className="font-semibold text-white">{activeExam.name}</span>, or launch a full
                          timed 10-question mock exam in Chat.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fetchLiveAntigravityQuiz(activeExam)}
                          disabled={liveQuizLoading}
                          className="inline-flex items-center gap-2 rounded-full bg-teal-400 hover:bg-teal-300 px-4 py-1.5 text-xs font-bold text-black transition shadow-sm disabled:opacity-50"
                        >
                          {liveQuizLoading ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              <span>Loading Vignette...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3.5" />
                              <span>Start Interactive Vignette</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleResearchExamInChat(
                              `Generate 5 difficult rapid-fire board review questions for ${activeExam.name} testing high-failure topics and classic trap answers.`
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-100 border border-white/10 transition"
                        >
                          <span>5 Rapid-Fire Traps in Chat</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "roadmap" && (
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        <span>12-Week Study Roadmap</span>
                      </h5>
                      <span className="text-[10px] font-mono text-zinc-400">4 Structured Phases</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {roadmapPhases.map((phase, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 flex flex-col justify-between"
                        >
                          <div>
                            <span className="inline-block rounded bg-amber-400/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                              {phase.timeframe}
                            </span>
                            <p className="text-xs font-bold text-zinc-100 mt-1">{phase.phase}</p>
                            <p className="text-[11px] text-zinc-300 mt-1 leading-snug">{phase.objective}</p>
                          </div>
                          <p className="text-[10px] text-amber-200/90 mt-2 pt-1.5 border-t border-amber-500/20">
                            {phase.benchmark}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {nextThreeSteps.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5 mb-2">
                        <Compass className="size-3.5" />
                        <span>Next 3 Recommended Credentials</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {nextThreeSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col justify-between rounded-xl bg-purple-500/10 border border-purple-500/25 p-2.5"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.5 font-bold">
                                  Step #{idx + 1}
                                </span>
                                <span className="text-zinc-400 truncate ml-1">{step.provider}</span>
                              </div>
                              <p className="text-xs font-bold text-zinc-100 mt-1">{step.name}</p>
                              <p className="text-[11px] text-zinc-300 mt-1 leading-snug">{step.why}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleResearchExamInChat(
                                  `Research credential: ${step.name} by ${step.provider}. What are prerequisites, exam format, and syllabus progression from ${activeExam.name}?`
                                )
                              }
                              className="mt-2.5 inline-flex items-center justify-center gap-1 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 px-2.5 py-1 text-[11px] font-semibold transition"
                            >
                              <span>Explore in Chat</span>
                              <ArrowRight className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Focused 3-Button Action Footer (Zero Duplicate Tabs) */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleResearchExamInChat()}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#e4b86a] to-amber-500 hover:from-[#d6a95b] hover:to-amber-400 px-4 py-1.5 text-xs font-bold text-[#1a1408] transition shadow-sm touch-manipulation"
              >
                <Sparkles className="size-3.5" />
                <span>Full Study Guide in Chat</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleResearchExamInChat(
                    `Generate a high-yield 10-question board simulation practice quiz for ${activeExam.name} by ${activeExam.provider} with options (A-E), detailed rationales, and key takeaways.`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-100 border border-white/10 transition"
              >
                <CheckSquare className="size-3.5 text-teal-400" />
                <span>10-Q Practice Quiz</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleResearchExamInChat(
                    `Create a comprehensive week-by-week 12-week master study roadmap for ${activeExam.name} by ${activeExam.provider}, including weekly topics, daily question targets, and mock milestones.`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-100 border border-white/10 transition"
              >
                <Calendar className="size-3.5 text-[#e4b86a]" />
                <span>12-Week Study Plan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
