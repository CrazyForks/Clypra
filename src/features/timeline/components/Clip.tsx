/**
 * Clip Component for Timeline Engine v1
 * Renders individual clips on the timeline with visual layout, trim handles, and selection
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 7.1, 7.2, 10.1, 10.2, 10.7, 11.1, 11.4, 11.5, 11.7, 16.1, 19.5, 22.2, 22.3
 */

import { useMemo, memo } from "react";
import type { Clip as ClipType } from "../types/core";
import { CoordinateSystem } from "../utils/coordinateSystem";
import { formatTime } from "../utils/timeFormat";
import { COLORS } from "../../../constants/colors";
import { Waveform } from "./Waveform";
import { useWaveform } from "../hooks/useWaveform";
import { useFilmstrip } from "../hooks/useFilmstrip";
import { useClipDrag } from "../hooks/useClipDrag";
import { useClipTrim } from "../hooks/useClipTrim";
import { useTimelineStore } from "../store/timelineStore";

interface ClipProps {
  clip: ClipType;
  isSelected: boolean;
  pxPerSec: number;
  onSelect: (id: string, multi: boolean) => void;
}

/**
 * Get track-specific styling colors based on clip type
 * Requirements: 5.3
 */
function getClipColors(type: ClipType["type"]): { background: string; border: string } {
  switch (type) {
    case "video":
      return {
        background: "linear-gradient(180deg, #0d9488 0%, #0f766e 100%)",
        border: "#14b8a6",
      };
    case "audio":
      return {
        background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
        border: "#34d399",
      };
    case "text":
      return {
        background: "linear-gradient(180deg, #ea580c 0%, #c2410c 100%)",
        border: "#f97316",
      };
    default:
      return {
        background: "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)",
        border: "#818cf8",
      };
  }
}

/**
 * Clip component with memoization for performance
 * Requirements: 16.1, 16.6
 */
export const Clip = memo(function Clip({ clip, isSelected, pxPerSec, onSelect }: ClipProps) {
  const coords = useMemo(() => new CoordinateSystem(pxPerSec), [pxPerSec]);
  const dragState = useTimelineStore((state) => state.dragState);

  // Calculate clip position and width with memoization
  // Requirements: 5.1, 5.2, 16.4
  const { x: baseX, width } = useMemo(
    () => ({
      x: coords.timeToPixels(clip.startTime),
      width: Math.max(8, coords.timeToPixels(clip.duration)), // Minimum 8 pixels (Requirement 5.3)
    }),
    [coords, clip.startTime, clip.duration],
  );

  let x = baseX;

  // Apply drag offset if this clip is being dragged (Requirement 6.7)
  const isDragging = dragState && dragState.clipIds.includes(clip.id);
  if (isDragging && dragState) {
    const offsetPixels = coords.timeToPixels(dragState.currentOffset);
    x += offsetPixels;
  }

  const colors = getClipColors(clip.type);

  // Load waveform data for audio/video clips (Requirements: 10.1, 10.3, 10.4, 10.7, 22.2)
  const hasAudio = clip.type === "audio" || clip.type === "video";
  const { peaks, loading: waveformLoading, error: waveformError } = useWaveform(clip.sourceMediaPath, hasAudio);

  // Load filmstrip for video clips (Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 22.3)
  const hasVideo = clip.type === "video";
  const { stripUrl, loading: filmstripLoading } = useFilmstrip(hasVideo ? clip.sourceMediaPath : null, clip.duration);

  // Clip drag interaction (Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 14.6, 19.6)
  const { handlePointerDown: handleDragStart } = useClipDrag({ clipId: clip.id, coords });

  // Clip trim interactions (Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 14.6)
  const { handlePointerDown: handleTrimStartDown } = useClipTrim({ clipId: clip.id, edge: "start", coords });
  const { handlePointerDown: handleTrimEndDown } = useClipTrim({ clipId: clip.id, edge: "end", coords });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    // Check for modifier keys
    const isCtrl = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on Mac
    const isShift = e.shiftKey;

    // Handle selection based on modifier keys
    if (isShift) {
      // Shift+click: range selection (Requirement 19.3)
      const store = useTimelineStore.getState();
      store.selectRange(clip.id);
      // Don't initiate drag for shift+click
      return;
    } else if (isCtrl) {
      // Ctrl+click: toggle selection (Requirement 19.2)
      onSelect(clip.id, true);
      // Don't initiate drag for ctrl+click
      return;
    } else {
      // Regular click: select this clip (Requirement 19.1)
      onSelect(clip.id, false);
    }

    // Initiate drag
    handleDragStart(e);
  };

  // Keyboard navigation support (Requirement 20.2)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter or Space to select
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(clip.id, e.ctrlKey || e.metaKey);
    }
    // Arrow keys for navigation
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      // Focus management will be handled by the parent component
      const direction = e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : e.key === "ArrowUp" ? "up" : "down";
      // Dispatch custom event for parent to handle focus navigation
      const event = new CustomEvent("clipNavigate", { detail: { clipId: clip.id, direction }, bubbles: true });
      e.currentTarget.dispatchEvent(event);
    }
  };

  return (
    <div
      className="absolute top-1 flex cursor-grab items-center overflow-hidden rounded-sm shadow-md"
      style={{
        left: x,
        width,
        height: "calc(100% - 8px)",
        background: colors.background,
        // Selection highlight border (Requirement 19.5)
        outline: isSelected ? `2px solid ${COLORS.ACCENT}` : "none",
        outlineOffset: isSelected ? "1px" : "0",
        // Visual feedback during drag (Requirement 6.7)
        opacity: isDragging ? 0.7 : 1,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${clip.type} clip: ${clip.name}, duration ${formatTime(clip.duration)}, starts at ${formatTime(clip.startTime)}`}
      aria-selected={isSelected}
      aria-grabbed={isDragging}
    >
      {/* Filmstrip background for video clips (Requirements: 11.1, 11.4, 11.5, 11.7, 22.3) */}
      {hasVideo && (
        <div className="absolute inset-0 pointer-events-none" role="img" aria-label={filmstripLoading ? "Loading video preview" : stripUrl ? `Video preview for ${clip.name}` : "Video preview unavailable"}>
          {filmstripLoading && (
            // Loading indicator (Requirement 11.7)
            <div className="flex items-center justify-center h-full">
              <div className="text-[10px] text-white/60">Loading filmstrip...</div>
            </div>
          )}
          {!filmstripLoading && !stripUrl && (
            // Fallback message for generation failures (Requirement 22.3)
            <div className="flex items-center justify-center h-full">
              <div className="text-[10px] text-white/40">No preview</div>
            </div>
          )}
          {!filmstripLoading && stripUrl && (
            // Display filmstrip as background image (Requirement 11.4)
            <div
              className="w-full h-full bg-cover bg-center opacity-40"
              style={{
                backgroundImage: `url(${stripUrl})`,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </div>
      )}

      {/* Waveform visualization (Requirements: 10.1, 10.2, 10.5, 10.6) */}
      {hasAudio && (
        <div className="absolute inset-0 pointer-events-none" role="img" aria-label={waveformLoading ? "Loading audio waveform" : waveformError ? "Audio waveform unavailable" : `Audio waveform for ${clip.name}`}>
          {waveformLoading && (
            // Loading indicator (Requirement 10.7)
            <div className="flex items-center justify-center h-full">
              <div className="text-[10px] text-white/60">Loading waveform...</div>
            </div>
          )}
          {waveformError && (
            // Fallback message for generation failures (Requirement 22.2)
            <div className="flex items-center justify-center h-full">
              <div className="text-[10px] text-white/40">No waveform</div>
            </div>
          )}
          {!waveformLoading && !waveformError && peaks && <Waveform peaks={peaks} width={width} height={60} className="opacity-60" />}
        </div>
      )}

      {/* Clip content */}
      <div className="relative flex min-w-0 flex-1 flex-col justify-between px-2 py-1 pointer-events-none">
        {/* Clip name (Requirement 5.5) */}
        <div className="truncate text-[11px] font-medium text-white/95">{clip.name}</div>

        {/* Duration label (Requirement 5.6) */}
        <div className="text-[10px] font-mono text-white/80 tabular-nums">{formatTime(clip.duration)}</div>
      </div>

      {/* Left trim handle (Requirements: 7.1, 7.2) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 100%)",
        }}
        onPointerDown={handleTrimStartDown}
        role="slider"
        aria-label={`Trim start of ${clip.name}`}
        aria-valuemin={0}
        aria-valuemax={clip.startTime + clip.duration}
        aria-valuenow={clip.startTime}
        aria-valuetext={`Start time: ${formatTime(clip.startTime)}`}
        tabIndex={0}
      />

      {/* Right trim handle (Requirements: 7.1, 7.2) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
        style={{
          background: "linear-gradient(270deg, rgba(255,255,255,0.15) 0%, transparent 100%)",
        }}
        onPointerDown={handleTrimEndDown}
        role="slider"
        aria-label={`Trim end of ${clip.name}`}
        aria-valuemin={clip.startTime}
        aria-valuemax={clip.startTime + clip.duration}
        aria-valuenow={clip.startTime + clip.duration}
        aria-valuetext={`End time: ${formatTime(clip.startTime + clip.duration)}`}
        tabIndex={0}
      />
    </div>
  );
});
