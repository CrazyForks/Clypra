import { COLORS } from "../../../constants/colors";
import { IconUndo, IconRedo, IconPointer, IconSplit, IconTrash, IconMarker, IconMic, IconMagnet, IconSearch, IconPlay, IconPause } from "../../../components/ui/icons";

type TimelineToolbarProps = {
  snapMain: boolean;
  snapAuto: boolean;
  snapLink: boolean;
  pxPerSec: number;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onSnapMainToggle: () => void;
  onSnapAutoToggle: () => void;
  onSnapLinkToggle: () => void;
  onZoomChange: (value: number) => void;
  minZoom: number;
  maxZoom: number;
};

export function TimelineToolbar({ snapMain, snapAuto, snapLink, pxPerSec, isPlaying, onPlayPauseToggle, onSnapMainToggle, onSnapAutoToggle, onSnapLinkToggle, onZoomChange, minZoom, maxZoom }: TimelineToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b px-2" style={{ borderColor: COLORS.BORDER }} role="toolbar" aria-label="Timeline editing tools">
      <div className="flex items-center gap-0.5 text-zinc-400">
        {/* Play/Pause Button */}
        <button type="button" onClick={onPlayPauseToggle} className="rounded p-1.5 hover:bg-white/5 hover:text-zinc-200 text-white" title={isPlaying ? "Pause (Space)" : "Play (Space)"} aria-label={isPlaying ? "Pause playback" : "Play video"} style={{ backgroundColor: isPlaying ? "rgba(0,194,255,0.12)" : "transparent" }}>
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>
        <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden="true" />
        <button type="button" className="rounded p-1.5 hover:bg-white/5 hover:text-zinc-200" title="Undo" aria-label="Undo last action">
          <IconUndo />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/5 hover:text-zinc-200" title="Redo" aria-label="Redo last undone action">
          <IconRedo />
        </button>
        <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden="true" />
        <button type="button" className="rounded p-1.5 text-white" style={{ backgroundColor: "rgba(0,194,255,0.12)" }} title="Select" aria-label="Selection tool" aria-pressed="true">
          <IconPointer />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/5" title="Split" aria-label="Split clip tool">
          <IconSplit />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/5" title="Delete" aria-label="Delete selected clips">
          <IconTrash />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/5" title="Marker" aria-label="Add marker">
          <IconMarker />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded p-1.5 text-zinc-400 hover:bg-white/5" title="Voiceover" aria-label="Record voiceover">
          <IconMic />
        </button>
        <SnapToggle active={snapMain} label="Magnet" onClick={onSnapMainToggle} />
        <SnapToggle active={snapAuto} label="Snap" onClick={onSnapAutoToggle} />
        <SnapToggle active={snapLink} label="Link" onClick={onSnapLinkToggle} />
        <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden="true" />
        <div className="flex items-center gap-1.5 pr-1">
          <span className="text-zinc-500" aria-hidden="true">
            <IconSearch />
          </span>
          <input type="range" min={minZoom} max={maxZoom} value={pxPerSec} onChange={(e) => onZoomChange(Number(e.target.value))} className="h-1 w-28 cursor-pointer accent-[#00c2ff]" aria-label="Timeline zoom level" aria-valuemin={minZoom} aria-valuemax={maxZoom} aria-valuenow={pxPerSec} aria-valuetext={`${Math.round(pxPerSec)} pixels per second`} />
        </div>
      </div>
    </div>
  );
}

function SnapToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={`Toggle ${label.toLowerCase()}`}
      aria-pressed={active}
      className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium"
      style={{
        color: active ? COLORS.ACCENT : "#71717a",
        backgroundColor: active ? "rgba(0,194,255,0.12)" : "transparent",
      }}
    >
      <IconMagnet />
      {label}
    </button>
  );
}
