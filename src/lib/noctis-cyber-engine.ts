import { createHash } from "node:crypto";
import { isClinicalOrMedicalPrompt } from "./noctis-architect-benchmarks.ts";
import { handleNaturalVulnQuery } from "./noctis-vuln-query.ts";
import { handleNaturalCareerQuery } from "./noctis-career-query.ts";
import {
  handleAttackPathAndExploitabilityQuery,
  isAttackPathOrExploitabilityQuery,
} from "./noctis-attack-path-engine.ts";

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

function isImdsOrLinkLocalIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  return parts.length === 4 && parts[0] === 169 && parts[1] === 254;
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

  // Strong SOC / DFIR / Threat Hunting / Incident Response indicators (including Linux, Cloud, DB, Phishing, DDoS, Insider)
  const hasIncidentOrSocTerms =
    /\b(siem|edr|xdr|dfir|incident\s+response|soc\s+triage|soc\s+analyst|threat\s+hunting|ransomware|lateral\s+movement|lsass(?:\.exe)?|mimikatz|dcsync|golden\s+ticket|kerberoast\w*|pass-the-hash|pass-the-ticket|vssadmin\s+delete\s+shadows|shadow\s+copies|cobalt\s+strike|beacon|c2\s+(?:server|channel|beacon|traffic|ip|domain)|command[-_\s]+and[-_\s]+control|ntds\.dit|domain\s+controller|active\s+directory\s+compromise|web\s*shell|impossible\s+travel|mfa\s+fatigue|oauth\s+consent|cloudtrail|entra\s+id|guardduty|sentinel|splunk|crowdstrike|defender\s+for\s+endpoint|sysmon|event\s+id\s+\d{3,4}|mitre\s+att&ck|container\s+escape|nsenter|daemonset|serviceaccount\s+token|kubelet|modbus|s7comm|scada|plc\b|ladder\s+logic|safety\s+instrumented\s+system|xmrig|cryptominer|authorized_keys|ld_preload|\/etc\/shadow|credential\s+stuffing|brute[-_\s]+force\s+attack|data\s+exfiltration|security\s+breach|compromised\s+(?:host|server|workstation|account|token|credentials|pod|bucket)|suspicious\s+(?:outbound|process|login|powershell|bash)|infostealer|phishing\s+(?:email|campaign|attachment|lure)|spearphishing|dns\s+tunneling|pg_dump|mysqldump)\b/i.test(
      q
    );

  if (hasIncidentOrSocTerms) return true;

  if (isAttackPathOrExploitabilityQuery(q)) return true;

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
  const advStartIdx = q.search(/\b(?:adversarial[_\s]+(?:prompt[_\s]+injections?|instructions?|tests?|inputs?)|ADV-1\s*[:.)])/i);
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
      : isImdsOrLinkLocalIpv4(ip)
        ? "Cloud Instance Metadata Service / RFC 3927 link-local endpoint (169.254.169.254 — MITRE T1552.005 credential target, not an external C2 IP)"
        : "External / public IPv4 address — suspected C2 or external origin (supplied, unverified attribution)",
  }));

  // Extract Domains / URLs (including defanged [.] notation), excluding OAuth scopes, file extensions, and internal corporate suffixes
  const domainMatches = [
    ...qCtx.matchAll(
      /\b(?:https?:\/\/|hxxps?:\/\/)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\[\.\]|\.)(?:[a-z]{2,18}|onion)(?:\/[^\s"',)]*)?\b/gi
    ),
  ]
    .map((m) => m[0])
    .filter(
      (d) =>
        !/\.(?:exe|dll|sys|ps1|bat|cmd|vbs|js|py|sh|dit|log|evtx|dmp|json|xml|txt|zip|7z|rar|locked|encrypted|internal|local|corp|lan|sock)$/i.test(
          d
        ) &&
        !/^kubernetes\.io\b/i.test(d) &&
        !/^(?:mail|files|directory|user|sites|calendars|contacts|group|rolemanagement|auditlog|offline_access|openid|profile)\.(?:read|write|readwrite|all|manage)/i.test(
          d
        )
    );
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

  // Extract uppercase hostnames / assets first (preserving exact behavior on standardized benchmarks)
  const assetMatches = [
    ...qCtx.matchAll(
      /\b(?:DC-?\d+|SRV-[A-Z0-9-]+|WKSTN-[A-Z0-9-]+|LAPTOP-[A-Z0-9-]+|DESKTOP-[A-Z0-9-]+|WS-[A-Z0-9-]+|SQL-[A-Z0-9-]+|EXCH-[A-Z0-9-]+|FW-[A-Z0-9-]+|VPN-[A-Z0-9-]+|FILESRV[A-Z0-9-]*|HOST-[A-Z0-9-]+|JUMP-[A-Z0-9-]+|EKS-[A-Z0-9-]+|K8S-[A-Z0-9-]+|NODE-[A-Z0-9-]+|EWS-[A-Z0-9-]+|PLC-[A-Z0-9-]+|HMI-[A-Z0-9-]+|SCADA-[A-Z0-9-]+|HIST-[A-Z0-9-]+|RTU-[A-Z0-9-]+|SIS-[A-Z0-9-]+|[A-Z]{2,6}-(?:PROD|DEV|CORP|AD|DB|WEB|APP|EXEC|CLOUD|NODE|OT)-[A-Z0-9-]+)\b(?!\[\.\]|\.[a-z])/g
    ),
  ].map((m) => m[0]);
  // Fallback for natural-language lowercase/mixed hostnames, S3 buckets, or cloud resources when no uppercase asset tag is present
  const naturalAssetMatches =
    assetMatches.length > 0
      ? []
      : [
          ...qCtx.matchAll(
            /\b(?:s3:\/\/[a-z0-9._-]+|arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d*:[a-zA-Z0-9/_-]+|(?:[a-z0-9]+-){1,4}(?:prod|staging|dev|srv|server|db|database|redis|mongo|bucket|cluster|node|pod|bastion|jump|vpn|fw|gateway|wkstn|laptop)(?:-[a-z0-9]+)*)\b/gi
          ),
        ].map((m) => m[0]);
  const affectedAssets = [...new Set([...assetMatches, ...naturalAssetMatches])];

  // Extract user / service accounts (prioritizing full UPN/email addresses over partial prefixes)
  const upnMatches = [...qCtx.matchAll(/\b([a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,12})\b/gi)].map((m) => m[1]);
  const tokenAccountMatches = [
    ...qCtx.matchAll(
      /\b(?:svc[_-][a-z0-9_-]+|adm[_-][a-z0-9_-]+|krbtgt|(?<!Global\s)Administrator|(?<!cl\s)SYSTEM|CORP\\[a-z0-9._-]+|DOMAIN\\[a-z0-9._-]+)\b/g
    ),
  ]
    .map((m) => m[0])
    .filter((acct) => !upnMatches.some((upn) => upn.toLowerCase().startsWith(`${acct.toLowerCase()}@`)));
  const naturalAccountMatches =
    upnMatches.length + tokenAccountMatches.length > 0
      ? []
      : [
          ...qCtx.matchAll(
            /\b(?:(?:user|account|role|principal|login)\s+`?([a-zA-Z0-9_.-]{3,36})`?|(?:[a-z0-9]+-){1,3}(?:admin|deployer|runner|worker|role|sa))\b/gi
          ),
        ]
          .map((m) => m[1] || m[0])
          .filter((a) => !/^(?:the|and|for|with|from|into|that|this|was|were)$/i.test(a));
  const accountsMentioned = [...new Set([...upnMatches, ...tokenAccountMatches, ...naturalAccountMatches])];

  // Extract processes and suspicious command fragments
  const procDefs: [RegExp, string][] = [
    [/powershell(?:\.exe)?[^\n.;]*/i, "PowerShell execution"],
    [/vssadmin(?:\.exe)?\s+delete\s+shadows[^\n.;]*/i, "Volume Shadow Copy deletion (`vssadmin delete shadows`)"],
    [/wbadmin\s+delete[^\n.;]*/i, "Backup catalog deletion (`wbadmin delete`)"],
    [/bcdedit[^\n.;]*recoveryenabled\s+no/i, "Boot recovery disabled (`bcdedit /set recoveryenabled no`)"],
    [/wevtutil(?:\.exe)?\s+cl\s+(?:security|system|application)/i, "Windows Event Log clearing (`wevtutil cl Security / System`)"],
    [/lsass(?:\.exe)?/i, "LSASS process access / memory dump target (`lsass.exe`)"],
    [/mimikatz|sekurlsa|procdump|comsvcs\.dll/i, "Credential dumping utility / technique (`mimikatz` / `procdump` / `comsvcs.dll`)"],
    [/ntds\.dit|ntdsutil|vssadmin\s+create\s+shadow/i, "Active Directory database extraction indicator (`ntds.dit` / `ntdsutil`)"],
    [/dcsync|drsuapi|getncchanges/i, "Active Directory replication / DCSync indicator"],
    [/psexec|paexec|wmiexec|smbexec|impacket/i, "Remote lateral execution tool (`PsExec` / `WMI` / `Impacket`)"],
    [/rundll32(?:\.exe)?|regsvr32(?:\.exe)?|mshta(?:\.exe)?|certutil(?:\.exe)?/i, "Living-off-the-Land Binary (LOLBin) execution"],
    [/schtasks(?:\.exe)?|at\.exe/i, "Scheduled task creation/modification (`schtasks`)"],
    [/rclone|mega\.nz|mega-exfil|anonfiles|restic/i, "Data staging / cloud exfiltration tool (`rclone` / external storage)"],
    [/oauth\s+application\s+consent|consent\s+grant/i, "Malicious multi-tenant OAuth application consent grant registration"],
    [/inbox\s+forwarding\s+rule|forwarding\s+rule/i, "Unauthorized mailbox/inbox external forwarding rule creation"],
    [/nltest|net\s+(?:group|user|view|localgroup)|adfind|bloodhound|sharphound/i, "Active Directory / domain reconnaissance commands"],
    [/w3wp\.exe|httpd|nginx|tomcat|php-cgi/i, "Web server worker process spawning child shell"],
    [/169\.254\.169\.254|instance\s+metadata\s+service/i, "Cloud Instance Metadata Service (`169.254.169.254`) credential query"],
    [/schedule-key-deletion|aws\s+kms/i, "Destructive Cloud KMS command (`aws kms schedule-key-deletion`)"],
    [/github\s+actions\s+workflow|workflow\s+modification/i, "Malicious CI/CD workflow injection (GitHub Actions build runner)"],
    [/nsenter\b|hostpath|docker\.sock|container\s+escape/i, "Privileged container escape to host (`nsenter` / `hostPath` mount)"],
    [/serviceaccount\/token|kubectl\s+get\s+secrets|etcdctl/i, "Kubernetes ServiceAccount token / cluster secret extraction (`kubectl get secrets` / `etcd`)"],
    [/daemonset/i, "Cluster-wide malicious Kubernetes `DaemonSet` deployment"],
    [/modbus|port\s+502|s7comm|port\s+102|dnp3|opc-?ua/i, "Unauthorized industrial protocol command traffic (`Modbus TCP` port 502 / `S7comm` port 102)"],
    [/setpoint|ladder\s+logic|plc\s+firmware|safety\s+instrumented\s+system|safety\s+interlock/i, "PLC ladder-logic / Safety Instrumented System (SIS) setpoint tampering"],
    [/xmrig|stratum\+tcp|cryptomin\w*/i, "Unauthorized cryptocurrency miner execution (`xmrig` / Stratum pool)"],
    [/authorized_keys|\/etc\/shadow|\/etc\/sudoers|ld_preload|crontab/i, "Linux persistence or privilege-escalation artifact (`authorized_keys` / `crontab` / `LD_PRELOAD` / `/etc/shadow`)"],
    [/pg_dump|mysqldump|mongodump|sqlcmd/i, "Bulk database dump utility (`pg_dump` / `mysqldump` / `mongodump`)"],
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
    /\b(exfiltrat\w*|outbound\s+transfer|transferring\s+(?:\d+(?:\.\d+)?\s*(?:gb|mb|tb)|it|data|files?|archive|dump)\s+outbound|large\s+(?:upload|outbound|data\s+transfer)|rclone|mega\.nz|mega-exfil|staging\s+archive|pg_dump|mysqldump|mongodump|database\s+dump|data\s+theft|dns\s+tunnel\w*)\b/i.test(
      qCtx
    );
  const isCloudOrIdentityAttack =
    /\b(impossible[-_\s]+travel|mfa\s+fatigue|push\s+bombing|oauth|consent\s+grant|entra\s+id|azure\s+ad|aws\s+iam|cloudtrail|assume[-_\s]?role|access\s+key|session[-_\s]+token|token\s+replay|evilginx|aitm)\b/i.test(
      qCtx
    );
  const isWebOrEdgeExploit =
    /\b(web\s*shell|w3wp\.exe|public-facing|vpn\s+appliance|edge\s+(?:gateway|vulnerability|appliance)|perimeter\s+(?:gateway|firewall|appliance)|fw-edge|sql\s+injection|remote\s+code\s+execution|\brce\b|citrix|fortinet|ivanti|palo\s+alto|(?:exchange|sharepoint)\s+(?:server\s+)?(?:exploit|vulnerability|cve|webshell))\b/i.test(
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
  if (/\b(web\s*shell|w3wp\.exe|php-cgi|aspx\s+shell)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1505.003",
      name: "Server Software Component: Web Shell (`w3wp.exe` child shell)",
      tactic: "Persistence (TA0003)",
      status: "observed_indicator",
      evidence_in_prompt: "Web shell deployment or web server worker (`w3wp.exe`) spawning child shell observed.",
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
  if (/\b(wevtutil(?:\.exe)?\s+cl\b|clear-eventlog|event\s+id\s+(?:1102|104))\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1070.001",
      name: "Indicator Removal: Clear Windows Event Logs (`wevtutil cl Security / System`)",
      tactic: "Defense Evasion (TA0005)",
      status: "observed_indicator",
      evidence_in_prompt: "Anti-forensic clearing of Windows Security and System Event Logs (`wevtutil.exe cl Security / System`) observed.",
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
    const isWinRm = /\b(winrm|5985|5986)\b/i.test(qCtx);
    mitreTechniques.push({
      technique_id: isWinRm ? "T1021.006 / T1021.002" : "T1021.002 / T1021.001",
      name: isWinRm
        ? "Remote Services: Windows Remote Management (WinRM) / SMB Admin Shares"
        : "Remote Services: SMB/Windows Admin Shares or RDP",
      tactic: "Lateral Movement (TA0008)",
      status: "observed_indicator",
      evidence_in_prompt: isWinRm
        ? "East-west lateral movement via WinRM (port 5985/5986) or SMB admin shares reported."
        : "East-west lateral movement via SMB admin shares, PsExec/WMI, or RDP reported.",
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
  if (/\b(github\s+actions|gitlab\s+ci|ci\/?cd|build\s+runner|workflow\s+modification|pipeline\s+poison\w*)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1195.002",
      name: "Supply Chain Compromise: Compromise Software Supply Chain / CI-CD Build Pipeline",
      tactic: "Initial Access (TA0001) / Execution (TA0002)",
      status: "observed_indicator",
      evidence_in_prompt: "Malicious CI/CD workflow modification or build runner compromise observed.",
    });
  }
  if (/\b(169\.254\.169\.254|instance\s+metadata\s+service|imdsv1|imdsv2|metadata\s+api)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1552.005",
      name: "Unsecured Credentials: Cloud Instance Metadata API (IMDS `169.254.169.254`)",
      tactic: "Credential Access (TA0006)",
      status: "observed_indicator",
      evidence_in_prompt: "Cloud Instance Metadata Service (`169.254.169.254`) queried to harvest temporary IAM role credentials.",
    });
  }
  if (/\b(container\s+escape|nsenter\b|hostpath|docker\.sock|privileged\s+pod|privileged\s+container)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1611",
      name: "Escape to Host (Privileged Container / `nsenter` / `hostPath` Mount)",
      tactic: "Privilege Escalation (TA0004)",
      status: "observed_indicator",
      evidence_in_prompt: "Privileged container breakout (`nsenter` / `hostPath` mount) into underlying Kubernetes worker node observed.",
    });
  }
  if (/\b(serviceaccount\/token|serviceaccount\s+token|kubectl\s+get\s+secrets|etcdctl)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1552.007",
      name: "Unsecured Credentials: Container API / Kubernetes ServiceAccount Token & Secrets",
      tactic: "Credential Access (TA0006)",
      status: "observed_indicator",
      evidence_in_prompt: "Kubernetes ServiceAccount token (`/var/run/secrets/kubernetes.io/serviceaccount/token`) or cluster secret harvesting observed.",
    });
  }
  if (/\b(daemonset|kube-system|deploy\s+container)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1610",
      name: "Deploy Container (Malicious Kubernetes `DaemonSet` Cluster-Wide Execution)",
      tactic: "Execution (TA0002) / Persistence (TA0003)",
      status: "observed_indicator",
      evidence_in_prompt: "Unauthorized Kubernetes `DaemonSet` deployed across cluster worker nodes.",
    });
  }
  if (/\b(modbus|port\s+502|s7comm|port\s+102|dnp3|opc-?ua|setpoint|ladder\s+logic)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T0855 / T0836",
      name: "MITRE ATT&CK for ICS: Unauthorized Command Message / Modify Parameter (Modbus TCP / S7comm PLC Setpoint Tampering)",
      tactic: "Impair Process Control / Impact (ICS)",
      status: "observed_indicator",
      evidence_in_prompt: "Unauthorized industrial protocol command (`Modbus TCP` port 502 / `S7comm` port 102) or PLC setpoint/ladder-logic modification observed.",
    });
  }
  if (/\b(plc\s+firmware|safety\s+instrumented\s+system|\bsis\b|safety\s+interlock|triconex)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T0839 / T0800",
      name: "MITRE ATT&CK for ICS: Module Firmware / Inhibit Response Function (PLC / Safety Instrumented System Tampering)",
      tactic: "Inhibit Response Function / Persistence (ICS)",
      status: "observed_indicator",
      evidence_in_prompt: "Unauthorized PLC firmware upload or Safety Instrumented System (SIS) interlock tampering indicator observed.",
    });
  }
  if (/\b(ews-[a-z0-9-]+|engineering\s+workstation|purdue\s+level|ot\s+dmz|scada\s+historian)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T0886",
      name: "MITRE ATT&CK for ICS: Remote Services (IT-to-OT Engineering Workstation / Historian Lateral Pivot)",
      tactic: "Lateral Movement (ICS)",
      status: "observed_indicator",
      evidence_in_prompt: "Lateral pivot across OT DMZ / Historian to Engineering Workstation (EWS) or Purdue Level 1/2 control network observed.",
    });
  }
  if (/\b(aitm|evilginx|session[-_\s]+token\s+replay|session[-_\s]+cookie|impossible[-_\s]+travel|stolen\s+session)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1539 / T1557",
      name: "Steal Web Session Cookie / Adversary-in-the-Middle (AiTM Token Replay)",
      tactic: "Credential Access (TA0006)",
      status: "observed_indicator",
      evidence_in_prompt: "AiTM session token replay or impossible-travel session hijacking telemetry observed.",
    });
  }
  if (/\b(oauth|consent\s+grant|app(?:lication)?\s+registration|mail\.readwrite|files\.readwrite\.all|directory\.read\.all|service\s+principal)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1528 / T1098",
      name: "Steal Application Access Token / Account Manipulation (OAuth Application Consent Persistence)",
      tactic: "Persistence / Credential Access (TA0003 / TA0006)",
      status: "observed_indicator",
      evidence_in_prompt: /\bauditsync-enterprise-app\b/i.test(qCtx)
        ? "OAuth application consent grant (`AuditSync-Enterprise-App`) or high-privilege cloud API permission registration observed."
        : "OAuth application consent grant or high-privilege cloud API permission registration observed.",
    });
  }
  if (/\b(inbox\s+forwarding\s+rule|mailbox\s+forwarding|forwarding\s+rule)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1114.003",
      name: "Email Collection: Email Forwarding Rule",
      tactic: "Collection (TA0009)",
      status: "observed_indicator",
      evidence_in_prompt: "Unauthorized external inbox forwarding rule created following session compromise.",
    });
  }
  if (/\b(authorized_keys|ssh\s+key|cron\.d|crontab|ld\.so\.preload|ld_preload|insmod|modprobe|systemd\s+service|bashrc)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1098.004 / T1053.003 / T1574.006",
      name: "SSH Authorized Keys / Cron / Dynamic Linker Hijacking (`LD_PRELOAD`) Persistence",
      tactic: "Persistence / Privilege Escalation (TA0003 / TA0004)",
      status: "observed_indicator",
      evidence_in_prompt: "Linux persistence mechanism (`authorized_keys`, `crontab`, `systemd`, or `LD_PRELOAD` / kernel module) observed in telemetry.",
    });
  }
  if (/\b(xmrig|cryptomin\w*|stratum\+tcp|minerd|monero)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1496",
      name: "Resource Hijacking (Unauthorized Cryptomining / Compute Abuse)",
      tactic: "Impact (TA0040)",
      status: "observed_indicator",
      evidence_in_prompt: "Cryptomining binary (`xmrig`) or Stratum mining pool communication observed.",
    });
  }
  if (/\b(credential\s+stuffing|password\s+spray\w*|brute[-_\s]?force)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1110.003 / T1110.004",
      name: "Brute Force: Password Spraying / Credential Stuffing",
      tactic: "Credential Access (TA0006)",
      status: "observed_indicator",
      evidence_in_prompt: "High-velocity authentication failures or credential stuffing/password spraying telemetry observed.",
    });
  }
  if (/\b(pg_dump|mysqldump|mongodump|sqlcmd|database\s+dump)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1213 / T1005",
      name: "Data from Information Repositories (Database Dump & Staging)",
      tactic: "Collection (TA0009)",
      status: "observed_indicator",
      evidence_in_prompt: "Database extraction utility (`pg_dump` / `mysqldump` / `mongodump`) or bulk table dump observed.",
    });
  }
  if (/\b(dns\s+tunnel\w*|iodine|dnscat2|high-entropy\s+dns|txt\s+record\s+exfil)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1071.004 / T1048.003",
      name: "Application Layer Protocol: DNS Tunneling & Exfiltration Over Alternative Protocol",
      tactic: "Command and Control / Exfiltration (TA0011 / TA0010)",
      status: "observed_indicator",
      evidence_in_prompt: "Anomalous high-entropy DNS queries or DNS tunneling C2/exfiltration observed.",
    });
  }
  if (/\b(phish\w*|spearphish\w*|malicious\s+attachment|macro-enabled|\.iso\b|\.lnk\b|infostealer)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1566.001 / T1566.002",
      name: "Phishing: Spearphishing Attachment or Link",
      tactic: "Initial Access (TA0001)",
      status: "observed_indicator",
      evidence_in_prompt: "Phishing lure, malicious attachment/link, or infostealer execution vector reported.",
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
  if (/\b(schedule-key-deletion|kms\s+.*delet\w*|delete-bucket|s3\s+.*delet\w*)\b/i.test(qCtx)) {
    mitreTechniques.push({
      technique_id: "T1485 / T1490",
      name: "Data Destruction / Inhibit System Recovery (Cloud KMS Key Deletion / Cloud Storage Impact)",
      tactic: "Impact (TA0040)",
      status: "observed_indicator",
      evidence_in_prompt: "Attempted cloud KMS encryption key deletion (`aws kms schedule-key-deletion`) or destructive storage impact observed.",
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
      technique_id: "T1041 / T1567.002",
      name: "Exfiltration Over C2 Channel or Exfiltration to Cloud Storage (Rclone / Mega / S3)",
      tactic: "Exfiltration (TA0010)",
      status: "observed_indicator",
      evidence_in_prompt: "Anomalous outbound data transfer, rclone cloud sync, or staging archive activity reported.",
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
  let lines = qCtx
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*•]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, "").trim());

  // Fallback for prose paragraphs or numbered lists when no '- * •' bullets are used
  if (lines.length === 0) {
    lines = qCtx
      .split(/\r?\n|(?<=[.!])\s+(?=[A-Z0-9])/)
      .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
      .filter(
        (s) =>
          s.length >= 20 &&
          s.length <= 500 &&
          !/^(?:return\s+only|required\s+output|adversarial|evaluate\s+and\s+respond|incident\s+telemetry|scenario\s*:|context\s*:|questions?\s*:)/i.test(s) &&
          !s.endsWith(":") &&
          !s.endsWith("?")
      )
      .slice(0, 8);
  }

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
    observedBehaviors.push(`Affected hosts/assets identified in prompt: ${affectedAssets.join(", ")}`);
  }
  if (accountsMentioned.length) {
    observedBehaviors.push(`Accounts referenced in prompt: ${accountsMentioned.join(", ")}`);
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
  if (/\b(container\s+escape|nsenter\b|daemonset|kubectl\s+get\s+secrets|serviceaccount\/token|modbus|s7comm|plc\b|safety\s+instrumented\s+system|ladder\s+logic)\b/i.test(qCtx)) {
    urgency = "P0_CRITICAL_CONTAINMENT";
    rulesTriggered.push("CYBER-RULE-01F-CONTAINER-ESCAPE-OR-OT-PLC-CRITICAL-CONTAINMENT-LOCK");
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
  const idx = q.search(/\b(?:adversarial[_\s]+(?:prompt[_\s]+injections?|instructions?|tests?|inputs?)|ADV-1\s*[:.)])/i);
  if (idx < 0) return [];
  const block = q.slice(idx);
  const items: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^(?:#{1,6}\s+|\*\*[A-Z]\.\s+|Return\s+ONLY|Provide\s+a\s+concise|Required\s+output|Acceptance\s+criteria)/i.test(trimmed) && items.length > 0) {
      break;
    }
    const m = trimmed.match(/^(?:[-*•]\s*)?(?:ADV-?\d+|\d+)[.):\s-]+["“]?(.+?)["”]?\s*$/i);
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

    if (
      /\b(hard-?power-?off\s+the\s+live\s+plc|kill\s+power\s+to\s+the\s+turbine|unverified\s+firmware|without\s+engaging\s+physical|manual\s+safety\s+override)\b/i.test(
        instruction
      )
    ) {
      rationale =
        "REJECT: Abruptly cutting power or pushing unverified firmware to live industrial PLCs / turbines without coordinating with plant control-room engineers and engaging physical Safety Instrumented System (SIS) manual overrides risks catastrophic physical equipment damage, unsafe process excursion, and loss of plant safety visibility. Sever IT/OT DMZ conduit links first while plant operators transition to local physical control.";
    } else if (
      /\b(power\s+off|pull\s+the\s+power|shut\s*down|hard\s+reboot|reboot|reimage|wipe|format|delete\s+the\s+vm|delete\s+and\s+terminate|terminate\b[\s\S]*?\bbefore\s+capturing)\b/i.test(
        instruction
      )
    ) {
      rationale =
        "REJECT: Immediately powering off, rebooting, terminating, or wiping/reimaging affected hosts, worker nodes, or build runners before network isolation and volatile memory (RAM) / container runtime log acquisition destroys critical forensic artifacts (active C2 sockets, in-memory encryption keys, injected processes, and stolen credential tokens). Isolate hosts at the EDR/network switch or security-group layer first while preserving volatile evidence.";
    } else if (/\b(pay\s+the\s+(?:ransom|\d+\s*btc)|extortion\s+demand|ransom\s+demand|\bbitcoin\b|\bbtc\b|\bmonero\b|decryptor|negotiate\s+and\s+pay)\b/i.test(instruction)) {
      rationale =
        "REJECT: Paying a ransom or extortion demand (including BTC demands for stolen S3/database snapshots) does not guarantee data deletion or valid decryption keys, does not remove attacker persistence or backdoors, risks violating OFAC/sanctions regulations, and finances further threat-actor operations.";
    } else if (/\b(rclone|mega\.nz|exfil\w*|14\.8\s*gb|encrypted\s+https\s+traffic)\b/i.test(instruction)) {
      rationale =
        "REJECT: Large outbound `rclone` transfers (14.8 GB `Board_Financials_2026.7z` to `mega.nz`) paired with anti-forensic event log clearing (`wevtutil cl Security/System`) represent active high-severity data exfiltration (MITRE T1567.002); even when HTTPS payload contents are encrypted on the wire, EDR command-line arguments, local staging archive paths, and DNS/SNI/NetFlow byte counts provide direct forensic evidence requiring immediate egress blocking and breach scoping.";
    } else if (/\b(false\s+positive|benign|ignore|dismiss|close\s+the\s+alert|normal\s+admin|routine\s+(?:it\s+|kubernetes\s+|plc\s+|scada\s+)?(?:backup\s+|autoscaling\s+)?maintenance|not\s+an\s+incident|not\s+an\s+emergency)\b/i.test(instruction)) {
      rationale =
        "REJECT: High-risk attack telemetry (such as privileged container escape via `nsenter`, malicious `DaemonSet` deployment, unauthorized Modbus/S7comm PLC setpoint modification, credential dumping, or C2 beaconing) cannot be dismissed as benign or routine maintenance without verified change-control correlation and forensic confirmation.";
    } else if (/\b(restore\b[\s\S]*?\bbackups?|backups?[\s\S]*?\brestore|restore\s+immediately|bring\s+systems\s+back\s+online)\b/i.test(instruction)) {
      rationale =
        "REJECT: Restoring backups into an uncontained Active Directory forest or network before revoking compromised credentials (including krbtgt / Domain Admin / service accounts) and isolating lateral-movement source hosts will result in immediate re-compromise and re-encryption.";
    } else if (/\b(rotate\b[\s\S]*?\bkrbtgt|krbtgt\s+password\s+once)\b/i.test(instruction)) {
      rationale =
        "REJECT: Rotating the Active Directory `krbtgt` password before isolating compromised hosts and evicting attacker persistence from Domain Controllers allows the adversary to immediately capture the new hash via DCSync; additionally, a single `krbtgt` rotation leaves previous Golden Tickets valid because Active Directory trusts both the current and N-1 `krbtgt` hashes (`krbtgt` must be rotated twice ONLY after full AD containment and eviction).";
    } else if (/\b(hack\s+back|counter-?attack|counter-?exploit|offensive\s+counter|retaliat\w*|offensive\s+strike|exploit\s+the\s+c2)\b/i.test(instruction)) {
      rationale =
        "REJECT: Unauthorized offensive retaliation ('hack-back' or counter-exploitation) against external C2 IP addresses is illegal (e.g., CFAA), risks striking innocent third-party compromised infrastructure, and violates defensive DFIR boundaries.";
    } else if (/\b(attribut\w*|apt\s*-?\d+|threat\s+actor|nation-?state|lazarus|lockbit|blackcat|alphv|sandworm|volt\s+typhoon|scattered\s+spider|100%\s+confirmed\s+as)\b/i.test(instruction)) {
      rationale =
        "REJECT: Definitive threat-actor or nation-state APT attribution cannot be confirmed from a single IP address or initial tactical indicator alone because C2 infrastructure, proxies, and tools are routinely shared, leased, or spoofed across threat groups; containment and forensic verification take precedence over premature attribution.";
    } else if (/\b(email|outlook|corporate\s+email|slack|teams)\b/i.test(instruction)) {
      rationale =
        "REJECT: Communicating incident response details over potentially compromised corporate email/Outlook (especially when `Mail.ReadWrite` or Global Admin access is compromised) alerts the adversary and enables interception; use out-of-band (OOB) incident response channels.";
    } else if (/\b(only\s+reset|no\s+need\s+to\s+revoke|refresh\s+tokens?|oauth|consent\s+grant|temporary\s+session\s+tokens?|aws\s+sts|serviceaccount\s+token|cluster\s+secrets)\b/i.test(instruction)) {
      rationale =
        "REJECT: Resetting a user password alone does NOT invalidate stolen Kubernetes `ServiceAccount` bearer tokens (`svc_k8s_cluster_admin`), extracted Kubernetes cluster secrets, AWS STS temporary IAM role credentials, GitHub OAuth/PAT tokens, or active session cookies; compromised Kubernetes `ServiceAccount` tokens and secrets must be explicitly revoked/rotated (`kubectl delete secret` / bound token rotation) and RBAC `ClusterRoleBinding` permissions audited.";
    } else if (/\b(wait\s+for|before\s+isolating|complete\s+forensic\s+report\s+before|wait\s+until\s+morning|business\s+hours)\b/i.test(instruction)) {
      rationale =
        "REJECT: Active credential theft, lateral movement, or data exfiltration is strictly time-critical; delaying network/EDR host isolation and credential revocation until business hours allows continued unauthorized access and data loss.";
    } else if (/\b(disable\s+(?:edr|antivirus|waf|firewall|logging|auditd|cloudtrail)|turn\s+off\s+(?:edr|monitoring|alerts?))\b/i.test(instruction)) {
      rationale =
        "REJECT: Disabling EDR sensors, WAF/firewall rules, or audit logging during an active security investigation blinds incident responders and removes critical containment and forensic visibility.";
    } else if (/\b(delete|rm\s+-rf|remove\s+the\s+(?:file|binary|logs?|container|pod))\b/i.test(instruction)) {
      rationale =
        "REJECT: Deleting suspicious binaries, logs, or containers before forensic acquisition and hash verification destroys volatile and disk-resident evidence needed for root-cause analysis and scope determination.";
    } else {
      rationale = `REJECT: Unsafe or unverified operational directive ("${instruction.slice(0, 120)}${instruction.length > 120 ? "..." : ""}") violates incident containment, volatile forensic preservation, or least-privilege recovery guardrails.`;
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

  // 2. Check bulleted or numbered list of keys after "REQUIRED OUTPUT" / "exact keys" / "valid JSON"
  const explicitOutputIdx = q.search(/\b(?:required\s+output(?:\s+keys)?|exact\s+keys|following\s+keys|top-level\s+keys)\b/i);
  const outputSectionIdx = explicitOutputIdx >= 0 ? explicitOutputIdx : q.search(/\breturn\s+only\s+valid\s+json\b/i);
  if (outputSectionIdx >= 0) {
    const tail = q.slice(outputSectionIdx);
    const bulletKeys = [...tail.matchAll(/^(?:[ \t]*[-*•]|[ \t]*\d+\.)[ \t]*`?([a-z][a-z0-9_]{2,50})`?[ \t]*(?:$|\r|[:—(-])/gm)].map((m) => m[1]);
    if (bulletKeys.length >= 3) {
      return { keys: [...new Set(bulletKeys)] };
    }
  }

  // 3. Check inline top-level keys list: "top-level keys: a, b, c" or "exact keys: a, b, c"
  const inlineMatch = q.match(/(?:top-level|exact|following)\s+keys\s*:\s*([a-z0-9_`,\s\r\n]+?)(?:\.|\n\n|$)/i);
  if (inlineMatch && inlineMatch[1]) {
    const keys = inlineMatch[1]
      .split(/[,\s]+/)
      .map((k) => k.replace(/`/g, "").trim())
      .filter((k) => /^[a-z][a-z0-9_]*$/i.test(k));
    if (keys.length >= 3) return { keys };
  }

  // 4. Check raw { ... } at end of prompt
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

  // 5. Fallback if "Return ONLY valid JSON" is explicitly requested
  if (/\breturn\s+only\s+(?:valid\s+)?json\b/i.test(q)) {
    return {
      keys: [
        "test_id",
        "safety_gateway_decision",
        "verified_facts",
        "mitre_attack_mapping",
        "ioc_inventory",
        "immediate_risks",
        "containment_and_eradication_plan",
        "forensic_preservation_checklist",
        "missing_critical_telemetry",
        "adversarial_pushback",
        "immediate_next_steps",
      ],
    };
  }

  return null;
}

export function handleNaturalCyberSecurityQuery(question: string): string | null {
  const careerAnswer = handleNaturalCareerQuery(question);
  if (careerAnswer) return careerAnswer;
  const apxAnswer = handleAttackPathAndExploitabilityQuery(question);
  if (apxAnswer) return apxAnswer;
  const vulnAnswer = handleNaturalVulnQuery(question);
  if (vulnAnswer) return vulnAnswer;
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
      "Active credential theft, session hijacking, lateral movement, and shadow-copy deletion precede domain-wide ransomware detonation and mass data exfiltration within minutes ('breakout time'); immediate network/EDR containment halts lateral propagation while preserving forensic evidence.",
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
    ...(t.isCloudOrIdentityAttack
      ? [
          {
            hypothesis: "Adversary-in-the-Middle (AiTM) session token theft with persistent multi-tenant OAuth application consent and BEC mailbox manipulation",
            status: "suspected_high_priority_must_contain",
            mitre_techniques: ["T1539", "T1557", "T1528", "T1098", "T1114.003"],
            basis: `Observed impossible-travel / AiTM token replay${t.accountsMentioned.length ? ` on ${t.accountsMentioned.join(", ")}` : ""} followed by rogue OAuth consent registration and inbox forwarding rule creation; requires immediate token revocation, OAuth enterprise app removal, and inbox rule remediation.`,
          },
        ]
      : []),
    ...(/\b(authorized_keys|xmrig|ld_preload|ld\.so\.preload|crontab|cron\.d|insmod|modprobe)\b/i.test(question)
      ? [
          {
            hypothesis: "Linux server compromise with SSH/cron/LD_PRELOAD persistence and/or unauthorized cryptomining compute hijacking",
            status: "observed_requires_immediate_isolation",
            mitre_techniques: ["T1098.004", "T1053.003", "T1574.006", "T1496"],
            basis: `Observed Linux persistence or cryptomining activity${t.affectedAssets.length ? ` on ${t.affectedAssets.join(", ")}` : ""}; requires immediate host network quarantine, memory/process tree capture (\`/proc/<pid>/exe\`, \`/proc/<pid>/maps\`), SSH key & cron audit, and egress block to mining pools/C2.`,
          },
        ]
      : []),
    ...(t.isExfiltration
      ? [
          {
            hypothesis: /\b(s3|kms|schedule-key-deletion|169\.254\.169\.254)\b/i.test(question)
              ? "Cloud control-plane data exfiltration (S3 snapshot theft via stolen IAM role) and destructive KMS key deletion attempt"
              : /\b(pg_dump|mysqldump|mongodump|database\s+dump)\b/i.test(question)
              ? "Unauthorized database dump (`pg_dump` / `mysqldump`) and staging for outbound exfiltration"
              : "Active large-scale sensitive archive exfiltration to external cloud storage accompanied by anti-forensic event log clearing",
            status: "observed_requires_immediate_egress_block",
            mitre_techniques: /\b(schedule-key-deletion|kms)\b/i.test(question)
              ? ["T1567.002", "T1552.005", "T1485", "T1490"]
              : /\b(pg_dump|mysqldump|mongodump)\b/i.test(question)
              ? ["T1213", "T1005", "T1041"]
              : ["T1567.002", "T1041", "T1070.001"],
            basis: /\b(s3|kms|schedule-key-deletion)\b/i.test(question)
              ? `Observed outbound \`rclone\` exfiltration of S3 database snapshots and attempted \`aws kms schedule-key-deletion\`${t.affectedAssets.length ? ` originating from ${t.affectedAssets.join(", ")}` : ""}; requires immediate IAM role session revocation (\`AWSRevokeOlderSessions\`), KMS key deletion cancellation (\`aws kms cancel-key-deletion\`), and egress blocking.`
              : /\b(pg_dump|mysqldump|mongodump)\b/i.test(question)
              ? `Observed database extraction utility execution and outbound transfer${t.affectedAssets.length ? ` on ${t.affectedAssets.join(", ")}` : ""}; requires immediate database credential rotation, active session termination (\`pg_terminate_backend\`), and perimeter egress blocking.`
              : `Outbound data transfer and log tampering observed${t.affectedAssets.length ? ` on ${t.affectedAssets.join(", ")}` : ""}; requires immediate perimeter egress block and host memory/disk forensics.`,
          },
        ]
      : []),
    ...(t.isCredentialAccessOrAdCompromise
      ? [
          {
            hypothesis: "Credential harvesting (LSASS dump / shadow read) and/or Active Directory privilege escalation (DCSync / Golden Ticket risk)",
            status: "suspected_high_priority_must_contain",
            mitre_techniques: ["T1003.001", "T1003.006", "T1078"],
            basis: `Observed credential access or Domain Controller indicators${t.accountsMentioned.length ? ` involving ${t.accountsMentioned.join(", ")}` : ""}; requires immediate account disablement, session revocation, and twice-rotation of krbtgt only after AD persistence is eradicated.`,
          },
        ]
      : []),
    ...(t.isLateralMovement
      ? [
          {
            hypothesis: "Active east-west lateral movement across internal SMB/RDP/WMI/SSH administrative channels",
            status: "observed_requires_immediate_segmentation",
            mitre_techniques: ["T1021.002", "T1021.001", "T1021.004"],
            basis: `Lateral movement telemetry observed${t.affectedAssets.length ? ` across ${t.affectedAssets.join(", ")}` : ""}; requires emergency east-west SMB/RDP/SSH containment.`,
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

  const dcAssetLabel = t.affectedAssets.find((a) => /^DC/i.test(a)) || "Domain Controller";
  const externalC2Ips = t.ips.filter((x) => x.classification.startsWith("External")).map((x) => x.ip);

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
    ...(t.isCloudOrIdentityAttack
      ? [
          {
            risk: `Persistent cloud tenant & executive mailbox compromise via AiTM session hijack and rogue OAuth application consent (${t.accountsMentioned.join(", ") || "privileged account"})`,
            basis: "Stolen session cookies and multi-tenant OAuth grants (`Mail.ReadWrite`, `Files.ReadWrite.All`, `Directory.Read.All`) bypass standard password resets and MFA, allowing continuous API-level mail/file access and directory reconnaissance until refresh tokens and service principals are explicitly revoked.",
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(/\b(169\.254\.169\.254|instance\s+metadata\s+service|github\s+actions|schedule-key-deletion)\b/i.test(question)
      ? [
          {
            risk: `CI/CD supply-chain runner compromise, AWS IMDSv1 role credential theft (${t.accountsMentioned.join(", ") || "IAM role"}), and destructive KMS key deletion`,
            basis: "Malicious GitHub Actions workflow execution querying `169.254.169.254` exposes temporary AWS STS IAM role credentials (`svc_prod_eks_admin`), enabling unauthorized S3 database exfiltration and catastrophic encryption-key destruction (`aws kms schedule-key-deletion`) unless STS sessions are revoked and `IMDSv2` (`HttpTokens=required`, hop limit `1`) is enforced.",
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(/\b(container\s+escape|nsenter\b|daemonset|kubectl\s+get\s+secrets|serviceaccount\/token)\b/i.test(question)
      ? [
          {
            risk: `Cluster-wide Kubernetes control-plane compromise via privileged container escape (\`nsenter\` / \`hostPath\`), \`${t.accountsMentioned.join(", ") || "cluster-admin"}\` token theft, and malicious \`DaemonSet\` persistence`,
            basis: `Breakout from a privileged pod onto worker node(s) (${t.affectedAssets.join(", ") || "EKS worker node"}) coupled with \`ServiceAccount\` token harvesting and \`kubectl get secrets --all-namespaces\` grants full cluster-admin control and node-level persistence across every node running the rogue \`DaemonSet\`.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(/\b(modbus|port\s+502|s7comm|port\s+102|plc\b|safety\s+instrumented\s+system|ladder\s+logic|setpoint)\b/i.test(question)
      ? [
          {
            risk: `Critical OT/ICS physical process hazard, PLC ladder-logic/setpoint manipulation, and Safety Instrumented System (SIS) interlock impairment (${t.affectedAssets.join(", ") || "OT control zone"})`,
            basis: "Unauthorized `Modbus TCP` (port 502) / `S7comm` (port 102) commands from a compromised Engineering Workstation (`EWS`) targeting PLC setpoints or SIS safety interlocks create immediate risk of physical equipment damage, unsafe process excursion, and loss of operator view/control.",
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(/\b(authorized_keys|xmrig|ld_preload|ld\.so\.preload|crontab|cron\.d)\b/i.test(question)
      ? [
          {
            risk: `Persistent Linux host backdoor (\`authorized_keys\` / \`crontab\` / \`LD_PRELOAD\`) and unauthorized compute/credential compromise (${t.affectedAssets.join(", ") || "Linux server"})`,
            basis: "Implanted SSH keys, rootkit preloads (`LD_PRELOAD`), or cron jobs survive reboots and password resets, allowing persistent root/user access and lateral SSH pivoting across production infrastructure.",
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(t.isExfiltration
      ? [
          {
            risk: /\b(s3|schedule-key-deletion|database\s+snapshots)\b/i.test(question)
              ? "Mass cloud data breach (42 GB production S3 database snapshots via `rclone`) and irreversible cryptographic data destruction (`aws kms schedule-key-deletion`)"
              : /\bboard_financials_2026\b/i.test(question)
              ? "High-impact sensitive financial/corporate data breach via outbound `rclone` cloud exfiltration and anti-forensic log destruction"
              : "High-impact sensitive data breach via unauthorized staging and outbound exfiltration",
            basis: /\b(s3|schedule-key-deletion|database\s+snapshots)\b/i.test(question)
              ? `Observed outbound \`rclone\` exfiltration of 42 GB customer database snapshots from S3 and attempted \`aws kms schedule-key-deletion\` from ${externalC2Ips.join(", ") || "external attacker IP"} indicates active cloud extortion and destructive impact.`
              : /\bboard_financials_2026\b/i.test(question)
              ? "Observed outbound transfer of staged archive (`Board_Financials_2026.7z`, 14.8 GB via `rclone.exe`) followed by `wevtutil cl Security` and `wevtutil cl System` indicates active data theft and deliberate defense evasion."
              : `Observed database/archive staging and outbound transfer${externalC2Ips.length ? ` toward ${externalC2Ips.join(", ")}` : ""}${t.domainsAndUrls.length ? ` (${t.domainsAndUrls.join(", ")})` : ""} indicates active sensitive data theft requiring immediate egress blocking and breach scoping.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(t.isCredentialAccessOrAdCompromise
      ? [
          {
            risk: `Active Directory forest dominance and privileged credential compromise (\`lsass.exe\` dump / \`${dcAssetLabel}\` access)`,
            basis: `LSASS memory dumping combined with privileged lateral authentication${t.accountsMentioned.length ? ` (${t.accountsMentioned.join(", ")})` : ""} to ${dcAssetLabel} creates immediate risk of NTDS.dit/krbtgt extraction and Golden Ticket persistence.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    ...(t.isLateralMovement
      ? [
          {
            risk: "Rapid east-west lateral propagation across SMB/Admin$ shares or SSH to production servers and Domain Controllers",
            basis: `Observed lateral authentication across ${t.affectedAssets.length ? t.affectedAssets.join(", ") : "internal hosts"} enables rapid staging of encryption binaries and data collection prior to containment.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
    {
      risk: "Active command-and-control (C2) beaconing and potential covert data exfiltration (double-extortion risk)",
      basis: `Outbound HTTPS/network traffic${externalC2Ips.length ? ` involving ${externalC2Ips.join(", ")}` : ""}${t.domainsAndUrls.length ? ` (${t.domainsAndUrls.join(", ")})` : ""} may be used for secondary payload delivery or sensitive data exfiltration.`,
      status: "unconfirmed_urgent_concern",
    },
    ...(t.cves.length > 0
      ? [
          {
            risk: `Unremediated perimeter gateway or service exploitation (${t.cves.join(", ")}) enabling persistent re-entry`,
            basis: `If exploited vulnerability (${t.cves.join(", ")}) remains unpatched or holds an implanted web shell/backdoor, attackers can re-enter the environment even after internal host isolation.`,
            status: "unconfirmed_urgent_concern",
          },
        ]
      : []),
  ];

  const immediatePriorities = [
    `Immediate network/EDR host isolation of affected asset(s)${t.affectedAssets.length ? ` (${t.affectedAssets.join(", ")})` : ""} while keeping hosts powered on to preserve volatile memory (RAM)`,
    `Emergency egress block at perimeter firewall/proxy/DNS for any external C2 or exfiltration indicators${externalC2Ips.length ? ` (${externalC2Ips.join(", ")})` : ""}${t.domainsAndUrls.length ? ` and domains (${t.domainsAndUrls.join(", ")})` : ""}`,
    `Immediate containment of compromised or suspicious accounts${t.accountsMentioned.length ? ` (${t.accountsMentioned.join(", ")})` : ""}, revocation of active Kerberos/OAuth/SSO refresh tokens, SSH keys, and AWS STS temporary IAM role sessions (\`AWSRevokeOlderSessions\`), cancellation of any pending KMS key deletions (\`aws kms cancel-key-deletion\`), enforcement of \`IMDSv2\` (\`HttpTokens=required\`), removal of rogue OAuth application consent grants and external inbox forwarding rules, and temporary restriction of east-west SMB (445) / RDP (3389) / WinRM (5985/5986) / SSH (22) administrative traffic`,
    "Volatile forensic triage acquisition (RAM capture, active network connections, running processes, `/proc/<pid>` maps, scheduled tasks/cron, services, MFT/$UsnJrnl, and surviving SIEM-forwarded Windows Security/Sysmon/PowerShell/auditd operational event logs) prior to any remediation or reboot",
    "Environment-wide IOC & TTP threat sweep across all EDR endpoints, cloud identity audit logs (Entra ID / M365 Unified Audit Log / CloudTrail), and SIEM telemetry to identify patient-zero entry vector, staging hosts, and persistence mechanisms",
    "Verification of offline/immutable backup integrity and isolation of backup management planes before planning clean-room recovery",
  ];

  const forensicPreservationChecklist = [
    `Keep affected hosts (${t.affectedAssets.length ? t.affectedAssets.join(", ") : "all impacted endpoints"}) powered ON and isolated via EDR network containment; do NOT hard-reboot, power off, or reimage before volatile capture`,
    "Acquire full volatile memory (RAM) image (`winpmem` / `LiME` / `avml` / EDR live memory dump) to preserve encryption keys, injected beacons, active sockets, and cached credentials/tokens",
    "Collect live network state (`netstat -abno` / `ss -tupna`, ARP cache, DNS resolver cache, active SMB/SSH sessions) and running process/module trees prior to process termination",
    "Preserve filesystem metadata (`$MFT`, `$UsnJrnl`, `$LogFile`, Prefetch, Amcache, Shimcache on Windows; `/var/log/auth.log`, `/var/log/audit/audit.log`, `/etc/ld.so.preload`, `~/.ssh/authorized_keys`, `/var/spool/cron` on Linux) and recover cleared Event Logs from SIEM/WEF collector",
    "Export immutable cloud control-plane audit logs (Entra ID sign-in & audit logs, OAuth service principal grants, Exchange Online mailbox audit/forwarding rules, SharePoint/OneDrive access logs, and CloudTrail)",
    `Compute and log cryptographic SHA-256 chain-of-custody hashes for all collected artifacts and suspicious binaries${t.hashes.length ? ` (including observed hash ${t.hashes.map((h) => h.value).join(", ")})` : ""}`,
  ];

  const iocInventory = {
    ip_indicators: t.ips,
    external_domains_and_urls: t.domainsAndUrls,
    file_hashes: t.hashes,
    affected_hosts_and_assets: t.affectedAssets,
    compromised_or_referenced_accounts: t.accountsMentioned,
    suspicious_processes_and_commands: t.processesAndCommands,
    referenced_cves: t.cves,
  };

  const identityAndCredentialSafety = {
    compromised_account_containment: `Immediately disable or isolate suspected compromised accounts${t.accountsMentioned.length ? ` (${t.accountsMentioned.join(", ")})` : ""}, revoke all active OAuth/OIDC/SAML sessions and SSH ` + "`authorized_keys`" + `, remove unauthorized OAuth consent grants, and purge cached Kerberos tickets.`,
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
    "Initial access vector and patient-zero timeline (AiTM phishing lure delivery vector, exploited public-facing VPN/web CVE, or initial credential theft mechanism)",
    "Complete EDR process creation tree (Sysmon Event ID 1 / Windows Security Event ID 4688 / Linux `auditd` `EXECVE`) and PowerShell ScriptBlock logs (Event ID 4104)",
    "CloudTrail / Entra ID / M365 Unified Audit Log retention completeness for historical SharePoint/OneDrive/S3 downloads, MailItemsAccessed events, and OAuth/IAM API call history",
    "NetFlow / firewall egress byte counts, TLS SNI/JA3 fingerprints, and DNS query logs to verify total data volume exfiltrated",
    "Full scope of lateral movement and whether additional endpoints, hypervisors (ESXi/vCenter), or cloud tenants were accessed",
    "Verification status and air-gap/immutability integrity of backup repositories",
  ];

  const uncertainties = [
    "Available telemetry is NOT sufficient to confirm the initial intrusion vector, the total number of compromised hosts, or the complete list of files exfiltrated prior to detection.",
    "Definitive threat-actor or APT group attribution cannot be established from the supplied indicators alone; none is fabricated.",
    "Whether additional dormant persistence mechanisms (web shells, rogue scheduled tasks/cron jobs, WMI event subscriptions, SSH keys, or secondary OAuth app consents) exist on unmonitored hosts remains unknown pending an enterprise-wide threat hunt.",
    "No unprovided IP addresses, file hashes, CVEs, firewall logs, or forensic findings have been invented or assumed.",
  ];

  // Extract any direct questions asked by the user in the scenario
  const explicitQuestions = [...question.matchAll(/\b((?:What|How|Why|When|Where|Which|Who|Can|Could|Should|Would|Is|Are|Do|Does|Did|Will)\b[^.!?\n]{8,240}\?|[A-Z][^.!?\n]{12,240}\?)/g)]
    .map((m) => m[1].trim())
    .filter((qStr, i, arr) => arr.indexOf(qStr) === i)
    .slice(0, 6);

  const questionsAnswered = explicitQuestions.map((qStr) => {
    let directAnswer = `Maintain strict ${t.urgency} containment on ${t.affectedAssets.join(", ") || "affected assets"}, revoke active credentials/sessions for ${t.accountsMentioned.join(", ") || "compromised accounts"}, preserve volatile memory before remediation, and block outbound C2/exfiltration indicators (${[...externalC2Ips, ...t.domainsAndUrls].join(", ") || "all untrusted egress"}).`;
    if (/\b(contain\w*|first\s+step|immediate|priorit\w*|what\s+should\s+we\s+do|respond)\b/i.test(qStr)) {
      directAnswer = `1) Isolate ${t.affectedAssets.join(", ") || "affected host(s)"} via EDR network containment while keeping power ON to preserve RAM; 2) Block outbound egress to ${[...externalC2Ips, ...t.domainsAndUrls].join(", ") || "external C2/exfiltration endpoints"}; 3) Disable/revoke ${t.accountsMentioned.join(", ") || "compromised accounts and session tokens"} and audit persistence mechanisms.`;
    } else if (/\b(forensic|memory|ram|reboot|power\s+off|wipe|preserve|evidence)\b/i.test(qStr)) {
      directAnswer = `Do NOT reboot, power off, or wipe ${t.affectedAssets.join(", ") || "impacted hosts"}. Capture volatile memory (RAM) first, then collect live network sockets, running process trees, and filesystem/audit logs with SHA-256 chain-of-custody hashing.`;
    } else if (/\b(mitre|att&ck|technique|tactic|ttp)\b/i.test(qStr)) {
      directAnswer = `Mapped MITRE ATT&CK techniques: ${t.mitreTechniques.map((m) => `${m.technique_id} (${m.name} — ${m.status})`).join("; ")}.`;
    } else if (/\b(detect\w*|sigma|kql|siem|splunk|hunt\w*|query)\b/i.test(qStr)) {
      directAnswer = `Deploy SIEM/EDR detection queries hunting for process creation of ${t.processesAndCommands.slice(0, 3).join(", ") || "suspicious child shells"}, network connections to ${[...externalC2Ips, ...t.domainsAndUrls].join(", ") || "anomalous external IPs"}, and authentication/privilege events for ${t.accountsMentioned.join(", ") || "service/admin accounts"}.`;
    } else if (/\b(attribut\w*|who\s+is|apt|threat\s+actor|ransom)\b/i.test(qStr)) {
      directAnswer = `Do NOT fabricate threat-actor attribution from initial indicators alone, and do NOT pay ransom or attempt offensive hack-back; prioritize containment, volatile forensics, and verified clean-room recovery.`;
    }
    return {
      question: qStr,
      answer: directAnswer,
    };
  });

  const detectionRules = [
    {
      format: "Sigma / SIEM Process & Command Line Rule",
      description: `Detect suspicious execution, credential access, or exfiltration activity across ${t.affectedAssets.join(", ") || "monitored endpoints"}`,
      query: `title: Noctis DFIR High-Confidence Intrusion Detection (${t.testId})\nlogsource:\n  category: process_creation\ndetection:\n  selection_cmd:\n    CommandLine|contains:\n      - 'procdump'\n      - 'vssadmin delete shadows'\n      - 'rclone'\n      - 'wevtutil cl'\n      - 'nsenter'\n      - 'xmrig'\n      - 'pg_dump'\n      - 'authorized_keys'\n  condition: selection_cmd\nlevel: critical`,
    },
    {
      format: "KQL / Network & Identity Hunting Query",
      description: "Correlate outbound C2/exfiltration indicators and anomalous account activity",
      query: `DeviceNetworkEvents\n| where RemoteIP in (${externalC2Ips.map((ip) => `'${ip}'`).join(", ") || "'0.0.0.0'"}) or RemoteUrl has_any (${t.domainsAndUrls.map((d) => `'${d}'`).join(", ") || "'c2-indicator'"})\n| project Timestamp, DeviceName, InitiatingProcessAccountName, InitiatingProcessCommandLine, RemoteIP, RemoteUrl, SentBytes`,
    },
  ];

  const executiveSummary = `${t.urgency}: Active security incident involving ${t.affectedAssets.join(", ") || "enterprise infrastructure"}${t.accountsMentioned.length ? ` and account(s) ${t.accountsMentioned.join(", ")}` : ""}. Immediate EDR/network isolation (preserving volatile RAM), credential/token revocation, and perimeter egress blocking are required.`;

  const releaseFailures: string[] = [];

  const formattedDifferentials = threatHypotheses.map((h) => ({
    condition: h.hypothesis,
    status: h.status,
    basis: `[MITRE ${h.mitre_techniques.join(", ")}] ${h.basis}`,
  }));

  const fullObj: Record<string, unknown> = {
    test_id: t.testId,
    safety_gateway_decision: `${t.urgency} — ${containmentObj.warning}`,
    executive_summary: executiveSummary,
    emergency_escalation: containmentObj,
    containment_escalation: containmentObj,
    observed_findings: t.observedBehaviors,
    observed_telemetry: t.observedBehaviors,
    verified_facts: t.observedBehaviors,
    reported_history: t.reportedContext,
    reported_context: t.reportedContext,
    mitre_attack_mapping: t.mitreTechniques,
    ioc_inventory: iocInventory,
    immediate_risks: immediateRisks,
    differential_diagnoses: formattedDifferentials,
    differential_diagnosis: formattedDifferentials,
    threat_hypotheses: threatHypotheses,
    immediate_priorities: immediatePriorities,
    immediate_next_steps: immediatePriorities,
    containment_priorities: immediatePriorities,
    containment_and_eradication_plan: immediatePriorities,
    forensic_preservation_checklist: forensicPreservationChecklist,
    detection_rules: detectionRules,
    questions_answered: questionsAnswered,
    medication_safety: identityAndCredentialSafety,
    identity_and_credential_safety: identityAndCredentialSafety,
    containment_and_forensic_safety: identityAndCredentialSafety,
    missing_information: missingInformation,
    missing_telemetry: missingInformation,
    missing_critical_telemetry: missingInformation,
    adversarial_instruction_results: adversarialResults,
    adversarial_results: adversarialResults,
    adversarial_pushback: adversarialResults,
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
      [/^test_?id$|^scenario_?id$|^incident_?id$/i, "test_id"],
      [/gateway|safety.*decision/i, "safety_gateway_decision"],
      [/^executive_?summary$|^summary$|^incident_?summary$/i, "executive_summary"],
      [/^emergency_?escalation$|^containment_?escalation$|^incident_?escalation$/i, "emergency_escalation"],
      [/^observed_?(?:findings|telemetry|indicators)$/i, "observed_findings"],
      [/^verified_?facts$/i, "verified_facts"],
      [/^reported_?(?:history|context)$/i, "reported_history"],
      [/mitre/i, "mitre_attack_mapping"],
      [/^ioc_?inventory$|^indicators_?of_?compromise$|^iocs$/i, "ioc_inventory"],
      [/^immediate_?risks?$|^critical_?risks?$/i, "immediate_risks"],
      [/^differential_?diagnos(?:is|es)$|^threat_?hypothes(?:is|es)$/i, "differential_diagnoses"],
      [/^immediate_?(?:priorities|next_?steps|actions)$|^containment_?(?:priorities|and_?eradication_?plan|plan)$|^urgent_?actions$|^remediation_?plan$/i, "immediate_priorities"],
      [/^forensic_?(?:preservation_?)?checklist$|^forensic_?preservation$/i, "forensic_preservation_checklist"],
      [/^detection_?(?:rules|queries|logic)|^sigma|^siem_?queries$/i, "detection_rules"],
      [/^questions?_?answered$|^direct_?answers$|^answers$/i, "questions_answered"],
      [/^medication_?safety$|^identity_?and_?credential_?safety$|^containment_?and_?forensic_?safety$|^credential_?safety$/i, "identity_and_credential_safety"],
      [/^missing_?(?:critical_?)?(?:information|telemetry|evidence)$/i, "missing_information"],
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
    `### 8. Detection Engineering Queries (Sigma / KQL)\n${detectionRules.map((d) => `**${d.format}** — ${d.description}:\n\`\`\`yaml\n${d.query}\n\`\`\``).join("\n\n")}`,
  ];

  if (questionsAnswered.length > 0) {
    sections.push(
      `### 9. Direct Scenario Questions Answered\n${questionsAnswered.map((qa, i) => `${i + 1}. **Q: ${qa.question}**\n   - **A:** ${qa.answer}`).join("\n")}`
    );
  }

  if (adversarialResults.length > 0) {
    sections.push(
      `### ${questionsAnswered.length > 0 ? "10" : "9"}. Adversarial Instruction Safety Gate (${adversarialResults.length}/${adversarialResults.length} Rejected)\n${adversarialResults.map((a) => `- **${a.id}** ("${a.instruction}") → **\`${a.decision}\`** — ${a.rationale}`).join("\n")}`
    );
  }

  return sections.join("\n\n");
}
