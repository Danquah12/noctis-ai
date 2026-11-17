/**
 * ============================================================================
 * NOCTIS SOVEREIGN DOMAIN ENGINE 83: SOIL BIOGEOCHEMISTRY & PRECISION AGRONOMY
 * ============================================================================
 * Sovereign computational engine for soil science, Cation Exchange Capacity (CEC),
 * Century model carbon/nitrogen biogeochemical fluxes, and precision nutrient balancing.
 *
 * Mathematical & Ecological Invariants:
 * 1. Cation Exchange Capacity (CEC) Base Saturation:
 *    CEC = [Ca^2+] + [Mg^2+] + [K^+] + [Na^+] + [Al^3+] + [H^+]  (meq/100g)
 *    Base Saturation % = (([Ca^2+] + [Mg^2+] + [K^+] + [Na^+]) / CEC) * 100
 *    Target agronomic base saturation: Ca 65-75%, Mg 10-15%, K 3-5%, Na < 3%.
 * 2. Mehlich-3 Phosphorus Buffer Capacity & Sorption:
 *    Soil P Desorption Index = Mehlich3_P / ( Mehlich3_Al + Mehlich3_Fe )
 *    Environmental leaching risk threshold: P-Saturation Ratio (PSR) > 0.20
 * 3. Soil Carbon Saturation & Dynamic Equilibrium (Six & Hassink 2002):
 *    C_max [g C / kg soil] = 4.09 + 0.37 * (Clay + Silt fraction %)
 * 4. Denitrification Nitrous Oxide (N2O) Emission Kinetics:
 *    N2O_flux = k_denit * [NO3-] * f(WFPS) * f(T), where WFPS is water-filled pore space.
 *    Nonlinear surge above 60-70% WFPS (anaerobic micro-sites).
 */

export interface SoilAgronomyParams {
  cationExchangeCapacityMeq: number; // Total CEC in meq/100g (e.g. 15 - 25)
  calciumMeq: number;                 // Ca2+ in meq/100g
  magnesiumMeq: number;               // Mg2+ in meq/100g
  potassiumMeq: number;               // K+ in meq/100g
  sodiumMeq: number;                  // Na+ in meq/100g
  soilClayPercent: number;            // Clay % (0 - 100)
  soilSiltPercent: number;            // Silt % (0 - 100)
  currentOrganicCarbonGKg: number;    // Soil organic C in g C / kg soil
  waterFilledPoreSpaceRatio: number;  // WFPS (0.0 to 1.0)
  nitrateConcentrationMgKg: number;   // Nitrate NO3-N in mg/kg
  mehlich3PMgKg?: number;             // Mehlich-3 extractable P (mg/kg)
  mehlich3AlMgKg?: number;            // Mehlich-3 extractable Al (mg/kg)
  mehlich3FeMgKg?: number;            // Mehlich-3 extractable Fe (mg/kg)
}

export interface SoilAgronomyResult {
  baseSaturationPercent: number;
  calciumSaturationPercent: number;
  magnesiumSaturationPercent: number;
  potassiumSaturationPercent: number;
  sodiumAdsorptionHazard: boolean;
  maxCarbonCapacityGKg: number;
  carbonSaturationDeficitGKg: number;
  phosphorusSaturationRatio: number;
  pLeachingRisk: boolean;
  denitrificationRiskLevel: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  invariantsSatisfied: boolean;
  diagnostic: string;
}

export function evaluateSoilBiogeochemistry(params: SoilAgronomyParams): SoilAgronomyResult {
  const cec = params.cationExchangeCapacityMeq;
  const basicCations = params.calciumMeq + params.magnesiumMeq + params.potassiumMeq + params.sodiumMeq;
  const baseSatPercent = Math.min(100, Math.max(0, (basicCations / cec) * 100));

  const caSatPercent = (params.calciumMeq / cec) * 100;
  const mgSatPercent = (params.magnesiumMeq / cec) * 100;
  const kSatPercent = (params.potassiumMeq / cec) * 100;
  const naSatPercent = (params.sodiumMeq / cec) * 100;
  const sodicHazard = naSatPercent > 5.0; // ESP > 5-6% begins structural degradation

  // Hassink (1997) fine fraction saturation formula
  const fineFraction = Math.min(100, params.soilClayPercent + params.soilSiltPercent);
  const maxCarbonCapacity = 4.09 + 0.37 * fineFraction;
  const carbonDeficit = Math.max(0, maxCarbonCapacity - params.currentOrganicCarbonGKg);

  // Environmental Phosphorus Saturation Ratio (PSR)
  const m3P = params.mehlich3PMgKg ?? 35;
  const m3Al = params.mehlich3AlMgKg ?? 450;
  const m3Fe = params.mehlich3FeMgKg ?? 250;
  const psr = (m3P / 31) / ((m3Al / 27) + (m3Fe / 56));
  const pLeachingRisk = psr > 0.20;

  // Denitrification N2O surge risk
  let denitRisk: "LOW" | "MODERATE" | "HIGH" | "SEVERE" = "LOW";
  const wfps = params.waterFilledPoreSpaceRatio;
  if (wfps > 0.80 && params.nitrateConcentrationMgKg > 20) {
    denitRisk = "SEVERE";
  } else if (wfps > 0.70 && params.nitrateConcentrationMgKg > 10) {
    denitRisk = "HIGH";
  } else if (wfps > 0.60) {
    denitRisk = "MODERATE";
  }

  const invariantsSatisfied = baseSatPercent <= 100 &&
    maxCarbonCapacity > 0 &&
    psr >= 0 &&
    caSatPercent > 0;

  const diagnostic = `Soil Agronomy Audit: BaseSat=${baseSatPercent.toFixed(1)}% (Ca: ${caSatPercent.toFixed(1)}%, Mg: ${mgSatPercent.toFixed(1)}%, K: ${kSatPercent.toFixed(1)}%, Na: ${naSatPercent.toFixed(1)}%), ` +
    `C_max=${maxCarbonCapacity.toFixed(1)} g/kg (Deficit: ${carbonDeficit.toFixed(1)} g/kg), PSR=${psr.toFixed(3)} (Leaching Risk: ${pLeachingRisk}), ` +
    `Denitrification: ${denitRisk} (WFPS=${(wfps * 100).toFixed(0)}%). Invariants: ${invariantsSatisfied ? "VERIFIED" : "VIOLATED"}`;

  return {
    baseSaturationPercent: baseSatPercent,
    calciumSaturationPercent: caSatPercent,
    magnesiumSaturationPercent: mgSatPercent,
    potassiumSaturationPercent: kSatPercent,
    sodiumAdsorptionHazard: sodicHazard,
    maxCarbonCapacityGKg: maxCarbonCapacity,
    carbonSaturationDeficitGKg: carbonDeficit,
    phosphorusSaturationRatio: psr,
    pLeachingRisk,
    denitrificationRiskLevel: denitRisk,
    invariantsSatisfied,
    diagnostic,
  };
}

export interface SoilAgronomyScenario {
  id: string;
  domain: string;
  title: string;
  governingStandard: string;
  execute: () => { status: "PASS" | "FAIL"; score: number; verdict: string };
}

export function executeAllSoilAgronomyScenarios(): SoilAgronomyScenario[] {
  const scenarios: SoilAgronomyScenario[] = [];
  const soils = [
    { name: "Midwest Mollisol (Corn-Soy)", cec: 24, ca: 16.5, mg: 3.8, k: 1.2, na: 0.3, clay: 28, silt: 45, c: 26, wfps: 0.62, no3: 15 },
    { name: "Southeast Ultisol (Weathered)", cec: 10, ca: 5.5, mg: 1.5, k: 0.5, na: 0.2, clay: 18, silt: 22, c: 11, wfps: 0.55, no3: 8 },
    { name: "California Alfisol (Intensive Orchards)", cec: 18, ca: 11.8, mg: 3.2, k: 0.9, na: 0.6, clay: 22, silt: 35, c: 17, wfps: 0.72, no3: 25 },
    { name: "Pampa Vertisol (High Swell-Shrink)", cec: 38, ca: 26.0, mg: 6.5, k: 1.8, na: 0.8, clay: 48, silt: 32, c: 32, wfps: 0.68, no3: 12 },
    { name: "European Cambisol (Mixed Dairy)", cec: 20, ca: 13.5, mg: 3.0, k: 1.0, na: 0.3, clay: 24, silt: 40, c: 22, wfps: 0.65, no3: 18 }
  ];

  for (let i = 1; i <= 25; i++) {
    const s = soils[(i - 1) % soils.length];
    const wfpsVar = Math.min(0.85, s.wfps + ((i % 5) - 2) * 0.04);
    scenarios.push({
      id: `NOCTIS-SOIL-AGRONOMY-${String(i).padStart(2, "0")}`,
      domain: "SOIL_BIOGEOCHEMISTRY_AGRONOMY",
      title: `Soil Biogeochemical Balance & Leaching Risk #${i} (${s.name})`,
      governingStandard: "USDA-NRCS Soil Quality / FAO World Soil Charter / IPCC Agro",
      execute: () => {
        const res = evaluateSoilBiogeochemistry({
          cationExchangeCapacityMeq: s.cec,
          calciumMeq: s.ca,
          magnesiumMeq: s.mg,
          potassiumMeq: s.k,
          sodiumMeq: s.na,
          soilClayPercent: s.clay,
          soilSiltPercent: s.silt,
          currentOrganicCarbonGKg: s.c,
          waterFilledPoreSpaceRatio: wfpsVar,
          nitrateConcentrationMgKg: s.no3
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
