import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  RotateCw,
  Terminal,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Code2,
  Copy,
  Maximize2
} from "lucide-react";

interface NoctisLivePreviewProps {
  code: string;
  title?: string;
  className?: string;
}

export function extractRunnableCode(raw: string): { type: "html" | "react" | "js"; code: string } {
  const trimmed = raw.trim();

  // 1. Direct HTML Document
  const htmlMatch = trimmed.match(/```html\s*([\s\S]*?)\s*```/i);
  if (htmlMatch && htmlMatch[1]) {
    return { type: "html", code: htmlMatch[1] };
  }
  if (/<!DOCTYPE html>|<html[\s>]/i.test(trimmed)) {
    return { type: "html", code: trimmed };
  }

  // 2. React / TSX / JSX Component
  const tsxMatch = trimmed.match(/```(?:tsx|jsx|typescript|javascript)\s*([\s\S]*?)\s*```/i);
  const codeContent = tsxMatch ? tsxMatch[1] : trimmed;

  if (
    /import\s+React|export\s+default\s+function|const\s+[A-Z]\w+\s*=\s*\(\)\s*=>|function\s+[A-Z]\w+\s*\(|<[A-Z]\w+[\s\S]*?>/m.test(
      codeContent
    )
  ) {
    return { type: "react", code: codeContent };
  }

  return { type: "js", code: codeContent };
}

export function buildSandboxedHtml(extracted: { type: "html" | "react" | "js"; code: string }): string {
  if (extracted.type === "html") {
    // Inject console capture into raw HTML
    const consoleInterceptor = `
      <script>
        (function() {
          const _log = console.log, _err = console.error, _warn = console.warn;
          function send(type, args) {
            try {
              window.parent.postMessage({
                type: 'NOCTIS_SANDBOX_CONSOLE',
                level: type,
                args: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
              }, '*');
            } catch(e) {}
          }
          console.log = function() { send('log', arguments); _log.apply(console, arguments); };
          console.error = function() { send('error', arguments); _err.apply(console, arguments); };
          console.warn = function() { send('warn', arguments); _warn.apply(console, arguments); };
          window.onerror = function(msg, url, line) {
            send('error', ['Runtime Error: ' + msg + ' (line ' + line + ')']);
          };
        })();
      </script>
    `;
    return extracted.code.replace("<head>", `<head>${consoleInterceptor}`);
  }

  // React Component Wrapper (Transforms ES module imports and compiles JSX via Babel Standalone)
  let cleanReactCode = extracted.code
    // Remove import statements (mocked in sandbox global)
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "")
    // Convert 'export default function App' to 'function App'
    .replace(/export\s+default\s+function\s*([A-Za-z0-9_]*)/, "function App")
    // Convert 'export default App;' to ''
    .replace(/export\s+default\s+[A-Za-z0-9_]+;?/, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { margin: 0; padding: 0; background-color: #0d1117; color: #f0f6fc; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0d1117; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
  </style>
  <script>
    (function() {
      const _log = console.log, _err = console.error;
      function send(type, args) {
        try {
          window.parent.postMessage({
            type: 'NOCTIS_SANDBOX_CONSOLE',
            level: type,
            args: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
          }, '*');
        } catch(e) {}
      }
      console.log = function() { send('log', arguments); _log.apply(console, arguments); };
      console.error = function() { send('error', arguments); _err.apply(console, arguments); };
      window.onerror = function(msg, url, line) {
        send('error', ['[Runtime Exception]: ' + msg + ' (line ' + line + ')']);
      };
    })();
  </script>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    try {
      const { useState, useEffect, useRef, useMemo, useCallback } = React;
      
      // Standalone Lucide/Icon fallbacks
      const Shield = (props) => <i className="fa-solid fa-shield-halved" style={{ fontSize: props.size || 16 }} />;
      const Terminal = (props) => <i className="fa-solid fa-terminal" style={{ fontSize: props.size || 16 }} />;
      const AlertTriangle = (props) => <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: props.size || 16 }} />;
      const CheckCircle2 = (props) => <i className="fa-solid fa-circle-check" style={{ fontSize: props.size || 16 }} />;
      const Activity = (props) => <i className="fa-solid fa-chart-line" style={{ fontSize: props.size || 16 }} />;
      const Filter = (props) => <i className="fa-solid fa-filter" style={{ fontSize: props.size || 16 }} />;
      const Bug = (props) => <i className="fa-solid fa-bug" style={{ fontSize: props.size || 16 }} />;
      const Lock = (props) => <i className="fa-solid fa-lock" style={{ fontSize: props.size || 16 }} />;
      const Database = (props) => <i className="fa-solid fa-database" style={{ fontSize: props.size || 16 }} />;
      const Key = (props) => <i className="fa-solid fa-key" style={{ fontSize: props.size || 16 }} />;
      const RefreshCw = (props) => <i className="fa-solid fa-arrows-rotate" style={{ fontSize: props.size || 16 }} />;
      const Crosshair = (props) => <i className="fa-solid fa-crosshairs" style={{ fontSize: props.size || 16 }} />;
      const Play = (props) => <i className="fa-solid fa-play" style={{ fontSize: props.size || 16 }} />;
      const Server = (props) => <i className="fa-solid fa-server" style={{ fontSize: props.size || 16 }} />;
      const Eye = (props) => <i className="fa-solid fa-eye" style={{ fontSize: props.size || 16 }} />;

      ${cleanReactCode}

      // Automatically locate and render the component
      const targetComponent = typeof App !== 'undefined' ? App : Object.values(window).find(v => typeof v === 'function');
      if (targetComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(targetComponent));
      } else {
        document.getElementById('root').innerHTML = '<div style="padding: 24px; color: #f87171;">Error: No React root component detected to mount.</div>';
      }
    } catch(err) {
      console.error(err.message);
      document.getElementById('root').innerHTML = '<div style="padding: 24px; color: #f87171; font-family: monospace;"><b>Compilation Error:</b> ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
}

export default function NoctisLivePreview({
  code,
  title = "Live Sandboxed Artifact",
  className = ""
}: NoctisLivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [consoleLogs, setConsoleLogs] = useState<Array<{ level: string; msg: string; time: string }>>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [sandboxKey, setSandboxKey] = useState(0);

  const extracted = useMemo(() => extractRunnableCode(code), [code]);
  const sandboxedHtml = useMemo(() => buildSandboxedHtml(extracted), [extracted]);

  // Listen for console logs emitted from the iframe sandbox
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOCTIS_SANDBOX_CONSOLE") {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setConsoleLogs((prev) => [
          ...prev.slice(-49),
          { level: event.data.level, msg: event.data.args.join(" "), time }
        ]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleReload = () => {
    setConsoleLogs([]);
    setSandboxKey((k) => k + 1);
  };

  const viewportWidthClass = {
    desktop: "w-full",
    tablet: "w-[768px]",
    mobile: "w-[375px]"
  }[viewport];

  return (
    <div className={`flex flex-col h-full bg-[#090d13] text-zinc-100 rounded-2xl border border-white/10 overflow-hidden shadow-2xl font-sans ${className}`}>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white tracking-wide">{title}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 uppercase">
            {extracted.type.toUpperCase()} SANDBOX
          </span>
        </div>

        {/* Viewport Toggles & Reload */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              onClick={() => setViewport("desktop")}
              className={`p-1 rounded cursor-pointer transition ${viewport === "desktop" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              title="Desktop Viewport"
            >
              <Monitor className="size-3.5" />
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`p-1 rounded cursor-pointer transition ${viewport === "tablet" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              title="Tablet Viewport (768px)"
            >
              <Tablet className="size-3.5" />
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`p-1 rounded cursor-pointer transition ${viewport === "mobile" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              title="Mobile Viewport (375px)"
            >
              <Smartphone className="size-3.5" />
            </button>
          </div>

          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
            title="Reload Sandbox"
          >
            <RotateCw className="size-3.5" />
          </button>

          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition cursor-pointer ${
              showConsole ? "bg-[#e4b86a]/15 text-[#e4b86a] border-[#e4b86a]/30" : "text-zinc-400 border-white/10 hover:bg-white/5"
            }`}
          >
            <Terminal className="size-3" />
            Logs {consoleLogs.length > 0 && `(${consoleLogs.length})`}
          </button>
        </div>
      </div>

      {/* Main Sandbox Frame Container */}
      <div className="flex-1 overflow-auto bg-[#070a0e] flex items-center justify-center p-2 relative">
        <div className={`h-full transition-all duration-300 ${viewportWidthClass} bg-transparent flex flex-col`}>
          <iframe
            key={sandboxKey}
            ref={iframeRef}
            srcDoc={sandboxedHtml}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            title="Noctis Live Component Sandbox"
            className="w-full h-full border-0 rounded-xl bg-[#0d1117] shadow-lg"
          />
        </div>

        {/* Collapsible Console Drawer */}
        {showConsole && (
          <div className="absolute bottom-2 left-2 right-2 max-h-48 rounded-xl bg-black/90 border border-white/15 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 font-mono text-[11px]">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-zinc-400 bg-white/5">
              <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Terminal className="size-3 text-emerald-400" />
                Browser Sandbox Telemetry
              </span>
              <button
                onClick={() => setConsoleLogs([])}
                className="hover:text-zinc-200 text-[10px] cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="p-2.5 overflow-y-auto space-y-1 max-h-36">
              {consoleLogs.length === 0 ? (
                <div className="text-zinc-500 italic">No console logs emitted yet. Interact with the preview to test.</div>
              ) : (
                consoleLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-zinc-600 select-none">{log.time}</span>
                    <span className={log.level === "error" ? "text-rose-400" : log.level === "warn" ? "text-amber-400" : "text-zinc-300"}>
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
