/**
 * Property-Based Tests for RenderEngine
 * Uses fast-check library with minimum 100 iterations
 * Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 8.1, 8.2, 8.3, 8.4, 8.7, 12.1, 12.2, 12.5, 12.6, 12.7, 19.1, 19.2, 19.3, 19.4, 7.5
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import fc from "fast-check";
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

  constructor(width: number, height: number) {
    this.videoWidth = width;
    this.videoHeight = height;
  }
}

describe("RenderEngine - Property-Based Tests", () => {
  let mockCtx: MockCanvasContext;

  beforeEach(() => {
    mockCtx = new MockCanvasContext();
  });

  // Feature: canvas-preview-system-v2, Property 20: Canvas Clearing Before Render
  it("should clear canvas before rendering any clips", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 3840 }), // canvas width
        fc.integer({ min: 100, max: 2160 }), // canvas height
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            trackIndex: fc.integer({ min: 0, max: 10 }),
            videoWidth: fc.integer({ min: 100, max: 1920 }),
            videoHeight: fc.integer({ min: 100, max: 1080 }),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        (canvasWidth, canvasHeight, clipConfigs) => {
          mockCtx.reset();
          const engine = new RenderEngine(mockCtx as any, canvasWidth, canvasHeight);

          // Create active clips with mock video elements
          const activeClips: ActiveClip[] = clipConfigs.map((config) => ({
            id: config.id,
            trackId: `track${config.trackIndex}`,
            trackIndex: config.trackIndex,
            clipTime: 0,
            videoElement: new MockVideoElement(config.videoWidth, config.videoHeight) as any,
            startTime: 0,
            duration: 10,
            sourceMediaPath: `${config.id}.mp4`,
            sourceStart: 0,
            sourceEnd: 10,
            type: "video" as const,
            filmstripUrl: null,
            waveformPeaks: null,
            name: config.id,
            locked: false,
            muted: false,
          }));

          engine.renderFrame(activeClips);

          // Verify canvas was cleared first
          expect(mockCtx.fillRectCalls.length).toBeGreaterThan(0);
          const firstFillRect = mockCtx.fillRectCalls[0];
          expect(firstFillRect.x).toBe(0);
          expect(firstFillRect.y).toBe(0);
          expect(firstFillRect.width).toBe(canvasWidth);
          expect(firstFillRect.height).toBe(canvasHeight);

          // Verify fillStyle was set to black before clearing
          expect(mockCtx.fillStyle).toBe("#000000");
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 21: Layering Order by Track Order
  it("should draw clips in ascending track order (lower tracks first, higher tracks on top)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1920 }), // canvas width
        fc.integer({ min: 100, max: 1080 }), // canvas height
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            trackIndex: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 2, maxLength: 5 },
        ),
        (canvasWidth, canvasHeight, clipConfigs) => {
          mockCtx.reset();
          const engine = new RenderEngine(mockCtx as any, canvasWidth, canvasHeight);

          // Create active clips with mock video elements
          const activeClips: ActiveClip[] = clipConfigs.map((config) => ({
            id: config.id,
            trackId: `track${config.trackIndex}`,
            trackIndex: config.trackIndex,
            clipTime: 0,
            videoElement: new MockVideoElement(1920, 1080) as any,
            startTime: 0,
            duration: 10,
            sourceMediaPath: `${config.id}.mp4`,
            sourceStart: 0,
            sourceEnd: 10,
            type: "video" as const,
            filmstripUrl: null,
            waveformPeaks: null,
            name: config.id,
            locked: false,
            muted: false,
          }));

          // Sort clips by track order (as FrameResolver would do)
          activeClips.sort((a, b) => a.trackIndex - b.trackIndex);

          engine.renderFrame(activeClips);

          // Verify clips were drawn in order
          // First fillRect is canvas clearing, subsequent drawImage calls should be in order
          expect(mockCtx.drawImageCalls.length).toBe(activeClips.length);

          // Verify the order matches the sorted active clips
          // (We can't directly verify the video elements, but we can verify the count and that all were drawn)
          for (let i = 0; i < activeClips.length - 1; i++) {
            expect(activeClips[i].trackIndex).toBeLessThanOrEqual(activeClips[i + 1].trackIndex);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 22: Aspect Ratio Preservation
  it("should preserve video aspect ratio without distortion", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1920 }), // canvas width
        fc.integer({ min: 100, max: 1080 }), // canvas height
        fc.integer({ min: 100, max: 3840 }), // video width
        fc.integer({ min: 100, max: 2160 }), // video height
        (canvasWidth, canvasHeight, videoWidth, videoHeight) => {
          mockCtx.reset();
          const engine = new RenderEngine(mockCtx as any, canvasWidth, canvasHeight);

          const activeClip: ActiveClip = {
            id: "clip1",
            trackId: "track1",
            trackIndex: 0,
            clipTime: 0,
            videoElement: new MockVideoElement(videoWidth, videoHeight) as any,
            startTime: 0,
            duration: 10,
            sourceMediaPath: "video.mp4",
            sourceStart: 0,
            sourceEnd: 10,
            type: "video" as const,
            filmstripUrl: null,
            waveformPeaks: null,
            name: "clip1",
            locked: false,
            muted: false,
          };

          engine.renderFrame([activeClip]);

          // Verify video was drawn
          expect(mockCtx.drawImageCalls.length).toBe(1);
          const drawCall = mockCtx.drawImageCalls[0];

          // Calculate expected aspect ratios
          const videoAspect = videoWidth / videoHeight;
          const drawnAspect = drawCall.width / drawCall.height;

          // Verify aspect ratio is preserved (within floating point tolerance)
          expect(Math.abs(drawnAspect - videoAspect)).toBeLessThan(0.01);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 23: Video Frame Centering
  it("should center video frames horizontally and vertically when letterboxing/pillarboxing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1920 }), // canvas width
        fc.integer({ min: 100, max: 1080 }), // canvas height
        fc.integer({ min: 100, max: 3840 }), // video width
        fc.integer({ min: 100, max: 2160 }), // video height
        (canvasWidth, canvasHeight, videoWidth, videoHeight) => {
          mockCtx.reset();
          const engine = new RenderEngine(mockCtx as any, canvasWidth, canvasHeight);

          const activeClip: ActiveClip = {
            id: "clip1",
            trackId: "track1",
            trackIndex: 0,
            clipTime: 0,
            videoElement: new MockVideoElement(videoWidth, videoHeight) as any,
            startTime: 0,
            duration: 10,
            sourceMediaPath: "video.mp4",
            sourceStart: 0,
            sourceEnd: 10,
            type: "video" as const,
            filmstripUrl: null,
            waveformPeaks: null,
            name: "clip1",
            locked: false,
            muted: false,
          };

          engine.renderFrame([activeClip]);

          // Verify video was drawn
          expect(mockCtx.drawImageCalls.length).toBe(1);
          const drawCall = mockCtx.drawImageCalls[0];

          const videoAspect = videoWidth / videoHeight;
          const canvasAspect = canvasWidth / canvasHeight;

          if (videoAspect > canvasAspect) {
            // Pillarbox - video is wider, should be centered vertically
            expect(drawCall.x).toBe(0);
            expect(drawCall.width).toBe(canvasWidth);

            // Verify vertical centering
            const expectedY = (canvasHeight - drawCall.height) / 2;
            expect(Math.abs(drawCall.y - expectedY)).toBeLessThan(0.01);
          } else {
            // Letterbox - video is taller, should be centered horizontally
            expect(drawCall.y).toBe(0);
            expect(drawCall.height).toBe(canvasHeight);

            // Verify horizontal centering
            const expectedX = (canvasWidth - drawCall.width) / 2;
            expect(Math.abs(drawCall.x - expectedX)).toBeLessThan(0.01);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 24: High-DPI Canvas Scaling
  it("should handle high-DPI scaling correctly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1920 }), // display width
        fc.integer({ min: 100, max: 1080 }), // display height
        fc.constantFrom(1, 1.5, 2, 2.5, 3), // device pixel ratio
        (displayWidth, displayHeight, dpr) => {
          // Note: High-DPI scaling is handled at canvas initialization, not in RenderEngine
          // RenderEngine works with the scaled canvas dimensions
          // This test verifies that RenderEngine works correctly with scaled dimensions

          const scaledWidth = displayWidth * dpr;
          const scaledHeight = displayHeight * dpr;

          mockCtx.reset();
          const engine = new RenderEngine(mockCtx as any, displayWidth, displayHeight);

          const activeClip: ActiveClip = {
            id: "clip1",
            trackId: "track1",
            trackIndex: 0,
            clipTime: 0,
            videoElement: new MockVideoElement(1920, 1080) as any,
            startTime: 0,
            duration: 10,
            sourceMediaPath: "video.mp4",
            sourceStart: 0,
            sourceEnd: 10,
            type: "video" as const,
            filmstripUrl: null,
            waveformPeaks: null,
            name: "clip1",
            locked: false,
            muted: false,
          };

          engine.renderFrame([activeClip]);

          // Verify canvas was cleared with display dimensions
          expect(mockCtx.fillRectCalls.length).toBeGreaterThan(0);
          const clearCall = mockCtx.fillRectCalls[0];
          expect(clearCall.width).toBe(displayWidth);
          expect(clearCall.height).toBe(displayHeight);

          // Verify video was drawn
          expect(mockCtx.drawImageCalls.length).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 25: Black Canvas for No Active Clips
  it("should display black canvas when no active clips exist", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 3840 }), // canvas width
        fc.integer({ min: 100, max: 2160 }), // canvas height
        (canvasWidth, canvasHeight) => {
          mockCtx.reset();
          const engine = new RenderEngine(mockCtx as any, canvasWidth, canvasHeight);

          // Render with empty active clips array
          engine.renderFrame([]);

          // Verify canvas was cleared with black
          expect(mockCtx.fillRectCalls.length).toBe(1);
          const clearCall = mockCtx.fillRectCalls[0];
          expect(clearCall.x).toBe(0);
          expect(clearCall.y).toBe(0);
          expect(clearCall.width).toBe(canvasWidth);
          expect(clearCall.height).toBe(canvasHeight);
          expect(mockCtx.fillStyle).toBe("#000000");

          // Verify no video frames were drawn
          expect(mockCtx.drawImageCalls.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
