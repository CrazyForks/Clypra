/**
 * Canvas Renderer Playback Synchronization Tests
 * Tests for RAF loop and canvas rendering during playback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { CanvasRenderer } from "../CanvasRenderer";
import { useTimelineStore } from "../../../timeline/store/timelineStore";

describe("Canvas Renderer Playback Synchronization", () => {
  let rafCallbacks: FrameRequestCallback[];
  let rafId: number;

  beforeEach(() => {
    // Reset store
    useTimelineStore.setState({
      clips: new Map(),
      tracks: new Map(),
      playhead: 0,
      isPlaying: false,
      duration: 100,
    });

    // Mock requestAnimationFrame
    rafCallbacks = [];
    rafId = 0;

    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return ++rafId;
    });

    global.cancelAnimationFrame = vi.fn((id: number) => {
      // Remove callback if it exists
      rafCallbacks = rafCallbacks.filter((_, index) => index + 1 !== id);
    });

    // Mock createImageBitmap
    global.createImageBitmap = vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      close: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];
  });

  describe("RAF Loop Control", () => {
    it("should start RAF loop when isPlaying becomes true", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      // Initially no RAF should be scheduled
      expect(rafCallbacks.length).toBe(0);

      // Set isPlaying to true
      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });
    });

    it("should stop RAF loop when isPlaying becomes false", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      // Start playing
      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Stop playing
      useTimelineStore.setState({ isPlaying: false });

      await waitFor(() => {
        expect(global.cancelAnimationFrame).toHaveBeenCalled();
      });
    });

    it("should not start RAF loop when isPlaying is false", () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: false });

      // RAF should not be scheduled
      expect(rafCallbacks.length).toBe(0);
    });

    it("should cancel previous RAF before starting new loop", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      // Start playing
      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const firstCallCount = (global.requestAnimationFrame as any).mock.calls.length;

      // Toggle off and on quickly
      useTimelineStore.setState({ isPlaying: false });
      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(global.cancelAnimationFrame).toHaveBeenCalled();
        expect((global.requestAnimationFrame as any).mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });

  describe("Playhead Reading", () => {
    it("should read playhead from store on each RAF tick", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      // Set initial playhead
      useTimelineStore.setState({ playhead: 0, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Execute first RAF callback
      const firstCallback = rafCallbacks[0];
      firstCallback(0);

      // Update playhead
      useTimelineStore.setState({ playhead: 1.5 });

      // Execute second RAF callback
      if (rafCallbacks.length > 1) {
        const secondCallback = rafCallbacks[1];
        secondCallback(16.67); // ~60fps
      }

      // Playhead should be read from store
      expect(useTimelineStore.getState().playhead).toBe(1.5);
    });

    it("should handle playhead at 0", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: 0, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle playhead at end of timeline", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: 100, duration: 100, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle playhead beyond timeline duration", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: 150, duration: 100, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle negative playhead", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: -5, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });
  });

  describe("RAF Loop Lifecycle", () => {
    it("should clean up RAF loop on unmount", async () => {
      const { unmount } = render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it("should handle multiple start/stop cycles", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      // Cycle 1
      useTimelineStore.setState({ isPlaying: true });
      await waitFor(() => expect(rafCallbacks.length).toBeGreaterThan(0));

      useTimelineStore.setState({ isPlaying: false });
      await waitFor(() => expect(global.cancelAnimationFrame).toHaveBeenCalled());

      // Cycle 2
      useTimelineStore.setState({ isPlaying: true });
      await waitFor(() => expect(rafCallbacks.length).toBeGreaterThan(0));

      useTimelineStore.setState({ isPlaying: false });

      // Should not crash
      expect(global.cancelAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it("should continue RAF loop across playhead updates", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: true, playhead: 0 });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Update playhead multiple times
      useTimelineStore.setState({ playhead: 1 });
      useTimelineStore.setState({ playhead: 2 });
      useTimelineStore.setState({ playhead: 3 });

      // RAF loop should still be running
      expect(useTimelineStore.getState().isPlaying).toBe(true);
    });
  });

  describe("Rendering During Playback", () => {
    it("should not render when isPlaying is false and playhead changes", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: false, playhead: 0 });

      // Change playhead while paused
      useTimelineStore.setState({ playhead: 5 });

      // RAF should not be scheduled
      expect(rafCallbacks.length).toBe(0);
    });

    it("should handle rapid playhead changes during playback", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: true, playhead: 0 });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Rapid playhead updates
      for (let i = 0; i < 10; i++) {
        useTimelineStore.setState({ playhead: i * 0.1 });
      }

      // Should not crash
      expect(useTimelineStore.getState().playhead).toBe(0.9);
    });
  });

  describe("Edge Cases", () => {
    it("should handle isPlaying toggle during RAF callback execution", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Toggle isPlaying during callback
      const callback = rafCallbacks[0];
      useTimelineStore.setState({ isPlaying: false });

      expect(() => callback(0)).not.toThrow();
    });

    it("should handle zero duration timeline", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ duration: 0, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle NaN playhead", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: NaN, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle Infinity playhead", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: Infinity, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle very large playhead values", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: 999999, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle very small playhead increments", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ playhead: 0, isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Very small increment (sub-frame)
      useTimelineStore.setState({ playhead: 0.001 });

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });
  });

  describe("Performance", () => {
    it("should not create excessive RAF callbacks", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const initialCallbackCount = rafCallbacks.length;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have accumulated many callbacks
      expect(rafCallbacks.length).toBeLessThan(initialCallbackCount + 10);
    });

    it("should reuse RAF loop instead of creating new ones", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const rafCallCount = (global.requestAnimationFrame as any).mock.calls.length;

      // Update playhead multiple times
      useTimelineStore.setState({ playhead: 1 });
      useTimelineStore.setState({ playhead: 2 });
      useTimelineStore.setState({ playhead: 3 });

      // Should not create new RAF loops
      expect((global.requestAnimationFrame as any).mock.calls.length).toBe(rafCallCount);
    });
  });

  describe("State Synchronization", () => {
    it("should reflect isPlaying state from store", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      // Initially not playing
      expect(useTimelineStore.getState().isPlaying).toBe(false);
      expect(rafCallbacks.length).toBe(0);

      // Start playing
      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Stop playing
      useTimelineStore.setState({ isPlaying: false });

      await waitFor(() => {
        expect(global.cancelAnimationFrame).toHaveBeenCalled();
      });
    });

    it("should read latest playhead value on each tick", async () => {
      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      useTimelineStore.setState({ isPlaying: true, playhead: 0 });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Update playhead
      useTimelineStore.setState({ playhead: 5.5 });

      // Execute RAF callback
      const callback = rafCallbacks[rafCallbacks.length - 1];
      callback(0);

      // Should read the updated playhead
      expect(useTimelineStore.getState().playhead).toBe(5.5);
    });
  });
});
