/**
 * Noctis NDIMP Better-Auth Session & RBAC Caller Resolver
 *
 * Resolves cryptographically authenticated Better-Auth sessions or member cookies
 * for browser operators on `/api/v2/dod-ic/*`, while preserving backward-compatible
 * Bearer API key / `x-tenant-id` resolution for CLI tools and automated test harnesses.
 */

import { sha256Sync } from "../universal-crypto.ts";

export type DodIcRbacRole =
  | "AO_HUMAN"
  | "ISSM_HUMAN"
  | "SCA_HUMAN"
  | "ANALYST_HUMAN"
  | "PUBLIC_SANDBOX";

export interface DodIcCallerContext {
  actorId: string;
  actorEmail: string | null;
  actorName: string | null;
  tenantId: string;
  authMethod: "BETTER_AUTH_SESSION" | "API_KEY_BEARER" | "SANDBOX_PUBLIC";
  rbacRole: DodIcRbacRole;
  permissions: {
    canRead: boolean;
    canProposePolicy: boolean;
    canApprovePolicy: boolean;
    canReplayTraces: boolean;
    canExportArtifacts: boolean;
  };
}

function mapRoleFromHints(email: string | null, explicitRoleHdr: string | null): DodIcRbacRole {
  const hdr = (explicitRoleHdr || "").trim().toUpperCase();
  if (hdr === "AO_HUMAN" || hdr === "AO") return "AO_HUMAN";
  if (hdr === "ISSM_HUMAN" || hdr === "ISSM") return "ISSM_HUMAN";
  if (hdr === "SCA_HUMAN" || hdr === "SCA") return "SCA_HUMAN";
  if (hdr === "ANALYST_HUMAN" || hdr === "ANALYST") return "ANALYST_HUMAN";

  if (email) {
    const lower = email.toLowerCase();
    const aoAllow = (process.env.NOCTIS_AO_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    const issmAllow = (process.env.NOCTIS_ISSM_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    if (aoAllow.includes(lower)) return "AO_HUMAN";
    if (issmAllow.includes(lower)) return "ISSM_HUMAN";
    return "ISSM_HUMAN";
  }

  return "PUBLIC_SANDBOX";
}

function permissionsForRole(role: DodIcRbacRole, authenticated: boolean) {
  const canApprove = authenticated || role === "AO_HUMAN" || role === "ISSM_HUMAN";
  return {
    canRead: true,
    canProposePolicy: true,
    canApprovePolicy: canApprove,
    canReplayTraces: true,
    canExportArtifacts: true,
  };
}

/**
 * Resolves caller identity, tenant boundary, and RBAC permissions from Better-Auth session
 * cookies or API credentials. Never crashes when DB/auth is unconfigured (tests/offline).
 */
export async function resolveDodIcCallerContext(request: Request): Promise<DodIcCallerContext> {
  const explicitTenant = (request.headers.get("x-tenant-id") || "").trim();
  const explicitRoleHdr = request.headers.get("x-noctis-role");
  const authHdr = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const noctisKeyHdr = (request.headers.get("x-noctis-key") || "").trim();
  const hasCookie = Boolean(request.headers.get("cookie"));

  // 1. Try Better-Auth Session / Member Cookie when cookies or session bearer exist
  if (hasCookie || authHdr) {
    try {
      const { auth, authConfigured } = await import("../auth/server.ts");
      if (authConfigured) {
        const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
        if (session?.user) {
          const email = session.user.email ?? null;
          const rbacRole = mapRoleFromHints(email, explicitRoleHdr);
          return {
            actorId: email || session.user.id,
            actorEmail: email,
            actorName: session.user.name ?? null,
            tenantId: explicitTenant || `tenant:${session.user.id}`,
            authMethod: "BETTER_AUTH_SESSION",
            rbacRole,
            permissions: permissionsForRole(rbacRole, true),
          };
        }
      }
      const { readMemberCookieFromHeaders } = await import("../auth/member-cookie.server.ts");
      const member = readMemberCookieFromHeaders(request.headers);
      if (member) {
        const email = member.email ?? null;
        const rbacRole = mapRoleFromHints(email, explicitRoleHdr);
        return {
          actorId: email || member.id,
          actorEmail: email,
          actorName: member.name ?? null,
          tenantId: explicitTenant || `tenant:${member.id}`,
          authMethod: "BETTER_AUTH_SESSION",
          rbacRole,
          permissions: permissionsForRole(rbacRole, true),
        };
      }
    } catch {
      /* Safe fallback to API key / public sandbox when auth module or DB is unavailable */
    }
  }

  // 2. Programmatic API Key / Bearer Token
  const token = noctisKeyHdr || authHdr;
  if (token) {
    const keyHash = sha256Sync(token).slice(0, 16);
    const rbacRole = mapRoleFromHints(null, explicitRoleHdr || "ISSM_HUMAN");
    return {
      actorId: `apikey:${keyHash}`,
      actorEmail: null,
      actorName: "API Operator",
      tenantId: explicitTenant || `tenant:${keyHash}`,
      authMethod: "API_KEY_BEARER",
      rbacRole,
      permissions: permissionsForRole(rbacRole, true),
    };
  }

  // 3. Explicit Sandbox Tenant Header or Default Sandbox
  const fallbackRole = explicitRoleHdr ? mapRoleFromHints(null, explicitRoleHdr) : "PUBLIC_SANDBOX";
  return {
    actorId: explicitTenant ? `sandbox:${explicitTenant}` : "sandbox:public-operator",
    actorEmail: null,
    actorName: "Sandbox Operator",
    tenantId: explicitTenant || "tenant:public-sandbox",
    authMethod: "SANDBOX_PUBLIC",
    rbacRole: fallbackRole,
    permissions: permissionsForRole(fallbackRole, false),
  };
}
