/**
 * RenderEngine - Composites multiple video frames onto canvas with proper layering and scaling
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7,
 *               12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 22.1, 22.2, 22.3, 22.4, 22.5
 *               10.1, 10.2, 10.3, 10.4 (Error handling), 17.1, 17.2, 17.3, 17.4, 17.5, 17.6 (Loading states)
 */

import type { ActiveClip } from "../types/core";

export class RenderEngine {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Render a composite frame with all active clips
   * Requirements: 4.1, 4.2, 4.7, 8.1, 8.2, 8.3, 8.4, 8.7, 10.1, 10.2, 10.3, 10.4
   */
  renderFrame(activeClips: ActiveClip[]): void {
    try {
      // Clear canvas with black background (Requirement 4.1)
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

      // If no active clips, display black canvas (Requirement 4.7)
      if (activeClips.length === 0) {
        return;
      }

      // Draw clips in order - already sorted by track order (Requirement 4.2, 8.1, 8.2, 8.3, 8.4, 8.7)
      // Lower track order values are drawn first, higher values on top
      for (const clip of activeClips) {
        try {
          this.drawClipFrame(clip);
        } catch (error) {
          // Skip invalid clips and continue rendering (Requirements 10.1, 10.2, 10.3, 10.4)
          console.error("Failed to draw clip, skipping:", {
            clipId: clip.id,
            sourcePath: clip.sourceMediaPath,
            error: error instanceof Error ? error.message : "Unknown error",
          });

          // Display error placeholder for failed clip (Requirement 10.4)
          this.drawErrorPlaceholder(clip, error instanceof Error ? error.message : "Render error");

          // Continue with next clip (Requirement 10.1)
          continue;
        }
      }
    } catch (error) {
      // Wrap drawImage in try-catch (Requirement 10.3)
      console.error("Render frame failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        activeClipsCount: activeClips.length,
      });

      // Display error state on canvas (Requirement 10.4)
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.ctx.fillStyle = "#ff0000";
      this.ctx.font = "16px sans-serif";
      this.ctx.fillText("Render error", 10, 30);
    }
  }

  /**
   * Draw a single clip frame to the canvas with aspect ratio preservation
   * Requirements: 4.3, 4.4, 4.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
   */
  private drawClipFrame(clip: ActiveClip): void {
    const video = clip.videoElement;

    // Enhanced video readiness check
    // Prefer readyState >= 3 (HAVE_FUTURE_DATA) for best results, but accept >= 2 (HAVE_CURRENT_DATA)
    // readyState >= 2 means at least current frame data is available
    // readyState >= 3 means future frames are also available (better for smooth playback)
    if (video.readyState < 2) {
      console.log("Video not ready for drawing - readyState:", video.readyState, "clipId:", clip.id);
      return;
    }

    // Get video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) {
      console.warn("Invalid video dimensions - videoWidth:", videoWidth, "videoHeight:", videoHeight, "clipId:", clip.id);
      return; // Invalid dimensions
    }

    // Validate video element state before drawImage (only in production, not for test mocks)
    if (video.src && video.src !== "" && !Number.isFinite(video.currentTime)) {
      console.warn("Video element has invalid currentTime - currentTime:", video.currentTime, "clipId:", clip.id);
      return;
    }

    // Log diagnostic information about video element state
    if (video.src && video.src !== "") {
      console.log("Drawing video frame - clipId:", clip.id, "readyState:", video.readyState, "currentTime:", video.currentTime, "videoWidth:", videoWidth, "videoHeight:", videoHeight, "src:", video.src.substring(0, 50) + "...");
    }

    // Calculate aspect ratios (Requirement 12.1, 12.2)
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = this.canvasWidth / this.canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let drawX: number;
    let drawY: number;

    // Scale video to fit canvas while maintaining aspect ratio (Requirement 4.4, 12.3, 12.4, 12.7)
    if (videoAspect > canvasAspect) {
      // Video is wider - fit width, pillarbox
      drawWidth = this.canvasWidth;
      drawHeight = this.canvasWidth / videoAspect;
      drawX = 0;
      drawY = (this.canvasHeight - drawHeight) / 2; // Center vertically (Requirement 4.5, 12.6)
    } else {
      // Video is taller - fit height, letterbox
      drawHeight = this.canvasHeight;
      drawWidth = this.canvasHeight * videoAspect;
      drawX = (this.canvasWidth - drawWidth) / 2; // Center horizontally (Requirement 4.5, 12.5)
      drawY = 0;
    }

    // Draw video frame to canvas (Requirement 4.3)
    try {
      this.ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
      console.log("Successfully drew video frame - clipId:", clip.id, "drawX:", drawX, "drawY:", drawY, "drawWidth:", drawWidth, "drawHeight:", drawHeight);
    } catch (error) {
      // Enhanced error logging with detailed video element and canvas context state
      console.error("Failed to draw video frame:", {
        clipId: clip.id,
        sourcePath: clip.sourceMediaPath,
        error: error instanceof Error ? error.message : "Unknown error",
        videoState: {
          readyState: video.readyState,
          currentTime: video.currentTime,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          src: video.src,
          paused: video.paused,
          ended: video.ended,
          networkState: video.networkState,
        },
        canvasState: {
          width: this.canvasWidth,
          height: this.canvasHeight,
          globalAlpha: this.ctx.globalAlpha,
          globalCompositeOperation: this.ctx.globalCompositeOperation,
        },
        drawParams: {
          drawX,
          drawY,
          drawWidth,
          drawHeight,
        },
      });
    }
  }

  /**
   * Draw error placeholder for failed clip
   * Requirements: 10.4, 17.6
   */
  private drawErrorPlaceholder(clip: ActiveClip, errorMessage: string): void {
    // Draw semi-transparent red rectangle
    this.ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw error text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "16px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    this.ctx.fillText("Failed to render clip", centerX, centerY - 20);
    this.ctx.fillText(errorMessage, centerX, centerY + 10);
  }

  /**
   * Draw loading indicator overlay
   * Requirements: 17.1, 17.2
   */
  drawLoadingIndicator(message: string = "Loading..."): void {
    // Draw semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw loading text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "18px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    this.ctx.fillText(message, centerX, centerY);
  }

  /**
   * Draw "No clips at this position" message
   * Requirement: 17.4
   */
  drawNoClipsMessage(): void {
    // Clear canvas with black background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw message text
    this.ctx.fillStyle = "#888888";
    this.ctx.font = "16px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    this.ctx.fillText("No clips at this position", centerX, centerY);
  }

  /**
   * Draw "Loading preview..." message during initialization
   * Requirement: 17.5
   */
  drawInitializingMessage(): void {
    // Clear canvas with black background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw message text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "18px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    this.ctx.fillText("Loading preview...", centerX, centerY);
  }

  /**
   * Draw error message for failed video load
   * Requirement: 17.6
   */
  drawVideoLoadError(fileName: string): void {
    // Clear canvas with black background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw error text
    this.ctx.fillStyle = "#ff4444";
    this.ctx.font = "16px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    this.ctx.fillText("Failed to load video:", centerX, centerY - 15);
    this.ctx.fillText(fileName, centerX, centerY + 15);
  }

  /**
   * Validate render pipeline before drawing
   * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
   */
  validateRenderPipeline(activeClips: ActiveClip[]): boolean {
    // Check canvas context is available (Requirement 22.3)
    if (!this.ctx) {
      console.warn("Canvas context not available");
      return false;
    }

    // Validate canvas dimensions (Requirement 22.6)
    if (this.canvasWidth <= 0 || this.canvasHeight <= 0) {
      console.warn("Invalid canvas dimensions");
      return false;
    }

    // Validate all clips have video elements (Requirement 22.1)
    for (const clip of activeClips) {
      if (!clip.videoElement) {
        console.warn(`Clip ${clip.id} missing video element`);
        return false;
      }

      // Validate clip time is within source boundaries (Requirement 22.2)
      if (clip.clipTime < clip.sourceStart || clip.clipTime > clip.sourceEnd) {
        console.warn(`Clip ${clip.id} time ${clip.clipTime} outside source boundaries [${clip.sourceStart}, ${clip.sourceEnd}]`);
        return false;
      }

      // Validate track order is numeric (Requirement 22.5)
      if (!Number.isFinite(clip.trackIndex)) {
        console.warn(`Clip ${clip.id} has invalid track order`);
        return false;
      }
    }

    return true;
  }
}
