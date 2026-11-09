import os

api_path = r"d:\Anti-gravity\expedite-consults\expedite-consults\noctis-ai\src\routes\api\noctis.ts"
with open(api_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove the duplicate frontier block in POST
marker = 'if (url.searchParams.get("frontier") === "overview") {'
first_idx = text.find(marker)
second_idx = text.find(marker, first_idx + 1)
assert second_idx > first_idx, "Could not find second occurrence"

end_marker = "const status = await trainingStatus();"
second_end = text.find(end_marker, second_idx)
assert second_end > second_idx, "Could not find second end marker"

# In the second occurrence, replace from second_idx up to second_end with empty string
text = text[:second_idx] + text[second_end:]

# 2. Add typing fields to body in POST
old_body_end = """          auto_train_20_areas?: {
            commit_to_memory?: boolean;
          };
          construction_boq?: Record<string, unknown>;
          diesel_diagnostics?: Record<string, unknown>;
        } | null;"""

new_body_end = """          auto_train_20_areas?: {
            commit_to_memory?: boolean;
          };
          frontier_solve?: { challengeId: number; params?: Record<string, unknown> };
          health_500_evaluate?: { caseId: string; candidateResponse: string };
          dicom_analyze?: { action: "hu" | "hemorrhage" | "aspects" | "cxr"; hu?: number; ctParams?: Record<string, unknown>; aspectsParams?: Record<string, unknown>; cxrParams?: Record<string, unknown> };
          quant_risk?: { mode: "bs" | "var" | "markowitz"; bsParams?: Record<string, unknown>; varParams?: Record<string, unknown>; markowitzParams?: Record<string, unknown> };
          construction_boq?: Record<string, unknown>;
          diesel_diagnostics?: Record<string, unknown>;
        } | null;"""

assert old_body_end in text, "old_body_end not found"
text = text.replace(old_body_end, new_body_end, 1)

# 3. Add POST handlers for frontier_solve, health_500_evaluate, dicom_analyze, quant_risk
old_handler_anchor = """        if (body?.auto_train_20_areas && typeof body.auto_train_20_areas === "object") {"""

new_handlers = """        if (body?.frontier_solve) {
          const challenges = await import("@/lib/noctis-engineering-challenges");
          const challengeId = body.frontier_solve.challengeId;
          const params = body.frontier_solve.params || {};
          let result: unknown = null;
          switch (challengeId) {
            case 1: result = challenges.solveSmartCity001(params); break;
            case 2: result = challenges.solveSpacecraftTrajectory002(params); break;
            case 3: result = challenges.solveSmrThermalHydraulics003(params); break;
            case 4: result = challenges.solveSemiconductorCleanroom004(params); break;
            case 5: result = challenges.solveHypersonicAeroheating005(params); break;
            case 6: result = challenges.solveFusionTokamak006(params as any); break;
            case 7: result = challenges.solveSubseaHvdc007(params); break;
            case 8: result = challenges.solveQuantumDilutionFridge008(params); break;
            case 9: result = challenges.solveHypersonicScramjet009(params); break;
            case 10: result = challenges.solveDeepSeaSubmersible010(params); break;
            case 11: result = challenges.solveDacEnergetics011(params); break;
            case 12: result = challenges.solveFloatingWindMooring012(params); break;
            case 13: result = challenges.solveSmesQuenchProtection013(params); break;
            case 14: result = challenges.solveSolidStateBattery014(params); break;
            case 15: result = challenges.solveTbccPropulsion015(params); break;
            case 16: result = challenges.solveDsocLaserLink016(params); break;
            case 17: result = challenges.solveLiquidHydrogenZbo017(params); break;
            case 18: result = challenges.solveSupercriticalGeothermal018(params); break;
            case 19: result = challenges.solveNeuromorphicRram019(params); break;
            case 20: result = challenges.solveAsteroidDeflection020(params); break;
            default: return Response.json({ error: "Invalid challenge ID (1..20)" }, { status: 400, headers: CORS_HEADERS });
          }
          return Response.json({ challengeId, result }, { headers: CORS_HEADERS });
        }
        if (body?.health_500_evaluate) {
          const { evaluateNoctisHealth500Case } = await import("@/lib/noctis-health-500-engine");
          const fs = await import("node:fs");
          const path = await import("node:path");
          const catalogPath = path.resolve(process.cwd(), "src/lib/noctis-health-500-complete.json");
          if (!fs.existsSync(catalogPath)) {
            return Response.json({ error: "Catalog not found" }, { status: 500, headers: CORS_HEADERS });
          }
          const cases = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
          const targetCase = cases.find((c: any) => c.caseId === body.health_500_evaluate?.caseId);
          if (!targetCase) {
            return Response.json({ error: "Case not found" }, { status: 404, headers: CORS_HEADERS });
          }
          const evalResult = evaluateNoctisHealth500Case(targetCase, body.health_500_evaluate.candidateResponse || "");
          return Response.json(evalResult, { headers: CORS_HEADERS });
        }
        if (body?.dicom_analyze) {
          const dicom = await import("@/lib/noctis-dicom-vision");
          const action = body.dicom_analyze.action;
          let result: unknown = null;
          if (action === "hu") {
            result = dicom.classifyHounsfieldUnit(body.dicom_analyze.hu ?? 0);
          } else if (action === "hemorrhage") {
            result = dicom.analyzeHeadCtHemorrhage((body.dicom_analyze.ctParams as any) || {});
          } else if (action === "aspects") {
            result = dicom.calculateAspectsScore((body.dicom_analyze.aspectsParams as any) || {});
          } else if (action === "cxr") {
            result = dicom.analyzeChestRadiograph((body.dicom_analyze.cxrParams as any) || {});
          }
          return Response.json({ action, result }, { headers: CORS_HEADERS });
        }
        if (body?.quant_risk) {
          const quant = await import("@/lib/noctis-quant-risk");
          const mode = body.quant_risk.mode;
          let result: unknown = null;
          if (mode === "bs") {
            result = quant.calculateBlackScholesGreeks((body.quant_risk.bsParams as any) || {});
          } else if (mode === "var") {
            result = quant.calculateMonteCarloVaR((body.quant_risk.varParams as any) || {});
          } else if (mode === "markowitz") {
            result = quant.optimizeMarkowitzPortfolio((body.quant_risk.markowitzParams as any) || {});
          }
          return Response.json({ mode, result }, { headers: CORS_HEADERS });
        }
        if (body?.auto_train_20_areas && typeof body.auto_train_20_areas === "object") {"""

assert old_handler_anchor in text, "old_handler_anchor not found"
text = text.replace(old_handler_anchor, new_handlers, 1)

with open(api_path, "w", encoding="utf-8") as f:
    f.write(text)

print("[+] Successfully updated src/routes/api/noctis.ts")
