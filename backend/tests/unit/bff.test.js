import { describe, it, expect } from "vitest";
import {
  exchangeOAuthToken,
  verifySessionToken,
  revokeSessionToken,
  getTopCharts,
  searchCatalog,
  getTrackStreamMetadata,
} from "../../src/services/bff.service.js";

describe("Backend-for-Frontend (BFF Service)", () => {
  it("exchanges OAuth code for server-managed session token", async () => {
    const session = await exchangeOAuthToken({ code: "mock_auth_code_123", provider: "spotify" });

    expect(session).toBeDefined();
    expect(session.userId).toMatch(/^usr_/);
    expect(session.token).toMatch(/^bff_tok_/);
    expect(session.provider).toBe("spotify");

    // Verify session lookup
    const retrieved = verifySessionToken(session.token);
    expect(retrieved).toBeDefined();
    expect(retrieved.userId).toBe(session.userId);

    // Revoke session
    revokeSessionToken(session.token);
    expect(verifySessionToken(session.token)).toBeNull();
  });

  it("fetches top charts with metadata and duration", async () => {
    const charts = await getTopCharts({ country: "GLOBAL", limit: 3 });

    expect(charts).toBeDefined();
    expect(charts.chartName).toBe("Top 50 - GLOBAL");
    expect(charts.tracks).toHaveLength(3);
    expect(charts.tracks[0]).toHaveProperty("title");
    expect(charts.tracks[0]).toHaveProperty("artist");
    expect(charts.tracks[0]).toHaveProperty("url");
  });

  it("searches catalog through the BFF proxy without leaking secrets", async () => {
    const results = await searchCatalog("cyber", 5);

    expect(results).toBeDefined();
    expect(results.tracks.length).toBeGreaterThan(0);
    expect(results.tracks[0].title.toLowerCase()).toContain("cyber");
  });

  it("resolves safe stream proxy metadata for tracks", () => {
    const meta = getTrackStreamMetadata("trk-synth-01");

    expect(meta).toBeDefined();
    expect(meta.trackId).toBe("trk-synth-01");
    expect(meta.streamUrl).toBeDefined();
    expect(meta.streamUrl).toMatch(/^https?:\/\/|^\/audio\//);
  });
});
