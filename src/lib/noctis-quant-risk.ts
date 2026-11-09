/**
 * NOCTIS QUANTITATIVE FINANCE & STOCHASTIC RISK ENGINE
 * Subsystem Code: NQRE-FIN-001 / RISK-2026
 *
 * Implements:
 * 1. Black-Scholes European Option Analytical Pricing & First/Second-Order Greeks (Delta, Gamma, Vega, Theta, Rho)
 * 2. Monte Carlo Value-at-Risk (VaR 95% & 99%) and Expected Shortfall (CVaR)
 * 3. Markowitz Mean-Variance Portfolio Optimization & Tangency Portfolio Sharpe Ratio
 */

export interface BlackScholesGreeks {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

export interface MonteCarloVarResult {
  horizonDays: number;
  confidencePercent: number;
  portfolioValue: number;
  valueAtRiskAmount: number;
  valueAtRiskPercent: number;
  conditionalVarExpectedShortfallAmount: number;
  simulatedPathsCount: number;
}

export interface PortfolioOptimizationResult {
  assetTickers: string[];
  optimalWeights: number[];
  expectedReturnAnnual: number;
  volatilityAnnual: number;
  sharpeRatio: number;
}

// Standard normal cumulative distribution function approximation (Abramowitz and Stegun)
function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

function normalPdf(x: number): number {
  return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Analytical Black-Scholes Option Pricing and Greeks
 */
export function calculateBlackScholesOption(params: {
  spotPriceS: number;
  strikePriceK: number;
  timeToMaturityYearsT: number;
  riskFreeRateR: number; // e.g. 0.05 for 5%
  volatilitySigma: number; // e.g. 0.20 for 20%
  optionType: "CALL" | "PUT";
}): BlackScholesGreeks {
  const { spotPriceS: S, strikePriceK: K, timeToMaturityYearsT: T, riskFreeRateR: r, volatilitySigma: sigma, optionType } = params;

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);
  const npd1 = normalPdf(d1);

  let price = 0;
  let delta = 0;
  let theta = 0;
  let rho = 0;

  if (optionType === "CALL") {
    price = S * nd1 - K * Math.exp(-r * T) * nd2;
    delta = nd1;
    theta = -(S * npd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * nd2;
    rho = K * T * Math.exp(-r * T) * nd2;
  } else {
    price = K * Math.exp(-r * T) * normalCdf(-d2) - S * normalCdf(-d1);
    delta = nd1 - 1.0;
    theta = -(S * npd1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCdf(-d2);
    rho = -K * T * Math.exp(-r * T) * normalCdf(-d2);
  }

  const gamma = npd1 / (S * sigma * Math.sqrt(T));
  const vega = S * npd1 * Math.sqrt(T);

  return {
    price: Number(price.toFixed(4)),
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(6)),
    vega: Number(vega.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    rho: Number(rho.toFixed(4)),
  };
}

/**
 * Monte Carlo Value-at-Risk (VaR) and Conditional Value-at-Risk (CVaR)
 */
export function calculateMonteCarloVaR(params: {
  portfolioValue: number;
  annualMeanReturn: number;
  annualVolatility: number;
  horizonDays: number;
  confidencePercent: 95 | 99;
  simulatedPaths?: number;
}): MonteCarloVarResult {
  const {
    portfolioValue,
    annualMeanReturn,
    annualVolatility,
    horizonDays,
    confidencePercent,
    simulatedPaths = 10000,
  } = params;

  const dt = horizonDays / 252; // Trading days
  const drift = (annualMeanReturn - 0.5 * annualVolatility * annualVolatility) * dt;
  const diffusion = annualVolatility * Math.sqrt(dt);

  const returns: number[] = [];
  // Box-Muller transform for pseudo-random normal variates
  for (let i = 0; i < simulatedPaths; i++) {
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const periodicReturn = Math.exp(drift + diffusion * z) - 1.0;
    returns.push(periodicReturn);
  }

  returns.sort((a, b) => a - b);

  const alphaIndex = Math.floor(simulatedPaths * (1 - confidencePercent / 100));
  const varReturn = -returns[alphaIndex];
  const varAmount = Number((portfolioValue * Math.max(0, varReturn)).toFixed(2));
  const varPercent = Number((varReturn * 100).toFixed(2));

  // CVaR (Expected Shortfall): average of losses beyond VaR threshold
  const tailReturns = returns.slice(0, alphaIndex + 1);
  const avgTailLoss = -(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length);
  const cvarAmount = Number((portfolioValue * Math.max(0, avgTailLoss)).toFixed(2));

  return {
    horizonDays,
    confidencePercent,
    portfolioValue,
    valueAtRiskAmount: varAmount,
    valueAtRiskPercent: varPercent,
    conditionalVarExpectedShortfallAmount: cvarAmount,
    simulatedPathsCount: simulatedPaths,
  };
}

/**
 * Analytical 2-Asset Markowitz Tangency Optimization
 */
export function calculateMarkowitzTangencyPortfolio(params: {
  assetTickers: [string, string];
  expectedReturns: [number, number]; // e.g. [0.12, 0.07]
  volatilities: [number, number]; // e.g. [0.20, 0.10]
  correlation: number; // e.g. 0.3
  riskFreeRate: number; // e.g. 0.04
}): PortfolioOptimizationResult {
  const [r1, r2] = params.expectedReturns;
  const [s1, s2] = params.volatilities;
  const rho = params.correlation;
  const rf = params.riskFreeRate;

  const cov = rho * s1 * s2;

  // Tangency weights for 2 assets:
  // w1 = ((r1 - rf)*s2^2 - (r2 - rf)*cov) / ((r1 - rf)*s2^2 + (r2 - rf)*s1^2 - (r1 + r2 - 2rf)*cov)
  const num = (r1 - rf) * s2 * s2 - (r2 - rf) * cov;
  const den = (r1 - rf) * s2 * s2 + (r2 - rf) * s1 * s1 - (r1 - rf + (r2 - rf)) * cov;

  let w1 = den !== 0 ? num / den : 0.5;
  w1 = Math.max(0, Math.min(1, w1)); // Long-only constraint
  const w2 = 1.0 - w1;

  const expReturn = w1 * r1 + w2 * r2;
  const variance = w1 * w1 * s1 * s1 + w2 * w2 * s2 * s2 + 2 * w1 * w2 * cov;
  const vol = Math.sqrt(Math.max(0, variance));
  const sharpe = vol > 0 ? (expReturn - rf) / vol : 0;

  return {
    assetTickers: params.assetTickers,
    optimalWeights: [Number(w1.toFixed(4)), Number(w2.toFixed(4))],
    expectedReturnAnnual: Number(expReturn.toFixed(4)),
    volatilityAnnual: Number(vol.toFixed(4)),
    sharpeRatio: Number(sharpe.toFixed(4)),
  };
}
