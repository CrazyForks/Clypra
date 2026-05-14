import React, { useRef, useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { drawRoundedRect, getThemeAccentRgb } from "@/lib/canvasUtils";

interface TimelineWaveformProps {
  audioPath: string;
  className?: string;
}

const waveformCache = new Map<string, number[]>();

export const TimelineWaveform: React.FC<TimelineWaveformProps> = ({ audioPath, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [themeRevision, setThemeRevision] = useState(0);

  // Watch for theme changes on document element and trigger redraw
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeRevision((r) => r + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => observer.disconnect();
  }, []);

  // Decode audio and generate waveform data
  useEffect(() => {
    const resolvedPath = audioPath.startsWith("asset://") ? audioPath : convertFileSrc(audioPath);

    // Check cache first
    if (waveformCache.has(resolvedPath)) {
      setWaveformData(waveformCache.get(resolvedPath)!);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const generateWaveform = async () => {
      try {
        setIsLoading(true);

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();

        const response = await fetch(resolvedPath);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        if (isCancelled) {
          audioContext.close();
          return;
        }

        const channelData = audioBuffer.getChannelData(0);
        const samples = 400; // High density for smooth waveform
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        // Calculate RMS for each block
        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          const end = start + blockSize;
          let sum = 0;
          for (let j = start; j < end && j < channelData.length; j++) {
            sum += channelData[j] * channelData[j];
          }
          const rms = Math.sqrt(sum / blockSize);
          waveform.push(rms);
        }

        const max = Math.max(...waveform);
        const normalized = waveform.map((v) => (max > 0 ? v / max : 0));

        if (!isCancelled) {
          waveformCache.set(resolvedPath, normalized);
          setWaveformData(normalized);
          setIsLoading(false);
        }

        audioContext.close();
      } catch (error) {
        // Generate fallback pattern
        if (!isCancelled) {
          const fallback = Array.from({ length: 400 }, (_, i) => {
            const seed = Math.sin(i * 0.15) * 0.5 + 0.5;
            return seed * (0.3 + Math.random() * 0.7);
          });
          waveformCache.set(resolvedPath, fallback);
          setWaveformData(fallback);
          setIsLoading(false);
        }
      }
    };

    generateWaveform();

    return () => {
      isCancelled = true;
    };
  }, [audioPath]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Read theme accent color
    const accentRgb = getThemeAccentRgb();

    ctx.clearRect(0, 0, rect.width, rect.height);

    const barCount = waveformData.length;
    const barWidth = rect.width / barCount;
    const barGap = 0.5;
    const actualBarWidth = Math.max(1, barWidth - barGap);

    for (let i = 0; i < barCount; i++) {
      const value = waveformData[i];
      const minHeight = 2;
      const maxHeight = rect.height * 0.92;
      const barHeight = Math.max(minHeight, value * maxHeight);

      const x = i * barWidth + barGap / 2;
      const y = (rect.height - barHeight) / 2;

      ctx.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.85)`;
      drawRoundedRect(ctx, x, y, actualBarWidth, barHeight, 1);
    }
  }, [waveformData, themeRevision]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{
        opacity: isLoading ? 0.3 : 1,
        transition: "opacity 150ms ease",
      }}
    />
  );
};
