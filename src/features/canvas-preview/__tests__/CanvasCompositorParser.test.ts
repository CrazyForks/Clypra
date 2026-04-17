/**
 * Unit Tests for CanvasCompositorParser
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 */

import { describe, it, expect } from "vitest";
import { CanvasCompositorParser, type VideoPoolState } from "../utils/CanvasCompositorParser";
import { CanvasPreviewError, CanvasPreviewErrorCode } from "../types/errors";

describe("CanvasCompositorParser - Unit Tests", () => {
  describe("serialize", () => {
    it("should serialize empty state to JSON", () => {
      const parser = new CanvasCompositorParser();
      const state: VideoPoolState = {
        entries: [],
        maxSize: 10,
      };

      const json = parser.serialize(state);

      expect(json).toBeTruthy();
      expect(typeof json).toBe("string");
      expect(JSON.parse(json)).toEqual(state);
    });

    it("should serialize state with single entry", () => {
      const parser = new CanvasCompositorParser();
      const state: VideoPoolState = {
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 1,
            lastUsed: 1234567890,
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      };

      const json = parser.serialize(state);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(state);
    });

    it("should serialize state with multiple entries", () => {
      const parser = new CanvasCompositorParser();
      const state: VideoPoolState = {
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 2,
            lastUsed: 1234567890,
            isLoaded: true,
            isReady: true,
          },
          {
            sourcePath: "video2.mp4",
            refCount: 1,
            lastUsed: 1234567891,
            isLoaded: false,
            isReady: false,
          },
          {
            sourcePath: "video3.mp4",
            refCount: 0,
            lastUsed: 1234567892,
            isLoaded: true,
            isReady: false,
          },
        ],
        maxSize: 10,
      };

      const json = parser.serialize(state);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(state);
    });

    it("should format JSON with proper indentation (Requirement 21.5)", () => {
      const parser = new CanvasCompositorParser();
      const state: VideoPoolState = {
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 1,
            lastUsed: 1234567890,
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      };

      const json = parser.serialize(state);

      // Verify JSON is formatted with indentation
      expect(json).toContain("\n");
      expect(json).toContain("  ");
      expect(json.split("\n").length).toBeGreaterThan(1);
    });
  });

  describe("parse", () => {
    it("should parse valid JSON with all fields", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 1,
            lastUsed: 1234567890,
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      });

      const state = parser.parse(json);

      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].sourcePath).toBe("video1.mp4");
      expect(state.entries[0].refCount).toBe(1);
      expect(state.entries[0].lastUsed).toBe(1234567890);
      expect(state.entries[0].isLoaded).toBe(true);
      expect(state.entries[0].isReady).toBe(true);
      expect(state.maxSize).toBe(10);
    });

    it("should parse JSON with missing optional fields and apply defaults (Requirement 21.7)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            // Missing: refCount, lastUsed, isLoaded, isReady
          },
        ],
        // Missing: maxSize
      });

      const state = parser.parse(json);

      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].sourcePath).toBe("video1.mp4");
      expect(state.entries[0].refCount).toBe(0); // Default
      expect(state.entries[0].lastUsed).toBeGreaterThan(0); // Default to current time
      expect(state.entries[0].isLoaded).toBe(false); // Default
      expect(state.entries[0].isReady).toBe(false); // Default
      expect(state.maxSize).toBe(10); // Default
    });

    it("should parse JSON with partial optional fields", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 2,
            // Missing: lastUsed, isLoaded, isReady
          },
        ],
        maxSize: 15,
      });

      const state = parser.parse(json);

      expect(state.entries[0].refCount).toBe(2);
      expect(state.entries[0].lastUsed).toBeGreaterThan(0);
      expect(state.entries[0].isLoaded).toBe(false);
      expect(state.entries[0].isReady).toBe(false);
      expect(state.maxSize).toBe(15);
    });

    it("should throw error for invalid JSON syntax (Requirement 21.4)", () => {
      const parser = new CanvasCompositorParser();
      const invalidJson = "{ invalid json }";

      expect(() => parser.parse(invalidJson)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(invalidJson)).toThrow(/Invalid JSON/);
    });

    it("should throw error for non-object root (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify("not an object");

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/Root must be an object/);
    });

    it("should throw error for missing required field 'entries' (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({ maxSize: 10 });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/Missing required field: entries/);
    });

    it("should throw error for invalid 'entries' type (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({ entries: "not an array", maxSize: 10 });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/entries.*must be an array/);
    });

    it("should throw error for invalid 'maxSize' type (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({ entries: [], maxSize: "not a number" });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/maxSize.*must be a number/);
    });

    it("should throw error for negative maxSize (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({ entries: [], maxSize: -1 });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/maxSize.*must be positive/);
    });

    it("should throw error for zero maxSize (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({ entries: [], maxSize: 0 });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/maxSize.*must be positive/);
    });

    it("should throw error for entry missing sourcePath (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [{ refCount: 1, lastUsed: 123, isLoaded: true, isReady: true }],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/missing required field: sourcePath/);
    });

    it("should throw error for invalid sourcePath type (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: 123,
            refCount: 1,
            lastUsed: 123,
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/sourcePath.*must be a string/);
    });

    it("should throw error for invalid refCount type (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: "not a number",
            lastUsed: 123,
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/refCount.*must be a number/);
    });

    it("should throw error for negative refCount (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: -1,
            lastUsed: 123,
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/refCount.*must be non-negative/);
    });

    it("should throw error for invalid lastUsed type (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 1,
            lastUsed: "not a number",
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/lastUsed.*must be a number/);
    });

    it("should throw error for negative lastUsed (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 1,
            lastUsed: -1,
            isLoaded: true,
            isReady: true,
          },
        ],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/lastUsed.*must be non-negative/);
    });

    it("should throw error for invalid isLoaded type (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 1,
            lastUsed: 123,
            isLoaded: "not a boolean",
            isReady: true,
          },
        ],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/isLoaded.*must be a boolean/);
    });

    it("should throw error for invalid isReady type (Requirement 21.3)", () => {
      const parser = new CanvasCompositorParser();
      const json = JSON.stringify({
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 1,
            lastUsed: 123,
            isLoaded: true,
            isReady: "not a boolean",
          },
        ],
        maxSize: 10,
      });

      expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
      expect(() => parser.parse(json)).toThrow(/isReady.*must be a boolean/);
    });
  });

  describe("round-trip serialization", () => {
    it("should preserve state through serialize-parse round-trip (Requirement 21.6)", () => {
      const parser = new CanvasCompositorParser();
      const originalState: VideoPoolState = {
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 2,
            lastUsed: 1234567890,
            isLoaded: true,
            isReady: true,
          },
          {
            sourcePath: "video2.mp4",
            refCount: 1,
            lastUsed: 1234567891,
            isLoaded: false,
            isReady: false,
          },
        ],
        maxSize: 15,
      };

      const json = parser.serialize(originalState);
      const reconstructedState = parser.parse(json);

      expect(reconstructedState).toEqual(originalState);
    });

    it("should preserve empty state through round-trip", () => {
      const parser = new CanvasCompositorParser();
      const originalState: VideoPoolState = {
        entries: [],
        maxSize: 10,
      };

      const json = parser.serialize(originalState);
      const reconstructedState = parser.parse(json);

      expect(reconstructedState).toEqual(originalState);
    });

    it("should preserve state with zero refCount through round-trip", () => {
      const parser = new CanvasCompositorParser();
      const originalState: VideoPoolState = {
        entries: [
          {
            sourcePath: "video1.mp4",
            refCount: 0,
            lastUsed: 1234567890,
            isLoaded: true,
            isReady: false,
          },
        ],
        maxSize: 10,
      };

      const json = parser.serialize(originalState);
      const reconstructedState = parser.parse(json);

      expect(reconstructedState).toEqual(originalState);
    });
  });

  describe("error handling", () => {
    it("should throw CanvasPreviewError with correct error code", () => {
      const parser = new CanvasCompositorParser();
      const invalidJson = "{ invalid }";

      try {
        parser.parse(invalidJson);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(CanvasPreviewError);
        const previewError = error as CanvasPreviewError;
        expect(previewError.code).toBe(CanvasPreviewErrorCode.INVALID_CLIP_DATA);
        expect(previewError.recoverable).toBe(false);
      }
    });

    it("should provide descriptive error messages (Requirement 21.4)", () => {
      const parser = new CanvasCompositorParser();

      const testCases = [
        { json: "{ invalid }", expectedMessage: "Invalid JSON" },
        { json: JSON.stringify("not an object"), expectedMessage: "Root must be an object" },
        { json: JSON.stringify({}), expectedMessage: "Missing required field: entries" },
        { json: JSON.stringify({ entries: "not array" }), expectedMessage: "entries" },
        { json: JSON.stringify({ entries: [], maxSize: -1 }), expectedMessage: "maxSize" },
      ];

      for (const testCase of testCases) {
        try {
          parser.parse(testCase.json);
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          expect(error).toBeInstanceOf(CanvasPreviewError);
          const previewError = error as CanvasPreviewError;
          expect(previewError.message).toContain(testCase.expectedMessage);
        }
      }
    });
  });
});
