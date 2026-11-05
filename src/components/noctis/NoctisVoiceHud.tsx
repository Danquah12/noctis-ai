import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  ShieldAlert,
  Zap,
  CheckCircle2,
  X,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseVoiceIntent,
  playTacticalFeedbackCue,
  speakTacticalConfirmation,
  type RecognizedVoiceCommand,
  type VoiceIntent,
} from "@/lib/noctis-voice-hud";

export interface NoctisVoiceHudProps {
  className?: string;
  onIntentTriggered?: (command: RecognizedVoiceCommand) => void;
  onOpenSwarm?: () => void;
  onOpenPassport?: () => void;
  onOpenTerminal?: () => void;
  onOpenGitHubModal?: () => void;
  onReviseArtifact?: (instruction: string) => void;
  onExecuteCode?: () => void;
}

export default function NoctisVoiceHud({
  className,
  onIntentTriggered,
  onOpenSwarm,
  onOpenPassport,
  onOpenTerminal,
  onOpenGitHubModal,
  onReviseArtifact,
  onExecuteCode,
}: NoctisVoiceHudProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastCommand, setLastCommand] = useState<RecognizedVoiceCommand | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        setInterimTranscript(interim);

        if (final.trim()) {
          dispatchSpokenCommand(final.trim());
          setInterimTranscript("");
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isActive) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch {
      setSupported(false);
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [isActive]);

  const toggleVoiceMode = () => {
    if (!isActive) {
      setIsActive(true);
      try {
        recognitionRef.current?.start();
        playTacticalFeedbackCue("STATUS_CHECK");
      } catch {
        /* ignore */
      }
    } else {
      setIsActive(false);
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
  };

  const dispatchSpokenCommand = (transcript: string) => {
    const cmd = parseVoiceIntent(transcript);
    setLastCommand(cmd);
    onIntentTriggered?.(cmd);

    // Audio cue
    playTacticalFeedbackCue(cmd.intent);

    // Tactical voice speech confirmation
    if (!isMuted) {
      speakTacticalConfirmation(cmd.tacticalConfirmation);
    }

    // Route actions
    switch (cmd.intent) {
      case "MESH_SWARM":
        onOpenSwarm?.();
        break;
      case "AUDIT_PASSPORT":
        onOpenPassport?.();
        break;
      case "DISPATCH_PR":
        onOpenGitHubModal?.();
        break;
      case "EXECUTE_SANDBOX":
        onExecuteCode?.();
        break;
      case "CONVERT_TABLE":
        onReviseArtifact?.(
          "Convert all metrics, invariant checks, system gates, and comparison data into comprehensive, fully populated markdown tables with clear column headers."
        );
        break;
      case "EXPLAIN_CODE":
        onReviseArtifact?.(
          "Interpret and explain this technical code in crystal-clear plain English for all users and executives."
        );
        break;
      case "OPTIMIZE_CODE":
        onReviseArtifact?.(
          "Review this code for edge cases, optimize performance, and append complete unit test cases."
        );
        break;
      case "MAKE_CONCISE":
        onReviseArtifact?.(
          "Make this artifact punchier, more concise, and highlight the highest-priority conclusions."
        );
        break;
      case "FUZZ_INVARIANTS":
      case "BLAST_RADIUS":
      case "STATUS_CHECK":
        onOpenTerminal?.();
        break;
      default:
        break;
    }
  };

  const sampleQuickCommands = [
    { label: "Assemble Swarm", phrase: "Convene mesh swarm consensus council" },
    { label: "Fuzz Invariants", phrase: "Run pre-mortem fuzzer on invariants" },
    { label: "Blast Radius", phrase: "Calculate operational blast radius" },
    { label: "Audit Passport", phrase: "Display sovereign audit passport" },
    { label: "Dispatch PR", phrase: "Dispatch GitHub pull request for this patch" },
    { label: "Run Sandbox", phrase: "Execute code in WASM sandbox" },
    { label: "Convert Table", phrase: "Convert all metrics to table" },
  ];

  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/10 bg-[#121214] p-3 text-zinc-100 shadow-2xl backdrop-blur-md transition-all",
        isActive ? "border-[#e4b86a]/40 ring-1 ring-[#e4b86a]/20" : "",
        className
      )}
    >
      {/* Top Header & Tactical Status */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={toggleVoiceMode}
              title={isActive ? "Deactivate Ambient Voice HUD" : "Activate Ambient Voice HUD"}
              className={cn(
                "relative grid size-8 place-items-center rounded-lg transition-all",
                isActive
                  ? "bg-[#e4b86a] text-black shadow-[0_0_15px_rgba(228,184,106,0.5)]"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              )}
            >
              {isActive ? <Mic className="size-4 animate-pulse" /> : <MicOff className="size-4" />}
            </button>
            {isActive && (
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wide uppercase text-zinc-200">
                Sovereign Voice HUD
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-500"
                )}
              >
                {isActive ? (isListening ? "Listening" : "Active") : "Standby"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              MIL-SPEC Hands-Free Autonomous Tactical Cockpit
            </p>
          </div>
        </div>

        {/* Audio Mute & Waveform Visualizer */}
        <div className="flex items-center gap-2">
          {/* Animated Frequency Bars */}
          <div className="flex items-end gap-0.5 h-4 px-1">
            {[40, 75, 55, 90, 60, 85, 30, 95].map((h, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full transition-all duration-150",
                  isActive
                    ? "bg-[#e4b86a] animate-pulse"
                    : "bg-zinc-800"
                )}
                style={{
                  height: isActive ? `${h}%` : "20%",
                  animationDelay: `${i * 90}ms`,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? "Unmute Tactical Voice Telemetry" : "Mute Tactical Voice Telemetry"}
            className="grid size-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            {isMuted ? <VolumeX className="size-3.5 text-rose-400" /> : <Volume2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Live Voice Transcript / Tactical Feedback Strip */}
      <div className="mt-2.5 min-h-[44px] rounded-lg bg-black/40 border border-white/5 p-2 font-mono text-xs">
        {interimTranscript ? (
          <div className="flex items-center gap-1.5 text-zinc-400 italic">
            <Radio className="size-3 animate-spin text-[#e4b86a]" />
            <span>&ldquo;{interimTranscript}...&rdquo;</span>
          </div>
        ) : lastCommand ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-400" />
                {lastCommand.intent}
              </span>
              <span className="text-zinc-500 text-[10px]">
                {Math.round(lastCommand.confidence * 100)}% match
              </span>
            </div>
            <p className="text-zinc-200 text-[11px] leading-relaxed">
              {lastCommand.tacticalConfirmation}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
            <Radio className="size-3 text-zinc-600" />
            <span>
              {isActive
                ? "Speak any tactical command (e.g. 'Assemble swarm', 'Fuzz invariants', 'Dispatch PR')..."
                : "Voice mode is in standby. Click microphone above to engage hands-free HUD."}
            </span>
          </div>
        )}
      </div>

      {/* Tactical Quick Command Pills (1-Click Voice Emulators) */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mr-0.5">
          Tactical Triggers:
        </span>
        {sampleQuickCommands.map((cmd) => (
          <button
            key={cmd.label}
            type="button"
            onClick={() => dispatchSpokenCommand(cmd.phrase)}
            className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition hover:border-[#e4b86a]/40 hover:bg-[#e4b86a]/15 hover:text-[#e4b86a]"
          >
            {cmd.label}
          </button>
        ))}
      </div>
    </div>
  );
}
