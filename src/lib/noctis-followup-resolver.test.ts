import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanAssistantTurnForHistory,
  cleanTurnsForHistory,
  extractAssistantPoints,
  extractCarriedAttachment,
  resolveFollowUpContext,
  type ConversationTurn,
} from "./noctis-followup-resolver.ts";

describe("Noctis Conversational Follow-Up Resolver", () => {
  it("treats standalone Turn 1 and unrelated topic shifts as standalone (not follow-ups)", () => {
    const turn1 = resolveFollowUpContext(
      [{ role: "user", content: "How does mutual TLS (mTLS) authenticate client and server?" }],
      "How does mutual TLS (mTLS) authenticate client and server?",
    );
    assert.equal(turn1.isFollowUp, false);
    assert.equal(turn1.relation, "standalone");
    assert.equal(turn1.topicShiftDetected, false);
    assert.match(turn1.activeSubject, /mutual TLS/i);

    const topicShift = resolveFollowUpContext(
      [
        { role: "user", content: "How does mutual TLS (mTLS) work?" },
        { role: "assistant", content: "mTLS requires both client and server to present valid certificates." },
        { role: "user", content: "What is NIST SP 800-53 control AC-2 and its FedRAMP requirements?" },
      ],
      "What is NIST SP 800-53 control AC-2 and its FedRAMP requirements?",
    );
    assert.equal(topicShift.isFollowUp, false);
    assert.equal(topicShift.relation, "standalone");
    assert.equal(topicShift.topicShiftDetected, true);
    assert.equal(topicShift.activeDomain, "rmf_grc");
  });

  it("resolves pronoun and demonstrative coreferences into standalone retrieval queries", () => {
    const cveFollowUp = resolveFollowUpContext(
      [
        { role: "user", content: "Explain CVE-2024-3400" },
        { role: "assistant", content: "CVE-2024-3400 is a PAN-OS GlobalProtect command injection vulnerability." },
        { role: "user", content: "How do we patch it?" },
      ],
      "How do we patch it?",
    );
    assert.equal(cveFollowUp.isFollowUp, true);
    assert.equal(cveFollowUp.relation, "coreference");
    assert.equal(cveFollowUp.activeDomain, "cve_cyber");
    assert.ok(cveFollowUp.standaloneQuery.includes("CVE-2024-3400"), `got: ${cveFollowUp.standaloneQuery}`);
    assert.match(cveFollowUp.systemContinuityDirective, /CVE-2024-3400/);

    const mtlsCompare = resolveFollowUpContext(
      [
        { role: "user", content: "How does mutual TLS work?" },
        { role: "assistant", content: "Mutual TLS authenticates both client and server during handshake." },
        { role: "user", content: "Compare it with OAuth 2.0" },
      ],
      "Compare it with OAuth 2.0",
    );
    assert.equal(mtlsCompare.isFollowUp, true);
    assert.ok(/mutual TLS/i.test(mtlsCompare.standaloneQuery), `got: ${mtlsCompare.standaloneQuery}`);
    assert.ok(/OAuth 2\.0/i.test(mtlsCompare.standaloneQuery), `got: ${mtlsCompare.standaloneQuery}`);
  });

  it("extracts points strictly after stripping <think> and expands ordinal/step and last references", () => {
    const assistantMsg = [
      "<think>\n1. Internal reasoning step\n2. Check invariants\n</think>",
      "Here is how mTLS works:",
      "1. **Client Hello & Capability Exchange:** Client proposes TLS versions and cipher suites.",
      "2. **Server Certificate & Client Request:** Server sends its X.509 certificate and requests a client cert.",
      "3. **Mutual Chain & OCSP Verification:** Both peers validate chains against the trusted root CA.",
      "---\n**NDKRS Verified Knowledge Grounding** · Citations: `K8S_STIG/V-242376`",
    ].join("\n\n");

    const points = extractAssistantPoints(assistantMsg);
    assert.equal(points.length, 3);
    assert.equal(points[0]!.title, "Client Hello & Capability Exchange");
    assert.equal(points[1]!.title, "Server Certificate & Client Request");
    assert.equal(points[2]!.title, "Mutual Chain & OCSP Verification");

    const step2Res = resolveFollowUpContext(
      [
        { role: "user", content: "Explain mutual TLS (mTLS) in 3 numbered steps." },
        { role: "assistant", content: assistantMsg },
        { role: "user", content: "Expand step 2 and explain what happens if its certificate is revoked." },
      ],
      "Expand step 2 and explain what happens if its certificate is revoked.",
    );
    assert.equal(step2Res.isFollowUp, true);
    assert.equal(step2Res.relation, "point_expansion");
    assert.equal(step2Res.referencedPoint?.index, 2);
    assert.equal(step2Res.referencedPoint?.title, "Server Certificate & Client Request");
    assert.match(step2Res.standaloneQuery, /Server Certificate & Client Request/);
    assert.match(step2Res.systemContinuityDirective, /Point|#2/i);

    const lastRes = resolveFollowUpContext(
      [
        { role: "user", content: "Explain mutual TLS (mTLS) in 3 numbered steps." },
        { role: "assistant", content: assistantMsg },
        { role: "user", content: "Tell me more about the last one" },
      ],
      "Tell me more about the last one",
    );
    assert.equal(lastRes.isFollowUp, true);
    assert.equal(lastRes.relation, "point_expansion");
    assert.equal(lastRes.referencedPoint?.index, 3);
    assert.equal(lastRes.referencedPoint?.title, "Mutual Chain & OCSP Verification");
  });

  it("detects depth/format shifts, what-if parameter shifts, verification challenges, and continuations", () => {
    const base: ConversationTurn[] = [
      { role: "user", content: "How does mutual TLS (mTLS) work?" },
      { role: "assistant", content: "mTLS establishes encrypted bidirectional certificate verification." },
    ];

    const tableShift = resolveFollowUpContext(
      [...base, { role: "user", content: "Now compare it with OAuth 2.0 in a concise 3-row markdown table." }],
      "Now compare it with OAuth 2.0 in a concise 3-row markdown table.",
    );
    assert.equal(tableShift.isFollowUp, true);
    assert.equal(tableShift.relation, "depth_or_format_shift");
    assert.ok(/mutual TLS/i.test(tableShift.standaloneQuery), `got: ${tableShift.standaloneQuery}`);

    const simpleShift = resolveFollowUpContext(
      [...base, { role: "user", content: "Make it simpler" }],
      "Make it simpler",
    );
    assert.equal(simpleShift.isFollowUp, true);
    assert.equal(simpleShift.relation, "depth_or_format_shift");

    const pyExample = resolveFollowUpContext(
      [...base, { role: "user", content: "Write a Python example for it" }],
      "Write a Python example for it",
    );
    assert.equal(pyExample.isFollowUp, true);
    assert.equal(pyExample.relation, "depth_or_format_shift");
    assert.equal(pyExample.activeDomain, "coding");

    const whatIf = resolveFollowUpContext(
      [
        { role: "user", content: "Size an identity deployment for 200 users." },
        { role: "assistant", content: "Estimated architecture for 200 users requires redundant IdPs." },
        { role: "user", content: "What if we have 500 users instead?" },
      ],
      "What if we have 500 users instead?",
    );
    assert.equal(whatIf.isFollowUp, true);
    assert.equal(whatIf.relation, "what_if_parameter_shift");

    const challenge = resolveFollowUpContext(
      [...base, { role: "user", content: "Are you sure? What did we miss?" }],
      "Are you sure? What did we miss?",
    );
    assert.equal(challenge.isFollowUp, true);
    assert.equal(challenge.relation, "verification_or_challenge");

    const cont = resolveFollowUpContext(
      [...base, { role: "user", content: "Go on" }],
      "Go on",
    );
    assert.equal(cont.isFollowUp, true);
    assert.equal(cont.relation, "continuation");
  });

  it("carries uploaded documents across follow-ups and drops them on unrelated topic shifts", () => {
    const docTurns: ConversationTurn[] = [
      {
        role: "user",
        content: "Review this contract\n\n--- vendor-contract.pdf ---\nSection 9: Either party may terminate for convenience with 60 days prior written notice.",
      },
      { role: "assistant", content: "Summary of vendor-contract.pdf provided." },
    ];

    const docFollowUp = resolveFollowUpContext(
      [...docTurns, { role: "user", content: "What does it say about termination?" }],
      "What does it say about termination?",
    );
    assert.equal(docFollowUp.isFollowUp, true);
    assert.equal(docFollowUp.relation, "document_followup");
    assert.equal(docFollowUp.carriedAttachment?.filename, "vendor-contract.pdf");
    assert.match(docFollowUp.carriedAttachment?.content || "", /60 days prior written notice/);

    const carried = extractCarriedAttachment(docTurns);
    assert.equal(carried?.filename, "vendor-contract.pdf");

    const shifted = resolveFollowUpContext(
      [...docTurns, { role: "user", content: "Who won the 2022 FIFA World Cup?" }],
      "Who won the 2022 FIFA World Cup?",
    );
    assert.equal(shifted.isFollowUp, false);
    assert.equal(shifted.topicShiftDetected, true);
    assert.equal(shifted.carriedAttachment, null);
  });

  it("preserves coding, RMF, and DoD/IC domain continuity across follow-ups", () => {
    const codingFollow = resolveFollowUpContext(
      [
        { role: "user", content: "Write a Python function to reverse a linked list." },
        { role: "assistant", content: "```python\ndef reverse_list(head):\n    pass\n```" },
        { role: "user", content: "Add unit tests and edge cases for it" },
      ],
      "Add unit tests and edge cases for it",
    );
    assert.equal(codingFollow.isFollowUp, true);
    assert.equal(codingFollow.activeDomain, "coding");

    const rmfFollow = resolveFollowUpContext(
      [
        { role: "user", content: "Explain NIST SP 800-53 AC-2 requirements." },
        { role: "assistant", content: "AC-2 covers account management across the lifecycle." },
        { role: "user", content: "How do assessors verify those controls?" },
      ],
      "How do assessors verify those controls?",
    );
    assert.equal(rmfFollow.isFollowUp, true);
    assert.equal(rmfFollow.activeDomain, "rmf_grc");

    const dodFollow = resolveFollowUpContext(
      [
        { role: "user", content: "Explain DoDI 8510.01 and DISA STIG V-242376 compliance." },
        { role: "assistant", content: "DoDI 8510.01 governs DoD RMF and STIG V-242376 requires Kubernetes API TLS." },
        { role: "user", content: "What artifacts do we upload to eMASS for it?" },
      ],
      "What artifacts do we upload to eMASS for it?",
    );
    assert.equal(dodFollow.isFollowUp, true);
    assert.equal(dodFollow.activeDomain, "dod_ic");
  });

  it("isolates distinct clinical patients strictly while allowing explicit same-patient follow-ups", () => {
    const patientATurns: ConversationTurn[] = [
      { role: "user", content: "Patient A: 68M, K+ 6.4, Cr 2.2, on lisinopril" },
      { role: "assistant", content: "Acute severe hyperkalemia risk; obtain stat 12-lead ECG and stabilize myocardium." },
    ];

    // New clinical encounter: MUST isolate immediately
    const patientB = resolveFollowUpContext(
      [...patientATurns, { role: "user", content: "Patient B: 42F, BP 88/54, HR 122, fever 38.9" }],
      "Patient B: 42F, BP 88/54, HR 122, fever 38.9",
    );
    assert.equal(patientB.relation, "new_clinical_encounter");
    assert.equal(patientB.shouldIsolateEncounter, true);
    assert.equal(patientB.isFollowUp, false);
    assert.equal(patientB.topicShiftDetected, true);

    // Same-patient follow-up: stays scoped cleanly without fabricating vitals
    const samePatient = resolveFollowUpContext(
      [
        ...patientATurns,
        { role: "user", content: "What if his potassium rises to 7.1 with peaked T waves? Should we hold his lisinopril?" },
      ],
      "What if his potassium rises to 7.1 with peaked T waves? Should we hold his lisinopril?",
    );
    assert.equal(samePatient.relation, "same_patient_followup");
    assert.equal(samePatient.shouldIsolateEncounter, false);
    assert.equal(samePatient.isFollowUp, true);
    assert.equal(samePatient.activeDomain, "clinical");
    assert.match(samePatient.systemContinuityDirective, /SAME active patient/i);
  });

  it("strips hidden <think> envelopes and noisy footers from multi-turn assistant history", () => {
    const raw = [
      "<think>\nPrivate chain of thought step 1\nPrivate chain of thought step 2\n</think>",
      "Mutual TLS verifies both client and server certificates.",
      "---",
      "**NDKRS Verified Knowledge Grounding** · Citations: `K8S_STIG/V-242376` · SHA-256: `4224ec1cb766`",
      "Claim standing: VERIFIED",
    ].join("\n\n");

    const cleaned = cleanAssistantTurnForHistory(raw);
    assert.equal(cleaned, "Mutual TLS verifies both client and server certificates.");
    assert.ok(!cleaned.includes("<think>"));
    assert.ok(!cleaned.includes("NDKRS Verified Knowledge Grounding"));
    assert.ok(!cleaned.includes("Claim standing:"));

    const cleanedTurns = cleanTurnsForHistory([
      { role: "user", content: "How does mTLS work?" },
      { role: "assistant", content: raw },
      { role: "user", content: "Compare it with OAuth 2.0" },
    ]);
    assert.equal(cleanedTurns[1]!.content, "Mutual TLS verifies both client and server certificates.");
  });
});
