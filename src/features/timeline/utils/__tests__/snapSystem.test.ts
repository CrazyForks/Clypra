/**
 * Unit tests for SnapSystem
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */

import { describe, it, expect } from "vitest";
import { SnapSystem } from "../snapSystem";
import { CoordinateSystem } from "../coordinateSystem";
import type { Clip } from "../../types/core";

describe("SnapSystem", () => {
  const createMockClip = (id: string, startTime: number, duration: number): Clip => ({
    id,
    trackId: "track1",
    startTime,
    duration,
    sourceMediaPath: "/path/to/video.mp4",
    sourceStart: 0,
    sourceEnd: duration,
    type: "video",
    filmstripUrl: null,
    waveformPeaks: null,
    name: `Clip ${id}`,
    locked: false,
    muted: false,
  });

  describe("snap to playhead", () => {
    it("should snap to playhead when within 8 pixels", () => {
      // Requirements: 8.1
      const coords = new CoordinateSystem(100); // 100 px/sec
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: false,
        markers: false,
      });

      const playhead = 5.0; // 5 seconds = 500 pixels
      const time = 5.07; // 507 pixels, 7 pixels away from playhead

      const result = snapSystem.findSnapTarget(time, [], playhead, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("playhead");
      expect(result?.time).toBe(5.0);
    });

    it("should not snap to playhead when beyond 8 pixels", () => {
      // Requirements: 8.1
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: false,
        markers: false,
      });

      const playhead = 5.0; // 500 pixels
      const time = 5.09; // 509 pixels, 9 pixels away

      const result = snapSystem.findSnapTarget(time, [], playhead, []);

      expect(result).toBeNull();
    });

    it("should snap to playhead at exactly 8 pixels", () => {
      // Requirements: 8.1
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: false,
        markers: false,
      });

      const playhead = 5.0; // 500 pixels
      const time = 5.08; // 508 pixels, exactly 8 pixels away

      const result = snapSystem.findSnapTarget(time, [], playhead, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("playhead");
      expect(result?.time).toBe(5.0);
    });

    it("should not snap when playhead snapping is disabled", () => {
      // Requirements: 8.6
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: false,
      });

      const playhead = 5.0;
      const time = 5.05; // Within threshold but disabled

      const result = snapSystem.findSnapTarget(time, [], playhead, []);

      expect(result).toBeNull();
    });
  });

  describe("snap to clip edges", () => {
    it("should snap to clip start when within 8 pixels", () => {
      // Requirements: 8.2
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const clips = [createMockClip("clip1", 3.0, 2.0)]; // Start at 300px
      const time = 3.06; // 306 pixels, 6 pixels away from start

      const result = snapSystem.findSnapTarget(time, clips, 0, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("clip-start");
      expect(result?.time).toBe(3.0);
      expect(result?.sourceId).toBe("clip1");
    });

    it("should snap to clip end when within 8 pixels", () => {
      // Requirements: 8.2
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const clips = [createMockClip("clip1", 3.0, 2.0)]; // End at 5.0s = 500px
      const time = 4.95; // 495 pixels, 5 pixels away from end

      const result = snapSystem.findSnapTarget(time, clips, 0, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("clip-end");
      expect(result?.time).toBe(5.0);
      expect(result?.sourceId).toBe("clip1");
    });

    it("should not snap to clip edges when beyond 8 pixels", () => {
      // Requirements: 8.2
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const clips = [createMockClip("clip1", 3.0, 2.0)];
      const time = 3.1; // 310 pixels, 10 pixels away from start

      const result = snapSystem.findSnapTarget(time, clips, 0, []);

      expect(result).toBeNull();
    });

    it("should not snap when clip snapping is disabled", () => {
      // Requirements: 8.6
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: false,
      });

      const clips = [createMockClip("clip1", 3.0, 2.0)];
      const time = 3.05; // Within threshold but disabled

      const result = snapSystem.findSnapTarget(time, clips, 0, []);

      expect(result).toBeNull();
    });

    it("should detect snaps to multiple clip edges", () => {
      // Requirements: 8.2
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const clips = [
        createMockClip("clip1", 2.0, 1.5), // Start: 2.0, End: 3.5
        createMockClip("clip2", 5.0, 2.0), // Start: 5.0, End: 7.0
        createMockClip("clip3", 8.0, 1.0), // Start: 8.0, End: 9.0
      ];

      // Test snap to clip1 start
      const result1 = snapSystem.findSnapTarget(2.05, clips, 0, []);
      expect(result1?.type).toBe("clip-start");
      expect(result1?.sourceId).toBe("clip1");

      // Test snap to clip2 end
      const result2 = snapSystem.findSnapTarget(6.97, clips, 0, []);
      expect(result2?.type).toBe("clip-end");
      expect(result2?.sourceId).toBe("clip2");
    });
  });

  describe("snap to markers", () => {
    it("should snap to marker when within 8 pixels", () => {
      // Requirements: 8.3
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: true,
      });

      const markers = [2.0, 5.0, 8.0]; // Markers at 200px, 500px, 800px
      const time = 5.06; // 506 pixels, 6 pixels away from marker at 5.0

      const result = snapSystem.findSnapTarget(time, [], 0, markers);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("marker");
      expect(result?.time).toBe(5.0);
    });

    it("should not snap to marker when beyond 8 pixels", () => {
      // Requirements: 8.3
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: true,
      });

      const markers = [5.0];
      const time = 5.1; // 510 pixels, 10 pixels away

      const result = snapSystem.findSnapTarget(time, [], 0, markers);

      expect(result).toBeNull();
    });

    it("should not snap when marker snapping is disabled", () => {
      // Requirements: 8.6
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: false,
      });

      const markers = [5.0];
      const time = 5.05; // Within threshold but disabled

      const result = snapSystem.findSnapTarget(time, [], 0, markers);

      expect(result).toBeNull();
    });
  });

  describe("snap priority and closest target selection", () => {
    it("should prioritize closest snap target when multiple targets are in range", () => {
      // Requirements: 8.5
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: true,
      });

      const playhead = 5.0; // 500 pixels
      const clips = [createMockClip("clip1", 5.05, 1.0)]; // Start at 505 pixels
      const markers = [5.03]; // Marker at 503 pixels
      const time = 5.02; // 502 pixels

      // Distances: playhead=2px, marker=1px, clip=3px
      // Marker should be selected as closest
      const result = snapSystem.findSnapTarget(time, clips, playhead, markers);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("marker");
      expect(result?.time).toBe(5.03);
    });

    it("should select playhead when it is closest", () => {
      // Requirements: 8.5
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: true,
      });

      const playhead = 5.0; // 500 pixels
      const clips = [createMockClip("clip1", 5.07, 1.0)]; // Start at 507 pixels
      const markers = [5.06]; // Marker at 506 pixels
      const time = 5.01; // 501 pixels

      // Distances: playhead=1px, marker=5px, clip=6px
      // Playhead should be selected as closest
      const result = snapSystem.findSnapTarget(time, clips, playhead, markers);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("playhead");
      expect(result?.time).toBe(5.0);
    });

    it("should select clip edge when it is closest", () => {
      // Requirements: 8.5
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: true,
      });

      const playhead = 5.0; // 500 pixels
      const clips = [createMockClip("clip1", 5.02, 1.0)]; // Start at 502 pixels
      const markers = [5.06]; // Marker at 506 pixels
      const time = 5.03; // 503 pixels

      // Distances: playhead=3px, clip=1px, marker=3px
      // Clip should be selected as closest
      const result = snapSystem.findSnapTarget(time, clips, playhead, markers);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("clip-start");
      expect(result?.time).toBe(5.02);
    });

    it("should handle equal distances by selecting first candidate", () => {
      // Requirements: 8.5
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: false,
      });

      const playhead = 5.0; // 500 pixels
      const clips = [createMockClip("clip1", 5.04, 1.0)]; // Start at 504 pixels
      const time = 5.02; // 502 pixels

      // Both playhead and clip are 2px away
      const result = snapSystem.findSnapTarget(time, clips, playhead, []);

      expect(result).not.toBeNull();
      // Should return one of them (implementation dependent)
      expect(["playhead", "clip-start"]).toContain(result?.type);
    });

    it("should handle multiple clips and select closest edge", () => {
      // Requirements: 8.5
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const clips = [
        createMockClip("clip1", 3.0, 2.0), // Start: 3.0, End: 5.0
        createMockClip("clip2", 5.05, 1.0), // Start: 5.05, End: 6.05
        createMockClip("clip3", 5.02, 0.5), // Start: 5.02, End: 5.52
      ];
      const time = 5.03; // 503 pixels

      // Distances: clip1 end=3px, clip2 start=2px, clip3 start=1px
      // clip3 start should be selected
      const result = snapSystem.findSnapTarget(time, clips, 0, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("clip-start");
      expect(result?.sourceId).toBe("clip3");
      expect(result?.time).toBe(5.02);
    });
  });

  describe("snap target type identification", () => {
    it("should correctly identify playhead snap target", () => {
      // Requirements: 8.1
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: false,
        markers: false,
      });

      const result = snapSystem.findSnapTarget(5.05, [], 5.0, []);

      expect(result?.type).toBe("playhead");
      expect(result?.sourceId).toBeUndefined();
    });

    it("should correctly identify clip-start snap target", () => {
      // Requirements: 8.2
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const clips = [createMockClip("clip1", 5.0, 2.0)];
      const result = snapSystem.findSnapTarget(5.05, clips, 0, []);

      expect(result?.type).toBe("clip-start");
      expect(result?.sourceId).toBe("clip1");
    });

    it("should correctly identify clip-end snap target", () => {
      // Requirements: 8.2
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const clips = [createMockClip("clip1", 3.0, 2.0)]; // End at 5.0
      const result = snapSystem.findSnapTarget(4.95, clips, 0, []);

      expect(result?.type).toBe("clip-end");
      expect(result?.sourceId).toBe("clip1");
    });

    it("should correctly identify marker snap target", () => {
      // Requirements: 8.3
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: true,
      });

      const result = snapSystem.findSnapTarget(5.05, [], 0, [5.0]);

      expect(result?.type).toBe("marker");
      expect(result?.sourceId).toBeUndefined();
    });
  });

  describe("snap threshold at different zoom levels", () => {
    it("should maintain 8-pixel threshold at low zoom", () => {
      // Requirements: 8.1
      const coords = new CoordinateSystem(16); // 16 px/sec
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: false,
        markers: false,
      });

      const playhead = 10.0; // 160 pixels
      // 8 pixels = 0.5 seconds at 16 px/sec
      const time = 10.5; // 168 pixels, exactly 8 pixels away

      const result = snapSystem.findSnapTarget(time, [], playhead, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("playhead");
    });

    it("should maintain 8-pixel threshold at high zoom", () => {
      // Requirements: 8.1
      const coords = new CoordinateSystem(320); // 320 px/sec
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: false,
        markers: false,
      });

      const playhead = 5.0; // 1600 pixels
      // 8 pixels = 0.025 seconds at 320 px/sec
      const time = 5.025; // 1608 pixels, exactly 8 pixels away

      const result = snapSystem.findSnapTarget(time, [], playhead, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("playhead");
    });
  });

  describe("snap settings management", () => {
    it("should allow independent toggling of snap types", () => {
      // Requirements: 8.6
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: true,
      });

      // Disable only playhead
      snapSystem.setEnabled({ playhead: false });
      let settings = snapSystem.getEnabled();
      expect(settings.playhead).toBe(false);
      expect(settings.clips).toBe(true);
      expect(settings.markers).toBe(true);

      // Disable only clips
      snapSystem.setEnabled({ playhead: true, clips: false });
      settings = snapSystem.getEnabled();
      expect(settings.playhead).toBe(true);
      expect(settings.clips).toBe(false);
      expect(settings.markers).toBe(true);

      // Disable only markers
      snapSystem.setEnabled({ clips: true, markers: false });
      settings = snapSystem.getEnabled();
      expect(settings.playhead).toBe(true);
      expect(settings.clips).toBe(true);
      expect(settings.markers).toBe(false);
    });

    it("should allow enabling all snap types", () => {
      // Requirements: 8.6
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: false,
      });

      snapSystem.setEnabled({ playhead: true, clips: true, markers: true });
      const settings = snapSystem.getEnabled();

      expect(settings.playhead).toBe(true);
      expect(settings.clips).toBe(true);
      expect(settings.markers).toBe(true);
    });

    it("should allow disabling all snap types", () => {
      // Requirements: 8.6
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: true,
      });

      snapSystem.setEnabled({ playhead: false, clips: false, markers: false });
      const settings = snapSystem.getEnabled();

      expect(settings.playhead).toBe(false);
      expect(settings.clips).toBe(false);
      expect(settings.markers).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should return null when no snap targets exist", () => {
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: true,
      });

      const result = snapSystem.findSnapTarget(5.0, [], 10.0, []);

      expect(result).toBeNull();
    });

    it("should handle empty clips array", () => {
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: true,
        markers: false,
      });

      const result = snapSystem.findSnapTarget(5.0, [], 0, []);

      expect(result).toBeNull();
    });

    it("should handle empty markers array", () => {
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: false,
        clips: false,
        markers: true,
      });

      const result = snapSystem.findSnapTarget(5.0, [], 0, []);

      expect(result).toBeNull();
    });

    it("should handle time at zero", () => {
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: true,
        markers: true,
      });

      const playhead = 0.05;
      const clips = [createMockClip("clip1", 0.0, 1.0)];
      const markers = [0.03];

      const result = snapSystem.findSnapTarget(0.0, clips, playhead, markers);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("clip-start");
    });

    it("should handle very large time values", () => {
      const coords = new CoordinateSystem(100);
      const snapSystem = new SnapSystem(coords, {
        playhead: true,
        clips: false,
        markers: false,
      });

      const playhead = 3600.0; // 1 hour
      const time = 3600.05;

      const result = snapSystem.findSnapTarget(time, [], playhead, []);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("playhead");
    });
  });
});
