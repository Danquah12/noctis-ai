import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OFFICIAL_COUNCIL_MEMBERS,
  COUNCIL_PRESETS,
  getAllAvailableCouncilMembers,
  runCouncilDeliberation,
  formatCouncilDossierMarkdown,
} from "./noctis-council.ts";

describe("Noctis Council of Engines", () => {
  it("provides all official council members and presets", () => {
    assert.equal(OFFICIAL_COUNCIL_MEMBERS.length, 5);
    assert.ok(COUNCIL_PRESETS.length >= 4);

    const cfo = OFFICIAL_COUNCIL_MEMBERS.find((m) => m.id === "inv-cfo");
    assert.ok(cfo);
    assert.equal(cfo.domain, "finance");

    const cyber = OFFICIAL_COUNCIL_MEMBERS.find((m) => m.id === "cyber-hunter");
    assert.ok(cyber);
    assert.equal(cyber.domain, "security");
  });

  it("retrieves available members gracefully in node environment", () => {
    const members = getAllAvailableCouncilMembers();
    assert.ok(members.length >= 5);
  });

  it("executes multi-agent debate and synthesizes consensus score and directives", () => {
    const topic = "Acquiring a cloud security SaaS vendor with $45M ARR and unpatched CVE-2024-3400 exposure.";
    const session = runCouncilDeliberation(topic, ["inv-cfo", "cyber-hunter", "ethics-arbiter"]);

    assert.ok(session.id.startsWith("council-"));
    assert.equal(session.members.length, 3);
    assert.ok(session.turns.length >= 4);
    assert.ok(session.consensus.consensusScore > 0);
    assert.ok(session.consensus.unanimousAgreements.length > 0);
    assert.ok(session.consensus.bindingDirectives.length > 0);
  });

  it("formats an audited Markdown dossier with table and dissent matrix", () => {
    const session = runCouncilDeliberation("Should we expand hospital beds under current debt terms?", [
      "inv-cfo",
      "health-chief",
    ]);
    const markdown = formatCouncilDossierMarkdown(session);

    assert.ok(markdown.includes("# Noctis Council of Engines"));
    assert.ok(markdown.includes("Consensus Alignment Index:"));
    assert.ok(markdown.includes("Formal Consensus Determination & Dissent Matrix"));
    assert.ok(markdown.includes("Unanimous Findings"));
    assert.ok(markdown.includes("Binding Action Directives"));
  });
});
