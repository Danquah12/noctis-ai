/**
 * NOCTIS-CAREERS-001 scenario answers: salary, cost, timeline, requirements, no-degree routes, skills, day-in-the-life,
 * progression, related careers, resume, interview, outlook, where to train, career switch, compare two careers,
 * region-specific questions and "what careers fit me" searches — all grounded in the pathway repository.
 * No pay figures, fees or contacts are invented; where verified data is not held the answer says so and points to sources.
 */
import { CAREER_PROFESSIONS } from "./noctis-career-professions-data.ts";
import { SOC_MAP } from "./noctis-career-soc-map.ts";
import { OEWS } from "./noctis-career-wages-data.ts";
import { CAREER_REGIONS, type CareerRegion } from "./noctis-career-regions-data.ts";
import { ENCLAVE_TEMPLATES, candidatePhrases, getPathway, norm, type PathwayRecord } from "./noctis-career-pathways.ts";

const CAREER_CUE =
  /\b(career|careers|job|jobs|profession|salary|salaries|wage|wages|pay|paid|earn|earning|earnings|income|become|becoming|work as|working as|training|train|licen[cs]e|licen[cs]ing|certif\w*|degree|diploma|qualif\w*|resume|cv|cover letter|interview|apprentice\w*|hire|hiring|requirements?|day in the life|switch|transition|compare|difference between|good career|worth it|prospects?|demand|outlook|scholarships?|grants?|funding|recogni\w*|equivalen\w*|transfer\w*|foreign|skills?|promot\w*|make|makes|abroad|overseas|does an? [a-z ]{2,30} do|what does)\b/;
const PLATFORM = /\b(connectln|connectin|platform|post a job|resume prep|verification queue|noctis api|this app|the app)\b/;

// ───────── profession detection inside free text ─────────
export interface TextHit { profession_id: string; title: string; score: number; pos: number }

export function findProfessionsInText(text: string, max = 2): TextHit[] {
  const t = ` ${norm(text)} `.replace(/ nursing /g, " nurse ").replace(/ plumbing /g, " plumber ").replace(/ teaching /g, " teacher ").replace(/ carpentry /g, " carpenter ").replace(/ nursing\b/g, " nurse");
  const hits: TextHit[] = [];
  for (const p of CAREER_PROFESSIONS) {
    let best = 0;
    let pos = 1e9;
    for (const ph of candidatePhrases(p)) {
      if (ph.length < 4 || /^(career|careers|coach|work|worker|job|specialist|manager|professional)$/.test(ph)) continue;
      const forms = [ph, ph + "s", ph + "es", ph.replace(/y$/, "ies"), ph.replace(/man$/, "men")];
      for (const f of forms) {
        const i = t.indexOf(` ${f} `);
        if (i >= 0) {
          const score = ph.split(" ").length * 20 + ph.length;
          if (score > best) best = score;
          if (i < pos) pos = i;
        }
      }
    }
    if (best > 0) hits.push({ profession_id: p.id, title: p.title, score: best, pos });
  }
  hits.sort((a, b) => b.score - a.score || a.pos - b.pos);
  const out: TextHit[] = [];
  for (const h of hits) {
    if (out.length >= max) break;
    const rec = getPathway(h.profession_id);
    if (!rec || rec.starting_point) continue;
    out.push(h);
  }
  return out.sort((a, b) => a.pos - b.pos);
}

// ───────── regions ─────────
const REGION_ALIASES: Record<string, string[]> = {
  GB: ["uk", "u k", "britain", "great britain", "england", "scotland", "wales", "northern ireland"],
  US: ["usa", "u s a", "u s", "america", "united states of america", "the states"],
  AE: ["uae", "dubai", "abu dhabi", "emirates", "united arab emirates"],
  KR: ["korea", "south korea"],
  CD: ["drc", "dr congo", "congo kinshasa"],
  CZ: ["czech republic"],
  SZ: ["swaziland"],
  CI: ["ivory coast", "cote d ivoire"],
  CV: ["cape verde"],
  TR: ["turkey", "turkiye"],
  DE: ["deutschland"],
  NL: ["holland"],
  MK: ["macedonia"],
  MM: ["burma"],
  TL: ["east timor"],
  CG: ["congo brazzaville", "republic of the congo"],
  PS: ["gaza", "west bank"],
  HK: ["hong kong"],
};

export function detectRegion(text: string): CareerRegion | null {
  const t = ` ${norm(text)} `.replace(/ nursing /g, " nurse ").replace(/ plumbing /g, " plumber ").replace(/ teaching /g, " teacher ").replace(/ carpentry /g, " carpenter ").replace(/ nursing\b/g, " nurse");
  let best: { r: CareerRegion; len: number } | null = null;
  for (const r of CAREER_REGIONS) {
    const names = [norm(r.name), ...(REGION_ALIASES[r.code] || [])];
    for (const n of names) {
      if (n.length < 3) continue;
      if (t.includes(` ${n} `) && (!best || n.length > best.len)) best = { r, len: n.length };
    }
  }
  return best ? best.r : null;
}

function regionBlock(region: CareerRegion, r?: PathwayRecord): string {
  const L = [`## 🌍 In ${region.name}`];
  L.push(`- **Language:** ${region.primaryLanguage}  ·  **Currency:** ${region.currency}`);
  L.push(`- **Rules are local:** licensing, apprenticeships and pay for ${r ? r.title : "this field"} are set nationally or locally. Contact ${region.name}'s labour ministry, the relevant licensing board or professional body, and a local training provider; ask whether credentials from other countries are recognised.`);
  if (region.hubs.length) L.push(`- **Hubs on ConnectLn:** ${region.hubs.join(", ")} — open **Jobs → Region → ${region.name}** to browse roles there.`);
  L.push(`- Connect with people already working in ${region.name} through ConnectLn **Network** and **Mentorship**.`);
  return L.join("\n");
}

// ───────── helpers ─────────
const head = (topic: string, r: PathwayRecord) => `# 🧭 ${topic}: ${r.title}`;
function foot(r: PathwayRecord, region?: CareerRegion | null, followUps: string[] = []): string {
  const L: string[] = [];
  if (region) L.push("", regionBlock(region, r));
  L.push("", "## 💼 Related jobs to search on ConnectLn", r.related_job_keywords.map((k) => `\`${k}\``).join("  ") + "  — open **Jobs** and search these titles.");
  if (followUps.length) L.push("", "**You can also ask:** " + followUps.map((f) => `_${f}_`).join(" · "));
  L.push("", `_⚠️ ${r.disclaimer}_`);
  return L.join("\n");
}
const short = (r: PathwayRecord) => r.title.replace(/\s*\(.*?\)\s*/g, " ").split(/[,&]/)[0].trim();
const FOLLOW = (r: PathwayRecord) => [`How do I become a ${short(r)}?`, `What skills does a ${short(r)} need?`, `Interview questions for a ${short(r)}`];

// ───────── intent renderers ─────────
function renderRequirements(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Requirements", r),
    `**Route:** ${r.route_type}  ·  **Typical timeline:** ${r.timeline}`,
    "",
    "## 🎓 Credentials, licences & certificates to look for",
    ...r.credentials.map((c) => `- ${c}`),
    "",
    "## ✅ Practical requirements",
    "- Meet the minimum age, education and any legal-work or background-check rules for your location.",
    "- Complete the safety training that employers commonly require in this field.",
    "- Build verifiable experience (hours, projects, supervised work) and keep records of it.",
    "",
    `Want the full plan? Ask: _How do I become a ${short(r)}?_`,
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderTimeline(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("How long it takes", r),
    `**Typical timeline:** ${r.timeline}  ·  **Route:** ${r.route_type}`,
    "",
    "## ⏱️ Where the time goes",
    ...r.steps.filter((s) => s.duration).map((s) => `- **${s.title}:** ${s.duration}`),
    "",
    "**Ways to shorten it:** pick a paid apprenticeship or employer-sponsored route, study part-time while working in an entry role, and start the licence/certification paperwork early.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderCost(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Cost & funding", r),
    "Noctis does not hold verified, current fees for specific schools or exams, so no price figures are quoted here — costs differ widely by country and provider.",
    "",
    "## 💰 What you will typically pay for",
    "- Training or tuition (apprenticeship, vocational school, college or programme)",
    "- Exam, licence and renewal fees",
    "- Tools, uniforms, PPE or software",
    "- Background checks, medicals and insurance where required",
    "",
    "## 🧾 Ways to reduce or avoid cost",
    "- **Earn while you learn:** registered apprenticeships and employer-sponsored trainee roles are paid.",
    "- Ask training providers about **payment plans, scholarships and grants**; check public workforce-development or labour-ministry funding.",
    "- Employer tuition assistance and union or association training funds.",
    "- Veterans, students and career-changers often qualify for special programmes — check locally.",
    "- Compare 2–3 providers and ask for graduation, licence-pass and job-placement rates before paying.",
    "",
    `**Route here:** ${r.route_type}.`,
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function usd(n?: number): string {
  return typeof n === "number" ? `$${Math.round(n).toLocaleString("en-US")}` : "n/a";
}

function wageBlock(r: PathwayRecord, region: CareerRegion | null): string[] {
  const m = SOC_MAP[r.profession_id];
  const w = m ? OEWS[m[0]] : undefined;
  if (region && region.code !== "US") {
    return [
      `Noctis has no verified pay data for ${region.name}, so it won't quote numbers there. Official US figures exist but do not apply outside the United States.`,
      "",
    ];
  }
  if (!m || !w) {
    return [
      "Noctis does not hold verified salary data for this role, so it won't quote numbers it can't stand behind. Pay varies by country, city, employer, experience, licence level and overtime or self-employment.",
      "",
    ];
  }
  const bits = [`**Median:** ${usd(w.median)}/year`];
  if (w.p10 != null && w.p90 != null) bits.push(`**Typical range:** ${usd(w.p10)} (lowest 10%) to ${usd(w.p90)} (top 10%)`);
  if (w.employment != null) bits.push(`**US jobs:** about ${w.employment.toLocaleString("en-US")}`);
  return [
    "## 💵 United States wage data (official)",
    bits.join("  ·  "),
    `_Source: US Bureau of Labor Statistics, Occupational Employment and Wage Statistics, national estimates (data year ${w.year}), occupation: “${m[1]}” (SOC ${m[0].slice(0, 2)}-${m[0].slice(2)}). This is the closest US occupation, not an exact match; figures are for the US only._`,
    "",
    "Pay in other countries differs a lot; ask for a region (for example “in Canada”) to see local guidance.",
    "",
  ];
}

function renderSalary(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Pay & earnings", r),
    ...wageBlock(r, region),
    "## 📊 Where to find reliable figures",
    "- Your national statistics or labour-ministry occupational pay surveys (US: BLS Occupational Outlook Handbook and O*NET OnLine).",
    "- Union or professional-association pay scales.",
    "- Salary bands shown on live listings: open **Jobs** on ConnectLn and search the titles below (listed bands are illustrative, so confirm with the employer).",
    "- Ask people in the role through ConnectLn **Network** or a **Mentor**.",
    "",
    "## 📈 What usually raises pay",
    ...(r.progression.length ? [`- Moving up: ${r.progression.join(" → ")}`] : []),
    "- Extra licences, certifications or specialisations",
    "- Working in higher-demand locations or sectors; taking on supervision or estimating",
    "- Running your own business once you hold the needed licence",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderNoExperience(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Starting from scratch", r),
    `Good news: most people enter this field without prior experience. Realistic first routes: **${r.entry_level_roles.join(", ") || "entry-level trainee roles"}**.`,
    "",
    "## 🚪 If you don't have a degree",
    `- This field's usual route is **${r.route_type}**. Check the credential list below — many are earned through training, apprenticeship or exams rather than a degree.`,
    ...r.credentials.slice(0, 4).map((c) => `- ${c}`),
    "",
    "## 🧭 If you are starting late or from zero",
    "1. Shadow or interview someone in the role this month.",
    "2. Complete the entry safety/foundation course.",
    "3. Apply for a trainee, helper or apprentice position — employers value reliability.",
    "4. Add each course and project to your ConnectLn profile; use **Resume Prep** to present transferable skills.",
    "5. Find a mentor and keep a log of hours/projects for licensing.",
    "",
    "**Free or low-cost starting points:** public libraries, community-college continuing-education, workforce centres, manufacturer or association online courses, and ConnectLn **Learning**.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderSkills(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Skills & tools", r),
    "## 🛠️ Core skills",
    ...(r.skills.length ? r.skills.map((s) => `- ${s}`) : ["- See the step-by-step pathway for the skills built at each stage."]),
    ...(r.tools.length ? ["", "## 🧰 Tools & systems", ...r.tools.map((s) => `- ${s}`)] : []),
    "",
    "## 🌱 How to build them",
    "- Learn on the job through an apprenticeship, trainee role or volunteering.",
    "- Take short courses; keep a portfolio or log of work you can show.",
    "- Practise with real tasks and ask a mentor to review your work.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderDay(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("What the job involves", r),
    `> ${r.summary}`,
    "",
    "## 📋 Typical focus areas",
    ...(r.skills.length ? r.skills.slice(0, 6).map((s) => `- ${s}`) : ["- See skills below."]),
    ...(r.tools.length ? ["", `**Works with:** ${r.tools.join(", ")}`] : []),
    "",
    `**Where people start:** ${r.entry_level_roles.join(", ")}  ·  **Where they go:** ${r.progression.join(" → ")}`,
    "",
    "Tip: confirm the day-to-day by shadowing someone or reading live job descriptions on ConnectLn **Jobs**.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderProgression(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Career growth", r),
    `**Entry:** ${r.entry_level_roles.join(", ")}`,
    `**Progression ladder:** ${r.progression.join(" → ")}`,
    "",
    "## 🪜 How people move up",
    "- Add certifications, licences and specialisations the next level requires.",
    "- Take on supervision, mentoring, estimating or project ownership.",
    "- Keep documented results (quantified wins) for promotion and your resume.",
    "- Build your network: ConnectLn **Network**, **Guilds** and **Mentorship**.",
    "- Consider business ownership once you have the required licence and a client base.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderRelated(r: PathwayRecord, region: CareerRegion | null): string {
  const same = CAREER_PROFESSIONS.filter((p) => p.enclave === r.enclave_id && p.id !== r.profession_id).slice(0, 40);
  const mine = new Set(r.skills.map((s) => norm(s)));
  const scored = same
    .map((p) => ({ p, s: p.skills.filter((x) => mine.has(norm(x))).length }))
    .sort((a, b) => b.s - a.s);
  const picks = scored.slice(0, 8).map((x) => x.p);
  return [
    head("Similar careers", r),
    `Other roles in **${r.enclave_label}** you could explore:`,
    ...picks.map((p) => `- ${p.title}`),
    "",
    "Ask _How do I become a …_ with any of these for the full pathway.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderResume(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Resume & cover letter", r),
    "## 📄 Resume tips",
    ...r.resume_tips.map((t) => `- ${t}`),
    "",
    "## 🔑 Keywords to include",
    r.related_job_keywords.concat(r.skills.slice(0, 5)).map((k) => `\`${k}\``).join("  "),
    "",
    "## ✍️ Cover-letter outline",
    "1. One line on the role you want and why you fit.",
    "2. Two achievements with numbers (projects, scale, safety or quality results).",
    "3. Your credentials and availability; a polite call to action.",
    "",
    "Open **Resume Prep** to build and download a role-targeted resume.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderInterview(r: PathwayRecord, region: CareerRegion | null): string {
  const skillQs = r.skills.slice(0, 4).map((s) => `Walk me through how you use **${s}** on a real job. What goes wrong and how do you handle it?`);
  const toolQs = r.tools.slice(0, 2).map((t) => `How do you work with **${t}**?`);
  return [
    head("Interview preparation", r),
    "Practice prompts built from this profession's skills and tools (not a record of any employer's actual questions):",
    "",
    "## 🎯 Role-specific",
    ...[...skillQs, ...toolQs].map((q, i) => `${i + 1}. ${q}`),
    "",
    "## 🧠 Behavioural (use the STAR method)",
    "- Tell me about a time you made a mistake and how you fixed it.",
    "- Describe a time you worked under a tight deadline or pressure.",
    "- Give an example of following safety or quality procedures when it was inconvenient.",
    "- Tell me about working with a difficult customer, patient, client or teammate.",
    "",
    "## ✅ Questions to ask them",
    "- What does training and progression look like here?",
    "- What licences or certifications do you support or pay for?",
    "- How is performance measured in the first 90 days?",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderOutlook(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Demand & outlook", r),
    "Noctis does not hold live labour-market forecasts, so it won't claim whether demand is rising or falling in your area.",
    "",
    "## 🔎 How to check demand yourself",
    "- National labour statistics and projections (US: BLS Occupational Outlook Handbook, O*NET OnLine).",
    "- Count current openings on ConnectLn **Jobs** for the titles below, in your region.",
    "- Ask local employers, training providers and licensing boards about shortages.",
    "",
    "## 🛡️ Ways to stay resilient in any market",
    "- Hold recognised licences/certifications and keep them current.",
    "- Learn adjacent skills (see Similar careers) and the newest tools in the field.",
    "- Build a reputation and network — referrals drive much work in this field.",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderTrain(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Where to train", r),
    `**Usual route:** ${r.route_type}`,
    "",
    "## 🏫 Places to look",
    ...r.resources.map((x) => `- ${x}`),
    "",
    "## 🧭 How to choose a provider",
    "- Is it recognised by the licensing body or employers in your area?",
    "- What are the graduation, exam-pass and job-placement rates?",
    "- Does it include supervised practical hours or job placement?",
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderTransfer(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Moving your credentials", r),
    "Noctis does not hold a verified database of which countries recognise which qualifications, so it won't say whether yours is accepted. Recognition is decided by each country's regulator and often by each state, province or employer.",
    "",
    "## 🌐 How to find out and move forward",
    "- **Find the regulator** for this field in the destination (licensing board, professional body or labour ministry) and ask for their *foreign qualification* or *credential assessment* process.",
    "- **Get your documents ready:** certificates, transcripts, syllabus or hours of training, work references and proof of good standing, with certified translations if required.",
    "- **Expect one or more of:** a credential equivalence assessment, an exam or practical test, a bridging or top-up course, supervised practice, or a language test.",
    "- **Use official sources:** the destination government's immigration and skills-recognition pages; avoid anyone who guarantees recognition or a visa for a fee.",
    "- **Regulated vs unregulated:** licensed fields (health, law, engineering, many trades) need formal recognition; others rely on employer assessment of skills and experience.",
    "",
    "## 📌 Credentials commonly asked about in this field",
    ...r.credentials.map((c) => `- ${c}`),
  ].join("\n") + foot(r, region, FOLLOW(r));
}

function renderFunding(r: PathwayRecord, region: CareerRegion | null): string {
  return [
    head("Funding, scholarships & apprenticeships", r),
    "Noctis does not hold a verified, current list of scholarships or grants, so none are named here — availability and eligibility change often and differ by country.",
    "",
    "## 🎯 Where funding usually comes from",
    "- **Paid apprenticeships and trainee roles:** you earn while you train; ask employers, unions and trade associations directly.",
    "- **Government workforce or labour-ministry programmes:** many countries fund skills training for job-seekers, young people and career-changers.",
    "- **Scholarships and grants:** from training providers, professional bodies, foundations and employers.",
    "- **Student loans, payment plans and employer tuition assistance** where available.",
    "- **NGO and community programmes** for under-served groups, women, youth and refugees.",
    "",
    "## 🛡️ Stay safe",
    "- Never pay to \"guarantee\" a scholarship or placement. Check that a programme is registered or recognised before paying.",
    "- Confirm what is covered (tuition, exam fees, tools) and what happens if you do not finish.",
    "",
    `**Route here:** ${r.route_type}  ·  **Typical timeline:** ${r.timeline}`,
  ].join("\n") + foot(r, region, FOLLOW(r));
}
function renderRegionJobs(r: PathwayRecord, region: CareerRegion | null): string {
  return [head("Working in a region", r), `> ${r.summary}`, "", region ? "" : "Open **Jobs → Region** and choose any of the 190+ regions to see roles and hubs."].join("\n") + foot(r, region, FOLLOW(r));
}

function renderSwitch(from: PathwayRecord, to: PathwayRecord, region: CareerRegion | null): string {
  const fromSkills = new Set(from.skills.map((s) => norm(s)));
  const shared = to.skills.filter((s) => fromSkills.has(norm(s)));
  const gaps = to.skills.filter((s) => !fromSkills.has(norm(s)));
  return [
    `# 🧭 Career switch: ${short(from)} → ${short(to)}`,
    `> Moving from **${from.title}** to **${to.title}**.`,
    "",
    "## ♻️ Skills that transfer",
    ...(shared.length ? shared.map((s) => `- ${s}`) : ["- Reliability, safety habits, customer handling and hands-on problem solving usually carry over."]),
    "",
    "## 🧩 Gaps to close",
    ...(gaps.length ? gaps.slice(0, 6).map((s) => `- ${s}`) : ["- Mostly credentials rather than skills — see below."]),
    "",
    `## 🎓 Credentials to target (${to.route_type})`,
    ...to.credentials.slice(0, 5).map((c) => `- ${c}`),
    "",
    "## 🪜 Suggested plan",
    ...to.steps.slice(1, 5).map((s) => `${s.n - 1}. **${s.title}** — ${s.detail}`),
    "",
    `**Bridge roles to apply for:** ${to.entry_level_roles.join(", ")}.`,
    `**Typical timeline for ${short(to)}:** ${to.timeline}.`,
    "Reframe your resume around transferable skills with **Resume Prep**.",
  ].join("\n") + foot(to, region, [`How do I become a ${short(to)}?`]);
}

function renderCompare(a: PathwayRecord, b: PathwayRecord, region: CareerRegion | null): string {
  const row = (label: string, x: string, y: string) => `| ${label} | ${x.replace(/\|/g, "/")} | ${y.replace(/\|/g, "/")} |`;
  return [
    `# 🧭 Compare: ${short(a)} vs ${short(b)}`,
    "",
    `| | ${short(a)} | ${short(b)} |`,
    "|---|---|---|",
    row("Field", a.enclave_label, b.enclave_label),
    row("Route", a.route_type, b.route_type),
    row("Timeline", a.timeline, b.timeline),
    row("Key credentials", a.credentials.slice(0, 2).join("; "), b.credentials.slice(0, 2).join("; ")),
    row("Entry roles", a.entry_level_roles.slice(0, 2).join(", "), b.entry_level_roles.slice(0, 2).join(", ")),
    row("Growth path", a.progression.slice(0, 3).join(" → "), b.progression.slice(0, 3).join(" → ")),
    "",
    "**How to choose:** shadow someone in each role, compare training length and cost locally, and check openings on ConnectLn **Jobs** for both.",
    "",
    "## 💼 Related jobs to search on ConnectLn",
    [...a.related_job_keywords.slice(0, 3), ...b.related_job_keywords.slice(0, 3)].map((k) => `\`${k}\``).join("  ") + "  — open **Jobs** and search these titles.",
    "",
    `_⚠️ ${a.disclaimer}_`,
  ].join("\n");
}

// ───────── career discovery ─────────
const FIELD_WORDS: Array<[RegExp, string]> = [
  [/\b(health|medical|clinical|hospital|nursing|care)\b/, "healthcare_medicine"],
  [/\b(trade|trades|construction|building)\b/, "trades_construction"],
  [/\b(tech|technology|software|it|computer|coding)\b/, "tech_software"],
  [/\b(cyber|security analyst|hacking)\b/, "tech_cybersecurity"],
  [/\b(farm|farming|agri\w*|fishing|forestry|mining)\b/, "agriculture_natural_resources"],
  [/\b(driving|transport|logistics|automotive|vehicle)\b/, "automotive_mechanics"],
  [/\b(beauty|wellness|fitness|salon|personal service)\b/, "personal_services_wellness"],
  [/\b(food|cooking|restaurant|hospitality|hotel|event)\b/, "culinary_hospitality_events"],
  [/\b(business|retail|sales|shop|commerce|office)\b/, "commerce_small_business"],
  [/\b(art|arts|creative|music|media|design)\b/, "creative_media_arts"],
  [/\b(teach\w*|education|school)\b/, "education_workforce"],
  [/\b(police|security|firefighting|public safety|military)\b/, "community_civic_security"],
  [/\b(law|legal|government|public service)\b/, "law_gov_defense"],
  [/\b(finance|banking|accounting|insurance)\b/, "finance_accounting"],
  [/\b(manufacturing|factory|engineering|industrial)\b/, "manufacturing_industrial"],
  [/\b(energy|solar|utilities|environment|oil)\b/, "energy_utilities_environment"],
  [/\b(science|laboratory|research)\b/, "science_laboratory_research"],
  [/\b(aviation|aircraft|maritime|ship|airport|pilot)\b/, "aviation_aerospace_maritime"],
  [/\b(telecom|internet|network installer|satellite)\b/, "telecom_digital_infrastructure"],
];

function suggestCareers(text: string, region: CareerRegion | null): string | null {
  const q = norm(text);
  const wanted = FIELD_WORDS.filter(([re]) => re.test(q)).map(([, id]) => id);
  const toks = q.split(" ").filter((w) => w.length > 3 && !/^(what|which|careers?|jobs?|professions?|occupations?|suggest|recommend|list|show|that|with|work|like|love|enjoy|into|good|best|about|have|could|should|would|there|where|from|around|available)$/.test(w));
  const scored = CAREER_PROFESSIONS.map((p) => {
    const hay = norm([p.title, ...p.skills, ...p.tools].join(" "));
    let s = 0;
    for (const w of toks) if (hay.includes(w)) s += 2;
    if (wanted.includes(p.enclave)) s += 3;
    return { p, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 10);
  if (!scored.length && !region) return null;
  const L = ["# 🧭 Careers to explore"];
  if (scored.length) {
    L.push("Based on what you described, here are careers in the ConnectLn repository:", "", ...scored.map((x) => `- **${x.p.title}** — ${ENCLAVE_TEMPLATES[x.p.enclave]?.label || ""}`));
    L.push("", "Ask _How do I become a …_ for the full pathway to any of them.");
  } else {
    L.push("Tell me your interests or skills and I'll suggest careers — or ask about a specific one.");
  }
  if (region) L.push("", regionBlock(region));
  L.push("", "## 💼 Related jobs to search on ConnectLn", scored.slice(0, 3).map((x) => `\`${x.p.title.split(/[,(&]/)[0].trim().toLowerCase()}\``).join("  ") || "`entry level`", "", `_⚠️ Requirements, licensing, pay and timelines vary by location; verify locally._`);
  return L.join("\n");
}

// ───────── router ─────────
type Intent = "requirements" | "timeline" | "cost" | "salary" | "noexp" | "skills" | "day" | "progress" | "related" | "resume" | "interview" | "outlook" | "train" | "regionjobs" | "transfer" | "funding";
const INTENTS: Array<[Intent, RegExp]> = [
  ["interview", /\binterview/],
  ["resume", /\b(resume|cv|cover letter)\b/],
  ["funding", /\b(scholarships?|grants?|funding|funded|financial aid|bursar\w*|paid apprenticeships?|sponsor\w*|student loans?|free (training|courses?))\b/],
  ["salary", /\b(salary|salaries|wage|wages|pay|paid|earn|earning|earnings|income|how much (does|do|can|will|would)\b.*\b(make|earn)|make per)\b/],
  ["cost", /\b(cost|costs|afford|expensive|tuition|fees?|price|how much (does|do|is|will)\b.*\b(train|course|school|licen[cs]e|certif))/],
  ["timeline", /\b(how long|how many (years|months|weeks)|duration|fastest|quickest|shortest way)\b/],
  ["transfer", /\b(recogni[sz]e\w*|recognition|equivalen\w*|transfer\w*|foreign (credentials?|qualifications?|degrees?|licen[cs]es?)|(overseas|international|foreign|abroad) (credentials?|qualifications?|degrees?|licen[cs]es?|trained|educated)|work (abroad|overseas)|licen[cs]e (in|from) another (country|state))\b/],
  ["noexp", /\b(no experience|without (a |any )?(degree|experience|diploma|college|university|schooling)|from scratch|beginner|late in life|too old|at age \d{2}|over \d{2}|free (training|courses)|self taught|no degree|zero experience)\b/],
  ["requirements", /\b(requirements?|qualif\w*|licen[cs]e|licen[cs]ing|certif\w*|degree|diploma|credentials?|prerequisites?|eligib\w*|do i need|what do i need|need to (be|have|get))\b/],
  ["progress", /\b(promotion|advance|advancement|career growth|progress|next level|career ladder|move up|grow in|promot\w*|get promoted)\b/],
  ["related", /\b(similar|alternatives?|related (careers?|jobs?|roles?)|other careers|instead of|careers like|jobs like)\b/],
  ["skills", /\b(skills?|tools?|equipment|competenc\w*)\b/],
  ["day", /\b(day in the life|daily|responsibilit\w*|duties|job description|what does (an? )?\w+( \w+)? do|what is (an? )?)\b/],
  ["train", /\b(where|how)\b.*\b(train|study|learn|school|course|courses|apprenticeship|programs?|programmes?)\b/],
  ["outlook", /\b(demand|outlook|future|job market|hiring|automation|replace|secure|stable|good career|worth it|prospects?)\b/],
  ["regionjobs", /\b(jobs?|openings?|vacanc\w*|hiring|work|working)\b.*\b(abroad|overseas|in|across)\b/],
];

export function handleCareerScenario(question: string): string | null {
  const raw = (/Question:\s*([\s\S]*)$/i.exec(question) || [null, question])[1] as string;
  const q = norm(raw);
  if (!q || raw.length > 280 || PLATFORM.test(q)) return null;
  const region = detectRegion(raw);
  const profs = findProfessionsInText(raw, 2);
  const hasCue = CAREER_CUE.test(q);

  // Two professions: switch or compare
  if (profs.length === 2 && hasCue) {
    const a = getPathway(profs[0].profession_id)!;
    const b = getPathway(profs[1].profession_id)!;
    if (/\b(difference between|compare|comparison|versus|vs|which is better|better than)\b/.test(q)) return renderCompare(a, b, region);
    if (/\b(switch|change|changing|transition|move|moving|go from|become)\b/.test(q) && /\bfrom\b/.test(q)) return renderSwitch(a, b, region);
    if (/\b(switch|transition)\b/.test(q)) return renderSwitch(a, b, region);
  }

  if (profs.length >= 1 && hasCue) {
    const r = getPathway(profs[0].profession_id)!;
    for (const [intent, re] of INTENTS) {
      if (!re.test(q)) continue;
      switch (intent) {
        case "interview": return renderInterview(r, region);
        case "resume": return renderResume(r, region);
        case "salary": return renderSalary(r, region);
        case "cost": return renderCost(r, region);
        case "timeline": return renderTimeline(r, region);
        case "noexp": return renderNoExperience(r, region);
        case "requirements": return renderRequirements(r, region);
        case "progress": return renderProgression(r, region);
        case "related": return renderRelated(r, region);
        case "skills": return renderSkills(r, region);
        case "day": return renderDay(r, region);
        case "train": return renderTrain(r, region);
        case "outlook": return renderOutlook(r, region);
        case "transfer": return renderTransfer(r, region);
        case "funding": return renderFunding(r, region);
        case "regionjobs": return renderRegionJobs(r, region);
      }
    }
    return null;
  }

  // No profession named: discovery ("what careers fit…", "jobs in <region>")
  if (/\b(what|which|suggest|recommend|list|show|any)\b.*\b(careers?|jobs?|professions?|occupations?)\b/.test(q) || /\b(careers?|jobs?) (are )?(good|suited|right|best) for\b/.test(q) || (region && /\b(jobs?|careers?|work|hiring)\b/.test(q))) {
    return suggestCareers(raw, region);
  }
  return null;
}

/** Appends a region block to a pathway answer when the question names a country/region. */
export function withRegion(answer: string, question: string, r: PathwayRecord): string {
  const region = detectRegion(question);
  return region ? answer.replace(/\n\n_⚠️/, `\n\n${regionBlock(region, r)}\n\n_⚠️`) : answer;
}
