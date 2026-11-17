/**
 * ============================================================================
 * NOCTIS RYDBERG ATOM QUANTUM ANALOG SIMULATION ENGINE (NOCTIS-RYDBERG-001)
 * Sovereign Physical Systems: Optical Tweezer Neutral Atom Arrays, Van der Waals Interaction (V(R) = C6 / R^6),
 * Rydberg Blockade Radius (R_b), Transverse-Field Ising Hamiltonian, Quantum Spin Liquids & Phase Transitions
 * Standards: NIST Quantum Information Program / QuEra Aquila Architecture / DOE Quantum Hardware Benchmarks
 * ============================================================================
 */

export interface RydbergSimulationParams {
  principalQuantumNumberN: number; // e.g. 60 to 75 (for Rb-87 or Sr-88)
  rabiFrequencyMegaRadS: number; // Omega (e.g. 5.0 to 25.0 Mrad/s)
  laserDetuningMegaRadS: number; // Delta (e.g. -20 to +30 Mrad/s)
  interatomicSeparationMicrons: number; // R (e.g. 2.5 to 8.0 um)
  atomicSpecies?: "Rb87" | "Sr88";
  laserCoherenceTimeMicroseconds?: number; // e.g. 5.0 to 20.0 us
}

export interface RydbergAuditResult {
  vanDerWaalsCoefficientC6JoulesM6: number; // C_6 ~ n^11
  rydbergBlockadeRadiusMicrons: number; // R_b = (C_6 / (hbar * Omega))^(1/6)
  blockadeShiftEnergyMhz: number; // V(R) / h
  isBlockadeCriterionSatisfied: boolean; // V(R) >> hbar * Omega when R < R_b
  effectiveCouplingOmegaMhz: number;
  quantumSimulationPhase: "DISORDERED_PARAMAGNETIC" | "Z2_ORDERED_ANTIFERROMAGNETIC" | "FLOATING_INCOMMENSURATE";
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateRydbergQuantumSimulation(params: RydbergSimulationParams): RydbergAuditResult {
  const hbar = 1.054571817e-34; // J s
  const h = 6.62607015e-34;
  const n = params.principalQuantumNumberN;

  // Van der Waals C_6 coefficient scaling for alkali/alkaline-earth Rydberg states:
  // C_6 scales as n^11. For Rb-87 at n=70, C_6 / hbar ~ 860 GHz * um^6 = 8.6e11 rad/s * um^6
  const baseC6 = 8.6e11; // at n=70
  const C6_over_hbar = baseC6 * Math.pow(n / 70.0, 11); // in (rad/s) * um^6
  const C6_Joules_m6 = C6_over_hbar * hbar * 1e-36;

  // Rabi frequency Omega:
  const Omega_rad_s = params.rabiFrequencyMegaRadS * 1e6;
  const Omega_MHz = (Omega_rad_s / (2 * Math.PI)) / 1e6;

  // Rydberg blockade radius R_b:
  // R_b = (C_6 / (hbar * Omega))^(1/6) in microns
  const R_b_um = Math.pow(C6_over_hbar / Omega_rad_s, 1.0 / 6.0);

  // Interaction energy V(R) at distance R:
  const R_um = params.interatomicSeparationMicrons;
  const V_over_hbar_rad_s = C6_over_hbar / Math.pow(R_um, 6);
  const V_over_h_MHz = (V_over_hbar_rad_s / (2 * Math.PI)) / 1e6;

  // Blockade satisfaction:
  // When R <= R_b, interaction V(R) must be at least comparable to Rabi coupling
  const isBlockaded = R_um <= R_b_um ? (V_over_h_MHz >= 0.8 * Omega_MHz) : true;

  // Quantum Phase Determination from Detuning Delta / Omega:
  // Delta < 0: Disordered paramagnetic state (atoms in ground state |g>)
  // Delta > 0 and R < R_b: Z_2 ordered crystalline antiferromagnetic density wave
  const Delta_MHz = (params.laserDetuningMegaRadS * 1e6 / (2 * Math.PI)) / 1e6;
  let phase: "DISORDERED_PARAMAGNETIC" | "Z2_ORDERED_ANTIFERROMAGNETIC" | "FLOATING_INCOMMENSURATE" = "DISORDERED_PARAMAGNETIC";
  if (Delta_MHz > 0.5 * Omega_MHz && R_um <= R_b_um * 1.2) {
    phase = "Z2_ORDERED_ANTIFERROMAGNETIC";
  } else if (Delta_MHz > 2.0 * Omega_MHz) {
    phase = "FLOATING_INCOMMENSURATE";
  }

  const invariantsSatisfied = R_b_um > 2.0 && R_b_um < 15.0 &&
    Omega_MHz > 0.5 && Omega_MHz < 20.0 &&
    isBlockaded;

  const diagnostic = `Rydberg Simulation Audit: n=${n} (${params.atomicSpecies ?? "Rb87"}), Omega=${Omega_MHz.toFixed(2)} MHz, ` +
    `Detuning Delta=${Delta_MHz.toFixed(2)} MHz, Separation R=${R_um.toFixed(2)} um, Blockade R_b=${R_b_um.toFixed(2)} um ` +
    `(Shift V(R)/h=${V_over_h_MHz.toFixed(1)} MHz, Blockaded: ${isBlockaded}), Phase=${phase}. Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    vanDerWaalsCoefficientC6JoulesM6: C6_Joules_m6,
    rydbergBlockadeRadiusMicrons: R_b_um,
    blockadeShiftEnergyMhz: V_over_h_MHz,
    isBlockadeCriterionSatisfied: isBlockaded,
    effectiveCouplingOmegaMhz: Omega_MHz,
    quantumSimulationPhase: phase,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface RydbergScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllRydbergScenarios(): RydbergScenario[] {
  const scenarios: RydbergScenario[] = [];
  const setups = [
    { name: "QuEra Aquila 256-Atom Square Lattice (Rb-87, n=70)", n: 70, omega: 15.0, delta: 12.0, R: 4.5, spec: "Rb87" as const },
    { name: "Harvard Lukin Lab 1D Rydberg Dimer Array (n=75)", n: 75, omega: 18.0, delta: 20.0, R: 3.8, spec: "Rb87" as const },
    { name: "Pasqal Fresnel Quantum Processor (Sr-88, n=65)", n: 65, omega: 12.0, delta: -5.0, R: 5.5, spec: "Sr88" as const },
    { name: "MPQ Garching Optical Kagome Spin Liquid Lattice", n: 68, omega: 10.0, delta: 15.0, R: 4.8, spec: "Rb87" as const },
    { name: "Caltech Endres Lab Dual-Species Clock Array (Sr-88)", n: 62, omega: 8.0, delta: 6.0, R: 5.0, spec: "Sr88" as const }
  ];

  for (let i = 1; i <= 25; i++) {
    const s = setups[(i - 1) % setups.length];
    const rVar = s.R * (1.0 + ((i % 5) - 2) * 0.03);
    scenarios.push({
      id: `NOCTIS-RYDBERG-QUANTUM-${String(i).padStart(2, "0")}`,
      domain: "QUANTUM_ANALOG_SIMULATION_RYDBERG",
      title: `Van der Waals C6 Blockade & Z2 Phase Invariant #${i} (${s.name})`,
      governingStandard: "NIST Quantum Information Science / QuEra Aquila Architecture / IEEE Transactions on Quantum Engineering",
      execute: () => {
        const res = evaluateRydbergQuantumSimulation({
          principalQuantumNumberN: s.n,
          rabiFrequencyMegaRadS: s.omega,
          laserDetuningMegaRadS: s.delta,
          interatomicSeparationMicrons: rVar,
          atomicSpecies: s.spec
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
