"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Code2,
  Database,
  Download,
  Eye,
  GitPullRequest,
  Layers,
  Play,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NoctisLivePreview from "@/components/noctis/NoctisLivePreview";
import {
  FORGE_12_AGENTS,
  FORGE_35_CAPABILITIES,
  FORGE_40_CATEGORIES,
  FORGE_COMPLEX_PLATFORMS,
  FORGE_STACK_PRESETS,
} from "@/lib/forge/forge-catalog";

type StudioStage =
  | "Design"
  | "Code"
  | "Preview"
  | "Database"
  | "Tests"
  | "Deploy"
  | "Projects"
  | "Environment";

function downloadZipBase64(b64: string, filename: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NoctisForgeBuilderStudio() {
  const [prompt, setPrompt] = useState(FORGE_COMPLEX_PLATFORMS[0]!.prompt);
  const [category, setCategory] = useState(FORGE_40_CATEGORIES[3]!.name);
  const [stack, setStack] = useState(FORGE_STACK_PRESETS[0]!);
  const [accentHex, setAccentHex] = useState("#06B6D4");
  const [stage, setStage] = useState<StudioStage>("Preview");

  const [activeProject, setActiveProject] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState("src/App.tsx");
  const [editInstruction, setEditInstruction] = useState("Add table analytics_events and use emerald palette");
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [envAudit, setEnvAudit] = useState<any>(null);
  const [prOut, setPrOut] = useState<any>(null);
  const [deployOut, setDeployOut] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  async function api(path: string, method = "GET", body?: unknown) {
    setErr("");
    const res = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok && json.status !== "BLOCKED_HUMAN_APPROVAL_REQUIRED") {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json;
  }

  async function refreshProjects() {
    const [st, env] = await Promise.all([
      api("/api/v2/forge/status"),
      api("/api/v2/forge/environment"),
    ]);
    setProjectsList(Array.isArray(st.projects) ? st.projects : []);
    setEnvAudit(env);
    if (!activeProject && Array.isArray(st.projects) && st.projects[0]?.id) {
      const full = await api(`/api/v2/forge/projects?id=${encodeURIComponent(st.projects[0].id)}`);
      if (full.project) {
        setActiveProject({
          projectId: full.project.id,
          name: full.project.name,
          category: { name: full.project.category, regulated: full.project.regulated_domain !== "NONE" },
          stack: full.project.stack,
          currentRevision: full.project.current_revision,
          spec: full.project.spec_json,
          qaSecurity: full.project.qa_security_json,
          deployState: full.project.deploy_state_json,
          files: full.project.files_json,
          fileNames: Object.keys(full.project.files_json || {}),
        });
        setRevisions(Array.isArray(full.revisions) ? full.revisions : []);
      }
    }
  }

  useEffect(() => {
    void refreshProjects();
  }, []);

  async function generateProject() {
    setBusy("Orchestrating 12 Noctis Forge Agents (Requirements -> Design -> Code -> SQL -> QA/SAST)...");
    try {
      const res = await api("/api/v2/forge/projects/generate", "POST", { prompt, category, stack, accentHex });
      setActiveProject(res);
      setStage("Preview");
      setSelectedFile("src/App.tsx");
      await refreshProjects();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Forge generation failed.");
    } finally {
      setBusy("");
    }
  }

  async function applyConversationalEdit() {
    if (!activeProject?.projectId || !editInstruction.trim()) return;
    setBusy("Applying surgical conversational revision & re-running QA/SAST...");
    try {
      const res = await api("/api/v2/forge/projects/edit", "POST", {
        projectId: activeProject.projectId,
        instruction: editInstruction,
      });
      setActiveProject((prev: any) => ({
        ...prev,
        currentRevision: res.revisionNumber,
        qaSecurity: res.qaSecurity,
        files: res.files,
        fileNames: res.fileNames,
      }));
      const full = await api(`/api/v2/forge/projects?id=${encodeURIComponent(activeProject.projectId)}`);
      setRevisions(Array.isArray(full.revisions) ? full.revisions : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Edit failed.");
    } finally {
      setBusy("");
    }
  }

  const filesMap: Record<string, string> = activeProject?.files || {};

  return (
    <div className="space-y-4 text-xs text-zinc-100">
      {/* Noctis Builder Studio Top Composer */}
      <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="size-4 text-[#e4b86a]" />
              Noctis Forge Builder Studio — AI Website, App & Software Factory v1.0
            </h2>
            <p className="text-[11px] text-zinc-400">
              40 Categories · 35 Software-Company Capabilities · 12 Coordinated Agents · Interactive Live Preview · PostgreSQL Migrations · Full-Stack .ZIP Export
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FORGE_COMPLEX_PLATFORMS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPrompt(p.prompt);
                  setCategory(p.category);
                }}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/10"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-white"
          >
            {FORGE_40_CATEGORIES.map((c) => (
              <option key={c.id} value={c.name}>{`#${c.id} ${c.name}${c.regulated ? " (Regulated)" : ""}`}</option>
            ))}
          </select>
          <select
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            className="md:col-span-2 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-white"
          >
            {FORGE_STACK_PRESETS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="color"
            aria-label="Design accent color"
            value={accentHex}
            onChange={(e) => setAccentHex(e.target.value)}
            className="h-8 w-full rounded-lg border border-white/15 bg-black/60 p-0.5 cursor-pointer"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="What would you like to build?"
            className="flex-1 rounded-xl border border-white/15 bg-black/55 p-2.5 text-white focus:outline-none focus:border-[#e4b86a]"
          />
          <button
            type="button"
            onClick={() => void generateProject()}
            className="rounded-xl bg-[#e4b86a] hover:bg-[#efc77b] text-black font-bold px-4 py-2 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Play className="size-3.5" /> Generate project specification
          </button>
        </div>

        {/* Clean 6-Stage + Command Center Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "Design", icon: <Layers className="size-3.5" /> },
                { id: "Code", icon: <Code2 className="size-3.5" /> },
                { id: "Preview", icon: <Eye className="size-3.5" /> },
                { id: "Database", icon: <Database className="size-3.5" /> },
                { id: "Tests", icon: <ShieldCheck className="size-3.5" /> },
                { id: "Deploy", icon: <Rocket className="size-3.5" /> },
                { id: "Projects", icon: <Server className="size-3.5" /> },
                { id: "Environment", icon: <Wrench className="size-3.5" /> },
              ] as { id: StudioStage; icon: React.ReactNode }[]
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStage(s.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-medium border flex items-center gap-1 cursor-pointer",
                  stage === s.id
                    ? "bg-[#e4b86a]/20 border-[#e4b86a]/50 text-[#e4b86a]"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white",
                )}
              >
                {s.icon}
                <span>{s.id}</span>
              </button>
            ))}
          </div>

          {activeProject?.projectId && (
            <button
              type="button"
              onClick={async () => {
                const zipped = await api(`/api/v2/forge/projects/export-zip?id=${encodeURIComponent(activeProject.projectId)}`);
                if (zipped.base64) downloadZipBase64(zipped.base64, zipped.filename);
              }}
              className="rounded-lg border border-cyan-500/35 bg-cyan-500/15 hover:bg-cyan-500/25 px-3 py-1 text-[11px] font-semibold text-cyan-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="size-3.5" /> Download Source .ZIP
            </button>
          )}
        </div>
      </div>

      {(busy || err) && (
        <div className={cn("rounded-lg px-3 py-2 text-xs border", err ? "border-rose-500/35 bg-rose-500/10 text-rose-200" : "border-cyan-500/35 bg-cyan-500/10 text-cyan-200")}>
          {err || busy}
        </div>
      )}

      {/* Stage Workspace */}
      {activeProject && stage === "Preview" && (
        <div className="space-y-3">
          {/* Conversational & Visual Edit Bar */}
          <div className="rounded-xl border border-white/10 bg-[#121722] p-3 flex flex-col sm:flex-row gap-2 items-center">
            <span className="text-[11px] font-semibold text-zinc-300 shrink-0">
              {`Rev #${activeProject.currentRevision} · ${activeProject.name}`}
            </span>
            <input
              type="text"
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              placeholder="Conversational edit (e.g., Add table billing_invoices, switch to emerald theme)..."
              className="flex-1 rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-white"
            />
            <button
              type="button"
              onClick={() => void applyConversationalEdit()}
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-semibold text-white shrink-0"
            >
              Apply Edit Revision
            </button>
          </div>
          {filesMap["index.html"] && (
            <div className="h-[540px] rounded-xl overflow-hidden border border-white/15">
              <NoctisLivePreview code={filesMap["index.html"]} title={`${activeProject.name} (Rev #${activeProject.currentRevision})`} />
            </div>
          )}
        </div>
      )}

      {activeProject && stage === "Design" && (
        <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">12-Agent Architecture, Regulated Compliance & 35 Capabilities</h3>
          {activeProject.spec?.specialistAdvisory && (
            <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-amber-200">
              {activeProject.spec.specialistAdvisory}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {FORGE_12_AGENTS.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/10 bg-black/45 p-2.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-400" /> {a.role}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{a.owns}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-zinc-400">
            {`Forge Capabilities Active: ${FORGE_35_CAPABILITIES.length}/35 across Mobile, Desktop, PWA, Enterprise, Screenshot/Figma-to-Code, Migrations, QA & DevOps.`}
          </div>
        </div>
      )}

      {activeProject && stage === "Code" && (
        <div className="rounded-xl border border-white/10 bg-[#121722] p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="font-semibold text-zinc-300 mb-2">Generated Files ({Object.keys(filesMap).length})</div>
            {Object.keys(filesMap).map((fname) => (
              <button
                key={fname}
                type="button"
                onClick={() => setSelectedFile(fname)}
                className={cn(
                  "w-full text-left rounded px-2 py-1 text-[11px] font-mono truncate",
                  selectedFile === fname ? "bg-cyan-500/20 text-cyan-200" : "text-zinc-400 hover:bg-white/5",
                )}
              >
                {fname}
              </button>
            ))}
          </div>
          <pre className="md:col-span-3 rounded-lg border border-white/10 bg-black/65 p-3 font-mono text-[11px] text-emerald-200 overflow-auto max-h-[460px]">
            {filesMap[selectedFile] || ""}
          </pre>
        </div>
      )}

      {activeProject && stage === "Database" && (
        <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">PostgreSQL Schema & Seed Data</h3>
          <pre className="rounded-lg border border-white/10 bg-black/65 p-3 font-mono text-[11px] text-sky-200 overflow-auto max-h-72">
            {filesMap["migrations/0001_init.sql"] || ""}
          </pre>
          <pre className="rounded-lg border border-white/10 bg-black/65 p-3 font-mono text-[11px] text-emerald-200 overflow-auto max-h-40">
            {filesMap["migrations/seed.sql"] || ""}
          </pre>
        </div>
      )}

      {activeProject && stage === "Tests" && (
        <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">QA, SAST & WCAG 2.2 Verification Center</h3>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              {`${activeProject.qaSecurity?.checksPassed ?? 0}/${activeProject.qaSecurity?.checksTotal ?? 4} Checks Passed · WCAG ${activeProject.qaSecurity?.wcagContrastRatio ?? "—"}:1`}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(activeProject.qaSecurity?.qaChecks || []).map((q: any) => (
              <div key={q.name} className="rounded-lg border border-white/10 bg-black/45 p-2.5 flex items-center justify-between">
                <span className="text-zinc-200">{q.name}</span>
                <span className={q.passed ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>{q.passed ? "PASS" : "FAIL"}</span>
              </div>
            ))}
          </div>
          <pre className="rounded-lg border border-white/10 bg-black/65 p-3 font-mono text-[11px] text-zinc-200 overflow-auto max-h-56">
            {filesMap["tests/app.test.ts"] || ""}
          </pre>
        </div>
      )}

      {activeProject && stage === "Deploy" && (
        <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">GitHub PR Packaging, Version History & Human-Approved Staging Deploy</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => setPrOut(await api("/api/v2/forge/projects/github-pr", "POST", { projectId: activeProject.projectId }))}
              className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-white flex items-center gap-1.5"
            >
              <GitPullRequest className="size-3.5 text-cyan-300" /> Generate Sealed GitHub PR
            </button>
            <button
              type="button"
              onClick={async () => setDeployOut(await api("/api/v2/forge/projects/deploy", "POST", { projectId: activeProject.projectId, target: "STAGING", approver: "release-engineer" }))}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-semibold text-white flex items-center gap-1.5"
            >
              <Rocket className="size-3.5" /> Approve Staging Release
            </button>
          </div>
          {prOut && (
            <div className="rounded-lg border border-white/10 bg-black/45 p-2.5 text-cyan-200">
              {`Branch: ${prOut.branchName} · Requires Human Approval: ${String(prOut.requiresHumanApproval)} · Seal: ${prOut.sha256Attestation}`}
            </div>
          )}
          {deployOut && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-200">
              {`Deploy Status: ${deployOut.deployState?.stagingStatus} (Approved by ${deployOut.deployState?.approvedBy})`}
            </div>
          )}
          {revisions.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-zinc-300">Revision History ({revisions.length})</div>
              {revisions.map((r) => (
                <div key={r.id} className="rounded border border-white/10 bg-black/40 p-2 flex items-center justify-between">
                  <span>{`Rev #${r.revision_number} · ${r.change_summary} (${String(r.spec_sha256).slice(0, 12)})`}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const restored = await api("/api/v2/forge/projects/restore", "POST", {
                        projectId: activeProject.projectId,
                        revisionNumber: r.revision_number,
                      });
                      setActiveProject((prev: any) => ({ ...prev, currentRevision: restored.newRevisionNumber, files: restored.files }));
                    }}
                    className="rounded bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[10px] text-white"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {stage === "Projects" && (
        <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">Persisted Forge Projects ({projectsList.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {projectsList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={async () => {
                  const full = await api(`/api/v2/forge/projects?id=${encodeURIComponent(p.id)}`);
                  if (full.project) {
                    setActiveProject({
                      projectId: full.project.id,
                      name: full.project.name,
                      category: { name: full.project.category },
                      stack: full.project.stack,
                      currentRevision: full.project.current_revision,
                      spec: full.project.spec_json,
                      qaSecurity: full.project.qa_security_json,
                      files: full.project.files_json,
                    });
                    setRevisions(full.revisions || []);
                    setStage("Preview");
                  }
                }}
                className="text-left rounded-lg border border-white/10 bg-black/45 p-3 hover:border-[#e4b86a]/50"
              >
                <div className="font-semibold text-white">{p.name}</div>
                <div className="text-[10px] text-zinc-400">{`${p.category} · Rev #${p.current_revision} · ${p.status}`}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "Environment" && envAudit && (
        <div className="rounded-xl border border-white/10 bg-[#121722] p-4 space-y-2.5">
          <h3 className="text-sm font-semibold text-white">Noctis Development Environment Verification (Section 9 Audit)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(envAudit.checks || []).map((c: any) => (
              <div key={c.component} className="rounded-lg border border-white/10 bg-black/45 p-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{c.component}</span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0",
                      c.status.startsWith("LIVE_IN_REPO")
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-300",
                    )}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
