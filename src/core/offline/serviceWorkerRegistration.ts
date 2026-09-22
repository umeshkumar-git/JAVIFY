/**
 * Service Worker Registration & Lifecycle Manager
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
}

export function registerServiceWorker(config?: ServiceWorkerConfig): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const swUrl = "/sw.js";

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.info("[SW] New content available; please refresh.");
                config?.onUpdate?.(registration);
              } else {
                // Content cached for offline use
                console.info("[SW] Content precached for offline usage.");
                config?.onSuccess?.(registration);
              }
            }
          };
        };
      })
      .catch((error) => {
        console.warn("[SW] Service Worker registration failed:", error);
      });
  });
}

export function unregisterServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.warn("[SW] Unregistration error:", error);
      });
  }
}
