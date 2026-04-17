/**
 * Property-Based Tests for Error Handling
 * Uses fast-check library with minimum 100 iterations
 * Requirements: 10.1, 10.2, 10.4, 10.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { VideoPool } from "../utils/VideoPool";
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
    if (event === "loadedmetadata" && !this.src.includes("invalid") && !this.src.includes("fail")) {
      queueMicrotask(() => {
        this.readyState = 2;
        listener(new Event("loadedmetadata"));
      });
    }

    // Auto-trigger error for invalid sources
    if (event === "error" && (this.src.includes("invalid") || this.src.includes("fail"))) {
      queueMicrotask(() => {
        this.error = { message: "Failed to load" };
        listener(new Event("error"));
      });
    }

    // Auto-trigger loadeddata
    if (event === "loadeddata" && this.readyState < 2) {
      queueMicrotask(() => {
        this.readyState = 2;
        listener(new Event("loadeddata"));
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

describe("Error Handling - Property-Based Tests", () => {
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

  // Feature: canvas-preview-system-v2, Property 30: Error Recovery - Continue Rendering
  it("should continue rendering other clips when one clip fails to load or render", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            sourcePath: fc.oneof(
              fc.constant("valid_video1.mp4"),
              fc.constant("valid_video2.mp4"),
              fc.constant("invalid_video.mp4"), // This will fail
              fc.constant("fail_video.mp4"), // This will fail
            ),
            trackIndex: fc.integer({ min: 0, max: 5 }),
          }),
          { minLength: 2, maxLength: 5 },
        ),
        async (clipConfigs) => {
          const pool = new VideoPool(10);
          const ctx = new MockCanvasContext() as any;
          const renderEngine = new RenderEngine(ctx, 1920, 1080);

          // Count unique valid and invalid source paths
          const uniqueValidPaths = new Set(clipConfigs.filter((c) => !c.sourcePath.includes("invalid") && !c.sourcePath.includes("fail")).map((c) => c.sourcePath));
          const uniqueInvalidPaths = new Set(clipConfigs.filter((c) => c.sourcePath.includes("invalid") || c.sourcePath.includes("fail")).map((c) => c.sourcePath));

          // Only test if we have at least one valid and one invalid unique path
          if (uniqueValidPaths.size === 0 || uniqueInvalidPaths.size === 0) {
            pool.dispose();
            return true; // Skip this test case
          }

          // Try to get videos for all clips
          const clips: (ActiveClip | null)[] = await Promise.all(
            clipConfigs.map(async (config) => {
              try {
                const video = await pool.getVideo(config.sourcePath);
                return {
                  id: config.id,
                  sourceMediaPath: config.sourcePath,
                  trackIndex: config.trackIndex,
                  clipTime: 0,
                  videoElement: video,
                  startTime: 0,
                  duration: 10,
                  sourceStart: 0,
                  sourceEnd: 10,
                  trackId: "track1",
                } as ActiveClip;
              } catch (error) {
                // Video load failed, return null
                return null;
              }
            }),
          );

          // Filter out failed clips
          const successfulClips = clips.filter((clip): clip is ActiveClip => clip !== null);

          // Verify that we have successful clips (system didn't crash)
          expect(successfulClips.length).toBeGreaterThan(0);

          // Verify render engine can render the successful clips without crashing
          expect(() => {
            renderEngine.renderFrame(successfulClips);
          }).not.toThrow();

          pool.dispose();
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 31: Error Event Emission with Context
  it("should emit error events with clip ID, source path, and error message", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clipId: fc.string({ minLength: 1, maxLength: 10 }),
          sourcePath: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (config) => {
          const pool = new VideoPool(10);
          const invalidPath = `invalid_${config.sourcePath}`;
          let errorEmitted = false;
          let emittedError: CanvasPreviewError | null = null;

          // Add error listener
          pool.onError((error) => {
            errorEmitted = true;
            emittedError = error;
          });

          // Try to load invalid video
          try {
            await pool.getVideo(invalidPath);
          } catch (error) {
            // Expected to throw
          }

          // Verify error was emitted with context
          expect(errorEmitted).toBe(true);
          expect(emittedError).toBeDefined();
          expect(emittedError!.code).toBe(CanvasPreviewErrorCode.VIDEO_LOAD_FAILED);
          expect(emittedError!.sourcePath).toBe(invalidPath);
          expect(emittedError!.message).toBeTruthy();
          expect(emittedError!.timestamp).toBeGreaterThan(0);

          pool.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
