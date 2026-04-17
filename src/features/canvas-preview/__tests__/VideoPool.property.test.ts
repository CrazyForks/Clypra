/**
 * Property-Based Tests for VideoPool
 * Uses fast-check library with minimum 100 iterations
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 25.1, 25.3, 25.4, 25.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { VideoPool } from "../utils/VideoPool";
import { CanvasPreviewError, CanvasPreviewErrorCode } from "../types/errors";

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
    if (event === "loadedmetadata" && !this.src.includes("invalid")) {
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

describe("VideoPool - Property-Based Tests", () => {
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

  // Feature: canvas-preview-system-v2, Property 1: Video Pool Uniqueness
  it("should maintain exactly one video element per unique source path", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }), async (sourcePaths) => {
        const pool = new VideoPool(10);
        const uniquePaths = [...new Set(sourcePaths)];

        // Get videos for all paths
        const videos = await Promise.all(sourcePaths.map((path) => pool.getVideo(path)));

        // Verify pool size equals unique paths
        expect(pool.getPoolSize()).toBe(uniquePaths.length);

        // Verify same path returns same video element
        for (let i = 0; i < sourcePaths.length; i++) {
          for (let j = i + 1; j < sourcePaths.length; j++) {
            if (sourcePaths[i] === sourcePaths[j]) {
              expect(videos[i]).toBe(videos[j]);
            }
          }
        }

        pool.dispose();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 2: Video Pool Reference Counting
  it("should maintain accurate reference counts for each video element", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            path: fc.constantFrom("video1.mp4", "video2.mp4", "video3.mp4"),
            action: fc.constantFrom("get", "release"),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        async (operations) => {
          const pool = new VideoPool(10);
          const refCounts = new Map<string, number>();

          for (const op of operations) {
            if (op.action === "get") {
              await pool.getVideo(op.path);
              refCounts.set(op.path, (refCounts.get(op.path) || 0) + 1);
            } else if (op.action === "release") {
              const currentCount = refCounts.get(op.path) || 0;
              if (currentCount > 0) {
                pool.releaseVideo(op.path);
                refCounts.set(op.path, currentCount - 1);
              }
            }
          }

          // Verify reference counts match
          for (const [path, expectedCount] of refCounts.entries()) {
            const entry = pool.getEntry(path);
            if (entry) {
              expect(entry.refCount).toBe(expectedCount);
            }
          }

          pool.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 3: Video Pool Eviction on Zero References
  it("should mark video for eviction when reference count reaches zero", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), fc.integer({ min: 1, max: 5 }), async (sourcePath, getCount) => {
        const pool = new VideoPool(10);

        // Get video multiple times
        for (let i = 0; i < getCount; i++) {
          await pool.getVideo(sourcePath);
        }

        // Release all references
        for (let i = 0; i < getCount; i++) {
          pool.releaseVideo(sourcePath);
        }

        // Verify eviction timer is set
        const entry = pool.getEntry(sourcePath);
        expect(entry).toBeDefined();
        expect(entry!.refCount).toBe(0);
        expect(entry!.evictionTimer).not.toBeNull();

        pool.dispose();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 4: Video Pool Eviction Cancellation
  it("should cancel eviction when video is referenced again before eviction completes", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (sourcePath) => {
        const pool = new VideoPool(10);

        // Get and release video
        await pool.getVideo(sourcePath);
        pool.releaseVideo(sourcePath);

        // Verify eviction timer is set
        let entry = pool.getEntry(sourcePath);
        expect(entry!.evictionTimer).not.toBeNull();

        // Get video again before eviction
        await pool.getVideo(sourcePath);

        // Verify eviction timer is cancelled
        entry = pool.getEntry(sourcePath);
        expect(entry!.evictionTimer).toBeNull();
        expect(entry!.refCount).toBe(1);

        pool.dispose();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 5: Video Pool Capacity Constraint
  it("should successfully maintain video elements for up to 10 unique sources", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }), async (sourcePaths) => {
        const pool = new VideoPool(10);
        const uniquePaths = [...new Set(sourcePaths)];

        // Get videos for all unique paths
        const videos = await Promise.all(uniquePaths.map((path) => pool.getVideo(path)));

        // Verify all videos were created
        expect(videos).toHaveLength(uniquePaths.length);
        expect(pool.getPoolSize()).toBe(uniquePaths.length);

        // Verify all videos are valid
        for (const video of videos) {
          expect(video).toBeDefined();
          expect(video.src).toBeTruthy();
        }

        pool.dispose();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 6: Video Pool Error Emission
  it("should emit error event with file path and error reason for failed loads", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (basePath) => {
        const pool = new VideoPool(10);
        const invalidPath = `invalid_${basePath}`;
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

        // Verify error was emitted
        expect(errorEmitted).toBe(true);
        expect(emittedError).toBeDefined();
        expect(emittedError!.code).toBe(CanvasPreviewErrorCode.VIDEO_LOAD_FAILED);
        expect(emittedError!.sourcePath).toBe(invalidPath);

        pool.dispose();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 7: Video Pool Metadata Preloading
  it("should preload video metadata before returning video element", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (sourcePath) => {
        const pool = new VideoPool(10);

        // Get video
        const video = await pool.getVideo(sourcePath);

        // Verify metadata is loaded
        const entry = pool.getEntry(sourcePath);
        expect(entry).toBeDefined();
        expect(entry!.isLoaded).toBe(true);
        expect(entry!.isReady).toBe(true);
        expect(video.readyState).toBeGreaterThanOrEqual(2);

        pool.dispose();
      }),
      { numRuns: 100 },
    );
  });
});
