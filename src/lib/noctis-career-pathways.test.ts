import test from "node:test";
import assert from "node:assert/strict";
import { allPathways, CAREER_COUNT, getPathway, matchProfessions, validatePathway } from "./noctis-career-pathways.ts";
import { handleNaturalCareerQuery, isCareerPathwayQuery } from "./noctis-career-query.ts";

test("repository covers all 197 professions with complete records", () => {
  assert.equal(CAREER_COUNT, 197);
  const all = allPathways();
  assert.equal(all.length, 197);
  const bad: string[] = [];
  for (const r of all) {
    if (r.starting_point) continue;
    const e = validatePathway(r);
    if (e.length) bad.push(`${r.profession_id}: ${e.join(", ")}`);
  }
  assert.deepEqual(bad, []);
  for (const r of all) {
    assert.ok(r.steps.length >= 3, r.profession_id);
    assert.ok(r.disclaimer && r.related_job_keywords.length && r.resume_tips.length && r.resources.length, r.profession_id);
  }
});

test("every profession resolves from its own title and id", () => {
  for (const r of allPathways()) {
    const m = matchProfessions(r.title, 1)[0];
    assert.ok(m, r.profession_id);
    const own = getPathway(m.profession_id)!;
    assert.equal(own.profession_id, r.profession_id, `${r.profession_id} -> ${m.profession_id}`);
  }
});

test("common questions route to the right profession", () => {
  const cases: Array<[string, RegExp]> = [
    ["How do I become a carpenter?", /Master Carpenter/],
    ["how to become an electrician", /Electrician/i],
    ["What does it take to be a nurse?", /Nurse/i],
    ["Path to becoming a solar installer", /Solar/i],
    ["How can I become a lawyer", /Lawyer|Litigation/i],
    ["How do I become a dentist?", /Dentist/i],
    ["How do I become a truck driver", /Truck Driver|CDL/i],
    ["How do I become a barber?", /Barber/i],
    ["I want to become a software developer", /Software/i],
    ["How do I become a veteran-to-civilian", /./],
  ];
  for (const [q, re] of cases) {
    const out = handleNaturalCareerQuery(q);
    assert.ok(out, q);
    assert.match(out!, re, q);
    assert.match(out!, /Step-by-step pathway/);
    assert.match(out!, /Related jobs/);
    assert.match(out!, /Resume Prep/);
    assert.match(out!, /Resources & contacts/);
  }
});

test("works when ConnectLn wraps the question", () => {
  const out = handleNaturalCareerQuery("Facts about ConnectLn...\n\nQuestion: How do I become a plumber?");
  assert.ok(out);
  assert.match(out!, /Plumber/);
});

test("does not hijack unrelated questions", () => {
  for (const q of [
    "What is CVSS and how does it relate to EPSS?",
    "How do I become compliant with PCI DSS?",
    "How do I post a job on ConnectLn?",
    "Explain the Verification Queue",
    "become",
  ]) {
    assert.equal(isCareerPathwayQuery(q), false, q);
    assert.equal(handleNaturalCareerQuery(q), null, q);
  }
});

test("starting-point profiles get transition guidance", () => {
  const out = handleNaturalCareerQuery("How do I become a career changer?");
  assert.ok(out);
  assert.match(out!, /transferable skills/i);
});
