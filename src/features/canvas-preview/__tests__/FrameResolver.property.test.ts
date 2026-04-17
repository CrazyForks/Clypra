/**
 * Property-based tests for FrameResolver
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.2, 14.3, 14.6, 14.7
 * Requirements: 24.1, 24.2, 24.3, 24.7
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { FrameResolver } from "../utils/FrameResolver";
import type { Clip, Track } from "../../timeline/types/core";

describe("FrameResolver - Property Tests", () => {
  // Feature: canvas-preview-system-v2, Property 8: Active Clip Detection
  // **Validates: Requirements 2.1, 24.1, 24.2, 24.3, 24.7**
  it("Property 8: should include clip in active clips iff timelineTime is within clip range", () => {
    fc.assert(
      fc.property(
        // Generate a clip with random properties
        fc.record({
          id: fc.string(),
          trackId: fc.constant("track1"),
          startTime: fc.integer({ min: 0, max: 1000 }),
          duration: fc.integer({ min: 1, max: 100 }),
          sourceMediaPath: fc.constant("test.mp4"),
          sourceStart: fc.integer({ min: 0, max: 100 }),
          sourceEnd: fc.integer({ min: 100, max: 200 }),
          type: fc.constant("video" as const),
          filmstripUrl: fc.constant(null),
          waveformPeaks: fc.constant(null),
          name: fc.constant("Test Clip"),
          locked: fc.constant(false),
          muted: fc.constant(false),
        }),
        // Generate a random timeline time
        fc.integer({ min: 0, max: 1100 }),
        (clip, timelineTime) => {
          const clipEnd = clip.startTime + clip.duration;
          const shouldBeActive = timelineTime >= clip.startTime && timelineTime < clipEnd;

          const clips = new Map<string, Clip>([[clip.id, clip as Clip]]);
          const tracks = new Map<string, Track>([
            [
              "track1",
              {
                id: "track1",
                name: "Track 1",
                type: "video",
                order: 0,
                height: 100,
                locked: false,
                visible: true,
                muted: false,
                color: "#ffffff",
              },
            ],
          ]);

          const frameResolver = new FrameResolver(clips, tracks);
          const activeClips = frameResolver.getActiveClips(timelineTime);
          const isActive = activeClips.length > 0;

          expect(isActive).toBe(shouldBeActive);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 9: Clip Time Calculation Formula
  // **Validates: Requirements 2.2, 14.1**
  it("Property 9: should calculate clip time using formula: clipTime = sourceStart + (timelineTime - startTime)", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          trackId: fc.constant("track1"),
          startTime: fc.integer({ min: 0, max: 1000 }),
          duration: fc.integer({ min: 1, max: 100 }),
          sourceMediaPath: fc.constant("test.mp4"),
          sourceStart: fc.integer({ min: 0, max: 50 }),
          sourceEnd: fc.integer({ min: 100, max: 200 }),
          type: fc.constant("video" as const),
          filmstripUrl: fc.constant(null),
          waveformPeaks: fc.constant(null),
          name: fc.constant("Test Clip"),
          locked: fc.constant(false),
          muted: fc.constant(false),
        }),
        (clip) => {
          // Test at the midpoint of the clip
          const timelineTime = clip.startTime + Math.floor(clip.duration / 2);
          const expectedClipTime = clip.sourceStart + (timelineTime - clip.startTime);

          const clips = new Map<string, Clip>([[clip.id, clip as Clip]]);
          const tracks = new Map<string, Track>([
            [
              "track1",
              {
                id: "track1",
                name: "Track 1",
                type: "video",
                order: 0,
                height: 100,
                locked: false,
                visible: true,
                muted: false,
                color: "#ffffff",
              },
            ],
          ]);

          const frameResolver = new FrameResolver(clips, tracks);
          const activeClips = frameResolver.getActiveClips(timelineTime);

          expect(activeClips).toHaveLength(1);

          const actualClipTime = activeClips[0].clipTime;

          // Requirement 14.7: Maintain accuracy within 0.001 seconds
          expect(Math.abs(actualClipTime - expectedClipTime)).toBeLessThan(0.001);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 10: Clip Time Boundary Clamping
  // **Validates: Requirements 2.6, 14.2, 14.3**
  it("Property 10: should clamp clip time to source boundaries [sourceStart, sourceEnd]", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          trackId: fc.constant("track1"),
          startTime: fc.integer({ min: 0, max: 1000 }),
          duration: fc.integer({ min: 1, max: 100 }),
          sourceMediaPath: fc.constant("test.mp4"),
          sourceStart: fc.integer({ min: 0, max: 100 }),
          sourceEnd: fc.integer({ min: 100, max: 200 }),
          type: fc.constant("video" as const),
          filmstripUrl: fc.constant(null),
          waveformPeaks: fc.constant(null),
          name: fc.constant("Test Clip"),
          locked: fc.constant(false),
          muted: fc.constant(false),
        }),
        fc.integer({ min: 0, max: 1100 }),
        (clip, timelineTime) => {
          const clips = new Map<string, Clip>([[clip.id, clip as Clip]]);
          const tracks = new Map<string, Track>([
            [
              "track1",
              {
                id: "track1",
                name: "Track 1",
                type: "video",
                order: 0,
                height: 100,
                locked: false,
                visible: true,
                muted: false,
                color: "#ffffff",
              },
            ],
          ]);

          const frameResolver = new FrameResolver(clips, tracks);
          const activeClips = frameResolver.getActiveClips(timelineTime);

          // Only check if clip is active
          if (activeClips.length > 0) {
            const clipTime = activeClips[0].clipTime;

            // Clip time must be within source boundaries
            expect(clipTime).toBeGreaterThanOrEqual(clip.sourceStart);
            expect(clipTime).toBeLessThanOrEqual(clip.sourceEnd);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 11: Invisible Track Filtering
  // **Validates: Requirements 2.3, 7.2**
  it("Property 11: should exclude clips on invisible tracks from active clips", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          trackId: fc.constant("track1"),
          startTime: fc.integer({ min: 0, max: 1000 }),
          duration: fc.integer({ min: 1, max: 100 }),
          sourceMediaPath: fc.constant("test.mp4"),
          sourceStart: fc.integer({ min: 0, max: 100 }),
          sourceEnd: fc.integer({ min: 100, max: 200 }),
          type: fc.constant("video" as const),
          filmstripUrl: fc.constant(null),
          waveformPeaks: fc.constant(null),
          name: fc.constant("Test Clip"),
          locked: fc.constant(false),
          muted: fc.constant(false),
        }),
        fc.boolean(),
        (clip, trackVisible) => {
          // Test at the midpoint of the clip
          const timelineTime = clip.startTime + Math.floor(clip.duration / 2);

          const clips = new Map<string, Clip>([[clip.id, clip as Clip]]);
          const tracks = new Map<string, Track>([
            [
              "track1",
              {
                id: "track1",
                name: "Track 1",
                type: "video",
                order: 0,
                height: 100,
                locked: false,
                visible: trackVisible,
                muted: false,
                color: "#ffffff",
              },
            ],
          ]);

          const frameResolver = new FrameResolver(clips, tracks);
          const activeClips = frameResolver.getActiveClips(timelineTime);

          // Clip should only be active if track is visible
          if (trackVisible) {
            expect(activeClips).toHaveLength(1);
          } else {
            expect(activeClips).toHaveLength(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 12: Track Order Sorting
  // **Validates: Requirements 2.4, 8.1**
  it("Property 12: should sort active clips by track order in ascending order", () => {
    fc.assert(
      fc.property(
        // Generate multiple clips on different tracks
        fc
          .array(
            fc.record({
              clipId: fc.string(),
              trackId: fc.string(),
              trackOrder: fc.integer({ min: 0, max: 10 }),
              startTime: fc.integer({ min: 0, max: 100 }),
              duration: fc.integer({ min: 10, max: 50 }),
            }),
            { minLength: 2, maxLength: 5 },
          )
          .map((items) => {
            // Ensure unique IDs
            return items.map((item, index) => ({
              ...item,
              clipId: `clip${index}`,
              trackId: `track${index}`,
            }));
          }),
        (clipConfigs) => {
          // Create clips and tracks
          const clips = new Map<string, Clip>();
          const tracks = new Map<string, Track>();

          clipConfigs.forEach((config) => {
            clips.set(config.clipId, {
              id: config.clipId,
              trackId: config.trackId,
              startTime: config.startTime,
              duration: config.duration,
              sourceMediaPath: "test.mp4",
              sourceStart: 0,
              sourceEnd: 100,
              type: "video",
              filmstripUrl: null,
              waveformPeaks: null,
              name: "Test Clip",
              locked: false,
              muted: false,
            });

            tracks.set(config.trackId, {
              id: config.trackId,
              name: `Track ${config.trackId}`,
              type: "video",
              order: config.trackOrder,
              height: 100,
              locked: false,
              visible: true,
              muted: false,
              color: "#ffffff",
            });
          });

          // Find a timeline time where all clips are active
          const maxStartTime = Math.max(...clipConfigs.map((c) => c.startTime));
          const minEndTime = Math.min(...clipConfigs.map((c) => c.startTime + c.duration));

          // Only test if there's an overlap
          if (maxStartTime < minEndTime) {
            const timelineTime = Math.floor((maxStartTime + minEndTime) / 2);

            const frameResolver = new FrameResolver(clips, tracks);
            const activeClips = frameResolver.getActiveClips(timelineTime);

            // Verify clips are sorted by track order
            for (let i = 1; i < activeClips.length; i++) {
              expect(activeClips[i].trackIndex).toBeGreaterThanOrEqual(activeClips[i - 1].trackIndex);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 13: Empty Active Clips for Empty Timeline
  // **Validates: Requirements 2.5**
  it("Property 13: should return empty array when no clips exist in time range", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (timelineTime) => {
        // Empty clips and tracks
        const clips = new Map<string, Clip>();
        const tracks = new Map<string, Track>();

        const frameResolver = new FrameResolver(clips, tracks);
        const activeClips = frameResolver.getActiveClips(timelineTime);

        expect(activeClips).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 14: Clip Time Non-Negativity
  // **Validates: Requirements 14.6**
  it("Property 14: should ensure clip time is non-negative", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          trackId: fc.constant("track1"),
          startTime: fc.integer({ min: 0, max: 1000 }),
          duration: fc.integer({ min: 1, max: 100 }),
          sourceMediaPath: fc.constant("test.mp4"),
          sourceStart: fc.integer({ min: 0, max: 100 }),
          sourceEnd: fc.integer({ min: 100, max: 200 }),
          type: fc.constant("video" as const),
          filmstripUrl: fc.constant(null),
          waveformPeaks: fc.constant(null),
          name: fc.constant("Test Clip"),
          locked: fc.constant(false),
          muted: fc.constant(false),
        }),
        fc.integer({ min: 0, max: 1100 }),
        (clip, timelineTime) => {
          const clips = new Map<string, Clip>([[clip.id, clip as Clip]]);
          const tracks = new Map<string, Track>([
            [
              "track1",
              {
                id: "track1",
                name: "Track 1",
                type: "video",
                order: 0,
                height: 100,
                locked: false,
                visible: true,
                muted: false,
                color: "#ffffff",
              },
            ],
          ]);

          const frameResolver = new FrameResolver(clips, tracks);
          const activeClips = frameResolver.getActiveClips(timelineTime);

          // All active clips must have non-negative clip time
          activeClips.forEach((activeClip) => {
            expect(activeClip.clipTime).toBeGreaterThanOrEqual(0);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 15: Clip Time Calculation Precision
  // **Validates: Requirements 14.7**
  it("Property 15: should maintain clip time calculation accuracy within 0.001 seconds", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          trackId: fc.constant("track1"),
          startTime: fc.integer({ min: 0, max: 1000 }),
          duration: fc.integer({ min: 1, max: 100 }),
          sourceMediaPath: fc.constant("test.mp4"),
          sourceStart: fc.integer({ min: 0, max: 50 }),
          sourceEnd: fc.integer({ min: 100, max: 200 }),
          type: fc.constant("video" as const),
          filmstripUrl: fc.constant(null),
          waveformPeaks: fc.constant(null),
          name: fc.constant("Test Clip"),
          locked: fc.constant(false),
          muted: fc.constant(false),
        }),
        (clip) => {
          // Test at various points within the clip
          const timelineTime = clip.startTime + Math.floor(clip.duration / 2);

          // Calculate expected clip time
          const offset = timelineTime - clip.startTime;
          const expectedClipTime = clip.sourceStart + offset;

          // Clamp to boundaries for comparison
          const expectedClamped = Math.max(clip.sourceStart, Math.min(expectedClipTime, clip.sourceEnd));

          const clips = new Map<string, Clip>([[clip.id, clip as Clip]]);
          const tracks = new Map<string, Track>([
            [
              "track1",
              {
                id: "track1",
                name: "Track 1",
                type: "video",
                order: 0,
                height: 100,
                locked: false,
                visible: true,
                muted: false,
                color: "#ffffff",
              },
            ],
          ]);

          const frameResolver = new FrameResolver(clips, tracks);
          const activeClips = frameResolver.getActiveClips(timelineTime);

          if (activeClips.length > 0) {
            const actualClipTime = activeClips[0].clipTime;

            // Verify precision within 0.001 seconds
            expect(Math.abs(actualClipTime - expectedClamped)).toBeLessThan(0.001);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
