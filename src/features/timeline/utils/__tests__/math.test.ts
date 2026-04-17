/**
 * Unit tests for math utilities
 * Requirements: 15.2, 22.6
 */

import { describe, it, expect } from "vitest";
import { clamp, roundTo, approximatelyEqual } from "../math";

describe("clamp", () => {
  it("should return the value when within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("should clamp to minimum when value is below", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, 0, 10)).toBe(0);
    expect(clamp(5, 10, 20)).toBe(10);
  });

  it("should clamp to maximum when value is above", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, 0, 10)).toBe(10);
    expect(clamp(25, 10, 20)).toBe(20);
  });

  it("should handle negative ranges", () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it("should handle fractional values", () => {
    expect(clamp(5.5, 0, 10)).toBe(5.5);
    expect(clamp(0.1, 0, 10)).toBe(0.1);
    expect(clamp(10.5, 0, 10)).toBe(10);
  });

  it("should handle edge case where min equals max", () => {
    expect(clamp(5, 10, 10)).toBe(10);
    expect(clamp(15, 10, 10)).toBe(10);
  });
});

describe("roundTo", () => {
  it("should round to specified decimal places", () => {
    expect(roundTo(5.123, 0)).toBe(5);
    expect(roundTo(5.123, 1)).toBe(5.1);
    expect(roundTo(5.123, 2)).toBe(5.12);
    expect(roundTo(5.123, 3)).toBe(5.123);
  });

  it("should handle rounding up", () => {
    expect(roundTo(5.567, 1)).toBe(5.6);
    expect(roundTo(5.567, 2)).toBe(5.57);
  });

  it("should handle negative numbers", () => {
    expect(roundTo(-5.123, 1)).toBe(-5.1);
    expect(roundTo(-5.567, 1)).toBe(-5.6);
  });

  it("should handle zero decimal places", () => {
    expect(roundTo(5.4, 0)).toBe(5);
    expect(roundTo(5.6, 0)).toBe(6);
  });
});

describe("approximatelyEqual", () => {
  it("should return true for equal numbers", () => {
    expect(approximatelyEqual(5, 5)).toBe(true);
    expect(approximatelyEqual(0, 0)).toBe(true);
    expect(approximatelyEqual(-5, -5)).toBe(true);
  });

  it("should return true for numbers within default tolerance (0.001)", () => {
    expect(approximatelyEqual(5.0001, 5.0002)).toBe(true);
    expect(approximatelyEqual(5.0, 5.0009)).toBe(true);
    expect(approximatelyEqual(5.0, 5.00099)).toBe(true);
  });

  it("should return false for numbers outside default tolerance", () => {
    expect(approximatelyEqual(5.0, 5.0011)).toBe(false);
    expect(approximatelyEqual(5.0, 5.002)).toBe(false);
    expect(approximatelyEqual(5, 6)).toBe(false);
  });

  it("should respect custom tolerance", () => {
    expect(approximatelyEqual(5.0, 5.1, 0.2)).toBe(true);
    expect(approximatelyEqual(5.0, 5.3, 0.2)).toBe(false);
  });

  it("should handle negative numbers", () => {
    expect(approximatelyEqual(-5.0001, -5.0002)).toBe(true);
    expect(approximatelyEqual(-5.0, -5.0011)).toBe(false);
  });

  it("should handle zero", () => {
    expect(approximatelyEqual(0, 0.0001)).toBe(true);
    expect(approximatelyEqual(0, 0.002)).toBe(false);
  });
});
