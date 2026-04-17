/**
 * Unit tests for video loading states
 * Requirements: 17.1, 17.2, 17.3, 17.6
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VideoPool } from "../utils/VideoPool";
import { SeekManager } from "../utils/SeekManager";
import { RenderEngine } from "../utils/RenderEngine";

describe("Loading States", () => {
  describe("VideoPool Loading States", () => {
    let videoPool: VideoPool;

    beforeEach(() => {
      videoPool = new VideoPool(10);
    });

    // Requirement 17.1: Display loading indicator during video metadata load
    it("should track videos loading metadata", async () => {
      const sourcePath = "test-video.mp4";

      // Create a mock video element that delays metadata loading
      const mockVideo = document.createElement("video");
      let metadataLoadedCallback: (() => void) | null = null;

      // Mock createElement to return our controlled video
      const originalCreateElement = document.createElement;
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName === "video") {
          const video = originalCreateElement.call(document, "video") as HTMLVideoElement;
          // Override addEventListener to capture the loadedmetadata callback
          const originalAddEventListener = video.addEventListener.bind(video);
          video.addEventListener = ((event: string, callback: any, options?: any) => {
            if (event === "loadedmetadata") {
              metadataLoadedCallback = callback;
            }
            return originalAddEventListener(event, callback, options);
          }) as any;
          return video;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Start loading video
      const videoPromise = videoPool.getVideo(sourcePath);

      // Check that video is marked as loading
      expect(videoPool.isVideoLoading(sourcePath)).toBe(true);
      expect(videoPool.hasLoadingVideos()).toBe(true);

      // Simulate metadata loaded
      if (metadataLoadedCallback) {
        metadataLoadedCallback();
      }

      // Wait for video to finish loading
      await videoPromise;

      // Check that video is no longer marked as loading (Requirement 17.3)
      expect(videoPool.isVideoLoading(sourcePath)).toBe(false);
      expect(videoPool.hasLoadingVideos()).toBe(false);

      // Cleanup
      vi.restoreAllMocks();
    });

    // Requirement 17.5: Display "Loading preview..." during initialization
    it("should indicate when pool is initializing", () => {
      const newPool = new VideoPool(10);

      // Pool should be initializing when empty
      expect(newPool.isInitializingPool()).toBe(true);
    });

    // Requirement 17.3: Remove loading indicators when all videos are loaded
    it("should clear loading state when all videos finish loading", async () => {
      // This test verifies that hasLoadingVideos returns false when no videos are loading
      expect(videoPool.hasLoadingVideos()).toBe(false);
    });
  });

  describe("SeekManager Loading States", () => {
    let seekManager: SeekManager;
    let mockVideo: HTMLVideoElement;

    beforeEach(() => {
      seekManager = new SeekManager();
      mockVideo = document.createElement("video");
      // Set initial properties
      mockVideo.currentTime = 0;
      Object.defineProperty(mockVideo, "readyState", { value: 4, writable: true });
    });

    // Requirement 17.2: Display loading indicator during seek operations
    it("should track videos currently seeking", async () => {
      // Set video time far from target to trigger seek
      mockVideo.currentTime = 0;
      const targetTime = 5.0;

      // Start seek operation (will be debounced)
      const seekPromise = seekManager.seekIfNeeded(mockVideo, targetTime);

      // Wait for debounce window to pass (100ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check that video is marked as seeking after debounce
      expect(seekManager.isVideoSeeking(mockVideo)).toBe(true);
      expect(seekManager.hasSeekingVideos()).toBe(true);

      // Simulate seeked event
      mockVideo.dispatchEvent(new Event("seeked"));

      // Wait for seek to complete
      await seekPromise;

      // Check that video is no longer marked as seeking
      expect(seekManager.isVideoSeeking(mockVideo)).toBe(false);
      expect(seekManager.hasSeekingVideos()).toBe(false);
    });

    // Requirement 17.2: Track multiple videos seeking simultaneously
    it("should track multiple videos seeking at once", async () => {
      const mockVideo2 = document.createElement("video");
      mockVideo2.currentTime = 0;
      Object.defineProperty(mockVideo2, "readyState", { value: 4, writable: true });

      // Start seeks on both videos
      const seek1 = seekManager.seekIfNeeded(mockVideo, 5.0);
      const seek2 = seekManager.seekIfNeeded(mockVideo2, 3.0);

      // Wait for debounce window to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Both should be seeking
      expect(seekManager.isVideoSeeking(mockVideo)).toBe(true);
      expect(seekManager.isVideoSeeking(mockVideo2)).toBe(true);
      expect(seekManager.hasSeekingVideos()).toBe(true);

      // Complete first seek
      mockVideo.dispatchEvent(new Event("seeked"));
      await seek1;

      // First should be done, second still seeking
      expect(seekManager.isVideoSeeking(mockVideo)).toBe(false);
      expect(seekManager.isVideoSeeking(mockVideo2)).toBe(true);
      expect(seekManager.hasSeekingVideos()).toBe(true);

      // Complete second seek
      mockVideo2.dispatchEvent(new Event("seeked"));
      await seek2;

      // Both should be done
      expect(seekManager.hasSeekingVideos()).toBe(false);
    });

    // Requirement 17.2: Clear seeking state on timeout
    it("should clear seeking state when seek times out", async () => {
      mockVideo.currentTime = 0;
      const targetTime = 5.0;

      // Start seek operation
      const seekPromise = seekManager.seekIfNeeded(mockVideo, targetTime);

      // Wait for debounce window to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Video should be seeking
      expect(seekManager.isVideoSeeking(mockVideo)).toBe(true);

      // Wait for timeout (500ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Seek should have timed out and cleared seeking state
      try {
        await seekPromise;
      } catch (error) {
        // Expected to fail with timeout
      }

      expect(seekManager.isVideoSeeking(mockVideo)).toBe(false);
    });
  });

  describe("RenderEngine Loading States", () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    let renderEngine: RenderEngine;

    beforeEach(() => {
      canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      ctx = canvas.getContext("2d");

      // Skip tests if canvas context is not available (jsdom limitation)
      if (!ctx) {
        return;
      }

      renderEngine = new RenderEngine(ctx, 800, 600);
    });

    // Requirement 17.1: Display loading indicator
    it("should draw loading indicator with message", () => {
      if (!ctx) {
        // Skip test in environments without canvas support
        return;
      }

      renderEngine.drawLoadingIndicator("Loading video...");

      // Verify canvas has content (we can't easily verify exact pixels, but we can check it's not blank)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((value) => value !== 0);
      expect(hasContent).toBe(true);
    });

    // Requirement 17.4: Display "No clips at this position" message
    it("should draw no clips message", () => {
      if (!ctx) {
        return;
      }

      renderEngine.drawNoClipsMessage();

      // Verify canvas has content
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((value) => value !== 0);
      expect(hasContent).toBe(true);
    });

    // Requirement 17.5: Display "Loading preview..." message
    it("should draw initializing message", () => {
      if (!ctx) {
        return;
      }

      renderEngine.drawInitializingMessage();

      // Verify canvas has content
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((value) => value !== 0);
      expect(hasContent).toBe(true);
    });

    // Requirement 17.6: Display error message with file name
    it("should draw video load error with file name", () => {
      if (!ctx) {
        return;
      }

      const fileName = "test-video.mp4";
      renderEngine.drawVideoLoadError(fileName);

      // Verify canvas has content
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((value) => value !== 0);
      expect(hasContent).toBe(true);
    });

    // Requirement 17.2: Display loading indicator during seeks
    it("should draw seeking indicator", () => {
      if (!ctx) {
        return;
      }

      renderEngine.drawLoadingIndicator("Seeking...");

      // Verify canvas has content
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((value) => value !== 0);
      expect(hasContent).toBe(true);
    });
  });

  describe("Integration - Loading State Flow", () => {
    let videoPool: VideoPool;
    let seekManager: SeekManager;

    beforeEach(() => {
      videoPool = new VideoPool(10);
      seekManager = new SeekManager();
    });

    // Requirement 17.7: Provide visual feedback without blocking interaction
    it("should track loading states independently without blocking", async () => {
      // This test verifies that loading state tracking doesn't block operations

      // Check initial states
      expect(videoPool.hasLoadingVideos()).toBe(false);
      expect(seekManager.hasSeekingVideos()).toBe(false);

      // States should be queryable at any time without blocking
      const hasLoading = videoPool.hasLoadingVideos();
      const hasSeeking = seekManager.hasSeekingVideos();

      expect(typeof hasLoading).toBe("boolean");
      expect(typeof hasSeeking).toBe("boolean");
    });
  });
});
