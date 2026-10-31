"use client";

import React, { useState } from "react";
import { Shield, KeyRound, Download, Upload, CheckCircle2, AlertTriangle, X, Lock, Unlock, Database } from "lucide-react";
import { createEncryptedVault, restoreEncryptedVault } from "@/lib/noctis-vault";

interface NoctisVaultModalProps {
  open: boolean;
  onClose: () => void;
  onRestored?: () => void;
}

export function NoctisVaultModal({ open, onClose, onRestored }: NoctisVaultModalProps) {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [exportPassword, setExportPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!open) return null;

  async function handleExport() {
    setErrorMsg("");
    setSuccessMsg("");
    if (!exportPassword || exportPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (exportPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setIsProcessing(true);
      const blob = await createEncryptedVault(exportPassword);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `noctis-vault-backup-${new Date().toISOString().split("T")[0]}.noctis`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setSuccessMsg("Encrypted .noctis vault created and downloaded successfully!");
      setExportPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create vault export.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleImport() {
    setErrorMsg("");
    setSuccessMsg("");
    if (!importFile) {
      setErrorMsg("Please select a .noctis vault file to restore.");
      return;
    }
    if (!importPassword) {
      setErrorMsg("Please enter the decryption password.");
      return;
    }

    try {
      setIsProcessing(true);
      const res = await restoreEncryptedVault(importFile, importPassword);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to restore vault.");
      } else {
        setSuccessMsg(`Vault restored successfully! (${res.meta.threadsCount} chats, ${res.meta.projectsCount} projects, ${res.meta.memoriesCount} memories).`);
        if (onRestored) onRestored();
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Decryption failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[26px] border border-white/12 bg-[#1b1b1b] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5 bg-[#222222]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-purple-500/20 text-purple-400">
              <Shield className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Encrypted Backup Vault</h2>
              <p className="text-[11px] text-zinc-400">Client-side AES-256 encrypted .noctis package</p>
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

        {/* Tab switcher */}
        <div className="flex border-b border-white/8 px-6 pt-2">
          <button
            type="button"
            onClick={() => {
              setTab("export");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              tab === "export"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Export Encrypted Vault
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("import");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              tab === "import"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Restore Vault (.noctis)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {errorMsg ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {successMsg ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          ) : null}

          {tab === "export" ? (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Export an AES-256 encrypted snapshot containing all chat conversations, workspace project files, custom memories, and canvas documents. The encryption key is derived directly in your browser using PBKDF2 with 100,000 iterations.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Encryption Password</label>
                <input
                  type="password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  placeholder="Enter a secure password (min 6 chars)..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white outline-none focus:border-purple-400"
                />
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition disabled:opacity-50"
              >
                <Lock className="size-3.5" />
                <span>{isProcessing ? "Encrypting..." : "Download Encrypted .noctis Vault"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Select an existing encrypted <code>.noctis</code> file and enter the password to restore all threads, projects, and personalized rules into this browser session.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Vault File (.noctis)</label>
                <input
                  type="file"
                  accept=".noctis"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-zinc-300 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Decryption Password</label>
                <input
                  type="password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  placeholder="Enter vault password..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white outline-none focus:border-purple-400"
                />
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleImport}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
              >
                <Unlock className="size-3.5" />
                <span>{isProcessing ? "Decrypting & Restoring..." : "Restore Noctis Vault"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
