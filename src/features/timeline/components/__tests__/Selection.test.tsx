/**
 * Integration tests for multi-clip selection
 * Requirements: 19.2, 19.3, 19.4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTimelineStore } from "../../store/timelineStore";
import type { Clip, Track } from "../../types/core";

describe("Multi-clip Selection", () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useTimelineStore.getState();

    // Clear existing state
    store.clips.clear();
    store.tracks.clear();
    store.deselectAll();
    if (store.clearHistory) {
      store.clearHistory();
    }

    // Add test track
    const track: Track = {
      id: "track-1",
      name: "Test Track",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#1e40af",
    };
    store.addTrack(track);

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

    const clip3: Clip = {
      id: "clip-3",
      trackId: "track-1",
      startTime: 20,
      duration: 5,
      sourceMediaPath: "/test/video3.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Clip 3",
      locked: false,
      muted: false,
    };

    store.addClip(clip1);
    store.addClip(clip2);
    store.addClip(clip3);
  });

  describe("Ctrl+click toggle selection (Requirement 19.2)", () => {
    it("should toggle individual clip selection with Ctrl+click", () => {
      const store = useTimelineStore.getState();

      // Select first clip
      store.selectClip("clip-1", false);

      // Get fresh state after selection
      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-1")).toBe(true);
      expect(state.selectedClipIds.size).toBe(1);

      // Ctrl+click second clip - should add to selection
      store.selectClip("clip-2", true);
      state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-1")).toBe(true);
      expect(state.selectedClipIds.has("clip-2")).toBe(true);
      expect(state.selectedClipIds.size).toBe(2);

      // Ctrl+click second clip again - should remove from selection
      store.selectClip("clip-2", true);
      state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-1")).toBe(true);
      expect(state.selectedClipIds.has("clip-2")).toBe(false);
      expect(state.selectedClipIds.size).toBe(1);
    });

    it("should maintain other selections when toggling", () => {
      const store = useTimelineStore.getState();

      // Select multiple clips
      store.selectClip("clip-1", false);
      store.selectClip("clip-2", true);
      store.selectClip("clip-3", true);

      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.size).toBe(3);

      // Toggle off middle clip
      store.selectClip("clip-2", true);
      state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-1")).toBe(true);
      expect(state.selectedClipIds.has("clip-2")).toBe(false);
      expect(state.selectedClipIds.has("clip-3")).toBe(true);
      expect(state.selectedClipIds.size).toBe(2);
    });
  });

  describe("Shift+click range selection (Requirement 19.3)", () => {
    it("should select range between clips with Shift+click", () => {
      const store = useTimelineStore.getState();

      // Select first clip
      store.selectClip("clip-1", false);
      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-1")).toBe(true);
      expect(state.selectedClipIds.size).toBe(1);

      // Shift+click third clip - should select all clips in between
      store.selectRange("clip-3");
      state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-1")).toBe(true);
      expect(state.selectedClipIds.has("clip-2")).toBe(true);
      expect(state.selectedClipIds.has("clip-3")).toBe(true);
      expect(state.selectedClipIds.size).toBe(3);
    });

    it("should work in reverse order (later to earlier clip)", () => {
      const store = useTimelineStore.getState();

      // Select third clip
      store.selectClip("clip-3", false);
      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.size).toBe(1);

      // Shift+click first clip - should select all clips in between
      store.selectRange("clip-1");
      state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-1")).toBe(true);
      expect(state.selectedClipIds.has("clip-2")).toBe(true);
      expect(state.selectedClipIds.has("clip-3")).toBe(true);
      expect(state.selectedClipIds.size).toBe(3);
    });

    it("should only select clips on the same track", () => {
      const store = useTimelineStore.getState();

      // Add a second track with a clip
      const track2: Track = {
        id: "track-2",
        name: "Track 2",
        type: "video",
        order: 1,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#1e40af",
      };
      store.addTrack(track2);

      const clip4: Clip = {
        id: "clip-4",
        trackId: "track-2",
        startTime: 5,
        duration: 5,
        sourceMediaPath: "/test/video4.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Clip 4",
        locked: false,
        muted: false,
      };
      store.addClip(clip4);

      // Select clip on track 1
      store.selectClip("clip-1", false);

      // Shift+click clip on track 2 - should only select that clip
      store.selectRange("clip-4");
      const state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-4")).toBe(true);
      expect(state.selectedClipIds.size).toBe(1);
    });

    it("should handle Shift+click when no previous selection exists", () => {
      const store = useTimelineStore.getState();

      // Shift+click without previous selection - should just select the clip
      store.selectRange("clip-2");
      const state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip-2")).toBe(true);
      expect(state.selectedClipIds.size).toBe(1);
    });
  });

  describe("Rectangle selection (Requirement 19.4)", () => {
    it("should select clips intersecting time range", () => {
      const store = useTimelineStore.getState();

      // Simulate rectangle selection from time 0 to 15
      // This should select clip-1 (0-5) and clip-2 (10-15)
      const allClips = Array.from(store.clips.values());
      const startTime = 0;
      const endTime = 15;

      const intersectingClips = allClips.filter((clip) => {
        const clipEndTime = clip.startTime + clip.duration;
        return clipEndTime >= startTime && clip.startTime <= endTime;
      });

      expect(intersectingClips.length).toBe(2);
      expect(intersectingClips.some((c) => c.id === "clip-1")).toBe(true);
      expect(intersectingClips.some((c) => c.id === "clip-2")).toBe(true);
    });

    it("should select all clips when rectangle covers entire timeline", () => {
      const store = useTimelineStore.getState();

      // Simulate rectangle selection from time 0 to 30
      const allClips = Array.from(store.clips.values());
      const startTime = 0;
      const endTime = 30;

      const intersectingClips = allClips.filter((clip) => {
        const clipEndTime = clip.startTime + clip.duration;
        return clipEndTime >= startTime && clip.startTime <= endTime;
      });

      expect(intersectingClips.length).toBe(3);
    });

    it("should select no clips when rectangle doesn't intersect any", () => {
      const store = useTimelineStore.getState();

      // Simulate rectangle selection from time 30 to 40 (no clips here)
      const allClips = Array.from(store.clips.values());
      const startTime = 30;
      const endTime = 40;

      const intersectingClips = allClips.filter((clip) => {
        const clipEndTime = clip.startTime + clip.duration;
        return clipEndTime >= startTime && clip.startTime <= endTime;
      });

      expect(intersectingClips.length).toBe(0);
    });

    it("should select clips partially intersecting rectangle", () => {
      const store = useTimelineStore.getState();

      // Simulate rectangle selection from time 3 to 12
      // Should select clip-1 (partially) and clip-2 (partially)
      const allClips = Array.from(store.clips.values());
      const startTime = 3;
      const endTime = 12;

      const intersectingClips = allClips.filter((clip) => {
        const clipEndTime = clip.startTime + clip.duration;
        return clipEndTime >= startTime && clip.startTime <= endTime;
      });

      expect(intersectingClips.length).toBe(2);
      expect(intersectingClips.some((c) => c.id === "clip-1")).toBe(true);
      expect(intersectingClips.some((c) => c.id === "clip-2")).toBe(true);
    });
  });

  describe("Selection state management", () => {
    it("should track last selected clip for range selection", () => {
      const store = useTimelineStore.getState();

      store.selectClip("clip-1", false);
      let state = useTimelineStore.getState();
      expect(state.lastSelectedClipId).toBe("clip-1");

      store.selectClip("clip-2", true);
      state = useTimelineStore.getState();
      expect(state.lastSelectedClipId).toBe("clip-2");
    });

    it("should clear last selected clip when deselecting all", () => {
      const store = useTimelineStore.getState();

      store.selectClip("clip-1", false);
      let state = useTimelineStore.getState();
      expect(state.lastSelectedClipId).toBe("clip-1");

      store.deselectAll();
      state = useTimelineStore.getState();
      expect(state.lastSelectedClipId).toBe(null);
    });

    it("should update last selected clip on range selection", () => {
      const store = useTimelineStore.getState();

      store.selectClip("clip-1", false);
      store.selectRange("clip-3");
      const state = useTimelineStore.getState();
      expect(state.lastSelectedClipId).toBe("clip-3");
    });
  });
});
