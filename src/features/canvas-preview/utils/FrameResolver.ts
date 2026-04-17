/**
 * FrameResolver - Determines which clips are active at any given timeline position
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7
 */

import type { Clip, Track } from "../../timeline/types/core";
import type { ActiveClip } from "../types/core";

/**
 * FrameResolver determines which clips are active at a given timeline position
 * and calculates the correct clip time for each active clip.
 */
export class FrameResolver {
  private clips: Map<string, Clip>;
  private tracks: Map<string, Track>;

  constructor(clips: Map<string, Clip>, tracks: Map<string, Track>) {
    this.clips = clips;
    this.tracks = tracks;
  }

  /**
   * Get all active clips at the specified timeline position
   * Requirements: 2.1, 2.3, 2.4, 2.5, 24.1, 24.2, 24.3, 24.7
   *
   * @param timelineTime - The timeline position in seconds
   * @returns Array of active clips sorted by track order (ascending)
   */
  getActiveClips(timelineTime: number): Omit<ActiveClip, "videoElement">[] {
    const activeClips: Omit<ActiveClip, "videoElement">[] = [];

    // Iterate through all clips
    for (const clip of this.clips.values()) {
      // Check if clip is active at this time
      // Requirement 24.3: clip is active when startTime <= timelineTime < startTime + duration
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;

      if (timelineTime >= clipStart && timelineTime < clipEnd) {
        // Get track info
        const track = this.tracks.get(clip.trackId);

        // Requirement 2.3: Filter out clips on invisible tracks
        if (!track || !track.visible) {
          continue;
        }

        // Requirement 2.2, 14.1: Calculate clip time using formula
        const clipTime = this.calculateClipTime(clip, timelineTime);

        // Create ActiveClip (without videoElement, which will be added by VideoPool)
        const activeClip: Omit<ActiveClip, "videoElement"> = {
          ...clip,
          trackIndex: track.order,
          clipTime,
        };

        activeClips.push(activeClip);
      }
    }

    // Requirement 2.4: Sort by track order (ascending - lower tracks first)
    activeClips.sort((a, b) => a.trackIndex - b.trackIndex);

    return activeClips;
  }

  /**
   * Calculate the clip time (position within source media) for a given timeline time
   * Requirements: 2.2, 2.6, 14.1, 14.2, 14.3, 14.6, 14.7
   *
   * Formula: clipTime = sourceStart + (timelineTime - startTime)
   *
   * @param clip - The clip to calculate time for
   * @param timelineTime - The timeline position in seconds
   * @returns The clip time clamped to source boundaries
   */
  private calculateClipTime(clip: Clip, timelineTime: number): number {
    // Requirement 2.2, 14.1: Calculate offset from clip start
    const offset = timelineTime - clip.startTime;

    // Apply formula: clipTime = sourceStart + offset
    const clipTime = clip.sourceStart + offset;

    // Requirement 2.6, 14.2, 14.3: Clamp to source boundaries
    const clampedTime = Math.max(clip.sourceStart, Math.min(clipTime, clip.sourceEnd));

    // Requirement 14.6: Ensure non-negative
    return Math.max(0, clampedTime);
  }
}
