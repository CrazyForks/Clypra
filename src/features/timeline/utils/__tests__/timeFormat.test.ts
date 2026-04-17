/**
 * Unit tests for time formatting utilities
 * Requirements: 15.2, 22.6
 */

import { describe, it, expect } from "vitest";
import { formatTime, formatTimeWithMillis, parseTime } from "../timeFormat";

describe("formatTime", () => {
  it("should format times under 60 minutes as MM:SS", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(30)).toBe("00:30");
    expect(formatTime(59)).toBe("00:59");
    expect(formatTime(60)).toBe("01:00");
    expect(formatTime(125)).toBe("02:05");
    expect(formatTime(3599)).toBe("59:59");
  });

  it("should format times 60 minutes or longer as HH:MM:SS", () => {
    expect(formatTime(3600)).toBe("01:00:00");
    expect(formatTime(3661)).toBe("01:01:01");
    expect(formatTime(7200)).toBe("02:00:00");
    expect(formatTime(7325)).toBe("02:02:05");
    expect(formatTime(36000)).toBe("10:00:00");
  });

  it("should handle fractional seconds by flooring", () => {
    expect(formatTime(5.7)).toBe("00:05");
    expect(formatTime(59.999)).toBe("00:59");
    expect(formatTime(3600.5)).toBe("01:00:00");
  });

  it("should pad single digits with zeros", () => {
    expect(formatTime(1)).toBe("00:01");
    expect(formatTime(61)).toBe("01:01");
    expect(formatTime(3661)).toBe("01:01:01");
  });
});

describe("formatTimeWithMillis", () => {
  it("should include milliseconds in the output", () => {
    expect(formatTimeWithMillis(0)).toBe("00:00.000");
    expect(formatTimeWithMillis(5.123)).toBe("00:05.123");
    expect(formatTimeWithMillis(30.5)).toBe("00:30.500");
    expect(formatTimeWithMillis(3600.999)).toBe("01:00:00.999");
  });

  it("should pad milliseconds with zeros", () => {
    expect(formatTimeWithMillis(5.001)).toBe("00:05.001");
    expect(formatTimeWithMillis(5.01)).toBe("00:05.010");
    expect(formatTimeWithMillis(5.1)).toBe("00:05.100");
  });
});

describe("parseTime", () => {
  it("should parse MM:SS format correctly", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("00:05")).toBe(5);
    expect(parseTime("01:00")).toBe(60);
    expect(parseTime("02:30")).toBe(150);
    expect(parseTime("59:59")).toBe(3599);
  });

  it("should parse HH:MM:SS format correctly", () => {
    expect(parseTime("01:00:00")).toBe(3600);
    expect(parseTime("01:01:01")).toBe(3661);
    expect(parseTime("02:00:00")).toBe(7200);
    expect(parseTime("10:30:45")).toBe(37845);
  });

  it("should return null for invalid formats", () => {
    expect(parseTime("invalid")).toBe(null);
    expect(parseTime("1:2:3:4")).toBe(null);
    expect(parseTime("")).toBe(null);
    expect(parseTime("abc:def")).toBe(null);
  });

  it("should handle leading zeros", () => {
    expect(parseTime("00:05")).toBe(5);
    expect(parseTime("01:00:00")).toBe(3600);
  });
});
