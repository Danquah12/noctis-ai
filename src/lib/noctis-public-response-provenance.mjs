/**
 * API-safe Noctis response provenance adapter.
 *
 * The model gateway and specialist routes already produce narrow metadata.
 * Public API serialization must re-validate that metadata and must NEVER
 * serialize an arbitrary internal result, provider response, prompt or key.
 * This does not independently authenticate the provider's model identity.
 */
import { readNoctisModelProvenance } from "./noctis-model-provenance.mjs";
import { readNoctisRouteProvenance } from "./noctis-route-provenance.mjs";

/** @param {unknown} raw */
export function sanitizeNoctisPublicResponseProvenance(raw) {
  return readNoctisModelProvenance(raw) ?? readNoctisRouteProvenance(raw);
}
