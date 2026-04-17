/**
 * Unit tests for UndoManager
 * Requirements: 14.2, 14.3, 14.4, 14.5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UndoManager } from "../UndoManager";
import type { TimelineSnapshot } from "../../types/core";

describe("UndoManager", () => {
  let undoManager: UndoManager;

  beforeEach(() => {
    undoManager = new UndoManager();
  });

  const createMockSnapshot = (id: string): TimelineSnapshot => ({
    clips: new Map([[id, { id } as any]]),
    tracks: new Map([["track1", { id: "track1" } as any]]),
    playhead: 0,
    selectedClipIds: new Set([id]),
  });

  describe("pushState", () => {
    it("should add a new state to history", () => {
      const snapshot = createMockSnapshot("clip1");
      undoManager.pushState(snapshot);

      expect(undoManager.getHistorySize()).toBe(1);
      expect(undoManager.getCurrentIndex()).toBe(0);
    });

    it("should increment history index when pushing new state", () => {
      undoManager.pushState(createMockSnapshot("clip1"));
      undoManager.pushState(createMockSnapshot("clip2"));
      undoManager.pushState(createMockSnapshot("clip3"));

      expect(undoManager.getHistorySize()).toBe(3);
      expect(undoManager.getCurrentIndex()).toBe(2);
    });

    it("should clear redo history when new operation is performed (Requirement 14.5)", () => {
      // Push 3 states
      undoManager.pushState(createMockSnapshot("clip1"));
      undoManager.pushState(createMockSnapshot("clip2"));
      undoManager.pushState(createMockSnapshot("clip3"));

      // Undo twice
      undoManager.undo();
      undoManager.undo();

      expect(undoManager.getCurrentIndex()).toBe(0);
      expect(undoManager.canRedo()).toBe(true);

      // Push new state - should clear redo history
      undoManager.pushState(createMockSnapshot("clip4"));

      expect(undoManager.getHistorySize()).toBe(2); // clip1 and clip4
      expect(undoManager.getCurrentIndex()).toBe(1);
      expect(undoManager.canRedo()).toBe(false);
    });

    it("should limit history to 50 levels (Requirement 14.4)", () => {
      // Push 60 states
      for (let i = 0; i < 60; i++) {
        undoManager.pushState(createMockSnapshot(`clip${i}`));
      }

      expect(undoManager.getHistorySize()).toBe(50);
      expect(undoManager.getCurrentIndex()).toBe(49);
    });

    it("should maintain correct index when history limit is reached", () => {
      // Push 52 states
      for (let i = 0; i < 52; i++) {
        undoManager.pushState(createMockSnapshot(`clip${i}`));
      }

      expect(undoManager.getHistorySize()).toBe(50);
      expect(undoManager.getCurrentIndex()).toBe(49);

      // Should be able to undo
      expect(undoManager.canUndo()).toBe(true);
    });
  });

  describe("undo", () => {
    it("should restore previous state (Requirement 14.2)", () => {
      const snapshot1 = createMockSnapshot("clip1");
      const snapshot2 = createMockSnapshot("clip2");

      undoManager.pushState(snapshot1);
      undoManager.pushState(snapshot2);

      // First undo restores snapshot1 (the previous state)
      const restored = undoManager.undo();

      expect(restored).not.toBeNull();
      expect(restored?.clips.has("clip1")).toBe(true);
      expect(undoManager.getCurrentIndex()).toBe(0);

      // Second undo returns null (can't undo further)
      const restored2 = undoManager.undo();
      expect(restored2).toBeNull();
      expect(undoManager.getCurrentIndex()).toBe(0); // Stays at 0
    });

    it("should return null when no undo history available", () => {
      const result = undoManager.undo();
      expect(result).toBeNull();
    });

    it("should return null when at the beginning of history", () => {
      undoManager.pushState(createMockSnapshot("clip1"));

      // First undo returns null (can't undo from initial state)
      const result1 = undoManager.undo();
      expect(result1).toBeNull();
      expect(undoManager.getCurrentIndex()).toBe(0);
    });

    it("should allow multiple undo operations", () => {
      undoManager.pushState(createMockSnapshot("clip1"));
      undoManager.pushState(createMockSnapshot("clip2"));
      undoManager.pushState(createMockSnapshot("clip3"));

      // First undo restores clip2
      const state2 = undoManager.undo();
      expect(state2?.clips.has("clip2")).toBe(true);

      // Second undo restores clip1
      const state1 = undoManager.undo();
      expect(state1?.clips.has("clip1")).toBe(true);

      // Third undo returns null (can't undo further)
      const state0 = undoManager.undo();
      expect(state0).toBeNull();
    });

    it("should not mutate original snapshots", () => {
      const snapshot = createMockSnapshot("clip1");
      undoManager.pushState(snapshot);
      undoManager.pushState(createMockSnapshot("clip2"));

      const restored = undoManager.undo();

      // Modify restored snapshot
      restored?.clips.set("clip3", { id: "clip3" } as any);

      // Original should be unchanged
      expect(snapshot.clips.has("clip3")).toBe(false);
    });
  });

  describe("redo", () => {
    it("should reapply undone operation (Requirement 14.3)", () => {
      const snapshot1 = createMockSnapshot("clip1");
      const snapshot2 = createMockSnapshot("clip2");

      undoManager.pushState(snapshot1);
      undoManager.pushState(snapshot2);

      undoManager.undo();
      const redone = undoManager.redo();

      expect(redone).not.toBeNull();
      expect(redone?.clips.has("clip2")).toBe(true);
      expect(undoManager.getCurrentIndex()).toBe(1);
    });

    it("should return null when no redo history available", () => {
      undoManager.pushState(createMockSnapshot("clip1"));

      const result = undoManager.redo();
      expect(result).toBeNull();
    });

    it("should allow multiple redo operations", () => {
      undoManager.pushState(createMockSnapshot("clip1"));
      undoManager.pushState(createMockSnapshot("clip2"));
      undoManager.pushState(createMockSnapshot("clip3"));

      undoManager.undo();
      undoManager.undo();

      const state2 = undoManager.redo();
      expect(state2?.clips.has("clip2")).toBe(true);

      const state3 = undoManager.redo();
      expect(state3?.clips.has("clip3")).toBe(true);

      expect(undoManager.getCurrentIndex()).toBe(2);
    });

    it("should not mutate original snapshots", () => {
      const snapshot = createMockSnapshot("clip1");
      undoManager.pushState(snapshot);
      undoManager.pushState(createMockSnapshot("clip2"));

      undoManager.undo();
      const redone = undoManager.redo();

      // Modify redone snapshot
      redone?.clips.set("clip3", { id: "clip3" } as any);

      // Original should be unchanged
      expect(snapshot.clips.has("clip3")).toBe(false);
    });
  });

  describe("canUndo and canRedo", () => {
    it("should return false when no history", () => {
      expect(undoManager.canUndo()).toBe(false);
      expect(undoManager.canRedo()).toBe(false);
    });

    it("should return correct values after operations", () => {
      undoManager.pushState(createMockSnapshot("clip1"));
      expect(undoManager.canUndo()).toBe(false); // At first state
      expect(undoManager.canRedo()).toBe(false);

      undoManager.pushState(createMockSnapshot("clip2"));
      expect(undoManager.canUndo()).toBe(true);
      expect(undoManager.canRedo()).toBe(false);

      undoManager.undo();
      expect(undoManager.canUndo()).toBe(false);
      expect(undoManager.canRedo()).toBe(true);

      undoManager.redo();
      expect(undoManager.canUndo()).toBe(true);
      expect(undoManager.canRedo()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear all history", () => {
      undoManager.pushState(createMockSnapshot("clip1"));
      undoManager.pushState(createMockSnapshot("clip2"));
      undoManager.pushState(createMockSnapshot("clip3"));

      undoManager.clear();

      expect(undoManager.getHistorySize()).toBe(0);
      expect(undoManager.getCurrentIndex()).toBe(-1);
      expect(undoManager.canUndo()).toBe(false);
      expect(undoManager.canRedo()).toBe(false);
    });
  });

  describe("history limit enforcement (Requirement 14.4)", () => {
    it("should maintain exactly 50 states when limit is exceeded", () => {
      for (let i = 0; i < 55; i++) {
        undoManager.pushState(createMockSnapshot(`clip${i}`));
      }

      expect(undoManager.getHistorySize()).toBe(50);
    });

    it("should remove oldest states when limit is exceeded", () => {
      for (let i = 0; i < 55; i++) {
        undoManager.pushState(createMockSnapshot(`clip${i}`));
      }

      // History should be limited to 50, so we have clip5-clip54
      // Index is at 49 (pointing to clip54)

      // Undo 49 times to get to clip5
      for (let i = 0; i < 49; i++) {
        undoManager.undo();
      }

      // We should now be at index 0, which is clip5
      expect(undoManager.getCurrentIndex()).toBe(0);

      // One more undo should return null (can't go below 0)
      const result = undoManager.undo();
      expect(result).toBeNull();
    });
  });

  describe("redo history clearing (Requirement 14.5)", () => {
    it("should clear redo history immediately after new operation", () => {
      undoManager.pushState(createMockSnapshot("clip1"));
      undoManager.pushState(createMockSnapshot("clip2"));
      undoManager.pushState(createMockSnapshot("clip3"));

      undoManager.undo();
      expect(undoManager.canRedo()).toBe(true);

      undoManager.pushState(createMockSnapshot("clip4"));
      expect(undoManager.canRedo()).toBe(false);
    });

    it("should not be able to redo after new operation", () => {
      undoManager.pushState(createMockSnapshot("clip1"));
      undoManager.pushState(createMockSnapshot("clip2"));
      undoManager.undo();

      undoManager.pushState(createMockSnapshot("clip3"));

      const result = undoManager.redo();
      expect(result).toBeNull();
    });
  });
});
