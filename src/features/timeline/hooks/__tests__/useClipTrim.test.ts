/**
 * Integration tests for clip trimming
 * Requirements: 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTimelineStore } from "../../store/timelineStore";
import type { Clip, Track } from "../../types/core";

describe("Clip trimming integration", () => {
  beforeEach(() => {
    // Reset store state
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

  const mockTrack: Track = {
    id: "track-1",
    name: "Video Track",
    type: "video",
    order: 0,
    height: 80,
    locked: false,
    visible: true,
    muted: false,
    color: "#0d9488",
  };

  /**
   * Test trim start adjusts start time and duration
   * Requirement 7.3: Trim start adjusts start time while keeping end time fixed
   */
  it("should adjust start time and duration when trimming start", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    // Original end time: 10 + 5 = 15
    const originalEndTime = clip.startTime + clip.duration;

    // Trim start by 2 seconds (move start from 10 to 12)
    const newStartTime = 12;
    const newDuration = originalEndTime - newStartTime; // 15 - 12 = 3

    useTimelineStore.getState().trimClip(clip.id, newStartTime, newDuration);

    // Verify the clip was trimmed correctly
    const state = useTimelineStore.getState();
    const trimmedClip = state.clips.get(clip.id);
    expect(trimmedClip).toBeDefined();
    expect(trimmedClip!.startTime).toBe(12);
    expect(trimmedClip!.duration).toBe(3);
    expect(trimmedClip!.startTime + trimmedClip!.duration).toBe(originalEndTime); // End time unchanged
  });

  /**
   * Test trim end adjusts duration only
   * Requirement 7.4: Trim end adjusts duration while keeping start time fixed
   */
  it("should adjust duration only when trimming end", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    const originalStartTime = clip.startTime;

    // Trim end by 2 seconds (reduce duration from 5 to 3)
    const newDuration = 3;

    useTimelineStore.getState().trimClip(clip.id, originalStartTime, newDuration);

    // Verify the clip was trimmed correctly
    const state = useTimelineStore.getState();
    const trimmedClip = state.clips.get(clip.id);
    expect(trimmedClip).toBeDefined();
    expect(trimmedClip!.startTime).toBe(originalStartTime); // Start time unchanged
    expect(trimmedClip!.duration).toBe(3);
    expect(trimmedClip!.startTime + trimmedClip!.duration).toBe(13); // New end time
  });

  /**
   * Test minimum duration enforcement
   * Requirement 7.5: Enforce minimum clip duration (0.1 seconds)
   */
  it("should enforce minimum duration of 0.1 seconds", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    // Try to trim to less than minimum duration (should throw error)
    expect(() => {
      useTimelineStore.getState().trimClip(clip.id, 10, 0.05); // 0.05 < 0.1
    }).toThrow();

    // Verify clip was not modified
    const state = useTimelineStore.getState();
    const unchangedClip = state.clips.get(clip.id);
    expect(unchangedClip!.startTime).toBe(10);
    expect(unchangedClip!.duration).toBe(5);
  });

  /**
   * Test trim to exactly minimum duration
   * Requirement 7.5: Allow trim to exactly 0.1 seconds
   */
  it("should allow trim to exactly minimum duration", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    // Trim to exactly minimum duration
    useTimelineStore.getState().trimClip(clip.id, 10, 0.1);

    // Verify clip was trimmed
    const state = useTimelineStore.getState();
    const trimmedClip = state.clips.get(clip.id);
    expect(trimmedClip!.startTime).toBe(10);
    expect(trimmedClip!.duration).toBe(0.1);
  });

  /**
   * Test trim clamping to timeline boundaries
   * Requirement 7.5: Clamp trim to timeline boundaries
   */
  it("should clamp trim to timeline boundaries", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    const timelineDuration = useTimelineStore.getState().duration; // 300 seconds

    // Try to trim beyond timeline duration (should throw error)
    expect(() => {
      useTimelineStore.getState().trimClip(clip.id, 10, timelineDuration + 10);
    }).toThrow();

    // Verify clip was not modified
    const state = useTimelineStore.getState();
    const unchangedClip = state.clips.get(clip.id);
    expect(unchangedClip!.startTime).toBe(10);
    expect(unchangedClip!.duration).toBe(5);
  });

  /**
   * Test trim start to negative time is prevented
   * Requirement 7.5: Prevent negative start times
   */
  it("should prevent trim start to negative time", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    // Try to trim to negative start time (should throw error)
    expect(() => {
      useTimelineStore.getState().trimClip(clip.id, -5, 10);
    }).toThrow();

    // Verify clip was not modified
    const state = useTimelineStore.getState();
    const unchangedClip = state.clips.get(clip.id);
    expect(unchangedClip!.startTime).toBe(10);
    expect(unchangedClip!.duration).toBe(5);
  });

  /**
   * Test locked clip cannot be trimmed
   */
  it("should prevent trimming locked clips", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Locked Clip",
      locked: true, // Locked
      muted: false,
    };

    useTimelineStore.getState().addClip(clip);

    // Try to trim the locked clip - should throw error (Requirement 22.5)
    expect(() => {
      useTimelineStore.getState().trimClip(clip.id, 12, 3);
    }).toThrow("Cannot trim locked clip");
  });

  /**
   * Test trim updates source start and end correctly
   * Requirement 7.3, 7.4: Update source trim boundaries
   */
  it("should update source trim boundaries correctly", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 2, // Source starts at 2 seconds
      sourceEnd: 7, // Source ends at 7 seconds
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    useTimelineStore.getState().addClip(clip);

    // Trim start by 1 second (move start from 10 to 11)
    const newStartTime = 11;
    const newDuration = 4; // End time stays at 15, so duration is 4

    useTimelineStore.getState().trimClip(clip.id, newStartTime, newDuration);

    // Verify source boundaries updated
    const state = useTimelineStore.getState();
    const trimmedClip = state.clips.get(clip.id);
    expect(trimmedClip).toBeDefined();
    expect(trimmedClip!.sourceStart).toBe(3); // 2 + 1 = 3
    expect(trimmedClip!.sourceEnd).toBe(7); // 3 + 4 = 7
  });

  /**
   * Test trim with snap to playhead
   * Requirement 7.7: Apply snap system during trim
   */
  it("should snap to playhead during trim when snap is enabled", () => {
    useTimelineStore.getState().addTrack(mockTrack);
    useTimelineStore.getState().setPlayhead(12);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    // Trim start to playhead position (simulating snap)
    const newStartTime = 12; // Snapped to playhead
    const newDuration = 3; // End time stays at 15

    useTimelineStore.getState().trimClip(clip.id, newStartTime, newDuration);

    const state = useTimelineStore.getState();
    const trimmedClip = state.clips.get(clip.id);
    expect(trimmedClip!.startTime).toBe(12);
    expect(trimmedClip!.duration).toBe(3);
  });

  /**
   * Test undo after trim
   * Requirement 14.6: Add trim operation to undo history
   */
  it("should support undo after trim", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip: Clip = {
      id: "clip-1",
      trackId: "track-1",
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

    useTimelineStore.getState().addClip(clip);

    // Trim the clip
    useTimelineStore.getState().trimClip(clip.id, 12, 3);

    // Verify trim was applied
    let state = useTimelineStore.getState();
    let trimmedClip = state.clips.get(clip.id);
    expect(trimmedClip!.startTime).toBe(12);
    expect(trimmedClip!.duration).toBe(3);

    // Undo the trim
    useTimelineStore.getState().undo();

    // Verify clip was restored to original state
    state = useTimelineStore.getState();
    const restoredClip = state.clips.get(clip.id);
    expect(restoredClip!.startTime).toBe(10);
    expect(restoredClip!.duration).toBe(5);
  });
});
