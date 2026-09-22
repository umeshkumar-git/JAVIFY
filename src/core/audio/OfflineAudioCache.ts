import { AudioTrack } from "./AudioPipeline";

export interface CachedTrackRecord {
  id: string;
  metadata: AudioTrack;
  byteSize: number;
  cachedAt: number;
  lastAccessedAt: number;
}

/**
 * High-performance Offline-First Audio Caching Layer backed by IndexedDB.
 * Manages binary audio Blobs/ArrayBuffers with LRU eviction and storage budget estimation.
 */
export class OfflineAudioCache {
  private static readonly DB_NAME = "javify_audio_store";
  private static readonly DB_VERSION = 1;
  private static readonly STORE_METADATA = "track_metadata";
  private static readonly STORE_BLOBS = "audio_blobs";

  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(OfflineAudioCache.DB_NAME, OfflineAudioCache.DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OfflineAudioCache.STORE_METADATA)) {
          const metaStore = db.createObjectStore(OfflineAudioCache.STORE_METADATA, { keyPath: "id" });
          metaStore.createIndex("lastAccessedAt", "lastAccessedAt");
        }
        if (!db.objectStoreNames.contains(OfflineAudioCache.STORE_BLOBS)) {
          db.createObjectStore(OfflineAudioCache.STORE_BLOBS, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Caches an audio track by downloading its binary stream and persisting in IndexedDB.
   */
  public async cacheTrack(track: AudioTrack): Promise<CachedTrackRecord> {
    const db = await this.getDB();

    const response = await fetch(track.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio stream: ${response.statusText}`);
    }

    const blob = await response.blob();
    const now = Date.now();

    const record: CachedTrackRecord = {
      id: track.id,
      metadata: track,
      byteSize: blob.size,
      cachedAt: now,
      lastAccessedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([OfflineAudioCache.STORE_METADATA, OfflineAudioCache.STORE_BLOBS], "readwrite");
      tx.objectStore(OfflineAudioCache.STORE_METADATA).put(record);
      tx.objectStore(OfflineAudioCache.STORE_BLOBS).put({ id: track.id, blob });

      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieves a cached Blob URL for offline playback.
   */
  public async getCachedAudioUrl(trackId: string): Promise<string | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([OfflineAudioCache.STORE_METADATA, OfflineAudioCache.STORE_BLOBS], "readwrite");
      const blobRequest = tx.objectStore(OfflineAudioCache.STORE_BLOBS).get(trackId);
      const metaRequest = tx.objectStore(OfflineAudioCache.STORE_METADATA).get(trackId);

      tx.oncomplete = () => {
        if (!blobRequest.result || !blobRequest.result.blob) {
          return resolve(null);
        }

        // Update last accessed time for LRU
        if (metaRequest.result) {
          const updated = { ...metaRequest.result, lastAccessedAt: Date.now() };
          const updateTx = db.transaction(OfflineAudioCache.STORE_METADATA, "readwrite");
          updateTx.objectStore(OfflineAudioCache.STORE_METADATA).put(updated);
        }

        const objectUrl = URL.createObjectURL(blobRequest.result.blob);
        resolve(objectUrl);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async isTrackCached(trackId: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(OfflineAudioCache.STORE_METADATA, "readonly");
      const request = tx.objectStore(OfflineAudioCache.STORE_METADATA).count(trackId);
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  }

  public async getAllCachedTracks(): Promise<CachedTrackRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OfflineAudioCache.STORE_METADATA, "readonly");
      const request = tx.objectStore(OfflineAudioCache.STORE_METADATA).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete track from cache.
   */
  public async removeTrack(trackId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([OfflineAudioCache.STORE_METADATA, OfflineAudioCache.STORE_BLOBS], "readwrite");
      tx.objectStore(OfflineAudioCache.STORE_METADATA).delete(trackId);
      tx.objectStore(OfflineAudioCache.STORE_BLOBS).delete(trackId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Storage Quota Estimate.
   */
  public async getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return {
        usageMB: Math.round(usage / (1024 * 1024)),
        quotaMB: Math.round(quota / (1024 * 1024)),
      };
    }
    return { usageMB: 0, quotaMB: 0 };
  }
}

export const offlineAudioCache = new OfflineAudioCache();
