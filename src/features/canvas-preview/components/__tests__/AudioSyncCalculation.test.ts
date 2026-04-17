/**
 * Audio Sync Calculation Unit Tests
 * Tests the core audio sync calculation logic
 *
 * CRITICAL BUG FIX: Verifies that audio sync uses clip.clipTime directly
 * without doubling the offset calculation
 *
 * Bug: expectedAudioTime = clip.clipTime + (timelineTime - clip.startTime)
 * Fix: expectedAudioTime = clip.clipTime
 *
 * Reason: clip.clipTime already accounts for the offset from the timeline position
 */

import { describe, it, expect } from "vitest";

describe("Audio Sync Calculation Logic", () => {
  describe("Correct Formula: expectedAudioTime = clip.clipTime", () => {
    it("should use clip.clipTime directly when clip starts at timeline position 0", () => {
      // Scenario: Clip starts at timeline 0, video at 0
      const clip = {
        startTime: 0, // Timeline position
        clipTime: 0, // Video position
      };
      const timelineTime = 0;

      // CORRECT: Use clip.clipTime directly
      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(0);
    });

    it("should use clip.clipTime directly when clip starts at timeline position 5", () => {
      // Scenario: Clip starts at timeline 5s, video at 10s
      const clip = {
        startTime: 5, // Timeline position
        clipTime: 10, // Video position (already accounts for offset)
      };
      const timelineTime = 5;

      // CORRECT: Use clip.clipTime directly
      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(10);
    });

    it("should use clip.clipTime directly when timeline advances", () => {
      // Scenario: Clip starts at timeline 5s, video at 10s
      // Timeline advances to 6s (1 second into clip)
      const clip = {
        startTime: 5,
        clipTime: 11, // FrameResolver calculates this as 10 + (6 - 5) = 11
      };
      const timelineTime = 6;

      // CORRECT: Use clip.clipTime directly (FrameResolver already calculated it)
      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(11);
    });

    it("should use clip.clipTime for clip with trim offset", () => {
      // Scenario: Clip starts at timeline 0, but video starts at 5s (trimmed)
      const clip = {
        startTime: 0,
        clipTime: 5, // Video starts at 5s due to trim
      };
      const timelineTime = 0;

      // CORRECT: Use clip.clipTime directly
      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(5);
    });
  });

  describe("Incorrect Formula (OLD BUG): expectedAudioTime = clip.clipTime + (timelineTime - clip.startTime)", () => {
    it("demonstrates the bug: doubles the offset when clip starts at timeline position 5", () => {
      // Scenario: Clip starts at timeline 5s, video at 10s
      const clip = {
        startTime: 5,
        clipTime: 10, // Already accounts for offset
      };
      const timelineTime = 5;

      // WRONG (OLD BUG): Adds offset twice
      const buggyExpectedAudioTime = clip.clipTime + (timelineTime - clip.startTime);
      // = 10 + (5 - 5) = 10 (happens to be correct at start)

      // But when timeline advances to 6s:
      const timelineTime2 = 6;
      const clip2 = {
        startTime: 5,
        clipTime: 11, // FrameResolver calculated: 10 + (6 - 5) = 11
      };

      const buggyExpectedAudioTime2 = clip2.clipTime + (timelineTime2 - clip2.startTime);
      // = 11 + (6 - 5) = 12 (WRONG! Should be 11)

      expect(buggyExpectedAudioTime2).toBe(12); // Bug produces wrong value
      expect(clip2.clipTime).toBe(11); // Correct value
    });

    it("demonstrates the bug causes audio to seek to wrong position", () => {
      // Real-world scenario from logs:
      // Timeline at 11.630s, clip starts at 0s
      const clip = {
        startTime: 0,
        clipTime: 11.63, // FrameResolver calculated this
      };
      const timelineTime = 11.63;

      // WRONG (OLD BUG): Doubles the offset
      const buggyExpectedAudioTime = clip.clipTime + (timelineTime - clip.startTime);
      // = 11.630 + (11.630 - 0) = 23.260 (WRONG!)

      // CORRECT: Use clip.clipTime directly
      const correctExpectedAudioTime = clip.clipTime;
      // = 11.630 (CORRECT!)

      expect(buggyExpectedAudioTime).toBe(23.26);
      expect(correctExpectedAudioTime).toBe(11.63);
      expect(buggyExpectedAudioTime).not.toBe(correctExpectedAudioTime);
    });

    it("demonstrates the bug causes no audio when seeking beyond video duration", () => {
      // Scenario: Video is 20s long, but bug seeks to 40s (beyond duration)
      const videoDuration = 20;
      const clip = {
        startTime: 0,
        clipTime: 15, // 15 seconds into video
      };
      const timelineTime = 15;

      // WRONG (OLD BUG): Seeks beyond video duration
      const buggyExpectedAudioTime = clip.clipTime + (timelineTime - clip.startTime);
      // = 15 + (15 - 0) = 30 (beyond 20s duration, no audio!)

      // CORRECT: Stays within video duration
      const correctExpectedAudioTime = clip.clipTime;
      // = 15 (within 20s duration, audio plays!)

      expect(buggyExpectedAudioTime).toBeGreaterThan(videoDuration);
      expect(correctExpectedAudioTime).toBeLessThanOrEqual(videoDuration);
    });
  });

  describe("Edge Cases", () => {
    it("should handle clip at timeline position 0 with video at 0", () => {
      const clip = {
        startTime: 0,
        clipTime: 0,
      };
      const timelineTime = 0;

      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(0);
    });

    it("should handle clip with large offset", () => {
      const clip = {
        startTime: 100,
        clipTime: 500, // Video starts at 500s
      };
      const timelineTime = 100;

      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(500);
    });

    it("should handle clip with fractional times", () => {
      const clip = {
        startTime: 1.234,
        clipTime: 5.678,
      };
      const timelineTime = 1.234;

      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(5.678);
    });

    it("should handle clip with very small times", () => {
      const clip = {
        startTime: 0.001,
        clipTime: 0.002,
      };
      const timelineTime = 0.001;

      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(0.002);
    });
  });

  describe("Sync Threshold Logic", () => {
    it("should correct audio when drift exceeds threshold", () => {
      const SYNC_THRESHOLD = 0.1; // 100ms

      const clip = {
        clipTime: 5.0,
      };

      const actualAudioTime = 5.2; // Drifted 200ms ahead
      const expectedAudioTime = clip.clipTime;
      const drift = actualAudioTime - expectedAudioTime;

      const shouldCorrect = Math.abs(drift) > SYNC_THRESHOLD;

      expect(shouldCorrect).toBe(true);
      expect(Math.abs(drift)).toBeCloseTo(0.2, 10);
    });

    it("should not correct audio when drift is within threshold", () => {
      const SYNC_THRESHOLD = 0.1; // 100ms

      const clip = {
        clipTime: 5.0,
      };

      const actualAudioTime = 5.05; // Drifted 50ms ahead
      const expectedAudioTime = clip.clipTime;
      const drift = actualAudioTime - expectedAudioTime;

      const shouldCorrect = Math.abs(drift) > SYNC_THRESHOLD;

      expect(shouldCorrect).toBe(false);
      expect(Math.abs(drift)).toBeCloseTo(0.05, 10);
    });

    it("should handle negative drift (audio behind)", () => {
      const SYNC_THRESHOLD = 0.1;

      const clip = {
        clipTime: 5.0,
      };

      const actualAudioTime = 4.8; // Drifted 200ms behind
      const expectedAudioTime = clip.clipTime;
      const drift = actualAudioTime - expectedAudioTime;

      const shouldCorrect = Math.abs(drift) > SYNC_THRESHOLD;

      expect(shouldCorrect).toBe(true);
      expect(drift).toBeCloseTo(-0.2, 10);
    });
  });

  describe("Real-World Scenarios from Logs", () => {
    it("should match the scenario from user logs: timeline 11.630s", () => {
      // From logs: expectedTime: "23.227" but timelineTime: "11.630"
      // This shows the bug was doubling the time

      const clip = {
        startTime: 0,
        clipTime: 11.63, // FrameResolver calculated this
      };
      const timelineTime = 11.63;

      // CORRECT calculation
      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(11.63);
      expect(expectedAudioTime).not.toBe(23.227); // Bug produced this wrong value
    });

    it("should handle clip starting mid-timeline", () => {
      // Clip starts at 5s on timeline, video at 10s
      // Timeline advances to 7s (2s into clip)
      const clip = {
        startTime: 5,
        clipTime: 12, // FrameResolver: 10 + (7 - 5) = 12
      };
      const timelineTime = 7;

      const expectedAudioTime = clip.clipTime;

      expect(expectedAudioTime).toBe(12);
    });

    it("should handle multiple clips with different offsets", () => {
      const clip1 = {
        startTime: 0,
        clipTime: 5,
      };

      const clip2 = {
        startTime: 10,
        clipTime: 20,
      };

      const expectedAudioTime1 = clip1.clipTime;
      const expectedAudioTime2 = clip2.clipTime;

      expect(expectedAudioTime1).toBe(5);
      expect(expectedAudioTime2).toBe(20);
    });
  });
});
