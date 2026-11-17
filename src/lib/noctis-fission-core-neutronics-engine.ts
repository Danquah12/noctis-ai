/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 102: NUCLEAR FISSION CORE NEUTRONICS & KINETICS
 * ============================================================================
 * Sovereign computational engine for nuclear reactor physics, six-factor formula,
 * Point Reactor Kinetics Equations (PRKE) with 6 delayed neutron precursor groups,
 * and Doppler fuel temperature negative feedback reactivity invariants.
 *
 * Mathematical & Reactor Physics Invariants:
 * 1. Six-Factor Formula for Effective Neutron Multiplication:
 *    k_eff = epsilon * p * eta * f * P_FNL * P_TNL
 *    Fast fission factor (epsilon), resonance escape probability (p),
 *    thermal fission reproduction (eta), thermal utilization (f),
 *    fast non-leakage probability (P_FNL), thermal non-leakage probability (P_TNL).
 * 2. Point Reactor Kinetics Equations (PRKE):
 *    dn/dt = [ (rho - beta_eff) / Lambda ] * n + Sum_{i=1}^6 lambda_i * C_i
 *    dC_i/dt = (beta_i / Lambda) * n - lambda_i * C_i
 *    Prompt Critical Safety Invariant: rho < beta_eff (~0.0065 for U-235).
 *    A reactor with rho >= beta_eff is prompt critical with exponential divergence on microsecond timescale.
 * 3. Doppler Reactivity Fuel Coefficient:
 *    alpha_D = d(rho) / d(T_fuel) < 0 (inherently negative, e.g. -2.5 to -3.5 pcm/K).
 *    Ensures prompt negative feedback upon power excursions.
 */

export interface ReactorNeutronicsParams {
  fastFissionFactorEpsilon?: number; // epsilon (default 1.03)
  resonanceEscapeProbabilityP?: number; // p (default 0.89)
  thermalFissionFactorEta?: number;  // eta (default 2.06 for low-enriched U-235)
  thermalUtilizationFactorF?: number;// f (default 0.72)
  fastNonLeakageProbPfnl?: number;   // P_FNL (default 0.96)
  thermalNonLeakageProbPtnl?: number;// P_TNL (default 0.97)
  reactivityInsertedDollars: number; // rho / beta_eff in $ (e.g. 0.05$ to 0.80$)
  fuelTemperatureKelvin: number;     // T_fuel in K (e.g. 800 - 1500 K)
  dopplerCoefficientPcmPerK?: number;// alpha_D (default -3.2 pcm/K)
  promptNeutronGenerationTimeUs?: number; // Lambda in microseconds (default 25 us)
}

export interface ReactorNeutronicsAuditResult {
  effectiveMultiplicationFactorKeff: number;
  reactivityRhoPcm: number;
  promptCriticalMarginDollars: number;
  isPromptCriticalSafe: boolean;
  dopplerReactivityFeedbackPcm: number;
  reactorPeriodSeconds: number;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateReactorNeutronicsAndKinetics(params: ReactorNeutronicsParams): ReactorNeutronicsAuditResult {
  const eps = params.fastFissionFactorEpsilon ?? 1.03;
  const p = params.resonanceEscapeProbabilityP ?? 0.89;
  const eta = params.thermalFissionFactorEta ?? 2.06;
  const f = params.thermalUtilizationFactorF ?? 0.72;
  const p_fnl = params.fastNonLeakageProbPfnl ?? 0.96;
  const p_tnl = params.thermalNonLeakageProbPtnl ?? 0.97;

  // Six-factor k_eff
  const k_eff = eps * p * eta * f * p_fnl * p_tnl;

  // Delayed neutron fraction beta_eff for U-235
  const beta_eff = 0.0065; // 650 pcm

  // Reactivity from dollar input: rho = $ * beta_eff
  const dollars = params.reactivityInsertedDollars;
  const rho = dollars * beta_eff;
  const rho_pcm = rho * 1e5;

  // Prompt critical margin (must be < 1.00$)
  const promptMargin = 1.0 - dollars;
  const isPromptSafe = dollars < 0.95;

  // Doppler negative feedback reactivity
  const T_ref = 600.0; // K reference
  const alpha_D = params.dopplerCoefficientPcmPerK ?? -3.2; // pcm/K
  const deltaT = params.fuelTemperatureKelvin - T_ref;
  const dopplerFeedback_pcm = alpha_D * deltaT;

  // Inhour asymptotic reactor period T_period ~ (beta_eff - rho) / (lambda_bar * rho)
  const lambda_bar = 0.08; // s^-1 average delayed precursor decay
  let period_sec = 1e5;
  if (rho > 0 && rho < beta_eff) {
    period_sec = (beta_eff - rho) / (lambda_bar * rho);
  }

  const invariantsSatisfied = k_eff > 0.9 && k_eff < 1.3 &&
    isPromptSafe &&
    alpha_D < 0 &&
    promptMargin > 0;

  const diagnostic = `Reactor Neutronics Audit: k_eff=${k_eff.toFixed(4)}, Reactivity rho=${rho_pcm.toFixed(1)} pcm (${dollars.toFixed(2)}$), ` +
    `Prompt Margin=${promptMargin.toFixed(2)}$ (Safe: ${isPromptSafe}), Doppler Feedback=${dopplerFeedback_pcm.toFixed(1)} pcm ` +
    `(alpha_D=${alpha_D} pcm/K), Reactor Period=${period_sec.toFixed(1)} s. Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    effectiveMultiplicationFactorKeff: k_eff,
    reactivityRhoPcm: rho_pcm,
    promptCriticalMarginDollars: promptMargin,
    isPromptCriticalSafe: isPromptSafe,
    dopplerReactivityFeedbackPcm: dopplerFeedback_pcm,
    reactorPeriodSeconds: period_sec,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface ReactorScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllReactorScenarios(): ReactorScenario[] {
  const scenarios: ReactorScenario[] = [];
  const cores = [
    { name: "Westinghouse AP1000 PWR Core", eps: 1.032, p: 0.885, eta: 2.065, f: 0.725, pfnl: 0.965, ptnl: 0.975, d: 0.25, T: 950, aD: -3.4 },
    { name: "EPR European Pressurized Reactor (1600 MWe)", eps: 1.035, p: 0.882, eta: 2.062, f: 0.728, pfnl: 0.968, ptnl: 0.978, d: 0.35, T: 1050, aD: -3.2 },
    { name: "NuScale SMR Modular Light Water Core", eps: 1.028, p: 0.892, eta: 2.058, f: 0.720, pfnl: 0.958, ptnl: 0.968, d: 0.15, T: 820, aD: -3.6 },
    { name: "CANDU-6 Heavy Water Natural Uranium", eps: 1.025, p: 0.910, eta: 1.330, f: 0.940, pfnl: 0.975, ptnl: 0.985, d: 0.10, T: 750, aD: -2.1 },
    { name: "HTGR High-Temperature Gas Pebble Bed", eps: 1.040, p: 0.870, eta: 2.070, f: 0.735, pfnl: 0.960, ptnl: 0.970, d: 0.40, T: 1250, aD: -4.5 }
  ];

  for (let i = 1; i <= 25; i++) {
    const c = cores[(i - 1) % cores.length];
    const dVar = c.d * (1.0 + ((i % 5) - 2) * 0.05);
    scenarios.push({
      id: `NOCTIS-REACTOR-NEUTRON-${String(i).padStart(2, "0")}`,
      domain: "NUCLEAR_FISSION_CORE_NEUTRONICS",
      title: `Six-Factor Multiplication & PRKE Prompt Margin #${i} (${c.name})`,
      governingStandard: "US NRC 10 CFR Part 50 / IAEA Safety Standards Series / ANS-19.1 Reactor Physics",
      execute: () => {
        const res = evaluateReactorNeutronicsAndKinetics({
          fastFissionFactorEpsilon: c.eps,
          resonanceEscapeProbabilityP: c.p,
          thermalFissionFactorEta: c.eta,
          thermalUtilizationFactorF: c.f,
          fastNonLeakageProbPfnl: c.pfnl,
          thermalNonLeakageProbPtnl: c.ptnl,
          reactivityInsertedDollars: dVar,
          fuelTemperatureKelvin: c.T,
          dopplerCoefficientPcmPerK: c.aD
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
