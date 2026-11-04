import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  interpretHighlightedSnippet,
  generatePlainEnglishCanvas,
} from "./noctis-code-interpreter.ts";

describe("Noctis Code Interpreter & Plain English Canvas Engine", () => {
  const sampleHealthCode = `
    const result = this.inspectInvariants();
    if (result.failed.length > 0) {
      throw new Error(\`Invariant violations: \${result.failed.join(', ')}\`);
    }

    // Defensive deployment simulation
    const endpoint = 'https://noctis-health.internal/v1/health';
    writeFileSync('health-deploy.log', \`Deployed at \${new Date().toISOString()}\\n\`);

    return {
      success: true,
      invariantsPassed: result.passed,
      deployedEndpoint: endpoint,
    };
  `;

  it("interprets pre-flight invariant check snippet into plain English", () => {
    const highlight = "if (result.failed.length > 0) throw new Error(`Invariant violations: ${result.failed.join(', ')}`);";
    const interp = interpretHighlightedSnippet(highlight);
    assert.equal(interp.category, "SAFETY_GATE");
    assert.equal(interp.categoryLabel, "Pre-Flight Safety Check");
    assert.match(interp.plainEnglish, /automated safety circuit-breaker/i);
    assert.ok(interp.analogy.length > 0);
  });

  it("interprets audit writeFileSync snippet into tamper-evident audit record", () => {
    const highlight = "writeFileSync('health-deploy.log', `Deployed at ${new Date().toISOString()}\\n`);";
    const interp = interpretHighlightedSnippet(highlight);
    assert.equal(interp.category, "AUDIT_LOGGING");
    assert.equal(interp.categoryLabel, "Tamper-Evident Audit Record");
    assert.match(interp.plainEnglish, /permanent, timestamped record/i);
  });

  it("interprets internal endpoint into private secure enclave explanation", () => {
    const highlight = "const endpoint = 'https://noctis-health.internal/v1/health';";
    const interp = interpretHighlightedSnippet(highlight);
    assert.equal(interp.category, "SECURITY_ENCLAVE");
    assert.match(interp.plainEnglish, /private, air-gapped network address/i);
  });

  it("interprets return statement into verification certificate", () => {
    const highlight = "return { success: true, invariantsPassed: result.passed, deployedEndpoint: endpoint };";
    const interp = interpretHighlightedSnippet(highlight);
    assert.equal(interp.category, "DATA_MODEL");
    assert.equal(interp.categoryLabel, "Verification Certificate");
  });

  it("generates a complete Plain English Canvas dossier with executive summary and markdown", () => {
    const canvas = generatePlainEnglishCanvas("Inspect architectural invariants and deploy Noctis Health", sampleHealthCode);
    assert.equal(canvas.title, "Inspect architectural invariants and deploy Noctis Health");
    assert.equal(canvas.targetSystem, "Noctis Health & Clinical CDS");
    assert.ok(canvas.executiveSummary.includes("Noctis Health"));
    assert.ok(canvas.laypersonFlow.length >= 3);
    assert.ok(canvas.fullMarkdown.includes("# 📖 Plain English Canvas"));
    assert.ok(canvas.fullMarkdown.includes("## 🎯 Executive Summary"));
    assert.ok(canvas.fullMarkdown.includes("## 🔄 How It Works"));
  });
});
