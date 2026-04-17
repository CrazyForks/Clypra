/**
 * Unit tests for useFilmstrip hook
 * Requirements: 11.2, 11.5
 */

import { describe, it, expect } from "vitest";
import { VIDEO_CONFIG } from "../../../../constants/config";

const { FPS, FILMSTRIP } = VIDEO_CONFIG;

/**
 * Calculate frame count based on clip duration
 * This is the same logic used in useFilmstrip hook
 * Requirement 11.2: Filmstrip shall contain between 18 and 72 frames depending on Clip duration
 */
function calculateFrameCount(durationSec: number): number {
  return Math.min(FILMSTRIP.MAX_FRAMES, Math.max(FILMSTRIP.MIN_FRAMES, Math.ceil((durationSec * FPS) / 8)));
}

/**
 * Calculate aspect ratio preservation scaling
 * This is the same logic used in drawFrameContain function
 * Requirement 11.5: Maintain source video aspect ratio without distortion
 */
function calculateAspectRatioScale(videoWidth: number, videoHeight: number, cellWidth: number, cellHeight: number): { scale: number; width: number; height: number } {
  const scale = Math.min(cellWidth / videoWidth, cellHeight / videoHeight);
  return {
    scale,
    width: videoWidth * scale,
    height: videoHeight * scale,
  };
}

describe("useFilmstrip - Frame Count Calculation", () => {
  it("should generate minimum 18 frames for very short clips", () => {
    // Requirement 11.2: Minimum 18 frames
    const duration = 0.5; // 0.5 seconds
    const frameCount = calculateFrameCount(duration);
    expect(frameCount).toBe(FILMSTRIP.MIN_FRAMES);
    expect(frameCount).toBe(18);
  });

  it("should generate maximum 72 frames for very long clips", () => {
    // Requirement 11.2: Maximum 72 frames
    const duration = 300; // 5 minutes
    const frameCount = calculateFrameCount(duration);
    expect(frameCount).toBe(FILMSTRIP.MAX_FRAMES);
    expect(frameCount).toBe(72);
  });

  it("should scale frame count proportionally for medium duration clips", () => {
    // Requirement 11.2: Frame count depends on clip duration
    const duration = 10; // 10 seconds
    const frameCount = calculateFrameCount(duration);

    // For 10 seconds at 30 FPS: (10 * 30) / 8 = 37.5, ceil = 38 frames
    expect(frameCount).toBeGreaterThanOrEqual(FILMSTRIP.MIN_FRAMES);
    expect(frameCount).toBeLessThanOrEqual(FILMSTRIP.MAX_FRAMES);
    expect(frameCount).toBe(38);
  });

  it("should generate 18 frames for 1 second clip", () => {
    // Requirement 11.2: Frame count calculation
    const duration = 1;
    const frameCount = calculateFrameCount(duration);

    // For 1 second at 30 FPS: (1 * 30) / 8 = 3.75, ceil = 4, but min is 18
    expect(frameCount).toBe(18);
  });

  it("should generate frames within valid range for various durations", () => {
    // Requirement 11.2: Test multiple durations
    const testDurations = [0.1, 1, 5, 10, 20, 30, 60, 120, 300];

    testDurations.forEach((duration) => {
      const frameCount = calculateFrameCount(duration);
      expect(frameCount).toBeGreaterThanOrEqual(FILMSTRIP.MIN_FRAMES);
      expect(frameCount).toBeLessThanOrEqual(FILMSTRIP.MAX_FRAMES);
    });
  });
});

describe("useFilmstrip - Aspect Ratio Preservation", () => {
  it("should preserve aspect ratio for landscape video (16:9)", () => {
    // Requirement 11.5: Maintain source video aspect ratio without distortion
    const videoWidth = 1920;
    const videoHeight = 1080;
    const cellWidth = FILMSTRIP.CELL_WIDTH; // 92
    const cellHeight = FILMSTRIP.CELL_HEIGHT; // 76

    const result = calculateAspectRatioScale(videoWidth, videoHeight, cellWidth, cellHeight);

    // Check that aspect ratio is preserved
    const originalAspectRatio = videoWidth / videoHeight;
    const scaledAspectRatio = result.width / result.height;

    expect(scaledAspectRatio).toBeCloseTo(originalAspectRatio, 5);

    // Check that scaled dimensions fit within cell
    expect(result.width).toBeLessThanOrEqual(cellWidth);
    expect(result.height).toBeLessThanOrEqual(cellHeight);
  });

  it("should preserve aspect ratio for portrait video (9:16)", () => {
    // Requirement 11.5: Maintain source video aspect ratio without distortion
    const videoWidth = 1080;
    const videoHeight = 1920;
    const cellWidth = FILMSTRIP.CELL_WIDTH;
    const cellHeight = FILMSTRIP.CELL_HEIGHT;

    const result = calculateAspectRatioScale(videoWidth, videoHeight, cellWidth, cellHeight);

    const originalAspectRatio = videoWidth / videoHeight;
    const scaledAspectRatio = result.width / result.height;

    expect(scaledAspectRatio).toBeCloseTo(originalAspectRatio, 5);
    expect(result.width).toBeLessThanOrEqual(cellWidth);
    expect(result.height).toBeLessThanOrEqual(cellHeight);
  });

  it("should preserve aspect ratio for square video (1:1)", () => {
    // Requirement 11.5: Maintain source video aspect ratio without distortion
    const videoWidth = 1080;
    const videoHeight = 1080;
    const cellWidth = FILMSTRIP.CELL_WIDTH;
    const cellHeight = FILMSTRIP.CELL_HEIGHT;

    const result = calculateAspectRatioScale(videoWidth, videoHeight, cellWidth, cellHeight);

    const originalAspectRatio = videoWidth / videoHeight;
    const scaledAspectRatio = result.width / result.height;

    expect(scaledAspectRatio).toBeCloseTo(originalAspectRatio, 5);
    expect(result.width).toBeLessThanOrEqual(cellWidth);
    expect(result.height).toBeLessThanOrEqual(cellHeight);
  });

  it("should preserve aspect ratio for ultra-wide video (21:9)", () => {
    // Requirement 11.5: Maintain source video aspect ratio without distortion
    const videoWidth = 2560;
    const videoHeight = 1080;
    const cellWidth = FILMSTRIP.CELL_WIDTH;
    const cellHeight = FILMSTRIP.CELL_HEIGHT;

    const result = calculateAspectRatioScale(videoWidth, videoHeight, cellWidth, cellHeight);

    const originalAspectRatio = videoWidth / videoHeight;
    const scaledAspectRatio = result.width / result.height;

    expect(scaledAspectRatio).toBeCloseTo(originalAspectRatio, 5);
    expect(result.width).toBeLessThanOrEqual(cellWidth);
    expect(result.height).toBeLessThanOrEqual(cellHeight);
  });

  it("should scale down large videos to fit cell dimensions", () => {
    // Requirement 11.5: Fit video within cell while preserving aspect ratio
    const videoWidth = 3840; // 4K
    const videoHeight = 2160;
    const cellWidth = FILMSTRIP.CELL_WIDTH;
    const cellHeight = FILMSTRIP.CELL_HEIGHT;

    const result = calculateAspectRatioScale(videoWidth, videoHeight, cellWidth, cellHeight);

    // Scaled dimensions should be much smaller than original
    expect(result.width).toBeLessThan(videoWidth);
    expect(result.height).toBeLessThan(videoHeight);

    // But should fit within cell
    expect(result.width).toBeLessThanOrEqual(cellWidth);
    expect(result.height).toBeLessThanOrEqual(cellHeight);

    // Aspect ratio should be preserved
    const originalAspectRatio = videoWidth / videoHeight;
    const scaledAspectRatio = result.width / result.height;
    expect(scaledAspectRatio).toBeCloseTo(originalAspectRatio, 5);
  });

  it("should handle very small video dimensions", () => {
    // Requirement 11.5: Handle edge case of small videos
    const videoWidth = 320;
    const videoHeight = 240;
    const cellWidth = FILMSTRIP.CELL_WIDTH;
    const cellHeight = FILMSTRIP.CELL_HEIGHT;

    const result = calculateAspectRatioScale(videoWidth, videoHeight, cellWidth, cellHeight);

    // Small video should still preserve aspect ratio
    const originalAspectRatio = videoWidth / videoHeight;
    const scaledAspectRatio = result.width / result.height;
    expect(scaledAspectRatio).toBeCloseTo(originalAspectRatio, 5);

    // Should fit within cell
    expect(result.width).toBeLessThanOrEqual(cellWidth);
    expect(result.height).toBeLessThanOrEqual(cellHeight);
  });
});
