"use client";

// --- Google Drive ---
export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: "doc" | "sheet" | "slide" | "pdf" | "folder";
  modifiedTime: string;
  size: string;
  owner: string;
  contentSnippet: string;
}

export const MOCK_DRIVE_FILES: DriveFileItem[] = [
  {
    id: "gdrive-1",
    name: "DStrike Sovereign Architecture & Security Blueprint 2026.docx",
    mimeType: "doc",
    modifiedTime: "Today at 9:15 AM",
    size: "3.4 MB",
    owner: "kasiedu@expedite-consults.com",
    contentSnippet: "Executive overview of the 16 sovereign neural engines, air-gap enclaves, and cryptographic proofs...",
  },
  {
    id: "gdrive-2",
    name: "Q4 Financial Valuation & ARR Multiple Models.xlsx",
    mimeType: "sheet",
    modifiedTime: "Yesterday",
    size: "1.8 MB",
    owner: "kasiedu@expedite-consults.com",
    contentSnippet: "Discounted Cash Flow (DCF), sensitivity bands, terminal values, and SaaS cohort retention tables...",
  },
  {
    id: "gdrive-3",
    name: "Noctis AI Product Keynote & Ecosystem Deck.pptx",
    mimeType: "slide",
    modifiedTime: "Oct 28",
    size: "14.2 MB",
    owner: "kasiedu@expedite-consults.com",
    contentSnippet: "40-slide presentation showcasing Voice Studio, Multi-Slide Canvas, and Sovereign Forge IDE...",
  },
  {
    id: "gdrive-4",
    name: "FDA FHIR R4 Clinical Diagnostic Protocol Audit.pdf",
    mimeType: "pdf",
    modifiedTime: "Oct 25",
    size: "5.1 MB",
    owner: "kasiedu@expedite-consults.com",
    contentSnippet: "Clinical verification protocol for acute hyperkalemia, CKD-EPI 2021 equations, and emergency escalation...",
  },
];

// --- GitHub ---
export interface GitHubRepoItem {
  id: string;
  fullName: string;
  branch: string;
  openPRs: number;
  openIssues: number;
  lastCommitMessage: string;
  lastCommitTime: string;
}

export const MOCK_GITHUB_REPOS: GitHubRepoItem[] = [
  {
    id: "gh-1",
    fullName: "Danquah12/noctis-ai",
    branch: "main",
    openPRs: 2,
    openIssues: 0,
    lastCommitMessage: "feat(plugin-executor): universal interactive execution runtime modal",
    lastCommitTime: "5 mins ago",
  },
  {
    id: "gh-2",
    fullName: "expedite-consults/trepath-2.0",
    branch: "main",
    openPRs: 1,
    openIssues: 3,
    lastCommitMessage: "fix(attack-graph): proof validator state convergence for 8-state ledger",
    lastCommitTime: "Yesterday",
  },
  {
    id: "gh-3",
    fullName: "expedite-consults/xtrike-sast-710",
    branch: "master",
    openPRs: 0,
    openIssues: 1,
    lastCommitMessage: "chore: update OWASP Top 10:2025 polyglot heuristics",
    lastCommitTime: "3 days ago",
  },
];

// --- Supabase ---
export interface SupabaseTableItem {
  tableName: string;
  rowCount: number;
  columns: string[];
}

export const MOCK_SUPABASE_TABLES: SupabaseTableItem[] = [
  {
    tableName: "user_profiles",
    rowCount: 1420,
    columns: ["id", "email", "display_name", "role", "created_at"],
  },
  {
    tableName: "conversation_threads",
    rowCount: 8940,
    columns: ["id", "user_id", "title", "turns_count", "updated_at"],
  },
  {
    tableName: "audit_ledger_blocks",
    rowCount: 24190,
    columns: ["block_height", "sha256_hash", "engine_id", "signature", "timestamp"],
  },
  {
    tableName: "api_tokens",
    rowCount: 320,
    columns: ["id", "service", "status", "expires_at"],
  },
];

// --- Health Biomarkers ---
export interface HealthBiomarker {
  name: string;
  value: string;
  unit: string;
  status: "normal" | "warning" | "critical";
  referenceRange: string;
  lastTested: string;
}

export const MOCK_HEALTH_BIOMARKERS: HealthBiomarker[] = [
  {
    name: "Serum Potassium (K+)",
    value: "4.2",
    unit: "mmol/L",
    status: "normal",
    referenceRange: "3.5 - 5.0",
    lastTested: "Today, 8:00 AM",
  },
  {
    name: "eGFR (2021 CKD-EPI)",
    value: "88",
    unit: "mL/min/1.73m²",
    status: "normal",
    referenceRange: "> 60",
    lastTested: "Today, 8:00 AM",
  },
  {
    name: "Blood Pressure",
    value: "118 / 76",
    unit: "mmHg",
    status: "normal",
    referenceRange: "< 120/80",
    lastTested: "Today, 8:15 AM",
  },
  {
    name: "Fasting Blood Glucose",
    value: "92",
    unit: "mg/dL",
    status: "normal",
    referenceRange: "70 - 99",
    lastTested: "Oct 28",
  },
  {
    name: "HbA1c",
    value: "5.4",
    unit: "%",
    status: "normal",
    referenceRange: "< 5.7",
    lastTested: "Oct 28",
  },
];
