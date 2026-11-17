/**
 * ============================================================================
 * NOCTIS NEUROMORPHIC SPIKING CIRCUITS & SYNAPSE ENGINE (NOCTIS-NEUROMORPHIC-001)
 * Sovereign Physical Systems: Leaky Integrate-and-Fire (LIF) Dynamics, Spike-Timing-Dependent Plasticity (STDP),
 * Memristive Crossbar Conductance, Sub-Threshold Silicon Thermodynamics, Energy Per Synaptic Event
 * Standards: IEEE Transactions on Neural Networks & Learning Systems / Intel Loihi 2 Architecture / BrainScaleS Specification
 * ============================================================================
 */

export interface NeuromorphicParams {
  membraneCapacitancePicofarads: number; // C_m (e.g. 1.0 to 10.0 pF)
  leakConductanceNanosiemens: number; // g_L (e.g. 5.0 to 25.0 nS)
  restingPotentialMillivolts: number; // E_L (e.g. -70 mV)
  thresholdPotentialMillivolts: number; // V_th (e.g. -50 mV)
  resetPotentialMillivolts: number; // V_reset (e.g. -75 mV)
  inputSynapticCurrentPicoamps: number; // I_syn (e.g. 150 to 800 pA)
  refractoryPeriodMilliseconds: number; // t_ref (e.g. 1.0 to 3.0 ms)
  stdpTimeDeltaMs: number; // Delta t = t_post - t_pre (-20 to +20 ms)
  supplyVoltageVolts?: number; // V_dd (e.g. 0.5 to 0.9 V)
}

export interface NeuromorphicAuditResult {
  membraneTimeConstantMs: number; // tau_m = C_m / g_L
  steadyStateMembranePotentialMv: number; // V_infinity
  isSpikeGenerated: boolean; // V_infinity > V_th
  interSpikeIntervalMs: number;
  firingRateHz: number;
  stdpWeightChangePercent: number; // Delta w / w
  energyPerSpikeFemtojoules: number;
  isUltraLowPowerCompliant: boolean; // < 50 fJ/event
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateNeuromorphicCircuits(params: NeuromorphicParams): NeuromorphicAuditResult {
  const C_m = params.membraneCapacitancePicofarads * 1e-12;
  const g_L = params.leakConductanceNanosiemens * 1e-9;
  const E_L = params.restingPotentialMillivolts;
  const V_th = params.thresholdPotentialMillivolts;
  const V_reset = params.resetPotentialMillivolts;
  const I_syn = params.inputSynapticCurrentPicoamps * 1e-12;
  const V_dd = params.supplyVoltageVolts ?? 0.75;

  // Membrane time constant tau_m = C_m / g_L (in ms)
  const tau_m_ms = (C_m / g_L) * 1e3;

  // Steady-state membrane potential V_infinity = E_L + I_syn / g_L (in mV)
  const V_infinity_mV = E_L + (I_syn / g_L) * 1e3;

  const isSpike = V_infinity_mV > V_th;

  // Analytical LIF Inter-Spike Interval (ISI):
  // T_isi = t_ref + tau_m * ln((V_infinity - V_reset) / (V_infinity - V_th))
  let isi_ms = Infinity;
  let firingRateHz = 0;
  if (isSpike) {
    const logArg = (V_infinity_mV - V_reset) / Math.max(0.1, V_infinity_mV - V_th);
    isi_ms = params.refractoryPeriodMilliseconds + tau_m_ms * Math.log(logArg);
    firingRateHz = (1.0 / (isi_ms * 1e-3));
  }

  // Bi-exponential STDP (Spike-Timing-Dependent Plasticity):
  // Delta t = t_post - t_pre
  // If dt > 0: Delta w = A_+ * exp(-dt / tau_+)  (LTP)
  // If dt < 0: Delta w = - A_- * exp(dt / tau_-) (LTD)
  const tau_plus = 16.8; // ms
  const tau_minus = 33.7; // ms
  const A_plus = 0.05; // 5% max potentiation
  const A_minus = 0.0525; // slightly asymmetric depression for stability
  const dt = params.stdpTimeDeltaMs;

  let deltaW = 0;
  if (dt >= 0) {
    deltaW = A_plus * Math.exp(-dt / tau_plus);
  } else {
    deltaW = -A_minus * Math.exp(dt / tau_minus);
  }
  const deltaWPercent = deltaW * 100;

  // Dynamic switching energy per synaptic spike event: E = (1/2) * C_syn * V_dd^2 + C_line * V_dd^2
  // For nanoscale crossbars (PCM / RRAM / advanced FinFET): C_eff ~ 15 fF
  const C_eff = 15e-15;
  const energyJoules = 0.5 * C_eff * Math.pow(V_dd, 2);
  const energyFemtojoules = energyJoules * 1e15;
  const isUltraLowPower = energyFemtojoules <= 50.0;

  const invariantsSatisfied = tau_m_ms > 0.05 && tau_m_ms < 100.0 &&
    V_infinity_mV > -80.0 &&
    Math.abs(deltaWPercent) <= 6.0 &&
    isUltraLowPower;

  const diagnostic = `Neuromorphic LIF Audit: C_m=${params.membraneCapacitancePicofarads}pF, g_L=${params.leakConductanceNanosiemens}nS, ` +
    `tau_m=${tau_m_ms.toFixed(1)}ms, V_inf=${V_infinity_mV.toFixed(1)}mV (Spike: ${isSpike}), ` +
    `ISI=${isFinite(isi_ms) ? isi_ms.toFixed(1) + "ms" : "N/A"} (${firingRateHz.toFixed(1)} Hz), ` +
    `STDP dt=${dt}ms -> DeltaW=${deltaWPercent.toFixed(2)}%, Energy/Spike=${energyFemtojoules.toFixed(1)} fJ (Low-Power: ${isUltraLowPower}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    membraneTimeConstantMs: tau_m_ms,
    steadyStateMembranePotentialMv: V_infinity_mV,
    isSpikeGenerated: isSpike,
    interSpikeIntervalMs: isFinite(isi_ms) ? isi_ms : -1,
    firingRateHz,
    stdpWeightChangePercent: deltaWPercent,
    energyPerSpikeFemtojoules: energyFemtojoules,
    isUltraLowPowerCompliant: isUltraLowPower,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface NeuromorphicScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllNeuromorphicScenarios(): NeuromorphicScenario[] {
  const scenarios: NeuromorphicScenario[] = [];
  const cores = [
    { name: "Intel Loihi 2 Neuromorphic Core (Intel 4 FinFET)", Cm: 2.5, gL: 12.0, EL: -70, Vth: -50, Vres: -75, Isyn: 350, tref: 2.0, dt: 5.0, Vdd: 0.70 },
    { name: "BrainScaleS-2 Accelerated Physical Emulation", Cm: 1.2, gL: 8.0, EL: -65, Vth: -48, Vres: -70, Isyn: 220, tref: 1.0, dt: -8.0, Vdd: 0.80 },
    { name: "IBM TrueNorth Asynchronous Synaptic Array", Cm: 3.0, gL: 15.0, EL: -70, Vth: -52, Vres: -72, Isyn: 400, tref: 2.5, dt: 12.0, Vdd: 0.75 },
    { name: "SpiNNaker 2 Real-Time ARM Microprocessor Core", Cm: 4.0, gL: 18.0, EL: -68, Vth: -49, Vres: -74, Isyn: 480, tref: 1.5, dt: -15.0, Vdd: 0.85 },
    { name: "Nanoscale RRAM Neuromorphic Crossbar Synapse", Cm: 0.8, gL: 6.0, EL: -70, Vth: -50, Vres: -75, Isyn: 180, tref: 1.0, dt: 2.0, Vdd: 0.65 }
  ];

  for (let i = 1; i <= 25; i++) {
    const c = cores[(i - 1) % cores.length];
    const isynVar = c.Isyn * (1.0 + ((i % 5) - 2) * 0.05);
    scenarios.push({
      id: `NOCTIS-NEUROMORPHIC-${String(i).padStart(2, "0")}`,
      domain: "NEUROMORPHIC_SPICING_CIRCUITS",
      title: `LIF Membrane Integration & STDP Synaptic Invariant #${i} (${c.name})`,
      governingStandard: "IEEE Transactions on Neural Networks / Intel Loihi 2 Architecture / BrainScaleS Specification",
      execute: () => {
        const res = evaluateNeuromorphicCircuits({
          membraneCapacitancePicofarads: c.Cm,
          leakConductanceNanosiemens: c.gL,
          restingPotentialMillivolts: c.EL,
          thresholdPotentialMillivolts: c.Vth,
          resetPotentialMillivolts: c.Vres,
          inputSynapticCurrentPicoamps: isynVar,
          refractoryPeriodMilliseconds: c.tref,
          stdpTimeDeltaMs: c.dt,
          supplyVoltageVolts: c.Vdd
        });
        return {
          status: res.invariantsSatisfied ? "PASS" : "FAIL",
          score: res.invariantsSatisfied ? 100 : 0,
          verdict: res.diagnostic
        };
      }
    });
  }
  return scenarios;
}
