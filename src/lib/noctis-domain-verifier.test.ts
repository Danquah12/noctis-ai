import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCyberSastAndDfirDossier,
  computeDeterministicDcfFromPrompt,
  runMultiDomainVerifierSelfTest,
  sanitizeUniversalNoctisMarkdown,
  verifyAndEnrichAutomotiveOutput,
  verifyAndEnrichBibleOutput,
  verifyAndEnrichInvestmentOutput,
  verifyAndEnrichLegalOutput,
} from "./noctis-domain-verifier.server.ts";

describe("Noctis Multi-Domain Neuro-Symbolic Verifier & Universal Formatter", () => {
  it("sanitizes raw LaTeX (\\mathbf, \\frac, \\text, \\rightarrow, \\ge) and table <br> tags while preserving <think> and code fences", () => {
    const raw = [
      "<think>Internal check $x \\ge 1$</think>",
      "",
      "Prose with $\\mathbf{\\$120,000\\text{/year}}$, ratio $\\frac{1 + g_{\\text{AR}}}{1 + g_{\\text{Rev}}} = \\mathbf{2.50\\times}$, threshold $\\ge 65$, and $99\\%$ CVaR plus normal currency $250 to $500.",
      "",
      "| Finding | Outcome |",
      "| :--- | :--- |",
      "| Confirm: Voltage drop<br>Falsify: Normal | Repair $\\rightarrow$ Retest |",
      "",
      "```typescript",
      "const tpl = `$100 and <br> inside code fence`;",
      "```",
    ].join("\n");

    const cleaned = sanitizeUniversalNoctisMarkdown(raw);
    assert.ok(cleaned.startsWith("<think>Internal check $x \\ge 1$</think>"));
    assert.ok(!/\\mathbf|\\frac|\\text|\\rightarrow/.test(cleaned.replace(/<think>[\s\S]*?<\/think>/, "")));
    assert.ok(!/\|[^\n]*<br\s*\/?>/i.test(cleaned));
    assert.ok(cleaned.includes("99% CVaR"));
    assert.ok(cleaned.includes("$250 to $500"));
    assert.ok(cleaned.includes("const tpl = `$100 and <br> inside code fence`;"));
  });

  it("verifies multi-claim Legal IRAC prompts (FAR 52.212-4 Cure Notice + Delaware DGCL 102(b)(7) + FRCP 56 Celotex + APA Loper Bright)", () => {
    const res = verifyAndEnrichLegalOutput(
      "Audit a federal contract default termination under FAR 52.212-4 / FAR 49.607 without a 10-day Cure Notice, a Delaware DGCL 102(b)(7) fiduciary duty of loyalty claim, an FRCP 56 Celotex summary judgment motion, and a Loper Bright APA 5 U.S.C. 706 agency challenge on a Markdown table.",
      "### Legal Advisory",
    );
    assert.equal(res.rulesEvaluated, 4);
    assert.ok(res.verifiedMarkdown.includes("FAR 49.607"));
    assert.ok(res.verifiedMarkdown.includes("Termination for Convenience"));
    assert.ok(res.verifiedMarkdown.includes("8 Del. C. § 102(b)(7)"));
    assert.ok(res.verifiedMarkdown.includes("477 U.S. 317"));
    assert.ok(res.verifiedMarkdown.includes("Loper Bright Enterprises v. Raimondo"));
  });

  it("computes deterministic Gordon Growth DCF terminal value (FCF * (1+g)/(WACC-g)) and working-capital divergence", () => {
    const prompt =
      "Revenue rose 24% while operating cash flow (OCF) declined 18%, accounts receivable jumped 55%, and inventory rose 40%. Compute the DCF terminal value for FCF of $45 million, WACC 10%, and terminal growth 2.5%, and audit under ASC 606.";
    const dcf = computeDeterministicDcfFromPrompt(prompt);
    assert.ok(dcf);
    assert.equal(dcf.fcfMillions, 45);
    assert.equal(dcf.waccPct, 10);
    assert.equal(dcf.terminalGrowthPct, 2.5);
    assert.equal(dcf.terminalValueMillions, 615);

    const res = verifyAndEnrichInvestmentOutput(prompt, "### Investment Dossier");
    assert.ok(res.verifiedMarkdown.includes("$615.00 Million"));
    assert.ok(res.verifiedMarkdown.includes("42 pct pts"));
    assert.ok(res.verifiedMarkdown.includes("1.25x"));
    assert.ok(res.verifiedMarkdown.includes("ASC 606-10-25"));
  });

  it("audits multi-vulnerability SAST / OWASP / DFIR prompts (CWE-89 SQLi, CWE-639 BOLA, CWE-798 JWT, CWE-918 SSRF)", () => {
    const res = buildCyberSastAndDfirDossier(
      "Audit an endpoint vulnerable to SQL injection (CWE-89), Broken Object Level Authorization (BOLA / CWE-639), hardcoded JWT secret (CWE-798), and SSRF to 169.254.169.254 (CWE-918).",
    );
    assert.equal(res.rulesEvaluated, 4);
    assert.ok(res.verifiedMarkdown.includes("CWE-89"));
    assert.ok(res.verifiedMarkdown.includes("CWE-639"));
    assert.ok(res.verifiedMarkdown.includes("CWE-798"));
    assert.ok(res.verifiedMarkdown.includes("CWE-918"));
    assert.ok(res.verifiedMarkdown.includes("T1552.005"));
    assert.ok(res.verifiedMarkdown.includes("getInvoiceForTenantStrict"));
  });

  it("computes OBD-II idle vs 2500 RPM fuel-trim delta and enforces AUTO-AC-018/019 zero premature part condemnation", () => {
    const res = verifyAndEnrichAutomotiveOutput(
      "2019 2.4L gasoline sedan with P0171 and P0300: freeze-frame shows STFT +18% and LTFT +21% at 750 RPM idle, dropping to STFT +2% and LTFT +4% at 2,500 RPM cruise.",
      "### Automotive Report",
    );
    assert.ok(res.verifiedMarkdown.includes("+39%"));
    assert.ok(res.verifiedMarkdown.includes("+6%"));
    assert.ok(res.verifiedMarkdown.includes("Unmetered Air / Intake Vacuum Leak"));
    assert.ok(res.verifiedMarkdown.includes("confirmed_root_cause = null"));
  });

  it("verifies Ephesians 2:8-10 and Genesis 50:20 Greek/Hebrew lexical morphology and passes 5/5 self-test", () => {
    const res = verifyAndEnrichBibleOutput(
      "Provide a historical-grammatical exegesis of Ephesians 2:8-10 and Genesis 50:20 with original Greek and Hebrew lexical terms.",
      "### Bible Exegesis",
    );
    assert.ok(res.verifiedMarkdown.includes("cháriti"));
    assert.ok(res.verifiedMarkdown.includes("poiēma"));
    assert.ok(res.verifiedMarkdown.includes("chashav"));

    const selfTest = runMultiDomainVerifierSelfTest();
    assert.equal(selfTest.passed, selfTest.total);
    assert.equal(selfTest.total, 5);
  });
});
