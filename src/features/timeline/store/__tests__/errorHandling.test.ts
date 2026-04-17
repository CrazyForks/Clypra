/**
 * Unit tests for error handling in Timeline Store
 * Requirements: 22.5, 22.6, 22.7
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTimelineStore } from "../timelineStore";
import { TimelineError, ErrorCodes } from "../../types/errors";
import type { Clip, Track } from "../../types/core";

describe("Timeline Store Error Handling", () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useTimelineStore.getState();
    store.clips.clear();
    store.tracks.clear();
    store.selectedClipIds.clear();
    store.clearHistory();
  });

  describe("addClip error handling", () => {
    it("should throw TimelineError when track does not exist", () => {
      const store = useTimelineStore.getState();

      const clip: Clip = {
        id: "clip1",
        trackId: "nonexistent-track",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: false,
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };

      expect(() => store.addClip(clip)).toThrow(TimelineError);
      expect(() => store.addClip(clip)).toThrow("Track nonexistent-track not found");
    });

    it("should throw TimelineError when clip type incompatible with track type", () => {
      const store = useTimelineStore.getState();

      // Add audio track
      const track: Track = {
        id: "track1",
        name: "Audio Track",
        type: "audio",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#10b981",
      };
      store.addTrack(track);

      // Try to add text clip to audio track
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/text.txt",
        sourceStart: 0,
        sourceEnd: 5,
        type: "text",
        name: "Test Clip",
        locked: false,
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };

      expect(() => store.addClip(clip)).toThrow(TimelineError);
      expect(() => store.addClip(clip)).toThrow("Cannot place text clip on audio track");
    });

    it("should throw TimelineError when clip duration is too short", () => {
      const store = useTimelineStore.getState();

      // Add video track
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      // Try to add clip with duration < 0.1 seconds
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 0.05, // Too short
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 0.05,
        type: "video",
        name: "Test Clip",
        locked: false,
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };

      expect(() => store.addClip(clip)).toThrow(TimelineError);
      expect(() => store.addClip(clip)).toThrow("Clip duration must be at least");
    });
  });

  describe("updateClip error handling", () => {
    it("should throw TimelineError when updating locked clip", () => {
      const store = useTimelineStore.getState();

      // Add track and locked clip
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: true, // Locked
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      // Try to update locked clip
      expect(() => store.updateClip("clip1", { startTime: 10 })).toThrow(TimelineError);
      expect(() => store.updateClip("clip1", { startTime: 10 })).toThrow("Cannot update locked clip");
    });

    it("should throw TimelineError when clip does not exist", () => {
      const store = useTimelineStore.getState();

      expect(() => store.updateClip("nonexistent", { startTime: 10 })).toThrow(TimelineError);
      expect(() => store.updateClip("nonexistent", { startTime: 10 })).toThrow("Clip nonexistent not found");
    });
  });

  describe("deleteClip error handling", () => {
    it("should throw TimelineError when deleting locked clip", () => {
      const store = useTimelineStore.getState();

      // Add track and locked clip
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: true, // Locked
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      // Try to delete locked clip
      expect(() => store.deleteClip("clip1")).toThrow(TimelineError);
      expect(() => store.deleteClip("clip1")).toThrow("Cannot delete locked clip");
    });
  });

  describe("moveClip error handling", () => {
    it("should throw TimelineError when moving locked clip", () => {
      const store = useTimelineStore.getState();

      // Add track and locked clip
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: true, // Locked
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      // Try to move locked clip
      expect(() => store.moveClip("clip1", 10, "track1")).toThrow(TimelineError);
      expect(() => store.moveClip("clip1", 10, "track1")).toThrow("Cannot move locked clip");
    });
  });

  describe("trimClip error handling", () => {
    it("should throw TimelineError when trimming locked clip", () => {
      const store = useTimelineStore.getState();

      // Add track and locked clip
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: true, // Locked
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      // Try to trim locked clip
      expect(() => store.trimClip("clip1", 0, 3)).toThrow(TimelineError);
      expect(() => store.trimClip("clip1", 0, 3)).toThrow("Cannot trim locked clip");
    });
  });

  describe("splitClip error handling", () => {
    it("should throw TimelineError when splitting locked clip", () => {
      const store = useTimelineStore.getState();

      // Add track and locked clip
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: true, // Locked
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      // Try to split locked clip
      expect(() => store.splitClip("clip1", 2.5)).toThrow(TimelineError);
      expect(() => store.splitClip("clip1", 2.5)).toThrow("Cannot split locked clip");
    });

    it("should throw TimelineError when split time is outside clip boundaries", () => {
      const store = useTimelineStore.getState();

      // Add track and clip
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: false,
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      // Try to split outside boundaries
      expect(() => store.splitClip("clip1", 5)).toThrow(TimelineError);
      expect(() => store.splitClip("clip1", 5)).toThrow("outside clip boundaries");

      expect(() => store.splitClip("clip1", 20)).toThrow(TimelineError);
      expect(() => store.splitClip("clip1", 20)).toThrow("outside clip boundaries");
    });
  });

  describe("State recovery (Requirement 22.7)", () => {
    it("should not modify state when operation fails", () => {
      const store = useTimelineStore.getState();

      // Add track
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      // Add valid clip
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: false,
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      const initialClipCount = store.clips.size;

      // Try to add invalid clip (should fail)
      const invalidClip: Clip = {
        id: "clip2",
        trackId: "nonexistent-track",
        startTime: 0,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Invalid Clip",
        locked: false,
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };

      try {
        store.addClip(invalidClip);
      } catch (error) {
        // Expected to throw
      }

      // State should remain unchanged
      expect(store.clips.size).toBe(initialClipCount);
      expect(store.clips.has("clip2")).toBe(false);
    });
  });

  describe("Error messages are descriptive (Requirement 22.5)", () => {
    it("should provide descriptive error messages", () => {
      const store = useTimelineStore.getState();

      // Test various error scenarios and check message quality
      try {
        store.updateClip("nonexistent", { startTime: 10 });
      } catch (error) {
        expect(error).toBeInstanceOf(TimelineError);
        expect((error as TimelineError).message).toContain("nonexistent");
        expect((error as TimelineError).message).toContain("not found");
      }

      // Add track and clip for split test
      const track: Track = {
        id: "track1",
        name: "Video Track",
        type: "video",
        order: 0,
        height: 60,
        locked: false,
        visible: true,
        muted: false,
        color: "#0d9488",
      };
      store.addTrack(track);

      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 10,
        duration: 5,
        sourceMediaPath: "/path/to/video.mp4",
        sourceStart: 0,
        sourceEnd: 5,
        type: "video",
        name: "Test Clip",
        locked: false,
        muted: false,
        filmstripUrl: null,
        waveformPeaks: null,
      };
      store.addClip(clip);

      try {
        store.splitClip("clip1", 5);
      } catch (error) {
        expect(error).toBeInstanceOf(TimelineError);
        const message = (error as TimelineError).message;
        // Should include specific time values
        expect(message).toMatch(/\d+\.\d+s/); // Contains time in seconds
        expect(message).toContain("outside clip boundaries");
      }
    });
  });
});
