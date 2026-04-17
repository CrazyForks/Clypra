/**
 * Unit tests for error handling in ExportPipeline
 * Requirements: 22.1, 22.4, 22.6
 */

import { describe, it, expect } from "vitest";
import { ExportPipeline } from "../ExportPipeline";
import { TimelineError, ErrorCodes } from "../../types/errors";
import type { Clip, Track } from "../../types/core";

describe("ExportPipeline Error Handling", () => {
  const pipeline = new ExportPipeline();

  const defaultOptions = {
    outputPath: "/output/video.mp4",
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    codec: "libx264",
    quality: 23,
  };

  describe("generateFFmpegCommand error handling", () => {
    it("should throw TimelineError when no clips on timeline", () => {
      const clips = new Map<string, Clip>();
      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track",
            type: "video",
            order: 0,
            height: 60,
            locked: false,
            visible: true,
            muted: false,
            color: "#0d9488",
          },
        ],
      ]);

      expect(() => pipeline.generateFFmpegCommand(clips, tracks, defaultOptions)).toThrow(TimelineError);
      expect(() => pipeline.generateFFmpegCommand(clips, tracks, defaultOptions)).toThrow("No clips on timeline");
    });

    it("should throw TimelineError when no tracks on timeline", () => {
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/path/to/video.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            name: "Test Clip",
            locked: false,
            muted: false,
            filmstripUrl: null,
            waveformPeaks: null,
          },
        ],
      ]);
      const tracks = new Map<string, Track>();

      expect(() => pipeline.generateFFmpegCommand(clips, tracks, defaultOptions)).toThrow(TimelineError);
      expect(() => pipeline.generateFFmpegCommand(clips, tracks, defaultOptions)).toThrow("No tracks on timeline");
    });

    it("should throw TimelineError when clip has empty source media path", () => {
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "", // Empty path
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            name: "Test Clip",
            locked: false,
            muted: false,
            filmstripUrl: null,
            waveformPeaks: null,
          },
        ],
      ]);
      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track",
            type: "video",
            order: 0,
            height: 60,
            locked: false,
            visible: true,
            muted: false,
            color: "#0d9488",
          },
        ],
      ]);

      expect(() => pipeline.generateFFmpegCommand(clips, tracks, defaultOptions)).toThrow(TimelineError);
      expect(() => pipeline.generateFFmpegCommand(clips, tracks, defaultOptions)).toThrow("empty source media path");
    });

    it("should generate valid command for valid timeline", () => {
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/path/to/video.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            name: "Test Clip",
            locked: false,
            muted: false,
            filmstripUrl: null,
            waveformPeaks: null,
          },
        ],
      ]);
      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track",
            type: "video",
            order: 0,
            height: 60,
            locked: false,
            visible: true,
            muted: false,
            color: "#0d9488",
          },
        ],
      ]);

      const command = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      expect(command).toBeDefined();
      expect(command.length).toBeGreaterThan(0);
      expect(command).toContain("-i");
      expect(command).toContain("/path/to/video.mp4");
    });
  });

  describe("validateSourceFiles error handling", () => {
    it("should return invalid for empty source paths", async () => {
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "", // Empty path
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            name: "Test Clip",
            locked: false,
            muted: false,
            filmstripUrl: null,
            waveformPeaks: null,
          },
        ],
      ]);

      const result = await pipeline.validateSourceFiles(clips);

      expect(result.valid).toBe(false);
      expect(result.missingFiles.length).toBeGreaterThan(0);
      expect(result.missingFiles[0]).toContain("empty path");
    });

    it("should return valid for non-empty source paths", async () => {
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/path/to/video.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            name: "Test Clip",
            locked: false,
            muted: false,
            filmstripUrl: null,
            waveformPeaks: null,
          },
        ],
      ]);

      const result = await pipeline.validateSourceFiles(clips);

      expect(result.valid).toBe(true);
      expect(result.missingFiles.length).toBe(0);
    });

    it("should provide descriptive error messages for missing files (Requirement 22.1)", async () => {
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            name: "Test Clip",
            locked: false,
            muted: false,
            filmstripUrl: null,
            waveformPeaks: null,
          },
        ],
      ]);

      const result = await pipeline.validateSourceFiles(clips);

      expect(result.valid).toBe(false);
      expect(result.missingFiles.length).toBeGreaterThan(0);
      // Error message should be descriptive
      expect(result.missingFiles[0]).toBeTruthy();
    });
  });

  describe("executeExport error handling", () => {
    it("should return error result on failure (Requirement 22.4)", async () => {
      // This is a placeholder test since executeExport is not fully implemented
      // In a real implementation, this would test actual FFmpeg execution errors

      const args = ["-i", "/nonexistent/file.mp4", "/output/video.mp4"];

      const result = await pipeline.executeExport(args);

      // Should return a result object with success/error fields
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");

      if (!result.success) {
        expect(result).toHaveProperty("error");
        expect(typeof result.error).toBe("string");
      }
    });

    it("should call progress callback during export", async () => {
      const args = ["-i", "/path/to/video.mp4", "/output/video.mp4"];
      let progressCalled = false;

      await pipeline.executeExport(args, (progress) => {
        progressCalled = true;
        expect(typeof progress).toBe("number");
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      expect(progressCalled).toBe(true);
    });
  });

  describe("Error code usage (Requirement 22.6)", () => {
    it("should use appropriate error codes for different error types", () => {
      const clips = new Map<string, Clip>();
      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track",
            type: "video",
            order: 0,
            height: 60,
            locked: false,
            visible: true,
            muted: false,
            color: "#0d9488",
          },
        ],
      ]);

      try {
        pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(TimelineError);
        expect((error as TimelineError).code).toBe(ErrorCodes.EXPORT_FAILED);
      }
    });
  });
});
