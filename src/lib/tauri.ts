import { invoke, Channel } from "@tauri-apps/api/core";

/**
 * Tauri `invoke` / FFmpeg need a native filesystem path. The webview may use
 * `convertFileSrc` URLs or `file://` URLs elsewhere — normalize before calling Rust.
 */
export function normalizePathForTauriInvoke(inputPath: string): string {
  const p = inputPath.trim();
  if (!p.startsWith("file://")) {
    return p;
  }
  try {
    const url = new URL(p);
    let pathname = decodeURIComponent(url.pathname.replace(/\+/g, " "));
    // Windows: file:///C:/Users/... → pathname often /C:/Users/...
    if (/^\/[A-Za-z]:/.test(pathname)) {
      pathname = pathname.slice(1);
    }
    return pathname;
  } catch {
    return p;
  }
}

// ─── Native FFmpeg Decoder Commands ───────────────────────────────────────
// All video operations use the native ffmpeg-next decoder

import type { DensityLevel, ThumbnailTile } from "../types";

/**
 * Extract a single frame using the native decoder (fast path).
 * ~20-50ms first frame, ~3-15ms subsequent frames.
 * Returns base64-encoded WebP data URL.
 */
export async function decodeFrame(videoPath: string, timeSecs: number, width: number, height: number): Promise<string> {
  return invoke<string>("decode_frame", {
    videoPath: normalizePathForTauriInvoke(videoPath),
    timeSecs,
    width,
    height,
  });
}

/**
 * Extract multiple frames using the native decoder with streaming, instead of sidecar FFmpeg. Much faster for batch extractions.
 */
export async function decodeFramesStreaming(videoPath: string, timestamps: number[], density: DensityLevel, width: number, height: number, duration: number, onTile: (tile: ThumbnailTile) => void): Promise<void> {
  const channel = new Channel<ThumbnailTile>();
  channel.onmessage = onTile;

  return invoke("decode_frames_streaming", {
    videoPath: normalizePathForTauriInvoke(videoPath),
    timestamps,
    density,
    width,
    height,
    duration,
    onTile: channel,
  });
}

/**
 * Release the native decoder for a video to free memory. Call this when a clip is removed from the project.
 */
export function releaseVideoDecoder(videoPath: string): void {
  invoke("release_video_decoder", {
    videoPath: normalizePathForTauriInvoke(videoPath),
  });
}

/**
 * Get render cache statistics (atlas hits, tier cache hits, decodes).
 * Useful for monitoring cache effectiveness.
 */
export async function getRenderCacheStats(): Promise<{
  atlas_hits: number;
  tier_cache_hits: number;
  decodes: number;
  total_requests: number;
}> {
  return invoke("get_render_cache_stats");
}
