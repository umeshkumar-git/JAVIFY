import { test, expect } from "@playwright/test";

test.describe("JAVIFY Tier-1 Distributed Streaming Client Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root (unauthenticated state renders Auth page)
    await page.goto("/");
  });

  test("should authenticate as guest, navigate to streaming hub, test 10k virtualization, and trigger audio playback", async ({
    page,
  }) => {
    // 1. Authenticate via Quick Start
    const quickStartBtn = page.getByRole("button", {
      name: /Quick start as guest apprentice/i,
    });
    await expect(quickStartBtn).toBeVisible({ timeout: 10000 });
    await quickStartBtn.click();

    // 2. Verify redirect to dashboard
    await page.waitForURL("**/#/dashboard", { timeout: 10000 });

    // 3. Navigate to /stream via header navigation link (#/stream)
    const streamLink = page.locator('a[href="#/stream"]').first();
    await expect(streamLink).toBeVisible({ timeout: 10000 });
    await streamLink.click();
    await page.waitForURL("**/#/stream", { timeout: 10000 });

    // 4. Verify Streaming Hub page loaded with headline & profiler HUD
    const heading = page.getByRole("heading", {
      name: /Real-Time Collaborative Soundstream/i,
    });
    await expect(heading).toBeVisible({ timeout: 10000 });

    const profilerHud = page.getByTestId("faang-profiler-hud");
    await expect(profilerHud).toBeVisible();
    await expect(profilerHud).toContainText("DOM Recycling");

    // 5. Test DOM recycling scale with 10k benchmark
    const benchmarkBtn = page.getByTestId("benchmark-10k-btn");
    await expect(benchmarkBtn).toBeVisible();
    await benchmarkBtn.click();

    // Assert that the HUD reflects the 10,000 item catalog
    await expect(profilerHud).toContainText("10,000", { timeout: 5000 });

    // 6. Test debounced search input
    const searchInput = page.getByTestId("track-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Synthwave");
    // Allow debounce to apply
    await page.waitForTimeout(400);

    // 7. Trigger track playback on the first row
    const firstPlayBtn = page.getByTestId("play-track-row").first();
    await expect(firstPlayBtn).toBeVisible({ timeout: 5000 });
    await firstPlayBtn.click();

    // 8. Verify Audio Player Bar appears with metadata and active playback controls
    const playerBar = page.getByTestId("audio-player-bar");
    await expect(playerBar).toBeVisible();

    const trackTitle = page.getByTestId("player-track-title");
    await expect(trackTitle).toBeVisible();
    await expect(trackTitle).not.toHaveText("No track loaded");

    // 9. Verify play/pause toggle functionality
    const playPauseBtn = page.getByTestId("player-play-pause-btn");
    await expect(playPauseBtn).toBeVisible();
    await playPauseBtn.click();
    await page.waitForTimeout(300);
    await playPauseBtn.click();
  });
});
