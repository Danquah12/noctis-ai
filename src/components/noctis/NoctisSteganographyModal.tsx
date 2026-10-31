import { useState, useMemo } from "react";
import {
  FileLock,
  Eye,
  EyeOff,
  Search,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Download,
  FileCode,
  MessageSquare,
  X,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  embedWatermark,
  scanForensicWatermark,
  formatForensicScanMarkdown,
  type ForensicScanResult,
} from "@/lib/noctis-steganography";

interface NoctisSteganographyModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInCanvas?: (markdown: string, title: string) => void;
  onInsertToChat?: (text: string) => void;
}

const SAMPLE_CLEAN =
  "CONFIDENTIAL MEMORANDUM: Board of Directors approved Q4 corporate treasury allocation of $15,000,000 to sovereign sovereign data centers.";

export function NoctisSteganographyModal({
  open,
  onClose,
  onOpenInCanvas,
  onInsertToChat,
}: NoctisSteganographyModalProps) {
  const [activeTab, setActiveTab] = useState<"embed" | "scan">("embed");
  const [embedInput, setEmbedInput] = useState<string>(SAMPLE_CLEAN);
  const [operatorBadge, setOperatorBadge] = useState<string>("CISO-DIRECTOR-01");
  const [watermarkedOutput, setWatermarkedOutput] = useState<string>("");
  const [scanInput, setScanInput] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Generate initial watermark on mount or input change
  const embeddedResult = useMemo(() => {
    return embedWatermark(embedInput, { operatorBadge });
  }, [embedInput, operatorBadge]);

  const scanResult: ForensicScanResult = useMemo(() => {
    const textToScan = scanInput || embeddedResult.watermarkedText;
    return scanForensicWatermark(textToScan);
  }, [scanInput, embeddedResult.watermarkedText]);

  const dossierMarkdown = useMemo(() => {
    return formatForensicScanMarkdown(scanResult);
  }, [scanResult]);

  const handleCopyWatermarked = () => {
    navigator.clipboard.writeText(embeddedResult.watermarkedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTamperTest = () => {
    // Modify a single digit in the watermarked text to demonstrate tamper detection
    const tampered = embeddedResult.watermarkedText.replace("15,000,000", "99,000,000");
    setScanInput(tampered);
    setActiveTab("scan");
  };

  const handleExportCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(dossierMarkdown, `Forensic Audit: ${scanResult.scanId}`);
      onClose();
    }
  };

  const handleInsertChat = () => {
    if (onInsertToChat) {
      onInsertToChat(dossierMarkdown);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-purple-500/30 bg-[#070b14] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-purple-900/40 bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-black px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <FileLock className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Noctis Steganographic Forensic Provenance Vault
                </h2>
                <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-purple-300 uppercase">
                  Zero-Width Invisible Unicode
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Embeds invisible cryptographic provenance bits to track leaks, detect tampering & enforce chain of custody
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Switcher Ribbon */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 pt-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("embed")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "embed"
                  ? "border-purple-400 text-purple-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <EyeOff className="size-3.5" />
              Embed Invisible Watermark
            </button>
            <button
              onClick={() => setActiveTab("scan")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "scan"
                  ? "border-sky-400 text-sky-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Search className="size-3.5" />
              Forensic Leak & Tamper Scanner
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={handleTamperTest}
              className="flex items-center gap-1 rounded-lg bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 px-2.5 py-1 text-[11px] text-red-300 transition"
              title="Test Tamper Detection with Modified Value"
            >
              <AlertTriangle className="size-3" />
              Simulate Leak Tamper
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {activeTab === "embed" ? (
            <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Original Text to Protect:</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Operator:</span>
                  <input
                    type="text"
                    value={operatorBadge}
                    onChange={(e) => setOperatorBadge(e.target.value)}
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[11px] text-purple-300 font-mono"
                  />
                </div>
              </div>

              <textarea
                value={embedInput}
                onChange={(e) => setEmbedInput(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-black/60 p-3 text-xs text-zinc-200 border border-zinc-800 focus:outline-none focus:border-purple-500/50 font-mono resize-none leading-relaxed"
              />

              <div className="rounded-xl border border-purple-900/30 bg-purple-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300">
                    Watermarked Text (Visually Identical, Contains Invisible Zero-Width Payload):
                  </span>
                  <button
                    onClick={handleCopyWatermarked}
                    className="flex items-center gap-1 rounded bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-[11px] text-white font-medium transition"
                  >
                    <Copy className="size-3" />
                    {copied ? "Copied Invisible Payload!" : "Copy Protected Text"}
                  </button>
                </div>
                <div className="text-xs text-zinc-300 font-mono bg-black/40 rounded p-3 border border-white/5 whitespace-pre-wrap select-all">
                  {embeddedResult.watermarkedText}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Notice that the text looks 100% normal. Paste it into an email, Slack, Word doc, or code comment — the invisible provenance bits remain attached.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#050811] space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Suspect / Leaked Text Scanner:</span>
                <button
                  onClick={() => setScanInput(embeddedResult.watermarkedText)}
                  className="text-[11px] text-sky-400 hover:underline"
                >
                  Load Clean Watermarked Sample
                </button>
              </div>

              <textarea
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Paste any suspect document or leaked snippet here to scan for invisible provenance bits..."
                rows={5}
                className="w-full rounded-xl bg-black/60 p-3 text-xs text-zinc-200 border border-zinc-800 focus:outline-none focus:border-sky-500/50 font-mono resize-none leading-relaxed"
              />

              {/* Scan Diagnostics */}
              <div className={`rounded-xl p-3 border space-y-1.5 ${
                scanResult.tamperStatus === "AUTHENTIC_UNALTERED"
                  ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                  : scanResult.tamperStatus === "TAMPERED_MODIFIED"
                  ? "bg-red-950/30 border-red-500/50 text-red-200"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">Diagnostic Status:</span>
                    <span className="font-mono text-xs">{scanResult.tamperStatus}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    scanResult.watermarkPresent ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {scanResult.watermarkPresent ? "WATERMARK DETECTED" : "NO WATERMARK"}
                  </span>
                </div>
                <div className="text-xs leading-relaxed font-mono">{scanResult.diagnostic}</div>
              </div>
            </div>
          )}

          {/* Metadata Inspector Sidebar */}
          <div className="w-full lg:w-96 flex flex-col p-4 bg-[#0a0f1d] overflow-y-auto space-y-4">
            <div className="rounded-xl border border-purple-900/30 bg-zinc-900/50 p-3 space-y-2">
              <span className="text-xs font-semibold text-zinc-200">Provenance Payload Inspector</span>
              {scanResult.extractedPayload ? (
                <div className="text-[11px] text-zinc-400 space-y-1 font-mono">
                  <div>Session: <span className="text-purple-300">{scanResult.extractedPayload.sessionId}</span></div>
                  <div>Operator: <span className="text-zinc-200">{scanResult.extractedPayload.operatorBadge}</span></div>
                  <div>Timestamp: <span className="text-zinc-300">{scanResult.extractedPayload.timestamp}</span></div>
                  <div className="truncate">Origin Hash: <span className="text-emerald-400 truncate">{scanResult.extractedPayload.contentHash}</span></div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  No payload extracted yet. Embed a watermark or paste protected text into the scanner.
                </p>
              )}
            </div>

            {/* Cryptographic Seal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Forensic Seal</span>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 truncate bg-black/40 rounded p-1.5 border border-white/5">
                {scanResult.cryptographicSeal}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExportCanvas}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 text-xs transition shadow-lg shadow-purple-600/20"
              >
                <FileCode className="size-3.5" />
                Export to Canvas
              </button>
              <button
                onClick={handleInsertChat}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2.5 text-xs transition border border-zinc-700"
              >
                <MessageSquare className="size-3.5" />
                Insert into Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
