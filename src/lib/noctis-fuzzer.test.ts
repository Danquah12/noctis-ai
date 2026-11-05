import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { runPreMortemFuzzer } from './noctis-fuzzer.ts';

describe('NOCTIS PRE-MORTEM ADVERSARIAL INVARIANT FUZZER', () => {
  test('Neutralizes concurrency race condition when mutex/CAS is present', () => {
    const code = `
      async function dispatch(task) {
        await redis.set(lockKey, token, 'PX', 5000, 'NX');
        await redis.set(allocationKey, task.id);
      }
    `;
    const report = runPreMortemFuzzer(code);
    assert.equal(report.totalVectors, 4);
    assert.equal(report.invariantsPassed, true);
    assert.match(report.fuzzerSeal, /^SIG_FUZZER_/);
  });

  test('Validates reciprocal division for non-linear loss and flags linear trap', () => {
    const validMath = 'Total Net Fuel: 1038420 / (1 - 0.12) = 1180022 gallons with spoilage.';
    const report = runPreMortemFuzzer(validMath);
    const spoilageVector = report.vectors.find((v) => v.vectorId === 'VEC-SPOILAGE-002');
    assert.ok(spoilageVector?.neutralized);
  });

  test('Enforces paired rollback on infrastructure mutation scripts', () => {
    const script = `
      Set-ADUser -Identity "svc_sql" -Clear ServicePrincipalNames
      # Paired Rollback Script: Set-ADUser -Identity "svc_sql" -Add @{ServicePrincipalNames = "MSSQLSvc/db01"}
    `;
    const report = runPreMortemFuzzer(script);
    const rollbackVector = report.vectors.find((v) => v.vectorId === 'VEC-ROLLBACK-003');
    assert.ok(rollbackVector?.neutralized);
  });
});
