import React, { useRef, useCallback, useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface PreviewTransportProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  formatTime: (seconds: number) => string;

  // Source-specific: in/out range overlay on scrub bar
  inPoint?: number | null;
  outPoint?: number | null;

  // Program-specific: frame-step buttons
  onStepBack?: () => void;
  onStepForward?: () => void;

  // Slot for left-side extras (speed menu, etc.)
  leftActions?: React.ReactNode;

  // Slot for right-side extras (IN/OUT/Add, aspect/volume, etc.)
  rightActions?: React.ReactNode;
}

export const PreviewTransport: React.FC<PreviewTransportProps> = ({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  formatTime,
  inPoint,
  outPoint,
  onStepBack,
  onStepForward,
  leftActions,
  rightActions,
}) => {
  const scrubRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekToPosition = useCallback(
    (clientX: number) => {
      if (!scrubRef.current || duration <= 0) return;
      const rect = scrubRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  useEffect(() => {
    if (!isScrubbing) return;
    const handleMove = (e: MouseEvent) => seekToPosition(e.clientX);
    const handleUp = () => setIsScrubbing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isScrubbing, seekToPosition]);

  return (
    <>
      {/* ── Scrub Bar (thin, edge-to-edge) ────────────────────────── */}
      <div
        ref={scrubRef}
        className="h-[5px] w-full cursor-pointer group relative shrink-0"
        onMouseDown={(e) => {
          setIsScrubbing(true);
          seekToPosition(e.clientX);
        }}
      >
        {/* Track bg */}
        <div className="absolute inset-0 bg-surface" />
        {/* In/Out range */}
        {inPoint != null && outPoint != null && duration > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-accent/15"
            style={{
              left: `${(inPoint / duration) * 100}%`,
              width: `${((outPoint - inPoint) / duration) * 100}%`,
            }}
          />
        )}
        {/* Progress fill */}
        <div className="absolute top-0 bottom-0 left-0 bg-accent transition-all duration-100 ease-linear" style={{ width: `${progressPct}%` }} />
        {/* Playhead dot */}
        <div className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-accent border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${progressPct}% - 5px)` }} />
      </div>

      {/* ── Bottom Controls ────────────────────────────────────────── */}
      <div className="flex items-center h-10 px-3 shrink-0 relative">
        {/* Timecodes + left actions */}
        <div className="flex items-center gap-1">
          <div className="flex items-baseline gap-1 select-none" style={{ fontVariantNumeric: "tabular-nums" }}>
            <span className="text-[12px] font-medium text-accent">{formatTime(currentTime)}</span>
            <span className="text-[11px] text-text-muted/50">/</span>
            <span className="text-[12px] text-text-muted">{formatTime(duration)}</span>
          </div>
          {leftActions}
        </div>

        {/* Center play controls */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          {onStepBack && (
            <button onClick={onStepBack} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/6 transition-colors text-text-muted hover:text-text-primary" title="Previous frame" aria-label="Previous frame">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onPlayPause}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/6 transition-colors text-text-primary mx-1"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause playback" : "Play playback"}
          >
            {isPlaying ? <Pause className="w-[18px] h-[18px]" /> : <Play className="w-[18px] h-[18px] ml-0.5" />}
          </button>
          {onStepForward && (
            <button onClick={onStepForward} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/6 transition-colors text-text-muted hover:text-text-primary" title="Next frame" aria-label="Next frame">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right side actions */}
        {rightActions && <div className="ml-auto flex items-center gap-2">{rightActions}</div>}
      </div>
    </>
  );
};
