/**
 * Playback Synchronization Tests
 * Tests for play/pause functionality and canvas renderer synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineContainer } from "../TimelineContainer";
import { useTimelineStore } from "../../store/timelineStore";
import { createRef } from "react";

describe("Playback Synchronization", () => {
  let mockVideoRef: React.RefObject<HTMLVideoElement>;
  let mockVideo: Partial<HTMLVideoElement>;
  let eventListeners: Record<string, EventListener[]>;

  beforeEach(() => {
    // Reset store
    useTimelineStore.setState({
      clips: new Map(),
      tracks: new Map(),
      playhead: 0,
      isPlaying: false,
      duration: 100,
    });

    // Mock event listeners
    eventListeners = {};

    // Create mock video element
    mockVideo = {
      paused: true,
      currentTime: 0,
      duration: 100,
      readyState: 4, // HAVE_ENOUGH_DATA
      networkState: 1, // NETWORK_IDLE
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: EventListener) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
        }
      }),
    };

    mockVideoRef = createRef() as React.RefObject<HTMLVideoElement>;
    (mockVideoRef as any).current = mockVideo;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Play/Pause Button", () => {
    it("should start playback when play button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const playButton = screen.getByLabelText(/play video/i);
      await user.click(playButton);

      expect(mockVideo.play).toHaveBeenCalledTimes(1);
    });

    it("should pause playback when pause button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      // Set initial state to playing
      mockVideo.paused = false;
      useTimelineStore.setState({ isPlaying: true });

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const pauseButton = screen.getByLabelText(/pause playback/i);
      await user.click(pauseButton);

      expect(mockVideo.pause).toHaveBeenCalledTimes(1);
    });

    it("should update store isPlaying state when play succeeds", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const playButton = screen.getByLabelText(/play video/i);
      await user.click(playButton);

      // Wait for play promise to resolve
      await waitFor(() => {
        expect(useTimelineStore.getState().isPlaying).toBe(true);
      });
    });

    it("should update store isPlaying state when paused", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      mockVideo.paused = false;
      useTimelineStore.setState({ isPlaying: true });

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const pauseButton = screen.getByLabelText(/pause playback/i);
      await user.click(pauseButton);

      expect(useTimelineStore.getState().isPlaying).toBe(false);
    });

    it("should handle play() promise rejection gracefully", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock play to reject
      mockVideo.play = vi.fn().mockRejectedValue(new Error("Play failed"));

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const playButton = screen.getByLabelText(/play video/i);
      await user.click(playButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("[PLAY]"), expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should toggle play/pause when Space key is pressed", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Press space to play
      await user.keyboard(" ");

      expect(mockVideo.play).toHaveBeenCalledTimes(1);

      // Simulate video playing
      mockVideo.paused = false;
      useTimelineStore.setState({ isPlaying: true });

      // Press space to pause
      await user.keyboard(" ");

      expect(mockVideo.pause).toHaveBeenCalledTimes(1);
    });

    it("should not trigger play/pause if video ref is not available", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={undefined} />);

      await user.keyboard(" ");

      expect(mockVideo.play).not.toHaveBeenCalled();
    });
  });

  describe("Video Event Synchronization", () => {
    it("should update isPlaying when video fires play event", async () => {
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Simulate video play event
      const playHandler = eventListeners["play"]?.[0];
      expect(playHandler).toBeDefined();

      playHandler?.(new Event("play"));

      expect(useTimelineStore.getState().isPlaying).toBe(true);
    });

    it("should update isPlaying when video fires pause event", async () => {
      const mockOnSeek = vi.fn();

      useTimelineStore.setState({ isPlaying: true });

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Simulate video pause event
      const pauseHandler = eventListeners["pause"]?.[0];
      expect(pauseHandler).toBeDefined();

      pauseHandler?.(new Event("pause"));

      expect(useTimelineStore.getState().isPlaying).toBe(false);
    });

    it("should update playhead when video fires timeupdate event", async () => {
      const mockOnSeek = vi.fn();

      mockVideo.paused = false;
      mockVideo.currentTime = 5.5;

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Simulate video timeupdate event
      const timeupdateHandler = eventListeners["timeupdate"]?.[0];
      expect(timeupdateHandler).toBeDefined();

      timeupdateHandler?.(new Event("timeupdate"));

      expect(useTimelineStore.getState().playhead).toBe(5.5);
    });

    it("should not update playhead on timeupdate if video is paused", async () => {
      const mockOnSeek = vi.fn();

      mockVideo.paused = true;
      mockVideo.currentTime = 5.5;

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Simulate video timeupdate event while paused
      const timeupdateHandler = eventListeners["timeupdate"]?.[0];
      timeupdateHandler?.(new Event("timeupdate"));

      // Playhead should remain at 0
      expect(useTimelineStore.getState().playhead).toBe(0);
    });

    it("should clean up event listeners on unmount", () => {
      const mockOnSeek = vi.fn();

      const { unmount } = render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const addEventListenerCalls = (mockVideo.addEventListener as any).mock.calls.length;

      unmount();

      expect(mockVideo.removeEventListener).toHaveBeenCalledTimes(addEventListenerCalls);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid play/pause toggling", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const playButton = screen.getByLabelText(/play video/i);

      // Rapid clicks
      await user.click(playButton);
      mockVideo.paused = false;
      await user.click(playButton);
      mockVideo.paused = true;
      await user.click(playButton);

      // Should have called play twice and pause once
      expect(mockVideo.play).toHaveBeenCalledTimes(2);
      expect(mockVideo.pause).toHaveBeenCalledTimes(1);
    });

    it("should handle video with zero duration", async () => {
      const mockOnSeek = vi.fn();

      mockVideo.duration = 0;

      render(<TimelineContainer duration={0} trimStart={0} trimEnd={0} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Should render without crashing
      expect(screen.getByText(/import a video to see the capcut-style timeline/i)).toBeInTheDocument();
    });

    it("should handle playhead at video end", async () => {
      const mockOnSeek = vi.fn();

      mockVideo.currentTime = 100;
      mockVideo.duration = 100;

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={100} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Simulate timeupdate at end
      mockVideo.paused = false;
      const timeupdateHandler = eventListeners["timeupdate"]?.[0];
      timeupdateHandler?.(new Event("timeupdate"));

      expect(useTimelineStore.getState().playhead).toBe(100);
    });

    it("should handle video readyState changes", async () => {
      const mockOnSeek = vi.fn();

      // Start with low readyState
      mockVideo.readyState = 1; // HAVE_METADATA

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Simulate waiting event
      const waitingHandler = eventListeners["waiting"]?.[0];
      waitingHandler?.(new Event("waiting"));

      // Simulate playing event when ready
      mockVideo.readyState = 4; // HAVE_ENOUGH_DATA
      const playingHandler = eventListeners["playing"]?.[0];
      playingHandler?.(new Event("playing"));

      // Should not crash
      expect(mockVideo.addEventListener).toHaveBeenCalled();
    });

    it("should handle video stalled event", async () => {
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Simulate stalled event
      const stalledHandler = eventListeners["stalled"]?.[0];
      stalledHandler?.(new Event("stalled"));

      // Should not crash
      expect(mockVideo.addEventListener).toHaveBeenCalled();
    });

    it("should handle null videoRef gracefully", async () => {
      const user = userEvent.setup();
      const mockOnSeek = vi.fn();

      const nullRef = createRef() as React.RefObject<HTMLVideoElement>;

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={nullRef} />);

      // Try to play
      await user.keyboard(" ");

      // Should not crash
      expect(mockVideo.play).not.toHaveBeenCalled();
    });

    it("should maintain playback state across re-renders", async () => {
      const mockOnSeek = vi.fn();

      const { rerender } = render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // Set playing state
      useTimelineStore.setState({ isPlaying: true });

      // Re-render with different playhead
      rerender(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={5} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      // isPlaying should still be true
      expect(useTimelineStore.getState().isPlaying).toBe(true);
    });
  });

  describe("Play Button State", () => {
    it("should show play icon when paused", () => {
      const mockOnSeek = vi.fn();

      useTimelineStore.setState({ isPlaying: false });

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      expect(screen.getByLabelText(/play video/i)).toBeInTheDocument();
    });

    it("should show pause icon when playing", () => {
      const mockOnSeek = vi.fn();

      mockVideo.paused = false;
      useTimelineStore.setState({ isPlaying: true });

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      expect(screen.getByLabelText(/pause playback/i)).toBeInTheDocument();
    });

    it("should have correct ARIA attributes", () => {
      const mockOnSeek = vi.fn();

      render(<TimelineContainer duration={100} trimStart={0} trimEnd={100} playhead={0} onSeek={mockOnSeek} videoUrl="test-video.mp4" sourcePath="/path/to/video.mp4" videoRef={mockVideoRef} />);

      const playButton = screen.getByLabelText(/play video/i);
      expect(playButton).toHaveAttribute("type", "button");
      expect(playButton).toHaveAttribute("title");
    });
  });
});
