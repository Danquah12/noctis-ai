import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSovereignPassport } from './noctis-passport.ts';

describe('NOCTIS SOVEREIGN AUDIT PASSPORT SPEC', () => {
  test('Generates cryptographic audit passport with all 4 invariant gates passed', () => {
    const content = `
      // Mission-Critical Fuel Dispatcher
      await redis.set(lockKey, token, 'PX', 5000, 'NX');
      // Paired Rollback Available
    `;
    const passport = generateSovereignPassport(content, 'Fuel Dispatcher');

    assert.match(passport.passportId, /^NOCTIS-PASS-/);
    assert.equal(passport.invariants.epistemicHonesty, true);
    assert.equal(passport.invariants.preMortemFuzzing, true);
    assert.equal(passport.invariants.containmentGuaranteed, true);
    assert.equal(passport.invariants.cryptographicNonRepudiation, true);
    assert.match(passport.fingerprintSha256, /^[a-f0-9]{64}$/);
    assert.ok(passport.exportableCertificate.includes('NOCTIS SOVEREIGN AUDIT PASSPORT'));
  });
});
