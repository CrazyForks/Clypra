/**
 * Bug Condition Exploration Test - Video Frames Render to Canvas
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
 *
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 *
 * Bug Condition: Canvas preview displays black rectangle instead of video content
 * when video clip is imported. The video element has readyState >= 2 and valid
 * dimensions, but drawImage() doesn't render visible content.
 *
 * Expected Outcome: Test FAILS (this is correct - proves bug exists)
 */

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { RenderEngine } from "../utils/RenderEngine";
import type { ActiveClip } from "../types/core";

class MockCanvasContext {
  fillStyle = "";
  font = "";
  textAlign = "";
  textBaseline = "";
  fillRectCalls: Array<{ x: number; y: number; width: number; height: number }> = [];
  drawImageCalls: Array<{ video: any; x: number; y: number; width: number; height: number }> = [];
  fillTextCalls: Array<{ text: string; x: number; y: number }> = [];

  fillRect(x: number, y: number, width: number, height: number): void {
    this.fillRectCalls.push({ x, y, width, height });
  }

  drawImage(video: any, x: number, y: number, width: number, height: number): void {
    this.drawImageCalls.push({ video, x, y, width, height });
  }

  fillText(text: string, x: number, y: number): void {
    this.fillTextCalls.push({ text, x, y });
  }

  reset(): void {
    this.fillStyle = "";
    this.font = "";
    this.textAlign = "";
    this.textBaseline = "";
    this.fillRectCalls = [];
    this.drawImageCalls = [];
    this.fillTextCalls = [];
  }
}

class MockVideoElement {
  readyState: number;
  videoWidth: number;
  videoHeight: number;
  currentTime: number;
  src: string;

  constructor(width: number, height: number, readyState: number = 4) {
    this.videoWidth = width;
    this.videoHeight = height;
    this.readyState = readyState;
    this.currentTime = 0;
    this.src = "test-video.mp4";
  }
}

describe("Bug Condition Exploration - Video Frames Render to Canvas", () => {
  let mockCtx: MockCanvasContext;

  beforeEach(() => {
    mockCtx = new MockCanvasContext();
  });

  const createActiveClip = (id: string, trackIndex: number, videoWidth: number, videoHeight: number, readyState: number = 4, clipTime: number = 2.5): ActiveClip => ({
    id,
    trackId: `track${trackIndex}`,
    trackIndex,
    clipTime,
    videoElement: new MockVideoElement(videoWidth, videoHeight, readyState) as any,
    startTime: 0,
    duration: 10,
    sourceMediaPath: `${id}.mp4`,
    sourceStart: 0,
    sourceEnd: 10,
    type: "video",
    filmstripUrl: null,
    waveformPeaks: null,
    name: id,
    locked: false,
    muted: false,
  });

  it("should call drawImage() with video element when readyState >= 2", () => {
    const clip = createActiveClip("clip1", 0, 1920, 1080, 2, 2.5);
    const renderEngine = new RenderEngine(mockCtx as any, 1920, 1080);

    renderEngine.renderFrame([clip]);

    expect(mockCtx.drawImageCalls.length).toBe(1);
    expect(mockCtx.drawImageCalls[0].video).toBe(clip.videoElement);
  });

  it("should render video when readyState = 2 (HAVE_CURRENT_DATA)", () => {
    const clip = createActiveClip("clip2", 0, 1920, 1080, 2, 1.0);
    const renderEngine = new RenderEngine(mockCtx as any, 1920, 1080);

    expect(clip.videoElement.readyState).toBe(2);
    expect(clip.videoElement.videoWidth).toBeGreaterThan(0);
    expect(clip.videoElement.videoHeight).toBeGreaterThan(0);

    renderEngine.renderFrame([clip]);

    expect(mockCtx.drawImageCalls.length).toBe(1);
    expect(mockCtx.drawImageCalls[0].video).toBe(clip.videoElement);
  });

  it("should call drawImage() for multiple video clips", () => {
    const clip1 = createActiveClip("clip1", 0, 1920, 1080, 2, 1.0);
    const clip2 = createActiveClip("clip2", 1, 1280, 720, 2, 2.0);
    const renderEngine = new RenderEngine(mockCtx as any, 1920, 1080);

    renderEngine.renderFrame([clip1, clip2]);

    expect(mockCtx.drawImageCalls.length).toBe(2);
    expect(mockCtx.drawImageCalls[0].video).toBe(clip1.videoElement);
    expect(mockCtx.drawImageCalls[1].video).toBe(clip2.videoElement);
  });

  it("Property 1: Bug Condition - Video Frames Render to Canvas", () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 3840 }), fc.integer({ min: 100, max: 2160 }), fc.integer({ min: 100, max: 1920 }), fc.integer({ min: 100, max: 1080 }), fc.integer({ min: 2, max: 4 }), fc.double({ min: 0, max: 10 }), (canvasWidth, canvasHeight, videoWidth, videoHeight, readyState, clipTime) => {
        mockCtx.reset();

        const clip = createActiveClip("test-clip", 0, videoWidth, videoHeight, readyState, clipTime);

        expect(clip.videoElement.readyState).toBeGreaterThanOrEqual(2);
        expect(clip.videoElement.videoWidth).toBeGreaterThan(0);
        expect(clip.videoElement.videoHeight).toBeGreaterThan(0);

        const renderEngine = new RenderEngine(mockCtx as any, canvasWidth, canvasHeight);
        renderEngine.renderFrame([clip]);

        expect(mockCtx.drawImageCalls.length).toBeGreaterThanOrEqual(1);
        expect(mockCtx.drawImageCalls[0].video).toBe(clip.videoElement);
      }),
      { numRuns: 100 },
    );
  });

  it("should NOT render video when readyState < 2", () => {
    const clip = createActiveClip("clip7", 0, 1920, 1080, 1, 1.0);
    const renderEngine = new RenderEngine(mockCtx as any, 1920, 1080);

    renderEngine.renderFrame([clip]);

    expect(mockCtx.drawImageCalls.length).toBe(0);
  });

  it("should NOT render video when videoWidth = 0 or videoHeight = 0", () => {
    const clip1 = createActiveClip("clip8", 0, 0, 1080, 2, 1.0);
    const clip2 = createActiveClip("clip9", 0, 1920, 0, 2, 1.0);
    const renderEngine = new RenderEngine(mockCtx as any, 1920, 1080);

    renderEngine.renderFrame([clip1]);
    expect(mockCtx.drawImageCalls.length).toBe(0);

    mockCtx.reset();
    renderEngine.renderFrame([clip2]);
    expect(mockCtx.drawImageCalls.length).toBe(0);
  });
});

/**
 * ROOT CAUSE ANALYSIS - Updated Findings
 *
 * The test above PASSES on the current code, which means the bug is NOT a simple
 * readyState check issue. After investigation, the actual root causes are:
 *
 * 1. VIDEO PRELOAD="METADATA" (VideoPool.ts:73)
 *    - Videos created with preload="metadata" only load metadata, not frame data
 *    - readyState can be >= 2 but no actual video frames are loaded
 *    - drawImage() has nothing to draw
 *
 * 2. NO FRAME DECODE WAIT (SeekManager.ts:127)
 *    - "seeked" event fires when seek completes, but frame may not be decoded yet
 *    - Timing gap between "seeked" and frame being ready to draw
 *    - drawImage() called too early, before frame decode completes
 *
 * 3. SILENT DRAWIMAGE() FAILURE (RenderEngine.ts:123-129)
 *    - drawImage() wrapped in try-catch that swallows errors
 *    - If drawImage() fails or does nothing, canvas remains black
 *    - No retry or fallback mechanism
 *
 * THE COMPLETE BUG CHAIN:
 * 1. Video element created with preload="metadata" → only metadata loaded
 * 2. Video seeks to target time → "seeked" event fires
 * 3. renderFrame() called immediately → video frame not decoded yet
 * 4. drawImage() called → silently fails or draws nothing (no frame data)
 * 5. Canvas remains black → user sees black rectangle
 *
 * PROPOSED FIX:
 * 1. Change video preload from "metadata" to "auto" in VideoPool
 * 2. Wait for frame decode after seek (requestVideoFrameCallback or readyState >= 3)
 * 3. Add better error handling and diagnostic logging in RenderEngine
 *
 * NOTE: This test uses mocks and cannot reproduce the real bug, which only
 * manifests with actual video elements in a browser environment.
 */
