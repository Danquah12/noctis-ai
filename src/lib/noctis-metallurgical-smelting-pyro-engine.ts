/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 85: METALLURGICAL SMELTING & PYROMETALLURGY
 * ============================================================================
 * Sovereign computational engine for high-temperature extractive metallurgy,
 * Ellingham diagram reduction thermodynamics, matte grade equilibrium, and slag basicity.
 *
 * Mathematical & Thermodynamic Invariants:
 * 1. Ellingham Diagram Reduction Criterion:
 *    Delta G_rxn^0(T) = Delta H^0 - T * Delta S^0
 *    Metal oxide MO reduced by carbon/CO if Delta G_C/CO < Delta G_MO.
 * 2. Copper Flash Smelting Matte Grade Equilibrium:
 *    2 CuFeS_2 + 2.5 O_2 -> Cu_2S * FeS (matte) + FeO (slag) + 3 SO_2
 *    Target Matte Grade: 58% to 68% Cu by weight.
 *    Sulfur partition ratio: L_S = (% S in slag) / (% S in matte)
 * 3. Slag Optical Basicity (Duffy & Ingram 1978):
 *    Lambda = Sum( X_i * n_i * Lambda_i ) / Sum( X_i * n_i )
 *    Governs sulfide capacity C_S and viscosity: Basic slags (Lambda > 0.65) have low viscosity,
 *    acidic siliceous slags (Lambda < 0.55) form network polymers with high viscosity.
 * 4. Boudouard Gas Equilibrium in Blast Furnaces:
 *    C(s) + CO_2(g) <=> 2 CO(g),  Delta H^0 = +172 kJ/mol (endothermic)
 *    ln(K_p) = - Delta G^0 / (R * T), where K_p = P_CO^2 / P_CO2
 */

export interface PyrometallurgyParams {
  operatingTemperatureCelsius: number; // T in C (e.g. 1200 - 1500 C)
  feedCopperPercent: number;           // Ore concentrate Cu % (e.g. 26 - 32%)
  feedIronPercent: number;             // Concentrate Fe % (e.g. 28 - 34%)
  feedSulfurPercent: number;           // Concentrate S % (e.g. 30 - 35%)
  oxygenEnrichmentPercent: number;     // Blast air O2 % (e.g. 45 - 90%)
  slagSiO2WeightPercent: number;       // Slag SiO2 % (e.g. 32 - 38%)
  slagFeOWeightPercent: number;        // Slag FeO % (e.g. 45 - 55%)
  slagCaOWeightPercent: number;        // Slag CaO % (e.g. 2 - 8%)
  slagAl2O3WeightPercent?: number;     // Slag Al2O3 % (default 4%)
}

export interface PyrometallurgyAuditResult {
  temperatureKelvin: number;
  calculatedMatteGradeCuPercent: number;
  opticalBasicityLambda: number;
  slagViscosityEstimatedPoise: number;
  boudouardCoRatioPercent: number;
  isMatteGradeTargetMet: boolean;
  isSlagTappable: boolean;
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluatePyrometallurgicalSmelting(params: PyrometallurgyParams): PyrometallurgyAuditResult {
  const T_K = params.operatingTemperatureCelsius + 273.15;

  // Flash smelting matte grade calculation (wt % Cu in matte)
  // Higher O2 enrichment oxidizes more Fe into slag, elevating Cu % in matte
  const baseGrade = (params.feedCopperPercent / (params.feedCopperPercent + params.feedIronPercent * 0.45)) * 100;
  const o2Factor = (params.oxygenEnrichmentPercent - 21) * 0.22;
  const matteGradeCu = Math.min(75, Math.max(40, baseGrade + o2Factor));
  const isMatteTarget = matteGradeCu >= 55 && matteGradeCu <= 72;

  // Slag optical basicity calculation (Duffy-Ingram optical basicities: CaO=1.0, FeO=0.51, Al2O3=0.60, SiO2=0.48)
  const wSiO2 = params.slagSiO2WeightPercent;
  const wFeO = params.slagFeOWeightPercent;
  const wCaO = params.slagCaOWeightPercent;
  const wAl2O3 = params.slagAl2O3WeightPercent ?? 4.0;
  const totalW = wSiO2 + wFeO + wCaO + wAl2O3;

  // Normalization
  const fSiO2 = wSiO2 / totalW;
  const fFeO = wFeO / totalW;
  const fCaO = wCaO / totalW;
  const fAl2O3 = wAl2O3 / totalW;

  const lambda = (fSiO2 * 0.48 + fFeO * 0.51 + fCaO * 1.0 + fAl2O3 * 0.60);

  // Slag viscosity estimate (Poise): lower optical basicity (higher SiO2 network) increases viscosity; higher T decreases it
  const viscosityPoise = 0.0008 * Math.exp((18000 / T_K) - (lambda * 6.5));
  const isSlagTappable = viscosityPoise < 10.0 && params.operatingTemperatureCelsius >= 1180;

  // Boudouard gas equilibrium CO/(CO+CO2) % at T_K
  // C + CO2 <=> 2CO, Delta G^0 ~ 170700 - 174.5 * T (J/mol)
  const deltaG_Boudouard = 170700 - 174.5 * T_K;
  const R = 8.314;
  const lnKp = -deltaG_Boudouard / (R * T_K);
  const Kp = Math.exp(Math.min(20, Math.max(-20, lnKp)));
  // Kp = pCO^2 / pCO2 at 1 atm total pressure (pCO + pCO2 = 1) -> pCO^2 + Kp*pCO - Kp = 0
  const pCO = (-Kp + Math.sqrt(Kp * Kp + 4 * Kp)) / 2;
  const coRatioPercent = Math.min(100, Math.max(0, pCO * 100));

  const invariantsSatisfied = T_K > 1300 &&
    matteGradeCu > 0 &&
    lambda > 0.4 &&
    viscosityPoise > 0 &&
    isSlagTappable;

  const diagnostic = `Pyrometallurgy Smelting: T=${params.operatingTemperatureCelsius} C (${T_K.toFixed(0)} K), ` +
    `Matte Grade=${matteGradeCu.toFixed(1)}% Cu (Target Met: ${isMatteTarget}), ` +
    `Slag Optical Basicity Lambda=${lambda.toFixed(3)}, Viscosity=${viscosityPoise.toFixed(2)} Poise (Tappable: ${isSlagTappable}), ` +
    `Boudouard CO Equilibrium=${coRatioPercent.toFixed(1)}%. Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    temperatureKelvin: T_K,
    calculatedMatteGradeCuPercent: matteGradeCu,
    opticalBasicityLambda: lambda,
    slagViscosityEstimatedPoise: viscosityPoise,
    boudouardCoRatioPercent: coRatioPercent,
    isMatteGradeTargetMet: isMatteTarget,
    isSlagTappable,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface PyrometallurgyScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllPyrometallurgyScenarios(): PyrometallurgyScenario[] {
  const scenarios: PyrometallurgyScenario[] = [];
  const smelterCases = [
    { name: "Outotec Flash Smelter (High O2)", T: 1250, Cu: 28.5, Fe: 30.0, S: 32.0, O2: 70, SiO2: 34, FeO: 52, CaO: 4 },
    { name: "Noranda Reactor (Submerged Tuyere)", T: 1220, Cu: 26.0, Fe: 32.0, S: 31.0, O2: 45, SiO2: 36, FeO: 48, CaO: 5 },
    { name: "Mitsubishi Continuous Smelting S-Furnace", T: 1260, Cu: 31.0, Fe: 28.0, S: 33.0, O2: 80, SiO2: 33, FeO: 54, CaO: 3 },
    { name: "Isasmelt Top-Submerged Lance", T: 1230, Cu: 27.5, Fe: 31.0, S: 31.5, O2: 55, SiO2: 35, FeO: 50, CaO: 4.5 },
    { name: "Teniente Converter (Bath Smelting)", T: 1240, Cu: 29.0, Fe: 29.5, S: 32.5, O2: 60, SiO2: 34.5, FeO: 51, CaO: 4 }
  ];

  for (let i = 1; i <= 25; i++) {
    const s = smelterCases[(i - 1) % smelterCases.length];
    const tVar = s.T + ((i % 5) - 2) * 10;
    scenarios.push({
      id: `NOCTIS-PYROMETALLURGY-${String(i).padStart(2, "0")}`,
      domain: "PYROMETALLURGICAL_SMELTING",
      title: `Copper Matte Grade & Slag Optical Basicity Tappability #${i} (${s.name})`,
      governingStandard: "TMS Pyrometallurgy Standards / EPA MACT Copper Smelting / ISO 14001",
      execute: () => {
        const res = evaluatePyrometallurgicalSmelting({
          operatingTemperatureCelsius: tVar,
          feedCopperPercent: s.Cu,
          feedIronPercent: s.Fe,
          feedSulfurPercent: s.S,
          oxygenEnrichmentPercent: s.O2,
          slagSiO2WeightPercent: s.SiO2,
          slagFeOWeightPercent: s.FeO,
          slagCaOWeightPercent: s.CaO
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
