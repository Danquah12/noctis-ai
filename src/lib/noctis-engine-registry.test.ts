import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findNoctisEnginesByCapability,
  getNoctisEngine,
  listNoctisEngines,
  validateNoctisEngineRequest,
  type NoctisEngineRequest,
} from "./noctis-engine-registry.ts";

function resultCode(result: ReturnType<typeof validateNoctisEngineRequest>): string {
  return result.ok ? "OK" : result.code;
}

describe("Noctis engine registry", () => {
  it("registers the initial source-backed specialist cohort", () => {
    const engines = listNoctisEngines();
    assert.equal(engines.length, 18);
    assert.equal(new Set(engines.map((engine) => engine.id)).size, engines.length);
    assert.ok(engines.every((engine) => engine.sourcePath.startsWith("src/lib/noctis-")));
  });

  it("resolves every declared dependency and keeps source paths unique", () => {
    const engines = listNoctisEngines();
    const ids = new Set(engines.map((engine) => engine.id));
    const sourcePaths = engines.map((engine) => engine.sourcePath);
    assert.equal(new Set(sourcePaths).size, sourcePaths.length);
    for (const engine of engines) {
      for (const dependency of engine.dependencies) {
        assert.ok(ids.has(dependency), `Unresolved dependency ${dependency} declared by ${engine.id}`);
      }
    }
  });

  it("supports domain and capability discovery", () => {
    assert.ok(listNoctisEngines({ domain: "health" }).some((engine) => engine.id === "noctis.health.clinical"));
    assert.deepEqual(findNoctisEnginesByCapability("cyber.sast.analyze").map((engine) => engine.id), ["noctis.cyber.sast"]);
    assert.deepEqual(findNoctisEnginesByCapability(" ").map((engine) => engine.id), []);
  });

  it("returns defensive copies rather than mutable registry internals", () => {
    const first = getNoctisEngine("noctis.core.orchestrator");
    assert.ok(first);
    (first.capabilities as string[]).push("unsafe.injected.capability");
    assert.equal(getNoctisEngine("noctis.core.orchestrator")?.capabilities.includes("unsafe.injected.capability"), false);
  });

  it("rejects unknown engines, unsupported capabilities and missing evidence", () => {
    const base: NoctisEngineRequest = {
      requestId: "req-1", tenantId: "tenant-1", actorId: "actor-1",
      engineId: "noctis.cyber.sast", capability: "cyber.sast.analyze", input: {},
      context: { correlationId: "corr-1" },
      authorization: { scopes: ["cyber:read"], executionMode: "analysis" },
      constraints: { dataClassification: "confidential" },
    };
    assert.equal(resultCode(validateNoctisEngineRequest({ ...base, engineId: "missing" })), "ENGINE_NOT_FOUND");
    assert.equal(resultCode(validateNoctisEngineRequest({ ...base, capability: "cyber.delete" })), "CAPABILITY_NOT_SUPPORTED");
    assert.equal(resultCode(validateNoctisEngineRequest(base)), "EVIDENCE_REQUIRED");
  });

  it("requires evidence and explicit approval before supervised high-impact work", () => {
    const request: NoctisEngineRequest = {
      requestId: "req-2", tenantId: "tenant-1", actorId: "actor-1",
      engineId: "noctis.professional.intelligence", capability: "profession.workflow.plan", input: {},
      context: { correlationId: "corr-2", evidenceIds: ["ev-1"] },
      authorization: { scopes: ["profession:read"], executionMode: "supervised" },
      constraints: { dataClassification: "internal" },
    };
    assert.equal(resultCode(validateNoctisEngineRequest(request)), "APPROVAL_REQUIRED");
    assert.equal(validateNoctisEngineRequest({
      ...request,
      authorization: { ...request.authorization, approvalId: "approval-1" },
    }).ok, true);
  });


  it("enforces declared scopes and classification ceilings", () => {
    const request: NoctisEngineRequest = {
      requestId: "req-4", tenantId: "tenant-1", actorId: "actor-1",
      engineId: "noctis.cyber.sast", capability: "cyber.sast.analyze", input: {},
      context: { correlationId: "corr-4", evidenceIds: ["ev-3"] },
      authorization: { scopes: ["risk:read"], executionMode: "analysis" },
      constraints: { dataClassification: "confidential" },
    };
    assert.equal(resultCode(validateNoctisEngineRequest(request)), "SCOPE_REQUIRED");
    assert.equal(resultCode(validateNoctisEngineRequest({
      ...request,
      authorization: { scopes: ["cyber:read"], executionMode: "analysis" },
      constraints: { dataClassification: "restricted" },
    })), "DATA_CLASSIFICATION_EXCEEDED");
  });

  it("does not permit unsupported execution modes", () => {
    const request: NoctisEngineRequest = {
      requestId: "req-3", tenantId: "tenant-1", actorId: "actor-1",
      engineId: "noctis.health.clinical", capability: "health.clinical.assess", input: {},
      context: { correlationId: "corr-3", evidenceIds: ["ev-2"] },
      authorization: { scopes: ["health:read"], executionMode: "approved_execution" },
      constraints: { dataClassification: "restricted" },
    };
    assert.equal(resultCode(validateNoctisEngineRequest(request)), "EXECUTION_MODE_NOT_ALLOWED");
  });
});
