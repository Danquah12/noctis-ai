import test from "node:test";
import assert from "node:assert/strict";
import { handleNaturalCareerQuery } from "./noctis-career-query.ts";

const cases: Array<[string, string]> = [
  ["How much does a carpenter make?", "Pay & earnings"],
  ["How long does it take to become a registered nurse?", "How long it takes"],
  ["What are the requirements to be an electrician in Ghana?", "Requirements"],
  ["How much does it cost to become a dentist?", "Cost & funding"],
  ["Can I become a plumber without a degree?", "Starting from scratch"],
  ["What skills does a software engineer need?", "Skills & tools"],
  ["What does a paramedic do?", "What the job involves"],
  ["Interview questions for a barista", "Interview preparation"],
  ["Resume tips for a truck driver", "Resume & cover letter"],
  ["Is welding a good career?", "Demand & outlook"],
  ["How do I get promoted as a firefighter?", "Career growth"],
  ["Careers similar to a chef", "Similar careers"],
  ["Where can I train to be a police officer?", "Where to train"],
  ["I'm a mechanic and want to switch to an electrician", "Career switch"],
  ["What jobs are available in Rwanda?", "Careers to explore"],
  ["What careers are good for someone who likes working with animals?", "Careers to explore"],
  ["How do I become a cashier in Kenya?", "How to become"],
  ["Jobs for pilots abroad", "Working in a region"],
  ["Will my nursing degree be recognised in Canada?", "Moving your credentials"],
  ["Are there scholarships for becoming a dentist?", "Funding, scholarships & apprenticeships"],
  ["Paid apprenticeships for plumber", "Funding, scholarships & apprenticeships"],
];

test("career scenario questions route to the right answer", () => {
  for (const [q, topic] of cases) {
    const a = handleNaturalCareerQuery(q);
    assert.ok(a, `no answer: ${q}`);
    assert.ok(a!.includes(`🧭 ${topic}`), `${q} -> ${a!.split("\n")[0]}`);
    assert.ok(a!.includes("Related jobs"), `no related jobs: ${q}`);
  }
});

test("non-career questions are not hijacked", () => {
  for (const q of ["Explain CVSS vs EPSS", "How long does a red team engagement take?", "What are the requirements for PCI DSS?", "How do I use Resume Prep?", "What does the Verification Queue do?"]) {
    assert.equal(handleNaturalCareerQuery(q), null, q);
  }
});
