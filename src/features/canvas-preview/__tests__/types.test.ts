/**
 * Unit tests for Canvas Preview System v2 type definitions
 * Requirements: 10.6
 */

import { describe, it, expect } from "vitest";
import { CanvasPreviewError, CanvasPreviewErrorCode, type CanvasPreviewErrorCodeType, type ActiveClip, type VideoPoolEntry, type FrameCacheEntry, type RenderState, type CanvasPreviewConfig } from "../types";

describe("CanvasPreviewError", () => {
  it("should create error with VIDEO_LOAD_FAILED code", () => {
    const error = new CanvasPreviewError("Failed to load video", CanvasPreviewErrorCode.VIDEO_LOAD_FAILED, {
      sourcePath: "/path/to/video.mp4",
      recoverable: true,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CanvasPreviewError);
    expect(error.name).toBe("CanvasPreviewError");
    expect(error.message).toBe("Failed to load video");
    expect(error.code).toBe(CanvasPreviewErrorCode.VIDEO_LOAD_FAILED);
    expect(error.sourcePath).toBe("/path/to/video.mp4");
    expect(error.recoverable).toBe(true);
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it("should create error with VIDEO_SEEK_FAILED code", () => {
    const error = new CanvasPreviewError("Seek operation timed out", CanvasPreviewErrorCode.VIDEO_SEEK_FAILED, {
      clipId: "clip-123",
      sourcePath: "/path/to/video.mp4",
      recoverable: true,
    });

    expect(error.code).toBe(CanvasPreviewErrorCode.VIDEO_SEEK_FAILED);
    expect(error.clipId).toBe("clip-123");
    expect(error.sourcePath).toBe("/path/to/video.mp4");
    expect(error.recoverable).toBe(true);
  });

  it("should create error with RENDER_FAILED code", () => {
    const error = new CanvasPreviewError("Canvas rendering failed", CanvasPreviewErrorCode.RENDER_FAILED, {
      clipId: "clip-456",
      recoverable: true,
    });

    expect(error.code).toBe(CanvasPreviewErrorCode.RENDER_FAILED);
    expect(error.clipId).toBe("clip-456");
    expect(error.recoverable).toBe(true);
  });

  it("should create error with INVALID_CLIP_DATA code", () => {
    const error = new CanvasPreviewError("Clip validation failed", CanvasPreviewErrorCode.INVALID_CLIP_DATA, {
      clipId: "clip-789",
      recoverable: false,
    });

    expect(error.code).toBe(CanvasPreviewErrorCode.INVALID_CLIP_DATA);
    expect(error.clipId).toBe("clip-789");
    expect(error.recoverable).toBe(false);
  });

  it("should create error with CANVAS_CONTEXT_LOST code", () => {
    const error = new CanvasPreviewError("Canvas context was lost", CanvasPreviewErrorCode.CANVAS_CONTEXT_LOST, {
      recoverable: true,
    });

    expect(error.code).toBe(CanvasPreviewErrorCode.CANVAS_CONTEXT_LOST);
    expect(error.recoverable).toBe(true);
  });

  it("should create error with FRAME_CACHE_ERROR code", () => {
    const error = new CanvasPreviewError("Frame cache operation failed", CanvasPreviewErrorCode.FRAME_CACHE_ERROR);

    expect(error.code).toBe(CanvasPreviewErrorCode.FRAME_CACHE_ERROR);
    expect(error.recoverable).toBe(true); // Default recoverable
  });

  it("should create error with VIDEO_DECODE_ERROR code", () => {
    const error = new CanvasPreviewError("Video decode error", CanvasPreviewErrorCode.VIDEO_DECODE_ERROR, {
      sourcePath: "/path/to/corrupted.mp4",
    });

    expect(error.code).toBe(CanvasPreviewErrorCode.VIDEO_DECODE_ERROR);
    expect(error.sourcePath).toBe("/path/to/corrupted.mp4");
  });

  it("should create error with INVALID_DIMENSIONS code", () => {
    const error = new CanvasPreviewError("Invalid canvas dimensions", CanvasPreviewErrorCode.INVALID_DIMENSIONS);

    expect(error.code).toBe(CanvasPreviewErrorCode.INVALID_DIMENSIONS);
  });

  it("should create error with POOL_CAPACITY_EXCEEDED code", () => {
    const error = new CanvasPreviewError("Video pool at capacity", CanvasPreviewErrorCode.POOL_CAPACITY_EXCEEDED);

    expect(error.code).toBe(CanvasPreviewErrorCode.POOL_CAPACITY_EXCEEDED);
  });

  it("should default recoverable to true when not specified", () => {
    const error = new CanvasPreviewError("Some error", CanvasPreviewErrorCode.RENDER_FAILED);

    expect(error.recoverable).toBe(true);
  });

  it("should serialize to JSON correctly", () => {
    const error = new CanvasPreviewError("Test error", CanvasPreviewErrorCode.VIDEO_LOAD_FAILED, {
      clipId: "clip-123",
      sourcePath: "/test.mp4",
      recoverable: false,
    });

    const json = error.toJSON();

    expect(json.name).toBe("CanvasPreviewError");
    expect(json.message).toBe("Test error");
    expect(json.code).toBe(CanvasPreviewErrorCode.VIDEO_LOAD_FAILED);
    expect(json.clipId).toBe("clip-123");
    expect(json.sourcePath).toBe("/test.mp4");
    expect(json.recoverable).toBe(false);
    expect(json.timestamp).toBeGreaterThan(0);
    expect(json.stack).toBeDefined();
  });

  it("should have proper error stack trace", () => {
    const error = new CanvasPreviewError("Test error", CanvasPreviewErrorCode.RENDER_FAILED);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("CanvasPreviewError");
  });
});

describe("CanvasPreviewErrorCode", () => {
  it("should have all expected error codes", () => {
    expect(CanvasPreviewErrorCode.VIDEO_LOAD_FAILED).toBe("VIDEO_LOAD_FAILED");
    expect(CanvasPreviewErrorCode.VIDEO_SEEK_FAILED).toBe("VIDEO_SEEK_FAILED");
    expect(CanvasPreviewErrorCode.RENDER_FAILED).toBe("RENDER_FAILED");
    expect(CanvasPreviewErrorCode.INVALID_CLIP_DATA).toBe("INVALID_CLIP_DATA");
    expect(CanvasPreviewErrorCode.CANVAS_CONTEXT_LOST).toBe("CANVAS_CONTEXT_LOST");
    expect(CanvasPreviewErrorCode.FRAME_CACHE_ERROR).toBe("FRAME_CACHE_ERROR");
    expect(CanvasPreviewErrorCode.VIDEO_DECODE_ERROR).toBe("VIDEO_DECODE_ERROR");
    expect(CanvasPreviewErrorCode.INVALID_DIMENSIONS).toBe("INVALID_DIMENSIONS");
    expect(CanvasPreviewErrorCode.POOL_CAPACITY_EXCEEDED).toBe("POOL_CAPACITY_EXCEEDED");
  });

  it("should be usable as type guard", () => {
    const code: CanvasPreviewErrorCodeType = CanvasPreviewErrorCode.VIDEO_LOAD_FAILED;
    expect(code).toBe("VIDEO_LOAD_FAILED");
  });
});

describe("Type Interfaces", () => {
  describe("ActiveClip", () => {
    it("should accept valid ActiveClip object", () => {
      const activeClip: ActiveClip = {
        id: "clip-1",
        trackId: "track-1",
        startTime: 0,
        duration: 10,
        sourceMediaPath: "/video.mp4",
        sourceStart: 0,
        sourceEnd: 10,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Test Clip",
        locked: false,
        muted: false,
        trackIndex: 0,
        clipTime: 5.5,
        videoElement: document.createElement("video"),
      };

      expect(activeClip.trackIndex).toBe(0);
      expect(activeClip.clipTime).toBe(5.5);
      expect(activeClip.videoElement).toBeInstanceOf(HTMLVideoElement);
    });
  });

  describe("VideoPoolEntry", () => {
    it("should accept valid VideoPoolEntry object", () => {
      const entry: VideoPoolEntry = {
        video: document.createElement("video"),
        sourcePath: "/video.mp4",
        refCount: 2,
        lastUsed: Date.now(),
        isLoaded: true,
        isReady: true,
        evictionTimer: null,
      };

      expect(entry.refCount).toBe(2);
      expect(entry.isLoaded).toBe(true);
      expect(entry.isReady).toBe(true);
      expect(entry.evictionTimer).toBeNull();
    });

    it("should accept VideoPoolEntry with eviction timer", () => {
      const entry: VideoPoolEntry = {
        video: document.createElement("video"),
        sourcePath: "/video.mp4",
        refCount: 0,
        lastUsed: Date.now(),
        isLoaded: true,
        isReady: true,
        evictionTimer: 12345,
      };

      expect(entry.evictionTimer).toBe(12345);
    });
  });

  describe("FrameCacheEntry", () => {
    it("should accept valid FrameCacheEntry object", () => {
      // Note: ImageBitmap can't be easily created in tests without canvas
      // This test validates the type structure
      const entry: Partial<FrameCacheEntry> = {
        timestamp: 5.5,
        lastAccessed: Date.now(),
        stateHash: "abc123",
      };

      expect(entry.timestamp).toBe(5.5);
      expect(entry.lastAccessed).toBeGreaterThan(0);
      expect(entry.stateHash).toBe("abc123");
    });
  });

  describe("RenderState", () => {
    it("should accept valid RenderState object", () => {
      const state: RenderState = {
        isRendering: false,
        currentFrame: 0,
        pendingSeeks: new Map([["clip-1", 5.5]]),
        rafId: null,
        lastRenderTime: Date.now(),
        frameCount: 0,
        droppedFrames: 0,
      };

      expect(state.isRendering).toBe(false);
      expect(state.currentFrame).toBe(0);
      expect(state.pendingSeeks.get("clip-1")).toBe(5.5);
      expect(state.rafId).toBeNull();
      expect(state.frameCount).toBe(0);
      expect(state.droppedFrames).toBe(0);
    });

    it("should accept RenderState with active RAF", () => {
      const state: RenderState = {
        isRendering: true,
        currentFrame: 120,
        pendingSeeks: new Map(),
        rafId: 12345,
        lastRenderTime: Date.now(),
        frameCount: 120,
        droppedFrames: 3,
      };

      expect(state.isRendering).toBe(true);
      expect(state.rafId).toBe(12345);
      expect(state.frameCount).toBe(120);
      expect(state.droppedFrames).toBe(3);
    });
  });

  describe("CanvasPreviewConfig", () => {
    it("should accept minimal config", () => {
      const config: CanvasPreviewConfig = {
        width: 1920,
        height: 1080,
      };

      expect(config.width).toBe(1920);
      expect(config.height).toBe(1080);
    });

    it("should accept full config with all options", () => {
      const config: CanvasPreviewConfig = {
        width: 1920,
        height: 1080,
        maxVideoPoolSize: 15,
        maxFrameCacheSize: 200,
        seekThreshold: 0.05,
        debounceWindow: 150,
        seekTimeout: 1000,
        evictionDelay: 10000,
      };

      expect(config.maxVideoPoolSize).toBe(15);
      expect(config.maxFrameCacheSize).toBe(200);
      expect(config.seekThreshold).toBe(0.05);
      expect(config.debounceWindow).toBe(150);
      expect(config.seekTimeout).toBe(1000);
      expect(config.evictionDelay).toBe(10000);
    });
  });
});
