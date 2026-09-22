/**
 * JAVIFY Tier-1 Production Service Worker
 * - Precaches UI Shell for instant loading & offline resilience.
 * - Stale-While-Revalidate caching strategy for application assets.
 * - Intercepts audio stream requests (/api/bff/stream/*) to serve binary Blobs from IndexedDB when offline.
 */

const CACHE_NAME = "javify-shell-v2";
const PRECACHE_ASSETS = ["/", "/index.html"];

const DB_NAME = "javify_audio_store";
const DB_VERSION = 1;
const STORE_BLOBS = "audio_blobs";

/**
 * Reads an audio blob directly from IndexedDB inside the Service Worker thread.
 */
function getCachedAudioBlobFromIDB(trackId) {
  return new Promise((resolve) => {
    if (!indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => resolve(null);

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.close();
        resolve(null);
        return;
      }

      try {
        const tx = db.transaction(STORE_BLOBS, "readonly");
        const store = tx.objectStore(STORE_BLOBS);
        const getReq = store.get(trackId);

        getReq.onsuccess = () => {
          db.close();
          if (getReq.result && getReq.result.blob) {
            resolve(getReq.result.blob);
          } else {
            resolve(null);
          }
        };

        getReq.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    };
  });
}

// 1. Installation: Precache UI Shell & activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache asset warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activation: Clean up stale cache versions & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event Interception: Offline Stream Proxy & Stale-While-Revalidate
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // A. Audio Stream Interception (/api/bff/stream/:trackId or sound streams)
  const isBffStream = url.pathname.includes("/api/bff/stream/");
  const isAudioFile = url.pathname.endsWith(".ogg") || url.pathname.endsWith(".mp3");

  if (isBffStream || isAudioFile) {
    const trackId = isBffStream
      ? url.pathname.split("/").pop()
      : url.pathname.split("/").pop().replace(/\.[^/.]+$/, "");

    event.respondWith(
      (async () => {
        // Try network first if online
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok || networkResponse.status === 206) {
            return networkResponse;
          }
        } catch {
          // Network failed or offline: fall back to IndexedDB binary store
        }

        const cachedBlob = await getCachedAudioBlobFromIDB(trackId);
        if (cachedBlob) {
          const rangeHeader = request.headers.get("range");

          if (rangeHeader) {
            // Simulate RFC 7233 partial content from Blob for audio seeking
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (match) {
              const start = parseInt(match[1], 10);
              const end = match[2] ? parseInt(match[2], 10) : cachedBlob.size - 1;
              const chunk = cachedBlob.slice(start, end + 1);

              return new Response(chunk, {
                status: 206,
                statusText: "Partial Content",
                headers: {
                  "Content-Type": cachedBlob.type || "audio/ogg",
                  "Content-Range": `bytes ${start}-${end}/${cachedBlob.size}`,
                  "Content-Length": String(chunk.size),
                  "Accept-Ranges": "bytes",
                  "X-Cache-Source": "ServiceWorker-IndexedDB",
                },
              });
            }
          }

          // Full content
          return new Response(cachedBlob, {
            status: 200,
            statusText: "OK",
            headers: {
              "Content-Type": cachedBlob.type || "audio/ogg",
              "Content-Length": String(cachedBlob.size),
              "Accept-Ranges": "bytes",
              "X-Cache-Source": "ServiceWorker-IndexedDB",
            },
          });
        }

        // Neither network nor offline blob available
        return new Response(
          JSON.stringify({ error: "Audio track unavailable offline. Please cache before disconnecting." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })()
    );
    return;
  }

  // B. UI Shell & Static Assets: Stale-While-Revalidate with Navigation Fallback
  if (request.method === "GET") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // If navigation request fails offline, serve precached root HTML
            if (request.mode === "navigate") {
              return cache.match("/index.html") || cache.match("/");
            }
            return null;
          });

        return cachedResponse || fetchPromise;
      })
    );
  }
});
