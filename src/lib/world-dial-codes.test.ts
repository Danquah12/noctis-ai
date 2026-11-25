import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSmsCallInviteUrl,
  buildWhatsAppCallInviteUrl,
  findCountryByIso,
  formatInternationalDisplay,
  normalizeWorldE164,
  searchWorldCountries,
  WORLD_DIAL_CODES,
} from "./world-dial-codes.ts";
import { toE164, voipStatus } from "./voip.server.ts";

test("WORLD_DIAL_CODES includes 195+ global ITU-T countries and major hubs", () => {
  assert.ok(WORLD_DIAL_CODES.length >= 195, `Expected >=195 countries, got ${WORLD_DIAL_CODES.length}`);
  for (const iso of ["US", "CA", "GH", "GB", "NG", "KE", "ZA", "IN", "DE", "FR", "IT", "JP", "BR", "AU", "AE"]) {
    assert.ok(findCountryByIso(iso), `Missing country ISO ${iso}`);
  }
});

test("normalizeWorldE164 handles trunk zeros, Italy +39 exception, 00/011 prefixes, and emergencies", () => {
  const ghanaLocal = normalizeWorldE164("024 123 4567", "233");
  assert.equal(ghanaLocal.valid, true);
  assert.equal(ghanaLocal.e164, "+233241234567");
  assert.equal(ghanaLocal.country?.iso, "GH");

  const ukLocal = normalizeWorldE164("07911 123456", "44");
  assert.equal(ukLocal.valid, true);
  assert.equal(ukLocal.e164, "+447911123456");

  const italyKeepZero = normalizeWorldE164("06 1234 5678", "39");
  assert.equal(italyKeepZero.valid, true);
  assert.equal(italyKeepZero.e164, "+390612345678");
  assert.equal(italyKeepZero.country?.iso, "IT");

  const usLocal = normalizeWorldE164("(415) 555-0199", "1");
  assert.equal(usLocal.valid, true);
  assert.equal(usLocal.e164, "+14155550199");

  const explicitJapan = normalizeWorldE164("+81 90 1234 5678", "1");
  assert.equal(explicitJapan.valid, true);
  assert.equal(explicitJapan.e164, "+819012345678");
  assert.equal(explicitJapan.country?.iso, "JP");

  const intl00 = normalizeWorldE164("00233241234567", "1");
  assert.equal(intl00.valid, true);
  assert.equal(intl00.e164, "+233241234567");
  assert.equal(intl00.country?.iso, "GH");

  const intl011 = normalizeWorldE164("011447911123456", "1");
  assert.equal(intl011.valid, true);
  assert.equal(intl011.e164, "+447911123456");
  assert.equal(intl011.country?.iso, "GB");

  for (const em of ["911", "112", "999", "000"]) {
    const res = normalizeWorldE164(em, "233");
    assert.equal(res.emergency, true);
    assert.equal(res.valid, false);
  }

  const short = normalizeWorldE164("123", "233");
  assert.equal(short.valid, false);
  assert.equal(normalizeWorldE164("+12345").valid, false);
});

test("search, formatting, invite URLs, and voipStatus operate globally", () => {
  assert.ok(searchWorldCountries("ghana").some((c) => c.iso === "GH" && c.dial === "233"));
  assert.ok(searchWorldCountries("+971").some((c) => c.iso === "AE"));
  assert.ok(searchWorldCountries("GB").some((c) => c.iso === "GB"));

  const disp = formatInternationalDisplay("0241234567", "233");
  assert.ok(disp.startsWith("+233 "));

  const wa = buildWhatsAppCallInviteUrl("+233241234567", "https://www.dstrike.app/noctis?join=abc", "Kwesi");
  assert.ok(wa.startsWith("https://wa.me/233241234567?text="));

  const sms = buildSmsCallInviteUrl("+447911123456", "https://www.dstrike.app/noctis?join=abc");
  assert.ok(sms.startsWith("sms:+447911123456?body="));

  assert.equal(toE164("024 123 4567", "233"), "+233241234567");
  assert.equal(toE164("00819012345678"), "+819012345678");

  const status = voipStatus();
  assert.equal(status.globalWebRtcReady, true);
  assert.ok(status.countriesSupported >= 195);
  assert.ok(status.provider === "webrtc" || status.provider === "twilio");
});
