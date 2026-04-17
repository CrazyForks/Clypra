/**
 * Unit tests for useTimelineKeyboardShortcuts hook
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimelineKeyboardShortcuts } from "../useTimelineKeyboardShortcuts";
import { useTimelineStore } from "../../store/timelineStore";
import type { Clip } from "../../types/core";

// Helper to dispatch keyboard event and wait for effects
const dispatchKey = async (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  await act(async () => {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers });
    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe("useTimelineKeyboardShortcuts", () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useTimelineStore.getState();
    store.clips.clear();
    store.tracks.clear();
    store.selectedClipIds.clear();
    if (store.clearHistory) {
      store.clearHistory();
    }
    act(() => {
      store.setPlayhead(0);
      store.setZoom(48);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Space key - Play/pause toggle (Requirement 17.1)", () => {
    it("should call onPlayPauseToggle when Space is pressed", async () => {
      const onPlayPauseToggle = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onPlayPauseToggle }));

      await dispatchKey(" ");

      expect(onPlayPauseToggle).toHaveBeenCalledTimes(1);
    });

    it("should not call onPlayPauseToggle when typing in input", async () => {
      const onPlayPauseToggle = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onPlayPauseToggle }));

      const input = document.createElement("input");
      document.body.appendChild(input);

      await act(async () => {
        const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
        Object.defineProperty(event, "target", { value: input, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(onPlayPauseToggle).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe("Arrow keys - Frame stepping (Requirements 17.2, 17.3)", () => {
    it("should move playhead backward by 1 frame on Left Arrow (Requirement 17.2)", async () => {
      const fps = 30;
      renderHook(() => useTimelineKeyboardShortcuts({ fps }));

      act(() => {
        useTimelineStore.getState().setPlayhead(1.0); // Start at 1 second
      });

      await dispatchKey("ArrowLeft");

      const expectedTime = 1.0 - 1 / fps;
      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBeCloseTo(expectedTime, 5);
      });
    });

    it("should move playhead forward by 1 frame on Right Arrow (Requirement 17.3)", async () => {
      const fps = 30;
      renderHook(() => useTimelineKeyboardShortcuts({ fps }));

      act(() => {
        useTimelineStore.getState().setPlayhead(1.0); // Start at 1 second
      });

      await dispatchKey("ArrowRight");

      const expectedTime = 1.0 + 1 / fps;
      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBeCloseTo(expectedTime, 5);
      });
    });

    it("should not move playhead below 0 on Left Arrow", async () => {
      const fps = 30;
      renderHook(() => useTimelineKeyboardShortcuts({ fps }));

      act(() => {
        useTimelineStore.getState().setPlayhead(0); // Start at 0
      });

      await dispatchKey("ArrowLeft");

      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBe(0);
      });
    });

    it("should not move playhead beyond duration on Right Arrow", async () => {
      const fps = 30;
      renderHook(() => useTimelineKeyboardShortcuts({ fps }));

      const duration = useTimelineStore.getState().duration;
      act(() => {
        useTimelineStore.getState().setPlayhead(duration); // Start at end
      });

      await dispatchKey("ArrowRight");

      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBe(duration);
      });
    });
  });

  describe("Home/End keys - Playhead navigation (Requirements 17.4, 17.5)", () => {
    it("should move playhead to start on Home key (Requirement 17.4)", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setPlayhead(50); // Start somewhere in the middle
      });

      await dispatchKey("Home");

      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBe(0);
      });
    });

    it("should move playhead to end on End key (Requirement 17.5)", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      const duration = useTimelineStore.getState().duration;
      act(() => {
        useTimelineStore.getState().setPlayhead(0); // Start at beginning
      });

      await dispatchKey("End");

      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBe(duration);
      });
    });
  });

  describe("Delete/Backspace keys - Delete clips (Requirement 17.6)", () => {
    beforeEach(() => {
      const store = useTimelineStore.getState();

      act(() => {
        // Add a test track
        store.addTrack({
          id: "track-1",
          name: "Test Track",
          type: "video",
          order: 0,
          height: 100,
          locked: false,
          visible: true,
          muted: false,
          color: "#1e40af",
        });

        // Add test clips
        const clip1: Clip = {
          id: "clip-1",
          trackId: "track-1",
          startTime: 0,
          duration: 5,
          sourceMediaPath: "/test/video1.mp4",
          sourceStart: 0,
          sourceEnd: 5,
          type: "video",
          filmstripUrl: null,
          waveformPeaks: null,
          name: "Clip 1",
          locked: false,
          muted: false,
        };

        const clip2: Clip = {
          id: "clip-2",
          trackId: "track-1",
          startTime: 10,
          duration: 5,
          sourceMediaPath: "/test/video2.mp4",
          sourceStart: 0,
          sourceEnd: 5,
          type: "video",
          filmstripUrl: null,
          waveformPeaks: null,
          name: "Clip 2",
          locked: false,
          muted: false,
        };

        store.addClip(clip1);
        store.addClip(clip2);
      });
    });

    it("should delete selected clips on Delete key", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().selectClip("clip-1", false);
      });

      expect(useTimelineStore.getState().clips.has("clip-1")).toBe(true);

      await dispatchKey("Delete");

      await waitFor(() => {
        expect(useTimelineStore.getState().clips.has("clip-1")).toBe(false);
        expect(useTimelineStore.getState().clips.has("clip-2")).toBe(true);
      });
    });

    it("should delete selected clips on Backspace key", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().selectClip("clip-1", false);
      });

      expect(useTimelineStore.getState().clips.has("clip-1")).toBe(true);

      await dispatchKey("Backspace");

      await waitFor(() => {
        expect(useTimelineStore.getState().clips.has("clip-1")).toBe(false);
      });
    });

    it("should delete multiple selected clips", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().selectClip("clip-1", false);
        useTimelineStore.getState().selectClip("clip-2", true); // Multi-select
      });

      expect(useTimelineStore.getState().clips.has("clip-1")).toBe(true);
      expect(useTimelineStore.getState().clips.has("clip-2")).toBe(true);

      await dispatchKey("Delete");

      await waitFor(() => {
        expect(useTimelineStore.getState().clips.has("clip-1")).toBe(false);
        expect(useTimelineStore.getState().clips.has("clip-2")).toBe(false);
      });
    });

    it("should not delete clips when typing in textarea", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().selectClip("clip-1", false);
      });

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      await act(async () => {
        const event = new KeyboardEvent("keydown", { key: "Delete", bubbles: true });
        Object.defineProperty(event, "target", { value: textarea, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(useTimelineStore.getState().clips.has("clip-1")).toBe(true);

      document.body.removeChild(textarea);
    });
  });

  describe("S key - Split tool (Requirement 17.7)", () => {
    beforeEach(() => {
      const store = useTimelineStore.getState();

      act(() => {
        // Add a test track
        store.addTrack({
          id: "track-1",
          name: "Test Track",
          type: "video",
          order: 0,
          height: 100,
          locked: false,
          visible: true,
          muted: false,
          color: "#1e40af",
        });

        // Add a test clip
        const clip: Clip = {
          id: "clip-1",
          trackId: "track-1",
          startTime: 0,
          duration: 10,
          sourceMediaPath: "/test/video.mp4",
          sourceStart: 0,
          sourceEnd: 10,
          type: "video",
          filmstripUrl: null,
          waveformPeaks: null,
          name: "Test Clip",
          locked: false,
          muted: false,
        };

        store.addClip(clip);
      });
    });

    it("should activate split tool on S key", async () => {
      const onToolModeChange = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onToolModeChange }));

      await dispatchKey("s");

      expect(onToolModeChange).toHaveBeenCalledWith("split");
    });

    it("should split clip at playhead when S is pressed", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setPlayhead(5); // Middle of clip
      });

      expect(useTimelineStore.getState().clips.size).toBe(1);

      await dispatchKey("s");

      // Should have 2 clips after split
      await waitFor(() => {
        expect(useTimelineStore.getState().clips.size).toBe(2);
      });
    });

    it("should not split when playhead is outside clip boundaries", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setPlayhead(15); // Outside clip
      });

      expect(useTimelineStore.getState().clips.size).toBe(1);

      await dispatchKey("s");

      // Should still have 1 clip
      await waitFor(() => {
        expect(useTimelineStore.getState().clips.size).toBe(1);
      });
    });

    it("should not activate split tool when Ctrl+S is pressed", async () => {
      const onToolModeChange = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onToolModeChange }));

      await dispatchKey("s", { ctrlKey: true });

      expect(onToolModeChange).not.toHaveBeenCalled();
    });
  });

  describe("V key - Selection tool (Requirement 17.8)", () => {
    it("should activate selection tool on V key", async () => {
      const onToolModeChange = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onToolModeChange }));

      await dispatchKey("v");

      expect(onToolModeChange).toHaveBeenCalledWith("selection");
    });

    it("should not activate selection tool when Ctrl+V is pressed", async () => {
      const onToolModeChange = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onToolModeChange }));

      await dispatchKey("v", { ctrlKey: true });

      expect(onToolModeChange).not.toHaveBeenCalled();
    });
  });

  describe("Plus/Minus keys - Zoom control (Requirements 17.9, 17.10)", () => {
    it("should zoom in on Plus key (Requirement 17.9)", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      const initialZoom = useTimelineStore.getState().pxPerSec;

      await dispatchKey("+");

      await waitFor(() => {
        expect(useTimelineStore.getState().pxPerSec).toBeGreaterThan(initialZoom);
      });
    });

    it("should zoom out on Minus key (Requirement 17.10)", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setZoom(100); // Set higher zoom first
      });
      const initialZoom = useTimelineStore.getState().pxPerSec;

      await dispatchKey("-");

      await waitFor(() => {
        expect(useTimelineStore.getState().pxPerSec).toBeLessThan(initialZoom);
      });
    });

    it("should not zoom beyond maximum (320 px/sec)", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setZoom(320); // Set to max
      });

      await dispatchKey("+");

      await waitFor(() => {
        expect(useTimelineStore.getState().pxPerSec).toBe(320);
      });
    });

    it("should not zoom below minimum (16 px/sec)", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setZoom(16); // Set to min
      });

      await dispatchKey("-");

      await waitFor(() => {
        expect(useTimelineStore.getState().pxPerSec).toBe(16);
      });
    });

    it("should not zoom when Ctrl+Plus is pressed (browser zoom)", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      const initialZoom = useTimelineStore.getState().pxPerSec;

      await dispatchKey("+", { ctrlKey: true });

      expect(useTimelineStore.getState().pxPerSec).toBe(initialZoom);
    });
  });

  describe("Undo/Redo shortcuts (Requirement 14.7)", () => {
    beforeEach(() => {
      const store = useTimelineStore.getState();

      act(() => {
        // Add a test track
        store.addTrack({
          id: "track-1",
          name: "Test Track",
          type: "video",
          order: 0,
          height: 100,
          locked: false,
          visible: true,
          muted: false,
          color: "#1e40af",
        });
      });
    });

    it("should undo on Ctrl+Z", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      const store = useTimelineStore.getState();
      const initialPlayhead = store.playhead;
      act(() => {
        store.setPlayhead(10);
      });

      await dispatchKey("z", { ctrlKey: true });

      await waitFor(() => {
        expect(store.playhead).toBe(initialPlayhead);
      });
    });

    it("should redo on Ctrl+Shift+Z", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setPlayhead(10);
        useTimelineStore.getState().undo();
      });

      expect(useTimelineStore.getState().playhead).toBe(0);

      await dispatchKey("z", { ctrlKey: true, shiftKey: true });

      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBe(10);
      });
    });

    it("should redo on Ctrl+Y", async () => {
      renderHook(() => useTimelineKeyboardShortcuts());

      act(() => {
        useTimelineStore.getState().setPlayhead(10);
        useTimelineStore.getState().undo();
      });

      expect(useTimelineStore.getState().playhead).toBe(0);

      await dispatchKey("y", { ctrlKey: true });

      await waitFor(() => {
        expect(useTimelineStore.getState().playhead).toBe(10);
      });
    });
  });

  describe("Form element prevention (Requirements 17.9, 17.10)", () => {
    it("should not trigger shortcuts when typing in input", async () => {
      const onPlayPauseToggle = vi.fn();
      const onToolModeChange = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onPlayPauseToggle, onToolModeChange }));

      const input = document.createElement("input");
      document.body.appendChild(input);

      // Try various shortcuts
      const keys = [" ", "ArrowLeft", "ArrowRight", "Home", "End", "s", "v", "+", "-"];
      for (const key of keys) {
        await act(async () => {
          const event = new KeyboardEvent("keydown", { key, bubbles: true });
          Object.defineProperty(event, "target", { value: input, enumerable: true });
          window.dispatchEvent(event);
        });
      }

      expect(onPlayPauseToggle).not.toHaveBeenCalled();
      expect(onToolModeChange).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("should not trigger shortcuts when typing in textarea", async () => {
      const onPlayPauseToggle = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onPlayPauseToggle }));

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      await act(async () => {
        const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
        Object.defineProperty(event, "target", { value: textarea, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(onPlayPauseToggle).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it("should not trigger shortcuts in contentEditable elements", async () => {
      const onPlayPauseToggle = vi.fn();
      renderHook(() => useTimelineKeyboardShortcuts({ onPlayPauseToggle }));

      const div = document.createElement("div");
      div.setAttribute("contenteditable", "true");
      // Manually set isContentEditable since JSDOM doesn't set it automatically
      Object.defineProperty(div, "isContentEditable", { value: true, writable: false });
      document.body.appendChild(div);

      await act(async () => {
        const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
        Object.defineProperty(event, "target", { value: div, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(onPlayPauseToggle).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });
  });
});
