/**
 * Unit tests for FrameCache
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FrameCache } from "../FrameCache";
import type { Clip, Track } from "../../../timeline/types/core";

// Mock ImageBitmap
class MockImageBitmap {
  width: number;
  height: number;
  closed: boolean = false;

  constructor(width: number = 100, height: number = 100) {
    this.width = width;
    this.height = height;
  }

  close() {
    this.closed = true;
  }
}

// Helper to create mock ImageBitmap
function createMockBitmap(width = 100, height = 100): ImageBitmap {
  return new MockImageBitmap(width, height) as unknown as ImageBitmap;
}

// Helper to create mock clip
function createMockClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: "clip-1",
    trackId: "track-1",
    startTime: 0,
    duration: 10,
    sourceMediaPath: "/video.mp4",
    sourceStart: 0,
    sourceEnd: 10,
    ...overrides,
  };
}

// Helper to create mock track
function createMockTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    order: 0,
    visible: true,
    height: 100,
    ...overrides,
  };
}

describe("FrameCache", () => {
  let cache: FrameCache;

  beforeEach(() => {
    cache = new FrameCache(5); // Small cache for testing
  });

  describe("get and set", () => {
    it("should return null for cache miss", () => {
      // Requirement 13.1 - Cache miss behavior
      const result = cache.get(1.5);
      expect(result).toBeNull();
    });

    it("should return cached entry for cache hit", () => {
      // Requirement 13.1 - Cache hit behavior
      const bitmap = createMockBitmap();
      cache.set(1.5, bitmap);

      const result = cache.get(1.5);
      expect(result).not.toBeNull();
      expect(result?.bitmap).toBe(bitmap);
      expect(result?.timestamp).toBe(1.5);
    });

    it("should handle multiple cache entries", () => {
      // Requirement 13.1 - Multiple entries
      const bitmap1 = createMockBitmap();
      const bitmap2 = createMockBitmap();
      const bitmap3 = createMockBitmap();

      cache.set(1.0, bitmap1);
      cache.set(2.0, bitmap2);
      cache.set(3.0, bitmap3);

      expect(cache.get(1.0)?.bitmap).toBe(bitmap1);
      expect(cache.get(2.0)?.bitmap).toBe(bitmap2);
      expect(cache.get(3.0)?.bitmap).toBe(bitmap3);
    });

    it("should round timeline times to milliseconds for consistent keys", () => {
      // Requirement 13.1 - Key consistency
      const bitmap = createMockBitmap();
      cache.set(1.5001, bitmap);

      // Should hit cache with slightly different time
      const result = cache.get(1.5004);
      expect(result?.bitmap).toBe(bitmap);
    });

    it("should update lastAccessed on cache hit", () => {
      // Requirement 13.2 - LRU tracking
      const bitmap = createMockBitmap();
      cache.set(1.5, bitmap);

      const entry1 = cache.getEntry(1.5);
      const firstAccess = entry1?.lastAccessed;

      // Wait a bit
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      cache.get(1.5);
      const entry2 = cache.getEntry(1.5);
      const secondAccess = entry2?.lastAccessed;

      expect(secondAccess).toBeGreaterThan(firstAccess!);
      vi.useRealTimers();
    });
  });

  describe("LRU eviction", () => {
    it("should evict least recently used entry when cache is full", () => {
      // Requirement 13.3, 13.4 - LRU eviction
      vi.useFakeTimers();

      const bitmaps = Array.from({ length: 6 }, () => createMockBitmap());

      // Fill cache to capacity (5 entries)
      for (let i = 0; i < 5; i++) {
        cache.set(i, bitmaps[i]);
        vi.advanceTimersByTime(10);
      }

      expect(cache.getCacheSize()).toBe(5);

      // Access entry 1 to make it more recently used
      cache.get(1);
      vi.advanceTimersByTime(10);

      // Add 6th entry - should evict entry 0 (oldest)
      cache.set(5, bitmaps[5]);

      expect(cache.getCacheSize()).toBe(5);
      expect(cache.get(0)).toBeNull(); // Entry 0 evicted
      expect(cache.get(1)).not.toBeNull(); // Entry 1 still present
      expect(cache.get(5)).not.toBeNull(); // New entry present

      vi.useRealTimers();
    });

    it("should close ImageBitmap when evicting", () => {
      // Requirement 13.6 - ImageBitmap lifecycle
      const bitmaps = Array.from({ length: 6 }, () => createMockBitmap());

      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(i, bitmaps[i]);
      }

      // Add 6th entry - should evict oldest
      cache.set(5, bitmaps[5]);

      // First bitmap should be closed
      expect((bitmaps[0] as unknown as MockImageBitmap).closed).toBe(true);
    });

    it("should evict correct entry with specific access pattern", () => {
      // Requirement 13.4 - LRU eviction with specific pattern
      vi.useFakeTimers();

      const bitmaps = Array.from({ length: 6 }, () => createMockBitmap());

      // Add entries 0-4
      cache.set(0, bitmaps[0]);
      vi.advanceTimersByTime(10);
      cache.set(1, bitmaps[1]);
      vi.advanceTimersByTime(10);
      cache.set(2, bitmaps[2]);
      vi.advanceTimersByTime(10);
      cache.set(3, bitmaps[3]);
      vi.advanceTimersByTime(10);
      cache.set(4, bitmaps[4]);
      vi.advanceTimersByTime(10);

      // Access pattern: 2, 0, 3 (making 1 and 4 the oldest)
      cache.get(2);
      vi.advanceTimersByTime(10);
      cache.get(0);
      vi.advanceTimersByTime(10);
      cache.get(3);
      vi.advanceTimersByTime(10);

      // Add new entry - should evict 1 (oldest accessed)
      cache.set(5, bitmaps[5]);

      expect(cache.get(1)).toBeNull(); // Entry 1 evicted
      expect(cache.get(0)).not.toBeNull();
      expect(cache.get(2)).not.toBeNull();
      expect(cache.get(3)).not.toBeNull();
      expect(cache.get(4)).not.toBeNull();
      expect(cache.get(5)).not.toBeNull();

      vi.useRealTimers();
    });
  });

  describe("state invalidation", () => {
    it("should invalidate cache when state hash changes", () => {
      // Requirement 13.5 - State invalidation
      // Initial state
      const clips1 = new Map<string, Clip>([["clip-1", createMockClip({ id: "clip-1" })]]);
      const tracks1 = new Map<string, Track>([["track-1", createMockTrack({ id: "track-1" })]]);

      cache.updateStateHash(clips1, tracks1);

      // Add entry with current state
      const bitmap = createMockBitmap();
      cache.set(1.5, bitmap);

      // Should hit cache with same state
      expect(cache.get(1.5)).not.toBeNull();

      // Change state
      const clips2 = new Map<string, Clip>([["clip-1", createMockClip({ id: "clip-1", startTime: 5 })]]);

      cache.updateStateHash(clips2, tracks1);

      // Should miss cache with different state
      expect(cache.get(1.5)).toBeNull();
    });

    it("should generate different hashes for different clip states", () => {
      // Requirement 13.5 - Hash generation
      const clips1 = new Map<string, Clip>([["clip-1", createMockClip({ id: "clip-1", startTime: 0 })]]);
      const clips2 = new Map<string, Clip>([["clip-1", createMockClip({ id: "clip-1", startTime: 5 })]]);
      const tracks = new Map<string, Track>([["track-1", createMockTrack()]]);

      cache.updateStateHash(clips1, tracks);
      const hash1 = cache.getStateHash();

      cache.updateStateHash(clips2, tracks);
      const hash2 = cache.getStateHash();

      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different track states", () => {
      // Requirement 13.5 - Hash generation for tracks
      const clips = new Map<string, Clip>([["clip-1", createMockClip()]]);
      const tracks1 = new Map<string, Track>([["track-1", createMockTrack({ visible: true })]]);
      const tracks2 = new Map<string, Track>([["track-1", createMockTrack({ visible: false })]]);

      cache.updateStateHash(clips, tracks1);
      const hash1 = cache.getStateHash();

      cache.updateStateHash(clips, tracks2);
      const hash2 = cache.getStateHash();

      expect(hash1).not.toBe(hash2);
    });

    it("should generate same hash for equivalent states", () => {
      // Requirement 13.5 - Hash consistency
      const clips1 = new Map<string, Clip>([["clip-1", createMockClip({ id: "clip-1", startTime: 5 })]]);
      const clips2 = new Map<string, Clip>([["clip-1", createMockClip({ id: "clip-1", startTime: 5 })]]);
      const tracks = new Map<string, Track>([["track-1", createMockTrack()]]);

      cache.updateStateHash(clips1, tracks);
      const hash1 = cache.getStateHash();

      cache.updateStateHash(clips2, tracks);
      const hash2 = cache.getStateHash();

      expect(hash1).toBe(hash2);
    });
  });

  describe("invalidate", () => {
    it("should clear all cached frames", () => {
      // Requirement 13.5 - Clear cache
      const bitmaps = Array.from({ length: 3 }, () => createMockBitmap());

      cache.set(1.0, bitmaps[0]);
      cache.set(2.0, bitmaps[1]);
      cache.set(3.0, bitmaps[2]);

      expect(cache.getCacheSize()).toBe(3);

      cache.invalidate();

      expect(cache.getCacheSize()).toBe(0);
      expect(cache.get(1.0)).toBeNull();
      expect(cache.get(2.0)).toBeNull();
      expect(cache.get(3.0)).toBeNull();
    });

    it("should close all ImageBitmaps when invalidating", () => {
      // Requirement 13.6 - ImageBitmap cleanup
      const bitmaps = Array.from({ length: 3 }, () => createMockBitmap());

      cache.set(1.0, bitmaps[0]);
      cache.set(2.0, bitmaps[1]);
      cache.set(3.0, bitmaps[2]);

      cache.invalidate();

      // All bitmaps should be closed
      expect((bitmaps[0] as unknown as MockImageBitmap).closed).toBe(true);
      expect((bitmaps[1] as unknown as MockImageBitmap).closed).toBe(true);
      expect((bitmaps[2] as unknown as MockImageBitmap).closed).toBe(true);
    });
  });

  describe("dispose", () => {
    it("should cleanup all resources", () => {
      // Cleanup test
      const bitmaps = Array.from({ length: 3 }, () => createMockBitmap());

      cache.set(1.0, bitmaps[0]);
      cache.set(2.0, bitmaps[1]);
      cache.set(3.0, bitmaps[2]);

      cache.dispose();

      expect(cache.getCacheSize()).toBe(0);
      expect((bitmaps[0] as unknown as MockImageBitmap).closed).toBe(true);
      expect((bitmaps[1] as unknown as MockImageBitmap).closed).toBe(true);
      expect((bitmaps[2] as unknown as MockImageBitmap).closed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle cache with size 1", () => {
      // Edge case - minimal cache
      const smallCache = new FrameCache(1);
      const bitmap1 = createMockBitmap();
      const bitmap2 = createMockBitmap();

      smallCache.set(1.0, bitmap1);
      expect(smallCache.getCacheSize()).toBe(1);

      smallCache.set(2.0, bitmap2);
      expect(smallCache.getCacheSize()).toBe(1);
      expect(smallCache.get(1.0)).toBeNull();
      expect(smallCache.get(2.0)).not.toBeNull();
    });

    it("should handle time 0", () => {
      // Edge case - time 0
      const bitmap = createMockBitmap();
      cache.set(0, bitmap);

      expect(cache.get(0)?.bitmap).toBe(bitmap);
    });

    it("should handle negative times", () => {
      // Edge case - negative time
      const bitmap = createMockBitmap();
      cache.set(-1.5, bitmap);

      expect(cache.get(-1.5)?.bitmap).toBe(bitmap);
    });

    it("should handle very large times", () => {
      // Edge case - large time values
      const bitmap = createMockBitmap();
      cache.set(999999.999, bitmap);

      expect(cache.get(999999.999)?.bitmap).toBe(bitmap);
    });

    it("should handle empty clips and tracks maps", () => {
      // Edge case - empty state
      const clips = new Map<string, Clip>();
      const tracks = new Map<string, Track>();

      cache.updateStateHash(clips, tracks);
      const hash = cache.getStateHash();

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should handle multiple clips and tracks", () => {
      // Requirement 13.5 - Complex state
      const clips = new Map<string, Clip>([
        ["clip-1", createMockClip({ id: "clip-1", startTime: 0 })],
        ["clip-2", createMockClip({ id: "clip-2", startTime: 5 })],
        ["clip-3", createMockClip({ id: "clip-3", startTime: 10 })],
      ]);
      const tracks = new Map<string, Track>([
        ["track-1", createMockTrack({ id: "track-1", order: 0 })],
        ["track-2", createMockTrack({ id: "track-2", order: 1 })],
      ]);

      cache.updateStateHash(clips, tracks);
      const hash = cache.getStateHash();

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });
  });

  describe("performance characteristics", () => {
    it("should maintain cache size at or below maximum", () => {
      // Requirement 13.3 - Capacity management
      const maxSize = 10;
      const largeCache = new FrameCache(maxSize);

      // Add more entries than max size
      for (let i = 0; i < maxSize * 2; i++) {
        largeCache.set(i, createMockBitmap());
      }

      expect(largeCache.getCacheSize()).toBeLessThanOrEqual(maxSize);
    });

    it("should handle rapid set operations", () => {
      // Performance test - rapid operations
      const largeCache = new FrameCache(100);

      for (let i = 0; i < 100; i++) {
        largeCache.set(i * 0.1, createMockBitmap());
      }

      expect(largeCache.getCacheSize()).toBe(100);
    });

    it("should handle rapid get operations", () => {
      // Performance test - rapid reads
      const bitmap = createMockBitmap();
      cache.set(1.5, bitmap);

      for (let i = 0; i < 1000; i++) {
        const result = cache.get(1.5);
        expect(result?.bitmap).toBe(bitmap);
      }
    });
  });
});
