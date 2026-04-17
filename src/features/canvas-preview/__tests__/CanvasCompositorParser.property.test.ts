/**
 * Property-Based Tests for CanvasCompositorParser
 * Uses fast-check library with minimum 100 iterations
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.6, 21.7
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { CanvasCompositorParser, type VideoPoolState, type SerializableVideoPoolEntry } from "../utils/CanvasCompositorParser";
import { CanvasPreviewError } from "../types/errors";

// Arbitrary for SerializableVideoPoolEntry
const videoPoolEntryArbitrary = fc.record({
  sourcePath: fc.string({ minLength: 1, maxLength: 100 }),
  refCount: fc.integer({ min: 0, max: 100 }),
  lastUsed: fc.integer({ min: 0, max: Date.now() }),
  isLoaded: fc.boolean(),
  isReady: fc.boolean(),
});

// Arbitrary for VideoPoolState
const videoPoolStateArbitrary = fc.record({
  entries: fc.array(videoPoolEntryArbitrary, { maxLength: 10 }),
  maxSize: fc.integer({ min: 1, max: 20 }),
});

describe("CanvasCompositorParser - Property-Based Tests", () => {
  // Feature: canvas-preview-system-v2, Property 32: Serialization Round-Trip
  it("should preserve state through serialize-deserialize round-trip", () => {
    fc.assert(
      fc.property(videoPoolStateArbitrary, (state) => {
        const parser = new CanvasCompositorParser();

        // Serialize
        const json = parser.serialize(state);

        // Verify JSON is a string
        expect(typeof json).toBe("string");

        // Deserialize
        const reconstructed = parser.parse(json);

        // Verify equivalence (Requirement 21.6)
        expect(reconstructed).toEqual(state);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 33: JSON Validation
  it("should validate JSON structure against schema before parsing", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid: not an object
          fc.constant("not an object"),
          fc.constant(123),
          fc.constant(null),
          fc.constant([]),
          // Invalid: missing required fields
          fc.constant({}),
          // Invalid: wrong types
          fc.constant({ entries: "not an array", maxSize: 10 }),
          fc.constant({ entries: [], maxSize: "not a number" }),
          // Invalid: negative maxSize
          fc.constant({ entries: [], maxSize: -1 }),
          fc.constant({ entries: [], maxSize: 0 }),
          // Invalid: entry missing required fields (sourcePath is required)
          fc.constant({ entries: [{}], maxSize: 10 }),
          fc.constant({ entries: [{ refCount: 0 }], maxSize: 10 }),
          // Invalid: entry wrong types
          fc.constant({
            entries: [
              {
                sourcePath: 123,
                refCount: 0,
                lastUsed: 0,
                isLoaded: false,
                isReady: false,
              },
            ],
            maxSize: 10,
          }),
          fc.constant({
            entries: [
              {
                sourcePath: "test.mp4",
                refCount: "not a number",
                lastUsed: 0,
                isLoaded: false,
                isReady: false,
              },
            ],
            maxSize: 10,
          }),
          // Invalid: negative refCount
          fc.constant({
            entries: [
              {
                sourcePath: "test.mp4",
                refCount: -1,
                lastUsed: 0,
                isLoaded: false,
                isReady: false,
              },
            ],
            maxSize: 10,
          }),
        ),
        (invalidData) => {
          const parser = new CanvasCompositorParser();
          const json = JSON.stringify(invalidData);

          // Should throw error with descriptive message (Requirement 21.3, 21.4)
          expect(() => parser.parse(json)).toThrow(CanvasPreviewError);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 34: Invalid JSON Error Messages
  it("should return descriptive error messages for invalid JSON", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid JSON syntax
          fc.constant("{ invalid json }"),
          fc.constant("{ 'single': 'quotes' }"),
          fc.constant("{ trailing: comma, }"),
          fc.constant("undefined"),
          fc.constant("NaN"),
          fc.constant(""),
          fc.constant("{"),
          fc.constant("}"),
          fc.constant("["),
          fc.constant("]"),
        ),
        (invalidJson) => {
          const parser = new CanvasCompositorParser();

          try {
            parser.parse(invalidJson);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            // Verify error is CanvasPreviewError
            expect(error).toBeInstanceOf(CanvasPreviewError);

            // Verify error has descriptive message (Requirement 21.4)
            const previewError = error as CanvasPreviewError;
            expect(previewError.message).toBeTruthy();
            expect(previewError.message.length).toBeGreaterThan(0);
            expect(previewError.message).toContain("Invalid JSON");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: canvas-preview-system-v2, Property 35: Default Values for Missing Fields
  it("should handle missing optional fields by using default values", () => {
    fc.assert(
      fc.property(
        fc.record({
          entries: fc.array(
            fc.record({
              sourcePath: fc.string({ minLength: 1, maxLength: 100 }),
              // Optional fields may be missing
              refCount: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
              lastUsed: fc.option(fc.integer({ min: 0, max: Date.now() }), { nil: undefined }),
              isLoaded: fc.option(fc.boolean(), { nil: undefined }),
              isReady: fc.option(fc.boolean(), { nil: undefined }),
            }),
            { maxLength: 10 },
          ),
          maxSize: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
        }),
        (partialState) => {
          const parser = new CanvasCompositorParser();

          // Create JSON with potentially missing optional fields
          const json = JSON.stringify(partialState);

          // Parse should succeed and apply defaults (Requirement 21.7)
          const parsed = parser.parse(json);

          // Verify defaults are applied
          expect(parsed.maxSize).toBeDefined();
          expect(typeof parsed.maxSize).toBe("number");
          expect(parsed.maxSize).toBeGreaterThan(0);

          for (const entry of parsed.entries) {
            expect(entry.sourcePath).toBeDefined();
            expect(typeof entry.sourcePath).toBe("string");

            expect(entry.refCount).toBeDefined();
            expect(typeof entry.refCount).toBe("number");
            expect(entry.refCount).toBeGreaterThanOrEqual(0);

            expect(entry.lastUsed).toBeDefined();
            expect(typeof entry.lastUsed).toBe("number");
            expect(entry.lastUsed).toBeGreaterThanOrEqual(0);

            expect(entry.isLoaded).toBeDefined();
            expect(typeof entry.isLoaded).toBe("boolean");

            expect(entry.isReady).toBeDefined();
            expect(typeof entry.isReady).toBe("boolean");
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
