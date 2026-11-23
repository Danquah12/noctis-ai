import test from "node:test";
import assert from "node:assert/strict";
import { FORGE_40_CATEGORIES } from "./forge-catalog.ts";
import { classifyWebsiteCategory } from "./website-blueprint-engine.ts";
import {
  editForgeProjectConversationally,
  generateForgeProject,
  restoreForgeProjectRevision,
} from "./forge-engine.server.ts";
import { webPageBuilderGadget } from "../noctis-gadgets.server.ts";

test("classifyWebsiteCategory routes representative prompts accurately across all 40 Forge categories", () => {
  const sampleBySlug: Record<string, string> = {
    business: "Build a consulting firm company website showcasing corporate advisory services and client case studies.",
    ecommerce: "Build an online store and product catalog with a shopping cart and checkout for handmade shoes.",
    "social-media": "Create a social network and short-video creator feed platform with live comments and moderation.",
    "professional-networking": "Build a LinkedIn-style professional network for clinician profiles, peer connections, and credentialed mentors.",
    healthcare: "Build a healthcare clinic website and HIPAA-ready patient portal for telehealth appointment scheduling.",
    "legal-services": "Create a law firm and electronic court filing website for litigation case tracking and attorney intake.",
    government: "Design a municipal citizen portal and public service agency website for building permits and licensing.",
    education: "Build an e-learning university course catalog and LMS student portal with certificates.",
    banking: "Design a retail banking and checking account portal with wire transfers and wealth dashboards.",
    fintech: "Build a fintech invoicing and payment gateway app with expense budgeting tools.",
    insurance: "Create an insurance claims portal and policy management quote website.",
    "real-estate": "Build a modern real estate property listing marketplace with interactive apartment search and mortgage calculator.",
    travel: "Design a worldwide tourism and travel booking website with safari itineraries, local tour guides, and destinations.",
    hospitality: "Create an artisan bakery and restaurant website with menu filters, catering, and table reservations.",
    transportation: "Build a ride-booking, airport shuttle, and fleet dispatch mobility website.",
    logistics: "Create a freight shipping tracker and 3PL warehouse fulfillment logistics website.",
    "job-boards": "Design a recruitment job board and careers portal for candidates and employers.",
    "freelance-marketplaces": "Build a freelance service marketplace where clients hire designers with escrow milestones.",
    construction: "Create a general contractor portal and commercial construction website with blueprints and inspections.",
    automotive: "Build a car dealership showroom and auto repair service bay booking website.",
    agriculture: "Design a farm management and agricultural produce cooperative marketplace website.",
    nonprofits: "Create a charity and nonprofit fundraising donation portal with volunteer signups.",
    "religious-organizations": "Build a church and ministry community website with weekly sermons and Bible study groups.",
    "news-media": "Design a digital newspaper and editorial publishing website with newsletters.",
    entertainment: "Build a streaming video and music playlist entertainment website with creator channels.",
    sports: "Create a sports club, fitness coaching, and league tournament schedule website.",
    events: "Design a conference ticketing and festival registration website with speaker schedules.",
    cybersecurity: "Build a cybersecurity SOC dashboard and CISA KEV vulnerability portal.",
    "rmf-grc": "Design an RMF GRC compliance platform for NIST 800-53 controls, FedRAMP ATO packages, and POA&M tracking.",
    "ai-platforms": "Build an AI platform workspace for tool-calling agents, RAG pipelines, and safety evaluations.",
    "saas-products": "Create a B2B SaaS subscription platform marketing site with API integrations and pricing tiers.",
    "customer-portals": "Build a self-service customer portal and support desk ticket website.",
    "admin-dashboards": "Create an operations admin dashboard and KPI reporting analytics console website.",
    "crm-systems": "Build a sales pipeline CRM system website to track deals, leads, and customer contacts.",
    "erp-systems": "Design an enterprise ERP system website for procurement, general ledger finance, and HRIS payroll.",
    "project-management": "Create a project management kanban task tracker and team sprint roadmap platform.",
    forums: "Build an online discussion board and developer community forum website with upvoted Q&A threads.",
    auctions: "Create an auction bidding website for live collectible lots and escrow settlement.",
    portfolio: "Design a personal portfolio website for a freelance photographer and UX designer showcasing case studies.",
    "custom-apps": "Build a custom application and internal workflow tool for laboratory specimen lending.",
  };

  for (const cat of FORGE_40_CATEGORIES) {
    const prompt = sampleBySlug[cat.slug];
    assert.ok(prompt, `Missing sample prompt for category ${cat.slug}`);
    const matched = classifyWebsiteCategory(undefined, prompt);
    assert.equal(
      matched.slug,
      cat.slug,
      `Expected category "${cat.slug}" for "${prompt}", got "${matched.slug}"`,
    );
  }

  const handoffMatch = classifyWebsiteCategory(
    "",
    "Build a complete interactive website and full-stack app for Hearth & Saffron Table — Hospitality",
  );
  assert.equal(handoffMatch.slug, "hospitality");
});

test("generateForgeProject produces domain-authentic interactive sites across 6 diverse industries", async () => {
  const scenarios = [
    {
      name: "Worldwide Tourism",
      prompt: "Build a worldwide travel and adventure booking website with itinerary planner, local tour guides, and luxury stays",
      expectedSlug: "travel",
      mustInclude: ["Kyoto", "Serengeti", "Patagonia"],
      mustExclude: ["Ghana", "Uganda", "Canopy Photosynthetic Flux"],
    },
    {
      name: "E-Commerce Sneakers",
      prompt: "Build an online e-commerce storefront for limited sneakers with shopping cart drawer and bundle pricing",
      expectedSlug: "ecommerce",
      mustInclude: ["Add to Bag", "Aurelia Goods Storefront"],
      mustExclude: ["Uganda", "Kyoto"],
    },
    {
      name: "Dental & Medical Clinic",
      prompt: "Create a dental clinic and healthcare website with online appointment scheduling and light theme",
      expectedSlug: "healthcare",
      mustInclude: ["Appointment", "Meridian Care", "F8FAFC"],
      mustExclude: ["Uganda"],
    },
    {
      name: "Real Estate Marketplace",
      prompt: "Build a real estate marketplace website with PostGIS property search and mortgage calculator",
      expectedSlug: "real-estate",
      mustInclude: ["postgis", "HarborStone", "Monthly Payment"],
      mustExclude: ["Uganda"],
    },
    {
      name: "SaaS Analytics",
      prompt: "Design a B2B SaaS analytics platform website with enterprise RBAC and seat pricing calculator",
      expectedSlug: "saas-products",
      mustInclude: ["MetricFlow", "RBAC", "Active Team Seats"],
      mustExclude: ["Uganda"],
    },
    {
      name: "Artisan Bakery",
      prompt: "Create an artisan bakery and cafe website with menu filters, catering estimator, and reservations",
      expectedSlug: "hospitality",
      mustInclude: ["Hearth", "Croissant", "Reserve Table"],
      mustExclude: ["Uganda"],
    },
  ];

  for (const sc of scenarios) {
    const res = await generateForgeProject({
      prompt: sc.prompt,
      persist: false,
      useAi: false,
    });
    assert.equal(res.category.slug, sc.expectedSlug, `Scenario ${sc.name} category mismatch`);
    assert.equal(res.qaSecurity.passedAll, true, `Scenario ${sc.name} failed QA/SAST/WCAG: ${JSON.stringify(res.qaSecurity)}`);
    const html = res.files["index.html"] || "";
    const sql = res.files["migrations/0001_init.sql"] || "";
    const tsx = res.files["src/App.tsx"] || "";

    assert.ok(html.includes("<svg"), `${sc.name} missing inline SVG artwork`);
    assert.ok(html.includes("itemModalBackdrop"), `${sc.name} missing interactive modal`);
    assert.ok(html.includes("unitsSlider"), `${sc.name} missing interactive calculator`);
    assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS"), `${sc.name} missing SQL DDL`);
    assert.ok(tsx.includes("useState"), `${sc.name} missing React interactivity`);
    assert.ok(!/\beval\s*\(|new\s+Function\s*\(/i.test(html), `${sc.name} has forbidden eval/Function`);

    const hay = `${html}\n${sql}\n${tsx}`;
    for (const token of sc.mustInclude) {
      assert.ok(hay.includes(token), `${sc.name} expected to include "${token}"`);
    }
    for (const bad of sc.mustExclude) {
      assert.ok(!hay.includes(bad), `${sc.name} unexpectedly included "${bad}"`);
    }
  }
});

test("editForgeProjectConversationally updates theme mode, entities, multilingual, and restores cleanly", async () => {
  const gen = await generateForgeProject({
    prompt: "Build a worldwide travel booking portal",
    persist: true,
    useAi: false,
  });

  const edit1 = await editForgeProjectConversationally({
    projectId: gen.projectId,
    instruction: "Switch to light mode editorial theme with emerald green palette, multilingual EN/ES/FR switcher, and add table traveler_reviews",
    useAi: false,
  });
  assert.equal(edit1.ok, true);
  assert.equal(edit1.revisionNumber, 2);
  assert.ok(edit1.entities.includes("traveler_reviews"));
  assert.equal(edit1.qaSecurity.passedAll, true);
  const htmlRev2 = edit1.files["index.html"] || "";
  assert.ok(htmlRev2.includes("#F8FAFC"), "Expected light mode background #F8FAFC");
  assert.ok(htmlRev2.includes("#047857"), "Expected WCAG-compliant light emerald accent #047857");
  assert.ok(htmlRev2.includes('id="langSelect"'), "Expected multilingual EN/ES/FR selector");
  assert.ok((edit1.files["migrations/0001_init.sql"] || "").includes("app_traveler_reviews"));

  const restored = await restoreForgeProjectRevision(gen.projectId, 1);
  assert.equal(restored.ok, true);
  assert.equal(restored.newRevisionNumber, 3);
  assert.ok((restored.files["index.html"] || "").includes("#090D16"), "Expected restored dark mode from Rev #1");
});

test("webPageBuilderGadget generates tailored websites universally and ignores non-website prompts", async () => {
  const bakeryOut = await webPageBuilderGadget(
    "Build a modern artisan bakery and coffee shop website with online menu filtering and table reservations",
  );
  assert.ok(bakeryOut && bakeryOut.includes("```html"), "Expected runnable HTML preview for bakery");
  assert.ok(bakeryOut!.includes("Hospitality"), "Expected Hospitality category");
  assert.ok(!bakeryOut!.includes("Uganda"), "Must never hardcode Uganda");

  const realEstateOut = await webPageBuilderGadget(
    "Design a modern real estate listing website with interactive property filters and mortgage calculator",
  );
  assert.ok(realEstateOut && realEstateOut.includes("Real estate"), "Expected Real estate category");
  assert.ok(realEstateOut!.includes("PostGIS spatial indexing enabled"), "Expected PostGIS annotation");

  const tourWorldOut = await webPageBuilderGadget(
    "Build a worldwide travel booking website with safari tours, city guides, and interactive planner",
  );
  assert.ok(tourWorldOut && tourWorldOut.includes("Kyoto"), "Expected global travel cards");
  assert.ok(!tourWorldOut!.includes("Uganda"), "Worldwide travel site must not default to Uganda");

  // Non-website queries must return null so chat LLM / specialists handle them normally
  const nonWebPrompts = [
    "Outline the PostgreSQL + PostGIS schema and core booking flow for our travel platform.",
    "Write a Python binary search function with unit tests.",
    "Explain how mutual TLS (mTLS) authenticates client and server.",
    "Write a React component for a hotel search bar.",
  ];
  for (const q of nonWebPrompts) {
    const res = await webPageBuilderGadget(q);
    assert.equal(res, null, `Expected webPageBuilderGadget to return null for "${q}"`);
  }
});
