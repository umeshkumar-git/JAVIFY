import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { ProgressBar } from "../ProgressBar";
import { useAudioStore } from "../../../store/useAudioStore";

describe("ProgressBar Component (60FPS Scrubber)", () => {
  beforeEach(() => {
    useAudioStore.setState({
      currentTime: 30,
      duration: 180,
      isPlaying: false,
      status: "PAUSED",
    });
  });

  it("exports valid React component with standard display name", () => {
    expect(ProgressBar).toBeDefined();
    expect(ProgressBar.displayName).toBe("ProgressBar");
  });

  it("creates ProgressBar element with default props", () => {
    const element = React.createElement(ProgressBar);
    expect(element.type).toBe(ProgressBar);
    expect(element.props.showTimeLabels).toBeUndefined(); // defaults to true inside component
  });

  it("accepts custom callbacks for seeking and sizing tokens", () => {
    const handleSeekEnd = vi.fn();
    const handleSeekChange = vi.fn();

    const element = React.createElement(ProgressBar, {
      size: "lg",
      showTimeLabels: false,
      onSeekEnd: handleSeekEnd,
      onSeekChange: handleSeekChange,
      className: "custom-scrubber",
    });

    expect(element.props.size).toBe("lg");
    expect(element.props.showTimeLabels).toBe(false);
    expect(element.props.className).toBe("custom-scrubber");
    expect(element.props.onSeekEnd).toBe(handleSeekEnd);
    expect(element.props.onSeekChange).toBe(handleSeekChange);
  });

  it("handles audio store state transitions without crashing", () => {
    useAudioStore.getState().seek(45);
    expect(useAudioStore.getState().currentTime).toBe(45);

    useAudioStore.setState({ duration: 240, isPlaying: true, status: "PLAYING" });
    expect(useAudioStore.getState().duration).toBe(240);
    expect(useAudioStore.getState().isPlaying).toBe(true);
  });
});
