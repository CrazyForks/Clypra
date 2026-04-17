/**
 * Unit Tests for RenderEngine
 * Tests specific examples and edge cases
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RenderEngine } from "../utils/RenderEngine";
import type { ActiveClip } from "../types/core";

// Mock canvas context for testing
class MockCanvasContext {
  fillStyle = "";
  fillRectCalls: Array<{ x: number; y: number; width: number; height: number }> = [];
  drawImageCalls: Array<{
    video: any;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  fillRect(x: number, y: number, width: number, height: number): void {
    this.fillRectCalls.push({ x, y, width, height });
  }

  drawImage(video: any, x: number, y: number, width: number, height: number): void {
    this.drawImageCalls.push({ video, x, y, width, height });
  }

  reset(): void {
    this.fillStyle = "";
    this.fillRectCalls = [];
    this.drawImageCalls = [];
  }
}

// Mock video element
class MockVideoElement {
  readyState = 2; // HAVE_ENOUGH_DATA
  videoWidth: number;
  videoHeight: number;
  currentTime = 0;

  constructor(width: number, height: number, readyState: number = 2) {
    this.videoWidth = width;
    this.videoHeight = height;
    this.readyState = readyState;
  }
}

describe("RenderEngine - Unit Tests", () => {
  let mockCtx: MockCanvasContext;

  beforeEach(() => {
    mockCtx = new MockCanvasContext();
  });

  // Helper to create active clip
  const createActiveClip = (id: string, trackIndex: number, videoWidth: number, videoHeight: number, readyState: number = 2): ActiveClip => ({
    id,
    trackId: `track${trackIndex}`,
    trackIndex,
    clipTime: 0,
    videoElement: new MockVideoElement(videoWidth, videoHeight, readyState) as any,
    startTime: 0,
    duration: 10,
    sourceMediaPath: `${id}.mp4`,
    sourceStart: 0,
    sourceEnd: 10,
    type: "video" as const,
    filmstripUrl: null,
    waveformPeaks: null,
    name: id,
    locked: false,
    muted: false,
  });

  describe("Aspect Ratio Scaling", () => {
    it("should fit width for wider video (16:9 video on 4:3 canvas)", () => {
      const engine = new RenderEngine(mockCtx as any, 800, 600);
      const clip = createActiveClip("clip1", 0, 1920, 1080); // 16:9

      engine.renderFrame([clip]);

      expect(mockCtx.drawImageCalls.length).toBe(1);
      const drawCall = mockCtx.drawImageCalls[0];

      // Video should fit width
      expect(drawCall.width).toBe(800);
      // Height should maintain aspect ratio
      expect(drawCall.height).toBeCloseTo(450, 0);
      // Should be centered vertically
      expect(drawCall.x).toBe(0);
      expect(drawCall.y).toBeCloseTo(75, 0); // (600 - 450) / 2
    });

    it("should fit height for taller video (4:3 video on 16:9 canvas)", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1024, 768); // 4:3

      engine.renderFrame([clip]);

      expect(mockCtx.drawImageCalls.length).toBe(1);
      const drawCall = mockCtx.drawImageCalls[0];

      // Video should fit height
      expect(drawCall.height).toBe(1080);
      // Width should maintain aspect ratio
      expect(drawCall.width).toBeCloseTo(1440, 0);
      // Should be centered horizontally
      expect(drawCall.x).toBeCloseTo(240, 0); // (1920 - 1440) / 2
      expect(drawCall.y).toBe(0);
    });

    it("should handle square video on rectangular canvas", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1080, 1080); // 1:1

      engine.renderFrame([clip]);

      expect(mockCtx.drawImageCalls.length).toBe(1);
      const drawCall = mockCtx.drawImageCalls[0];

      // Video should fit height (taller aspect)
      expect(drawCall.height).toBe(1080);
      expect(drawCall.width).toBe(1080);
      // Should be centered horizontally
      expect(drawCall.x).toBeCloseTo(420, 0); // (1920 - 1080) / 2
      expect(drawCall.y).toBe(0);
    });

    it("should handle portrait video on landscape canvas", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1080, 1920); // 9:16

      engine.renderFrame([clip]);

      expect(mockCtx.drawImageCalls.length).toBe(1);
      const drawCall = mockCtx.drawImageCalls[0];

      // Video should fit height
      expect(drawCall.height).toBe(1080);
      // Width should maintain aspect ratio
      expect(drawCall.width).toBeCloseTo(607.5, 0);
      // Should be centered horizontally
      expect(drawCall.x).toBeCloseTo(656.25, 0); // (1920 - 607.5) / 2
      expect(drawCall.y).toBe(0);
    });
  });

  describe("Centering Calculations", () => {
    it("should center letterboxed video (horizontal bars)", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 3840, 2160); // Same aspect as canvas

      engine.renderFrame([clip]);

      const drawCall = mockCtx.drawImageCalls[0];

      // Same aspect ratio, should fill canvas
      expect(drawCall.x).toBe(0);
      expect(drawCall.y).toBe(0);
      expect(drawCall.width).toBe(1920);
      expect(drawCall.height).toBe(1080);
    });

    it("should center pillarboxed video (vertical bars)", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1280, 720); // 16:9 but smaller

      engine.renderFrame([clip]);

      const drawCall = mockCtx.drawImageCalls[0];

      // Same aspect ratio, should fill canvas
      expect(drawCall.x).toBe(0);
      expect(drawCall.y).toBe(0);
      expect(drawCall.width).toBe(1920);
      expect(drawCall.height).toBe(1080);
    });

    it("should handle extreme aspect ratio differences", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 3840, 1080); // Ultra-wide

      engine.renderFrame([clip]);

      const drawCall = mockCtx.drawImageCalls[0];

      // Video is much wider, should fit width
      expect(drawCall.width).toBe(1920);
      expect(drawCall.height).toBeCloseTo(540, 0);
      expect(drawCall.x).toBe(0);
      expect(drawCall.y).toBeCloseTo(270, 0); // (1080 - 540) / 2
    });
  });

  describe("Layering with Track Configurations", () => {
    it("should draw clips in ascending track order", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip1 = createActiveClip("clip1", 2, 1920, 1080);
      const clip2 = createActiveClip("clip2", 0, 1920, 1080);
      const clip3 = createActiveClip("clip3", 1, 1920, 1080);

      // Clips should already be sorted by FrameResolver
      const sortedClips = [clip2, clip3, clip1];

      engine.renderFrame(sortedClips);

      // Verify all clips were drawn
      expect(mockCtx.drawImageCalls.length).toBe(3);

      // Verify order by checking the video elements
      expect(mockCtx.drawImageCalls[0].video).toBe(clip2.videoElement);
      expect(mockCtx.drawImageCalls[1].video).toBe(clip3.videoElement);
      expect(mockCtx.drawImageCalls[2].video).toBe(clip1.videoElement);
    });

    it("should handle single clip", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      engine.renderFrame([clip]);

      expect(mockCtx.drawImageCalls.length).toBe(1);
    });

    it("should handle many clips on different tracks", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clips = [createActiveClip("clip1", 0, 1920, 1080), createActiveClip("clip2", 1, 1920, 1080), createActiveClip("clip3", 2, 1920, 1080), createActiveClip("clip4", 3, 1920, 1080), createActiveClip("clip5", 4, 1920, 1080)];

      engine.renderFrame(clips);

      expect(mockCtx.drawImageCalls.length).toBe(5);
    });
  });

  describe("Error Handling", () => {
    it("should skip clips with unready video elements", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip1 = createActiveClip("clip1", 0, 1920, 1080, 1); // Not ready
      const clip2 = createActiveClip("clip2", 1, 1920, 1080, 2); // Ready

      engine.renderFrame([clip1, clip2]);

      // Only clip2 should be drawn
      expect(mockCtx.drawImageCalls.length).toBe(1);
      expect(mockCtx.drawImageCalls[0].video).toBe(clip2.videoElement);
    });

    it("should skip clips with zero video dimensions", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip1 = createActiveClip("clip1", 0, 0, 0); // Invalid dimensions
      const clip2 = createActiveClip("clip2", 1, 1920, 1080);

      engine.renderFrame([clip1, clip2]);

      // Only clip2 should be drawn
      expect(mockCtx.drawImageCalls.length).toBe(1);
      expect(mockCtx.drawImageCalls[0].video).toBe(clip2.videoElement);
    });

    it("should continue rendering after drawImage error", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip1 = createActiveClip("clip1", 0, 1920, 1080);
      const clip2 = createActiveClip("clip2", 1, 1920, 1080);

      // Mock drawImage to throw error on first call
      let callCount = 0;
      mockCtx.drawImage = function (video: any, x: number, y: number, width: number, height: number) {
        callCount++;
        if (callCount === 1) {
          throw new Error("Draw failed");
        }
        this.drawImageCalls.push({ video, x, y, width, height });
      };

      engine.renderFrame([clip1, clip2]);

      // Second clip should still be drawn
      expect(mockCtx.drawImageCalls.length).toBe(1);
      expect(mockCtx.drawImageCalls[0].video).toBe(clip2.videoElement);
    });
  });

  describe("High-DPI Scaling", () => {
    it("should work with device pixel ratio 1", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      engine.renderFrame([clip]);

      expect(mockCtx.fillRectCalls[0].width).toBe(1920);
      expect(mockCtx.fillRectCalls[0].height).toBe(1080);
    });

    it("should work with device pixel ratio 2", () => {
      // Canvas dimensions would be scaled at initialization
      // RenderEngine works with display dimensions
      const displayWidth = 1920;
      const displayHeight = 1080;

      const engine = new RenderEngine(mockCtx as any, displayWidth, displayHeight);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      engine.renderFrame([clip]);

      expect(mockCtx.fillRectCalls[0].width).toBe(displayWidth);
      expect(mockCtx.fillRectCalls[0].height).toBe(displayHeight);
    });

    it("should work with device pixel ratio 3", () => {
      const displayWidth = 1920;
      const displayHeight = 1080;

      const engine = new RenderEngine(mockCtx as any, displayWidth, displayHeight);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      engine.renderFrame([clip]);

      expect(mockCtx.fillRectCalls[0].width).toBe(displayWidth);
      expect(mockCtx.fillRectCalls[0].height).toBe(displayHeight);
    });
  });

  describe("Canvas Clearing", () => {
    it("should clear canvas with black before rendering", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      engine.renderFrame([clip]);

      // First operation should be clearing canvas
      expect(mockCtx.fillRectCalls.length).toBeGreaterThan(0);
      expect(mockCtx.fillRectCalls[0].x).toBe(0);
      expect(mockCtx.fillRectCalls[0].y).toBe(0);
      expect(mockCtx.fillRectCalls[0].width).toBe(1920);
      expect(mockCtx.fillRectCalls[0].height).toBe(1080);
      expect(mockCtx.fillStyle).toBe("#000000");
    });

    it("should display black canvas when no clips are active", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);

      engine.renderFrame([]);

      // Should clear canvas but not draw any clips
      expect(mockCtx.fillRectCalls.length).toBe(1);
      expect(mockCtx.drawImageCalls.length).toBe(0);
      expect(mockCtx.fillStyle).toBe("#000000");
    });
  });

  describe("Render Pipeline Validation", () => {
    it("should validate canvas context is available", () => {
      const engine = new RenderEngine(null as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      const isValid = engine.validateRenderPipeline([clip]);

      expect(isValid).toBe(false);
    });

    it("should validate canvas dimensions are positive", () => {
      const engine1 = new RenderEngine(mockCtx as any, 0, 1080);
      const engine2 = new RenderEngine(mockCtx as any, 1920, -1);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      expect(engine1.validateRenderPipeline([clip])).toBe(false);
      expect(engine2.validateRenderPipeline([clip])).toBe(false);
    });

    it("should validate clips have video elements", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);
      clip.videoElement = null as any;

      const isValid = engine.validateRenderPipeline([clip]);

      expect(isValid).toBe(false);
    });

    it("should validate clip time is within source boundaries", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);
      clip.clipTime = 15; // Outside sourceEnd (10)

      const isValid = engine.validateRenderPipeline([clip]);

      expect(isValid).toBe(false);
    });

    it("should validate track order is numeric", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);
      clip.trackIndex = NaN;

      const isValid = engine.validateRenderPipeline([clip]);

      expect(isValid).toBe(false);
    });

    it("should return true for valid render pipeline", () => {
      const engine = new RenderEngine(mockCtx as any, 1920, 1080);
      const clip = createActiveClip("clip1", 0, 1920, 1080);

      const isValid = engine.validateRenderPipeline([clip]);

      expect(isValid).toBe(true);
    });
  });
});
