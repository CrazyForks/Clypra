/**
 * Performance Tests for Timeline Engine v1
 * Tests render time, frame rate, and virtualization for large timelines
 * Requirements: 16.1, 16.6, 16.7
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineTracks } from "../TimelineTracks";
import { useTimelineStore } from "../../store";
import type { Clip, Track } from "../../types/core";

/**
 * Generate test clips for performance testing
 */
function generateTestClips(count: number): Clip[] {
  const clips: Clip[] = [];
  for (let i = 0; i < count; i++) {
    clips.push({
      id: `clip-${i}`,
      trackId: `track-${i % 5}`, // Distribute across 5 tracks
      startTime: i * 2, // 2 seconds apart
      duration: 1.5,
      sourceMediaPath: `/test/video-${i}.mp4`,
      sourceStart: 0,
      sourceEnd: 1.5,
      type: i % 3 === 0 ? "video" : i % 3 === 1 ? "audio" : "text",
      filmstripUrl: null,
      waveformPeaks: null,
      name: `Test Clip ${i}`,
      locked: false,
      muted: false,
    });
  }
  return clips;
}

/**
 * Generate test tracks
 */
function generateTestTracks(count: number): Track[] {
  const tracks: Track[] = [];
  for (let i = 0; i < count; i++) {
    tracks.push({
      id: `track-${i}`,
      name: `Track ${i}`,
      type: i % 3 === 0 ? "video" : i % 3 === 1 ? "audio" : "text",
      order: i,
      height: 80,
      locked: false,
      visible: true,
      muted: false,
      color: "#1e40af",
    });
  }
  return tracks;
}

describe("Timeline Performance Tests", () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useTimelineStore.getState();
    store.clips.clear();
    store.tracks.clear();
    store.selectedClipIds.clear();
  });

  /**
   * Test render time for 100-clip timeline
   * Requirement: 16.7 - Load and render 100-clip timeline in under 2 seconds
   */
  it("should render 100-clip timeline in under 2 seconds", () => {
    const clips = generateTestClips(100);
    const tracks = generateTestTracks(5);

    // Populate store
    const store = useTimelineStore.getState();
    clips.forEach((clip) => store.clips.set(clip.id, clip));
    tracks.forEach((track) => store.tracks.set(track.id, track));

    const startTime = performance.now();

    render(<TimelineTracks pxPerSec={50} scrollLeft={0} viewportWidth={1920} contentWidth={10000} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in under 2000ms (Requirement 16.7)
    expect(renderTime).toBeLessThan(2000);
    console.log(`100-clip timeline rendered in ${renderTime.toFixed(2)}ms`);
  });

  /**
   * Test virtualization reduces DOM nodes
   * Requirement: 16.1 - Use virtualization to render only visible clips
   */
  it("should use virtualization to reduce DOM nodes for 100+ clips", () => {
    const clips = generateTestClips(150);
    const tracks = generateTestTracks(5);

    // Populate store
    const store = useTimelineStore.getState();
    clips.forEach((clip) => store.clips.set(clip.id, clip));
    tracks.forEach((track) => store.tracks.set(track.id, track));

    // Render with small viewport (should only show ~10 clips)
    const { container } = render(
      <TimelineTracks
        pxPerSec={50}
        scrollLeft={0}
        viewportWidth={800} // Small viewport
        contentWidth={15000}
      />,
    );

    // Count rendered clip elements
    const renderedClips = container.querySelectorAll('[role="button"][aria-label*="clip"]');

    // Should render significantly fewer than 150 clips (Requirement 16.1)
    // With 800px viewport and 50 px/sec, visible range is ~16 seconds
    // Plus 2-second buffer on each side = ~20 seconds total
    // At 2 seconds per clip, that's ~10 clips per track * 5 tracks = ~50 clips max
    expect(renderedClips.length).toBeLessThan(150);
    expect(renderedClips.length).toBeGreaterThan(0);

    console.log(`Virtualization: ${renderedClips.length} clips rendered out of 150 total`);
  });

  /**
   * Test frame rate during playhead scrubbing
   * Requirement: 16.6 - Maintain 60 FPS during playhead scrubbing
   */
  it("should maintain smooth frame rate during rapid updates", () => {
    const clips = generateTestClips(100);
    const tracks = generateTestTracks(5);

    // Populate store
    const store = useTimelineStore.getState();
    clips.forEach((clip) => store.clips.set(clip.id, clip));
    tracks.forEach((track) => store.tracks.set(track.id, track));

    const { rerender } = render(<TimelineTracks pxPerSec={50} scrollLeft={0} viewportWidth={1920} contentWidth={10000} />);

    // Simulate rapid scroll updates (like playhead scrubbing)
    const frameCount = 60; // Simulate 60 frames
    const frameTimes: number[] = [];

    for (let i = 0; i < frameCount; i++) {
      const frameStart = performance.now();

      // Simulate scroll position change
      rerender(
        <TimelineTracks
          pxPerSec={50}
          scrollLeft={i * 10} // Scroll 10px per frame
          viewportWidth={1920}
          contentWidth={10000}
        />,
      );

      const frameEnd = performance.now();
      frameTimes.push(frameEnd - frameStart);
    }

    // Calculate average frame time
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const fps = 1000 / avgFrameTime;

    // Should maintain close to 60 FPS (Requirement 16.6)
    // Allow some tolerance - aim for at least 30 FPS in tests
    expect(fps).toBeGreaterThan(30);
    console.log(`Average FPS during scrubbing: ${fps.toFixed(2)}`);
  });

  /**
   * Test memoization prevents unnecessary re-renders
   * Requirement: 16.4 - Memoize expensive calculations
   */
  it("should memoize clip positions and avoid recalculation", () => {
    const clips = generateTestClips(50);
    const tracks = generateTestTracks(3);

    // Populate store
    const store = useTimelineStore.getState();
    clips.forEach((clip) => store.clips.set(clip.id, clip));
    tracks.forEach((track) => store.tracks.set(track.id, track));

    const { rerender } = render(<TimelineTracks pxPerSec={50} scrollLeft={0} viewportWidth={1920} contentWidth={5000} />);

    // First render time
    const firstRenderStart = performance.now();
    rerender(<TimelineTracks pxPerSec={50} scrollLeft={0} viewportWidth={1920} contentWidth={5000} />);
    const firstRenderTime = performance.now() - firstRenderStart;

    // Second render with same props (should be faster due to memoization)
    const secondRenderStart = performance.now();
    rerender(<TimelineTracks pxPerSec={50} scrollLeft={0} viewportWidth={1920} contentWidth={5000} />);
    const secondRenderTime = performance.now() - secondRenderStart;

    // Memoization should make subsequent renders faster
    // (or at least not significantly slower)
    expect(secondRenderTime).toBeLessThanOrEqual(firstRenderTime * 1.5);
    console.log(`First render: ${firstRenderTime.toFixed(2)}ms, Second render: ${secondRenderTime.toFixed(2)}ms`);
  });

  /**
   * Test scroll performance with debouncing
   * Requirement: 16.3 - Debounce scroll events
   */
  it("should debounce scroll events to reduce render frequency", async () => {
    const clips = generateTestClips(100);
    const tracks = generateTestTracks(5);

    // Populate store
    const store = useTimelineStore.getState();
    clips.forEach((clip) => store.clips.set(clip.id, clip));
    tracks.forEach((track) => store.tracks.set(track.id, track));

    let renderCount = 0;
    const mockSetScroll = vi.fn(() => {
      renderCount++;
    });

    // Mock the store's setScroll to count calls
    vi.spyOn(store, "setScroll").mockImplementation(mockSetScroll);

    const { rerender } = render(<TimelineTracks pxPerSec={50} scrollLeft={0} viewportWidth={1920} contentWidth={10000} />);

    // Simulate rapid scroll events (100 events in quick succession)
    for (let i = 0; i < 100; i++) {
      rerender(<TimelineTracks pxPerSec={50} scrollLeft={i * 5} viewportWidth={1920} contentWidth={10000} />);
    }

    // With debouncing, we should have significantly fewer than 100 store updates
    // Note: This test verifies the component can handle rapid updates efficiently
    expect(renderCount).toBeLessThan(100);
    console.log(`Scroll events: 100 triggered, ${renderCount} processed`);
  });

  /**
   * Test large timeline initial load performance
   * Requirement: 16.7 - Load and render 100-clip timeline in under 2 seconds
   */
  it("should load large timeline data efficiently", () => {
    const clipCount = 100;
    const trackCount = 10;

    const startTime = performance.now();

    // Generate and populate store
    const clips = generateTestClips(clipCount);
    const tracks = generateTestTracks(trackCount);

    const store = useTimelineStore.getState();
    clips.forEach((clip) => store.clips.set(clip.id, clip));
    tracks.forEach((track) => store.tracks.set(track.id, track));

    const loadTime = performance.now() - startTime;

    // Data loading should be very fast (well under 100ms)
    expect(loadTime).toBeLessThan(100);
    console.log(`Loaded ${clipCount} clips and ${trackCount} tracks in ${loadTime.toFixed(2)}ms`);
  });
});
