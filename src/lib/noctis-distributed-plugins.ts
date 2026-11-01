import { ALL_PLUGINS, type PluginItem } from "@/components/noctis/NoctisPluginsTab";

export type PluginShelfKey =
  | "pictures"
  | "library"
  | "tools"
  | "more"
  | "search"
  | "read"
  | "see"
  | "watch"
  | "agent";

export interface DistributedPluginItem extends PluginItem {
  shelves: PluginShelfKey[];
  sampleAction: string;
}

/**
 * Distribution mapping for all 50+ plugins across:
 * - Pictures (Creativity, Image, Design)
 * - Library (Knowledge, Academic, Faith, Career)
 * - Tools (Dev & Security)
 * - More (Business, Operations, Communication, Finance, Travel, Daily)
 * - Search & Research (Search, Intelligence, Data Analytics)
 * - Read (Reading, Docs, Cloud Storage)
 * - See (Vision, Diagrams, CAD, Desktop)
 * - Watch (Video, Streaming, Audio)
 * - Agent (Autonomous Engines & Specialist Reasoning)
 */
export const DISTRIBUTED_PLUGINS: DistributedPluginItem[] = ALL_PLUGINS.map((plugin) => {
  let shelves: PluginShelfKey[] = [];
  let sampleAction = `Use ${plugin.name} to `;

  switch (plugin.id) {
    // --- Pictures / Creativity ---
    case "canva":
      shelves = ["pictures", "see"];
      sampleAction = "Create and review design layouts with Canva for ";
      break;
    case "runway":
      shelves = ["pictures", "watch"];
      sampleAction = "Generate cinematic AI video scene with Runway: ";
      break;
    case "higgsfield":
      shelves = ["pictures", "watch"];
      sampleAction = "Generate video and character motion with Higgsfield: ";
      break;
    case "figma":
      shelves = ["pictures", "see", "tools"];
      sampleAction = "Inspect Figma UI components, tokens, and ship to code for ";
      break;
    case "adobe":
      shelves = ["pictures", "see"];
      sampleAction = "Design and compose visual assets with Adobe for ";
      break;
    case "product_design":
      shelves = ["pictures", "see"];
      sampleAction = "Prototype user experience and product flows for ";
      break;
    case "sketch_canvas":
      shelves = ["pictures", "library", "see"];
      sampleAction = "Open interactive Multi-Slide Canvas blueprint for ";
      break;

    // --- Library / Knowledge / Papers ---
    case "scite":
      shelves = ["library", "search"];
      sampleAction = "Search peer-reviewed literature and citation evidence on ";
      break;
    case "acumen":
      shelves = ["library", "search"];
      sampleAction = "Retrieve verified research literature and facts from Acumen on ";
      break;
    case "life_sciences":
      shelves = ["library", "search"];
      sampleAction = "Query public life-science databases and clinical records for ";
      break;
    case "tamarind_bio":
      shelves = ["library", "search"];
      sampleAction = "Model protein structures and molecular docking with Tamarind Bio for ";
      break;
    case "faith_theology":
      shelves = ["library"];
      sampleAction = "Research scripture, historical context, and theological exegesis for ";
      break;
    case "careerorbit_ai":
      shelves = ["library", "agent"];
      sampleAction = "Analyze career expansion roadmaps, verified skills gaps, and resume for ";
      break;
    case "connectin_portal":
      shelves = ["library", "more"];
      sampleAction = "Connect with verified peer experts and study groups on ConnectIn for ";
      break;
    case "document_compiler":
      shelves = ["library", "read", "tools"];
      sampleAction = "Compile an executive Word (.docx) report and PDF paper on ";
      break;

    // --- Search & Research / Data Analytics ---
    case "data":
      shelves = ["search", "tools"];
      sampleAction = "Analyze datasets and compute statistical summaries for ";
      break;
    case "gsc_wizard":
      shelves = ["search", "tools"];
      sampleAction = "Audit Google Search Console, Bing, and GA4 metrics for ";
      break;
    case "posthog":
      shelves = ["search", "tools"];
      sampleAction = "Analyze product telemetry, funnel retention, and user events in PostHog for ";
      break;
    case "power_bi":
      shelves = ["search", "tools"];
      sampleAction = "Explore Microsoft Power BI dashboards and semantic data models for ";
      break;
    case "helium_10":
      shelves = ["search", "more"];
      sampleAction = "Access Helium 10 marketplace data, keyword rankings, and sales volume for ";
      break;
    case "blockscout":
      shelves = ["search", "tools"];
      sampleAction = "Query Blockscout blockchain transactions, contract verifications, and gas metrics for ";
      break;
    case "windsor_ai":
      shelves = ["search", "more"];
      sampleAction = "Connect marketing pipelines across 350+ data sources in Windsor.ai for ";
      break;

    // --- Read / Docs / Cloud Storage ---
    case "notion":
      shelves = ["read", "more"];
      sampleAction = "Create and organize structured documentation in Notion for ";
      break;
    case "dropbox":
      shelves = ["read", "more"];
      sampleAction = "Search, organize, and inspect uploaded files in Dropbox for ";
      break;
    case "google_drive":
      shelves = ["read", "more"];
      sampleAction = "Inspect and summarize Google Drive docs, sheets, and slides for ";
      break;
    case "sharepoint":
      shelves = ["read", "more"];
      sampleAction = "Summarize internal documents and team records in SharePoint for ";
      break;
    case "todoist":
      shelves = ["read", "more"];
      sampleAction = "Organize tasks, milestones, and project deadlines in Todoist for ";
      break;

    // --- See / Vision & Remote ---
    case "remote_desktop":
      shelves = ["see", "tools"];
      sampleAction = "Execute remote desktop commands and inspect screen session for ";
      break;

    // --- Watch / Video & Audio ---
    case "vidiq":
      shelves = ["watch", "more"];
      sampleAction = "Analyze YouTube algorithm signals, video tags, and competitor growth with vidIQ for ";
      break;
    case "sonos":
      shelves = ["watch", "more"];
      sampleAction = "Manage music playback and audio zones across Sonos system: ";
      break;

    // --- Tools (Dev & Security) ---
    case "xtrike_sast":
      shelves = ["tools"];
      sampleAction = "Run XTRIKE SAST 710 automated static security analysis and OWASP check on ";
      break;
    case "trepath_threat":
      shelves = ["tools"];
      sampleAction = "Execute TREPATH quantitative attack path validation and CVSS/EPSS scoring for ";
      break;
    case "axiom_scanner":
      shelves = ["tools"];
      sampleAction = "Run AXIOM vulnerability scan, live security headers audit, and CVE check on ";
      break;
    case "sovereign_code_guard":
    case "codex_security":
      shelves = ["tools"];
      sampleAction = "Audit repository dependencies and automated code patches with Sovereign Code Guard for ";
      break;
    case "malwarebytes":
      shelves = ["tools"];
      sampleAction = "Verify suspicious URLs, domains, and phishing payloads with Malwarebytes: ";
      break;
    case "privacyhawk":
      shelves = ["tools"];
      sampleAction = "Scan data brokers and enforce privacy opt-outs with PrivacyHawk for ";
      break;
    case "ajaxx":
      shelves = ["tools"];
      sampleAction = "Scrub exposed credentials and leaked PII with AJAXX Data Scrubber for ";
      break;
    case "soluvery":
      shelves = ["tools"];
      sampleAction = "Audit shared Google Drive link permissions and access risks with Soluvery: ";
      break;
    case "github":
      shelves = ["tools"];
      sampleAction = "Triage GitHub pull requests, issues, CI workflow logs, and releases for ";
      break;
    case "supabase":
      shelves = ["tools"];
      sampleAction = "Execute Postgres queries, check migrations, and inspect RLS policies in Supabase for ";
      break;
    case "vercel":
      shelves = ["tools"];
      sampleAction = "Deploy frontend builds, edge functions, and inspect preview domains on Vercel for ";
      break;
    case "lovable":
      shelves = ["tools"];
      sampleAction = "Build full-stack React and web applications with Lovable for ";
      break;
    case "tinyfish":
      shelves = ["tools"];
      sampleAction = "Automate browser workflows and web scraping with TinyFish for ";
      break;

    // --- Agent / Autonomous Engines ---
    case "agent_builder":
      shelves = ["agent", "tools"];
      sampleAction = "Configure autonomous specialist sub-agent with persistent persona and tools: ";
      break;
    case "physician_dx":
      shelves = ["agent", "library"];
      sampleAction = "Evaluate clinical lab biomarkers, differential diagnosis, and FHIR records for ";
      break;
    case "capital_valuation":
      shelves = ["agent", "more"];
      sampleAction = "Compute DCF financial valuation, ARR multiples, and M&A sensitivity bands for ";
      break;
    case "sovereign_voice":
      shelves = ["agent", "tools"];
      sampleAction = "Synthesize neural human voice audio and conversational speech for ";
      break;

    // --- More (Business, Ops, Comm, Finance, Travel, Daily) ---
    case "gmail":
      shelves = ["more"];
      sampleAction = "Triage unread Gmail inbox, search threads, and draft replies for ";
      break;
    case "outlook_email":
      shelves = ["more"];
      sampleAction = "Triage Outlook inbox and draft priority email responses for ";
      break;
    case "icloud_mail":
      shelves = ["more"];
      sampleAction = "Read and search iCloud emails for ";
      break;
    case "hostinger_mail":
      shelves = ["more"];
      sampleAction = "Send and check business domain mail in Hostinger Mail for ";
      break;
    case "mailopoly":
      shelves = ["more"];
      sampleAction = "Search and triage cross-platform inbox messages in Mailopoly for ";
      break;
    case "superhuman":
      shelves = ["more"];
      sampleAction = "Reach Inbox Zero and organize schedule using Superhuman Mail for ";
      break;
    case "slack":
      shelves = ["more"];
      sampleAction = "Read unread channel messages and post updates in Slack for ";
      break;
    case "teams":
      shelves = ["more"];
      sampleAction = "Summarize Microsoft Teams conversations and post replies for ";
      break;
    case "zoom":
      shelves = ["more"];
      sampleAction = "Extract action items, highlights, and insights from Zoom meeting for ";
      break;
    case "google_calendar":
      shelves = ["more"];
      sampleAction = "Schedule and organize upcoming Google Calendar meetings for ";
      break;
    case "outlook_calendar":
      shelves = ["more"];
      sampleAction = "Coordinate team availability and calendar invites in Outlook for ";
      break;
    case "icloud_calendar":
      shelves = ["more"];
      sampleAction = "Check schedule and set reminders on iCloud Calendar for ";
      break;
    case "quickbooks":
      shelves = ["more"];
      sampleAction = "Audit chart of accounts, invoices, and ledger entries in QuickBooks for ";
      break;
    case "stripe":
      shelves = ["more"];
      sampleAction = "Analyze Stripe customer payments, subscription MRR, and disputes for ";
      break;
    case "gusto":
      shelves = ["more"];
      sampleAction = "Calculate payroll runs, benefits, and contractor payments in Gusto for ";
      break;
    case "hubspot":
      shelves = ["more"];
      sampleAction = "Review sales CRM pipeline, deals, and lead contacts in HubSpot for ";
      break;
    case "shopify":
      shelves = ["more"];
      sampleAction = "Manage e-commerce inventory, customer orders, and discounts in Shopify for ";
      break;
    case "wix":
      shelves = ["more"];
      sampleAction = "Update website layout, content blocks, and store catalog on Wix for ";
      break;
    case "sales":
      shelves = ["more"];
      sampleAction = "Formulate high-converting B2B outreach scripts and sales cadence for ";
      break;
    case "binance":
      shelves = ["more"];
      sampleAction = "Explore Binance order books, crypto liquidity, and spot prices for ";
      break;
    case "ibkr":
      shelves = ["more"];
      sampleAction = "Analyze global equities, bond yields, and options chains on Interactive Brokers for ";
      break;
    case "public_equity":
      shelves = ["more"];
      sampleAction = "Analyze SEC 10-K filings, free cash flow yields, and balance sheets for ";
      break;
    case "longbridge":
      shelves = ["more"];
      sampleAction = "Stream real-time Level 2 stock quotes and order flow on Longbridge for ";
      break;
    case "booking":
      shelves = ["more"];
      sampleAction = "Find top-rated hotel accommodations and amenities on Booking.com for ";
      break;
    case "skyscanner":
      shelves = ["more"];
      sampleAction = "Compare cheapest airline flight routes and fares on Skyscanner for ";
      break;
    case "expedia":
      shelves = ["more"];
      sampleAction = "Plan comprehensive travel itinerary, flights, and hotels on Expedia for ";
      break;
    case "trip_com":
      shelves = ["more"];
      sampleAction = "Book high-speed rail, regional transit, and flights on Trip.com for ";
      break;
    case "flight_network":
      shelves = ["more"];
      sampleAction = "Search multi-city international airline flights on Flight Network for ";
      break;
    case "wikiloc":
      shelves = ["more"];
      sampleAction = "Find verified outdoor hiking, cycling, and running trails on Wikiloc for ";
      break;
    case "linkedin":
      shelves = ["more"];
      sampleAction = "Source qualified professional candidates and industry leaders on LinkedIn for ";
      break;
    case "etsy":
      shelves = ["more"];
      sampleAction = "Discover artisan handmade goods and curated home styles on Etsy for ";
      break;
    case "kleinanzeigen":
      shelves = ["more"];
      sampleAction = "Search European classifieds and peer-to-peer listings on Kleinanzeigen for ";
      break;
    case "zillow":
      shelves = ["more"];
      sampleAction = "Analyze residential real estate comps, cap rates, and listings on Zillow for ";
      break;
    case "astrologic":
      shelves = ["more"];
      sampleAction = "Generate natal birth chart and planetary ephemeris transit interpretation for ";
      break;
    case "tarot":
      shelves = ["more"];
      sampleAction = "Draw a three-card Celtic cross symbolic tarot reading for ";
      break;
    case "health":
      shelves = ["more", "agent"];
      sampleAction = "Track health biomarkers, sleep duration, and metabolic vitals for ";
      break;
    case "calorie_tracker":
      shelves = ["more"];
      sampleAction = "Log meal macronutrients, caloric density, and dietary goals for ";
      break;
    case "hevy":
      shelves = ["more"];
      sampleAction = "Log gym training splits, progressive overload, and 1RM metrics in Hevy for ";
      break;
    case "tripsy":
      shelves = ["more"];
      sampleAction = "Organize travel flight confirmation codes and itinerary in Tripsy for ";
      break;

    default:
      shelves = ["more"];
      sampleAction = `Use ${plugin.name} for `;
      break;
  }

  return {
    ...plugin,
    shelves,
    sampleAction,
  };
});

/**
 * Returns plugins allocated to a specific shelf or tool
 */
export function getPluginsForShelf(shelfKey: PluginShelfKey): DistributedPluginItem[] {
  return DISTRIBUTED_PLUGINS.filter((p) => p.shelves.includes(shelfKey));
}
