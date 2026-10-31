"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderPlus,
  FileCode,
  FileText,
  File,
  Plus,
  Trash2,
  X,
  Upload,
  Search,
  Check,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Layers,
} from "lucide-react";

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  content: string;
  updatedAt: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  files: WorkspaceFile[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "noctis_workspace_projects_v1";

export function getActiveProjectContext(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    const projects: WorkspaceProject[] = JSON.parse(raw);
    const activeId = localStorage.getItem("noctis_active_project_id");
    const active = projects.find((p) => p.id === activeId) || projects[0];
    if (!active || !active.files.length) return "";

    const fileSummaries = active.files.map((f) => {
      const preview = f.content.slice(0, 400).replace(/\n+/g, " ");
      return `File: ${f.path || f.name} (${f.size} bytes)\nPreview: ${preview}...`;
    }).join("\n\n");

    return `[Active Project: ${active.name}]\nDescription: ${active.description}\n\nProject Files:\n${fileSummaries}`;
  } catch {
    return "";
  }
}

interface NoctisWorkspaceExplorerProps {
  open: boolean;
  onClose: () => void;
  onAttachFileToChat?: (file: WorkspaceFile) => void;
}

export function NoctisWorkspaceExplorer({
  open,
  onClose,
  onAttachFileToChat,
}: NoctisWorkspaceExplorerProps) {
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [fileDraftContent, setFileDraftContent] = useState("");
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: WorkspaceProject[] = JSON.parse(raw);
        setProjects(parsed);
        const storedActive = localStorage.getItem("noctis_active_project_id");
        if (storedActive && parsed.some((p) => p.id === storedActive)) {
          setActiveProjectId(storedActive);
        } else if (parsed.length > 0) {
          setActiveProjectId(parsed[0].id);
        }
      } else {
        // Seed an initial demo project
        const demo: WorkspaceProject = {
          id: "proj-default",
          name: "Enterprise Security & Infrastructure",
          description: "Microservices architecture, authentication tokens, and audit policies.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          files: [
            {
              id: "f-1",
              name: "auth-guard.ts",
              path: "src/auth/auth-guard.ts",
              size: 1420,
              type: "typescript",
              content: `import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';\n\n@Injectable()\nexport class AuthGuard implements CanActivate {\n  canActivate(context: ExecutionContext): boolean {\n    const req = context.switchToHttp().getRequest();\n    const token = req.headers['authorization'];\n    if (!token) throw new UnauthorizedException('Token missing');\n    // Verify tenant isolation\n    return req.user?.tenantId === req.params.tenantId;\n  }\n}`,
              updatedAt: new Date().toISOString(),
            },
            {
              id: "f-2",
              name: "schema-policy.json",
              path: "config/schema-policy.json",
              size: 890,
              type: "json",
              content: `{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "title": "TenantPolicy",\n  "required": ["tenantId", "roles", "auditLogging"],\n  "properties": {\n    "tenantId": { "type": "string" },\n    "roles": { "type": "array", "items": { "type": "string" } },\n    "auditLogging": { "type": "boolean", "default": true }\n  }\n}`,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
        setProjects([demo]);
        setActiveProjectId(demo.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([demo]));
        localStorage.setItem("noctis_active_project_id", demo.id);
      }
    } catch {
      // ignore
    }
  }, [open]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  function persist(updated: WorkspaceProject[], newActiveId?: string) {
    setProjects(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (newActiveId) {
        localStorage.setItem("noctis_active_project_id", newActiveId);
        setActiveProjectId(newActiveId);
      }
    }
  }

  function handleCreateProject() {
    if (!newProjectName.trim()) return;
    const p: WorkspaceProject = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      description: "Custom project workspace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: [],
    };
    const next = [...projects, p];
    persist(next, p.id);
    setNewProjectName("");
    setShowNewProjectModal(false);
  }

  function handleDeleteProject(id: string) {
    if (projects.length <= 1) {
      alert("You must keep at least one project workspace.");
      return;
    }
    if (confirm("Delete this project and all its files?")) {
      const next = projects.filter((p) => p.id !== id);
      persist(next, next[0]?.id);
      setSelectedFile(null);
    }
  }

  function handleCreateFile() {
    if (!activeProject || !newFileName.trim()) return;
    const f: WorkspaceFile = {
      id: `f-${Date.now()}`,
      name: newFileName.trim(),
      path: newFileName.trim(),
      size: newFileContent.length,
      type: newFileName.split(".").pop() || "txt",
      content: newFileContent,
      updatedAt: new Date().toISOString(),
    };
    const updatedProject: WorkspaceProject = {
      ...activeProject,
      files: [...activeProject.files, f],
      updatedAt: new Date().toISOString(),
    };
    const next = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
    persist(next);
    setNewFileName("");
    setNewFileContent("");
    setShowAddFileModal(false);
    setSelectedFile(f);
  }

  function handleDeleteFile(fileId: string) {
    if (!activeProject) return;
    const updatedFiles = activeProject.files.filter((f) => f.id !== fileId);
    const updatedProject: WorkspaceProject = {
      ...activeProject,
      files: updatedFiles,
      updatedAt: new Date().toISOString(),
    };
    const next = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
    persist(next);
    if (selectedFile?.id === fileId) setSelectedFile(null);
  }

  function handleSaveFileContent() {
    if (!activeProject || !selectedFile) return;
    const updatedFiles = activeProject.files.map((f) =>
      f.id === selectedFile.id ? { ...f, content: fileDraftContent, size: fileDraftContent.length, updatedAt: new Date().toISOString() } : f
    );
    const updatedProject: WorkspaceProject = {
      ...activeProject,
      files: updatedFiles,
      updatedAt: new Date().toISOString(),
    };
    const next = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
    persist(next);
    setSelectedFile({ ...selectedFile, content: fileDraftContent, size: fileDraftContent.length });
    setIsEditingFile(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeProject || !e.target.files) return;
    const fileList = Array.from(e.target.files);
    const readPromises = fileList.map((file) => {
      return new Promise<WorkspaceFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = (event.target?.result as string) || "";
          resolve({
            id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            path: file.name,
            size: file.size,
            type: file.name.split(".").pop() || "txt",
            content: text,
            updatedAt: new Date().toISOString(),
          });
        };
        reader.readAsText(file);
      });
    });

    const newFiles = await Promise.all(readPromises);
    const updatedProject: WorkspaceProject = {
      ...activeProject,
      files: [...activeProject.files, ...newFiles],
      updatedAt: new Date().toISOString(),
    };
    const next = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
    persist(next);
  }

  if (!open) return null;

  const filteredFiles = activeProject?.files.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.content.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-white/12 bg-[#191919] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5 bg-[#202020]">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#e4b86a]/20 text-[#e4b86a]">
              <Layers className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Project Workspace & Explorer</h2>
              <p className="text-[11px] text-zinc-400">Claude-style multi-file project knowledge base</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Workspace Body: Split Project list & File Explorer */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar: Projects List */}
          <aside className="w-60 shrink-0 border-r border-white/10 bg-[#161616] p-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <span>Projects ({projects.length})</span>
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(true)}
                  className="grid size-5 place-items-center rounded hover:bg-white/10 text-zinc-300 hover:text-white"
                  title="New Project"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {showNewProjectModal ? (
                <div className="p-2 bg-black/40 rounded-xl border border-white/10 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name..."
                    className="w-full text-xs bg-transparent border-b border-white/20 pb-1 outline-none text-white placeholder:text-zinc-500"
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowNewProjectModal(false)}
                      className="text-[10px] px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#e4b86a] text-black font-semibold"
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1 overflow-y-auto max-h-[58vh]">
                {projects.map((p) => {
                  const active = p.id === activeProject?.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActiveProjectId(p.id);
                        if (typeof window !== "undefined") localStorage.setItem("noctis_active_project_id", p.id);
                        setSelectedFile(null);
                      }}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition ${
                        active
                          ? "bg-[#e4b86a]/15 text-[#e4b86a] ring-1 ring-[#e4b86a]/30"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className="size-3.5 shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <span className="text-[10px] opacity-60 shrink-0">
                        {p.files.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-3">
              <span className="text-[11px] text-zinc-500 block truncate">
                Active: {activeProject?.name}
              </span>
            </div>
          </aside>

          {/* Middle: File Tree & Search */}
          <div className="w-72 shrink-0 border-r border-white/10 bg-[#191919] p-3 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Search & Action bar */}
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs">
                <Search className="size-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search project files..."
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
                />
              </div>

              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[11px]">
                  Files ({filteredFiles.length})
                </span>
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer grid size-6 place-items-center rounded text-zinc-400 hover:bg-white/10 hover:text-white" title="Upload files">
                    <Upload className="size-3.5" />
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddFileModal(true)}
                    className="grid size-6 place-items-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
                    title="New File"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Files List */}
              <div className="space-y-1 overflow-y-auto max-h-[64vh]">
                {filteredFiles.length === 0 ? (
                  <p className="text-center py-6 text-xs text-zinc-500">
                    No files found. Click + or Upload to add files to this workspace.
                  </p>
                ) : (
                  filteredFiles.map((file) => {
                    const isSelected = selectedFile?.id === file.id;
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          setSelectedFile(file);
                          setFileDraftContent(file.content);
                          setIsEditingFile(false);
                        }}
                        className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs cursor-pointer transition ${
                          isSelected
                            ? "bg-white/15 text-white ring-1 ring-white/20"
                            : "text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {file.type === "ts" || file.type === "js" || file.type === "py" ? (
                            <FileCode className="size-3.5 shrink-0 text-amber-400" />
                          ) : (
                            <FileText className="size-3.5 shrink-0 text-blue-400" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 rounded transition"
                          title="Delete file"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="border-t border-white/10 pt-2 text-[11px] text-zinc-500">
              Total files: {activeProject?.files.length} • Auto-grounded in chat
            </div>
          </div>

          {/* Right Area: File Content Viewer / Editor */}
          <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden">
            {selectedFile ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-[#1a1a1a]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">{selectedFile.name}</span>
                    <span className="text-[10px] rounded bg-white/10 px-1.5 py-0.5 text-zinc-400">
                      {selectedFile.size} bytes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onAttachFileToChat ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAttachFileToChat(selectedFile);
                          onClose();
                        }}
                        className="rounded-lg bg-[#e4b86a]/20 px-2.5 py-1 text-xs font-semibold text-[#e4b86a] hover:bg-[#e4b86a]/30"
                      >
                        Attach to Prompt
                      </button>
                    ) : null}

                    {isEditingFile ? (
                      <button
                        type="button"
                        onClick={handleSaveFileContent}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingFile(true)}
                        className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/20 hover:text-white"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </header>

                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed text-zinc-200">
                  {isEditingFile ? (
                    <textarea
                      value={fileDraftContent}
                      onChange={(e) => setFileDraftContent(e.target.value)}
                      className="h-full w-full resize-none bg-transparent outline-none font-mono text-xs text-zinc-100"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap">{selectedFile.content || "(Empty file)"}</pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-zinc-500">
                <FileCode className="size-12 stroke-[1.2] mb-3 opacity-40 text-[#e4b86a]" />
                <p className="text-sm font-medium text-zinc-400">Select a file to inspect or edit</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Files uploaded to this workspace are automatically accessible to Noctis for cross-file architecture audits, code reviews, and deep inquiry.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Add File */}
        {showAddFileModal ? (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#222222] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Create New Workspace File</h3>
              <input
                autoFocus
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Filename (e.g. main.py, model.ts)..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#e4b86a]"
              />
              <textarea
                rows={6}
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="Initial file content or code..."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white outline-none focus:border-[#e4b86a]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFileModal(false)}
                  className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateFile}
                  className="rounded-xl bg-[#e4b86a] px-3.5 py-1.5 text-xs font-semibold text-black"
                >
                  Create File
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
