/**
 * @file Trie.ts
 * @description Enterprise Prefix Tree (Trie) Data Structure for O(L)
 * real-time autocomplete suggestions on the client side.
 *
 * Space & Time Complexity Analysis:
 * - Insertion: O(L) time complexity, where L is the length of the string.
 * - Search / Exact Lookup: O(L) time complexity.
 * - Prefix Search & Autocomplete: O(L + K) time complexity, where L is the query length
 *   and K is the number of suggestions retrieved up to `maxResults`.
 *   This is radically faster than standard O(N * M) full-table scans across 10,000 items.
 * - Space Complexity: O(Total Characters across indexed corpus), with prefix node sharing.
 */

export type SuggestionType = "track" | "artist" | "genre" | "history";

export interface SuggestionMetadata {
  id?: string;
  type: SuggestionType;
  displayText: string;
  score: number;
}

export class TrieNode {
  public children: Map<string, TrieNode>;
  public isEndOfWord: boolean;
  public metadata: SuggestionMetadata | null;

  constructor() {
    this.children = new Map<string, TrieNode>();
    this.isEndOfWord = false;
    this.metadata = null;
  }
}

export class Trie {
  private readonly root: TrieNode;
  private totalWordsCount = 0;

  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Normalizes input text to lower-case trimmed string.
   */
  private normalize(str: string): string {
    return str.toLowerCase().trim();
  }

  /**
   * Inserts a phrase or word into the Trie with associated metadata and score.
   *
   * @param text The string to index.
   * @param metadata Structured metadata (type, displayText, score).
   * @time O(L) where L is text.length.
   * @space O(L) worst case when no prefix nodes are shared.
   */
  public insert(text: string, metadata: SuggestionMetadata): void {
    const normalized = this.normalize(text);
    if (!normalized) return;

    let current = this.root;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      let nextNode = current.children.get(char);

      if (!nextNode) {
        nextNode = new TrieNode();
        current.children.set(char, nextNode);
      }
      current = nextNode;
    }

    if (!current.isEndOfWord) {
      this.totalWordsCount++;
    }

    current.isEndOfWord = true;
    // If word exists, update metadata only if incoming score is higher
    if (!current.metadata || metadata.score >= current.metadata.score) {
      current.metadata = metadata;
    }
  }

  /**
   * Indexes a full track entity into the Trie (indexing title, individual words, and artist).
   * @param track AudioTrack-like object with title, artist, genre, and id.
   */
  public indexTrack(track: { id: string; title: string; artist: string; genre?: string }): void {
    // 1. Index full track title
    this.insert(track.title, {
      id: track.id,
      type: "track",
      displayText: track.title,
      score: 100,
    });

    // 2. Index individual significant words from title for mid-word discovery
    const words = track.title.split(/\s+/);
    if (words.length > 1) {
      for (const word of words) {
        if (word.length >= 3) {
          this.insert(word, {
            id: track.id,
            type: "track",
            displayText: `${track.title} (${track.artist})`,
            score: 75,
          });
        }
      }
    }

    // 3. Index artist name
    this.insert(track.artist, {
      id: track.id,
      type: "artist",
      displayText: track.artist,
      score: 85,
    });

    // 4. Index genre if present
    if (track.genre) {
      this.insert(track.genre, {
        type: "genre",
        displayText: track.genre,
        score: 60,
      });
    }
  }

  /**
   * Indexes a user search history item with elevated score so recent searches rank high.
   * @param query The search query string.
   */
  public indexSearchHistory(query: string): void {
    this.insert(query, {
      type: "history",
      displayText: query,
      score: 150, // History entries prioritized over raw catalog matches
    });
  }

  /**
   * Searches for exact word existence in the Trie.
   * @param word The word to find.
   * @time O(L)
   */
  public search(word: string): boolean {
    const normalized = this.normalize(word);
    let current = this.root;

    for (let i = 0; i < normalized.length; i++) {
      const node = current.children.get(normalized[i]);
      if (!node) return false;
      current = node;
    }

    return current.isEndOfWord;
  }

  /**
   * Navigates down the Trie to find the node corresponding to the given prefix.
   * @param prefix String prefix to look up.
   * @returns TrieNode at end of prefix or null if prefix does not exist.
   * @time O(L)
   */
  private findPrefixNode(prefix: string): TrieNode | null {
    const normalized = this.normalize(prefix);
    let current = this.root;

    for (let i = 0; i < normalized.length; i++) {
      const node = current.children.get(normalized[i]);
      if (!node) return null;
      current = node;
    }

    return current;
  }

  /**
   * Retrieves autocomplete suggestions matching the provided prefix.
   * Traverses to the prefix node in O(L), then gathers top candidate matches
   * using a Breadth-First Search (BFS) and sorts by ranking score.
   *
   * @param prefix Query prefix.
   * @param maxResults Maximum suggestions to return (default 5).
   * @returns Ranked array of suggestions.
   * @time O(L + K)
   * @space O(K) where K is the number of retrieved items.
   */
  public getSuggestions(prefix: string, maxResults = 5): SuggestionMetadata[] {
    const normalized = this.normalize(prefix);
    if (!normalized) return [];

    const startNode = this.findPrefixNode(normalized);
    if (!startNode) return [];

    const candidates: SuggestionMetadata[] = [];
    const seenTexts = new Set<string>();

    // BFS Queue to collect suggestions under the prefix subtree
    const queue: TrieNode[] = [startNode];
    const candidateLimit = Math.max(100, maxResults * 10);

    while (queue.length > 0 && candidates.length < candidateLimit) {
      const current = queue.shift()!;

      if (current.isEndOfWord && current.metadata) {
        const key = current.metadata.displayText.toLowerCase();
        if (!seenTexts.has(key)) {
          seenTexts.add(key);
          candidates.push(current.metadata);
        }
      }

      for (const child of current.children.values()) {
        queue.push(child);
      }
    }

    // Sort by descending score (higher score first), then by length (shorter first)
    candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.displayText.length - b.displayText.length;
    });

    return candidates.slice(0, maxResults);
  }

  /**
   * Resets the entire Trie.
   */
  public clear(): void {
    this.root.children.clear();
    this.totalWordsCount = 0;
  }

  /**
   * Total number of distinct words currently indexed in the Trie.
   */
  public get size(): number {
    return this.totalWordsCount;
  }
}
