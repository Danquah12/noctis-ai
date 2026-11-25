export interface E2EEIdentityKeyPair {
  publicKeyJwk: string;
  privateKeyJwk: string;
}

export interface E2EEEnvelope {
  v: 1;
  alg: "ECDH-P256-AES256-GCM";
  iv: string;
  ct: string;
  pub: string;
}

export interface EncryptedBackupBlob {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ct: string;
  exportedAt: string;
}

function getSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto SubtleCrypto is unavailable in this environment");
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function canonicalPublicKey(pubJwkStr: string): string {
  try {
    const parsed = JSON.parse(pubJwkStr) as { kty?: string; crv?: string; x?: string; y?: string };
    return JSON.stringify({
      kty: parsed.kty ?? "EC",
      crv: parsed.crv ?? "P-256",
      x: parsed.x ?? "",
      y: parsed.y ?? "",
    });
  } catch {
    return pubJwkStr.trim();
  }
}

export async function generateIdentityKeyPair(): Promise<E2EEIdentityKeyPair> {
  const subtle = getSubtle();
  const pair = await subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const pub = await subtle.exportKey("jwk", pair.publicKey);
  const priv = await subtle.exportKey("jwk", pair.privateKey);
  return {
    publicKeyJwk: JSON.stringify(pub),
    privateKeyJwk: JSON.stringify(priv),
  };
}

export async function deriveSharedAesKey(
  myPrivateKeyJwk: string,
  peerPublicKeyJwk: string,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const privParsed = JSON.parse(myPrivateKeyJwk) as JsonWebKey;
  const pubParsed = JSON.parse(peerPublicKeyJwk) as JsonWebKey;
  const myPrivKey = await subtle.importKey(
    "jwk",
    privParsed,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );
  const peerPubKey = await subtle.importKey(
    "jwk",
    pubParsed,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  return subtle.deriveKey(
    { name: "ECDH", public: peerPubKey },
    myPrivKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptE2EEMessage(
  plaintext: string,
  myPrivateKeyJwk: string,
  peerPublicKeyJwk: string,
  myPublicKeyJwk?: string,
): Promise<string> {
  const subtle = getSubtle();
  const aesKey = await deriveSharedAesKey(myPrivateKeyJwk, peerPublicKeyJwk);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(encoded),
  );
  let senderPub = myPublicKeyJwk;
  if (!senderPub) {
    const privParsed = JSON.parse(myPrivateKeyJwk) as { kty?: string; crv?: string; x?: string; y?: string };
    senderPub = JSON.stringify({
      kty: privParsed.kty ?? "EC",
      crv: privParsed.crv ?? "P-256",
      x: privParsed.x ?? "",
      y: privParsed.y ?? "",
    });
  }
  const envelope: E2EEEnvelope = {
    v: 1,
    alg: "ECDH-P256-AES256-GCM",
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(cipherBuf)),
    pub: senderPub,
  };
  return JSON.stringify(envelope);
}

export async function decryptE2EEMessage(
  envelopeStr: string,
  myPrivateKeyJwk: string,
  peerPublicKeyJwk?: string,
): Promise<string> {
  const subtle = getSubtle();
  const parsed = JSON.parse(envelopeStr) as Partial<E2EEEnvelope>;
  if (!parsed || parsed.alg !== "ECDH-P256-AES256-GCM" || !parsed.iv || !parsed.ct) {
    throw new Error("Unsupported or malformed E2EE envelope");
  }
  const candidateKeys: string[] = [];
  if (peerPublicKeyJwk) candidateKeys.push(peerPublicKeyJwk);
  if (parsed.pub && parsed.pub !== peerPublicKeyJwk) candidateKeys.push(parsed.pub);

  const iv = fromBase64(parsed.iv);
  const ct = fromBase64(parsed.ct);
  let lastErr: unknown = null;
  for (const pub of candidateKeys) {
    try {
      const aesKey = await deriveSharedAesKey(myPrivateKeyJwk, pub);
      const plainBuf = await subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        aesKey,
        toArrayBuffer(ct),
      );
      return new TextDecoder().decode(plainBuf);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Decryption failed for identity key");
}

/**
 * Symmetric 60-digit (12 x 5-digit) Safety Number fingerprint matching WhatsApp-style verification.
 */
export async function computeSafetyNumber(pubJwkA: string, pubJwkB: string): Promise<string> {
  const subtle = getSubtle();
  const sorted = [canonicalPublicKey(pubJwkA), canonicalPublicKey(pubJwkB)].sort();
  const input = new TextEncoder().encode(sorted.join("|"));
  const digest = new Uint8Array(await subtle.digest("SHA-256", toArrayBuffer(input)));
  const digits: string[] = [];
  // Expand 32 bytes cleanly into 12 blocks of 5 digits using modular slices over 32 bytes
  for (let i = 0; i < 12; i += 1) {
    const a = digest[(i * 3) % digest.length];
    const b = digest[(i * 3 + 1) % digest.length];
    const c = digest[(i * 3 + 2) % digest.length];
    const blockNum = ((a << 16) | (b << 8) | c) % 100000;
    digits.push(String(blockNum).padStart(5, "0"));
  }
  return digits.join(" ");
}

async function derivePassphraseKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const subtle = getSubtle();
  const rawKey = await subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function packEncryptedBackup(payloadObj: unknown, passphrase: string): Promise<string> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error("Backup passphrase must be at least 4 characters");
  }
  const subtle = getSubtle();
  const iterations = 100_000;
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await derivePassphraseKey(passphrase, salt, iterations);
  const plain = new TextEncoder().encode(JSON.stringify(payloadObj));
  const ctBuf = await subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(plain),
  );
  const blob: EncryptedBackupBlob = {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ctBuf)),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(blob, null, 2);
}

export async function unpackEncryptedBackup<T = unknown>(blobJson: string, passphrase: string): Promise<T> {
  const subtle = getSubtle();
  const parsed = JSON.parse(blobJson) as Partial<EncryptedBackupBlob>;
  if (!parsed || parsed.kdf !== "PBKDF2-SHA256" || !parsed.salt || !parsed.iv || !parsed.ct) {
    throw new Error("Invalid encrypted backup format");
  }
  const salt = fromBase64(parsed.salt);
  const iv = fromBase64(parsed.iv);
  const ct = fromBase64(parsed.ct);
  const aesKey = await derivePassphraseKey(passphrase, salt, parsed.iterations || 100_000);
  const plainBuf = await subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(ct),
  );
  return JSON.parse(new TextDecoder().decode(plainBuf)) as T;
}
