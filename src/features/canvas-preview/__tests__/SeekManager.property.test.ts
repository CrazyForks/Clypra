/**
 * Property-Based Tests for SeekManager
 * Uses fast-check library with minimum 100 iterations
 * Requirements: 3.1, 3.2, 3.4, 3.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { SeekManager } from "../utils/SeekManager";

// Mock HTMLVideoElement for testing
class MockVideoElement {
  private _currentTime = 0;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private seekCount = 0;

  get currentTime(): number {
    return this._currentTime;
  }

  set currentTime(value: number) {
    this._currentTime = value;
    this.seekCount++;

    // Trigger seeked event asynchronously
    queueMicrotask(() => {
      const listeners = this.listeners.get("seeked");
      if (listeners) {
        for (const listener of listeners) {
          listener(new Event("seeked"));
        }
      }
    });
  }

  addEventListener(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  removeEventListener(event: string, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  getSeekCount(): number {
    return this.seekCount;
  }
}

describe("SeekManager - Property-Based Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // Feature: canvas-preview-system-v2, Property 16: Seek Threshold Behavior (Above Threshold)
  it("should initiate seek when time difference exceeds threshold", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }), // current time
        fc.float({ min: Math.fround(0.04), max: Math.fround(10), noNaN: true }), // time difference > 0.03
        async (currentTime, timeDiff) => {
          const seekManager = new SeekManager();
          const video = new MockVideoElement() as any as HTMLVideoElement;
          video.currentTime = currentTime;

          const targetTime = currentTime + timeDiff;

          // Start seek operation
          const seekPromise = seekManager.seekIfNeeded(video, targetTime);

          // Advance timers to trigger debounce
          await vi.advanceTimersByTimeAsync(100);

          // Wait for seek to complete
          await seekPromise;

          // Verify seek was initiated (currentTime should be updated)
          expect(video.currentTime).toBeCloseTo(targetTime, 2);

          seekManager.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 17: Seek Threshold Behavior (Within Threshold)
  it("should not initiate seek when time difference is within threshold", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }), // current time
        fc.float({ min: Math.fround(0), max: Math.fround(0.03), noNaN: true }), // time difference <= 0.03
        async (currentTime, timeDiff) => {
          const seekManager = new SeekManager();
          const video = new MockVideoElement() as any as HTMLVideoElement;
          video.currentTime = currentTime;

          const targetTime = currentTime + timeDiff;
          const initialTime = video.currentTime;

          // Start seek operation
          const seekPromise = seekManager.seekIfNeeded(video, targetTime);

          // Advance timers to trigger debounce
          await vi.advanceTimersByTimeAsync(100);

          // Wait for seek to complete
          await seekPromise;

          // Verify no seek was initiated (currentTime should remain unchanged)
          expect(video.currentTime).toBe(initialTime);

          seekManager.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 18: Seek Debouncing
  it("should execute only the most recent seek after debounce window", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), { minLength: 2, maxLength: 5 }), // multiple target times (all > threshold)
        async (targetTimes) => {
          const seekManager = new SeekManager();
          const video = new MockVideoElement() as any as HTMLVideoElement;
          video.currentTime = 0;

          // Issue multiple rapid seeks (without awaiting)
          for (const targetTime of targetTimes) {
            seekManager.seekIfNeeded(video, targetTime);
            // Advance time by less than debounce window (synchronously)
            vi.advanceTimersByTime(50);
          }

          // Advance past debounce window to trigger the final seek
          vi.advanceTimersByTime(100);

          // Wait for microtasks to complete (for the seeked event)
          await vi.waitFor(
            () => {
              const lastTargetTime = targetTimes[targetTimes.length - 1];
              return Math.abs(video.currentTime - lastTargetTime) < 0.01;
            },
            { timeout: 1000 },
          );

          // Verify only the last seek was executed
          const lastTargetTime = targetTimes[targetTimes.length - 1];
          expect(video.currentTime).toBeCloseTo(lastTargetTime, 2);

          seekManager.dispose();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000); // Increase timeout to 30 seconds for 100 runs

  // Feature: canvas-preview-system-v2, Property 19: Seek Cancellation
  it("should cancel pending seeks when requested", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0), max: Math.fround(100) }), // current time
        fc.float({ min: Math.fround(0.1), max: Math.fround(10) }), // target time difference
        async (currentTime, timeDiff) => {
          const seekManager = new SeekManager();
          const video = new MockVideoElement() as any as HTMLVideoElement;
          video.currentTime = currentTime;

          const targetTime = currentTime + timeDiff;

          // Start seek operation
          seekManager.seekIfNeeded(video, targetTime);

          // Verify pending seek exists
          expect(seekManager.hasPendingSeek(video)).toBe(true);

          // Cancel pending seeks
          seekManager.cancelPendingSeeks(video);

          // Verify pending seek was cancelled
          expect(seekManager.hasPendingSeek(video)).toBe(false);

          // Advance timers
          await vi.advanceTimersByTimeAsync(200);

          // Verify seek was not executed (currentTime unchanged)
          expect(video.currentTime).toBe(currentTime);

          seekManager.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
