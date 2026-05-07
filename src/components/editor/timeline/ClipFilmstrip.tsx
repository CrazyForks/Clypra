import { Channel, convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizePathForTauriInvoke } from "../../../lib/tauri";
import { sampleTimestampsForZoom, generateTimestampGrid } from "../../../lib/timelineUtils";
import { cn } from "@/lib/utils";
import { DensityLevel } from "../../../types";
import type { Clip, MediaAsset, ThumbnailTile } from "../../../types";

/** Paths that must use poster tiling, not ffmpeg filmstrip (still images / mis-typed video). */
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif)$/i;

/**
 * No-op kept for test compatibility. The timestamp-based architecture no longer
 * uses an in-memory frame cache — cache management is handled by the Rust backend.
 */
export function clearFilmstripFrameCache(): void {
  // intentional no-op
}

export interface ClipFilmstripProps {
  clip: Clip;
  mediaAsset: MediaAsset;
  clipWidthPx: number;
  pixelsPerSecond: number;
  stripHeightPx?: number;
  className?: string;
}

/**
 * ClipFilmstrip renders a filmstrip of thumbnail tiles for a video clip.
 *
 * CapCut-style architecture:
 * - **Single density extraction**: Extracts once at High density (every 0.2s)
 *   using the native ffmpeg-next decoder
 * - **Zoom-based sampling**: Displays a subset of frames based on zoom level
 *   without re-extraction. Zoom out shows fewer frames (every Nth), zoom in shows more
 * - **Streaming channel**: `decode_frames_streaming` returns cached hits
 *   synchronously (< 5ms) and streams extracted frames as they complete
 */
export function ClipFilmstrip({ clip, mediaAsset, clipWidthPx: _clipWidthPx, pixelsPerSecond, stripHeightPx = 32, className }: ClipFilmstripProps) {
  /** Map from timestamp → tile (poster or real thumbnail). */
  const [tiles, setTiles] = useState<Map<number, ThumbnailTile>>(new Map());
  /**
   * Base timestamp grid (5s interval) - extracted once, sampled based on zoom
   */
  const [baseTimestamps, setBaseTimestamps] = useState<number[]>([]);
  /**
   * Display timestamps - sampled from base grid based on zoom
   */
  const displayTimestamps = useMemo(() => {
    return sampleTimestampsForZoom(baseTimestamps, pixelsPerSecond);
  }, [baseTimestamps, pixelsPerSecond]);

  const isVideoSource = useMemo(() => {
    const path = mediaAsset.path ?? "";
    return mediaAsset.type === "video" && path.length > 0 && !IMAGE_EXT.test(path);
  }, [mediaAsset.type, mediaAsset.path]);

  /**
   * Resolution tier derived from window.devicePixelRatio:
   *   - "1x" for DPR in [1.0, 1.5)  → extract at 80×60 px
   *   - "2x" for DPR ≥ 1.5          → extract at 160×120 px (Retina/HiDPI)
   *
   * Matches the backend ResolutionTier enum and cache key format.
   */
  const resolutionTier = typeof window !== "undefined" && window.devicePixelRatio >= 1.5 ? "2x" : "1x";
  const [thumbW, thumbH] = resolutionTier === "2x" ? [160, 120] : [80, 60];

  // ── High-density grid generation ─────────────────────────────────────────────
  // Generate timestamp grid once at High density (every 0.2s)
  // This grid is used for extraction, then sampled based on zoom for display
  useEffect(() => {
    console.log("[ClipFilmstrip] High-density grid gen check:", {
      hasDuration: !!mediaAsset.duration,
      duration: mediaAsset.duration,
      isVideoSource,
      trimIn: clip.trimIn,
      trimOut: clip.trimOut,
    });

    if (!mediaAsset.duration || !isVideoSource) {
      console.log("[ClipFilmstrip] SKIPPING grid gen - no duration or not video");
      setBaseTimestamps([]);
      setTiles(new Map());
      return;
    }

    // Always generate at Low density (5s interval) for instant extraction
    const BASE_INTERVAL = 5.0;
    const grid = generateTimestampGrid(clip.trimIn, clip.trimOut, BASE_INTERVAL, mediaAsset.duration);
    console.log(`[ClipFilmstrip] Generated ${grid.length} base timestamps (interval=${BASE_INTERVAL}s)`);
    setBaseTimestamps(grid);

    // Initialize tiles with poster frames so the filmstrip shows something immediately
    if (mediaAsset.posterFrame) {
      const posterSrc = mediaAsset.posterFrame.startsWith("data:") ? mediaAsset.posterFrame : convertFileSrc(mediaAsset.posterFrame);
      const initialTiles = new Map<number, ThumbnailTile>(grid.map((time) => [time, { time, path: posterSrc, density: DensityLevel.Low }]));
      setTiles(initialTiles);
    } else {
      setTiles(new Map());
    }
  }, [clip.trimIn, clip.trimOut, mediaAsset.duration, mediaAsset.posterFrame, isVideoSource]);

  // ── Streaming thumbnail channel ────────────────────────────────────────────
  // Extract thumbnails once at High density using native decoder
  useEffect(() => {
    if (!isVideoSource || !mediaAsset.path || !mediaAsset.duration || baseTimestamps.length === 0) {
      return;
    }

    let cancelled = false;
    const videoPath = normalizePathForTauriInvoke(mediaAsset.path);
    const channel = new Channel<ThumbnailTile>();
    let tilesReceived = 0;

    channel.onmessage = (tile) => {
      tilesReceived++;
      if (tilesReceived <= 3 || tilesReceived % 20 === 0) {
        console.log(`[ClipFilmstrip] Tile #${tilesReceived} received: time=${tile.time.toFixed(2)}s`);
      }
      if (cancelled) return;
      setTiles((prev) => {
        const next = new Map(prev);
        const isDataUri = tile.path.startsWith("data:");
        const imgSrc = isDataUri ? tile.path : convertFileSrc(tile.path);
        next.set(tile.time, { ...tile, path: imgSrc });
        return next;
      });
    };

    console.log(`[ClipFilmstrip] Requesting ${baseTimestamps.length} frames at Low density via decode_frames_streaming`);

    invoke("decode_frames_streaming", {
      videoPath,
      timestamps: baseTimestamps,
      density: DensityLevel.Low,
      width: thumbW,
      height: thumbH,
      duration: mediaAsset.duration,
      onTile: channel,
    })
      .then(() => {
        console.log("[ClipFilmstrip] decode_frames_streaming completed");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[ClipFilmstrip] decode_frames_streaming failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isVideoSource, mediaAsset.path, mediaAsset.duration, baseTimestamps, thumbW, thumbH]);

  // ── Render ─────────────────────────────────────────────────────────────────
  // Fixed tile width for consistent appearance (5s interval at 10px/s = 50px)
  const tileWidth = 50;

  // Filter tiles to only show those in the display timestamps (sampled from high-density grid)
  const displayTiles = displayTimestamps.map((time) => tiles.get(time)).filter((tile): tile is ThumbnailTile => tile !== undefined);

  const poster = mediaAsset.posterFrame;

  // Video source with tiles: render the timestamp-based filmstrip.
  if (isVideoSource && displayTiles.length > 0) {
    return (
      <div data-testid="clip-filmstrip" className={cn("w-full overflow-hidden rounded-[2px] border border-black/20 bg-[#0c2730]/40", className)} style={{ height: stripHeightPx, display: "flex", overflow: "hidden" }}>
        {displayTiles.map((tile) => (
          <img
            key={tile.time}
            src={tile.path}
            alt={`Frame at ${tile.time}s`}
            style={{
              width: tileWidth,
              height: stripHeightPx,
              objectFit: "cover",
              flexShrink: 0,
            }}
            draggable={false}
          />
        ))}
      </div>
    );
  }

  // Poster frame fallback (image assets or video before first grid is ready).
  if (poster) {
    return (
      <div data-testid="clip-filmstrip-fallback" className={cn("relative overflow-hidden rounded-[2px] border border-black/20", className)} style={{ height: stripHeightPx }}>
        <img src={poster} alt="" className="absolute inset-0 block h-full w-full object-cover object-center select-none" draggable={false} />
      </div>
    );
  }

  // Empty state — no poster and no tiles yet.
  return <div data-testid="clip-filmstrip-empty" className={cn("w-full rounded-[2px] bg-[#0c2730]/60", className)} style={{ height: stripHeightPx }} />;
}
