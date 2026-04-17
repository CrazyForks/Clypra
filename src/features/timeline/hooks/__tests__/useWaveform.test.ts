/**
 * Unit tests for useWaveform hook
 * Requirements: 10.3, 10.4, 10.7, 22.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWaveform } from "../useWaveform";
import * as tauriLib from "../../../../lib/tauri";

vi.mock("../../../../lib/tauri");

describe("useWaveform Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Waveform data loading (Requirements 10.3, 10.4)", () => {
    it("should load waveform peaks with 1000 sample buckets", async () => {
      const mockPeaks = new Array(1000).fill(0).map((_, i) => Math.sin(i / 100) * 0.5 + 0.5);
      vi.spyOn(tauriLib, "getAudioWaveformPeaks").mockResolvedValue(mockPeaks);

      const { result } = renderHook(() => useWaveform("/path/to/audio.mp3", true));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.peaks).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify 1000 buckets were requested (Requirement 10.4)
      expect(tauriLib.getAudioWaveformPeaks).toHaveBeenCalledWith("/path/to/audio.mp3", 1000);

      // Verify peaks are loaded
      expect(result.current.peaks).toEqual(mockPeaks);
      expect(result.current.error).toBeNull();
    });

    it("should not load when sourceMediaPath is null", () => {
      const { result } = renderHook(() => useWaveform(null, true));

      expect(result.current.loading).toBe(false);
      expect(result.current.peaks).toBeNull();
      expect(result.current.error).toBeNull();
      expect(tauriLib.getAudioWaveformPeaks).not.toHaveBeenCalled();
    });

    it("should not load when enabled is false", () => {
      const { result } = renderHook(() => useWaveform("/path/to/audio.mp3", false));

      expect(result.current.loading).toBe(false);
      expect(result.current.peaks).toBeNull();
      expect(result.current.error).toBeNull();
      expect(tauriLib.getAudioWaveformPeaks).not.toHaveBeenCalled();
    });
  });

  describe("Loading indicator (Requirement 10.7)", () => {
    it("should display loading state during generation", async () => {
      let resolvePromise: (value: number[]) => void;
      const promise = new Promise<number[]>((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(tauriLib, "getAudioWaveformPeaks").mockReturnValue(promise);

      const { result } = renderHook(() => useWaveform("/path/to/audio.mp3", true));

      // Should be loading
      expect(result.current.loading).toBe(true);
      expect(result.current.peaks).toBeNull();

      // Resolve the promise
      const mockPeaks = new Array(1000).fill(0.5);
      resolvePromise!(mockPeaks);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.peaks).toEqual(mockPeaks);
    });
  });

  describe("Error handling (Requirement 22.2)", () => {
    it("should handle generation failures gracefully", async () => {
      const errorMessage = "FFmpeg not found";
      vi.spyOn(tauriLib, "getAudioWaveformPeaks").mockRejectedValue(new Error(errorMessage));

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useWaveform("/path/to/audio.mp3", true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have error state
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.peaks).toBeNull();

      // Should log warning
      expect(consoleWarnSpy).toHaveBeenCalledWith("Waveform generation failed:", errorMessage);

      consoleWarnSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      vi.spyOn(tauriLib, "getAudioWaveformPeaks").mockRejectedValue("String error");

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useWaveform("/path/to/audio.mp3", true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to generate waveform");
      expect(result.current.peaks).toBeNull();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Cleanup and cancellation", () => {
    it("should cancel in-progress generation when source changes", async () => {
      const mockPeaks1 = new Array(1000).fill(0.3);
      const mockPeaks2 = new Array(1000).fill(0.7);

      let resolveFirst: (value: number[]) => void;
      const firstPromise = new Promise<number[]>((resolve) => {
        resolveFirst = resolve;
      });

      vi.spyOn(tauriLib, "getAudioWaveformPeaks").mockReturnValueOnce(firstPromise);

      const { result, rerender } = renderHook(({ path }) => useWaveform(path, true), { initialProps: { path: "/path/to/audio1.mp3" } });

      expect(result.current.loading).toBe(true);

      // Change source before first completes
      vi.spyOn(tauriLib, "getAudioWaveformPeaks").mockResolvedValueOnce(mockPeaks2);
      rerender({ path: "/path/to/audio2.mp3" });

      // Resolve first promise (should be ignored)
      resolveFirst!(mockPeaks1);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have second peaks, not first
      expect(result.current.peaks).toEqual(mockPeaks2);
    });

    it("should reset state when source changes", async () => {
      const mockPeaks1 = new Array(1000).fill(0.3);
      vi.spyOn(tauriLib, "getAudioWaveformPeaks").mockResolvedValue(mockPeaks1);

      const { result, rerender } = renderHook(({ path }) => useWaveform(path, true), { initialProps: { path: "/path/to/audio1.mp3" } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.peaks).toEqual(mockPeaks1);

      // Change to null source
      rerender({ path: null });

      // State should be reset
      expect(result.current.peaks).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
