/**
 * Noctis Encrypted Vault
 * Client-side AES-GCM encrypted backup and restore engine for Noctis.
 * Bundles chats, custom instructions, memory bank, projects, and canvas artifacts.
 */

const VAULT_MAGIC = "NOCTIS_VAULT_V1";

export interface VaultPayload {
  version: string;
  exportedAt: string;
  meta: {
    threadsCount: number;
    projectsCount: number;
    memoriesCount: number;
  };
  data: {
    threads: unknown[];
    projects: unknown[];
    memories: unknown[];
    customInstructions: unknown;
    activeModel: string;
  };
  sha256Seal: string;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function createEncryptedVault(password: string): Promise<Blob> {
  if (typeof window === "undefined") throw new Error("Vault operations require browser environment");

  // Collect all data from localStorage
  const threadsRaw = localStorage.getItem("vibetok-vibe-threads") || "[]";
  const projectsRaw = localStorage.getItem("noctis_workspace_projects_v1") || "[]";
  const memoriesRaw = localStorage.getItem("noctis_memory_bank") || "[]";
  const instructionsRaw = localStorage.getItem("noctis_custom_instructions") || "{}";
  const activeModel = localStorage.getItem("noctis_active_model") || "noctis-ultra";

  const threads = JSON.parse(threadsRaw);
  const projects = JSON.parse(projectsRaw);
  const memories = JSON.parse(memoriesRaw);
  const customInstructions = JSON.parse(instructionsRaw);

  const payloadString = JSON.stringify({
    threads,
    projects,
    memories,
    customInstructions,
    activeModel,
  });

  // Calculate SHA-256 seal
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(payloadString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Seal = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const vaultPayload: VaultPayload = {
    version: VAULT_MAGIC,
    exportedAt: new Date().toISOString(),
    meta: {
      threadsCount: Array.isArray(threads) ? threads.length : 0,
      projectsCount: Array.isArray(projects) ? projects.length : 0,
      memoriesCount: Array.isArray(memories) ? memories.length : 0,
    },
    data: {
      threads,
      projects,
      memories,
      customInstructions,
      activeModel,
    },
    sha256Seal,
  };

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const plainBytes = enc.encode(JSON.stringify(vaultPayload));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plainBytes
  );

  // Layout: [Magic 16B] + [Salt 16B] + [IV 12B] + [Ciphertext]
  const magicBytes = new TextEncoder().encode(VAULT_MAGIC.padEnd(16, " "));
  const combined = new Uint8Array(magicBytes.length + salt.length + iv.length + encryptedBuffer.byteLength);

  combined.set(magicBytes, 0);
  combined.set(salt, 16);
  combined.set(iv, 32);
  combined.set(new Uint8Array(encryptedBuffer), 44);

  return new Blob([combined], { type: "application/octet-stream" });
}

export async function restoreEncryptedVault(
  blob: Blob,
  password: string
): Promise<{ success: boolean; meta: VaultPayload["meta"]; error?: string }> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length < 44) {
      return { success: false, meta: { threadsCount: 0, projectsCount: 0, memoriesCount: 0 }, error: "Invalid vault file size." };
    }

    const magic = new TextDecoder().decode(bytes.slice(0, 16)).trim();
    if (magic !== VAULT_MAGIC) {
      return { success: false, meta: { threadsCount: 0, projectsCount: 0, memoriesCount: 0 }, error: "Unrecognized vault format." };
    }

    const salt = bytes.slice(16, 32);
    const iv = bytes.slice(32, 44);
    const ciphertext = bytes.slice(44);

    const key = await deriveKey(password, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    const payload: VaultPayload = JSON.parse(decryptedText);

    // Verify SHA-256 seal
    const payloadDataString = JSON.stringify(payload.data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payloadDataString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedSeal = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (payload.sha256Seal !== calculatedSeal) {
      return { success: false, meta: payload.meta, error: "Tampered vault data: SHA-256 seal mismatch." };
    }

    // Restore to localStorage
    localStorage.setItem("vibetok-vibe-threads", JSON.stringify(payload.data.threads));
    localStorage.setItem("noctis_workspace_projects_v1", JSON.stringify(payload.data.projects));
    localStorage.setItem("noctis_memory_bank", JSON.stringify(payload.data.memories));
    localStorage.setItem("noctis_custom_instructions", JSON.stringify(payload.data.customInstructions));
    localStorage.setItem("noctis_active_model", payload.data.activeModel);

    return { success: true, meta: payload.meta };
  } catch (err) {
    return {
      success: false,
      meta: { threadsCount: 0, projectsCount: 0, memoriesCount: 0 },
      error: "Decryption failed. Incorrect password or corrupted file.",
    };
  }
}
