/**
 * Natural-language entry point for NOCTIS-CAREERS-001.
 * Answers "How do I become a …?" from the career pathway repository (deterministic, no LLM).
 */
import { handleCareerScenario, withRegion } from "./noctis-career-intents.ts";
import { CAREER_COUNT, ENCLAVE_TEMPLATES, getPathway, matchProfessions, professionsByEnclave, type PathwayRecord } from "./noctis-career-pathways.ts";

const BECOME =
  /\b(?:how\s+(?:do|can|could|would|should|does)\s+(?:i|we|one|you|someone|a\s+person|people)\s+(?:become|get\s+to\s+be|start\s+(?:as|a\s+career\s+as)|get\s+(?:started|into|hired)\s+(?:as|in))|how\s+to\s+(?:become|be\s+an?|start\s+(?:as|a\s+career\s+as)|get\s+into)|what\s+(?:does\s+it\s+take|do\s+i\s+need|is\s+required|are\s+the\s+(?:steps|requirements))\s+to\s+(?:be|become)|steps?\s+to\s+(?:become|being)|(?:career\s+)?path(?:way)?\s+(?:to|for|as)\s+(?:becoming\s+)?(?:an?\s+)?\w|career\s+(?:as|in)\s+(?:an?\s+)?\w|requirements?\s+(?:to|for)\s+(?:become|becoming)|training\s+(?:to|for)\s+(?:become|becoming)|i\s+(?:want|would\s+like|wish|hope)\s+to\s+become|become\s+an?\s+\w)/i;
const REPO = /\b(?:career\s+(?:pathways?|repository)|careers?\s+(?:library|guide)|how\s+to\s+become\s+(?:guides?|repository))\b/i;

function stripWrapper(question: string): string {
  const m = /Question:\s*([\s\S]*)$/i.exec(question);
  return (m ? m[1] : question).trim();
}

export function extractCareerTarget(question: string): string | null {
  const q = stripWrapper(question).replace(/[?.!]+$/g, "");
  const patterns = [
    /(?:become|becoming|be)\s+(?:an?\s+|the\s+)?(.+)$/i,
    /(?:path(?:way)?|career)\s+(?:to|for|as|in)\s+(?:becoming\s+)?(?:an?\s+)?(.+)$/i,
    /(?:start|get\s+started|get\s+into|get\s+hired)\s+(?:as|in)\s+(?:an?\s+)?(.+)$/i,
  ];
  for (const re of patterns) {
    const m = re.exec(q);
    if (m && m[1]) return m[1].replace(/\b(?:in|from|with|at|near|without|using)\b.*$/i, "").trim() || m[1].trim();
  }
  return null;
}

export function isCareerPathwayQuery(question: string): boolean {
  const q = stripWrapper(question || "");
  if (!q) return false;
  if (REPO.test(q)) return true;
  if (!BECOME.test(q)) return false;
  const target = extractCareerTarget(q);
  if (!target) return false;
  const m = matchProfessions(target, 1);
  return m.length > 0 && m[0].score >= 55;
}

export function renderPathway(r: PathwayRecord): string {
  const L: string[] = [];
  L.push(`# 🧭 How to become: ${r.title}`);
  L.push(`> ${r.summary}`);
  L.push("");
  L.push(`**Field:** ${r.enclave_label}  ·  **Route:** ${r.route_type}  ·  **Typical timeline:** ${r.timeline}`);
  L.push("");
  L.push("## ✅ Step-by-step pathway");
  for (const s of r.steps) L.push(`${s.n}. **${s.title}**${s.duration ? ` _(${s.duration})_` : ""} — ${s.detail}`);
  L.push("");
  if (r.credentials.length) {
    L.push("## 🎓 Credentials & licensing to look for");
    for (const c of r.credentials) L.push(`- ${c}`);
    L.push("");
  }
  if (r.skills.length || r.tools.length) {
    L.push("## 🛠️ Skills & tools you'll use");
    if (r.skills.length) L.push(`**Skills:** ${r.skills.join(", ")}`);
    if (r.tools.length) L.push(`**Tools:** ${r.tools.join(", ")}`);
    L.push("");
  }
  L.push("## 📈 Where you start and where you can go");
  if (r.entry_level_roles.length) L.push(`**Entry-level roles:** ${r.entry_level_roles.join(" → ")}`);
  if (r.progression.length) L.push(`**Career progression:** ${r.progression.join(" → ")}`);
  L.push("");
  L.push("## 💼 Related jobs to search on ConnectLn");
  L.push(r.related_job_keywords.map((k) => `\`${k}\``).join("  ") + "  — open **Jobs** and search these titles.");
  L.push("");
  L.push("## 📄 Resume Prep tips");
  for (const t of r.resume_tips) L.push(`- ${t}`);
  L.push("- Open **Resume Prep** to build a role-targeted resume and cover letter.");
  L.push("");
  L.push("## 🤝 Resources & contacts");
  for (const t of r.resources) L.push(`- ${t}`);
  L.push("");
  L.push(`_⚠️ ${r.disclaimer}_`);
  return L.join("\n");
}

function renderOverview(): string {
  const by = professionsByEnclave();
  const L = [
    `# 🧭 Career pathway repository`,
    `Noctis holds step-by-step "How to become…" guides for **${CAREER_COUNT} ConnectLn professions** across ${Object.keys(by).length} fields. Ask, for example: _"How do I become a carpenter?"_, _"What does it take to be a nurse?"_ or _"Path to becoming a solar installer"_.`,
    "",
    "| Field | Professions |",
    "|---|---|",
  ];
  for (const [id, list] of Object.entries(by)) L.push(`| ${ENCLAVE_TEMPLATES[id]?.label || id} | ${list.length} |`);
  return L.join("\n");
}

export function handleNaturalCareerQuery(question: string): string | null {
  const q = stripWrapper(question || "");
  if (!q) return null;
  const scenario = handleCareerScenario(question);
  if (scenario) return scenario;
  if (REPO.test(q) && !BECOME.test(q)) return renderOverview();
  if (!BECOME.test(q)) return null;
  const target = extractCareerTarget(q);
  if (!target) return null;
  const matches = matchProfessions(target, 5);
  if (!matches.length || matches[0].score < 55) return null;
  const top = matches[0];
  const near = matches.filter((m) => top.score - m.score <= 3 && m.profession_id !== top.profession_id);
  const record = getPathway(top.profession_id);
  if (!record) return null;
  let out = withRegion(renderPathway(record), q, record);
  if (near.length) {
    out += `\n\n**Similar roles you may mean:** ${near.map((n) => n.title).join("; ")}. Ask "How do I become a …" with the exact name for that guide.`;
  } else {
    const others = matches.slice(1, 4).filter((m) => m.score >= 55);
    if (others.length) out += `\n\n**Related roles:** ${others.map((n) => n.title).join("; ")}.`;
  }
  return out;
}
