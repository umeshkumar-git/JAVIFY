/**
 * @file QueueManager.ts
 * @description Enterprise-grade Queue Manager implementing the Fisher-Yates (Knuth)
 * shuffle algorithm with mathematical guarantees of uniform distribution.
 *
 * Space & Time Complexity Analysis:
 * - Shuffle: Time O(N), Auxiliary Space O(1) in-place or O(N) immutable copy.
 *   Standard Array.sort(() => Math.random() - 0.5) is non-uniform (biased)
 *   and has O(N log N) time complexity.
 *   Fisher-Yates guarantees each of the N! permutations has an exact 1/N! probability.
 *
 * Mathematical Proof of Uniformity:
 * For array of size N:
 * - First element chosen from N elements with probability 1/N.
 * - Second element chosen from (N-1) remaining elements with probability 1/(N-1).
 * - ...
 * - Final element chosen with probability 1/1.
 * Total probability for any permutation = (1/N) * (1/(N-1)) * ... * (1/1) = 1/N!
 */

export interface QueueItem {
  id: string;
}

export class QueueManager<T extends QueueItem> {
  private originalQueue: T[];
  private currentQueue: T[];
  private isShuffledState: boolean;

  /**
   * Initializes the QueueManager with an initial list of items.
   * @param initialQueue Initial array of queue items.
   */
  constructor(initialQueue: T[] = []) {
    this.originalQueue = [...initialQueue];
    this.currentQueue = [...initialQueue];
    this.isShuffledState = false;
  }

  /**
   * Performs an immutable Fisher-Yates (Knuth) shuffle on the provided array.
   *
   * Algorithm Walkthrough:
   * Iterate backwards from the last index (N-1) down to 1. At each index i:
   * 1. Pick a random integer j uniformly distributed in the closed interval [0, i].
   * 2. Swap the elements at index i and index j.
   *
   * @param array The array to shuffle.
   * @returns A new shuffled array with exact 1/N! permutation probability.
   * @time O(N) - exactly N-1 iterations.
   * @space O(N) - returns a new array copy to preserve immutability.
   */
  public static fisherYatesShuffle<U>(array: readonly U[]): U[] {
    const arr = [...array];
    const n = arr.length;
    if (n <= 1) return arr;

    for (let i = n - 1; i > 0; i--) {
      // Pick random index j in [0, i]
      const j = Math.floor(Math.random() * (i + 1));
      // Swap elements
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }

    return arr;
  }

  /**
   * Sets a new playlist / track queue.
   * @param items New list of items.
   * @param maintainShuffle If true and queue was shuffled, reapplies Fisher-Yates.
   */
  public setQueue(items: T[], maintainShuffle = false): void {
    this.originalQueue = [...items];
    if (maintainShuffle && this.isShuffledState) {
      this.currentQueue = QueueManager.fisherYatesShuffle(this.originalQueue);
    } else {
      this.currentQueue = [...items];
      this.isShuffledState = false;
    }
  }

  /**
   * Toggles the shuffle state of the queue.
   * If an active item ID is provided, that item is guaranteed to remain at index 0
   * so the currently playing audio stream is not interrupted or restarted.
   *
   * @param activeItemId Optional ID of currently playing track.
   * @returns An object containing the new queue, new active index (0), and shuffle boolean.
   * @time O(N)
   * @space O(N)
   */
  public toggleShuffle(activeItemId?: string): {
    queue: T[];
    newIndex: number;
    isShuffled: boolean;
  } {
    if (!this.isShuffledState) {
      // Turn Shuffle ON
      if (this.originalQueue.length <= 1) {
        this.isShuffledState = true;
        return {
          queue: [...this.originalQueue],
          newIndex: 0,
          isShuffled: true,
        };
      }

      if (activeItemId) {
        const activeItem = this.originalQueue.find((t) => t.id === activeItemId);
        const remaining = this.originalQueue.filter((t) => t.id !== activeItemId);
        const shuffledRemaining = QueueManager.fisherYatesShuffle(remaining);
        this.currentQueue = activeItem ? [activeItem, ...shuffledRemaining] : shuffledRemaining;
      } else {
        this.currentQueue = QueueManager.fisherYatesShuffle(this.originalQueue);
      }

      this.isShuffledState = true;
      return {
        queue: [...this.currentQueue],
        newIndex: 0,
        isShuffled: true,
      };
    } else {
      // Turn Shuffle OFF: restore original catalog order
      this.isShuffledState = false;
      this.currentQueue = [...this.originalQueue];

      const restoredIndex = activeItemId
        ? this.originalQueue.findIndex((t) => t.id === activeItemId)
        : 0;

      return {
        queue: [...this.currentQueue],
        newIndex: Math.max(0, restoredIndex),
        isShuffled: false,
      };
    }
  }

  /**
   * Adds an item to play immediately after the current track (Queue Next).
   * @param item Item to insert.
   * @param currentIndex Current index in active queue.
   * @time O(N) array splice
   */
  public enqueueNext(item: T, currentIndex: number): T[] {
    const insertIndex = Math.min(currentIndex + 1, this.currentQueue.length);
    this.currentQueue.splice(insertIndex, 0, item);
    this.originalQueue.push(item);
    return [...this.currentQueue];
  }

  /**
   * Appends an item to the end of the queue.
   * @param item Item to append.
   * @time O(1) amortized
   */
  public enqueue(item: T): T[] {
    this.currentQueue.push(item);
    this.originalQueue.push(item);
    return [...this.currentQueue];
  }

  /**
   * Removes an item by ID from both current and original queues.
   * @param id ID of item to remove.
   * @time O(N)
   */
  public remove(id: string): T[] {
    this.currentQueue = this.currentQueue.filter((item) => item.id !== id);
    this.originalQueue = this.originalQueue.filter((item) => item.id !== id);
    return [...this.currentQueue];
  }

  /**
   * Moves an item from one position to another in the queue (Drag & Drop / Reordering).
   * @param fromIndex Source index.
   * @param toIndex Destination index.
   * @time O(N)
   */
  public move(fromIndex: number, toIndex: number): T[] {
    if (
      fromIndex < 0 ||
      fromIndex >= this.currentQueue.length ||
      toIndex < 0 ||
      toIndex >= this.currentQueue.length
    ) {
      return [...this.currentQueue];
    }

    const [moved] = this.currentQueue.splice(fromIndex, 1);
    this.currentQueue.splice(toIndex, 0, moved);
    return [...this.currentQueue];
  }

  /**
   * Returns a copy of the current queue.
   */
  public getQueue(): T[] {
    return [...this.currentQueue];
  }

  /**
   * Returns a copy of the original (unshuffled) queue.
   */
  public getOriginalQueue(): T[] {
    return [...this.originalQueue];
  }

  /**
   * Returns current shuffle status.
   */
  public isShuffled(): boolean {
    return this.isShuffledState;
  }

  /**
   * Returns total items in queue.
   */
  public size(): number {
    return this.currentQueue.length;
  }
}
