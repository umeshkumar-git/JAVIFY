/**
 * @file LRUCache.ts
 * @description High-performance Least Recently Used (LRU) Cache implementing
 * a Doubly Linked List and Hash Map architecture.
 *
 * Complexity Analysis:
 * - get(key): O(1) time complexity.
 * - put(key, value): O(1) time complexity.
 * - delete(key): O(1) time complexity.
 * - has(key): O(1) time complexity.
 * - Space Complexity: O(C), strictly bounded by the predefined capacity C.
 *
 * Architecture:
 * - Hash Map (Map<K, DListNode<K, V>>): Provides O(1) instantaneous node address lookup.
 * - Doubly Linked List: Maintains temporal access ordering.
 *   - Sentinel `head`: Points to the Most Recently Used (MRU) node.
 *   - Sentinel `tail`: Points to the Least Recently Used (LRU) node.
 *   Using sentinel nodes completely eliminates boundary null checks on insertions and deletions.
 */

export class DListNode<K, V> {
  public key: K;
  public value: V;
  public prev: DListNode<K, V> | null = null;
  public next: DListNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export interface LRUCacheStats {
  size: number;
  capacity: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRatio: number;
}

export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map: Map<K, DListNode<K, V>>;
  private readonly head: DListNode<K, V>;
  private readonly tail: DListNode<K, V>;

  // Performance Telemetry
  private hitsCount = 0;
  private missesCount = 0;
  private evictionsCount = 0;

  /**
   * Initializes the LRU Cache with a maximum capacity.
   * @param capacity Maximum number of items the cache will hold before eviction.
   */
  constructor(capacity = 50) {
    if (capacity <= 0) {
      throw new Error("[LRUCache] Capacity must be a positive integer greater than zero.");
    }

    this.capacity = capacity;
    this.map = new Map<K, DListNode<K, V>>();

    // Initialize sentinel head and tail nodes
    this.head = new DListNode<K, V>(undefined as unknown as K, undefined as unknown as V);
    this.tail = new DListNode<K, V>(undefined as unknown as K, undefined as unknown as V);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Internal helper: Inserts a node immediately after the sentinel head (marking as MRU).
   * @time O(1) pointer updates
   */
  private addToHead(node: DListNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;

    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  /**
   * Internal helper: Unlinks a node from the doubly linked list.
   * @time O(1) pointer updates
   */
  private removeNode(node: DListNode<K, V>): void {
    const prev = node.prev;
    const next = node.next;

    if (prev) prev.next = next;
    if (next) next.prev = prev;

    node.prev = null;
    node.next = null;
  }

  /**
   * Internal helper: Moves an existing node to the MRU position (head).
   * @time O(1)
   */
  private moveToHead(node: DListNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Internal helper: Evicts the least recently used node (immediately before sentinel tail).
   * @returns The evicted node or null if cache is empty.
   * @time O(1)
   */
  private evictLRU(): DListNode<K, V> | null {
    const lruNode = this.tail.prev;
    if (!lruNode || lruNode === this.head) return null;

    this.removeNode(lruNode);
    this.map.delete(lruNode.key);
    this.evictionsCount++;
    return lruNode;
  }

  /**
   * Retrieves an item from the cache and promotes it to the Most Recently Used position.
   * @param key The key to look up.
   * @returns The cached value or undefined if cache miss.
   * @time O(1)
   */
  public get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      this.missesCount++;
      return undefined;
    }

    this.hitsCount++;
    this.moveToHead(node);
    return node.value;
  }

  /**
   * Inserts or updates an item in the cache.
   * If the key exists, its value is updated and promoted to MRU.
   * If key is new and cache reaches capacity, the LRU item is evicted in O(1).
   * @param key The key to store.
   * @param value The value to associate with the key.
   * @time O(1)
   */
  public put(key: K, value: V): void {
    const existing = this.map.get(key);

    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const newNode = new DListNode<K, V>(key, value);
    this.map.set(key, newNode);
    this.addToHead(newNode);

    if (this.map.size > this.capacity) {
      this.evictLRU();
    }
  }

  /**
   * Convenience alias for put, supporting Set-like semantics when tracking keys.
   * @param key The key to add.
   * @param value Optional value (defaults to true if unspecified).
   */
  public add(key: K, value?: V): void {
    this.put(key, (value !== undefined ? value : (true as unknown as V)));
  }

  /**
   * Checks whether a key exists in the cache without altering its access recency.
   * @param key The key to check.
   * @time O(1)
   */
  public has(key: K): boolean {
    return this.map.has(key);
  }

  /**
   * Deletes a specific item from the cache.
   * @param key Key to remove.
   * @returns True if item existed and was deleted, false otherwise.
   * @time O(1)
   */
  public delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  /**
   * Clears all items and resets the cache.
   * @time O(N) garbage collection, O(1) pointer reset
   */
  public clear(): void {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Returns current count of cached items.
   */
  public get size(): number {
    return this.map.size;
  }

  /**
   * Returns maximum capacity.
   */
  public get maxCapacity(): number {
    return this.capacity;
  }

  /**
   * Returns an array of keys in MRU -> LRU order (most recent first).
   */
  public keys(): K[] {
    const result: K[] = [];
    let curr = this.head.next;
    while (curr && curr !== this.tail) {
      result.push(curr.key);
      curr = curr.next;
    }
    return result;
  }

  /**
   * Returns telemetry statistics for performance profiling and observability.
   */
  public getStats(): LRUCacheStats {
    const totalRequests = this.hitsCount + this.missesCount;
    return {
      size: this.map.size,
      capacity: this.capacity,
      hits: this.hitsCount,
      misses: this.missesCount,
      evictions: this.evictionsCount,
      hitRatio: totalRequests > 0 ? this.hitsCount / totalRequests : 0,
    };
  }
}
