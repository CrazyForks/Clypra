/**
 * SeekManager - Smart video seeking with threshold checking and debouncing
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7
 * Requirements: 10.2, 10.3 (Error handling), 17.2 (Loading states)
 */

export class SeekManager {
  private readonly SEEK_THRESHOLD = 0.03; // 30ms (Requirement 3.3)
  private readonly PLAYBACK_SEEK_THRESHOLD = 0.001; // 1ms during playback - seek every frame
  private readonly DEBOUNCE_WINDOW = 100; // 100ms (Requirement 3.4, 20.1)
  private readonly SEEK_TIMEOUT = 500; // 500ms (Requirement 3.6)

  private debounceTimers: Map<HTMLVideoElement, number> = new Map();
  private pendingSeeks: Map<HTMLVideoElement, number> = new Map();
  private seekingVideos: Set<HTMLVideoElement> = new Set(); // Track videos currently seeking (Requirement 17.2)
  private isPlaybackMode: boolean = false; // Track if we're in playback mode

  /**
   * Set playback mode - disables debouncing and uses lower threshold
   */
  setPlaybackMode(isPlaying: boolean): void {
    this.isPlaybackMode = isPlaying;
    console.log("[SEEK] Playback mode:", isPlaying);
  }

  /**
   * Seek video to target time if difference exceeds threshold
   * Requirements: 3.1, 3.2, 3.3, 10.2, 10.3
   */
  async seekIfNeeded(video: HTMLVideoElement, targetTime: number): Promise<void> {
    try {
      const currentTime = video.currentTime;
      const timeDiff = Math.abs(currentTime - targetTime);

      // Force seek if video doesn't have frame data loaded, even if already at target time
      // This triggers frame decode for videos that only have metadata (readyState < 2)
      const needsFrameLoad = video.readyState < 2;

      // Use different threshold for playback vs scrubbing
      const threshold = this.isPlaybackMode ? this.PLAYBACK_SEEK_THRESHOLD : this.SEEK_THRESHOLD;

      // Check if seek is needed (Requirements 3.1, 3.2)
      if (timeDiff <= threshold && !needsFrameLoad) {
        // Within threshold and has frame data, no seek needed (Requirement 3.2)
        return Promise.resolve();
      }

      // During playback, skip debounce for immediate seeking
      if (this.isPlaybackMode || needsFrameLoad) {
        return this.performSeek(video, targetTime);
      }

      // During scrubbing, use debounce
      return this.debouncedSeek(video, targetTime);
    } catch (error) {
      // Log seek failure with context (Requirements 10.2, 10.3)
      console.error("Seek operation failed:", {
        targetTime,
        currentTime: video.currentTime,
        error: error instanceof Error ? error.message : "Unknown error",
        videoSrc: video.src,
      });

      // Use current frame on seek failure (Requirement 10.2)
      // Don't throw - allow rendering to continue with current frame
      return Promise.resolve();
    }
  }

  /**
   * Debounce seek operations to reduce excessive seeking during scrubbing
   * Requirements: 3.4, 20.1, 20.2, 20.3, 20.4, 10.2, 10.3
   */
  private debouncedSeek(video: HTMLVideoElement, targetTime: number): Promise<void> {
    // Clear existing debounce timer (Requirement 20.2)
    const existingTimer = this.debounceTimers.get(video);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending seek (Requirement 20.2)
    this.pendingSeeks.set(video, targetTime);

    return new Promise((resolve) => {
      const timer = window.setTimeout(async () => {
        // Execute most recent seek request (Requirement 20.2)
        const finalTargetTime = this.pendingSeeks.get(video);
        if (finalTargetTime !== undefined) {
          try {
            await this.performSeek(video, finalTargetTime);
          } catch (error) {
            // Log seek failure with context (Requirements 10.2, 10.3)
            console.error("Debounced seek failed:", {
              targetTime: finalTargetTime,
              currentTime: video.currentTime,
              error: error instanceof Error ? error.message : "Unknown error",
              videoSrc: video.src,
            });
            // Continue operation - use current frame (Requirement 10.2)
          }
          this.pendingSeeks.delete(video);
        }
        this.debounceTimers.delete(video);
        resolve();
      }, this.DEBOUNCE_WINDOW);

      this.debounceTimers.set(video, timer);
    });
  }

  /**
   * Perform actual seek operation with timeout protection
   * Requirements: 3.5, 3.6, 10.2, 10.3, 17.2
   *
   * CRITICAL: Ensures video stays PAUSED after seeking
   */
  private performSeek(video: HTMLVideoElement, targetTime: number): Promise<void> {
    console.log("performSeek called - targetTime:", targetTime, "currentTime:", video.currentTime, "readyState:", video.readyState);

    return new Promise((resolve, reject) => {
      // Mark video as seeking (Requirement 17.2)
      this.seekingVideos.add(video);

      // Timeout protection (Requirement 3.6)
      const timeout = setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        // Remove from seeking state on timeout
        this.seekingVideos.delete(video);
        // Log timeout with context (Requirements 10.2, 10.3)
        console.error("Seek timeout:", {
          targetTime,
          currentTime: video.currentTime,
          videoSrc: video.src,
          timeout: this.SEEK_TIMEOUT,
        });
        reject(new Error("Seek timeout"));
      }, this.SEEK_TIMEOUT);

      const onSeeked = async () => {
        clearTimeout(timeout);
        video.removeEventListener("seeked", onSeeked);

        // CRITICAL: Ensure video stays PAUSED after seek
        if (!video.paused) {
          console.error("[SEEK] Video started playing after seek! Pausing immediately.");
          video.pause();
        }

        // Wait for frame to be decoded after seek completes
        // This ensures the video frame is actually available for drawing
        try {
          await this.waitForFrameDecode(video);
        } catch (error) {
          console.warn("Frame decode wait failed, continuing anyway:", {
            targetTime,
            currentTime: video.currentTime,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        // Remove from seeking state when complete (Requirement 17.2)
        this.seekingVideos.delete(video);
        resolve();
      };

      try {
        // Special case: if already at target time, just wait for frame decode
        // Setting currentTime won't trigger "seeked" event if already at that position
        const currentTime = video.currentTime;
        if (Math.abs(currentTime - targetTime) < 0.001) {
          console.log("Already at target time, waiting for frame decode without seek");

          // Clear timeout since we're not waiting for seeked event
          clearTimeout(timeout);

          // Just wait for frame decode (use async IIFE)
          (async () => {
            try {
              await this.waitForFrameDecode(video);
            } catch (error) {
              console.warn("Frame decode wait failed, continuing anyway:", {
                targetTime,
                currentTime: video.currentTime,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }

            // CRITICAL: Ensure video stays PAUSED
            if (!video.paused) {
              console.error("[SEEK] Video started playing! Pausing immediately.");
              video.pause();
            }

            // Remove from seeking state when complete
            this.seekingVideos.delete(video);
            resolve();
          })();
        } else {
          console.log("Seeking to different time:", targetTime);
          // Wait for seeked event (Requirement 3.5)
          video.addEventListener("seeked", onSeeked);

          // CRITICAL: Ensure video is paused before seeking
          if (!video.paused) {
            console.error("[SEEK] Video was playing before seek! Pausing first.");
            video.pause();
          }

          video.currentTime = targetTime;
        }
      } catch (error) {
        clearTimeout(timeout);
        video.removeEventListener("seeked", onSeeked);
        // Remove from seeking state on error
        this.seekingVideos.delete(video);
        // Log seek failure with context (Requirements 10.2, 10.3)
        console.error("Seek operation error:", {
          targetTime,
          currentTime: video.currentTime,
          error: error instanceof Error ? error.message : "Unknown error",
          videoSrc: video.src,
        });
        reject(error);
      }
    });
  }

  /**
   * Wait for video frame to be decoded after seek
   * This ensures the frame is actually available for drawing to canvas
   */
  private waitForFrameDecode(video: HTMLVideoElement): Promise<void> {
    // If readyState is already >= 2 (HAVE_CURRENT_DATA), frame data is available
    // Prefer >= 3 (HAVE_FUTURE_DATA) for better reliability
    // Also check if readyState exists (for test mocks that don't have it)
    if (!("readyState" in video) || video.readyState >= 2) {
      console.log("Frame already decoded, readyState:", video.readyState);
      return Promise.resolve();
    }

    console.log("Waiting for frame decode, current readyState:", video.readyState);

    // Wait for readyState to reach >= 2 or timeout after 500ms
    return new Promise((resolve) => {
      const checkReady = () => {
        if (video.readyState >= 2) {
          video.removeEventListener("loadeddata", checkReady);
          video.removeEventListener("canplay", checkReady);
          clearTimeout(timeoutId);
          console.log("Frame decode complete, readyState:", video.readyState);
          resolve();
        }
      };

      video.addEventListener("loadeddata", checkReady, { once: false });
      video.addEventListener("canplay", checkReady, { once: false });

      // Timeout after 500ms - increased from 100ms to give more time for frame decode
      const timeoutId = setTimeout(() => {
        video.removeEventListener("loadeddata", checkReady);
        video.removeEventListener("canplay", checkReady);
        console.warn("Frame decode timeout, proceeding with readyState:", video.readyState);
        resolve();
      }, 500);

      // Check immediately in case already ready
      checkReady();
    });
  }

  /**
   * Cancel all pending seeks for a video element
   * Requirement: 3.7, 17.2
   */
  cancelPendingSeeks(video: HTMLVideoElement): void {
    const timer = this.debounceTimers.get(video);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(video);
    }
    this.pendingSeeks.delete(video);
    // Note: We don't remove from seekingVideos here as the seek may still be in progress
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingSeeks.clear();
    this.seekingVideos.clear();
  }

  /**
   * Get seek threshold value (for testing)
   */
  getSeekThreshold(): number {
    return this.SEEK_THRESHOLD;
  }

  /**
   * Get debounce window value (for testing)
   */
  getDebounceWindow(): number {
    return this.DEBOUNCE_WINDOW;
  }

  /**
   * Check if video has pending seek (for testing)
   */
  hasPendingSeek(video: HTMLVideoElement): boolean {
    return this.pendingSeeks.has(video);
  }

  /**
   * Check if a video is currently seeking
   * Requirement: 17.2
   */
  isVideoSeeking(video: HTMLVideoElement): boolean {
    return this.seekingVideos.has(video);
  }

  /**
   * Check if any videos are currently seeking
   * Requirement: 17.2
   */
  hasSeekingVideos(): boolean {
    return this.seekingVideos.size > 0;
  }
}
