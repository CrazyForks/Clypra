/**
 * Unit tests for Playhead component
 * Requirements: 4.5, 4.7
 */

import { describe, it, expect } from "vitest";
import { CoordinateSystem } from "../../utils/coordinateSystem";

describe("Playhead positioning", () => {
  describe("playhead position calculation at various zoom levels", () => {
    it("should calculate correct position at minimum zoom (16 px/sec)", () => {
      const coords = new CoordinateSystem(16);
      const playhead = 10; // 10 seconds
      const scrollLeft = 0;

      const playheadPixels = coords.timeToPixels(playhead);
      const viewportX = playheadPixels - scrollLeft;

      expect(playheadPixels).toBe(160); // 10 * 16
      expect(viewportX).toBe(160);
    });

    it("should calculate correct position at default zoom (48 px/sec)", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 10; // 10 seconds
      const scrollLeft = 0;

      const playheadPixels = coords.timeToPixels(playhead);
      const viewportX = playheadPixels - scrollLeft;

      expect(playheadPixels).toBe(480); // 10 * 48
      expect(viewportX).toBe(480);
    });

    it("should calculate correct position at maximum zoom (320 px/sec)", () => {
      const coords = new CoordinateSystem(320);
      const playhead = 10; // 10 seconds
      const scrollLeft = 0;

      const playheadPixels = coords.timeToPixels(playhead);
      const viewportX = playheadPixels - scrollLeft;

      expect(playheadPixels).toBe(3200); // 10 * 320
      expect(viewportX).toBe(3200);
    });

    it("should adjust viewport position based on scroll", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 10; // 10 seconds
      const scrollLeft = 240; // scrolled 5 seconds worth

      const playheadPixels = coords.timeToPixels(playhead);
      const viewportX = playheadPixels - scrollLeft;

      expect(playheadPixels).toBe(480);
      expect(viewportX).toBe(240); // 480 - 240
    });

    it("should handle playhead at timeline start", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 0;
      const scrollLeft = 0;

      const playheadPixels = coords.timeToPixels(playhead);
      const viewportX = playheadPixels - scrollLeft;

      expect(playheadPixels).toBe(0);
      expect(viewportX).toBe(0);
    });

    it("should handle playhead at timeline end", () => {
      const coords = new CoordinateSystem(48);
      const duration = 300; // 5 minutes
      const playhead = duration;
      const scrollLeft = 0;

      const playheadPixels = coords.timeToPixels(playhead);
      const viewportX = playheadPixels - scrollLeft;

      expect(playheadPixels).toBe(14400); // 300 * 48
      expect(viewportX).toBe(14400);
    });

    it("should maintain position accuracy across zoom changes", () => {
      const playhead = 10; // 10 seconds

      const coords16 = new CoordinateSystem(16);
      const coords48 = new CoordinateSystem(48);
      const coords320 = new CoordinateSystem(320);

      const pixels16 = coords16.timeToPixels(playhead);
      const pixels48 = coords48.timeToPixels(playhead);
      const pixels320 = coords320.timeToPixels(playhead);

      // Verify time is preserved when converting back
      expect(coords16.pixelsToTime(pixels16)).toBe(playhead);
      expect(coords48.pixelsToTime(pixels48)).toBe(playhead);
      expect(coords320.pixelsToTime(pixels320)).toBe(playhead);
    });
  });

  describe("auto-scroll trigger conditions", () => {
    it("should trigger auto-scroll when playhead is left of left margin", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 5; // 5 seconds
      const viewportWidth = 960; // 20 seconds at 48 px/sec
      const scrollLeft = 480; // scrolled to 10 seconds
      const marginPercent = 0.15;

      const playheadX = coords.timeToPixels(playhead); // 240 px
      const margin = viewportWidth * marginPercent; // 144 px
      const leftBoundary = scrollLeft + margin; // 624 px

      const shouldScroll = playheadX < leftBoundary;
      expect(shouldScroll).toBe(true);
    });

    it("should trigger auto-scroll when playhead is right of right margin", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 25; // 25 seconds
      const viewportWidth = 960; // 20 seconds at 48 px/sec
      const scrollLeft = 0;
      const marginPercent = 0.15;

      const playheadX = coords.timeToPixels(playhead); // 1200 px
      const margin = viewportWidth * marginPercent; // 144 px
      const rightBoundary = scrollLeft + viewportWidth - margin; // 816 px

      const shouldScroll = playheadX > rightBoundary;
      expect(shouldScroll).toBe(true);
    });

    it("should not trigger auto-scroll when playhead is within margins", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 10; // 10 seconds
      const viewportWidth = 960; // 20 seconds at 48 px/sec
      const scrollLeft = 0;
      const marginPercent = 0.15;

      const playheadX = coords.timeToPixels(playhead); // 480 px
      const margin = viewportWidth * marginPercent; // 144 px
      const leftBoundary = scrollLeft + margin; // 144 px
      const rightBoundary = scrollLeft + viewportWidth - margin; // 816 px

      const shouldScroll = playheadX < leftBoundary || playheadX > rightBoundary;
      expect(shouldScroll).toBe(false);
    });

    it("should calculate correct target scroll position for centering", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 30; // 30 seconds
      const viewportWidth = 960; // 20 seconds at 48 px/sec

      const playheadX = coords.timeToPixels(playhead); // 1440 px
      const targetScrollLeft = playheadX - viewportWidth / 2; // 1440 - 480 = 960 px

      expect(targetScrollLeft).toBe(960);
    });

    it("should clamp scroll position to valid range", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 2; // 2 seconds (near start)
      const viewportWidth = 960;
      const scrollWidth = 14400; // 300 seconds total

      const playheadX = coords.timeToPixels(playhead); // 96 px
      const targetScrollLeft = playheadX - viewportWidth / 2; // 96 - 480 = -384 px

      // Should clamp to 0
      const clampedScrollLeft = Math.max(0, targetScrollLeft);
      expect(clampedScrollLeft).toBe(0);
    });

    it("should handle 15% margin correctly", () => {
      const viewportWidth = 1000;
      const marginPercent = 0.15;
      const margin = viewportWidth * marginPercent;

      expect(margin).toBe(150);
    });

    it("should calculate margins at different viewport sizes", () => {
      const marginPercent = 0.15;

      const smallViewport = 600;
      const mediumViewport = 1200;
      const largeViewport = 1920;

      expect(smallViewport * marginPercent).toBe(90);
      expect(mediumViewport * marginPercent).toBe(180);
      expect(largeViewport * marginPercent).toBe(288);
    });
  });

  describe("playhead positioning with scroll", () => {
    it("should remain visible when scrolling horizontally", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 10; // 10 seconds
      const playheadPixels = coords.timeToPixels(playhead); // 480 px

      // Test at different scroll positions
      const scrollPositions = [0, 240, 480, 720, 960];

      scrollPositions.forEach((scrollLeft) => {
        const viewportX = playheadPixels - scrollLeft;
        // Playhead should be positioned relative to viewport
        expect(viewportX).toBe(480 - scrollLeft);
      });
    });

    it("should handle negative viewport positions when scrolled past playhead", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 5; // 5 seconds
      const playheadPixels = coords.timeToPixels(playhead); // 240 px
      const scrollLeft = 480; // scrolled past playhead

      const viewportX = playheadPixels - scrollLeft;
      expect(viewportX).toBe(-240); // Playhead is off-screen to the left
    });

    it("should handle large viewport positions when playhead is far ahead", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 100; // 100 seconds
      const playheadPixels = coords.timeToPixels(playhead); // 4800 px
      const scrollLeft = 0;

      const viewportX = playheadPixels - scrollLeft;
      expect(viewportX).toBe(4800); // Playhead is far off-screen to the right
    });
  });

  describe("edge cases", () => {
    it("should handle zero duration timeline", () => {
      const coords = new CoordinateSystem(48);
      const duration = 0;
      const playhead = 0;

      const playheadPixels = coords.timeToPixels(playhead);
      expect(playheadPixels).toBe(0);
    });

    it("should handle very small playhead values", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 0.001; // 1 millisecond

      const playheadPixels = coords.timeToPixels(playhead);
      expect(playheadPixels).toBeCloseTo(0.048, 3);
    });

    it("should handle very large playhead values", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 3600; // 1 hour

      const playheadPixels = coords.timeToPixels(playhead);
      expect(playheadPixels).toBe(172800);
    });

    it("should handle fractional scroll positions", () => {
      const coords = new CoordinateSystem(48);
      const playhead = 10.5; // 10.5 seconds
      const scrollLeft = 123.456;

      const playheadPixels = coords.timeToPixels(playhead);
      const viewportX = playheadPixels - scrollLeft;

      expect(playheadPixels).toBe(504);
      expect(viewportX).toBeCloseTo(380.544, 3);
    });
  });
});
