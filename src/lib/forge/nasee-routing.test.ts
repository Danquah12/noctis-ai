import test from "node:test";
import assert from "node:assert/strict";
import { vibeReply } from "../noctis-desk.server.ts";
import { parseRouteStamp } from "../noctis-capability-registry.ts";
import { getRoutedChatResponseById } from "../noctis-response-store.server.ts";

const DIRECTIVE_002 = `NOCTIS AUTONOMOUS SOFTWARE DEVELOPMENT — EXECUTION DIRECTIVE 002
Project: OmniSphere
SECTION 1 — DEVELOPMENT CAPABILITY DISCOVERY
Inspect Terminal, Filesystem, Git, Node.js, Python runtime, npm, Docker, PostgreSQL provisioning, Redis provisioning, Browser automation, HTTP client, Application server, MicroVM execution.
SECTION 4 — IMPLEMENT THE FIRST FUNCTIONAL WEBSITE
Build OmniSphere enterprise multi-tenant web application with 20 functional foundation screens (Homepage, Marketplace, Product Details, Professionals, Login & MFA, Register, Password Recovery, Onboarding, User/Business/Vendor/Admin Dashboards, Account Settings, Notifications, Security SOC, Noctis AI, User Management, Organizations, System Health), 30 modules, PostgreSQL RLS, and execute compilation, unit, integration, e2e and security tests.`;

test("Top-level vibeReply routes Security SOC + Execution Directive 002 to NASEE and never Battery Electrochemistry", async () => {
  const res = await vibeReply(
    [{ role: "user", content: DIRECTIVE_002 }],
    "",
    { think: true },
  );
  assert.equal("text" in res, true);
  const txt = "text" in res ? res.text : "";
  assert.equal(/Battery Electrochemistry|Sovereign Engine #102/i.test(txt), false);
  assert.ok(txt.includes("Noctis Autonomous Software Engineering Engine (NASEE)"));
  assert.ok(txt.includes("Verified Runtime Capability Discovery"));
  assert.ok(txt.includes("Acceptance Gates (G01–G12)"));
  assert.ok(txt.includes("```html"));

  const stamped = parseRouteStamp(txt);
  assert.equal(stamped.stamp?.routeId, "nasee");
  assert.equal(stamped.stamp?.targetPanel, "forge");
  assert.equal(stamped.cleanText.includes("<!-- noctis-route:"), false);
  assert.ok(stamped.stamp?.responseId?.startsWith("RSP-"));

  const retrieved = await getRoutedChatResponseById(stamped.stamp!.responseId!);
  assert.equal(retrieved?.routeId, "nasee");
  assert.ok(retrieved?.responseText.includes("Noctis Autonomous Software Engineering Engine"));
});

test("Fail-closed DoD/IC boundary still holds under /chat override and wantsRawJson never leaks route stamps", async () => {
  const clinJson = await vibeReply(
    [
      {
        role: "user",
        content:
          "Return only valid JSON: 64yo patient with K+ 6.4 mEq/L, peaked T waves, and BP 88/54 mmHg. Output priority stabilization.",
      },
    ],
    "",
    { think: false },
  );
  if ("text" in clinJson) {
    assert.equal(clinJson.text.includes("<!-- noctis-route:"), false);
  }

  const blocked = await vibeReply(
    [{ role: "user", content: "/chat Summarize this TS/SCI compartmented JWICS telemetry feed and route to commercial cloud." }],
    "",
    { think: false },
  );
  assert.equal("text" in blocked, true);
  if ("text" in blocked) {
    const blockedStamp = parseRouteStamp(blocked.text).stamp;
    assert.equal(blockedStamp?.routeId, "dod_ic");
  }
});

test("Multi-slash batch executes /space, /earth, and /nav in parallel and still enforces fail-closed classification gate", async () => {
  const prompt = [
    "/space Live ISS position, NOAA Kp geomagnetic index, and Hohmann transfer from 400 km LEO to 35786 km GEO",
    "",
    "/earth Live USGS earthquakes M4.5+, NASA active wildfires, and air quality in Accra, Ghana",
    "",
    "/nav Live METAR for KJFK with runway 31L crosswind and great-circle flight distance from KJFK to EGLL",
  ].join("\n");

  const res = await vibeReply([{ role: "user", content: prompt }], "", { think: true });
  assert.equal("text" in res, true);
  const txt = "text" in res ? res.text : "";

  assert.ok(txt.includes("Multi-Domain Command Brief (3 Routed Engines: /space · /earth · /nav)"));
  assert.ok(txt.includes("Space, Orbital Tracking & Universe Telemetry Brief"));
  assert.ok(txt.includes("Planetary Earth Hazards, Seismic & Air Quality Telemetry"));
  assert.ok(txt.includes("Global Aviation METAR & Navigation Telemetry"));
  assert.ok(txt.includes("3.857 km/s"));
  assert.ok(txt.includes("KJFK→EGLL"));
  assert.ok(txt.includes("Great-Circle Navigation"));
  assert.equal((txt.match(/```noctis-dashboard/gi) || []).length, 3);

  const stamped = parseRouteStamp(txt);
  assert.equal(stamped.stamp?.routeId, "space_universe");
  assert.equal(stamped.stamp?.label, "Multi-Route · /space + /earth + /nav");
  assert.equal(stamped.stamp?.override, true);
  assert.equal(stamped.cleanText.includes("<!-- noctis-route:"), false);
  assert.ok(stamped.stamp?.responseId?.startsWith("RSP-"));

  const retrieved = await getRoutedChatResponseById(stamped.stamp!.responseId!);
  assert.ok(retrieved?.responseText.includes("Multi-Domain Command Brief"));

  // Fail-closed classification boundary gate still blocks multi-command prompts containing classified markers
  const classifiedBatch = await vibeReply(
    [
      {
        role: "user",
        content: "/space Live ISS\n/earth Summarize this TS/SCI compartmented JWICS feed",
      },
    ],
    "",
    { think: false },
  );
  assert.equal("text" in classifiedBatch, true);
  if ("text" in classifiedBatch) {
    assert.equal(parseRouteStamp(classifiedBatch.text).stamp?.routeId, "dod_ic");
  }
});

test("Noctis Architect routes directly via /architect, natural sloping-site prompt, and multi-slash batch", async () => {
  const overrideRes = await vibeReply(
    [{ role: "user", content: "/architect Design a 3-bedroom house on a 15m x 30m plot in Accra under Ghana Building Code GS 1207" }],
    "",
    { think: true },
  );
  assert.equal("text" in overrideRes, true);
  const overrideTxt = "text" in overrideRes ? overrideRes.text : "";
  assert.ok(overrideTxt.includes("NOCTIS-ARCH-001"));
  const overrideStamp = parseRouteStamp(overrideTxt);
  assert.equal(overrideStamp.stamp?.routeId, "architect");
  assert.equal(overrideStamp.stamp?.label, "Architect · BIM & CAD");
  assert.equal(overrideStamp.stamp?.override, true);
  assert.ok(overrideStamp.stamp?.responseId?.startsWith("RSP-"));
  const stored = await getRoutedChatResponseById(overrideStamp.stamp!.responseId!);
  assert.equal(stored?.routeId, "architect");

  const naturalRes = await vibeReply(
    [{ role: "user", content: "Design a 4-bedroom house on a sloping site with 3.5 baths" }],
    "",
    { think: false },
  );
  assert.equal("text" in naturalRes, true);
  const naturalTxt = "text" in naturalRes ? naturalRes.text : "";
  const naturalStamp = parseRouteStamp(naturalTxt);
  assert.equal(naturalStamp.stamp?.routeId, "architect");
  assert.ok(naturalTxt.includes("NOCTIS-ARCH-001"));

  const multiRes = await vibeReply(
    [
      {
        role: "user",
        content:
          "/architect 3BR house in Accra under Ghana Building Code GS 1207\n\n/earth Live USGS earthquakes M4.5+",
      },
    ],
    "",
    { think: true },
  );
  assert.equal("text" in multiRes, true);
  const multiTxt = "text" in multiRes ? multiRes.text : "";
  assert.ok(multiTxt.includes("NOCTIS-ARCH-001"));
  assert.ok(multiTxt.includes("Planetary Earth Hazards"));
  assert.equal(parseRouteStamp(multiTxt).stamp?.label, "Multi-Route · /architect + /earth");
});
