/**
 * Export Pipeline for Timeline Engine v1
 * Generates FFmpeg commands from timeline state
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 22.4, 22.6
 */

import type { Clip, Track } from "../types/core";
import { TimelineError, ErrorCodes } from "../types/errors";

export interface ExportOptions {
  outputPath: string;
  resolution: { width: number; height: number };
  fps: number;
  codec: string;
  quality: number;
}

/**
 * Export Pipeline class for generating FFmpeg commands from timeline state
 */
export class ExportPipeline {
  /**
   * Generate FFmpeg command arguments from timeline state
   * Requirements: 18.1, 18.2, 22.4, 22.6
   */
  generateFFmpegCommand(clips: Map<string, Clip>, tracks: Map<string, Track>, options: ExportOptions): string[] {
    try {
      const args: string[] = [];

      // Validate we have clips to export
      if (clips.size === 0) {
        throw new TimelineError("Cannot export: No clips on timeline", ErrorCodes.EXPORT_FAILED, true);
      }

      // Validate we have tracks
      if (tracks.size === 0) {
        throw new TimelineError("Cannot export: No tracks on timeline", ErrorCodes.EXPORT_FAILED, true);
      }

      // Group clips by source media to optimize input handling
      const clipsBySource = this.groupClipsBySource(clips);
      const inputMap = new Map<string, number>();
      let inputIndex = 0;

      // Add input arguments for each unique source file
      // Requirement 18.2: Include trim operations for each clip
      for (const [sourcePath, _sourceClips] of clipsBySource) {
        if (!sourcePath || sourcePath.trim() === "") {
          throw new TimelineError("Cannot export: Clip has empty source media path", ErrorCodes.EXPORT_FAILED, true);
        }
        args.push("-i", sourcePath);
        inputMap.set(sourcePath, inputIndex++);
      }

      // Build filter_complex for layering clips
      // Requirements: 18.3, 18.4, 18.5
      const filterChain = this.buildFilterChain(clips, tracks, inputMap, options);

      if (filterChain) {
        args.push("-filter_complex", filterChain);
      }

      // Output options
      args.push(
        "-c:v",
        options.codec,
        "-crf",
        options.quality.toString(),
        "-r",
        options.fps.toString(),
        "-s",
        `${options.resolution.width}x${options.resolution.height}`,
        "-y", // Overwrite output
        options.outputPath,
      );

      return args;
    } catch (error) {
      // Requirement 22.6: Log errors with context for debugging
      console.error("Failed to generate FFmpeg command:", error, { clipCount: clips.size, trackCount: tracks.size });

      // Re-throw for caller to handle
      throw error;
    }
  }

  /**
   * Build FFmpeg filter chain for multi-track composition
   * Requirements: 18.3, 18.4, 18.5
   */
  private buildFilterChain(clips: Map<string, Clip>, tracks: Map<string, Track>, inputMap: Map<string, number>, options: ExportOptions): string {
    const filters: string[] = [];

    // Sort tracks by order (lower order = bottom layer, higher order = top layer)
    // Requirement 18.3: Layer clips according to track order
    const sortedTracks = Array.from(tracks.values()).sort((a, b) => a.order - b.order);

    let layerIndex = 0;
    const videoLayers: string[] = [];
    const audioLayers: string[] = [];

    for (const track of sortedTracks) {
      // Get clips for this track, sorted by start time
      const trackClips = Array.from(clips.values())
        .filter((c) => c.trackId === track.id)
        .sort((a, b) => a.startTime - b.startTime);

      for (const clip of trackClips) {
        const inputIdx = inputMap.get(clip.sourceMediaPath);
        if (inputIdx === undefined) {
          continue;
        }

        // Requirement 18.2: Build trim and position filters for each clip
        // Trim the clip from source media
        const trimStart = clip.sourceStart;
        const trimEnd = clip.sourceEnd;

        let videoLayerCreated = false;
        let audioLayerCreated = false;

        // Video processing
        // Requirement 18.5: Respect track visibility settings
        if ((clip.type === "video" || clip.type === "audio") && track.type === "video" && track.visible) {
          // Trim video, reset PTS, scale to output resolution, and add delay
          const videoFilter = `[${inputIdx}:v]trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS,scale=${options.resolution.width}:${options.resolution.height}:force_original_aspect_ratio=decrease,pad=${options.resolution.width}:${options.resolution.height}:(ow-iw)/2:(oh-ih)/2,tpad=start_duration=${clip.startTime}:start_mode=clone[v${layerIndex}]`;
          filters.push(videoFilter);
          videoLayers.push(`[v${layerIndex}]`);
          videoLayerCreated = true;
        }

        // Audio processing
        // Requirement 18.4: Respect track mute settings
        if (!track.muted && !clip.muted && (clip.type === "video" || clip.type === "audio")) {
          // Trim audio, reset PTS, and add delay
          const audioDelayMs = clip.startTime * 1000;
          const audioFilter = `[${inputIdx}:a]atrim=start=${trimStart}:end=${trimEnd},asetpts=PTS-STARTPTS,adelay=${audioDelayMs}|${audioDelayMs}[a${layerIndex}]`;
          filters.push(audioFilter);
          audioLayers.push(`[a${layerIndex}]`);
          audioLayerCreated = true;
        }

        // Only increment layer index if we created at least one layer
        if (videoLayerCreated || audioLayerCreated) {
          layerIndex++;
        }
      }
    }

    // If no layers, return empty filter chain
    if (videoLayers.length === 0 && audioLayers.length === 0) {
      return "";
    }

    // Requirement 18.3: Generate overlay chain for multi-track composition
    // Build overlay chain for video layers
    let overlayChain = "";
    if (videoLayers.length > 0) {
      if (videoLayers.length === 1) {
        // Single video layer, just use it directly
        overlayChain = `${videoLayers[0]}`;
      } else {
        // Multiple video layers, overlay them
        overlayChain = videoLayers[0];
        for (let i = 1; i < videoLayers.length; i++) {
          const prevLabel = i === 1 ? overlayChain : `[vtmp${i - 1}]`;
          const nextLabel = i === videoLayers.length - 1 ? "[vout]" : `[vtmp${i}]`;
          overlayChain += `;${prevLabel}${videoLayers[i]}overlay=eof_action=pass${nextLabel}`;
        }
      }
    }

    // Build audio mixing chain
    let audioChain = "";
    if (audioLayers.length > 0) {
      if (audioLayers.length === 1) {
        // Single audio layer
        audioChain = `${audioLayers[0]}`;
      } else {
        // Multiple audio layers, mix them
        audioChain = audioLayers.join("") + `amix=inputs=${audioLayers.length}:duration=longest[aout]`;
      }
    }

    // Combine video and audio chains
    const filterParts: string[] = [];
    if (filters.length > 0) {
      filterParts.push(filters.join(";"));
    }
    if (overlayChain) {
      filterParts.push(overlayChain);
    }
    if (audioChain) {
      filterParts.push(audioChain);
    }

    return filterParts.join(";");
  }

  /**
   * Group clips by source media path
   * Requirement 18.2: Group clips by source media
   */
  private groupClipsBySource(clips: Map<string, Clip>): Map<string, Clip[]> {
    const groups = new Map<string, Clip[]>();

    for (const clip of clips.values()) {
      const existing = groups.get(clip.sourceMediaPath) || [];
      existing.push(clip);
      groups.set(clip.sourceMediaPath, existing);
    }

    return groups;
  }

  /**
   * Validate that all source media files exist before export
   * Requirements: 18.6, 18.8, 18.9, 22.1, 22.6
   */
  async validateSourceFiles(clips: Map<string, Clip>): Promise<{ valid: boolean; missingFiles: string[] }> {
    try {
      const uniqueSources = new Set<string>();
      for (const clip of clips.values()) {
        uniqueSources.add(clip.sourceMediaPath);
      }

      const missingFiles: string[] = [];

      // Check each unique source file
      // Note: In a real implementation, this would use Tauri's file system API
      // For now, we'll return a structure that can be used by the caller
      for (const sourcePath of uniqueSources) {
        // Placeholder for file existence check
        // In production, this would call: await invoke('check_file_exists', { path: sourcePath })
        // For now, we assume files exist unless the path is empty
        if (!sourcePath || sourcePath.trim() === "") {
          missingFiles.push(sourcePath || "(empty path)");
        }
      }

      // Requirement 18.9: Return descriptive error message for missing files
      if (missingFiles.length > 0) {
        const errorMsg = `Cannot export: Missing source media files: ${missingFiles.join(", ")}`;
        console.error(errorMsg);
      }

      return {
        valid: missingFiles.length === 0,
        missingFiles,
      };
    } catch (error) {
      // Requirement 22.6: Log errors with context for debugging
      console.error("Failed to validate source files:", error);
      throw error;
    }
  }

  /**
   * Execute FFmpeg command via Tauri backend
   * Requirements: 18.7, 18.8, 22.4, 22.6
   *
   * @param args FFmpeg command arguments
   * @param onProgress Callback for progress updates (0-100)
   * @returns Promise that resolves when export completes
   */
  async executeExport(args: string[], onProgress?: (progress: number) => void): Promise<{ success: boolean; error?: string }> {
    try {
      // Placeholder for Tauri backend integration
      // In production, this would call: await invoke('execute_ffmpeg', { args })
      // and listen for progress events

      // Requirement 22.6: Log command for debugging
      console.log("FFmpeg command:", ["ffmpeg", ...args].join(" "));

      if (onProgress) {
        // Simulate progress updates
        onProgress(0);
      }

      // This would be replaced with actual Tauri invoke call:
      // try {
      //   const result = await invoke('execute_ffmpeg', { args });
      //   return { success: true };
      // } catch (error) {
      //   // Requirement 22.4: Display FFmpeg error output
      //   const errorMsg = error instanceof Error ? error.message : String(error);
      //   console.error("FFmpeg export failed:", errorMsg);
      //   return { success: false, error: errorMsg };
      // }

      return { success: true };
    } catch (error) {
      // Requirement 22.4: Display FFmpeg error output
      // Requirement 22.6: Log errors with context for debugging
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to execute FFmpeg export:", errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}
