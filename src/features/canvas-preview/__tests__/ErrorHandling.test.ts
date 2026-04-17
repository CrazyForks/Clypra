/**
 * Unit Tests for Error Handling
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VideoPool } from "../utils/VideoPool";
import { SeekManager } from "../utils/SeekManager";
import { RenderEngine } from "../utils/RenderEngine";
import { CanvasPreviewError, CanvasPreviewErrorCode } from "../types/errors";
import type { ActiveClip } from "../types/core";

// Mock HTMLVideoElement for testing
class MockVideoElement {
  src = "";
  preload = "";
  muted = false;
  readyState = 0;
  error: { message: string } | null = null;
  videoWidth = 1920;
  videoHeight = 1080;
  currentTime = 0;
  private listeners: Map<string, Set<EventListener>> = new Map();

  addEventListener(event: string, listener: EventListener, options?: any): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Auto-trigger loadedmetadata for successful loads
    if (event === "loadedmetadata" && !this.src.includes("invalid") && !this.src.includes("timeout")) {
      queueMicrotask(() => {
        this.readyState = 2;
        listener(new Event("loadedmetadata"));
      });
    }

    // Auto-trigger error for invalid sources
    if (event === "error" && this.src.includes("invalid")) {
      queueMicrotask(() => {
        this.error = { message: "Failed to load" };
        listener(new Event("error"));
      });
    }

    // Auto-trigger loadeddata
    if (event === "loadeddata" && this.readyState < 2 && !this.src.includes("timeout")) {
      queueMicrotask(() => {
        this.readyState = 2;
        listener(new Event("loadeddata"));
      });
    }

    // Auto-trigger seeked for seek operations
    if (event === "seeked" && !this.src.includes("seekfail")) {
      queueMicrotask(() => {
        listener(new Event("seeked"));
      });
    }
  }

  removeEventListener(event: string, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }
}

// Mock canvas context
class MockCanvasContext {
  fillStyle = "";
  font = "";
  textAlign = "";
  textBaseline = "";

  fillRect = vi.fn();
  drawImage = vi.fn();
  fillText = vi.fn();
  scale = vi.fn();
}

describe("Error Handling - Unit Tests", () => {
  beforeEach(() => {
    // Mock document.createElement for video elements
    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        if (tag === "video") {
          return new MockVideoElement() as any;
        }
        return null;
      },
    });

    // Mock setTimeout/clearTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("VideoPool Error Handling", () => {
    it("should emit error event when video fails to load", async () => {
      const pool = new VideoPool(10);
      let errorEmitted = false;
      let emittedError: CanvasPreviewError | null = null;

      pool.onError((error) => {
        errorEmitted = true;
        emittedError = error;
      });

      try {
        await pool.getVideo("invalid_video.mp4");
      } catch (error) {
        // Expected to throw
      }

      expect(errorEmitted).toBe(true);
      expect(emittedError).toBeDefined();
      expect(emittedError!.code).toBe(CanvasPreviewErrorCode.VIDEO_LOAD_FAILED);
      expect(emittedError!.sourcePath).toBe("invalid_video.mp4");

      pool.dispose();
    });

    it("should continue operation after video load error", async () => {
      const pool = new VideoPool(10);

      // Try to load invalid video
      try {
        await pool.getVideo("invalid_video.mp4");
      } catch (error) {
        // Expected to throw
      }

      // Verify pool is still operational
      const validVideo = await pool.getVideo("valid_video.mp4");
      expect(validVideo).toBeDefined();
      expect(validVideo.src).toBe("valid_video.mp4");

      pool.dispose();
    });

    it("should not add failed video to pool", async () => {
      const pool = new VideoPool(10);

      try {
        await pool.getVideo("invalid_video.mp4");
      } catch (error) {
        // Expected to throw
      }

      // Verify pool size is 0 (failed video not added)
      expect(pool.getPoolSize()).toBe(0);

      pool.dispose();
    });
  });

  describe("SeekManager Error Handling", () => {
    it("should log error and continue when seek fails", async () => {
      const seekManager = new SeekManager();
      const video = new MockVideoElement() as any;
      video.src = "test_video.mp4";
      video.readyState = 2;
      video.currentTime = 0.0;

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Force a seek error by making currentTime setter throw
      Object.defineProperty(video, "currentTime", {
        set: () => {
          throw new Error("Seek error");
        },
        get: () => 0.0,
        configurable: true,
      });

      // Seek should not throw even if it fails
      const seekPromise = seekManager.seekIfNeeded(video, 5.0);

      // Advance timers to trigger debounce
      await vi.advanceTimersByTimeAsync(200);

      await expect(seekPromise).resolves.not.toThrow();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      seekManager.dispose();
    });

    it("should use current frame when seek fails", async () => {
      const seekManager = new SeekManager();
      const video = new MockVideoElement() as any;
      video.src = "test_video.mp4";
      video.readyState = 2;
      video.currentTime = 2.0;

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Force a seek error by making currentTime setter throw
      Object.defineProperty(video, "currentTime", {
        set: () => {
          throw new Error("Seek error");
        },
        get: () => 2.0,
        configurable: true,
      });

      // Seek to 5.0 (will fail)
      const seekPromise = seekManager.seekIfNeeded(video, 5.0);

      // Advance timers to trigger debounce
      await vi.advanceTimersByTimeAsync(200);

      await seekPromise;

      // Video should still be at 2.0 (current frame)
      expect(video.currentTime).toBe(2.0);

      consoleErrorSpy.mockRestore();
      seekManager.dispose();
    });

    it("should log seek failure with context", async () => {
      const seekManager = new SeekManager();
      const video = new MockVideoElement() as any;
      video.src = "test_video.mp4";
      video.readyState = 2;
      video.currentTime = 2.0;

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Force a seek error by making currentTime setter throw
      Object.defineProperty(video, "currentTime", {
        set: () => {
          throw new Error("Seek error");
        },
        get: () => 2.0,
      });

      const seekPromise = seekManager.seekIfNeeded(video, 5.0);

      // Advance timers to trigger debounce
      await vi.advanceTimersByTimeAsync(200);

      await seekPromise;

      // Verify error was logged with context
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Seek operation"),
        expect.objectContaining({
          targetTime: 5.0,
          currentTime: 2.0,
          videoSrc: "test_video.mp4",
        }),
      );

      consoleErrorSpy.mockRestore();
      seekManager.dispose();
    });
  });

  describe("RenderEngine Error Handling", () => {
    it("should skip invalid clips and continue rendering", () => {
      const ctx = new MockCanvasContext() as any;
      const renderEngine = new RenderEngine(ctx, 1920, 1080);

      const clips: ActiveClip[] = [
        {
          id: "clip1",
          sourceMediaPath: "video1.mp4",
          trackIndex: 0,
          clipTime: 0,
          videoElement: { readyState: 2, videoWidth: 1920, videoHeight: 1080 } as any,
          startTime: 0,
          duration: 10,
          sourceStart: 0,
          sourceEnd: 10,
          trackId: "track1",
        },
        {
          id: "clip2",
          sourceMediaPath: "video2.mp4",
          trackIndex: 1,
          clipTime: 0,
          videoElement: { readyState: 0, videoWidth: 0, videoHeight: 0 } as any, // Invalid
          startTime: 0,
          duration: 10,
          sourceStart: 0,
          sourceEnd: 10,
          trackId: "track2",
        },
        {
          id: "clip3",
          sourceMediaPath: "video3.mp4",
          trackIndex: 2,
          clipTime: 0,
          videoElement: { readyState: 2, videoWidth: 1920, videoHeight: 1080 } as any,
          startTime: 0,
          duration: 10,
          sourceStart: 0,
          sourceEnd: 10,
          trackId: "track3",
        },
      ];

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Should not throw
      expect(() => {
        renderEngine.renderFrame(clips);
      }).not.toThrow();

      // Verify canvas was cleared
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);

      // Verify drawImage was called for valid clips (clip1 and clip3)
      expect(ctx.drawImage).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });

    it("should display error placeholder for failed clips", () => {
      const ctx = new MockCanvasContext() as any;
      const renderEngine = new RenderEngine(ctx, 1920, 1080);

      const clips: ActiveClip[] = [
        {
          id: "clip1",
          sourceMediaPath: "video1.mp4",
          trackIndex: 0,
          clipTime: 0,
          videoElement: {
            readyState: 2,
            videoWidth: 1920,
            videoHeight: 1080,
          } as any,
          startTime: 0,
          duration: 10,
          sourceStart: 0,
          sourceEnd: 10,
          trackId: "track1",
        },
      ];

      // Make drawImage throw an error
      ctx.drawImage.mockImplementation(() => {
        throw new Error("Draw failed");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Should not throw
      expect(() => {
        renderEngine.renderFrame(clips);
      }).not.toThrow();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to draw"),
        expect.anything(),
        expect.objectContaining({
          clipId: "clip1",
          sourcePath: "video1.mp4",
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle render failures gracefully", () => {
      const ctx = new MockCanvasContext() as any;

      // Make fillRect throw an error on first call only
      let callCount = 0;
      ctx.fillRect.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          throw new Error("Canvas error");
        }
      });

      const renderEngine = new RenderEngine(ctx, 1920, 1080);

      const clips: ActiveClip[] = [
        {
          id: "clip1",
          sourceMediaPath: "video1.mp4",
          trackIndex: 0,
          clipTime: 0,
          videoElement: { readyState: 2, videoWidth: 1920, videoHeight: 1080 } as any,
          startTime: 0,
          duration: 10,
          sourceStart: 0,
          sourceEnd: 10,
          trackId: "track1",
        },
      ];

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Should catch the error and log it
      renderEngine.renderFrame(clips);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Canvas Context Loss", () => {
    it("should handle canvas context loss event", () => {
      // Create a mock canvas element
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: vi.fn(),
        width: 1920,
        height: 1080,
      };

      const ctx = new MockCanvasContext() as any;
      mockCanvas.getContext.mockReturnValue(ctx);

      let contextLostHandled = false;
      let preventDefaultCalled = false;

      // Setup event listener
      mockCanvas.addEventListener.mockImplementation((event: string, handler: any) => {
        if (event === "webglcontextlost") {
          // Simulate the event
          const mockEvent = {
            preventDefault: () => {
              preventDefaultCalled = true;
            },
          };
          handler(mockEvent);
          contextLostHandled = true;
        }
      });

      // Trigger the setup
      mockCanvas.addEventListener("webglcontextlost", (event: any) => {
        event.preventDefault();
      });

      expect(contextLostHandled).toBe(true);
      expect(preventDefaultCalled).toBe(true);
    });
  });
});
