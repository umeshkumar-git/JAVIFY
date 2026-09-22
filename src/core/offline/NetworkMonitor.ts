/**
 * Network Connectivity Monitor & Simulation Engine.
 * Supports listening to native browser online/offline events
 * and programmatic simulation of network loss for offline testing.
 */

export type NetworkChangeListener = (isOnline: boolean) => void;

export class NetworkMonitor {
  private isSimulatedOffline = false;
  private listeners: Set<NetworkChangeListener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleBrowserNetworkChange);
      window.addEventListener("offline", this.handleBrowserNetworkChange);
    }
  }

  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  }

  public isSimulated(): boolean {
    return this.isSimulatedOffline;
  }

  public setSimulatedOffline(simulated: boolean): void {
    if (this.isSimulatedOffline === simulated) return;
    this.isSimulatedOffline = simulated;
    this.notify();
  }

  public toggleSimulation(): boolean {
    this.setSimulatedOffline(!this.isSimulatedOffline);
    return this.isSimulatedOffline;
  }

  public subscribe(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);
    // Initial emission
    listener(this.isOnline());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private handleBrowserNetworkChange = () => {
    this.notify();
  };

  private notify() {
    const currentStatus = this.isOnline();
    this.listeners.forEach((listener) => {
      try {
        listener(currentStatus);
      } catch (err) {
        console.error("[NetworkMonitor] Listener error:", err);
      }
    });
  }

  public destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleBrowserNetworkChange);
      window.removeEventListener("offline", this.handleBrowserNetworkChange);
    }
    this.listeners.clear();
  }
}

export const networkMonitor = new NetworkMonitor();
