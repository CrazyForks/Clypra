/**
 * Unit tests for Timeline Store
 * Requirements: 15.1, 15.5, 15.6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTimelineStore } from "../timelineStore";
import type { Clip, Track } from "../../types/core";

describe("Timeline Store", () => {
  beforeEach(() => {
    // Reset store state (without replacing methods)
    useTimelineStore.setState({
      clips: new Map<string, Clip>(),
      tracks: new Map<string, Track>(),
      playhead: 0,
      duration: 300,
      pxPerSec: 48,
      scrollLeft: 0,
      scrollTop: 0,
      selectedClipIds: new Set<string>(),
      dragState: null,
      trimState: null,
      snapToPlayhead: true,
      snapToClips: true,
      snapToMarkers: true,
      history: [],
      historyIndex: -1,
    });

    // Clear undo/redo history
    useTimelineStore.getState().clearHistory?.();
  });

  describe("Clip CRUD Operations", () => {
    const mockTrack: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    const mockClip: Clip = {
      id: "clip1",
      trackId: "track1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    it("should add a clip to the timeline", () => {
      // Add track first
      useTimelineStore.getState().addTrack(mockTrack);

      // Add clip
      useTimelineStore.getState().addClip(mockClip);

      // Get fresh state
      const state = useTimelineStore.getState();
      const addedClip = state.clips.get("clip1");
      expect(addedClip).toBeDefined();
      expect(addedClip?.id).toBe("clip1");
      expect(addedClip?.startTime).toBe(10);
      expect(addedClip?.duration).toBe(5);
    });

    it("should update clip properties", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Update clip name
      useTimelineStore.getState().updateClip("clip1", { name: "Updated Clip" });

      const state = useTimelineStore.getState();
      const updatedClip = state.clips.get("clip1");
      expect(updatedClip?.name).toBe("Updated Clip");
    });

    it("should delete a clip from the timeline", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      let state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(true);

      useTimelineStore.getState().deleteClip("clip1");

      state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(false);
    });

    it("should move a clip to a new position", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      useTimelineStore.getState().moveClip("clip1", 20, "track1");

      const state = useTimelineStore.getState();
      const movedClip = state.clips.get("clip1");
      expect(movedClip?.startTime).toBe(20);
    });

    it("should clamp clip start time to non-negative", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      useTimelineStore.getState().moveClip("clip1", -5, "track1");

      const state = useTimelineStore.getState();
      const movedClip = state.clips.get("clip1");
      expect(movedClip?.startTime).toBe(0);
    });

    it("should trim a clip", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      useTimelineStore.getState().trimClip("clip1", 12, 3);

      const state = useTimelineStore.getState();
      const trimmedClip = state.clips.get("clip1");
      expect(trimmedClip?.startTime).toBe(12);
      expect(trimmedClip?.duration).toBe(3);
    });

    it("should split a clip at a given time", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      const initialClipCount = useTimelineStore.getState().clips.size;

      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      // Should have 2 clips now (original removed, 2 new ones added)
      expect(state.clips.size).toBe(initialClipCount + 1);
      expect(state.clips.has("clip1")).toBe(false);

      // Find the two new clips
      const clips = Array.from(state.clips.values());
      const firstClip = clips.find((c) => c.startTime === 10);
      const secondClip = clips.find((c) => c.startTime === 12);

      expect(firstClip).toBeDefined();
      expect(secondClip).toBeDefined();
      expect(firstClip?.duration).toBe(2);
      expect(secondClip?.duration).toBe(3);
    });

    it("should not split locked clips", () => {
      const lockedClip = { ...mockClip, locked: true };
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(lockedClip);

      // Should throw error when trying to split locked clip (Requirement 22.5)
      expect(() => {
        useTimelineStore.getState().splitClip("clip1", 12);
      }).toThrow("Cannot split locked clip");
    });

    it("should not update locked clips", () => {
      const lockedClip = { ...mockClip, locked: true };
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(lockedClip);

      // Should throw error when trying to update locked clip (Requirement 22.5)
      expect(() => {
        useTimelineStore.getState().updateClip("clip1", { name: "Should Not Update" });
      }).toThrow("Cannot update locked clip");
    });

    it("should not delete locked clips", () => {
      const lockedClip = { ...mockClip, locked: true };
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(lockedClip);

      // Should throw error when trying to delete locked clip (Requirement 22.5)
      expect(() => {
        useTimelineStore.getState().deleteClip("clip1");
      }).toThrow("Cannot delete locked clip");
    });
  });

  describe("Clip Splitting Operations", () => {
    const mockTrack: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    const mockClip: Clip = {
      id: "clip1",
      trackId: "track1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 2,
      sourceEnd: 7,
      type: "video",
      filmstripUrl: "filmstrip.jpg",
      waveformPeaks: [0.5, 0.8, 0.3],
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    it("should create two clips with correct times (Requirement 12.2, 12.3, 12.4)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Split at time 12 (2 seconds into the 5-second clip)
      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      const clips = Array.from(state.clips.values());

      // Should have exactly 2 clips
      expect(clips.length).toBe(2);

      // Find first and second clips
      const firstClip = clips.find((c) => c.startTime === 10);
      const secondClip = clips.find((c) => c.startTime === 12);

      // First clip: from original start (10) to split point (12)
      expect(firstClip).toBeDefined();
      expect(firstClip?.startTime).toBe(10);
      expect(firstClip?.duration).toBe(2);
      expect(firstClip?.startTime + firstClip?.duration).toBe(12);

      // Second clip: from split point (12) to original end (15)
      expect(secondClip).toBeDefined();
      expect(secondClip?.startTime).toBe(12);
      expect(secondClip?.duration).toBe(3);
      expect(secondClip?.startTime + secondClip?.duration).toBe(15);
    });

    it("should preserve clip properties in both new clips (Requirement 12.6, 12.7)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      const clips = Array.from(state.clips.values());

      const firstClip = clips.find((c) => c.startTime === 10);
      const secondClip = clips.find((c) => c.startTime === 12);

      // Both clips should preserve track assignment
      expect(firstClip?.trackId).toBe("track1");
      expect(secondClip?.trackId).toBe("track1");

      // Both clips should preserve type
      expect(firstClip?.type).toBe("video");
      expect(secondClip?.type).toBe("video");

      // Both clips should preserve source media path
      expect(firstClip?.sourceMediaPath).toBe("/path/to/video.mp4");
      expect(secondClip?.sourceMediaPath).toBe("/path/to/video.mp4");

      // Both clips should preserve name
      expect(firstClip?.name).toBe("Test Clip");
      expect(secondClip?.name).toBe("Test Clip");

      // Both clips should preserve locked/muted state
      expect(firstClip?.locked).toBe(false);
      expect(firstClip?.muted).toBe(false);
      expect(secondClip?.locked).toBe(false);
      expect(secondClip?.muted).toBe(false);
    });

    it("should adjust source trim correctly for both clips", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Original clip: sourceStart=2, sourceEnd=7 (5 seconds of source media)
      // Split at 12 (2 seconds into clip)
      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      const clips = Array.from(state.clips.values());

      const firstClip = clips.find((c) => c.startTime === 10);
      const secondClip = clips.find((c) => c.startTime === 12);

      // First clip should use first 2 seconds of source media
      expect(firstClip?.sourceStart).toBe(2);
      expect(firstClip?.sourceEnd).toBe(4); // 2 + 2

      // Second clip should use remaining 3 seconds of source media
      expect(secondClip?.sourceStart).toBe(4); // 2 + 2
      expect(secondClip?.sourceEnd).toBe(7); // Original sourceEnd
    });

    it("should not split when playhead is outside clip boundaries (Requirement 12.7)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Try to split before clip start - should throw error (Requirement 22.5)
      expect(() => {
        useTimelineStore.getState().splitClip("clip1", 9);
      }).toThrow("outside clip boundaries");

      // Try to split at clip start (boundary) - should throw error
      expect(() => {
        useTimelineStore.getState().splitClip("clip1", 10);
      }).toThrow("outside clip boundaries");

      // Try to split at clip end (boundary) - should throw error
      expect(() => {
        useTimelineStore.getState().splitClip("clip1", 15);
      }).toThrow("outside clip boundaries");

      // Try to split after clip end - should throw error
      expect(() => {
        useTimelineStore.getState().splitClip("clip1", 16);
      }).toThrow("outside clip boundaries");
    });

    it("should remove original clip after split (Requirement 12.5)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      expect(useTimelineStore.getState().clips.has("clip1")).toBe(true);

      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      // Original clip should be removed
      expect(state.clips.has("clip1")).toBe(false);

      // Should have 2 new clips with different IDs
      expect(state.clips.size).toBe(2);
      const clipIds = Array.from(state.clips.keys());
      expect(clipIds).not.toContain("clip1");
    });

    it("should update selection when splitting selected clip", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Select the clip
      useTimelineStore.getState().selectClip("clip1", false);
      expect(useTimelineStore.getState().selectedClipIds.has("clip1")).toBe(true);

      // Split the clip
      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      // Original clip should not be in selection
      expect(state.selectedClipIds.has("clip1")).toBe(false);

      // Both new clips should be selected
      expect(state.selectedClipIds.size).toBe(2);

      const clips = Array.from(state.clips.values());
      const firstClip = clips.find((c) => c.startTime === 10);
      const secondClip = clips.find((c) => c.startTime === 12);

      expect(state.selectedClipIds.has(firstClip!.id)).toBe(true);
      expect(state.selectedClipIds.has(secondClip!.id)).toBe(true);
    });

    it("should not update selection when splitting unselected clip", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Don't select the clip
      expect(useTimelineStore.getState().selectedClipIds.size).toBe(0);

      // Split the clip
      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      // Selection should remain empty
      expect(state.selectedClipIds.size).toBe(0);
    });

    it("should reset filmstrip and waveform for second clip", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      useTimelineStore.getState().splitClip("clip1", 12);

      const state = useTimelineStore.getState();
      const clips = Array.from(state.clips.values());

      const firstClip = clips.find((c) => c.startTime === 10);
      const secondClip = clips.find((c) => c.startTime === 12);

      // First clip should preserve filmstrip and waveform
      expect(firstClip?.filmstripUrl).toBe("filmstrip.jpg");
      expect(firstClip?.waveformPeaks).toEqual([0.5, 0.8, 0.3]);

      // Second clip should have null filmstrip and waveform (needs regeneration)
      expect(secondClip?.filmstripUrl).toBeNull();
      expect(secondClip?.waveformPeaks).toBeNull();
    });

    it("should add split operation to undo history (Requirement 14.6)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Split the clip
      useTimelineStore.getState().splitClip("clip1", 12);

      let state = useTimelineStore.getState();
      expect(state.clips.size).toBe(2);
      expect(state.clips.has("clip1")).toBe(false);

      // Undo the split
      useTimelineStore.getState().undo();

      state = useTimelineStore.getState();
      // Should restore original clip
      expect(state.clips.size).toBe(1);
      expect(state.clips.has("clip1")).toBe(true);

      const restoredClip = state.clips.get("clip1");
      expect(restoredClip?.startTime).toBe(10);
      expect(restoredClip?.duration).toBe(5);
    });

    it("should handle split near minimum duration boundary", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      // Create a clip with 0.3 second duration
      const shortClip: Clip = {
        ...mockClip,
        id: "shortClip",
        startTime: 10,
        duration: 0.3,
        sourceStart: 0,
        sourceEnd: 0.3,
      };

      useTimelineStore.getState().addClip(shortClip);

      // Split at 10.15 (creates 0.15 and 0.15 second clips - both well above minimum)
      useTimelineStore.getState().splitClip("shortClip", 10.15);

      const state = useTimelineStore.getState();
      expect(state.clips.size).toBe(2);

      const clips = Array.from(state.clips.values());
      const firstClip = clips.find((c) => c.startTime === 10);
      const secondClip = clips.find((c) => c.startTime === 10.15);

      expect(firstClip?.duration).toBeCloseTo(0.15, 5);
      expect(secondClip?.duration).toBeCloseTo(0.15, 5);
    });

    it("should not split if resulting clips would be below minimum duration", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      // Create a clip with 0.15 second duration
      const shortClip: Clip = {
        ...mockClip,
        id: "shortClip",
        startTime: 10,
        duration: 0.15,
        sourceStart: 0,
        sourceEnd: 0.15,
      };

      useTimelineStore.getState().addClip(shortClip);

      // Try to split at 10.05 (would create 0.05 and 0.1 second clips)
      // First clip would be below minimum duration (0.1 seconds)
      // This should throw an error, which we expect
      expect(() => {
        useTimelineStore.getState().splitClip("shortClip", 10.05);
      }).toThrow("Clip duration must be at least 0.1 seconds");

      const state = useTimelineStore.getState();
      // Split should be prevented - original clip should still exist
      expect(state.clips.size).toBe(1);
      expect(state.clips.has("shortClip")).toBe(true);
    });
  });

  describe("Track Management Operations", () => {
    const mockTrack: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    it("should add a track", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      const state = useTimelineStore.getState();
      const addedTrack = state.tracks.get("track1");
      expect(addedTrack).toBeDefined();
      expect(addedTrack?.name).toBe("Video Track 1");
    });

    it("should update track properties", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().updateTrack("track1", { name: "Updated Track" });

      const state = useTimelineStore.getState();
      const updatedTrack = state.tracks.get("track1");
      expect(updatedTrack?.name).toBe("Updated Track");
    });

    it("should delete a track and its clips", () => {
      const mockClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Test Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      let state = useTimelineStore.getState();
      expect(state.tracks.has("track1")).toBe(true);
      expect(state.clips.has("clip1")).toBe(true);

      useTimelineStore.getState().deleteTrack("track1");

      state = useTimelineStore.getState();
      expect(state.tracks.has("track1")).toBe(false);
      expect(state.clips.has("clip1")).toBe(false);
    });

    it("should reorder a track", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().reorderTrack("track1", 5);

      const state = useTimelineStore.getState();
      const reorderedTrack = state.tracks.get("track1");
      expect(reorderedTrack?.order).toBe(5);
    });

    it("should toggle track lock", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      let state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.locked).toBe(false);

      useTimelineStore.getState().toggleTrackLock("track1");
      state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.locked).toBe(true);

      useTimelineStore.getState().toggleTrackLock("track1");
      state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.locked).toBe(false);
    });

    it("should toggle track visibility", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      let state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.visible).toBe(true);

      useTimelineStore.getState().toggleTrackVisibility("track1");
      state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.visible).toBe(false);

      useTimelineStore.getState().toggleTrackVisibility("track1");
      state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.visible).toBe(true);
    });

    it("should toggle track mute", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      let state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.muted).toBe(false);

      useTimelineStore.getState().toggleTrackMute("track1");
      state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.muted).toBe(true);

      useTimelineStore.getState().toggleTrackMute("track1");
      state = useTimelineStore.getState();
      expect(state.tracks.get("track1")?.muted).toBe(false);
    });

    it("should lock all clips when track is locked", () => {
      const mockClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Test Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      useTimelineStore.getState().toggleTrackLock("track1");

      const state = useTimelineStore.getState();
      const clip = state.clips.get("clip1");
      expect(clip?.locked).toBe(true);
    });
  });

  describe("Selection State Updates", () => {
    const mockTrack: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    const mockClip1: Clip = {
      id: "clip1",
      trackId: "track1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip 1",
      locked: false,
      muted: false,
    };

    const mockClip2: Clip = {
      id: "clip2",
      trackId: "track1",
      startTime: 20,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip 2",
      locked: false,
      muted: false,
    };

    it("should select a single clip", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip1);

      useTimelineStore.getState().selectClip("clip1", false);

      const state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip1")).toBe(true);
      expect(state.selectedClipIds.size).toBe(1);
    });

    it("should toggle clip selection with multi-select", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip1);
      useTimelineStore.getState().addClip(mockClip2);

      useTimelineStore.getState().selectClip("clip1", false);
      useTimelineStore.getState().selectClip("clip2", true); // Ctrl+click

      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip1")).toBe(true);
      expect(state.selectedClipIds.has("clip2")).toBe(true);
      expect(state.selectedClipIds.size).toBe(2);

      // Toggle off clip1
      useTimelineStore.getState().selectClip("clip1", true);
      state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip1")).toBe(false);
      expect(state.selectedClipIds.has("clip2")).toBe(true);
    });

    it("should deselect all clips", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip1);
      useTimelineStore.getState().addClip(mockClip2);

      useTimelineStore.getState().selectClip("clip1", false);
      useTimelineStore.getState().selectClip("clip2", true);

      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.size).toBe(2);

      useTimelineStore.getState().deselectAll();

      state = useTimelineStore.getState();
      expect(state.selectedClipIds.size).toBe(0);
    });

    it("should remove deleted clip from selection", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip1);

      useTimelineStore.getState().selectClip("clip1", false);
      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip1")).toBe(true);

      useTimelineStore.getState().deleteClip("clip1");
      state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip1")).toBe(false);
    });
  });

  describe("Clip Deletion Operations", () => {
    const mockTrack: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    const mockClip: Clip = {
      id: "clip1",
      trackId: "track1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    it("should delete a single clip (Requirement 13.1)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      let state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(true);
      expect(state.clips.size).toBe(1);

      useTimelineStore.getState().deleteClip("clip1");

      state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(false);
      expect(state.clips.size).toBe(0);
    });

    it("should delete multiple clips sequentially (Requirement 13.5)", () => {
      const clip2: Clip = { ...mockClip, id: "clip2", startTime: 20 };
      const clip3: Clip = { ...mockClip, id: "clip3", startTime: 30 };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().addClip(clip2);
      useTimelineStore.getState().addClip(clip3);

      expect(useTimelineStore.getState().clips.size).toBe(3);

      // Delete all clips
      useTimelineStore.getState().deleteClip("clip1");
      useTimelineStore.getState().deleteClip("clip2");
      useTimelineStore.getState().deleteClip("clip3");

      const state = useTimelineStore.getState();
      expect(state.clips.size).toBe(0);
      expect(state.clips.has("clip1")).toBe(false);
      expect(state.clips.has("clip2")).toBe(false);
      expect(state.clips.has("clip3")).toBe(false);
    });

    it("should not delete locked clips (Requirement 13.5)", () => {
      const lockedClip: Clip = { ...mockClip, locked: true };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(lockedClip);

      // Should throw error when trying to delete locked clip (Requirement 22.5)
      expect(() => {
        useTimelineStore.getState().deleteClip("clip1");
      }).toThrow("Cannot delete locked clip");
    });

    it("should remove deleted clip from selection (Requirement 13.2, 13.3)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Select the clip
      useTimelineStore.getState().selectClip("clip1", false);
      let state = useTimelineStore.getState();
      expect(state.selectedClipIds.has("clip1")).toBe(true);

      // Delete the clip
      useTimelineStore.getState().deleteClip("clip1");

      state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(false);
      expect(state.selectedClipIds.has("clip1")).toBe(false);
      expect(state.selectedClipIds.size).toBe(0);
    });

    it("should add delete operation to undo history (Requirement 13.6)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Delete the clip
      useTimelineStore.getState().deleteClip("clip1");
      let state = useTimelineStore.getState();
      expect(state.clips.size).toBe(0);

      // Undo the delete
      useTimelineStore.getState().undo();

      state = useTimelineStore.getState();
      expect(state.clips.size).toBe(1);
      expect(state.clips.has("clip1")).toBe(true);
    });

    it("should preserve other clips when deleting one clip", () => {
      const clip2: Clip = { ...mockClip, id: "clip2", startTime: 20 };
      const clip3: Clip = { ...mockClip, id: "clip3", startTime: 30 };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().addClip(clip2);
      useTimelineStore.getState().addClip(clip3);

      // Delete only clip2
      useTimelineStore.getState().deleteClip("clip2");

      const state = useTimelineStore.getState();
      expect(state.clips.size).toBe(2);
      expect(state.clips.has("clip1")).toBe(true);
      expect(state.clips.has("clip2")).toBe(false);
      expect(state.clips.has("clip3")).toBe(true);
    });

    it("should handle deletion of non-existent clip gracefully", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Try to delete non-existent clip
      expect(() => {
        useTimelineStore.getState().deleteClip("nonexistent");
      }).toThrow();

      // Original clip should still exist
      const state = useTimelineStore.getState();
      expect(state.clips.size).toBe(1);
      expect(state.clips.has("clip1")).toBe(true);
    });

    it("should update selection when deleting one of multiple selected clips", () => {
      const clip2: Clip = { ...mockClip, id: "clip2", startTime: 20 };
      const clip3: Clip = { ...mockClip, id: "clip3", startTime: 30 };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().addClip(clip2);
      useTimelineStore.getState().addClip(clip3);

      // Select all clips
      useTimelineStore.getState().selectClip("clip1", false);
      useTimelineStore.getState().selectClip("clip2", true);
      useTimelineStore.getState().selectClip("clip3", true);

      expect(useTimelineStore.getState().selectedClipIds.size).toBe(3);

      // Delete clip2
      useTimelineStore.getState().deleteClip("clip2");

      const state = useTimelineStore.getState();
      expect(state.clips.size).toBe(2);
      expect(state.selectedClipIds.size).toBe(2);
      expect(state.selectedClipIds.has("clip1")).toBe(true);
      expect(state.selectedClipIds.has("clip2")).toBe(false);
      expect(state.selectedClipIds.has("clip3")).toBe(true);
    });
  });

  describe("Boundary Validation", () => {
    it("should clamp playhead to timeline boundaries", () => {
      useTimelineStore.getState().setPlayhead(-10);
      let state = useTimelineStore.getState();
      expect(state.playhead).toBe(0);

      useTimelineStore.getState().setPlayhead(500);
      state = useTimelineStore.getState();
      expect(state.playhead).toBe(300); // duration is 300
    });

    it("should validate zoom level constraints", () => {
      useTimelineStore.getState().setZoom(10); // Below minimum
      let state = useTimelineStore.getState();
      expect(state.pxPerSec).toBe(16); // Clamped to minimum

      useTimelineStore.getState().setZoom(500); // Above maximum
      state = useTimelineStore.getState();
      expect(state.pxPerSec).toBe(320); // Clamped to maximum

      useTimelineStore.getState().setZoom(100); // Valid
      state = useTimelineStore.getState();
      expect(state.pxPerSec).toBe(100);
    });

    it("should clamp scroll values to non-negative", () => {
      useTimelineStore.getState().setScroll(-10, -20);
      let state = useTimelineStore.getState();
      expect(state.scrollLeft).toBe(0);
      expect(state.scrollTop).toBe(0);

      useTimelineStore.getState().setScroll(100, 50);
      state = useTimelineStore.getState();
      expect(state.scrollLeft).toBe(100);
      expect(state.scrollTop).toBe(50);
    });

    it("should prevent adding clip with invalid track", () => {
      const mockClip: Clip = {
        id: "clip1",
        trackId: "nonexistent",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Test Clip",
        locked: false,
        muted: false,
      };

      expect(() => useTimelineStore.getState().addClip(mockClip)).toThrow();
    });

    it("should prevent incompatible clip type on track", () => {
      const audioTrack: Track = {
        id: "track1",
        name: "Audio Track",
        type: "audio",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      const textClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/text.txt",
        sourceStart: 0,
        sourceEnd: 5,
        type: "text",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Text Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(audioTrack);

      expect(() => useTimelineStore.getState().addClip(textClip)).toThrow();
    });
  });

  describe("Track Type Constraints", () => {
    // Requirement 23.1: Video clips on video tracks
    it("should allow video clips on video tracks", () => {
      const videoTrack: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const videoClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Video Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(videoTrack);
      expect(() => useTimelineStore.getState().addClip(videoClip)).not.toThrow();

      const state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(true);
    });

    // Requirement 23.2: Audio clips on audio tracks
    it("should allow audio clips on audio tracks", () => {
      const audioTrack: Track = {
        id: "track1",
        name: "Audio Track",
        type: "audio",
        order: 0,
        height: 80,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      const audioClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/audio.mp3",
        sourceStart: 0,
        sourceEnd: 5,
        type: "audio",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Audio Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(audioTrack);
      expect(() => useTimelineStore.getState().addClip(audioClip)).not.toThrow();

      const state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(true);
    });

    // Requirement 23.3: Text clips on text tracks
    it("should allow text clips on text tracks", () => {
      const textTrack: Track = {
        id: "track1",
        name: "Text Track",
        type: "text",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#f59e0b",
      };

      const textClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/text.txt",
        sourceStart: 0,
        sourceEnd: 5,
        type: "text",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Text Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(textTrack);
      expect(() => useTimelineStore.getState().addClip(textClip)).not.toThrow();

      const state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(true);
    });

    // Requirement 23.5: Video+audio clips on video tracks
    it("should allow video clips with audio content on video tracks", () => {
      const videoTrack: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const videoClipWithAudio: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video-with-audio.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video", // Video clips can contain both video and audio
        filmstripUrl: null,
        waveformPeaks: [0.5, 0.8, 0.3], // Has audio waveform
        name: "Video with Audio",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(videoTrack);
      expect(() => useTimelineStore.getState().addClip(videoClipWithAudio)).not.toThrow();

      const state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(true);
    });

    // Requirement 23.6: Audio extraction for video clips on audio tracks
    it("should allow video clips on audio tracks (audio extraction)", () => {
      const audioTrack: Track = {
        id: "track1",
        name: "Audio Track",
        type: "audio",
        order: 0,
        height: 80,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      const videoClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video", // Video clip on audio track - audio will be extracted
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Video Clip (Audio Only)",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(audioTrack);
      expect(() => useTimelineStore.getState().addClip(videoClip)).not.toThrow();

      const state = useTimelineStore.getState();
      expect(state.clips.has("clip1")).toBe(true);
    });

    // Requirement 23.4: Prevent incompatible clip placement
    it("should prevent audio clips on video tracks", () => {
      const videoTrack: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const audioClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/audio.mp3",
        sourceStart: 0,
        sourceEnd: 5,
        type: "audio",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Audio Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(videoTrack);
      expect(() => useTimelineStore.getState().addClip(audioClip)).toThrow();
    });

    it("should prevent text clips on video tracks", () => {
      const videoTrack: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const textClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/text.txt",
        sourceStart: 0,
        sourceEnd: 5,
        type: "text",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Text Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(videoTrack);
      expect(() => useTimelineStore.getState().addClip(textClip)).toThrow();
    });

    it("should prevent text clips on audio tracks", () => {
      const audioTrack: Track = {
        id: "track1",
        name: "Audio Track",
        type: "audio",
        order: 0,
        height: 80,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      const textClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/text.txt",
        sourceStart: 0,
        sourceEnd: 5,
        type: "text",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Text Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(audioTrack);
      expect(() => useTimelineStore.getState().addClip(textClip)).toThrow();
    });

    it("should prevent audio clips on text tracks", () => {
      const textTrack: Track = {
        id: "track1",
        name: "Text Track",
        type: "text",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#f59e0b",
      };

      const audioClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/audio.mp3",
        sourceStart: 0,
        sourceEnd: 5,
        type: "audio",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Audio Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(textTrack);
      expect(() => useTimelineStore.getState().addClip(audioClip)).toThrow();
    });

    it("should prevent video clips on text tracks", () => {
      const textTrack: Track = {
        id: "track1",
        name: "Text Track",
        type: "text",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#f59e0b",
      };

      const videoClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Video Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(textTrack);
      expect(() => useTimelineStore.getState().addClip(videoClip)).toThrow();
    });

    // Test validation during moveClip operation
    it("should prevent moving clip to incompatible track type", () => {
      const videoTrack: Track = {
        id: "videoTrack",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const audioTrack: Track = {
        id: "audioTrack",
        name: "Audio Track",
        type: "audio",
        order: 1,
        height: 80,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      const audioClip: Clip = {
        id: "clip1",
        trackId: "audioTrack",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/audio.mp3",
        sourceStart: 0,
        sourceEnd: 5,
        type: "audio",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Audio Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(videoTrack);
      useTimelineStore.getState().addTrack(audioTrack);
      useTimelineStore.getState().addClip(audioClip);

      // Try to move audio clip to video track - should throw
      expect(() => useTimelineStore.getState().moveClip("clip1", 20, "videoTrack")).toThrow();

      // Clip should remain on original track
      const state = useTimelineStore.getState();
      expect(state.clips.get("clip1")?.trackId).toBe("audioTrack");
    });

    it("should allow moving video clip from video track to audio track", () => {
      const videoTrack: Track = {
        id: "videoTrack",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const audioTrack: Track = {
        id: "audioTrack",
        name: "Audio Track",
        type: "audio",
        order: 1,
        height: 80,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      const videoClip: Clip = {
        id: "clip1",
        trackId: "videoTrack",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Video Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(videoTrack);
      useTimelineStore.getState().addTrack(audioTrack);
      useTimelineStore.getState().addClip(videoClip);

      // Move video clip to audio track - should succeed (audio extraction)
      expect(() => useTimelineStore.getState().moveClip("clip1", 20, "audioTrack")).not.toThrow();

      const state = useTimelineStore.getState();
      expect(state.clips.get("clip1")?.trackId).toBe("audioTrack");
    });

    it("should show descriptive error message for incompatible types", () => {
      const videoTrack: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 100,
        locked: false,
        visible: true,
        muted: false,
        color: "#3b82f6",
      };

      const audioClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/audio.mp3",
        sourceStart: 0,
        sourceEnd: 5,
        type: "audio",
        filmstripUrl: null,
        waveformPeaks: null,
        name: "Audio Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(videoTrack);

      try {
        useTimelineStore.getState().addClip(audioClip);
        fail("Expected error to be thrown");
      } catch (error: any) {
        expect(error.message).toContain("audio");
        expect(error.message).toContain("video");
        expect(error.code).toBe("INVALID_TRACK_TYPE");
      }
    });
  });

  describe("Undo/Redo Operations", () => {
    const mockTrack: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    const mockClip: Clip = {
      id: "clip1",
      trackId: "track1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    it("should undo clip addition (Requirement 14.2)", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      // Initial state has no clips
      expect(useTimelineStore.getState().clips.size).toBe(0);

      // Add clip
      useTimelineStore.getState().addClip(mockClip);
      expect(useTimelineStore.getState().clips.size).toBe(1);

      // Undo
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(0);
    });

    it("should redo clip addition (Requirement 14.3)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Undo
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(0);

      // Redo
      useTimelineStore.getState().redo();
      expect(useTimelineStore.getState().clips.size).toBe(1);
      expect(useTimelineStore.getState().clips.get("clip1")).toBeDefined();
    });

    it("should undo clip deletion", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Delete clip
      useTimelineStore.getState().deleteClip("clip1");
      expect(useTimelineStore.getState().clips.size).toBe(0);

      // Undo deletion
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(1);
      expect(useTimelineStore.getState().clips.get("clip1")).toBeDefined();
    });

    it("should undo clip move", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      const originalStartTime = mockClip.startTime;

      // Move clip
      useTimelineStore.getState().moveClip("clip1", 20, "track1");
      expect(useTimelineStore.getState().clips.get("clip1")?.startTime).toBe(20);

      // Undo move
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.get("clip1")?.startTime).toBe(originalStartTime);
    });

    it("should undo clip trim", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      const originalStartTime = mockClip.startTime;
      const originalDuration = mockClip.duration;

      // Trim clip
      useTimelineStore.getState().trimClip("clip1", 12, 3);
      expect(useTimelineStore.getState().clips.get("clip1")?.startTime).toBe(12);
      expect(useTimelineStore.getState().clips.get("clip1")?.duration).toBe(3);

      // Undo trim
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.get("clip1")?.startTime).toBe(originalStartTime);
      expect(useTimelineStore.getState().clips.get("clip1")?.duration).toBe(originalDuration);
    });

    it("should undo clip split", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Split clip
      useTimelineStore.getState().splitClip("clip1", 12);
      expect(useTimelineStore.getState().clips.size).toBe(2);
      expect(useTimelineStore.getState().clips.has("clip1")).toBe(false);

      // Undo split
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(1);
      expect(useTimelineStore.getState().clips.has("clip1")).toBe(true);
    });

    it("should undo track operations", () => {
      const track2: Track = {
        id: "track2",
        name: "Audio Track",
        type: "audio",
        order: 1,
        height: 80,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      useTimelineStore.getState().addTrack(mockTrack);

      // Add second track
      useTimelineStore.getState().addTrack(track2);
      expect(useTimelineStore.getState().tracks.size).toBe(2);

      // Undo
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().tracks.size).toBe(1);
      expect(useTimelineStore.getState().tracks.has("track2")).toBe(false);
    });

    it("should handle multiple undo operations", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      const clip2: Clip = { ...mockClip, id: "clip2", startTime: 20 };
      const clip3: Clip = { ...mockClip, id: "clip3", startTime: 30 };

      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().addClip(clip2);
      useTimelineStore.getState().addClip(clip3);

      expect(useTimelineStore.getState().clips.size).toBe(3);

      // Undo three times
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(2);

      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(1);

      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(0);
    });

    it("should handle multiple redo operations", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      const clip2: Clip = { ...mockClip, id: "clip2", startTime: 20 };

      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().addClip(clip2);

      // Undo twice
      useTimelineStore.getState().undo();
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(0);

      // Redo twice
      useTimelineStore.getState().redo();
      expect(useTimelineStore.getState().clips.size).toBe(1);

      useTimelineStore.getState().redo();
      expect(useTimelineStore.getState().clips.size).toBe(2);
    });

    it("should clear redo history on new operation (Requirement 14.5)", () => {
      useTimelineStore.getState().addTrack(mockTrack);

      const clip2: Clip = { ...mockClip, id: "clip2", startTime: 20 };
      const clip3: Clip = { ...mockClip, id: "clip3", startTime: 30 };

      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().addClip(clip2);

      // Undo
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.size).toBe(1);

      // New operation - should clear redo history
      useTimelineStore.getState().addClip(clip3);
      expect(useTimelineStore.getState().clips.size).toBe(2);

      // Redo should not bring back clip2
      useTimelineStore.getState().redo();
      expect(useTimelineStore.getState().clips.size).toBe(2);
      expect(useTimelineStore.getState().clips.has("clip2")).toBe(false);
      expect(useTimelineStore.getState().clips.has("clip3")).toBe(true);
    });

    it("should restore selection state on undo", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Select clip
      useTimelineStore.getState().selectClip("clip1", false);
      expect(useTimelineStore.getState().selectedClipIds.has("clip1")).toBe(true);

      // Delete clip (which removes it from selection)
      useTimelineStore.getState().deleteClip("clip1");
      expect(useTimelineStore.getState().selectedClipIds.has("clip1")).toBe(false);

      // Undo - should restore selection
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().selectedClipIds.has("clip1")).toBe(true);
    });

    it("should restore playhead position on undo", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().setPlayhead(10);

      // Add clip (captures snapshot with playhead at 10)
      useTimelineStore.getState().addClip(mockClip);

      // Move playhead
      useTimelineStore.getState().setPlayhead(20);
      expect(useTimelineStore.getState().playhead).toBe(20);

      // Undo - should restore playhead to 10
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().playhead).toBe(10);
    });
  });

  describe("Timeline Serialization", () => {
    const mockTrack: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    const mockClip: Clip = {
      id: "clip1",
      trackId: "track1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    // Requirement 21.6: Round-trip serialization produces equivalent state
    it("should serialize and parse timeline state (round-trip)", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().setPlayhead(15);
      useTimelineStore.getState().setZoom(100);

      // Serialize
      const json = useTimelineStore.getState().toJSON();

      // Verify JSON structure
      expect(json.clips).toBeInstanceOf(Array);
      expect(json.tracks).toBeInstanceOf(Array);
      expect(json.clips.length).toBe(1);
      expect(json.tracks.length).toBe(1);
      expect(json.playhead).toBe(15);
      expect(json.pxPerSec).toBe(100);

      // Reset store
      useTimelineStore.setState({
        clips: new Map(),
        tracks: new Map(),
        playhead: 0,
        duration: 300,
        pxPerSec: 48,
      });

      // Parse
      useTimelineStore.getState().fromJSON(json);

      // Verify state restored
      const state = useTimelineStore.getState();
      expect(state.clips.size).toBe(1);
      expect(state.tracks.size).toBe(1);
      expect(state.clips.get("clip1")).toBeDefined();
      expect(state.tracks.get("track1")).toBeDefined();
      expect(state.playhead).toBe(15);
      expect(state.pxPerSec).toBe(100);
    });

    // Requirement 21.1: Serialize clips, tracks, playhead, zoom, and settings
    it("should serialize all timeline properties", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().setPlayhead(20);
      useTimelineStore.getState().setZoom(150);

      const json = useTimelineStore.getState().toJSON();

      expect(json).toHaveProperty("clips");
      expect(json).toHaveProperty("tracks");
      expect(json).toHaveProperty("playhead");
      expect(json).toHaveProperty("duration");
      expect(json).toHaveProperty("pxPerSec");
      expect(json).toHaveProperty("snapToPlayhead");
      expect(json).toHaveProperty("snapToClips");
      expect(json).toHaveProperty("snapToMarkers");

      expect(json.playhead).toBe(20);
      expect(json.pxPerSec).toBe(150);
      expect(json.duration).toBe(300);
      expect(json.snapToPlayhead).toBe(true);
      expect(json.snapToClips).toBe(true);
      expect(json.snapToMarkers).toBe(true);
    });

    // Requirement 21.5: Format JSON with proper indentation
    it("should serialize to valid JSON format", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      const json = useTimelineStore.getState().toJSON();
      const jsonString = JSON.stringify(json, null, 2);

      // Should be valid JSON
      expect(() => JSON.parse(jsonString)).not.toThrow();

      // Should have proper indentation
      expect(jsonString).toContain("  ");
      expect(jsonString).toContain("\n");
    });

    // Requirement 21.7: Handle missing optional fields with defaults
    it("should parse JSON with missing optional fields", () => {
      const minimalJSON = {
        clips: [],
        tracks: [],
        playhead: 0,
        // Missing: duration, pxPerSec, snap settings
      };

      useTimelineStore.getState().fromJSON(minimalJSON as any);

      const state = useTimelineStore.getState();
      expect(state.duration).toBe(300); // Default
      expect(state.pxPerSec).toBe(48); // Default
      expect(state.snapToPlayhead).toBe(true); // Default
      expect(state.snapToClips).toBe(true); // Default
      expect(state.snapToMarkers).toBe(true); // Default
    });

    // Requirement 21.3: Validate JSON structure
    it("should validate JSON structure before parsing", () => {
      const invalidJSON = {
        clips: "not an array",
        tracks: [],
        playhead: 0,
      };

      expect(() => useTimelineStore.getState().fromJSON(invalidJSON as any)).toThrow("Invalid JSON: clips must be an array");
    });

    // Requirement 21.4: Return descriptive errors for invalid JSON
    it("should return descriptive error for invalid clip data", () => {
      const invalidClipJSON = {
        clips: [
          {
            id: "clip1",
            // Missing required fields
          },
        ],
        tracks: [],
        playhead: 0,
      };

      expect(() => useTimelineStore.getState().fromJSON(invalidClipJSON as any)).toThrow();
    });

    it("should return descriptive error for invalid track data", () => {
      const invalidTrackJSON = {
        clips: [],
        tracks: [
          {
            id: "track1",
            // Missing required fields
          },
        ],
        playhead: 0,
      };

      expect(() => useTimelineStore.getState().fromJSON(invalidTrackJSON as any)).toThrow();
    });

    it("should validate clip has valid type", () => {
      const invalidTypeJSON = {
        clips: [
          {
            id: "clip1",
            trackId: "track1",
            startTime: 10,
            duration: 5,
            sourceMediaPath: "/path/to/video.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "invalid",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Test Clip",
            locked: false,
            muted: false,
          },
        ],
        tracks: [],
        playhead: 0,
      };

      expect(() => useTimelineStore.getState().fromJSON(invalidTypeJSON as any)).toThrow("must have a valid type");
    });

    it("should validate track has valid type", () => {
      const invalidTrackTypeJSON = {
        clips: [],
        tracks: [
          {
            id: "track1",
            name: "Track",
            type: "invalid",
            order: 0,
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#3b82f6",
          },
        ],
        playhead: 0,
      };

      expect(() => useTimelineStore.getState().fromJSON(invalidTrackTypeJSON as any)).toThrow("must have a valid type");
    });

    it("should validate playhead is non-negative", () => {
      const negativePlayheadJSON = {
        clips: [],
        tracks: [],
        playhead: -10,
      };

      expect(() => useTimelineStore.getState().fromJSON(negativePlayheadJSON as any)).toThrow("playhead must be a non-negative number");
    });

    it("should validate clip startTime is non-negative", () => {
      const negativeStartTimeJSON = {
        clips: [
          {
            id: "clip1",
            trackId: "track1",
            startTime: -5,
            duration: 5,
            sourceMediaPath: "/path/to/video.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Test Clip",
            locked: false,
            muted: false,
          },
        ],
        tracks: [],
        playhead: 0,
      };

      expect(() => useTimelineStore.getState().fromJSON(negativeStartTimeJSON as any)).toThrow("must have a non-negative startTime");
    });

    it("should validate clip duration is positive", () => {
      const zeroDurationJSON = {
        clips: [
          {
            id: "clip1",
            trackId: "track1",
            startTime: 10,
            duration: 0,
            sourceMediaPath: "/path/to/video.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Test Clip",
            locked: false,
            muted: false,
          },
        ],
        tracks: [],
        playhead: 0,
      };

      expect(() => useTimelineStore.getState().fromJSON(zeroDurationJSON as any)).toThrow("must have a positive duration");
    });

    it("should serialize multiple clips and tracks", () => {
      const track2: Track = {
        id: "track2",
        name: "Audio Track",
        type: "audio",
        order: 1,
        height: 80,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };

      const clip2: Clip = {
        id: "clip2",
        trackId: "track2",
        startTime: 20,
        duration: 3,
        sourceMediaPath: "/path/to/audio.mp3",
        sourceStart: 0,
        sourceEnd: 3,
        type: "audio",
        filmstripUrl: null,
        waveformPeaks: [0.5, 0.8],
        name: "Audio Clip",
        locked: false,
        muted: false,
      };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addTrack(track2);
      useTimelineStore.getState().addClip(mockClip);
      useTimelineStore.getState().addClip(clip2);

      const json = useTimelineStore.getState().toJSON();

      expect(json.clips.length).toBe(2);
      expect(json.tracks.length).toBe(2);

      // Parse and verify
      useTimelineStore.setState({
        clips: new Map(),
        tracks: new Map(),
      });

      useTimelineStore.getState().fromJSON(json);

      const state = useTimelineStore.getState();
      expect(state.clips.size).toBe(2);
      expect(state.tracks.size).toBe(2);
      expect(state.clips.get("clip1")).toBeDefined();
      expect(state.clips.get("clip2")).toBeDefined();
      expect(state.tracks.get("track1")).toBeDefined();
      expect(state.tracks.get("track2")).toBeDefined();
    });

    it("should reset interaction state when parsing JSON", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Set some interaction state
      useTimelineStore.getState().selectClip("clip1", false);
      useTimelineStore.getState().setDragState({
        clipIds: ["clip1"],
        startX: 100,
        startTimes: new Map([["clip1", 10]]),
        currentOffset: 5,
        snapTarget: null,
      });

      expect(useTimelineStore.getState().selectedClipIds.size).toBe(1);
      expect(useTimelineStore.getState().dragState).not.toBeNull();

      // Serialize and parse
      const json = useTimelineStore.getState().toJSON();
      useTimelineStore.getState().fromJSON(json);

      // Interaction state should be reset
      const state = useTimelineStore.getState();
      expect(state.selectedClipIds.size).toBe(0);
      expect(state.lastSelectedClipId).toBeNull();
      expect(state.dragState).toBeNull();
      expect(state.trimState).toBeNull();
    });

    it("should handle invalid JSON object", () => {
      expect(() => useTimelineStore.getState().fromJSON(null as any)).toThrow("Invalid JSON: Expected an object");

      expect(() => useTimelineStore.getState().fromJSON("string" as any)).toThrow("Invalid JSON: Expected an object");

      expect(() => useTimelineStore.getState().fromJSON(123 as any)).toThrow("Invalid JSON: Expected an object");
    });

    it("should clamp invalid zoom values to valid range", () => {
      const invalidZoomJSON = {
        clips: [],
        tracks: [],
        playhead: 0,
        pxPerSec: 1000, // Above maximum
      };

      useTimelineStore.getState().fromJSON(invalidZoomJSON as any);

      const state = useTimelineStore.getState();
      expect(state.pxPerSec).toBe(320); // Clamped to maximum
    });

    it("should preserve clip properties through serialization", () => {
      const complexClip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10.5,
        duration: 5.25,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 2.5,
        sourceEnd: 7.75,
        type: "video",
        filmstripUrl: "filmstrip.jpg",
        waveformPeaks: [0.1, 0.5, 0.8, 0.3],
        name: "Complex Clip",
        locked: true,
        muted: true,
      };

      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(complexClip);

      const json = useTimelineStore.getState().toJSON();
      useTimelineStore.setState({ clips: new Map(), tracks: new Map() });
      useTimelineStore.getState().fromJSON(json);

      const restoredClip = useTimelineStore.getState().clips.get("clip1");
      expect(restoredClip).toEqual(complexClip);
    });

    it("should preserve track properties through serialization", () => {
      const complexTrack: Track = {
        id: "track1",
        name: "Complex Track",
        type: "audio",
        order: 5,
        height: 120,
        locked: true,
        visible: false,
        muted: true,
        color: "#ff0000",
      };

      useTimelineStore.getState().addTrack(complexTrack);

      const json = useTimelineStore.getState().toJSON();
      useTimelineStore.setState({ tracks: new Map() });
      useTimelineStore.getState().fromJSON(json);

      const restoredTrack = useTimelineStore.getState().tracks.get("track1");
      expect(restoredTrack).toEqual(complexTrack);
    });

    it("should clear and reinitialize undo history after parsing", () => {
      useTimelineStore.getState().addTrack(mockTrack);
      useTimelineStore.getState().addClip(mockClip);

      // Create some undo history
      useTimelineStore.getState().updateClip("clip1", { name: "Updated" });
      useTimelineStore.getState().updateClip("clip1", { name: "Updated Again" });

      // Should be able to undo
      useTimelineStore.getState().undo();
      expect(useTimelineStore.getState().clips.get("clip1")?.name).toBe("Updated");

      // Serialize and parse
      const json = useTimelineStore.getState().toJSON();
      useTimelineStore.getState().fromJSON(json);

      // Undo should not work (history cleared)
      const stateBefore = useTimelineStore.getState().clips.get("clip1")?.name;
      useTimelineStore.getState().undo();
      const stateAfter = useTimelineStore.getState().clips.get("clip1")?.name;

      // State should not change (no undo history)
      expect(stateAfter).toBe(stateBefore);
    });
  });
});
