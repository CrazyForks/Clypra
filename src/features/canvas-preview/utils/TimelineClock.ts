/**
 * TimelineClock - Master time authority for the video engine
 *
 * This is the single source of truth for timeline time.
 * Uses performance.now() as the authoritative time source.
 *
 * CRITICAL: This is NOT driven by RAF deltaTime!
 *
 * Future: Can be extended to sync with AudioContext for audio-driven playback
 */

export class TimelineClock {
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isRunning: boolean = false;

  /**
   * Start the clock from a specific time
   */
  start(fromTime: number = 0): void {
    this.startTime = performance.now() - fromTime * 1000;
    this.pausedTime = 0;
    this.isRunning = true;
  }

  /**
   * Pause the clock and remember current time
   */
  pause(): number {
    if (!this.isRunning) return this.pausedTime;

    this.pausedTime = this.getCurrentTime();
    this.isRunning = false;
    return this.pausedTime;
  }

  /**
   * Resume from paused time
   */
  resume(): void {
    if (this.isRunning) return;

    this.startTime = performance.now() - this.pausedTime * 1000;
    this.isRunning = true;
  }

  /**
   * Seek to a specific time (scrubbing)
   */
  seek(time: number): void {
    this.pausedTime = time;
    if (this.isRunning) {
      this.startTime = performance.now() - time * 1000;
    }
  }

  /**
   * Get current timeline time based on performance.now()
   * This is the authoritative time source
   */
  getCurrentTime(): number {
    // Performance-based time (both scrubbing and playback)
    if (this.isRunning) {
      return (performance.now() - this.startTime) / 1000;
    }

    // Paused
    return this.pausedTime;
  }

  /**
   * Check if clock is running
   */
  isClockRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Reset clock to zero
   */
  reset(): void {
    this.startTime = performance.now();
    this.pausedTime = 0;
    this.isRunning = false;
  }
}
