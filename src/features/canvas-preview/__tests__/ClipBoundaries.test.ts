/**
 * Unit tests for Clip Boundary Handling
 * Task 19.2: Write unit tests for clip boundaries
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 */

import { describe, it, expect } from "vitest";
import { FrameResolver } from "../utils/FrameResolver";
import type { Clip, Track } from "../../timeline/types/core";

describe("Clip Boundary Handling - Unit Tests", () => {
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

  describe("Clip Appearance at Start Time (Requirement 24.1)", () => {
    it("should detect clip exactly at start time", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
      expect(activeClips[0].clipTime).toBe(0); // sourceStart
    });

    it("should detect clip at start time with non-zero sourceStart", () => {
      const clip = createClip("clip1", "track1", 15, 8, 3, 15);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].clipTime).toBe(3); // sourceStart
    });

    it("should detect clip at start time = 0", () => {
      const clip = createClip("clip1", "track1", 0, 10, 0, 20);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(0);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
    });

    it("should detect clip one frame after start time", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10.001);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
    });
  });

  describe("Clip Disappearance at End Time (Requirement 24.2)", () => {
    it("should NOT detect clip exactly at end time (exclusive boundary)", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const endTime = clip.startTime + clip.duration; // 15
      const activeClips = resolver.getActiveClips(endTime);

      expect(activeClips).toHaveLength(0);
    });

    it("should detect clip one frame before end time", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const almostEndTime = clip.startTime + clip.duration - 0.001; // 14.999
      const activeClips = resolver.getActiveClips(almostEndTime);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
    });

    it("should NOT detect clip after end time", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const afterEndTime = clip.startTime + clip.duration + 0.001; // 15.001
      const activeClips = resolver.getActiveClips(afterEndTime);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle clip ending at timeline duration", () => {
      const timelineDuration = 100;
      const clip = createClip("clip1", "track1", 95, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active just before end
      const activeClipsBefore = resolver.getActiveClips(99.999);
      expect(activeClipsBefore).toHaveLength(1);

      // Should NOT be active at timeline duration
      const activeClipsAt = resolver.getActiveClips(timelineDuration);
      expect(activeClipsAt).toHaveLength(0);
    });
  });

  describe("Half-Open Interval [start, end) (Requirement 24.3)", () => {
    it("should use inclusive start and exclusive end", () => {
      const clip = createClip("clip1", "track1", 20, 10, 0, 20);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Test at start (inclusive)
      expect(resolver.getActiveClips(20)).toHaveLength(1);

      // Test in middle
      expect(resolver.getActiveClips(25)).toHaveLength(1);

      // Test at end (exclusive)
      expect(resolver.getActiveClips(30)).toHaveLength(0);
    });

    it("should handle adjacent clips correctly", () => {
      const clip1 = createClip("clip1", "track1", 0, 10, 0, 20);
      const clip2 = createClip("clip2", "track1", 10, 10, 0, 20);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
      ]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // At time 9.999, only clip1 should be active
      const activeClips1 = resolver.getActiveClips(9.999);
      expect(activeClips1).toHaveLength(1);
      expect(activeClips1[0].id).toBe("clip1");

      // At time 10, only clip2 should be active (clip1 ends, clip2 starts)
      const activeClips2 = resolver.getActiveClips(10);
      expect(activeClips2).toHaveLength(1);
      expect(activeClips2[0].id).toBe("clip2");

      // At time 10.001, only clip2 should be active
      const activeClips3 = resolver.getActiveClips(10.001);
      expect(activeClips3).toHaveLength(1);
      expect(activeClips3[0].id).toBe("clip2");
    });
  });

  describe("Zero-Duration Clips (Requirement 24.4)", () => {
    it("should NOT detect zero-duration clip at start time", () => {
      const clip = createClip("clip1", "track1", 10, 0, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(10);

      // Zero-duration clips should never be active
      expect(activeClips).toHaveLength(0);
    });

    it("should NOT detect zero-duration clip at any time", () => {
      const clip = createClip("clip1", "track1", 50, 0, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Test at various times
      expect(resolver.getActiveClips(49.999)).toHaveLength(0);
      expect(resolver.getActiveClips(50)).toHaveLength(0);
      expect(resolver.getActiveClips(50.001)).toHaveLength(0);
    });

    it("should handle mix of zero-duration and normal clips", () => {
      const clip1 = createClip("clip1", "track1", 10, 0, 0, 10); // zero duration
      const clip2 = createClip("clip2", "track2", 10, 5, 0, 10); // normal
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 0)],
        ["track2", createTrack("track2", 1)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(12);

      // Only the normal clip should be active
      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip2");
    });
  });

  describe("Clips at Timeline Boundaries (Requirements 24.5, 24.6)", () => {
    it("should handle clip starting at time 0", () => {
      const clip = createClip("clip1", "track1", 0, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active at time 0
      const activeClips = resolver.getActiveClips(0);
      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
      expect(activeClips[0].clipTime).toBe(0);
    });

    it("should handle clip ending at timeline duration", () => {
      const timelineDuration = 100;
      const clip = createClip("clip1", "track1", 90, 10, 0, 20);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active just before timeline duration
      const activeClipsBefore = resolver.getActiveClips(timelineDuration - 0.001);
      expect(activeClipsBefore).toHaveLength(1);

      // Should NOT be active at timeline duration (exclusive end)
      const activeClipsAt = resolver.getActiveClips(timelineDuration);
      expect(activeClipsAt).toHaveLength(0);
    });

    it("should handle clip spanning entire timeline", () => {
      const timelineDuration = 100;
      const clip = createClip("clip1", "track1", 0, timelineDuration, 0, 200);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active at start
      expect(resolver.getActiveClips(0)).toHaveLength(1);

      // Should be active in middle
      expect(resolver.getActiveClips(50)).toHaveLength(1);

      // Should be active just before end
      expect(resolver.getActiveClips(99.999)).toHaveLength(1);

      // Should NOT be active at end
      expect(resolver.getActiveClips(timelineDuration)).toHaveLength(0);
    });

    it("should handle multiple clips at timeline start", () => {
      const clip1 = createClip("clip1", "track1", 0, 10, 0, 20);
      const clip2 = createClip("clip2", "track2", 0, 15, 0, 30);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 0)],
        ["track2", createTrack("track2", 1)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(0);

      expect(activeClips).toHaveLength(2);
      expect(activeClips[0].id).toBe("clip1");
      expect(activeClips[1].id).toBe("clip2");
    });

    it("should handle clips at very large timeline positions", () => {
      const largeTime = 10000;
      const clip = createClip("clip1", "track1", largeTime, 100, 0, 200);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active at start
      expect(resolver.getActiveClips(largeTime)).toHaveLength(1);

      // Should be active in middle
      expect(resolver.getActiveClips(largeTime + 50)).toHaveLength(1);

      // Should NOT be active at end
      expect(resolver.getActiveClips(largeTime + 100)).toHaveLength(0);
    });
  });

  describe("Edge Cases and Precision", () => {
    it("should handle very small durations (near zero but not zero)", () => {
      const clip = createClip("clip1", "track1", 10, 0.001, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active at start
      expect(resolver.getActiveClips(10)).toHaveLength(1);

      // Should be active in the tiny duration
      expect(resolver.getActiveClips(10.0005)).toHaveLength(1);

      // Should NOT be active at end
      expect(resolver.getActiveClips(10.001)).toHaveLength(0);
    });

    it("should handle floating point precision at boundaries", () => {
      const clip = createClip("clip1", "track1", 10.333, 5.667, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active at start
      expect(resolver.getActiveClips(10.333)).toHaveLength(1);

      // Should be active just before end
      const endTime = 10.333 + 5.667;
      expect(resolver.getActiveClips(endTime - 0.0001)).toHaveLength(1);

      // Should NOT be active at end
      expect(resolver.getActiveClips(endTime)).toHaveLength(0);
    });

    it("should handle clip with start time before 0 (invalid but defensive)", () => {
      const clip = createClip("clip1", "track1", -5, 10, 0, 20);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should be active at time 0 (within clip range)
      expect(resolver.getActiveClips(0)).toHaveLength(1);

      // Should be active at time 3
      expect(resolver.getActiveClips(3)).toHaveLength(1);

      // Should NOT be active at time 5 (end of clip)
      expect(resolver.getActiveClips(5)).toHaveLength(0);
    });

    it("should handle transition between clips with no gap", () => {
      const clip1 = createClip("clip1", "track1", 5, 10, 0, 20);
      const clip2 = createClip("clip2", "track1", 15, 10, 0, 20);
      const clip3 = createClip("clip3", "track1", 25, 10, 0, 20);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);
      const tracks = new Map([["track1", createTrack("track1", 0)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Test transitions
      expect(resolver.getActiveClips(14.999)[0].id).toBe("clip1");
      expect(resolver.getActiveClips(15)[0].id).toBe("clip2");
      expect(resolver.getActiveClips(15.001)[0].id).toBe("clip2");
      expect(resolver.getActiveClips(24.999)[0].id).toBe("clip2");
      expect(resolver.getActiveClips(25)[0].id).toBe("clip3");
      expect(resolver.getActiveClips(25.001)[0].id).toBe("clip3");
    });
  });

  describe("Boundary Detection with Track Visibility", () => {
    it("should respect track visibility at clip boundaries", () => {
      const clip = createClip("clip1", "track1", 10, 5, 0, 10);
      const clips = new Map([[clip.id, clip]]);
      const tracks = new Map([["track1", createTrack("track1", 0, false)]]);

      const resolver = new FrameResolver(clips, tracks);

      // Should NOT be active even at start time (track invisible)
      expect(resolver.getActiveClips(10)).toHaveLength(0);
      expect(resolver.getActiveClips(12)).toHaveLength(0);
      expect(resolver.getActiveClips(14.999)).toHaveLength(0);
    });

    it("should handle visibility changes at boundaries", () => {
      const clip1 = createClip("clip1", "track1", 10, 5, 0, 10);
      const clip2 = createClip("clip2", "track2", 10, 5, 0, 10);
      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
      ]);
      const tracks = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)],
      ]);

      const resolver = new FrameResolver(clips, tracks);

      // At start, only visible track's clip should be active
      const activeClips = resolver.getActiveClips(10);
      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
    });
  });
});
