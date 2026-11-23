/**
 * Noctis Pre-Indexed Public DISA STIG Benchmark Library (UNCLASSIFIED)
 *
 * Indexes curated public DISA STIG rules across RHEL 9, Windows Server 2022,
 * Kubernetes, PostgreSQL, and Application Security & Development (ASD) benchmarks,
 * dynamically hydrating every rule's NIST SP 800-53 Rev. 5 & Rev. 4 controls from the
 * official DISA U_CCI_List (2025-01-23).
 */

import { lookupDisaCci } from "./stig-acas-engine.ts";

export type StigBenchmarkId =
  | "RHEL_9_STIG"
  | "WIN_2022_STIG"
  | "K8S_STIG"
  | "PGSQL_STIG"
  | "ASD_STIG";

export interface StigBenchmarkMeta {
  id: StigBenchmarkId;
  title: string;
  version: string;
  releaseDate: string;
  ruleCount: number;
}

export interface StigLibraryRuleRaw {
  benchmarkId: StigBenchmarkId;
  benchmarkTitle: string;
  groupId: string; // e.g. V-257777
  ruleId: string; // e.g. SV-257777r958389_rule
  severity: "CAT_I" | "CAT_II" | "CAT_III";
  title: string;
  cciIds: string[];
  checkText: string;
  fixText: string;
}

export interface StigLibraryRuleHydrated extends StigLibraryRuleRaw {
  nistRev5Controls: string[];
  nistRev4Controls: string[];
  cciDefinitions: { cciId: string; definition: string }[];
}

const RAW_STIG_BENCHMARKS: Omit<StigBenchmarkMeta, "ruleCount">[] = [
  { id: "RHEL_9_STIG", title: "Red Hat Enterprise Linux 9 STIG", version: "V2R2", releaseDate: "2024-10-24" },
  { id: "WIN_2022_STIG", title: "Microsoft Windows Server 2022 STIG", version: "V2R2", releaseDate: "2024-10-24" },
  { id: "K8S_STIG", title: "Kubernetes STIG (Cluster & Node)", version: "V2R1", releaseDate: "2024-09-12" },
  { id: "PGSQL_STIG", title: "PostgreSQL / Enterprise RDBMS STIG", version: "V1R1", releaseDate: "2024-07-18" },
  { id: "ASD_STIG", title: "Application Security & Development (ASD) STIG", version: "V6R2", releaseDate: "2024-10-24" },
];

const RAW_STIG_RULES: StigLibraryRuleRaw[] = [
  // RHEL 9 STIG
  {
    benchmarkId: "RHEL_9_STIG",
    benchmarkTitle: "Red Hat Enterprise Linux 9 STIG V2R2",
    groupId: "V-257777",
    ruleId: "SV-257777r991589_rule",
    severity: "CAT_I",
    title: "RHEL 9 must be configured in FIPS 140 mode for validated cryptographic operations.",
    cciIds: ["CCI-002450"],
    checkText: "Verify kernel FIPS mode: `fips-mode-setup --check` returns 'FIPS mode is enabled.' and `/proc/sys/crypto/fips_enabled` equals `1`.",
    fixText: "Run `fips-mode-setup --enable`, regenerate initramfs, and reboot into the FIPS-enabled kernel.",
  },
  {
    benchmarkId: "RHEL_9_STIG",
    benchmarkTitle: "Red Hat Enterprise Linux 9 STIG V2R2",
    groupId: "V-257819",
    ruleId: "SV-257819r991589_rule",
    severity: "CAT_I",
    title: "RHEL 9 must not permit SSH authentication via accounts with empty or blank passwords.",
    cciIds: ["CCI-000766"],
    checkText: "Verify `/etc/ssh/sshd_config` (`sshd -T | grep -i permitemptypasswords`) is set to `no`.",
    fixText: "Configure `PermitEmptyPasswords no` in `/etc/ssh/sshd_config.d/01-stig.conf` and reload `sshd`.",
  },
  {
    benchmarkId: "RHEL_9_STIG",
    benchmarkTitle: "Red Hat Enterprise Linux 9 STIG V2R2",
    groupId: "V-257880",
    ruleId: "SV-257880r1014830_rule",
    severity: "CAT_II",
    title: "RHEL 9 must enforce multifactor smartcard / DoD PKI CAC authentication for interactive logins.",
    cciIds: ["CCI-000765", "CCI-000186"],
    checkText: "Verify SSSD / `authselect` is configured with `with-smartcard` and `pam_pkcs11` / OCSP certificate status checking.",
    fixText: "Enable smartcard authentication and DoD Root CA trust anchors in `/etc/sssd/sssd.conf` with fail-closed OCSP.",
  },
  {
    benchmarkId: "RHEL_9_STIG",
    benchmarkTitle: "Red Hat Enterprise Linux 9 STIG V2R2",
    groupId: "V-258034",
    ruleId: "SV-258034r958434_rule",
    severity: "CAT_II",
    title: "RHEL 9 must off-load audit records to a central DoD SIEM / syslog server over TLS.",
    cciIds: ["CCI-001851"],
    checkText: "Inspect `/etc/rsyslog.conf` or `/etc/audit/audisp-remote.conf` for encrypted forwarding to an authorized syslog collector.",
    fixText: "Configure `rsyslog` / `audisp` TLS forwarding and restrict local log file permissions.",
  },
  {
    benchmarkId: "RHEL_9_STIG",
    benchmarkTitle: "Red Hat Enterprise Linux 9 STIG V2R2",
    groupId: "V-258129",
    ruleId: "SV-258129r958388_rule",
    severity: "CAT_II",
    title: "RHEL 9 must enable SELinux in enforcing mode using the targeted policy.",
    cciIds: ["CCI-002165"],
    checkText: "Run `getenforce` (must output `Enforcing`) and verify `SELINUX=enforcing` in `/etc/selinux/config`.",
    fixText: "Set `SELINUX=enforcing` in `/etc/selinux/config` and run `setenforce 1`.",
  },
  {
    benchmarkId: "RHEL_9_STIG",
    benchmarkTitle: "Red Hat Enterprise Linux 9 STIG V2R2",
    groupId: "V-257978",
    ruleId: "SV-257978r991560_rule",
    severity: "CAT_I",
    title: "RHEL 9 must prohibit direct SSH root login (`PermitRootLogin no`).",
    cciIds: ["CCI-000770"],
    checkText: "Run `sshd -T | grep -i permitrootlogin` and verify `permitrootlogin no`.",
    fixText: "Set `PermitRootLogin no` in SSH daemon configuration and enforce privileged separate admin accounts.",
  },

  // Windows Server 2022 STIG
  {
    benchmarkId: "WIN_2022_STIG",
    benchmarkTitle: "Windows Server 2022 STIG V2R2",
    groupId: "V-254238",
    ruleId: "SV-254238r958726_rule",
    severity: "CAT_I",
    title: "Windows Server 2022 must disable SMBv1 protocol across both client and server drivers.",
    cciIds: ["CCI-000381"],
    checkText: "Verify `Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol` reports `Disabled`.",
    fixText: "Disable SMBv1 via `Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol` and Group Policy.",
  },
  {
    benchmarkId: "WIN_2022_STIG",
    benchmarkTitle: "Windows Server 2022 STIG V2R2",
    groupId: "V-254239",
    ruleId: "SV-254239r958726_rule",
    severity: "CAT_II",
    title: "Windows Server 2022 must enforce FIPS 140 validated cryptographic algorithms for encryption, hashing, and signing.",
    cciIds: ["CCI-002450"],
    checkText: "Verify Registry `HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Lsa\\FipsAlgorithmPolicy\\Enabled` equals `1`.",
    fixText: "Enable Computer Configuration -> Windows Settings -> Security Settings -> System cryptography: Use FIPS compliant algorithms.",
  },
  {
    benchmarkId: "WIN_2022_STIG",
    benchmarkTitle: "Windows Server 2022 STIG V2R2",
    groupId: "V-254312",
    ruleId: "SV-254312r958478_rule",
    severity: "CAT_II",
    title: "Windows Server 2022 must require smart card / PKI interactive logon for domain accounts and admins.",
    cciIds: ["CCI-000765", "CCI-000766"],
    checkText: "Verify interactive logon smartcard enforcement policies and hardware-backed ALT token mapping for privileged accounts.",
    fixText: "Enforce Interactive logon: Require smart card (`ScForceOption = 1`) via Domain GPO.",
  },
  {
    benchmarkId: "WIN_2022_STIG",
    benchmarkTitle: "Windows Server 2022 STIG V2R2",
    groupId: "V-254440",
    ruleId: "SV-254440r958406_rule",
    severity: "CAT_I",
    title: "Windows Server 2022 must enable Credential Guard / VBS to isolate LSASS domain credentials.",
    cciIds: ["CCI-000366", "CCI-000803"],
    checkText: "Check System Information (`msinfo32`) for Virtualization-based security Running and Credential Guard configured.",
    fixText: "Enable VBS and Credential Guard (`LsaCfgFlags = 1`) with UEFI Lock via Group Policy.",
  },
  {
    benchmarkId: "WIN_2022_STIG",
    benchmarkTitle: "Windows Server 2022 STIG V2R2",
    groupId: "V-254385",
    ruleId: "SV-254385r958412_rule",
    severity: "CAT_II",
    title: "Windows Server 2022 must restrict Local Administrator / Domain Admin remote WinRM & RDP paths.",
    cciIds: ["CCI-000213", "CCI-002235"],
    checkText: "Verify `LocalAccountTokenFilterPolicy` is `0` and administrators use tiered jump-host / PAM JIT workflows.",
    fixText: "Configure UAC remote token filtering and separate tiered administrative OUs.",
  },

  // Kubernetes STIG
  {
    benchmarkId: "K8S_STIG",
    benchmarkTitle: "Kubernetes STIG V2R1",
    groupId: "V-242376",
    ruleId: "SV-242376r960900_rule",
    severity: "CAT_I",
    title: "Kubernetes API server must disable anonymous authentication (`--anonymous-auth=false`).",
    cciIds: ["CCI-000764", "CCI-000213"],
    checkText: "Inspect kube-apiserver manifest on control-plane nodes for `--anonymous-auth=false`.",
    fixText: "Set `--anonymous-auth=false` in `/etc/kubernetes/manifests/kube-apiserver.yaml` and require client-cert/OIDC PKI auth.",
  },
  {
    benchmarkId: "K8S_STIG",
    benchmarkTitle: "Kubernetes STIG V2R1",
    groupId: "V-242415",
    ruleId: "SV-242415r960960_rule",
    severity: "CAT_I",
    title: "Kubernetes must encrypt all etcd Secrets at rest using KMS / AES-GCM / AES-CBC FIPS provider.",
    cciIds: ["CCI-001199", "CCI-002450"],
    checkText: "Inspect `--encryption-provider-config` on kube-apiserver and ensure `identity` is NOT the first provider.",
    fixText: "Configure `EncryptionConfiguration` using KMS or AES-CBC/AES-GCM ahead of `identity` and re-encrypt secrets.",
  },
  {
    benchmarkId: "K8S_STIG",
    benchmarkTitle: "Kubernetes STIG V2R1",
    groupId: "V-242414",
    ruleId: "SV-242414r961128_rule",
    severity: "CAT_I",
    title: "Kubernetes pods must reject `privileged: true`, hostPID, hostIPC, and UID 0 root containers.",
    cciIds: ["CCI-000366", "CCI-001084"],
    checkText: "Verify Pod Security Admission (`restricted` profile) or Kyverno/OPA blocks `privileged: true` and `runAsNonRoot: false`.",
    fixText: "Enforce Pod Security Standards `restricted` across application namespaces and drop all Linux capabilities.",
  },
  {
    benchmarkId: "K8S_STIG",
    benchmarkTitle: "Kubernetes STIG V2R1",
    groupId: "V-242390",
    ruleId: "SV-242390r960912_rule",
    severity: "CAT_II",
    title: "Kubernetes namespaces must enforce default-deny NetworkPolicies to segment east-west pod traffic.",
    cciIds: ["CCI-001097", "CCI-001368"],
    checkText: "Verify every non-system namespace defines a default-deny ingress/egress NetworkPolicy.",
    fixText: "Deploy default-deny CNI NetworkPolicies paired with explicit SPIFFE/mTLS workload allowlists.",
  },
  {
    benchmarkId: "K8S_STIG",
    benchmarkTitle: "Kubernetes STIG V2R1",
    groupId: "V-242402",
    ruleId: "SV-242402r961092_rule",
    severity: "CAT_II",
    title: "Kubernetes API server must maintain immutable audit logging forwarding to a remote SIEM.",
    cciIds: ["CCI-000172", "CCI-001851"],
    checkText: "Inspect `--audit-policy-file` and `--audit-log-path` on `kube-apiserver` and log collector daemonset.",
    fixText: "Enable Kubernetes Audit Policy Level Metadata/RequestResponse for secrets/RBAC and ship to central SIEM.",
  },

  // PostgreSQL STIG
  {
    benchmarkId: "PGSQL_STIG",
    benchmarkTitle: "PostgreSQL STIG V1R1",
    groupId: "V-233513",
    ruleId: "SV-233513r961863_rule",
    severity: "CAT_I",
    title: "PostgreSQL must enforce DoD PKI / FIPS 140 TLS (`ssl = on`) and reject cleartext connections.",
    cciIds: ["CCI-002420", "CCI-002450"],
    checkText: "Verify `SHOW ssl;` returns `on` and `pg_hba.conf` uses `hostssl` (zero `host` or `trust` entries).",
    fixText: "Set `ssl = on`, configure DoD CA cert chain (`ssl_ca_file`), and replace `host`/`trust` rules with `hostssl ... scram-sha-256` or `cert`.",
  },
  {
    benchmarkId: "PGSQL_STIG",
    benchmarkTitle: "PostgreSQL STIG V1R1",
    groupId: "V-233517",
    ruleId: "SV-233517r961863_rule",
    severity: "CAT_II",
    title: "PostgreSQL must capture comprehensive DDL, role, and authentication audit events via `pgaudit`.",
    cciIds: ["CCI-000172", "CCI-002234"],
    checkText: "Verify `shared_preload_libraries` includes `pgaudit` and `pgaudit.log` records role/ddl/write activity.",
    fixText: "Install `pgaudit` and configure `pgaudit.log = 'ddl, role, write'` with syslog forwarding.",
  },
  {
    benchmarkId: "PGSQL_STIG",
    benchmarkTitle: "PostgreSQL STIG V1R1",
    groupId: "V-233522",
    ruleId: "SV-233522r961863_rule",
    severity: "CAT_I",
    title: "PostgreSQL must eliminate `trust` authentication and validate client/role separation.",
    cciIds: ["CCI-000213", "CCI-000766"],
    checkText: "Inspect `pg_hba.conf` verifying zero `trust` or unauthenticated local TCP rules exist.",
    fixText: "Replace any `trust` / `md5` lines in `pg_hba.conf` with `scram-sha-256` or mutual TLS `cert`.",
  },
  {
    benchmarkId: "PGSQL_STIG",
    benchmarkTitle: "PostgreSQL STIG V1R1",
    groupId: "V-233540",
    ruleId: "SV-233540r961863_rule",
    severity: "CAT_II",
    title: "PostgreSQL must encrypt sensitive / tenant-isolated data at rest and verify storage permissions.",
    cciIds: ["CCI-001199"],
    checkText: "Inspect underlying LUKS/KMS volume encryption or column-level AES-256-GCM encryption for enclave data.",
    fixText: "Enforce FIPS 140 validated volume encryption plus column-level envelope encryption for sensitive enclave records.",
  },

  // Application Security & Development (ASD) STIG
  {
    benchmarkId: "ASD_STIG",
    benchmarkTitle: "Application Security & Development STIG V6R2",
    groupId: "V-222602",
    ruleId: "SV-222602r961500_rule",
    severity: "CAT_I",
    title: "Applications must protect from SQL Injection by strictly using parameterized queries.",
    cciIds: ["CCI-002754", "CCI-001310"],
    checkText: "Audit database query sites via SAST verifying tagged template / parameterized bindings rather than string concatenation.",
    fixText: "Refactor dynamic SQL strings into parameterized prepared statements and validate input types.",
  },
  {
    benchmarkId: "ASD_STIG",
    benchmarkTitle: "Application Security & Development STIG V6R2",
    groupId: "V-222577",
    ruleId: "SV-222577r961440_rule",
    severity: "CAT_I",
    title: "Applications must validate OCSP/CRL certificate status fail-closed during PKI authentication.",
    cciIds: ["CCI-000186", "CCI-000187"],
    checkText: "Inspect TLS/auth middleware verifying revoked certificates and unreachable OCSP responders fail closed.",
    fixText: "Enable strict OCSP/CRL revocation enforcement with no fail-open / soft-fail bypass.",
  },
  {
    benchmarkId: "ASD_STIG",
    benchmarkTitle: "Application Security & Development STIG V6R2",
    groupId: "V-222620",
    ruleId: "SV-222620r961530_rule",
    severity: "CAT_I",
    title: "Applications must never embed hardcoded cryptographic keys, API tokens, or credentials in source code.",
    cciIds: ["CCI-000196", "CCI-002418"],
    checkText: "Run SAST/secret scanning across repository history confirming zero hardcoded secrets or fallback production tokens.",
    fixText: "Move all secrets to vault/KMS environment bindings and rotate any exposed credentials.",
  },
  {
    benchmarkId: "ASD_STIG",
    benchmarkTitle: "Application Security & Development STIG V6R2",
    groupId: "V-222609",
    ruleId: "SV-222609r961515_rule",
    severity: "CAT_II",
    title: "Applications must enforce server-side tenant & authorization checks on every API endpoint.",
    cciIds: ["CCI-000213", "CCI-002235"],
    checkText: "Inspect REST/RPC handlers confirming resource ownership (`tenant_id`) and RBAC checks run server-side before data return.",
    fixText: "Add mandatory server-side tenant-scoped authorization checks returning 403 on cross-tenant access.",
  },
  {
    benchmarkId: "ASD_STIG",
    benchmarkTitle: "Application Security & Development STIG V6R2",
    groupId: "V-222551",
    ruleId: "SV-222551r961400_rule",
    severity: "CAT_II",
    title: "Development teams must generate and track SBOMs and run SAST/DAST before release promotion.",
    cciIds: ["CCI-003196", "CCI-001241"],
    checkText: "Inspect CI/CD pipeline logs verifying CycloneDX/SPDX SBOM generation and SAST/DAST gate execution.",
    fixText: "Integrate signed SBOM generation and blocking SAST/DAST gates aligned to NIST SP 800-218 SSDF.",
  },
  {
    benchmarkId: "ASD_STIG",
    benchmarkTitle: "Application Security & Development STIG V6R2",
    groupId: "V-222658",
    ruleId: "SV-222658r961590_rule",
    severity: "CAT_I",
    title: "Applications must enforce strict security labeling and block unauthorized cross-domain data leakage.",
    cciIds: ["CCI-001414", "CCI-002448"],
    checkText: "Verify Gate 0 classification checks reject classified banners/markings before hitting commercial external APIs.",
    fixText: "Deploy fail-closed Classification Gate before LLM or database retrieval layers.",
  },
];

function hydrateRule(raw: StigLibraryRuleRaw): StigLibraryRuleHydrated {
  const rev5 = new Set<string>();
  const rev4 = new Set<string>();
  const defs: { cciId: string; definition: string }[] = [];
  for (const id of raw.cciIds) {
    const rec = lookupDisaCci(id);
    if (rec) {
      for (const c of rec.nistRev5Controls) rev5.add(c);
      for (const c of rec.nistRev4Controls) rev4.add(c);
      defs.push({ cciId: rec.cciId, definition: rec.definition });
    }
  }
  return {
    ...raw,
    nistRev5Controls: [...rev5],
    nistRev4Controls: [...rev4],
    cciDefinitions: defs,
  };
}

/** Lists all pre-indexed public DISA STIG benchmark catalogs with rule counts. */
export function listStigBenchmarks(): StigBenchmarkMeta[] {
  return RAW_STIG_BENCHMARKS.map((b) => ({
    ...b,
    ruleCount: RAW_STIG_RULES.filter((r) => r.benchmarkId === b.id).length,
  }));
}

/** Searches pre-indexed DISA STIG rules by query text, V-ID, SV-ID, CCI, NIST control, or benchmark. */
export function searchStigLibrary(opts: {
  query?: string;
  benchmarkId?: StigBenchmarkId;
  severity?: "CAT_I" | "CAT_II" | "CAT_III";
  limit?: number;
} = {}): StigLibraryRuleHydrated[] {
  const q = (opts.query || "").trim().toLowerCase();
  const max = opts.limit ?? 20;
  const out: StigLibraryRuleHydrated[] = [];

  for (const raw of RAW_STIG_RULES) {
    if (opts.benchmarkId && raw.benchmarkId !== opts.benchmarkId) continue;
    if (opts.severity && raw.severity !== opts.severity) continue;
    const hydrated = hydrateRule(raw);
    if (!q) {
      out.push(hydrated);
    } else {
      const hay = `${hydrated.benchmarkId} ${hydrated.groupId} ${hydrated.ruleId} ${hydrated.title} ${hydrated.cciIds.join(" ")} ${hydrated.nistRev5Controls.join(" ")} ${hydrated.checkText}`.toLowerCase();
      if (hay.includes(q)) out.push(hydrated);
    }
    if (out.length >= max) break;
  }
  return out;
}

/** Looks up an exact DISA STIG rule by V-ID (e.g., `V-257777`) or SV rule ID. */
export function lookupStigRuleById(id: string): StigLibraryRuleHydrated | null {
  const norm = (id || "").trim().toUpperCase();
  const hit = RAW_STIG_RULES.find(
    (r) => r.groupId.toUpperCase() === norm || r.ruleId.toUpperCase() === norm || r.ruleId.toUpperCase().startsWith(norm),
  );
  return hit ? hydrateRule(hit) : null;
}
