/**
 * Hook for loading waveform data from Tauri backend
 * Requirements: 10.3, 10.4, 10.7, 16.5, 22.2
 */

import { useEffect, useState, useRef } from "react";
import { getAudioWaveformPeaks } from "../../../lib/tauri";

interface UseWaveformResult {
  peaks: number[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads waveform peaks for an audio/video file
 * Cancels in-progress generation when source changes
 * Requirements: 10.3, 10.4, 10.7, 16.5, 22.2
 */
export function useWaveform(sourceMediaPath: string | null, enabled: boolean = true): UseWaveformResult {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-progress generation (Requirement 16.5)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state when source changes
    setPeaks(null);
    setError(null);

    if (!sourceMediaPath || !enabled) {
      setLoading(false);
      return;
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const loadWaveform = async () => {
      setLoading(true); // Requirement 10.7: Display loading indicator
      setError(null);

      try {
        // Requirement 10.4: Use 1000 sample buckets for waveform generation
        const waveformPeaks = await getAudioWaveformPeaks(sourceMediaPath, 1000);

        // Check if this request was cancelled (Requirement 16.5)
        if (!abortController.signal.aborted) {
          setPeaks(waveformPeaks);
          setLoading(false);
        }
      } catch (err) {
        // Requirement 22.2: Handle generation failures gracefully
        if (!abortController.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : "Failed to generate waveform";
          setError(errorMessage);
          setLoading(false);
          console.warn("Waveform generation failed:", errorMessage);
        }
      }
    };

    loadWaveform();

    // Cleanup function to cancel in-progress generation (Requirement 16.5)
    return () => {
      abortController.abort();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };
  }, [sourceMediaPath, enabled]);

  return { peaks, loading, error };
}
