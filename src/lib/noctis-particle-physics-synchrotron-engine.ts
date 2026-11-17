/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 81: PARTICLE PHYSICS & SYNCHROTRON ACCELERATORS
 * ============================================================================
 * Sovereign computational engine for high-energy beam physics, circular
 * storage rings, synchrotron radiation, and superconducting RF invariants.
 *
 * Mathematical & Physical Invariants:
 * 1. Relativistic Kinematics: gamma = 1 / sqrt(1 - beta^2), Total E = gamma * m_0 * c^2
 * 2. Synchrotron Radiation Energy Loss per Turn:
 *    U_0 = (4 * pi / 3) * (r_e / (m_0 * c^2)^3) * (E^4 / rho)
 *    For electrons: U_0 [keV] = 88.46 * (E [GeV])^4 / (rho [m])
 * 3. Synchrotron Radiation Power: P_sr = (2/3) * (e^2 * c / 4*pi*eps_0) * (gamma^4 / rho^2) * I_beam
 * 4. Critical Photon Energy: E_c = (3 * hbar * c * gamma^3) / (2 * rho)
 *    For electrons: E_c [keV] = 2.218 * (E [GeV])^3 / (rho [m])
 * 5. Superconducting RF (SRF) Invariant: Peak surface magnetic field B_pk <= B_crit (~200 mT for Nb)
 *    Accelerating gradient E_acc * (B_pk / E_acc) <= B_crit to prevent thermal quench.
 */

export interface SynchrotronBeamParams {
  beamEnergyGeV: number;          // Particle beam energy in GeV
  bendingRadiusMeters: number;    // Dipole bending radius rho in meters
  beamCurrentAmperes: number;     // Circulating beam current I in Amperes
  particleRestMassMeV?: number;   // Default 0.51099895 MeV (Electron)
  rfCavityGradientMVm?: number;   // Accelerating gradient in MV/m (default 20 MV/m)
  srfPeakToAccRatio?: number;     // B_pk / E_acc ratio in mT / (MV/m) (default 4.2)
  cavityQualityFactorQ0?: number; // Unloaded Q0 (e.g., 2e10)
}

export interface SynchrotronAuditResult {
  gammaLorentz: number;
  energyLossPerTurnKeV: number;
  totalSynchrotronPowerKW: number;
  criticalPhotonEnergyKeV: number;
  rfVoltageRequiredMV: number;
  srfPeakMagneticFieldMT: number;
  quenchSafetyMarginPercent: number;
  isQuenchSafe: boolean;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateSynchrotronBeamPhysics(params: SynchrotronBeamParams): SynchrotronAuditResult {
  const restMassMeV = params.particleRestMassMeV ?? 0.51099895; // Electron default
  const E_MeV = params.beamEnergyGeV * 1000;
  const gamma = E_MeV / restMassMeV;
  const rho = params.bendingRadiusMeters;
  const I_beam = params.beamCurrentAmperes;

  // Radiation loss per turn for electrons (keV): U_0 = 88.46 * E_GeV^4 / rho_m
  // Scaling factor accounts for non-electron mass ratio (m_e / m)^4
  const massRatio = 0.51099895 / restMassMeV;
  const U_0_keV = 88.4627 * Math.pow(params.beamEnergyGeV, 4) * Math.pow(massRatio, 4) / rho;

  // Total emitted synchrotron radiation power P = U_0 * I_beam
  // P [kW] = (U_0 [keV] * 1000 V) * (I [A]) / 1000 = U_0 [keV] * I [A]
  const totalPowerKW = U_0_keV * I_beam;

  // Critical photon energy E_c [keV] = 2.218 * E_GeV^3 * (m_e / m)^3 / rho
  const E_c_keV = 2.2182 * Math.pow(params.beamEnergyGeV, 3) * Math.pow(massRatio, 3) / rho;

  // RF overvoltage factor q >= 1.2 typically required for quantum lifetime
  const rfVoltageMV = (U_0_keV / 1000) * 1.35;

  // SRF cavity peak magnetic field calculation
  const E_acc = params.rfCavityGradientMVm ?? 20.0;
  const bToERatio = params.srfPeakToAccRatio ?? 4.2; // mT per (MV/m)
  const B_pk_mT = E_acc * bToERatio;
  const B_crit_Nb_mT = 200.0; // Niobium superheating field limit

  const quenchSafetyMargin = ((B_crit_Nb_mT - B_pk_mT) / B_crit_Nb_mT) * 100;
  const isQuenchSafe = B_pk_mT < B_crit_Nb_mT;

  const invariantsSatisfied = gamma > 1 && U_0_keV > 0 && totalPowerKW > 0 && isQuenchSafe;

  const diagnostic = `Synchrotron Audit: Gamma=${gamma.toFixed(0)}, U_0=${U_0_keV.toFixed(2)} keV/turn, ` +
    `P_sr=${totalPowerKW.toFixed(2)} kW, E_c=${E_c_keV.toFixed(2)} keV, B_pk=${B_pk_mT.toFixed(1)} mT ` +
    `(Margin: ${quenchSafetyMargin.toFixed(1)}% vs 200 mT Quench Limit). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    gammaLorentz: gamma,
    energyLossPerTurnKeV: U_0_keV,
    totalSynchrotronPowerKW: totalPowerKW,
    criticalPhotonEnergyKeV: E_c_keV,
    rfVoltageRequiredMV: rfVoltageMV,
    srfPeakMagneticFieldMT: B_pk_mT,
    quenchSafetyMarginPercent: quenchSafetyMargin,
    isQuenchSafe,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface SynchrotronScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllParticlePhysicsScenarios(): SynchrotronScenario[] {
  const scenarios: SynchrotronScenario[] = [];
  const rings = [
    { name: "ESRF-EBS (6 GeV)", E: 6.0, rho: 25.0, I: 0.20, Eacc: 20 },
    { name: "APS-U (6 GeV)", E: 6.0, rho: 27.5, I: 0.20, Eacc: 22 },
    { name: "MAX IV (3 GeV)", E: 3.0, rho: 12.0, I: 0.50, Eacc: 18 },
    { name: "SuperKEKB High-Current (7 GeV)", E: 7.0, rho: 45.0, I: 1.4, Eacc: 24 },
    { name: "PETRA IV (6 GeV)", E: 6.0, rho: 35.0, I: 0.10, Eacc: 19 }
  ];

  for (let i = 1; i <= 25; i++) {
    const ring = rings[(i - 1) % rings.length];
    const energyScale = 1.0 + ((i % 5) - 2) * 0.05;
    scenarios.push({
      id: `NOCTIS-PARTICLE-PHYSICS-${String(i).padStart(2, "0")}`,
      domain: "SYNCHROTRON_BEAM_PHYSICS",
      title: `Particle Physics & SRF Accelerator Audit #${i} (${ring.name})`,
      governingStandard: "CERN Accelerator Safety / DESY Machine Protection / IEEE NPSS",
      execute: () => {
        const res = evaluateSynchrotronBeamPhysics({
          beamEnergyGeV: ring.E * energyScale,
          bendingRadiusMeters: ring.rho,
          beamCurrentAmperes: ring.I,
          rfCavityGradientMVm: ring.Eacc,
          srfPeakToAccRatio: 4.2
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
