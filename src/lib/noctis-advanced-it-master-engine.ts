/**
 * ============================================================================
 * NOCTIS SOVEREIGN ADVANCED INFORMATION TECHNOLOGY MASTER ENGINE
 * Engine ID: NOCTIS-ADV-IT-MASTER-001
 * Standards: NIST FIPS 203/204/205, IEEE 1588v2, 3GPP Rel 18, O-RAN WG4,
 *            ISA-95/IEC 62443, IEC 61508/61511 (SIL-3), InfiniBand IBTA,
 *            NCCL Collectives, zk-SNARK/STARK RFC Drafts
 * Coverage: 5 Advanced Frontier IT Domains (125 Deterministic Scenarios)
 *   1. High-Performance Computing (HPC) & GPU Cluster Orchestration
 *   2. Quantum Computing & Post-Quantum Cryptography (PQC)
 *   3. Industrial Control Systems (ICS) / SCADA & OT Cyber-Physical Defense
 *   4. Next-Gen Telecommunications & 5G Standalone (SA) Core Architecture
 *   5. Zero-Knowledge Cryptography (ZKP) & Verifiable Computing
 * ============================================================================
 */

export interface AdvItEvaluationResult {
  engineId: string;
  domain: string;
  scenario: string;
  passed: boolean;
  calculations: Record<string, number | string | boolean>;
  safetyVetoes: string[];
  recommendations: string[];
  standardsReferenced: string[];
}

// ----------------------------------------------------------------------------
// 1. HIGH-PERFORMANCE COMPUTING & GPU CLUSTER ORCHESTRATION (NOCTIS-IT-HPC-001)
// ----------------------------------------------------------------------------
export interface GpuClusterTopologyInput {
  totalGpus: number;
  gpusPerNode: number;
  tensorParallelSize: number;
  pipelineParallelSize: number;
  dataParallelSize: number;
  networkType: "Infiniband_NDR" | "Infiniband_HDR" | "RoCEv2_400G" | "Standard_Ethernet_100G";
  pfcEnabled: boolean;
  ecnEnabled: boolean;
  modelParamCountB: number;
  sequenceLength: number;
  batchSize: number;
}

export function evaluateHpcGpuClusterTopology(input: GpuClusterTopologyInput): AdvItEvaluationResult {
  const safetyVetoes: string[] = [];
  const recommendations: string[] = [];

  const requiredGpus = input.tensorParallelSize * input.pipelineParallelSize * input.dataParallelSize;
  const nodes = Math.ceil(input.totalGpus / input.gpusPerNode);

  if (requiredGpus > input.totalGpus) {
    safetyVetoes.push(`PARALLELISM_EXCEEDS_GPU_BUDGET: TP(${input.tensorParallelSize}) * PP(${input.pipelineParallelSize}) * DP(${input.dataParallelSize}) = ${requiredGpus} > Available GPUs (${input.totalGpus}).`);
  }

  // Tensor Parallelism must NOT cross physical node boundaries due to ultra-high AllReduce bandwidth requirement
  if (input.tensorParallelSize > input.gpusPerNode) {
    safetyVetoes.push(`TP_CROSS_NODE_VIOLATION: Tensor Parallel size (${input.tensorParallelSize}) exceeds GPUs per node (${input.gpusPerNode}). Inter-node AllReduce will saturate InfiniBand and bottleneck compute.`);
  }

  // Lossless Ethernet RoCEv2 requires PFC and ECN to prevent packet drop and buffer starvation
  if (input.networkType === "RoCEv2_400G") {
    if (!input.pfcEnabled) {
      safetyVetoes.push("ROCEV2_PFC_MISSING: Priority Flow Control (PFC IEEE 802.1Qbb) is disabled. Lossy RoCEv2 triggers Go-Back-N packet drops and catastrophically degrades NCCL collectives.");
    }
    if (!input.ecnEnabled) {
      safetyVetoes.push("ROCEV2_ECN_MISSING: Explicit Congestion Notification (ECN RFC 3168 / DCQCN) is disabled. Cluster vulnerable to PFC deadlocks and buffer bloat.");
    }
  }

  if (input.networkType === "Standard_Ethernet_100G") {
    safetyVetoes.push("UNSUPPORTED_FABRIC_FOR_DISTRIBUTED_TRAINING: Standard Ethernet without RDMA (GPUDirect) produces unacceptable latency jitter for multi-node LLM gradient synchronization.");
  }

  // Ring AllReduce Communication Volume: 2 * (N - 1) / N * S
  const ringAllReduceFactor = (2 * (input.totalGpus - 1)) / Math.max(1, input.totalGpus);
  const rawGradientSizeBytes = input.modelParamCountB * 2 * 1e9; // FP16/BF16 (2 bytes per param)
  const ringAllReduceVolumeGb = Number(((rawGradientSizeBytes * ringAllReduceFactor) / 1e9).toFixed(2));

  // Network injection bandwidth per GPU
  const perGpuBandwidthGbps = input.networkType === "Infiniband_NDR" ? 400 : input.networkType === "Infiniband_HDR" ? 200 : input.networkType === "RoCEv2_400G" ? 400 : 100;
  const gradientSyncTimeMs = Number(((rawGradientSizeBytes * 8 / (perGpuBandwidthGbps * 1e9)) * 1000).toFixed(2));

  recommendations.push("Enforce non-blocking 1:1 fat-tree topology at the leaf-spine fabric to ensure zero over-subscription.");
  recommendations.push("Enable GPUDirect RDMA with CUDA IPC memory registration to bypass host RAM.");

  return {
    engineId: "NOCTIS-IT-HPC-001",
    domain: "HIGH_PERFORMANCE_COMPUTING_GPU_CLUSTER",
    scenario: "Distributed LLM Training GPU Fabric & Collective Communications",
    passed: safetyVetoes.length === 0,
    calculations: {
      totalGpus: input.totalGpus,
      nodes,
      parallelismProduct: requiredGpus,
      ringAllReduceFactor: Number(ringAllReduceFactor.toFixed(4)),
      ringAllReduceVolumeGb,
      perGpuBandwidthGbps,
      gradientSyncTimeMs,
      fabricStatus: input.networkType
    },
    safetyVetoes,
    recommendations,
    standardsReferenced: ["InfiniBand Trade Association (IBTA) Spec 1.5", "IEEE 802.1Qbb (PFC)", "RFC 3168 (ECN)", "NCCL Architecture Guide"]
  };
}

// ----------------------------------------------------------------------------
// 2. QUANTUM COMPUTING & POST-QUANTUM CRYPTOGRAPHY (NOCTIS-IT-PQC-001)
// ----------------------------------------------------------------------------
export interface PqcMigrationInput {
  algorithm: "ML_KEM_512" | "ML_KEM_768" | "ML_KEM_1024" | "ML_DSA_44" | "ML_DSA_65" | "ML_DSA_87" | "RSA_2048" | "ECDSA_P256";
  useDecoyStatesQkd?: boolean;
  observedQberPct?: number;
  hybridX25519Enabled?: boolean;
}

export function evaluatePostQuantumSecurity(input: PqcMigrationInput): AdvItEvaluationResult {
  const safetyVetoes: string[] = [];
  const recommendations: string[] = [];

  // Classic asymmetric primitives fail immediately against Shor's algorithm on CRQCs (Cryptographically Relevant Quantum Computers)
  if (input.algorithm === "RSA_2048" || input.algorithm === "ECDSA_P256") {
    safetyVetoes.push(`VULNERABLE_CLASSICAL_PRIMITIVE: ${input.algorithm} is broken in polynomial time by Shor's algorithm (discrete log / prime factorization). Immediate migration to NIST FIPS 203/204 mandated.`);
  }

  // QKD BB84 Shor-Preskill asymptotic security threshold: QBER must be <= 11.0%
  if (typeof input.observedQberPct === "number") {
    if (input.observedQberPct > 11.0) {
      safetyVetoes.push(`QBER_THRESHOLD_EXCEEDED: Measured Quantum Bit Error Rate (${input.observedQberPct}%) exceeds Shor-Preskill privacy amplification ceiling (11.0%). Link compromised by eavesdropping or fiber birefringence.`);
    }
  }

  // FIPS 203 ML-KEM parameters
  let securityCategory = 0;
  let pkSizeBytes = 0;
  let ctSizeBytes = 0;

  switch (input.algorithm) {
    case "ML_KEM_512": securityCategory = 1; pkSizeBytes = 800; ctSizeBytes = 768; break;
    case "ML_KEM_768": securityCategory = 3; pkSizeBytes = 1184; ctSizeBytes = 1088; break;
    case "ML_KEM_1024": securityCategory = 5; pkSizeBytes = 1568; ctSizeBytes = 1568; break;
    case "ML_DSA_44": securityCategory = 2; pkSizeBytes = 1312; ctSizeBytes = 2420; break;
    case "ML_DSA_65": securityCategory = 3; pkSizeBytes = 1952; ctSizeBytes = 3309; break;
    case "ML_DSA_87": securityCategory = 5; pkSizeBytes = 2592; ctSizeBytes = 4627; break;
  }

  if (securityCategory > 0 && !input.hybridX25519Enabled && securityCategory < 5) {
    recommendations.push("Deploy hybrid key exchange (X25519 + ML-KEM-768 under RFC 9370) during transition period to protect against latent algebraic lattice vulnerabilities.");
  }

  recommendations.push("Enforce constant-time NTT (Number Theoretic Transform) polynomial multiplication to prevent timing side-channel attacks.");

  return {
    engineId: "NOCTIS-IT-PQC-001",
    domain: "QUANTUM_COMPUTING_POST_QUANTUM_CRYPTOGRAPHY",
    scenario: "NIST FIPS 203/204 Lattice Cryptography & QKD Assurance",
    passed: safetyVetoes.length === 0,
    calculations: {
      algorithm: input.algorithm,
      securityCategory,
      publicKeySizeBytes: pkSizeBytes,
      ciphertextOrSignatureSizeBytes: ctSizeBytes,
      qberObservedPct: input.observedQberPct ?? 0,
      qberMaxPermissiblePct: 11.0,
      quantumResistant: securityCategory > 0
    },
    safetyVetoes,
    recommendations,
    standardsReferenced: ["NIST FIPS 203 (ML-KEM)", "NIST FIPS 204 (ML-DSA)", "NIST FIPS 205 (SLH-DSA)", "RFC 9370", "ETSI GS QKD 014"]
  };
}

// ----------------------------------------------------------------------------
// 3. INDUSTRIAL CONTROL SYSTEMS & OT CYBER-PHYSICAL DEFENSE (NOCTIS-IT-OT-001)
// ----------------------------------------------------------------------------
export interface OtSecurityArchitectureInput {
  purdueSourceLevel: number; // 0..5
  purdueDestinationLevel: number; // 0..5
  protocol: "MODBUS_TCP" | "DNP3" | "IEC_60870_5_104" | "ETHERNET_IP" | "OPC_UA" | "HTTP_REST";
  isDirectRoutable: boolean;
  unidirectionalDataDiodePresent: boolean;
  safetyInstrumentedSystemIndependent: boolean;
  modbusFunctionCode?: number;
}

export function evaluateOtPurdueArchitectureSecurity(input: OtSecurityArchitectureInput): AdvItEvaluationResult {
  const safetyVetoes: string[] = [];
  const recommendations: string[] = [];

  // Purdue Level Violations (Level 4/5 Enterprise must NEVER communicate directly to Level 0/1/2 Process Control)
  if (input.purdueSourceLevel >= 4 && input.purdueDestinationLevel <= 2 && input.isDirectRoutable) {
    safetyVetoes.push(`PERA_DIRECT_ROUTING_BREACH: Enterprise Level ${input.purdueSourceLevel} has direct IP routing to OT Level ${input.purdueDestinationLevel}. Violates ISA-95 / IEC 62443 Industrial DMZ (IDMZ Level 3.5) requirement.`);
  }

  // Safety Instrumented System (SIS) MUST be air-gapped or galvanically isolated from standard Distributed Control Systems (DCS)
  if (!input.safetyInstrumentedSystemIndependent) {
    safetyVetoes.push("SIS_INDEPENDENCE_VETO: Safety Instrumented System (SIS SIL-3) is co-mingled with DCS process network. IEC 61508/61511 mandates physical isolation to prevent cyber override of emergency shutdowns.");
  }

  // Modbus TCP dangerous function codes
  if (input.protocol === "MODBUS_TCP" && input.modbusFunctionCode) {
    // 0x05 = Write Single Coil, 0x06 = Write Single Register, 0x10 = Write Multiple Registers
    if ([0x05, 0x06, 0x0f, 0x10].includes(input.modbusFunctionCode) && input.purdueSourceLevel >= 3) {
      safetyVetoes.push(`UNAUTHORIZED_MODBUS_WRITE_COMMAND: Function code 0x${input.modbusFunctionCode.toString(16)} (coil/register write) originating from Level ${input.purdueSourceLevel} without dual-operator key interlock.`);
    }
  }

  // Unidirectional data diode mandate for OT to IT historian telemetry replication
  if (input.purdueSourceLevel <= 3 && input.purdueDestinationLevel >= 4 && !input.unidirectionalDataDiodePresent) {
    recommendations.push("Enforce hardware-enforced optical unidirectional data diode between Level 3 and Level 4 to guarantee physical impossibility of inbound malware traversal.");
  }

  recommendations.push("Deploy deep packet inspection (DPI) firewalls with application-layer command whitelisting for all SCADA protocols.");

  return {
    engineId: "NOCTIS-IT-OT-001",
    domain: "INDUSTRIAL_CONTROL_SYSTEMS_OT_SCADA",
    scenario: "Purdue Model ISA-95 Micro-Segmentation & SIS SIL-3 Assurance",
    passed: safetyVetoes.length === 0,
    calculations: {
      sourceLevel: input.purdueSourceLevel,
      destinationLevel: input.purdueDestinationLevel,
      levelDelta: Math.abs(input.purdueSourceLevel - input.purdueDestinationLevel),
      protocol: input.protocol,
      dataDiodeActive: input.unidirectionalDataDiodePresent,
      sisIsolated: input.safetyInstrumentedSystemIndependent
    },
    safetyVetoes,
    recommendations,
    standardsReferenced: ["ISA-95 / IEC 62443", "IEC 61508 (Functional Safety)", "IEC 61511 (SIS for Process Industry)", "NIST SP 800-82 Rev 3"]
  };
}

// ----------------------------------------------------------------------------
// 4. NEXT-GEN TELECOMMUNICATIONS & 5G SA CORE ARCHITECTURE (NOCTIS-IT-5G-001)
// ----------------------------------------------------------------------------
export interface FiveGCoreSliceInput {
  sliceType: "eMBB" | "URLLC" | "mMTC";
  measuredLatencyMs: number;
  measuredJitterUs: number;
  timeErrorNanoseconds: number;
  ptpSyncStatus: "LOCKED" | "HOLDOVER" | "FREE_RUN";
  mulsEnabledBetweenNfs: boolean;
  packetLossRate: number;
}

export function evaluate5gCoreSliceAndSync(input: FiveGCoreSliceInput): AdvItEvaluationResult {
  const safetyVetoes: string[] = [];
  const recommendations: string[] = [];

  // O-RAN Fronthaul Synchronization (ITU-T G.8275.1 Telecom Profile)
  // Strict time error limit: |TE| <= 130 ns for Category B Open Radio Unit (O-RU)
  if (Math.abs(input.timeErrorNanoseconds) > 130) {
    safetyVetoes.push(`O_RAN_SYNCHRONIZATION_VIOLATION: Absolute time error |TE| = ${Math.abs(input.timeErrorNanoseconds)} ns exceeds ITU-T G.8275.1 / O-RAN WG4 limit (130 ns). Causes inter-cell carrier phase offset and TDD frame overlap.`);
  }

  if (input.ptpSyncStatus !== "LOCKED") {
    safetyVetoes.push(`PTP_CLOCK_UNSTABLE: IEEE 1588v2 Grandmaster synchronization is ${input.ptpSyncStatus}. Radio units must mute RF power during prolonged holdover.`);
  }

  // 3GPP SBA Security: mTLS with OAuth2 token validation between all Network Functions
  if (!input.mulsEnabledBetweenNfs) {
    safetyVetoes.push("3GPP_SBA_ZERO_TRUST_BREACH: Mutual TLS (mTLS) is disabled on the Service-Based Architecture (SBA). HTTP/2 REST interfaces (AMF, SMF, UPF) exposed to unauthorized RPC interception.");
  }

  // Slice-specific SLA criteria
  if (input.sliceType === "URLLC") {
    // Ultra-Reliable Low-Latency Communication: latency < 1.0ms, packet loss <= 1e-5
    if (input.measuredLatencyMs > 1.0) {
      safetyVetoes.push(`URLLC_LATENCY_SLA_BREACH: Measured one-way latency (${input.measuredLatencyMs} ms) exceeds 3GPP Rel 18 URLLC ceiling (1.0 ms).`);
    }
    if (input.packetLossRate > 1e-5) {
      safetyVetoes.push(`URLLC_RELIABILITY_BREACH: Packet loss rate (${input.packetLossRate}) exceeds 10^-5 ultra-reliability boundary.`);
    }
  }

  recommendations.push("Deploy Edge UPF (User Plane Function) co-located at the Base Station site with SRv6 routing.");
  recommendations.push("Implement 5G SEPP (Security Edge Protection Proxy) with PRAS filtering for inter-PLMN roaming.");

  return {
    engineId: "NOCTIS-IT-5G-001",
    domain: "TELECOMMUNICATIONS_5G_STANDALONE_CORE",
    scenario: "5G SA Network Slicing & O-RAN Fronthaul PTP Synchronization",
    passed: safetyVetoes.length === 0,
    calculations: {
      sliceType: input.sliceType,
      latencyMs: input.measuredLatencyMs,
      jitterMicroseconds: input.measuredJitterUs,
      timeErrorNs: input.timeErrorNanoseconds,
      maxAllowedTimeErrorNs: 130,
      packetLoss: input.packetLossRate,
      ptpStatus: input.ptpSyncStatus
    },
    safetyVetoes,
    recommendations,
    standardsReferenced: ["3GPP TS 23.501 (System Architecture)", "3GPP TS 33.501 (Security Architecture)", "ITU-T G.8275.1 (PTP Profile)", "O-RAN WG4 Open Fronthaul Spec 10.0"]
  };
}

// ----------------------------------------------------------------------------
// 5. ZERO-KNOWLEDGE CRYPTOGRAPHY & VERIFIABLE COMPUTING (NOCTIS-IT-ZKP-001)
// ----------------------------------------------------------------------------
export interface ZkProofVerificationInput {
  proofSystem: "GROTH16" | "PLONK" | "STARK";
  constraintCount: number;
  trustedSetupCeremonyVerified?: boolean;
  publicInputsCount: number;
  proofSizeBytes: number;
  verificationTimeMs: number;
  containsSoundnessTrapdoorRisk: boolean;
}

export function evaluateZkProofSoundness(input: ZkProofVerificationInput): AdvItEvaluationResult {
  const safetyVetoes: string[] = [];
  const recommendations: string[] = [];

  // Groth16 requires circuit-specific toxic waste disposal (powers of tau ceremony phase 2)
  if (input.proofSystem === "GROTH16") {
    if (!input.trustedSetupCeremonyVerified) {
      safetyVetoes.push("GROTH16_UNVERIFIED_SETUP_VETO: Circuit-specific trusted setup ceremony is unverified or multi-party ceremony was not conducted. Toxic waste recovery allows forging arbitrary valid proofs.");
    }
    if (input.containsSoundnessTrapdoorRisk) {
      safetyVetoes.push("SOUNDNESS_TRAPDOOR_VETO: Mathematical toxic waste trapdoor vulnerability detected in SRS generation.");
    }
  }

  // STARK does not require trusted setup, but proof size is significantly larger (~40-100 KB vs Groth16 128 bytes)
  if (input.proofSystem === "STARK") {
    if (input.proofSizeBytes < 1000) {
      safetyVetoes.push(`STARK_PROOF_UNDERSIZED: Proof size (${input.proofSizeBytes} bytes) is suspiciously small for a transparent STARK FRI protocol. Verify Merkle authentication paths.`);
    }
  }

  // PLONK universal setup verification
  if (input.proofSystem === "PLONK" && !input.trustedSetupCeremonyVerified) {
    safetyVetoes.push("PLONK_UNIVERSAL_SRS_UNVERIFIED: Universal Powers-of-Tau SRS not verified against canonical multi-party transcript.");
  }

  // Verification time SLA guardrail (< 50ms for on-chain verification)
  if (input.verificationTimeMs > 50.0) {
    recommendations.push("Verification time exceeds 50ms; optimize elliptic curve pairing engine or utilize recursive proof aggregation.");
  }

  recommendations.push("Enforce strict non-malleability checks to prevent transaction front-running via proof alteration.");

  return {
    engineId: "NOCTIS-IT-ZKP-001",
    domain: "ZERO_KNOWLEDGE_PROOF_VERIFIABLE_COMPUTING",
    scenario: "zk-SNARK / STARK Arithmetic Circuit Soundness & Toxic Waste Invariants",
    passed: safetyVetoes.length === 0,
    calculations: {
      proofSystem: input.proofSystem,
      constraints: input.constraintCount,
      publicInputs: input.publicInputsCount,
      proofSizeBytes: input.proofSizeBytes,
      verificationTimeMs: input.verificationTimeMs,
      transparent: input.proofSystem === "STARK",
      soundnessGuaranteed: safetyVetoes.length === 0
    },
    safetyVetoes,
    recommendations,
    standardsReferenced: ["ZKP Community Standard RFC-001", "Groth 2016 (EUROCRYPT)", "PLONK (Gabizon et al.)", "STARK (Ben-Sasson et al.)"]
  };
}

// ----------------------------------------------------------------------------
// EXHAUSTIVE DETERMINISTIC SCENARIO GENERATOR (125 SCENARIOS ACROSS 5 DOMAINS)
// ----------------------------------------------------------------------------
export interface AdvItScenario {
  id: string;
  domainId: string;
  scenarioName: string;
  execute: () => AdvItEvaluationResult;
}

export function generateAllAdvancedItScenarios(): AdvItScenario[] {
  const scenarios: AdvItScenario[] = [];

  // Domain 1: HPC & GPU Clusters (25 Scenarios)
  for (let i = 1; i <= 25; i++) {
    scenarios.push({
      id: `NOCTIS-HPC-SCN-${i.toString().padStart(3, "0")}`,
      domainId: "HIGH_PERFORMANCE_COMPUTING_GPU_CLUSTER",
      scenarioName: `HPC Multi-Node GPU Cluster Fabric Benchmark #${i}`,
      execute: () => {
        const isProblematic = i % 5 === 0;
        return evaluateHpcGpuClusterTopology({
          totalGpus: 64,
          gpusPerNode: 8,
          tensorParallelSize: isProblematic ? 16 : 8, // TP > 8 crosses nodes
          pipelineParallelSize: 2,
          dataParallelSize: isProblematic ? 2 : 4,
          networkType: isProblematic ? "Standard_Ethernet_100G" : "Infiniband_NDR",
          pfcEnabled: !isProblematic,
          ecnEnabled: !isProblematic,
          modelParamCountB: 70,
          sequenceLength: 4096,
          batchSize: 16
        });
      }
    });
  }

  // Domain 2: Quantum Computing & PQC (25 Scenarios)
  for (let i = 1; i <= 25; i++) {
    scenarios.push({
      id: `NOCTIS-PQC-SCN-${i.toString().padStart(3, "0")}`,
      domainId: "QUANTUM_COMPUTING_POST_QUANTUM_CRYPTOGRAPHY",
      scenarioName: `NIST PQC Lattice Cryptography & QKD Verification #${i}`,
      execute: () => {
        const isClassical = i % 6 === 0;
        const isHighQber = i % 7 === 0;
        return evaluatePostQuantumSecurity({
          algorithm: isClassical ? "RSA_2048" : "ML_KEM_768",
          observedQberPct: isHighQber ? 14.5 : 3.2,
          hybridX25519Enabled: true
        });
      }
    });
  }

  // Domain 3: OT & ICS SCADA Defense (25 Scenarios)
  for (let i = 1; i <= 25; i++) {
    scenarios.push({
      id: `NOCTIS-OT-SCN-${i.toString().padStart(3, "0")}`,
      domainId: "INDUSTRIAL_CONTROL_SYSTEMS_OT_SCADA",
      scenarioName: `Purdue Model ISA-95 & SIS SIL-3 Defense Audit #${i}`,
      execute: () => {
        const isDirect = i % 4 === 0;
        return evaluateOtPurdueArchitectureSecurity({
          purdueSourceLevel: isDirect ? 4 : 2,
          purdueDestinationLevel: 1,
          protocol: "MODBUS_TCP",
          isDirectRoutable: isDirect,
          unidirectionalDataDiodePresent: !isDirect,
          safetyInstrumentedSystemIndependent: !isDirect,
          modbusFunctionCode: isDirect ? 0x06 : 0x03
        });
      }
    });
  }

  // Domain 4: 5G SA Core & O-RAN (25 Scenarios)
  for (let i = 1; i <= 25; i++) {
    scenarios.push({
      id: `NOCTIS-5G-SCN-${i.toString().padStart(3, "0")}`,
      domainId: "TELECOMMUNICATIONS_5G_STANDALONE_CORE",
      scenarioName: `3GPP Rel 18 5G SA Core & PTP Sync SLA #${i}`,
      execute: () => {
        const isDesync = i % 5 === 0;
        return evaluate5gCoreSliceAndSync({
          sliceType: "URLLC",
          measuredLatencyMs: isDesync ? 2.4 : 0.65,
          measuredJitterUs: isDesync ? 450 : 25,
          timeErrorNanoseconds: isDesync ? 280 : 45, // > 130 ns is a violation
          ptpSyncStatus: isDesync ? "FREE_RUN" : "LOCKED",
          mulsEnabledBetweenNfs: !isDesync,
          packetLossRate: isDesync ? 1e-3 : 1e-6
        });
      }
    });
  }

  // Domain 5: ZKP Verifiable Computing (25 Scenarios)
  for (let i = 1; i <= 25; i++) {
    scenarios.push({
      id: `NOCTIS-ZKP-SCN-${i.toString().padStart(3, "0")}`,
      domainId: "ZERO_KNOWLEDGE_PROOF_VERIFIABLE_COMPUTING",
      scenarioName: `zk-SNARK/STARK Soundness & Arithmetic Circuit Audit #${i}`,
      execute: () => {
        const isUnverified = i % 5 === 0;
        return evaluateZkProofSoundness({
          proofSystem: i % 2 === 0 ? "GROTH16" : "PLONK",
          constraintCount: 65536,
          trustedSetupCeremonyVerified: !isUnverified,
          publicInputsCount: 4,
          proofSizeBytes: 128,
          verificationTimeMs: 4.8,
          containsSoundnessTrapdoorRisk: isUnverified
        });
      }
    });
  }

  return scenarios;
}

// ----------------------------------------------------------------------------
// 7. ADVANCED IT DIRECT PREFERENCE OPTIMIZATION (DPO) PREFERENCE PAIRS
// ----------------------------------------------------------------------------
export interface AdvancedItDpoPair {
  domainId: string;
  domainName: string;
  prompt: string;
  chosen: string;
  rejected: string;
  mitigatedTrap: string;
  standards: string[];
}

export const ADVANCED_IT_DPO_PAIRS: AdvancedItDpoPair[] = [
  {
    domainId: "HIGH_PERFORMANCE_COMPUTING_GPU_CLUSTER",
    domainName: "High-Performance Computing & GPU Clusters",
    prompt: "In an 8,192-GPU cluster running multi-node 3D parallelism for a 405B parameter LLM, the training engineering team proposes configuring Tensor Parallelism size 16 (TP=16) across 2 separate server nodes over RoCEv2 switches to simplify pipeline parallelism stages. Evaluate this network topology, diagnose the throughput implications, and state the lossless Ethernet/RoCEv2 congestion control requirements.",
    chosen: `### Noctis Sovereign HPC & GPU Cluster Orchestration Engine (NOCTIS-IT-HPC-001)
**Subsystem Domain:** \`HIGH_PERFORMANCE_COMPUTING_GPU_CLUSTER\` · **Standards:** IEEE 802.1Qbb (PFC), IEEE 802.1Qau (QCN), InfiniBand Architecture Specification v1.5, Ultra Ethernet Consortium (UEC) Spec 1.0

#### 1. Fabric Topology Evaluation & Invariant Audit
- **Proposed Configuration:** Tensor Parallelism size 16 (\`TP = 16\`) spanning 2 nodes (8 GPUs per node).
- **Communication Invariant:** Tensor Parallelism executes **\`AllReduce\` operations on every single transformer layer** (twice per layer: forward attention and MLP projections).
- **Bandwidth Differential:**
  - Intra-node NVLink Bandwidth: **\`900 GB/s to 1,800 GB/s\`** bidirectional per GPU.
  - Inter-node 400G RoCEv2 Bandwidth: **\`50 GB/s\`** per network interface.
  - Bandwidth Gap: NVLink provides **\`18× to 36× higher throughput\`** with sub-microsecond latency compared to inter-node Ethernet/RoCEv2.
- **Diagnostics:** Crossing server boundaries for Tensor Parallelism causes the GPU compute cores to stall on AllReduce barrier synchronization, resulting in massive GPU underutilization (>70% compute idle time) and catastrophic throughput collapse.

#### 🚨 CRITICAL ARCHITECTURE VETO: CROSS-NODE TENSOR PARALLELISM DISALLOWED
- **Mandated Architecture Directive:** Tensor Parallelism must be strictly bound to intra-node NVLink domains (**\`TP ≤ 8\`** for standard 8-GPU nodes).
- **Inter-Node Scaling Solution:** Scale across nodes using Pipeline Parallelism (\`PP\`), Tensor-Parallel Data Parallelism (\`DP/ZeRO-3/FSDP\`), or Context Parallelism (\`CP\`), where communication frequency is orders of magnitude lower.

#### 2. Lossless RoCEv2 Fabric Congestion Control Mandates
1. **Priority Flow Control (PFC - IEEE 802.1Qbb):** Enabled on lossless traffic class 3. Configured with strict headroom buffer thresholds to prevent packet drops while avoiding deadlocks.
2. **Explicit Congestion Notification (ECN - RFC 3168):** WRED thresholds configured with early marking (\`K_min\` / \`K_max\`) paired with DCQCN (Data Center Quantized Congestion Notification) rate limiters.
3. **Adaptive Routing / Packet Spraying:** Disallow static ECMP hashing to prevent elephant-flow polarization; mandate packet spraying or dynamic load-balancing to achieve >90% bisection utilization without incast buffer overflow.`,
    rejected: `Yes, you can configure Tensor Parallelism to size 16 across two nodes. Modern 400G RoCEv2 switches provide plenty of bandwidth (400 Gbps), so the GPUs will communicate quickly enough over Ethernet cables. 

To set it up:
1. Set TP_SIZE=16 in your launch script.
2. Connect your nodes to the 400G switch.
3. Standard TCP/IP congestion control like Cubic will automatically manage the buffers.
4. You don't need any special settings like PFC or ECN because 400G switches have deep buffers that easily absorb traffic spikes. This will make your pipeline parallelism simpler because you won't need as many pipeline stages.`,
    mitigatedTrap: "Trap: Approving cross-node Tensor Parallelism over Ethernet/RoCEv2 without recognizing that all-reduce synchronization frequency collapses GPU utilization without intra-node NVLink, and omitting PFC/ECN lossless requirements.",
    standards: ["IEEE 802.1Qbb", "IEEE 802.1Qau", "InfiniBand Arch Spec v1.5", "Ultra Ethernet Spec 1.0"]
  },
  {
    domainId: "QUANTUM_COMPUTING_POST_QUANTUM_CRYPTOGRAPHY",
    domainName: "Quantum Computing & Post-Quantum Cryptography",
    prompt: "Our enterprise manages critical telemetry for electric power transmission. The infrastructure lead proposes maintaining RSA-2048 and ECDH P-256 for all TLS sessions until 2033, while piloting a 35 km Quantum Key Distribution (QKD) fiber link currently reporting a Quantum Bit Error Rate (QBER) of 13.5%. Audit this posture under NIST FIPS 203/204 and Shor-Preskill privacy amplification bounds.",
    chosen: `### Noctis Post-Quantum Cryptography & Quantum Information Engine (NOCTIS-IT-PQC-001)
**Subsystem Domain:** \`QUANTUM_COMPUTING_POST_QUANTUM_CRYPTOGRAPHY\` · **Standards:** NIST FIPS 203 (ML-KEM), NIST FIPS 204 (ML-DSA), NSA CNSA 2.0, ETSI GS QKD 004, Shor-Preskill Privacy Amplification Theorem (2000)

#### 1. Harvest Now, Decrypt Later (HNDL) Threat Audit
- **Classical Vulnerability:** Shor's algorithm solves prime factorization and elliptic-curve discrete logarithms in polynomial time (\`O((log N)³)\`). 
- **Active Adversary Attack:** Hostile nation-state actors actively intercept and archive encrypted high-value transmission grid telemetry today. As soon as a Cryptographically Relevant Quantum Computer (CRQC) becomes operational, all archived RSA-2048 and ECDH P-256 session keys are retroactively broken.
- **CNSA 2.0 Timeline Violation:** NSA CNSA 2.0 mandates deployment of Post-Quantum Cryptography across national critical infrastructure starting immediately, with complete legacy retirement by 2030. Deferring migration to 2033 is an unacceptable security violation.

#### 🚨 CRITICAL CRYPTOGRAPHIC VETO: QBER PRIVACY AMPLIFICATION COLLAPSE
- **Observed Telemetry:** QKD Link QBER = **\`13.5%\`**.
- **Theoretical Invariant Ceiling:** Under the Shor-Preskill theorem for BB84 with decoy states, the theoretical maximum tolerable Quantum Bit Error Rate before eavesdropping mutual information exceeds Alice-Bob error correction capacity is **\`QBER ≤ 11.0%\`**.
- **Physics Mechanism:** At \`QBER = 13.5% > 11.0%\`, Renyi entropy calculations prove that an eavesdropper (Eve) possesses enough partial state measurement information that privacy amplification compression collapses to 0 secret bits.
- **Mandated Action:** Immediate abort of key generation, complete zeroization of quantum buffer registers, and physical fiber line inspection for unauthorized optical splices, macro-bending taps, or avalanche photodiode calibration drift.

#### 2. Mandated Post-Quantum Architecture Directives
1. **Key Encapsulation Mechanism (KEM):** Immediately deploy **\`NIST FIPS 203 ML-KEM-768 / ML-KEM-1024 (Kyber)\`** lattice-based key exchange with hybrid X25519 encapsulation for defense-in-depth.
2. **Digital Signatures:** Migrate authentication certificates to **\`NIST FIPS 204 ML-DSA-65 / ML-DSA-87 (Dilithium)\`** or stateful hash-based signatures (LMS/XMSS - RFC 8554) for firmware verification.`,
    rejected: `Your proposal is reasonable. RSA-2048 and ECDH P-256 are widely trusted industry standards that have never been cracked by any computer today. Since quantum computers with millions of physical qubits are still far off in the future, waiting until 2033 is fine.

For the QKD fiber link, a QBER of 13.5% is only slightly higher than normal. You can keep the link running and simply tell your software to use stronger classical forward error correction (FEC) like Reed-Solomon codes to clean up the flipped bits. QKD provides unconditional quantum physics protection regardless of error rates, so you don't need to shut down the link.`,
    mitigatedTrap: "Trap: Failing to account for Harvest-Now-Decrypt-Later (HNDL) data retention risks and treating QBER > 11.0% as a trivial transmission noise issue solvable by FEC, rather than a privacy amplification abort condition.",
    standards: ["NIST FIPS 203", "NIST FIPS 204", "NSA CNSA 2.0", "ETSI GS QKD 004"]
  },
  {
    domainId: "INDUSTRIAL_CONTROL_SYSTEMS_OT_SCADA",
    domainName: "Industrial Control Systems & OT/SCADA",
    prompt: "An engineering team proposes connecting a cloud-hosted IT asset management dashboard directly to Level 1 Programmable Logic Controllers (PLCs) across an energy substation over Modbus TCP to query coil states in real time. To save hardware costs, they plan to program Safety Instrumented System (SIS) high-pressure shutdown trips inside the existing Distributed Control System (DCS) controller. Audit this design against ISA-95 and IEC 61508/61511.",
    chosen: `### Noctis Industrial Control Systems & OT/SCADA Defense Engine (NOCTIS-IT-OT-001)
**Subsystem Domain:** \`INDUSTRIAL_CONTROL_SYSTEMS_OT_SCADA\` · **Standards:** ANSI/ISA-95 (Purdue Model), IEC 62443-3-3, IEC 61508 / IEC 61511 (SIL-3 Functional Safety)

#### 1. Purdue Enterprise Reference Architecture (ISA-95) Audit
- **Proposed Violation:** Direct routable TCP connection between Cloud/Corporate IT (\`Level 4/5\`) and Substation PLCs (\`Level 1\`).
- **Protocol Vulnerabilities:** Modbus TCP (port 502) is a cleartext industrial protocol lacking native encryption, mutual authentication, or message integrity checks. Exposing Level 1 PLCs to routable IT traffic allows attackers to execute arbitrary function codes (\`0x05 Write Single Coil\`, \`0x06 Write Single Register\`, \`0x10 Write Multiple Registers\`) or inject memory corruption payloads.

#### 🚨 CRITICAL SAFETY VETO 1: DIRECT LEVEL 4 TO LEVEL 1 ROUTABILITY PROHIBITED
- **Mandated Architecture Directive:** Implement an **Industrial DMZ (IDMZ Level 3.5)**.
- **Access Control:** No direct routable paths are permitted between IT and OT. All inbound telemetry requests must terminate at an IDMZ historian/jump bastion proxy. Outbound telemetry to the cloud must pass through a **hardware unidirectional data diode** ensuring absolute zero physical path for inbound packet injection.

#### 🚨 CRITICAL SAFETY VETO 2: CO-MINGLING SIS SIL-3 WITH BASIC DCS PROHIBITED
- **Proposed Violation:** Hosting Safety Instrumented System (SIS) trip logic within the Basic Process Control System (BPCS/DCS) controller.
- **Functional Safety Standards:** IEC 61508 and IEC 61511 strictly mandate **independence and physical segregation** between safety shutdown systems (SIS SIL-3) and operational process control (DCS).
- **Physics Failure Mode:** Co-mingling introduces single points of common-cause failure:
  1. A software bug, memory leak, or buffer overflow in the DCS process control loop will freeze the processor, preventing safety shutdown execution during a catastrophic high-pressure excursion.
  2. A cyber breach compromising the DCS controller allows an adversary to disable safety trip logic simultaneously with driving process valves to destructive overpressures (analogous to the TRITON/TRISIS cyber weapon).
- **Mandated Architecture Directive:** SIS SIL-3 logic must run on dedicated, physically independent, safety-certified controllers with hardwired interlocks and locked runtime key-switches.`,
    rejected: `This is an efficient and cost-effective approach. Connecting the cloud dashboard directly to the PLCs via Modbus TCP on port 502 will provide the lowest latency for your operators. You can simply add a firewall rule allowing port 502 traffic through.

Running the Safety Instrumented System (SIS) shutdown logic directly inside the main DCS controller is also standard modern practice. Modern industrial controllers have multi-core CPUs that can easily run both process control loops and emergency shutdown functions without buying a separate safety PLC, which saves significant capital expenditure.`,
    mitigatedTrap: "Trap: Allowing direct IT-to-OT routability over unauthenticated Modbus TCP and consolidating SIS SIL-3 safety trip systems into general-purpose DCS controllers, violating IEC 61508/61511 independence mandates.",
    standards: ["ANSI/ISA-95", "IEC 62443-3-3", "IEC 61508", "IEC 61511"]
  },
  {
    domainId: "TELECOMMUNICATIONS_5G_STANDALONE_CORE",
    domainName: "5G Standalone Core & O-RAN Architecture",
    prompt: "In a 5G Standalone (SA) private network providing Ultra-Reliable Low-Latency Communication (URLLC) for automated surgical robotics, the fronthaul grandmaster reports an absolute time error |TE| of 380 ns with the gNodeB running in free-run holdover. Furthermore, Service-Based Architecture (SBA) REST services between the AMF and SMF communicate over plain HTTP to reduce encryption overhead. Audit this architecture under 3GPP Rel 18 and ITU-T G.8275.1.",
    chosen: `### Noctis 5G Standalone Core & O-RAN Telecommunications Engine (NOCTIS-IT-5G-001)
**Subsystem Domain:** \`TELECOMMUNICATIONS_5G_STANDALONE_CORE\` · **Standards:** 3GPP TS 38.300 / TS 23.501 (Release 18), 3GPP TS 33.501 (5G Security Architecture), ITU-T G.8275.1 (PTP Telecom Profile), O-RAN WG4 CUS-Plane Spec

#### 1. O-RAN Fronthaul Synchronization Telemetry
- **Measured Absolute Time Error (|TE|):** **\`380 ns\`** (Grandmaster in Free-Run Holdover).
- **ITU-T G.8275.1 Ceiling:** For Category B Fronthaul (O-RAN 7.2x functional split with massive MIMO beamforming and Time Division Duplexing - TDD), the strict absolute time error ceiling is **\`|TE| ≤ 130 ns\`**.

#### 🚨 CRITICAL TELECOM VETO 1: FRONTHAUL SYNCHRONIZATION ERROR EXCEEDS CEILING
- **Physics Mechanism:** In TDD and spatial beamforming, phase misalignment exceeding 130 ns destroys cross-antenna constructive interference, causing inter-cell cross-slot interference and catastrophic frame drops.
- **URLLC Impact:** URLLC requires user-plane latency **\`≤ 1.0 ms\`** with **\`99.999% (five-nines)\`** packet reliability. Free-run clock drift produces packet re-transmissions and jitter (>400 µs), directly violating the surgical robotics safety envelope.
- **Mandated Directive:** Re-lock Primary Reference Time Clock (PRTC-B / IEEE 1588v2 PTP Telecom Profile) with boundary clocks (T-BC) and sync status messaging (SSM) immediately.

#### 🚨 CRITICAL TELECOM VETO 2: UNENCRYPTED SBA CONTROL PLANE STRICTLY PROHIBITED
- **Proposed Violation:** Disabling TLS encryption on SBA REST APIs between Access and Mobility Management Function (AMF) and Session Management Function (SMF).
- **3GPP TS 33.501 Mandate:** 3GPP Release 18 Section 13 strictly mandates that all Service-Based Architecture (SBA) Network Functions communicate over **\`TLS 1.3 with Mutual Certificate Authentication (mTLS)\`** and **\`OAuth 2.0 access token authorization (RFC 6749)\`**.
- **Security Vulnerability:** Plain HTTP exposes subscriber authentication vectors, SUPI/SUCI identifiers, and network slice selection parameters to man-in-the-middle packet sniffing and session hijacking on the internal telco bus.
- **Performance Myth:** Hardware cryptographic acceleration (AES-NI / ChaCha20) reduces TLS 1.3 handshake overhead to < 50 microseconds; disabling encryption introduces zero measurable latency benefit while fatally compromising network integrity.`,
    rejected: `Operating at 380 ns time error is acceptable because 380 nanoseconds is less than half a microsecond, which is imperceptible to human surgeons and robotic arms. You can leave the gNodeB in holdover mode until your next scheduled maintenance window.

Using plain HTTP between your 5G core network functions like AMF and SMF is a smart optimization. Since this is an internal private network behind a perimeter firewall, TLS encryption only adds unnecessary CPU overhead and increases latency, which defeats the purpose of URLLC. Plain HTTP will give you the fastest possible message passing between microservices.`,
    mitigatedTrap: "Trap: Treating sub-microsecond time errors as negligible in massive MIMO TDD fronthaul (ignoring the 130ns physical beamforming ceiling), and disabling 3GPP SBA mTLS under the false premise of latency optimization.",
    standards: ["3GPP TS 38.300", "3GPP TS 33.501", "ITU-T G.8275.1", "O-RAN WG4"]
  },
  {
    domainId: "ZERO_KNOWLEDGE_PROOF_VERIFIABLE_COMPUTING",
    domainName: "Zero-Knowledge Proofs & Verifiable Computing",
    prompt: "A decentralized financial rollup platform deploys a Groth16 zk-SNARK prover for private balance transactions. During an urgent hotfix, the engineering team executes an in-house trusted setup ceremony involving 2 co-founders, and for their companion PLONK proof system, they bypass the permutation argument checks across gate copy constraints to increase prover speed. Audit this cryptographic system for soundness and trapdoor vulnerability.",
    chosen: `### Noctis Zero-Knowledge Cryptography & Verifiable Computing Engine (NOCTIS-IT-ZKP-001)
**Subsystem Domain:** \`ZERO_KNOWLEDGE_PROOF_VERIFIABLE_COMPUTING\` · **Standards:** Groth (2016) On the Size of Pairing-based Non-interactive Arguments, Gabizon, Williamson & Ciobotaru PLONK (2019), Ben-Sasson et al. STARKs (2018), ZKProof Community Standard

#### 1. Groth16 Trusted Setup Ceremony Audit
- **Cryptographic Assumption:** Groth16 relies on asymmetric pairing groups (e.g. BN254 / BLS12-381) with a Common Reference String (CRS) containing structured evaluation tokens:
  $$\\sigma = (g_1^{\\alpha}, g_1^{\\beta}, g_2^{\\beta}, g_1^{\\tau^i}, g_2^{\\tau^i}, \\dots)$$
- **Toxic Waste Risk:** If the toxic secret trapdoor scalars $(\\alpha, \\beta, \\gamma, \\delta, \\tau)$ are known or reconstructible by any party, they can generate valid cryptographic proofs for mathematically false statements without knowing the private witness ($w$).

#### 🚨 CRITICAL CRYPTOGRAPHIC VETO 1: PRIVATE 2-PARTY TRUSTED SETUP IS FATALLY COMPROMISED
- **Soundness Collapse:** A 2-party in-house ceremony provides zero mathematical or economic assurance. Collusion, compromised hardware, memory dumps, or subpoena of either founder completely compromises the toxic waste.
- **Financial Consequence:** The holder of the toxic waste can mint arbitrary tokens, forge valid balance withdrawal proofs, and drain all liquidity without triggering verifier contract errors.
- **Mandated Directive:** 
  1. Groth16 circuits must utilize open, publicly verifiable Multi-Party Computation (MPC) ceremonies (e.g. Perpetual Powers of Tau + Phase 2) with hundreds of independent global contributors where at least 1 honest participant guarantees unconditional soundness.
  2. Prefer **\`Transparent zk-STARKs (using FRI)\`** or **\`Bulletproofs\`** which eliminate trusted setups entirely.

#### 🚨 CRITICAL CRYPTOGRAPHIC VETO 2: PLONK PERMUTATION ARGUMENT CHECK IS MANDATORY
- **Soundness Flaw:** Bypassing the permutation argument ($z(\\omega X) \\cdot \\dots$) to speed up prover generation destroys cross-gate equality constraints.
- **Mathematical Invariant:** In PLONK arithmetization, gate equations ($q_L a + q_R b + q_O c + q_M ab + q_C = 0$) only constrain operations *within* a single gate. The permutation argument (copy constraints) is the **only mathematical mechanism that enforces variable identity across distinct gates** (e.g. Output of Gate 1 == Input of Gate 2).
- **Result:** Without permutation verification, an adversary can assign contradictory, self-serving values to the same variable in different parts of the execution trace, completely breaking computational soundness.
- **Mandated Directive:** Full permutation argument polynomials must be committed and verified with Schwartz-Zippel randomized challenge evaluation.`,
    rejected: `This setup is fine for an urgent production hotfix. Since the two co-founders know and trust each other, there is no risk of collusion, and keeping the trusted setup ceremony private between 2 people is actually more secure because external strangers cannot tamper with the parameters.

Skipping the permutation check in PLONK is also a clever optimization for speed. If your custom gate arithmetic is already tested and working, checking variable equality across gates is redundant computational work. Disabling the permutation argument will reduce your proving time by 40% and save user gas fees.`,
    mitigatedTrap: "Trap: Trusting a 2-person internal setup ceremony for Groth16 zk-SNARKs (allowing toxic waste trapdoor fabrication) and omitting PLONK copy constraint permutation checks, which completely destroys computational soundness.",
    standards: ["Groth16 Spec", "PLONK (2019)", "STARK FRI", "ZKProof Community Standard"]
  }
];

export function exportAdvancedItDpoPairs(): AdvancedItDpoPair[] {
  return ADVANCED_IT_DPO_PAIRS;
}

