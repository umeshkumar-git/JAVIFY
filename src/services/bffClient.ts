import { AudioTrack } from "../core/audio/AudioPipeline";

export interface BffUserSession {
  userId: string;
  username: string;
  provider: string;
  authenticated: boolean;
}

export interface BffChartResponse {
  chartName: string;
  updatedAt: string;
  tracks: AudioTrack[];
}

export interface BffSearchResponse {
  query: string;
  tracks: AudioTrack[];
  total: number;
}

const API_BASE = window.location.hostname === "localhost" ? "http://localhost:4000/api/bff" : "/api/bff";

/**
 * Backend-for-Frontend (BFF) HTTP Client.
 * All third-party upstream API interactions, tokens, and stream credentials
 * are proxied safely through the backend BFF without exposing secrets to the browser.
 */
export class BffClient {
  /**
   * Exchanges OAuth authorization code for session tokens stored in HTTP-only cookies.
   */
  public static async exchangeOAuthCode(code: string, provider = "spotify"): Promise<BffUserSession> {
    const res = await fetch(`${API_BASE}/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Ensures HTTP-only cookie is received and stored
      body: JSON.stringify({ code, provider }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.error?.message || "Failed to exchange OAuth token");
    }

    return data.data;
  }

  /**
   * Verifies current session using HTTP-only cookies.
   */
  public static async getSession(): Promise<BffUserSession | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/session`, {
        credentials: "include",
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Logs out and clears HTTP-only session cookie.
   */
  public static async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }

  /**
   * Fetches global top charts cached in backend Redis via SWR.
   */
  public static async getTopCharts(country = "GLOBAL", limit = 10): Promise<BffChartResponse> {
    const res = await fetch(`${API_BASE}/charts?country=${encodeURIComponent(country)}&limit=${limit}`, {
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.error?.message || "Failed to fetch top charts from BFF");
    }

    return data.data;
  }

  /**
   * Searches track catalog through the BFF proxy.
   */
  public static async search(query: string, limit = 20): Promise<BffSearchResponse> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.error?.message || "Failed to search tracks from BFF");
    }

    return data.data;
  }

  /**
   * Constructs the safe streaming proxy URL.
   * Eliminates direct client requests to third-party CDN or S3 bucket URLs.
   */
  public static getStreamUrl(trackId: string): string {
    return `${API_BASE}/stream/${encodeURIComponent(trackId)}`;
  }
}
