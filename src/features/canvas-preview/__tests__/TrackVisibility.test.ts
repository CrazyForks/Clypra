/**
 * Unit tests for Track Visibility
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { FrameResolver } from "../utils/FrameResolver";
import type { Clip, Track } from "../../timeline/types/core";

describe("Track Visibility - Unit Tests", () => {
  // Helper function to create a test clip
  const createClip = (id: string, trackId: string, startTime: number, duration: number): Clip => ({
    id,
    trackId,
    startTime,
    duration,
    sourceMediaPath: `${id}.mp4`,
    sourceStart: 0,
    sourceEnd: 100,
    type: "video",
    filmstripUrl: null,
    waveformPeaks: null,
    name: `Clip ${id}`,
    locked: false,
    muted: false,
  });

  // Helper function to create a test track
  const createTrack = (id: string, order: number, visible: boolean): Track => ({
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

  describe("Visibility Filtering with Specific Track States", () => {
    it("should filter out clips on a single invisible track", () => {
      const clip1 = createClip("clip1", "track1", 10, 10);
      const clips = new Map([[clip1.id, clip1]]);
      const tracks = new Map([["track1", createTrack("track1", 0, false)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(0);
    });

    it("should include clips on a single visible track", () => {
      const clip1 = createClip("clip1", "track1", 10, 10);
      const clips = new Map([[clip1.id, clip1]]);
      const tracks = new Map([["track1", createTrack("track1", 0, true)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip1");
    });

    it("should filter clips with alternating visible/invisible tracks", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);
      const clip4 = createClip("clip4", "track4", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
        [clip4.id, clip4],
      ]);

      const tracks = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)],
        ["track3", createTrack("track3", 2, true)],
        ["track4", createTrack("track4", 3, false)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(2);
      expect(activeClips.map((c) => c.id)).toEqual(["clip1", "clip3"]);
    });

    it("should return empty array when all tracks are invisible", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);

      const tracks = new Map([
        ["track1", createTrack("track1", 0, false)],
        ["track2", createTrack("track2", 1, false)],
        ["track3", createTrack("track3", 2, false)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      // Requirement 7.5: When all tracks are hidden, should return empty array
      expect(activeClips).toHaveLength(0);
    });

    it("should include all clips when all tracks are visible", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);

      const tracks = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, true)],
        ["track3", createTrack("track3", 2, true)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(3);
    });
  });

  describe("Re-rendering on Visibility Changes", () => {
    it("should detect visibility change from visible to invisible", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clips = new Map([[clip1.id, clip1]]);

      // Initially visible
      const tracksVisible = new Map([["track1", createTrack("track1", 0, true)]]);
      const resolver1 = new FrameResolver(clips, tracksVisible);
      const activeClips1 = resolver1.getActiveClips(15);

      expect(activeClips1).toHaveLength(1);

      // Change to invisible
      const tracksInvisible = new Map([["track1", createTrack("track1", 0, false)]]);
      const resolver2 = new FrameResolver(clips, tracksInvisible);
      const activeClips2 = resolver2.getActiveClips(15);

      expect(activeClips2).toHaveLength(0);
    });

    it("should detect visibility change from invisible to visible", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clips = new Map([[clip1.id, clip1]]);

      // Initially invisible
      const tracksInvisible = new Map([["track1", createTrack("track1", 0, false)]]);
      const resolver1 = new FrameResolver(clips, tracksInvisible);
      const activeClips1 = resolver1.getActiveClips(15);

      expect(activeClips1).toHaveLength(0);

      // Change to visible
      const tracksVisible = new Map([["track1", createTrack("track1", 0, true)]]);
      const resolver2 = new FrameResolver(clips, tracksVisible);
      const activeClips2 = resolver2.getActiveClips(15);

      expect(activeClips2).toHaveLength(1);
    });

    it("should handle multiple tracks changing visibility simultaneously", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);

      // Initial state: track1 visible, track2 invisible, track3 visible
      const tracksInitial = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)],
        ["track3", createTrack("track3", 2, true)],
      ]);

      const resolver1 = new FrameResolver(clips, tracksInitial);
      const activeClips1 = resolver1.getActiveClips(15);

      expect(activeClips1).toHaveLength(2);
      expect(activeClips1.map((c) => c.id)).toEqual(["clip1", "clip3"]);

      // Change state: track1 invisible, track2 visible, track3 invisible
      const tracksChanged = new Map([
        ["track1", createTrack("track1", 0, false)],
        ["track2", createTrack("track2", 1, true)],
        ["track3", createTrack("track3", 2, false)],
      ]);

      const resolver2 = new FrameResolver(clips, tracksChanged);
      const activeClips2 = resolver2.getActiveClips(15);

      expect(activeClips2).toHaveLength(1);
      expect(activeClips2.map((c) => c.id)).toEqual(["clip2"]);
    });
  });

  describe("Track Order with Mixed Visibility", () => {
    it("should maintain correct track order when some tracks are invisible", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);
      const clip4 = createClip("clip4", "track4", 10, 20);
      const clip5 = createClip("clip5", "track5", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
        [clip4.id, clip4],
        [clip5.id, clip5],
      ]);

      // Track order: 0, 1, 2, 3, 4
      // Visible: track1 (0), track3 (2), track5 (4)
      // Invisible: track2 (1), track4 (3)
      const tracks = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)],
        ["track3", createTrack("track3", 2, true)],
        ["track4", createTrack("track4", 3, false)],
        ["track5", createTrack("track5", 4, true)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      // Should only include clips from visible tracks
      expect(activeClips).toHaveLength(3);
      expect(activeClips.map((c) => c.id)).toEqual(["clip1", "clip3", "clip5"]);

      // Should maintain correct track order
      expect(activeClips[0].trackIndex).toBe(0);
      expect(activeClips[1].trackIndex).toBe(2);
      expect(activeClips[2].trackIndex).toBe(4);

      // Verify ascending order
      for (let i = 1; i < activeClips.length; i++) {
        expect(activeClips[i].trackIndex).toBeGreaterThan(activeClips[i - 1].trackIndex);
      }
    });

    it("should handle non-sequential track orders with mixed visibility", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);
      const clip4 = createClip("clip4", "track4", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
        [clip4.id, clip4],
      ]);

      // Non-sequential track orders: 10, 5, 20, 15
      // Visible: track2 (5), track4 (15)
      // Invisible: track1 (10), track3 (20)
      const tracks = new Map([
        ["track1", createTrack("track1", 10, false)],
        ["track2", createTrack("track2", 5, true)],
        ["track3", createTrack("track3", 20, false)],
        ["track4", createTrack("track4", 15, true)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      // Should only include clips from visible tracks
      expect(activeClips).toHaveLength(2);

      // Should be sorted by track order: track2 (5) before track4 (15)
      expect(activeClips[0].id).toBe("clip2");
      expect(activeClips[1].id).toBe("clip4");
      expect(activeClips[0].trackIndex).toBe(5);
      expect(activeClips[1].trackIndex).toBe(15);
    });

    it("should handle single visible track among many invisible tracks", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);
      const clip4 = createClip("clip4", "track4", 10, 20);
      const clip5 = createClip("clip5", "track5", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
        [clip4.id, clip4],
        [clip5.id, clip5],
      ]);

      // Only track3 is visible
      const tracks = new Map([
        ["track1", createTrack("track1", 0, false)],
        ["track2", createTrack("track2", 1, false)],
        ["track3", createTrack("track3", 2, true)],
        ["track4", createTrack("track4", 3, false)],
        ["track5", createTrack("track5", 4, false)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(1);
      expect(activeClips[0].id).toBe("clip3");
      expect(activeClips[0].trackIndex).toBe(2);
    });

    it("should preserve track order when visibility changes", () => {
      const clip1 = createClip("clip1", "track1", 10, 20);
      const clip2 = createClip("clip2", "track2", 10, 20);
      const clip3 = createClip("clip3", "track3", 10, 20);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);

      // Initial: all visible
      const tracksAllVisible = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, true)],
        ["track3", createTrack("track3", 2, true)],
      ]);

      const resolver1 = new FrameResolver(clips, tracksAllVisible);
      const activeClips1 = resolver1.getActiveClips(15);

      expect(activeClips1).toHaveLength(3);
      expect(activeClips1.map((c) => c.id)).toEqual(["clip1", "clip2", "clip3"]);

      // Hide middle track
      const tracksMiddleHidden = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)],
        ["track3", createTrack("track3", 2, true)],
      ]);

      const resolver2 = new FrameResolver(clips, tracksMiddleHidden);
      const activeClips2 = resolver2.getActiveClips(15);

      expect(activeClips2).toHaveLength(2);
      expect(activeClips2.map((c) => c.id)).toEqual(["clip1", "clip3"]);
      expect(activeClips2[0].trackIndex).toBe(0);
      expect(activeClips2[1].trackIndex).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle track with no clips", () => {
      const clips = new Map();
      const tracks = new Map([
        ["track1", createTrack("track1", 0, true)],
        ["track2", createTrack("track2", 1, false)],
      ]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      expect(activeClips).toHaveLength(0);
    });

    it("should handle clip on non-existent track as invisible", () => {
      const clip1 = createClip("clip1", "nonexistent", 10, 20);
      const clips = new Map([[clip1.id, clip1]]);
      const tracks = new Map([["track1", createTrack("track1", 0, true)]]);

      const resolver = new FrameResolver(clips, tracks);
      const activeClips = resolver.getActiveClips(15);

      // Clip on non-existent track should be filtered out
      expect(activeClips).toHaveLength(0);
    });

    it("should handle multiple clips on same invisible track", () => {
      const clip1 = createClip("clip1", "track1", 10, 5);
      const clip2 = createClip("clip2", "track1", 20, 5);
      const clip3 = createClip("clip3", "track1", 30, 5);

      const clips = new Map([
        [clip1.id, clip1],
        [clip2.id, clip2],
        [clip3.id, clip3],
      ]);

      const tracks = new Map([["track1", createTrack("track1", 0, false)]]);

      const resolver = new FrameResolver(clips, tracks);

      // All clips should be filtered out
      expect(resolver.getActiveClips(12)).toHaveLength(0);
      expect(resolver.getActiveClips(22)).toHaveLength(0);
      expect(resolver.getActiveClips(32)).toHaveLength(0);
    });
  });
});
