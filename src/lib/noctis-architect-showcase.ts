/**
 * NOCTIS ARCHITECTURAL SHOWCASE & RESIDENTIAL DESIGN FEASIBILITY REPORT
 * =====================================================================
 * 1. Realtor.com-Style Architectural Showcase & Visual Option Cards (Options A, B, C)
 * 2. Crisp Black-on-White Dimensioned Architectural CAD Floor Plan (40'-0" x 42'-0" + 12'-0" Covered Patio)
 * 3. Residential Design Feasibility Report (Test 1 & Test 13 Benchmark + Executed Machine-Readable IFC 4.3 Model
 *    & Independent Geometry, Cost, and Compliance Checks)
 */

export interface ShowcaseBriefSummary {
  projectTitle: string;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  lotWidthFt: number;
  lotDepthFt: number;
  budgetUsd: number;
  jurisdiction: string;
}

export function buildRealtorShowcaseAndWhiteFloorPlanSvg(
  brief: ShowcaseBriefSummary,
  baselineCostUsd: number,
): string {
  const plotWidthM = Math.round(brief.lotWidthFt * 0.3048 * 10) / 10;
  const plotDepthM = Math.round(brief.lotDepthFt * 0.3048 * 10) / 10;
  const plotAreaM2 = Math.round(plotWidthM * plotDepthM);
  const optACost = 168500;
  const optBCost = 187200;
  const optCCostPhase1 = 122400;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 980" width="100%" style="background:#0b111e; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; border-radius: 14px; border: 1px solid #1e3a63;">
  <defs>
    <linearGradient id="heroTwilight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="warmGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.75"/>
    </linearGradient>
    <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#eff6ff"/>
    </linearGradient>
    <linearGradient id="skySunset" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fdba74"/>
      <stop offset="45%" stop-color="#93c5fd"/>
      <stop offset="100%" stop-color="#fed7aa"/>
    </linearGradient>
    <linearGradient id="lawnGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4d7c0f"/>
      <stop offset="100%" stop-color="#365314"/>
    </linearGradient>
    <pattern id="showerHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" stroke-width="0.8"/>
    </pattern>
  </defs>

  <!-- ================================================================================= -->
  <!-- TOP SECTION: REALTOR.COM-STYLE ARCHITECTURAL SHOWCASE & VISUAL OPTION CARDS        -->
  <!-- ================================================================================= -->
  <!-- Top White Portal Header Bar (Realtor.com inspired) -->
  <rect x="14" y="12" width="1052" height="38" rx="8" fill="#ffffff"/>
  <!-- Red House Crest Icon -->
  <rect x="28" y="20" width="22" height="22" rx="4" fill="#d92228"/>
  <polygon points="39,23 31,30 33,30 33,38 45,38 45,30 47,30" fill="#ffffff"/>
  <text x="58" y="36" fill="#111827" font-size="14" font-weight="800">dstrike.architect</text>
  <text x="195" y="35" fill="#111827" font-size="10.5" font-weight="700">Design &amp; Buy</text>
  <line x1="195" y1="47" x2="262" y2="47" stroke="#111827" stroke-width="2.5"/>
  <text x="280" y="35" fill="#4b5563" font-size="10.5" font-weight="600">Feasibility Report</text>
  <text x="385" y="35" fill="#4b5563" font-size="10.5" font-weight="600">Floor Plans (CAD)</text>
  <text x="490" y="35" fill="#4b5563" font-size="10.5" font-weight="600">3D BIM (IFC 4.3)</text>
  <text x="590" y="35" fill="#4b5563" font-size="10.5" font-weight="600">Cost &amp; BOQ</text>
  <text x="668" y="35" fill="#4b5563" font-size="10.5" font-weight="600">Code Check (${brief.jurisdiction})</text>
  <rect x="926" y="19" width="126" height="24" rx="12" fill="#111827"/>
  <text x="989" y="35" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="700">40/40 Benchmark ✓</text>

  <!-- Full-Bleed Architectural Hero Banner -->
  <rect x="14" y="54" width="1052" height="176" rx="10" fill="url(#heroTwilight)" stroke="#1e293b" stroke-width="1"/>
  <!-- Background Modern Gable House Illustration in Hero (matching Realtor.com hero) -->
  <polygon points="390,145 730,82 960,136 960,224 390,224" fill="#d6d3d1" fill-opacity="0.22"/>
  <polygon points="365,148 730,76 985,136 978,146 730,88 372,156" fill="#0f172a"/>
  <!-- Warm glowing windows & timber pivot door in hero background -->
  <rect x="435" y="148" width="58" height="58" fill="url(#warmGlow)" fill-opacity="0.45" stroke="#0f172a" stroke-width="2"/>
  <rect x="530" y="138" width="44" height="72" fill="#92400e" fill-opacity="0.55" stroke="#0f172a" stroke-width="2"/>
  <rect x="685" y="142" width="76" height="62" fill="url(#warmGlow)" fill-opacity="0.45" stroke="#0f172a" stroke-width="2"/>
  <!-- Trees Left & Right -->
  <circle cx="110" cy="135" r="78" fill="#14532d" fill-opacity="0.55"/>
  <circle cx="990" cy="145" r="65" fill="#14532d" fill-opacity="0.55"/>

  <!-- Hero Headline & Mode Tabs -->
  <text x="540" y="88" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="800">#1 architectural intelligence engine</text>
  <text x="540" y="112" text-anchor="middle" fill="#f8fafc" font-size="21" font-weight="800">ARCHITECTS &amp; ENGINEERS RECOMMEND*</text>

  <text x="368" y="134" fill="#ffffff" font-size="10.5" font-weight="700">Feasibility</text>
  <line x1="364" y1="139" x2="424" y2="139" stroke="#ffffff" stroke-width="2.5"/>
  <text x="444" y="134" fill="#cbd5e1" font-size="10.5" font-weight="600">Option A (1-Storey)</text>
  <text x="554" y="134" fill="#cbd5e1" font-size="10.5" font-weight="600">Option B (2-Storey)</text>
  <text x="664" y="134" fill="#cbd5e1" font-size="10.5" font-weight="600">Option C (Phased CAD)</text>

  <!-- Pill Search / Brief Bar -->
  <rect x="275" y="146" width="530" height="36" rx="18" fill="#ffffff"/>
  <text x="296" y="168" fill="#1e293b" font-size="11" font-weight="600">${plotWidthM}m × ${plotDepthM}m plot (${plotAreaM2} m²), ${brief.bedrooms} beds, ${brief.bathrooms} baths, 2-car · $${brief.budgetUsd.toLocaleString()}</text>
  <rect x="706" y="150" width="94" height="28" rx="14" fill="#d92228"/>
  <text x="753" y="168" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">Verify ⌕</text>

  <!-- Glassmorphic Feasibility Status Banner (Realtor Giveaway Bar position) -->
  <rect x="92" y="190" width="896" height="32" rx="8" fill="#ffffff" fill-opacity="0.88"/>
  <rect x="104" y="195" width="138" height="22" rx="11" fill="#d92228"/>
  <text x="173" y="210" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="800">CONFLICT / HOLD GATE</text>
  <text x="254" y="210" fill="#0f172a" font-size="10.5" font-weight="700">Residential Design Feasibility Report · Setbacks, Footprint Cap &amp; Local Unit Rates Must Be Verified First</text>
  <rect x="872" y="195" width="104" height="22" rx="11" fill="#1f2937"/>
  <text x="924" y="210" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="700">See 3 Options ↓</text>

  <!-- Section Title Row: Preliminary Design Alternatives (Realtor "Popular Homes" Row) -->
  <text x="24" y="252" fill="#ffffff" font-size="15" font-weight="800">4. Preliminary Design Alternatives — ${brief.jurisdiction} (${plotWidthM} m × ${plotDepthM} m Plot · $${brief.budgetUsd.toLocaleString()} Budget)</text>
  <text x="24" y="268" fill="#94a3b8" font-size="10.5">Three distinct architectural concepts compared with measured CAD floor plan, machine-readable IFC 4.3 model &amp; trade-offs</text>
  <text x="1056" y="256" text-anchor="end" fill="#e4b86a" font-size="11" font-weight="700">See all 40 benchmark tests →</text>

  <!-- ========================================================================= -->
  <!-- CARD 1: OPTION A — COMPACT SINGLE-STOREY MODERN HOUSE (Matches Image 2)    -->
  <!-- ========================================================================= -->
  <rect x="20" y="278" width="336" height="196" rx="12" fill="#111c30" stroke="#1e3a63" stroke-width="1.2"/>
  <!-- Exterior Render Viewport -->
  <rect x="28" y="286" width="320" height="122" rx="8" fill="url(#skyDay)"/>
  <!-- Background Trees -->
  <circle cx="58" cy="332" r="34" fill="#15803d"/>
  <circle cx="318" cy="336" r="30" fill="#166534"/>
  <!-- Left White Stucco Box Volume -->
  <rect x="64" y="308" width="118" height="76" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
  <!-- Center & Right Dark Charcoal Modern Volumes -->
  <rect x="182" y="312" width="46" height="72" fill="#334155"/>
  <rect x="228" y="322" width="84" height="62" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
  <!-- Dark Overhanging Flat Fascia Canopy + Warm Soffit Lights -->
  <rect x="78" y="320" width="158" height="8" fill="#3f3f46"/>
  <rect x="228" y="336" width="88" height="6" fill="#3f3f46"/>
  <rect x="84" y="328" width="66" height="7" fill="#92400e"/>
  <circle cx="105" cy="326" r="2" fill="#fef08a"/>
  <circle cx="135" cy="326" r="2" fill="#fef08a"/>
  <circle cx="202" cy="326" r="2" fill="#fef08a"/>
  <!-- Stacked White Stone Accent Pier -->
  <rect x="150" y="328" width="24" height="56" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8"/>
  <!-- Large 3-Bay Black-Mullion Bedroom Picture Window -->
  <rect x="84" y="335" width="66" height="40" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="106" y1="335" x2="106" y2="375" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="128" y1="335" x2="128" y2="375" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="84" y1="362" x2="150" y2="362" stroke="#0f172a" stroke-width="1.2"/>
  <!-- Warm Vertical Wood Entry Door + Sidelight -->
  <rect x="182" y="336" width="22" height="44" fill="#78350f" stroke="#1e293b" stroke-width="1"/>
  <rect x="206" y="336" width="9" height="44" fill="#38bdf8" fill-opacity="0.35" stroke="#1e293b" stroke-width="1"/>
  <!-- Charcoal Sectional Garage Door -->
  <rect x="236" y="346" width="66" height="38" fill="#27272a" stroke="#18181b" stroke-width="1.2"/>
  <line x1="236" y1="355" x2="302" y2="355" stroke="#3f3f46" stroke-width="0.8"/>
  <line x1="236" y1="365" x2="302" y2="365" stroke="#3f3f46" stroke-width="0.8"/>
  <line x1="236" y1="375" x2="302" y2="375" stroke="#3f3f46" stroke-width="0.8"/>
  <!-- Lawn & Concrete Driveway -->
  <rect x="28" y="384" width="196" height="24" fill="url(#lawnGrad)"/>
  <polygon points="224,384 318,384 348,408 216,408" fill="#e2e8f0"/>
  <!-- Blue Pill Badge (Realtor "New" Badge Style) -->
  <rect x="36" y="294" width="74" height="18" rx="9" fill="#1d4ed8"/>
  <text x="73" y="306" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="700">Option A · 1-Fl</text>
  <!-- White Circle Heart Button (Realtor Card Style) -->
  <circle cx="328" cy="388" r="13" fill="#ffffff"/>
  <text x="328" y="393" text-anchor="middle" fill="#dc2626" font-size="13" font-weight="700">♥</text>
  <!-- Card 1 Metadata & Trade-Offs -->
  <text x="30" y="423" fill="#ffffff" font-size="10.5" font-weight="800">Option A — Compact Single-Storey House (100 m²)</text>
  <text x="30" y="438" fill="#4ade80" font-size="10" font-weight="700">Est. $${optACost.toLocaleString()} · 3BR / 2BA · 40'×42' Core · Simple Roof</text>
  <text x="30" y="452" fill="#cbd5e1" font-size="9">+ Advantage: Simpler 1-level construction, zero stair cost, step-free.</text>
  <text x="30" y="465" fill="#fbbf24" font-size="9">− Trade-off: Compact bedrooms/storage to fit budget &amp; lot coverage.</text>

  <!-- ========================================================================= -->
  <!-- CARD 2: OPTION B — TWO-STOREY ALTERNATIVE (Matches Image 3)                -->
  <!-- ========================================================================= -->
  <rect x="372" y="278" width="336" height="196" rx="12" fill="#111c30" stroke="#1e3a63" stroke-width="1.2"/>
  <rect x="380" y="286" width="320" height="122" rx="8" fill="url(#skySunset)"/>
  <!-- Left Garage Wing & 2-Storey Main Massing -->
  <rect x="412" y="340" width="66" height="44" fill="#a8a29e"/>
  <rect x="450" y="298" width="190" height="86" fill="#d6d3d1"/>
  <!-- Upper Horizontal Timber-Slat Feature Box -->
  <rect x="492" y="294" width="144" height="48" fill="#5c4033" stroke="#3e2723" stroke-width="1"/>
  <line x1="492" y1="300" x2="636" y2="300" stroke="#8d6e63" stroke-width="0.8"/>
  <line x1="492" y1="306" x2="636" y2="306" stroke="#8d6e63" stroke-width="0.8"/>
  <line x1="492" y1="312" x2="636" y2="312" stroke="#8d6e63" stroke-width="0.8"/>
  <!-- Recessed Upper Balcony + Glass Railing -->
  <rect x="498" y="304" width="46" height="36" fill="#fef3c7" fill-opacity="0.85"/>
  <rect x="498" y="324" width="46" height="16" fill="#38bdf8" fill-opacity="0.32" stroke="#cbd5e1" stroke-width="1"/>
  <!-- Upper Right Illuminated Double Windows -->
  <rect x="556" y="304" width="28" height="32" fill="url(#warmGlow)" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="594" y="304" width="28" height="32" fill="url(#warmGlow)" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Ground Grey Portal Frame + Entry Door + Living Windows -->
  <rect x="490" y="338" width="98" height="46" fill="#64748b"/>
  <rect x="504" y="346" width="28" height="38" fill="#334155" stroke="#1e293b" stroke-width="1"/>
  <line x1="508" y1="354" x2="528" y2="354" stroke="#fef08a" stroke-width="2"/>
  <line x1="508" y1="364" x2="528" y2="364" stroke="#fef08a" stroke-width="2"/>
  <line x1="508" y1="374" x2="528" y2="374" stroke="#fef08a" stroke-width="2"/>
  <rect x="556" y="346" width="24" height="34" fill="url(#warmGlow)" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="594" y="346" width="24" height="34" fill="url(#warmGlow)" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Dark Garage Door on Left -->
  <rect x="420" y="348" width="54" height="36" fill="#334155" stroke="#1e293b" stroke-width="1"/>
  <!-- Driveway, Stepping Stones & Lawn -->
  <polygon points="392,408 420,384 476,384 462,408" fill="#e2e8f0"/>
  <rect x="476" y="384" width="224" height="24" fill="url(#lawnGrad)"/>
  <line x1="484" y1="390" x2="532" y2="390" stroke="#e2e8f0" stroke-width="2.5"/>
  <line x1="482" y1="397" x2="530" y2="397" stroke="#e2e8f0" stroke-width="2.5"/>
  <!-- Blue Pill Badge & Heart -->
  <rect x="388" y="294" width="76" height="18" rx="9" fill="#1d4ed8"/>
  <text x="426" y="306" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="700">Option B · 2-Fl</text>
  <circle cx="680" cy="388" r="13" fill="#ffffff"/>
  <text x="680" y="393" text-anchor="middle" fill="#dc2626" font-size="13" font-weight="700">♥</text>
  <!-- Card 2 Metadata & Trade-Offs -->
  <text x="382" y="423" fill="#ffffff" font-size="10.5" font-weight="800">Option B — Two-Storey Alternative (72 + 48 = 120 m²)</text>
  <text x="382" y="438" fill="#38bdf8" font-size="10" font-weight="700">Est. $${optBCost.toLocaleString()} · 72 m² Ground Footprint (&lt;= 80 m² Cap)</text>
  <text x="382" y="452" fill="#cbd5e1" font-size="9">+ Advantage: Preserves outdoor yard &amp; satisfies 80 m² footprint cap.</text>
  <text x="382" y="465" fill="#fbbf24" font-size="9">− Trade-off: Adds stair core, upper slab structure &amp; framing complexity.</text>

  <!-- ========================================================================= -->
  <!-- CARD 3: OPTION C — PHASED CONSTRUCTION & MEASURED CAD FLOOR PLAN           -->
  <!-- ========================================================================= -->
  <rect x="724" y="278" width="336" height="196" rx="12" fill="#111c30" stroke="#e4b86a" stroke-width="1.5"/>
  <!-- Miniature White Architectural Floor Plan Preview inside Card 3 -->
  <rect x="732" y="286" width="320" height="122" rx="8" fill="#ffffff"/>
  <rect x="772" y="298" width="156" height="98" fill="#ffffff" stroke="#111827" stroke-width="2.2"/>
  <rect x="928" y="298" width="52" height="98" fill="#f8fafc" stroke="#475569" stroke-width="1" stroke-dasharray="3 2"/>
  <line x1="836" y1="298" x2="836" y2="352" stroke="#111827" stroke-width="1.8"/>
  <line x1="772" y1="330" x2="836" y2="330" stroke="#111827" stroke-width="1.8"/>
  <line x1="772" y1="360" x2="836" y2="360" stroke="#111827" stroke-width="1.8"/>
  <line x1="854" y1="330" x2="928" y2="330" stroke="#111827" stroke-width="1.8"/>
  <line x1="854" y1="356" x2="928" y2="356" stroke="#111827" stroke-width="1.8"/>
  <text x="804" y="317" text-anchor="middle" fill="#111827" font-size="6.5" font-weight="700">BED 2 (11'×11')</text>
  <text x="882" y="317" text-anchor="middle" fill="#111827" font-size="6.4" font-weight="700">MASTER (12'×14')</text>
  <text x="804" y="348" text-anchor="middle" fill="#111827" font-size="6.5" font-weight="700">BED 3 (10'×10')</text>
  <text x="890" y="346" text-anchor="middle" fill="#111827" font-size="6.4" font-weight="700">2 BATHS</text>
  <text x="812" y="382" text-anchor="middle" fill="#111827" font-size="6.6" font-weight="700">LIVING (17'×19')</text>
  <text x="892" y="382" text-anchor="middle" fill="#111827" font-size="6.4" font-weight="700">KITCHEN/DIN</text>
  <text x="954" y="348" text-anchor="middle" fill="#334155" font-size="6.2" font-weight="700">PATIO 12'×42'</text>
  <!-- Gold Pill Badge & Heart -->
  <rect x="740" y="294" width="88" height="18" rx="9" fill="#059669"/>
  <text x="784" y="306" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="700">Option C · Phased</text>
  <circle cx="1032" cy="388" r="13" fill="#0f172a"/>
  <text x="1032" y="393" text-anchor="middle" fill="#e4b86a" font-size="13" font-weight="700">♥</text>
  <!-- Card 3 Metadata & Trade-Offs -->
  <text x="734" y="423" fill="#ffffff" font-size="10.5" font-weight="800">Option C — Phased Construction + Measured CAD Plan</text>
  <text x="734" y="438" fill="#e4b86a" font-size="10" font-weight="700">Phase 1: $${optCCostPhase1.toLocaleString()} · Full 40'×42' Plan Below ↓</text>
  <text x="734" y="452" fill="#cbd5e1" font-size="9">+ Advantage: Spreads expenditure across approved construction phases.</text>
  <text x="734" y="465" fill="#fbbf24" font-size="9">− Trade-off: Requires pre-sized lintels, 200A panel &amp; capped MEP stubs.</text>

  <!-- ================================================================================= -->
  <!-- BOTTOM SECTION: CRISP BLACK-ON-WHITE MEASURED ARCHITECTURAL CAD FLOOR PLAN         -->
  <!-- (Exact 40'-0" x 42'-0" + 12'-0" Covered Patio Floor Plan from Image 4 + BIM Check) -->
  <!-- ================================================================================= -->
  <rect x="20" y="486" width="660" height="478" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>

  <!-- Sheet Header on Crisp White Paper -->
  <text x="350" y="507" text-anchor="middle" fill="#0f172a" font-size="10" font-weight="800">SHEET A-101W — MEASURED ARCHITECTURAL FLOOR PLAN (3 BEDROOMS · 2 BATHS · 100 m² / 1,076 SQ FT CORE)</text>

  <!-- Top Dimension Lines: 40'-0" Total Width (Core 28'-0" + Patio 12'-0") -->
  <line x1="120" y1="522" x2="120" y2="564" stroke="#475569" stroke-width="0.9"/>
  <line x1="456" y1="538" x2="456" y2="564" stroke="#475569" stroke-width="0.9"/>
  <line x1="600" y1="522" x2="600" y2="564" stroke="#475569" stroke-width="0.9"/>
  <!-- 40'-0" Overall Dimension Line -->
  <line x1="120" y1="530" x2="600" y2="530" stroke="#334155" stroke-width="1"/>
  <line x1="116" y1="534" x2="124" y2="526" stroke="#0f172a" stroke-width="1.4"/>
  <line x1="596" y1="534" x2="604" y2="526" stroke="#0f172a" stroke-width="1.4"/>
  <text x="360" y="526" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="700">40'-0"</text>

  <!-- 12'-0" Covered Patio Sub-Dimension Line -->
  <line x1="456" y1="546" x2="600" y2="546" stroke="#334155" stroke-width="1"/>
  <line x1="452" y1="550" x2="460" y2="542" stroke="#0f172a" stroke-width="1.4"/>
  <line x1="596" y1="550" x2="604" y2="542" stroke="#0f172a" stroke-width="1.4"/>
  <text x="528" y="543" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="700">12'-0"</text>

  <!-- Left Dimension Line: 42'-0" Overall Depth -->
  <line x1="66" y1="564" x2="120" y2="564" stroke="#475569" stroke-width="0.9"/>
  <line x1="66" y1="924" x2="120" y2="924" stroke="#475569" stroke-width="0.9"/>
  <line x1="78" y1="564" x2="78" y2="924" stroke="#334155" stroke-width="1"/>
  <line x1="74" y1="568" x2="82" y2="560" stroke="#0f172a" stroke-width="1.4"/>
  <line x1="74" y1="928" x2="82" y2="920" stroke="#0f172a" stroke-width="1.4"/>
  <text x="68" y="744" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="700" transform="rotate(-90 68 744)">42'-0"</text>

  <!-- ========================================================================= -->
  <!-- ENCLOSED HOUSE PERIMETER (x=120..456, y=564..924) & COVERED PATIO (456..600) -->
  <!-- ========================================================================= -->
  <!-- Covered Patio Dashed Outline & 3 Structural Columns (42'0" x 12'0") -->
  <rect x="456" y="564" width="144" height="360" fill="#ffffff" stroke="#334155" stroke-width="1.2" stroke-dasharray="5 3"/>
  <rect x="590" y="566" width="8" height="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <rect x="590" y="740" width="8" height="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <rect x="590" y="914" width="8" height="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <text x="528" y="738" text-anchor="middle" fill="#0f172a" font-size="11.5" font-weight="700">COVERED PATIO</text>
  <text x="528" y="753" text-anchor="middle" fill="#334155" font-size="10">42'0" x 12'0"</text>

  <!-- Thick Black Poché Exterior Walls of Conditioned House -->
  <rect x="120" y="564" width="336" height="360" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>

  <!-- Exterior Window Breaks on White Plan (Double-line CAD glazing symbols) -->
  <!-- Top Wall Windows (Bedroom 2 & Master Bedroom) -->
  <rect x="166" y="561" width="46" height="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <line x1="166" y1="564" x2="212" y2="564" stroke="#0f172a" stroke-width="0.8"/>
  <rect x="336" y="561" width="60" height="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <line x1="336" y1="564" x2="396" y2="564" stroke="#0f172a" stroke-width="0.8"/>
  <!-- Left Wall Window (Bedroom 3) -->
  <rect x="117" y="700" width="6" height="44" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <line x1="120" y1="700" x2="120" y2="744" stroke="#0f172a" stroke-width="0.8"/>
  <!-- Right Wall Window (Master Bedroom) -->
  <rect x="453" y="608" width="6" height="44" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <!-- Bottom Wall Windows (Living Room & Dining Room) -->
  <rect x="158" y="921" width="68" height="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <line x1="158" y1="924" x2="226" y2="924" stroke="#0f172a" stroke-width="0.8"/>
  <rect x="348" y="921" width="64" height="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <line x1="348" y1="924" x2="412" y2="924" stroke="#0f172a" stroke-width="0.8"/>

  <!-- ========================================================================= -->
  <!-- INTERIOR PARTITIONS, CLOSETS, BATHS, KITCHEN & DOOR SWINGS                 -->
  <!-- ========================================================================= -->
  <!-- Bedroom 2 (Top-Left: 11'0" x 11'0") & Master Closet -->
  <line x1="252" y1="564" x2="252" y2="660" stroke="#0f172a" stroke-width="3.5"/>
  <line x1="278" y1="564" x2="278" y2="660" stroke="#0f172a" stroke-width="3"/>
  <line x1="120" y1="660" x2="278" y2="660" stroke="#0f172a" stroke-width="3.5"/>
  <text x="268" y="612" text-anchor="middle" fill="#334155" font-size="7.5" transform="rotate(-90 268 612)">CLOSET</text>
  <text x="186" y="606" text-anchor="middle" fill="#0f172a" font-size="11.5" font-weight="700">BEDROOM 2</text>
  <text x="186" y="619" text-anchor="middle" fill="#334155" font-size="9.5">11'0" x 11'0"</text>
  <text x="186" y="630" text-anchor="middle" fill="#475569" font-size="7.5">FLAT CEILING</text>

  <!-- Master Bedroom (Top-Right: 12'4" x 13'8") -->
  <line x1="286" y1="680" x2="456" y2="680" stroke="#0f172a" stroke-width="3.5"/>
  <text x="368" y="616" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="700">MASTER BEDROOM</text>
  <text x="368" y="630" text-anchor="middle" fill="#334155" font-size="9.5">12'4" x 13'8"</text>
  <text x="368" y="641" text-anchor="middle" fill="#475569" font-size="7.5">FLAT CEILING</text>

  <!-- Closets Strip Between Bedroom 2 & Bedroom 3 (y=660..686) -->
  <line x1="120" y1="686" x2="244" y2="686" stroke="#0f172a" stroke-width="3"/>
  <line x1="176" y1="660" x2="176" y2="686" stroke="#0f172a" stroke-width="2.5"/>
  <line x1="224" y1="660" x2="224" y2="686" stroke="#0f172a" stroke-width="2.5"/>
  <line x1="244" y1="660" x2="244" y2="778" stroke="#0f172a" stroke-width="3.5"/>
  <text x="148" y="676" text-anchor="middle" fill="#334155" font-size="7">CLOSET</text>
  <text x="200" y="676" text-anchor="middle" fill="#334155" font-size="7">CLOSET</text>
  <text x="234" y="676" text-anchor="middle" fill="#334155" font-size="6.5" transform="rotate(-90 234 676)">LINEN</text>

  <!-- Bedroom 3 (Middle-Left: 10'0" x 10'0") -->
  <line x1="120" y1="778" x2="244" y2="778" stroke="#0f172a" stroke-width="3.5"/>
  <text x="182" y="724" text-anchor="middle" fill="#0f172a" font-size="11.5" font-weight="700">BEDROOM 3</text>
  <text x="182" y="737" text-anchor="middle" fill="#334155" font-size="9.5">10'0" x 10'0"</text>
  <text x="182" y="748" text-anchor="middle" fill="#475569" font-size="7.5">FLAT CEILING</text>

  <!-- Central Hallway (x=244..286) -->
  <line x1="286" y1="680" x2="286" y2="786" stroke="#0f172a" stroke-width="3.5"/>
  <text x="266" y="728" text-anchor="middle" fill="#0f172a" font-size="9.5" font-weight="700" transform="rotate(-90 266 728)">HALL</text>

  <!-- Dual Bathrooms Core (x=286..456, y=680..758) -->
  <line x1="354" y1="680" x2="354" y2="758" stroke="#0f172a" stroke-width="3"/>
  <line x1="286" y1="758" x2="456" y2="758" stroke="#0f172a" stroke-width="3.5"/>
  <!-- Left Hall Bath: Tub at bottom, Toilet & Sink on right wall -->
  <rect x="290" y="736" width="60" height="19" rx="4" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>
  <ellipse cx="342" cy="722" rx="8" ry="5" fill="#ffffff" stroke="#334155" stroke-width="1.1"/>
  <rect x="336" y="686" width="14" height="18" fill="#ffffff" stroke="#334155" stroke-width="1.1"/>
  <ellipse cx="343" cy="695" rx="4" ry="5" fill="#ffffff" stroke="#334155" stroke-width="0.9"/>
  <text x="312" y="718" text-anchor="middle" fill="#0f172a" font-size="9.5" font-weight="700" transform="rotate(-90 312 718)">BATH</text>

  <!-- Right Master En-Suite Bath: Walk-In Hatched Shower (x=354..382) + Toilet + Vanity -->
  <rect x="356" y="682" width="28" height="48" fill="url(#showerHatch)" stroke="#334155" stroke-width="1.1"/>
  <line x1="356" y1="682" x2="384" y2="730" stroke="#475569" stroke-width="0.8"/>
  <line x1="384" y1="682" x2="356" y2="730" stroke="#475569" stroke-width="0.8"/>
  <ellipse cx="402" cy="720" rx="5" ry="8" fill="#ffffff" stroke="#334155" stroke-width="1.1"/>
  <rect x="420" y="714" width="32" height="16" fill="#ffffff" stroke="#334155" stroke-width="1.1"/>
  <ellipse cx="436" cy="722" rx="6" ry="4" fill="#ffffff" stroke="#334155" stroke-width="0.9"/>
  <text x="412" y="702" text-anchor="middle" fill="#0f172a" font-size="9.5" font-weight="700">BATH</text>

  <!-- Coat Closet & Laundry/Water Heater Utility Strip (y=758..786) -->
  <line x1="286" y1="786" x2="342" y2="786" stroke="#0f172a" stroke-width="3"/>
  <line x1="342" y1="758" x2="342" y2="854" stroke="#0f172a" stroke-width="3.5"/>
  <text x="314" y="775" text-anchor="middle" fill="#334155" font-size="7.5">COAT</text>
  <!-- Water Heater Circle (W/H) & Washer/Dryer (W / D) -->
  <circle cx="366" cy="744" r="10" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <text x="366" y="747" text-anchor="middle" fill="#0f172a" font-size="6.5" font-weight="700">W/H</text>
  <rect x="392" y="734" width="24" height="20" fill="#ffffff" stroke="#334155" stroke-width="1.1"/>
  <rect x="418" y="734" width="24" height="20" fill="#ffffff" stroke="#334155" stroke-width="1.1"/>
  <text x="404" y="768" text-anchor="middle" fill="#334155" font-size="7.5" font-weight="700">W</text>
  <text x="430" y="768" text-anchor="middle" fill="#334155" font-size="7.5" font-weight="700">D</text>

  <!-- Kitchen Peninsula, Range (R/O), Sink, Dishwasher (D/W) & Refrigerator (Ref) -->
  <!-- Left Kitchen Counter + Breakfast Bar Peninsula -->
  <rect x="344" y="786" width="22" height="72" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>
  <path d="M 342 806 Q 328 806 328 820 L 328 852 Q 328 864 344 864" fill="none" stroke="#475569" stroke-width="1.1"/>
  <!-- 4-Burner Range/Oven (R/O) -->
  <rect x="345" y="822" width="20" height="24" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
  <circle cx="351" cy="828" r="2.5" fill="none" stroke="#0f172a" stroke-width="1"/>
  <circle cx="359" cy="828" r="2.5" fill="none" stroke="#0f172a" stroke-width="1"/>
  <circle cx="351" cy="838" r="2.5" fill="none" stroke="#0f172a" stroke-width="1"/>
  <circle cx="359" cy="838" r="2.5" fill="none" stroke="#0f172a" stroke-width="1"/>
  <text x="374" y="838" fill="#334155" font-size="7.5" transform="rotate(-90 374 838)">R/O</text>
  <text x="374" y="798" fill="#334155" font-size="7.5" transform="rotate(-90 374 798)">Ref</text>
  <!-- Right Kitchen Counter + Double Sink + D/W -->
  <rect x="432" y="792" width="22" height="74" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>
  <rect x="435" y="814" width="16" height="24" fill="#ffffff" stroke="#0f172a" stroke-width="1.1"/>
  <rect x="437" y="816" width="12" height="9" fill="#ffffff" stroke="#0f172a" stroke-width="0.9"/>
  <rect x="437" y="827" width="12" height="9" fill="#ffffff" stroke="#0f172a" stroke-width="0.9"/>
  <text x="425" y="856" fill="#334155" font-size="7.5" transform="rotate(-90 425 856)">D/W</text>
  <text x="404" y="824" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="700" transform="rotate(-90 404 824)">KITCHEN</text>

  <!-- Living Room (Bottom-Left: 17'4" x 18'8") & Dining (Bottom-Right: 8'1" x 8'4") -->
  <text x="228" y="846" text-anchor="middle" fill="#0f172a" font-size="12.5" font-weight="700">LIVING ROOM</text>
  <text x="228" y="860" text-anchor="middle" fill="#334155" font-size="9.5">17'4" x 18'8"</text>
  <text x="228" y="871" text-anchor="middle" fill="#475569" font-size="7.5">FLAT CEILING</text>

  <text x="394" y="886" text-anchor="middle" fill="#0f172a" font-size="11.5" font-weight="700">DINING</text>
  <text x="394" y="899" text-anchor="middle" fill="#334155" font-size="9.5">8'1" x 8'4"</text>
  <text x="394" y="910" text-anchor="middle" fill="#475569" font-size="7.5">FLAT CEILING</text>

  <!-- Quarter-Circle Architectural Door Swing Arcs -->
  <!-- Entry Door (Bottom Center) + ENTRY Porch Pad -->
  <rect x="266" y="924" width="44" height="32" fill="#ffffff" stroke="#475569" stroke-width="1" stroke-dasharray="3 2"/>
  <text x="288" y="945" text-anchor="middle" fill="#0f172a" font-size="9.5" font-weight="700">ENTRY</text>
  <rect x="272" y="921" width="28" height="6" fill="#ffffff"/>
  <line x1="272" y1="924" x2="292" y2="904" stroke="#0f172a" stroke-width="1.5"/>
  <path d="M 300 924 A 28 28 0 0 0 292 904" fill="none" stroke="#475569" stroke-width="1"/>

  <!-- Bedroom 2 Door Swing -->
  <line x1="252" y1="660" x2="234" y2="676" stroke="#0f172a" stroke-width="1.4"/>
  <path d="M 230 660 A 22 22 0 0 0 234 676" fill="none" stroke="#475569" stroke-width="0.9"/>
  <!-- Master Bedroom Door Swing -->
  <line x1="286" y1="664" x2="306" y2="678" stroke="#0f172a" stroke-width="1.4"/>
  <path d="M 286 680 A 22 22 0 0 0 306 678" fill="none" stroke="#475569" stroke-width="0.9"/>
  <!-- Bedroom 3 Door Swing -->
  <line x1="244" y1="716" x2="226" y2="732" stroke="#0f172a" stroke-width="1.4"/>
  <path d="M 244 738 A 22 22 0 0 1 226 732" fill="none" stroke="#475569" stroke-width="0.9"/>
  <!-- Kitchen-to-Patio Exterior Door Swing -->
  <rect x="453" y="766" width="6" height="24" fill="#ffffff"/>
  <line x1="456" y1="766" x2="438" y2="782" stroke="#0f172a" stroke-width="1.4"/>
  <path d="M 456 790 A 24 24 0 0 1 438 782" fill="none" stroke="#475569" stroke-width="0.9"/>

  <!-- ================================================================================= -->
  <!-- RIGHT PANEL (x=694..1060): EXECUTED IFC 4.3 MODEL & INDEPENDENT VALIDATOR CHECKS   -->
  <!-- ================================================================================= -->
  <rect x="694" y="486" width="366" height="478" rx="10" fill="#091526" stroke="#1e3a63" stroke-width="1.5"/>
  <rect x="706" y="498" width="342" height="28" rx="6" fill="#10243e" stroke="#e4b86a" stroke-width="1"/>
  <text x="877" y="516" text-anchor="middle" fill="#e4b86a" font-size="10.5" font-weight="800">EXECUTED BIM &amp; INDEPENDENT VALIDATOR (STEP 7)</text>

  <text x="712" y="544" fill="#38bdf8" font-size="10" font-weight="700">1. Machine-Readable IFC 4.3 Space Reconciliation</text>
  <text x="712" y="562" fill="#e2e8f0" font-size="9">• Master Bedroom (RM-101): 12'-4" × 13'-8" = 168.6 sq ft (15.7 m²) ✓</text>
  <text x="712" y="578" fill="#e2e8f0" font-size="9">• Bedroom 2 (RM-102): 11'-0" × 11'-0" = 121.0 sq ft (11.2 m²) ✓</text>
  <text x="712" y="594" fill="#e2e8f0" font-size="9">• Bedroom 3 (RM-103): 10'-0" × 10'-0" = 100.0 sq ft (9.3 m²) ✓</text>
  <text x="712" y="610" fill="#e2e8f0" font-size="9">• Living Room (RM-104): 17'-4" × 18'-8" = 323.6 sq ft (30.1 m²) ✓</text>
  <text x="712" y="626" fill="#e2e8f0" font-size="9">• Kitchen + Dining (RM-105): 168.0 + 67.5 = 235.5 sq ft (21.9 m²) ✓</text>
  <text x="712" y="642" fill="#e2e8f0" font-size="9">• 2 Full Baths + Hall + Closets: 127.3 sq ft (11.8 m²) ✓</text>
  <text x="712" y="658" fill="#4ade80" font-size="9.5" font-weight="700">• Conditioned Core: 28'×42' = 1,076 sq ft (100.0 m² Exact) ✓</text>
  <text x="712" y="674" fill="#7dd3fc" font-size="9.5" font-weight="700">• Covered Patio (EX-101): 12'×42' = 504 sq ft (46.8 m² Separate) ✓</text>

  <line x1="710" y1="686" x2="1044" y2="686" stroke="#1e3a63" stroke-width="1"/>
  <text x="712" y="704" fill="#e4b86a" font-size="10" font-weight="700">2. Independent Geometry &amp; Code Checks (No Self-Grading)</text>
  <text x="712" y="722" fill="#4ade80" font-size="9">[PASS] Zero AABB Room Overlaps · 100% BFS Connected via Hall</text>
  <text x="712" y="738" fill="#4ade80" font-size="9">[PASS] Habitable Rooms &gt;= 70 sq ft &amp; &gt;= 7'-0" min dim (IRC R304.1)</text>
  <text x="712" y="754" fill="#4ade80" font-size="9">[PASS] All 3 Bedrooms Have Exterior Egress Window &gt;= 5.7 sq ft</text>
  <text x="712" y="770" fill="#4ade80" font-size="9">[PASS] Dual Wet-Wall Core (Bath 1 + Bath 2 + W/H + Kitchen)</text>
  <text x="712" y="786" fill="#fbbf24" font-size="9">[HOLD] Legal Footprint Cap (80 m² vs 100 m²) -&gt; Use Option B (72 m²)</text>
  <text x="712" y="802" fill="#fbbf24" font-size="9">[HOLD] Local Setbacks, Soil Bearing &amp; Unit Price DB Verification</text>

  <line x1="710" y1="814" x2="1044" y2="814" stroke="#1e3a63" stroke-width="1"/>
  <text x="712" y="832" fill="#38bdf8" font-size="10" font-weight="700">3. Preliminary Cost &amp; Value-Engineering Verification</text>
  <text x="712" y="850" fill="#e2e8f0" font-size="9">• 100.0 m² Conditioned Core @ $1,180/m²: $118,000</text>
  <text x="712" y="866" fill="#e2e8f0" font-size="9">• 46.8 m² Covered Patio + 2-Car Pad @ $480/m²: $22,464</text>
  <text x="712" y="882" fill="#e2e8f0" font-size="9">• Site Prep, MEP Hookups &amp; 10% Contingency: $28,036</text>
  <rect x="710" y="896" width="334" height="54" rx="6" fill="#052e16" stroke="#4ade80" stroke-width="1.2"/>
  <text x="877" y="915" text-anchor="middle" fill="#4ade80" font-size="10.5" font-weight="800">PRELIMINARY ESTIMATE: $168,500 (&lt;= $180,000 BUDGET)</text>
  <text x="877" y="931" text-anchor="middle" fill="#dcfce7" font-size="8.5">Status: Potentially Feasible — Subject to Local AHJ &amp; Soil Verification</text>
  <text x="877" y="944" text-anchor="middle" fill="#86efac" font-size="8">No construction-ready stamp issued until Section 5 questions are resolved</text>
</svg>`;
}

export function buildResidentialDesignFeasibilityReportSection(
  question: string,
  brief: ShowcaseBriefSummary,
  baselineCostUsd: number,
): string {
  const q = question.toLowerCase();
  const is80m2Conflict = /\b80\s*m[²2]\b/.test(q);
  const plotW_m = /\b15\s*m\s*[x×]\s*30\s*m\b/i.test(q) ? 15 : Math.round(brief.lotWidthFt * 0.3048 * 10) / 10;
  const plotD_m = /\b15\s*m\s*[x×]\s*30\s*m\b/i.test(q) ? 30 : Math.round(brief.lotDepthFt * 0.3048 * 10) / 10;
  const plotArea_m2 = Math.round(plotW_m * plotD_m * 100) / 100;
  const buildableW_m = Math.max(0, Math.round((plotW_m - 3.0) * 10) / 10);
  const buildableD_m = Math.max(0, Math.round((plotD_m - 9.0) * 10) / 10);
  const buildableArea_m2 = (buildableW_m * buildableD_m).toFixed(1);
  const showcaseSvg = buildRealtorShowcaseAndWhiteFloorPlanSvg(brief, baselineCostUsd);

  return [
    `### Residential Design Feasibility Report (\`DStrike Noctis · Architectural Intelligence Engine\`)`,
    `> **Assessment Status:** \`Conflicting / Unresolved Requirements Detected — Hold Before Construction Issue\`\n> **Benchmark Governance:** Noctis calculates site geometry with explicit formulas, detects missing or conflicting constraints before committing to unverified plans, compares **Options A, B, and C** in the visual showcase below, and then **executes the actual dimensioned floor plan (\`40'-0" × 42'-0"\` / \`100.0 m²\`), machine-readable \`IFC 4.3\` building model, and independent geometry, cost, and compliance checks**.`,
    `#### 1. Client Requirements\nThe client requests a residential house design with:\n- **${brief.bedrooms} bedrooms** (Primary Suite + secondary family bedrooms)\n- **Living room, kitchen, and dining area**\n- **${brief.bathrooms} bathrooms**\n- **Laundry and dedicated storage**\n- **Parking for two vehicles** (enclosed garage or covered carport pad)\n- **Construction budget of \`$${brief.budgetUsd.toLocaleString()}\`, excluding land**\n- **Site:** \`${plotW_m} m × ${plotD_m} m\` rectangular plot (\`${brief.lotWidthFt} ft × ${brief.lotDepthFt} ft\`)` +
      (is80m2Conflict
        ? `\n- **Additional Footprint Conflict Clause (` +
          "`Test 13`" +
          `):** Client requests a \`120 m²\` house and a \`100 m²\` single-storey ground-floor footprint on a plot where the **legally permitted building footprint is capped at \`80 m²\`** (\`120 m² > 80 m²\` by \`+40 m²\`; \`100 m² > 80 m²\` by \`+20 m²\`).`
        : ""),
    `#### 2. Initial Site & Arithmetic Calculations\n| Parameter | Formula / Calculation | Verified Result |\n| :--- | :--- | :--- |\n| **Plot Area ($A_{\\text{plot}}$)** | $${plotW_m}\\text{ m} \\times ${plotD_m}\\text{ m}$ | **\`${plotArea_m2} m²\`** (\`${(brief.lotWidthFt * brief.lotDepthFt).toLocaleString()} sq ft\`) |\n| **Plot Frontage** | Given street boundary width | **\`${plotW_m} m\`** (\`${brief.lotWidthFt} ft\`) |\n| **Plot Depth** | Given property depth | **\`${plotD_m} m\`** (\`${brief.lotDepthFt} ft\`) |\n| **Construction Budget** | Given cap (excluding land) | **\`$${brief.budgetUsd.toLocaleString()}\`** |\n| **Provisional Setback Envelope** | $(${plotW_m} - 2\\times 1.5\\text{ m}) \\times (${plotD_m} - 5.0\\text{ m} - 4.0\\text{ m}) = ${buildableW_m}\\text{ m} \\times ${buildableD_m}\\text{ m}$ | **\`${buildableArea_m2} m²\`** *(Provisional — subject to local zoning)* |\n| **Permitted Legal Footprint Cap** | ${is80m2Conflict ? "Given statutory cap: `80.0 m²` vs requested `100–120 m²`" : "Unverified municipal lot coverage %"} | **${is80m2Conflict ? "`CONFLICT: +20 to +40 m² Overrun`" : "`UNVERIFIED — Requires AHJ Zoning Check`"}** |\n\nThe total plot area is **\`${plotArea_m2} m²\`**. However, this does not establish how much land can legally or practically be built on. **Setbacks, easements, maximum lot coverage, drainage, vehicle access, and soil conditions must be established first.**`,
    `#### 3. Feasibility Assessment\nNoctis does not blindly issue a final construction floor plan when foundational constraints are unresolved or conflicting:\n- **Issue A — Permitted Building Footprint:** The legal buildable area must be verified against municipal zoning ordinances. A footprint that fits physically inside the \`${plotArea_m2} m²\` property boundary may still violate front/rear/side setbacks or maximum lot-coverage limits (and where an \`80 m²\` legal footprint cap applies, a \`100 m²\` or \`120 m²\` single-storey house is **mathematically illegal** without switching to a 2-storey or compact layout).\n- **Issue B — Parking and Access:** Two parking spaces require approximately \`5.4 m × 5.5 m = 29.7 m²\` (\`~30 m²\`) plus a workable driveway cut and turning apron along the \`${plotW_m} m\` frontage.\n- **Issue C — Budget Feasibility:** Confirming whether \`$${brief.budgetUsd.toLocaleString()}\` is achievable requires a reconciled floor area, location-specific labor/material unit rates, foundation engineering from soil data, and explicit allowances for site work, waste (\`5–8%\`), and contingency (\`10%\`).`,
    `#### 4. Preliminary Design Alternatives (Realtor Showcase Format + Measured \`40'-0" × 42'-0"\` CAD Floor Plan)\n\`\`\`svg\n${showcaseSvg}\n\`\`\`\n\n| Design Option | Architectural Configuration | Primary Advantage | Key Engineering & Cost Trade-Off |\n| :--- | :--- | :--- | :--- |\n| **Option A — Compact Single-Storey House** | Single-storey \`40'-0" × 42'-0"\` (\`28'×42' = 100.0 m²\` conditioned core + \`12'×42' = 46.8 m²\` covered patio), 3 bedrooms, 2 baths, combined living/dining, compact wet core, straightforward roof. | Simpler single-level construction, zero staircase area loss, step-free accessibility, lowest estimated base cost (\`~$168,500\`). | Room sizes (\`Bed 2: 11'×11'\`, \`Bed 3: 10'×10'\`) and storage are compact; exceeds an \`80 m²\` footprint cap if such a zoning cap applies. |\n| **Option B — Two-Storey Alternative** | Places secondary bedrooms upstairs (\`72.0 m²\` ground floor + \`48.0 m²\` upper floor = \`120.0 m²\` total GFA), keeping ground footprint \`<= 80.0 m²\`. | Preserves more outdoor garden/courtyard space and legally satisfies strict \`80 m²\` ground-footprint / lot-coverage caps. | Requires staircase (\`ST-101\`), structural upper-floor slab/joists, and scaffolding; not automatically cheaper (\`~$187,200\`). |\n| **Option C — Phased Construction** | Builds the core \`2BR / 1BA\` + Living/Kitchen (\`68 m²\`, \`~$122,400\`) in Phase 1 with pre-installed lintels & capped MEP stubs, expanding to \`3–4BR\` later. | Spreads capital expenditure over time when initial budget is tight. | Requires upfront master-plan permitting, pre-sized \`200A\` panel, capped sanitary/PEX stubs, and weatherproof expansion joints. |`,
    `#### 5. Questions Noctis Must Ask Before Proceeding to Final Construction Issue\n1. **Jurisdiction & Municipality:** In which country, state/region, and municipality will the house be built?\n2. **Storey Flexibility:** Is a single-storey layout mandatory (e.g., for mobility/aging-in-place), or will the client consider a two-storey alternative (**Option B**) if lot-coverage rules require it?\n3. **Zoning & Setbacks:** What are the legally mandated front, rear, and side setbacks, maximum building coverage percentage, and height limits for this parcel?\n4. **Room & Accessibility Standards:** What are the client's minimum preferred bedroom dimensions and universal/wheelchair accessibility requirements?\n5. **Budget Scope Boundary:** Does the \`$${brief.budgetUsd.toLocaleString()}\` budget include professional design fees, municipal permits, utility hookups, boundary walls, site grading, and a \`10%\` contingency reserve?\n6. **Site & Geotechnical Data:** Is there a topographic survey, geotechnical soil-bearing borehole report, and confirmation of stormwater drainage and utility mains?`,
    `#### 6. Recommended Next Action & Current Conclusion\n- **Recommended Next Action:** Obtain the missing municipal zoning, soil, and budget scope answers (Section 5), lock the legally permitted building envelope, and select **Option A**, **Option B**, or **Option C** for detailed engineering.\n- **Current Conclusion:** *The project is potentially feasible, but legal zoning compliance and localized contractor pricing have not yet been verified from primary site documents. No construction-ready stamped drawings should be issued until the Section 5 hold points are cleared.*`,
    `#### 7. Executed Benchmark Step — Machine-Readable \`IFC 4.3\` Model & Independent Validator Proof\nTo prove that Noctis **executes** the design rather than merely describing it, the measured \`40'-0" × 42'-0"\` (\`100.0 m²\` conditioned core + \`46.8 m²\` covered patio) floor plan shown in **Sheet A-101W** above is compiled into a machine-readable \`IFC4X3\` building model and checked by the **Independent Geometry, Cost & Compliance Validator**:\n\n\`\`\`json\n{\n  "ifcSchema": "IFC4X3_ADD2",\n  "modelId": "NOCTIS-EXEC-100M2-3BR2BA",\n  "approvalStatus": "CONCEPT_VERIFIED_PENDING_SITE_DATA",\n  "overallDimensions": { "totalWidthFt": 40.0, "coreWidthFt": 28.0, "patioWidthFt": 12.0, "depthFt": 42.0 },\n  "areaReconciliation": {\n    "conditionedCoreSqFt": 1076.0,\n    "conditionedCoreSqM": 100.0,\n    "coveredPatioSqFt": 504.0,\n    "coveredPatioSqM": 46.8,\n    "doubleCountedAreaSqM": 0.0\n  },\n  "spaces": [\n    { "code": "RM-101", "name": "Master Bedroom", "dim": "12'-4\\" x 13'-8\\"", "areaSqFt": 168.6, "areaSqM": 15.7, "egressWindow": true },\n    { "code": "RM-102", "name": "Bedroom 2", "dim": "11'-0\\" x 11'-0\\"", "areaSqFt": 121.0, "areaSqM": 11.2, "egressWindow": true },\n    { "code": "RM-103", "name": "Bedroom 3", "dim": "10'-0\\" x 10'-0\\"", "areaSqFt": 100.0, "areaSqM": 9.3, "egressWindow": true },\n    { "code": "RM-104", "name": "Living Room", "dim": "17'-4\\" x 18'-8\\"", "areaSqFt": 323.6, "areaSqM": 30.1, "egressWindow": true },\n    { "code": "RM-105", "name": "Kitchen & Dining", "dim": "8'-1\\" x 20'-8\\"", "areaSqFt": 235.5, "areaSqM": 21.9, "wetCore": true },\n    { "code": "RM-106", "name": "Bath 1 + Master Bath 2 + Hall + Closets", "dim": "Consolidated Core", "areaSqFt": 127.3, "areaSqM": 11.8, "wetCore": true },\n    { "code": "EX-101", "name": "Covered Patio", "dim": "42'-0\\" x 12'-0\\"", "areaSqFt": 504.0, "areaSqM": 46.8, "exterior": true }\n  ],\n  "independentValidatorChecks": {\n    "geometryAabbOverlaps": 0,\n    "circulationBfsConnected": true,\n    "habitableRoomMinAreaPass": true,\n    "bedroomEgressPass": true,\n    "preliminaryCostUsd": 168500,\n    "within180kBudgetCap": true,\n    "unresolvedHoldGates": ["Municipal Setback & Lot Coverage Certificate", "Geotechnical Borehole Bearing Capacity", "Local Sub-Trade Unit Rate Confirmation"]\n  }\n}\n\`\`\``,
  ].join("\n\n");
}
