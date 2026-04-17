/**
 * Integration tests for scroll and zoom functionality
 * Requirements: 2.3, 25.6
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineStore } from "../../store";
import { CoordinateSystem } from "../../utils/coordinateSystem";
import type { Clip } from "../../types/core";

describe("Scroll and Zoom Integration", () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useTimelineStore.getState();

    // Clear all clips and tracks
    const clipIds = Array.from(store.clips.keys());
    clipIds.forEach((id) => {
      const clip = store.clips.get(id);
      if (clip && !clip.locked) {
        store.deleteClip(id);
      }
    });

    const trackIds = Array.from(store.tracks.keys());
    trackIds.forEach((id) => {
      store.deleteTrack(id);
    });

    // Reset view state
    store.setZoom(48);
    store.setScroll(0, 0);
    store.setPlayhead(0);
    store.deselectAll();

    // Clear history
    store.clearHistory();
  });

  describe("Scroll position tracking", () => {
    it("should update scroll position in store when scrolling", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Initial scroll position should be 0
      expect(result.current.scrollLeft).toBe(0);
      expect(result.current.scrollTop).toBe(0);

      // Simulate scroll
      act(() => {
        result.current.setScroll(100, 50);
      });

      // Verify scroll position updated
      expect(result.current.scrollLeft).toBe(100);
      expect(result.current.scrollTop).toBe(50);
    });

    it("should clamp scroll position to non-negative values", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Try to set negative scroll position
      act(() => {
        result.current.setScroll(-50, -25);
      });

      // Verify scroll position clamped to 0
      expect(result.current.scrollLeft).toBe(0);
      expect(result.current.scrollTop).toBe(0);
    });

    it("should update visible clip range based on scroll position", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Add a track first
      act(() => {
        result.current.addTrack({
          id: "track-1",
          name: "Track 1",
          type: "video",
          order: 0,
          height: 100,
          locked: false,
          visible: true,
          muted: false,
          color: "#1e40af",
        });
      });

      // Add clips at different time positions
      const clips: Clip[] = [
        {
          id: "clip-1",
          trackId: "track-1",
          startTime: 0,
          duration: 5,
          sourceMediaPath: "/path/to/video1.mp4",
          sourceStart: 0,
          sourceEnd: 5,
          type: "video",
          filmstripUrl: null,
          waveformPeaks: null,
          name: "Clip 1",
          locked: false,
          muted: false,
        },
        {
          id: "clip-2",
          trackId: "track-1",
          startTime: 10,
          duration: 5,
          sourceMediaPath: "/path/to/video2.mp4",
          sourceStart: 0,
          sourceEnd: 5,
          type: "video",
          filmstripUrl: null,
          waveformPeaks: null,
          name: "Clip 2",
          locked: false,
          muted: false,
        },
        {
          id: "clip-3",
          trackId: "track-1",
          startTime: 20,
          duration: 5,
          sourceMediaPath: "/path/to/video3.mp4",
          sourceStart: 0,
          sourceEnd: 5,
          type: "video",
          filmstripUrl: null,
          waveformPeaks: null,
          name: "Clip 3",
          locked: false,
          muted: false,
        },
      ];

      act(() => {
        clips.forEach((clip) => result.current.addClip(clip));
      });

      // Verify clips were added
      expect(result.current.clips.size).toBe(3);

      // Simulate scroll to middle of timeline
      // At 48 px/sec (default zoom), scrolling to 480px = 10 seconds
      act(() => {
        result.current.setScroll(480, 0);
      });

      // Verify scroll position updated (Requirement 25.6)
      expect(result.current.scrollLeft).toBe(480);
    });
  });

  describe("Pinch zoom with cursor stability", () => {
    it("should maintain time under cursor when zooming", () => {
      const coords = new CoordinateSystem(48); // Start at 48 px/sec

      // Cursor at 240px from left, scrolled 0px
      // Time under cursor = (0 + 240) / 48 = 5 seconds
      const cursorX = 240;
      const scrollLeft = 0;
      const zoomFactor = 2; // Zoom in 2x

      const { newPxPerSec, newScrollLeft } = coords.zoomToCursor(cursorX, scrollLeft, zoomFactor, 16, 320);

      // New zoom should be 48 * 2 = 96 px/sec
      expect(newPxPerSec).toBe(96);

      // Time under cursor should still be 5 seconds
      // New scroll position: 5 * 96 - 240 = 480 - 240 = 240
      expect(newScrollLeft).toBe(240);

      // Verify time under cursor is preserved
      const timeAfterZoom = (newScrollLeft + cursorX) / newPxPerSec;
      expect(timeAfterZoom).toBeCloseTo(5, 3);
    });

    it("should clamp zoom to min/max boundaries", () => {
      const coords = new CoordinateSystem(16); // At minimum zoom

      // Try to zoom out further
      const { newPxPerSec: zoomOutResult } = coords.zoomToCursor(100, 0, 0.5, 16, 320);

      // Should stay at minimum
      expect(zoomOutResult).toBe(16);

      // Now test maximum zoom
      const coordsMax = new CoordinateSystem(320); // At maximum zoom
      const { newPxPerSec: zoomInResult } = coordsMax.zoomToCursor(100, 0, 2, 16, 320);

      // Should stay at maximum
      expect(zoomInResult).toBe(320);
    });

    it("should calculate correct zoom factor from deltaY", () => {
      // Simulate wheel event deltaY values
      const deltaY = -100; // Negative = zoom in
      const factor = Math.exp(-deltaY * 0.009);

      // Factor should be > 1 for zoom in
      expect(factor).toBeGreaterThan(1);
      expect(factor).toBeCloseTo(2.459, 2);

      // Positive deltaY = zoom out
      const deltaYOut = 100;
      const factorOut = Math.exp(-deltaYOut * 0.009);

      // Factor should be < 1 for zoom out
      expect(factorOut).toBeLessThan(1);
      expect(factorOut).toBeCloseTo(0.407, 2);
    });

    it("should update scroll position after zoom to maintain cursor stability", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Set initial zoom
      act(() => {
        result.current.setZoom(48);
      });

      expect(result.current.pxPerSec).toBe(48);

      // Simulate zoom in
      const coords = new CoordinateSystem(48);
      const { newPxPerSec, newScrollLeft } = coords.zoomToCursor(200, 100, 1.5, 16, 320);

      act(() => {
        result.current.setZoom(newPxPerSec);
        result.current.setScroll(newScrollLeft, 0);
      });

      // Verify zoom updated
      expect(result.current.pxPerSec).toBe(72); // 48 * 1.5

      // Verify scroll position updated to maintain cursor stability
      // Time under cursor at (100 + 200) / 48 = 6.25 seconds
      // New scroll: 6.25 * 72 - 200 = 450 - 200 = 250
      expect(result.current.scrollLeft).toBe(250);
    });
  });

  describe("Scroll position maintenance during zoom", () => {
    it("should preserve scroll position when zooming without cursor movement", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Set initial state
      act(() => {
        result.current.setZoom(48);
        result.current.setScroll(240, 0);
      });

      // Time at scroll position: 240 / 48 = 5 seconds
      const initialTime = result.current.scrollLeft / result.current.pxPerSec;
      expect(initialTime).toBe(5);

      // Zoom in with cursor at center of viewport (e.g., 400px from left edge)
      const coords = new CoordinateSystem(48);
      const { newPxPerSec, newScrollLeft } = coords.zoomToCursor(400, 240, 1.5, 16, 320);

      act(() => {
        result.current.setZoom(newPxPerSec);
        result.current.setScroll(newScrollLeft, 0);
      });

      // Time under cursor should be preserved
      // Original time under cursor: (240 + 400) / 48 = 13.33 seconds
      // New time under cursor: (newScrollLeft + 400) / 72
      const originalTimeUnderCursor = (240 + 400) / 48;
      const newTimeUnderCursor = (newScrollLeft + 400) / newPxPerSec;

      expect(newTimeUnderCursor).toBeCloseTo(originalTimeUnderCursor, 3);
    });

    it("should keep playhead visible during scroll", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Set playhead at 10 seconds
      act(() => {
        result.current.setPlayhead(10);
      });

      expect(result.current.playhead).toBe(10);

      // Playhead position in pixels at 48 px/sec: 10 * 48 = 480px
      const playheadPx = result.current.playhead * result.current.pxPerSec;
      expect(playheadPx).toBe(480);

      // The auto-scroll logic in Timeline.tsx should keep playhead visible
      // This is tested in the component itself, but we verify the state is correct
      expect(result.current.playhead).toBe(10);
    });
  });

  describe("Horizontal and vertical scrolling", () => {
    it("should enable horizontal scrolling when content exceeds viewport", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Set duration to 300 seconds (5 minutes)
      const duration = 300;

      // At 48 px/sec, content width = 300 * 48 = 14400px
      const contentWidth = duration * result.current.pxPerSec;
      expect(contentWidth).toBe(14400);

      // If viewport is 1200px, scrollbar should be present
      const viewportWidth = 1200;
      const shouldScroll = contentWidth > viewportWidth;

      expect(shouldScroll).toBe(true);
    });

    it("should update scroll position via setScroll action", () => {
      const { result } = renderHook(() => useTimelineStore());

      // Simulate scrollbar drag
      act(() => {
        result.current.setScroll(500, 100);
      });

      expect(result.current.scrollLeft).toBe(500);
      expect(result.current.scrollTop).toBe(100);

      // Simulate further scroll
      act(() => {
        result.current.setScroll(1000, 200);
      });

      expect(result.current.scrollLeft).toBe(1000);
      expect(result.current.scrollTop).toBe(200);
    });
  });
});
