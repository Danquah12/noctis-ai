import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBlastRadius } from './noctis-blast-radius.ts';

describe('NOCTIS OPERATIONAL BLAST-RADIUS CALCULATOR', () => {
  test('Identifies target AD user and calculates zero collateral downtime', () => {
    const script = `
      Set-ADUser -Identity "svc_sql_transact" -Enabled $false
      klist purge -li 0x3e7
    `;
    const report = calculateBlastRadius(script);
    assert.equal(report.scopeCount, 1);
    assert.equal(report.collateralDowntimeMs, 0);
    assert.ok(report.reversibilitySlaMs <= 5000);
    assert.equal(report.containmentBoundary, 'Local Security Authority (LSA) 0x3e7 Session');
    assert.equal(report.riskTier, 'ZERO_RISK');
    assert.match(report.blastSeal, /^SIG_BLAST_/);
  });

  test('Flags destructive wildcard as HIGH_BLAST', () => {
    const script = 'rm -rf / --no-preserve-root';
    const report = calculateBlastRadius(script);
    assert.equal(report.riskTier, 'HIGH_BLAST');
    assert.equal(report.rollbackGuaranteed, false);
  });
});
