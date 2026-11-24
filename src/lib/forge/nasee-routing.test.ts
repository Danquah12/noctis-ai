import test from "node:test";
import assert from "node:assert/strict";
import { vibeReply } from "../noctis-desk.server.ts";

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
});
