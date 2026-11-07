/**
 * NOCTIS PLAIN LANGUAGE TRANSLATOR & YOUTH EXPLAINER (Ages 18 & Under / Non-Technical)
 *
 * Automatically translates complex, dense, academic, or hyper-technical outputs
 * from all Noctis Intelligent Engines (Defense, Science, Software, Legal, Intelligence, Health)
 * into simple, crystal-clear, relatable explanations that anyone—especially children
 * aged 18 and below or non-technical adults—can effortlessly understand.
 */

export interface PlainExplanation {
  /** Complete spoken narrative formatted for speech synthesis */
  spokenNarrative: string;
  /** Friendly one-sentence summary */
  headline: string;
  /** Real-world everyday analogy (e.g. castles, recipes, bicycles, video games) */
  analogy: string;
  /** Key takeaway to remember */
  takeaway: string;
  /** Detected scientific or technical domain */
  domain: string;
  /** Glossary of simplified technical terms */
  vocabulary: Array<{ term: string; simpleMeaning: string }>;
}

export type PlainLanguageAudience = "youth_under_18" | "non_technical" | "verbatim";

// Common technical vocabulary mapped to everyday child-friendly language
const JARGON_MAP: Record<string, string> = {
  vulnerability: "weak spot",
  vulnerabilities: "weak spots",
  exploit: "sneaky trick to break in",
  exploited: "tricked or taken advantage of",
  mitigate: "fix or protect against",
  mitigation: "protective fix",
  authentication: "checking your password or ID card",
  unauthenticated: "without needing a password",
  cryptographic: "secret code",
  cryptography: "science of secret codes",
  "buffer overflow": "overfilling a computer's memory cup until it spills",
  "remote code execution": "making a computer run orders from far away across the internet",
  "denial of service": "overwhelming a computer with so many knocks on the door that it freezes",
  "sql injection": "tricking a computer database by typing sneaky commands into a text box",
  firewall: "digital castle gatekeeper",
  "zero-day": "a brand new bug that nobody knew about before",
  "event horizon": "the invisible point of no return where not even light can escape",
  "schwarzschild radius": "how tiny a heavy object must be squeezed before it becomes a black hole",
  singularity: "an infinitely tiny point with super strong gravity",
  spacetime: "the invisible fabric of the universe that connects space and time",
  quantum: "the microscopic world of tiny particles that play by different rules",
  "quantum mechanics": "the rules for how tiny atoms and light particles behave",
  thermodynamics: "how heat and energy move around",
  relativity: "how time and distance change depending on how fast you're zooming",
  "gravitational wave": "ripples in the fabric of space made by colliding giant stars",
  "covalent bond": "two atoms holding hands by sharing electrons",
  molecule: "a tiny group of atoms snapped together like Lego blocks",
  catalyst: "a helper that speeds up a reaction without getting worn out",
  "activation energy": "the energy kick needed to get a reaction started",
  crispr: "tiny molecular scissors that can edit a living cell's instruction book",
  genome: "the complete recipe book of instructions inside every cell",
  chromosome: "a chapter in a cell's DNA instruction book",
  dna: "the grand recipe book that tells living things how to grow and work",
  rna: "a quick copy of a DNA recipe sent to the cell's kitchen to make proteins",
  pathogen: "a germ like a bad virus or bacteria that can make you sick",
  antigen: "a fingerprint on a germ that helps your body recognize it",
  antibody: "a defender protein made by your immune system to tag bad germs",
  enzyme: "a tiny helper machine inside cells that cuts, pastes, or builds molecules",
  "molecular docking": "testing which key fits into a lock to design medicines",
  algorithm: "a step-by-step recipe a computer follows to solve a puzzle",
  asynchronous: "doing work in the background without freezing the screen",
  concurrency: "handling multiple tasks at once",
  deadlock: "two tasks freezing because each is waiting for the other to let go",
  deterministic: "producing the exact same result every single time",
  heuristic: "a smart rule of thumb or educated guess",
  latency: "the delay or lag time between clicking and seeing the result",
  bandwidth: "how much information can travel through an internet pipe at once",
  monopoly: "when one company controls an entire market and leaves no choices",
  jurisdiction: "the area where a court or law has the legal power to make decisions",
  statute: "a written law passed by the government",
  indemnity: "a legal promise to pay for damages if something goes wrong",
};

/**
 * Detects domain and returns targeted youth-friendly explanations
 */
export function translateToPlainLanguage(
  rawText: string,
  options?: { audience?: PlainLanguageAudience; topicHint?: string }
): PlainExplanation {
  const audience = options?.audience ?? "youth_under_18";
  if (!rawText || !rawText.trim()) {
    return {
      spokenNarrative: "There was no information provided to read.",
      headline: "No content available.",
      analogy: "An empty notebook.",
      takeaway: "Nothing to review.",
      domain: "General",
      vocabulary: [],
    };
  }

  // If verbatim requested, just clean formatting
  if (audience === "verbatim") {
    const cleaned = cleanRawJargon(rawText);
    return {
      spokenNarrative: cleaned,
      headline: cleaned.slice(0, 120),
      analogy: "Direct technical reading.",
      takeaway: "Technical detail.",
      domain: "Technical",
      vocabulary: [],
    };
  }

  const lower = rawText.toLowerCase();

  // 1. DOMAIN: CYBERSECURITY & DEFENSE (CVE, Buffer Overflow, RCE, Malware, Firewall)
  if (
    /cve-\d{4}-\d+|vulnerability|buffer overflow|remote code execution|sql injection|payload|exploit|zero-day|firewall|penetration test|cross-site scripting|xss/i.test(
      rawText
    )
  ) {
    return explainDefenseTopic(rawText, lower);
  }

  // 2. DOMAIN: ASTROPHYSICS & BLACK HOLES (Schwarzschild, event horizon, singularity, relativity, vis-viva, gravity)
  if (
    /schwarzschild|black hole|event horizon|singularity|general relativity|gravitational|hohmann|vis-viva|orbital mechanics|solar mass|light year/i.test(
      rawText
    )
  ) {
    return explainAstrophysicsTopic(rawText, lower);
  }

  // 3. DOMAIN: BIOMOLECULAR & GENETICS (CRISPR, Cas9, DNA, RNA, docking, protein, enzyme, pandemic, viral)
  if (
    /crispr|cas9|pam sequence|guide rna|molecular docking|binding affinity|inhibition constant|kd|ki|amino acid|protein folding|genome|pathogen|epidemiology|r0/i.test(
      rawText
    )
  ) {
    return explainBiomolecularTopic(rawText, lower);
  }

  // 4. DOMAIN: CHEMISTRY & MATERIALS (pH, buffer, acid, base, catalyst, Arrhenius, activation energy, electronegativity)
  if (
    /henderson-hasselbalch|ph =|arrhenius|activation energy|periodic table|molar mass|electronegativity|covalent|bandgap|semiconductor|superconductor|lithium/i.test(
      rawText
    )
  ) {
    return explainChemistryTopic(rawText, lower);
  }

  // 5. DOMAIN: MATHEMATICS & COMPUTATION (Derivatives, integrals, calculus, matrix, eigenvalues, optimization)
  if (
    /derivative|integral|differential equation|eigenvalue|matrix|simplex|gradient descent|convergence|standard deviation|confidence interval/i.test(
      rawText
    )
  ) {
    return explainMathTopic(rawText, lower);
  }

  // 6. DOMAIN: SOFTWARE ENGINEERING & ARCHITECTURE (Deadlock, mutex, concurrency, race condition, microservices)
  if (
    /deadlock|mutex|race condition|thread safety|garbage collection|api gateway|kubernetes|microservices|distributed system/i.test(
      rawText
    )
  ) {
    return explainSoftwareTopic(rawText, lower);
  }

  // 7. DOMAIN: LEGAL & REGULATORY (Statutes, liabilities, compliance, jurisdiction, clauses)
  if (
    /pursuant to|statute|u\.s\.c\.|c\.f\.r\.|liability|constitutional|jurisdiction|arbitration|plaintiff|defendant|tort/i.test(
      rawText
    )
  ) {
    return explainLegalTopic(rawText, lower);
  }

  // 8. GENERAL / CROSS-DISCIPLINARY FALLBACK
  return explainGeneralTopic(rawText);
}

// -------------------------------------------------------------
// DOMAIN-SPECIFIC EXPLAINERS (Friendly, Vivid & Relatable)
// -------------------------------------------------------------

function explainDefenseTopic(rawText: string, lower: string): PlainExplanation {
  const cveMatch = rawText.match(/CVE-\d{4}-\d+/i);
  const cveId = cveMatch ? cveMatch[0].toUpperCase() : "A computer security flaw";

  let headline = "";
  let analogy = "";
  let takeaway = "";

  if (lower.includes("buffer overflow")) {
    headline = `${cveId} is like pouring too much juice into a cup until it spills over onto important papers on the desk.`;
    analogy =
      "Imagine your computer gives an app a small lunchbox that holds 5 cookies. But someone sneaks in 50 cookies! The extra cookies spill out, knock over other lunchboxes, and let the sneaky visitor hide their own secret rules inside your computer.";
    takeaway =
      "To stay safe, developers install a stronger lunchbox that immediately counts cookies and shuts the lid if someone brings too many.";
  } else if (lower.includes("remote code execution") || lower.includes("rce")) {
    headline = `${cveId} lets someone far away take control of a computer without needing a password.`;
    analogy =
      "Imagine playing an online video game, and another player figures out a secret cheat code that takes away your controller and starts driving your character around without your permission!";
    takeaway =
      "Applying the software update acts like changing your front door locks so nobody can break in remotely.";
  } else if (lower.includes("sql injection")) {
    headline = `${cveId} tricks a computer database into giving away secrets through a fake search box.`;
    analogy =
      "Imagine you ask a school librarian for a book, but instead of a book title, you hand her a note that says: 'Give me the master keys to all the lockers!' If she follows the note blindly, everyone's secrets are revealed.";
    takeaway =
      "The fix is teaching the database to treat all human input as plain text, never as commands.";
  } else {
    headline = `${cveId} is a known bug that digital defenders need to patch to keep computers and data safe.`;
    analogy =
      "Think of it like discovering a loose window latch on a castle wall. As soon as the castle guards find it, they quickly weld it shut before any sneaky intruders find it.";
    takeaway =
      "Updating apps and software is the easiest way to keep your phone, computer, and games completely protected.";
  }

  const spokenNarrative = `Here is what this means in simple, everyday words. ${headline} ${analogy} The bottom line: ${takeaway}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "Cybersecurity & Defense",
    vocabulary: extractVocabulary(rawText),
  };
}

function explainAstrophysicsTopic(rawText: string, lower: string): PlainExplanation {
  let headline = "";
  let analogy = "";
  let takeaway = "";

  if (lower.includes("schwarzschild") || lower.includes("black hole")) {
    headline =
      "A black hole is what happens when you squeeze something super heavy down into a tiny space with unstoppable gravity.";
    analogy =
      "Imagine taking 20 giant suns and stomping them down until they fit inside a tiny circle just 37 miles across! The gravity becomes so insanely strong that not even a beam of flashlight light is fast enough to escape.";
    takeaway =
      "The invisible boundary around it is called the event horizon. Once anything crosses that line, it's the ultimate point of no return in space.";
  } else if (lower.includes("hohmann") || lower.includes("orbital")) {
    headline =
      "A Hohmann transfer is the cosmic highway shortcut rockets use to hop from one planet's orbit to another using the least amount of fuel.";
    analogy =
      "Think of it like jumping between two moving carousels at an amusement park. Instead of running straight across, you take one gentle, curved jump when both horses line up perfectly!";
    takeaway =
      "By doing two precise engine burns, spacecraft like NASA rovers can cruise all the way to Mars using minimal rocket fuel.";
  } else {
    headline = "This explains how gravity, stars, and the fabric of the universe interact across deep space.";
    analogy =
      "Picture space as a giant, bouncy trampoline. If you place a heavy bowling ball in the middle, the trampoline curves down, and smaller marbles roll around it like planets orbiting the Sun!";
    takeaway = "Gravity isn't just a force pulling you down—it's heavy stars bending the shape of space itself.";
  }

  const spokenNarrative = `Here is what this means in simple words. ${headline} ${analogy} The big takeaway: ${takeaway}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "Astrophysics & Space Science",
    vocabulary: extractVocabulary(rawText),
  };
}

function explainBiomolecularTopic(rawText: string, lower: string): PlainExplanation {
  let headline = "";
  let analogy = "";
  let takeaway = "";

  if (lower.includes("crispr") || lower.includes("cas9")) {
    headline =
      "CRISPR is like tiny, microscopic scissors that can find a misspelled word inside a cell's DNA recipe book and fix it!";
    analogy =
      "Imagine you're baking a cake, but the cookbook has a typo that says 'add 5 cups of salt' instead of sugar. CRISPR is like an expert chef who zooms right to page 42, erases the word 'salt', writes 'sugar', and saves the cake!";
    takeaway =
      "Scientists use CRISPR gene editing to cure genetic diseases and help plants grow stronger against droughts.";
  } else if (lower.includes("docking") || lower.includes("binding affinity")) {
    headline =
      "Molecular docking is like a 3D puzzle contest to see how tightly a medicine molecule clicks into a virus or bad protein.";
    analogy =
      "Imagine a virus has a special padlock it uses to sneak into healthy cells. Scientists test thousands of tiny molecular keys on a computer to see which key clicks in and jams the lock so the virus can never open doors again!";
    takeaway =
      "A more negative binding energy means the key clicks in much tighter, making it a stronger candidate for a lifesaving medicine.";
  } else {
    headline = "This explains how living cells, proteins, and DNA work together to keep bodies healthy.";
    analogy =
      "Inside your body, trillions of microscopic worker machines are constantly building, repairing, and protecting your cells, like a bustling futuristic city that never sleeps!";
    takeaway = "Understanding the code of life helps doctors create targeted cures for illnesses.";
  }

  const spokenNarrative = `Here is what this means in simple terms. ${headline} ${analogy} The key lesson: ${takeaway}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "Biology & Medicine",
    vocabulary: extractVocabulary(rawText),
  };
}

function explainChemistryTopic(rawText: string, lower: string): PlainExplanation {
  let headline = "";
  let analogy = "";
  let takeaway = "";

  if (lower.includes("ph") || lower.includes("buffer")) {
    headline = "pH is a ruler that measures whether a liquid is sour like lemon juice or slippery like soap.";
    analogy =
      "Think of a buffer like a shock absorber on a mountain bike. When you hit a bumpy puddle of acid or base, the buffer absorbs the bump so the liquid stays at a safe, smooth, steady pH!";
    takeaway =
      "Buffers keep human blood at an exact pH of 7.4. If it changed by even a tiny bit, our cells couldn't function.";
  } else if (lower.includes("arrhenius") || lower.includes("activation energy")) {
    headline =
      "Chemical reactions need a burst of heat to get over the starting hill, and they run much faster when things are warm!";
    analogy =
      "Imagine you're trying to push a heavy ball over the top of a playground slide. The height of the hill is the 'activation energy'. If the playground gets hot and excited, everyone pushes harder, and balls slide down all the time!";
    takeaway =
      "Heating things up gives molecules more zoom and speed, making chemical reactions happen much quicker.";
  } else {
    headline = "This shows how atoms snap together to form the materials, liquids, and gases that make up everything around us.";
    analogy =
      "Atoms are like tiny Lego bricks. By sharing electrons like sticky velcro, different atoms join together to make water, air, computers, and even chocolate!";
    takeaway = "Chemistry is the recipe book for building everything in the universe.";
  }

  const spokenNarrative = `Here is what this means in simple words. ${headline} ${analogy} The key takeaway: ${takeaway}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "Chemistry & Materials",
    vocabulary: extractVocabulary(rawText),
  };
}

function explainMathTopic(rawText: string, lower: string): PlainExplanation {
  let headline = "";
  let analogy = "";
  let takeaway = "";

  if (lower.includes("derivative") || lower.includes("integral") || lower.includes("calculus")) {
    headline =
      "Calculus is the math of how things change. Derivatives measure speed right now, and integrals measure the whole journey!";
    analogy =
      "When you ride your bike, looking down at your speedometer tells you your speed right this second—that's a derivative. Adding up all those seconds to find out you rode 5 miles across town—that's an integral!";
    takeaway =
      "Engineers use calculus to steer rockets, design roller coasters, and make video game graphics feel smooth and realistic.";
  } else {
    headline = "This solves a mathematical pattern using verified step-by-step logic.";
    analogy =
      "Math is like solving a Rubik's cube. Each step follows a proven rule, and when you put them all in order, everything snaps into place perfectly!";
    takeaway = "Math is the universal language that powers science, technology, and engineering.";
  }

  const spokenNarrative = `Here is what this means in simple terms. ${headline} ${analogy} The big picture: ${takeaway}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "Mathematics & Computation",
    vocabulary: extractVocabulary(rawText),
  };
}

function explainSoftwareTopic(rawText: string, lower: string): PlainExplanation {
  let headline = "";
  let analogy = "";
  let takeaway = "";

  if (lower.includes("deadlock") || lower.includes("race condition") || lower.includes("mutex")) {
    headline = "A deadlock happens when two computer tasks freeze because each is waiting for the other to let go of a tool!";
    analogy =
      "Imagine you and your friend are drawing together. You have the paper but need the green crayon. Your friend has the green crayon but needs the paper. If neither of you is willing to share first, you're deadlocked and neither can draw!";
    takeaway =
      "Good software engineers set up strict sharing rules so computer programs take turns and never freeze.";
  } else {
    headline = "This describes how computer code, servers, and apps pass data back and forth reliably.";
    analogy =
      "Think of software like an expert postal service. Every letter is sealed, addressed, and delivered to the exact right mailbox in milliseconds!";
    takeaway = "Clean, well-architected software makes apps fast, secure, and crash-proof.";
  }

  const spokenNarrative = `Here is what this means in simple words. ${headline} ${analogy} The bottom line: ${takeaway}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "Software & Systems",
    vocabulary: extractVocabulary(rawText),
  };
}

function explainLegalTopic(rawText: string, lower: string): PlainExplanation {
  const headline =
    "This explains the legal ground rules that protect people, businesses, and communities from unfair actions.";
  const analogy =
    "Think of laws like the rules of a soccer game. Without a referee, lines on the field, and clear rules against pushing, the game would turn into chaos. The rules ensure everyone plays fair!";
  const takeaway =
    "Legal systems set up clear responsibilities so agreements are honored and everyone's rights are respected.";

  const spokenNarrative = `Here is what this means in plain English. ${headline} ${analogy} The big takeaway: ${takeaway}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "Law & Governance",
    vocabulary: extractVocabulary(rawText),
  };
}

function explainGeneralTopic(rawText: string): PlainExplanation {
  // Strip code, math formulas, headers, bullets, URLs
  const clean = cleanRawJargon(rawText);

  // Extract first 2-3 clean sentences
  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && !s.startsWith("http") && !s.includes("="));

  const corePoint = sentences.slice(0, 2).join(" ") || clean.slice(0, 160);

  const headline = "In simple terms, this breaks down a complex problem into clear, understandable facts.";
  const analogy =
    "Think of it like taking apart a complex clock to see how the gears click together. Once you see the big picture, every small piece makes total sense!";
  const takeaway = corePoint.length > 20 ? corePoint : "Clear knowledge helps us solve hard problems step by step.";

  const spokenNarrative = `Here is what this means in simple, everyday language: ${takeaway}. ${analogy}`;

  return {
    spokenNarrative,
    headline,
    analogy,
    takeaway,
    domain: "General Science & Intelligence",
    vocabulary: extractVocabulary(rawText),
  };
}

// -------------------------------------------------------------
// UTILITIES: JARGON EXTRACTION & TEXT SANITIZATION
// -------------------------------------------------------------

function cleanRawJargon(text: string): string {
  let cleaned = text;

  // Remove code blocks and inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");
  cleaned = cleaned.replace(/`[^`]+`/g, " ");

  // Remove LaTeX formulas ($...$ and $$...$$)
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, " ");
  cleaned = cleaned.replace(/\$([^\$]+)\$/g, " $1 ");

  // Remove markdown tables
  cleaned = cleaned.replace(/\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+/g, " ");

  // Remove links and markdown syntax
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  cleaned = cleaned.replace(/^[*\-+•]\s+/gm, "");
  cleaned = cleaned.replace(/[*_~`]/g, "");

  // Replace common jargon words inline
  for (const [jargon, simple] of Object.entries(JARGON_MAP)) {
    const re = new RegExp(`\\b${jargon}\\b`, "gi");
    cleaned = cleaned.replace(re, simple);
  }

  // Collapse spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function extractVocabulary(text: string): Array<{ term: string; simpleMeaning: string }> {
  const found: Array<{ term: string; simpleMeaning: string }> = [];
  const lower = text.toLowerCase();

  for (const [term, simpleMeaning] of Object.entries(JARGON_MAP)) {
    if (lower.includes(term.toLowerCase()) && !found.some((v) => v.term === term)) {
      found.push({
        term: term.charAt(0).toUpperCase() + term.slice(1),
        simpleMeaning,
      });
      if (found.length >= 4) break;
    }
  }

  return found;
}
