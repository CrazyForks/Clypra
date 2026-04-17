/**
 * Property-based tests for Track Visibility
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { FrameResolver } from "../utils/FrameResolver";
import type { Clip, Track } from "../../timeline/types/core";

describe("Track Visibility - Property Tests", () => {
  // Feature: canvas-preview-system-v2, Property 28: Visible Tracks Only Rendering
  // **Validates: Requirements 7.4**
  it("Property 28: should render only clips on visible tracks in correct track order", () => {
    fc.assert(
      fc.property(
        // Generate multiple clips on different tracks with mixed visibility
        fc
          .array(
            fc.record({
              clipId: fc.string(),
              trackId: fc.string(),
              trackOrder: fc.integer({ min: 0, max: 10 }),
              trackVisible: fc.boolean(),
              startTime: fc.integer({ min: 0, max: 100 }),
              duration: fc.integer({ min: 10, max: 50 }),
            }),
            { minLength: 1, maxLength: 10 },
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
              visible: config.trackVisible,
              muted: false,
              color: "#ffffff",
            });
          });

          // Find a timeline time where at least one clip is active
          const maxStartTime = Math.max(...clipConfigs.map((c) => c.startTime));
          const minEndTime = Math.min(...clipConfigs.map((c) => c.startTime + c.duration));

          // Only test if there's an overlap
          if (maxStartTime < minEndTime) {
            const timelineTime = Math.floor((maxStartTime + minEndTime) / 2);

            const frameResolver = new FrameResolver(clips, tracks);
            const activeClips = frameResolver.getActiveClips(timelineTime);

            // Property 1: All active clips must be on visible tracks
            activeClips.forEach((clip) => {
              const track = tracks.get(clip.trackId);
              expect(track).toBeDefined();
              expect(track!.visible).toBe(true);
            });

            // Property 2: Active clips must be sorted by track order (ascending)
            for (let i = 1; i < activeClips.length; i++) {
              expect(activeClips[i].trackIndex).toBeGreaterThanOrEqual(activeClips[i - 1].trackIndex);
            }

            // Property 3: No clips from invisible tracks should be included
            const invisibleTrackIds = clipConfigs.filter((c) => !c.trackVisible).map((c) => c.trackId);

            activeClips.forEach((clip) => {
              expect(invisibleTrackIds).not.toContain(clip.trackId);
            });

            // Property 4: All clips on visible tracks in time range should be included
            const visibleClipsInRange = clipConfigs.filter((config) => {
              const clipEnd = config.startTime + config.duration;
              const inTimeRange = timelineTime >= config.startTime && timelineTime < clipEnd;
              return inTimeRange && config.trackVisible;
            });

            expect(activeClips).toHaveLength(visibleClipsInRange.length);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
