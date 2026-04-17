/**
 * Unit tests for CoordinateSystem
 * Requirements: 1.1, 1.2, 1.6, 2.4
 */

import { describe, it, expect } from "vitest";
import { CoordinateSystem } from "../coordinateSystem";

describe("CoordinateSystem", () => {
  describe("timeToPixels", () => {
    it("should convert time to pixels at various zoom levels", () => {
      const coords50 = new CoordinateSystem(50);
      expect(coords50.timeToPixels(0)).toBe(0);
      expect(coords50.timeToPixels(1)).toBe(50);
      expect(coords50.timeToPixels(2.5)).toBe(125);
      expect(coords50.timeToPixels(10)).toBe(500);

      const coords100 = new CoordinateSystem(100);
      expect(coords100.timeToPixels(1)).toBe(100);
      expect(coords100.timeToPixels(5)).toBe(500);

      const coords16 = new CoordinateSystem(16);
      expect(coords16.timeToPixels(1)).toBe(16);
      expect(coords16.timeToPixels(10)).toBe(160);
    });

    it("should handle fractional time values", () => {
      const coords = new CoordinateSystem(60);
      expect(coords.timeToPixels(0.5)).toBe(30);
      expect(coords.timeToPixels(0.1)).toBe(6);
      expect(coords.timeToPixels(1.25)).toBe(75);
    });

    it("should handle zero time", () => {
      const coords = new CoordinateSystem(100);
      expect(coords.timeToPixels(0)).toBe(0);
    });
  });

  describe("pixelsToTime", () => {
    it("should convert pixels to time at various zoom levels", () => {
      const coords50 = new CoordinateSystem(50);
      expect(coords50.pixelsToTime(0)).toBe(0);
      expect(coords50.pixelsToTime(50)).toBe(1);
      expect(coords50.pixelsToTime(125)).toBe(2.5);
      expect(coords50.pixelsToTime(500)).toBe(10);

      const coords100 = new CoordinateSystem(100);
      expect(coords100.pixelsToTime(100)).toBe(1);
      expect(coords100.pixelsToTime(500)).toBe(5);

      const coords16 = new CoordinateSystem(16);
      expect(coords16.pixelsToTime(16)).toBe(1);
      expect(coords16.pixelsToTime(160)).toBe(10);
    });

    it("should handle fractional pixel values", () => {
      const coords = new CoordinateSystem(60);
      expect(coords.pixelsToTime(30)).toBe(0.5);
      expect(coords.pixelsToTime(6)).toBe(0.1);
      expect(coords.pixelsToTime(75)).toBe(1.25);
    });

    it("should handle zero pixels", () => {
      const coords = new CoordinateSystem(100);
      expect(coords.pixelsToTime(0)).toBe(0);
    });
  });

  describe("round-trip conversion accuracy", () => {
    it("should maintain accuracy within 0.001 seconds for round-trip conversions", () => {
      const coords = new CoordinateSystem(100);
      const testTimes = [0, 0.5, 1, 2.5, 5, 10, 30, 60, 120];

      for (const time of testTimes) {
        const pixels = coords.timeToPixels(time);
        const roundTripTime = coords.pixelsToTime(pixels);
        expect(Math.abs(roundTripTime - time)).toBeLessThanOrEqual(0.001);
      }
    });

    it("should maintain accuracy at minimum zoom level", () => {
      const coords = new CoordinateSystem(16);
      const testTimes = [0, 1, 5, 10, 30];

      for (const time of testTimes) {
        const pixels = coords.timeToPixels(time);
        const roundTripTime = coords.pixelsToTime(pixels);
        expect(Math.abs(roundTripTime - time)).toBeLessThanOrEqual(0.001);
      }
    });

    it("should maintain accuracy at maximum zoom level", () => {
      const coords = new CoordinateSystem(320);
      const testTimes = [0, 0.1, 0.5, 1, 2.5, 5];

      for (const time of testTimes) {
        const pixels = coords.timeToPixels(time);
        const roundTripTime = coords.pixelsToTime(pixels);
        expect(Math.abs(roundTripTime - time)).toBeLessThanOrEqual(0.001);
      }
    });
  });

  describe("zoomToCursor", () => {
    it("should maintain time under cursor when zooming in", () => {
      const coords = new CoordinateSystem(100);
      const cursorX = 200; // 200px from left edge of viewport
      const scrollLeft = 300; // scrolled 300px
      const zoomFactor = 1.5; // zoom in by 50%

      // Time under cursor before zoom: (300 + 200) / 100 = 5 seconds
      const timeUnderCursor = coords.pixelsToTime(scrollLeft + cursorX);
      expect(timeUnderCursor).toBe(5);

      const result = coords.zoomToCursor(cursorX, scrollLeft, zoomFactor);

      // New zoom level should be 150 px/sec
      expect(result.newPxPerSec).toBe(150);

      // Time under cursor after zoom should still be 5 seconds
      // newScrollLeft + cursorX should equal 5 * 150 = 750
      const newTimeUnderCursor = (result.newScrollLeft + cursorX) / result.newPxPerSec;
      expect(Math.abs(newTimeUnderCursor - timeUnderCursor)).toBeLessThan(0.001);
    });

    it("should maintain time under cursor when zooming out", () => {
      const coords = new CoordinateSystem(100);
      const cursorX = 150;
      const scrollLeft = 500;
      const zoomFactor = 0.8; // zoom out by 20%

      const timeUnderCursor = coords.pixelsToTime(scrollLeft + cursorX);

      const result = coords.zoomToCursor(cursorX, scrollLeft, zoomFactor);

      expect(result.newPxPerSec).toBe(80);

      const newTimeUnderCursor = (result.newScrollLeft + cursorX) / result.newPxPerSec;
      expect(Math.abs(newTimeUnderCursor - timeUnderCursor)).toBeLessThan(0.001);
    });

    it("should clamp zoom to minimum boundary", () => {
      const coords = new CoordinateSystem(20);
      const result = coords.zoomToCursor(100, 200, 0.5); // Try to zoom to 10 px/sec

      expect(result.newPxPerSec).toBe(16); // Should be clamped to minimum
    });

    it("should clamp zoom to maximum boundary", () => {
      const coords = new CoordinateSystem(300);
      const result = coords.zoomToCursor(100, 200, 1.5); // Try to zoom to 450 px/sec

      expect(result.newPxPerSec).toBe(320); // Should be clamped to maximum
    });

    it("should respect custom min/max zoom values", () => {
      const coords = new CoordinateSystem(50);
      const result = coords.zoomToCursor(100, 200, 0.5, 30, 200);

      expect(result.newPxPerSec).toBe(30); // Should be clamped to custom minimum
    });

    it("should not allow negative scroll position", () => {
      const coords = new CoordinateSystem(100);
      const cursorX = 500; // Cursor far to the right
      const scrollLeft = 100;
      const zoomFactor = 0.5; // Zoom out significantly

      const result = coords.zoomToCursor(cursorX, scrollLeft, zoomFactor);

      expect(result.newScrollLeft).toBeGreaterThanOrEqual(0);
    });

    it("should handle zoom at scroll position zero", () => {
      const coords = new CoordinateSystem(100);
      const result = coords.zoomToCursor(100, 0, 1.5);

      expect(result.newPxPerSec).toBe(150);
      expect(result.newScrollLeft).toBeGreaterThanOrEqual(0);
    });
  });

  describe("zoom constraints", () => {
    it("should enforce minimum zoom of 16 px/sec on construction", () => {
      const coords = new CoordinateSystem(10);
      expect(coords.getPxPerSec()).toBe(16);
    });

    it("should enforce maximum zoom of 320 px/sec on construction", () => {
      const coords = new CoordinateSystem(500);
      expect(coords.getPxPerSec()).toBe(320);
    });

    it("should accept valid zoom values", () => {
      const coords1 = new CoordinateSystem(16);
      expect(coords1.getPxPerSec()).toBe(16);

      const coords2 = new CoordinateSystem(100);
      expect(coords2.getPxPerSec()).toBe(100);

      const coords3 = new CoordinateSystem(320);
      expect(coords3.getPxPerSec()).toBe(320);
    });

    it("should enforce constraints when setting zoom", () => {
      const coords = new CoordinateSystem(100);

      coords.setPxPerSec(10);
      expect(coords.getPxPerSec()).toBe(16);

      coords.setPxPerSec(500);
      expect(coords.getPxPerSec()).toBe(320);

      coords.setPxPerSec(50);
      expect(coords.getPxPerSec()).toBe(50);
    });
  });

  describe("calculateMajorTickInterval", () => {
    it("should return 1 second interval for zoom >= 100 px/sec", () => {
      const coords100 = new CoordinateSystem(100);
      expect(coords100.calculateMajorTickInterval()).toBe(1);

      const coords150 = new CoordinateSystem(150);
      expect(coords150.calculateMajorTickInterval()).toBe(1);

      const coords320 = new CoordinateSystem(320);
      expect(coords320.calculateMajorTickInterval()).toBe(1);
    });

    it("should return 2 second interval for zoom 48-99 px/sec", () => {
      const coords48 = new CoordinateSystem(48);
      expect(coords48.calculateMajorTickInterval()).toBe(2);

      const coords75 = new CoordinateSystem(75);
      expect(coords75.calculateMajorTickInterval()).toBe(2);

      const coords99 = new CoordinateSystem(99);
      expect(coords99.calculateMajorTickInterval()).toBe(2);
    });

    it("should return 5 second interval for zoom 24-47 px/sec", () => {
      const coords24 = new CoordinateSystem(24);
      expect(coords24.calculateMajorTickInterval()).toBe(5);

      const coords35 = new CoordinateSystem(35);
      expect(coords35.calculateMajorTickInterval()).toBe(5);

      const coords47 = new CoordinateSystem(47);
      expect(coords47.calculateMajorTickInterval()).toBe(5);
    });

    it("should return 10 second interval for zoom < 24 px/sec", () => {
      const coords16 = new CoordinateSystem(16);
      expect(coords16.calculateMajorTickInterval()).toBe(10);

      const coords20 = new CoordinateSystem(20);
      expect(coords20.calculateMajorTickInterval()).toBe(10);

      const coords23 = new CoordinateSystem(23);
      expect(coords23.calculateMajorTickInterval()).toBe(10);
    });
  });

  describe("quantizeToFrame", () => {
    it("should quantize time to frame boundaries for 24 FPS", () => {
      const coords = new CoordinateSystem(100);

      // Frame 0: 0.000s
      expect(coords.quantizeToFrame(0, 24)).toBe(0);

      // Frame 1: 0.041666...s (1/24)
      expect(coords.quantizeToFrame(0.04, 24)).toBeCloseTo(1 / 24, 5);
      expect(coords.quantizeToFrame(0.05, 24)).toBeCloseTo(1 / 24, 5);

      // Frame 24: 1.000s
      expect(coords.quantizeToFrame(1.0, 24)).toBe(1);

      // Frame 60: 2.500s
      expect(coords.quantizeToFrame(2.5, 24)).toBe(2.5);
    });

    it("should quantize time to frame boundaries for 25 FPS", () => {
      const coords = new CoordinateSystem(100);

      // Frame 0: 0.000s
      expect(coords.quantizeToFrame(0, 25)).toBe(0);

      // Frame 1: 0.040s (1/25)
      expect(coords.quantizeToFrame(0.04, 25)).toBe(0.04);
      expect(coords.quantizeToFrame(0.05, 25)).toBeCloseTo(1 / 25, 5);

      // Frame 25: 1.000s
      expect(coords.quantizeToFrame(1.0, 25)).toBe(1);

      // Frame 50: 2.000s
      expect(coords.quantizeToFrame(2.0, 25)).toBe(2);
    });

    it("should quantize time to frame boundaries for 30 FPS", () => {
      const coords = new CoordinateSystem(100);

      // Frame 0: 0.000s
      expect(coords.quantizeToFrame(0, 30)).toBe(0);

      // Frame 1: 0.033333...s (1/30)
      expect(coords.quantizeToFrame(0.03, 30)).toBeCloseTo(1 / 30, 5);
      expect(coords.quantizeToFrame(0.04, 30)).toBeCloseTo(1 / 30, 5);

      // Frame 30: 1.000s
      expect(coords.quantizeToFrame(1.0, 30)).toBe(1);

      // Frame 90: 3.000s
      expect(coords.quantizeToFrame(3.0, 30)).toBe(3);
    });

    it("should quantize time to frame boundaries for 50 FPS", () => {
      const coords = new CoordinateSystem(100);

      // Frame 0: 0.000s
      expect(coords.quantizeToFrame(0, 50)).toBe(0);

      // Frame 1: 0.020s (1/50)
      expect(coords.quantizeToFrame(0.02, 50)).toBe(0.02);
      expect(coords.quantizeToFrame(0.025, 50)).toBeCloseTo(1 / 50, 5);

      // Frame 50: 1.000s
      expect(coords.quantizeToFrame(1.0, 50)).toBe(1);

      // Frame 100: 2.000s
      expect(coords.quantizeToFrame(2.0, 50)).toBe(2);
    });

    it("should quantize time to frame boundaries for 60 FPS", () => {
      const coords = new CoordinateSystem(100);

      // Frame 0: 0.000s
      expect(coords.quantizeToFrame(0, 60)).toBe(0);

      // Frame 1: 0.016666...s (1/60)
      expect(coords.quantizeToFrame(0.015, 60)).toBeCloseTo(1 / 60, 5);
      expect(coords.quantizeToFrame(0.02, 60)).toBeCloseTo(1 / 60, 5);

      // Frame 60: 1.000s
      expect(coords.quantizeToFrame(1.0, 60)).toBe(1);

      // Frame 120: 2.000s
      expect(coords.quantizeToFrame(2.0, 60)).toBe(2);
    });

    it("should round to nearest frame boundary", () => {
      const coords = new CoordinateSystem(100);

      // At 30 FPS, frame duration is 1/30 = 0.033333...s
      // Time 0.050s is between frame 1 (0.033s) and frame 2 (0.067s)
      // Should round to frame 2 (closer)
      const result = coords.quantizeToFrame(0.05, 30);
      expect(result).toBeCloseTo(2 / 30, 5);

      // Time 0.040s is between frame 1 (0.033s) and frame 2 (0.067s)
      // Should round to frame 1 (closer)
      const result2 = coords.quantizeToFrame(0.04, 30);
      expect(result2).toBeCloseTo(1 / 30, 5);
    });

    it("should maintain accuracy within 0.001 seconds", () => {
      const coords = new CoordinateSystem(100);
      const fps = 24;
      const testTimes = [0, 0.5, 1, 2.5, 5, 10];

      for (const time of testTimes) {
        const quantized = coords.quantizeToFrame(time, fps);
        // The quantized time should be within one frame duration of the original
        const frameDuration = 1 / fps;
        expect(Math.abs(quantized - time)).toBeLessThanOrEqual(frameDuration / 2 + 0.001);
      }
    });

    it("should handle fractional frame numbers correctly", () => {
      const coords = new CoordinateSystem(100);

      // At 24 FPS, time 1.5s should be frame 36 (1.5 * 24 = 36)
      const result = coords.quantizeToFrame(1.5, 24);
      expect(result).toBe(1.5);

      // At 30 FPS, time 2.5s should be frame 75 (2.5 * 30 = 75)
      const result2 = coords.quantizeToFrame(2.5, 30);
      expect(result2).toBe(2.5);
    });

    it("should handle very small time values", () => {
      const coords = new CoordinateSystem(100);

      // Very small time should round to frame 0
      expect(coords.quantizeToFrame(0.001, 24)).toBeCloseTo(0, 5);
      expect(coords.quantizeToFrame(0.005, 30)).toBeCloseTo(0, 5);
    });

    it("should handle large time values", () => {
      const coords = new CoordinateSystem(100);

      // Large time values should still quantize correctly
      const result = coords.quantizeToFrame(120.5, 24); // 2 minutes 0.5 seconds
      expect(result).toBeCloseTo(120.5, 5);

      const result2 = coords.quantizeToFrame(3600, 30); // 1 hour
      expect(result2).toBe(3600);
    });
  });
});
