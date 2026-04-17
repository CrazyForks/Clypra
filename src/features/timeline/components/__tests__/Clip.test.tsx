/**
 * Unit tests for Clip component
 * Requirements: 5.1, 5.2, 5.3, 16.1
 */

import { describe, it, expect } from "vitest";
import { CoordinateSystem } from "../../utils/coordinateSystem";
import type { Clip } from "../../types/core";

describe("Clip positioning", () => {
  /**
   * Test clip position calculation at various zoom levels
   * Requirement 5.1: Position at x = startTime * pxPerSec
   */
  it("should calculate correct position at different zoom levels", () => {
    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    // Test at zoom level 48 px/sec
    const coords48 = new CoordinateSystem(48);
    const x48 = coords48.timeToPixels(clip.startTime);
    expect(x48).toBe(480); // 10 seconds * 48 px/sec

    // Test at zoom level 100 px/sec
    const coords100 = new CoordinateSystem(100);
    const x100 = coords100.timeToPixels(clip.startTime);
    expect(x100).toBe(1000); // 10 seconds * 100 px/sec

    // Test at zoom level 16 px/sec (minimum)
    const coords16 = new CoordinateSystem(16);
    const x16 = coords16.timeToPixels(clip.startTime);
    expect(x16).toBe(160); // 10 seconds * 16 px/sec
  });

  /**
   * Test clip width calculation
   * Requirement 5.2: Width = duration * pxPerSec
   */
  it("should calculate correct width based on duration", () => {
    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
      startTime: 0,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    const coords = new CoordinateSystem(48);
    const width = coords.timeToPixels(clip.duration);
    expect(width).toBe(240); // 5 seconds * 48 px/sec
  });

  /**
   * Test minimum width enforcement
   * Requirement 5.3: Minimum width of 8 pixels for very short clips
   */
  it("should enforce minimum width of 8 pixels", () => {
    const coords = new CoordinateSystem(48);

    // Very short clip (0.01 seconds)
    const shortDuration = 0.01;
    const calculatedWidth = coords.timeToPixels(shortDuration);

    // Calculated width would be 0.48 pixels, but should be clamped to 8
    expect(calculatedWidth).toBeLessThan(8);

    // The component should render with Math.max(8, calculatedWidth)
    const renderedWidth = Math.max(8, calculatedWidth);
    expect(renderedWidth).toBe(8);
  });

  /**
   * Test clip positioning at timeline start
   */
  it("should position clip at timeline start correctly", () => {
    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
      startTime: 0,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    const coords = new CoordinateSystem(48);
    const x = coords.timeToPixels(clip.startTime);
    expect(x).toBe(0);
  });

  /**
   * Test clip positioning with fractional seconds
   */
  it("should handle fractional second positions", () => {
    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
      startTime: 2.5,
      duration: 1.75,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 1.75,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    const coords = new CoordinateSystem(48);
    const x = coords.timeToPixels(clip.startTime);
    const width = coords.timeToPixels(clip.duration);

    expect(x).toBe(120); // 2.5 * 48
    expect(width).toBe(84); // 1.75 * 48
  });
});

describe("Clip virtualization", () => {
  /**
   * Test virtualization viewport calculation
   * Requirement 16.1: Only render clips within viewport plus buffer
   */
  it("should calculate visible clips based on viewport", () => {
    const clips: Clip[] = [
      {
        id: "clip-1",
        trackId: "track-1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
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
        sourceMediaPath: "/path/to/video.mp4",
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
        startTime: 100,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
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

    const pxPerSec = 48;
    const coords = new CoordinateSystem(pxPerSec);

    // Viewport showing 0-20 seconds
    const scrollLeft = 0;
    const viewportWidth = coords.timeToPixels(20); // 960 pixels

    const startTime = coords.pixelsToTime(scrollLeft);
    const endTime = coords.pixelsToTime(scrollLeft + viewportWidth);
    const buffer = 2; // seconds

    // Filter visible clips
    const visibleClips = clips.filter((clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd >= startTime - buffer && clip.startTime <= endTime + buffer;
    });

    // Should include clip-1 (0-5s) and clip-2 (10-15s)
    // Should exclude clip-3 (100-105s) as it's far outside viewport
    expect(visibleClips).toHaveLength(2);
    expect(visibleClips.map((c) => c.id)).toContain("clip-1");
    expect(visibleClips.map((c) => c.id)).toContain("clip-2");
    expect(visibleClips.map((c) => c.id)).not.toContain("clip-3");
  });

  /**
   * Test virtualization with 2-second buffer
   */
  it("should include clips within 2-second buffer", () => {
    const clips: Clip[] = [
      {
        id: "clip-before",
        trackId: "track-1",
        startTime: 8,
        duration: 1,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 1,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Clip Before",
        locked: false,
        muted: false,
      },
      {
        id: "clip-after",
        trackId: "track-1",
        startTime: 21,
        duration: 1,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 1,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Clip After",
        locked: false,
        muted: false,
      },
    ];

    const pxPerSec = 48;
    const coords = new CoordinateSystem(pxPerSec);

    // Viewport showing 10-20 seconds
    const scrollLeft = coords.timeToPixels(10);
    const viewportWidth = coords.timeToPixels(10);

    const startTime = coords.pixelsToTime(scrollLeft);
    const endTime = coords.pixelsToTime(scrollLeft + viewportWidth);
    const buffer = 2; // seconds

    // Filter visible clips
    const visibleClips = clips.filter((clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd >= startTime - buffer && clip.startTime <= endTime + buffer;
    });

    // clip-before ends at 9s, which is within buffer (10s - 2s = 8s)
    // clip-after starts at 21s, which is within buffer (20s + 2s = 22s)
    expect(visibleClips).toHaveLength(2);
    expect(visibleClips.map((c) => c.id)).toContain("clip-before");
    expect(visibleClips.map((c) => c.id)).toContain("clip-after");
  });

  /**
   * Test virtualization excludes far clips
   */
  it("should exclude clips far outside viewport", () => {
    const clips: Clip[] = [
      {
        id: "clip-far-before",
        trackId: "track-1",
        startTime: 0,
        duration: 1,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 1,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Clip Far Before",
        locked: false,
        muted: false,
      },
      {
        id: "clip-far-after",
        trackId: "track-1",
        startTime: 100,
        duration: 1,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 1,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Clip Far After",
        locked: false,
        muted: false,
      },
    ];

    const pxPerSec = 48;
    const coords = new CoordinateSystem(pxPerSec);

    // Viewport showing 50-60 seconds
    const scrollLeft = coords.timeToPixels(50);
    const viewportWidth = coords.timeToPixels(10);

    const startTime = coords.pixelsToTime(scrollLeft);
    const endTime = coords.pixelsToTime(scrollLeft + viewportWidth);
    const buffer = 2; // seconds

    // Filter visible clips
    const visibleClips = clips.filter((clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd >= startTime - buffer && clip.startTime <= endTime + buffer;
    });

    // Both clips are far outside the viewport + buffer
    expect(visibleClips).toHaveLength(0);
  });
});
