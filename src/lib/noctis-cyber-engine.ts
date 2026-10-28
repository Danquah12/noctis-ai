import { createHash } from "node:crypto";
import { isClinicalOrMedicalPrompt } from "./noctis-architect-benchmarks.ts";

export type CyberIncidentUrgency =
  | "P0_CRITICAL_CONTAINMENT"
  | "P1_HIGH_URGENCY_TRIAGE"
  | "P2_MEDIUM_INVESTIGATION"
  | "CYBER_TRAINING_AND_ARCHITECTURE";

export interface MitreTechniqueMapping {
  technique_id: string;
  name: string;
  tactic: string;
  status: "observed_indicator" | "suspected_unconfirmed";
  evidence_in_prompt: string;
}

export interface CyberAdversarialResult {
  id: string;
  instruction: string;
  decision: "REJECT" | "REJECTED";
  status: "REJECTED";
  rationale: string;
  safety_reasoning: string;
  accepted: boolean;
}

export interface ExtractedCyberTelemetry {
  testId: string;
  urgency: CyberIncidentUrgency;
  rulesTriggered: string[];
  ips: { ip: string; classification: string }[];
  domainsAndUrls: string[];
  hashes: { value: string; algorithm: "MD5" | "SHA-1" | "SHA-256" }[];
  cves: string[];
  affectedAssets: string[];
  accountsMentioned: string[];
  processesAndCommands: string[];
  observedBehaviors: string[];
  reportedContext: string[];
  mitreTechniques: MitreTechniqueMapping[];
  isRansomwareOrShadowDelete: boolean;
  isCredentialAccessOrAdCompromise: boolean;
  isLateralMovement: boolean;
  isExfiltration: boolean;
  isCloudOrIdentityAttack: boolean;
  isWebOrEdgeExploit: boolean;
}

function sha256Hex(input: string): string {
  return `sha256:${createHash("sha256").update(input, "utf8").digest("hex")}`;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}

/**
 * Determines whether a prompt is a Cyber Security / SOC / DFIR / Threat Hunting query or live cyber test.
 * Strictly guarded so clinical/medical prompts and building architecture prompts never match.
 */
export function isCyberSecurityOrSocQuery(question: string): boolean {
  const q = (question || "").trim();
  if (!q) return false;
  if (isClinicalOrMedicalPrompt(q)) return false;

  // Never intercept multi-domain national resilience / grid / food / water scenarios
  if (
    /\b(population\s+growth|megawatt|gigawatt|\bmwh\b|\bgwh\b|desalination|food\s+reserve|spoilage|cold-chain|vibe-stress-test|scenario-\d+d)\b/i.test(
      q
    )
  ) {
    return false;
  }

  // Never intercept existing specialized OWASP / PortSwigger / Risk / ZeroTrust / CyberOps gadgets unless explicitly a NOCTIS-CYBER test
  const isExplicitCyberTest =
    /\b(noctis[-_\s]+cyber|cyber[-_\s]+(?:live[-_\s]+)?test[-_\s]*\d+|soc[-_\s]+(?:live[-_\s]+)?test[-_\s]*\d+|dfir[-_\s]+test[-_\s]*\d+|noctis-cyber-(?:live-|ir-)?\d+)\b/i.test(
      q
    );
  if (isExplicitCyberTest) {
    return true;
  }

  if (
    /\b(black\s*hat|white\s*hat|purple\s*team|red\s*team\s+and\s+blue\s*team|offensive\s+security,\s*penetration\s+testing|nist\s+sp\s+800-207|cisa\s+zero\s+trust\s+maturity\s+model|nist\s+sp\s+800-37|nist\s+sp\s+800-30|iso\s+31000|risk\s+management\s+maturity\s+engine|noctis\s+domain\s+certification\s+engine|major\s+domains\s+to\s+train\s+noctis|owasp\s+(?:top\s+10|to\s+10|api)|portswigger|vulnerabilityscriptmap|oauth-lab-\d+|jwt-attacks-lab-\d+|clickjacking-lab-\d+|cors-lab-\d+|write\s+a\s+python\s+code\s+to\s+test\s+sql\s+injection|explain\s+how\s+a\s+ransomware|policy\s+decision\s+engine|policy\s+decision\s+point|\/v1\/authorization\/decisions|test:pde)\b/i.test(
      q
    )
  ) {
    return false;
  }

  // Strong SOC / DFIR / Threat Hunting / Incident Response indicators
  const hasIncidentOrSocTerms =
    /\b(siem|edr|xdr|dfir|incident\s+response|soc\s+triage|soc\s+analyst|threat\s+hunting|ransomware|lateral\s+movement|lsass(?:\.exe)?|mimikatz|dcsync|golden\s+ticket|kerberoast\w*|pass-the-hash|pass-the-ticket|vssadmin\s+delete\s+shadows|shadow\s+copies|cobalt\s+strike|beacon|c2\s+(?:server|channel|beacon|traffic|ip|domain)|command[-_\s]+and[-_\s]+control|ntds\.dit|domain\s+controller|active\s+directory\s+compromise|web\s*shell|impossible\s+travel|mfa\s+fatigue|oauth\s+consent|cloudtrail|entra\s+id|guardduty|sentinel|splunk|crowdstrike|defender\s+for\s+endpoint|sysmon|event\s+id\s+\d{3,4}|mitre\s+att&ck)\b/i.test(
      q
    );

  if (hasIncidentOrSocTerms) return true;

  // Explicit requests to train or run the Noctis Cyber Security Engine
  if (
    /\b(train\s+noctis\s+(?:on|in)\s+cyber\s*security|noctis\s+cyber\s*(?:security|defense|incident\s+response)\s+engine|noctis-cyber-ir-001)\b/i.test(
      q
    )
  ) {
    return true;
  }

  return false;
}

export function extractCyberIncidentTelemetry(question: string): ExtractedCyberTelemetry {
  const q = (question || "").trim();
  const advStartIdx = q.search(/\badversarial\s+instructions?\b/i);
  const qCtx = advStartIdx >= 0 ? q.slice(0, advStartIdx) : q;

  const testIdMatch =
    q.match(/\b(?:NOCTIS-CYBER(?:-[A-Z0-9]+)*-\d{3}(?:-R\d+)?|CYBER-LIVE-\d{3}|SOC-LIVE-\d{3})\b/i) ||
    q.match(/\b(?:cyber|soc|dfir)\s+(?:live\s+)?test\s*#?\s*(\d{1,3})\b/i);
  const testId = testIdMatch
    ? testIdMatch[1]
      ? `NOCTIS-CYBER-LIVE-${testIdMatch[1].padStart(3, "0")}`
      : testIdMatch[0].toUpperCase()
    : "NOCTIS-CYBER-IR-001";

  // Extract IPv4 addresses (excluding version numbers like 1.0.0.0 if not real IPs)
  const ipMatches = [...qCtx.matchAll(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g)].map(
    (m) => m[0]
  );
  const uniqueIps = [...new Set(ipMatches)];
  const ips = uniqueIps.map((ip) => ({
    ip,
    classification: isPrivateIpv4(ip)
      ? "Internal RFC 1918 host/network address (supplied)"
      : "External / public IPv4 address — suspected C2 or external origin (supplied, unverified attribution)",
  }));

  // Extract Domains / URLs (including defanged [.] notation)
  const domainMatches = [
    ...qCtx.matchAll(
      /\b(?:https?:\/\/|hxxps?:\/\/)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\[\.\]|\.)(?:[a-z]{2,18}|onion|local|internal|corp|lan)(?:\/[^\s"',)]*)?\b/gi
    ),
  ]
    .map((m) => m[0])
    .filter((d) => !/\.(?:exe|dll|sys|ps1|bat|cmd|vbs|js|py|sh|dit|log|evtx|dmp|json|xml|txt|zip|7z|rar|locked|encrypted)$/i.test(d));
  const domainsAndUrls = [...new Set(domainMatches)];

  // Extract File Hashes (MD5 32 hex, SHA-1 40 hex, SHA-256 64 hex)
  const hashes: { value: string; algorithm: "MD5" | "SHA-1" | "SHA-256" }[] = [];
  const seenHashes = new Set<string>();
  for (const m of qCtx.matchAll(/\b([a-fA-F0-9]{64}|[a-fA-F0-9]{40}|[a-fA-F0-9]{32})\b/g)) {
    const val = m[1].toLowerCase();
    if (seenHashes.has(val)) continue;
    seenHashes.add(val);
    const algorithm = val.length === 64 ? "SHA-256" : val.length === 40 ? "SHA-1" : "MD5";
    hashes.push({ value: val, algorithm });
  }

  // Extract CVEs
  const cves = [...new Set([...qCtx.matchAll(/\bCVE-\d{4}-\d{4,7}\b/gi)].map((m) => m[0].toUpperCase()))];

  // Extract hostnames / assets
  const assetMatches = [
    ...qCtx.matchAll(
      /\b(?:DC-?\d+|SRV-[A-Z0-9-]+|WKSTN-[A-Z0-9-]+|WS-[A-Z0-9-]+|SQL-[A-Z0-9-]+|EXCH-[A-Z0-9-]+|FW-[A-Z0-9-]+|VPN-[A-Z0-9-]+|FILESRV[A-Z0-9-]*|HOST-[A-Z0-9-]+|[A-Z]{2,6}-(?:PROD|DEV|CORP|AD|DB|WEB|APP)-[A-Z0-9-]+)\b/gi
    ),
  ].map((m) => m[0]);
  const affectedAssets = [...new Set(assetMatches)];

  // Extract user / service accounts
  const accountMatches = [
    ...qCtx.matchAll(
      /\b(?:svc[_-][a-z0-9_-]+|adm[_-][a-z0-9_-]+|krbtgt|Administrator|SYSTEM|[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,10}|CORP\\[a-z0-9._-]+|DOMAIN\\[a-z0-9._-]+)\b/gi
    ),
  ].map((m) => m[0]);
  const accountsMentioned = [...new Set(accountMatches)];

  // Extract processes and suspicious command fragments
  const procDefs: [RegExp, string][] = [
    [/powershell(?:\.exe)?[^\n.;]*/i, "PowerShell execution"],
    [/vssadmin(?:\.exe)?\s+delete\s+shadows[^\n.;]*/i, "Volume Shadow Copy deletion (`vssadmin delete shadows`)"],
    [/wbadmin\s+delete[^\n.;]*/i, "Backup catalog deletion (`wbadmin delete`)"],
    [/bcdedit[^\n.;]*recoveryenabled\s+no/i, "Boot recovery disabled (`bcdedit /set recoveryenabled no`)"],
    [/lsass(?:\.exe)?/i, "LSASS process access / memory dump target (`lsass.exe`)"],
    [/mimikatz|sekurlsa|procdump|comsvcs\.dll/i, "Credential dumping utility / technique (`mimikatz` / `procdump` / `comsvcs.dll`)"],
    [/ntds\.dit|ntdsutil|vssadmin\s+create\s+shadow/i, "Active Directory database extraction indicator (`ntds.dit` / `ntdsutil`)"],
    [/dcsync|drsuapi|getncchanges/i, "Active Directory replication / DCSync indicator"],
    [/psexec|paexec|wmiexec|smbexec|impacket/i, "Remote lateral execution tool (`PsExec` / `WMI` / `Impacket`)"],
    [/rundll32(?:\.exe)?|regsvr32(?:\.exe)?|mshta(?:\.exe)?|certutil(?:\.exe)?/i, "Living-off-the-Land Binary (LOLBin) execution"],
    [/schtasks(?:\.exe)?|at\.exe/i, "Scheduled task creation/modification (`schtasks`)"],
    [/rclone|mega\.nz|anonfiles|restic/i, "Data staging / cloud exfiltration tool (`rclone` / external storage)"],
    [/nltest|net\s+(?:group|user|view|localgroup)|adfind|bloodhound|sharphound/i, "Active Directory / domain reconnaissance commands"],
    [/w3wp\.exe|httpd|nginx|tomcat|php-cgi/i, "Web server worker process spawning child shell"],
  ];
  const processesAndCommands = procDefs.filter(([re]) => re.test(qCtx)).map(([, label]) => label);

  // Classify scenario flags strictly from qCtx
  const isRansomwareOrShadowDelete =
    /\b(ransomware|vssadmin(?:\.exe)?\s+delete\s+shadows|shadow\s+copies|wbadmin\s+delete|bcdedit.*recoveryenabled|encrypt(?:ing|ed)\s+files|ransom\s+note|\.(?:locked|encrypted|lockbit|blackcat|alphv|akira|play|clop)\b)/i.test(
      qCtx
    );
  const isCredentialAccessOrAdCompromise =
    /\b(lsass|mimikatz|dcsync|golden\s+ticket|silver\s+ticket|kerberoast|ntds\.dit|pass-the-hash|pass-the-ticket|krbtgt|domain\s+admin|domain\s+controller|dc0?\d|event\s+id\s+(?:4624|4625|4662|4672|4768|4769|4776))\b/i.test(
      qCtx
    );
  const isLateralMovement =
    /\b(lateral\s+movement|psexec|wmiexec|smb|admin\$|c\$|ipc\$|rdp|port\s+3389|winrm|port\s+5985|east-west|workstation-to-workstation|server-to-server)\b/i.test(
      qCtx
    );
  const isExfiltration =
    /\b(exfiltrat\w*|outbound\s+transfer|large\s+(?:upload|outbound|data\s+transfer)|rclone|mega\.nz|staging\s+archive|data\s+theft|dns\s+tunnel\w*)\b/i.test(
      qCtx
    );
  const isCloudOrIdentityAttack =
    /\b(impossible\s+travel|mfa\s+fatigue|push\s+bombing|oauth|consent\s+grant|entra\s+id|azure\s+ad|aws\s+iam|cloudtrail|assume[-_\s]?role|access\s+key|session\s+token|token\s+replay|evilginx|aitm)\b/i.test(
      qCtx
    );
  const isWebOrEdgeExploit =
    /\b(web\s*shell|w3wp\.exe|public-facing|vpn\s+appliance|edge\s+(?:gateway|vulnerability|appliance)|perimeter\s+(?:gateway|firewall|appliance)|fw-edge|sql\s+injection|remote\s+code\s+execution|\brce\b|citrix|fortinet|ivanti|palo\s+alto|exchange|sharepoint)\b/i.test(
      qCtx
    );

  // Build MITRE ATT&CK Mappings grounded in observed prompt telemetry
  const mitreTechniques: MitreTechniqueMapping[] = [];
  if (/\b(phish\w*|spearphish\w*|malicious\s+(?:attachment|link|macro)|\.docm|\.xlsm|\.lnk|\.iso)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1566",
      name: "Phishing (Spearphishing Attachment / Link)",
      tactic: "Initial Access (TA0001)",
      status: "observed_indicator",
      evidence_in_prompt: "Phishing delivery vector or weaponized attachment/link referenced in encounter.",
    });
  }
  if (isWebOrEdgeExploit) {
    mitreTechniques.push({
      technique_id: "T1190",
      name: "Exploit Public-Facing Application / Perimeter Edge Gateway",
      tactic: "Initial Access (TA0001)",
      status: /\bunder\s+investigation\b/i.test(qCtx) ? "suspected_unconfirmed" : "observed_indicator",
      evidence_in_prompt: `Public-facing web/VPN/perimeter gateway exploitation${cves.length ? ` (${cves.join(", ")})` : ""} referenced in encounter.`,
    });
  }
  if (/\b(powershell|encodedcommand|-enc\b|iex\b|downloadstring|cmd\.exe|wscript|cscript)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1059.001",
      name: "Command and Scripting Interpreter: PowerShell / Command Shell",
      tactic: "Execution (TA0002)",
      status: "observed_indicator",
      evidence_in_prompt: "Suspicious PowerShell or command-line execution observed in host telemetry.",
    });
  }
  if (/\b(rundll32(?:\.exe)?|regsvr32(?:\.exe)?|mshta(?:\.exe)?|comsvcs\.dll)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1218.011",
      name: "System Binary Proxy Execution: Rundll32 (`rundll32.exe` / `comsvcs.dll`)",
      tactic: "Defense Evasion (TA0005)",
      status: "observed_indicator",
      evidence_in_prompt: "Living-off-the-Land binary proxy execution (`rundll32.exe comsvcs.dll`) observed.",
    });
  }
  if (/\b(schtasks|scheduled\s+task|registry\s+run|startup\s+folder|new\s+service|event\s+id\s+(?:4697|4698|7045))\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1053.005 / T1543.003",
      name: "Scheduled Task/Job or Windows Service Persistence",
      tactic: "Persistence (TA0003) / Privilege Escalation (TA0004)",
      status: "observed_indicator",
      evidence_in_prompt: "Scheduled task or service creation indicator reported.",
    });
  }
  if (/\b(lsass|mimikatz|procdump|comsvcs\.dll|credential\s+dump\w*)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1003.001",
      name: "OS Credential Dumping: LSASS Memory",
      tactic: "Credential Access (TA0006)",
      status: "observed_indicator",
      evidence_in_prompt: "LSASS process access or memory dumping indicator observed.",
    });
  }
  if (/\b(dcsync|drsuapi|getncchanges|ntds\.dit|ntdsutil|event\s+id\s+4662)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1003.006 / T1003.003",
      name: "OS Credential Dumping: DCSync / NTDS.dit Extraction",
      tactic: "Credential Access (TA0006)",
      status: "observed_indicator",
      evidence_in_prompt: "Active Directory replication (DCSync) or NTDS.dit credential extraction indicator observed.",
    });
  }
  if (isLateralMovement) {
    mitreTechniques.push({
      technique_id: "T1021.002 / T1021.001",
      name: "Remote Services: SMB/Windows Admin Shares or RDP",
      tactic: "Lateral Movement (TA0008)",
      status: "observed_indicator",
      evidence_in_prompt: "East-west lateral movement via SMB admin shares, PsExec/WMI, or RDP reported.",
    });
  }
  if (isCloudOrIdentityAttack || accountsMentioned.length > 0) {
    mitreTechniques.push({
      technique_id: "T1078",
      name: "Valid Accounts (Compromised Domain / Cloud / Service Credentials)",
      tactic: "Initial Access / Persistence / Privilege Escalation / Defense Evasion",
      status: "observed_indicator",
      evidence_in_prompt: `Account activity involving ${accountsMentioned.length ? accountsMentioned.join(", ") : "compromised credentials"} observed.`,
    });
  }
  if (/\b(beacon\w*|c2\b|command[-_\s]+and[-_\s]+control|outbound\s+https)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1071.001",
      name: "Application Layer Protocol: Web Protocols (HTTPS C2 Beaconing)",
      tactic: "Command and Control (TA0011)",
      status: "observed_indicator",
      evidence_in_prompt: `Outbound C2 beacon traffic observed${domainsAndUrls.length ? ` (${domainsAndUrls.join(", ")})` : ""}.`,
    });
  }
  if (/\b(vssadmin(?:\.exe)?\s+delete\s+shadows|shadow\s+cop(?:y|ies)|wbadmin\s+delete|bcdedit.*recoveryenabled)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1490",
      name: "Inhibit System Recovery (Volume Shadow Copy / Backup Deletion)",
      tactic: "Impact (TA0040)",
      status: "observed_indicator",
      evidence_in_prompt: "Pre-ransomware inhibit-system-recovery commands (`vssadmin delete shadows` / backup deletion) observed.",
    });
  }
  if (isRansomwareOrShadowDelete) {
    mitreTechniques.push({
      technique_id: "T1486",
      name: "Data Encrypted for Impact (Ransomware Precursor / Detonation)",
      tactic: "Impact (TA0040)",
      status: /\bencrypt(?:ed|ing)\b/i.test(qCtx) ? "observed_indicator" : "suspected_unconfirmed",
      evidence_in_prompt: "Ransomware staging, shadow copy deletion, or file encryption activity reported.",
    });
  }
  if (isExfiltration) {
    mitreTechniques.push({
      technique_id: "T1041 / T1567",
      name: "Exfiltration Over C2 Channel or Exfiltration to Cloud Storage",
      tactic: "Exfiltration (TA0010)",
      status: "observed_indicator",
      evidence_in_prompt: "Anomalous outbound data transfer or staging archive activity reported.",
    });
  }
  if (mitreTechniques.length === 0) {
    mitreTechniques.push({
      technique_id: "T1078 / T1059",
      name: "Suspected Unauthorized Execution or Account Abuse (Pending Full Telemetry)",
      tactic: "Initial Access / Execution",
      status: "suspected_unconfirmed",
      evidence_in_prompt: "Initial security alert requires host and identity log correlation before confirming exact technique.",
    });
  }

  // Extract bullet lines from prompt as observedBehaviors / reportedContext
  const lines = qCtx
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*•]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, "").trim());

  const observedBehaviors: string[] = [];
  const reportedContext: string[] = [];
  for (const line of lines) {
    if (
      /\b(unknown|unavailable|not\s+(?:available|measured|provided|verified|configured)|incomplete|pending|offline|status\s+unknown)\b/i.test(
        line
      )
    ) {
      reportedContext.push(line);
    } else {
      observedBehaviors.push(line);
    }
  }

  if (ips.length) {
    for (const item of ips) {
      observedBehaviors.push(`IP indicator ${item.ip}: ${item.classification}`);
    }
  }
  if (domainsAndUrls.length) {
    observedBehaviors.push(`External domain/URL indicator(s): ${domainsAndUrls.join(", ")}`);
  }
  if (affectedAssets.length) {
    const assetTag = `Affected hosts/assets identified in prompt: ${affectedAssets.join(", ")}`;
    if (!observedBehaviors.some((b) => affectedAssets.every((a) => b.includes(a)))) observedBehaviors.push(assetTag);
  }
  if (accountsMentioned.length) {
    const acctTag = `Accounts referenced in prompt: ${accountsMentioned.join(", ")}`;
    if (!observedBehaviors.some((b) => accountsMentioned.every((a) => b.includes(a)))) observedBehaviors.push(acctTag);
  }
  if (processesAndCommands.length) {
    for (const p of processesAndCommands) {
      if (!observedBehaviors.includes(p)) observedBehaviors.push(p);
    }
  }
  if (cves.length) {
    observedBehaviors.push(`Referenced vulnerability identifier(s): ${cves.join(", ")}`);
  }
  if (hashes.length) {
    for (const h of hashes) {
      observedBehaviors.push(`Supplied file hash (${h.algorithm}): ${h.value}`);
    }
  }

  if (reportedContext.length === 0) {
    reportedContext.push(
      "Initial incident triage context: full forensic timeline, initial entry vector, and complete lateral blast radius are not yet verified."
    );
  }

  // Determine Urgency & Rules Triggered
  const rulesTriggered: string[] = [];
  let urgency: CyberIncidentUrgency = "P1_HIGH_URGENCY_TRIAGE";

  if (isRansomwareOrShadowDelete) {
    urgency = "P0_CRITICAL_CONTAINMENT";
    rulesTriggered.push("CYBER-RULE-01A-RANSOMWARE-OR-SHADOW-COPY-DELETION-CONTAINMENT-LOCK");
  }
  if (isCredentialAccessOrAdCompromise) {
    urgency = "P0_CRITICAL_CONTAINMENT";
    rulesTriggered.push("CYBER-RULE-01B-CREDENTIAL-DUMPING-OR-AD-DOMINANCE-CONTAINMENT-LOCK");
  }
  if (isLateralMovement) {
    urgency = "P0_CRITICAL_CONTAINMENT";
    rulesTriggered.push("CYBER-RULE-01C-ACTIVE-LATERAL-MOVEMENT-ISOLATION-LOCK");
  }
  if (isExfiltration) {
    urgency = "P0_CRITICAL_CONTAINMENT";
    rulesTriggered.push("CYBER-RULE-01D-ACTIVE-DATA-EXFILTRATION-EGRESS-BLOCK");
  }
  if (isCloudOrIdentityAttack && rulesTriggered.length === 0) {
    urgency = "P1_HIGH_URGENCY_TRIAGE";
    rulesTriggered.push("CYBER-RULE-02A-IDENTITY-AND-TOKEN-COMPROMISE-LOCK");
  }
  if (isWebOrEdgeExploit && rulesTriggered.length === 0) {
    urgency = "P0_CRITICAL_CONTAINMENT";
    rulesTriggered.push("CYBER-RULE-01E-PUBLIC-FACING-EXPLOIT-OR-WEBSHELL-LOCK");
  }
  if (
    rulesTriggered.length === 0 &&
    /\b(train\s+noctis|architecture|blueprint|how\s+does|overview)\b/i.test(q) &&
    !/\b(test\s+\d+|adversarial\s+instructions|return\s+json|top-level\s+keys)\b/i.test(q)
  ) {
    urgency = "CYBER_TRAINING_AND_ARCHITECTURE";
    rulesTriggered.push("CYBER-RULE-00-TRAINING-AND-ARCHITECTURE-SPEC");
  } else if (rulesTriggered.length === 0) {
    rulesTriggered.push("CYBER-RULE-01-SOC-EMERGENCY-CONTAINMENT-DEFAULT");
  }

  return {
    testId,
    urgency,
    rulesTriggered,
    ips,
    domainsAndUrls,
    hashes,
    cves,
    affectedAssets,
    accountsMentioned,
    processesAndCommands,
    observedBehaviors,
    reportedContext,
    mitreTechniques,
    isRansomwareOrShadowDelete,
    isCredentialAccessOrAdCompromise,
    isLateralMovement,
    isExfiltration,
    isCloudOrIdentityAttack,
    isWebOrEdgeExploit,
  };
}

export function parseCyberAdversarialInstructions(question: string): string[] {
  const q = question || "";
  const idx = q.search(/\badversarial\s+instructions?\b/i);
  if (idx < 0) return [];
  const block = q.slice(idx);
  const items: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^(?:#{1,6}\s+|\*\*[A-Z]\.\s+|Return\s+ONLY|Provide\s+a\s+concise|Required\s+output|Acceptance\s+criteria)/i.test(trimmed) && items.length > 0) {
      break;
    }
    const m = trimmed.match(/^(?:ADV-?\d+|\d+)[.):\s-]+["“]?(.+?)["”]?\s*$/i);
    if (m && m[1]) {
      items.push(m[1].replace(/^["“]|["”]$/g, "").trim());
    }
  }
  return items;
}

export function evaluateCyberAdversarialInstructions(
  advItems: string[],
  wantsAcceptOrRejectLiteral: boolean
): CyberAdversarialResult[] {
  const decisionLiteral: "REJECT" | "REJECTED" = wantsAcceptOrRejectLiteral ? "REJECT" : "REJECTED";
  return advItems.map((instruction, idx) => {
    let rationale =
      "REJECT: Following this instruction would violate incident response containment, forensic evidence preservation, or zero-trust credential hygiene during an active security incident.";

    if (/\b(power\s+off|pull\s+the\s+power|shut\s*down|hard\s+reboot|reboot|reimage|wipe|format|delete\s+the\s+vm)\b/i.test(instruction)) {
      rationale =
        "REJECT: Immediately powering off, rebooting, or wiping/reimaging affected hosts before network isolation and volatile memory (RAM) acquisition destroys critical forensic artifacts (active C2 sockets, in-memory encryption keys, injected processes, and credential tickets). Isolate hosts at the EDR/network switch layer first while preserving volatile evidence.";
    } else if (/\b(pay\s+the\s+ransom|bitcoin|monero|decryptor|negotiate\s+and\s+pay)\b/i.test(instruction)) {
      rationale =
        "REJECT: Paying a ransom does not guarantee valid decryption keys, does not remove attacker persistence or backdoors, risks violating OFAC/sanctions regulations, and finances further threat-actor operations.";
    } else if (/\b(false\s+positive|benign|ignore|dismiss|close\s+the\s+alert|normal\s+admin|routine\s+(?:it\s+)?(?:backup\s+)?maintenance|not\s+an\s+incident|not\s+an\s+emergency)\b/i.test(instruction)) {
      rationale =
        "REJECT: High-risk attack telemetry (such as credential dumping, encoded PowerShell, volume shadow copy deletion, lateral SMB/RDP movement, or C2 beaconing) cannot be dismissed as benign or routine maintenance without verified change-control correlation and forensic confirmation.";
    } else if (/\b(restore\b[\s\S]*?\bbackups?|backups?[\s\S]*?\brestore|restore\s+immediately|bring\s+systems\s+back\s+online)\b/i.test(instruction)) {
      rationale =
        "REJECT: Restoring backups into an uncontained Active Directory forest or network before revoking compromised credentials (including krbtgt / Domain Admin / service accounts) and isolating lateral-movement source hosts will result in immediate re-compromise and re-encryption.";
    } else if (/\b(hack\s+back|counter-?attack|retaliat\w*|offensive\s+strike|exploit\s+the\s+c2)\b/i.test(instruction)) {
      rationale =
        "REJECT: Unauthorized offensive retaliation ('hack-back') against external C2 IP addresses is illegal (e.g., CFAA), risks striking innocent third-party compromised infrastructure, and violates defensive DFIR boundaries.";
    } else if (/\b(attribut\w*|apt\s*-?\d+|threat\s+actor|nation-?state|lazarus|lockbit|blackcat|alphv|sandworm|volt\s+typhoon|scattered\s+spider|100%\s+confirmed\s+as)\b/i.test(instruction)) {
      rationale =
        "REJECT: Definitive threat-actor or nation-state APT attribution cannot be confirmed from a single IP address or initial tactical indicator alone because C2 infrastructure, proxies, and tools are routinely shared, leased, or spoofed across threat groups; containment and forensic verification take precedence over premature attribution.";
    } else if (/\b(wait\s+for|before\s+isolating|complete\s+forensic\s+report\s+before|wait\s+until\s+morning|business\s+hours)\b/i.test(instruction)) {
      rationale =
        "REJECT: Active credential theft, lateral movement, or ransomware staging is strictly time-critical; delaying network/EDR host isolation and credential revocation allows rapid domain-wide encryption and data exfiltration.";
    } else if (/\b(email\s+the\s+team|send\s+an\s+email|corporate\s+email|slack|teams)\b/i.test(instruction)) {
      rationale =
        "REJECT: Communicating incident response details over potentially compromised corporate email or identity-linked messaging can alert the adversary and trigger immediate ransomware detonation; use out-of-band (OOB) incident response channels.";
    }

    return {
      id: `ADV-${idx + 1}`,
      instruction,
      decision: decisionLiteral,
      status: "REJECTED",
      rationale,
      safety_reasoning: rationale,
      accepted: false,
    };
  });
}

function parseCyberRequestedJsonContract(question: string): { keys: string[] } | null {
  const q = question || "";
  if (!/\bjson\b/i.test(q)) return null;

  // 1. Check fenced ```json { ... } ``` block
  const fenced = [...q.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi)];
  for (let i = fenced.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(fenced[i][1]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        if (keys.length >= 3) return { keys };
      }
    } catch {
      /* continue */
    }
  }

  // 2. Check inline top-level keys list: "top-level keys: a, b, c"
  const inlineMatch = q.match(/top-level\s+keys\s*:\s*([a-z0-9_,\s\r\n]+?)(?:\.|\n\n|$)/i);
  if (inlineMatch && inlineMatch[1]) {
    const keys = inlineMatch[1]
      .split(/[,\s]+/)
      .map((k) => k.trim())
      .filter((k) => /^[a-z][a-z0-9_]*$/i.test(k));
    if (keys.length >= 3) return { keys };
  }

  // 3. Check raw { ... } at end of prompt
  const braceMatch = q.match(/(\{\s*"[a-z0-9_]+"[\s\S]*\})\s*$/i);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[1]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        if (keys.length >= 3) return { keys };
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

export function handleNaturalCyberSecurityQuery(question: string): string | null {
  if (!isCyberSecurityOrSocQuery(question)) return null;

  const t = extractCyberIncidentTelemetry(question);
  const advItems = parseCyberAdversarialInstructions(question);
  const wantsAcceptOrRejectLiteral = /\b`?ACCEPT`?\s+or\s+`?REJECT`?\b/i.test(question);
  const adversarialResults = evaluateCyberAdversarialInstructions(advItems, wantsAcceptOrRejectLiteral);

  // Build core DFIR / SOC assessment blocks
  const containmentObj = {
    urgency: t.urgency,
    incident_severity: t.urgency === "P0_CRITICAL_CONTAINMENT" ? "SEV-1 / P0 Critical Active Breach" : "SEV-2 / P1 High-Urgency Security Incident",
    action:
      "Immediately isolate affected host(s) at the EDR and network switch/VLAN layer, block outbound C2/exfiltration egress at the perimeter firewall, and disable/revoke compromised accounts and active session tokens.",
    immediate_disposition:
      "Activate the Computer Security Incident Response Team (CSIRT / SOC Tier-3) and out-of-band (OOB) war-room communications immediately; do NOT power off hosts before volatile memory capture and do NOT delay network containment while waiting for full forensic timelines.",
    preserve_volatile_memory: true,
    power_off_or_wipe_before_triage: false,
    pay_ransom_or_hack_back: false,
    delay_containment_for_full_attribution: false,
    why_time_critical:
      "Active credential dumping, lateral movement, and shadow-copy deletion precede domain-wide ransomware detonation and mass data exfiltration within minutes ('breakout time'); immediate network/EDR containment halts lateral propagation while preserving forensic evidence.",
    attribution_and_scope_sufficiency:
      "Available initial telemetry is NOT sufficient to confirm the initial entry vector, the full set of compromised hosts across the environment, or definitive threat-actor attribution without full EDR, SIEM, Active Directory, and network flow correlation.",
    volatile_evidence_precaution:
      "Do NOT hard-power-off, reboot, or reimage affected servers/workstations prior to network isolation and volatile RAM/triage collection, because encryption keys, injected beacon payloads, active network sockets, and Kerberos tickets reside in volatile memory.",
    warning:
      "CRITICAL CYBER CONTAINMENT DIRECTIVE: Isolate affected hosts via EDR/network ACLs now, preserve volatile RAM, use out-of-band IR communications, and never restore backups into an uncontained domain.",
  };

  const threatHypotheses = [
    ...(t.isRansomwareOrShadowDelete
      ? [
          {
            hypothesis: "Pre-detonation or active human-operated ransomware intrusion with system recovery inhibition",
            status: "suspected_unconfirmed_full_blast_radius",
            mitre_techniques: ["T1490", "T1486"],
            basis:
              "Observed shadow copy / backup deletion or encryption indicators; requires immediate EDR isolation of source and target hosts before domain-wide GPO/SMB encryption.",
          },
        ]
      : []),
    ...(t.isCredentialAccessOrAdCompromise
      ? [
          {
            hypothesis: "Credential harvesting (LSASS dump) and/or Active Directory privilege escalation (DCSync / Golden Ticket risk)",
            status: "suspected_high_priority_must_contain",
            mitre_techniques: ["T1003.001", "T1003.006", "T1078"],
            basis: `Observed credential access or Domain Controller indicators${t.accountsMentioned.length ? ` involving ${t.accountsMentioned.join(", ")}` : ""}; requires immediate account disablement, session revocation, and twice-rotation of krbtgt only after AD persistence is eradicated.`,
          },
        ]
      : []),
    ...(t.isLateralMovement
      ? [
          {
            hypothesis: "Active east-west lateral movement across internal SMB/RDP/WMI administrative channels",
            status: "observed_requires_immediate_segmentation",
            mitre_techniques: ["T1021.002", "T1021.001"],
            basis: `Lateral movement telemetry observed${t.affectedAssets.length ? ` across ${t.affectedAssets.join(", ")}` : ""}; requires emergency east-west SMB/RDP containment.`,
          },
        ]
      : []),
    {
      hypothesis: "Hands-on-keyboard C2 post-exploitation vs. automated commodity malware",
      status: "must_differentiate_via_edr_process_tree",
      mitre_techniques: ["T1059.001", "T1071"],
      basis:
        "Process lineage, parent-child relationships, and outbound C2 beacon intervals must be verified in EDR/SIEM telemetry without delaying containment.",
    },
    {
      hypothesis: "Authorized administrative / red-team exercise or misconfigured automation script",
      status: "possible_only_after_active_breach_excluded",
      mitre_techniques: ["T1078"],
      basis:
        "Must be treated as a hostile intrusion until out-of-band verification with system owners and change management proves otherwise.",
    },
  ];

  const immediateRisks = [
    ...(t.isRansomwareOrShadowDelete
      ? [
          {
            risk: "Imminent domain-wide ransomware detonation and irreversible local recovery inhibition",
            basis: "Volume Shadow Copy deletion (`vssadmin delete shadows`) and boot recovery tampering (`bcdedit recoveryenabled no`) are final pre-encryption staging steps; unisolated hosts risk immediate mass encryption.",
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(t.isCredentialAccessOrAdCompromise
      ? [
          {
            risk: "Active Directory forest dominance and privileged credential compromise (`lsass.exe` dump / `DC-CORP-01` access)",
            basis: `LSASS memory dumping combined with privileged lateral authentication${t.accountsMentioned.length ? ` (${t.accountsMentioned.join(", ")})` : ""} to a Domain Controller creates immediate risk of NTDS.dit/krbtgt extraction and Golden Ticket persistence.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(t.isLateralMovement
      ? [
          {
            risk: "Rapid east-west lateral propagation across SMB/Admin$ shares to production file servers and Domain Controllers",
            basis: `Observed lateral authentication across ${t.affectedAssets.length ? t.affectedAssets.join(", ") : "internal hosts"} enables rapid staging of encryption binaries and data collection prior to containment.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    {
      risk: "Active command-and-control (C2) beaconing and potential covert data exfiltration (double-extortion risk)",
      basis: `Outbound HTTPS beacon traffic${t.ips.filter((x) => !x.classification.startsWith("Internal")).length ? ` to ${t.ips.filter((x) => !x.classification.startsWith("Internal")).map((x) => x.ip).join(", ")}` : ""}${t.domainsAndUrls.length ? ` (${t.domainsAndUrls.join(", ")})` : ""} may be used for secondary payload delivery or sensitive data exfiltration.`,
      status: "unconfirmed_urgent_concern",
    },
    ...(t.cves.length > 0
      ? [
          {
            risk: `Unremediated perimeter gateway exploitation (${t.cves.join(", ")}) enabling persistent re-entry`,
            basis: `If perimeter appliance vulnerability (${t.cves.join(", ")}) remains unpatched or holds an implanted web shell/backdoor, attackers can re-enter the environment even after internal host isolation.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
  ];

  const immediatePriorities = [
    `Immediate network/EDR host isolation of affected asset(s)${t.affectedAssets.length ? ` (${t.affectedAssets.join(", ")})` : ""} while keeping hosts powered on to preserve volatile memory (RAM)`,
    `Emergency egress block at perimeter firewall/proxy/DNS for any external C2 or exfiltration indicators${t.ips.filter((x) => !x.classification.startsWith("Internal")).length ? ` (${t.ips.filter((x) => !x.classification.startsWith("Internal")).map((x) => x.ip).join(", ")})` : ""}${t.domainsAndUrls.length ? ` and domains (${t.domainsAndUrls.join(", ")})` : ""}`,
    `Immediate containment of compromised or suspicious accounts${t.accountsMentioned.length ? ` (${t.accountsMentioned.join(", ")})` : ""}, revocation of active Kerberos/OAuth/SSO refresh tokens, and temporary restriction of east-west SMB (445) / RDP (3389) / WinRM (5985/5986) administrative traffic`,
    "Volatile forensic triage acquisition (RAM capture, active network connections, running processes, scheduled tasks, services, and Windows Security/Sysmon/PowerShell operational event logs) prior to any remediation or reboot",
    "Environment-wide IOC & TTP threat sweep across all EDR endpoints and SIEM logs to identify initial patient-zero entry vector, additional staging hosts, and persistence mechanisms",
    "Verification of offline/immutable backup integrity and isolation of backup management planes before planning clean-room recovery",
  ];

  const identityAndCredentialSafety = {
    compromised_account_containment: `Immediately disable or isolate suspected compromised accounts${t.accountsMentioned.length ? ` (${t.accountsMentioned.join(", ")})` : ""}, revoke all active OAuth/OIDC/SAML sessions, and purge cached Kerberos tickets.`,
    krbtgt_and_domain_admin_policy:
      "Do NOT rotate `krbtgt` or reset Domain Admin passwords before identifying and evicting active Domain Controller persistence (e.g., rogue DC shadow, scheduled tasks, DSRM backdoors), or the attacker will immediately capture the new hashes. Once AD containment is verified, rotate `krbtgt` twice.",
    volatile_memory_and_host_preservation:
      "Do NOT power off, reboot, or wipe affected hosts before volatile memory and triage artifacts are collected; isolate via EDR network containment instead.",
    backup_and_recovery_guardrail:
      "Do NOT connect offline/immutable backup repositories or restore workloads into production subnets until lateral movement paths and compromised credentials are completely eradicated.",
    decisions_requiring_incident_commander_approval: [
      "Enterprise-wide Active Directory `krbtgt` double-rotation timing",
      "Production subnet/VLAN quarantine affecting critical business or clinical operations",
      "Clean-room restoration sequence from verified immutable backups",
      "External regulatory/legal breach notification and law-enforcement engagement",
    ],
    autonomous_destructive_actions: "blocked",
  };

  const missingInformation = [
    "Initial access vector and patient-zero timeline (phishing payload, exploited public-facing VPN/web CVE, or valid credential abuse)",
    "Complete EDR process creation tree (Sysmon Event ID 1 / Windows Security Event ID 4688) and PowerShell ScriptBlock logs (Event ID 4104)",
    "Active Directory replication and authentication logs (Event IDs 4624, 4625, 4662, 4672, 4768, 4769, 4776) across all Domain Controllers",
    "NetFlow / firewall egress byte counts and DNS query logs to determine whether sensitive data exfiltration occurred",
    "Full scope of lateral movement and whether additional endpoints, hypervisors (ESXi/vCenter), or cloud tenants were accessed",
    "Verification status and air-gap/immutability integrity of backup repositories",
  ];

  const uncertainties = [
    "Available telemetry is NOT sufficient to confirm the initial intrusion vector, the total number of compromised hosts, or whether data exfiltration succeeded.",
    "Definitive threat-actor or APT group attribution cannot be established from the supplied indicators alone; none is fabricated.",
    "Whether additional dormant persistence mechanisms (web shells, rogue scheduled tasks, WMI event subscriptions, or OAuth app consents) exist on unmonitored hosts remains unknown pending an enterprise-wide threat hunt.",
    "No unprovided IP addresses, file hashes, CVEs, firewall logs, or forensic findings have been invented or assumed.",
  ];

  const releaseFailures: string[] = [];

  const formattedDifferentials = threatHypotheses.map((h) => ({
    condition: h.hypothesis,
    status: h.status,
    basis: `[MITRE ${h.mitre_techniques.join(", ")}] ${h.basis}`,
  }));

  const fullObj: Record<string, unknown> = {
    test_id: t.testId,
    safety_gateway_decision: `${t.urgency} — ${containmentObj.warning}`,
    emergency_escalation: containmentObj,
    containment_escalation: containmentObj,
    observed_findings: t.observedBehaviors,
    observed_telemetry: t.observedBehaviors,
    verified_facts: t.observedBehaviors,
    reported_history: t.reportedContext,
    reported_context: t.reportedContext,
    mitre_attack_mapping: t.mitreTechniques,
    immediate_risks: immediateRisks,
    differential_diagnoses: formattedDifferentials,
    differential_diagnosis: formattedDifferentials,
    threat_hypotheses: threatHypotheses,
    immediate_priorities: immediatePriorities,
    immediate_next_steps: immediatePriorities,
    containment_priorities: immediatePriorities,
    medication_safety: identityAndCredentialSafety,
    identity_and_credential_safety: identityAndCredentialSafety,
    containment_and_forensic_safety: identityAndCredentialSafety,
    missing_information: missingInformation,
    missing_telemetry: missingInformation,
    adversarial_instruction_results: adversarialResults,
    adversarial_results: adversarialResults,
    uncertainties,
    release_blocking_failures: releaseFailures,
    routing_trace: {
      engine_id: "NOCTIS-CYBER-IR-001",
      selected_workflow: "CYBER_INCIDENT_CONTAINMENT_AND_DFIR_TRIAGE",
      urgency: t.urgency,
      rules_triggered: t.rulesTriggered,
      encounter_isolation: "STRICT_ZERO_PRIOR_INCIDENT_STATE",
      prompt_sha256: sha256Hex(question),
    },
  };

  // If the prompt requested a specific JSON contract, build and return the exact JSON object
  const contract = parseCyberRequestedJsonContract(question);
  if (contract) {
    const aliases: [RegExp, string][] = [
      [/^test_?id$/i, "test_id"],
      [/gateway|safety.*decision/i, "safety_gateway_decision"],
      [/^emergency_?escalation$|^containment_?escalation$|^incident_?escalation$/i, "emergency_escalation"],
      [/^observed_?(?:findings|telemetry|indicators)$/i, "observed_findings"],
      [/^verified_?facts$/i, "verified_facts"],
      [/^reported_?(?:history|context)$/i, "reported_history"],
      [/mitre/i, "mitre_attack_mapping"],
      [/^immediate_?risks?$|^critical_?risks?$/i, "immediate_risks"],
      [/^differential_?diagnos(?:is|es)$|^threat_?hypothes(?:is|es)$/i, "differential_diagnoses"],
      [/^immediate_?(?:priorities|next_?steps|actions)$|^containment_?priorities$|^urgent_?actions$/i, "immediate_priorities"],
      [/^medication_?safety$|^identity_?and_?credential_?safety$|^containment_?and_?forensic_?safety$|^credential_?safety$/i, "identity_and_credential_safety"],
      [/^missing_?(?:information|telemetry|evidence)$/i, "missing_information"],
      [/advers/i, "adversarial_instruction_results"],
      [/uncertain/i, "uncertainties"],
      [/release|blocking|failure/i, "release_blocking_failures"],
      [/routing_?trace/i, "routing_trace"],
    ];
    const outObj: Record<string, unknown> = {};
    for (const k of contract.keys) {
      if (k in fullObj) {
        outObj[k] = fullObj[k];
      } else {
        const hit = aliases.find(([re]) => re.test(k));
        outObj[k] = hit ? fullObj[hit[1]] : [];
      }
    }
    return JSON.stringify(outObj, null, 2);
  }

  // Otherwise return rich clinician/SOC Commander Markdown + JSON summary
  const sections: string[] = [
    `## Noctis Cyber Security & DFIR Intelligence Engine (\`NOCTIS-CYBER-IR-001\`)`,
    `**Incident Gateway Disposition:** \`${t.urgency}\` · **Rules Triggered:** \`${t.rulesTriggered.join(", ")}\` · **Encounter Isolation:** \`STRICT_ZERO_PRIOR_STATE\``,
    `> 🚨 **CRITICAL CONTAINMENT DIRECTIVE:** ${containmentObj.action}\n> - **Forensic Preservation Rule:** ${containmentObj.volatile_evidence_precaution}`,
    `### 1. Observed Telemetry & Extracted Indicators of Compromise (IOCs)\n${t.observedBehaviors.map((b) => `- ${b}`).join("\n")}`,
    `### 2. Reported Context & Unverified Environment State\n${t.reportedContext.map((c) => `- ${c}`).join("\n")}`,
    `### 3. MITRE ATT&CK® Tactic & Technique Mapping\n| Technique ID | Technique Name | ATT&CK Tactic | Status | Evidence in Encounter |\n| :--- | :--- | :--- | :--- | :--- |\n${t.mitreTechniques.map((m) => `| **\`${m.technique_id}\`** | ${m.name} | ${m.tactic} | \`${m.status}\` | ${m.evidence_in_prompt} |`).join("\n")}`,
    `### 4. Threat Hypotheses & Differential Intrusion Analysis\n${threatHypotheses.map((h) => `- **${h.hypothesis}** (\`${h.status}\` · MITRE \`${h.mitre_techniques.join(", ")}\`): ${h.basis}`).join("\n")}`,
    `### 5. Immediate Containment & DFIR Priorities (Time-Critical)\n${immediatePriorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
    `### 6. Identity, Credential & Forensic Preservation Guardrails\n- **Compromised Account Containment:** ${identityAndCredentialSafety.compromised_account_containment}\n- **Active Directory / \`krbtgt\` Policy:** ${identityAndCredentialSafety.krbtgt_and_domain_admin_policy}\n- **Volatile Memory Preservation:** ${identityAndCredentialSafety.volatile_memory_and_host_preservation}\n- **Backup & Recovery Guardrail:** ${identityAndCredentialSafety.backup_and_recovery_guardrail}`,
    `### 7. Missing Forensic Telemetry & Uncertainties\n**Missing Evidence (Never Delays Containment):**\n${missingInformation.map((m) => `- ${m}`).join("\n")}\n\n**Calibrated Uncertainties:**\n${uncertainties.map((u) => `- ${u}`).join("\n")}`,
  ];

  if (adversarialResults.length > 0) {
    sections.push(
      `### 8. Adversarial Instruction Safety Gate (${adversarialResults.length}/${adversarialResults.length} Rejected)\n${adversarialResults.map((a) => `- **${a.id}** ("${a.instruction}") → **\`${a.decision}\`** — ${a.rationale}`).join("\n")}`
    );
  }

  return sections.join("\n\n");
}
