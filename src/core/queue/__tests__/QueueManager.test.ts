import { describe, it, expect } from "vitest";
import { QueueManager } from "../QueueManager";

interface MockTrack {
  id: string;
  title: string;
}

describe("QueueManager & Fisher-Yates (Knuth) Shuffle Algorithm", () => {
  const sampleTracks: MockTrack[] = [
    { id: "t1", title: "Track 1" },
    { id: "t2", title: "Track 2" },
    { id: "t3", title: "Track 3" },
    { id: "t4", title: "Track 4" },
    { id: "t5", title: "Track 5" },
  ];

  it("produces an immutable array containing all original elements", () => {
    const original = ["A", "B", "C", "D", "E"];
    const shuffled = QueueManager.fisherYatesShuffle(original);

    expect(shuffled).toHaveLength(original.length);
    expect(new Set(shuffled)).toEqual(new Set(original));
    // Verify original array was not mutated in place
    expect(original).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("handles edge cases (empty array and single element)", () => {
    expect(QueueManager.fisherYatesShuffle([])).toEqual([]);
    expect(QueueManager.fisherYatesShuffle(["solo"])).toEqual(["solo"]);
  });

  it("statistically demonstrates uniform permutation distribution (Chi-Square tolerance)", () => {
    // For 3 elements [A, B, C], there are exactly 3! = 6 permutations:
    // ABC, ACB, BAC, BCA, CAB, CBA
    const elements = ["A", "B", "C"];
    const iterations = 12000;
    const expectedPerPermutation = iterations / 6; // 2000 expected each
    const counts: Record<string, number> = {};

    for (let i = 0; i < iterations; i++) {
      const perm = QueueManager.fisherYatesShuffle(elements).join("");
      counts[perm] = (counts[perm] || 0) + 1;
    }

    // All 6 permutations must appear
    const keys = Object.keys(counts);
    expect(keys).toHaveLength(6);

    // Verify each permutation occurs within a reasonable statistical boundary (+- 15%)
    for (const key of keys) {
      const observed = counts[key];
      const deviation = Math.abs(observed - expectedPerPermutation) / expectedPerPermutation;
      expect(deviation).toBeLessThan(0.15);
    }
  });

  it("toggles shuffle while pinning the currently active track to index 0", () => {
    const qm = new QueueManager(sampleTracks);
    const activeId = "t3";

    const { queue, newIndex, isShuffled } = qm.toggleShuffle(activeId);

    expect(isShuffled).toBe(true);
    expect(newIndex).toBe(0);
    expect(queue[0].id).toBe(activeId);
    expect(queue).toHaveLength(sampleTracks.length);

    // All elements still exist
    const ids = new Set(queue.map((t) => t.id));
    expect(ids.size).toBe(5);
  });

  it("restores original playlist ordering and updates active index when shuffle is toggled off", () => {
    const qm = new QueueManager(sampleTracks);
    const activeId = "t4"; // originally at index 3

    // Turn shuffle on
    qm.toggleShuffle(activeId);
    expect(qm.isShuffled()).toBe(true);

    // Turn shuffle off
    const restored = qm.toggleShuffle(activeId);
    expect(restored.isShuffled).toBe(false);
    expect(restored.newIndex).toBe(3); // t4 was at index 3 in originalQueue
    expect(restored.queue[3].id).toBe("t4");
    expect(restored.queue.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("inserts an item next in queue correctly (enqueueNext)", () => {
    const qm = new QueueManager(sampleTracks);
    const newTrack: MockTrack = { id: "t-next", title: "Immediate Next Track" };

    const updated = qm.enqueueNext(newTrack, 1);
    expect(updated[2].id).toBe("t-next");
    expect(updated).toHaveLength(6);
  });

  it("reorders items in the queue (move)", () => {
    const qm = new QueueManager(sampleTracks);
    // Move item at index 0 (t1) to index 3
    const moved = qm.move(0, 3);
    expect(moved[3].id).toBe("t1");
    expect(moved[0].id).toBe("t2");
    expect(moved).toHaveLength(5);
  });
});
