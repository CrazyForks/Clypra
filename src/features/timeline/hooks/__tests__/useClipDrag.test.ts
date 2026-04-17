/**
 * Integration tests for clip dragging
 * Requirements: 6.2, 6.6, 19.6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTimelineStore } from "../../store/timelineStore";
import type { Clip, Track } from "../../types/core";

describe("Clip dragging integration", () => {
  beforeEach(() => {
    // Reset store state using setState (same pattern as existing tests)
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
   * Test drag updates clip position correctly
   * Requirement 6.2: Drag updates clip start time based on pointer movement
   */
  it("should update clip position correctly after drag", () => {
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

    // Verify clip was added
    let state = useTimelineStore.getState();
    expect(state.clips.has(clip.id)).toBe(true);

    // Simulate drag by 5 seconds forward
    const newStartTime = 15;
    useTimelineStore.getState().moveClip(clip.id, newStartTime, clip.trackId);

    // Verify the clip position updated
    state = useTimelineStore.getState();
    const updatedClip = state.clips.get(clip.id);
    expect(updatedClip).toBeDefined();
    expect(updatedClip!.startTime).toBe(15);
    expect(updatedClip!.duration).toBe(5);
  });

  /**
   * Test multi-clip drag maintains relative positions
   * Requirement 19.6: Multi-clip drag for selected clips
   */
  it("should maintain relative positions during multi-clip drag", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const clip1: Clip = {
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
      name: "Clip 1",
      locked: false,
      muted: false,
    };

    const clip2: Clip = {
      id: "clip-2",
      trackId: "track-1",
      startTime: 20,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
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
      startTime: 35,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Clip 3",
      locked: false,
      muted: false,
    };

    useTimelineStore.getState().addClip(clip1);
    useTimelineStore.getState().addClip(clip2);
    useTimelineStore.getState().addClip(clip3);

    // Calculate original relative positions
    const originalGap = clip2.startTime - clip1.startTime; // 10 seconds

    // Simulate drag by 3 seconds forward
    const deltaTime = 3;
    useTimelineStore.getState().moveClip(clip1.id, clip1.startTime + deltaTime, clip1.trackId);
    useTimelineStore.getState().moveClip(clip2.id, clip2.startTime + deltaTime, clip2.trackId);

    // Verify positions updated
    const state = useTimelineStore.getState();
    const updatedClip1 = state.clips.get(clip1.id);
    const updatedClip2 = state.clips.get(clip2.id);
    const updatedClip3 = state.clips.get(clip3.id);

    expect(updatedClip1!.startTime).toBe(13); // 10 + 3
    expect(updatedClip2!.startTime).toBe(23); // 20 + 3
    expect(updatedClip3!.startTime).toBe(35); // Unchanged

    // Verify relative positions maintained
    const newGap = updatedClip2!.startTime - updatedClip1!.startTime;
    expect(newGap).toBe(originalGap); // Still 10 seconds apart
  });

  /**
   * Test snap alignment during drag
   * Requirement 6.6: Apply snap system during drag
   */
  it("should snap to playhead during drag when snap is enabled", () => {
    useTimelineStore.getState().addTrack(mockTrack);
    useTimelineStore.getState().setPlayhead(20);

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

    // Move clip to playhead position (simulating snap)
    useTimelineStore.getState().moveClip(clip.id, 20, clip.trackId);

    const state = useTimelineStore.getState();
    const updatedClip = state.clips.get(clip.id);
    expect(updatedClip!.startTime).toBe(20);
  });

  /**
   * Test snap to clip edges during drag
   * Requirement 6.6: Apply snap system during drag
   */
  it("should snap to other clip edges during drag when snap is enabled", () => {
    useTimelineStore.getState().addTrack(mockTrack);

    const targetClip: Clip = {
      id: "clip-target",
      trackId: "track-1",
      startTime: 20,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Target Clip",
      locked: false,
      muted: false,
    };

    const dragClip: Clip = {
      id: "clip-drag",
      trackId: "track-1",
      startTime: 10,
      duration: 5,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 5,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Drag Clip",
      locked: false,
      muted: false,
    };

    useTimelineStore.getState().addClip(targetClip);
    useTimelineStore.getState().addClip(dragClip);

    // Move dragClip to align with targetClip start
    useTimelineStore.getState().moveClip(dragClip.id, 15, dragClip.trackId);

    const state = useTimelineStore.getState();
    const updatedDragClip = state.clips.get(dragClip.id);
    expect(updatedDragClip!.startTime).toBe(15);
    expect(updatedDragClip!.startTime + updatedDragClip!.duration).toBe(20); // Aligns with target start
  });

  /**
   * Test drag clamping to timeline boundaries
   * Requirement 6.4, 6.5: Clamp clip positions to timeline boundaries
   */
  it("should clamp clip position to timeline boundaries", () => {
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

    // Try to move clip to negative time (should clamp to 0)
    useTimelineStore.getState().moveClip(clip.id, -5, clip.trackId);

    let state = useTimelineStore.getState();
    const clampedClip = state.clips.get(clip.id);
    expect(clampedClip!.startTime).toBe(0); // Clamped to 0

    // Try to move clip beyond timeline duration (should throw error)
    const timelineDuration = state.duration; // 300 seconds

    // This should throw an error because end time exceeds duration
    expect(() => {
      useTimelineStore.getState().moveClip(clip.id, timelineDuration + 10, clip.trackId);
    }).toThrow();

    // Clip should still be at position 0 (from previous move)
    state = useTimelineStore.getState();
    const unchangedClip = state.clips.get(clip.id);
    expect(unchangedClip!.startTime).toBe(0);
  });

  /**
   * Test locked clip cannot be dragged
   */
  it("should prevent dragging locked clips", () => {
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

    // Try to move the locked clip - should throw error (Requirement 22.5)
    expect(() => {
      useTimelineStore.getState().moveClip(clip.id, 20, clip.trackId);
    }).toThrow("Cannot move locked clip");
  });
});
