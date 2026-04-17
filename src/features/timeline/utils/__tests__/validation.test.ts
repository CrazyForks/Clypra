/**
 * Unit tests for validation utilities
 * Requirements: 15.2, 22.6
 */

import { describe, it, expect } from "vitest";
import { validateClipDuration, validateClipStartTime, validateClipEndTime, validateClipExists, validateTrackExists, validateTrackTypeCompatibility, validateZoomLevel } from "../validation";
import { TimelineError, ErrorCodes } from "../../types/errors";
import type { Clip, Track } from "../../types/core";

describe("validateClipDuration", () => {
  it("should not throw for valid durations", () => {
    expect(() => validateClipDuration(0.1)).not.toThrow();
    expect(() => validateClipDuration(1)).not.toThrow();
    expect(() => validateClipDuration(100)).not.toThrow();
  });

  it("should throw for durations below minimum", () => {
    expect(() => validateClipDuration(0.05)).toThrow(TimelineError);
    expect(() => validateClipDuration(0)).toThrow(TimelineError);
    expect(() => validateClipDuration(-1)).toThrow(TimelineError);
  });

  it("should respect custom minimum duration", () => {
    expect(() => validateClipDuration(0.5, 1.0)).toThrow(TimelineError);
    expect(() => validateClipDuration(1.0, 1.0)).not.toThrow();
  });

  it("should throw recoverable errors", () => {
    try {
      validateClipDuration(0.05);
    } catch (error) {
      expect(error).toBeInstanceOf(TimelineError);
      expect((error as TimelineError).recoverable).toBe(true);
      expect((error as TimelineError).code).toBe(ErrorCodes.INVALID_TRIM);
    }
  });
});

describe("validateClipStartTime", () => {
  it("should not throw for valid start times", () => {
    expect(() => validateClipStartTime(0)).not.toThrow();
    expect(() => validateClipStartTime(1)).not.toThrow();
    expect(() => validateClipStartTime(100)).not.toThrow();
  });

  it("should throw for negative start times", () => {
    expect(() => validateClipStartTime(-1)).toThrow(TimelineError);
    expect(() => validateClipStartTime(-0.1)).toThrow(TimelineError);
  });

  it("should throw recoverable errors", () => {
    try {
      validateClipStartTime(-1);
    } catch (error) {
      expect(error).toBeInstanceOf(TimelineError);
      expect((error as TimelineError).recoverable).toBe(true);
      expect((error as TimelineError).code).toBe(ErrorCodes.INVALID_TRIM);
    }
  });
});

describe("validateClipEndTime", () => {
  it("should not throw when end time is within timeline duration", () => {
    expect(() => validateClipEndTime(50, 100)).not.toThrow();
    expect(() => validateClipEndTime(100, 100)).not.toThrow();
    expect(() => validateClipEndTime(0, 100)).not.toThrow();
  });

  it("should throw when end time exceeds timeline duration", () => {
    expect(() => validateClipEndTime(101, 100)).toThrow(TimelineError);
    expect(() => validateClipEndTime(200, 100)).toThrow(TimelineError);
  });

  it("should throw recoverable errors", () => {
    try {
      validateClipEndTime(101, 100);
    } catch (error) {
      expect(error).toBeInstanceOf(TimelineError);
      expect((error as TimelineError).recoverable).toBe(true);
      expect((error as TimelineError).code).toBe(ErrorCodes.INVALID_TRIM);
    }
  });
});

describe("validateClipExists", () => {
  it("should not throw when clip exists", () => {
    const clip: Clip = {
      id: "clip1",
      trackId: "track1",
      startTime: 0,
      duration: 10,
      sourceMediaPath: "/path/to/video.mp4",
      sourceStart: 0,
      sourceEnd: 10,
      type: "video",
      filmstripUrl: null,
      waveformPeaks: null,
      name: "Test Clip",
      locked: false,
      muted: false,
    };

    expect(() => validateClipExists(clip, "clip1")).not.toThrow();
  });

  it("should throw when clip is undefined", () => {
    expect(() => validateClipExists(undefined, "clip1")).toThrow(TimelineError);
  });

  it("should throw non-recoverable errors", () => {
    try {
      validateClipExists(undefined, "clip1");
    } catch (error) {
      expect(error).toBeInstanceOf(TimelineError);
      expect((error as TimelineError).recoverable).toBe(false);
      expect((error as TimelineError).code).toBe(ErrorCodes.CLIP_NOT_FOUND);
    }
  });
});

describe("validateTrackExists", () => {
  it("should not throw when track exists", () => {
    const track: Track = {
      id: "track1",
      name: "Video Track 1",
      type: "video",
      order: 0,
      height: 100,
      locked: false,
      visible: true,
      muted: false,
      color: "#3b82f6",
    };

    expect(() => validateTrackExists(track, "track1")).not.toThrow();
  });

  it("should throw when track is undefined", () => {
    expect(() => validateTrackExists(undefined, "track1")).toThrow(TimelineError);
  });

  it("should throw non-recoverable errors", () => {
    try {
      validateTrackExists(undefined, "track1");
    } catch (error) {
      expect(error).toBeInstanceOf(TimelineError);
      expect((error as TimelineError).recoverable).toBe(false);
      expect((error as TimelineError).code).toBe(ErrorCodes.TRACK_NOT_FOUND);
    }
  });
});

describe("validateTrackTypeCompatibility", () => {
  // Requirement 23.1: Video clips on video tracks
  it("should allow video clips on video tracks", () => {
    expect(() => validateTrackTypeCompatibility("video", "video")).not.toThrow();
  });

  // Requirement 23.2: Audio clips on audio tracks
  it("should allow audio clips on audio tracks", () => {
    expect(() => validateTrackTypeCompatibility("audio", "audio")).not.toThrow();
  });

  // Requirement 23.3: Text clips on text tracks
  it("should allow text clips on text tracks", () => {
    expect(() => validateTrackTypeCompatibility("text", "text")).not.toThrow();
  });

  // Requirement 23.5: Video+audio clips on video tracks
  it("should allow video clips with audio on video tracks", () => {
    // Video clips can contain both video and audio content
    expect(() => validateTrackTypeCompatibility("video", "video")).not.toThrow();
  });

  // Requirement 23.6: Audio extraction for video clips on audio tracks
  it("should allow video clips on audio tracks (audio extraction)", () => {
    expect(() => validateTrackTypeCompatibility("video", "audio")).not.toThrow();
  });

  // Requirement 23.4: Prevent incompatible clip placement
  it("should throw for audio clips on video tracks", () => {
    expect(() => validateTrackTypeCompatibility("audio", "video")).toThrow(TimelineError);
  });

  it("should throw for text clips on video tracks", () => {
    expect(() => validateTrackTypeCompatibility("text", "video")).toThrow(TimelineError);
  });

  it("should throw for audio clips on text tracks", () => {
    expect(() => validateTrackTypeCompatibility("audio", "text")).toThrow(TimelineError);
  });

  it("should throw for video clips on text tracks", () => {
    expect(() => validateTrackTypeCompatibility("video", "text")).toThrow(TimelineError);
  });

  it("should throw for text clips on audio tracks", () => {
    expect(() => validateTrackTypeCompatibility("text", "audio")).toThrow(TimelineError);
  });

  it("should throw for video clips on effects tracks", () => {
    expect(() => validateTrackTypeCompatibility("video", "effects")).toThrow(TimelineError);
  });

  it("should throw for audio clips on effects tracks", () => {
    expect(() => validateTrackTypeCompatibility("audio", "effects")).toThrow(TimelineError);
  });

  it("should throw for text clips on effects tracks", () => {
    expect(() => validateTrackTypeCompatibility("text", "effects")).toThrow(TimelineError);
  });

  it("should throw recoverable errors with correct error code", () => {
    try {
      validateTrackTypeCompatibility("audio", "video");
    } catch (error) {
      expect(error).toBeInstanceOf(TimelineError);
      expect((error as TimelineError).recoverable).toBe(true);
      expect((error as TimelineError).code).toBe(ErrorCodes.INVALID_TRACK_TYPE);
    }
  });

  it("should provide descriptive error messages", () => {
    try {
      validateTrackTypeCompatibility("audio", "video");
    } catch (error) {
      expect(error).toBeInstanceOf(TimelineError);
      expect((error as TimelineError).message).toContain("audio");
      expect((error as TimelineError).message).toContain("video");
    }
  });
});

describe("validateZoomLevel", () => {
  it("should return value when within bounds", () => {
    expect(validateZoomLevel(50)).toBe(50);
    expect(validateZoomLevel(16)).toBe(16);
    expect(validateZoomLevel(320)).toBe(320);
  });

  it("should clamp to minimum when below", () => {
    expect(validateZoomLevel(10)).toBe(16);
    expect(validateZoomLevel(0)).toBe(16);
    expect(validateZoomLevel(-5)).toBe(16);
  });

  it("should clamp to maximum when above", () => {
    expect(validateZoomLevel(400)).toBe(320);
    expect(validateZoomLevel(1000)).toBe(320);
  });

  it("should respect custom min and max", () => {
    expect(validateZoomLevel(50, 10, 100)).toBe(50);
    expect(validateZoomLevel(5, 10, 100)).toBe(10);
    expect(validateZoomLevel(150, 10, 100)).toBe(100);
  });
});
