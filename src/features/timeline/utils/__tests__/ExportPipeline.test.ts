/**
 * Unit tests for ExportPipeline
 * Requirements: 18.2, 18.3, 18.4, 18.5
 */

import { describe, it, expect } from "vitest";
import { ExportPipeline } from "../ExportPipeline";
import type { Clip, Track } from "../../types/core";

describe("ExportPipeline", () => {
  const pipeline = new ExportPipeline();

  const defaultOptions = {
    outputPath: "/output/video.mp4",
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    codec: "libx264",
    quality: 23,
  };

  describe("generateFFmpegCommand", () => {
    it("should generate command for single clip", () => {
      // Requirement 18.2: Test command generation for single clip
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track 1",
            type: "video",
            order: 0,
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#3b82f6",
          },
        ],
      ]);

      const args = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      // Should include input file
      expect(args).toContain("-i");
      expect(args).toContain("/media/video1.mp4");

      // Should include filter_complex
      expect(args).toContain("-filter_complex");

      // Should include output options
      expect(args).toContain("-c:v");
      expect(args).toContain("libx264");
      expect(args).toContain("-crf");
      expect(args).toContain("23");
      expect(args).toContain("-r");
      expect(args).toContain("30");
      expect(args).toContain("-s");
      expect(args).toContain("1920x1080");
      expect(args).toContain("-y");
      expect(args).toContain("/output/video.mp4");
    });

    it("should generate command for multi-track timeline", () => {
      // Requirement 18.3: Test command generation for multi-track timeline
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
        [
          "clip2",
          {
            id: "clip2",
            trackId: "track2",
            startTime: 2,
            duration: 3,
            sourceMediaPath: "/media/video2.mp4",
            sourceStart: 0,
            sourceEnd: 3,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 2",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track 1",
            type: "video",
            order: 0,
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#3b82f6",
          },
        ],
        [
          "track2",
          {
            id: "track2",
            name: "Video Track 2",
            type: "video",
            order: 1,
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#10b981",
          },
        ],
      ]);

      const args = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      // Should include both input files
      expect(args).toContain("/media/video1.mp4");
      expect(args).toContain("/media/video2.mp4");

      // Should include filter_complex for layering
      expect(args).toContain("-filter_complex");

      // Get the filter chain
      const filterIndex = args.indexOf("-filter_complex");
      const filterChain = args[filterIndex + 1];

      // Should contain overlay for multi-track composition
      expect(filterChain).toContain("overlay");
    });

    it("should respect track order in filter chain", () => {
      // Requirement 18.3: Test filter chain respects track order
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
        [
          "clip2",
          {
            id: "clip2",
            trackId: "track2",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video2.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 2",
            locked: false,
            muted: false,
          },
        ],
      ]);

      // Track with higher order should be on top
      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Bottom Track",
            type: "video",
            order: 0, // Bottom layer
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#3b82f6",
          },
        ],
        [
          "track2",
          {
            id: "track2",
            name: "Top Track",
            type: "video",
            order: 1, // Top layer
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#10b981",
          },
        ],
      ]);

      const args = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      const filterIndex = args.indexOf("-filter_complex");
      const filterChain = args[filterIndex + 1];

      // The filter chain should process tracks in order (0, then 1)
      // v0 should be from track1 (order 0), v1 should be from track2 (order 1)
      expect(filterChain).toContain("[v0]");
      expect(filterChain).toContain("[v1]");

      // v0 should appear before v1 in the filter chain
      const v0Index = filterChain.indexOf("[v0]");
      const v1Index = filterChain.indexOf("[v1]");
      expect(v0Index).toBeLessThan(v1Index);
    });

    it("should respect track mute settings", () => {
      // Requirement 18.4: Test mute settings affect output
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
        [
          "clip2",
          {
            id: "clip2",
            trackId: "track2",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video2.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 2",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Unmuted Track",
            type: "video",
            order: 0,
            height: 100,
            locked: false,
            visible: true,
            muted: false, // Not muted
            color: "#3b82f6",
          },
        ],
        [
          "track2",
          {
            id: "track2",
            name: "Muted Track",
            type: "video",
            order: 1,
            height: 100,
            locked: false,
            visible: true,
            muted: true, // Muted
            color: "#10b981",
          },
        ],
      ]);

      const args = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      const filterIndex = args.indexOf("-filter_complex");
      const filterChain = args[filterIndex + 1];

      // Should have audio filter for unmuted track
      expect(filterChain).toContain("atrim");
      expect(filterChain).toContain("[a0]");

      // Should NOT have audio filter for muted track
      // Count audio layer creations by looking for atrim filters
      const audioTrimCount = (filterChain.match(/atrim=/g) || []).length;
      expect(audioTrimCount).toBe(1);
    });

    it("should respect track visibility settings", () => {
      // Requirement 18.5: Test visibility settings affect output
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
        [
          "clip2",
          {
            id: "clip2",
            trackId: "track2",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video2.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 2",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Visible Track",
            type: "video",
            order: 0,
            height: 100,
            locked: false,
            visible: true, // Visible
            muted: false,
            color: "#3b82f6",
          },
        ],
        [
          "track2",
          {
            id: "track2",
            name: "Hidden Track",
            type: "video",
            order: 1,
            height: 100,
            locked: false,
            visible: false, // Hidden
            muted: false,
            color: "#10b981",
          },
        ],
      ]);

      const args = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      const filterIndex = args.indexOf("-filter_complex");
      const filterChain = args[filterIndex + 1];

      // Should have video filter for visible track
      expect(filterChain).toContain("[v0]");

      // Should NOT have video filter for hidden track
      // Count video layer creations by looking for video trim filters
      const videoTrimCount = (filterChain.match(/\[[\d]+:v\]trim=/g) || []).length;
      expect(videoTrimCount).toBe(1);
    });

    it("should handle clips with trim offsets", () => {
      // Requirement 18.2: Test trim operations for each clip
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 2, // Starts at 2 seconds on timeline
            duration: 3, // 3 seconds long
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 5, // Trimmed from 5 seconds in source
            sourceEnd: 8, // Trimmed to 8 seconds in source
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track 1",
            type: "video",
            order: 0,
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#3b82f6",
          },
        ],
      ]);

      const args = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      const filterIndex = args.indexOf("-filter_complex");
      const filterChain = args[filterIndex + 1];

      // Should contain trim with source start and end
      expect(filterChain).toContain("trim=start=5:end=8");

      // Should contain tpad with timeline start time
      expect(filterChain).toContain("tpad=start_duration=2");
    });

    it("should handle empty timeline", () => {
      const clips = new Map<string, Clip>();
      const tracks = new Map<string, Track>();

      // Should throw error for empty timeline (Requirement 22.4)
      expect(() => pipeline.generateFFmpegCommand(clips, tracks, defaultOptions)).toThrow("Cannot export: No clips on timeline");
    });

    it("should handle multiple clips from same source", () => {
      // Requirement 18.2: Group clips by source media
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 2,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 2,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
        [
          "clip2",
          {
            id: "clip2",
            trackId: "track1",
            startTime: 3,
            duration: 2,
            sourceMediaPath: "/media/video1.mp4", // Same source
            sourceStart: 5,
            sourceEnd: 7,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 2",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const tracks = new Map<string, Track>([
        [
          "track1",
          {
            id: "track1",
            name: "Video Track 1",
            type: "video",
            order: 0,
            height: 100,
            locked: false,
            visible: true,
            muted: false,
            color: "#3b82f6",
          },
        ],
      ]);

      const args = pipeline.generateFFmpegCommand(clips, tracks, defaultOptions);

      // Should only include the source file once as input
      const inputIndices: number[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "-i" && args[i + 1] === "/media/video1.mp4") {
          inputIndices.push(i);
        }
      }

      expect(inputIndices.length).toBe(1);
    });
  });

  describe("validateSourceFiles", () => {
    it("should return valid for non-empty source paths", async () => {
      // Requirement 18.6, 18.8: Validate all source media files exist
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const result = await pipeline.validateSourceFiles(clips);

      expect(result.valid).toBe(true);
      expect(result.missingFiles).toHaveLength(0);
    });

    it("should return invalid for empty source paths", async () => {
      // Requirement 18.9: Return descriptive error for missing files
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
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const result = await pipeline.validateSourceFiles(clips);

      expect(result.valid).toBe(false);
      expect(result.missingFiles).toContain("(empty path)");
    });

    it("should deduplicate source paths", async () => {
      const clips = new Map<string, Clip>([
        [
          "clip1",
          {
            id: "clip1",
            trackId: "track1",
            startTime: 0,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4",
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 1",
            locked: false,
            muted: false,
          },
        ],
        [
          "clip2",
          {
            id: "clip2",
            trackId: "track1",
            startTime: 5,
            duration: 5,
            sourceMediaPath: "/media/video1.mp4", // Same source
            sourceStart: 0,
            sourceEnd: 5,
            type: "video",
            filmstripUrl: null,
            waveformPeaks: null,
            name: "Clip 2",
            locked: false,
            muted: false,
          },
        ],
      ]);

      const result = await pipeline.validateSourceFiles(clips);

      // Should only check unique sources
      expect(result.valid).toBe(true);
      expect(result.missingFiles).toHaveLength(0);
    });
  });

  describe("executeExport", () => {
    it("should return success structure", async () => {
      // Requirement 18.7: Execute FFmpeg command via Tauri backend
      const args = ["-i", "input.mp4", "output.mp4"];

      const result = await pipeline.executeExport(args);

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should accept progress callback", async () => {
      // Requirement 18.8: Report progress percentage during export
      const args = ["-i", "input.mp4", "output.mp4"];
      let progressCalled = false;

      const result = await pipeline.executeExport(args, (progress) => {
        progressCalled = true;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      expect(result.success).toBe(true);
      expect(progressCalled).toBe(true);
    });
  });
});
