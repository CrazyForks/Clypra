/**
 * Clip trim interaction hook for Timeline Engine v1
 * Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 14.6
 */

import { useCallback } from "react";
import { useTimelineStore } from "../store/timelineStore";
import { CoordinateSystem } from "../utils/coordinateSystem";
import { SnapSystem } from "../utils/snapSystem";
import { clamp } from "../utils/math";

interface UseClipTrimOptions {
  clipId: string;
  edge: "start" | "end";
  coords: CoordinateSystem;
}

interface UseClipTrimReturn {
  handlePointerDown: (e: React.PointerEvent) => void;
}

/**
 * Hook for handling clip trim interactions
 * Supports trimming clip start and end with snap system integration
 * Requirements: 7.3, 7.4, 7.6, 7.7
 */
export function useClipTrim({ clipId, edge, coords }: UseClipTrimOptions): UseClipTrimReturn {
  const store = useTimelineStore();

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle left mouse button (Requirement 7.3)
      if (e.button !== 0) return;

      // Stop propagation to prevent clip drag
      e.stopPropagation();

      const clip = store.clips.get(clipId);
      if (!clip || clip.locked) return;

      // Initialize trim state (Requirement 7.3)
      store.setTrimState({
        clipId,
        edge,
        originalStartTime: clip.startTime,
        originalDuration: clip.duration,
        currentTime: edge === "start" ? clip.startTime : clip.startTime + clip.duration,
        snapTarget: null,
      });

      // Create snap system with current settings
      const snapSystem = new SnapSystem(coords, {
        playhead: store.snapToPlayhead,
        clips: store.snapToClips,
        markers: store.snapToMarkers,
      });

      // Pointer move handler - updates trim state in real-time (Requirement 7.3, 7.4)
      const handleMove = (e: PointerEvent) => {
        const trimState = store.trimState;
        if (!trimState) return;

        const clip = store.clips.get(clipId);
        if (!clip) return;

        // Get the timeline container to calculate relative position
        const timelineElement = document.querySelector("[data-timeline-scroll-area]");
        if (!timelineElement) return;

        const rect = timelineElement.getBoundingClientRect();
        const x = e.clientX - rect.left + store.scrollLeft;
        const time = coords.pixelsToTime(x);

        // Apply snap system (Requirement 7.7)
        const allClips = Array.from(store.clips.values());
        const snapTarget = snapSystem.findSnapTarget(
          time,
          allClips.filter((c) => c.id !== clipId), // Exclude current clip from snap targets
          store.playhead,
          [], // No markers in MVP
        );

        const snappedTime = snapTarget ? snapTarget.time : time;

        // Validate trim constraints (Requirement 7.5, 7.6)
        const MIN_DURATION = 0.1; // Minimum clip duration (Requirement 7.5)
        let finalTime = snappedTime;

        if (edge === "start") {
          // Trimming start: adjust start time while keeping end time fixed (Requirement 7.3)
          const maxStartTime = clip.startTime + clip.duration - MIN_DURATION;

          // Clamp to valid range (Requirement 7.5, 7.6)
          finalTime = clamp(snappedTime, 0, maxStartTime);

          // Prevent trim beyond source media boundaries (Requirement 7.6)
          const sourceStartDelta = finalTime - clip.startTime;
          const newSourceStart = clip.sourceStart + sourceStartDelta;

          // Ensure we don't trim before source media start
          if (newSourceStart < 0) {
            finalTime = clip.startTime - clip.sourceStart;
          }
        } else {
          // Trimming end: adjust end time while keeping start time fixed (Requirement 7.4)
          const minEndTime = clip.startTime + MIN_DURATION;

          // Clamp to valid range (Requirement 7.5, 7.6)
          finalTime = clamp(snappedTime, minEndTime, store.duration);

          // Prevent trim beyond source media boundaries (Requirement 7.6)
          const newDuration = finalTime - clip.startTime;
          const newSourceEnd = clip.sourceStart + newDuration;
          const sourceMediaDuration = clip.sourceEnd - clip.sourceStart + clip.duration;

          // Ensure we don't trim beyond source media end
          if (newSourceEnd > sourceMediaDuration) {
            finalTime = clip.startTime + (sourceMediaDuration - clip.sourceStart);
          }
        }

        // Update trim state with current time and snap target
        store.setTrimState({
          ...trimState,
          currentTime: finalTime,
          snapTarget,
        });
      };

      // Pointer up handler - commits the trim (Requirement 7.5, 14.6)
      const handleUp = () => {
        const trimState = store.trimState;
        if (!trimState) return;

        const clip = store.clips.get(clipId);
        if (!clip) return;

        // Calculate new start time and duration based on trim edge
        let newStartTime: number;
        let newDuration: number;

        if (edge === "start") {
          // Trim start: adjust start time and duration (Requirement 7.3)
          newStartTime = trimState.currentTime;
          newDuration = clip.duration + (clip.startTime - trimState.currentTime);
        } else {
          // Trim end: adjust duration only (Requirement 7.4)
          newStartTime = clip.startTime;
          newDuration = trimState.currentTime - clip.startTime;
        }

        // Commit trim to store (adds to undo history - Requirement 14.6)
        store.trimClip(clipId, newStartTime, newDuration);

        // Clear trim state
        store.setTrimState(null);

        // Remove event listeners
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      // Attach global event listeners
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [clipId, edge, coords, store],
  );

  return { handlePointerDown };
}
