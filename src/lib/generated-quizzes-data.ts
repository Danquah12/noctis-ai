/**
 * Pre-generated Board Exam Simulation Vignettes
 * Generated via the Google Antigravity Python SDK and local AI runtime.
 */
export interface AntigravityQuizData {
  exam: string;
  domain: string;
  vignette: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: "A" | "B" | "C" | "D";
  high_yield_pearl: string;
  tactics_and_technique: string;
}

export const PREGENERATED_QUIZZES_ARCHIVE: Record<string, AntigravityQuizData[]> = {
  "aws_certified_solutions_architect": [
    {
      "exam": "AWS Certified Solutions Architect - Professional",
      "domain": "Domain 2: Design for New Solutions - Resilient Architectures",
      "vignette": "An international fintech institution hosts an automated foreign exchange settlement API across two AWS Regions: us-east-1 (primary) and us-west-2 (disaster recovery). The workload's compute layer is deployed on Amazon Elastic Container Service (Amazon ECS) behind Application Load Balancers (ALBs), persisting state to a multi-AZ Amazon Aurora PostgreSQL cluster. During a simulated regional outage of us-east-1, the architecture failed its business continuity audit: client traffic took up to 12 minutes to reroute due to downstream corporate resolver caching of Amazon Route 53 DNS records, violating the mandatory Recovery Time Objective (RTO) of 60 seconds. Furthermore, the data layer sustained 45 seconds of transactional discrepancy before database promotion completed, breaching the Recovery Point Objective (RPO) of 5 seconds. A Solutions Architect must re-architect the solution to achieve automated regional failover within the 60-second RTO, maintain an RPO under 5 seconds, and eliminate client resolver caching latency.",
      "question": "Which architecture meets these requirements with the least operational overhead?",
      "options": {
        "A": "Deploy AWS Global Accelerator with two dual-stack Anycast IP addresses, configuring endpoint groups for the ALBs in us-east-1 and us-west-2 with continuous TCP health checks. Convert the Aurora database into an Amazon Aurora Global Database spanning us-east-1 and us-west-2 with physical storage-level replication. Use Route 53 Application Recovery Controller (ARC) zonal and regional routing controls with AWS Lambda automation to initiate managed unplanned failover of the Aurora Global Database during primary failure.",
        "B": "Deploy an Amazon CloudFront distribution in front of both regional ALBs with an origin group configuring primary and secondary origins for automated 502/503 failover. Migrate the persistence layer from Aurora PostgreSQL to Amazon DynamoDB Global Tables with multi-region active-active replication to achieve continuous millisecond RPO and immediate failover.",
        "C": "Configure Amazon Route 53 with multi-value answer routing and lower the Time to Live (TTL) of the API endpoint record to 1 second. Configure AWS Database Migration Service (AWS DMS) with Change Data Capture (CDC) to stream continuous writes from the primary Aurora cluster in us-east-1 to a read-replica Aurora cluster in us-west-2, automating promotion via AWS Step Functions.",
        "D": "Provision an AWS Transit Gateway multi-region peering connection between us-east-1 and us-west-2. Deploy Network Load Balancers (NLBs) routing traffic across regions through the Transit Gateway. Configure Aurora PostgreSQL with asynchronous logical cross-region read replication and write-forwarding enabled on the secondary replica.",
        "correct_answer": "A",
        "high_yield_pearl": "AWS Global Accelerator eliminates DNS caching latency by utilizing static Anycast IP addresses routed across the AWS global backbone, achieving failover within seconds (<30s). Paired with Amazon Aurora Global Database (storage-level physical replication with typical lag <1s), this is the definitive AWS reference pattern for sub-minute RTO and sub-5-second RPO multi-region architectures.",
        "tactics_and_technique": "Apply the 3-step elimination heuristic for Multi-Region AWS DR questions: 1. Evaluate Routing Mechanism: If the vignette cites client-side/ISP DNS resolver caching or strict <60s RTO, eliminate all DNS-based solutions (Route 53 TTL reductions fail because client/ISP resolvers frequently enforce a minimum TTL floor, making Option C incorrect). CloudFront origin groups (Option B) handle read/cache workloads well but lack fine-grained transactional API failover and force a drastic NoSQL migration from relational PostgreSQL. 2. Evaluate Data Layer RPO: AWS DMS CDC (Option C) and logical replication (Option D) introduce network/compute overhead that routinely exceeds strict 5-second RPOs under peak write loads, whereas Aurora Global Database uses dedicated storage-layer physical replication directly on the NVMe/EBS storage tier without compute bottlenecks (<1 second lag). 3. Confirm ARC Control: Route 53 Application Recovery Controller provides deterministic execution without split-brain risk, satisfying RTO < 60s and RPO < 5s."
      }
    }
  ],
  "california_bar_examination": [
    {
      "exam": "California Bar Examination",
      "domain": "Constitutional Law, Due Process & Commercial Speech",
      "vignette": "In response to rising consumer complaints regarding aggressive marketing by debt relief agencies, a state legislature enacted the 'Consumer Solvency Protection Act.' Section 1 of the Act imposes a complete prohibition on direct-mail and digital targeted advertisements by licensed debt-settlement attorneys that accurately quote verifiable, court-approved statutory fee caps, with the legislature asserting that such advertisements 'mislead distressed debtors into assuming all legal fees are uniformly inexpensive.' Section 2 provides that if the State Department of Financial Oversight receives any unverified third-party complaint asserting that an attorney's commercial communication violates Section 1, the Department may immediately suspend the attorney's debt-settlement certification and advertising clearance for up to 180 days prior to initiating a formal administrative hearing. A licensed California attorney who maintains an active debt-settlement practice sends truthful, verifiable letters to individuals with recorded civil judgments against them, explicitly detailing statutory fee ceilings. Upon an anonymous online submission alleging a violation, the Department summarily suspended the attorney's certification without prior notice or a preliminary hearing. The attorney timely filed an action in federal district court seeking declaratory and injunctive relief on constitutional grounds under 42 U.S.C. § 1983.",
      "question": "Which of the following best characterizes the likelihood of success of the attorney's constitutional challenges under the First and Fourteenth Amendments?",
      "options": {
        "A": "The attorney will prevail on the First Amendment challenge because commercial speech is subject to strict scrutiny, but will fail on the Due Process challenge because post-deprivation hearings satisfy administrative due process for commercial licenses.",
        "B": "The attorney will prevail on both the First Amendment challenge, because the statutory ban fails intermediate scrutiny under the Central Hudson framework, and the Fourteenth Amendment challenge, because the summary suspension without a pre-deprivation hearing fails the Mathews v. Eldridge balancing test.",
        "C": "The attorney will fail on both challenges because states possess plenary police power to regulate professional advertising to prevent consumer deception, and summary suspensions are per se constitutional where financial transactions are implicated.",
        "D": "The attorney will prevail on the Due Process challenge due to lack of a pre-deprivation hearing, but will fail on the First Amendment challenge because targeted direct mailings to distressed debtors constitute inherently deceptive commercial speech."
      },
      "correct_answer": "B",
      "high_yield_pearl": "Commercial speech concerning lawful activity that is not inherently misleading is evaluated under Central Hudson intermediate scrutiny, requiring the state to prove a substantial government interest, direct and material advancement, and a narrowly tailored fit (blanket bans on truthful price/fee advertising regularly fail). Under Procedural Due Process, a professional license is a protected property interest requiring notice and a meaningful opportunity to be heard before deprivation under the Mathews v. Eldridge balancing test, unless justified by extraordinary emergency circumstances.",
      "tactics_and_technique": "Apply a two-track constitutional analysis: (1) First Amendment Track: Classify the expression as commercial speech. Determine if it is lawful and non-misleading. Since verifiable, accurate fee caps are truthful, apply Central Hudson's three-prong intermediate scrutiny test (substantial interest, direct advancement, reasonable fit). A prophylactic, blanket ban on truthful information fails the reasonable fit requirement because the state could mandate disclaimers rather than suppress truthful speech. Eliminate options applying strict scrutiny (Option A) or rational basis/unprotected classification (Option C & D). (2) Fourteenth Amendment Due Process Track: Identify the property interest in a professional license or certification. Apply the Mathews v. Eldridge three-factor balancing test: private interest affected (livelihood/practice), risk of erroneous deprivation under unverified complaints coupled with a lengthy 180-day delay, and government burden. Because an anonymous, unverified complaint does not constitute an emergency requiring summary action, the absence of pre-suspension notice or prompt hearing violates procedural due process."
    }
  ],
  "california_bar_exam": [
    {
      "exam": "California Bar Examination",
      "domain": "Civil Procedure - Specific Personal Jurisdiction & Minimum Contacts",
      "vignette": "A driver residing in California was severely injured in a rollover accident on Interstate 5 near Sacramento when the electronic stability control system of her sport-utility vehicle (SUV) malfunctioned. The driver filed a strict products liability action in California Superior Court against the vehicle's manufacturer, a Delaware corporation with its principal place of business and corporate headquarters in Michigan. The vehicle had been designed in Michigan, assembled in Kentucky, and originally sold by an authorized dealership to a third party in Oregon. Three years later, the driver purchased the vehicle used from a private seller in Nevada and immediately registered, insured, and garaged it in California.\n\nThe manufacturer does not maintain corporate offices, manufacturing plants, or direct employees in California. However, the manufacturer engages in extensive economic activity within the state: it broadcasts statewide television and digital advertising campaigns targeted directly at California consumers, maintains an established distribution network supplying dozens of independently owned authorized dealerships across California, sells thousands of vehicles of the exact same SUV make and model in California annually, and regularly distributes genuine replacement parts and technical service bulletins to California repair facilities.\n\nPrior to filing an answer or demurrer, the manufacturer timely filed a motion to quash service of summons pursuant to California Code of Civil Procedure Section 418.10, contending that California courts lack personal jurisdiction because the manufacturer's forum contacts did not causally produce the driver's injuries, as the specific vehicle involved in the crash was neither designed, manufactured, nor initially sold within California.",
      "question": "How should the California Superior Court rule on the manufacturer's motion to quash service of summons?",
      "options": {
        "A": "Grant the motion, because the manufacturer is neither incorporated in California nor maintains its principal place of business there, precluding general personal jurisdiction.",
        "B": "Grant the motion, because specific personal jurisdiction requires a strict causal nexus showing that the plaintiff's claim would not have occurred but for the defendant's in-state activities.",
        "C": "Deny the motion, because the manufacturer purposefully availed itself of the California market for that vehicle model, and the driver's claims sufficiently relate to those forum contacts despite the lack of a direct causal link.",
        "D": "Deny the motion, because California's long-arm statute authorizes the exercise of jurisdiction whenever an alleged product defect results in physical injury within the state, irrespective of the manufacturer's marketing conduct."
      },
      "correct_answer": "C",
      "high_yield_pearl": "Under the Due Process Clause of the Fourteenth Amendment and Ford Motor Co. v. Montana Eighth Judicial District Court (2021), the requirement that a claim 'arise out of or relate to' the defendant's forum contacts is phrased in the disjunctive. Specific personal jurisdiction does not require a strict causal ('but-for' or proximate) connection between the defendant's in-state conduct and the plaintiff's injury, provided the defendant systematically cultivated and served the forum's market for the very type of product that malfunctioned and caused injury in the forum. In California, California Code of Civil Procedure § 410.10 extends jurisdiction to the constitutional ceiling, and a motion to quash under CCP § 418.10 is the mandatory special appearance procedure to avoid waiver.",
      "tactics_and_technique": "1. Identify the Procedural Mechanism: In California practice, lack of personal jurisdiction must be asserted via a Motion to Quash Service of Summons under CCP § 418.10 before or concurrently with any substantive responsive pleading (answer, demurrer, or motion to strike); failure to do so constitutes a general appearance and waives the defense.\n2. Long-Arm Analysis: Note that California's long-arm statute (CCP § 410.10) stretches coextensively with the Due Process Clause of the Fourteenth Amendment, making the constitutional minimum contacts inquiry decisive.\n3. Segment General vs. Specific Jurisdiction: Eliminate Option A immediately. General jurisdiction requires the entity to be 'essentially at home' (incorporation or principal place of business under Daimler AG v. Bauman). Although general jurisdiction is absent, specific jurisdiction remains viable.\n4. Apply the Three-Prong Specific Jurisdiction Test: (a) Purposeful availment / purposeful direction; (b) Relatedness ('arising out of or relating to' the forum contacts); and (c) Traditional notions of fair play and substantial justice.\n5. Evaluate Relatedness Under 'Ford Motor Co.': Scrutinize the causation trap (Option B). Post-Ford Motor Co. (2021), the Supreme Court clarified that relatedness does not require proof of a direct causal chain (i.e., that the specific unit was designed, built, or sold in the forum). When a manufacturer purposefully cultivates, sells, and services the same model extensively in the forum state, an injury occurring in-state to a forum resident 'relates to' those contacts.\n6. Reject Pure Effects / Unilateral Contact Traps: Eliminate Option D because due process forbids establishing jurisdiction based solely on the site of the injury or the plaintiff's unilateral choice to bring the property into the state (World-Wide Volkswagen; Walden v. Fiore); purposeful availment directed at the forum state itself is an irreducible constitutional prerequisite."
    }
  ],
  "cissp": [
    {
      "exam": "CISSP",
      "domain": "Domain 3: Security Architecture and Engineering",
      "vignette": "A multinational financial services enterprise is transitioning its core payment processing application from a monolithic on-premises architecture to a hybrid, multi-cloud microservices architecture spanning AWS, Azure, and private data centers. The architecture must comply with NIST SP 800-207 Zero Trust Architecture (ZTA) guidelines and strict PCI-DSS cryptographic mandates. During an adversarial threat modeling exercise, the security engineering team identifies critical architectural vulnerabilities: inter-service east-west communications across cloud boundaries rely on long-lived API tokens stored in container environment variables, static IP-based perimeter firewall rules are used to allow inter-cluster traffic, and cryptographic sessions between services reuse static RSA key pairs without forward secrecy. The Chief Information Security Officer (CISO) directs the Lead Security Architect to deploy an identity-centric, cryptographically sound data-plane solution that eliminates static credentials, enforces mutual cryptographic authentication and authorization per transaction, ensures perfect forward secrecy (PFS), and avoids creating a centralized traffic inspection bottleneck in the data path.",
      "question": "Which of the following architectural implementations BEST achieves the CISO's objectives while adhering to Zero Trust and cryptographic engineering principles?",
      "options": {
        "A": "Deploy an ingress/egress Edge API Gateway cluster in each cloud provider to act as a unified Policy Decision Point (PDP) and Policy Enforcement Point (PEP), terminating all inter-service TLS sessions using RSA-4096 and inspecting traffic before routing over static IPSec VPN tunnels.",
        "B": "Implement a distributed service mesh architecture utilizing sidecar proxies as decentralized Policy Enforcement Points (PEPs), orchestrated by a control plane issuing short-lived X.509 SVID certificates for mutual TLS (mTLS) with Ephemeral Diffie-Hellman (ECDHE) key exchange.",
        "C": "Implement centralized Hardware Security Modules (HSMs) in each environment to generate and escrow pre-shared symmetric AES-256 keys, distributing them to microservices via automated CI/CD pipeline secrets injection for session-level MAC calculation and encryption.",
        "D": "Enforce OAuth 2.0 with JSON Web Tokens (JWTs) signed by a central Identity Provider (IdP) using long-lived asymmetric keys, requiring each microservice to authenticate incoming requests via local public key verification and transport data over standard one-way TLS 1.3."
      },
      "correct_answer": "B",
      "high_yield_pearl": "Zero Trust Core Tenet (NIST SP 800-207) & Cryptographic PFS: Zero Trust mandates decoupling the Control Plane (PDP/PA) from the Data Plane (PEP). In high-throughput distributed microservices, routing all east-west traffic through a centralized gateway/PDP introduces severe bottlenecks and latency. The gold standard for ZTA data-plane security is a distributed Service Mesh (e.g., Envoy sidecars acting as PEPs) leveraging mutual TLS (mTLS) with ephemeral key exchange (ECDHE) for Perfect Forward Secrecy (PFS) and dynamically issued, short-lived X.509 certificates (SPIFFE/SVID) to bind cryptographic identity to workloads, completely eliminating long-lived static secrets.",
      "tactics_and_technique": "To systematically eliminate distractors on advanced CISSP architecture questions: 1. Identify hard constraints from the stem: (a) Zero-Trust compliant (NIST SP 800-207), (b) Eliminates static credentials, (c) Mutual cryptographic authentication, (d) Perfect Forward Secrecy (PFS), (e) Avoids centralized data-plane bottleneck. 2. Evaluate Option A: Centralized Edge Gateways and static IPSec reintroduce perimeter-based security, create massive data-plane latency/bottlenecks, and RSA key exchange without ephemeral DH lacks PFS. Eliminate A. 3. Evaluate Option C: Pre-shared symmetric keys and escrowed static secrets violate ZTA's rule against persistent credentials and introduce significant key-distribution vulnerabilities. Eliminate C. 4. Evaluate Option D: One-way TLS only authenticates the server, failing mutual workload authentication; long-lived signing keys fail the ephemeral credential mandate. Eliminate D. 5. Confirm Option B: Decentralized PEP sidecars avoid bottlenecks, control-plane-driven short-lived X.509 certs eliminate static secrets, mTLS guarantees mutual identity verification, and ECDHE ensures Perfect Forward Secrecy."
    }
  ],
  "comptia_security_": [
    {
      "exam": "CompTIA Security+",
      "domain": "Threat Vectors, Identity Management & Incident Response",
      "vignette": "A Security Operations Center (SOC) analyst receives a high-severity alert indicating anomalous behavior on an enterprise cloud tenant. An executive account authenticated from an unrecognized foreign ASN without generating a secondary multi-factor authentication (MFA) challenge. Log telemetry reveals the session utilized a valid Primary Refresh Token (PRT) and session cookie rather than standard credential negotiation. Forensics confirms the executive clicked a targeted phishing link 45 minutes prior that routed through an Adversary-in-the-Middle (AiTM) reverse-proxy framework (e.g., Evilginx). Audit logs show that within 10 minutes of initial access, the threat actor registered a rogue multi-tenant OAuth 2.0 application grant with 'Application.ReadWrite.All' and 'Directory.ReadWrite.All' delegated permissions, attempting to establish persistent API-level access outside the identity provider's interactive login controls.",
      "question": "Which of the following sets of actions represents the most effective immediate containment strategy to completely neutralize the attacker's active access?",
      "options": {
        "A": "Isolate the executive's corporate laptop from the local subnet via endpoint detection and response (EDR) and initiate a full cryptographic wipe.",
        "B": "Revoke all active refresh tokens and user sessions, disable the compromised identity, and revoke the rogue OAuth application's service principal grants.",
        "C": "Reset the user's primary directory password, enforce SMS-based one-time password (OTP) re-enrollment, and block the foreign ASN at the boundary firewall.",
        "D": "Re-issue the enterprise root CA certificate, flush the internal DNS resolver cache, and submit the reverse-proxy domain to public threat feeds."
      },
      "correct_answer": "B",
      "high_yield_pearl": "AiTM bypasses MFA via Session Hijacking (stealing session cookies/tokens); Password resets alone DO NOT invalidate existing OAuth access/refresh tokens. Containment requires explicit session/token revocation AND stripping persistence mechanisms (illicit app consent/rogue service principals).",
      "tactics_and_technique": "1. Identify the Threat Vector: The attack used an AiTM phishing reverse-proxy to intercept authentication tokens and cookies, bypassing traditional MFA. 2. Recognize the Threat Actor's Posture: The adversary established persistence in the cloud tenant via OAuth 2.0 delegated permissions. 3. Evaluate Containment Targets: Because the token was replayed from an external network, endpoint isolation (Option A) does not stop cloud-side exploitation. Standard password resets (Option C) leave existing OAuth tokens alive until TTL expiration and do nothing to mitigate the rogue enterprise application. 4. Select the Comprehensive Identity Containment Action: Revoking all active user refresh sessions shuts down the interactive hijacked session, while removing the unauthorized OAuth service principal eliminates the non-interactive API backdoor (Option B)."
    }
  ],
  "naplex": [
    {
      "exam": "NAPLEX",
      "domain": "Pharmacokinetics, Drug Interactions & Bioavailability",
      "vignette": "A 62-year-old female (weight: 68 kg, height: 65 inches) with a history of focal structural epilepsy and cirrhosis is admitted to the inpatient unit with severe odynophagia, dehydration, and a single breakthrough seizure. Her home medications include extended-release phenytoin sodium 300 mg PO daily. Admission laboratory studies show: serum sodium 138 mEq/L, potassium 4.0 mEq/L, serum creatinine 0.8 mg/dL, total serum bilirubin 2.6 mg/dL, serum albumin 2.2 g/dL, and a total serum phenytoin concentration of 8.4 mcg/mL. Esophagogastroduodenoscopy (EGD) confirms extensive esophageal candidiasis. The primary team plans to initiate intravenous fluconazole 400 mg daily and proposes administering an intravenous phenytoin sodium loading dose to rapidly achieve a goal total concentration within the 10–20 mcg/mL reference range.",
      "question": "Which of the following statements provides the most accurate clinical pharmacokinetic assessment and recommendation for managing this patient?",
      "options": {
        "A": "The patient's corrected phenytoin concentration is therapeutic (~15.6 mcg/mL); initiating fluconazole inhibits CYP2C9 and, due to Michaelis-Menten kinetics, can lead to a disproportionate, exponential rise in phenytoin concentration, warranting dose reduction and close monitoring.",
        "B": "The patient's corrected phenytoin concentration is subtherapeutic (~10.8 mcg/mL); an intravenous loading dose of 15 mg PE/kg fosphenytoin is indicated, as fluconazole induces CYP2C9 clearance via hepatic microsomal induction.",
        "C": "The patient's corrected phenytoin concentration is supratherapeutic (~22.4 mcg/mL); phenytoin must be withheld immediately because fluconazole inhibits renal P-glycoprotein excretion, precipitating severe toxicity.",
        "D": "The patient's corrected phenytoin concentration is therapeutic (~15.6 mcg/mL); no dosage adjustment or interaction risk exists because phenytoin follows linear, first-order elimination at therapeutic concentrations."
      },
      "correct_answer": "A",
      "high_yield_pearl": "Winter-Tozer Correction: Corrected Phenytoin (mcg/mL) = Measured Total Phenytoin / [(0.2 × Albumin) + 0.1]. Phenytoin is >90% bound to albumin; in hypoalbuminemia (<3.5 g/dL), total measured levels are artificially low while the active, unbound fraction is elevated. Furthermore, phenytoin exhibits Michaelis-Menten (capacity-limited, non-linear) kinetics at therapeutic levels; CYP2C9 inhibitors (e.g., fluconazole, amiodarone, Bactrim) cause disproportionate, steep increases in serum concentration and acute neurotoxicity.",
      "tactics_and_technique": "1. Rule out pseudohypo-phenytoinemia first: Examine the serum albumin whenever a total phenytoin level is drawn. With albumin at 2.2 g/dL, apply the Winter-Tozer equation: Corrected = 8.4 / [(0.2 × 2.2) + 0.1] = 8.4 / 0.54 ≈ 15.56 mcg/mL. This places the patient well within the 10–20 mcg/mL therapeutic range; a loading dose is not indicated and would precipitate toxicity.\n2. Identify the drug-drug interaction mechanism: Fluconazole is a moderate-to-strong inhibitor of CYP2C9 and CYP2C19, the primary isoenzymes responsible for phenytoin parahydroxylation.\n3. Integrate pharmacokinetic kinetics: Phenytoin follows Michaelis-Menten kinetics (zero-order elimination at therapeutic concentrations where Vmax is approached). Because clearance decreases as concentration increases, metabolic inhibition produces non-linear, exponential drug accumulation rather than a proportional 1:1 rise. Monitor free levels or preemptively decrease the phenytoin maintenance dose."
    }
  ],
  "nclex_rn": [
    {
      "exam": "NCLEX-RN",
      "domain": "Physiological Integrity: Pharmacological and Parenteral Therapies",
      "vignette": "A 58-year-old male with end-stage renal disease (ESRD) maintained on thrice-weekly hemodialysis is brought to the emergency department after missing two consecutive dialysis treatments. The client reports severe lower-extremity heaviness, generalized muscle flaccidity, and lightheadedness. Physical examination reveals 1+ deep tendon reflexes bilaterally and a slow, irregular peripheral pulse. Vital signs are: blood pressure 94/56 mmHg, heart rate 42 beats/min, respiratory rate 18 breaths/min, and SpO2 96% on room air. The bedside telemetry monitor shows sinus bradycardia with tall, tented T waves, loss of discernible P waves, and a widened QRS complex measuring 148 ms. Stat laboratory results confirm a serum potassium level of 7.6 mEq/L (reference range: 3.5–5.0 mEq/L). The emergency healthcare provider enters several urgent medication orders.",
      "question": "Which prescribed medication must the nurse administer first?",
      "options": {
        "A": "Calcium gluconate 10% 1,000 mg IV push over 3 minutes",
        "B": "Regular insulin 10 units IV push with 50 mL of 50% dextrose (D50W)",
        "C": "Sodium polystyrene sulfonate 30 g orally in 20% sorbitol",
        "D": "Nebulized albuterol sulfate 20 mg via continuous face mask over 15 minutes"
      },
      "correct_answer": "A",
      "high_yield_pearl": "C-BIG-K mnemonic for acute severe hyperkalemia with cardiotoxicity: 'C' (Calcium gluconate/chloride) is ALWAYS first because it immediately raises the cardiac action potential threshold, stabilizing myocardial membranes within 1–3 minutes without altering serum potassium. 'B' (Beta-agonists like albuterol) and 'I/G' (Insulin + Glucose) shift potassium into cells (onset 15–30 min). 'K' (Kayexalate/sodium polystyrene sulfonate, loop diuretics, or hemodialysis) eliminates potassium from the body (onset 1–2 hours or more). Never delay membrane stabilization to wait for shifting or elimination.",
      "tactics_and_technique": "1. Analyze Urgency and Life Threats (Circulation Priority): The patient exhibits critical hyperkalemia (7.6 mEq/L) with active cardiac toxicity (QRS widening, lost P waves, peaked T waves, bradycardia), placing him at immediate risk for imminent ventricular fibrillation or asystole. 2. Distinguish Drug Mechanisms and Onsets: Recognize that while all four options treat hyperkalemia, they serve three distinct physiological roles: membrane stabilization, intracellular translocation, and total-body elimination. 3. Prioritize by Speed of Myocardial Protection: Calcium gluconate works in 1 to 3 minutes to prevent lethal dysrhythmias. Shifting agents (insulin/dextrose and albuterol) require 15 to 30 minutes, during which an unstabilized heart can arrest. Elimination agents (sodium polystyrene sulfonate) take hours. Therefore, administration of the cardioprotective stabilizer must precede all shifting and elimination agents."
    }
  ],
  "uniform_bar_examination__ube_": [
    {
      "exam": "Uniform Bar Examination (UBE)",
      "domain": "Civil Procedure: Federal Subject Matter & Personal Jurisdiction",
      "vignette": "A homeowner domiciled in State A entered into a written contract with Helios Energy Systems, LLC (\"Helios\") to design, manufacture, and install a custom rooftop solar and battery storage system on the homeowner's primary residence in State A for $160,000. Helios is a limited liability company organized under the laws of State B with its executive headquarters and primary manufacturing plant located in State B. Helios has two members: (1) an individual founder domiciled in State B, and (2) Solaria Holdings, Inc., a corporation incorporated under the laws of State C with its principal place of business (nerve center) located in State A. Helios has no offices, permanent staff, or bank accounts in State A, but it sent two of its State B installation technicians to State A for four days to install the custom system at the homeowner's residence. Three weeks following completion of the installation, an electrical defect in the system's inverter caused a catastrophic fire, resulting in $140,000 in structural damage to the homeowner's house. The homeowner commenced a civil action against Helios in the United States District Court for the District of State A, asserting solely state-law claims for breach of contract and strict products liability, seeking $140,000 in compensatory damages. Service of process was properly executed on Helios's registered agent in State B pursuant to State A's long-arm statute, which authorizes the exercise of personal jurisdiction to the full extent permitted by the Due Process Clause of the Fourteenth Amendment. Helios timely filed a pre-answer motion to dismiss the complaint under Federal Rule of Civil Procedure 12(b)(1) for lack of subject matter jurisdiction and under Rule 12(b)(2) for lack of personal jurisdiction.",
      "question": "How should the district court rule on Helios's motion to dismiss?",
      "options": {
        "A": "Grant the motion under Rule 12(b)(1) because complete diversity is destroyed by the corporate member's principal place of business, but deny the motion under Rule 12(b)(2) because the court has specific personal jurisdiction over Helios.",
        "B": "Deny the motion under Rule 12(b)(1) because an LLC's citizenship is governed solely by its state of organization and executive headquarters, but grant the motion under Rule 12(b)(2) because Helios lacks continuous and systematic contacts with State A.",
        "C": "Grant the motion under both Rule 12(b)(1) and Rule 12(b)(2) because complete diversity is lacking and Helios is not subject to general personal jurisdiction in State A.",
        "D": "Deny the motion under both Rule 12(b)(1) and Rule 12(b)(2) because the corporate member's citizenship is not attributed to the LLC and the contract was executed and performed within State A."
      },
      "correct_answer": "A",
      "high_yield_pearl": "Unincorporated entities (LLCs, partnerships) possess the citizenship of every single member. When an LLC has a corporate member, that member contributes dual citizenship under 28 U.S.C. § 1332(c)(1): its state of incorporation AND its principal place of business. Meanwhile, specific personal jurisdiction requires only purposeful availment directed toward the forum state and a claim that 'arises out of or relates to' those contacts, even if the defendant lacks general ('at home') continuous contacts.",
      "tactics_and_technique": "1. Bifurcate the inquiry immediately: Address Subject Matter Jurisdiction (SMJ) and Personal Jurisdiction (PJ) as independent constitutional/statutory hurdles.\n2. SMJ Analysis: Check the basis. It is purely state law, so diversity jurisdiction under 28 U.S.C. § 1332 is required. Check the amount in controversy ($140,000 > $75,000). Check complete diversity under Strawbridge: Plaintiff is State A. For Defendant Helios (LLC), do NOT apply the corporate test (place of incorporation / nerve center). Look through to each member: Member 1 is State B; Member 2 is a corporation, which is a citizen of State C (incorporation) AND State A (nerve center). Because Member 2 is a citizen of State A, Helios is a citizen of State A. State A (Plaintiff) vs. State A (Defendant) destroys complete diversity. Thus, SMJ fails (grant Rule 12(b)(1)).\n3. PJ Analysis: Check long-arm authority (coextensive with Due Process). Apply International Shoe / Burger King / Ford Motor Co. standards: Helios purposefully availed itself of State A by contracting to install a custom energy system on real property in State A and sending agents there. The claims (contract breach and product failure) directly arise out of this specific contact. Specific personal jurisdiction is satisfied, making a Rule 12(b)(2) dismissal improper.\n4. Select the option that correctly couples the lack of SMJ with the presence of PJ."
    }
  ],
  "usmle_step_1": [
    {
      "exam": "USMLE Step 1",
      "domain": "Cardiovascular & Hemodynamic Pathology",
      "vignette": "A 62-year-old man is brought to the emergency department due to sudden-onset severe dyspnea, orthopnea, and cold diaphoresis. Five days ago, he experienced 3 hours of substernal chest pressure that resolved spontaneously, for which he did not seek medical care. Blood pressure is 86/52 mm Hg, pulse is 118/min and regular, and respirations are 32/min with an oxygen saturation of 88% on ambient air. Physical examination reveals cool, clammy extremities, jugular venous distension, and bilateral diffuse crackles throughout both lung fields. Cardiac auscultation demonstrates a soft S1, a prominent S3 gallop, and a new harsh, blowing early systolic murmur best heard at the cardiac apex that radiates to the left axilla. Transthoracic echocardiography demonstrates posteromedial papillary muscle rupture and severe mitral regurgitation. Pulmonary artery catheterization shows a mean pulmonary capillary wedge pressure of 32 mm Hg with prominent systolic peaks (giant v waves).",
      "question": "Which of the following combinations of left ventricular end-diastolic volume (LVEDV), left ventricular end-systolic volume (LVESV), and forward stroke volume is most expected in this patient compared to baseline?",
      "options": {
        "A": "Increased LVEDV, Decreased LVESV, Decreased forward stroke volume",
        "B": "Increased LVEDV, Increased LVESV, Decreased forward stroke volume",
        "C": "Decreased LVEDV, Decreased LVESV, Increased forward stroke volume",
        "D": "Normal LVEDV, Increased LVESV, Normal forward stroke volume"
      },
      "correct_answer": "A",
      "high_yield_pearl": "Acute mitral regurgitation (e.g., post-MI papillary muscle rupture) features increased preload (increased LVEDV) and decreased afterload due to retrograde ejection into the low-impedance left atrium. This low-resistance outflow allows near-complete LV emptying during systole, resulting in decreased LVESV and increased total stroke volume; however, because a large regurgitant fraction flows backward into the noncompliant left atrium, forward stroke volume (systemic cardiac output) drops precipitously, inducing pulmonary edema and cardiogenic shock.",
      "tactics_and_technique": "Step 1: Diagnose the underlying lesion. Acute respiratory distress and cardiogenic shock 3 to 7 days after an untreated myocardial infarction with a new apical systolic murmur and giant 'v' waves on pulmonary artery catheterization points directly to acute severe mitral regurgitation secondary to posteromedial papillary muscle rupture (posterior descending artery territory).\nStep 2: Trace diastolic filling (Preload/LVEDV). During diastole, the left ventricle receives normal pulmonary venous return plus the large volume of regurgitated blood stored in the unconditioned, stiff left atrium under high pressure. This marked volume overload leads to an increased LVEDV.\nStep 3: Analyze systolic ejection and afterload (LVESV). In systole, the left ventricle ejects simultaneously into two parallel conduits: anterograde into the high-resistance aorta and retrograde into the low-pressure/low-impedance left atrium. Because effective ventricular afterload is drastically diminished, the LV empties vigorously and more completely, resulting in a decreased LVESV and elevated ejection fraction.\nStep 4: Differentiate total versus forward stroke volume. Although total stroke volume (regurgitant volume + forward volume) is increased, forward stroke volume (net systemic delivery) is markedly decreased, leading to systemic hypotension. Eliminate distractors that model chronic decompensated systolic failure (where LVESV is increased) or cardiac tamponade (where LVEDV is decreased due to external compression)."
    }
  ]
};

export function findPregeneratedQuiz(examId: string, examName: string): AntigravityQuizData | null {
  const normId = (examId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normName = (examName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Direct ID or Name lookup
  for (const [key, list] of Object.entries(PREGENERATED_QUIZZES_ARCHIVE)) {
    const cleanKey = key.replace(/[^a-z0-9]/g, "");
    if (normId.includes(cleanKey) || cleanKey.includes(normId)) {
      return list[Math.floor(Math.random() * list.length)];
    }
    if (normName.includes(cleanKey) || cleanKey.includes(normName)) {
      return list[Math.floor(Math.random() * list.length)];
    }
  }

  // 2. Keyword heuristics
  if (normId.includes("usmle") || normName.includes("usmle")) {
    const list = PREGENERATED_QUIZZES_ARCHIVE["usmle_step_1"];
    if (list?.length) return list[0];
  }
  if (normId.includes("nclex") || normName.includes("nclex") || normName.includes("nurs")) {
    const list = PREGENERATED_QUIZZES_ARCHIVE["nclex_rn"];
    if (list?.length) return list[0];
  }
  if (normId.includes("naplex") || normName.includes("naplex") || normName.includes("pharmac")) {
    const list = PREGENERATED_QUIZZES_ARCHIVE["naplex"];
    if (list?.length) return list[0];
  }
  if (normId.includes("bar") || normName.includes("bar") || normName.includes("law")) {
    const list = PREGENERATED_QUIZZES_ARCHIVE["california_bar_examination"] || PREGENERATED_QUIZZES_ARCHIVE["california_bar_exam"];
    if (list?.length) return list[0];
  }
  if (normId.includes("cissp") || normName.includes("cissp") || normName.includes("isc2")) {
    const list = PREGENERATED_QUIZZES_ARCHIVE["cissp"];
    if (list?.length) return list[0];
  }
  if (normId.includes("sec") || normName.includes("comptia") || normName.includes("security")) {
    const list = PREGENERATED_QUIZZES_ARCHIVE["comptia_security_"];
    if (list?.length) return list[0];
  }
  if (normId.includes("aws") || normName.includes("cloud") || normName.includes("solutions architect")) {
    const list = PREGENERATED_QUIZZES_ARCHIVE["aws_certified_solutions_architect"];
    if (list?.length) return list[0];
  }

  return null;
}
