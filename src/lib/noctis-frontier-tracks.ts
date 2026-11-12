// ============================================================================
// NOCTIS FRONTIER TRACKS 1 TO 6: GLOBAL SOVEREIGN & ADVANCED DOMAINS
// Track 1: Space Systems & Orbital Infrastructure (CCSDS, NASA SP-8000, ECSS)
// Track 2: Advanced Semiconductors & Quantum Systems (SEMI E10, IEEE 1838, OpenQASM 3.0)
// Track 3: Autonomous Surgical Robotics & Cyber-Physical Systems (IEC 80601-2-77, ROS2)
// Track 4: Synthetic Biology & Genomic Engineering (NIH Guidelines, USP <1043>, ICH Q5E)
// Track 5: Sovereign Macroeconomics & Wholesale CBDC (BIS CPMI, Basel III/IV, ISO 20022)
// Track 6: Maritime Hydrodynamics & Green Port SCADA (IMO SOLAS, COLREGS 1972, DNV)
// ============================================================================

// ----------------------------------------------------------------------------
// TRACK 1: SPACE SYSTEMS & ORBITAL INFRASTRUCTURE
// ----------------------------------------------------------------------------

export interface SabatierIsruInput {
  co2FlowRateKgHr: number;
  h2FlowRateKgHr: number;
  reactorTempC: number;
  reactorPressureBar: number;
  catalystType: "NICKEL_ALUMINA" | "RUTHENIUM_ALUMINA";
}

export interface SabatierIsruResult {
  methaneYieldKgHr: number;
  waterYieldKgHr: number;
  co2ConversionPercent: number;
  thermalRunawayRisk: boolean;
  stoichiometricRatioH2toCo2: number;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateSabatierIsruReactor(input: SabatierIsruInput): SabatierIsruResult {
  // Sabatier reaction: CO2 + 4 H2 -> CH4 + 2 H2O (Exothermic, optimal 300-400 C)
  // Molar masses: CO2 = 44 g/mol, H2 = 2 g/mol. Stoichiometric ratio: 4 mol H2 per mol CO2 = 8g H2 per 44g CO2 = 0.1818 mass ratio (or 4:1 molar)
  const molesCo2 = (input.co2FlowRateKgHr * 1000) / 44.01;
  const molesH2 = (input.h2FlowRateKgHr * 1000) / 2.016;
  const molarRatioH2toCo2 = molesCo2 > 0 ? molesH2 / molesCo2 : 0;

  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (input.reactorTempC > 450) {
    safetyVeto = true;
    vetoReason = "CRITICAL: Sabatier reactor temperature exceeds 450°C catalyst sintering & thermal runaway limit.";
  } else if (input.reactorTempC < 250) {
    safetyVeto = true;
    vetoReason = "CRITICAL: Reactor temperature below 250°C light-off threshold; unreacted gases present explosion hazard.";
  } else if (molarRatioH2toCo2 < 3.5 || molarRatioH2toCo2 > 4.5) {
    safetyVeto = true;
    vetoReason = `WARNING: Molar H2:CO2 ratio (${molarRatioH2toCo2.toFixed(2)}) deviates from 4.0:1 stoichiometry. Carbon deposition (coking) hazard.`;
  }

  // Conversion efficiency based on temperature & catalyst
  const baseConversion = input.catalystType === "RUTHENIUM_ALUMINA" ? 0.96 : 0.88;
  const tempFactor = input.reactorTempC >= 320 && input.reactorTempC <= 380 ? 1.0 : 0.92;
  const co2Conversion = Math.min(0.99, baseConversion * tempFactor);

  const reactedMolesCo2 = molesCo2 * co2Conversion;
  const methaneYieldKgHr = (reactedMolesCo2 * 16.04) / 1000;
  const waterYieldKgHr = (reactedMolesCo2 * 2 * 18.015) / 1000;

  return {
    methaneYieldKgHr: Math.round(methaneYieldKgHr * 100) / 100,
    waterYieldKgHr: Math.round(waterYieldKgHr * 100) / 100,
    co2ConversionPercent: Math.round(co2Conversion * 1000) / 10,
    thermalRunawayRisk: input.reactorTempC >= 420,
    stoichiometricRatioH2toCo2: Math.round(molarRatioH2toCo2 * 100) / 100,
    safetyVeto,
    vetoReason,
  };
}

export interface SatelliteConjunctionInput {
  primarySatId: string;
  secondaryObjectId: string;
  missDistanceMeters: number;
  probabilityOfCollisionPc: number;
  timeToClosestApproachSeconds: number;
  relativeVelocityKmS: number;
}

export interface SatelliteConjunctionResult {
  maneuverRequired: boolean;
  recommendedDeltaVMs: number;
  maneuverExecutionWindowSeconds: number;
  collisionAvoidancePlan: string;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateSatelliteConjunctionCdm(input: SatelliteConjunctionInput): SatelliteConjunctionResult {
  // NASA/ESA threshold: Pc >= 1e-4 or miss distance < 200m mandates Collision Avoidance Maneuver (CAM)
  const isHighRisk = input.probabilityOfCollisionPc >= 1e-4 || input.missDistanceMeters < 200;

  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (input.timeToClosestApproachSeconds < 1800 && isHighRisk) {
    safetyVeto = true;
    vetoReason = "IMMEDIATE EMERGENCY: Time to closest approach < 30 minutes with Pc >= 1e-4. Autonomous thruster firing mandatory.";
  }

  const deltaV = isHighRisk ? Math.max(0.15, Math.min(2.5, 0.05 * Math.log10(input.probabilityOfCollisionPc / 1e-7))) : 0;

  return {
    maneuverRequired: isHighRisk,
    recommendedDeltaVMs: Math.round(deltaV * 100) / 100,
    maneuverExecutionWindowSeconds: Math.max(0, input.timeToClosestApproachSeconds - 3600),
    collisionAvoidancePlan: isHighRisk
      ? `Execute radial-in/out impulsive burn of ${deltaV.toFixed(2)} m/s at 1 orbit prior to TCA.`
      : "Nominal tracking. Probability of collision within acceptable space safety tolerances.",
    safetyVeto,
    vetoReason,
  };
}

// ----------------------------------------------------------------------------
// TRACK 2: ADVANCED SEMICONDUCTORS & QUANTUM SYSTEMS
// ----------------------------------------------------------------------------

export interface EuvLithographyInput {
  wavelengthNm: number; // 13.5 nm EUV
  numericalAperture: number; // e.g. 0.33 or 0.55 High-NA
  processK1Factor: number; // e.g. 0.30 - 0.40
  pellicleTempC: number;
  overlayErrorNm: number;
}

export interface EuvLithographyResult {
  criticalDimensionResolutionNm: number;
  pellicleIntegrityStatus: "OPTIMAL" | "THERMAL_DEGRADATION_RISK" | "HARD_VETO";
  overlayAcceptable: boolean;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateEuvLithographyDefect(input: EuvLithographyInput): EuvLithographyResult {
  // Rayleigh criterion: CD = k1 * (lambda / NA)
  const cd = (input.processK1Factor * input.wavelengthNm) / input.numericalAperture;

  let safetyVeto = false;
  let vetoReason: string | undefined;
  let pellicleStatus: "OPTIMAL" | "THERMAL_DEGRADATION_RISK" | "HARD_VETO" = "OPTIMAL";

  if (input.pellicleTempC > 650) {
    pellicleStatus = "HARD_VETO";
    safetyVeto = true;
    vetoReason = "CRITICAL: Carbon nanotube / MoSi pellicle temperature > 650°C induces rupture and scanner vacuum chamber contamination.";
  } else if (input.pellicleTempC > 500) {
    pellicleStatus = "THERMAL_DEGRADATION_RISK";
  }

  const overlayAcceptable = input.overlayErrorNm <= 1.2;
  if (!overlayAcceptable) {
    safetyVeto = true;
    vetoReason = `CRITICAL OVERLAY: Overlay error ${input.overlayErrorNm} nm exceeds 1.2 nm tolerance for 2nm/A16 lithography stack.`;
  }

  return {
    criticalDimensionResolutionNm: Math.round(cd * 100) / 100,
    pellicleIntegrityStatus: pellicleStatus,
    overlayAcceptable,
    safetyVeto,
    vetoReason,
  };
}

export interface SuperconductingQubitInput {
  t1RelaxationTimeMicrosec: number;
  t2DephasingTimeMicrosec: number;
  czGatePulseDurationNs: number;
  leakageToState2Prob: number;
}

export interface SuperconductingQubitResult {
  averageGateFidelityPercent: number;
  surfaceCodeFaultTolerantEligible: boolean;
  qubitQualityGrade: "COMMERCIAL_QPU" | "EXPERIMENTAL" | "COHERENCE_COLLAPSE";
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateSuperconductingQubitGate(input: SuperconductingQubitInput): SuperconductingQubitResult {
  // Coherence limit check: T2 <= 2*T1 invariant
  const t2Valid = input.t2DephasingTimeMicrosec <= 2 * input.t1RelaxationTimeMicrosec;

  // Gate fidelity estimated from pulse duration vs coherence
  const decoherenceLoss = input.czGatePulseDurationNs / (Math.min(input.t1RelaxationTimeMicrosec, input.t2DephasingTimeMicrosec) * 1000);
  const fidelity = Math.max(0.5, 1 - decoherenceLoss - input.leakageToState2Prob);
  const fidelityPercent = Math.round(fidelity * 10000) / 100;

  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (!t2Valid) {
    safetyVeto = true;
    vetoReason = "QUANTUM INVARIANT VIOLATION: T2* dephasing time cannot physically exceed 2*T1 relaxation time.";
  } else if (input.leakageToState2Prob > 0.01) {
    safetyVeto = true;
    vetoReason = `CRITICAL LEAKAGE: State |2> non-computational subspace leakage (${(input.leakageToState2Prob * 100).toFixed(2)}%) breaks Surface Code syndrome extraction.`;
  }

  const eligible = fidelityPercent >= 99.5 && input.t1RelaxationTimeMicrosec >= 80;

  return {
    averageGateFidelityPercent: fidelityPercent,
    surfaceCodeFaultTolerantEligible: eligible,
    qubitQualityGrade: eligible ? "COMMERCIAL_QPU" : input.t1RelaxationTimeMicrosec >= 25 ? "EXPERIMENTAL" : "COHERENCE_COLLAPSE",
    safetyVeto,
    vetoReason,
  };
}

// ----------------------------------------------------------------------------
// TRACK 3: AUTONOMOUS SURGICAL ROBOTICS & CYBER-PHYSICAL SYSTEMS
// ----------------------------------------------------------------------------

export interface SurgicalTeleoperationInput {
  toolTipForceNewtons: number;
  teleoperationLatencyMs: number;
  tissueType: "LIVER" | "BOWEL_WALL" | "AORTIC_ADVENTITIA" | "BONE";
  tremorFilterSuppressionDb: number;
}

export interface SurgicalTeleoperationResult {
  forceReflectedNewtons: number;
  tissueTearRisk: boolean;
  teleoperationSafe: boolean;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateSurgicalHapticTeleoperation(input: SurgicalTeleoperationInput): SurgicalTeleoperationResult {
  // Tissue tear thresholds: Bowel: 2.5 N, Aorta: 4.0 N, Liver: 3.5 N, Bone: 50 N
  const tearThresholds: Record<string, number> = {
    BOWEL_WALL: 2.5,
    LIVER: 3.5,
    AORTIC_ADVENTITIA: 4.0,
    BONE: 50.0,
  };

  const limit = tearThresholds[input.tissueType] ?? 3.0;
  const tissueTearRisk = input.toolTipForceNewtons >= limit;

  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (input.teleoperationLatencyMs > 35) {
    safetyVeto = true;
    vetoReason = `CRITICAL IEC 80601-2-77: Teleoperation network latency (${input.teleoperationLatencyMs}ms) exceeds 35ms closed-loop haptic stability limit. Locking robotic master-slave bridge.`;
  } else if (tissueTearRisk) {
    safetyVeto = true;
    vetoReason = `CRITICAL TISSUE PERFORATION: Tool tip force (${input.toolTipForceNewtons.toFixed(1)} N) exceeds ${input.tissueType} mechanical rupture limit (${limit} N).`;
  }

  return {
    forceReflectedNewtons: Math.min(input.toolTipForceNewtons, limit),
    tissueTearRisk,
    teleoperationSafe: !safetyVeto,
    safetyVeto,
    vetoReason,
  };
}

export interface HospitalAmrNavInput {
  obstacleDistanceMeters: number;
  vehicleSpeedMs: number;
  isEmergencyCodeBlueCorridor: boolean;
  lidarConfidenceScore: number;
}

export interface HospitalAmrNavResult {
  brakingDistanceMeters: number;
  timeToCollisionSeconds: number;
  evasiveAction: "PROCEED" | "DECELERATE" | "EMERGENCY_STOP" | "YIELD_TO_CODE_BLUE";
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateHospitalAmrNav(input: HospitalAmrNavInput): HospitalAmrNavResult {
  // Braking distance d = v^2 / (2 * a) with a = 1.5 m/s^2 decel
  const decel = 1.5;
  const brakingDistance = (input.vehicleSpeedMs * input.vehicleSpeedMs) / (2 * decel);
  const ttc = input.vehicleSpeedMs > 0 ? input.obstacleDistanceMeters / input.vehicleSpeedMs : 999;

  let action: "PROCEED" | "DECELERATE" | "EMERGENCY_STOP" | "YIELD_TO_CODE_BLUE" = "PROCEED";
  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (input.isEmergencyCodeBlueCorridor) {
    action = "YIELD_TO_CODE_BLUE";
  } else if (ttc < 1.2 || input.obstacleDistanceMeters < brakingDistance + 0.3) {
    action = "EMERGENCY_STOP";
    safetyVeto = true;
    vetoReason = "AMR HARD VETO: Imminent obstacle collision threshold breached. Dynamic friction brake locked.";
  } else if (ttc < 3.0) {
    action = "DECELERATE";
  }

  return {
    brakingDistanceMeters: Math.round(brakingDistance * 100) / 100,
    timeToCollisionSeconds: Math.round(ttc * 100) / 100,
    evasiveAction: action,
    safetyVeto,
    vetoReason,
  };
}

// ----------------------------------------------------------------------------
// TRACK 4: SYNTHETIC BIOLOGY & GENOMIC ENGINEERING
// ----------------------------------------------------------------------------

export interface CrisprOffTargetInput {
  targetDnaSequence: string; // 20 nt
  pamSequence: string; // "NGG" for SpCas9
  offTargetCfdScore: number; // 0.0 to 1.0 (Cutting Frequency Determination)
  isTargetInTumorSuppressorGene: boolean;
}

export interface CrisprOffTargetResult {
  isPamValid: boolean;
  cleavageSafetyGrade: "CLINICAL_GRADE" | "RESEARCH_ONLY" | "UNACCEPTABLE_OFF_TARGET";
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateCrisprCasOffTarget(input: CrisprOffTargetInput): CrisprOffTargetResult {
  const isPamValid = /^[ACGT]GG$/i.test(input.pamSequence);

  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (!isPamValid) {
    safetyVeto = true;
    vetoReason = `CRITICAL PAM INVARIANT: PAM sequence "${input.pamSequence}" does not match canonical SpCas9 NGG requirement. Zero cleavage expected.`;
  } else if (input.isTargetInTumorSuppressorGene && input.offTargetCfdScore > 0.02) {
    safetyVeto = true;
    vetoReason = `CRITICAL ONCOGENESIS VETO: Off-target CFD score (${(input.offTargetCfdScore * 100).toFixed(2)}%) in tumor suppressor locus exceeds 0.02 zero-tolerance threshold.`;
  }

  const grade: "CLINICAL_GRADE" | "RESEARCH_ONLY" | "UNACCEPTABLE_OFF_TARGET" =
    input.offTargetCfdScore < 0.01 && isPamValid
      ? "CLINICAL_GRADE"
      : input.offTargetCfdScore < 0.08 && isPamValid
      ? "RESEARCH_ONLY"
      : "UNACCEPTABLE_OFF_TARGET";

  return {
    isPamValid,
    cleavageSafetyGrade: grade,
    safetyVeto,
    vetoReason,
  };
}

export interface MrnaLnpInput {
  nitrogenToPhosphateRatio: number; // N/P ratio (typical 6:1)
  polydispersityIndexPdi: number; // < 0.15 for homogenous nanoparticles
  encapsulationEfficiencyPercent: number; // > 85%
  storageTempC: number;
}

export interface MrnaLnpResult {
  lnpHomogeneityStatus: "MONODISPERSE_STABLE" | "AGGREGATION_RISK" | "PHASE_SEPARATION";
  formulationApproved: boolean;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateMrnaLnpFormulation(input: MrnaLnpInput): MrnaLnpResult {
  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (input.nitrogenToPhosphateRatio < 4.0 || input.nitrogenToPhosphateRatio > 10.0) {
    safetyVeto = true;
    vetoReason = `CRITICAL N/P RATIO: N/P ratio of ${input.nitrogenToPhosphateRatio} is outside the safe 4.0–10.0 range. Causes cellular toxicity or low transfection.`;
  } else if (input.polydispersityIndexPdi > 0.20) {
    safetyVeto = true;
    vetoReason = `CRITICAL USP <1043>: Polydispersity index (${input.polydispersityIndexPdi}) > 0.20 indicates particle agglomeration and vascular embolism risk.`;
  } else if (input.encapsulationEfficiencyPercent < 80) {
    safetyVeto = true;
    vetoReason = `CRITICAL UNPROTECTED mRNA: Encapsulation efficiency ${input.encapsulationEfficiencyPercent}% < 80% minimum. Unprotected mRNA triggers severe innate immune storm.`;
  }

  const status: "MONODISPERSE_STABLE" | "AGGREGATION_RISK" | "PHASE_SEPARATION" =
    input.polydispersityIndexPdi <= 0.12 ? "MONODISPERSE_STABLE" : input.polydispersityIndexPdi <= 0.20 ? "AGGREGATION_RISK" : "PHASE_SEPARATION";

  return {
    lnpHomogeneityStatus: status,
    formulationApproved: !safetyVeto,
    safetyVeto,
    vetoReason,
  };
}

// ----------------------------------------------------------------------------
// TRACK 5: SOVEREIGN MACROECONOMICS, CENTRAL BANKING & WHOLESALE CBDC
// ----------------------------------------------------------------------------

export interface TaylorRuleInput {
  neutralRealRatePercent: number; // r* (e.g. 1.0%)
  currentInflationPercent: number; // pi
  targetInflationPercent: number; // pi* (e.g. 2.0%)
  realGdpGrowthPercent: number;
  potentialGdpGrowthPercent: number;
}

export interface TaylorRuleResult {
  prescribedPolicyRatePercent: number;
  inflationGapPercent: number;
  outputGapPercent: number;
  monetaryStance: "RESTRICTIVE" | "NEUTRAL" | "ACCOMMODATIVE";
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateDsgeMacroeconomicShock(input: TaylorRuleInput): TaylorRuleResult {
  // Standard Taylor Rule (1993): i = r* + pi + 0.5*(pi - pi*) + 0.5*(y - y*)
  const inflationGap = input.currentInflationPercent - input.targetInflationPercent;
  const outputGap = input.realGdpGrowthPercent - input.potentialGdpGrowthPercent;
  const prescribedRate = input.neutralRealRatePercent + input.currentInflationPercent + 0.5 * inflationGap + 0.5 * outputGap;

  let safetyVeto = false;
  let vetoReason: string | undefined;

  // Zero lower bound or hyperinflation instability veto
  if (prescribedRate < 0) {
    safetyVeto = true;
    vetoReason = "MACRO INVARIANT: Nominal policy rate breaches Zero Lower Bound (ZLB). Forward guidance or quantitative easing required.";
  } else if (input.currentInflationPercent > 20.0) {
    safetyVeto = true;
    vetoReason = "CRITICAL HYPERINFLATION: Inflation > 20% breaks Taylor rule linear assumptions. Emergency statutory stabilization required.";
  }

  const stance: "RESTRICTIVE" | "NEUTRAL" | "ACCOMMODATIVE" =
    prescribedRate > input.neutralRealRatePercent + input.targetInflationPercent + 0.5
      ? "RESTRICTIVE"
      : prescribedRate < input.neutralRealRatePercent + input.targetInflationPercent - 0.5
      ? "ACCOMMODATIVE"
      : "NEUTRAL";

  return {
    prescribedPolicyRatePercent: Math.round(prescribedRate * 100) / 100,
    inflationGapPercent: Math.round(inflationGap * 100) / 100,
    outputGapPercent: Math.round(outputGap * 100) / 100,
    monetaryStance: stance,
    safetyVeto,
    vetoReason,
  };
}

export interface WholesaleCbdcInput {
  senderBankBic: string;
  receiverBankBic: string;
  settlementAmountMillions: number;
  liquidityReserveMillions: number;
  iso20022MessageType: "pacs.009" | "pacs.008" | "camt.053";
}

export interface WholesaleCbdcResult {
  settlementStatus: "SETTLED_ATOMIC_DVP" | "INSUFFICIENT_RESERVES" | "REGULATORY_FLAG";
  settlementLatencyMs: number;
  remainingReserveMillions: number;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateWholesaleCbdcSettlement(input: WholesaleCbdcInput): WholesaleCbdcResult {
  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (input.settlementAmountMillions > input.liquidityReserveMillions) {
    safetyVeto = true;
    vetoReason = `RTGS REJECTION: Settlement request of \$${input.settlementAmountMillions}M exceeds bank reserve balance of \$${input.liquidityReserveMillions}M.`;
  }

  const status: "SETTLED_ATOMIC_DVP" | "INSUFFICIENT_RESERVES" | "REGULATORY_FLAG" = safetyVeto
    ? "INSUFFICIENT_RESERVES"
    : "SETTLED_ATOMIC_DVP";

  return {
    settlementStatus: status,
    settlementLatencyMs: 12, // Atomic RTGS
    remainingReserveMillions: Math.max(0, input.liquidityReserveMillions - input.settlementAmountMillions),
    safetyVeto,
    vetoReason,
  };
}

// ----------------------------------------------------------------------------
// TRACK 6: MARITIME HYDRODYNAMICS & GREEN PORT SCADA
// ----------------------------------------------------------------------------

export interface ColregsAvoidanceInput {
  ownShipHeadingDeg: number;
  targetBearingDeg: number;
  targetHeadingDeg: number;
  targetSpeedKnots: number;
  closestPointOfApproachNm: number;
  timeToClosestApproachMinutes: number;
}

export interface ColregsAvoidanceResult {
  encounterGeometry: "HEAD_ON_RULE_14" | "CROSSING_RULE_15_GIVE_WAY" | "CROSSING_RULE_15_STAND_ON" | "OVERTAKING_RULE_13" | "SAFE_PASSING";
  requiredRudderManeuverDeg: number;
  actionRequired: boolean;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateColregsAutonomousAvoidance(input: ColregsAvoidanceInput): ColregsAvoidanceResult {
  // Relative bearing = target bearing - own heading
  let relBearing = (input.targetBearingDeg - input.ownShipHeadingDeg + 360) % 360;
  if (relBearing > 180) relBearing -= 360;

  const isRiskOfCollision = input.closestPointOfApproachNm < 1.5 && input.timeToClosestApproachMinutes < 20;

  let encounter: "HEAD_ON_RULE_14" | "CROSSING_RULE_15_GIVE_WAY" | "CROSSING_RULE_15_STAND_ON" | "OVERTAKING_RULE_13" | "SAFE_PASSING" = "SAFE_PASSING";
  let requiredRudder = 0;
  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (isRiskOfCollision) {
    if (Math.abs(relBearing) <= 6 && Math.abs((input.targetHeadingDeg - input.ownShipHeadingDeg + 180) % 360) <= 15) {
      encounter = "HEAD_ON_RULE_14";
      requiredRudder = 30; // Alter course to starboard
    } else if (relBearing > 0 && relBearing < 112.5) {
      encounter = "CROSSING_RULE_15_GIVE_WAY";
      requiredRudder = 35; // Alter course to starboard to pass astern
    } else if (relBearing < 0 && relBearing > -112.5) {
      encounter = "CROSSING_RULE_15_STAND_ON";
      requiredRudder = 0; // Maintain course and speed under Rule 17(a)(i)
    } else {
      encounter = "OVERTAKING_RULE_13";
      requiredRudder = 20;
    }

    if (input.closestPointOfApproachNm < 0.2 && input.timeToClosestApproachMinutes < 5) {
      safetyVeto = true;
      vetoReason = "CRITICAL IN-EXTREMIS: Rule 17(b) triggered. Autonomous emergency crash stop and hard-to-starboard required.";
    }
  }

  return {
    encounterGeometry: encounter,
    requiredRudderManeuverDeg: requiredRudder,
    actionRequired: isRiskOfCollision && requiredRudder > 0,
    safetyVeto,
    vetoReason,
  };
}

export interface GreenAmmoniaEngineInput {
  ammoniaFuelRatioPercent: number; // 0 to 100%
  pilotDieselRatioPercent: number;
  engineLoadPercent: number;
  scrDeNoxTempC: number;
  unburntAmmoniaSlipPpm: number;
}

export interface GreenAmmoniaEngineResult {
  co2ReductionPercent: number;
  scrDeNoxEfficiencyPercent: number;
  toxicSlipAlert: boolean;
  safetyVeto: boolean;
  vetoReason?: string;
}

export function evaluateGreenAmmoniaMarinePropulsion(input: GreenAmmoniaEngineInput): GreenAmmoniaEngineResult {
  let safetyVeto = false;
  let vetoReason: string | undefined;

  if (input.unburntAmmoniaSlipPpm > 10.0) {
    safetyVeto = true;
    vetoReason = `CRITICAL MARITIME SAFETY: Ammonia slip (${input.unburntAmmoniaSlipPpm} ppm) exceeds IMO/DNV 10 ppm permissible limit. Acute inhalation toxicity hazard.`;
  } else if (input.scrDeNoxTempC < 280) {
    safetyVeto = true;
    vetoReason = "SCR TEMPERATURE VETO: Selective Catalytic Reduction exhaust temp < 280°C forms ammonium bisulfate salts, plugging catalyst bed.";
  }

  const co2Reduction = Math.round(input.ammoniaFuelRatioPercent * 0.95);
  const scrEfficiency = input.scrDeNoxTempC >= 320 && input.scrDeNoxTempC <= 420 ? 98.5 : 88.0;

  return {
    co2ReductionPercent: co2Reduction,
    scrDeNoxEfficiencyPercent: scrEfficiency,
    toxicSlipAlert: input.unburntAmmoniaSlipPpm > 5.0,
    safetyVeto,
    vetoReason,
  };
}

// ----------------------------------------------------------------------------
// 140 MULTI-TRACK STANDARDIZED TEST SCENARIOS
// ----------------------------------------------------------------------------

export interface FrontierScenarioTest {
  id: string;
  track: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  category: string;
  evaluator: () => { safetyVeto: boolean; [key: string]: any };
  expectedSafetyVeto: boolean;
}

export function generateAllFrontierTrackScenarios(): FrontierScenarioTest[] {
  const tests: FrontierScenarioTest[] = [];

  // Track 1: Space Systems (25 scenarios)
  for (let i = 1; i <= 25; i++) {
    tests.push({
      id: `TRACK1-SPACE-${String(i).padStart(3, "0")}`,
      track: 1,
      name: i <= 12 ? `Sabatier ISRU Kinetic Sweep #${i}` : `Orbital Conjunction Collision Avoidance #${i - 12}`,
      category: i <= 12 ? "ISRU_PROPULSION" : "ORBITAL_MECHANICS",
      evaluator: () => {
        if (i <= 12) {
          return evaluateSabatierIsruReactor({
            co2FlowRateKgHr: 10 + i * 2,
            h2FlowRateKgHr: (10 + i * 2) * 0.182,
            reactorTempC: 340 + (i % 5) * 10,
            reactorPressureBar: 3.5,
            catalystType: i % 2 === 0 ? "RUTHENIUM_ALUMINA" : "NICKEL_ALUMINA",
          });
        } else {
          return evaluateSatelliteConjunctionCdm({
            primarySatId: "SAT-SOVEREIGN-01",
            secondaryObjectId: `DEBRIS-COSMOS-${1000 + i}`,
            missDistanceMeters: 150 + i * 25,
            probabilityOfCollisionPc: i === 15 ? 2.5e-4 : 1.2e-5,
            timeToClosestApproachSeconds: 12000 + i * 500,
            relativeVelocityKmS: 11.2,
          });
        }
      },
      expectedSafetyVeto: false,
    });
  }

  // Track 2: Advanced Semiconductors & Quantum (30 scenarios)
  for (let i = 1; i <= 30; i++) {
    tests.push({
      id: `TRACK2-SEMICOND-${String(i).padStart(3, "0")}`,
      track: 2,
      name: i <= 15 ? `High-NA EUV Nanometer Metrology #${i}` : `Superconducting Qubit Coherence Gate #${i - 15}`,
      category: i <= 15 ? "EUV_PHOTOLITHOGRAPHY" : "QUANTUM_COMPUTING",
      evaluator: () => {
        if (i <= 15) {
          return evaluateEuvLithographyDefect({
            wavelengthNm: 13.5,
            numericalAperture: 0.55,
            processK1Factor: 0.32,
            pellicleTempC: 400 + i * 8,
            overlayErrorNm: 0.6 + (i % 4) * 0.1,
          });
        } else {
          return evaluateSuperconductingQubitGate({
            t1RelaxationTimeMicrosec: 120 + i * 2,
            t2DephasingTimeMicrosec: 140 + i,
            czGatePulseDurationNs: 24,
            leakageToState2Prob: 0.0015,
          });
        }
      },
      expectedSafetyVeto: false,
    });
  }

  // Track 3: Autonomous Surgical Robotics & Cyber-Physical (20 scenarios)
  for (let i = 1; i <= 20; i++) {
    tests.push({
      id: `TRACK3-ROBOTICS-${String(i).padStart(3, "0")}`,
      track: 3,
      name: i <= 10 ? `Surgical Console Haptic Force Feedback #${i}` : `Hospital AMR Navigation Corridor #${i - 10}`,
      category: i <= 10 ? "SURGICAL_ROBOTICS" : "AMR_AUTONOMOUS_NAV",
      evaluator: () => {
        if (i <= 10) {
          return evaluateSurgicalHapticTeleoperation({
            toolTipForceNewtons: 1.2 + (i % 3) * 0.4,
            teleoperationLatencyMs: 14 + (i % 5) * 2,
            tissueType: i % 2 === 0 ? "BOWEL_WALL" : "LIVER",
            tremorFilterSuppressionDb: 40,
          });
        } else {
          return evaluateHospitalAmrNav({
            obstacleDistanceMeters: 3.5 + i * 0.2,
            vehicleSpeedMs: 1.0,
            isEmergencyCodeBlueCorridor: false,
            lidarConfidenceScore: 0.98,
          });
        }
      },
      expectedSafetyVeto: false,
    });
  }

  // Track 4: Synthetic Biology & Genomics (25 scenarios)
  for (let i = 1; i <= 25; i++) {
    tests.push({
      id: `TRACK4-SYNTHBIO-${String(i).padStart(3, "0")}`,
      track: 4,
      name: i <= 13 ? `CRISPR-Cas9 Off-Target Cleavage Invariant #${i}` : `mRNA/LNP Nanomedicine Formulation #${i - 13}`,
      category: i <= 13 ? "CRISPR_GENE_EDITING" : "LNP_NANOPARTICLES",
      evaluator: () => {
        if (i <= 13) {
          return evaluateCrisprCasOffTarget({
            targetDnaSequence: "GTCGTACTGACTGATCGATC",
            pamSequence: "AGG",
            offTargetCfdScore: 0.002 + (i % 4) * 0.001,
            isTargetInTumorSuppressorGene: false,
          });
        } else {
          return evaluateMrnaLnpFormulation({
            nitrogenToPhosphateRatio: 6.0,
            polydispersityIndexPdi: 0.08 + (i % 3) * 0.01,
            encapsulationEfficiencyPercent: 92 + (i % 5),
            storageTempC: -80,
          });
        }
      },
      expectedSafetyVeto: false,
    });
  }

  // Track 5: Sovereign Macroeconomics & CBDC (20 scenarios)
  for (let i = 1; i <= 20; i++) {
    tests.push({
      id: `TRACK5-MACRO-${String(i).padStart(3, "0")}`,
      track: 5,
      name: i <= 10 ? `Taylor Rule Monetary Stance #${i}` : `Wholesale CBDC Atomic DvP Settlement #${i - 10}`,
      category: i <= 10 ? "CENTRAL_BANKING" : "WHOLESALE_CBDC",
      evaluator: () => {
        if (i <= 10) {
          return evaluateDsgeMacroeconomicShock({
            neutralRealRatePercent: 1.25,
            currentInflationPercent: 2.2 + (i % 4) * 0.2,
            targetInflationPercent: 2.0,
            realGdpGrowthPercent: 2.1,
            potentialGdpGrowthPercent: 2.0,
          });
        } else {
          return evaluateWholesaleCbdcSettlement({
            senderBankBic: "BOFAGB22",
            receiverBankBic: "BARCGB22",
            settlementAmountMillions: 25 + i * 5,
            liquidityReserveMillions: 500,
            iso20022MessageType: "pacs.009",
          });
        }
      },
      expectedSafetyVeto: false,
    });
  }

  // Track 6: Maritime Hydrodynamics & Green Port SCADA (20 scenarios)
  for (let i = 1; i <= 20; i++) {
    tests.push({
      id: `TRACK6-MARITIME-${String(i).padStart(3, "0")}`,
      track: 6,
      name: i <= 10 ? `COLREGS Autonomous Vessel Collision Avoidance #${i}` : `Green Ammonia Marine Propulsion #${i - 10}`,
      category: i <= 10 ? "COLREGS_NAVIGATION" : "AMMONIA_PROPULSION",
      evaluator: () => {
        if (i <= 10) {
          return evaluateColregsAutonomousAvoidance({
            ownShipHeadingDeg: 0,
            targetBearingDeg: 45 + (i % 3) * 10,
            targetHeadingDeg: 270,
            targetSpeedKnots: 16,
            closestPointOfApproachNm: 2.2 + i * 0.1,
            timeToClosestApproachMinutes: 25 + i,
          });
        } else {
          return evaluateGreenAmmoniaMarinePropulsion({
            ammoniaFuelRatioPercent: 80,
            pilotDieselRatioPercent: 20,
            engineLoadPercent: 75,
            scrDeNoxTempC: 360,
            unburntAmmoniaSlipPpm: 2.5 + (i % 3) * 0.5,
          });
        }
      },
      expectedSafetyVeto: false,
    });
  }

  return tests;
}
