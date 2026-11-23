import test from "node:test";
import assert from "node:assert/strict";
import { runFollowUpIntelligence } from "./noctis-response-intelligence.ts";
import { detectPluginQuery } from "./noctis-plugin-synthesizer.ts";
import { handleNaturalFrontierTracksQuery } from "./noctis-frontier-tracks.ts";
import { handleNaturalInformationTechnologyQuery } from "./noctis-it-master-engine.ts";
import { handleNaturalAdvancedItQuery } from "./noctis-advanced-it-master-engine.ts";
import { handleNaturalWorkSwarmQuery } from "./noctis-work-swarm.ts";
import { handleNaturalBibleQuery } from "./noctis-bible-engine.ts";
import { handleNaturalGastroQuery } from "./noctis-gastro-hepatology.ts";
import { handleNaturalEnergyQuery } from "./noctis-energy-grid.ts";
import { handleNaturalEndocrinologyQuery } from "./noctis-endocrinology-crises.ts";
import { buildContextualFollowUps } from "./noctis-followups.ts";

const EXACT_TOURISM_PROMPT = [
  "lets design a web site aboute tourism: Tourism Website — Design & Development Plan",
  "We can build a modern, visually impressive tourism website that allows visitors to discover destinations, explore attractions, plan trips, book experiences, find accommodations, and connect with local tour guides.",
  "The goal is to create more than an informational website. We can develop a complete tourism discovery and booking platform that serves international tourists, domestic travelers, tour operators, hotels, and local businesses.",
  "1. Proposed homepage design",
  "suiteimpressionstravel.com",
  "Explore the World",
  "Discover Extraordinary Destinations",
  "Explore breathtaking landscapes, rich cultures, unforgettable adventures, and unique experiences.",
  "DestinationWhere to?",
  "ExperienceAll adventures",
  "Design Interactive Homepage",
  "2. Main website sections",
  "Explore Destinations: Countries, regions, cities and attractions",
  "Tours & Adventures: Safaris, hiking, cultural tours and excursions",
  "Hotels & Stays: Resorts, hotels, lodges and guesthouses",
  "Trip Planner: Personalized travel itineraries",
  "AI Travel Assistant: Travel recommendations and planning",
  "Online Booking: Reservations, payments and confirmations",
  "Local Tour Guides: Verified guides and local operators",
  "Tourism Marketplace: Local businesses, food and experiences",
  "Travel Stories: Photos, videos and visitor reviews",
  "Travel Information: Visa guidance, safety and travel advice",
  "3. Destination discovery experience",
  "Wildlife & Safaris: National parks, wildlife tours and nature",
  "History & Heritage: Historic landmarks, museums and culture",
  "Nature & Adventure: Waterfalls, hiking trails and forests",
  "Luxury & Relaxation: Beach resorts, wellness and premium stays",
  "4. Advanced capabilities",
  "For a competitive tourism platform, I recommend adding an AI itinerary generator, interactive destination maps, multilingual content, travel budget calculators, verified tour operators, secure payments, booking management, traveler accounts, and mobile-friendly design.",
  "The business side should have separate dashboards for administrators, hotels, tour operators and local guides. This will allow tourism businesses to manage listings, prices, reservations, promotions and customer inquiries.",
  "5. Recommended technology",
  "Frontend: Next.js, React, Tailwind CSS",
  "Backend: Node.js / NestJS",
  "Database: PostgreSQL with PostGIS",
  "Maps: Google Maps or Mapbox",
  "AI trip planner: LLM integration",
  "Payments: Stripe and supported local gateways",
  "Image and video storage: Cloud object storage and CDN",
  "Hosting: AWS, Azure or Vercel",
  "Admin dashboard: Role-based management portal",
  "6. Development budget estimates",
  "Basic tourism information website: $3,000-$7,000",
  "Professional destination and tourism portal: $8,000-$18,000",
  "Tourism marketplace with booking capabilities: $20,000-$40,000",
  "Advanced AI-powered tourism platform: $45,000-$90,000+",
  "7. First decision: tourism website coverage",
  "Which tourism market should we design the website for?",
  "Ghana — all 16 regions, attractions and tourism businesses",
  "Ghana's Savannah Region — wildlife, culture and local tourism",
  "Africa — multiple countries and destinations",
  "Worldwide — international tourism platform",
  "What level of website do you want?",
  "Tourism information and destination discovery",
  "Tourism website with hotel and tour bookings",
  "Complete AI-powered tourism and booking marketplace",
  "Proceed With Website Design",
].join("\n");

test("Noctis router precision: exact tourism brief & everyday prompts never hijack", () => {
  const everydayNoHijackPrompts = [
    EXACT_TOURISM_PROMPT,
    "Design a tourism website for coastal Ghana with oceanfront resorts, beach safaris, and local tour guides",
    "Build a SaaS web app with Next.js, PostgreSQL, OAuth login, and a 99.9% SLA. Draft a technical architecture plan.",
    "Build an AI agent swarm platform where different agents collaborate on software design",
    "Design a healthcare clinic portal with appointment booking, patient education, and negative pressure wound therapy articles",
    "Compare a 16GB RAM laptop with 256GB SSD vs 32GB RAM for video editing and coding",
    "Create a nutrition tracker app showing 20g protein, 6g fat, and 35g carbs per meal",
    "I need a CPA to help file small business taxes and lower my cost per acquisition (CPA)",
    "Build a machine learning web dashboard using https://pytorch.org and FastAPI",
    "Create an ASMR sleep and relaxation audio streaming website with playlists",
    "Explain how shingled magnetic recording (SMR) hard drives differ from CMR drives",
    "Design a church website with sermons, Bible study groups, events calendar, and giving portal",
    "Explain how ocean currents affect coastal rainfall and tourism seasons in West Africa",
    "What is a qubit and how is quantum computing different from classical computing? Explain simply.",
  ];

  for (const prompt of everydayNoHijackPrompts) {
    const out = runFollowUpIntelligence([], prompt);
    assert.equal(out, null, `Expected null for prompt: ${prompt.slice(0, 90)}, got: ${out?.slice(0, 120)}`);
  }

  // Verify stroke prompt does NOT misfire into Gastro or Energy engines
  const strokePrompt = "68-year-old patient presents with sudden right facial droop, slurred speech, and arm weakness. SBP 178/96.";
  assert.equal(handleNaturalGastroQuery(strokePrompt), null);
  assert.equal(handleNaturalEnergyQuery(strokePrompt), null);

  // Verify HIPAA HHS OCR prompt does NOT misfire into Endocrinology
  assert.equal(handleNaturalEndocrinologyQuery("Explain HIPAA Privacy Rule enforcement by HHS OCR for small medical practices"), null);
});

test("Noctis plugin detector: avoids tech-stack/common-word hijacks while keeping genuine ops queries", () => {
  const nonPluginPrompts = [
    EXACT_TOURISM_PROMPT,
    "use React to build a tourism site",
    "linear regression",
    "what is a proton?",
    "SpaceX Falcon 9",
    "read the docs",
    "signal processing",
  ];

  for (const prompt of nonPluginPrompts) {
    const res = detectPluginQuery(prompt);
    assert.equal(res.isPlugin, false, `Expected isPlugin=false for "${prompt.slice(0, 60)}", got ${JSON.stringify(res)}`);
  }

  const genuinePluginPrompts = [
    {
      prompt: "Scan my Gmail inbox for security advisories, vulnerability disclosures, and critical infrastructure alerts from the last 24 hours.",
      expectedId: "gmail",
    },
    { prompt: "Audit my Supabase RLS policy", expectedId: "supabase" },
    { prompt: "Check CrowdStrike Falcon X alerts", expectedId: "crowdstrike_falcon" },
  ];

  for (const item of genuinePluginPrompts) {
    const res = detectPluginQuery(item.prompt);
    assert.equal(res.isPlugin, true, `Expected isPlugin=true for "${item.prompt}"`);
    assert.equal(res.pluginId, item.expectedId);
  }
});

test("Noctis specialist deterministic engines: genuine domain queries still route accurately", () => {
  const agrigenomicsOut = handleNaturalFrontierTracksQuery(
    "Evaluate CEA vertical farming biosphere with VPD 1.05 kPa, 1200 ppm CO2, and dissolved oxygen 3.8 mg/L root hypoxia hazard",
  );
  assert.ok(agrigenomicsOut?.includes("NOCTIS-AGRI-BIOS-001"));

  const telecom6gOut = handleNaturalFrontierTracksQuery(
    "Analyze 6G sub-THz 140 GHz wireless link with URLLC air interface latency 0.28 ms and E911 emergency preemption",
  );
  assert.ok(telecom6gOut?.includes("NOCTIS-TELECOM-6G-001"));

  const smrOut = handleNaturalFrontierTracksQuery(
    "Evaluate Small Modular Reactor (SMR) physics with keff 1.0025 and DNBR 2.10",
  );
  assert.ok(smrOut?.includes("NOCTIS-NUCLEAR-SMR-001"));

  const hyperOut = handleNaturalFrontierTracksQuery(
    "Evaluate hypersonic scramjet isolator shock train margin 2.1 cm and pressure ratio 4.2 at Mach 7",
  );
  assert.ok(hyperOut?.includes("NOCTIS-AERO-HYPER-001"));

  const colregsOut = handleNaturalFrontierTracksQuery(
    "Evaluate COLREGS Rule 15 crossing vessel encounter at CPA 0.7 NM, TCPA 14 minutes, bearing 035 deg",
  );
  assert.ok(colregsOut?.includes("NOCTIS-MARITIME-COLREGS-001"));

  const bsl4Out = handleNaturalFrontierTracksQuery(
    "Audit BSL-4 biocontainment suite negative pressure cascade at -60 Pa in primary laboratory",
  );
  assert.ok(bsl4Out?.includes("NOCTIS-BIOSEC-BSL4-001"));

  const cuasOut = handleNaturalFrontierTracksQuery(
    "Evaluate counter-UAS drone swarm defense with 12 inbound drones, 50 kW laser, and IFF Mode 5 confirmation",
  );
  assert.ok(cuasOut?.includes("NOCTIS-DEFENSE-CUAS-001"));

  const raftOut = handleNaturalInformationTechnologyQuery(
    "In a Raft consensus cluster with 5 nodes and 2 unresponsive nodes, what is the quorum required?",
  );
  assert.ok(raftOut?.includes("NOCTIS-IT-CLOUD-001"));

  const advItOut = handleNaturalAdvancedItQuery(
    "Evaluate GPU cluster NVLink v4 vs RoCEv2 topology for 8192 GPUs with PFC disabled",
  );
  assert.ok(advItOut?.includes("Noctis Sovereign HPC GPU Cluster"));

  const swarmOut = handleNaturalWorkSwarmQuery("Run a multi-agent work swarm to analyze enterprise solvency and runway");
  assert.ok(swarmOut?.includes("Work Swarm"));

  const bibleOut = handleNaturalBibleQuery("Prepare a 30-minute sermon on Psalm 23 for a Sunday service");
  assert.ok(bibleOut?.includes("Psalm 23"));

  const gastroOut = handleNaturalGastroQuery(
    "Patient with cirrhosis and ascites presents with ascitic fluid PMN 480 and suspected SBP without paracentesis",
  );
  assert.ok(gastroOut?.includes("Gastroenterology"));

  const energyOut = handleNaturalEnergyQuery("BESS battery bank overheating at 58 degrees C thermal runaway with cooling offline");
  assert.ok(energyOut?.includes("Smart Grid"));

  const endoOut = handleNaturalEndocrinologyQuery(
    "Patient with DKA and hyperosmolar glucose 520, K 2.8 mEq/L starting insulin infusion",
  );
  assert.ok(endoOut?.includes("Endocrinology"));
});

test("Noctis follow-up chip extraction: strips conversational leads before website topic", () => {
  const sampleTourismAnswer = [
    "## Suite Impressions Travel — Tourism Platform Architecture",
    "### Core Modules",
    "1. **Destination Explorer** with interactive Mapbox maps and PostGIS geospatial search.",
    "2. **Booking & Checkout** integrated with Stripe and local payment gateways.",
    "3. **AI Itinerary Planner** using PostgreSQL and Next.js App Router.",
  ].join("\n\n");

  const pills = buildContextualFollowUps(
    "lets design a web site aboute tourism: Next.js, PostgreSQL, Stripe",
    sampleTourismAnswer,
  );
  assert.ok(pills.length >= 2);
  for (const pill of pills) {
    assert.ok(
      !/diagram\s+lets\s+design/i.test(pill.label),
      `Follow-up chip label still has raw conversational lead: "${pill.label}"`,
    );
  }
});
