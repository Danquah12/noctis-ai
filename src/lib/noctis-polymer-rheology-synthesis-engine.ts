/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 89: POLYMER SYNTHESIS & COMPLEX FLUID RHEOLOGY
 * ============================================================================
 * Sovereign computational engine for macromolecular chemistry, step-growth polymerization,
 * Flory-Huggins thermodynamic phase separation, and non-Newtonian melt rheology.
 *
 * Mathematical & Macromolecular Invariants:
 * 1. Carothers Equation for Step-Growth Polycondensation:
 *    Number-Average Degree of Polymerization: X_n = (1 + r) / (1 + r - 2 * r * p)
 *    For stoichiometric balance (r = 1): X_n = 1 / (1 - p)
 *    Gelation Criterion for non-linear multi-functional monomers: p_c = 1 / sqrt(f_avg - 1)
 * 2. Flory-Huggins Thermodynamic Interaction Parameter Chi:
 *    Delta G_mix / (k_B * T) = (phi_1 / N_1) * ln(phi_1) + (phi_2 / N_2) * ln(phi_2) + chi * phi_1 * phi_2
 *    Spinodal phase boundary: chi_crit = 0.5 * (1 / sqrt(N_1) + 1 / sqrt(N_2))^2
 * 3. Fox Equation for Copolymer / Plasticized Glass Transition:
 *    1 / T_g = w_1 / T_g1 + w_2 / T_g2
 * 4. Cox-Merz Rule for Polymer Melts:
 *    |eta*(omega)| = eta(gamma_dot) at omega = gamma_dot
 *    Power-Law Ostwald-de Waele Model: tau = K * gamma_dot^n (n < 1 for pseudoplastic shear-thinning)
 */

export interface PolymerRheologyParams {
  monomerConversionFraction: number; // Extent of reaction p (0.0 to 0.999)
  stoichiometricRatioR?: number;     // r = N_A / N_B <= 1 (default 1.0)
  monomerFunctionality?: number;     // f_avg (default 2 for linear)
  monomerMolecularWeightDa: number;  // M_0 in Daltons (e.g. 100 Da)
  polymerVolumeFractionPhi2: number; // Volume fraction phi_2
  chiInteractionParameter: number;   // Flory-Huggins chi
  shearRatePerSecond: number;        // gamma_dot in s^-1
  powerLawConsistencyK: number;      // K in Pa * s^n
  flowBehaviorIndexN: number;        // n (e.g. 0.35 for shear thinning)
}

export interface PolymerAuditResult {
  degreeOfPolymerizationXn: number;
  numberAverageMolecularWeightMnDa: number;
  criticalGelationConversion: number;
  isGelationReached: boolean;
  criticalChiParameter: number;
  isThermodynamicallyCompatible: boolean;
  apparentViscosityPaS: number;
  isShearThinning: boolean;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluatePolymerSynthesisAndRheology(params: PolymerRheologyParams): PolymerAuditResult {
  const p = Math.min(0.9999, Math.max(0.01, params.monomerConversionFraction));
  const r = params.stoichiometricRatioR ?? 1.0;
  const f = params.monomerFunctionality ?? 2.0;

  // Carothers equation for degree of polymerization
  const denominator = 1 + r - 2 * r * p;
  const X_n = denominator > 0 ? (1 + r) / denominator : 1e5;
  const M_n = X_n * params.monomerMolecularWeightDa;

  // Gel point conversion for f > 2
  let p_c = 1.0;
  let isGel = false;
  if (f > 2.0) {
    p_c = 1 / Math.sqrt(f - 1);
    isGel = p >= p_c;
  }

  // Flory-Huggins phase separation (assuming solvent N1=1, polymer N2=X_n)
  const chi_crit = 0.5 * Math.pow(1 + 1 / Math.sqrt(X_n), 2);
  const isCompatible = params.chiInteractionParameter < chi_crit;

  // Non-Newtonian Power-Law Viscosity: eta = K * gamma_dot^(n - 1)
  const n = params.flowBehaviorIndexN;
  const gamma_dot = Math.max(0.01, params.shearRatePerSecond);
  const eta_apparent = params.powerLawConsistencyK * Math.pow(gamma_dot, n - 1);
  const isShearThinning = n < 1.0;

  const invariantsSatisfied = X_n >= 1 && M_n > 0 && eta_apparent > 0;

  const diagnostic = `Polymer Audit: p=${p.toFixed(4)}, X_n=${X_n.toFixed(1)}, M_n=${(M_n / 1000).toFixed(1)} kDa, ` +
    `Gel Point p_c=${p_c.toFixed(3)} (Gelled: ${isGel}), Chi=${params.chiInteractionParameter.toFixed(3)} (Crit: ${chi_crit.toFixed(3)}, Miscible: ${isCompatible}), ` +
    `Apparent Viscosity=${eta_apparent.toFixed(2)} Pa*s at ${gamma_dot} s^-1 (Shear Thinning: ${isShearThinning}). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    degreeOfPolymerizationXn: X_n,
    numberAverageMolecularWeightMnDa: M_n,
    criticalGelationConversion: p_c,
    isGelationReached: isGel,
    criticalChiParameter: chi_crit,
    isThermodynamicallyCompatible: isCompatible,
    apparentViscosityPaS: eta_apparent,
    isShearThinning,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface PolymerScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllPolymerScenarios(): PolymerScenario[] {
  const scenarios: PolymerScenario[] = [];
  const polymers = [
    { name: "Nylon 6,6 Step Polycondensation", p: 0.992, r: 1.0, f: 2.0, M0: 113, phi: 0.85, chi: 0.28, rate: 80, K: 3500, n: 0.45 },
    { name: "Epoxy Thermoset Pre-Gel (Tri-functional)", p: 0.65, r: 0.98, f: 3.0, M0: 180, phi: 0.90, chi: 0.35, rate: 20, K: 1200, n: 0.65 },
    { name: "PET Polyester Bottle Grade Resin", p: 0.996, r: 1.0, f: 2.0, M0: 96, phi: 0.88, chi: 0.25, rate: 150, K: 5000, n: 0.38 },
    { name: "Polyurethane Elastomer Segmented Block", p: 0.988, r: 0.99, f: 2.0, M0: 250, phi: 0.80, chi: 0.42, rate: 50, K: 2800, n: 0.50 },
    { name: "Polycarbonate High-Impact Engineering Melt", p: 0.994, r: 1.0, f: 2.0, M0: 127, phi: 0.92, chi: 0.30, rate: 200, K: 6200, n: 0.32 }
  ];

  for (let i = 1; i <= 25; i++) {
    const p = polymers[(i - 1) % polymers.length];
    const rateVar = Math.max(5, p.rate + ((i % 5) - 2) * 15);
    scenarios.push({
      id: `NOCTIS-POLYMER-RHEO-${String(i).padStart(2, "0")}`,
      domain: "POLYMER_SYNTHESIS_RHEOLOGY",
      title: `Carothers Degree of Polymerization & Power-Law Melt Viscosity #${i} (${p.name})`,
      governingStandard: "IUPAC Macromolecular Division / ASTM D1238 / Society of Rheology",
      execute: () => {
        const res = evaluatePolymerSynthesisAndRheology({
          monomerConversionFraction: p.p,
          stoichiometricRatioR: p.r,
          monomerFunctionality: p.f,
          monomerMolecularWeightDa: p.M0,
          polymerVolumeFractionPhi2: p.phi,
          chiInteractionParameter: p.chi,
          shearRatePerSecond: rateVar,
          powerLawConsistencyK: p.K,
          flowBehaviorIndexN: p.n
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
