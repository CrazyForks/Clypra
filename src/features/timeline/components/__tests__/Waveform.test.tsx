/**
 * Unit tests for Waveform component
 * Requirements: 10.5, 10.6, 16.2
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Waveform } from "../Waveform";

describe("Waveform Component", () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock canvas context
    mockContext = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      width: 0,
      height: 0,
      style: {},
    } as unknown as HTMLCanvasElement;

    // Mock HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext);
  });

  describe("Canvas scaling for high-DPI displays (Requirement 10.6)", () => {
    it("should scale canvas resolution with device pixel ratio", async () => {
      const originalDPR = window.devicePixelRatio;
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: 2,
      });

      const { container } = render(<Waveform peaks={[0.5, 0.8, 0.3]} width={300} height={60} />);

      const canvas = container.querySelector("canvas");
      expect(canvas).toBeTruthy();

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
      });

      // Canvas internal resolution should be scaled by DPR
      expect(canvas?.width).toBe(300 * 2);
      expect(canvas?.height).toBe(60 * 2);

      // CSS dimensions should remain unchanged
      expect(canvas?.style.width).toBe("300px");
      expect(canvas?.style.height).toBe("60px");

      // Restore original DPR
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: originalDPR,
      });
    });

    it("should handle DPR of 1 (standard displays)", async () => {
      const originalDPR = window.devicePixelRatio;
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: 1,
      });

      const { container } = render(<Waveform peaks={[0.5, 0.8, 0.3]} width={200} height={50} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.scale).toHaveBeenCalledWith(1, 1);
      });

      const canvas = container.querySelector("canvas");
      expect(canvas?.width).toBe(200);
      expect(canvas?.height).toBe(50);

      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: originalDPR,
      });
    });

    it("should handle high DPR values (3x displays)", async () => {
      const originalDPR = window.devicePixelRatio;
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: 3,
      });

      const { container } = render(<Waveform peaks={[0.5]} width={100} height={40} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.scale).toHaveBeenCalledWith(3, 3);
      });

      const canvas = container.querySelector("canvas");
      expect(canvas?.width).toBe(100 * 3);
      expect(canvas?.height).toBe(40 * 3);

      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: originalDPR,
      });
    });
  });

  describe("Waveform bar positioning and sizing (Requirements 10.5, 10.6)", () => {
    it("should render bars with correct width based on peaks array length", async () => {
      const peaks = [0.5, 0.8, 0.3, 0.6];
      const width = 400;
      const height = 60;

      render(<Waveform peaks={peaks} width={width} height={height} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalled();
      });

      // Bar width should be width / peaks.length
      const expectedBarWidth = width / peaks.length; // 100

      // Check that fillRect was called for each peak
      expect(mockContext.fillRect).toHaveBeenCalledTimes(peaks.length);

      // Verify bar positions and widths
      for (let i = 0; i < peaks.length; i++) {
        const x = i * expectedBarWidth;
        const barWidth = Math.max(1, expectedBarWidth - 1); // 99
        const centerY = height / 2; // 30
        const barHeight = peaks[i] * centerY;

        expect(mockContext.fillRect).toHaveBeenCalledWith(x, centerY - barHeight, barWidth, barHeight * 2);
      }
    });

    it("should position bars symmetrically from center line", async () => {
      const peaks = [0.5, 1.0, 0.25];
      const width = 300;
      const height = 80;

      render(<Waveform peaks={peaks} width={width} height={height} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalled();
      });

      const centerY = height / 2; // 40

      // Verify each bar is centered vertically
      peaks.forEach((peak, i) => {
        const barHeight = peak * centerY;
        const expectedY = centerY - barHeight;

        // Check that the bar starts above center and extends below
        const calls = (mockContext.fillRect as any).mock.calls;
        const call = calls[i];

        expect(call[1]).toBe(expectedY); // Y position
        expect(call[3]).toBe(barHeight * 2); // Height (symmetric)
      });
    });

    it("should apply emerald color styling", async () => {
      render(<Waveform peaks={[0.5, 0.8]} width={200} height={60} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.fillStyle).toBe("#10b981");
      });

      // Verify emerald-500 color is applied
      expect(mockContext.fillStyle).toBe("#10b981");
    });

    it("should handle empty peaks array", async () => {
      render(<Waveform peaks={[]} width={200} height={60} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });

      // Should clear canvas but not draw any bars
      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });

    it("should handle null peaks", async () => {
      render(<Waveform peaks={null} width={200} height={60} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      });

      // Should clear canvas but not draw any bars
      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });

    it("should handle single peak", async () => {
      const peaks = [0.75];
      const width = 100;
      const height = 50;

      render(<Waveform peaks={peaks} width={width} height={height} />);

      // Wait for requestAnimationFrame to complete (Requirement 16.2)
      await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalled();
      });

      // Bar should span entire width
      const barWidth = Math.max(1, width / peaks.length - 1);
      const centerY = height / 2;
      const barHeight = peaks[0] * centerY;

      expect(mockContext.fillRect).toHaveBeenCalledWith(0, centerY - barHeight, barWidth, barHeight * 2);
    });

    it("should ensure minimum bar width of 1 pixel", () => {
      // Many peaks in small width
      const peaks = new Array(1000).fill(0.5);
      const width = 100;
      const height = 60;

      render(<Waveform peaks={peaks} width={width} height={height} />);

      // Each bar should have at least 1 pixel width
      const calls = (mockContext.fillRect as any).mock.calls;
      calls.forEach((call: any) => {
        const barWidth = call[2];
        expect(barWidth).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Edge cases", () => {
    it("should not render when width is 0", () => {
      const { container } = render(<Waveform peaks={[0.5]} width={0} height={60} />);
      expect(container.querySelector("canvas")).toBeNull();
    });

    it("should not render when height is 0", () => {
      const { container } = render(<Waveform peaks={[0.5]} width={200} height={0} />);
      expect(container.querySelector("canvas")).toBeNull();
    });

    it("should not render when width is negative", () => {
      const { container } = render(<Waveform peaks={[0.5]} width={-100} height={60} />);
      expect(container.querySelector("canvas")).toBeNull();
    });

    it("should apply custom className", () => {
      const { container } = render(<Waveform peaks={[0.5]} width={200} height={60} className="custom-class" />);
      const canvas = container.querySelector("canvas");
      expect(canvas?.className).toContain("custom-class");
    });

    it("should have accessibility label", () => {
      const { container } = render(<Waveform peaks={[0.5]} width={200} height={60} />);
      const canvas = container.querySelector("canvas");
      expect(canvas?.getAttribute("aria-label")).toBe("Audio waveform visualization");
    });
  });
});
