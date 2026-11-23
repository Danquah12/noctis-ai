import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildContextualFollowUps } from "./noctis-followups.ts";

const OLD_STATIC_LABELS = [
  "What else should we add?",
  "Draw the architecture",
  "Expand point 3",
  "Calculate implementation cost",
  "Compare alternatives",
  "Simpler",
];

const JLO_ANSWER = `
<think>
The user asked to explain the text about Jennifer Lopez's 2002 album rollout and Tommy Mottola leaking the lead single. Let's structure the background, table, and conclusion clearly.
</think>

### Album Background and Production

The text describes how Jennifer Lopez created her 2002 album while experiencing intense media attention due to her high-profile relationship with actor Ben Affleck. Affleck served as the primary inspiration for the music, and Lopez dedicated the entire record to him.

Although the album was originally scheduled for release the following year, its timeline changed abruptly. The head of Sony Music Entertainment, Tommy Mottola, purposely leaked the lead single, "Jenny from the Block," which forced Epic Records to rush the official release forward to November 25, 2002.

| Feature | Initial Plan | Actual Execution |
| --- | --- | --- |
| Release Timeline | Scheduled for release in 2003 | Released early on November 25, 2002 |
| Release Catalyst | Standard label scheduling | Intentional leak of the lead single |

For example, the track "Jenny from the Block" is a concrete example of a lead single whose premature leak by label executives successfully forced an accelerated rollout and heightened media frenzy.

Claim standing: Verified
Sources
- User prompt
Confidence
High
`;

describe("buildContextualFollowUps", () => {
  it("generates music/release follow-ups for the J.Lo 2002 album screenshot with 'Explain this to me.'", () => {
    const pills = buildContextualFollowUps("Explain this to me.", JLO_ANSWER, { desk: "chat" });
    assert.ok(pills.length >= 4 && pills.length <= 5, `expected 4-5 pills, got ${pills.length}`);

    const labels = pills.map((p) => p.label);
    const joined = labels.join(" | ");
    for (const staticLabel of OLD_STATIC_LABELS) {
      assert.ok(!labels.includes(staticLabel), `unexpected static label: ${staticLabel}`);
    }

    assert.ok(joined.includes('More on "Jenny from the Block"'), `expected Jenny from the Block pill in: ${joined}`);
    assert.ok(joined.includes("Initial Plan vs Actual Execution"), `expected table comparison pill in: ${joined}`);
    assert.ok(
      pills.some((p) => /Jenny from the Block|Ben Affleck|Tommy Mottola|Epic Records|Jennifer Lopez/i.test(p.label)),
      `expected entity/work pill in: ${joined}`,
    );
    assert.ok(
      pills.some((p) => /Reception & cultural impact|Timeline|Behind the scenes/i.test(p.label)),
      `expected music/timeline pill in: ${joined}`,
    );
    for (const p of pills) {
      assert.ok(!p.ask.toLowerCase().includes("secret"), "must not leak scratchpad");
      assert.ok(!p.label.toLowerCase().includes("claim standing"), "must not leak claim standing");
    }
  });

  it("also produces tailored J.Lo album follow-ups when explicitly prompted by topic", () => {
    const pills = buildContextualFollowUps("Tell me about Jennifer Lopez's 2002 album", JLO_ANSWER, { desk: "chat" });
    const labels = pills.map((p) => p.label);
    for (const staticLabel of OLD_STATIC_LABELS) {
      assert.ok(!labels.includes(staticLabel), `unexpected static label: ${staticLabel}`);
    }
    assert.ok(labels.some((l) => l.includes("Jenny from the Block")));
    assert.ok(labels.some((l) => l.includes("Initial Plan vs Actual Execution")));
  });

  it("returns CVE detection, containment, and ATT&CK follow-ups for cybersecurity CVE responses", () => {
    const answer = `
### CVE-2024-3400 Assessment

CVE-2024-3400 is a critical command injection vulnerability in Palo Alto Networks PAN-OS GlobalProtect gateway configurations allowing unauthenticated remote root execution.

1. **Immediate Mitigation**: Enable Threat ID 95187 or disable telemetry if unpatched.
2. **Telemetry Hunting**: Audit web server error logs and unexpected cron jobs.
`;
    const pills = buildContextualFollowUps("Investigate CVE-2024-3400 PAN-OS exploit", answer);
    const labels = pills.map((p) => p.label).join(" | ");
    assert.ok(labels.includes("Detection rules for CVE-2024-3400"), `got: ${labels}`);
    assert.ok(labels.includes("Patching & containment steps"), `got: ${labels}`);
    assert.ok(labels.includes("MITRE ATT&CK & blast radius"), `got: ${labels}`);
    assert.ok(pills.every((p) => p.label !== "Calculate implementation cost"));
  });

  it("returns clinical follow-ups for septic shock / AKI / norepinephrine medical responses", () => {
    const answer = `
### Hemodynamic Stabilization in Septic Shock with AKI

For a 68-year-old patient presenting with septic shock and acute kidney injury (AKI, creatinine 2.9 mg/dL, lactate 4.6 mmol/L), titrate norepinephrine to maintain MAP >= 65 mmHg after balanced crystalloid resuscitation and administer broad-spectrum empiric antibiotics within 1 hour.
`;
    const pills = buildContextualFollowUps("Manage septic shock with AKI on norepinephrine", answer);
    const labels = pills.map((p) => p.label);
    assert.ok(labels.includes("Differentials & key workup"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Red flags & monitoring plan"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Dosing & contraindications"), `got: ${labels.join(", ")}`);
    assert.ok(!labels.includes("Draw the architecture"));
    assert.ok(!labels.includes("Calculate implementation cost"));
  });

  it("returns Python testing, security review, and architecture follow-ups when response includes fenced python code", () => {
    const answer = `
Here is a sliding-window rate limiter service in Python using Redis pipelines:

\`\`\`python
def allow_request(redis_client, key: str, limit: int) -> bool:
    count = redis_client.incr(key)
    return count <= limit
\`\`\`

Deploy this microservice behind the API gateway with low-latency connection pooling.
`;
    const pills = buildContextualFollowUps("Build a Redis rate limiter endpoint in Python", answer);
    const labels = pills.map((p) => p.label);
    assert.ok(labels.includes("Add Python tests & edge cases"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Security & error handling review"), `got: ${labels.join(", ")}`);
    assert.ok(
      pills.some((p) => /^Diagram .* architecture$/i.test(p.label) || p.label === "Failure modes & scaling limits"),
      `got: ${labels.join(", ")}`,
    );
  });

  it("returns valuation scenario and benchmark follow-ups for finance responses", () => {
    const answer = `
### Discounted Cash Flow Valuation

Using a WACC of 9.2% and terminal FCF growth of 2.5%, enterprise value implies 11.4x forward EBITDA. Sensitivity to capital expenditure and working capital assumptions drives equity value per share.
`;
    const pills = buildContextualFollowUps("Calculate WACC and DCF free cash flow valuation", answer);
    const labels = pills.map((p) => p.label);
    assert.ok(labels.includes("Bull, base & bear scenarios"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Peer & benchmark comparison"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Tax & liquidity considerations"), `got: ${labels.join(", ")}`);
  });

  it("returns legal redline, jurisdiction, and checklist follow-ups for NDA/non-compete responses", () => {
    const answer = `
### Enforceability Review

Under state non-compete statute and contract precedent, an overly broad two-year covenant in an NDA agreement without geographic tailoring risks invalidation by a court under governing law.
`;
    const pills = buildContextualFollowUps("Review the NDA non-compete clause risks", answer);
    const labels = pills.map((p) => p.label);
    assert.ok(labels.includes("Key risks & redline options"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Exceptions & jurisdiction rules"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Actionable compliance checklist"), `got: ${labels.join(", ")}`);
  });

  it("returns scripture context, original-language study, and cross-references for John 3:16", () => {
    const answer = `
John 3:16 summarizes the Gospel message spoken during Jesus's night conversation with Nicodemus in Jerusalem, centering on covenantal love and eternal life in the New Testament.
`;
    const pills = buildContextualFollowUps("What does John 3:16 say?", answer);
    const labels = pills.map((p) => p.label);
    assert.ok(labels.includes("Historical & chapter context"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Original-language word study"), `got: ${labels.join(", ")}`);
    assert.ok(labels.includes("Cross-references & parallels"), `got: ${labels.join(", ")}`);
  });

  it("anchors multi-turn deictic follow-ups like 'Tell me more' to priorQuestion CRISPR topic", () => {
    const answer = `
In CRISPR-Cas9 systems, a guide RNA directs the Cas9 endonuclease enzyme to a target DNA sequence next to a PAM motif, inducing a precise double-strand break repaired by host cellular pathways.
`;
    const pills = buildContextualFollowUps("Tell me more", answer, {
      priorQuestion: "How does CRISPR gene editing work?",
    });
    assert.ok(pills.length >= 4, `expected >= 4 pills, got ${pills.length}`);
    const joinedAsks = pills.map((p) => p.ask).join(" ");
    assert.ok(joinedAsks.toLowerCase().includes("crispr"), `got: ${joinedAsks}`);
    assert.ok(pills.some((p) => p.label === "Step-by-step mechanism"));
    assert.ok(pills.every((p) => p.label.toLowerCase() !== "tell me more"));
  });

  it("returns an empty array for empty, very short, or error responses", () => {
    assert.deepEqual(buildContextualFollowUps("Hi", ""), []);
    assert.deepEqual(buildContextualFollowUps("Hi", "Too short."), []);
    assert.deepEqual(buildContextualFollowUps("Test", "Noctis did not get an answer back."), []);
  });

  it("strips <think> reasoning blocks and Claim standing/Sources footers from pill extraction", () => {
    const poisoned = `
<think>
Internal scratchpad quoting "Secret Internal Token" and mentioning | Fake Header | Column A | Column B |.
Do not expose Claim standing details.
</think>

Solar photovoltaic panels convert sunlight directly into direct-current electricity through semiconductor silicon cells before an inverter feeds alternating current to the building grid.

Claim standing: Verified
Sources
- NREL handbook
Confidence
High
`;
    const pills = buildContextualFollowUps("How do solar panels generate electricity?", poisoned);
    const allText = pills.map((p) => `${p.label} ${p.ask}`).join(" ");
    assert.ok(!allText.includes("Secret Internal Token"));
    assert.ok(!allText.includes("Fake Header"));
    assert.ok(!allText.includes("Claim standing"));
    assert.ok(!allText.includes("NREL handbook"));
  });

  it("strips 'Explain ' verb prefix cleanly and never emits 'Is Me... Then' or IR pills on mTLS architecture questions", () => {
    const jloPrompt =
      "Explain Jennifer Lopez's 2002 album This Is Me... Then and how Tommy Mottola leaking Jenny from the Block rushed the November 25, 2002 release.";
    const jloPills = buildContextualFollowUps(jloPrompt, JLO_ANSWER, { desk: "chat" });
    const jloText = jloPills.map((p) => p.label).join(" | ");
    assert.ok(!jloText.includes("Timeline of Explain"), `leaked Explain prefix: ${jloText}`);
    assert.ok(!/\bIs Me\.\.\./.test(jloText), `leaked broken title fragment: ${jloText}`);
    assert.ok(!/Affleck\. Affleck/.test(jloText), `sentence-spanning entity leak: ${jloText}`);
    assert.ok(
      !/'s(?:\s+\d{4})?$/.test(jloPills.find((p) => p.label.startsWith("Timeline of "))?.label || ""),
      `dangling possessive: ${jloText}`,
    );

    const mtlsAnswer = `
### How Mutual TLS (mTLS) Secures Microservices

Unlike standard TLS, mTLS protects against unauthorized access and lateral compromise if a container vulnerability exists inside the cluster.

1. **Initiation (Client Hello)**: The calling Client Service initiates a handshake with Server Service.
2. **Server Presentation**: Server Service presents its TLS certificate and requests the client's certificate.
3. **Certificate Validation**: Both services verify identities via an automated internal CA (HashiCorp Vault or cert-manager) managed by Istio or Linkerd.
`;
    const mtlsPills = buildContextualFollowUps(
      "Explain how mTLS protects service-to-service traffic in microservices",
      mtlsAnswer,
      { desk: "chat" },
    );
    const mtlsLabels = mtlsPills.map((p) => p.label);
    const mtlsText = mtlsLabels.join(" | ");
    assert.ok(
      mtlsLabels.includes("Cert rotation & PKI setup") || mtlsLabels.includes("Failure modes & scaling limits"),
      `got: ${mtlsText}`,
    );
    assert.ok(mtlsLabels.some((l) => /^Diagram mTLS\b/.test(l)), `got: ${mtlsText}`);
    assert.ok(!mtlsText.includes("How Mutual TLS"), `question-word entity leaked: ${mtlsText}`);
    assert.ok(!mtlsLabels.includes("Patching & containment steps"));
  });

  it("never emits split 'MITRE ATT & ATT&CK', dangling 'FedRAMP Rev', or generic 'Executive Summary ... vs' follow-up pills on RMF responses", () => {
    const rmfAnswer = `
<think>
Verified AC-13 withdrawn -> AC-2, AU-6. FIPS 199 High-Water Mark = HIGH.
</think>

## 1. Executive Summary & Facts vs. Estimates

Under NIST SP 800-53 Rev. 5 and FedRAMP Rev. 5, **AC-13** is **WITHDRAWN** and incorporated into **AC-2** and **AU-6**. While AU-6 has no direct CTID mitigation edge in MITRE ATT&CK v16.1, related controls mitigate persistence and defense evasion.

## 2. FIPS 199 High-Water Mark

- **Deterministic Rule Engine Result:** HIGH

## 4. Governance & Assessment Notice

Final ATO decisions rest with the designated Authorizing Official (AO).

---
**Deterministic RMF Verification** · NIST SP 800-53/53A Rev. 5.2.0 · SP 800-53B · SP 800-171 Rev. 3 · CSF 2.0 · MITRE ATT&CK v16.1 · Verified IDs: \`AC-13, AU-6, AC-2, AC-3, AC-6\` · DB SHA-256: \`4be01b579828\`
`;
    const pills = buildContextualFollowUps(
      "What is NIST SP 800-53 Rev. 5 control AC-13, how does AU-6 map to MITRE ATT&CK and CSF 2.0, and what is the FIPS 199 High-Water Mark for Confidentiality=MODERATE, Integrity=HIGH, Availability=LOW?",
      rmfAnswer,
      { desk: "chat" },
    );
    const labels = pills.map((p) => p.label);
    const joined = labels.join(" | ");
    assert.ok(!joined.includes("MITRE ATT & ATT&CK"), `broken ATT&CK split: ${joined}`);
    assert.ok(!/\bMITRE ATT\b(?!&CK)/.test(joined), `truncated MITRE ATT token: ${joined}`);
    assert.ok(!/\bFedRAMP Rev\b/i.test(joined), `dangling FedRAMP Rev token: ${joined}`);
    assert.ok(!labels.some((l) => /\bvs\.?$/i.test(l)), `label ends awkwardly on 'vs': ${joined}`);
    assert.ok(!joined.includes("Executive Summary"), `leaked generic Executive Summary heading: ${joined}`);
    assert.ok(labels.includes("800-53A Examine, Interview & Test"), `expected rmf_grc pills in: ${joined}`);
    assert.ok(labels.includes("FedRAMP High ODPs & POA&M SLAs"), `expected rmf_grc pills in: ${joined}`);
  });

  it("strips leading sentence-count formatting qualifiers like 'In 2 concise sentences,' cleanly", () => {
    const answer =
      "Mutual TLS (mTLS) authenticates both the client and server by requiring each party to present a valid X.509 digital certificate issued by a trusted Certificate Authority (CA) during the TLS handshake.";
    const pills = buildContextualFollowUps(
      "In 2 concise sentences, explain how mutual TLS (mTLS) authenticates both client and server.",
      answer,
      { desk: "chat" },
    );
    const joined = pills.map((p) => `${p.label} :: ${p.ask}`).join(" | ");
    assert.ok(!/In 2 concise sentences/i.test(joined), `leaked formatting prefix: ${joined}`);
    assert.ok(/mutual TLS \(mTLS\)/i.test(joined), `expected mTLS subject in: ${joined}`);
  });
});
