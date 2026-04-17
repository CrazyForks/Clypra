/**
 * Waveform Component for Timeline Engine v1
 * Renders audio waveform visualization using HTML5 Canvas
 * Requirements: 10.1, 10.2, 10.5, 10.6, 16.2
 */

import { useEffect, useRef } from "react";

export interface WaveformProps {
  peaks: number[] | null;
  width: number;
  height: number;
  className?: string;
}

/**
 * Renders waveform using HTML5 Canvas with high-DPI support
 * Uses requestAnimationFrame for smooth updates
 * Requirements: 10.2, 10.5, 10.6, 16.2
 */
export function Waveform({ peaks, width, height, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    // Cancel any pending animation frame (Requirement 16.2)
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Use requestAnimationFrame for smooth updates (Requirement 16.2)
    rafIdRef.current = requestAnimationFrame(() => {
      // Support high-DPI displays with device pixel ratio scaling (Requirement 10.6)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // If no peaks data, render empty state
      if (!peaks || peaks.length === 0) return;

      // Draw symmetric bars from center line (Requirements: 10.2, 10.5)
      const barWidth = width / peaks.length;
      const centerY = height / 2;

      // Apply emerald color styling (Requirement 10.6)
      ctx.fillStyle = "#10b981"; // emerald-500

      for (let i = 0; i < peaks.length; i++) {
        const barHeight = peaks[i] * centerY;
        const x = i * barWidth;

        // Draw symmetric bars from center (Requirement 10.2)
        ctx.fillRect(x, centerY - barHeight, Math.max(1, barWidth - 1), barHeight * 2);
      }
    });

    // Cleanup: cancel animation frame on unmount or dependency change
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [peaks, width, height]);

  if (width <= 0 || height <= 0) return null;

  return <canvas ref={canvasRef} className={className} aria-label="Audio waveform visualization" />;
}
