import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBlackScholesOption,
  calculateMonteCarloVaR,
  calculateMarkowitzTangencyPortfolio,
} from "./noctis-quant-risk.ts";

test("NOCTIS QUANTITATIVE FINANCE & STOCHASTIC RISK ENGINE (NQRE-FIN-001)", async (t) => {
  await t.test("Black-Scholes computes European call and put price with correct Greeks", () => {
    // S = 100, K = 100, T = 1.0, r = 0.05, sigma = 0.20
    const call = calculateBlackScholesOption({
      spotPriceS: 100,
      strikePriceK: 100,
      timeToMaturityYearsT: 1.0,
      riskFreeRateR: 0.05,
      volatilitySigma: 0.20,
      optionType: "CALL",
    });

    // Call price should be approximately 10.45
    assert.ok(call.price > 10.0 && call.price < 11.0);
    assert.ok(call.delta > 0.60 && call.delta < 0.68);
    assert.ok(call.gamma > 0.015 && call.gamma < 0.022);
    assert.ok(call.vega > 35 && call.vega < 40);

    const put = calculateBlackScholesOption({
      spotPriceS: 100,
      strikePriceK: 100,
      timeToMaturityYearsT: 1.0,
      riskFreeRateR: 0.05,
      volatilitySigma: 0.20,
      optionType: "PUT",
    });

    // Put-Call Parity: C - P = S - K * exp(-rT) -> 10.45 - P = 100 - 100*exp(-0.05) ~ 4.88 -> P ~ 5.57
    assert.ok(put.price > 5.0 && put.price < 6.0);
    assert.ok(put.delta < 0 && put.delta > -0.40);
  });

  await t.test("Monte Carlo VaR computes positive 95% and 99% risk bounds", () => {
    const var95 = calculateMonteCarloVaR({
      portfolioValue: 1000000,
      annualMeanReturn: 0.08,
      annualVolatility: 0.16,
      horizonDays: 10,
      confidencePercent: 95,
      simulatedPaths: 5000,
    });

    assert.equal(var95.portfolioValue, 1000000);
    assert.ok(var95.valueAtRiskAmount > 20000 && var95.valueAtRiskAmount < 70000);
    assert.ok(var95.conditionalVarExpectedShortfallAmount >= var95.valueAtRiskAmount);
  });

  await t.test("Markowitz Tangency optimizes portfolio weights with positive Sharpe ratio", () => {
    const port = calculateMarkowitzTangencyPortfolio({
      assetTickers: ["EQUITY_INDEX", "GOVT_BOND"],
      expectedReturns: [0.10, 0.04],
      volatilities: [0.18, 0.06],
      correlation: 0.10,
      riskFreeRate: 0.03,
    });

    assert.equal(port.optimalWeights.length, 2);
    assert.equal(Number((port.optimalWeights[0] + port.optimalWeights[1]).toFixed(2)), 1.0);
    assert.ok(port.sharpeRatio > 0.40);
  });
});
