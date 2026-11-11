/**
 * Provenance for explicit Noctis response short-circuits that do not return
 * through the instrumented model gateway. Metadata contains only fixed route
 * identifiers. A route tag is not a claim that a specialist used no models.
 */
const routeKinds = Object.freeze({
  source_retrieval_report: "retrieval",
  science_formula_solver: "specialist",
  inline_math: "deterministic",
  cve_intelligence: "specialist",
  approved_qa_memory: "stored_answer",
  science_lab: "specialist",
  calculation_engine: "deterministic",
  knowledge_card: "stored_answer",
  missing_source_response: "unavailable",
  missing_chapter_response: "unavailable",
});

/**
 * @typedef {{
 *  protocol: "noctis.route.v1",
 *  source_kind: "retrieval" | "specialist" | "deterministic" | "stored_answer" | "unavailable",
 *  route_id: keyof typeof routeKinds,
 *  model_gateway_attribution: "not_available",
 *  model_identity_independently_verified: false
 * }} NoctisRouteProvenance
 */

/** @param {keyof typeof routeKinds} routeId
 *  @returns {NoctisRouteProvenance} */
export function makeNoctisRouteProvenance(routeId) {
  if (!Object.hasOwn(routeKinds, routeId)) {
    throw new Error("Unknown Noctis response route");
  }
  return {
    protocol: "noctis.route.v1",
    source_kind: /** @type {NoctisRouteProvenance["source_kind"]} */ (routeKinds[routeId]),
    route_id: routeId,
    model_gateway_attribution: "not_available",
    model_identity_independently_verified: false,
  };
}

/**
 * Accept only known route IDs and consistent kinds, dropping all extra keys.
 * The route was reported by the application, not independently attested.
 * @param {unknown} raw
 * @returns {NoctisRouteProvenance | null}
 */
export function readNoctisRouteProvenance(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = /** @type {Record<string, unknown>} */ (raw);
  if (value.protocol !== "noctis.route.v1" ||
      typeof value.route_id !== "string" ||
      !Object.hasOwn(routeKinds, value.route_id) ||
      value.source_kind !== routeKinds[/** @type {keyof typeof routeKinds} */ (value.route_id)] ||
      value.model_gateway_attribution !== "not_available") return null;
  return makeNoctisRouteProvenance(/** @type {keyof typeof routeKinds} */ (value.route_id));
}
