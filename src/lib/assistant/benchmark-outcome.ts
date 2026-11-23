/**
 * In-process component benchmark task outcome normalization.
 * Descriptive text is legacy success evidence, not proof of model intelligence.
 * Explicit negative or missing results must never become PASS.
 */
export type ComponentTaskStatus = "PASS" | "PARTIAL" | "FAIL";

export function classifyComponentTaskOutcome(raw: unknown): {
  status: ComponentTaskStatus;
  evidence: string;
} {
  if (typeof raw !== "string" || !raw.trim()) {
    return { status: "FAIL", evidence: "Missing or invalid task outcome" };
  }
  const value = raw.trim();
  if (value === "PARTIAL") return { status: "PARTIAL", evidence: "Partial component check" };
  if (/^(FAIL|FAILED|ERROR|UNVERIFIED|FALSE)(?:\s*[:\-].*)?$/i.test(value)) {
    return { status: "FAIL", evidence: value };
  }
  if (value === "PASS") return { status: "PASS", evidence: "Verified by component assertion" };
  return { status: "PASS", evidence: value };
}

/** Separates self-asserted in-process checks from a held-out live model benchmark. */
export const COMPONENT_BENCHMARK_PROVENANCE = Object.freeze({
  benchmarkScope: "in_process_application_component_checks",
  evidenceMethod: "self_asserted_deterministic_functions",
  modelInferenceEvaluated: false,
  heldOutDatasetEvaluated: false,
  independentEvaluationVerified: false,
  modelQualityScore: null,
  releaseGate: "not_established",
});
