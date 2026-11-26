import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#0a0f12] px-6 py-10 text-zinc-200">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/noctis"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-white/10"
        >
          <ArrowLeft className="size-3.5" />
          Back to Noctis
        </Link>

        <header className="space-y-2 rounded-2xl border border-emerald-400/25 bg-[#10181c] p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="size-3.5" />
            dstrike.app · Independent Platform Disclosure & Privacy Policy
          </div>
          <h1 className="text-2xl font-bold text-white">Noctis & Vibe Connect Privacy Notice</h1>
          <p className="text-sm text-zinc-400">
            Effective November 26, 2026 · Operated exclusively at dstrike.app
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#10181c] p-6 text-sm leading-relaxed">
          <h2 className="text-base font-semibold text-white">1. Independent Platform Identity</h2>
          <p className="text-zinc-300">
            <strong>dstrike.app</strong> (Noctis & Vibe Connect) is an independent software engineering workspace, learning desk, and peer-to-peer WebRTC communication platform. We are not affiliated with, endorsed by, or impersonating any third-party payment provider, cybersecurity vendor, carrier, or government agency. All domain telemetry, cybersecurity simulations, and engineering sandboxes are self-contained educational and engineering tools.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">2. End-to-End Encrypted Messaging & Peer-to-Peer Calling</h2>
          <p className="flex items-start gap-2 text-zinc-300">
            <Lock className="mt-1 size-4 shrink-0 text-emerald-400" />
            <span>
              Vibe Connect direct and group messages support client-side <strong>ECDH P-256 + AES-GCM 256</strong> encryption where keys remain on your device and servers store ciphertext only. Voice and video calls use encrypted WebRTC peer connections with optional user-initiated contacts and Web Push ringing.
            </span>
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">3. Credentials, BYOK & Data Handling</h2>
          <p className="text-zinc-300">
            Optional user-supplied API keys (BYOK) and registered phone/contact entries are saved solely at your explicit request for your workspace session and are never sold or shared with advertisers. AI copilot tools on private threads run strictly on explicit user opt-in actions.
          </p>

          <h2 className="pt-2 text-base font-semibold text-white">4. Security & Privacy Contact</h2>
          <p className="text-zinc-300">
            To report a security issue, abuse concern, or request account/contact deletion, email{" "}
            <a href="mailto:security@dstrike.app" className="text-emerald-300 underline">
              security@dstrike.app
            </a>
            . Vulnerability disclosure metadata is published at{" "}
            <a href="/.well-known/security.txt" className="text-emerald-300 underline">
              /.well-known/security.txt
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
