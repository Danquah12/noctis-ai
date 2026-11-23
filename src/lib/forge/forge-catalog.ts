/**
 * Noctis Forge v1.0 Catalogs
 * - 40 Supported Website & Application Categories (with regulated-sector gates)
 * - 35 Software-Company Capabilities (#1-#35)
 * - 12 Specialized Development Agents
 * - Multi-Framework Stack Presets & 6 Complex Platform Blueprints
 */

export interface ForgeCategorySpec {
  id: number;
  slug: string;
  name: string;
  examples: string;
  regulated: boolean;
  specialistAdvisory: string | null;
  defaultStack: string;
  defaultEntities: string[];
}

export const FORGE_40_CATEGORIES: ForgeCategorySpec[] = [
  { id: 1, slug: "business", name: "Business websites", examples: "Company websites, consulting firms", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["services", "case_studies", "leads"] },
  { id: 2, slug: "ecommerce", name: "E-commerce", examples: "Online stores, product catalogs", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["products", "carts", "orders"] },
  { id: 3, slug: "social-media", name: "Social media", examples: "Community networks, video-sharing platforms", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["profiles", "posts", "comments", "moderation_queue"] },
  { id: 4, slug: "professional-networking", name: "Professional networking", examples: "LinkedIn-style platforms", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["profiles", "connections", "jobs", "messages"] },
  { id: 5, slug: "healthcare", name: "Healthcare", examples: "Clinics, hospitals, patient portals", regulated: true, specialistAdvisory: "Noctis Health & HIPAA Gate: Requires PHI encryption, audit logging, SMART-on-FHIR scoping & clinical review before production.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["patients", "appointments", "encounters", "fhir_observations"] },
  { id: 6, slug: "legal-services", name: "Legal services", examples: "Law firms, legal research platforms", regulated: true, specialistAdvisory: "Noctis Legal Gate: Non-UPL disclaimer, privilege segregation, FRCP deadline checks & barred-attorney review required.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["matters", "filings", "deadlines", "evidence_docs"] },
  { id: 7, slug: "government", name: "Government", examples: "Public service portals, agency websites", regulated: true, specialistAdvisory: "Noctis RMF/FedRAMP & Section 508 Gate: Requires WCAG 2.2 AA accessibility, FedRAMP/DoD ATO boundary & AO approval.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["citizen_requests", "permits", "audit_events"] },
  { id: 8, slug: "education", name: "Education", examples: "Schools, universities, e-learning", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["courses", "modules", "enrollments", "assessments"] },
  { id: 9, slug: "banking", name: "Banking", examples: "Customer banking portals, financial dashboards", regulated: true, specialistAdvisory: "Financial Regulatory Gate: Requires phishing-resistant MFA, GLBA/PCI controls, ledger immutability & BSA compliance audit.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["accounts", "ledger_entries", "transfers"] },
  { id: 10, slug: "fintech", name: "Fintech", examples: "Payments, invoicing, budgeting", regulated: true, specialistAdvisory: "Financial Regulatory Gate: Enforce PCI-DSS tokenization, AML/BSA structuring checks & idempotency keys.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["invoices", "payments", "payouts"] },
  { id: 11, slug: "insurance", name: "Insurance", examples: "Claims, policy management", regulated: true, specialistAdvisory: "Insurance Compliance Gate: State DOI underwriting rules, PHI/PII segregation & human claims adjudicator sign-off.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["policies", "claims", "underwriting_scores"] },
  { id: 12, slug: "real-estate", name: "Real estate", examples: "Property listings, rental platforms", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["properties", "leases", "inquiries"] },
  { id: 13, slug: "travel", name: "Travel", examples: "Booking sites, tourism platforms", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["destinations", "itineraries", "bookings"] },
  { id: 14, slug: "hospitality", name: "Hospitality", examples: "Hotels, restaurants, reservations", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["rooms_tables", "reservations", "menus"] },
  { id: 15, slug: "transportation", name: "Transportation", examples: "Ride-booking, delivery, fleet management", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["vehicles", "routes", "dispatches"] },
  { id: 16, slug: "logistics", name: "Logistics", examples: "Shipping, tracking, inventory", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["shipments", "warehouses", "inventory_items"] },
  { id: 17, slug: "job-boards", name: "Job boards", examples: "Recruitment and career websites", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["jobs", "candidates", "applications"] },
  { id: 18, slug: "freelance-marketplaces", name: "Freelance marketplaces", examples: "Service-provider marketplaces", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["providers", "gigs", "milestones"] },
  { id: 19, slug: "construction", name: "Construction", examples: "Contractor portals, project tracking", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["sites", "schedules", "inspections"] },
  { id: 20, slug: "automotive", name: "Automotive", examples: "Dealerships, repair shops, diagnostics", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["vehicles", "service_orders", "dtc_logs"] },
  { id: 21, slug: "agriculture", name: "Agriculture", examples: "Farm management, agricultural markets", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["plots", "yields", "irrigation_events"] },
  { id: 22, slug: "nonprofits", name: "Nonprofits", examples: "Donations, volunteers, fundraising", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["campaigns", "donors", "volunteers"] },
  { id: 23, slug: "religious-organizations", name: "Religious organizations", examples: "Churches, ministries, Bible study", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["sermons", "small_groups", "events"] },
  { id: 24, slug: "news-media", name: "News and media", examples: "Publishing, magazines, newsletters", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["articles", "authors", "subscribers"] },
  { id: 25, slug: "entertainment", name: "Entertainment", examples: "Streaming, music, video platforms", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["media_assets", "playlists", "creators"] },
  { id: 26, slug: "sports", name: "Sports", examples: "Clubs, teams, event platforms", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["teams", "matches", "standings"] },
  { id: 27, slug: "events", name: "Events", examples: "Ticketing, conferences, registration", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["events", "tickets", "attendees"] },
  { id: 28, slug: "cybersecurity", name: "Cybersecurity", examples: "SOC dashboards, vulnerability portals", regulated: true, specialistAdvisory: "Noctis Cyber Gate: Least-privilege RBAC, CISA KEV SLA tracking, tamper-evident audit & XTRIKE SAST scan mandatory.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["assets", "vulnerabilities", "incidents"] },
  { id: 29, slug: "rmf-grc", name: "RMF/GRC", examples: "Compliance and assessment platforms", regulated: true, specialistAdvisory: "Noctis RMF/GRC Gate: Strict DoD != IC != FedRAMP boundary separation & human Authorizing Official (AO) gate.", defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["systems", "controls", "poams", "evidence"] },
  { id: 30, slug: "ai-platforms", name: "AI platforms", examples: "Chatbots, AI agents, AI workspaces", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + Python FastAPI + PostgreSQL", defaultEntities: ["agents", "runs", "evaluations"] },
  { id: 31, slug: "saas-products", name: "SaaS products", examples: "Subscription software applications", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["tenants", "subscriptions", "api_keys"] },
  { id: 32, slug: "customer-portals", name: "Customer portals", examples: "Self-service and account management", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["accounts", "tickets", "invoices"] },
  { id: 33, slug: "admin-dashboards", name: "Admin dashboards", examples: "Reporting, operations, analytics", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["kpis", "audit_logs", "alerts"] },
  { id: 34, slug: "crm-systems", name: "CRM systems", examples: "Leads, sales, customer management", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["contacts", "deals", "activities"] },
  { id: 35, slug: "erp-systems", name: "ERP systems", examples: "Finance, HR, inventory, procurement", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["gl_accounts", "employees", "purchase_orders"] },
  { id: 36, slug: "project-management", name: "Project management", examples: "Tasks, collaboration, timelines", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["projects", "tasks", "milestones"] },
  { id: 37, slug: "forums", name: "Forums", examples: "Discussion boards, communities", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["threads", "replies", "moderators"] },
  { id: 38, slug: "auctions", name: "Auctions", examples: "Bidding and marketplace websites", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["lots", "bids", "escrow_records"] },
  { id: 39, slug: "portfolio", name: "Portfolio websites", examples: "Personal and creative portfolios", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + Tailwind", defaultEntities: ["projects", "testimonials", "contacts"] },
  { id: 40, slug: "custom-apps", name: "Custom applications", examples: "Any supported requirements-driven project", regulated: false, specialistAdvisory: null, defaultStack: "React + TypeScript + PostgreSQL + Tailwind", defaultEntities: ["records", "workflows", "audit_logs"] },
];

export const FORGE_35_CAPABILITIES = [
  // Group 1: Build more than websites (#1-#10)
  { num: 1, group: "Build more than websites", name: "Mobile App Builder", detail: "Generates Capacitor/React Native iOS & Android wrappers and touch-responsive views." },
  { num: 2, group: "Build more than websites", name: "Desktop App Builder", detail: "Generates Electron/Tauri-ready manifest & IPC bridge alongside cross-platform UI." },
  { num: 3, group: "Build more than websites", name: "Progressive Web App Builder", detail: "Generates valid manifest.webmanifest, offline service worker & installable icons." },
  { num: 4, group: "Build more than websites", name: "Enterprise Software Builder", detail: "Generates CRM, ERP, HR, procurement & GL ledger schemas with RBAC." },
  { num: 5, group: "Build more than websites", name: "AI Agent Builder", detail: "Generates tool-calling agent orchestrator endpoints & safety verification gates." },
  { num: 6, group: "Build more than websites", name: "Chatbot Builder", detail: "Generates customer service & specialist RAG chat widget backed by NDKRS." },
  { num: 7, group: "Build more than websites", name: "API Builder", detail: "Generates typed REST routes, OpenAPI 3.1 JSON spec, CORS & validation." },
  { num: 8, group: "Build more than websites", name: "Database Application Builder", detail: "Generates PostgreSQL DDL, indexes, foreign keys & CRUD data views." },
  { num: 9, group: "Build more than websites", name: "Workflow Automation Builder", detail: "Generates approval state machines, webhooks & audit logging." },
  { num: 10, group: "Build more than websites", name: "Game Builder", detail: "Generates HTML5 Canvas 60fps loop, collision/scoring & leaderboard state." },
  // Group 2: Advanced website-building capabilities (#11-#20)
  { num: 11, group: "Advanced website building", name: "Clone Your Own Website", detail: "Modernizes authorized user-owned site structure with preserved content." },
  { num: 12, group: "Advanced website building", name: "Website-to-Mobile App", detail: "Adapts existing generated web apps into mobile PWA/Capacitor packages." },
  { num: 13, group: "Advanced website building", name: "Visual Drag-and-Drop Editor", detail: "Reorder/edit sections, hero copy & palette tokens live in Studio." },
  { num: 14, group: "Advanced website building", name: "Conversational Editing", detail: "Modify app architecture, copy & features via natural language instructions." },
  { num: 15, group: "Advanced website building", name: "Screenshot-to-Code", detail: "Reconstructs responsive layout & palette from authorized screenshot descriptions." },
  { num: 16, group: "Advanced website building", name: "Figma-to-Application", detail: "Maps Figma JSON node hierarchy & design tokens into React/Tailwind code." },
  { num: 17, group: "Advanced website building", name: "Automated Website Migration", detail: "Generates migration plan & React/TS equivalent from legacy stacks." },
  { num: 18, group: "Advanced website building", name: "Website Performance Optimizer", detail: "Emits SEO meta, sitemap.xml, WCAG 2.2 contrast audit & bundle hints." },
  { num: 19, group: "Advanced website building", name: "Multilingual Website Builder", detail: "Generates localized EN/ES/FR/DE string dictionaries & language switcher." },
  { num: 20, group: "Advanced website building", name: "Website Maintenance Agent", detail: "Scans generated bundles for defects, broken links & dependency alerts." },
  // Group 3: Advanced engineering capabilities (#21-#30)
  { num: 21, group: "Advanced engineering", name: "Full-Stack Code Generator", detail: "Synchronizes React frontend, Node/TS backend, SQL schema & tests." },
  { num: 22, group: "Advanced engineering", name: "Architecture Design Agent", detail: "Defines component boundaries, auth model & regulated-sector controls." },
  { num: 23, group: "Advanced engineering", name: "Database Migration Agent", detail: "Emits idempotent UP + reversible DOWN PostgreSQL migrations." },
  { num: 24, group: "Advanced engineering", name: "Automated QA Engineer", detail: "Runs functional, schema, WCAG & SAST assertions per build." },
  { num: 25, group: "Advanced engineering", name: "Security Testing Agent", detail: "Checks XSS, eval(), SQL string concat & secret patterns automatically." },
  { num: 26, group: "Advanced engineering", name: "DevOps Engineer Agent", detail: "Emits GitHub Actions CI/CD YAML, Docker/Vercel config & rollback steps." },
  { num: 27, group: "Advanced engineering", name: "Code Refactoring Agent", detail: "Performs surgical edits preserving unaffected modules and revisions." },
  { num: 28, group: "Advanced engineering", name: "Legacy Application Modernizer", detail: "Wraps legacy endpoints into typed TypeScript APIs incrementally." },
  { num: 29, group: "Advanced engineering", name: "Performance Engineering Agent", detail: "Detects O(N^2), N+1 queries & missing DB indexes." },
  { num: 30, group: "Advanced engineering", name: "Documentation Generator", detail: "Emits README.md, OpenAPI 3.1 spec & operator runbook." },
  // Group 4: Autonomous software operations (#31-#35)
  { num: 31, group: "Autonomous operations", name: "Multi-Agent Development Teams", detail: "12 coordinated agents operating on one shared versioned spec." },
  { num: 32, group: "Autonomous operations", name: "Project Memory", detail: "Stores architectural decisions, prompts & file revisions in PostgreSQL." },
  { num: 33, group: "Autonomous operations", name: "Automated Bug Investigation", detail: "Diagnoses stack traces and prepares patch diffs for review." },
  { num: 34, group: "Autonomous operations", name: "Release Management", detail: "Version history restore, GitHub PR creation & human-approved deploy gates." },
  { num: 35, group: "Autonomous operations", name: "Continuous Software Improvement", detail: "Tracks QA/SAST metrics per revision with one-click improvements." },
];

export const FORGE_12_AGENTS = [
  { id: "product-manager", role: "Product Manager Agent", owns: "Requirements, user stories, milestones, acceptance criteria & regulated advisory" },
  { id: "solution-architect", role: "Solution Architect Agent", owns: "Stack selection, service boundaries & microVM isolation contract" },
  { id: "ui-designer", role: "UI Designer Agent", owns: "Design tokens, responsive layouts, WCAG 2.2 AA contrast audit" },
  { id: "frontend-agent", role: "Frontend Agent", owns: "Interactive HTML5 live preview & React + TypeScript components" },
  { id: "backend-agent", role: "Backend Agent", owns: "Typed REST API handlers, Better-Auth RBAC & MFA hooks" },
  { id: "database-agent", role: "Database Agent", owns: "PostgreSQL schemas, indexes, reversible migrations & seed SQL" },
  { id: "integration-agent", role: "Integration Agent", owns: "Payments, Maps, Email, Calendar & FHIR connector adapters" },
  { id: "security-agent", role: "Security Agent", owns: "Threat model, secret checks & static SAST vulnerability scan" },
  { id: "qa-agent", role: "QA Agent", owns: "Generated node:test suite & live pipeline regression execution" },
  { id: "devops-agent", role: "DevOps Agent", owns: "CI/CD YAML, Vercel/Container staging config & rollback plan" },
  { id: "maintenance-agent", role: "Maintenance Agent", owns: "Conversational patching, revision diffs & health checks" },
  { id: "documentation-agent", role: "Documentation Agent", owns: "README.md, OpenAPI specification & operator manual" },
];

export const FORGE_STACK_PRESETS = [
  "React + TypeScript + PostgreSQL + Tailwind",
  "Next.js + TypeScript + PostgreSQL + Tailwind",
  "React + TypeScript + Python FastAPI + PostgreSQL",
  "Astro + TypeScript + Tailwind (Marketing/SEO)",
  "PWA + Capacitor Android/iOS + TypeScript",
];

export const FORGE_COMPLEX_PLATFORMS = [
  {
    id: "prof-network",
    category: "Professional networking",
    name: "Healthcare Worker Professional Network",
    prompt: "Build a professional networking platform for healthcare workers with clinician profiles, hospital credentials, connections, shift/job listings, messaging, and analytics dashboards.",
  },
  {
    id: "court-filing",
    category: "Legal services",
    name: "Electronic Court Filing & Docket Portal",
    prompt: "Build an electronic court filing platform with FRCP Rule 6 deadline checks, Bates-numbered document prep, case tracking, fee ledger, and barred-attorney approval receipts.",
  },
  {
    id: "healthcare-mgmt",
    category: "Healthcare",
    name: "FHIR Clinical & Patient Management Platform",
    prompt: "Build a healthcare management platform with appointment scheduling, HIPAA-isolated clinical encounter notes, patient portal, FHIR R4 observation viewer, and billing.",
  },
  {
    id: "short-video",
    category: "Social media",
    name: "Creator Short-Video Social Network",
    prompt: "Build a short-video social network with creator channels, ranked discovery feeds, moderation safety queue, live comments, and engagement analytics.",
  },
  {
    id: "cyber-ops",
    category: "Cybersecurity",
    name: "Enterprise Cyber Ops & KEV Dashboard",
    prompt: "Build a cybersecurity operations platform with asset inventory, CISA KEV vulnerability SLA tracking, SIEM alert triage, and STIG compliance reporting.",
  },
  {
    id: "ai-dev-platform",
    category: "AI platforms",
    name: "AI Evaluation & Model Routing Workspace",
    prompt: "Build an AI development platform with model gateway routing, prompt experiment runs, hallucination evaluation benchmarks, and canary rollback controls.",
  },
];
