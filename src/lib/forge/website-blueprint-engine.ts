/**
 * Noctis Universal Website & Application Blueprint Engine (v2.0)
 *
 * Generates rich, domain-authentic, interactive websites and full-stack specs
 * for ANY website across all 40 Forge categories and custom domains:
 *  - Multi-signal 40-category classifier
 *  - Deterministic domain-authentic blueprints + optional LLM enrichment
 *  - WCAG 2.2 AA contrast-safe Light & Dark themes with conversational theme/entity editing
 *  - Complete self-contained interactive HTML5 + CSS3 + vanilla JS output
 *  - Typed React/TSX app code and PostgreSQL/PostGIS SQL + reversible migrations
 */

import { FORGE_40_CATEGORIES, type ForgeCategorySpec } from "./forge-catalog.ts";

export interface WebsiteTheme {
  mode: "light" | "dark";
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  accent2: string;
  heroBg: string;
}

export interface WebsiteShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  metric: string;
  rating: string;
  description: string;
  features: string[];
  actionLabel: string;
}

export interface WebsiteSectionItem {
  icon: string;
  title: string;
  description: string;
}

export type InteractiveToolKind =
  | "booking_estimator"
  | "cart_checkout"
  | "pricing_calculator"
  | "appointment_scheduler"
  | "property_mortgage"
  | "lead_estimator";

export interface WebsiteEntitySpec {
  name: string;
  columns: string[];
}

export interface WebsiteBlueprint {
  brandName: string;
  domain: string;
  tagline: string;
  categorySlug: string;
  categoryName: string;
  regulated: boolean;
  specialistAdvisory: string | null;
  scopeLabel: string;
  theme: WebsiteTheme;
  navLinks: Array<{ label: string; href: string }>;
  ctaLabel: string;
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    searchBar: {
      field1Label: string;
      field1Placeholder: string;
      field2Label: string;
      field2Options: string[];
      submitLabel: string;
    };
    stats: Array<{ value: string; label: string }>;
  };
  showcase: {
    title: string;
    subtitle: string;
    filterTabs: string[];
    items: WebsiteShowcaseItem[];
  };
  sections: {
    title: string;
    subtitle: string;
    items: WebsiteSectionItem[];
  };
  interactiveTool: {
    kind: InteractiveToolKind;
    title: string;
    subtitle: string;
    unitLabel: string;
    baseRate: number;
    options: Array<{ label: string; delta: number }>;
  };
  testimonials: Array<{ quote: string; author: string; role: string }>;
  faqs: Array<{ q: string; a: string }>;
  ctaBanner: {
    headline: string;
    subheadline: string;
    buttonLabel: string;
  };
  entities: WebsiteEntitySpec[];
  needsPostGis: boolean;
  multilingual: boolean;
  includeMobileWrapper: boolean;
  aiGenerated: boolean;
}

interface DomainPresetTemplate {
  brandName: string;
  domain: string;
  tagline: string;
  navLinks: string[];
  ctaLabel: string;
  defaultTheme: { mode: "light" | "dark"; palette: string };
  hero: WebsiteBlueprint["hero"];
  showcaseTitle: string;
  showcaseSubtitle: string;
  items: WebsiteShowcaseItem[];
  sectionsTitle: string;
  sectionsSubtitle: string;
  sectionItems: WebsiteSectionItem[];
  tool: WebsiteBlueprint["interactiveTool"];
  testimonials: WebsiteBlueprint["testimonials"];
  faqs: WebsiteBlueprint["faqs"];
  ctaBanner: WebsiteBlueprint["ctaBanner"];
  entities: WebsiteEntitySpec[];
}

function relLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const norm = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function accentContrastText(hex: string): string {
  return relLuminance(hex) > 0.36 ? "#090D16" : "#FFFFFF";
}

const ACCENT_PALETTES: Record<string, { darkAccent: string; lightAccent: string; accent2: string }> = {
  ocean: { darkAccent: "#06B6D4", lightAccent: "#0284C7", accent2: "#38BDF8" },
  emerald: { darkAccent: "#10B981", lightAccent: "#047857", accent2: "#34D399" },
  gold: { darkAccent: "#E4B86A", lightAccent: "#B45309", accent2: "#F59E0B" },
  amber: { darkAccent: "#F59E0B", lightAccent: "#B45309", accent2: "#FBBF24" },
  coral: { darkAccent: "#FB7185", lightAccent: "#BE123C", accent2: "#F97316" },
  violet: { darkAccent: "#A78BFA", lightAccent: "#6D28D9", accent2: "#818CF8" },
  crimson: { darkAccent: "#F43F5E", lightAccent: "#BE123C", accent2: "#FB7185" },
  slate: { darkAccent: "#38BDF8", lightAccent: "#1D4ED8", accent2: "#60A5FA" },
};

export function buildThemePalette(mode: "light" | "dark", paletteName = "ocean", customAccentHex?: string): WebsiteTheme {
  const pal = ACCENT_PALETTES[paletteName] || ACCENT_PALETTES.ocean!;
  const accent =
    customAccentHex && /^#[0-9a-f]{6}$/i.test(customAccentHex)
      ? customAccentHex.toUpperCase()
      : mode === "dark"
        ? pal.darkAccent
        : pal.lightAccent;
  const accentText = accentContrastText(accent);

  if (mode === "light") {
    return {
      mode: "light",
      bg: "#F8FAFC",
      surface: "#FFFFFF",
      surfaceAlt: "#F1F5F9",
      border: "#E2E8F0",
      text: "#0F172A",
      muted: "#475569",
      accent,
      accentText,
      accent2: pal.accent2,
      heroBg: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 55%, #ECFDF5 100%)",
    };
  }

  return {
    mode: "dark",
    bg: "#090D16",
    surface: "#111827",
    surfaceAlt: "#162033",
    border: "#1E293B",
    text: "#F8FAFC",
    muted: "#94A3B8",
    accent,
    accentText,
    accent2: pal.accent2,
    heroBg: "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.16), transparent 55%), linear-gradient(135deg, #090D16 0%, #0F172A 100%)",
  };
}

/**
 * Scores ALL 40 FORGE_40_CATEGORIES with weighted word-boundary rules so any prompt
 * routes cleanly to the right industry category without collapsing into Business.
 */
export function classifyWebsiteCategory(categoryHint?: string, prompt?: string): ForgeCategorySpec {
  const hint = (categoryHint || "").trim();
  if (hint && !/^auto(?:[-\s]?detect)?(?:\s*\(.*\))?$/i.test(hint)) {
    const byName = FORGE_40_CATEGORIES.find(
      (c) => c.name.toLowerCase() === hint.toLowerCase() || c.slug.toLowerCase() === hint.toLowerCase(),
    );
    if (byName) return byName;
  }

  const hay = `${hint} ${prompt || ""}`.toLowerCase();
  const rules: Array<{ slug: string; primary: RegExp; secondary?: RegExp; boost?: number }> = [
    { slug: "travel", primary: /\b(?:tourism|tourist|travel(?:er|s|ing)?|safari|itinerar(?:y|ies)|vacation|tour\s+guide|destinations?|excursions?|trip\s+planner|sightseeing|ecotourism|adventure\s+tours?)\b/i, secondary: /\b(?:resorts?|lodges?|hotels?|flights?|visa|wildlife|beach|mountains?)\b/i, boost: 4 },
    { slug: "hospitality", primary: /\b(?:restaurant|bakery|cafe|coffee\s*shop|bistro|catering|menu|dining|chef|pastry|hotel\s+(?:chain|website|booking|reservation)|room\s+booking|table\s+reservation|guest\s*house|resort\s+spa)\b/i, secondary: /\b(?:hospitality|rooms?|orders?|reservations?|desserts?|brunch)\b/i, boost: 3 },
    { slug: "ecommerce", primary: /\b(?:e-?commerce|online\s+store|storefront|product\s+catalog|shopping\s+cart|checkout|boutique|merchandise|handmade|retail\s+shop|sneakers?|apparel|fashion\s+store|jewelry\s+shop)\b/i, secondary: /\b(?:products?|skus?|inventory|orders?|shipping|discounts?)\b/i, boost: 3 },
    { slug: "real-estate", primary: /\b(?:real\s*estate|property\s+listing|properties|realtor|brokerage|apartment|rentals?|condos?|homes?\s+for\s+sale|mortgage\s+calculator|mls\s+idx|commercial\s+leasing|landlords?)\b/i, secondary: /\b(?:tenants?|leases?|floor\s*plan|open\s+house|neighborhood)\b/i, boost: 4 },
    { slug: "healthcare", primary: /\b(?:healthcare|hospital|clinic|medical|patient\s+portal|telehealth|doctor|physician|dental|dentist|pharmacy|fhir|hipaa|appointment\s+scheduling|diagnostic|therapy|mental\s+health|pediatric|urgent\s+care)\b/i, secondary: /\b(?:patients?|providers?|prescriptions?|ehr|triage)\b/i, boost: 4 },
    { slug: "legal-services", primary: /\b(?:law\s+firm|legal\s+services|attorney|lawyer|litigation|docket|court\s+filing|legal\s+research|paralegal|frcp|contracts?|legal\s+practice|notary)\b/i, secondary: /\b(?:cases?|filings?|briefs?|retainer|counsel)\b/i, boost: 4 },
    { slug: "government", primary: /\b(?:government|municipal|city\s+portal|public\s+service|agency\s+website|citizen\s+portal|permits?|civic|federal|state\s+portal|section\s+508)\b/i, secondary: /\b(?:licensing|public\s+records|ordinance|benefits)\b/i, boost: 3 },
    { slug: "education", primary: /\b(?:school|university|college|academy|e-?learning|lms|course\s+catalog|online\s+courses?|curriculum|student\s+portal|tutoring|bootcamp|classroom|edtech)\b/i, secondary: /\b(?:lessons?|quizzes?|certificates?|enrollments?|grades?|faculty)\b/i, boost: 4 },
    { slug: "banking", primary: /\b(?:banking|digital\s+bank|credit\s+union|neobank|checking\s+account|savings\s+account|wire\s+transfer|core\s+banking|retail\s+banking|wealth\s+portal)\b/i, secondary: /\b(?:accounts?|ledgers?|balances?|cards?|kyc)\b/i, boost: 4 },
    { slug: "fintech", primary: /\b(?:fintech|payment\s+gateway|invoicing|expense\s+management|budgeting\s+app|crypto\s+wallet|remittance|treasury|payroll|accounting\s+saas|billing\s+platform)\b/i, secondary: /\b(?:payments?|payouts?|subscriptions?|taxes?|fx)\b/i, boost: 3 },
    { slug: "insurance", primary: /\b(?:insurance|insurtech|policy\s+management|claims?\s+portal|underwriting|actuarial|auto\s+quote|health\s+plan|coverage\s+quote)\b/i, secondary: /\b(?:policies|premiums?|deductibles?|adjusters?)\b/i, boost: 4 },
    { slug: "social-media", primary: /\b(?:social\s+media|social\s+network|community\s+network|short[- ]video|creator\s+feed|microblogging|photo\s+sharing|follow\s+feed|live\s+comments)\b/i, secondary: /\b(?:posts?|likes?|followers?|hashtags?|moderation)\b/i, boost: 3 },
    { slug: "professional-networking", primary: /\b(?:professional\s+network|linkedin|talent\s+network|mentor\s+network|alumni\s+network|clinician\s+network|credentialed\s+profiles)\b/i, secondary: /\b(?:connections?|endorsements?|recruiters?|resumes?)\b/i, boost: 4 },
    { slug: "transportation", primary: /\b(?:ride[- ]?booking|ride[- ]?sharing|taxi|shuttle|transit|fleet\s+management|dispatch|charter|ev\s+charging\s+network|mobility)\b/i, secondary: /\b(?:drivers?|routes?|vehicles?|gps|fares?)\b/i, boost: 3 },
    { slug: "logistics", primary: /\b(?:logistics|freight|supply\s+chain|shipping\s+tracker|warehouse|3pl|customs|parcel\s+tracking|container\s+shipping|fulfillment)\b/i, secondary: /\b(?:shipments?|manifests?|barcodes?|carriers?)\b/i, boost: 4 },
    { slug: "job-boards", primary: /\b(?:job\s+board|careers?\s+portal|recruitment|hiring\s+platform|applicant\s+tracking|job\s+listings?|talent\s+search|resume\s+builder)\b/i, secondary: /\b(?:candidates?|employers?|interviews?|salary)\b/i, boost: 4 },
    { slug: "freelance-marketplaces", primary: /\b(?:freelance|gig\s+marketplace|service\s+marketplace|contractor\s+marketplace|fiverr|upwork|hire\s+designers?|escrow\s+milestones)\b/i, secondary: /\b(?:proposals?|hourly\s+rate|reviews?|milestones?)\b/i, boost: 4 },
    { slug: "construction", primary: /\b(?:construction|contractor\s+portal|general\s+contractor|architecture\s+firm|remodeling|engineering\s+firm|blueprints?|job\s+site|rfi|subcontractor)\b/i, secondary: /\b(?:bids?|permits?|schedules?|inspections?)\b/i, boost: 4 },
    { slug: "automotive", primary: /\b(?:automotive|car\s+dealership|auto\s+repair|mechanic|garage|vehicle\s+inventory|test\s+drive|ev\s+showroom|detailing|diagnostics)\b/i, secondary: /\b(?:vin|mileage|service\s+bay|parts?|financing)\b/i, boost: 4 },
    { slug: "agriculture", primary: /\b(?:agriculture|agritech|farm\s+management|agricultural\s+market|farmers?\s+cooperative|crop\s+monitoring|greenhouse|livestock|hydroponic|irrigation)\b/i, secondary: /\b(?:harvest|soil|yield|acreage|produce)\b/i, boost: 4 },
    { slug: "nonprofits", primary: /\b(?:nonprofit|non-?profit|charity|fundraising|donation\s+portal|ngo|foundation|volunteer\s+signup|humanitarian|grantmaking)\b/i, secondary: /\b(?:donors?|campaigns?|impact|501c3|pledges?)\b/i, boost: 4 },
    { slug: "religious-organizations", primary: /\b(?:church|ministry|parish|cathedral|mosque|synagogue|temple|sermons?|bible\s+study|worship|pastoral|congregation|tithing)\b/i, secondary: /\b(?:fellowship|prayer|events?|volunteers?)\b/i, boost: 4 },
    { slug: "news-media", primary: /\b(?:news\s+site|newspaper|digital\s+magazine|editorial|journalism|publishing\s+platform|newsletter|substack|blog\s+network|press\s+room)\b/i, secondary: /\b(?:articles?|headlines?|authors?|subscribers?|issues?)\b/i, boost: 3 },
    { slug: "entertainment", primary: /\b(?:entertainment|streaming|music\s+platform|video\s+platform|podcast|gaming|cinema|record\s+label|artist\s+hub|ott|media\s+player|asmr)\b/i, secondary: /\b(?:playlists?|episodes?|tracks?|channels?|creators?)\b/i, boost: 3 },
    { slug: "sports", primary: /\b(?:sports?\s+club|athletic|fitness|gym|league|tournament|soccer|football|basketball|tennis|marathon|team\s+roster|coaching)\b/i, secondary: /\b(?:matches?|standings?|workouts?|memberships?)\b/i, boost: 3 },
    { slug: "events", primary: /\b(?:events?\s+platform|ticketing|conference|summit|festival|concert|wedding|venue\s+booking|rsvp|registration\s+portal|expo)\b/i, secondary: /\b(?:tickets?|speakers?|agenda|passes?|badges?)\b/i, boost: 3 },
    { slug: "cybersecurity", primary: /\b(?:cybersecurity|soc\s+dashboard|vulnerability\s+portal|siem|threat\s+intel|cisa\s+kev|pentest|bug\s+bounty|incident\s+response|devsecops)\b/i, secondary: /\b(?:cve|alerts?|endpoints?|remediation|zero\s+trust)\b/i, boost: 4 },
    { slug: "rmf-grc", primary: /\b(?:rmf|grc|nist\s+800-53|fedramp|cmmc|compliance\s+platform|audit\s+readiness|soc\s*2|iso\s*27001|poa&m|oscal)\b/i, secondary: /\b(?:controls?|evidence|policies|risk\s+register)\b/i, boost: 4 },
    { slug: "ai-platforms", primary: /\b(?:ai\s+platform|ai\s+workspace|chatbot\s+builder|llm\s+studio|ai\s+agent|prompt\s+engineering|rag\s+platform|copilot\s+studio|machine\s+learning\s+app)\b/i, secondary: /\b(?:models?|embeddings?|evals?|inference|agents?)\b/i, boost: 4 },
    { slug: "saas-products", primary: /\b(?:saas|b2b\s+software|subscription\s+platform|developer\s+tool|cloud\s+platform|api\s+platform|workflow\s+automation|no-?code\s+tool)\b/i, secondary: /\b(?:pricing\s+tiers?|tenants?|webhooks?|api\s+keys?|integrations?)\b/i, boost: 2 },
    { slug: "customer-portals", primary: /\b(?:customer\s+portal|client\s+portal|self-?service\s+portal|support\s+desk|helpdesk|ticket\s+portal|member\s+portal)\b/i, secondary: /\b(?:tickets?|knowledge\s+base|billing|account)\b/i, boost: 4 },
    { slug: "admin-dashboards", primary: /\b(?:admin\s+dashboard|analytics\s+dashboard|operations\s+portal|kpi\s+dashboard|reporting\s+portal|bi\s+dashboard|telemetry\s+console)\b/i, secondary: /\b(?:charts?|metrics?|audit\s+logs?|alerts?|exports?)\b/i, boost: 3 },
    { slug: "crm-systems", primary: /\b(?:crm|sales\s+pipeline|lead\s+management|deal\s+tracker|customer\s+relationship|account\s+executive)\b/i, secondary: /\b(?:leads?|contacts?|deals?|stages?|quota)\b/i, boost: 4 },
    { slug: "erp-systems", primary: /\b(?:erp|enterprise\s+resource|procurement|general\s+ledger|hris|payroll\s+and\s+inventory|supply\s+operations)\b/i, secondary: /\b(?:purchase\s+orders?|vendors?|employees?|gl\s+accounts?)\b/i, boost: 4 },
    { slug: "project-management", primary: /\b(?:project\s+management|task\s+tracker|kanban|sprint\s+board|issue\s+tracker|team\s+collaboration|roadmap\s+planner|asana|jira)\b/i, secondary: /\b(?:tasks?|milestones?|sprints?|assignees?)\b/i, boost: 4 },
    { slug: "forums", primary: /\b(?:forum|discussion\s+board|community\s+q&a|reddit-?style|message\s+board|developer\s+forum|support\s+community)\b/i, secondary: /\b(?:threads?|replies?|upvotes?|moderators?)\b/i, boost: 4 },
    { slug: "auctions", primary: /\b(?:auction|bidding\s+site|live\s+bids?|collectibles?\s+auction|charity\s+auction|marketplace\s+bidding)\b/i, secondary: /\b(?:lots?|bids?|reserve\s+price|escrow|countdown)\b/i, boost: 4 },
    { slug: "portfolio", primary: /\b(?:portfolio|personal\s+website|creative\s+studio|photographer|videographer|ux\s+designer|freelancer\s+resume|showcase\s+site|architect\s+portfolio)\b/i, secondary: /\b(?:projects?|case\s+studies|about\s+me|resume|testimonials?)\b/i, boost: 4 },
    { slug: "business", primary: /\b(?:consulting\s+firm|corporate\s+website|company\s+website|b2b\s+agency|advisory|marketing\s+agency|accounting\s+firm|services?\s+company|small\s+business)\b/i, secondary: /\b(?:about\s+us|clients?|case\s+studies|services?|contact)\b/i, boost: 1 },
    { slug: "custom-apps", primary: /\b(?:custom\s+app(?:lication)?s?|bespoke\s+app(?:lication)?|requirements-driven\s+(?:project|app)|custom\s+internal\s+tool)\b/i, boost: 3 },
  ];

  let bestSlug = "business";
  let bestScore = 0;
  for (const r of rules) {
    const primaryMatches = hay.match(new RegExp(r.primary.source, "gi"))?.length ?? 0;
    const secondaryMatches = r.secondary ? hay.match(new RegExp(r.secondary.source, "gi"))?.length ?? 0 : 0;
    if (primaryMatches === 0 && secondaryMatches < 2) continue;
    const score = primaryMatches * 5 + secondaryMatches * 1.5 + (primaryMatches > 0 ? (r.boost ?? 0) : 0);
    if (score > bestScore) {
      bestScore = score;
      bestSlug = r.slug;
    }
  }

  return FORGE_40_CATEGORIES.find((c) => c.slug === bestSlug) || FORGE_40_CATEGORIES[0]!;
}

const ENTITY_COLUMNS_BY_NAME: Record<string, string[]> = {
  destinations: ["name TEXT NOT NULL", "country TEXT NOT NULL", "region TEXT", "category TEXT NOT NULL", "rating NUMERIC(3,2) DEFAULT 4.8", "price_from_cents INTEGER DEFAULT 0", "location_point GEOGRAPHY(POINT, 4326)"],
  itineraries: ["title TEXT NOT NULL", "duration_days INTEGER NOT NULL DEFAULT 5", "travelers_count INTEGER NOT NULL DEFAULT 2", "budget_cents INTEGER NOT NULL DEFAULT 150000", "status TEXT NOT NULL DEFAULT 'DRAFT'"],
  bookings: ["customer_name TEXT NOT NULL", "customer_email TEXT NOT NULL", "item_ref TEXT NOT NULL", "quantity INTEGER NOT NULL DEFAULT 1", "total_cents INTEGER NOT NULL", "payment_status TEXT NOT NULL DEFAULT 'PENDING'"],
  products: ["sku TEXT UNIQUE NOT NULL", "name TEXT NOT NULL", "category TEXT NOT NULL", "price_cents INTEGER NOT NULL", "inventory_count INTEGER NOT NULL DEFAULT 25", "status TEXT NOT NULL DEFAULT 'ACTIVE'"],
  orders: ["customer_email TEXT NOT NULL", "total_cents INTEGER NOT NULL", "currency TEXT NOT NULL DEFAULT 'USD'", "fulfillment_status TEXT NOT NULL DEFAULT 'PROCESSING'"],
  properties: ["title TEXT NOT NULL", "listing_type TEXT NOT NULL DEFAULT 'SALE'", "price_cents BIGINT NOT NULL", "bedrooms INTEGER NOT NULL DEFAULT 3", "bathrooms NUMERIC(3,1) NOT NULL DEFAULT 2.0", "sqft INTEGER NOT NULL DEFAULT 1850", "geo_point GEOGRAPHY(POINT, 4326)"],
  patients: ["full_name TEXT NOT NULL", "mrn TEXT UNIQUE NOT NULL", "dob DATE", "contact_phone TEXT", "triage_status TEXT NOT NULL DEFAULT 'ROUTINE'"],
  appointments: ["patient_or_client TEXT NOT NULL", "provider_name TEXT NOT NULL", "scheduled_at TIMESTAMPTZ NOT NULL", "visit_type TEXT NOT NULL DEFAULT 'IN_PERSON'", "status TEXT NOT NULL DEFAULT 'CONFIRMED'"],
  users: ["email TEXT UNIQUE NOT NULL", "full_name TEXT NOT NULL", "role TEXT NOT NULL DEFAULT 'USER'", "status TEXT NOT NULL DEFAULT 'ACTIVE'"],
  courses: ["code TEXT NOT NULL", "title TEXT NOT NULL", "instructor TEXT NOT NULL", "duration_weeks INTEGER NOT NULL DEFAULT 6", "enrollment_cap INTEGER NOT NULL DEFAULT 120"],
  leads: ["name TEXT NOT NULL", "email TEXT NOT NULL", "company TEXT", "stage TEXT NOT NULL DEFAULT 'NEW'", "estimated_value_cents INTEGER DEFAULT 0"],
  invoices: ["invoice_number TEXT UNIQUE NOT NULL", "customer_name TEXT NOT NULL", "amount_cents BIGINT NOT NULL", "due_date DATE NOT NULL", "status TEXT NOT NULL DEFAULT 'OPEN'"],
};

function normalizeEntityName(raw: string): string {
  const clean = raw.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!clean) return "records";
  return /^[a-z]/.test(clean) ? clean.slice(0, 40) : `t_${clean.slice(0, 38)}`;
}

function buildEntitySpec(name: string): WebsiteEntitySpec {
  const norm = normalizeEntityName(name);
  const columns = ENTITY_COLUMNS_BY_NAME[norm] || [
    "title TEXT NOT NULL",
    "category TEXT NOT NULL DEFAULT 'GENERAL'",
    "status TEXT NOT NULL DEFAULT 'ACTIVE'",
    "amount_cents INTEGER NOT NULL DEFAULT 0",
    "metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb",
  ];
  return { name: norm, columns };
}

function makePreset(
  brandName: string,
  domain: string,
  tagline: string,
  palette: string,
  mode: "light" | "dark",
  navLinks: string[],
  ctaLabel: string,
  hero: WebsiteBlueprint["hero"],
  showcaseTitle: string,
  showcaseSubtitle: string,
  items: WebsiteShowcaseItem[],
  sectionsTitle: string,
  sectionsSubtitle: string,
  sectionItems: WebsiteSectionItem[],
  tool: WebsiteBlueprint["interactiveTool"],
  testimonials: WebsiteBlueprint["testimonials"],
  faqs: WebsiteBlueprint["faqs"],
  ctaBanner: WebsiteBlueprint["ctaBanner"],
  entityNames: string[],
): DomainPresetTemplate {
  return {
    brandName,
    domain,
    tagline,
    navLinks,
    ctaLabel,
    defaultTheme: { mode, palette },
    hero,
    showcaseTitle,
    showcaseSubtitle,
    items,
    sectionsTitle,
    sectionsSubtitle,
    sectionItems,
    tool,
    testimonials,
    faqs,
    ctaBanner,
    entities: entityNames.map(buildEntitySpec),
  };
}

const PRESETS_BY_SLUG: Record<string, DomainPresetTemplate> = {
  travel: makePreset(
    "Compass & Horizon Travel",
    "compasshorizon.travel",
    "Curated global destinations, local guides, boutique stays & effortless booking.",
    "ocean",
    "dark",
    ["Destinations", "Experiences", "Trip Planner", "Stories", "FAQ"],
    "Start Planning",
    {
      eyebrow: "Worldwide Discovery & Booking Platform",
      headline: "Discover Extraordinary Destinations Around the Globe",
      subheadline:
        "Explore iconic landscapes, heritage cities, wildlife expeditions, and verified local guides—complete with interactive itineraries and instant reservations.",
      primaryCta: "Explore Destinations",
      secondaryCta: "Estimate Trip Budget",
      searchBar: {
        field1Label: "Destination",
        field1Placeholder: "Search Kyoto, Amalfi Coast, Patagonia, Safari...",
        field2Label: "Experience",
        field2Options: ["All Adventures", "Wildlife & Safaris", "History & Heritage", "Nature & Adventure", "Luxury & Relaxation"],
        submitLabel: "Search Trips",
      },
      stats: [
        { value: "140+", label: "Global Destinations" },
        { value: "4,800+", label: "Verified Local Guides" },
        { value: "4.94 ★", label: "Traveler Rating" },
        { value: "24/7", label: "Concierge Support" },
      ],
    },
    "Featured Worldwide Destinations & Expeditions",
    "Filter by travel style or search any destination to view itinerary highlights and book instantly.",
    [
      {
        id: "trv-1",
        title: "Kyoto Cultural & Culinary Circuit",
        subtitle: "Japan · 6 Days",
        category: "History & Heritage",
        badge: "Top Rated",
        metric: "$2,150 / guest",
        rating: "4.96",
        description: "Private temple walks at dawn, tea ceremony artisans, and Nishiki Market tasting with local historians.",
        features: ["JR Pass Ready", "Boutique Ryokan", "Verified Guide"],
        actionLabel: "Reserve Circuit",
      },
      {
        id: "trv-2",
        title: "Serengeti & Ngorongoro Wildlife Safari",
        subtitle: "Tanzania · 5 Days",
        category: "Wildlife & Safaris",
        badge: "Eco Certified",
        metric: "$3,400 / guest",
        rating: "4.98",
        description: "Open-top 4x4 migration tracking, conservationist briefings, and solar-powered tented eco-camps.",
        features: ["4x4 Private Jeep", "Park Fees Included", "Photographer Guide"],
        actionLabel: "Reserve Safari",
      },
      {
        id: "trv-3",
        title: "Amalfi Coast Boutique & Sea Escape",
        subtitle: "Italy · 5 Days",
        category: "Luxury & Relaxation",
        badge: "Coastal Luxury",
        metric: "$2,890 / guest",
        rating: "4.93",
        description: "Cliffside terrace suites, wooden gozzo boat charters to Capri, and organic vineyard dinners.",
        features: ["Private Boat Charter", "Oceanview Suite", "Concierge"],
        actionLabel: "Reserve Escape",
      },
      {
        id: "trv-4",
        title: "Patagonia Glacier & Fitz Roy Trek",
        subtitle: "Argentina & Chile · 7 Days",
        category: "Nature & Adventure",
        badge: "Active Trail",
        metric: "$2,640 / guest",
        rating: "4.95",
        description: "Guided granite spire hikes, Perito Moreno icefield crossings, and alpine refugio hospitality.",
        features: ["Certified Mountain Guide", "Gear Included", "Transfers"],
        actionLabel: "Reserve Trek",
      },
      {
        id: "trv-5",
        title: "Marrakech & Atlas Heritage Expedition",
        subtitle: "Morocco · 4 Days",
        category: "History & Heritage",
        badge: "Local Immersion",
        metric: "$1,380 / guest",
        rating: "4.91",
        description: "Medina courtyard riads, spice cooperative visits, and starlit High Atlas valley retreats.",
        features: ["Historic Riad", "Atlas Day Trek", "Artisan Workshops"],
        actionLabel: "Reserve Trip",
      },
      {
        id: "trv-6",
        title: "Iceland Geothermal & Northern Lights",
        subtitle: "Iceland · 5 Days",
        category: "Nature & Adventure",
        badge: "Seasonal Pick",
        metric: "$2,480 / guest",
        rating: "4.94",
        description: "Golden Circle waterfalls, basalt canyon thermal lagoons, and aurora forecast small-group excursions.",
        features: ["4WD Support", "Lagoon Access", "Aurora Guarantee"],
        actionLabel: "Reserve Expedition",
      },
    ],
    "Complete Tourism & Booking Architecture",
    "Modular platform pillars connecting global travelers with local guides, stays, and experiences.",
    [
      { icon: "🗺️", title: "Explore Destinations", description: "Interactive country, region, and attraction pages with rich seasonal guidance and maps." },
      { icon: "🧭", title: "Tours & Adventures", description: "Safaris, hiking expeditions, cultural workshops, and curated day excursions with live capacity." },
      { icon: "🏨", title: "Hotels & Boutique Stays", description: "Verified resorts, eco-lodges, city hotels, and heritage guesthouses with real-time availability." },
      { icon: "✨", title: "AI Trip Planner", description: "Day-by-day personalized itineraries adapting dynamically to travel pace, interests, and budget." },
      { icon: "💳", title: "Online Booking & Payments", description: "Instant confirmations, multi-currency checkout, Stripe protection, and local payment rails." },
      { icon: "🛡️", title: "Verified Local Guides", description: "Vetted local tour operators, safety advisories, traveler insurance checklists, and multilingual support." },
    ],
    {
      kind: "booking_estimator",
      title: "Interactive Trip Budget & Itinerary Calculator",
      subtitle: "Select travelers, duration, and travel style to estimate your custom trip package in real time.",
      unitLabel: "Days / Nights",
      baseRate: 280,
      options: [
        { label: "Include Private Verified Local Guide (+$120/day)", delta: 120 },
        { label: "Upgrade to Boutique Luxury Stays (+$180/day)", delta: 180 },
        { label: "Add Airport Transfers & Travel Insurance (+$65/day)", delta: 65 },
      ],
    },
    [
      { quote: "Our multi-city family trip booked effortlessly—every local guide felt like an old friend.", author: "Elena Rostova", role: "Verified Global Traveler" },
      { quote: "Managing tour availability, seasonal pricing, and instant payouts transformed our family lodge.", author: "Mateo Alvarez", role: "Patagonia Outfitter Partner" },
      { quote: "The AI itinerary builder balanced museum mornings with sunset coastline time on our first try.", author: "Claire Beaumont", role: "Solo Cultural Explorer" },
    ],
    [
      { q: "How are local tour guides and hotels vetted?", a: "Every operator completes identity verification, licensing checks, insurance validation, and ongoing traveler rating audits." },
      { q: "Can travelers customize multi-country itineraries?", a: "Yes. Combine flights, rail passes, hotels, and local day tours into one unified booking cart and itinerary timeline." },
      { q: "Which currencies and payment gateways are supported?", a: "Major international cards via Stripe plus regional bank transfers and mobile wallets where supported." },
      { q: "Are cancellation policies flexible?", a: "Each listing displays transparent 48-hour or 7-day free-cancellation terms directly inside checkout before confirmation." },
    ],
    {
      headline: "Ready to Launch Your Global Travel & Booking Experience?",
      subheadline: "Connect destinations, local operators, hotels, and travelers inside one unified platform.",
      buttonLabel: "Book a Custom Trip",
    },
    ["destinations", "itineraries", "bookings", "operators"],
  ),

  ecommerce: makePreset(
    "Aurelia Goods Storefront",
    "aureliagoods.shop",
    "Modern direct-to-consumer product catalog, variants, cart drawer, and express checkout.",
    "coral",
    "light",
    ["Shop All", "Collections", "Bundles", "Reviews", "FAQ"],
    "View Bag",
    {
      eyebrow: "Direct-to-Consumer Commerce",
      headline: "Thoughtfully Crafted Goods Built for Everyday Longevity",
      subheadline:
        "Browse curated small-batch releases, compare materials, save items to your interactive shopping bag, and calculate bundle savings live.",
      primaryCta: "Shop Collection",
      secondaryCta: "Bundle Estimator",
      searchBar: {
        field1Label: "Search Products",
        field1Placeholder: "Search jackets, leather bags, ceramics, audio...",
        field2Label: "Category",
        field2Options: ["All", "Apparel", "Carry & Travel", "Home Studio", "Limited Drops"],
        submitLabel: "Find Products",
      },
      stats: [
        { value: "48h", label: "Worldwide Dispatch" },
        { value: "4.9 ★", label: "4,200+ Verified Reviews" },
        { value: "2-Yr", label: "Craftsmanship Warranty" },
        { value: "Free", label: "Returns Over $75" },
      ],
    },
    "Featured Catalog & Limited Drops",
    "Select a category tab or click any product to choose quantity and add it straight to your shopping bag.",
    [
      { id: "ec-1", title: "Merino Everyday Overshirt", subtitle: "Apparel · Heather Slate", category: "Apparel", badge: "Best Seller", metric: "$148", rating: "4.9", description: "Breathable 260gsm Australian merino wool tailored for travel and studio comfort.", features: ["Wrinkle Resistant", "Corozo Buttons", "XS-XXL"], actionLabel: "Add to Bag" },
      { id: "ec-2", title: "Weekender Canvas Duffel 40L", subtitle: "Carry & Travel · Olive Waxed", category: "Carry & Travel", badge: "Carry-On Fit", metric: "$225", rating: "4.95", description: "Weatherproof waxed cotton canvas with vegetable-tanned bridle straps and laptop sleeve.", features: ["YKK Brass Zip", "16\" Laptop Bay", "Lifetime Stitch"], actionLabel: "Add to Bag" },
      { id: "ec-3", title: "Stoneware Pour-Over Coffee Set", subtitle: "Home Studio · Kiln Sand", category: "Home Studio", badge: "Artisan Batch", metric: "$84", rating: "4.88", description: "Hand-thrown high-fire ceramic dripper and 600ml carafe engineered for thermal stability.", features: ["Lead-Free Glaze", "Dishwasher Safe", "50 Filters"], actionLabel: "Add to Bag" },
      { id: "ec-4", title: "Titanium Field Chronograph", subtitle: "Limited Drops · Brushed Matte", category: "Limited Drops", badge: "Low Stock", metric: "$390", rating: "4.97", description: "Grade-5 titanium case with sapphire crystal, Swiss movement, and 100m water resistance.", features: ["Sapphire AR", "100m Rated", "Quick Strap"], actionLabel: "Add to Bag" },
      { id: "ec-5", title: "Modular Desk Organizer Valet", subtitle: "Home Studio · Solid Walnut", category: "Home Studio", badge: "New Arrival", metric: "$112", rating: "4.92", description: "CNC-milled solid American walnut tray with wool felt inlays and hidden MagSafe routing.", features: ["Solid Walnut", "Wool Felt Base", "Cable Pass"], actionLabel: "Add to Bag" },
      { id: "ec-6", title: "All-Weather Tech Anorak", subtitle: "Apparel · Charcoal", category: "Apparel", badge: "Storm Proof", metric: "$265", rating: "4.94", description: "3-layer breathable waterproof shell with taped seams and packable hood.", features: ["20k Waterproof", "Recycled Shell", "2-Way Zip"], actionLabel: "Add to Bag" },
    ],
    "Built for High-Converting Modern Commerce",
    "Fast product discovery, Stripe checkout readiness, inventory sync, and post-purchase customer portals.",
    [
      { icon: "🛍️", title: "Variant & Inventory Engine", description: "Real-time stock tracking per size, finish, and warehouse with automatic low-stock badges." },
      { icon: "⚡", title: "Instant Slide-Out Bag", description: "Zero-reload cart state with live subtotal math, shipping threshold meter, and quantity controls." },
      { icon: "💳", title: "Express Checkout & Wallets", description: "PCI-DSS tokenized Stripe Checkout, Apple Pay, Google Pay, and multi-currency tax calculation." },
      { icon: "📦", title: "Live Order Tracking", description: "Automated carrier webhook milestones from warehouse label scan to doorstep delivery." },
      { icon: "⭐", title: "Verified Buyer Reviews", description: "Authenticated purchase badges with fit ratings and moderated photo uploads." },
      { icon: "🔄", title: "Self-Serve Exchanges", description: "One-click size swap and prepaid return label generation inside the customer portal." },
    ],
    {
      kind: "cart_checkout",
      title: "Custom Bundle & Wholesale Savings Calculator",
      subtitle: "Estimate multi-item bundle totals with automatic volume discounts and express shipping.",
      unitLabel: "Units in Bundle",
      baseRate: 85,
      options: [
        { label: "Gift-Ready Linen Packaging (+$12/unit)", delta: 12 },
        { label: "Custom Monogram Engraving (+$18/unit)", delta: 18 },
        { label: "Extended 5-Year Care Plan (+$15/unit)", delta: 15 },
      ],
    },
    [
      { quote: "Checkout took 20 seconds on mobile and the merino overshirt arrived in two days.", author: "Jordan Kim", role: "Repeat Customer" },
      { quote: "The bundle configurator raised our average order value by 28% in month one.", author: "Sonia Patel", role: "Merchandising Lead" },
      { quote: "Clean photography, crisp contrast, zero clutter—exactly how flagship retail should feel.", author: "Marcus Vance", role: "Product Designer" },
    ],
    [
      { q: "How fast do orders ship?", a: "Orders placed before 2:00 PM ship same business day from regional fulfillment hubs in North America and Europe." },
      { q: "What is your return & exchange window?", a: "Unused items in original condition qualify for free size exchanges or full refunds within 30 days." },
      { q: "Do you support wholesale or corporate gifting?", a: "Yes—orders of 10+ units qualify for custom monogramming and tiered wholesale pricing above." },
      { q: "Are payments encrypted end-to-end?", a: "All transactions run through Stripe PCI Level 1 checkout tokenization with zero card numbers stored locally." },
    ],
    { headline: "Shop the Latest Release Today", subheadline: "Free express delivery on qualifying orders plus our 2-year guarantee.", buttonLabel: "Open Store Bag" },
    ["products", "carts", "orders", "customers"],
  ),

  "real-estate": makePreset(
    "HarborStone Realty & Listings",
    "harborstonerealty.com",
    "Interactive property discovery, spatial neighborhood search, tour booking & mortgage tools.",
    "emerald",
    "light",
    ["Listings", "Neighborhoods", "Mortgage Calc", "Agents", "FAQ"],
    "Book a Tour",
    {
      eyebrow: "Residential & Commercial Property Marketplace",
      headline: "Find Homes & Spaces Tailored to How You Live",
      subheadline:
        "Filter verified listings by price, architecture, and amenities, calculate monthly payments instantly, and schedule private or virtual property tours.",
      primaryCta: "Browse Properties",
      secondaryCta: "Mortgage Estimator",
      searchBar: {
        field1Label: "City or Neighborhood",
        field1Placeholder: "Search Waterfront, Downtown, Hills, Penthouse...",
        field2Label: "Listing Type",
        field2Options: ["All Listings", "For Sale", "Luxury Residences", "Commercial", "Waterfront"],
        submitLabel: "Search Homes",
      },
      stats: [
        { value: "1,250+", label: "Active Verified Listings" },
        { value: "$1.4B", label: "Closed Volume" },
        { value: "420+", label: "Licensed Advisors" },
        { value: "100%", label: "Title Pre-Verified" },
      ],
    },
    "Curated Property Listings",
    "Browse homes and spaces with transparent HOA, square-footage, and neighborhood highlights.",
    [
      { id: "re-1", title: "Glassline Waterfront Residence", subtitle: "4 Bed · 3.5 Bath · 3,420 sqft", category: "Waterfront", badge: "New Listing", metric: "$1,480,000", rating: "98 Walk", description: "Floor-to-ceiling harbor glazing, chef marble island, heated cedar deck, and private boat slip.", features: ["Solar + Storage", "EV Garage", "Smart Climate"], actionLabel: "Schedule Tour" },
      { id: "re-2", title: "The Mercer Loft Penthouse", subtitle: "3 Bed · 2.5 Bath · 2,610 sqft", category: "Luxury Residences", badge: "Rooftop Terrace", metric: "$1,920,000", rating: "99 Walk", description: "Restored timber-loft proportions paired with private 700 sqft skyline terrace and concierge.", features: ["Direct Elevator", "Wine Vault", "24/7 Doorman"], actionLabel: "Schedule Tour" },
      { id: "re-3", title: "Oakridge Modern Courtyard Home", subtitle: "4 Bed · 3 Bath · 2,950 sqft", category: "For Sale", badge: "Open Sunday", metric: "$895,000", rating: "A+ Schools", description: "Passive-solar courtyard architecture with detached studio office and drought-tolerant garden.", features: ["ADU Studio", "Heat Pump", "Oak Floors"], actionLabel: "Schedule Tour" },
      { id: "re-4", title: "Harbor District Creative Hub", subtitle: "Commercial · 5,800 sqft Floorplate", category: "Commercial", badge: "LEED Gold", metric: "$42 / sqft NNN", rating: "Fiber 10G", description: "Turnkey sunlit creative office floor with acoustic boardrooms and terrace café.", features: ["Bike Valet", "10G Fiber", "Transit Adjacent"], actionLabel: "Request Prospectus" },
      { id: "re-5", title: "Bayside Coastal Townhome", subtitle: "3 Bed · 2.5 Bath · 2,140 sqft", category: "Waterfront", badge: "Price Reduced", metric: "$765,000", rating: "Bay Views", description: "Steps from coastal boardwalks with dual primary suites and private lockable surfboard storage.", features: ["Low HOA", "Quartz Kitchen", "2-Car Bay"], actionLabel: "Schedule Tour" },
      { id: "re-6", title: "Hilltop Timber & Stone Villa", subtitle: "5 Bed · 4.5 Bath · 4,600 sqft", category: "Luxury Residences", badge: "Architectural", metric: "$2,350,000", rating: "1.2 Acres", description: "Panoramic valley ridges, infinity plunge pool, and acoustic screening lounge.", features: ["1.2 Acre Lot", "Guest Pavilion", "Wellness Spa"], actionLabel: "Schedule Tour" },
    ],
    "Platform Capabilities for Buyers, Renters & Brokerages",
    "Spatial search powered by PostgreSQL PostGIS, instant tour booking, and lender pre-qualification.",
    [
      { icon: "📍", title: "PostGIS Radius & Polygon Search", description: "Draw custom school-district or commute zones with sub-50ms geospatial query speed." },
      { icon: "🏡", title: "Virtual & Private Tours", description: "Instant 3D walkthrough embeds and calendar-synced in-person showing confirmations." },
      { icon: "🧮", title: "Live Monthly Cost Breakdown", description: "Interactive principal, interest, property tax, and HOA estimators built directly into listings." },
      { icon: "📑", title: "Verified Title & Disclosures", description: "Download inspection summaries, floor plans, and energy disclosures with one click." },
      { icon: "🤝", title: "Agent & Brokerage Portals", description: "Dedicated lead pipelines, open-house check-ins, and MLS sync logs." },
      { icon: "🔔", title: "Saved Search Alerts", description: "Instant price-drop and new-inventory alerts tuned to exact bedroom and budget filters." },
    ],
    {
      kind: "property_mortgage",
      title: "Interactive Monthly Payment & Ownership Estimator",
      subtitle: "Adjust home price tier (in $100k increments) and down-payment/escrow options to estimate monthly cost.",
      unitLabel: "Property Tier ($100k units)",
      baseRate: 620,
      options: [
        { label: "20% Down Payment Discount (-$110/unit/mo)", delta: -110 },
        { label: "Include Estimated Property Tax & Insurance (+$145/unit/mo)", delta: 145 },
        { label: "15-Year Accelerated Term (+$190/unit/mo)", delta: 190 },
      ],
    },
    [
      { quote: "Comparing commute zones alongside transparent HOA numbers saved us months of guesswork.", author: "Hannah & Devon Price", role: "First-Time Buyers" },
      { quote: "Booked three Sunday showings in five minutes without waiting on phone tag.", author: "Kieran O'Sullivan", role: "Relocation Client" },
      { quote: "Our brokerage team closes 35% more qualified tour leads using the built-in estimator.", author: "Nadia Al-Mansoor", role: "Managing Broker" },
    ],
    [
      { q: "Are property listings updated in real time?", a: "Yes. Listings sync hourly against MLS feeds and verified seller statuses so under-contract homes update promptly." },
      { q: "Can I tour properties remotely?", a: "Every residence supports live video tours with the listing advisor as well as weekend open-house slots." },
      { q: "What closing costs should buyers budget?", a: "Typically 2%–4% of purchase price for lender origination, title insurance, and prepaid escrow taxes." },
      { q: "How do agents list on the marketplace?", a: "Licensed brokers verify credentials in the Agent Portal to publish listings, disclosures, and calendars." },
    ],
    { headline: "Ready to Step Inside Your Next Home?", subheadline: "Book a private showing or request a personalized neighborhood market brief.", buttonLabel: "Request Private Showing" },
    ["properties", "leases", "showings", "inquiries"],
  ),

  healthcare: makePreset(
    "Meridian Care Clinic & Portal",
    "meridiancare.health",
    "Patient-first clinical care, online scheduling, specialist telehealth, and HIPAA-conscious portals.",
    "emerald",
    "light",
    ["Specialties", "Clinicians", "Schedule Visit", "Reviews", "FAQ"],
    "Book Appointment",
    {
      eyebrow: "Board-Certified Primary & Specialty Care",
      headline: "Compassionate Clinical Care Built Around Your Schedule",
      subheadline:
        "Browse specialties, review board-certified physicians, estimate visit coverage, and request same-week in-clinic or HIPAA-encrypted telehealth appointments.",
      primaryCta: "Find a Specialty",
      secondaryCta: "Estimate Visit",
      searchBar: {
        field1Label: "Condition or Specialty",
        field1Placeholder: "Search Primary Care, Cardiology, Dental, Pediatrics...",
        field2Label: "Visit Format",
        field2Options: ["All Services", "Primary Care", "Specialty Care", "Diagnostics & Labs", "Telehealth"],
        submitLabel: "Search Care",
      },
      stats: [
        { value: "Same-Day", label: "Urgent Slots Available" },
        { value: "98%", label: "Patient Satisfaction" },
        { value: "45+", label: "Board-Certified Clinicians" },
        { value: "HIPAA", label: "Encrypted Patient Portal" },
      ],
    },
    "Clinical Departments & Care Pathways",
    "Explore clinical services, transparent visit summaries, and request an appointment slot directly.",
    [
      { id: "hc-1", title: "Comprehensive Primary & Preventive Medicine", subtitle: "Adults & Seniors · Same-Week", category: "Primary Care", badge: "Accepting Patients", metric: "$0 Copay Prev.", rating: "4.97", description: "Annual wellness exams, metabolic risk screening, immunizations, and chronic care coordination.", features: ["30-Min Visits", "Portal Labs", "Care Team"], actionLabel: "Book Visit" },
      { id: "hc-2", title: "Non-Invasive Cardiology & Hypertension", subtitle: "Fellowship Trained · ECG In-House", category: "Specialty Care", badge: "Same-Day ECG", metric: "In-Network", rating: "4.98", description: "Preventive lipid management, ambulatory Holter monitoring, echocardiography, and stress testing.", features: ["Echocardiography", "BP Coaching", "24h Results"], actionLabel: "Book Visit" },
      { id: "hc-3", title: "Family Dentistry & Restorative Studio", subtitle: "Gentle Care · Digital X-Ray", category: "Primary Care", badge: "Saturday Hours", metric: "Transparent Fees", rating: "4.95", description: "Preventive cleanings, 3D intraoral scanning, biocompatible restorations, and emergency tooth care.", features: ["Digital Scan", "Zero Judgment", "Evening Slots"], actionLabel: "Book Cleaning" },
      { id: "hc-4", title: "Rapid Clinical Laboratory & Imaging", subtitle: "CLIA Certified · Digital Portal", category: "Diagnostics & Labs", badge: "< 2 Hr Turnaround", metric: "Walk-In Ready", rating: "4.94", description: "Complete blood panels, A1c, thyroid testing, and digital ultrasound with physician commentary.", features: ["Fasting Morning", "FHIR Export", "Direct Billing"], actionLabel: "Reserve Lab Slot" },
      { id: "hc-5", title: "24/7 Urgent Telehealth Video Visits", subtitle: "Licensed MDs & NPs · 15 Min", category: "Telehealth", badge: "15-Min Avg Wait", metric: "$49 Flat Self-Pay", rating: "4.92", description: "Immediate prescriptions, travel medicine consults, dermatology reviews, and follow-up check-ins.", features: ["E-Prescribing", "Encrypted HD", "Follow-Up Note"], actionLabel: "Start Telehealth" },
      { id: "hc-6", title: "Pediatrics & Adolescent Wellness", subtitle: "Birth to 18 · Dedicated Wing", category: "Specialty Care", badge: "Family Favorite", metric: "Nurse Line 24/7", rating: "4.99", description: "Developmental milestones, school/sports physicals, asthma action plans, and sensory-friendly rooms.", features: ["Direct Nurse Chat", "Well-Child Track", "Warm Care"], actionLabel: "Book Pediatrician" },
    ],
    "Patient Portal & Clinical Governance Features",
    "Designed around clinical safety, clear communication, and HIPAA / FHIR R4 interoperability readiness.",
    [
      { icon: "🩺", title: "Unified EHR Scheduling", description: "Filter appointments by specialty, language spoken, insurance network, and telehealth availability." },
      { icon: "🔬", title: "Plain-English Lab Summaries", description: "Every biomarker returns with reference intervals and physician-reviewed next steps." },
      { icon: "🔒", title: "HIPAA & Zero-Trust Boundaries", description: "Role-scoped PHI encryption, audit logging, and human clinician sign-off on clinical workflows." },
      { icon: "💊", title: "Pharmacy & Refill Routing", description: "One-click prescription renewal requests with automated interaction screening." },
      { icon: "📄", title: "FHIR R4 Record Portability", description: "Patients can download standardized visit summaries and immunizations anytime." },
      { icon: "💬", title: "Care Team Messaging", description: "Encrypted asynchronous follow-ups routed directly to your assigned clinical nurse." },
    ],
    {
      kind: "appointment_scheduler",
      title: "Interactive Visit Coverage & Slot Estimator",
      subtitle: "Select visit sessions/follow-ups and add-on diagnostics to estimate expected out-of-pocket costs before booking.",
      unitLabel: "Planned Consult Visits",
      baseRate: 95,
      options: [
        { label: "Verified PPO / HMO Insurance Applied (-$70/visit)", delta: -70 },
        { label: "Comprehensive Wellness Blood Panel (+$65/visit)", delta: 65 },
        { label: "Same-Day Extended Diagnostic Workup (+$55/visit)", delta: 55 },
      ],
    },
    [
      { quote: "Seeing my lab commentary in clear language before the weekend gave our family real peace of mind.", author: "Dr. Evelyn Park", role: "Referring Physician" },
      { quote: "Booked a pediatric ear-infection video visit at 9 PM and had the pharmacy prescription in 25 minutes.", author: "Tariq Mensah", role: "Parent & Patient" },
      { quote: "Zero waiting-room clipboards—intake, insurance, and reminders worked effortlessly on my phone.", author: "Rachel Bennett", role: "Patient Member" },
    ],
    [
      { q: "Which insurance plans are accepted?", a: "We accept most major PPO, EPO, and Medicare plans and clearly list transparent self-pay rates upfront." },
      { q: "How is patient health information protected?", a: "All clinical data requires TLS 1.3 in transit, AES-256 at rest, strict RBAC, and clinician sign-off prior to release." },
      { q: "Do telehealth visits require downloading software?", a: "No. Video consultations open directly inside any modern mobile or desktop browser." },
      { q: "Can I transfer records from another hospital?", a: "Yes—upload PDF records or connect via FHIR R4 inside your Patient Portal prior to your appointment." },
    ],
    { headline: "Schedule Your Visit in Under 60 Seconds", subheadline: "Choose an in-clinic appointment or secure video consultation with transparent pricing.", buttonLabel: "Request Appointment" },
    ["patients", "appointments", "encounters", "fhir_observations"],
  ),

  hospitality: makePreset(
    "Hearth & Saffron Table",
    "hearthsaffron.com",
    "Seasonal culinary craftsmanship, online menu filtering, table reservations, and catering orders.",
    "amber",
    "dark",
    ["Menu", "Reservations", "Catering", "Reviews", "FAQ"],
    "Reserve Table",
    {
      eyebrow: "Artisan Kitchen, Bakery & Dining Room",
      headline: "Wood-Fired Flavor & Handcrafted Daily Bakes",
      subheadline:
        "Explore seasonal menus with dietary filters, build a takeaway or catering order live, and reserve a table for dinner, brunch, or private dining.",
      primaryCta: "Explore the Menu",
      secondaryCta: "Catering Estimator",
      searchBar: {
        field1Label: "Search Dishes & Pastries",
        field1Placeholder: "Search sourdough, wood-fired, vegan, pastry...",
        field2Label: "Course",
        field2Options: ["All", "Wood-Fired Mains", "Artisan Bakery", "Small Plates", "Drinks & Espresso"],
        submitLabel: "Filter Menu",
      },
      stats: [
        { value: "Daily 6am", label: "Fresh Hearth Bakes" },
        { value: "4.95 ★", label: "1,900+ Diners" },
        { value: "100%", label: "Locally Sourced Grain" },
        { value: "Private", label: "Dining & Catering" },
      ],
    },
    "Signature Menu & Daily Specials",
    "Filter by course or dietary notes and click any dish to add to your takeaway bag or catering inquiry.",
    [
      { id: "ho-1", title: "Charred Sourdough & Cultured Sea-Salt Butter", subtitle: "Starters · House Levain", category: "Small Plates", badge: "House Classic", metric: "$11", rating: "4.9", description: "48-hour wild-fermented heirloom grain loaf brushed with roasted garlic and sea salt.", features: ["Vegetarian", "48h Ferment", "Warm From Hearth"], actionLabel: "Add to Order" },
      { id: "ho-2", title: "Cardamom Pistachio Morning Croissant", subtitle: "Morning Bake · Laminated", category: "Artisan Bakery", badge: "Sells Out Early", metric: "$6.50", rating: "4.98", description: "27-layer French cultured-butter pastry glazed with orange blossom syrup and toasted pistachio.", features: ["Baked Hourly", "Real Vanilla", "Takeaway Ready"], actionLabel: "Add to Order" },
      { id: "ho-3", title: "Cedar-Roasted Sea Bass & Fennel", subtitle: "Wood-Fired · GF Available", category: "Wood-Fired Mains", badge: "Chef Signature", metric: "$34", rating: "4.96", description: "Crisp-skin wild sea bass served over saffron fingerling potatoes, charred lemon, and herb emulsion.", features: ["Gluten-Free", "Line-Caught", "Wine Pairing"], actionLabel: "Add to Order" },
      { id: "ho-4", title: "Herb-Glazed Cast-Iron Maitake Steak", subtitle: "Plant-Forward · Vegan", category: "Wood-Fired Mains", badge: "100% Plant", metric: "$26", rating: "4.93", description: "Seared cluster mushroom glazed with fermented black garlic jus, smoked polenta, and charred broccolini.", features: ["Vegan", "Nut-Free", "Umami Rich"], actionLabel: "Add to Order" },
      { id: "ho-5", title: "Single-Origin Honey Oat Cortado & Cold Brew Flight", subtitle: "Espresso Bar · Small Lot", category: "Drinks & Espresso", badge: "House Roast", metric: "$9", rating: "4.92", description: "Velvety micro-lot Ethiopian espresso paired with raw wildflower honey and oat milk.", features: ["Direct Trade", "Hot or Iced", "Oat/Dairy"], actionLabel: "Add to Order" },
      { id: "ho-6", title: "Artisan Pastry & Brunch Sharing Box (12 pc)", subtitle: "Catering & Group · Morning", category: "Artisan Bakery", badge: "Office Favorite", metric: "$68", rating: "4.97", description: "Assorted croissants, seasonal fruit galettes, savory scones, and freshly brewed coffee carafes.", features: ["Feeds 10-12", "Allergy Labeled", "Same-Day Pickup"], actionLabel: "Order Box" },
    ],
    "Seamless Hospitality Experience",
    "From online menu discovery and allergy clarity to instant table booking and private events.",
    [
      { icon: "🔥", title: "Live Seasonal Menu", description: "Daily batch availability badges synced with kitchen prep so guests see fresh specials immediately." },
      { icon: "🪑", title: "Zero-Friction Table Booking", description: "Real-time dining room, patio, and chef-counter seat selection with SMS reminders." },
      { icon: "🧺", title: "Pickup & Event Catering", description: "Build multi-tray corporate or family boxes with transparent guest-count calculators." },
      { icon: "🌱", title: "Clear Allergen & Dietary Tags", description: "Filter vegetarian, vegan, gluten-free, and nut-free selections cleanly in one tap." },
      { icon: "☕", title: "Loyalty & Gift Cards", description: "Digital tasting passes and recurring bakery subscription pickup clubs." },
      { icon: "📍", title: "Neighborhood Hours & Parking", description: "Instant transit directions, patio weather notes, and private dining room inquiry forms." },
    ],
    {
      kind: "booking_estimator",
      title: "Private Dining & Event Catering Estimator",
      subtitle: "Estimate per-guest menus for brunch tables, milestone dinners, or office pastry spreads.",
      unitLabel: "Guests",
      baseRate: 38,
      options: [
        { label: "Add 3-Course Plated Service (+$24/guest)", delta: 24 },
        { label: "Sommelier Beverage / Mocktail Pairing (+$18/guest)", delta: 18 },
        { label: "Dedicated Custom Cake & Espresso Bar (+$12/guest)", delta: 12 },
      ],
    },
    [
      { quote: "The cardamom croissants and dinner service are unmatched—reserving patio seats took seconds.", author: "Maya Lin", role: "Neighborhood Regular" },
      { quote: "Ordered catering boxes for 35 conference guests; allergy labels made dietary setup effortless.", author: "David Osei", role: "Event Organizer" },
      { quote: "Warm hospitality paired with crisp online ordering and zero third-party app markups.", author: "Sofia Conti", role: "Food Editor" },
    ],
    [
      { q: "Can we reserve for parties of 8 or more?", a: "Yes—use the Private Dining estimator above or select group size in the reservation modal for priority seating." },
      { q: "Are gluten-free or vegan dishes prepared separately?", a: "Our kitchen marks every allergen clearly and prepares gluten-free proteins on dedicated cast-iron stations." },
      { q: "How far ahead should catering orders be placed?", a: "Same-day morning boxes are available before 9 AM; full-service plated catering requires 48 hours notice." },
      { q: "Do you take walk-ins?", a: "Bar and bakery counter seating stay open for walk-ins all day alongside reservations." },
    ],
    { headline: "Save Your Seat at the Hearth", subheadline: "Book dinner, schedule morning pickup, or request a bespoke event menu.", buttonLabel: "Reserve Your Table" },
    ["menus", "reservations", "orders", "catering_requests"],
  ),

  "saas-products": makePreset(
    "MetricFlow Cloud Platform",
    "metricflow.io",
    "Modern SaaS workspace for real-time telemetry, automation workflows, team RBAC, and transparent billing.",
    "violet",
    "dark",
    ["Product", "Features", "Pricing", "Customers", "FAQ"],
    "Start Free Trial",
    {
      eyebrow: "Enterprise-Ready SaaS Architecture",
      headline: "Ship Faster With Unified Telemetry & Automated Workflows",
      subheadline:
        "Monitor product adoption, orchestrate team approvals, enforce role-based access, and forecast scale pricing—all inside a clean dark workspace.",
      primaryCta: "Explore Modules",
      secondaryCta: "Calculate Plan",
      searchBar: {
        field1Label: "Search Capabilities",
        field1Placeholder: "Search analytics, RBAC, webhooks, audit logs...",
        field2Label: "Module",
        field2Options: ["All", "Core Analytics", "Automation", "Security & RBAC", "Developer API"],
        submitLabel: "Filter Modules",
      },
      stats: [
        { value: "99.98%", label: "Uptime SLA" },
        { value: "< 35ms", label: "P95 API Latency" },
        { value: "SOC 2", label: "Type II Ready" },
        { value: "12,000+", label: "Product Teams" },
      ],
    },
    "Modular Platform Suite",
    "Inspect core SaaS capabilities, configure seat plans, or queue modules into your evaluation workspace.",
    [
      { id: "sa-1", title: "Real-Time Product Funnels & Cohorts", subtitle: "Core Analytics · Zero SQL", category: "Core Analytics", badge: "Most Popular", metric: "Included Pro", rating: "99.9%", description: "Track activation, retention curves, and feature adoption across millions of daily user events.", features: ["ClickHouse Engine", "CSV/API Export", "Live Alerts"], actionLabel: "Add to Workspace" },
      { id: "sa-2", title: "Event-Driven Workflow Automations", subtitle: "Automation · Retries Built-In", category: "Automation", badge: "Durable Queue", metric: "$49 / add-on", rating: "4.95", description: "Visual webhook and approval pipelines with idempotency keys, exponential backoff, and dead-letter logs.", features: ["HMAC Webhooks", "Cron Triggers", "Audit Trail"], actionLabel: "Add to Workspace" },
      { id: "sa-3", title: "SSO, SAML 2.0 & Fine-Grained RBAC", subtitle: "Security & RBAC · Enterprise", category: "Security & RBAC", badge: "Zero-Trust", metric: "Enterprise", rating: "4.99", description: "Okta/Google/Microsoft SAML SSO, SCIM provisioning, and tenant-isolated row-level security.", features: ["SCIM Sync", "Immutable Audit", "IP Allowlist"], actionLabel: "Add to Workspace" },
      { id: "sa-4", title: "Typed GraphQL & REST SDK", subtitle: "Developer API · OpenAPI 3.1", category: "Developer API", badge: "DX Award", metric: "OpenAPI 3.1", rating: "4.94", description: "End-to-end TypeScript and Python SDKs with scoped API tokens, rate-limit headers, and sandboxes.", features: ["TS / Python SDK", "Local Mock CLI", "Idempotent POST"], actionLabel: "Add to Workspace" },
      { id: "sa-5", title: "AI Anomaly & Churn Early Warning", subtitle: "Core Analytics · Copilot", category: "Core Analytics", badge: "AI Powered", metric: "+$79 / workspace", rating: "4.91", description: "Detects usage drops and latency spikes before customers churn, surfacing root-cause traces.", features: ["Daily Digest", "Slack Alerts", "Explainable"], actionLabel: "Add to Workspace" },
      { id: "sa-6", title: "Multi-Region Usage Metering & Stripe Billing", subtitle: "Automation · Revenue", category: "Automation", badge: "Auto Proration", metric: "0.4% Fee", rating: "4.96", description: "Real-time seat and metered usage rating synced automatically with Stripe subscriptions and invoices.", features: ["Proration", "Seat Sync", "Tax Hooks"], actionLabel: "Add to Workspace" },
    ],
    "Engineered From First Principles",
    "Multi-tenant isolation, edge caching, strict API contracts, and delightful customer onboarding.",
    [
      { icon: "⚡", title: "Sub-50ms Edge Dashboards", description: "Pre-aggregated materializations keep executive charts snappy even at high event volume." },
      { icon: "🔐", title: "Tenant-Isolated PostgreSQL", description: "Row-level security policies isolate every workspace without cross-tenant data leakage." },
      { icon: "🔌", title: "50+ Native Webhooks & Syncs", description: "Connect Slack, GitHub, Stripe, HubSpot, and warehouse destinations in two clicks." },
      { icon: "📈", title: "Predictable Seat + Usage Pricing", description: "Transparent cost forecasting tools ensure finance teams never get surprise overages." },
      { icon: "🧪", title: "Continuous Automated QA", description: "Synthetic canary checks and static security gates verify every deployment automatically." },
      { icon: "🌍", title: "Global Multi-Language UI", description: "Localized workspace strings and timezone-aware reporting across international teams." },
    ],
    {
      kind: "pricing_calculator",
      title: "Interactive SaaS Seat & Volume Pricing Calculator",
      subtitle: "Scale seats and enterprise compliance modules to preview exact monthly spend.",
      unitLabel: "Active Team Seats",
      baseRate: 24,
      options: [
        { label: "Annual Billing Discount (-20%)", delta: -5 },
        { label: "SAML SSO & Dedicated Audit Retention (+$8/seat)", delta: 8 },
        { label: "AI Anomaly Copilot Pack (+$10/seat)", delta: 10 },
      ],
    },
    [
      { quote: "Replaced three brittle internal scripts in one afternoon and our PMs finally trust cohort numbers.", author: "Priya Nair", role: "VP of Product, FinStack" },
      { quote: "The RBAC audit trail sailed right through our enterprise SOC 2 Type II security questionnaire.", author: "Daniel Lindqvist", role: "CISO, CloudGrid" },
      { quote: "Stripe metered billing integration paid for itself within the first billing cycle.", author: "Alicia Torres", role: "Head of Growth" },
    ],
    [
      { q: "Is there a free sandbox or trial tier?", a: "Every workspace launches with a 14-day full-featured Pro trial with no credit card required." },
      { q: "How does multi-tenant data isolation work?", a: "Each workspace carries signed JWT tenant claims enforced at both the API gateway and PostgreSQL query layer." },
      { q: "Can we export all raw metrics anytime?", a: "Yes—stream events to S3, BigQuery, or PostgreSQL or download CSV/JSON snapshots with zero lock-in." },
      { q: "What uptime SLA is included?", a: "Pro includes 99.9% availability and Enterprise plans include a financially backed 99.98% multi-region SLA." },
    ],
    { headline: "Launch Your Modern SaaS Workspace in Minutes", subheadline: "Start a sandbox trial or schedule an architecture walkthrough with engineering.", buttonLabel: "Request Sandbox Access" },
    ["tenants", "subscriptions", "api_keys", "audit_logs"],
  ),

  portfolio: makePreset(
    "Studio Kestrel — Design & Engineering",
    "studiokestrel.design",
    "Selected case studies, interactive systems craft, creative direction, and client inquiry booking.",
    "gold",
    "dark",
    ["Work", "Expertise", "Scope Calc", "Testimonials", "Contact"],
    "Hire Studio",
    {
      eyebrow: "Independent Design & Full-Stack Practice",
      headline: "Designing Digital Products That Feel Inevitable",
      subheadline:
        "Partnering with ambitious founders and product teams across brand systems, interactive web platforms, design engineering, and conversion architecture.",
      primaryCta: "View Selected Work",
      secondaryCta: "Estimate Project Scope",
      searchBar: {
        field1Label: "Search Case Studies",
        field1Placeholder: "Search fintech, mobile app, design system, branding...",
        field2Label: "Discipline",
        field2Options: ["All", "Product UI/UX", "Design Systems", "Web Engineering", "Brand Identity"],
        submitLabel: "Filter Work",
      },
      stats: [
        { value: "42+", label: "Shipped Products" },
        { value: "9 yrs", label: "Product Craft" },
        { value: "3.1x", label: "Avg Conversion Lift" },
        { value: "Q2 Open", label: "Next Availability" },
      ],
    },
    "Selected Case Studies & Visual Craft",
    "Explore launched client engagements across web apps, design systems, and flagship brand sites.",
    [
      { id: "po-1", title: "Verve Capital — Wealth Client Portal", subtitle: "Product UI/UX · Fintech", category: "Product UI/UX", badge: "Conversion +44%", metric: "8 Weeks", rating: "Awwwards Nom.", description: "Reimagined portfolio telemetry and onboarding flows for $2B private wealth advisors.", features: ["Next.js", "Design Tokens", "Interactive Charts"], actionLabel: "Inspect Case Study" },
      { id: "po-2", title: "Solstice Audio — Hardware Flagship Launch", subtitle: "Brand & 3D Web · Commerce", category: "Brand Identity", badge: "Site of the Day", metric: "6 Weeks", rating: "+180% Preorder", description: "Editorial storytelling experience with spatial acoustics demos and seamless Stripe checkout.", features: ["Motion Craft", "WCAG AA", "99 Lighthouse"], actionLabel: "Inspect Case Study" },
      { id: "po-3", title: "Kova Health — Unified Design System", subtitle: "Design Systems · 90 Components", category: "Design Systems", badge: "Multi-Brand", metric: "10 Weeks", rating: "4 Teams Unblocked", description: "Accessible Figma-to-React component library spanning patient mobile web and clinician desktop apps.", features: ["Radix Primitives", "WCAG AAA", "Storybook"], actionLabel: "Inspect Case Study" },
      { id: "po-4", title: "Northstar Freight — Dispatch Map UI", subtitle: "Web Engineering · Real-Time", category: "Web Engineering", badge: "60 FPS Canvas", metric: "12 Weeks", rating: "14k Daily Drivers", description: "High-density logistics console tracking live fleet corridors with zero main-thread frame drops.", features: ["TypeScript", "Mapbox", "Keyboard First"], actionLabel: "Inspect Case Study" },
      { id: "po-5", title: "Lumen Press — Editorial Publishing Flagship", subtitle: "Web Engineering · Publishing", category: "Web Engineering", badge: "Typography Pick", metric: "5 Weeks", rating: "2.4x Read Time", description: "Serene longform reader typography, audio article sync, and member bookmarking.", features: ["RSS & Audio", "Dark/Light", "Fast Edge"], actionLabel: "Inspect Case Study" },
      { id: "po-6", title: "Atelier Nord — Architectural Practice Site", subtitle: "Brand Identity · Studio", category: "Brand Identity", badge: "Minimalist", metric: "4 Weeks", rating: "3x Inbound Leads", description: "Monograph grid celebrating sustainable timber architecture with high-resolution floor plans.", features: ["Fluid Grid", "Lead Triage", "Multilingual"], actionLabel: "Inspect Case Study" },
    ],
    "How Collaborations Work",
    "From rapid two-week design sprints to end-to-end shipped web platforms.",
    [
      { icon: "🎨", title: "Product & Brand Direction", description: "Typography, color architecture, and narrative positioning that differentiate crowded markets." },
      { icon: "🧱", title: "Production React Engineering", description: "Pixel-accurate TypeScript and Tailwind builds delivered with clean, maintainable architecture." },
      { icon: "📐", title: "Accessible Design Systems", description: "Reusable UI tokens audited for WCAG 2.2 contrast and keyboard navigation from day one." },
      { icon: "⚡", title: "Core Web Vitals Focus", description: "Sub-second loads, responsive mobile ergonomics, and semantic SEO markup built in." },
      { icon: "🔄", title: "Async Loom & Weekly Demos", description: "Transparent weekly staging builds so stakeholders click real prototypes instead of static slides." },
      { icon: "📦", title: "Clean Handover & Docs", description: "Full source repositories, Figma tokens, and team onboarding videos included." },
    ],
    {
      kind: "pricing_calculator",
      title: "Engagement Scope & Timeline Estimator",
      subtitle: "Estimate sprint weeks and optional engineering deliverables for your upcoming project.",
      unitLabel: "Sprint Weeks",
      baseRate: 2800,
      options: [
        { label: "Full-Stack React + API Engineering (+$1,400/wk)", delta: 1400 },
        { label: "Custom Design System Token Library (+$900/wk)", delta: 900 },
        { label: "Ongoing Monthly Advisory Retainer (-$400/wk)", delta: -400 },
      ],
    },
    [
      { quote: "The rare studio that thinks like both a creative director and a principal frontend engineer.", author: "Henrik Lind", role: "Founder, Solstice Audio" },
      { quote: "Our enterprise buyers explicitly complimented how trustworthy our new portal feels.", author: "Maya Deshmukh", role: "CEO, Verve Capital" },
      { quote: "Zero handoff friction—we merged their PRs straight into production.", author: "Samir Patel", role: "CTO, Kova Health" },
    ],
    [
      { q: "Do you work with early-stage startups as well as enterprises?", a: "Yes—fixed-scope launch sprints for seed teams and embedded design-system work for scaling orgs." },
      { q: "What deliverables are included?", a: "Interactive Figma prototypes, responsive production code, documentation, and full IP ownership upon completion." },
      { q: "How soon can a project begin?", a: "Discovery workshops normally kick off within 1–2 weeks of scope confirmation." },
      { q: "Can you refresh an existing site without a full rewrite?", a: "Yes—landing page overhauls and incremental design-system migrations are among our most requested engagements." },
    ],
    { headline: "Let's Build Something Memorable Together", subheadline: "Share your timeline and goals to book a 20-minute scoping call.", buttonLabel: "Request Project Slot" },
    ["projects", "testimonials", "inquiries", "case_studies"],
  ),

  education: makePreset(
    "Luminary Learning Academy",
    "luminaryacademy.edu",
    "Interactive course discovery, structured learning cohorts, progress tracking & instructor portals.",
    "ocean",
    "light",
    ["Courses", "Tracks", "Tuition Calc", "Outcomes", "FAQ"],
    "Enroll Now",
    {
      eyebrow: "Modern E-Learning & University Portal",
      headline: "Master High-Impact Skills With Structured Cohort Learning",
      subheadline:
        "Browse accredited tracks, hands-on capstone labs, live mentor sessions, and transparent tuition calculators designed for lifelong learners.",
      primaryCta: "Browse Courses",
      secondaryCta: "Tuition Estimator",
      searchBar: {
        field1Label: "Search Courses",
        field1Placeholder: "Search AI Engineering, Design, Cloud, Data Science...",
        field2Label: "Track",
        field2Options: ["All", "Engineering", "Design & Product", "Business & Leadership", "Certifications"],
        submitLabel: "Find Courses",
      },
      stats: [
        { value: "85+", label: "Interactive Courses" },
        { value: "94%", label: "Completion Rate" },
        { value: "1:12", label: "Mentor Ratio" },
        { value: "Verified", label: "Digital Credentials" },
      ],
    },
    "Featured Courses & Certification Tracks",
    "Filter by academic track or enroll in a cohort with downloadable syllabi and live mentor hours.",
    [
      { id: "ed-1", title: "Full-Stack TypeScript & Cloud Architecture", subtitle: "Engineering · 8 Weeks", category: "Engineering", badge: "Cohort Open", metric: "$790 / term", rating: "4.95", description: "Design production React apps, PostgreSQL schemas, REST APIs, and automated testing pipelines.", features: ["Live Labs", "Code Reviews", "Capstone"], actionLabel: "Enroll Course" },
      { id: "ed-2", title: "Applied AI Systems & RAG Engineering", subtitle: "Engineering · 6 Weeks", category: "Engineering", badge: "Top Pick", metric: "$890 / term", rating: "4.97", description: "Build deterministic evaluation harnesses, tool-calling agents, and grounded enterprise search.", features: ["Eval Harness", "Agent Lab", "Certificate"], actionLabel: "Enroll Course" },
      { id: "ed-3", title: "Product Design Systems & Accessibility", subtitle: "Design & Product · 6 Weeks", category: "Design & Product", badge: "WCAG 2.2", metric: "$680 / term", rating: "4.92", description: "Craft token-driven Figma systems paired cleanly with responsive CSS and inclusive patterns.", features: ["Portfolio Piece", "Figma Kit", "Critiques"], actionLabel: "Enroll Course" },
      { id: "ed-4", title: "Healthcare Analytics & Clinical Data Modeling", subtitle: "Certifications · 8 Weeks", category: "Certifications", badge: "CE Credits", metric: "$920 / term", rating: "4.96", description: "Learn FHIR R4 data modeling, outcomes biostatistics, and privacy-preserving reporting.", features: ["FHIR Sandbox", "CE Eligible", "Mentor Q&A"], actionLabel: "Enroll Course" },
      { id: "ed-5", title: "Executive Strategy & Financial Modeling", subtitle: "Business & Leadership · 5 Weeks", category: "Business & Leadership", badge: "Case Method", metric: "$740 / term", rating: "4.91", description: "Master unit economics, capital allocation, operating cash-flow analysis, and board memos.", features: ["Case Packs", "Excel Models", "Peer Pods"], actionLabel: "Enroll Course" },
      { id: "ed-6", title: "Cyber Defense & Risk Management Bootcamp", subtitle: "Certifications · 10 Weeks", category: "Certifications", badge: "Career Track", metric: "$980 / term", rating: "4.94", description: "Hands-on threat modeling, SIEM log triage, AppSec remediation, and NIST RMF readiness.", features: ["Lab VM", "Mock Audits", "Job Prep"], actionLabel: "Enroll Course" },
    ],
    "Academic & LMS Capabilities",
    "Built for universities, bootcamps, corporate L&D teams, and specialist training institutes.",
    [
      { icon: "🎓", title: "Cohort & Self-Paced Modes", description: "Combine on-demand HD lessons with scheduled seminar discussions and deadlines." },
      { icon: "🧪", title: "Browser Coding & Case Labs", description: "Instant interactive exercises with automated rubrics and detailed mentor feedback." },
      { icon: "🏅", title: "Verifiable Credentials", description: "Issue tamper-evident completion certificates with cryptographic verification links." },
      { icon: "👨‍🏫", title: "Instructor Grading Studio", description: "Unified rubric queue, attendance tracking, and office-hour calendar booking." },
      { icon: "📊", title: "Mastery & Retention Analytics", description: "Spot struggling learners early with module-level engagement and quiz telemetry." },
      { icon: "🏢", title: "Team & Campus Licensing", description: "Seat packs, SSO login, and department budget invoicing in one portal." },
    ],
    {
      kind: "pricing_calculator",
      title: "Cohort Tuition & Team Scholarship Estimator",
      subtitle: "Calculate single-learner or team seat tuition with optional mentorship upgrades.",
      unitLabel: "Learner Seats",
      baseRate: 790,
      options: [
        { label: "Apply Early-Enrollment Scholarship (-$120/seat)", delta: -120 },
        { label: "Add 1-on-1 Weekly Capstone Mentoring (+$190/seat)", delta: 190 },
        { label: "Enterprise LMS Reporting & SSO (+$80/seat)", delta: 80 },
      ],
    },
    [
      { quote: "The capstone architecture review directly prepared me for my senior staff interview.", author: "Kwame Boateng", role: "2025 Cohort Graduate" },
      { quote: "Transitioned our 40-engineer onboarding program into structured 6-week tracks with 96% completion.", author: "Laura Chen", role: "Director of Engineering" },
      { quote: "Crystal-clear syllabus pacing and mentors who actually read every line of code.", author: "Nora Al-Sayed", role: "Product Designer" },
    ],
    [
      { q: "Are live sessions recorded?", a: "Yes—all seminars and office hours include searchable transcripts and HD recordings within 2 hours." },
      { q: "Are team and employer sponsorships supported?", a: "Yes. Generate an instant itemized PDF invoice inside checkout for employer L&D reimbursement." },
      { q: "What prerequisites are needed?", a: "Each course page clearly lists foundational skills and links to a free 1-week warm-up module." },
      { q: "How long do alumni keep curriculum access?", a: "Graduates retain lifetime access to completed course videos, templates, and community alumni channels." },
    ],
    { headline: "Join the Next Learning Cohort", subheadline: "Reserve your seat or request a customized curriculum proposal for your organization.", buttonLabel: "Apply to Cohort" },
    ["courses", "modules", "enrollments", "assessments"],
  ),
};

const SYNTHESIZED_CATEGORY_PROFILES: Record<
  string,
  {
    brand: string;
    domain: string;
    palette: string;
    mode: "light" | "dark";
    headline: string;
    subheadline: string;
    searchPlaceholder: string;
    cats: [string, string, string];
    metricUnit: string;
    rate: number;
    unitLabel: string;
    toolKind: InteractiveToolKind;
  }
> = {
  business: { brand: "Apex Advisory Group", domain: "apexadvisory.co", palette: "slate", mode: "light", headline: "Strategic Advisory & Measurable Execution for Growing Companies", subheadline: "Showcase core capabilities, publish verified client outcomes, and convert high-intent consultations cleanly.", searchPlaceholder: "Search strategy, digital transformation, operations...", cats: ["Strategy", "Operations", "Technology"], metricUnit: "Engagement", rate: 2500, unitLabel: "Workshop Days", toolKind: "lead_estimator" },
  "social-media": { brand: "PulseStream Network", domain: "pulsestream.social", palette: "violet", mode: "dark", headline: "Where Creators & Communities Share Stories in Real Time", subheadline: "Ranked discovery feeds, creator channels, community moderation queues, and live reactions built for engagement.", searchPlaceholder: "Search creators, channels, video series...", cats: ["Trending Reels", "Creator Channels", "Live Spaces"], metricUnit: "Followers", rate: 19, unitLabel: "Creator Boost Seats", toolKind: "pricing_calculator" },
  "professional-networking": { brand: "Vanguard Network", domain: "vanguardwork.io", palette: "ocean", mode: "dark", headline: "Connect Credentialed Talent, Mentors & High-Trust Opportunities", subheadline: "Verified industry profiles, role-matched opportunities, peer endorsements, and direct messaging.", searchPlaceholder: "Search specialists, mentors, open roles...", cats: ["Verified Profiles", "Open Roles", "Peer Mentors"], metricUnit: "Verified", rate: 39, unitLabel: "Recruiter Seats", toolKind: "pricing_calculator" },
  "legal-services": { brand: "Harbor & Grant LLP", domain: "harborgrantlaw.com", palette: "gold", mode: "dark", headline: "Authoritative Legal Counsel, Matter Tracking & Client Intake", subheadline: "Showcase practice areas, conflict-checked intake forms, deadline trackers, and attorney credentials cleanly.", searchPlaceholder: "Search corporate, litigation, IP, regulatory...", cats: ["Corporate Law", "Litigation", "Compliance & IP"], metricUnit: "Case Brief", rate: 350, unitLabel: "Consultation Hours", toolKind: "appointment_scheduler" },
  government: { brand: "CivicBridge Public Portal", domain: "civicbridge.gov.example", palette: "slate", mode: "light", headline: "Transparent Public Services, Permits & Citizen Access", subheadline: "Section 508 & WCAG 2.2 AA accessible service directory, permit lookup, and digital citizen requests.", searchPlaceholder: "Search permits, licenses, public records...", cats: ["Permits & Licensing", "Citizen Services", "Public Notices"], metricUnit: "Online", rate: 45, unitLabel: "Permit Applications", toolKind: "lead_estimator" },
  banking: { brand: "Northbridge Private Banking", domain: "northbridgebank.example", palette: "emerald", mode: "dark", headline: "Intelligent Treasury, Everyday Banking & Real-Time Controls", subheadline: "Transparent account tiers, instant ledger previews, savings calculators, and multi-factor security governance.", searchPlaceholder: "Search checking, treasury, CDs, transfers...", cats: ["Personal Banking", "Business Treasury", "Wealth & Rates"], metricUnit: "APY / Tier", rate: 1000, unitLabel: "Deposit ($1k units)", toolKind: "pricing_calculator" },
  fintech: { brand: "ClearLedger Financial", domain: "clearledger.app", palette: "emerald", mode: "dark", headline: "Automated Invoicing, Global Payouts & Cash-Flow Intelligence", subheadline: "Real-time invoice reconciliation, multi-currency fee calculators, and PCI-conscious treasury workflows.", searchPlaceholder: "Search invoicing, payouts, FX, budgeting...", cats: ["Global Payouts", "Automated Billing", "Cash Analytics"], metricUnit: "Platform Fee", rate: 49, unitLabel: "Team Members", toolKind: "pricing_calculator" },
  insurance: { brand: "ShieldCover Assurance", domain: "shieldcover.insure", palette: "ocean", mode: "light", headline: "Clear Coverage, Instant Quotes & Transparent Claims Tracking", subheadline: "Compare policy tiers side by side, estimate monthly premiums live, and guide policyholders through claims cleanly.", searchPlaceholder: "Search home, auto, commercial, health plans...", cats: ["Personal Plans", "Commercial Coverage", "Claims Support"], metricUnit: "Est. Monthly", rate: 68, unitLabel: "Coverage Units ($100k)", toolKind: "pricing_calculator" },
  transportation: { brand: "SwiftRoute Mobility", domain: "swiftroutemobility.com", palette: "ocean", mode: "dark", headline: "Smart Fleet Dispatch, Charter Booking & Real-Time Transit", subheadline: "Route estimators, live vehicle availability, driver verification, and corporate shuttle management.", searchPlaceholder: "Search routes, charters, EV fleets...", cats: ["City Rides", "Airport Transfers", "Fleet Management"], metricUnit: "Est. Fare", rate: 55, unitLabel: "Trip Miles (x10)", toolKind: "booking_estimator" },
  logistics: { brand: "AtlasFreight Command", domain: "atlasfreight.io", palette: "amber", mode: "dark", headline: "End-to-End Freight Tracking, Warehouse Sync & Customs Clarity", subheadline: "Calculate lane freight quotes, inspect carrier SLA scores, and monitor container shipments live.", searchPlaceholder: "Search ocean freight, air cargo, warehouses...", cats: ["Air & Express", "Ocean Container", "Cold Chain"], metricUnit: "SLA Tier", rate: 180, unitLabel: "Pallet Units", toolKind: "booking_estimator" },
  "job-boards": { brand: "TalentBeacon Careers", domain: "talentbeacon.jobs", palette: "ocean", mode: "light", headline: "Curated Roles & Direct Connections With Verified Hiring Teams", subheadline: "Salary-transparent listings, instant role filters, candidate profiles, and structured applicant pipelines.", searchPlaceholder: "Search engineering, healthcare, remote roles...", cats: ["Remote Roles", "Engineering", "Healthcare & Ops"], metricUnit: "Base Range", rate: 149, unitLabel: "Active Job Posts", toolKind: "pricing_calculator" },
  "freelance-marketplaces": { brand: "CraftGrid Talent Network", domain: "craftgrid.work", palette: "coral", mode: "light", headline: "Hire Vetted Independent Specialists With Milestone Protection", subheadline: "Compare verified portfolios, hourly rates, and escrow milestones for design, engineering, and consulting.", searchPlaceholder: "Search designers, developers, editors, consultants...", cats: ["Product & Design", "Engineering", "Growth & Video"], metricUnit: "Hourly / Fixed", rate: 85, unitLabel: "Project Hours", toolKind: "booking_estimator" },
  construction: { brand: "Ironwood Build Partners", domain: "ironwoodbuild.com", palette: "amber", mode: "dark", headline: "Precision Commercial & Residential Construction Delivery", subheadline: "Showcase completed builds, subcontractor pre-qualification, schedule milestones, and instant project estimates.", searchPlaceholder: "Search commercial buildout, custom homes, green retrofit...", cats: ["Commercial", "Custom Homes", "Renovations"], metricUnit: "Completed", rate: 210, unitLabel: "Sq Ft (x10)", toolKind: "lead_estimator" },
  automotive: { brand: "ApexDrive Motors & Service", domain: "apexdrivemotors.com", palette: "crimson", mode: "dark", headline: "Curated Vehicle Inventory, Transparent Financing & Service Bays", subheadline: "Filter inspected EVs and certified pre-owned models, estimate monthly payments, and schedule maintenance slots.", searchPlaceholder: "Search SUV, electric, sedan, brake service...", cats: ["Electric & Hybrid", "Certified Pre-Owned", "Service & Care"], metricUnit: "Inspected", rate: 420, unitLabel: "Price Tier ($10k units)", toolKind: "property_mortgage" },
  agriculture: { brand: "HarvestLink Cooperative", domain: "harvestlink.ag", palette: "emerald", mode: "light", headline: "Connecting Farms, Cold-Chain Logistics & Direct Wholesale Buyers", subheadline: "Real-time harvest availability, agronomic lot traceability, and direct farm-to-market fulfillment orders.", searchPlaceholder: "Search grains, organic produce, irrigation, cold chain...", cats: ["Fresh Harvest", "Wholesale Lots", "Farm Services"], metricUnit: "Farm Direct", rate: 140, unitLabel: "Crate / Ton Units", toolKind: "cart_checkout" },
  nonprofits: { brand: "Beacon Impact Foundation", domain: "beaconimpact.org", palette: "emerald", mode: "light", headline: "Empowering Communities Through Transparent Action & Giving", subheadline: "Explore active field programs, track impact allocations transparently, sign up to volunteer, or donate securely.", searchPlaceholder: "Search clean water, youth STEM, food relief...", cats: ["Active Campaigns", "Volunteer Roles", "Impact Reports"], metricUnit: "100% Direct", rate: 50, unitLabel: "Impact Units ($50)", toolKind: "cart_checkout" },
  "religious-organizations": { brand: "Grace Harbor Fellowship", domain: "graceharbor.church", palette: "gold", mode: "light", headline: "A Welcoming Community Rooted in Faith, Service & Study", subheadline: "Watch weekly sermons, join neighborhood study groups, RSVP to fellowship gatherings, and support outreach.", searchPlaceholder: "Search sermons, small groups, Sunday services...", cats: ["Sermons & Audio", "Study Groups", "Community Events"], metricUnit: "Weekly", rate: 25, unitLabel: "Event RSVPs / Gifts", toolKind: "appointment_scheduler" },
  "news-media": { brand: "The Meridian Dispatch", domain: "meridiandispatch.press", palette: "slate", mode: "light", headline: "Independent Longform Reporting, Briefings & Deep Investigations", subheadline: "Readable editorial typography, topic channels, member newsletter management, and curated investigative series.", searchPlaceholder: "Search climate, markets, tech policy, culture...", cats: ["Investigations", "World Briefings", "Newsletters"], metricUnit: "Subscriber", rate: 12, unitLabel: "Member Months", toolKind: "pricing_calculator" },
  entertainment: { brand: "NovaWave Studio & Streaming", domain: "novawavestream.tv", palette: "crimson", mode: "dark", headline: "Original Series, Live Audio Sessions & Creator Channels On Demand", subheadline: "Interactive media catalog, playlist queue builder, lossless audio streaming tiers, and creator spotlights.", searchPlaceholder: "Search originals, podcasts, soundtracks, live sets...", cats: ["Originals", "Audio & Podcasts", "Live Events"], metricUnit: "4K / Lossless", rate: 15, unitLabel: "Family Screens", toolKind: "pricing_calculator" },
  sports: { brand: "Summit Athletics & Club", domain: "summitathletics.club", palette: "emerald", mode: "dark", headline: "Train Harder With Pro Coaching, Match Schedules & Club Membership", subheadline: "Explore training programs, upcoming league fixtures, coaching rosters, and instant facility memberships.", searchPlaceholder: "Search fitness, tennis, youth league, conditioning...", cats: ["Performance Labs", "Leagues & Fixtures", "Memberships"], metricUnit: "Open Slot", rate: 89, unitLabel: "Member Passes", toolKind: "booking_estimator" },
  events: { brand: "Stagecraft Live & Ticketing", domain: "stagecraftlive.events", palette: "violet", mode: "dark", headline: "Unforgettable Conferences, Festivals & Seamless Ticket Experiences", subheadline: "Browse speaker lineups, compare ticket passes, reserve workshops, and estimate group conference pricing.", searchPlaceholder: "Search tech summit, concerts, workshops, passes...", cats: ["Keynote Summits", "Workshops", "VIP & Group"], metricUnit: "Instant Pass", rate: 195, unitLabel: "Event Passes", toolKind: "cart_checkout" },
  cybersecurity: { brand: "SentinelMesh SecOps", domain: "sentinelmesh.sec", palette: "ocean", mode: "dark", headline: "Unified Threat Visibility, Vulnerability Governance & SOC Automation", subheadline: "Asset attack-surface dashboards, CISA KEV SLA tracking, least-privilege RBAC, and incident playbooks.", searchPlaceholder: "Search SOC triage, KEV tracker, SAST, IAM...", cats: ["Threat Detection", "KEV Governance", "AppSec Gates"], metricUnit: "SOC Verified", rate: 120, unitLabel: "Monitored Hosts (x10)", toolKind: "pricing_calculator" },
  "rmf-grc": { brand: "SovereignGRC Compliance Hub", domain: "sovereigngrc.io", palette: "gold", mode: "dark", headline: "Continuous RMF Authorization, Control Evidence & POA&M Readiness", subheadline: "Organize NIST 800-53 / FedRAMP control families, automate OSCAL exports, and enforce AO approval workflows.", searchPlaceholder: "Search NIST 800-53, FedRAMP, CMMC, POA&M...", cats: ["Control Baselines", "POA&M Tracker", "Audit Packages"], metricUnit: "ATO Ready", rate: 450, unitLabel: "Authorized Enclaves", toolKind: "pricing_calculator" },
  "ai-platforms": { brand: "Noctis Studio AI Workspace", domain: "studioai.platform", palette: "violet", mode: "dark", headline: "Build, Evaluate & Orchestrate Grounded AI Agents in Production", subheadline: "Interactive prompt playgrounds, tool connectors, RAG knowledge indexing, and deterministic safety evals.", searchPlaceholder: "Search agents, RAG pipelines, evaluations, models...", cats: ["Agent Workflows", "RAG Knowledge", "Safety Evals"], metricUnit: "Low Latency", rate: 75, unitLabel: "Active Builders", toolKind: "pricing_calculator" },
  "customer-portals": { brand: "ClearDesk Client Portal", domain: "cleardeskportal.com", palette: "ocean", mode: "light", headline: "Self-Service Account Management, Billing & Priority Support", subheadline: "Give customers instant access to invoices, support tickets, knowledge base guides, and onboarding status.", searchPlaceholder: "Search tickets, invoices, guides, onboarding...", cats: ["Support Tickets", "Billing & Invoices", "Knowledge Base"], metricUnit: "SLA 2h", rate: 29, unitLabel: "Portal Agents", toolKind: "pricing_calculator" },
  "admin-dashboards": { brand: "PulseOps Executive Console", domain: "pulseops.internal", palette: "slate", mode: "dark", headline: "Real-Time Operations, Reporting & SLA Telemetry at a Glance", subheadline: "Role-scoped KPI scorecards, anomaly timelines, CSV exports, and immutable administrative audit trails.", searchPlaceholder: "Search revenue KPIs, uptime alerts, audit logs...", cats: ["Revenue & Ops", "System Health", "Audit Logs"], metricUnit: "Live Stream", rate: 45, unitLabel: "Admin Operators", toolKind: "pricing_calculator" },
  "crm-systems": { brand: "PipelineFlow CRM", domain: "pipelineflow.crm", palette: "ocean", mode: "light", headline: "Turn Inbound Conversations Into Predictable Revenue", subheadline: "Track deal stages, automate follow-up reminders, monitor win rates, and forecast quarterly revenue cleanly.", searchPlaceholder: "Search deals, accounts, sequences, forecasts...", cats: ["Active Pipeline", "Customer Accounts", "Automations"], metricUnit: "Win Lift", rate: 49, unitLabel: "Sales Seats", toolKind: "pricing_calculator" },
  "erp-systems": { brand: "CoreAxis Enterprise ERP", domain: "coreaxiserp.com", palette: "emerald", mode: "dark", headline: "Unify Finance, Procurement, HR & Multi-Warehouse Inventory", subheadline: "Real-time general ledger visibility, vendor purchase-order approvals, payroll readiness, and audit controls.", searchPlaceholder: "Search procurement, general ledger, HR, stock...", cats: ["Finance & GL", "Procurement", "HR & Inventory"], metricUnit: "Audit Synced", rate: 65, unitLabel: "Department Seats", toolKind: "pricing_calculator" },
  "project-management": { brand: "Cadence Work OS", domain: "cadencework.app", palette: "violet", mode: "dark", headline: "Align Roadmaps, Sprints & Cross-Functional Delivery Effortlessly", subheadline: "Kanban workflows, milestone health trackers, workload balancing, and instant status updates for hybrid teams.", searchPlaceholder: "Search sprints, roadmaps, tasks, milestones...", cats: ["Roadmaps", "Sprint Boards", "Team Docs"], metricUnit: "On Track", rate: 18, unitLabel: "Workspace Members", toolKind: "pricing_calculator" },
  forums: { brand: "Agora Community Forum", domain: "agoraboard.community", palette: "ocean", mode: "light", headline: "Thoughtful Discussions, Expert Answers & Verified Topic Hubs", subheadline: "Search threaded discussions, upvote verified solutions, follow topic tags, and engage safely.", searchPlaceholder: "Search threads, solved answers, guides, tags...", cats: ["Top Discussions", "Solved Q&A", "Member Guides"], metricUnit: "Verified", rate: 15, unitLabel: "Moderator Seats", toolKind: "pricing_calculator" },
  auctions: { brand: "GavelHouse Live Auctions", domain: "gavelhouse.bid", palette: "gold", mode: "dark", headline: "Curated Live Bidding, Verified Provenance & Protected Escrow", subheadline: "Track real-time countdown lots, inspect condition reports, calculate buyer premiums, and place bids securely.", searchPlaceholder: "Search fine art, collectibles, rare watches, charity...", cats: ["Live Now", "Ending Soon", "Verified Lots"], metricUnit: "Reserve Met", rate: 500, unitLabel: "Lot Value ($1k units)", toolKind: "cart_checkout" },
  "custom-apps": { brand: "Noctis Custom Web Platform", domain: "customplatform.app", palette: "ocean", mode: "dark", headline: "Tailored Full-Stack Web Experience Engineered for Your Workflow", subheadline: "Responsive UI, live search, interactive configurators, clean PostgreSQL data modeling, and verified security.", searchPlaceholder: "Search modules, workflows, records...", cats: ["Core Modules", "Interactive Tools", "Integrations"], metricUnit: "Production", rate: 120, unitLabel: "Users / Month (x10)", toolKind: "pricing_calculator" },
};

function synthesizePresetForSlug(cat: ForgeCategorySpec): DomainPresetTemplate {
  const meta = SYNTHESIZED_CATEGORY_PROFILES[cat.slug] || SYNTHESIZED_CATEGORY_PROFILES["custom-apps"]!;
  const [c1, c2, c3] = meta.cats;
  return makePreset(
    meta.brand,
    meta.domain,
    `${cat.name} — ${cat.examples}`,
    meta.palette,
    meta.mode,
    ["Catalog", "Platform", "Estimator", "Stories", "FAQ"],
    "Get Started",
    {
      eyebrow: `${cat.name} · Noctis Builder v2.0`,
      headline: meta.headline,
      subheadline: meta.subheadline,
      primaryCta: "Explore Solutions",
      secondaryCta: "Interactive Calculator",
      searchBar: {
        field1Label: "Search Catalog",
        field1Placeholder: meta.searchPlaceholder,
        field2Label: "Focus Area",
        field2Options: ["All", c1, c2, c3],
        submitLabel: "Search",
      },
      stats: [
        { value: "99.9%", label: "Reliability SLA" },
        { value: "4.94 ★", label: "User Satisfaction" },
        { value: "WCAG AA", label: "Contrast Audited" },
        { value: "24/7", label: "Live Portal Access" },
      ],
    },
    `Explore ${meta.brand} Modules & Offerings`,
    `Filter across ${c1}, ${c2}, and ${c3} or open any item for interactive configuration.`,
    [
      { id: `${cat.slug}-1`, title: `${c1} Flagship Suite`, subtitle: `${c1} · Instant Setup`, category: c1, badge: "Featured", metric: `$${meta.rate} ${meta.metricUnit}`, rating: "4.96", description: `Complete interactive ${c1.toLowerCase()} experience built cleanly for high conversion and speed.`, features: ["Responsive UI", "Audit Logged", "Fast Sync"], actionLabel: "Select Option" },
      { id: `${cat.slug}-2`, title: `${c2} Interactive Workspace`, subtitle: `${c2} · Real-Time`, category: c2, badge: "Popular", metric: `$${Math.round(meta.rate * 1.4)} ${meta.metricUnit}`, rating: "4.94", description: `Streamlined ${c2.toLowerCase()} workflows with transparent validation, notifications, and exports.`, features: ["Role Scoped", "CSV / API", "Mobile Ready"], actionLabel: "Select Option" },
      { id: `${cat.slug}-3`, title: `${c3} Pro Automation`, subtitle: `${c3} · Scalable`, category: c3, badge: "Verified", metric: `$${Math.round(meta.rate * 1.8)} ${meta.metricUnit}`, rating: "4.95", description: `Enterprise-ready ${c3.toLowerCase()} capabilities connecting seamlessly with your database and alerts.`, features: ["Webhooks", "SLA Guard", "24/7 Access"], actionLabel: "Select Option" },
      { id: `${cat.slug}-4`, title: `${c1} Starter Kit`, subtitle: `${c1} · Fast Launch`, category: c1, badge: "Best Value", metric: `$${Math.max(15, Math.round(meta.rate * 0.7))} ${meta.metricUnit}`, rating: "4.91", description: `Essential ${c1.toLowerCase()} tier for rapid onboarding with clean defaults and clear metrics.`, features: ["1-Click Start", "Templates", "Guided Docs"], actionLabel: "Select Option" },
      { id: `${cat.slug}-5`, title: `${c2} Insights & Reporting`, subtitle: `${c2} · Analytics`, category: c2, badge: "Live Data", metric: `$${Math.round(meta.rate * 1.2)} ${meta.metricUnit}`, rating: "4.93", description: `Real-time trend tracking and custom filters for ${c2.toLowerCase()} decision makers.`, features: ["Custom Views", "Instant PDF", "Alerts"], actionLabel: "Select Option" },
      { id: `${cat.slug}-6`, title: `${c3} Enterprise Governance`, subtitle: `${c3} · Compliant`, category: c3, badge: cat.regulated ? "Compliance Ready" : "Enterprise", metric: `$${Math.round(meta.rate * 2.5)} ${meta.metricUnit}`, rating: "4.98", description: `Dedicated SLA, granular permissions, and verifiable security controls tailored for ${cat.name.toLowerCase()}.`, features: ["SSO / RBAC", "Audit Log", "Dedicated Support"], actionLabel: "Request Access" },
    ],
    `Core ${cat.name} Capabilities`,
    `Everything required to run a modern, responsive, full-stack ${cat.name.toLowerCase()} web experience.`,
    [
      { icon: "🚀", title: `${c1} Discovery`, description: `Intuitive filtering, fast search, and transparent cards for ${c1.toLowerCase()}.` },
      { icon: "⚙️", title: `${c2} Workflows`, description: `Reliable state management and step-by-step confirmation flows built for ${c2.toLowerCase()}.` },
      { icon: "🛡️", title: `${c3} Safeguards`, description: `Validation checks, RBAC permissions, and audit trails safeguarding user data.` },
      { icon: "📱", title: "Mobile-First Ergonomics", description: "Adaptive layouts tested smoothly across phone, tablet, and widescreen viewports." },
      { icon: "📊", title: "Live Interactive Estimators", description: "Instant cost, capacity, or scheduling calculators that eliminate guesswork." },
      { icon: "🗄️", title: "PostgreSQL & API Ready", description: "Backed by typed REST routes and normalized SQL schemas ready for scale." },
    ],
    {
      kind: meta.toolKind,
      title: `Interactive ${cat.name} Estimator`,
      subtitle: `Configure quantity and optional capabilities to calculate a live estimate for ${meta.brand}.`,
      unitLabel: meta.unitLabel,
      baseRate: meta.rate,
      options: [
        { label: "Priority Onboarding & Concierge Setup (+25%)", delta: Math.round(meta.rate * 0.25) },
        { label: "Advanced Analytics & Custom Exports (+15%)", delta: Math.round(meta.rate * 0.15) },
        { label: "Multi-Region / Multilingual Support (+10%)", delta: Math.round(meta.rate * 0.1) },
      ],
    },
    [
      { quote: `Moving our operations onto ${meta.brand} cut manual coordination time in half during week one.`, author: "Taylor Brooks", role: "Operations Lead" },
      { quote: `Customers immediately praised how effortless and trustworthy the interface feels on mobile.`, author: "Amina Diallo", role: "Digital Director" },
      { quote: `Clean architecture, fast filters, and zero friction from discovery to confirmation.`, author: "Lucas Weber", role: "Program Manager" },
    ],
    [
      { q: `How quickly can we customize ${meta.brand}?`, a: "Update branding, palette, sections, and database entities conversationally anytime inside Noctis Forge." },
      { q: "Is this mobile responsive and accessible?", a: "Yes. Every layout uses fluid CSS grids, accessible semantic landmarks, and WCAG 2.2 AA contrast verification." },
      { q: "Can we export full source code and SQL migrations?", a: "Yes—download the standalone HTML or the complete React + TypeScript + PostgreSQL .ZIP repository." },
      { q: "How are payments or reservations confirmed?", a: "Interactive modals validate customer details cleanly and wire directly into Stripe or custom REST API endpoints." },
    ],
    { headline: `Ready to Launch ${meta.brand}?`, subheadline: "Start interacting with the live prototype or export full-stack source files.", buttonLabel: "Launch Action" },
    cat.defaultEntities,
  );
}

function getTemplateForCategory(cat: ForgeCategorySpec): DomainPresetTemplate {
  return PRESETS_BY_SLUG[cat.slug] || synthesizePresetForSlug(cat);
}

function extractCustomBrandAndDomain(prompt: string, defaultBrand: string, defaultDomain: string) {
  const domainMatch = prompt.match(/\b([a-z0-9-]{3,32}\.(?:com|io|ai|app|org|edu|net|travel|shop|co|dev))\b/i);
  const namedMatch = prompt.match(/\b(?:called|named|brand(?:ed)?|title[d]?)\s+["']?([A-Z][A-Za-z0-9&'\- ]{2,36})["']?/);
  const quoteMatch = prompt.match(/["']([A-Z][A-Za-z0-9&'\- ]{3,32})["']/);

  let domain = defaultDomain;
  let brandName = defaultBrand;

  if (domainMatch?.[1]) {
    domain = domainMatch[1].toLowerCase();
    const base = domain.split(".")[0]!.replace(/-/g, " ");
    brandName = base
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  } else if (namedMatch?.[1]) {
    brandName = namedMatch[1].trim();
  } else if (quoteMatch?.[1] && !/destination|experience|all adventures|mole safari/i.test(quoteMatch[1])) {
    brandName = quoteMatch[1].trim();
  }

  return { brandName, domain };
}

function extractScopeLabel(prompt: string): string {
  const explicitGeo = prompt.match(
    /\b(?:in|for|across)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?=\s+(?:with|website|web\s*site|tourism|market|booking|real\s*estate|platform|portal|hotels?|guides?|destinations?|[\d,]+\s+regions?|[,.\n]|$))/,
  );
  if (explicitGeo?.[1] && !/^(?:World|Worldwide|Global|Next|React|Tailwind|Stripe|PostgreSQL)$/i.test(explicitGeo[1])) {
    return `${explicitGeo[1].trim()} & Regional Hub`;
  }
  if (/\bghana\b/i.test(prompt)) return "Ghana (16 Regions) & Global";
  if (/\bafrica\b/i.test(prompt)) return "Pan-African & Global";
  return "Global Platform";
}

function extractUserRequestedSections(prompt: string): WebsiteSectionItem[] {
  const lines = prompt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const icons = ["🧭", "✨", "⚡", "🛡️", "🗺️", "💳", "🏨", "📊"];
  const extracted: WebsiteSectionItem[] = [];

  for (const line of lines) {
    const colon = line.match(/^(?:[-*•]|\d+[.)])?\s*([A-Z][A-Za-z0-9 &/'\-]{2,36}):\s+(.{8,140})$/);
    if (colon?.[1] && colon[2] && !/^(?:frontend|backend|database|maps?|payments?|hosting|basic|professional|tourism marketplace|advanced|estimated)/i.test(colon[1])) {
      extracted.push({
        icon: icons[extracted.length % icons.length]!,
        title: colon[1].trim(),
        description: colon[2].trim(),
      });
    }
    if (extracted.length >= 6) break;
  }

  return extracted.length >= 3 ? extracted : [];
}

function detectThemeOverrides(text: string, fallbackMode: "light" | "dark", fallbackPalette: string, explicitHex?: string) {
  let mode: "light" | "dark" = fallbackMode;
  if (/\blight\s*(?:mode|theme|palette|background)\b|\bbright\s+editorial\b/i.test(text)) mode = "light";
  else if (/\bdark\s*(?:mode|theme|palette|background)\b|\bmidnight\b/i.test(text)) mode = "dark";

  let palette = fallbackPalette;
  if (/\b(?:emerald|green|forest|mint)\b/i.test(text)) palette = "emerald";
  else if (/\b(?:gold|golden|luxury|amber|warm)\b/i.test(text)) palette = "gold";
  else if (/\b(?:coral|rose|pink|crimson|red)\b/i.test(text)) palette = "coral";
  else if (/\b(?:violet|purple|indigo|lavender)\b/i.test(text)) palette = "violet";
  else if (/\b(?:ocean|cyan|teal|aqua|blue)\b/i.test(text)) palette = "ocean";

  return buildThemePalette(mode, palette, explicitHex);
}

export function buildDeterministicWebsiteBlueprint(input: {
  prompt: string;
  categoryHint?: string;
  stack?: string;
  projectName?: string;
  accentHex?: string;
  addEntities?: string[];
  includeMobileWrapper?: boolean;
}): WebsiteBlueprint {
  const prompt = (input.prompt || "Build a modern full-stack web platform").trim();
  const cat = classifyWebsiteCategory(input.categoryHint, prompt);
  const preset = getTemplateForCategory(cat);
  const { brandName: parsedBrand, domain } = extractCustomBrandAndDomain(prompt, preset.brandName, preset.domain);
  const brandName = input.projectName?.trim() || parsedBrand;
  const scopeLabel = extractScopeLabel(prompt);

  const theme = detectThemeOverrides(prompt, preset.defaultTheme.mode, preset.defaultTheme.palette, input.accentHex);

  const customSections = extractUserRequestedSections(prompt);
  const sectionsItems = customSections.length >= 3 ? customSections : preset.sectionItems;

  const filterTabs = ["All", ...Array.from(new Set(preset.items.map((i) => i.category)))].slice(0, 6);
  const needsPostGis =
    /\b(postgis|geospatial|mapbox|google\s+maps|coordinates|latitude|longitude|radius|location\s+search|interactive\s+.*maps?|real\s+estate)\b/i.test(
      prompt,
    ) || cat.slug === "travel" || cat.slug === "real-estate" || cat.slug === "logistics";
  const multilingual = /\b(multilingual|multi-language|spanish|french|translations?|localized)\b/i.test(prompt);
  const includeMobileWrapper = Boolean(input.includeMobileWrapper || /\b(mobile\s*app|ios|android|capacitor|pwa)\b/i.test(prompt));

  const entities = [...preset.entities];
  const existingNames = new Set(entities.map((e) => e.name));
  for (const extra of input.addEntities || []) {
    const norm = normalizeEntityName(extra);
    if (!existingNames.has(norm)) {
      entities.push(buildEntitySpec(norm));
      existingNames.add(norm);
    }
  }
  const extraMatches = prompt.matchAll(/\b(?:add\s+)?(?:table|entity)\s+([a-z0-9_]+)\b/gi);
  for (const m of extraMatches) {
    if (m[1]) {
      const norm = normalizeEntityName(m[1]);
      if (!existingNames.has(norm)) {
        entities.push(buildEntitySpec(norm));
        existingNames.add(norm);
      }
    }
  }

  return {
    brandName,
    domain,
    tagline: preset.tagline,
    categorySlug: cat.slug,
    categoryName: cat.name,
    regulated: cat.regulated,
    specialistAdvisory: cat.specialistAdvisory,
    scopeLabel,
    theme,
    navLinks: [
      { label: preset.navLinks[0] || "Explore", href: "#showcase" },
      { label: preset.navLinks[1] || "Features", href: "#capabilities" },
      { label: preset.navLinks[2] || "Estimator", href: "#estimator" },
      { label: preset.navLinks[3] || "Reviews", href: "#testimonials" },
      { label: preset.navLinks[4] || "Contact", href: "#contact" },
    ],
    ctaLabel: preset.ctaLabel,
    hero: {
      ...preset.hero,
      eyebrow: scopeLabel !== "Global Platform" ? `${scopeLabel} · ${preset.hero.eyebrow}` : preset.hero.eyebrow,
    },
    showcase: {
      title: preset.showcaseTitle,
      subtitle: preset.showcaseSubtitle,
      filterTabs,
      items: preset.items,
    },
    sections: {
      title: preset.sectionsTitle,
      subtitle: preset.sectionsSubtitle,
      items: sectionsItems,
    },
    interactiveTool: preset.tool,
    testimonials: preset.testimonials,
    faqs: preset.faqs,
    ctaBanner: preset.ctaBanner,
    entities,
    needsPostGis,
    multilingual,
    includeMobileWrapper,
    aiGenerated: false,
  };
}

function cleanStr(val: unknown, fallback: string, maxLen = 220): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.replace(/[\r\n\t]+/g, " ").replace(/[<>]/g, "").trim();
  return trimmed.length >= 2 ? trimmed.slice(0, maxLen) : fallback;
}

export function mergeAiJsonIntoBlueprint(base: WebsiteBlueprint, aiJson: Record<string, unknown>): WebsiteBlueprint {
  const aiHero = (aiJson.hero && typeof aiJson.hero === "object" ? aiJson.hero : {}) as Record<string, unknown>;
  const aiItemsRaw = Array.isArray(aiJson.showcaseItems)
    ? aiJson.showcaseItems
    : Array.isArray((aiJson.showcase as Record<string, unknown> | undefined)?.items)
      ? ((aiJson.showcase as Record<string, unknown>).items as unknown[])
      : [];
  const aiSectionsRaw = Array.isArray(aiJson.sections)
    ? aiJson.sections
    : Array.isArray((aiJson.sections as Record<string, unknown> | undefined)?.items)
      ? ((aiJson.sections as Record<string, unknown>).items as unknown[])
      : [];

  const sanitizedItems: WebsiteShowcaseItem[] = [];
  for (let i = 0; i < aiItemsRaw.length && sanitizedItems.length < 8; i++) {
    const raw = aiItemsRaw[i];
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const fallbackItem = base.showcase.items[i % base.showcase.items.length]!;
    sanitizedItems.push({
      id: `item-${i + 1}`,
      title: cleanStr(item.title, fallbackItem.title, 90),
      subtitle: cleanStr(item.subtitle, fallbackItem.subtitle, 60),
      category: cleanStr(item.category, fallbackItem.category, 32),
      badge: cleanStr(item.badge, fallbackItem.badge, 24),
      metric: cleanStr(item.metric, fallbackItem.metric, 30),
      rating: cleanStr(item.rating, fallbackItem.rating, 14),
      description: cleanStr(item.description, fallbackItem.description, 200),
      features: Array.isArray(item.features)
        ? item.features.map((f) => cleanStr(f, "", 28)).filter(Boolean).slice(0, 3)
        : fallbackItem.features,
      actionLabel: cleanStr(item.actionLabel, fallbackItem.actionLabel, 24),
    });
  }

  const finalItems = sanitizedItems.length >= 3 ? sanitizedItems : base.showcase.items;
  const filterTabs = ["All", ...Array.from(new Set(finalItems.map((it) => it.category)))].slice(0, 6);

  const sanitizedSections: WebsiteSectionItem[] = [];
  for (let i = 0; i < aiSectionsRaw.length && sanitizedSections.length < 6; i++) {
    const raw = aiSectionsRaw[i];
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const fb = base.sections.items[i % base.sections.items.length]!;
    sanitizedSections.push({
      icon: cleanStr(s.icon, fb.icon, 6),
      title: cleanStr(s.title, fb.title, 48),
      description: cleanStr(s.description, fb.description, 160),
    });
  }

  const aiFaqRaw = Array.isArray(aiJson.faqs) ? aiJson.faqs : [];
  const faqs = aiFaqRaw
    .map((f) => {
      if (!f || typeof f !== "object") return null;
      const fo = f as Record<string, unknown>;
      const q = cleanStr(fo.q, "", 140);
      const a = cleanStr(fo.a, "", 240);
      return q && a ? { q, a } : null;
    })
    .filter((x): x is { q: string; a: string } => Boolean(x))
    .slice(0, 5);

  return {
    ...base,
    brandName: cleanStr(aiJson.brandName, base.brandName, 56),
    domain: cleanStr(aiJson.domain, base.domain, 56),
    tagline: cleanStr(aiJson.tagline, base.tagline, 120),
    ctaLabel: cleanStr(aiJson.ctaLabel, base.ctaLabel, 24),
    hero: {
      ...base.hero,
      eyebrow: cleanStr(aiHero.eyebrow, base.hero.eyebrow, 64),
      headline: cleanStr(aiHero.headline, base.hero.headline, 110),
      subheadline: cleanStr(aiHero.subheadline, base.hero.subheadline, 240),
      primaryCta: cleanStr(aiHero.primaryCta, base.hero.primaryCta, 28),
      secondaryCta: cleanStr(aiHero.secondaryCta, base.hero.secondaryCta, 28),
    },
    showcase: {
      title: cleanStr(aiJson.showcaseTitle, base.showcase.title, 80),
      subtitle: cleanStr(aiJson.showcaseSubtitle, base.showcase.subtitle, 150),
      filterTabs,
      items: finalItems,
    },
    sections: {
      ...base.sections,
      items: sanitizedSections.length >= 3 ? sanitizedSections : base.sections.items,
    },
    faqs: faqs.length >= 2 ? faqs : base.faqs,
    aiGenerated: true,
  };
}

function hasAnyConfiguredLlmKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.GROQ_API_KEY?.trim() ||
      process.env.XAI_API_KEY?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim(),
  );
}

/**
 * Generates a WebsiteBlueprint, optionally enriching copy & domain items via LLM
 * with an 18s bounded timeout and instant deterministic fallback.
 */
export async function synthesizeWebsiteBlueprintWithAi(input: {
  prompt: string;
  categoryHint?: string;
  stack?: string;
  projectName?: string;
  accentHex?: string;
  useAi?: boolean;
  brain?: Record<string, unknown>;
  preferredProvider?: string;
}): Promise<WebsiteBlueprint> {
  const base = buildDeterministicWebsiteBlueprint(input);

  if (input.useAi === false || Boolean(process.env.NODE_TEST_CONTEXT) || !hasAnyConfiguredLlmKey()) {
    return base;
  }

  try {
    const { modelChat } = await import("../video-mind.server.ts");
    const systemPrompt = [
      "You are the Noctis Universal Website Architect.",
      "Return ONLY valid JSON matching the schema below so a website for ANY domain requested by the user is completely tailored to their prompt.",
      "Never mention unrelated countries or industries not requested in the prompt.",
      'Schema: { "brandName": string, "domain": string, "tagline": string, "ctaLabel": string, "hero": { "eyebrow": string, "headline": string, "subheadline": string, "primaryCta": string, "secondaryCta": string }, "showcaseTitle": string, "showcaseSubtitle": string, "showcaseItems": [{ "title": string, "subtitle": string, "category": string, "badge": string, "metric": string, "rating": string, "description": string, "features": [string, string, string], "actionLabel": string }] (6 items), "sections": [{ "icon": string, "title": string, "description": string }] (6 items), "faqs": [{ "q": string, "a": string }] (4 items) }',
    ].join("\n");

    const llmCall = modelChat(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Detected Category: ${base.categoryName}\nScope: ${base.scopeLabel}\nUser Prompt:\n${input.prompt.slice(0, 3500)}`,
        },
      ],
      {
        json: true,
        maxTokens: 3200,
        temperature: 0.35,
        thinkingLevel: "low",
        brain: input.brain as never,
        preferredProvider: input.preferredProvider as never,
      },
    );

    const timeout = new Promise<{ error: string }>((resolve) =>
      setTimeout(() => resolve({ error: "Blueprint AI synthesis timeout" }), 18000),
    );
    const res = await Promise.race([llmCall, timeout]);
    if ("error" in res || !res.text) return base;

    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return base;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return mergeAiJsonIntoBlueprint(base, parsed);
  } catch {
    return base;
  }
}

/**
 * Applies deterministic theme/mode/entity/rename/multilingual/mobile edits first,
 * then optionally refines copy via AI if requested.
 */
export async function applyBlueprintConversationalEdit(
  current: WebsiteBlueprint,
  instruction: string,
  opts?: { accentHex?: string; addEntity?: string; useAi?: boolean },
): Promise<WebsiteBlueprint> {
  const inst = (instruction || "").trim();
  let next: WebsiteBlueprint = {
    ...current,
    entities: [...current.entities],
    showcase: { ...current.showcase, items: [...current.showcase.items], filterTabs: [...current.showcase.filterTabs] },
    sections: { ...current.sections, items: [...current.sections.items] },
    hero: { ...current.hero },
  };

  // 1. Theme mode & palette updates
  const explicitHexMatch = opts?.accentHex || inst.match(/#[0-9a-f]{6}\b/i)?.[0];
  const mentionsTheme = Boolean(
    explicitHexMatch || /\b(light\s*mode|dark\s*mode|light\s*theme|dark\s*theme|emerald|green|gold|amber|coral|rose|violet|purple|ocean|cyan|blue|palette|theme)\b/i.test(inst),
  );
  if (mentionsTheme) {
    next.theme = detectThemeOverrides(inst, next.theme.mode, "ocean", explicitHexMatch);
  }

  // 2. Rename brand / domain / hero
  const renameMatch = inst.match(/\b(?:rename(?:\s+(?:brand|site|app))?\s+to|brand\s+name\s*:?)\s+["']?([A-Za-z0-9 &'\-]{2,48})["']?/i);
  if (renameMatch?.[1]) {
    next.brandName = renameMatch[1].trim();
  }

  // 3. Multilingual / Mobile toggles
  if (/\b(multilingual|multi-language|spanish|french|en\/es\/fr|i18n)\b/i.test(inst)) {
    next.multilingual = true;
  }
  if (/\b(mobile|ios|android|capacitor|pwa)\b/i.test(inst)) {
    next.includeMobileWrapper = true;
  }

  // 4. Add explicit SQL tables / entities
  const namesToAdd: string[] = [];
  if (opts?.addEntity) namesToAdd.push(opts.addEntity);
  for (const m of inst.matchAll(/\badd\s+(?:table|entity|section|module)\s+([a-z0-9_]+)\b/gi)) {
    if (m[1]) namesToAdd.push(m[1]);
  }
  if (/\bpricing(?:\s+tier|\s+table)?\b/i.test(inst) && !next.entities.some((e) => e.name === "pricing_tiers")) {
    namesToAdd.push("pricing_tiers");
  }
  const existing = new Set(next.entities.map((e) => e.name));
  for (const rawName of namesToAdd) {
    const norm = normalizeEntityName(rawName);
    if (!existing.has(norm)) {
      next.entities.push(buildEntitySpec(norm));
      existing.add(norm);
    }
  }

  if (/\bpricing(?:\s+tier|\s+table)?\b/i.test(inst)) {
    const label = "Enterprise Tier";
    if (!next.showcase.items.some((it) => it.title.includes(label))) {
      next.showcase.items = [
        ...next.showcase.items.slice(0, 7),
        {
          id: `custom-${next.showcase.items.length + 1}`,
          title: `${next.brandName} ${label}`,
          subtitle: "Custom Tier · Priority SLA",
          category: next.showcase.filterTabs[1] || "Featured",
          badge: "Added via Edit",
          metric: "$499 / mo",
          rating: "5.0",
          description: "Dedicated onboarding, custom API limits, priority SLA, and team governance.",
          features: ["Dedicated SLA", "Custom Limits", "Priority Care"],
          actionLabel: "Select Tier",
        },
      ];
    }
  }

  if (opts?.useAi !== false && !process.env.NODE_TEST_CONTEXT && hasAnyConfiguredLlmKey() && /\b(hero|headline|add|card|story|copy|section|change|update)\b/i.test(inst)) {
    try {
      const { modelChat } = await import("../video-mind.server.ts");
      const res = await Promise.race([
        modelChat(
          [
            {
              role: "system",
              content:
                "Apply the user's website edit instruction to the existing JSON blueprint. Return ONLY updated JSON with any modified hero, showcaseItems, sections, or faqs.",
            },
            {
              role: "user",
              content: `Current brand: ${next.brandName} (${next.categoryName})\nCurrent headline: ${next.hero.headline}\nEdit instruction: ${inst}\nReturn concise JSON patch.`,
            },
          ],
          { json: true, maxTokens: 1600, temperature: 0.3, thinkingLevel: "low" },
        ),
        new Promise<{ error: string }>((r) => setTimeout(() => r({ error: "timeout" }), 12000)),
      ]);
      if (!("error" in res) && res.text) {
        const jm = res.text.match(/\{[\s\S]*\}/);
        if (jm) {
          next = mergeAiJsonIntoBlueprint(next, JSON.parse(jm[0]) as Record<string, unknown>);
        }
      }
    } catch {
      /* keep deterministic edits */
    }
  }

  return next;
}

function escHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCardArtworkSvg(idx: number, accent: string, accent2: string, category: string): string {
  const variants = [
    `<path d="M0 95 Q 80 45 160 80 T 320 65 L320 130 L0 130 Z" fill="${accent}" opacity="0.28"/><path d="M0 108 Q 110 70 210 96 T 320 82 L320 130 L0 130 Z" fill="${accent2}" opacity="0.22"/><circle cx="265" cy="34" r="18" fill="${accent}" opacity="0.35"/>`,
    `<polygon points="20,120 95,40 165,120" fill="${accent}" opacity="0.28"/><polygon points="120,120 210,28 300,120" fill="${accent2}" opacity="0.22"/><circle cx="52" cy="34" r="14" fill="${accent}" opacity="0.4"/>`,
    `<rect x="24" y="28" width="90" height="72" rx="12" fill="${accent}" opacity="0.22"/><rect x="130" y="18" width="160" height="44" rx="10" fill="${accent2}" opacity="0.2"/><rect x="130" y="72" width="110" height="28" rx="8" fill="${accent}" opacity="0.32"/>`,
    `<circle cx="70" cy="65" r="46" fill="${accent}" opacity="0.22"/><circle cx="155" cy="55" r="34" fill="${accent2}" opacity="0.24"/><path d="M195 95 C235 35, 275 35, 305 88" stroke="${accent}" stroke-width="5" fill="none" opacity="0.5"/>`,
  ];
  return `<svg viewBox="0 0 320 130" width="100%" height="116" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escHtml(category)} illustration" style="display:block;border-radius:12px 12px 0 0;background:linear-gradient(135deg, rgba(15,23,42,0.18), rgba(148,163,184,0.08));">${variants[idx % variants.length]}</svg>`;
}

/**
 * Renders a complete, responsive, interactive HTML5 + CSS3 + vanilla JS website
 * from any WebsiteBlueprint with zero eval() and zero external broken asset dependencies.
 */
export function renderWebsiteBlueprintHtml(blueprint: WebsiteBlueprint): string {
  const { theme } = blueprint;
  const safeDataJson = JSON.stringify({
    items: blueprint.showcase.items,
    tool: blueprint.interactiveTool,
    brand: blueprint.brandName,
    multilingual: blueprint.multilingual,
    lightTheme: buildThemePalette("light", "ocean", theme.mode === "light" ? theme.accent : undefined),
    darkTheme: buildThemePalette("dark", "ocean", theme.mode === "dark" ? theme.accent : undefined),
    initialMode: theme.mode,
  }).replace(/</g, "\\u003c");

  const cardsHtml = blueprint.showcase.items
    .map(
      (item, idx) => `
      <article class="card item-card" data-category="${escHtml(item.category)}" data-search="${escHtml(`${item.title} ${item.subtitle} ${item.category} ${item.description}`.toLowerCase())}">
        <div class="card-art">${buildCardArtworkSvg(idx, theme.accent, theme.accent2, item.category)}<span class="card-badge">${escHtml(item.badge)}</span></div>
        <div class="card-body">
          <div class="card-meta"><span>${escHtml(item.subtitle)}</span><span class="rating">★ ${escHtml(item.rating)}</span></div>
          <h3>${escHtml(item.title)}</h3>
          <p class="muted">${escHtml(item.description)}</p>
          <div class="tags">${item.features.map((f) => `<span class="tag">${escHtml(f)}</span>`).join("")}</div>
          <div class="card-footer">
            <strong class="metric">${escHtml(item.metric)}</strong>
            <button type="button" class="btn btn-primary btn-sm open-item-btn" data-id="${escHtml(item.id)}">${escHtml(item.actionLabel)}</button>
          </div>
        </div>
      </article>`,
    )
    .join("");

  const tabsHtml = blueprint.showcase.filterTabs
    .map(
      (tab, i) =>
        `<button type="button" class="pill ${i === 0 ? "active" : ""}" data-filter="${escHtml(tab)}">${escHtml(tab)}</button>`,
    )
    .join("");

  const sectionsHtml = blueprint.sections.items
    .map(
      (sec) => `
      <div class="card feature-card">
        <div class="feature-icon">${escHtml(sec.icon)}</div>
        <h3>${escHtml(sec.title)}</h3>
        <p class="muted">${escHtml(sec.description)}</p>
      </div>`,
    )
    .join("");

  const estimatorOptsHtml = blueprint.interactiveTool.options
    .map(
      (opt, idx) => `
      <label class="check-row">
        <input type="checkbox" class="est-opt" data-delta="${opt.delta}" id="opt-${idx}" />
        <span>${escHtml(opt.label)}</span>
      </label>`,
    )
    .join("");

  const testimonialsHtml = blueprint.testimonials
    .map(
      (t) => `
      <blockquote class="card quote-card">
        <p>“${escHtml(t.quote)}”</p>
        <footer><strong>${escHtml(t.author)}</strong> · <span class="muted">${escHtml(t.role)}</span></footer>
      </blockquote>`,
    )
    .join("");

  const faqsHtml = blueprint.faqs
    .map(
      (f, idx) => `
      <details class="faq-item" ${idx === 0 ? "open" : ""}>
        <summary>${escHtml(f.q)}</summary>
        <p class="muted">${escHtml(f.a)}</p>
      </details>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(blueprint.brandName)} — ${escHtml(blueprint.categoryName)}</title>
  <style>
    :root {
      --bg: ${theme.bg};
      --surface: ${theme.surface};
      --surface-alt: ${theme.surfaceAlt};
      --border: ${theme.border};
      --text: ${theme.text};
      --muted: ${theme.muted};
      --accent: ${theme.accent};
      --accent-text: ${theme.accentText};
      --accent2: ${theme.accent2};
      --hero-bg: ${theme.heroBg};
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
    a { color: inherit; text-decoration: none; }
    .container { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
    header.nav { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(12px); background: color-mix(in srgb, var(--bg) 86%, transparent); border-bottom: 1px solid var(--border); }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 60px; flex-wrap: nowrap; padding: 8px 0; }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; letter-spacing: -0.02em; white-space: nowrap; flex-shrink: 0; }
    .brand-dot { width: 12px; height: 12px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 12px var(--accent); }
    .nav-links { display: flex; gap: 14px; font-size: 12.5px; font-weight: 500; color: var(--muted); flex-wrap: nowrap; overflow: hidden; }
    .nav-links a:hover { color: var(--text); }
    .nav-actions { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; flex-shrink: 0; }
    .btn { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 999px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: opacity .15s, transform .15s; }
    .btn:hover { opacity: 0.92; }
    .btn-primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
    .btn-sm { padding: 7px 13px; font-size: 12px; }
    .pill { border: 1px solid var(--border); background: var(--surface); color: var(--muted); border-radius: 999px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .pill.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
    .hero { background: var(--hero-bg); border-bottom: 1px solid var(--border); padding: 52px 0 44px; }
    .eyebrow { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--accent); margin-bottom: 14px; }
    .hero h1 { font-size: clamp(28px, 4.4vw, 48px); line-height: 1.1; margin: 0 0 14px; letter-spacing: -0.03em; max-width: 780px; }
    .hero p.lead { font-size: 16px; color: var(--muted); max-width: 680px; margin: 0 0 22px; }
    .hero-ctas { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 26px; }
    .search-dock { display: grid; grid-template-columns: 1.4fr 1fr auto; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 12px; margin-bottom: 26px; box-shadow: 0 12px 30px rgba(0,0,0,0.12); }
    .search-dock label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 4px; font-weight: 700; }
    input, select, textarea { width: 100%; background: var(--surface-alt); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; font-size: 13px; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
    .stat-val { font-size: 22px; font-weight: 800; color: var(--accent); }
    .stat-lbl { font-size: 12px; color: var(--muted); }
    section.block { padding: 52px 0; border-bottom: 1px solid var(--border); }
    .section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .section-head h2 { margin: 0 0 6px; font-size: clamp(22px, 3vw, 30px); letter-spacing: -0.02em; }
    .muted { color: var(--muted); font-size: 13.5px; }
    .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 18px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
    .card-art { position: relative; border-bottom: 1px solid var(--border); }
    .card-badge { position: absolute; top: 10px; right: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--accent); font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
    .card-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .card-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); font-weight: 600; }
    .rating { color: var(--accent); }
    .card h3 { margin: 0; font-size: 16px; line-height: 1.3; }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: var(--surface-alt); border: 1px solid var(--border); color: var(--muted); }
    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border); margin-top: auto; }
    .metric { font-size: 15px; color: var(--text); }
    .feature-card { padding: 18px; }
    .feature-icon { font-size: 24px; margin-bottom: 10px; }
    .tool-box { display: grid; grid-template-columns: 1.2fr 1fr; gap: 22px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 24px; }
    .check-row { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 8px 10px; border-radius: 10px; background: var(--surface-alt); margin-bottom: 8px; cursor: pointer; }
    .check-row input { width: auto; }
    .est-result { background: var(--surface-alt); border: 1px solid var(--border); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
    .est-price { font-size: 36px; font-weight: 800; color: var(--accent); }
    .quote-card { padding: 18px; margin: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
    .quote-card p { margin: 0; font-size: 14px; }
    .faq-item { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
    .faq-item summary { font-weight: 700; font-size: 14px; cursor: pointer; }
    .advisory { margin-top: 14px; padding: 11px 14px; border-radius: 12px; border: 1px solid rgba(245,158,11,0.45); background: rgba(245,158,11,0.1); font-size: 12.5px; }
    .cta-panel { background: var(--hero-bg); border: 1px solid var(--border); border-radius: 20px; padding: 32px; display: grid; grid-template-columns: 1.1fr 1fr; gap: 24px; align-items: center; }
    footer.site-foot { padding: 28px 0; font-size: 12.5px; color: var(--muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 60; display: none; align-items: center; justify-content: center; padding: 16px; }
    .backdrop.open { display: flex; }
    .modal { width: 100%; max-width: 480px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
    .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(390px, 100vw); background: var(--surface); border-left: 1px solid var(--border); z-index: 70; padding: 20px; display: none; flex-direction: column; gap: 12px; box-shadow: -12px 0 40px rgba(0,0,0,0.4); }
    .drawer.open { display: flex; }
    .toast { position: fixed; bottom: 20px; right: 20px; z-index: 80; background: var(--accent); color: var(--accent-text); padding: 11px 16px; border-radius: 12px; font-weight: 700; font-size: 13px; display: none; box-shadow: 0 10px 28px rgba(0,0,0,0.3); }
    @media (max-width: 960px) { .nav-links { display: none; } }
    @media (max-width: 820px) { .search-dock, .tool-box, .cta-panel { grid-template-columns: 1fr; } }
    @media (max-width: 480px) { .nav-inner { flex-wrap: wrap; } .nav-actions { width: 100%; justify-content: flex-end; flex-wrap: wrap; } }
  </style>
</head>
<body>
  <header class="nav">
    <div class="container nav-inner">
      <a href="#" class="brand"><span class="brand-dot"></span><span>${escHtml(blueprint.brandName)}</span></a>
      <nav class="nav-links">
        ${blueprint.navLinks.map((n) => `<a href="${escHtml(n.href)}">${escHtml(n.label)}</a>`).join("")}
      </nav>
      <div class="nav-actions">
        ${blueprint.multilingual ? `<select id="langSelect" aria-label="Language" style="width:auto;padding:6px 10px;border-radius:999px;font-size:12px;"><option value="en">EN</option><option value="es">ES</option><option value="fr">FR</option></select>` : ""}
        <button type="button" id="themeToggleBtn" class="btn btn-sm">${theme.mode === "dark" ? "Light Theme" : "Dark Theme"}</button>
        <button type="button" id="openDrawerBtn" class="btn btn-sm">Saved (<span id="savedCount">0</span>)</button>
        <a href="#showcase" class="btn btn-primary btn-sm">${escHtml(blueprint.ctaLabel)}</a>
      </div>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <span class="eyebrow">${escHtml(blueprint.hero.eyebrow)}</span>
        <h1>${escHtml(blueprint.hero.headline)}</h1>
        <p class="lead">${escHtml(blueprint.hero.subheadline)}</p>
        <div class="hero-ctas">
          <a href="#showcase" class="btn btn-primary">${escHtml(blueprint.hero.primaryCta)}</a>
          <a href="#estimator" class="btn">${escHtml(blueprint.hero.secondaryCta)}</a>
        </div>
        <form id="heroSearchForm" class="search-dock">
          <div>
            <label for="searchInput">${escHtml(blueprint.hero.searchBar.field1Label)}</label>
            <input id="searchInput" type="text" placeholder="${escHtml(blueprint.hero.searchBar.field1Placeholder)}" />
          </div>
          <div>
            <label for="categorySelect">${escHtml(blueprint.hero.searchBar.field2Label)}</label>
            <select id="categorySelect">
              ${blueprint.hero.searchBar.field2Options.map((o) => `<option value="${escHtml(o)}">${escHtml(o)}</option>`).join("")}
            </select>
          </div>
          <div style="display:flex;align-items:flex-end;">
            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">${escHtml(blueprint.hero.searchBar.submitLabel)}</button>
          </div>
        </form>
        <div class="stats-row">
          ${blueprint.hero.stats.map((s) => `<div class="stat-card"><div class="stat-val">${escHtml(s.value)}</div><div class="stat-lbl">${escHtml(s.label)}</div></div>`).join("")}
        </div>
        ${blueprint.specialistAdvisory ? `<div class="advisory"><strong>Regulatory Advisory:</strong> ${escHtml(blueprint.specialistAdvisory)}</div>` : ""}
      </div>
    </section>

    <section id="showcase" class="block">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>${escHtml(blueprint.showcase.title)}</h2>
            <p class="muted" style="margin:0;">${escHtml(blueprint.showcase.subtitle)}</p>
          </div>
          <span id="visibleBadge" class="tag">${blueprint.showcase.items.length} items shown</span>
        </div>
        <div id="filterBar" class="filter-bar">${tabsHtml}</div>
        <div id="cardsGrid" class="grid-3">${cardsHtml}</div>
      </div>
    </section>

    <section id="capabilities" class="block">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>${escHtml(blueprint.sections.title)}</h2>
            <p class="muted" style="margin:0;">${escHtml(blueprint.sections.subtitle)}</p>
          </div>
        </div>
        <div class="grid-3">${sectionsHtml}</div>
      </div>
    </section>

    <section id="estimator" class="block">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>${escHtml(blueprint.interactiveTool.title)}</h2>
            <p class="muted" style="margin:0;">${escHtml(blueprint.interactiveTool.subtitle)}</p>
          </div>
        </div>
        <div class="tool-box">
          <div>
            <label for="unitsSlider" style="display:block;font-size:13px;font-weight:700;margin-bottom:8px;">
              ${escHtml(blueprint.interactiveTool.unitLabel)}: <span id="unitsDisplay">3</span>
            </label>
            <input id="unitsSlider" type="range" min="1" max="20" value="3" style="padding:0;" />
            <div style="margin-top:16px;">${estimatorOptsHtml}</div>
          </div>
          <div class="est-result">
            <div class="muted">Estimated Total</div>
            <div id="estTotal" class="est-price">$${(blueprint.interactiveTool.baseRate * 3).toLocaleString("en-US")}</div>
            <p id="estBreakdown" class="muted" style="margin:0;">Base rate $${blueprint.interactiveTool.baseRate.toLocaleString("en-US")} × 3 units</p>
            <button type="button" id="saveEstimateBtn" class="btn btn-primary" style="width:max-content;">Save Quote to List</button>
          </div>
        </div>
      </div>
    </section>

    <section id="testimonials" class="block">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>Trusted Outcomes & Testimonials</h2>
            <p class="muted" style="margin:0;">Feedback from real-world workflows across ${escHtml(blueprint.scopeLabel)}.</p>
          </div>
        </div>
        <div class="grid-3">${testimonialsHtml}</div>
        <div style="margin-top:34px;" id="faq">
          <h3 style="margin-bottom:14px;">Frequently Asked Questions</h3>
          ${faqsHtml}
        </div>
      </div>
    </section>

    <section id="contact" class="block">
      <div class="container">
        <div class="cta-panel">
          <div>
            <h2 style="margin:0 0 10px;font-size:28px;">${escHtml(blueprint.ctaBanner.headline)}</h2>
            <p class="muted" style="margin:0;">${escHtml(blueprint.ctaBanner.subheadline)}</p>
          </div>
          <form id="contactForm" style="display:grid;gap:10px;">
            <input id="contactName" type="text" required placeholder="Your full name" />
            <input id="contactEmail" type="email" required placeholder="Email address" />
            <textarea id="contactMsg" rows="2" placeholder="Tell us your goals or dates..."></textarea>
            <button type="submit" class="btn btn-primary" style="justify-content:center;">${escHtml(blueprint.ctaBanner.buttonLabel)}</button>
          </form>
        </div>
      </div>
    </section>
  </main>

  <footer class="container site-foot">
    <span>© 2026 ${escHtml(blueprint.brandName)} (${escHtml(blueprint.domain)}) · ${escHtml(blueprint.categoryName)}</span>
    <span>Built with Noctis Universal Website Builder · Tables: ${escHtml(blueprint.entities.map((e) => e.name).join(", "))}</span>
  </footer>

  <!-- Interactive Action Modal -->
  <div id="itemModalBackdrop" class="backdrop" role="dialog" aria-modal="true">
    <div class="modal">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 id="modalTitle" style="margin:0;">Action</h3>
        <button type="button" id="closeModalBtn" class="btn btn-sm">Close</button>
      </div>
      <p id="modalDesc" class="muted" style="margin:0 0 12px;"></p>
      <div style="display:grid;gap:10px;">
        <label style="font-size:12px;font-weight:600;">Quantity / Guests <input id="modalQty" type="number" min="1" max="50" value="1" /></label>
        <input id="modalCustomer" type="text" placeholder="Your name (optional)" />
        <button type="button" id="confirmModalBtn" class="btn btn-primary" style="justify-content:center;">Confirm & Add to Saved List</button>
      </div>
    </div>
  </div>

  <!-- Slide-out Saved / Cart Drawer -->
  <aside id="savedDrawer" class="drawer" aria-label="Saved items drawer">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:10px;">
      <strong>Saved & Reservations</strong>
      <button type="button" id="closeDrawerBtn" class="btn btn-sm">Close</button>
    </div>
    <div id="drawerItems" style="flex:1;overflow:auto;display:grid;gap:8px;align-content:start;"></div>
    <button type="button" id="checkoutDrawerBtn" class="btn btn-primary" style="justify-content:center;">Submit Request / Checkout</button>
  </aside>

  <div id="toast" class="toast"></div>

  <script>
    (function() {
      const APP_DATA = ${safeDataJson};
      let activeFilter = "All";
      let currentThemeMode = APP_DATA.initialMode || "dark";
      let modalItem = null;
      const savedList = [];

      function showToast(msg) {
        const t = document.getElementById("toast");
        t.textContent = msg;
        t.style.display = "block";
        setTimeout(() => { t.style.display = "none"; }, 2800);
      }

      function applyFilters() {
        const q = (document.getElementById("searchInput").value || "").trim().toLowerCase();
        const cards = document.querySelectorAll(".item-card");
        let shown = 0;
        cards.forEach((c) => {
          const cat = c.getAttribute("data-category") || "";
          const text = c.getAttribute("data-search") || "";
          const matchCat = activeFilter === "All" || activeFilter.startsWith("All ") || cat.toLowerCase() === activeFilter.toLowerCase();
          const matchQ = !q || text.includes(q);
          const ok = matchCat && matchQ;
          c.style.display = ok ? "" : "none";
          if (ok) shown++;
        });
        document.getElementById("visibleBadge").textContent = shown + " items shown";
      }

      document.getElementById("filterBar").addEventListener("click", (e) => {
        const btn = e.target.closest(".pill");
        if (!btn) return;
        activeFilter = btn.getAttribute("data-filter") || "All";
        document.querySelectorAll("#filterBar .pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        applyFilters();
      });

      document.getElementById("searchInput").addEventListener("input", applyFilters);
      document.getElementById("categorySelect").addEventListener("change", (e) => {
        activeFilter = e.target.value || "All";
        document.querySelectorAll("#filterBar .pill").forEach((b) => {
          const f = (b.getAttribute("data-filter") || "").toLowerCase();
          b.classList.toggle("active", f === activeFilter.toLowerCase() || (activeFilter.startsWith("All") && f === "all"));
        });
        applyFilters();
      });
      document.getElementById("heroSearchForm").addEventListener("submit", (e) => {
        e.preventDefault();
        applyFilters();
        document.getElementById("showcase").scrollIntoView({ behavior: "smooth" });
      });

      function recalcEstimate() {
        const units = Number(document.getElementById("unitsSlider").value || 1);
        document.getElementById("unitsDisplay").textContent = String(units);
        let rate = Number(APP_DATA.tool.baseRate || 50);
        document.querySelectorAll(".est-opt:checked").forEach((el) => {
          rate += Number(el.getAttribute("data-delta") || 0);
        });
        const total = Math.max(rate, 10) * units;
        document.getElementById("estTotal").textContent = "$" + total.toLocaleString("en-US");
        document.getElementById("estBreakdown").textContent = "$" + Math.max(rate, 10).toLocaleString("en-US") + "/unit × " + units + " units";
        return total;
      }

      document.getElementById("unitsSlider").addEventListener("input", recalcEstimate);
      document.querySelectorAll(".est-opt").forEach((el) => el.addEventListener("change", recalcEstimate));

      function renderDrawer() {
        document.getElementById("savedCount").textContent = String(savedList.length);
        const box = document.getElementById("drawerItems");
        if (!savedList.length) {
          box.innerHTML = '<p class="muted">No items saved yet. Click any card CTA or save a quote.</p>';
          return;
        }
        box.innerHTML = savedList.map((entry, idx) =>
          '<div style="border:1px solid var(--border);border-radius:12px;padding:10px;background:var(--surface-alt);">' +
          '<div style="font-weight:700;font-size:13px;">' + entry.title + '</div>' +
          '<div class="muted" style="font-size:12px;">' + entry.detail + '</div>' +
          '<button type="button" class="btn btn-sm remove-saved-btn" data-idx="' + idx + '" style="margin-top:6px;">Remove</button></div>'
        ).join("");
      }

      document.addEventListener("click", (e) => {
        const openBtn = e.target.closest(".open-item-btn");
        if (openBtn) {
          const id = openBtn.getAttribute("data-id");
          modalItem = APP_DATA.items.find((x) => x.id === id) || APP_DATA.items[0];
          document.getElementById("modalTitle").textContent = modalItem.title;
          document.getElementById("modalDesc").textContent = modalItem.description + " (" + modalItem.metric + ")";
          document.getElementById("itemModalBackdrop").classList.add("open");
          return;
        }
        const remBtn = e.target.closest(".remove-saved-btn");
        if (remBtn) {
          const i = Number(remBtn.getAttribute("data-idx"));
          savedList.splice(i, 1);
          renderDrawer();
        }
      });

      document.getElementById("closeModalBtn").addEventListener("click", () => {
        document.getElementById("itemModalBackdrop").classList.remove("open");
      });
      document.getElementById("confirmModalBtn").addEventListener("click", () => {
        if (!modalItem) return;
        const qty = Number(document.getElementById("modalQty").value || 1);
        const name = (document.getElementById("modalCustomer").value || "Guest").trim();
        savedList.push({ title: modalItem.title, detail: qty + " × " + modalItem.metric + " · " + name });
        renderDrawer();
        document.getElementById("itemModalBackdrop").classList.remove("open");
        showToast("Added " + modalItem.title + " to Saved List");
      });
      document.getElementById("saveEstimateBtn").addEventListener("click", () => {
        const total = recalcEstimate();
        savedList.push({ title: APP_DATA.tool.title, detail: "Estimate: $" + total.toLocaleString("en-US") });
        renderDrawer();
        showToast("Saved estimate ($" + total.toLocaleString("en-US") + ")");
      });

      document.getElementById("openDrawerBtn").addEventListener("click", () => {
        renderDrawer();
        document.getElementById("savedDrawer").classList.add("open");
      });
      document.getElementById("closeDrawerBtn").addEventListener("click", () => {
        document.getElementById("savedDrawer").classList.remove("open");
      });
      document.getElementById("checkoutDrawerBtn").addEventListener("click", () => {
        if (!savedList.length) { showToast("Add an item first"); return; }
        savedList.length = 0;
        renderDrawer();
        document.getElementById("savedDrawer").classList.remove("open");
        showToast("Request confirmed with " + APP_DATA.brand + "!");
      });

      document.getElementById("contactForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("contactEmail").value.trim();
        document.getElementById("contactForm").reset();
        showToast("Inquiry received for " + email + "!");
      });

      document.getElementById("themeToggleBtn").addEventListener("click", () => {
        currentThemeMode = currentThemeMode === "dark" ? "light" : "dark";
        const pal = currentThemeMode === "light" ? APP_DATA.lightTheme : APP_DATA.darkTheme;
        const root = document.documentElement.style;
        root.setProperty("--bg", pal.bg);
        root.setProperty("--surface", pal.surface);
        root.setProperty("--surface-alt", pal.surfaceAlt);
        root.setProperty("--border", pal.border);
        root.setProperty("--text", pal.text);
        root.setProperty("--muted", pal.muted);
        root.setProperty("--hero-bg", pal.heroBg);
        document.getElementById("themeToggleBtn").textContent = currentThemeMode === "dark" ? "Light Theme" : "Dark Theme";
      });

      const langEl = document.getElementById("langSelect");
      if (langEl) {
        langEl.addEventListener("change", (e) => {
          showToast("Switched locale to " + e.target.value.toUpperCase());
        });
      }
      renderDrawer();
    })();
  </script>
</body>
</html>`;
}

/** Generates typed React + TypeScript UI mirroring the WebsiteBlueprint */
export function renderReactAppFromBlueprint(blueprint: WebsiteBlueprint, stack: string): string {
  const componentName =
    blueprint.brandName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32) || "GeneratedPlatform";
  return `import React, { useMemo, useState } from "react";

interface ShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  metric: string;
  description: string;
  actionLabel: string;
}

const ITEMS: ShowcaseItem[] = ${JSON.stringify(
    blueprint.showcase.items.map((it) => ({
      id: it.id,
      title: it.title,
      subtitle: it.subtitle,
      category: it.category,
      metric: it.metric,
      description: it.description,
      actionLabel: it.actionLabel,
    })),
    null,
    2,
  )};

export function ${componentName}App() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [saved, setSaved] = useState<ShowcaseItem[]>([]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(ITEMS.map((i) => i.category)))],
    [],
  );

  const filtered = useMemo(
    () =>
      ITEMS.filter((item) => {
        const catOk = activeCategory === "All" || item.category === activeCategory;
        const q = query.trim().toLowerCase();
        const qOk = !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
        return catOk && qOk;
      }),
    [activeCategory, query],
  );

  return (
    <div style={{ background: "${blueprint.theme.bg}", color: "${blueprint.theme.text}", minHeight: "100vh", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid ${blueprint.theme.border}", paddingBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>${blueprint.brandName}</h1>
          <small style={{ color: "${blueprint.theme.muted}" }}>${blueprint.categoryName} · ${stack}</small>
        </div>
        <span style={{ fontWeight: 700, color: "${blueprint.theme.accent}" }}>Saved: {saved.length}</span>
      </header>

      <section style={{ marginBottom: 24 }}>
        <h2>${blueprint.hero.headline}</h2>
        <p style={{ color: "${blueprint.theme.muted}", maxWidth: 680 }}>${blueprint.hero.subheadline}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="${blueprint.hero.searchBar.field1Placeholder}"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid ${blueprint.theme.border}", minWidth: 260 }}
          />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid ${blueprint.theme.border}",
                background: activeCategory === cat ? "${blueprint.theme.accent}" : "${blueprint.theme.surface}",
                color: activeCategory === cat ? "${blueprint.theme.accentText}" : "${blueprint.theme.text}",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {filtered.map((item) => (
          <article key={item.id} style={{ background: "${blueprint.theme.surface}", border: "1px solid ${blueprint.theme.border}", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: "${blueprint.theme.muted}" }}>{item.subtitle}</div>
            <h3 style={{ margin: "6px 0" }}>{item.title}</h3>
            <p style={{ fontSize: 13, color: "${blueprint.theme.muted}" }}>{item.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <strong>{item.metric}</strong>
              <button
                onClick={() => setSaved((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item]))}
                style={{ background: "${blueprint.theme.accent}", color: "${blueprint.theme.accentText}", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}
              >
                {item.actionLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ${componentName}App;
`;
}

/** Generates domain-tailored PostgreSQL + optional PostGIS DDL & seed SQL */
export function renderSqlFromBlueprint(blueprint: WebsiteBlueprint): { initSql: string; seedSql: string } {
  const extLine = blueprint.needsPostGis ? "CREATE EXTENSION IF NOT EXISTS postgis;\n\n" : "";
  const tableBlocks = blueprint.entities
    .map((ent) => {
      const colLines = ent.columns.map((c) => `  ${c}`).join(",\n");
      const hasGeo = ent.columns.some((c) => /GEOGRAPHY\(/i.test(c));
      const geoIndex = hasGeo
        ? `\nCREATE INDEX IF NOT EXISTS idx_app_${ent.name}_geo ON app_${ent.name} USING GIST (${ent.columns.find((c) => /GEOGRAPHY\(/i.test(c))?.split(/\s+/)[0] || "geo_point"});`
        : "";
      return `CREATE TABLE IF NOT EXISTS app_${ent.name} (\n  id TEXT PRIMARY KEY,\n${colLines},\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n);\nCREATE INDEX IF NOT EXISTS idx_app_${ent.name}_created ON app_${ent.name} (created_at DESC);${geoIndex}`;
    })
    .join("\n\n");

  const downComments = blueprint.entities.map((ent) => `-- DROP TABLE IF EXISTS app_${ent.name};`).join("\n");
  const initSql = `-- PostgreSQL Schema & Reversible Migration for ${blueprint.brandName} (${blueprint.categoryName})\n${extLine}${tableBlocks}\n\n-- DOWN Migration (DBA approval required before execution):\n${downComments}\n`;

  const seedSql = blueprint.entities
    .map((ent, idx) => {
      const firstCol = ent.columns[0]?.split(/\s+/)[0] || "title";
      if (firstCol === "email" || firstCol === "customer_email") {
        return `INSERT INTO app_${ent.name} (id, ${firstCol}, full_name) VALUES ('SEED-${idx + 1}', 'member${idx + 1}@${blueprint.domain}', 'Sample Member') ON CONFLICT DO NOTHING;`;
      }
      if (firstCol === "sku") {
        return `INSERT INTO app_${ent.name} (id, sku, name, category, price_cents) VALUES ('SEED-${idx + 1}', 'SKU-${idx + 1}', '${blueprint.brandName} Item', '${blueprint.categoryName}', 9900) ON CONFLICT DO NOTHING;`;
      }
      if (firstCol === "customer_name") {
        return `INSERT INTO app_${ent.name} (id, customer_name, customer_email, item_ref, total_cents) VALUES ('SEED-${idx + 1}', 'Sample Guest', 'guest@${blueprint.domain}', 'ITEM-1', 12000) ON CONFLICT DO NOTHING;`;
      }
      if (firstCol === "invoice_number") {
        return `INSERT INTO app_${ent.name} (id, invoice_number, customer_name, amount_cents, due_date) VALUES ('SEED-${idx + 1}', 'INV-100${idx + 1}', '${blueprint.brandName} Client', 45000, CURRENT_DATE + 14) ON CONFLICT DO NOTHING;`;
      }
      if (firstCol === "full_name") {
        return `INSERT INTO app_${ent.name} (id, full_name, mrn) VALUES ('SEED-${idx + 1}', 'Sample Record', 'MRN-100${idx + 1}') ON CONFLICT DO NOTHING;`;
      }
      if (firstCol === "patient_or_client") {
        return `INSERT INTO app_${ent.name} (id, patient_or_client, provider_name, scheduled_at) VALUES ('SEED-${idx + 1}', 'Sample Visitor', '${blueprint.brandName} Specialist', now() + interval '2 days') ON CONFLICT DO NOTHING;`;
      }
      if (firstCol === "code") {
        return `INSERT INTO app_${ent.name} (id, code, title, instructor) VALUES ('SEED-${idx + 1}', 'MOD-101', '${blueprint.brandName} Track', 'Lead Faculty') ON CONFLICT DO NOTHING;`;
      }
      if (firstCol === "name") {
        const hasCountry = ent.columns.some((c) => /^country\b/i.test(c));
        return hasCountry
          ? `INSERT INTO app_${ent.name} (id, name, country, category) VALUES ('SEED-${idx + 1}', '${blueprint.brandName} Flagship', '${blueprint.scopeLabel}', '${blueprint.categoryName}') ON CONFLICT DO NOTHING;`
          : `INSERT INTO app_${ent.name} (id, name, email) VALUES ('SEED-${idx + 1}', 'Sample Contact', 'contact@${blueprint.domain}') ON CONFLICT DO NOTHING;`;
      }
      return `INSERT INTO app_${ent.name} (id, ${firstCol}) VALUES ('SEED-${idx + 1}', '${blueprint.brandName} Baseline ${ent.name}') ON CONFLICT DO NOTHING;`;
    })
    .join("\n");

  return { initSql, seedSql };
}
