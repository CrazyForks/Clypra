/**
 * Unit tests for TimeRuler calculations
 * Requirements: 3.2, 3.3, 3.4, 3.5, 2.5, 2.6, 2.7, 3.8, 24.6
 */

import { describe, it, expect } from "vitest";

/**
 * Helper function to calculate major tick interval
 * Extracted from TimeRuler component logic
 */
function calculateMajorTickInterval(pxPerSec: number): number {
  if (pxPerSec >= 100) return 1;
  if (pxPerSec >= 48) return 2;
  if (pxPerSec >= 24) return 5;
  return 10;
}

/**
 * Helper function to calculate major ticks
 */
function calculateMajorTicks(duration: number, interval: number): number[] {
  if (duration <= 0) return [];
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 0.001; t += interval) {
    ticks.push(t);
  }
  return ticks;
}

/**
 * Helper function to check if tenth-second ticks should be visible
 */
function shouldShowTenthSecondTicks(pxPerSec: number): boolean {
  return pxPerSec >= 26;
}

/**
 * Helper function to calculate tenth-second ticks
 */
function calculateTenthSecondTicks(duration: number, pxPerSec: number): number[] {
  if (duration <= 0 || pxPerSec < 26) return [];
  const ticks: number[] = [];
  for (let s = 0; s <= Math.floor(duration + 1e-6); s++) {
    for (let i = 1; i <= 9; i++) {
      const t = s + i * 0.1;
      if (t >= duration - 1e-9) break;
      ticks.push(t);
    }
  }
  return ticks;
}

/**
 * Helper function to check if frame ticks should be visible
 */
function shouldShowFrameTicks(pxPerSec: number, fps: number): boolean {
  if (pxPerSec < 70) return false;
  const pxPerFrame = pxPerSec / fps;
  return pxPerFrame >= 11;
}

/**
 * Helper function to calculate frame tick interval
 */
function calculateFrameTickInterval(pxPerSec: number, fps: number): number {
  const pxPerFrame = pxPerSec / fps;
  return pxPerFrame >= 20 ? 2 : 4;
}

/**
 * Helper function to calculate frame ticks
 */
function calculateFrameTicks(duration: number, pxPerSec: number, fps: number): Array<{ time: number; label: string }> {
  if (duration <= 0 || !shouldShowFrameTicks(pxPerSec, fps)) return [];

  const frameInterval = calculateFrameTickInterval(pxPerSec, fps);
  const ticks: Array<{ time: number; label: string }> = [];

  for (let s = 0; s <= Math.floor(duration); s++) {
    for (let f = frameInterval; f < fps; f += frameInterval) {
      const t = s + f / fps;
      if (t >= duration - 1e-9) break;
      ticks.push({ time: t, label: `${f}f` });
    }
  }
  return ticks;
}

describe("TimeRuler calculations", () => {
  describe("Major tick interval selection", () => {
    /**
     * Test tick interval selection at different zoom levels
     * Requirements: 3.2, 3.3, 3.4, 3.5
     */
    it("should use 1-second intervals when zoom >= 100 px/sec", () => {
      expect(calculateMajorTickInterval(100)).toBe(1);
      expect(calculateMajorTickInterval(150)).toBe(1);
      expect(calculateMajorTickInterval(320)).toBe(1);
    });

    it("should use 2-second intervals when zoom is 48-99 px/sec", () => {
      expect(calculateMajorTickInterval(48)).toBe(2);
      expect(calculateMajorTickInterval(75)).toBe(2);
      expect(calculateMajorTickInterval(99)).toBe(2);
    });

    it("should use 5-second intervals when zoom is 24-47 px/sec", () => {
      expect(calculateMajorTickInterval(24)).toBe(5);
      expect(calculateMajorTickInterval(35)).toBe(5);
      expect(calculateMajorTickInterval(47)).toBe(5);
    });

    it("should use 10-second intervals when zoom < 24 px/sec", () => {
      expect(calculateMajorTickInterval(16)).toBe(10);
      expect(calculateMajorTickInterval(20)).toBe(10);
      expect(calculateMajorTickInterval(23)).toBe(10);
    });

    it("should generate correct number of major ticks", () => {
      // 10 seconds with 1-second interval: 0, 1, 2, ..., 10 = 11 ticks
      const ticks1 = calculateMajorTicks(10, 1);
      expect(ticks1.length).toBe(11);
      expect(ticks1[0]).toBe(0);
      expect(ticks1[10]).toBe(10);

      // 10 seconds with 2-second interval: 0, 2, 4, 6, 8, 10 = 6 ticks
      const ticks2 = calculateMajorTicks(10, 2);
      expect(ticks2.length).toBe(6);

      // 20 seconds with 5-second interval: 0, 5, 10, 15, 20 = 5 ticks
      const ticks5 = calculateMajorTicks(20, 5);
      expect(ticks5.length).toBe(5);

      // 30 seconds with 10-second interval: 0, 10, 20, 30 = 4 ticks
      const ticks10 = calculateMajorTicks(30, 10);
      expect(ticks10.length).toBe(4);
    });
  });

  describe("Subdivision tick visibility", () => {
    /**
     * Test tenth-second tick visibility thresholds
     * Requirements: 2.5, 3.8
     */
    it("should hide tenth-second ticks when zoom < 26 px/sec", () => {
      expect(shouldShowTenthSecondTicks(25)).toBe(false);
      expect(shouldShowTenthSecondTicks(20)).toBe(false);
      expect(shouldShowTenthSecondTicks(16)).toBe(false);
    });

    it("should show tenth-second ticks when zoom >= 26 px/sec", () => {
      expect(shouldShowTenthSecondTicks(26)).toBe(true);
      expect(shouldShowTenthSecondTicks(50)).toBe(true);
      expect(shouldShowTenthSecondTicks(100)).toBe(true);
    });

    it("should generate correct tenth-second ticks", () => {
      // 2 seconds: 9 ticks per second * 2 = 18 ticks
      const ticks = calculateTenthSecondTicks(2, 26);
      expect(ticks.length).toBe(18);

      // First tick should be at 0.1
      expect(ticks[0]).toBeCloseTo(0.1, 5);

      // Last tick should be at 1.9
      expect(ticks[ticks.length - 1]).toBeCloseTo(1.9, 5);
    });

    it("should not generate tenth-second ticks when zoom < 26", () => {
      const ticks = calculateTenthSecondTicks(10, 25);
      expect(ticks.length).toBe(0);
    });
  });

  describe("Frame tick visibility", () => {
    /**
     * Test frame tick visibility thresholds
     * Requirements: 2.6, 2.7, 24.6
     */
    it("should hide frame ticks when zoom < 70 px/sec", () => {
      expect(shouldShowFrameTicks(69, 30)).toBe(false);
      expect(shouldShowFrameTicks(50, 30)).toBe(false);
      expect(shouldShowFrameTicks(26, 30)).toBe(false);
    });

    it("should hide frame ticks when px/frame < 11", () => {
      // At 70 px/sec with 30 fps: px/frame = 70/30 = 2.33 < 11
      expect(shouldShowFrameTicks(70, 30)).toBe(false);

      // At 100 px/sec with 30 fps: px/frame = 100/30 = 3.33 < 11
      expect(shouldShowFrameTicks(100, 30)).toBe(false);
    });

    it("should show frame ticks when zoom >= 70 px/sec AND px/frame >= 11", () => {
      // At 330 px/sec with 30 fps: px/frame = 330/30 = 11
      expect(shouldShowFrameTicks(330, 30)).toBe(true);

      // At 600 px/sec with 30 fps: px/frame = 20
      expect(shouldShowFrameTicks(600, 30)).toBe(true);
    });
  });

  describe("Frame tick intervals", () => {
    /**
     * Test frame tick interval selection
     * Requirements: 2.7, 24.6
     */
    it("should use 2-frame intervals when px/frame >= 20", () => {
      // At 600 px/sec with 30 fps: px/frame = 20
      expect(calculateFrameTickInterval(600, 30)).toBe(2);

      // At 720 px/sec with 30 fps: px/frame = 24
      expect(calculateFrameTickInterval(720, 30)).toBe(2);
    });

    it("should use 4-frame intervals when px/frame < 20", () => {
      // At 330 px/sec with 30 fps: px/frame = 11
      expect(calculateFrameTickInterval(330, 30)).toBe(4);

      // At 450 px/sec with 30 fps: px/frame = 15
      expect(calculateFrameTickInterval(450, 30)).toBe(4);
    });

    it("should generate correct frame ticks with 2-frame interval", () => {
      // 1 second at 30 fps with 2-frame interval
      const ticks = calculateFrameTicks(1, 600, 30);

      // Should have ticks at 2f, 4f, 6f, ..., 28f (14 ticks)
      expect(ticks.length).toBe(14);
      expect(ticks[0].label).toBe("2f");
      expect(ticks[1].label).toBe("4f");
      expect(ticks[2].label).toBe("6f");
    });

    it("should generate correct frame ticks with 4-frame interval", () => {
      // 1 second at 30 fps with 4-frame interval
      const ticks = calculateFrameTicks(1, 330, 30);

      // Should have ticks at 4f, 8f, 12f, 16f, 20f, 24f, 28f (7 ticks)
      expect(ticks.length).toBe(7);
      expect(ticks[0].label).toBe("4f");
      expect(ticks[1].label).toBe("8f");
      expect(ticks[2].label).toBe("12f");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero duration gracefully", () => {
      expect(calculateMajorTicks(0, 1)).toEqual([]);
      expect(calculateTenthSecondTicks(0, 50)).toEqual([]);
      expect(calculateFrameTicks(0, 330, 30)).toEqual([]);
    });

    it("should handle very short durations", () => {
      const ticks = calculateMajorTicks(0.5, 1);
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks[0]).toBe(0);
    });

    it("should handle very long durations", () => {
      const ticks = calculateMajorTicks(7200, 10);
      expect(ticks.length).toBe(721); // 0, 10, 20, ..., 7200
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBe(7200);
    });

    it("should handle different frame rates", () => {
      // 24 FPS
      expect(shouldShowFrameTicks(264, 24)).toBe(true); // 264/24 = 11

      // 25 FPS
      expect(shouldShowFrameTicks(275, 25)).toBe(true); // 275/25 = 11

      // 60 FPS
      expect(shouldShowFrameTicks(660, 60)).toBe(true); // 660/60 = 11
    });
  });
});
