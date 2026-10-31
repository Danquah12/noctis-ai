/**
 * Noctis Council of Engines (Multi-Agent Debate & Consensus Studio)
 * Orchestrates multi-disciplinary deliberative consensus across Noctis specialist engines:
 * Investment/Valuation (INV-ENG), Cyber Exploitability (CYBER-ENG), Clinical (HEALTH-LIVE),
 * Infrastructure/BIM (BIM-STRUCT), and Ethics & Governance (ETHICS-001).
 */

import { getCustomAgents } from "./noctis-custom-agents";

export interface CouncilMember {
  id: string;
  name: string;
  role: string;
  engineId: string;
  avatarEmoji: string;
  color: string;
  domain: "finance" | "security" | "clinical" | "infrastructure" | "ethics" | "custom";
  corePrinciple: string;
}

export interface CouncilPreset {
  id: string;
  title: string;
  description: string;
  memberIds: string[];
  defaultQuestion: string;
  badge: string;
}

export interface CouncilDebateTurn {
  speakerId: string;
  speakerName: string;
  speakerRole: string;
  speakerAvatar: string;
  speakerColor: string;
  round: "opening" | "challenge" | "rebuttal" | "synthesis";
  content: string;
  keyMetricOrCitation?: string;
  riskRating: "low" | "medium" | "high" | "critical";
}

export interface CouncilConsensus {
  consensusScore: number; // 0 to 100%
  verdict: "APPROVED" | "CONDITIONAL_APPROVAL" | "ESCALATE_AND_STALL" | "REJECTED";
  verdictSummary: string;
  unanimousAgreements: string[];
  activeDissents: {
    engineId: string;
    engineName: string;
    concern: string;
  }[];
  bindingDirectives: string[];
}

export interface CouncilSession {
  id: string;
  title: string;
  topic: string;
  members: CouncilMember[];
  turns: CouncilDebateTurn[];
  consensus: CouncilConsensus;
  timestamp: string;
}

export const OFFICIAL_COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: "inv-cfo",
    name: "CFO SaaS Modeler & Forensic Auditor",
    role: "Chief Financial Officer & Valuation Modeler",
    engineId: "INV-ENG-01 / 02 / 03",
    avatarEmoji: "📊",
    color: "#10b981", // Emerald
    domain: "finance",
    corePrinciple: "Cash conversion durability, GAAP-to-Non-GAAP reconciliation, and WACC hurdle rates.",
  },
  {
    id: "cyber-hunter",
    name: "Red Team Threat Hunter",
    role: "Exploitability & Perimeter Defense Lead",
    engineId: "CYBER-ENG-01 / VULN-001",
    avatarEmoji: "🛡️",
    color: "#f43f5e", // Rose
    domain: "security",
    corePrinciple: "Zero-day reachability, CISA KEV active exploitation, and non-destructive PoC verification.",
  },
  {
    id: "health-chief",
    name: "Clinical Protocol & Patient Safety Reviewer",
    role: "Chief Medical Officer",
    engineId: "HEALTH-LIVE-014-R2",
    avatarEmoji: "🩺",
    color: "#06b6d4", // Cyan
    domain: "clinical",
    corePrinciple: "Evidence-grounded triage certainty, diagnostic fail-safes, and patient outcome protection.",
  },
  {
    id: "infra-auditor",
    name: "BIM & Structural Integrity Auditor",
    role: "Systems Architect & Mechanical Auditor",
    engineId: "BIM-STRUCT-01",
    avatarEmoji: "🏗️",
    color: "#f59e0b", // Amber
    domain: "infrastructure",
    corePrinciple: "Single point of failure analysis, system load redundancy, and structural durability margins.",
  },
  {
    id: "ethics-arbiter",
    name: "Fiduciary Stewardship & Ethics Arbiter",
    role: "Governance & Systematic Risk Arbiter",
    engineId: "ETHICS-001 / BIBLE-001",
    avatarEmoji: "⚖️",
    color: "#a855f7", // Purple
    domain: "ethics",
    corePrinciple: "Long-term stakeholder stewardship, moral hazard mitigation, and institutional integrity.",
  },
];

export const COUNCIL_PRESETS: CouncilPreset[] = [
  {
    id: "preset-fintech-ma",
    title: "Fintech & M&A Risk Board",
    description: "Evaluates technology acquisitions, high-growth SaaS assets, and capital deployment against latent cyber liabilities.",
    memberIds: ["inv-cfo", "cyber-hunter", "infra-auditor"],
    defaultQuestion:
      "Evaluate the strategic acquisition of a cloud infrastructure security vendor generating $42M ARR (+35% YoY) with $14M in cash reserves, but carrying unpatched edge perimeter vulnerabilities and significant stock-based compensation dilution.",
    badge: "M&A & Capital Allocation",
  },
  {
    id: "preset-cyber-resilience",
    title: "Enterprise Cyber & Infrastructure Review Board",
    description: "Cross-examines zero-trust perimeter changes, mission-critical server migration, and breach blast radius.",
    memberIds: ["cyber-hunter", "infra-auditor", "ethics-arbiter"],
    defaultQuestion:
      "Assess the immediate migration of critical internal VPN gateways to zero-trust cloud proxies after recent active in-the-wild exploitation of CVE-2024-3400. What is the failover contingency and downtime risk?",
    badge: "Security & Systems",
  },
  {
    id: "preset-health-tech",
    title: "BioTech & Digital Health Governance Council",
    description: "Audits medical AI deployment, clinical diagnostics safety boundaries, and venture capital runway sustainability.",
    memberIds: ["health-chief", "inv-cfo", "ethics-arbiter"],
    defaultQuestion:
      "Should we deploy an autonomous clinical triage assistant in acute care emergency departments given current clinical trial validation data and 18-month venture runway constraints?",
    badge: "Clinical & BioTech",
  },
  {
    id: "preset-council-full",
    title: "Full Council of Five",
    description: "Convenes all five official specialist disciplines for an exhaustive multi-dimensional risk audit.",
    memberIds: ["inv-cfo", "cyber-hunter", "health-chief", "infra-auditor", "ethics-arbiter"],
    defaultQuestion:
      "Conduct a comprehensive enterprise risk audit on deploying autonomous decision-making agents across our operations, evaluating financial ROI, cybersecurity exploitability, regulatory compliance, and governance.",
    badge: "Comprehensive 5-Engine Audit",
  },
];

/**
 * Returns all available council members, combining official members and custom specialist agents.
 */
export function getAllAvailableCouncilMembers(): CouncilMember[] {
  const custom = getCustomAgents().map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    engineId: `CUSTOM-${agent.id.toUpperCase().slice(0, 8)}`,
    avatarEmoji: agent.avatarEmoji || "🤖",
    color: "#6366f1", // Indigo
    domain: "custom" as const,
    corePrinciple: agent.description,
  }));

  return [...OFFICIAL_COUNCIL_MEMBERS, ...custom];
}

/**
 * Deterministically simulates and synthesizes a high-level multi-agent Council Deliberation.
 */
export function runCouncilDeliberation(
  topic: string,
  selectedMemberIds: string[]
): CouncilSession {
  const allMembers = getAllAvailableCouncilMembers();
  const activeMembers = allMembers.filter((m) => selectedMemberIds.includes(m.id));

  // Default to at least the top two members if none or invalid selected
  const council = activeMembers.length >= 2 ? activeMembers : OFFICIAL_COUNCIL_MEMBERS.slice(0, 3);
  const turns: CouncilDebateTurn[] = [];

  const isFinancial = /arr|ebitda|valuation|dcf|acquisition|runway|cash|dilution|margin|m&a/i.test(topic);
  const isSecurity = /cve|exploit|vulnerab|breach|perimeter|hacker|attack|ransomware|patch|cisa/i.test(topic);
  const isHealth = /patient|clinical|medical|hospital|triage|fda|drug|physician/i.test(topic);

  // Round 1: Individual Opening Statements
  for (const member of council) {
    let statement = "";
    let metric = "";
    let risk: CouncilDebateTurn["riskRating"] = "medium";

    if (member.domain === "finance") {
      risk = isFinancial ? "high" : "medium";
      metric = "OCF Margin: +33.9% | Hurdle WACC: 9.60% | SBC Dilution: 8.4%";
      statement = `From the financial research desk (${member.engineId}), the critical question is balance sheet durability and net cash conversion. If recurring revenue expands while operating cash flow lags due to uncollected receivables or escalating warranty reserves, enterprise value compresses sharply under current benchmark Treasury yields (4.28%). We require audited GAAP-to-Non-GAAP reconciliation and terminal value haircut before capital commitment.`;
    } else if (member.domain === "security") {
      risk = isSecurity ? "critical" : "high";
      metric = "CISA KEV: Confirmed | EPSS: 0.976 | CVSS: 10.0 (T1190)";
      statement = `The security engineering engine (${member.engineId}) enforces a zero-trust exploitability gate. Any perimeter appliance or exposed gateway matching KEV advisories with active in-the-wild exploitation represents an existential breach path. Unauthenticated command injection cannot be remediated by commercial indemnities; it requires verified firmware patch provenance and safe canary retesting prior to green-lighting operations.`;
    } else if (member.domain === "clinical") {
      risk = isHealth ? "critical" : "low";
      metric = "Diagnostic Sensitivity: 99.2% | Specificity: 98.4% | Rule-Out Threshold: Zero False-Negatives";
      statement = `Under clinical protocol governance (${member.engineId}), all autonomous or predictive capabilities must preserve the clinical boundary. No operational velocity or cost optimization can compromise the 6 diagnostic checkpoints. Algorithmic outputs must provide explicit primary evidence citations and never emit hallucinations in time-critical emergency scenarios.`;
    } else if (member.domain === "infrastructure") {
      risk = "medium";
      metric = "Redundancy N+1 | Structural Safety Factor: 2.4x | Failover Latency: < 450ms";
      statement = `Reviewing physical and architectural systems (${member.engineId}), single points of failure remain the dominant vulnerability. If failover mechanisms are contingent on a single external network dependency or unvalidated microservice, mechanical resilience drops to zero during a localized disruption. We require isolated multi-zone redundancy and verified disaster simulation.`;
    } else if (member.domain === "ethics") {
      risk = "medium";
      metric = "Stakeholder Alignment Index: 91% | Fiduciary Transparency Gate: 5/5";
      statement = `As ethics and governance arbiter (${member.engineId}), our mandate is long-term stewardship and prevention of systemic moral hazard. Short-term performance incentives that externalize catastrophic tail risks onto end-users, patients, or minority shareholders violate core fiduciary duty. All decisions must stand up to rigorous external audit scrutiny.`;
    } else {
      risk = "medium";
      metric = "Specialist Agent Directives Grounded";
      statement = `Analyzing scenario under ${member.name} parameters: Key priority is maintaining alignment with specified domain constraints (${member.corePrinciple}) while ensuring operational continuity.`;
    }

    turns.push({
      speakerId: member.id,
      speakerName: member.name,
      speakerRole: member.role,
      speakerAvatar: member.avatarEmoji,
      speakerColor: member.color,
      round: "opening",
      content: statement,
      keyMetricOrCitation: metric,
      riskRating: risk,
    });
  }

  // Round 2: Adversarial Cross-Examination & Direct Rebuttal
  if (council.length >= 2) {
    const leadA = council[0];
    const leadB = council[1];

    turns.push({
      speakerId: leadB.id,
      speakerName: leadB.name,
      speakerRole: leadB.role,
      speakerAvatar: leadB.avatarEmoji,
      speakerColor: leadB.color,
      round: "challenge",
      content: `I must challenge ${leadA.name}'s initial posture. Operating assumptions that prioritize standard financial or operational continuity fail to account for the catastrophic downside velocity of latent vulnerabilities. If the perimeter is breached or a regulatory shutdown is triggered, projected cash flows vanish within 48 hours. The valuation or project timeline must absorb immediate remediation holdbacks.`,
      keyMetricOrCitation: "Worst-Case CVaR Tail Loss: -42% of Enterprise Value",
      riskRating: "high",
    });

    turns.push({
      speakerId: leadA.id,
      speakerName: leadA.name,
      speakerRole: leadA.role,
      speakerAvatar: leadA.avatarEmoji,
      speakerColor: leadA.color,
      round: "rebuttal",
      content: `Point accepted in part, but outright stalling is suboptimal. By structuring an escrow contingency (holding back 15–20% of capital pending patch verification and third-party penetration testing) and establishing contractual indemnities, we retain the strategic upside while capping maximum downside loss to verified insurance deductibles.`,
      keyMetricOrCitation: "Escrow Reserve Ratio: 18.5% | Net Risk-Adjusted ROI: +21.4%",
      riskRating: "medium",
    });

    // If 3+ members, add synthesizer remark
    if (council.length >= 3) {
      const arbiter = council[2];
      turns.push({
        speakerId: arbiter.id,
        speakerName: arbiter.name,
        speakerRole: arbiter.role,
        speakerAvatar: arbiter.avatarEmoji,
        speakerColor: arbiter.color,
        round: "synthesis",
        content: `Synthesizing the debate: Both engines identify real constraints. We cannot proceed with business-as-usual, nor should we abandon the initiative out of excessive risk aversion. The correct institutional path is a phased conditional authorization tied to deterministic milestones.`,
        keyMetricOrCitation: "Milestone-Gated Authorization Framework (3 Sequential Gates)",
        riskRating: "low",
      });
    }
  }

  // Consensus Determination
  const hasCritical = turns.some((t) => t.riskRating === "critical");
  const consensusScore = hasCritical ? 68 : 86;
  const verdict: CouncilConsensus["verdict"] = hasCritical
    ? "CONDITIONAL_APPROVAL"
    : "APPROVED";

  const consensus: CouncilConsensus = {
    consensusScore,
    verdict,
    verdictSummary:
      verdict === "CONDITIONAL_APPROVAL"
        ? "The Council conditionally approves advancing the initiative under binding contractual escrows, mandatory vulnerability patch gates, and continuous monitoring."
        : "The Council unreservedly approves advancing the initiative with standard oversight and quarterly risk reconciliation.",
    unanimousAgreements: [
      "All engines agree that unmitigated perimeter vulnerabilities or regulatory blind spots represent unacceptable tail risk.",
      "The underlying strategic upside is economically sound provided cash conversion metrics remain above minimum hurdle rates.",
      "No final disposition or release may occur without deterministic, evidence-grounded retesting.",
    ],
    activeDissents: [
      {
        engineId: council.find((m) => m.domain === "security")?.engineId || "CYBER-ENG-01",
        engineName: council.find((m) => m.domain === "security")?.name || "Red Team Hunter",
        concern:
          "Maintains that financial escrows do not mitigate reputation contagion if active exploitation occurs prior to full patch deployment.",
      },
    ],
    bindingDirectives: [
      "Establish an immediate 15% risk escrow holdback dedicated to vulnerability remediation and independent penetration audit.",
      "Enforce mandatory hotfix verification and firmware integrity checking within a 14-day SLA window.",
      "Submit quarterly financial statement reconciliations comparing GAAP margins against non-cash stock compensation dilution.",
    ],
  };

  return {
    id: `council-${Date.now()}`,
    title: topic.slice(0, 52) + (topic.length > 52 ? "..." : ""),
    topic,
    members: council,
    turns,
    consensus,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Formats a Council session into an audited Markdown Dossier suitable for Canvas or Report export.
 */
export function formatCouncilDossierMarkdown(session: CouncilSession): string {
  return [
    `# Noctis Council of Engines — Deliberative Consensus Dossier`,
    ``,
    `> [!IMPORTANT]`,
    `> **Session ID:** \`${session.id}\` | **Deliberation Date:** ${session.timestamp.slice(0, 10)}`,
    `> **Consensus Alignment Index:** **${session.consensus.consensusScore}%** | **Final Verdict:** **${session.consensus.verdict}**`,
    `> **Participating Engines:** ${session.members.map((m) => `\`${m.name} (${m.engineId})\``).join(", ")}`,
    ``,
    `---`,
    ``,
    `## 1. Deliberation Topic & Mandate`,
    `> "${session.topic}"`,
    ``,
    `---`,
    ``,
    `## 2. Multi-Agent Debate Transcript & Cross-Examination`,
    ``,
    ...session.turns.map(
      (turn) => [
        `### ${turn.speakerAvatar} ${turn.speakerName} — *${turn.speakerRole}* [${turn.round.toUpperCase()}]`,
        `> **Domain Risk Rating:** \`${turn.riskRating.toUpperCase()}\`${turn.keyMetricOrCitation ? ` | **Core Metric:** \`${turn.keyMetricOrCitation}\`` : ""}`,
        ``,
        turn.content,
        ``,
      ].join("\n")
    ),
    `---`,
    ``,
    `## 3. Formal Consensus Determination & Dissent Matrix`,
    ``,
    `| Deliberation Parameter | Council Determination |`,
    `|---|---|`,
    `| **Consensus Score** | **${session.consensus.consensusScore}%** |`,
    `| **Governing Verdict** | **${session.consensus.verdict}** |`,
    `| **Verdict Summary** | ${session.consensus.verdictSummary} |`,
    ``,
    `### Unanimous Findings`,
    ...session.consensus.unanimousAgreements.map((a) => `- ✅ ${a}`),
    ``,
    `### Active Dissenting Viewpoints`,
    ...session.consensus.activeDissents.map(
      (d) => `- ⚠️ **${d.engineName} (${d.engineId}):** ${d.concern}`
    ),
    ``,
    `### Binding Action Directives`,
    ...session.consensus.bindingDirectives.map((b, i) => `${i + 1}. **${b}**`),
  ].join("\n");
}
