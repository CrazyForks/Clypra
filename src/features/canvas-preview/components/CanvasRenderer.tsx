/**
 * CanvasRenderer - Main component that orchestrates the canvas-based video preview system
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 2.1, 2.7, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4
 * Requirements: 13.1, 13.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 * Requirements: 9.1, 9.2, 9.4 (Performance optimizations)
 */

import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { useTimelineStore } from "../../timeline/store/timelineStore";
import { VideoPool } from "../utils/VideoPool";
import { FrameResolver } from "../utils/FrameResolver";
import { SeekManager } from "../utils/SeekManager";
import { RenderEngine } from "../utils/RenderEngine";
import { FrameCache } from "../utils/FrameCache";
import { TimelineClock } from "../utils/TimelineClock";
import type { ActiveClip } from "../types/core";

export interface CanvasRendererProps {
  baseWidth: number;
  baseHeight: number;
  className?: string;
}

/**
 * CanvasRenderer component - Orchestrates multi-clip video preview rendering
 * Integrates with Timeline Engine v1 via Zustand store
 * Requirements: 9.1, 9.2, 9.4 (Performance optimizations with memoization)
 * Wrapped with React.memo to prevent unnecessary re-renders (Requirement 9.4)
 */
const CanvasRendererComponent: React.FC<CanvasRendererProps> = ({ baseWidth, baseHeight, className }) => {
  // State for dynamic canvas dimensions based on video aspect ratio
  const [canvasDimensions, setCanvasDimensions] = useState({ width: baseWidth, height: baseHeight });
  // Refs for stable references (Requirement 11.7)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoPoolRef = useRef<VideoPool | null>(null);
  const frameCacheRef = useRef<FrameCache | null>(null);
  const seekManagerRef = useRef<SeekManager | null>(null);
  const timelineClockRef = useRef<TimelineClock | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastRenderedTimeRef = useRef<number>(0);
  const isRenderingRef = useRef<boolean>(false);
  const pendingRenderAbortRef = useRef<(() => void) | null>(null);
  const lastRenderedFrameRef = useRef<ImageBitmap | null>(null); // Store last rendered frame for seeks (Requirement 17.2)
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioSourcesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());
  const activeClipsRef = useRef<ActiveClip[]>([]);
  const needsAudioStartRef = useRef<boolean>(false);

  // Subscribe to Timeline Engine v1 state with shallow comparison for performance (Requirements 15.1, 15.2, 15.3, 15.4, 15.5)
  const clips = useTimelineStore((state) => state.clips);
  const tracks = useTimelineStore((state) => state.tracks);
  const playhead = useTimelineStore((state) => state.playhead);
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const duration = useTimelineStore((state) => state.duration);

  // Memoize FrameResolver instance to avoid recreating on every render (Requirement 9.1, 9.4)
  const frameResolver = useMemo(() => {
    return new FrameResolver(clips, tracks);
  }, [clips, tracks]);

  // Detect video aspect ratio and update canvas dimensions (CapCut-style adaptive preview)
  useEffect(() => {
    if (clips.size === 0) {
      setCanvasDimensions({ width: baseWidth, height: baseHeight });
      return;
    }

    const firstClip = Array.from(clips.values()).find((clip) => clip.type === "video");
    if (!firstClip || !videoPoolRef.current) {
      return;
    }

    const detectAspectRatio = async () => {
      if (!firstClip) return; // TypeScript guard

      try {
        const video = await videoPoolRef.current!.getVideo(firstClip.sourceMediaPath);

        // Wait for metadata if not ready
        if (!video.videoWidth || !video.videoHeight) {
          await new Promise<void>((resolve, reject) => {
            const onLoaded = () => {
              video.removeEventListener("loadedmetadata", onLoaded);
              video.removeEventListener("error", onError);
              resolve();
            };
            const onError = () => {
              video.removeEventListener("loadedmetadata", onLoaded);
              video.removeEventListener("error", onError);
              reject(new Error("Video load error"));
            };
            video.addEventListener("loadedmetadata", onLoaded);
            video.addEventListener("error", onError);
            // Timeout after 5 seconds
            setTimeout(() => {
              video.removeEventListener("loadedmetadata", onLoaded);
              video.removeEventListener("error", onError);
              reject(new Error("Timeout waiting for video metadata"));
            }, 5000);
          });
        }

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (videoWidth && videoHeight && videoWidth > 0 && videoHeight > 0) {
          const videoAspect = videoWidth / videoHeight;
          const baseAspect = baseWidth / baseHeight;

          let newWidth: number;
          let newHeight: number;

          if (videoAspect > baseAspect) {
            newWidth = baseWidth;
            newHeight = Math.round(baseWidth / videoAspect);
          } else {
            newHeight = baseHeight;
            newWidth = Math.round(baseHeight * videoAspect);
          }

          // Ensure dimensions are valid
          newWidth = Math.max(100, newWidth);
          newHeight = Math.max(100, newHeight);

          // Only update if dimensions actually changed (prevents unnecessary remounts)
          setCanvasDimensions((prev) => {
            if (prev.width === newWidth && prev.height === newHeight) {
              return prev; // No change, return same object to prevent re-render
            }
            return { width: newWidth, height: newHeight };
          });
        }
      } catch (error) {
        console.warn("Aspect ratio detection failed, using base dimensions:", error);
      }
    };

    detectAspectRatio();
  }, [clips, baseWidth, baseHeight]);

  // Initialize canvas and resources (Requirements 11.1, 11.2, 11.3, 19.1, 19.2, 19.3, 19.4)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvasDimensions;

    // Setup canvas with high-DPI support (Requirements 19.1, 19.2, 19.3, 19.4)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // Let CSS handle the display size via the className
    canvas.style.width = "";
    canvas.style.height = "";

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get 2D context");
      return;
    }

    // Scale context by device pixel ratio (Requirement 19.4)
    ctx.scale(dpr, dpr);
    contextRef.current = ctx;

    // Initialize subsystems (Requirements 11.4, 15.5)
    videoPoolRef.current = new VideoPool(10); // Max 10 videos
    frameCacheRef.current = new FrameCache(100); // Max 100 frames
    seekManagerRef.current = new SeekManager();
    timelineClockRef.current = new TimelineClock();

    // Initialize Web Audio API for audio playback
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log("[AUDIO] AudioContext initialized");
    } catch (error) {
      console.error("[AUDIO] Failed to initialize AudioContext:", error);
    }

    // Handle canvas context loss (Requirement 10.5)
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.error("Canvas context lost");
    };

    const handleContextRestored = () => {
      console.log("Canvas context restored");
      const newCtx = canvas.getContext("2d");
      if (newCtx) {
        newCtx.scale(dpr, dpr);
        contextRef.current = newCtx;
        // Re-render current frame
        if (!isPlaying) {
          renderFrame(playhead);
        }
      }
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    // Cleanup on unmount (Requirements 11.4, 11.5, 11.6)
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      videoPoolRef.current?.dispose();
      frameCacheRef.current?.dispose();
      seekManagerRef.current?.dispose();

      // Clean up audio context and elements
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clean up audio elements
      audioElementsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current.clear();
      audioSourcesRef.current.clear();

      // Clean up last rendered frame
      if (lastRenderedFrameRef.current) {
        lastRenderedFrameRef.current.close();
        lastRenderedFrameRef.current = null;
      }
    };
  }, [canvasDimensions]);

  // Invalidate frame cache when clips/tracks change (Requirements 6.6, 13.5, 15.6)
  useEffect(() => {
    if (frameCacheRef.current) {
      frameCacheRef.current.updateStateHash(clips, tracks);
      frameCacheRef.current.invalidate();
    }

    // Re-render current frame if not playing
    if (!isPlaying) {
      renderFrame(playhead);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, tracks]);

  // Handle playhead changes (scrubbing) (Requirements 6.1, 6.2, 6.3, 6.4)
  useEffect(() => {
    if (!isPlaying) {
      renderFrame(playhead);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playhead, isPlaying]);

  // Handle playback state (Requirements 16.1, 16.2, 16.3, 16.4, 16.5, 16.6)
  useEffect(() => {
    console.log("[CANVAS] isPlaying changed to:", isPlaying);

    // Set playback mode on SeekManager
    if (seekManagerRef.current) {
      seekManagerRef.current.setPlaybackMode(isPlaying);
    }

    if (isPlaying) {
      // Set flag to start audio once we have clips in renderFrame
      needsAudioStartRef.current = true;
      startRAFLoop();
    } else {
      needsAudioStartRef.current = false;
      stopRAFLoop();
      // Stop audio playback
      if (activeClipsRef.current.length > 0) {
        stopAudioPlayback(activeClipsRef.current);
      }
    }

    return () => {
      needsAudioStartRef.current = false;
      stopRAFLoop();
      if (activeClipsRef.current.length > 0) {
        stopAudioPlayback(activeClipsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  /**
   * Setup separate audio element for a clip
   * CRITICAL: Audio elements are SEPARATE from video elements used for frames
   * Video elements stay PAUSED at all times
   */
  const setupAudioElement = (sourceMediaPath: string): HTMLAudioElement | null => {
    if (!audioContextRef.current) {
      return null;
    }

    // Check if we already have an audio element for this source
    let audioElement = audioElementsRef.current.get(sourceMediaPath);

    if (!audioElement) {
      try {
        // Create separate audio element (NOT the video element!)
        audioElement = new Audio(sourceMediaPath);
        audioElement.preload = "auto";

        // Create audio source node
        const audioSource = audioContextRef.current.createMediaElementSource(audioElement);
        audioSource.connect(audioContextRef.current.destination);

        // Cache both
        audioElementsRef.current.set(sourceMediaPath, audioElement);
        audioSourcesRef.current.set(sourceMediaPath, audioSource);

        console.log("[AUDIO] Created separate audio element for:", sourceMediaPath);
      } catch (error) {
        console.warn("[AUDIO] Failed to create audio element:", {
          src: sourceMediaPath,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    }

    return audioElement;
  };

  /**
   * Start audio playback for active clips
   * Uses SEPARATE audio elements, NOT the video elements
   *
   * CRITICAL: Video elements MUST stay paused at all times!
   */
  const startAudioPlayback = async (clips: ActiveClip[]) => {
    if (!audioContextRef.current) {
      console.error("[AUDIO] No AudioContext available");
      return;
    }

    if (clips.length === 0) {
      console.warn("[AUDIO] No clips provided to play audio for");
      return;
    }

    console.log("[AUDIO] Starting audio playback for", clips.length, "clips");

    // Resume audio context if suspended
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
      console.log("[AUDIO] Resumed AudioContext, state:", audioContextRef.current.state);
    }

    // Start audio for each clip
    for (const clip of clips) {
      // CRITICAL: Ensure video element is PAUSED
      if (!clip.videoElement.paused) {
        console.warn("[AUDIO] Video element was playing! Pausing it now:", clip.id);
        clip.videoElement.pause();
      }

      const audioElement = setupAudioElement(clip.sourceMediaPath);

      if (audioElement) {
        try {
          // Seek audio to correct position
          audioElement.currentTime = clip.clipTime;

          // Play the AUDIO element (NOT the video element!)
          await audioElement.play();
          console.log("[AUDIO] ✅ Started audio for clip:", {
            clipId: clip.id,
            audioTime: audioElement.currentTime,
            audioPlaying: !audioElement.paused,
            audioVolume: audioElement.volume,
            audioMuted: audioElement.muted,
            videoTime: clip.videoElement.currentTime,
            videoIsPaused: clip.videoElement.paused,
          });
        } catch (error) {
          console.error("[AUDIO] ❌ Failed to start audio:", {
            clipId: clip.id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      } else {
        console.error("[AUDIO] ❌ Failed to setup audio element for clip:", clip.id);
      }
    }
  };

  /**
   * Stop audio playback
   * Pauses separate audio elements
   */
  const stopAudioPlayback = (clips: ActiveClip[]) => {
    // Suspend audio context to save resources
    if (audioContextRef.current?.state === "running") {
      audioContextRef.current.suspend();
      console.log("[AUDIO] Suspended AudioContext");
    }

    // Pause all audio elements
    for (const clip of clips) {
      const audioElement = audioElementsRef.current.get(clip.sourceMediaPath);
      if (audioElement && !audioElement.paused) {
        audioElement.pause();
        console.log("[AUDIO] Paused audio for clip:", clip.id);
      }
    }
  };

  /**
   * Start RAF loop for playback
   * Requirements: 5.1, 5.2, 5.3, 5.4, 9.2, 9.3
   *
   * CRITICAL: RAF is ONLY for rendering, NOT for time authority
   * Timeline Clock uses performance.now() as authority
   */
  const startRAFLoop = () => {
    console.log("[RAF] Starting loop");
    // Cancel any pending RAF before starting new loop (Requirement 9.3)
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Start the timeline clock (uses performance.now())
    if (timelineClockRef.current) {
      timelineClockRef.current.start(playhead);
    }

    const loop = () => {
      // Get authoritative time from Timeline Clock (performance.now() based)
      const currentTime = timelineClockRef.current?.getCurrentTime() ?? playhead;

      // Update store with current time
      useTimelineStore.getState().setPlayhead(currentTime);

      // Render frame at current time (seeks video elements for frames)
      renderFrame(currentTime);

      // Sync audio elements to timeline time
      syncAudioToTimeline(currentTime);

      // Stop if we reached the end
      const maxTime = useTimelineStore.getState().duration;
      if (currentTime >= maxTime) {
        console.log("[RAF] Reached end of timeline, stopping");
        useTimelineStore.getState().setIsPlaying(false);
        return;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  };

  /**
   * Sync audio playback to timeline time
   * Adjusts audio element playback rate to match timeline
   *
   * CRITICAL: Also ensures video elements stay PAUSED
   */
  const syncAudioToTimeline = (timelineTime: number) => {
    const SYNC_THRESHOLD = 0.1; // 100ms tolerance

    for (const clip of activeClipsRef.current) {
      // CRITICAL: Ensure video element stays PAUSED
      if (!clip.videoElement.paused) {
        console.error("[SYNC] Video element is playing! This should NEVER happen. Pausing:", clip.id);
        clip.videoElement.pause();
      }

      const audioElement = audioElementsRef.current.get(clip.sourceMediaPath);

      if (audioElement && !audioElement.paused) {
        // Calculate expected audio time for this clip
        // CRITICAL: clip.clipTime already accounts for the offset, don't add it twice!
        const expectedAudioTime = clip.clipTime;
        const actualAudioTime = audioElement.currentTime;
        const drift = actualAudioTime - expectedAudioTime;

        // If drift exceeds threshold, seek audio
        if (Math.abs(drift) > SYNC_THRESHOLD) {
          console.log("[AUDIO] Correcting drift:", {
            clipId: clip.id,
            drift: drift.toFixed(3),
            expectedTime: expectedAudioTime.toFixed(3),
            actualTime: actualAudioTime.toFixed(3),
            timelineTime: timelineTime.toFixed(3),
          });
          audioElement.currentTime = expectedAudioTime;
        }
      }
    }
  };

  /**
   * Stop RAF loop
   * Requirement: 5.5
   */
  const stopRAFLoop = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Pause the timeline clock
    if (timelineClockRef.current) {
      const pausedTime = timelineClockRef.current.pause();
      useTimelineStore.getState().setPlayhead(pausedTime);
    }
  };

  /**
   * Render a frame at the specified timeline time
   * Requirements: 2.1, 2.7, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4, 13.1, 13.2, 10.1, 10.2, 10.3, 10.4
   * Requirements: 6.5, 6.7, 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 9.1, 9.2, 9.3, 9.4
   * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7 (Loading states)
   */
  const renderFrame = useCallback(
    async (timelineTime: number) => {
      if (!contextRef.current || !videoPoolRef.current || !frameCacheRef.current || !seekManagerRef.current) {
        return;
      }

      // Cancel pending render operation (Requirement 9.3)
      if (pendingRenderAbortRef.current) {
        pendingRenderAbortRef.current();
        pendingRenderAbortRef.current = null;
      }

      // Track render state (Requirement 9.4)
      if (isRenderingRef.current) {
        // A render is already in progress, it will be cancelled by the abort signal
        console.debug("Cancelling in-progress render for new request");
      }

      isRenderingRef.current = true;

      // Create abort signal for this render operation
      let aborted = false;
      pendingRenderAbortRef.current = () => {
        aborted = true;
      };

      const ctx = contextRef.current;
      const videoPool = videoPoolRef.current;
      const frameCache = frameCacheRef.current;
      const seekManager = seekManagerRef.current;
      const renderEngine = new RenderEngine(ctx, canvasDimensions.width, canvasDimensions.height);

      // Clamp timeline time to [0, timeline.duration] (Requirement 6.7)
      const clampedTimelineTime = Math.max(0, Math.min(timelineTime, duration));

      try {
        // Resolve active clips first to see if we have any work to do
        const activeClipsWithoutVideo = frameResolver.getActiveClips(clampedTimelineTime);

        // Check if VideoPool is initializing AND we have no clips (Requirement 17.5)
        // If we have clips, we should try to load them even if pool is initializing
        if (videoPool.isInitializingPool() && activeClipsWithoutVideo.length === 0) {
          renderEngine.drawInitializingMessage();
          isRenderingRef.current = false;
          pendingRenderAbortRef.current = null;
          return;
        }

        // Check if render was cancelled
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        // Check if any videos are seeking (Requirements 17.1, 17.2, 17.7)
        const hasSeekingVideos = seekManager.hasSeekingVideos();

        // If videos are seeking, display last rendered frame (Requirement 17.2)
        if (hasSeekingVideos && lastRenderedFrameRef.current) {
          ctx.drawImage(lastRenderedFrameRef.current, 0, 0, canvasDimensions.width, canvasDimensions.height);
          // Draw loading indicator overlay (Requirement 17.2)
          renderEngine.drawLoadingIndicator("Seeking...");
          isRenderingRef.current = false;
          pendingRenderAbortRef.current = null;
          return;
        }

        // Note: Don't return early for hasLoadingVideos since metadata loading is now fast
        // and the actual video loading is handled later in the render pipeline

        // Check frame cache first (Requirements 13.1, 13.2)
        // SKIP cache during playback to ensure fresh frames every tick
        const isPlayingNow = useTimelineStore.getState().isPlaying;
        const cachedFrame = !isPlayingNow ? frameCache.get(clampedTimelineTime) : null;

        if (cachedFrame) {
          // Check if render was cancelled before drawing
          if (aborted) {
            isRenderingRef.current = false;
            return;
          }

          ctx.drawImage(cachedFrame.bitmap, 0, 0, canvasDimensions.width, canvasDimensions.height);

          // Store as last rendered frame (Requirement 17.2)
          if (lastRenderedFrameRef.current) {
            lastRenderedFrameRef.current.close();
          }
          lastRenderedFrameRef.current = await createImageBitmap(canvasRef.current!);

          // Track frame accuracy for cached frames (Requirements 6.5, 23.1, 23.6)
          const frameAccuracy = Math.abs(clampedTimelineTime - lastRenderedTimeRef.current);
          lastRenderedTimeRef.current = clampedTimelineTime;

          // Log warning if accuracy exceeds 0.033 seconds (1 frame at 30 FPS) (Requirements 23.1, 23.2, 23.3, 23.7)
          if (frameAccuracy > 0.033) {
            console.warn("Frame accuracy drift detected:", {
              targetTime: clampedTimelineTime,
              lastRenderedTime: lastRenderedTimeRef.current,
              accuracy: frameAccuracy,
              threshold: 0.033,
            });
          }

          isRenderingRef.current = false;
          pendingRenderAbortRef.current = null;
          return;
        }

        // Check if render was cancelled
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        if (activeClipsWithoutVideo.length === 0) {
          // Check if render was cancelled before clearing canvas
          if (aborted) {
            isRenderingRef.current = false;
            return;
          }

          // Display "No clips at this position" message (Requirement 17.4)
          renderEngine.drawNoClipsMessage();

          // Store as last rendered frame (Requirement 17.2)
          if (lastRenderedFrameRef.current) {
            lastRenderedFrameRef.current.close();
          }
          lastRenderedFrameRef.current = await createImageBitmap(canvasRef.current!);

          isRenderingRef.current = false;
          pendingRenderAbortRef.current = null;
          return;
        }

        // Validate clip data before processing (Requirement 10.4)
        const validClips = activeClipsWithoutVideo.filter((clip) => {
          if (!clip.id || !clip.sourceMediaPath || clip.duration <= 0) {
            console.warn("Invalid clip data, skipping:", {
              clipId: clip.id,
              sourcePath: clip.sourceMediaPath,
              duration: clip.duration,
            });
            return false;
          }
          return true;
        });

        if (validClips.length === 0) {
          // Check if render was cancelled
          if (aborted) {
            isRenderingRef.current = false;
            return;
          }

          // All clips invalid, display message
          renderEngine.drawNoClipsMessage();

          // Store as last rendered frame (Requirement 17.2)
          if (lastRenderedFrameRef.current) {
            lastRenderedFrameRef.current.close();
          }
          lastRenderedFrameRef.current = await createImageBitmap(canvasRef.current!);

          isRenderingRef.current = false;
          pendingRenderAbortRef.current = null;
          return;
        }

        // Check if render was cancelled before loading videos
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        // Get video elements from pool (Requirement 2.1)
        const clipsWithVideos = await Promise.all(
          validClips.map(async (clip) => {
            try {
              const video = await videoPool.getVideo(clip.sourceMediaPath);
              return { ...clip, videoElement: video } as ActiveClip;
            } catch (error) {
              // Video load failed, display error message (Requirements 10.1, 17.6)
              console.error("Failed to load video for clip:", {
                clipId: clip.id,
                sourcePath: clip.sourceMediaPath,
                error: error instanceof Error ? error.message : "Unknown error",
              });

              // Extract file name from path for error display (Requirement 17.6)
              const fileName = clip.sourceMediaPath.split("/").pop() || clip.sourceMediaPath;

              // Display error message on canvas
              renderEngine.drawVideoLoadError(fileName);

              return null;
            }
          }),
        );

        // Check if render was cancelled after loading videos
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        // Filter out failed video loads
        const successfulClips = clipsWithVideos.filter((clip): clip is ActiveClip => clip !== null);

        if (successfulClips.length === 0) {
          // Check if render was cancelled
          if (aborted) {
            isRenderingRef.current = false;
            return;
          }

          // All videos failed to load, error already displayed
          isRenderingRef.current = false;
          pendingRenderAbortRef.current = null;
          return;
        }

        // Update active clips ref for audio management
        activeClipsRef.current = successfulClips;

        // Start audio if needed (first frame after play button pressed)
        if (needsAudioStartRef.current && successfulClips.length > 0) {
          needsAudioStartRef.current = false; // Only start once
          console.log("[AUDIO] Starting audio from renderFrame with", successfulClips.length, "clips");
          startAudioPlayback(successfulClips).catch((error) => {
            console.error("[AUDIO] Failed to start audio:", error);
          });
        }

        // Cancel pending seeks on new seek request (Requirement 9.4)
        for (const clip of successfulClips) {
          seekManager.cancelPendingSeeks(clip.videoElement);
        }

        // Check if render was cancelled before seeking
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        // Seek videos to correct positions (Requirement 6.3)
        await Promise.all(successfulClips.map((clip) => seekManager.seekIfNeeded(clip.videoElement, clip.clipTime)));

        // Check if render was cancelled after seeking
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        // Render composite frame (Requirements 4.1, 4.2)
        renderEngine.renderFrame(successfulClips);

        // Track frame accuracy after rendering (Requirements 6.5, 23.1, 23.2, 23.4, 23.5, 23.6)
        const frameAccuracy = Math.abs(clampedTimelineTime - lastRenderedTimeRef.current);
        lastRenderedTimeRef.current = clampedTimelineTime;

        // Verify frame accuracy using video currentTime (Requirements 23.2, 23.3, 23.4)
        for (const clip of successfulClips) {
          const videoTimeAccuracy = Math.abs(clip.videoElement.currentTime - clip.clipTime);

          // Log warning if video time differs from target by more than 0.033 seconds (Requirements 23.1, 23.3, 23.7)
          if (videoTimeAccuracy > 0.033) {
            console.warn("Video seek accuracy issue:", {
              clipId: clip.id,
              targetClipTime: clip.clipTime,
              actualVideoTime: clip.videoElement.currentTime,
              accuracy: videoTimeAccuracy,
              threshold: 0.033,
            });
          }
        }

        // Log warning if frame accuracy exceeds threshold (Requirements 23.1, 23.2, 23.3, 23.7)
        if (frameAccuracy > 0.033) {
          console.warn("Frame accuracy drift detected:", {
            targetTime: clampedTimelineTime,
            lastRenderedTime: lastRenderedTimeRef.current - frameAccuracy,
            accuracy: frameAccuracy,
            threshold: 0.033,
          });
        }

        // Check if render was cancelled before caching
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        // Cache the rendered frame (Requirements 13.1, 13.2)
        // Skip caching during playback to save memory and CPU
        if (!isPlayingNow) {
          const bitmap = await createImageBitmap(canvasRef.current!);
          frameCache.set(clampedTimelineTime, bitmap);
        }

        // Store as last rendered frame (Requirement 17.2)
        if (lastRenderedFrameRef.current) {
          lastRenderedFrameRef.current.close();
        }
        lastRenderedFrameRef.current = await createImageBitmap(canvasRef.current!);

        isRenderingRef.current = false;
        pendingRenderAbortRef.current = null;
      } catch (error) {
        // Display error message for render failures (Requirement 10.4)
        console.error("Failed to render frame:", {
          timelineTime: clampedTimelineTime,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Check if render was cancelled
        if (aborted) {
          isRenderingRef.current = false;
          return;
        }

        // Display error state (only if context is available)
        if (ctx && ctx.fillText) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
          ctx.fillStyle = "#ff0000";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Render error", canvasDimensions.width / 2, canvasDimensions.height / 2);
        }

        isRenderingRef.current = false;
        pendingRenderAbortRef.current = null;
      }
    },
    [frameResolver, canvasDimensions, duration],
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: `${canvasDimensions.width}/${canvasDimensions.height}`,
        }}
        data-testid="canvas-renderer"
      />
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders (Requirement 9.4)
export const CanvasRenderer = React.memo(CanvasRendererComponent);
