import assert from "node:assert/strict";
import test from "node:test";
import {
  computeSafetyNumber,
  decryptE2EEMessage,
  encryptE2EEMessage,
  generateIdentityKeyPair,
  packEncryptedBackup,
  unpackEncryptedBackup,
} from "./vibe-connect-crypto.ts";
import { DEFAULT_VIBE_CONNECT_FLAGS, mergeVibeConnectFlags } from "./vibe-connect-flags.ts";
import {
  computeExpiresAtIso,
  dedupeMessagesByClientId,
  filterThreadsByTab,
  formatSafetyNumberBlocks,
  isMessageVisibleNow,
  normalizeUsername,
} from "./vibe-connect-helpers.ts";

test("E2EE ECDH P-256 + AES-GCM 256 roundtrip, ciphertext opacity & wrong-key rejection", async () => {
  const alice = await generateIdentityKeyPair();
  const bob = await generateIdentityKeyPair();
  const eve = await generateIdentityKeyPair();

  const secret = "Patient labs clear; meet at 14:30 UTC in Room 4.";
  const envelope = await encryptE2EEMessage(secret, alice.privateKeyJwk, bob.publicKeyJwk, alice.publicKeyJwk);

  assert.equal(envelope.includes(secret), false, "Ciphertext envelope must never contain plaintext");

  const decrypted = await decryptE2EEMessage(envelope, bob.privateKeyJwk, alice.publicKeyJwk);
  assert.equal(decrypted, secret);

  await assert.rejects(() => decryptE2EEMessage(envelope, eve.privateKeyJwk, alice.publicKeyJwk));
});

test("Safety Number fingerprint is symmetric across both peers and forms 12 five-digit blocks", async () => {
  const alice = await generateIdentityKeyPair();
  const bob = await generateIdentityKeyPair();

  const snA = await computeSafetyNumber(alice.publicKeyJwk, bob.publicKeyJwk);
  const snB = await computeSafetyNumber(bob.publicKeyJwk, alice.publicKeyJwk);

  assert.equal(snA, snB);
  const blocks = formatSafetyNumberBlocks(snA);
  assert.equal(blocks.length, 12);
  for (const blk of blocks) {
    assert.match(blk, /^\d{5}$/);
  }
});

test("PBKDF2 + AES-GCM encrypted backup packs and unpacks cleanly and rejects bad passphrase", async () => {
  const sample = { threads: [{ id: "thr_1", title: "Team" }], messages: [{ id: 1, body: "Hello" }] };
  const blob = await packEncryptedBackup(sample, "StrongPass!99");
  assert.equal(blob.includes("Team"), false);

  const restored = await unpackEncryptedBackup<typeof sample>(blob, "StrongPass!99");
  assert.deepEqual(restored, sample);

  await assert.rejects(() => unpackEncryptedBackup(blob, "WrongPass"));
});

test("Feature flags include beyondWorkspace and merge overrides cleanly", () => {
  assert.equal(DEFAULT_VIBE_CONNECT_FLAGS.beyondWorkspace, true);
  assert.equal(DEFAULT_VIBE_CONNECT_FLAGS.e2ee, true);
  const merged = mergeVibeConnectFlags(DEFAULT_VIBE_CONNECT_FLAGS, {
    businessWorkspace: false,
    beyondWorkspace: false,
  });
  assert.equal(merged.businessWorkspace, false);
  assert.equal(merged.beyondWorkspace, false);
  assert.equal(merged.messaging, true);
});

test("Idempotency deduplication keeps exactly 1 copy per clientMsgId", () => {
  const list = [
    { id: 1, clientMsgId: "cm_100", body: "hi" },
    { id: 1, clientMsgId: "cm_100", body: "hi" },
    { id: 2, clientMsgId: "cm_101", body: "there" },
  ];
  const deduped = dedupeMessagesByClientId(list);
  assert.equal(deduped.length, 2);
});

test("Disappearing TTL and scheduled deliverAt visibility rules behave accurately", () => {
  const now = Date.UTC(2026, 10, 25, 12, 0, 0);
  const exp24 = computeExpiresAtIso("24h", now);
  assert.ok(exp24);
  assert.equal(computeExpiresAtIso("off", now), null);

  assert.equal(isMessageVisibleNow({ expiresAt: exp24 }, "u1", now + 3600_000), true);
  assert.equal(isMessageVisibleNow({ expiresAt: exp24 }, "u1", now + 25 * 3600_000), false);

  const future = new Date(now + 600_000).toISOString();
  assert.equal(isMessageVisibleNow({ deliverAt: future, senderId: "alice" }, "bob", now), false);
  assert.equal(isMessageVisibleNow({ deliverAt: future, senderId: "alice" }, "alice", now), true);
});

test("Username normalization and thread filter tabs work accurately", () => {
  assert.equal(normalizeUsername("  @Dr.Asiedu_1 "), "@dr.asiedu_1");
  assert.equal(normalizeUsername("ab"), "");

  const threads = [
    { id: "1", kind: "direct", title: "Alice", unreadCount: 2, isFavorite: true, isArchived: false },
    { id: "2", kind: "group", title: "Medical Team", unreadCount: 0, isFavorite: false, isArchived: false },
    { id: "3", kind: "business", title: "Care Clinic", unreadCount: 1, isFavorite: false, isArchived: true },
  ];
  assert.equal(filterThreadsByTab(threads, "all").length, 2);
  assert.equal(filterThreadsByTab(threads, "unread").map((t) => t.id).join(","), "1");
  assert.equal(filterThreadsByTab(threads, "favorites").map((t) => t.id).join(","), "1");
  assert.equal(filterThreadsByTab(threads, "groups").map((t) => t.id).join(","), "2");
  assert.equal(filterThreadsByTab(threads, "archived").map((t) => t.id).join(","), "3");
});
