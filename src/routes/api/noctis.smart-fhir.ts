import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, X-Noctis-Key",
};

export const Route = createFileRoute("/api/noctis/smart-fhir")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "endpoints";

        const {
          SMART_ENDPOINTS,
          CURATED_SANDBOX_PATIENTS,
          buildSmartAuthorizeUrl,
          mapFhirPatientToClinicalCase,
        } = await import("@/lib/noctis-smart-fhir");

        if (action === "endpoints") {
          return Response.json(
            {
              status: "active",
              protocol: "SMART on FHIR v2.0.0 / US Core v9.0.0",
              endpoints: SMART_ENDPOINTS,
              sandboxPatientsCount: CURATED_SANDBOX_PATIENTS.length,
            },
            { headers: CORS_HEADERS }
          );
        }

        if (action === "launch") {
          const vendor = (url.searchParams.get("vendor") || "epic") as "epic" | "cerner" | "custom";
          const endpoint = SMART_ENDPOINTS[vendor] || SMART_ENDPOINTS.epic;
          const redirectUri = url.searchParams.get("redirect_uri") || `${url.origin}/noctis/callback`;
          const state = url.searchParams.get("state") || `state-${Date.now()}`;
          const codeChallenge = url.searchParams.get("code_challenge") || "mock-challenge-sha256";
          const launchContextId = url.searchParams.get("launch") || undefined;

          const authUrl = buildSmartAuthorizeUrl({
            endpoint,
            redirectUri,
            state,
            codeChallenge,
            launchContextId,
          });

          return Response.json(
            {
              authorizationUrl: authUrl,
              vendor,
              endpoint: endpoint.name,
              state,
            },
            { headers: CORS_HEADERS }
          );
        }

        if (action === "sandbox-patient") {
          const id = url.searchParams.get("id");
          const patient = CURATED_SANDBOX_PATIENTS.find((p) => p.id === id) || CURATED_SANDBOX_PATIENTS[0];
          const mappedCase = mapFhirPatientToClinicalCase(patient);
          return Response.json(
            {
              rawSandboxPatient: patient,
              mappedCase,
            },
            { headers: CORS_HEADERS }
          );
        }

        return Response.json(
          {
            error: `Unsupported action '${action}'. Valid actions: endpoints, launch, sandbox-patient.`,
          },
          { status: 400, headers: CORS_HEADERS }
        );
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            transformFhirResourcesToNoctisPatient,
            convertEhrPatientRecordToPrompt,
          } = await import("@/lib/noctis-smart-fhir");
          const { arbitrateClinicalConsensus } = await import("@/lib/noctis-clinical-consensus");
          const { buildFhirR4HospitalBundle } = await import("@/lib/noctis-fhir-exporter");

          const patientResource = body.patient || {};
          const observations = body.observations || [];
          const conditions = body.conditions || [];
          const medications = body.medications || [];

          const ingestedRecord = transformFhirResourcesToNoctisPatient(
            patientResource,
            observations,
            conditions,
            medications,
            body.encounter
          );

          const prompt = convertEhrPatientRecordToPrompt(ingestedRecord);
          const consensus = arbitrateClinicalConsensus(prompt, ingestedRecord.encounterId);
          const fhirWritebackBundle = buildFhirR4HospitalBundle(consensus, prompt, {
            patientName: ingestedRecord.name,
            mrn: ingestedRecord.patientId,
            hospitalSite: ingestedRecord.sourceEhrSystem,
          });

          return Response.json(
            {
              status: "success",
              ingestedRecord,
              synthesizedClinicalReport: consensus.synthesizedClinicalReport,
              consensusDossier: consensus,
              fhirWritebackBundle,
            },
            { headers: CORS_HEADERS }
          );
        } catch (err: any) {
          return Response.json(
            { error: err?.message || "Failed to process FHIR ingestion payload" },
            { status: 500, headers: CORS_HEADERS }
          );
        }
      },
    },
  },
});
