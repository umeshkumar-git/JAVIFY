import { describe, it, expect } from "vitest";
import { Trie } from "../Trie";

describe("Trie (Prefix Tree) Autocomplete Algorithm", () => {
  it("inserts and finds exact words in O(L) time", () => {
    const trie = new Trie();
    trie.insert("cyberpunk", {
      type: "genre",
      displayText: "Cyberpunk",
      score: 50,
    });

    expect(trie.search("cyberpunk")).toBe(true);
    expect(trie.search("CYBERPUNK")).toBe(true);
    expect(trie.search("cyber")).toBe(false); // Prefix exists, but not end of word
    expect(trie.search("synthwave")).toBe(false);
    expect(trie.size).toBe(1);
  });

  it("retrieves prefix-based autocomplete suggestions in O(L + K) time", () => {
    const trie = new Trie();

    trie.indexTrack({
      id: "trk-1",
      title: "Cybernetic Drift",
      artist: "Kavinsky Protocol",
      genre: "Synthwave",
    });

    trie.indexTrack({
      id: "trk-2",
      title: "Cyber Security Grid",
      artist: "Solaris Array",
      genre: "Cyberpunk",
    });

    trie.indexTrack({
      id: "trk-3",
      title: "Synthetic Dreams",
      artist: "Binary Monks",
      genre: "Synthwave",
    });

    // Search for prefix "cyb"
    const suggestions = trie.getSuggestions("cyb", 5);

    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    const titles = suggestions.map((s) => s.displayText);
    expect(titles).toContain("Cybernetic Drift");
    expect(titles).toContain("Cyber Security Grid");
    expect(titles).not.toContain("Synthetic Dreams");
  });

  it("prioritizes recent search history over raw catalog items via scoring", () => {
    const trie = new Trie();

    // Catalog item
    trie.insert("synthwave", {
      type: "genre",
      displayText: "Synthwave",
      score: 60,
    });

    // History item matching same prefix
    trie.indexSearchHistory("synthwave beats lo-fi");

    const results = trie.getSuggestions("synth", 5);
    expect(results).toHaveLength(2);
    // History has score 150, genre has score 60 -> history must be first
    expect(results[0].displayText).toBe("synthwave beats lo-fi");
    expect(results[0].type).toBe("history");
    expect(results[1].displayText).toBe("Synthwave");
    expect(results[1].type).toBe("genre");
  });

  it("indexes individual significant words from track titles", () => {
    const trie = new Trie();
    trie.indexTrack({
      id: "trk-5",
      title: "Quantum Leap Forward",
      artist: "Subsystem X",
    });

    // User types "leap" -> should find the track even though "leap" is the 2nd word in title
    const results = trie.getSuggestions("lea", 3);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].displayText).toContain("Quantum Leap Forward");
  });

  it("returns empty array for non-matching or empty prefix", () => {
    const trie = new Trie();
    trie.indexTrack({
      id: "trk-1",
      title: "Hello World",
      artist: "Java",
    });

    expect(trie.getSuggestions("")).toEqual([]);
    expect(trie.getSuggestions("xyz123")).toEqual([]);
  });

  it("respects maxResults limit", () => {
    const trie = new Trie();
    for (let i = 1; i <= 10; i++) {
      trie.insert(`track ${i}`, {
        type: "track",
        displayText: `Track ${i}`,
        score: i * 10,
      });
    }

    const suggestions = trie.getSuggestions("tr", 3);
    expect(suggestions).toHaveLength(3);
    // Highest score (Track 10, Track 9, Track 8)
    expect(suggestions[0].displayText).toBe("Track 10");
  });
});
