import { describe, it, expect, vi, beforeEach } from "vitest";
import { NetworkMonitor } from "../NetworkMonitor";

describe("NetworkMonitor (Offline & Connectivity Engine)", () => {
  let monitor: NetworkMonitor;

  beforeEach(() => {
    monitor = new NetworkMonitor();
  });

  it("defaults to online when navigator.onLine is true", () => {
    expect(monitor.isOnline()).toBe(true);
    expect(monitor.isSimulated()).toBe(false);
  });

  it("correctly simulates offline mode and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = monitor.subscribe(listener);

    // Initial emission was true
    expect(listener).toHaveBeenCalledWith(true);

    // Switch to simulated offline
    monitor.setSimulatedOffline(true);
    expect(monitor.isOnline()).toBe(false);
    expect(monitor.isSimulated()).toBe(true);
    expect(listener).toHaveBeenCalledWith(false);

    // Toggle back to online
    const simulated = monitor.toggleSimulation();
    expect(simulated).toBe(false);
    expect(monitor.isOnline()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
  });

  it("stops notifying after unsubscribing", () => {
    const listener = vi.fn();
    const unsubscribe = monitor.subscribe(listener);

    listener.mockClear();
    unsubscribe();

    monitor.setSimulatedOffline(true);
    expect(listener).not.toHaveBeenCalled();
  });
});
