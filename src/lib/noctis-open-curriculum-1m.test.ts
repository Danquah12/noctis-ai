import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CURATED_TRACK_COUNT,
  OPEN_CURRICULUM_TRACKS,
  buildTrackMasterySeedPairs,
  generateCurriculumDpoRecord,
  generateCurriculumSftRecord,
  getOpenCurriculumStats,
} from "./noctis-open-curriculum-1m.ts";

describe("NOCTIS-OPEN-CURRICULUM-1M: 40-Track Lawful Open Technical & Professional Training Engine", () => {
  it("covers all 40 technical & professional tracks with >= 12 subtopics and >= 1M combinatorial capacity", () => {
    assert.equal(CURATED_TRACK_COUNT, 40);
    assert.equal(OPEN_CURRICULUM_TRACKS.length, 40);
    for (const track of OPEN_CURRICULUM_TRACKS) {
      assert.ok(track.subtopics.length >= 12, `${track.id} must have >=12 subtopics`);
      assert.ok(track.standards.length >= 4, `${track.id} must have >=4 open standards`);
      assert.ok(track.invariants.length >= 4, `${track.id} must have >=4 invariants`);
      assert.ok(track.antiPatterns.length >= 4, `${track.id} must have >=4 anti-patterns`);
    }

    const stats = getOpenCurriculumStats();
    assert.equal(stats.trackCount, 40);
    assert.equal(stats.totalSubtopics, 480);
    assert.equal(stats.defaultTargetSftRows, 1_000_000);
    assert.ok(stats.combinatorialCapacity >= 1_000_000);
  });

  it("produces deterministic unique SFT ChatML records across low and high indices with balanced tracks", () => {
    const seenIds = new Set<string>();
    const seenPrompts = new Set<string>();
    const trackCounts = new Map<string, number>();

    for (let i = 0; i < 800; i++) {
      const rec = generateCurriculumSftRecord(i);
      assert.equal(rec.messages.length, 3);
      assert.equal(rec.messages[0]?.role, "system");
      assert.equal(rec.messages[1]?.role, "user");
      assert.equal(rec.messages[2]?.role, "assistant");
      assert.ok(rec.messages[2]!.content.includes(rec.standardRef));
      assert.ok(!seenIds.has(rec.id));
      assert.ok(!seenPrompts.has(rec.messages[1]!.content));
      seenIds.add(rec.id);
      seenPrompts.add(rec.messages[1]!.content);
      trackCounts.set(rec.trackId, (trackCounts.get(rec.trackId) ?? 0) + 1);
    }

    assert.equal(trackCounts.size, 40);
    for (const count of trackCounts.values()) {
      assert.equal(count, 20);
    }

    // Also probe tail of 1M training slice and start of held-out validation slice [2_000_000..]
    const trainLast = generateCurriculumSftRecord(999_999);
    const valFirst = generateCurriculumSftRecord(2_000_000);
    assert.notEqual(trainLast.id, valFirst.id);
    assert.notEqual(trainLast.messages[1]?.content, valFirst.messages[1]?.content);
  });

  it("generates contrasting DPO pairs and 40 track mastery seed pairs", () => {
    for (let i = 0; i < 40; i++) {
      const dpo = generateCurriculumDpoRecord(i);
      assert.ok(dpo.prompt.length > 30);
      assert.ok(dpo.chosen.length > 50);
      assert.ok(dpo.rejected.length > 30);
      assert.notEqual(dpo.chosen, dpo.rejected);
    }

    const seeds = buildTrackMasterySeedPairs();
    assert.equal(seeds.length, 40);
    assert.ok(seeds.every((s) => s.question.length > 20 && s.answer.length > 80));
  });
});
