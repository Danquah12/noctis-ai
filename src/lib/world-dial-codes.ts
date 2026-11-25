/**
 * Global ITU-T E.164 Dialing Directory, Normalization, Country Detection & Invite Utilities.
 * Supports 200+ countries/territories with trunk-zero rules (e.g. Italy keeps leading 0,
 * Ghana/UK/Nigeria/Germany/India strip leading national trunk 0).
 * Pure TypeScript with zero runtime dependencies or path aliases for Node `--experimental-strip-types`.
 */

export interface WorldCountry {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  trunkZero: boolean;
  example: string;
}

export const EMERGENCY_NUMBERS = new Set([
  "911",
  "112",
  "999",
  "000",
  "110",
  "119",
  "191",
  "192",
  "193",
]);

/** Countries that KEEP leading 0 in geographic numbers even after country code. */
const KEEP_TRUNK_ZERO_ISO = new Set(["IT", "SM", "VA", "CI", "CG", "GA", "GN", "SN"]);

type RawCountryTuple = [iso: string, name: string, dial: string, example: string];

function isoToFlag(iso: string): string {
  const code = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(
    0x1f1e6 + (code.charCodeAt(0) - 65),
    0x1f1e6 + (code.charCodeAt(1) - 65),
  );
}

const RAW_COUNTRIES: RawCountryTuple[] = [
  ["US", "United States", "1", "415 555 0199"],
  ["CA", "Canada", "1", "416 555 0144"],
  ["GH", "Ghana", "233", "24 123 4567"],
  ["GB", "United Kingdom", "44", "7911 123456"],
  ["NG", "Nigeria", "234", "803 123 4567"],
  ["KE", "Kenya", "254", "712 345678"],
  ["ZA", "South Africa", "27", "82 123 4567"],
  ["IN", "India", "91", "98765 43210"],
  ["DE", "Germany", "49", "1512 3456789"],
  ["FR", "France", "33", "6 12 34 56 78"],
  ["IT", "Italy", "39", "06 1234 5678"],
  ["ES", "Spain", "34", "612 34 56 78"],
  ["NL", "Netherlands", "31", "6 12345678"],
  ["CH", "Switzerland", "41", "79 123 45 67"],
  ["SE", "Sweden", "46", "70 123 45 67"],
  ["NO", "Norway", "47", "412 34 567"],
  ["DK", "Denmark", "45", "20 12 34 56"],
  ["FI", "Finland", "358", "41 2345678"],
  ["IE", "Ireland", "353", "85 123 4567"],
  ["BE", "Belgium", "32", "470 12 34 56"],
  ["AT", "Austria", "43", "664 123456"],
  ["PT", "Portugal", "351", "912 345 678"],
  ["PL", "Poland", "48", "512 345 678"],
  ["GR", "Greece", "30", "691 234 5678"],
  ["TR", "Turkey", "90", "532 123 4567"],
  ["UA", "Ukraine", "380", "50 123 4567"],
  ["RU", "Russia", "7", "912 345 6789"],
  ["AE", "United Arab Emirates", "971", "50 123 4567"],
  ["SA", "Saudi Arabia", "966", "50 123 4567"],
  ["QA", "Qatar", "974", "3312 3456"],
  ["KW", "Kuwait", "965", "5001 2345"],
  ["IL", "Israel", "972", "50 123 4567"],
  ["EG", "Egypt", "20", "100 123 4567"],
  ["MA", "Morocco", "212", "612 345678"],
  ["TN", "Tunisia", "216", "20 123 456"],
  ["DZ", "Algeria", "213", "551 23 45 67"],
  ["ET", "Ethiopia", "251", "91 123 4567"],
  ["UG", "Uganda", "256", "712 345678"],
  ["TZ", "Tanzania", "255", "621 234 567"],
  ["RW", "Rwanda", "250", "722 123 456"],
  ["SN", "Senegal", "221", "77 123 45 67"],
  ["CI", "Côte d'Ivoire", "225", "01 23 45 67 89"],
  ["CM", "Cameroon", "237", "6 71 23 45 67"],
  ["AO", "Angola", "244", "923 123 456"],
  ["MZ", "Mozambique", "258", "82 123 4567"],
  ["ZM", "Zambia", "260", "95 5123456"],
  ["ZW", "Zimbabwe", "263", "71 234 5678"],
  ["BW", "Botswana", "267", "71 123 456"],
  ["NA", "Namibia", "264", "81 123 4567"],
  ["MU", "Mauritius", "230", "5251 2345"],
  ["JP", "Japan", "81", "90 1234 5678"],
  ["KR", "South Korea", "82", "10 1234 5678"],
  ["CN", "China", "86", "138 0013 8000"],
  ["HK", "Hong Kong", "852", "5123 4567"],
  ["TW", "Taiwan", "886", "912 345 678"],
  ["SG", "Singapore", "65", "8123 4567"],
  ["MY", "Malaysia", "60", "12 345 6789"],
  ["ID", "Indonesia", "62", "812 3456 7890"],
  ["PH", "Philippines", "63", "917 123 4567"],
  ["TH", "Thailand", "66", "81 234 5678"],
  ["VN", "Vietnam", "84", "91 234 56 78"],
  ["PK", "Pakistan", "92", "301 2345678"],
  ["BD", "Bangladesh", "880", "1812 345678"],
  ["LK", "Sri Lanka", "94", "71 234 5678"],
  ["NP", "Nepal", "977", "984 1234567"],
  ["AU", "Australia", "61", "412 345 678"],
  ["NZ", "New Zealand", "64", "21 123 4567"],
  ["BR", "Brazil", "55", "11 91234 5678"],
  ["MX", "Mexico", "52", "55 1234 5678"],
  ["AR", "Argentina", "54", "11 1234 5678"],
  ["CO", "Colombia", "57", "321 1234567"],
  ["CL", "Chile", "56", "9 6123 4567"],
  ["PE", "Peru", "51", "912 345 678"],
  ["VE", "Venezuela", "58", "412 1234567"],
  ["EC", "Ecuador", "593", "99 123 4567"],
  ["AF", "Afghanistan", "93", "70 123 4567"],
  ["AL", "Albania", "355", "67 212 3456"],
  ["AD", "Andorra", "376", "312 345"],
  ["AG", "Antigua and Barbuda", "1268", "464 1234"],
  ["AM", "Armenia", "374", "77 123456"],
  ["AW", "Aruba", "297", "560 1234"],
  ["AZ", "Azerbaijan", "994", "40 123 45 67"],
  ["BS", "Bahamas", "1242", "359 1234"],
  ["BH", "Bahrain", "973", "3600 1234"],
  ["BB", "Barbados", "1246", "250 1234"],
  ["BY", "Belarus", "375", "29 491 1911"],
  ["BZ", "Belize", "501", "622 1234"],
  ["BJ", "Benin", "229", "90 01 12 34"],
  ["BM", "Bermuda", "1441", "370 1234"],
  ["BT", "Bhutan", "975", "17 123 456"],
  ["BO", "Bolivia", "591", "71234567"],
  ["BA", "Bosnia and Herzegovina", "387", "61 123 456"],
  ["BN", "Brunei", "673", "712 3456"],
  ["BG", "Bulgaria", "359", "48 123 456"],
  ["BF", "Burkina Faso", "226", "70 12 34 56"],
  ["BI", "Burundi", "257", "79 561 234"],
  ["KH", "Cambodia", "855", "91 234 567"],
  ["CV", "Cape Verde", "238", "991 12 34"],
  ["KY", "Cayman Islands", "1345", "323 1234"],
  ["CF", "Central African Republic", "236", "70 01 23 45"],
  ["TD", "Chad", "235", "63 01 23 45"],
  ["KM", "Comoros", "269", "321 23 45"],
  ["CG", "Congo (Republic)", "242", "06 123 4567"],
  ["CD", "Congo (DRC)", "243", "991 234 567"],
  ["CR", "Costa Rica", "506", "8312 3456"],
  ["HR", "Croatia", "385", "92 123 4567"],
  ["CU", "Cuba", "53", "5 1234567"],
  ["CY", "Cyprus", "357", "96 123456"],
  ["CZ", "Czechia", "420", "601 123 456"],
  ["DJ", "Djibouti", "253", "77 83 10 01"],
  ["DM", "Dominica", "1767", "225 1234"],
  ["DO", "Dominican Republic", "1809", "234 5678"],
  ["SV", "El Salvador", "503", "7012 3456"],
  ["GQ", "Equatorial Guinea", "240", "222 123 456"],
  ["ER", "Eritrea", "291", "7 123 456"],
  ["EE", "Estonia", "372", "5123 4567"],
  ["SZ", "Eswatini", "268", "7612 3456"],
  ["FJ", "Fiji", "679", "701 2345"],
  ["GF", "French Guiana", "594", "694 20 12 34"],
  ["PF", "French Polynesia", "689", "87 12 34 56"],
  ["GA", "Gabon", "241", "06 03 12 34"],
  ["GM", "Gambia", "220", "301 2345"],
  ["GE", "Georgia", "995", "555 12 34 56"],
  ["GI", "Gibraltar", "350", "57123456"],
  ["GL", "Greenland", "299", "22 12 34"],
  ["GD", "Grenada", "1473", "403 1234"],
  ["GP", "Guadeloupe", "590", "690 00 12 34"],
  ["GU", "Guam", "1671", "300 1234"],
  ["GT", "Guatemala", "502", "5123 4567"],
  ["GN", "Guinea", "224", "601 12 34 56"],
  ["GW", "Guinea-Bissau", "245", "955 012 345"],
  ["GY", "Guyana", "592", "609 1234"],
  ["HT", "Haiti", "509", "34 10 1234"],
  ["HN", "Honduras", "504", "9123 4567"],
  ["HU", "Hungary", "36", "20 123 4567"],
  ["IS", "Iceland", "354", "611 1234"],
  ["IR", "Iran", "98", "912 345 6789"],
  ["IQ", "Iraq", "964", "791 234 5678"],
  ["JM", "Jamaica", "1876", "210 1234"],
  ["JO", "Jordan", "962", "7 9012 3456"],
  ["KZ", "Kazakhstan", "77", "701 123 4567"],
  ["KI", "Kiribati", "686", "72001234"],
  ["XK", "Kosovo", "383", "43 201 234"],
  ["KG", "Kyrgyzstan", "996", "700 123 456"],
  ["LA", "Laos", "856", "20 23 123 456"],
  ["LV", "Latvia", "371", "21 234 567"],
  ["LB", "Lebanon", "961", "71 123 456"],
  ["LS", "Lesotho", "266", "5012 3456"],
  ["LR", "Liberia", "231", "77 012 3456"],
  ["LY", "Libya", "218", "91 2345678"],
  ["LI", "Liechtenstein", "423", "660 234 567"],
  ["LT", "Lithuania", "370", "612 34567"],
  ["LU", "Luxembourg", "352", "628 123 456"],
  ["MO", "Macau", "853", "6612 3456"],
  ["MG", "Madagascar", "261", "32 12 345 67"],
  ["MW", "Malawi", "265", "991 23 45 67"],
  ["MV", "Maldives", "960", "771 2345"],
  ["ML", "Mali", "223", "65 01 23 45"],
  ["MT", "Malta", "356", "9696 1234"],
  ["MH", "Marshall Islands", "692", "235 1234"],
  ["MQ", "Martinique", "596", "696 20 12 34"],
  ["MR", "Mauritania", "222", "22 12 34 56"],
  ["FM", "Micronesia", "691", "350 1234"],
  ["MD", "Moldova", "373", "621 12 345"],
  ["MC", "Monaco", "377", "6 12 34 56 78"],
  ["MN", "Mongolia", "976", "8812 3456"],
  ["ME", "Montenegro", "382", "67 622 901"],
  ["MM", "Myanmar", "95", "9 212 3456"],
  ["NR", "Nauru", "674", "555 1234"],
  ["NC", "New Caledonia", "687", "75 12 34"],
  ["NI", "Nicaragua", "505", "8123 4567"],
  ["NE", "Niger", "227", "93 12 34 56"],
  ["MK", "North Macedonia", "389", "72 345 678"],
  ["OM", "Oman", "968", "9212 3456"],
  ["PW", "Palau", "680", "620 1234"],
  ["PS", "Palestine", "970", "599 123 456"],
  ["PA", "Panama", "507", "6123 4567"],
  ["PG", "Papua New Guinea", "675", "7012 3456"],
  ["PY", "Paraguay", "595", "961 456789"],
  ["PR", "Puerto Rico", "1787", "234 5678"],
  ["RO", "Romania", "40", "712 034 567"],
  ["KN", "Saint Kitts and Nevis", "1869", "765 2917"],
  ["LC", "Saint Lucia", "1758", "284 5678"],
  ["VC", "Saint Vincent & Grenadines", "1784", "430 1234"],
  ["WS", "Samoa", "685", "72 12345"],
  ["SM", "San Marino", "378", "66 66 12 12"],
  ["ST", "São Tomé and Príncipe", "239", "981 2345"],
  ["RS", "Serbia", "381", "60 1234567"],
  ["SC", "Seychelles", "248", "2 510 123"],
  ["SL", "Sierra Leone", "232", "25 123456"],
  ["SK", "Slovakia", "421", "912 123 456"],
  ["SI", "Slovenia", "386", "31 234 567"],
  ["SB", "Solomon Islands", "677", "74 21234"],
  ["SO", "Somalia", "252", "7 1123456"],
  ["SS", "South Sudan", "211", "977 123 456"],
  ["SD", "Sudan", "249", "91 123 1234"],
  ["SR", "Suriname", "597", "741 2345"],
  ["SY", "Syria", "963", "944 567 890"],
  ["TJ", "Tajikistan", "992", "917 12 3456"],
  ["TL", "Timor-Leste", "670", "7721 2345"],
  ["TG", "Togo", "228", "90 11 23 45"],
  ["TO", "Tonga", "676", "771 5123"],
  ["TT", "Trinidad and Tobago", "1868", "291 1234"],
  ["TM", "Turkmenistan", "993", "66 123456"],
  ["TV", "Tuvalu", "688", "901234"],
  ["UY", "Uruguay", "598", "94 231 234"],
  ["UZ", "Uzbekistan", "998", "91 234 56 78"],
  ["VU", "Vanuatu", "678", "591 2345"],
  ["VA", "Vatican City", "379", "06 6981 2345"],
  ["YE", "Yemen", "967", "712 345 678"],
  ["RE", "Réunion", "262", "692 12 34 56"],
];

export const WORLD_DIAL_CODES: WorldCountry[] = RAW_COUNTRIES.map(([iso, name, dial, example]) => ({
  iso,
  name,
  dial,
  flag: isoToFlag(iso),
  trunkZero: !KEEP_TRUNK_ZERO_ISO.has(iso),
  example,
}));

const COUNTRIES_BY_DIAL_DESC = [...WORLD_DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);

export function findCountryByIso(iso: string): WorldCountry | undefined {
  const target = iso.trim().toUpperCase();
  return WORLD_DIAL_CODES.find((c) => c.iso === target);
}

export function matchCountryByE164Digits(
  digits: string,
  preferredDialCode?: string,
): WorldCountry | null {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return null;
  if (preferredDialCode) {
    const cleanPref = preferredDialCode.replace(/\D/g, "");
    if (cleanPref && clean.startsWith(cleanPref)) {
      const exact = WORLD_DIAL_CODES.find((c) => c.dial === cleanPref);
      if (exact) return exact;
    }
  }
  for (const country of COUNTRIES_BY_DIAL_DESC) {
    if (clean.startsWith(country.dial)) return country;
  }
  return null;
}

export interface NormalizedWorldNumber {
  e164: string;
  country: WorldCountry | null;
  national: string;
  valid: boolean;
  emergency: boolean;
  reason?: string;
}

/**
 * Normalize any dialed international or national phone number to strict ITU-T E.164.
 * Supports:
 * - Emergency numbers (911, 112, 999, 000, etc.)
 * - Explicit `+...`, `00...`, and `011...` international dialing prefixes
 * - Local/national format combined with `selectedDialCode` (automatically stripping trunk `0`
 *   where ITU rules require, while preserving trunk `0` for Italy `+39`, etc.)
 */
export function normalizeWorldE164(
  rawInput: string,
  selectedDialCode?: string,
): NormalizedWorldNumber {
  const trimmed = String(rawInput ?? "").trim();
  const rawDigits = trimmed.replace(/\D/g, "");
  if (!rawDigits) {
    return { e164: "", country: null, national: "", valid: false, emergency: false, reason: "Enter a phone number" };
  }

  if (EMERGENCY_NUMBERS.has(rawDigits)) {
    return {
      e164: "",
      country: null,
      national: rawDigits,
      valid: false,
      emergency: true,
      reason: "Emergency service number",
    };
  }

  let explicitIntl = false;
  let intlDigits = "";

  if (trimmed.startsWith("+")) {
    explicitIntl = true;
    intlDigits = rawDigits;
  } else if (rawDigits.startsWith("00") && rawDigits.length >= 9) {
    explicitIntl = true;
    intlDigits = rawDigits.slice(2);
  } else if (rawDigits.startsWith("011") && rawDigits.length >= 10) {
    explicitIntl = true;
    intlDigits = rawDigits.slice(3);
  }

  if (explicitIntl) {
    const matched = matchCountryByE164Digits(intlDigits, selectedDialCode);
    const dialLen = matched ? matched.dial.length : 0;
    const national = dialLen > 0 ? intlDigits.slice(dialLen) : intlDigits;
    const valid = intlDigits.length >= 7 && intlDigits.length <= 15 && (dialLen === 0 || national.length >= 4);
    return {
      e164: valid ? `+${intlDigits}` : intlDigits ? `+${intlDigits}` : "",
      country: matched,
      national,
      valid,
      emergency: false,
      reason: valid ? undefined : "Number must be 7 to 15 ITU-T E.164 digits",
    };
  }

  const dialClean = String(selectedDialCode ?? "").replace(/\D/g, "");
  if (dialClean) {
    const selectedCountry = WORLD_DIAL_CODES.find((c) => c.dial === dialClean) ?? null;
    let national = rawDigits;
    if (selectedCountry?.trunkZero !== false) {
      national = national.replace(/^0+/, "");
    }
    const combined = `${dialClean}${national}`;
    const valid = combined.length >= 7 && combined.length <= 15 && national.length >= 4;
    return {
      e164: combined ? `+${combined}` : "",
      country: selectedCountry,
      national,
      valid,
      emergency: false,
      reason: valid ? undefined : "Number must be 7 to 15 ITU-T E.164 digits",
    };
  }

  // Fallback when no country selector dial code is supplied (legacy direct input):
  // If exact 10 digits with NANP-like leading digit >= 2, assume +1; otherwise treat 8-15 digits as +intl.
  if (rawDigits.length === 10 && !rawDigits.startsWith("0")) {
    const combined = `1${rawDigits}`;
    return {
      e164: `+${combined}`,
      country: findCountryByIso("US") ?? null,
      national: rawDigits,
      valid: true,
      emergency: false,
    };
  }
  const matched = matchCountryByE164Digits(rawDigits);
  const valid = rawDigits.length >= 7 && rawDigits.length <= 15;
  return {
    e164: valid ? `+${rawDigits}` : rawDigits ? `+${rawDigits}` : "",
    country: matched,
    national: matched ? rawDigits.slice(matched.dial.length) : rawDigits,
    valid,
    emergency: false,
    reason: valid ? undefined : "Select a country or start with + country code",
  };
}

export function formatInternationalDisplay(rawInput: string, selectedDialCode?: string): string {
  const norm = normalizeWorldE164(rawInput, selectedDialCode);
  if (norm.emergency) return norm.national;
  if (!norm.e164) return rawInput.trim();
  const digits = norm.e164.slice(1);
  if (!norm.country) return norm.e164;
  const rest = digits.slice(norm.country.dial.length);
  if (!rest) return `+${norm.country.dial}`;
  if (norm.country.dial === "1" && rest.length === 10) {
    return `+1 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
  }
  const grouped = rest.replace(/(\d{3})(?=\d{2})/g, "$1 ").trim();
  return `+${norm.country.dial} ${grouped}`;
}

export function searchWorldCountries(query: string): WorldCountry[] {
  const q = query.trim().toLowerCase();
  if (!q) return WORLD_DIAL_CODES;
  const cleanDial = q.replace(/^\+/, "");
  return WORLD_DIAL_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.iso.toLowerCase().includes(q) ||
      c.dial.startsWith(cleanDial) ||
      `+${c.dial}`.startsWith(q),
  );
}

const TIMEZONE_TO_ISO: Record<string, string> = {
  "Africa/Accra": "GH",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA",
  "Africa/Addis_Ababa": "ET",
  "Africa/Kampala": "UG",
  "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kigali": "RW",
  "Africa/Dakar": "SN",
  "Africa/Abidjan": "CI",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Europe/Amsterdam": "NL",
  "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE",
  "Europe/Dublin": "IE",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Singapore": "SG",
  "Asia/Manila": "PH",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Jakarta": "ID",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Pacific/Auckland": "NZ",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Sao_Paulo": "BR",
  "America/Mexico_City": "MX",
};

export function detectDefaultCountryIso(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_ISO[tz]) return TIMEZONE_TO_ISO[tz]!;
    if (typeof navigator !== "undefined" && navigator.language) {
      const match = navigator.language.match(/[-_]([A-Za-z]{2})$/);
      const region = match?.[1]?.toUpperCase();
      if (region && findCountryByIso(region)) return region;
    }
  } catch {
    /* ignore */
  }
  return "US";
}

export function buildWhatsAppCallInviteUrl(
  e164: string,
  joinUrl: string,
  callerName?: string,
): string {
  const digits = e164.replace(/\D/g, "");
  const who = callerName?.trim() ? callerName.trim() : "Noctis";
  const text = encodeURIComponent(
    `Join my live encrypted internet call on Noctis (${who}): ${joinUrl}`,
  );
  if (digits.length >= 7) {
    return `https://wa.me/${digits}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export function buildSmsCallInviteUrl(e164: string, joinUrl: string): string {
  const digits = e164.replace(/\D/g, "");
  const body = encodeURIComponent(`Join my Noctis internet call: ${joinUrl}`);
  if (digits.length >= 7) {
    return `sms:+${digits}?body=${body}`;
  }
  return `sms:?body=${body}`;
}
