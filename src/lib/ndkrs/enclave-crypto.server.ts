/**
 * NDKRS Isolated AES-256-GCM Clinical Enclave Encryption (Server-Side Only)
 *
 * Keeps tenant clinical encounters cryptographically isolated and encrypted at rest
 * inside `ndkrs.clinical_enclave_records`, strictly separated from shared knowledge tables.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ensureNdkrsSchema } from "./persistence.server.ts";

function resolveEnclaveKey(): { keyBytes: Buffer; keyVersion: string } {
  const configured = typeof process !== "undefined" ? process.env.NOCTIS_ENCLAVE_KEY?.trim() : "";
  const material = configured || process.env.BETTER_AUTH_SECRET?.trim() || "noctis-dev-enclave-aes256-v1";
  const keyVersion = configured ? "prod-enclave-v1" : "dev-enclave-fallback-v1";
  return {
    keyBytes: createHash("sha256").update(material, "utf8").digest(),
    keyVersion,
  };
}

export interface EncryptedClinicalEnvelope {
  encryptedPayloadB64: string;
  ivB64: string;
  authTagB64: string;
  keyVersion: string;
  payloadSha256: string;
}

export function encryptClinicalPayload(plaintextJson: Record<string, unknown>, aad: string): EncryptedClinicalEnvelope {
  const { keyBytes, keyVersion } = resolveEnclaveKey();
  const iv = randomBytes(12);
  const serialized = JSON.stringify(plaintextJson);
  const cipher = createCipheriv("aes-256-gcm", keyBytes, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payloadSha256 = createHash("sha256").update(serialized, "utf8").digest("hex");

  return {
    encryptedPayloadB64: encrypted.toString("base64"),
    ivB64: iv.toString("base64"),
    authTagB64: authTag.toString("base64"),
    keyVersion,
    payloadSha256,
  };
}

export function decryptClinicalPayload(envelope: EncryptedClinicalEnvelope, aad: string): Record<string, unknown> {
  const { keyBytes } = resolveEnclaveKey();
  const iv = Buffer.from(envelope.ivB64, "base64");
  const authTag = Buffer.from(envelope.authTagB64, "base64");
  const ciphertext = Buffer.from(envelope.encryptedPayloadB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", keyBytes, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as Record<string, unknown>;
}

export async function storeEncryptedClinicalEnclaveRecord(input: {
  tenantId: string;
  encounterId: string;
  payload: Record<string, unknown>;
}): Promise<{ id: string; tenantId: string; encounterId: string; keyVersion: string; payloadSha256: string }> {
  const sql = await ensureNdkrsSchema();
  const aad = `${input.tenantId}::${input.encounterId}`;
  const env = encryptClinicalPayload(input.payload, aad);
  const id = `ENCL-${env.payloadSha256.slice(0, 12).toUpperCase()}`;

  await sql.query(
    `INSERT INTO ndkrs.clinical_enclave_records (
       id, tenant_id, encounter_id, encrypted_payload_b64, iv_b64, auth_tag_b64, key_version, payload_sha256
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO NOTHING`,
    [
      id,
      input.tenantId,
      input.encounterId,
      env.encryptedPayloadB64,
      env.ivB64,
      env.authTagB64,
      env.keyVersion,
      env.payloadSha256,
    ],
  );

  return {
    id,
    tenantId: input.tenantId,
    encounterId: input.encounterId,
    keyVersion: env.keyVersion,
    payloadSha256: env.payloadSha256,
  };
}
