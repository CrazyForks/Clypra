/**
 * VideoPool - Manages lifecycle of HTML5 video elements with reference counting and LRU eviction
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6
 */

import type { VideoPoolEntry } from "../types/core";
import { CanvasPreviewError, CanvasPreviewErrorCode } from "../types/errors";

export class VideoPool {
  private pool: Map<string, VideoPoolEntry> = new Map();
  private maxSize: number;
  private errorListeners: Set<(error: CanvasPreviewError) => void> = new Set();
  private loadingVideos: Map<string, boolean> = new Map(); // Track videos currently loading metadata
  private isInitializing: boolean = true; // Track initial pool setup

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  /**
   * Get a video element for the given source path
   * Increments reference count and cancels pending eviction
   * Requirements: 1.1, 1.2, 1.4, 25.1, 25.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 17.1, 17.5
   */
  async getVideo(sourcePath: string): Promise<HTMLVideoElement> {
    try {
      // Check if video already exists
      let entry = this.pool.get(sourcePath);

      if (entry) {
        // Update reference count and last used time
        entry.refCount++;
        entry.lastUsed = Date.now();

        // Cancel any pending eviction (Requirement 25.6)
        if (entry.evictionTimer !== null) {
          clearTimeout(entry.evictionTimer);
          entry.evictionTimer = null;
        }

        // Wait for video to be ready
        if (!entry.isReady) {
          // Mark as loading (Requirement 17.1)
          this.loadingVideos.set(sourcePath, true);

          try {
            await this.waitForVideoReady(entry.video);
            entry.isReady = true;
            // Remove from loading state (Requirement 17.3)
            this.loadingVideos.delete(sourcePath);
          } catch (error) {
            // Remove from loading state on error
            this.loadingVideos.delete(sourcePath);

            // Emit error event with context (Requirements 10.6, 10.7)
            const previewError = new CanvasPreviewError(`Failed to prepare video: ${sourcePath}`, CanvasPreviewErrorCode.VIDEO_LOAD_FAILED, {
              sourcePath,
              recoverable: true,
            });
            this.emitError(previewError);
            // Continue operation - return video in current state (Requirement 10.2)
          }
        }

        return entry.video;
      }

      // Mark as loading (Requirement 17.1, 17.5)
      this.loadingVideos.set(sourcePath, true);

      // Create new video element (Requirement 1.2)
      const video = document.createElement("video");
      video.src = sourcePath;
      video.preload = "auto"; // Changed from "metadata" to "auto" to ensure frame data is loaded
      video.muted = true; // Start muted, will be unmuted during playback

      entry = {
        video,
        sourcePath,
        refCount: 1,
        lastUsed: Date.now(),
        isLoaded: false,
        isReady: false,
        evictionTimer: null,
      };

      // Check pool capacity (Requirement 1.5)
      if (this.pool.size >= this.maxSize) {
        this.evictLRU();
      }

      this.pool.set(sourcePath, entry);

      // Load video metadata (Requirement 1.7)
      try {
        await this.loadVideoMetadata(video);

        // Trigger initial frame load by seeking to start
        // This ensures at least one frame is decoded and ready for drawing
        if (video.currentTime !== 0) {
          video.currentTime = 0;
        }

        entry.isLoaded = true;
        entry.isReady = true;
        // Remove from loading state (Requirement 17.3)
        this.loadingVideos.delete(sourcePath);
        // Mark initialization complete after first successful load
        this.isInitializing = false;
      } catch (error) {
        // Remove from loading state on error
        this.loadingVideos.delete(sourcePath);

        // Emit error event with file path and error reason (Requirements 1.6, 10.6, 10.7, 17.6)
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const previewError = new CanvasPreviewError(`Failed to load video: ${sourcePath} - ${errorMessage}`, CanvasPreviewErrorCode.VIDEO_LOAD_FAILED, {
          sourcePath,
          recoverable: true,
        });
        this.emitError(previewError);

        // Clean up failed entry
        this.pool.delete(sourcePath);

        // Continue operation - throw error so caller can handle (Requirements 10.1, 10.2)
        throw previewError;
      }

      return video;
    } catch (error) {
      // Remove from loading state on unexpected error
      this.loadingVideos.delete(sourcePath);

      // Wrap any unexpected errors (Requirement 10.7)
      if (error instanceof CanvasPreviewError) {
        throw error;
      }

      const previewError = new CanvasPreviewError(`Unexpected error in VideoPool.getVideo: ${error instanceof Error ? error.message : "Unknown error"}`, CanvasPreviewErrorCode.VIDEO_LOAD_FAILED, {
        sourcePath,
        recoverable: true,
      });
      this.emitError(previewError);
      throw previewError;
    }
  }

  /**
   * Release a video element, decrementing reference count
   * Schedules eviction if reference count reaches zero
   * Requirements: 1.3, 25.3, 25.4
   */
  releaseVideo(sourcePath: string): void {
    const entry = this.pool.get(sourcePath);
    if (!entry) return;

    entry.refCount--;

    // Schedule eviction if no longer referenced (Requirement 25.4)
    if (entry.refCount === 0) {
      entry.evictionTimer = window.setTimeout(() => {
        this.pool.delete(sourcePath);
        entry.video.src = ""; // Release video resources
      }, 5000); // 5 second delay (Requirement 25.5)
    }
  }

  /**
   * Evict the least recently used video element with zero references
   * Requirements: 1.5, 25.2
   */
  evictLRU(): void {
    let oldestEntry: [string, VideoPoolEntry] | null = null;
    let oldestTime = Infinity;

    for (const [path, entry] of this.pool.entries()) {
      if (entry.refCount === 0 && entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestEntry = [path, entry];
      }
    }

    if (oldestEntry) {
      const [path, entry] = oldestEntry;
      if (entry.evictionTimer !== null) {
        clearTimeout(entry.evictionTimer);
      }
      entry.video.src = "";
      this.pool.delete(path);
    }
  }

  /**
   * Load video metadata with timeout
   * Requirement: 1.7
   */
  private loadVideoMetadata(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Video metadata load timeout"));
      }, 10000); // 10 second timeout

      video.addEventListener(
        "loadedmetadata",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );

      video.addEventListener(
        "error",
        () => {
          clearTimeout(timeout);
          reject(new Error(`Video load error: ${video.error?.message}`));
        },
        { once: true },
      );
    });
  }

  /**
   * Wait for video to be ready for playback
   * Requirement: 1.7
   */
  private waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    // Accept readyState >= 1 (HAVE_METADATA) as minimum - we only need dimensions
    // Frame data will be loaded on-demand when seeking
    if (video.readyState >= 1) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging forever
      const timeout = setTimeout(() => {
        video.removeEventListener("loadedmetadata", checkReady);
        video.removeEventListener("loadeddata", checkReady);
        video.removeEventListener("canplay", checkReady);
        // Resolve anyway - we'll try to use the video in its current state
        console.warn("Video ready timeout, proceeding with current state:", {
          readyState: video.readyState,
          src: video.src,
        });
        resolve();
      }, 3000); // 3 second timeout

      const checkReady = () => {
        if (video.readyState >= 1) {
          clearTimeout(timeout);
          video.removeEventListener("loadedmetadata", checkReady);
          video.removeEventListener("loadeddata", checkReady);
          video.removeEventListener("canplay", checkReady);
          resolve();
        }
      };

      video.addEventListener("loadedmetadata", checkReady, { once: false });
      video.addEventListener("loadeddata", checkReady, { once: false });
      video.addEventListener("canplay", checkReady, { once: false });

      // Also check immediately in case the video is already ready
      checkReady();
    });
  }

  /**
   * Add error listener
   * Requirement: 1.6
   */
  onError(listener: (error: CanvasPreviewError) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Emit error to all listeners
   * Requirement: 1.6
   */
  private emitError(error: CanvasPreviewError): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    for (const entry of this.pool.values()) {
      if (entry.evictionTimer !== null) {
        clearTimeout(entry.evictionTimer);
      }
      entry.video.src = "";
    }
    this.pool.clear();
    this.errorListeners.clear();
  }

  /**
   * Get current pool size (for testing)
   */
  getPoolSize(): number {
    return this.pool.size;
  }

  /**
   * Get entry for source path (for testing)
   */
  getEntry(sourcePath: string): VideoPoolEntry | undefined {
    return this.pool.get(sourcePath);
  }

  /**
   * Check if a video is currently loading metadata
   * Requirement: 17.1
   */
  isVideoLoading(sourcePath: string): boolean {
    return this.loadingVideos.has(sourcePath);
  }

  /**
   * Check if any videos are currently loading
   * Requirement: 17.1, 17.3
   */
  hasLoadingVideos(): boolean {
    return this.loadingVideos.size > 0;
  }

  /**
   * Check if the pool is in initial setup phase
   * Requirement: 17.5
   */
  isInitializingPool(): boolean {
    return this.isInitializing && this.pool.size === 0;
  }
}
