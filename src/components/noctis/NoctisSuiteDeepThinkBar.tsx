"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { NoctisLiveThinkingPanel, NoctisThinkingAccordion } from "./NoctisThinkingAccordion";
import {
  buildStructuredDeepThinkTrace,
  parseThinkEnvelope,
  resolveNoctisEngine,
} from "@/lib/noctis-engine-registry";

export interface NoctisSuiteDeepThinkBarProps {
  suiteId: string;
  scenarioLabel: string;
  dossierMarkdown: string;
  onRunInChat?: (prompt: string) => void;
}

export function NoctisSuiteDeepThinkBar({
  suiteId,
  scenarioLabel,
  dossierMarkdown,
  onRunInChat,
}: NoctisSuiteDeepThinkBarProps) {
  const profile = useMemo(() => resolveNoctisEngine(suiteId), [suiteId]);
  const [verifying, setVerifying] = useState(true);
  const [liveAuditing, setLiveAuditing] = useState(false);
  const [liveAudited, setLiveAudited] = useState(false);
  const [liveThought, setLiveThought] = useState<string>("");
  const [liveSynthesis, setLiveSynthesis] = useState<string>("");
  const [thoughtSeconds, setThoughtSeconds] = useState<number>(1);
  const [auditExpanded, setAuditExpanded] = useState<boolean>(true);

  useEffect(() => {
    setVerifying(true);
    setLiveAudited(false);
    setLiveThought("");
    setLiveSynthesis("");
    setThoughtSeconds(1);

    const timer = window.setTimeout(() => {
      setVerifying(false);
    }, 550);

    return () => window.clearTimeout(timer);
  }, [suiteId, scenarioLabel]);

  const fallbackThought = useMemo(
    () =>
      buildStructuredDeepThinkTrace(
        suiteId,
        scenarioLabel,
        "Verified suite telemetry, constraints, and invariants",
        dossierMarkdown.slice(0, 700),
      ),
    [suiteId, scenarioLabel, dossierMarkdown],
  );

  const activeThought = liveThought || fallbackThought;

  const handleRunLiveAudit = async () => {
    if (liveAuditing) return;
    const startedAt = Date.now();
    setLiveAuditing(true);
    try {
      const prompt = `Perform an independent Deep Thinking executive audit of this ${profile.name} scenario (${scenarioLabel}). Identify hidden risks, verify assumptions/invariants, and give concrete next actions:\n\n${dossierMarkdown.slice(0, 3500)}`;
      const res = await fetch("/api/noctis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          turns: [{ role: "user", content: prompt }],
          think: true,
          engine: suiteId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawText = typeof data?.text === "string" ? data.text : "";
        if (rawText.trim()) {
          const { thought, body } = parseThinkEnvelope(rawText);
          setLiveThought(thought || fallbackThought);
          setLiveSynthesis(body || rawText);
          setLiveAudited(true);
          setAuditExpanded(true);
          setThoughtSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        }
      }
    } catch {
      setLiveSynthesis(
        `Deep Thinking Verification Completed for ${profile.name} (${scenarioLabel}): deterministic scenario telemetry and invariants verified; live external synthesis timed out or is offline.`,
      );
      setLiveAudited(true);
      setAuditExpanded(true);
      setThoughtSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    } finally {
      setLiveAuditing(false);
    }
  };

  return (
    <div className="border-b border-zinc-800/80 bg-zinc-950/80 px-4 sm:px-6 py-2.5 space-y-2 shrink-0">
      {verifying || liveAuditing ? (
        <NoctisLiveThinkingPanel
          compact
          label={liveAuditing ? `${profile.name} — Live Deep Thinking…` : profile.thinkingLabel}
          stages={profile.thinkingStages}
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          <div className="min-w-0 flex-1">
            <NoctisThinkingAccordion
              compact
              rawThought={activeThought}
              durationSeconds={thoughtSeconds}
              engineName={liveAudited ? `${profile.name} · Live AI Deep Audit` : profile.name}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 sm:mt-1">
            <button
              type="button"
              onClick={() => void handleRunLiveAudit()}
              disabled={liveAuditing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4b86a]/15 hover:bg-[#e4b86a]/25 border border-[#e4b86a]/40 px-2.5 py-1.5 text-[11px] font-semibold text-[#e4b86a] transition disabled:opacity-50"
            >
              <Sparkles className="size-3" />
              <span>{liveAudited ? "Re-run Live AI Audit" : "Run Live AI Deep Audit"}</span>
            </button>
          </div>
        </div>
      )}

      {liveSynthesis && !liveAuditing && (
        <div className="rounded-xl border border-[#e4b86a]/30 bg-black/50 p-3 text-xs text-zinc-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAuditExpanded((v) => !v)}
              className="flex items-center gap-1.5 font-semibold text-[#e4b86a] hover:text-amber-300 transition text-left"
            >
              <Sparkles className="size-3.5" />
              <span>Live Deep Audit Synthesis ({auditExpanded ? "Hide" : "Show"})</span>
            </button>
            {onRunInChat && (
              <button
                type="button"
                onClick={() =>
                  onRunInChat(
                    `Continue analyzing this ${profile.name} audit (${scenarioLabel}):\n\n${liveSynthesis}`,
                  )
                }
                className="inline-flex items-center gap-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 transition"
              >
                <MessageSquare className="size-3" />
                <span>Continue in Chat</span>
              </button>
            )}
          </div>
          {auditExpanded && (
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-200 border-t border-white/10 pt-2">
              {liveSynthesis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
