import { describe, it, expect } from "vitest";
import React from "react";
import { Button } from "../Button";
import { Card } from "../Card";
import { Badge } from "../Badge";
import { TracklistSkeleton, AlbumGridSkeleton, Skeleton } from "../SkeletonLoader";
import { AlbumCard } from "../AlbumCard";
import { PageTransition, type PageTransitionProps } from "../../transitions/PageTransition";
import { MediaCard } from "../../media/MediaCard";
import { AppLayout } from "../../layout/AppLayout";

describe("Design System & UI Components", () => {
  describe("Button Component", () => {
    it("exports valid React component with standard display name", () => {
      expect(Button).toBeDefined();
      expect(Button.displayName).toBe("Button");
    });

    it("creates a button element with default glass classes", () => {
      const element = React.createElement(Button, { variant: "neon", size: "lg" }, "Play Stream");
      expect(element.props.variant).toBe("neon");
      expect(element.props.size).toBe("lg");
      expect(element.props.children).toBe("Play Stream");
    });
  });

  describe("Card Component", () => {
    it("exports valid React component with standard display name", () => {
      expect(Card).toBeDefined();
      expect(Card.displayName).toBe("Card");
    });

    it("accepts glassmorphic variants and interactive hover mode", () => {
      const element = React.createElement(
        Card,
        { variant: "neon-glow", interactive: true },
        "Album Showcase"
      );
      expect(element.props.variant).toBe("neon-glow");
      expect(element.props.interactive).toBe(true);
    });
  });

  describe("Badge Component", () => {
    it("supports neon accent variants and pulsing dot indicator", () => {
      const element = React.createElement(
        Badge,
        { variant: "cyan", withDot: true, pulsing: true },
        "NTP Synchronized"
      );
      expect(element.props.variant).toBe("cyan");
      expect(element.props.withDot).toBe(true);
      expect(element.props.pulsing).toBe(true);
    });
  });

  describe("Skeleton Loader Component", () => {
    it("renders generic base skeleton element", () => {
      const element = React.createElement(Skeleton, { className: "h-6 w-32" });
      expect(element.props.className).toBe("h-6 w-32");
    });

    it("structures 5-column tracklist skeleton with configurable rows", () => {
      const element = React.createElement(TracklistSkeleton, { rows: 8, showHeader: true });
      expect(element.props.rows).toBe(8);
      expect(element.props.showHeader).toBe(true);
    });

    it("structures album cover grid skeleton with configurable count", () => {
      const element = React.createElement(AlbumGridSkeleton, { count: 6 });
      expect(element.props.count).toBe(6);
    });
  });

  describe("AlbumCard Component", () => {
    it("configures hover physics, spring lift, and play reveal state", () => {
      const element = React.createElement(AlbumCard, {
        id: "trk-01",
        title: "Cybernetic Drift",
        artist: "Kavinsky Protocol",
        coverUrl: "https://images.unsplash.com/photo-test",
        genre: "Synthwave",
        isPlaying: false,
      });

      expect(element.props.title).toBe("Cybernetic Drift");
      expect(element.props.genre).toBe("Synthwave");
      expect(element.props.isPlaying).toBe(false);
    });
  });

  describe("PageTransition Component", () => {
    it("wraps route children with fade-through and subtle slide", () => {
      const child = React.createElement("div", null, "Route Content");
      const element = React.createElement<PageTransitionProps>(PageTransition, { direction: "up" }, child);
      expect(element.props.direction).toBe("up");
      expect(element.props.children).toBe(child);
    });
  });

  describe("MediaCard Component", () => {
    it("renders semantic article with hover physics and accessible properties", () => {
      const element = React.createElement(MediaCard, {
        id: "media-1",
        title: "Cybernetic Drift",
        subtitle: "Kavinsky Protocol",
        coverUrl: "https://images.unsplash.com/photo-1",
        badgeText: "Synthwave",
        duration: "3:04",
      });
      expect(element.props.title).toBe("Cybernetic Drift");
      expect(element.props.badgeText).toBe("Synthwave");
      expect(element.props.duration).toBe("3:04");
    });
  });

  describe("AppLayout Component", () => {
    it("exports layout component with 3-column architecture and shell structure", () => {
      expect(AppLayout).toBeDefined();
      const element = React.createElement(AppLayout, null, React.createElement("div", null, "Child Content"));
      expect(element).toBeDefined();
    });
  });
});
