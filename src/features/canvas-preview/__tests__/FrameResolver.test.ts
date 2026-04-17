/**
 * Unit tests for FrameResolver
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { describe, it, expect } from "vitest";
import { FrameResolver } from "../utils/FrameResolver";
import type { Clip, Track } from "../../timeline/types/core";

describe("FrameResolver - Unit Tests", () => {
  // Helper function to create a test clip
  const createClip = (id: string, trackId: string, startTime: number, duration: number, sourceStart: number, sourceEnd: number): Clip => ({
    id,
    trackId,
    startTime,
    duration,
    sourceMediaPath: `${id}.mp4`,
    sourceStart,
    sourceEnd,
    type: "video",
    filmstripUrl: null,
    waveformPeaks: null,
    name: `Clip ${id}`,
    locked: false,
    muted: false,
  });

  // Helper function to create a test track
  const createTrack = (id: string, order: number, visible: boolean = true): Track => ({
    id,
    name: `Track ${id}`,
    type: "video",
    order,
    height: 100,
    locked: false,
    visible,
    muted: false,
    color: "#ffffff",
  });

  describe("Active Clip Detection", () => {
    it("should detect clip at the start time", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
    });

    it("should detect clip in the middle of its duration", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(12.5);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
    });

    it("should not detect clip at the end time (exclusive)", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(0);
    });

    it("should not detect clip before start time", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(9.99);

      expect(activeClips).toHaveLength(0);
    });

    it("should detect multiple overlapping clips", () => {
      const clip1 = createClip("clip1", "track1", 10, 10, 0, 20);
      const clip2 = createClip("clip2", "track2", 15, 10, 0, 20);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 0)],
        ["track2", createTrack("track2", 1)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(17);

      expect(activeClips).toHaveLength(2);
    });
  });

  describe("Clip Time Calculation", () => {
    it("should calculate clip time at clip start", () => {
      const clip = createClip("clip1", "track1", 10, 5, 2, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].clipTime).toBe(2); // sourceStart
    });

    it("should calculate clip time in the middle", () => {
      const clip = createClip("clip1", "track1", 10, 5, 2, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(12);

      expect(activeClips).toHaveLength(1);
      // clipTime = sourceStart + (timelineTime - startTime)
      // clipTime = 2 + (12 - 10) = 4
      expect(activeClips[0].clipTime).toBe(4);
    });

    it("should handle trimmed clips with sourceStart > 0", () => {
      const clip = createClip("clip1", "track1", 10, 3, 5, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(11);

      expect(activeClips).toHaveLength(1);
      // clipTime = 5 + (11 - 10) = 6
      expect(activeClips[0].clipTime).toBe(6);
    });

    it("should clamp clip time to sourceEnd boundary", () => {
      const clip = createClip("clip1", "track1", 10, 10, 0, 5);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(18);

      expect(activeClips).toHaveLength(1);
      // Without clamping: clipTime = 0 + (18 - 10) = 8
      // With clamping: clipTime = min(8, 5) = 5
      expect(activeClips[0].clipTime).toBe(5);
    });

    it("should clamp clip time to sourceStart boundary", () => {
      const clip = createClip("clip1", "track1", 10, 5, 3, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10);

      expect(activeClips).toHaveLength(1);
      // clipTime should be at least sourceStart
      expect(activeClips[0].clipTime).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Track Visibility Filtering", () => {
    it("should include clips on visible tracks", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0, true)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(12);

      expect(activeClips).toHaveLength(1);
    });

    it("should exclude clips on invisible tracks", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0, false)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(12);

      expect(activeClips).toHaveLength(0);
    });

    it("should filter mixed visibility tracks correctly", () => {
      const clip1 = createClip("clip1", "track1", 10, 10, 0, 20);
      const clip2 = createClip("clip2", "track2", 10, 10, 0, 20);
      const clip3 = createClip("clip3", "track3", 10, 10, 0, 20);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)],
        ["track3", createTrack("track3", 2, true)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(2);
      expect(activeClips.map((c) => c.id)).toEqual(["clip1", "clip3"]);
    });

    it("should handle clips with non-existent tracks", () => {
      const clip = createClip("clip1", "nonexistent", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map();

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(12);

      expect(activeClips).toHaveLength(0);
    });
  });

  describe("Track Order Sorting", () => {
    it("should sort clips by track order ascending", () => {
      const clip1 = createClip("clip1", "track1", 10, 10, 0, 20);
      const clip2 = createClip("clip2", "track2", 10, 10, 0, 20);
      const clip3 = createClip("clip3", "track3", 10, 10, 0, 20);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 2)],
        ["track2", createTrack("track2", 0)],
        ["track3", createTrack("track3", 1)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(3);
      expect(activeClips[0].trackIndex).toBe(0);
      expect(activeClips[1].trackIndex).toBe(1);
      expect(activeClips[2].trackIndex).toBe(2);
      expect(activeClips.map((c) => c.id)).toEqual(["clip2", "clip3", "clip1"]);
    });

    it("should handle tracks with same order", () => {
      const clip1 = createClip("clip1", "track1", 10, 10, 0, 20);
      const clip2 = createClip("clip2", "track2", 10, 10, 0, 20);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 1)],
        ["track2", createTrack("track2", 1)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(2);
      // Both should have same trackIndex
      expect(activeClips[0].trackIndex).toBe(1);
      expect(activeClips[1].trackIndex).toBe(1);
    });
  });

  describe("Boundary Cases", () => {
    it("should handle time 0", () => {
      const clip = createClip("clip1", "track1", 0, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].clipTime).toBe(0);
    });

    it("should handle clips at timeline duration", () => {
      const timelineDuration = 100;
      const clip = createClip("clip1", "track1", 95, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(99);

      expect(activeClips).toHaveLength(1);
    });

    it("should handle zero-duration clips", () => {
      const clip = createClip("clip1", "track1", 10, 0, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10);

      // Zero-duration clips should not be active
      expect(activeClips).toHaveLength(0);
    });

    it("should return empty array for empty timeline", () => {
      const clips = new Map();
      const tracks = new Map();

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(50);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle very small durations", () => {
      const clip = createClip("clip1", "track1", 10, 0.001, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10.0005);

      expect(activeClips).toHaveLength(1);
    });

    it("should handle large timeline values", () => {
      const clip = createClip("clip1", "track1", 10000, 100, 0, 200);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10050);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].clipTime).toBe(50);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle multiple clips on same track", () => {
      const clip1 = createClip("clip1", "track1", 0, 10, 0, 20);
      const clip2 = createClip("clip2", "track1", 15, 10, 0, 20);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
      ]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // At time 5, only clip1 is active
      const activeClips1 = resolver.getActiveClips(5);
      expect(activeClips1).toHaveLength(1);
      expect(activeClips1[0].id).toBe("clip1");

      // At time 20, only clip2 is active
      const activeClips2 = resolver.getActiveClips(20);
      expect(activeClips2).toHaveLength(1);
      expect(activeClips2[0].id).toBe("clip2");
    });

    it("should handle complex multi-track scenario", () => {
      const clip1 = createClip("clip1", "track1", 0, 20, 0, 30);
      const clip2 = createClip("clip2", "track2", 5, 15, 0, 30);
      const clip3 = createClip("clip3", "track3", 10, 10, 0, 30);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)], // invisible
        ["track3", createTrack("track3", 2, true)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      // Only clip1 and clip3 should be active (clip2 is on invisible track)
      expect(activeClips).toHaveLength(2);
      expect(activeClips[0].id).toBe("clip1");
      expect(activeClips[1].id).toBe("clip3");

      // Verify correct track order
      expect(activeClips[0].trackIndex).toBe(0);
      expect(activeClips[1].trackIndex).toBe(2);

      // Verify correct clip times
      expect(activeClips[0].clipTime).toBe(15); // 0 + (15 - 0)
      expect(activeClips[1].clipTime).toBe(5); // 0 + (15 - 10)
    });
  });
});
