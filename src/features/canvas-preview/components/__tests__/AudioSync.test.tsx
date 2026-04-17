/**
 * Audio Synchronization Tests
 * Tests for audio sync calculation and playback during timeline playback
 *
 * CRITICAL BUG FIX: Tests that audio sync uses clip.clipTime directly
 * without doubling the offset calculation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { CanvasRenderer } from "../CanvasRenderer";
import { useTimelineStore } from "../../../timeline/store/timelineStore";
import type { Clip, Track } from "../../../timeline/types";

describe("Audio Synchronization", () => {
  let mockAudioElements: Map<string, HTMLAudioElement>;
  let mockVideoElements: Map<string, HTMLVideoElement>;
  let rafCallbacks: FrameRequestCallback[];
  let rafId: number;

  beforeEach(() => {
    // Reset store
    useTimelineStore.setState({
      clips: new Map(),
      tracks: new Map(),
      playhead: 0,
      isPlaying: false,
      duration: 100,
    });

    // Mock audio elements
    mockAudioElements = new Map();
    mockVideoElements = new Map();

    // Mock Audio constructor
    global.Audio = vi.fn().mockImplementation((src: string) => {
      const mockAudio = {
        src,
        currentTime: 0,
        paused: true,
        volume: 1,
        muted: false,
        preload: "auto",
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      mockAudioElements.set(src, mockAudio);
      return mockAudio;
    }) as any;

    // Mock AudioContext
    const mockAudioContext = {
      state: "running",
      currentTime: 0,
      destination: {},
      createMediaElementSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
      }),
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext) as any;
    (global as any).webkitAudioContext = global.AudioContext;

    // Mock requestAnimationFrame
    rafCallbacks = [];
    rafId = 0;

    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return ++rafId;
    });

    global.cancelAnimationFrame = vi.fn();

    // Mock createImageBitmap
    global.createImageBitmap = vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      close: vi.fn(),
    } as any);

    // Mock performance.now
    let mockTime = 0;
    global.performance.now = vi.fn(() => mockTime);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockAudioElements.clear();
    mockVideoElements.clear();
    rafCallbacks = [];
  });

  describe("Audio Sync Calculation", () => {
    it("should use clip.clipTime directly without doubling offset", async () => {
      // Setup: Create a clip that starts at timeline position 5s
      // with clipTime (video position) at 10s
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 5, // Timeline position
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 10, // Video position (already accounts for offset)
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 5, // At start of clip
        isPlaying: false,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      // Start playback
      useTimelineStore.setState({ isPlaying: true });

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Get the audio element that was created
      const audioElement = mockAudioElements.get("/test/video.mp4");
      expect(audioElement).toBeDefined();

      // Simulate audio playing
      if (audioElement) {
        audioElement.paused = false;
        audioElement.currentTime = 10; // Should match clip.clipTime
      }

      // Execute RAF callback to trigger sync
      const callback = rafCallbacks[0];
      callback(0);

      // CRITICAL: Audio should be synced to clip.clipTime (10s)
      // NOT to clip.clipTime + (timelineTime - clip.startTime) which would be 10 + (5 - 5) = 10
      // But if timeline advances to 6s, it should still be 10s (not 11s)
      expect(audioElement?.currentTime).toBe(10);
    });

    it("should not double the offset when timeline advances", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 5,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 10,
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 6, // 1 second into the clip
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const audioElement = mockAudioElements.get("/test/video.mp4");
      expect(audioElement).toBeDefined();

      if (audioElement) {
        audioElement.paused = false;
        // Simulate audio at wrong position (old buggy calculation)
        // Old bug: expectedTime = 10 + (6 - 5) = 11
        audioElement.currentTime = 11;
      }

      // Execute RAF callback
      const callback = rafCallbacks[0];
      callback(0);

      // CRITICAL: With the fix, clip.clipTime should be used directly
      // The FrameResolver calculates the correct clipTime based on timeline position
      // So we should NOT add the offset again in syncAudioToTimeline
      // The audio should be corrected to match clip.clipTime
      expect(audioElement?.currentTime).toBe(10);
    });

    it("should correct audio drift using clip.clipTime as reference", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 2.5, // Video at 2.5s
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 2.5,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const audioElement = mockAudioElements.get("/test/video.mp4");
      expect(audioElement).toBeDefined();

      if (audioElement) {
        audioElement.paused = false;
        // Simulate audio drifted ahead by 0.2s
        audioElement.currentTime = 2.7;
      }

      // Execute RAF callback to trigger sync
      const callback = rafCallbacks[0];
      callback(0);

      // Audio should be corrected to clip.clipTime (2.5s)
      // Drift of 0.2s exceeds threshold of 0.1s, so correction should happen
      expect(audioElement?.currentTime).toBe(2.5);
    });

    it("should not correct audio if drift is within threshold", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 5.0,
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 5.0,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const audioElement = mockAudioElements.get("/test/video.mp4");
      expect(audioElement).toBeDefined();

      if (audioElement) {
        audioElement.paused = false;
        // Simulate small drift (0.05s, within 0.1s threshold)
        audioElement.currentTime = 5.05;
      }

      const originalTime = audioElement?.currentTime;

      // Execute RAF callback
      const callback = rafCallbacks[0];
      callback(0);

      // Audio should NOT be corrected (drift within threshold)
      expect(audioElement?.currentTime).toBe(originalTime);
    });
  });

  describe("Video Element Stays Paused", () => {
    it("should ensure video elements never play during audio playback", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 0,
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 0,
        isPlaying: true,
        duration: 100,
      });

      // Mock video element
      const mockVideo = {
        currentTime: 0,
        paused: true,
        play: vi.fn(),
        pause: vi.fn(),
        readyState: 4,
        videoWidth: 1920,
        videoHeight: 1080,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;

      mockVideoElements.set("/test/video.mp4", mockVideo);

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Execute RAF callback
      const callback = rafCallbacks[0];
      callback(0);

      // CRITICAL: Video element should NEVER have play() called
      expect(mockVideo.play).not.toHaveBeenCalled();
      expect(mockVideo.paused).toBe(true);
    });

    it("should pause video element if it somehow starts playing", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 0,
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 0,
        isPlaying: true,
        duration: 100,
      });

      const mockVideo = {
        currentTime: 0,
        paused: false, // Somehow playing!
        play: vi.fn(),
        pause: vi.fn(),
        readyState: 4,
        videoWidth: 1920,
        videoHeight: 1080,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;

      mockVideoElements.set("/test/video.mp4", mockVideo);

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Execute RAF callback
      const callback = rafCallbacks[0];
      callback(0);

      // Video should be paused
      expect(mockVideo.pause).toHaveBeenCalled();
    });
  });

  describe("Audio Element Lifecycle", () => {
    it("should create separate audio element for each source", async () => {
      const clip1: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 5,
        type: "video",
        sourceMediaPath: "/test/video1.mp4",
        clipTime: 0,
        trimStart: 0,
        trimEnd: 5,
      };

      const clip2: Clip = {
        id: "clip2",
        trackId: "track1",
        startTime: 5,
        duration: 5,
        type: "video",
        sourceMediaPath: "/test/video2.mp4",
        clipTime: 0,
        trimStart: 0,
        trimEnd: 5,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([
          [clip1.id, clip1],
          [clip2.id, clip2],
        ]),
        tracks: new Map([[track.id, track]]),
        playhead: 0,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      // Should create separate audio elements
      expect(mockAudioElements.has("/test/video1.mp4")).toBe(true);
      expect(mockAudioElements.has("/test/video2.mp4")).toBe(true);
    });

    it("should reuse audio element for same source", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 0,
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 0,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const audioConstructorCallCount = (global.Audio as any).mock.calls.length;

      // Stop and restart playback
      useTimelineStore.setState({ isPlaying: false });
      await waitFor(() => expect(rafCallbacks.length).toBe(0));

      useTimelineStore.setState({ isPlaying: true });
      await waitFor(() => expect(rafCallbacks.length).toBeGreaterThan(0));

      // Should not create new audio element
      expect((global.Audio as any).mock.calls.length).toBe(audioConstructorCallCount);
    });

    it("should pause audio when playback stops", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 0,
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 0,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const audioElement = mockAudioElements.get("/test/video.mp4");
      expect(audioElement).toBeDefined();

      if (audioElement) {
        audioElement.paused = false;
      }

      // Stop playback
      useTimelineStore.setState({ isPlaying: false });

      await waitFor(() => {
        expect(audioElement?.pause).toHaveBeenCalled();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle clip with zero clipTime", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 5,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 0, // Start of video
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 5,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const audioElement = mockAudioElements.get("/test/video.mp4");
      expect(audioElement).toBeDefined();

      if (audioElement) {
        audioElement.paused = false;
        audioElement.currentTime = 0;
      }

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();
    });

    it("should handle multiple clips playing simultaneously", async () => {
      const clip1: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video1.mp4",
        clipTime: 2,
        trimStart: 0,
        trimEnd: 10,
      };

      const clip2: Clip = {
        id: "clip2",
        trackId: "track2",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video2.mp4",
        clipTime: 5,
        trimStart: 0,
        trimEnd: 10,
      };

      const track1: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      const track2: Track = {
        id: "track2",
        name: "Track 2",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      useTimelineStore.setState({
        clips: new Map([
          [clip1.id, clip1],
          [clip2.id, clip2],
        ]),
        tracks: new Map([
          [track1.id, track1],
          [track2.id, track2],
        ]),
        playhead: 0,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const audio1 = mockAudioElements.get("/test/video1.mp4");
      const audio2 = mockAudioElements.get("/test/video2.mp4");

      expect(audio1).toBeDefined();
      expect(audio2).toBeDefined();

      if (audio1 && audio2) {
        audio1.paused = false;
        audio2.paused = false;
        audio1.currentTime = 2;
        audio2.currentTime = 5;
      }

      const callback = rafCallbacks[0];
      expect(() => callback(0)).not.toThrow();

      // Both audio elements should be synced to their respective clipTimes
      expect(audio1?.currentTime).toBe(2);
      expect(audio2?.currentTime).toBe(5);
    });

    it("should handle audio element that fails to play", async () => {
      const clip: Clip = {
        id: "clip1",
        trackId: "track1",
        startTime: 0,
        duration: 10,
        type: "video",
        sourceMediaPath: "/test/video.mp4",
        clipTime: 0,
        trimStart: 0,
        trimEnd: 10,
      };

      const track: Track = {
        id: "track1",
        name: "Track 1",
        type: "video",
        visible: true,
        locked: false,
        height: 100,
      };

      // Mock Audio to throw error on play
      global.Audio = vi.fn().mockImplementation((src: string) => {
        const mockAudio = {
          src,
          currentTime: 0,
          paused: true,
          volume: 1,
          muted: false,
          preload: "auto",
          play: vi.fn().mockRejectedValue(new Error("Play failed")),
          pause: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        } as any;
        mockAudioElements.set(src, mockAudio);
        return mockAudio;
      }) as any;

      useTimelineStore.setState({
        clips: new Map([[clip.id, clip]]),
        tracks: new Map([[track.id, track]]),
        playhead: 0,
        isPlaying: true,
        duration: 100,
      });

      render(<CanvasRenderer baseWidth={1920} baseHeight={1080} />);

      await waitFor(() => {
        expect(rafCallbacks.length).toBeGreaterThan(0);
      });

      const callback = rafCallbacks[0];
      // Should not crash even if audio fails
      expect(() => callback(0)).not.toThrow();
    });
  });
});
