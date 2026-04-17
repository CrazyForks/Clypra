/**
 * TrackLane Component for Timeline Engine v1
 * Renders a track lane with its clips using virtualization
 * Requirements: 5.4, 5.5, 16.1, 16.6
 */

import { useMemo, memo } from "react";
import type { Track, Clip as ClipType } from "../types/core";
import { Clip } from "./Clip";
import { useVisibleClips } from "../hooks/useVisibleClips";
import { COLORS } from "../../../constants/colors";

interface TrackLaneProps {
  track: Track;
  clips: ClipType[];
  selectedClipIds: Set<string>;
  pxPerSec: number;
  scrollLeft: number;
  viewportWidth: number;
  onClipSelect: (id: string, multi: boolean) => void;
}

/**
 * TrackLane component with memoization for performance
 * Requirements: 16.1, 16.6
 */
export const TrackLane = memo(function TrackLane({ track, clips, selectedClipIds, pxPerSec, scrollLeft, viewportWidth, onClipSelect }: TrackLaneProps) {
  // Filter clips for this track
  const trackClips = useMemo(() => clips.filter((clip) => clip.trackId === track.id), [clips, track.id]);

  // Apply virtualization to only render visible clips
  // Requirements: 16.1, 16.6
  const visibleClips = useVisibleClips(trackClips, scrollLeft, viewportWidth, pxPerSec);

  return (
    <div
      className="relative border-b"
      style={{
        height: track.height,
        borderColor: COLORS.BORDER,
        opacity: track.visible ? 1 : 0.5,
      }}
    >
      {/* Render visible clips */}
      {visibleClips.map((clip) => (
        <Clip key={clip.id} clip={clip} isSelected={selectedClipIds.has(clip.id)} pxPerSec={pxPerSec} onSelect={onClipSelect} />
      ))}

      {/* Track locked overlay */}
      {track.locked && (
        <div className="pointer-events-none absolute inset-0 bg-black/10 flex items-center justify-center">
          <div className="text-xs text-white/50">Locked</div>
        </div>
      )}
    </div>
  );
});
