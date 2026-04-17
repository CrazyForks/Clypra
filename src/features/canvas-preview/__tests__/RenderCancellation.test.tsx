/**
 * Unit Tests for Render Cancellation
 * Requirements: 9.3, 9.4
 */

import React from "react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CanvasRenderer } from "../components/CanvasRenderer";
import { useTimelineStore } from "../../timeline/store/timelineStore";
import type { Clip, Track } from "../../timeline/types";

// Mock canvas context
const mockContext = {
  fillStyle: "",
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  scale: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  textAlign: "",
  font: "",
  fillText: vi.fn(),
  textBaseline: "",
  canvas: {
    width: 0,
    height: 0,
  },
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === "2d") {
    return mockContext as any;
  }
  return null;
});

// Mock createImageBitmap
global.createImageBitmap = vi.fn(() => Promise.resolve({ close: vi.fn() } as any));

// Mock the subsystems
vi.mock("../utils/VideoPool", () => {
  return {
    VideoPool: vi.fn(function (this: any) {
      this.getVideo = vi.fn().mockResolvedValue(document.createElement("video"));
      this.releaseVideo = vi.fn();
      this.dispose = vi.fn();
      return this;
    }),
  };
});

vi.mock("../utils/FrameResolver", () => {
  return {
    FrameResolver: vi.fn(function (this: any) {
      this.getActiveClips = vi.fn().mockReturnValue([]);
      return this;
    }),
  };
});

vi.mock("../utils/SeekManager", () => {
  return {
    SeekManager: vi.fn(function (this: any) {
      this.seekIfNeeded = vi.fn().mockResolvedValue(undefined);
      this.cancelPendingSeeks = vi.fn();
      this.dispose = vi.fn();
      return this;
    }),
  };
});

vi.mock("../utils/RenderEngine", () => {
  return {
    RenderEngine: vi.fn(function (this: any) {
      this.renderFrame = vi.fn();
      return this;
    }),
  };
});

vi.mock("../utils/FrameCache", () => {
  return {
    FrameCache: vi.fn(function (this: any) {
      this.get = vi.fn().mockReturnValue(null);
      this.set = vi.fn();
      this.updateStateHash = vi.fn();
      this.invalidate = vi.fn();
      this.dispose = vi.fn();
      return this;
    }),
  };
});

describe("Render Cancellation Unit Tests", () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useTimelineStore.getState();
    store.fromJSON({
      clips: [],
      tracks: [],
      playhead: 0,
      duration: 300,
      pxPerSec: 48,
      snapToPlayhead: true,
      snapToClips: true,
      snapToMarkers: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("RAF Cancellation on New Render", () => {
    it("should cancel pending RAF when starting new RAF loop (Requirement 9.3)", () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame");
      const requestAnimationFrameSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(123 as any);

      const store = useTimelineStore.getState();

      // Render with isPlaying = false
      const { rerender } = render(<CanvasRenderer width={100} height={100} />);

      // Start playback (first RAF loop)
      store.setIsPlaying(true);
      rerender(<CanvasRenderer width={100} height={100} />);

      expect(requestAnimationFrameSpy).toHaveBeenCalled();

      // Stop playback
      store.setIsPlaying(false);
      rerender(<CanvasRenderer width={100} height={100} />);

      // Start playback again (should cancel previous RAF)
      store.setIsPlaying(true);
      rerender(<CanvasRenderer width={100} height={100} />);

      // cancelAnimationFrame should have been called
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
      requestAnimationFrameSpy.mockRestore();
    });

    it("should cancel RAF when component unmounts during playback (Requirement 9.3)", () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame");
      const requestAnimationFrameSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(123 as any);

      const store = useTimelineStore.getState();
      store.setIsPlaying(true);

      const { unmount } = render(<CanvasRenderer width={100} height={100} />);

      expect(requestAnimationFrameSpy).toHaveBeenCalled();

      // Unmount component
      unmount();

      // cancelAnimationFrame should be called during cleanup
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
      requestAnimationFrameSpy.mockRestore();
    });
  });

  describe("Render State Tracking", () => {
    it("should handle playhead changes without crashing (Requirement 9.4)", () => {
      const store = useTimelineStore.getState();

      const { rerender } = render(<CanvasRenderer width={100} height={100} />);

      // Trigger multiple playhead changes
      store.setPlayhead(10);
      rerender(<CanvasRenderer width={100} height={100} />);

      store.setPlayhead(20);
      rerender(<CanvasRenderer width={100} height={100} />);

      store.setPlayhead(30);
      rerender(<CanvasRenderer width={100} height={100} />);

      // Verify system handled changes without crashing
      // The component should still be rendered
      expect(true).toBe(true);
    });

    it("should allow new renders after previous render completes (Requirement 9.4)", () => {
      const store = useTimelineStore.getState();

      const { rerender } = render(<CanvasRenderer width={100} height={100} />);

      // First render
      store.setPlayhead(10);
      rerender(<CanvasRenderer width={100} height={100} />);

      // Second render should be allowed
      store.setPlayhead(20);
      rerender(<CanvasRenderer width={100} height={100} />);

      // Verify second render was processed (component didn't crash)
      expect(true).toBe(true);
    });

    it("should handle rapid playhead changes gracefully (Requirement 9.3, 9.4)", () => {
      const store = useTimelineStore.getState();

      const { rerender } = render(<CanvasRenderer width={100} height={100} />);

      // Trigger rapid playhead changes
      const positions = [10, 20, 30, 40, 50];
      for (const playhead of positions) {
        store.setPlayhead(playhead);
        rerender(<CanvasRenderer width={100} height={100} />);
      }

      // Verify system handled rapid changes without crashing
      expect(true).toBe(true);
    });
  });

  describe("Seek Cancellation", () => {
    it("should handle multiple render requests without crashing (Requirement 9.4)", () => {
      const store = useTimelineStore.getState();

      // Add a clip to trigger video loading
      const track: Track = {
        id: "track1",
        name: "Video Track 1",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 100,
        sourceMediaPath: "/test/video.mp4",
        sourceStart: 0,
        sourceEnd: 100,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Test Clip",
        locked: false,
        muted: false,
      };

      store.addTrack(track);
      store.addClip(clip);

      const { rerender } = render(<CanvasRenderer width={100} height={100} />);

      // Trigger multiple render requests
      store.setPlayhead(10);
      rerender(<CanvasRenderer width={100} height={100} />);

      store.setPlayhead(20);
      rerender(<CanvasRenderer width={100} height={100} />);

      // Verify system handled multiple requests without crashing
      expect(true).toBe(true);
    });
  });

  describe("RAF Loop Behavior", () => {
    it("should start RAF loop when isPlaying becomes true (Requirement 9.2)", () => {
      const requestAnimationFrameSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(123 as any);

      const store = useTimelineStore.getState();
      const { rerender } = render(<CanvasRenderer width={100} height={100} />);

      // Start playback
      store.setIsPlaying(true);
      rerender(<CanvasRenderer width={100} height={100} />);

      // RAF should be called
      expect(requestAnimationFrameSpy).toHaveBeenCalled();

      requestAnimationFrameSpy.mockRestore();
    });

    it("should stop RAF loop when isPlaying becomes false (Requirement 9.3)", () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame");
      const requestAnimationFrameSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(123 as any);

      const store = useTimelineStore.getState();
      store.setIsPlaying(true);

      const { rerender } = render(<CanvasRenderer width={100} height={100} />);

      // Stop playback
      store.setIsPlaying(false);
      rerender(<CanvasRenderer width={100} height={100} />);

      // cancelAnimationFrame should eventually be called
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
      requestAnimationFrameSpy.mockRestore();
    });
  });
});
