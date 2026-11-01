"use client";

export interface GmailMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  label: "Urgent" | "Security" | "Work" | "Personal" | "Updates";
  body: string;
  attachments?: { name: string; size: string }[];
}

const DEFAULT_GMAIL_MESSAGES: GmailMessage[] = [
  {
    id: "msg-101",
    fromName: "DStrike Security Ops",
    fromEmail: "secops@dstrike.app",
    to: "kasiedu@expedite-consults.com",
    subject: "[P1 Security Alert] Anomaly in API Gateway rate limit thresholds",
    snippet: "Automated alert: Inbound traffic spike detected from ASN 14061. XTRIKE SAST rules triggered...",
    date: "10:42 AM",
    isUnread: true,
    isStarred: true,
    label: "Security",
    body: `Hello Team,

Automated Alert triggered at 10:41:02 UTC:
Inbound request rate on /api/v1/health exceeded baseline threshold (450 req/sec vs 60 normal).
Originating ASN: ASN14061 (DigitalOcean Frankfurt).

Action taken:
- Circuit breaker tripwire armed
- Rate limit clamped to 120 req/min for non-authenticated clients
- All sensitive clinical and valuation payloads were isolated behind zero-trust air gap.

Recommended Next Steps:
1. Review active telemetry in Noctis War Room.
2. Confirm if synthetic fuzzing lab from TREPATH was scheduled.
3. Validate certificate fingerprint and TLS 1.3 cipher suite.

Regards,
DStrike Autonomous SecOps Agent`,
    attachments: [{ name: "incident-telemetry-101.json", size: "142 KB" }],
  },
  {
    id: "msg-102",
    fromName: "Google Cloud Platform",
    fromEmail: "billing@google.com",
    to: "kasiedu@expedite-consults.com",
    subject: "Monthly Statement & Cloud GPU Allocation for Noctis AI Cluster",
    snippet: "Your Google Cloud billing statement for October 2026 is ready. Total usage: $1,420.50 with 8x H100 reservations...",
    date: "Yesterday",
    isUnread: true,
    isStarred: false,
    label: "Work",
    body: `Dear Expedite Consults Admin,

Your Google Cloud Platform billing statement for project 'noctis-sovereign-prod' is now available:

Invoice Number: GCP-2026-10-88412
Billing Period: Oct 1 - Oct 31, 2026
Total Amount: $1,420.50

Key Resource Breakdowns:
- Vertex AI & Custom TPU v5e Inference: $840.20
- Cloud Run & Global Edge CDN: $290.10
- Cloud Armor DDoS Protection: $190.00
- Persistent SSD & Cloud Storage: $100.20

No action required. Automatic payment will be processed on Nov 3, 2026.`,
    attachments: [{ name: "Invoice_GCP_Oct2026.pdf", size: "2.1 MB" }],
  },
  {
    id: "msg-103",
    fromName: "Dr. Kasiedu (Clinical Lab)",
    fromEmail: "kasiedu@expedite-consults.com",
    to: "noctis-physician@dstrike.app",
    subject: "Clinical Differential Review — Patient #8849 Longitudinal Chemistry Panel",
    snippet: "Longitudinal chemistry labs received: Serum Potassium 6.4 mmol/L, Creatinine elevated to 2.4 mg/dL...",
    date: "Oct 30",
    isUnread: true,
    isStarred: true,
    label: "Urgent",
    body: `Clinical Consult Request:

Patient ID: #8849 (58-year-old male)
Presenting complaint: Progressive generalized fatigue, muscle weakness, palpitations for 48 hours.

Active Medications:
- Lisinopril 20mg daily
- Spironolactone 25mg daily
- Metformin 1000mg BID
- OTC Ibuprofen 800mg TID for chronic lumbar pain

Current Chemistry Panel:
- Serum Potassium (K+): 6.4 mmol/L (H)
- Creatinine: 2.4 mg/dL (Baseline 1.1 mg/dL 3 months ago)
- BUN: 48 mg/dL
- eGFR (2021 CKD-EPI): 28 mL/min/1.73m² (Acute drop from 78)
- Blood Pressure: 96/60 mmHg, HR 112 bpm regular

Please perform Noctis Physician Dx clinical differential analysis, ECG urgency assessment, and medication reconciliation.`,
  },
  {
    id: "msg-104",
    fromName: "GitHub Actions",
    fromEmail: "notifications@github.com",
    to: "kasiedu@expedite-consults.com",
    subject: "Run succeeded: Noctis AI Core Verification & Polyglot 710 Test Suite",
    snippet: "Workflow 'Sovereign CI' for commit 2c85adc completed with status SUCCESS. All 74 test suites passed in 3.4s...",
    date: "Oct 29",
    isUnread: false,
    isStarred: false,
    label: "Work",
    body: `All checks have passed on Danquah12/noctis-ai:

Branch: main
Commit: 2c85adc ("feat(plugins-forge): distribute plugins across Pictures, Library, Tools, More")
Triggered by: kasiedu

Test Matrix Results:
✓ Sovereign Audio Synthesizer (0 failures)
✓ Noctis Brain Multi-Provider Config (0 failures)
✓ Vibe Limits & 60-Domain Math Integrity (0 failures)
✓ Noctis Voice Mode Engine (0 failures)

Total: 74 passed, 0 failed, 0 skipped.
Deployment to Vercel production edge completed successfully: https://dstrike.app/noctis`,
  },
];

const GMAIL_STORAGE_KEY = "noctis_gmail_inbox_v1";

export function loadGmailMessages(): GmailMessage[] {
  if (typeof window === "undefined") return DEFAULT_GMAIL_MESSAGES;
  try {
    const raw = localStorage.getItem(GMAIL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify(DEFAULT_GMAIL_MESSAGES));
      return DEFAULT_GMAIL_MESSAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_GMAIL_MESSAGES;
  } catch {
    return DEFAULT_GMAIL_MESSAGES;
  }
}

export function saveGmailMessages(messages: GmailMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

export function searchGmail(query: string, labelFilter?: string): GmailMessage[] {
  const all = loadGmailMessages();
  const q = query.trim().toLowerCase();

  return all.filter((msg) => {
    if (labelFilter && labelFilter !== "All") {
      if (labelFilter === "Starred" && !msg.isStarred) return false;
      if (labelFilter === "Unread" && !msg.isUnread) return false;
      if (labelFilter !== "Starred" && labelFilter !== "Unread" && msg.label !== labelFilter) return false;
    }

    if (!q) return true;

    // Search query syntax
    if (q.startsWith("is:unread")) return msg.isUnread;
    if (q.startsWith("is:starred")) return msg.isStarred;
    if (q.startsWith("from:")) {
      const sender = q.replace("from:", "").trim();
      return msg.fromEmail.toLowerCase().includes(sender) || msg.fromName.toLowerCase().includes(sender);
    }
    if (q.startsWith("label:")) {
      const lbl = q.replace("label:", "").trim();
      return msg.label.toLowerCase() === lbl;
    }

    return (
      msg.subject.toLowerCase().includes(q) ||
      msg.fromName.toLowerCase().includes(q) ||
      msg.fromEmail.toLowerCase().includes(q) ||
      msg.snippet.toLowerCase().includes(q) ||
      msg.body.toLowerCase().includes(q)
    );
  });
}

export function sendGmailMessage(to: string, subject: string, body: string): GmailMessage {
  const all = loadGmailMessages();
  const newMsg: GmailMessage = {
    id: `msg-${Date.now()}`,
    fromName: "Kasiedu (Noctis Desk)",
    fromEmail: "kasiedu@expedite-consults.com",
    to,
    subject: subject || "No Subject",
    snippet: body.slice(0, 100),
    date: "Just now",
    isUnread: false,
    isStarred: false,
    label: "Work",
    body,
  };
  const updated = [newMsg, ...all];
  saveGmailMessages(updated);
  return newMsg;
}
