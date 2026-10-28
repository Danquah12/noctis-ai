/**
 * NOCTIS-CAREERS-001 — "How to become …" career pathway repository for the 197 ConnectLn professions.
 *
 * Composition model (honest about depth):
 *  - 20 enclave templates carry the route-specific stages (education / apprenticeship / licensure / experience).
 *  - ~60 professions carry hand-written overrides (route, timeline, credentials, entry roles, progression, aliases).
 *  - Remaining professions inherit the enclave template, personalised with the ConnectLn skills/tools list.
 *  - Nine "starting-point" profiles (school leaver, job seeker, career changer, veteran, …) get transition guidance.
 * No fees, phone numbers or private URLs are stored. Requirements vary by country/state — always verify locally.
 */
import { CAREER_PROFESSIONS, type CareerProfessionRow } from "./noctis-career-professions-data.ts";
import { EXPANSION_OVERRIDES } from "./noctis-career-expansion.ts";

export interface PathwayStep { n: number; title: string; detail: string; duration?: string }
export interface PathwayRecord {
  profession_id: string;
  title: string;
  enclave_id: string;
  enclave_label: string;
  summary: string;
  route_type: string;
  timeline: string;
  steps: PathwayStep[];
  credentials: string[];
  skills: string[];
  tools: string[];
  entry_level_roles: string[];
  progression: string[];
  related_job_keywords: string[];
  resume_tips: string[];
  resources: string[];
  disclaimer: string;
  starting_point: boolean;
}

interface EnclaveTemplate {
  label: string;
  route: string;
  timeline: string;
  steps: Array<[string, string, string?]>;
  credentials: string[];
  entry: string[];
  progression: string[];
  resources: string[];
  resume: string[];
}
interface Override {
  route?: string; timeline?: string; credentials?: string[]; entry?: string[]; progression?: string[];
  keywords?: string[]; aliases?: string[]; summary?: string; extraSteps?: Array<[string, string, string?]>;
}

export const DISCLAIMER =
  "Requirements, licensing, pay and timelines vary by country, state/province and employer. Treat this as a general roadmap and verify current rules with your licensing authority, training provider or employer before committing time or money.";

const GENERAL_RESOURCES = [
  "Your state/provincial or national licensing board or labor department (for current requirements)",
  "Local community college, technical/vocational school or workforce-development office",
  "Professional or trade association for this field (training, standards, networking)",
  "US reference tools: O*NET OnLine (onetonline.org), BLS Occupational Outlook Handbook (bls.gov/ooh), CareerOneStop (careeronestop.org), apprenticeship.gov",
  "On ConnectLn: Learning (courses), Mentorship (find a mentor), Network (professionals in this field), Guilds and Company pages",
];

export const ENCLAVE_TEMPLATES: Record<string, EnclaveTemplate> = {
  trades_construction: {
    label: "Trades & Construction", route: "Apprenticeship / trade school + licensing", timeline: "1–5 years (apprenticeship typical 3–5 years)",
    steps: [
      ["Meet the basics", "Finish secondary school or an equivalent (GED/diploma). Build basic maths, measurement and blueprint-reading skills. Confirm you can meet physical demands and any age/driver's licence requirements.", "Now"],
      ["Get safety certified", "Complete an entry safety course (e.g. OSHA 10/30 in the US or your local equivalent), first aid and PPE training. Many sites will not hire without it.", "1–2 weeks"],
      ["Choose your training route", "Pick a registered apprenticeship (paid, on-the-job + classroom), a pre-apprenticeship/trade school programme, or an entry helper job with a contractor. Apprenticeships are usually the best earn-while-you-learn route.", "1–3 months to apply"],
      ["Learn on the job under a journeyman", "Work as an apprentice/helper, logging supervised hours and completing related classroom instruction. Learn tools, codes, materials and jobsite habits.", "2–4 years"],
      ["Pass licensing / certification", "Where your trade is regulated, apply for your journeyman/trade licence by documenting hours and passing the exam. Study the local code book and take practice tests.", "1–3 months prep"],
      ["Specialise and move up", "Add specialisations (e.g. commercial, industrial, restoration), supervisory skills, estimating, and eventually a master/contractor licence if you want to run your own business.", "Ongoing"],
    ],
    credentials: ["Safety card (OSHA 10/30 or local equivalent)", "Apprenticeship completion certificate", "Journeyman / trade licence where required", "Master or contractor licence (to run your own business)"],
    entry: ["Helper / labourer", "Apprentice", "Pre-apprentice trainee"],
    progression: ["Journeyman", "Foreman / crew lead", "Site supervisor / project manager", "Estimator or inspector", "Business owner / contractor"],
    resources: ["Local union or contractor-association apprenticeship programmes", "Home-builder / trade association training centres"],
    resume: ["List safety certifications and licences at the top", "Quantify projects (sq ft, value, crew size, deadlines met)", "List tools, codes and equipment you can operate", "Include a photo portfolio link of finished work"],
  },
  automotive_mechanics: {
    label: "Automotive, Transport & Logistics", route: "Vocational training / certification or licence-based entry", timeline: "6 months–3 years",
    steps: [
      ["Meet the basics", "Secondary school or equivalent, a clean driving record where driving is involved, and basic mechanical/technical aptitude.", "Now"],
      ["Get the right licence or training", "For drivers: the correct class of driver's licence (and endorsements such as air brakes or hazmat for commercial work). For technicians: enrol in an automotive/diesel/EV technology programme.", "1 week–2 years"],
      ["Earn entry certifications", "Technicians: ASE or national equivalent entry certifications. Drivers/logisticians: medical card, background check, and any safety/hazmat/forklift tickets.", "1–6 months"],
      ["Start in an entry role", "Take a lube-tech, apprentice, driver-trainee, warehouse or dispatch role to build verifiable hours and a clean record.", "6–12 months"],
      ["Build specialist skills", "Add diagnostics, EV/hybrid, diesel, collision refinish, cold-chain or customs skills — specialisations raise pay.", "Ongoing"],
      ["Advance or go independent", "Move to lead tech, fleet manager, owner-operator, or shop owner once you have a track record and any required operating authority.", "3+ years"],
    ],
    credentials: ["Driver's licence (with CDL/endorsements where relevant)", "ASE or national technician certifications", "Forklift / hazmat / safety tickets", "Operating authority or business licence for owner-operators"],
    entry: ["Lube technician / tyre tech", "Driver trainee", "Warehouse associate", "Dispatcher assistant"],
    progression: ["Certified technician", "Master technician / shop foreman", "Fleet or logistics manager", "Owner-operator / shop owner"],
    resources: ["Technical college automotive programmes and manufacturer training programmes", "Trucking / logistics associations and fleet-operator training schools"],
    resume: ["Lead with licences, endorsements and certifications", "State clean-driving or safety record", "List vehicle types, diagnostic tools and software", "Quantify miles, on-time rate or repair throughput"],
  },
  agriculture_natural_resources: {
    label: "Agriculture & Natural Resources", route: "Hands-on experience + short courses (degree optional for specialist roles)", timeline: "1–4 years",
    steps: [
      ["Learn the fundamentals", "Study the basics: soil, crops/animals, seasons, equipment and safety through extension services, community courses or an agricultural school.", "1–6 months"],
      ["Gain hands-on experience", "Work on a farm, fishery, forest or mine as a hand or intern. Experience is the main currency in this field.", "6–24 months"],
      ["Get required permits & certifications", "Obtain pesticide/animal-handling, boat, chainsaw, mine-safety or food-safety certificates as applicable and any licences for your activity.", "1–3 months"],
      ["Start small or specialise", "Rent/lease land, start a small herd/hive/pond or specialise (hydroponics, drones, forestry, wildlife) with a mentor and a written plan.", "1–2 years"],
      ["Access funding and markets", "Explore agricultural cooperatives, extension programmes and farm/small-business grants, and line up buyers before scaling.", "Ongoing"],
    ],
    credentials: ["Pesticide / animal-handling / food-safety certificates", "Mine-safety or forestry safety training", "Boat, chainsaw or equipment licences", "Degree/diploma for specialist or ranger roles"],
    entry: ["Farm / farm-hand", "Seasonal worker", "Fishery or forestry crew", "Mine helper"],
    progression: ["Skilled operator", "Crew leader / herd manager", "Farm or operations manager", "Owner-operator / consultant"],
    resources: ["Agricultural extension services and farm bureaus", "Farmers' cooperatives and 4-H/FFA-style youth and adult programmes"],
    resume: ["List crops/animals/equipment you have handled", "Include seasonal results and acreage/herd size", "Show certifications and safety record"],
  },
  personal_services_wellness: {
    label: "Personal Services & Wellness", route: "Licensed vocational programme (cosmetology / fitness / care) + state exam", timeline: "6 months–2 years",
    steps: [
      ["Confirm your licence requirements", "Many services (barbering, cosmetology, massage, tattooing, funeral service) require a state/provincial licence. Check the exact training hours and exam.", "1 week"],
      ["Complete an accredited programme", "Enrol in a licensed school or apprenticeship that provides the required hours, hygiene training and practical assessments.", "6–24 months"],
      ["Pass the exam & get licensed", "Take the written/practical exam, pay your licence fee and keep proof of insurance and CPR/first aid where needed.", "1–3 months"],
      ["Build clientele", "Start as an employee, booth renter or assistant; collect before/after photos and reviews; grow repeat clients.", "6–18 months"],
      ["Go independent", "Rent a chair/studio, register your business, insure it, and market through ConnectLn, social media and referrals.", "1–3 years"],
    ],
    credentials: ["State/provincial licence for the service", "CPR / first-aid certification", "Specialty certifications (e.g. personal training, nail, massage)", "Business licence and liability insurance when self-employed"],
    entry: ["Assistant / apprentice", "Salon or studio employee", "Junior trainer / intern"],
    progression: ["Licensed practitioner", "Senior stylist / trainer", "Chair/studio owner", "Educator or brand ambassador"],
    resources: ["State cosmetology/barber/massage boards", "Accredited beauty, fitness and wellness schools"],
    resume: ["Lead with licence number and certifications", "Include a before/after portfolio and client reviews", "Mention retention/rebooking rate and specialities"],
  },
  culinary_hospitality_events: {
    label: "Culinary, Hospitality & Events", route: "On-the-job entry + short certificates (food safety, service, event skills)", timeline: "3 months–3 years",
    steps: [
      ["Get the entry certificates", "Obtain food-handler / alcohol-service / health-card certificates and any business licence needed for your work.", "1–2 weeks"],
      ["Start in an entry role", "Take a prep, server, housekeeping, assistant or crew role to learn the pace, standards and teamwork.", "3–12 months"],
      ["Build a speciality", "Choose a lane — baking, catering, events, tour guiding, landscaping, cleaning, brewing — and take a course or work under a specialist.", "6–18 months"],
      ["Create a portfolio and references", "Photograph your work, collect client/manager references and track events or covers served.", "Ongoing"],
      ["Move up or start your business", "Become a lead, supervisor or manager — or register a business, price your services, insure it and market locally.", "2–4 years"],
    ],
    credentials: ["Food-handler / food-safety certificate", "Alcohol-service certification", "Business and insurance cover for caterers/cleaners/event services", "Culinary or hospitality diploma (optional)"],
    entry: ["Prep / kitchen assistant", "Server / host", "Housekeeper / crew member", "Event assistant"],
    progression: ["Line cook / lead", "Supervisor / head chef / event lead", "Manager", "Owner / consultant"],
    resources: ["Local restaurant and hospitality associations", "Culinary and hospitality schools; small-business development centres"],
    resume: ["Quantify covers, events, guests, team size or revenue", "List certifications at the top", "Add a photo portfolio and customer reviews"],
  },
  commerce_small_business: {
    label: "Commerce & Small Business", route: "Business registration + licensing (real estate) + customer experience", timeline: "1 month–2 years",
    steps: [
      ["Pick your market and offer", "Define what you will sell or provide, your customer, and how you are different. Test with a small pilot.", "2–4 weeks"],
      ["Register and comply", "Register the business, get any trading permits, tax IDs and — for real estate — complete pre-licensing coursework and pass the licensing exam.", "1–6 months"],
      ["Set up operations", "Open a business bank account, bookkeeping, pricing, suppliers/stock and payment tools.", "2–4 weeks"],
      ["Win your first customers", "Use local presence, ConnectLn, social media and referrals; collect testimonials from early customers.", "1–3 months"],
      ["Grow systematically", "Track margin and repeat customers, reinvest in what sells, add staff or channels, and keep your records tax-ready.", "Ongoing"],
    ],
    credentials: ["Business registration / trading licence", "Real-estate salesperson/broker licence (realtors)", "Sales-tax / VAT registration where required", "Customer-service or merchandising certificates (optional)"],
    entry: ["Sales associate", "Market-stall assistant", "Brokerage assistant / showing assistant"],
    progression: ["Owner-operator", "Broker / team lead", "Multi-location or online store owner", "Consultant"],
    resources: ["Small-business development centres and chambers of commerce", "State real-estate commission (for realtors)", "Microfinance / small-business loan programmes"],
    resume: ["Show revenue, customer counts or listings closed", "Highlight sales and negotiation wins", "Link to store/portfolio and reviews"],
  },
  creative_media_arts: {
    label: "Creative, Media & Arts", route: "Portfolio-first career with optional formal training", timeline: "1–5 years",
    steps: [
      ["Train your craft", "Take lessons, courses or a degree/diploma and practise deliberately. Study the work of professionals in your discipline.", "Ongoing"],
      ["Build a portfolio", "Create 8–15 of your best pieces, a reel, or a body of work with context on your role and the brief.", "3–6 months"],
      ["Get paid experience", "Do freelance gigs, internships, assistant roles, open-mic/auditions or commissions to gain credits and references.", "6–18 months"],
      ["Learn the business side", "Contracts, licensing/royalties, invoicing, pricing, unions/guilds and basic marketing.", "Ongoing"],
      ["Build an audience and network", "Publish regularly, post on ConnectLn and join guilds/communities; collaborate with others.", "Ongoing"],
      ["Scale", "Raise rates, move into lead/director/senior roles, teach, or build a studio or brand.", "3+ years"],
    ],
    credentials: ["Degree/diploma or conservatory training (optional but helpful)", "Union/guild membership where relevant", "Specialist certifications (e.g. interpreter credentials)", "Software/tool certifications"],
    entry: ["Assistant / intern", "Freelancer / gig worker", "Junior designer / production assistant"],
    progression: ["Professional / credited artist", "Senior or lead", "Director / art director / editor", "Studio owner / educator"],
    resources: ["Professional guilds and arts councils", "Online portfolio platforms and local creative communities"],
    resume: ["Lead with a portfolio/reel link", "List credits, clients and publications", "Quantify audience, sales or project scale"],
  },
  healthcare_medicine: {
    label: "Healthcare & Medicine", route: "Accredited education + clinical training + licensure/registration", timeline: "6 months (aide/assistant) to 10+ years (physician/specialist)",
    steps: [
      ["Confirm the exact role and requirements", "Healthcare titles are regulated. Identify the required degree/certificate, scope of practice and licensing body in your location.", "1–2 weeks"],
      ["Meet prerequisites", "Complete required high-school/college science and maths courses; arrange background checks, immunisations and CPR/BLS.", "6–24 months"],
      ["Complete accredited education", "Enrol in an accredited certificate, diploma, associate, bachelor's, or professional/doctoral programme appropriate to the role.", "6 months–8 years"],
      ["Complete supervised clinical hours", "Do the required practicums, rotations, residency or externship to build verified clinical competence.", "Included/1–7 years"],
      ["Pass the licensing or certification exam", "Register for and pass the national/state licensure or board exam, then apply for your licence/registration.", "2–6 months prep"],
      ["Start practice and keep credentials current", "Begin in a supervised or entry position; maintain continuing-education credits and renew your licence on schedule.", "Ongoing"],
      ["Specialise or advance", "Pursue board certification, advanced practice, management or teaching roles.", "Ongoing"],
    ],
    credentials: ["Accredited programme completion", "National/state licence or registration", "BLS/CPR (and ACLS where relevant)", "Board certification for specialties", "Continuing-education credits"],
    entry: ["Nursing/medical assistant or aide", "Technician trainee", "Student / extern / resident (for advanced roles)"],
    progression: ["Licensed practitioner", "Specialist / advanced-practice", "Charge / department lead", "Manager, educator or practice owner"],
    resources: ["Accrediting bodies and state/national health licensing boards", "Professional associations (nursing, pharmacy, therapy, medical, dental, veterinary)", "Hospital volunteer and shadowing programmes"],
    resume: ["Lead with licences, certifications and clinical hours", "List clinical settings, patient populations and EHR systems", "Include continuing education and quality/safety achievements"],
  },
  education_workforce: {
    label: "Education & Workforce Development", route: "Subject expertise + teaching practice (certificate where required)", timeline: "6 months–4 years",
    steps: [
      ["Build subject expertise", "Gain recognised skill or qualification in what you want to teach — trade, language, literacy, driving or academics.", "Varies"],
      ["Check instructor requirements", "Driving instructors, vocational trainers and literacy teachers often need a licence, approved-instructor or teaching certificate.", "1–2 weeks"],
      ["Learn how to teach", "Take a teaching-methods or train-the-trainer course; practise lesson planning, assessment and classroom management.", "1–6 months"],
      ["Gain classroom experience", "Tutor, assist or volunteer to collect hours, reviews and references.", "3–12 months"],
      ["Set up and grow", "Join a school or training centre, or run your own tutoring/training business with clear packages and outcomes.", "Ongoing"],
    ],
    credentials: ["Teaching or instructor certificate where required", "Subject/trade certification", "Background check / child-safety clearance", "Driving-instructor licence (if applicable)"],
    entry: ["Volunteer tutor / teaching assistant", "Junior trainer", "Peer mentor"],
    progression: ["Instructor / tutor", "Lead trainer / curriculum developer", "Programme coordinator / director", "Training business owner"],
    resources: ["Adult-education and literacy organisations", "Teacher-certification offices and vocational-education associations"],
    resume: ["Quantify students taught and outcomes (pass rates, placements)", "List certifications and subjects", "Include testimonials"],
  },
  community_civic_security: {
    label: "Community, Civic & Security", route: "Screening + academy/training + certification or service", timeline: "3 months–2 years",
    steps: [
      ["Check eligibility", "Most public-safety and security roles require age minimums, background checks, fitness/medical checks and a clean record.", "1–2 weeks"],
      ["Complete required training", "Attend a licensed security academy, fire/EMS/dispatch academy or the relevant community-organising / nonprofit training.", "1–12 months"],
      ["Earn the credentials", "Obtain your guard licence, firefighter/EMT/dispatcher certification, or other mandated credential.", "1–6 months"],
      ["Start in an entry role", "Join as a probationary/entry officer, volunteer, or assistant; learn procedures and teamwork.", "6–12 months"],
      ["Grow your career", "Specialise (investigations, executive protection, rescue, public works), take leadership training and mentor others.", "Ongoing"],
    ],
    credentials: ["Security/guard licence or academy certificate", "Firefighter / EMT / dispatcher certification", "Background-check clearance", "Volunteer or nonprofit training certificates"],
    entry: ["Probationary officer / trainee", "Volunteer / outreach assistant", "Dispatcher trainee"],
    progression: ["Certified officer / responder", "Shift supervisor / team lead", "Manager / chief / director", "Consultant or founder"],
    resources: ["Local licensing authority for security work", "Fire/EMS academies and municipal HR", "Nonprofit leadership centres and volunteer networks"],
    resume: ["List certifications and licence numbers", "Show incident-handling, community-impact and leadership examples", "Mention languages and de-escalation skills"],
  },
  tech_cybersecurity: {
    label: "Cybersecurity & Industrial Security", route: "Technical foundations + certifications + lab/portfolio experience", timeline: "1–4 years",
    steps: [
      ["Learn IT and networking basics", "Study operating systems, networking (TCP/IP), Linux and scripting. Certifications such as CompTIA A+/Network+/Security+ are common starting points.", "3–6 months"],
      ["Learn security fundamentals", "Cover threats, cryptography, identity, web/app security, incident response and — for OT/ICS — industrial protocols and safety.", "3–6 months"],
      ["Practise in labs", "Use legal home labs and CTF/practice platforms; document write-ups and tooling in a public portfolio.", "Ongoing"],
      ["Earn role-aligned certifications", "Pick certifications for your path (e.g. Security+, then OSCP-style offensive certs for red team, or GICSP-type for OT).", "3–12 months each"],
      ["Land an entry role", "Aim for SOC analyst, IT support, junior pen-tester or OT technician roles; contribute to bug bounties only within programme rules.", "6–12 months"],
      ["Specialise", "Move into red teaming, ICS/OT security, engineering or leadership.", "Ongoing"],
    ],
    credentials: ["Security+ / Network+ (foundation)", "Offensive-security certification (e.g. OSCP-type) for red team", "ICS/OT security certifications for industrial roles", "Degree (helpful, not always required)"],
    entry: ["Help-desk / IT support", "SOC analyst (tier 1)", "Junior security tester", "OT/control-systems technician"],
    progression: ["Security analyst / engineer", "Senior tester / red team operator", "Security architect", "Security manager / CISO"],
    resources: ["Professional bodies and certification providers", "Local security meetups, CTF communities and ConnectLn tech guilds"],
    resume: ["Link to GitHub/write-ups and lab projects", "List certifications and tools (Wireshark, Nmap, SIEM, etc.)", "Include authorised-testing scope and ethics"],
  },
  tech_software: {
    label: "Software & AI", route: "Self-study / degree / bootcamp + portfolio", timeline: "6 months–4 years",
    steps: [
      ["Learn programming fundamentals", "Pick one language (Python, JavaScript/TypeScript, Java…) and learn data structures, version control (Git) and testing.", "3–6 months"],
      ["Build real projects", "Ship 3–5 projects: a web app, an API, a data/AI workflow. Put code on GitHub with clear READMEs.", "3–9 months"],
      ["Choose a focus", "Frontend, backend, mobile, data/ML, AI workflow/no-code automation or DevOps; learn the main tooling of that lane.", "3–6 months"],
      ["Prepare for hiring", "Practise coding and system-design interviews; polish your resume and portfolio.", "1–3 months"],
      ["Land a role", "Apply to internships, junior roles, freelance gigs and open-source contributions; ask for code review feedback.", "3–9 months"],
      ["Grow", "Own larger systems, mentor others, move toward senior, lead or architect roles.", "Ongoing"],
    ],
    credentials: ["Computer-science degree (optional)", "Cloud/vendor certifications (AWS, Azure, GCP)", "Bootcamp certificate (optional)"],
    entry: ["Junior developer", "QA / support engineer", "Freelance developer", "Automation / no-code specialist"],
    progression: ["Mid-level engineer", "Senior engineer", "Tech lead / architect", "Engineering manager / CTO"],
    resources: ["Open-source communities and documentation", "University or bootcamp career centres; local developer meetups"],
    resume: ["Lead with projects and links (GitHub, deployed apps)", "List languages, frameworks and cloud tools", "Quantify impact (latency, users, cost saved)"],
  },
  law_gov_defense: {
    label: "Law, Government & Defense", route: "Degree + bar/exam/appointment + clerkship or supervised practice", timeline: "3 months (notary) to 7–15+ years (judge)",
    steps: [
      ["Confirm the exact route", "Law and judicial roles are tightly regulated. Identify required degree, licence, exam and character-and-fitness checks in your jurisdiction.", "1–2 weeks"],
      ["Complete the academic requirement", "Bachelor's degree (and law degree such as JD/LLB where required), or paralegal/court-reporting/notary programme.", "6 months–7 years"],
      ["Pass the required exam", "Sit the bar, paralegal/notary, or court-reporter certification exam and complete the admission/character review.", "2–6 months prep"],
      ["Gain supervised experience", "Clerkships, internships, associate roles or public-sector positions give practical experience and references.", "1–5 years"],
      ["Specialise", "Choose a practice area (criminal, family, IP, tax, corporate, administrative) and join its professional association.", "Ongoing"],
      ["Advance", "Partnership, judicial appointment/election, or senior government roles typically require years of strong record and reputation.", "5–15+ years"],
    ],
    credentials: ["Law degree (JD/LLB) where required", "Bar admission / licence", "Paralegal, notary or court-reporter certification", "Judicial appointment/election or administrative qualification"],
    entry: ["Legal intern / law clerk", "Paralegal / legal assistant", "Notary or court-reporter trainee"],
    progression: ["Associate attorney / counsel", "Senior counsel / partner", "Judge or magistrate", "General counsel or agency head"],
    resources: ["State/national bar association and admissions office", "Court clerk offices and legal-aid clinics for volunteering", "Law-school career centres"],
    resume: ["Lead with bar admission/licence and education", "List cases, matters or filings supported (confidentiality-safe)", "Include publications, moot court and clerkships"],
  },
  finance_accounting: {
    label: "Finance & Accounting", route: "Degree/certificate + professional certification", timeline: "6 months–5 years",
    steps: [
      ["Build the basics", "Learn accounting principles, spreadsheets and accounting software (QuickBooks, Xero, Excel).", "1–6 months"],
      ["Get formal education", "Bookkeeping certificate, associate/bachelor's degree in accounting/finance — a bachelor's is typical for CPA and many insurance/loan roles.", "6 months–4 years"],
      ["Gain supervised experience", "Start in an entry bookkeeping, payroll, claims or lending role under a licensed professional.", "1–2 years"],
      ["Earn professional certification", "CPA (education + exam + experience), or credentials like enrolled agent, payroll certification or insurance/lending licences.", "6–24 months"],
      ["Specialise and advance", "Move into tax, audit, advisory, controller/CFO roles or open your own practice.", "Ongoing"],
    ],
    credentials: ["Bookkeeping / accounting certificate", "CPA licence (education + exam + experience)", "Enrolled agent / payroll / insurance / lending licences", "Continuing professional education"],
    entry: ["Bookkeeping assistant", "Accounts clerk / payroll clerk", "Claims or loan processor"],
    progression: ["Staff accountant", "Senior accountant / tax specialist", "Controller / finance manager", "CFO or practice owner"],
    resources: ["State board of accountancy and AICPA-style associations", "Community-college accounting programmes; small-business accounting clinics"],
    resume: ["List software, certifications and licences", "Quantify books managed, payroll size, savings found", "Highlight accuracy, deadlines and compliance"],
  },
  campus_students: {
    label: "Campus & Students", route: "Education + internships", timeline: "Varies",
    steps: [["Explore", "Take intro courses, use career-centre assessments and talk to professionals.", "Ongoing"]],
    credentials: ["Degree/diploma", "Internship experience"], entry: ["Intern", "Student worker"], progression: ["Graduate role", "Early-career professional"],
    resources: ["Campus career centre", "Alumni network"], resume: ["List coursework, projects, leadership and internships"],
  },
  manufacturing_industrial: {
    label: "Manufacturing & Industrial", route: "Vocational programme / apprenticeship + certifications", timeline: "6 months–4 years",
    steps: [
      ["Learn the fundamentals", "Blueprint reading, measurement/metrology, shop maths and safety (lockout/tagout, PPE).", "1–3 months"],
      ["Complete technical training", "Community-college or technical programme in machining, robotics/automation, plastics, textiles or logistics — or a manufacturer apprenticeship.", "6 months–2 years"],
      ["Earn skill certifications", "NIMS or national equivalent, welding/NDT, CNC or robotics vendor certifications.", "1–6 months"],
      ["Start as operator/trainee", "Work as a machine operator or technician trainee; learn quality systems (ISO 9001, SPC).", "1–2 years"],
      ["Specialise and lead", "Move into programming, process improvement, quality, maintenance planning or supervisory roles.", "Ongoing"],
    ],
    credentials: ["NIMS / national skills credentials", "NDT or welding certifications", "Safety training (OSHA etc.)", "Lean / Six Sigma (optional)"],
    entry: ["Machine operator", "Assembler", "Technician trainee"],
    progression: ["CNC/automation technician", "Programmer / process technician", "Production or quality supervisor", "Manufacturing engineer / manager"],
    resources: ["Manufacturing extension partnerships and trade associations", "Technical colleges with industry partners"],
    resume: ["List machines, controllers, software and certifications", "Quantify scrap reduction, throughput and uptime", "Show safety and quality record"],
  },
  energy_utilities_environment: {
    label: "Energy, Utilities & Environment", route: "Technical training + safety/NABCEP-type certification + licensing", timeline: "6 months–4 years",
    steps: [
      ["Build the basics", "Electrical or mechanical fundamentals, safety culture (arc flash, confined space, working at heights).", "1–3 months"],
      ["Complete technical training", "Technical school, utility apprenticeship or manufacturer training for solar, wind, grid, water or mining.", "6 months–3 years"],
      ["Earn certifications and licences", "Industry credentials (e.g. solar installer, wastewater operator, blasting or mine-safety licences) as required locally.", "1–6 months"],
      ["Get field experience", "Work as a helper/trainee on installs, plants or sites under a certified supervisor.", "1–2 years"],
      ["Specialise and advance", "Move into design, operations, commissioning, safety or project management.", "Ongoing"],
    ],
    credentials: ["Solar/energy industry certificates", "Operator licence (water/wastewater/power plant)", "Mine-safety / blasting licences", "Safety and electrical qualifications"],
    entry: ["Installer helper", "Plant operator trainee", "Field technician trainee"],
    progression: ["Certified technician/operator", "Lead / crew chief", "Commissioning / operations supervisor", "Project or plant manager"],
    resources: ["Utility and energy-industry training partnerships", "State environmental / public-utility commissions and operator-certification boards"],
    resume: ["List certifications and licence classes", "Quantify MW/kW installed, plants operated, uptime", "Include safety record"],
  },
  science_laboratory_research: {
    label: "Science, Laboratory & Research", route: "Science degree + lab experience (+ graduate study for research roles)", timeline: "2–8 years",
    steps: [
      ["Build the science foundation", "Complete the relevant chemistry, biology, maths or humanities coursework; associate degree for technician roles, bachelor's for most scientist roles.", "2–4 years"],
      ["Gain lab or field experience", "Seek internships, undergraduate research or technician apprenticeships; learn lab safety and documentation (GLP/GMP).", "6–24 months"],
      ["Earn certifications / advanced study", "Add technician certifications or a master's/PhD for independent research or museum/conservation leadership.", "1–6 years"],
      ["Publish or build a portfolio", "Present posters, publish, or document conservation/forensic casework as appropriate.", "Ongoing"],
      ["Specialise and advance", "Lead projects, manage labs or move into regulatory/quality roles.", "Ongoing"],
    ],
    credentials: ["Associate/bachelor's/graduate degree", "Lab-technician or forensic/microbiology certifications", "GMP/GLP and safety training"],
    entry: ["Lab assistant / technician", "Research assistant", "Museum or collections intern"],
    progression: ["Research/lab scientist", "Senior scientist / lab manager", "Principal investigator / curator", "Director"],
    resources: ["University research offices and national science societies", "Museum and conservation associations"],
    resume: ["List techniques, instruments and software", "Include publications, posters and projects", "Quantify samples, assays or collections handled"],
  },
  aviation_aerospace_maritime: {
    label: "Aviation, Aerospace & Maritime", route: "Approved training school + regulator-issued certificate/licence", timeline: "1–5 years",
    steps: [
      ["Check eligibility and medicals", "These fields are tightly regulated: age, medical, background and (for aviation/maritime) citizenship/security clearances.", "1–2 weeks"],
      ["Enrol in approved training", "Choose a regulator-approved school/academy (e.g. FAA Part 147-type aviation maintenance, maritime academy, dive school, drone/avionics programme).", "1–4 years"],
      ["Log supervised hours", "Complete required practical hours, sea-time, dive logs or maintenance experience.", "1–3 years"],
      ["Pass regulator exams", "Sit written, oral and practical tests; obtain your certificate or licence.", "2–6 months prep"],
      ["Start work and specialise", "Join an employer in an entry role; add ratings/endorsements (avionics, inspection, pilotage) to progress.", "Ongoing"],
    ],
    credentials: ["Regulator-issued certificate/licence/rating", "Medical certificate", "Security clearance or background check", "Specialist endorsements"],
    entry: ["Apprentice mechanic / deckhand", "Junior technician", "Dive/drone trainee"],
    progression: ["Certified technician/operator", "Lead / inspector", "Chief / pilot / master", "Operations manager"],
    resources: ["National aviation and maritime regulators", "Approved academies and employer cadet programmes"],
    resume: ["Lead with certificates, ratings and logged hours", "List aircraft/vessel/equipment types", "Show safety record"],
  },
  telecom_digital_infrastructure: {
    label: "Telecom & Digital Infrastructure", route: "Technical training + vendor/industry certifications", timeline: "3 months–2 years",
    steps: [
      ["Learn the basics", "Electronics, cabling, networking and safety (working at heights, RF safety).", "1–3 months"],
      ["Take technical training", "Vocational course or employer/vendor training for satellite, fibre, tower, data-centre, or microsoldering skills.", "1–6 months"],
      ["Earn certifications", "Industry credentials (e.g. fibre-optic installer, tower-climber safety, vendor installer programmes, IPC soldering).", "1–3 months"],
      ["Start as installer/tech trainee", "Ride along with experienced technicians; build a log of installs and repairs.", "6–12 months"],
      ["Specialise", "Advance into splicing, design, data-centre operations, repair engineering or contracting.", "Ongoing"],
    ],
    credentials: ["Fibre-optic / cabling certifications", "Tower-climber / working-at-heights safety", "Vendor installer certification", "IPC or equivalent soldering credentials"],
    entry: ["Installer trainee", "Cable technician", "Repair bench assistant"],
    progression: ["Field technician", "Lead installer / splicer", "Network or data-centre technician", "Contractor / project manager"],
    resources: ["Telecom industry associations and certification providers", "Employer and vendor training programmes"],
    resume: ["Quantify installs/repairs and first-time-fix rate", "List equipment, certifications and safety training", "Add customer satisfaction results"],
  },
};


/** Hand-written profession overrides (route, timeline, credentials, entry roles, progression, aliases, keywords). */
const OVERRIDES: Record<string, Override> = {
  carpenter: { aliases: ["carpenter", "carpentry", "woodworker", "joiner", "timber framer"], timeline: "3–4 years (apprenticeship) + licence where required", credentials: ["Carpentry apprenticeship completion", "Safety card (OSHA 10/30 or equivalent)", "Journeyman card or state licence where applicable", "Contractor licence to run your own business"], entry: ["Carpenter's helper", "Apprentice carpenter", "Framing crew member"], progression: ["Journeyman carpenter", "Lead carpenter / foreman", "Site supervisor", "Estimator", "Contractor / business owner"], keywords: ["carpenter", "apprentice carpenter", "framer", "joiner"] },
  finish_carpenter: { aliases: ["finish carpenter", "trim carpenter"], keywords: ["finish carpenter", "trim carpenter", "cabinet installer"] },
  cabinetmaker: { aliases: ["cabinet maker", "cabinetmaker", "cabinet installer"], keywords: ["cabinetmaker", "cabinet installer", "millwork"] },
  electrician: { aliases: ["electrician", "electrical technician", "wireman"], timeline: "4–5 years (≈8,000 hours + classroom) to journeyman", credentials: ["Electrical apprenticeship completion", "Journeyman electrician licence (exam on the electrical code)", "Master electrician licence (to pull permits / run a business)"], entry: ["Electrician's helper", "Apprentice electrician"], progression: ["Journeyman electrician", "Master electrician", "Electrical contractor", "Inspector or estimator"], keywords: ["electrician", "apprentice electrician", "electrical technician"] },
  plumber: { aliases: ["plumber", "pipefitter", "pipe fitter"], timeline: "4–5 years apprenticeship + licence", credentials: ["Plumbing apprenticeship completion", "Journeyman plumber licence", "Master plumber licence", "Backflow / gas-fitting endorsements where required"], entry: ["Plumber's helper", "Apprentice plumber"], progression: ["Journeyman", "Master plumber", "Plumbing contractor"], keywords: ["plumber", "apprentice plumber", "pipefitter"] },
  welder: { aliases: ["welder", "welding", "fabricator"], route: "Welding school/certification or apprenticeship", timeline: "6 months–2 years", credentials: ["Welding certificate (e.g. AWS-type certification in MIG/TIG/stick)", "Position/code certifications (structural, pipe)", "Safety training"], entry: ["Welder helper / fitter", "Production welder trainee"], progression: ["Certified welder", "Pipe/structural welder", "Weld inspector (CWI)", "Fabrication shop owner"], keywords: ["welder", "mig welder", "pipe welder", "fabricator"] },
  painter: { aliases: ["painter", "house painter", "decorator"], timeline: "3 months–2 years", keywords: ["painter", "commercial painter", "drywall finisher"] },
  roofer: { aliases: ["roofer", "roofing"], timeline: "3 months–3 years", keywords: ["roofer", "roofing installer"] },
  general_contractor: { aliases: ["general contractor", "contractor", "builder", "construction manager"], timeline: "4–10 years (trade experience + licence)", credentials: ["Contractor licence (exam + experience + bond/insurance)", "Safety certifications", "Construction-management certificate or degree (optional)"], entry: ["Tradesperson", "Assistant project manager"], progression: ["Foreman", "Project manager", "General contractor / owner"], keywords: ["general contractor", "project manager construction", "site superintendent"] },
  hvac_refrigeration_tech: { aliases: ["hvac", "hvac technician", "refrigeration technician", "air conditioning technician"], route: "Trade school/apprenticeship + EPA refrigerant certification + licence", timeline: "6 months–5 years", credentials: ["EPA Section 608 refrigerant certification (US)", "HVAC trade licence where required", "NATE or similar certifications"], entry: ["HVAC helper", "Apprentice technician"], progression: ["Service technician", "Install lead", "Service manager", "HVAC contractor"], keywords: ["hvac technician", "refrigeration technician", "hvac installer"] },
  locksmith_home_inspector: { aliases: ["locksmith", "home inspector"] },
  mechanic: { aliases: ["mechanic", "auto mechanic", "car mechanic", "automotive technician"], timeline: "6 months–2 years training + ASE certifications", credentials: ["Automotive technology certificate/associate degree", "ASE (or national) certifications", "State inspection/emissions licences where required"], entry: ["Lube tech / tyre tech", "Apprentice mechanic"], progression: ["Certified technician", "Master technician", "Shop foreman", "Shop owner"], keywords: ["auto mechanic", "automotive technician", "service technician"] },
  truck_driver: { aliases: ["truck driver", "trucker", "cdl driver", "lorry driver"], route: "CDL training + licence", timeline: "1–3 months for CDL + 6–12 months to build a record", credentials: ["Commercial Driver's Licence (CDL, class A for tractor-trailers)", "DOT medical card", "Endorsements (hazmat, tanker, doubles)", "Clean driving record"], entry: ["Company driver trainee", "Local delivery driver"], progression: ["Regional / long-haul driver", "Owner-operator", "Dispatcher / fleet manager"], keywords: ["cdl driver", "truck driver", "class a driver"] },
  delivery_driver: { aliases: ["delivery driver"], keywords: ["delivery driver", "courier driver"] },
  rideshare_driver: { aliases: ["rideshare driver", "uber driver", "lyft driver"], keywords: ["rideshare driver", "chauffeur"] },
  diesel_fleet_mechanic: { aliases: ["diesel mechanic", "diesel technician"], keywords: ["diesel technician", "fleet mechanic"] },
  ev_powertrain_technician: { aliases: ["ev technician", "electric vehicle technician"], keywords: ["ev technician", "hybrid technician"] },
  farmer: { aliases: ["farmer", "farming", "crop farmer", "agriculturist"], timeline: "1–4 years to start; farms grow over many seasons", keywords: ["farm worker", "farm manager", "agricultural technician"] },
  beekeeper: { aliases: ["beekeeper", "beekeeping", "apiarist"], keywords: ["beekeeper", "apiary technician"] },
  fisherman: { aliases: ["fisherman", "fisher", "fisherwoman"], keywords: ["deckhand fishing", "fisherman"] },
  barber: { aliases: ["barber", "barbering"], route: "Barber school + state licence", timeline: "9–18 months", credentials: ["Barber school completion (state-required hours)", "State barber licence (written + practical exam)", "Business licence (for shop owners)"], entry: ["Barber apprentice", "Shop assistant"], progression: ["Licensed barber", "Booth renter", "Shop owner"], keywords: ["barber", "licensed barber"] },
  hairstylist: { aliases: ["hairstylist", "hair stylist", "cosmetologist", "hairdresser"], keywords: ["hairstylist", "cosmetologist"] },
  tailor: { aliases: ["tailor", "seamstress", "dressmaker"], keywords: ["tailor", "alterations specialist"] },
  personal_trainer: { aliases: ["personal trainer", "fitness trainer"], route: "Accredited personal-training certification", timeline: "2–6 months", credentials: ["Accredited CPT certificate (NASM/ACE/ACSM-type)", "CPR/AED", "Liability insurance"], entry: ["Gym floor staff", "Junior trainer"], progression: ["Personal trainer", "Specialist (strength, rehab, nutrition)", "Gym manager / online coach"], keywords: ["personal trainer", "fitness instructor"] },
  caterer: { aliases: ["caterer", "catering"], keywords: ["caterer", "catering assistant", "cook"] },
  event_planner: { aliases: ["event planner", "wedding planner", "event coordinator"], keywords: ["event planner", "event coordinator"] },
  realtor: { aliases: ["realtor", "real estate agent", "real estate broker", "estate agent"], route: "Pre-licensing course + state exam + sponsoring broker", timeline: "2–6 months to licence", credentials: ["State pre-licensing coursework", "Real-estate salesperson licence (state exam)", "Broker licence (after experience)", "MLS / association membership"], entry: ["Licensed agent under a broker", "Transaction coordinator"], progression: ["Producing agent", "Team leader", "Broker-owner"], keywords: ["real estate agent", "realtor", "leasing agent"] },
  musician: { aliases: ["musician", "singer", "instrumentalist"], keywords: ["musician", "session musician", "music teacher"] },
  photographer: { aliases: ["photographer", "photography"], keywords: ["photographer", "photo assistant"] },
  actor: { aliases: ["actor", "actress"], keywords: ["actor", "voice actor"] },
  filmmaker: { aliases: ["filmmaker", "director", "videographer"], keywords: ["video editor", "production assistant", "filmmaker"] },
  graphic_designer: { aliases: ["graphic designer", "designer"], keywords: ["graphic designer", "brand designer"] },
  independent_writer: { aliases: ["writer", "author", "journalist", "copywriter"], keywords: ["content writer", "copywriter", "journalist"] },
  content_creator: { aliases: ["content creator", "influencer", "youtuber"], keywords: ["content creator", "social media manager"] },
  translator_interpreter: { aliases: ["translator", "interpreter"], keywords: ["translator", "interpreter"] },
  pharmacist: { aliases: ["pharmacist"], route: "PharmD + licensure", timeline: "6–8 years after high school", credentials: ["Pharm.D. from an accredited school", "NAPLEX + jurisdiction law exam (US) or national equivalent", "State pharmacist licence"], entry: ["Pharmacy intern", "Pharmacy technician"], progression: ["Staff pharmacist", "Clinical specialist", "Pharmacy manager"], keywords: ["pharmacist", "clinical pharmacist"] },
  pharmacy_technician: { aliases: ["pharmacy technician", "pharmacy tech"], route: "Certificate + exam + state registration", timeline: "3–12 months", credentials: ["Pharmacy-technician programme/on-the-job training", "PTCB/ExCPT-type certification", "State registration"], keywords: ["pharmacy technician"] },
  physician: { aliases: ["doctor", "physician", "md", "medical doctor", "gp"], route: "Pre-med → medical school → residency → licensure", timeline: "11–15 years after high school", credentials: ["Bachelor's degree with pre-med sciences", "MD/DO from an accredited school", "Licensing exams (USMLE/COMLEX or national)", "Residency + state licence", "Board certification"], entry: ["Pre-med student", "Medical student", "Resident"], progression: ["Attending physician", "Specialist / fellowship-trained", "Department head or practice owner"], keywords: ["physician", "hospitalist", "family medicine"] },
  surgeon_specialist_md: { aliases: ["surgeon", "specialist doctor"], timeline: "13–20 years after high school", keywords: ["surgeon", "surgical resident"] },
  nurse_practitioner_pa: { aliases: ["nurse practitioner", "np", "physician assistant", "pa"], route: "RN → MSN/DNP (NP) or PA master's → certification + licence", timeline: "6–8 years", keywords: ["nurse practitioner", "physician assistant"] },
  registered_nurse: { aliases: ["nurse", "registered nurse", "rn"], route: "ADN or BSN → NCLEX-RN → state licence", timeline: "2–4 years", credentials: ["ADN or BSN from an accredited nursing programme", "NCLEX-RN exam", "State RN licence", "BLS (and ACLS for acute care)"], entry: ["Nursing assistant", "Graduate nurse", "RN on a med-surg unit"], progression: ["Specialty RN (ICU, ER, OR)", "Charge nurse", "Nurse manager / NP / educator"], keywords: ["registered nurse", "rn", "staff nurse"] },
  licensed_practical_nurse: { aliases: ["lpn", "lvn", "licensed practical nurse"], route: "Practical-nursing diploma → NCLEX-PN → licence", timeline: "12–18 months", keywords: ["lpn", "lvn"] },
  medical_assistant_aide: { aliases: ["medical assistant", "nursing assistant", "cna"], route: "Certificate + certification", timeline: "4–12 months", keywords: ["medical assistant", "cna", "patient care tech"] },
  respiratory_therapist: { aliases: ["respiratory therapist", "rt"], route: "Associate/bachelor's → CRT/RRT exams → licence", timeline: "2–4 years", keywords: ["respiratory therapist"] },
  paramedic_emt: { aliases: ["paramedic", "emt", "ambulance"], route: "EMT course → experience → paramedic programme → exam", timeline: "EMT 3–6 months; paramedic 1–2 more years", credentials: ["EMT certification (NREMT or local)", "Paramedic certification/licence", "BLS/ACLS/PALS"], keywords: ["emt", "paramedic"] },
  radiology_imaging_tech: { aliases: ["radiology technician", "radiographer", "x-ray technician", "imaging technologist"], route: "Associate degree → ARRT-type certification → state licence", timeline: "2 years", keywords: ["radiologic technologist", "ct technologist", "mri technologist"] },
  physical_occupational_therapist: { aliases: ["physical therapist", "occupational therapist", "physiotherapist"], route: "Doctorate (DPT) / master's (OT) → licensure exam", timeline: "6–7 years", keywords: ["physical therapist", "occupational therapist"] },
  dentist: { aliases: ["dentist"], route: "Bachelor's → DDS/DMD → licensing exam", timeline: "8 years (+ residency for specialists)", credentials: ["Bachelor's degree with pre-dental sciences", "DDS/DMD from an accredited school", "National + regional/state clinical exams", "State dental licence", "Specialty residency (optional)"], entry: ["Dental assistant (while preparing)", "Dental student"], progression: ["Associate dentist", "Specialist", "Practice owner"], keywords: ["dentist", "associate dentist"] },
  dental_hygienist_assistant: { aliases: ["dental hygienist", "dental assistant"], route: "Associate degree (hygienist) / certificate (assistant) → licence", timeline: "9 months–3 years", keywords: ["dental hygienist", "dental assistant"] },
  veterinarian: { aliases: ["veterinarian", "vet", "veterinary doctor"], route: "Bachelor's → DVM → licensing exam", timeline: "8 years", credentials: ["Pre-vet bachelor's degree", "DVM from an accredited school", "NAVLE / national exam", "State veterinary licence"], entry: ["Veterinary assistant", "Vet-tech trainee"], progression: ["Associate veterinarian", "Specialist", "Clinic owner"], keywords: ["veterinarian", "veterinary technician"] },
  caregiver: { aliases: ["caregiver", "carer", "home care aide"], route: "Short training + background check", timeline: "1–3 months", keywords: ["caregiver", "home care aide"] },
  home_health_aide: { aliases: ["home health aide", "hha"], keywords: ["home health aide"] },
  childcare_worker: { aliases: ["childcare worker", "nanny", "daycare worker", "babysitter"], keywords: ["childcare", "nanny", "early childhood assistant"] },
  community_health_worker: { aliases: ["community health worker", "chw"], keywords: ["community health worker"] },
  herbal_medicine_practitioner: { aliases: ["herbalist", "herbal medicine practitioner", "naturopath"], route: "Accredited programme (rules vary widely by location)", keywords: ["herbalist", "wellness practitioner"] },
  tutor: { aliases: ["tutor", "private tutor"], keywords: ["tutor", "teaching assistant", "teacher"] },
  driving_instructor: { aliases: ["driving instructor", "driving teacher"], keywords: ["driving instructor"] },
  security_guard: { aliases: ["security guard", "security officer", "bouncer"], route: "Licensed guard training course", timeline: "1–3 months", keywords: ["security officer", "security guard"] },
  firefighter_search_rescue: { aliases: ["firefighter", "fire fighter", "rescue"], route: "Application → physical test → fire academy → probation", timeline: "6–18 months to hire", credentials: ["Firefighter I/II academy certification", "EMT certification (often required)", "CPAT-type physical test", "Background and medical clearance"], keywords: ["firefighter", "emt firefighter"] },
  emergency_dispatcher_resilience: { aliases: ["dispatcher", "911 dispatcher"], keywords: ["911 dispatcher", "emergency dispatcher"] },
  private_investigator_executive_protection: { aliases: ["private investigator", "pi", "bodyguard"], keywords: ["private investigator", "close protection"] },
  religious_worker_clergy: { aliases: ["clergy", "pastor", "priest", "imam", "minister"], route: "Faith-community formation, ordination/endorsement; seminary often", keywords: ["chaplain", "church administrator"] },
  nonprofit_worker: { aliases: ["nonprofit worker", "ngo worker"], keywords: ["nonprofit program coordinator", "fundraising"] },
  red_team_operator: { aliases: ["red team", "red teamer", "penetration tester", "pentester", "ethical hacker"], keywords: ["penetration tester", "red team operator", "security analyst"] },
  software_engineer: { aliases: ["software engineer", "developer", "programmer", "software developer", "web developer"], keywords: ["software engineer", "junior developer", "full stack developer"] },
  ai_workflow_nocode_specialist: { aliases: ["ai specialist", "no code developer", "automation specialist"], keywords: ["automation specialist", "ai workflow", "no-code developer"] },
  trial_litigation_lawyer: { aliases: ["lawyer", "attorney", "litigator", "trial lawyer", "litigation lawyer"], keywords: ["litigation associate", "attorney", "legal counsel"] },
  judge_judicial_magistrate: { aliases: ["judge", "magistrate"], route: "Law degree + years of practice + appointment/election", timeline: "10–20 years", keywords: ["judicial clerk", "magistrate"] },
  paralegal_court_reporter: { aliases: ["paralegal", "court reporter", "legal assistant"], route: "Paralegal certificate/associate degree or court-reporting programme", timeline: "1–2 years", keywords: ["paralegal", "court reporter"] },
  cpa_accountant: { aliases: ["cpa", "accountant", "certified public accountant"], route: "Accounting degree (150 credit hours in most US states) → CPA exam → experience → licence", timeline: "5–6 years", keywords: ["staff accountant", "cpa", "tax associate"] },
  bookkeeper_payroll_tax_specialist: { aliases: ["bookkeeper", "payroll specialist", "tax preparer"], keywords: ["bookkeeper", "payroll specialist", "tax preparer"] },
  cnc_machinist_tool_die: { aliases: ["machinist", "cnc machinist", "cnc operator", "tool and die maker"], keywords: ["cnc machinist", "machine operator"] },
  solar_pv_microgrid_technician: { aliases: ["solar installer", "solar technician", "solar panel installer", "solar pv technician"], route: "Short technical training + NABCEP-type certification", timeline: "3 months–2 years", credentials: ["NABCEP PV Associate/Installer (or local equivalent)", "Electrical licence where required for connections", "OSHA 10/30 and fall-protection"], entry: ["Solar installer helper", "Roofing/electrical helper"], progression: ["Lead installer", "Site supervisor / designer", "Solar contractor"], keywords: ["solar installer", "solar technician", "pv installer"] },
  directv_satellite_broadband_av_tech: { aliases: ["directv installer", "satellite installer", "satellite technician", "cable installer"], keywords: ["satellite installer", "cable technician", "broadband installer"] },
  fiber_optic_tower_datacenter_tech: { aliases: ["fiber technician", "fibre technician", "tower climber", "data center technician"], keywords: ["fiber technician", "tower technician", "data center technician"] },
  aircraft_mechanic_avionics_atc: { aliases: ["aircraft mechanic", "a&p mechanic", "avionics technician", "air traffic controller"], keywords: ["aircraft mechanic", "avionics technician"] },
  maritime_shipbuilder_harbor_pilot: { aliases: ["seafarer", "ship builder", "harbor pilot"], keywords: ["deckhand", "shipyard worker"] },
};

for (const [k, v] of Object.entries(EXPANSION_OVERRIDES)) if (!OVERRIDES[k]) OVERRIDES[k] = v;

const STARTING_POINTS: Record<string, { summary: string; steps: Array<[string, string, string?]>; keywords: string[]; aliases: string[] }> = {
  school_leaver: {
    summary: "You are leaving school and choosing a direction. The goal: explore, get a first credential or job, and build experience quickly.",
    aliases: ["school leaver", "high school graduate", "leaving school"],
    keywords: ["entry level", "apprentice", "trainee", "junior"],
    steps: [
      ["Take a quick self-assessment", "List what you enjoy, what you are good at and your constraints (money, location). Use O*NET interest profiler or your school counsellor.", "1 week"],
      ["Explore 3–5 careers on ConnectLn", "Ask Noctis \"How do I become a …\" for each. Compare training length, cost and demand.", "1–2 weeks"],
      ["Pick a training or earning route", "Choose between an apprenticeship, vocational course, college, military or an entry job — consider earning while learning.", "1 month"],
      ["Get your first experience", "Take part-time work, volunteering or a trainee role; collect references.", "3–12 months"],
      ["Build your profile and resume", "Complete your ConnectLn profile, then use Resume Prep to create a first resume.", "1 day"],
    ],
  },
  unemployed_job_seeker: {
    summary: "You are looking for work. Focus on a clear target role, a strong resume, and consistent applications and networking.",
    aliases: ["unemployed", "job seeker", "looking for work", "find a job"],
    keywords: ["hiring now", "entry level", "full time"],
    steps: [
      ["Define your target roles", "Pick 1–3 job titles that match your skills and the local market.", "1–2 days"],
      ["Refresh your resume", "Tailor it to each target role with keywords and measurable results; use Resume Prep.", "1–2 days"],
      ["Close skill gaps quickly", "Take short courses/certificates that employers in your target roles list.", "2–8 weeks"],
      ["Apply and network daily", "Use ConnectLn Jobs, message recruiters, join guilds and ask for referrals; follow up on applications.", "Ongoing"],
      ["Prepare for interviews", "Prepare STAR stories, practise out loud, and research each employer.", "Before each interview"],
      ["Use support services", "Contact your local workforce centre or employment office for training funds and job-search help.", "Anytime"],
    ],
  },
  career_changer: {
    summary: "You are switching careers. The key is mapping transferable skills, filling specific gaps, and gaining proof in the new field.",
    aliases: ["career changer", "change careers", "switch careers", "career change"],
    keywords: ["career change", "transition", "trainee", "associate"],
    steps: [
      ["Inventory transferable skills", "List skills and achievements from your past work that apply to the new field.", "1 week"],
      ["Research the target career", "Ask Noctis \"How do I become a …\" for your target role; talk to 2–3 professionals via ConnectLn Network.", "2–4 weeks"],
      ["Identify and close the gaps", "Pick the shortest credential/training that gets you interviews — a certificate, apprenticeship or bridging course.", "1–12 months"],
      ["Get proof of ability", "Do a project, volunteer, freelance or shadow someone so you have something to show.", "1–6 months"],
      ["Reframe your resume", "Lead with transferable skills and the new credential; Resume Prep can restructure it.", "1–2 days"],
      ["Apply to bridge roles", "Target roles that value your old experience plus the new skills.", "Ongoing"],
    ],
  },
  volunteer: {
    summary: "Volunteering is a great way to build skills, references and a network — and can lead to paid work.",
    aliases: ["volunteer", "volunteering"],
    keywords: ["volunteer coordinator", "community outreach", "program assistant"],
    steps: [
      ["Choose a cause and role", "Pick causes you care about and roles that build skills you want (event help, tutoring, outreach, admin).", "1 week"],
      ["Find organisations", "Check local nonprofits, schools, hospitals, faith groups and ConnectLn community pages.", "1–2 weeks"],
      ["Commit and track your impact", "Show up reliably and keep a log of hours, tasks and results.", "Ongoing"],
      ["Ask for references and training", "Request a reference letter and any certifications offered.", "After 3+ months"],
      ["Convert to paid work", "Add the experience to your resume with measurable results and apply to related paid roles.", "Ongoing"],
    ],
  },
  military_veteran: {
    summary: "Your service built leadership, discipline and technical skills. The path is to translate that experience into civilian terms and credentials.",
    aliases: ["veteran", "military veteran", "ex military", "leaving the military"],
    keywords: ["veteran", "military friendly", "security", "logistics", "operations"],
    steps: [
      ["Translate your military experience", "Use your service's skills-translator and O*NET military crosswalk to map your MOS/rate to civilian job titles.", "1 week"],
      ["Check benefits and credentialing", "Look into education benefits, credentialing assistance (e.g. USMC/Army/Navy COOL programmes) and veteran employment services.", "2–4 weeks"],
      ["Choose a target field", "Common matches: security, logistics, trades, IT/cyber, public safety, project management.", "1–2 weeks"],
      ["Get any needed civilian credential", "Add the licence or certification that makes you hireable (CDL, trade licence, Security+, PMP, etc.).", "1–12 months"],
      ["Write a civilian resume", "Replace jargon with outcomes (people led, equipment value, budget, mission results). Use Resume Prep.", "1–2 days"],
      ["Network with veterans and employers", "Use ConnectLn Network and veteran hiring programmes; seek veteran mentors.", "Ongoing"],
    ],
  },
  trade_school_student: {
    summary: "You are already in trade school. Maximise it: certifications, hands-on hours and employer connections before you graduate.",
    aliases: ["trade school student", "vocational student"],
    keywords: ["apprentice", "trainee", "helper"],
    steps: [
      ["Know your licensing path", "Confirm which hours/exams your trade needs and track them from day one.", "Now"],
      ["Add safety and vendor certifications", "Get OSHA/first aid and any tool or vendor certificates your programme offers.", "During programme"],
      ["Get paid experience early", "Apply for apprenticeships, co-ops and helper jobs while still studying.", "During programme"],
      ["Build a portfolio", "Photograph projects and keep an hours log and instructor references.", "Ongoing"],
      ["Prepare to launch", "Update your profile and resume with Resume Prep; ask Noctis how to become your specific trade for detailed steps.", "Before graduation"],
    ],
  },
  apprentice: {
    summary: "You are an apprentice. Success depends on logging hours, learning from your journeyman and passing your licensing exam.",
    aliases: ["apprentice", "apprenticeship"],
    keywords: ["apprentice", "journeyman", "helper"],
    steps: [
      ["Track your hours and tasks", "Keep a dated log signed by your supervisor — you will need it for licensing.", "Ongoing"],
      ["Complete related instruction", "Attend classroom hours and keep grades and attendance strong.", "Ongoing"],
      ["Learn from the journeyman", "Ask questions, rotate through tasks and learn code and safety reasons, not just methods.", "Ongoing"],
      ["Prepare for your exam", "Study the code book and take practice exams 2–3 months before eligibility.", "2–3 months"],
      ["Plan your next step", "Journeyman → specialise → supervisor → contractor. Ask Noctis for your trade's path.", "Final year"],
    ],
  },
  college_student: {
    summary: "You are in college. Use your time to gain experience, internships and a network aligned with a target profession.",
    aliases: ["college student", "university student", "student"],
    keywords: ["internship", "entry level", "graduate program"],
    steps: [
      ["Pick a target profession", "Ask Noctis how to become your target profession, then align electives and projects.", "Early"],
      ["Get internships and projects", "Apply each summer; do labs, club projects or freelance work.", "Each year"],
      ["Build a network", "Connect with alumni, professors and professionals on ConnectLn.", "Ongoing"],
      ["Earn extra credentials", "Add certificates or licence-prep alongside your degree.", "Ongoing"],
      ["Prepare to graduate", "Draft a resume with Resume Prep, practise interviews and start applying 6 months before graduation.", "Final year"],
    ],
  },
  stars_retiree_freelancer_newcomer: {
    summary: "You are a retiree, freelancer or newcomer starting a new chapter. Define what you want (income, purpose, flexibility) and match it to a path.",
    aliases: ["retiree", "newcomer", "freelancer", "new to the country", "immigrant"],
    keywords: ["part time", "flexible", "contract", "consultant"],
    steps: [
      ["Clarify your goals", "Decide on income needs, hours per week and the kind of work you want.", "1 week"],
      ["Translate or validate credentials", "Newcomers: check credential-recognition services for your profession. Retirees: identify skills that are in demand.", "2–8 weeks"],
      ["Choose a path", "Part-time/contract work, consulting, mentoring or starting a small business.", "2 weeks"],
      ["Set up your profile and offer", "Build your ConnectLn profile and a clear service/skills summary; use Resume Prep.", "1–2 days"],
      ["Network and test", "Join guilds, find a mentor and try a small paid project.", "1–3 months"],
    ],
  },
};

const STARTING_IDS = new Set([
  "school_leaver", "unemployed_job_seeker", "career_changer", "volunteer", "military_veteran",
  "trade_school_student", "apprentice", "college_student", "stars_retiree_freelancer_newcomer",
]);

export function cleanTitle(t: string): string {
  return t.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function subRoles(title: string): string[] {
  return cleanTitle(title)
    .split(/\s*(?:[\/&,]|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function buildSteps(parts: Array<[string, string, string?]>, title: string): PathwayStep[] {
  const first: [string, string, string?] = ["Decide this is right for you", `Learn what a ${cleanTitle(title)} does day to day: shadow or interview someone in the role, watch day-in-the-life videos, and read the job description of live openings on ConnectLn Jobs. Confirm the physical, educational and legal requirements fit you.`, "1–2 weeks"];
  const last: [string, string, string?] = ["Build your ConnectLn profile, resume and network", "Add your credentials, skills and projects to your ConnectLn profile; use Resume Prep to create a role-targeted resume; join relevant guilds and connect with professionals and mentors in this field.", "1–2 days, then ongoing"];
  return [first, ...parts, last].map((s, i) => ({ n: i + 1, title: s[0], detail: s[1], duration: s[2] }));
}

const professionIndex = new Map<string, CareerProfessionRow>(CAREER_PROFESSIONS.map((p) => [p.id, p]));

export function getPathway(id: string): PathwayRecord | null {
  const p = professionIndex.get(id);
  if (!p) return null;
  const ov = OVERRIDES[id] || {};
  const label = ENCLAVE_TEMPLATES[p.enclave]?.label || "Other";
  const disclaimer = DISCLAIMER;
  const skills = p.skills.length ? p.skills : [];
  const tools = p.tools.length ? p.tools : [];
  const title = p.title;

  if (STARTING_IDS.has(id)) {
    const sp = STARTING_POINTS[id];
    return {
      profession_id: id, title, enclave_id: p.enclave, enclave_label: label, summary: sp.summary,
      route_type: "Starting-point guidance (not a single licensed career)", timeline: "Typically 1–6 months to a clear next step",
      steps: buildSteps(sp.steps, title).filter((_, i, a) => i !== 0 && i !== a.length - 1).map((s, i) => ({ ...s, n: i + 1 })),
      credentials: ["Depends on the target career — ask Noctis \"How do I become a …\" for specifics"],
      skills, tools, entry_level_roles: ["Trainee / apprentice / junior roles in your target field"], progression: ["Skilled role in your chosen field", "Lead / specialist", "Manager or business owner"],
      related_job_keywords: sp.keywords,
      resume_tips: ["Lead with a short summary of your goal and top strengths", "Use measurable achievements even from school, volunteering or informal work", "Match keywords from the jobs you want", "Keep it to one page"],
      resources: GENERAL_RESOURCES, disclaimer, starting_point: true,
    };
  }

  const tpl = ENCLAVE_TEMPLATES[p.enclave];
  const subs = subRoles(title);
  const multi = subs.length > 1;
  const summary = ov.summary || `A ${cleanTitle(title)} ${tpl ? `works in the ${tpl.label} field` : "works in this field"}.${multi ? ` This ConnectLn profession bundles several roles (${subs.join(", ")}); the steps below apply to each, and you can specialise in one or combine them.` : ""} Skills typically used: ${skills.slice(0, 5).join(", ") || "see below"}.`;
  const stepParts: Array<[string, string, string?]> = [...(tpl?.steps || [])];
  if (ov.extraSteps) stepParts.splice(stepParts.length - 1, 0, ...ov.extraSteps);
  if (multi) stepParts.splice(1, 0, ["Pick the specific role(s)", `This profession covers: ${subs.join("; ")}. Choose which one you want first — each can have different licences, courses and employers — then follow the steps below for it.`, "1–2 weeks"]);
  const keywords = ov.keywords || Array.from(new Set([cleanTitle(title).toLowerCase(), ...subs.map((s) => s.toLowerCase())])).slice(0, 6);
  return {
    profession_id: id, title, enclave_id: p.enclave, enclave_label: label, summary,
    route_type: ov.route || tpl?.route || "Training and experience",
    timeline: ov.timeline || tpl?.timeline || "Varies",
    steps: buildSteps(stepParts, title),
    credentials: ov.credentials || tpl?.credentials || [],
    skills, tools,
    entry_level_roles: ov.entry || tpl?.entry || [],
    progression: ov.progression || tpl?.progression || [],
    related_job_keywords: keywords,
    resume_tips: tpl?.resume || [],
    resources: [...(tpl?.resources || []), ...GENERAL_RESOURCES],
    disclaimer, starting_point: false,
  };
}

export function allPathways(): PathwayRecord[] {
  return CAREER_PROFESSIONS.map((p) => getPathway(p.id)!).filter(Boolean);
}

export const CAREER_COUNT = CAREER_PROFESSIONS.length;

// ───────────────────────── matching ─────────────────────────
const STOP = new Set(["a", "an", "the", "to", "be", "become", "becoming", "how", "do", "i", "can", "what", "does", "it", "take", "of", "in", "as", "for", "my", "me", "path", "career", "job", "work", "working", "steps", "way", "get", "start", "starting", "into", "required", "requirements", "need", "become", "is", "are", "and", "or", "licensed", "certified", "professional"]);

export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function stem(w: string): string {
  return w.replace(/(ies)$/, "y").replace(/(ers|er|ors|or|ing|ists|ist|ians|ian|ics|ic|s)$/, "");
}
function tokens(s: string): string[] {
  return norm(s).split(" ").filter((w) => w && !STOP.has(w)).map(stem).filter(Boolean);
}

export function candidatePhrases(p: CareerProfessionRow): string[] {
  const ov = OVERRIDES[p.id];
  const list = [p.id.replace(/_/g, " "), cleanTitle(p.title), ...subRoles(p.title)];
  if (ov?.aliases) list.push(...ov.aliases);
  if (STARTING_POINTS[p.id]) list.push(...STARTING_POINTS[p.id].aliases);
  return list.map(norm).filter(Boolean);
}

export interface CareerMatch { profession_id: string; title: string; score: number }

export function matchProfessions(target: string, limit = 5): CareerMatch[] {
  const t = norm(target);
  if (!t) return [];
  const tt = tokens(target);
  if (!tt.length) return [];
  const ttSet = new Set(tt);
  const results: CareerMatch[] = [];
  for (const p of CAREER_PROFESSIONS) {
    let best = 0;
    if (norm(p.title) === t || norm(cleanTitle(p.title)) === t || p.id.replace(/_/g, " ") === t) best = 101;
    for (const ph of candidatePhrases(p)) {
      let score = 0;
      if (ph === t) score = 100;
      else {
        const pt = tokens(ph);
        if (!pt.length) continue;
        const ptSet = new Set(pt);
        const inter = pt.filter((w) => ttSet.has(w)).length;
        if (!inter) continue;
        const recall = inter / tt.length;
        const precision = inter / ptSet.size;
        score = Math.round(60 * recall + 30 * precision);
        if (recall === 1 && precision === 1) score = 95;
        // Phrase fully contained in user text → strong
        else if (` ${t} `.includes(` ${ph} `)) score = Math.max(score, 80 + Math.min(10, pt.length));
        else if (` ${ph} `.includes(` ${t} `)) score = Math.max(score, 70);
      }
      if (score > best) best = score;
    }
    // Slight preference for the shortest (most generic) profession on ties
    if (best > 0) results.push({ profession_id: p.id, title: p.title, score: best - Math.min(5, Math.floor(p.id.length / 20)) });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function professionsByEnclave(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of CAREER_PROFESSIONS) (out[p.enclave] ||= []).push(p.id);
  return out;
}

export function validatePathway(r: PathwayRecord): string[] {
  const errs: string[] = [];
  if (r.steps.length < 4) errs.push("fewer than 4 steps");
  if (!r.disclaimer) errs.push("missing disclaimer");
  if (!r.related_job_keywords.length) errs.push("no job keywords");
  if (!r.resume_tips.length) errs.push("no resume tips");
  if (!r.resources.length) errs.push("no resources");
  if (!r.timeline) errs.push("no timeline");
  if (!r.credentials.length) errs.push("no credentials");
  if (!r.progression.length) errs.push("no progression");
  if (!r.entry_level_roles.length) errs.push("no entry roles");
  return errs;
}

/** Returns exact-alias collisions between different professions (they would make routing ambiguous). */
export function aliasClashes(): string[] {
  const owner = new Map<string, string>();
  const out: string[] = [];
  for (const p of CAREER_PROFESSIONS) {
    const list = [...(OVERRIDES[p.id]?.aliases || []), ...(STARTING_POINTS[p.id]?.aliases || [])].map(norm);
    for (const a of list) {
      const prev = owner.get(a);
      if (prev && prev !== p.id) out.push(a + ": " + prev + " vs " + p.id);
      owner.set(a, p.id);
    }
  }
  return out;
}
