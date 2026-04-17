# Design Document: Timeline Engine v1

## Overview

The Timeline Engine is a professional-grade video editing timeline system built with React, TypeScript, and Zustand. It provides frame-accurate editing capabilities with a coordinate-based rendering system similar to CapCut and Adobe Premiere Pro.

### Core Architecture

The system is organized into five major subsystems:

1. **State Management Layer** - Zustand store managing timeline state, clips, tracks, and history
2. **Coordinate System** - Bidirectional time ↔ pixel conversion with zoom support
3. **Rendering Layer** - React components for timeline visualization (ruler, tracks, clips, playhead)
4. **Interaction Layer** - Event handlers for drag, trim, split, and selection operations
5. **Export Pipeline** - FFmpeg command generation from timeline state

### Technology Stack

- **State Management**: Zustand (lightweight, TypeScript-friendly)
- **UI Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **Canvas Rendering**: Native HTML5 Canvas for waveforms
- **Backend**: Tauri (Rust) for FFmpeg integration and file operations
- **Testing**: Vitest + fast-check for property-based testing

## Architecture

### High-Level Component Structure

```
TimelineContainer
├── TimelineToolbar (zoom, snap controls)
├── TimelineContent
│   ├── TimelineTrackHeaders (sticky left column)
│   └── TimelineScrollArea
│       ├── TimeRuler (sticky top row)
│       ├── TrackLanes
│       │   ├── Track (video/audio/text)
│       │   │   ├── Clip
│       │   │   │   ├── Filmstrip (canvas)
│       │   │   │   ├── Waveform (canvas)
│       │   │   │   └── TrimHandles
│       │   │   └── ...more clips
│       │   └── ...more tracks
│       └── Playhead (absolute positioned overlay)
└── TimelineStatusBar (selection info, timecode)
```

### State Management Architecture

The timeline uses Zustand for centralized state management with the following store structure:

```typescript
interface TimelineState {
  // Core timeline data
  clips: Map<string, Clip>;
  tracks: Map<string, Track>;

  // Playback and view state
  playhead: number;
  duration: number;
  pxPerSec: number;
  scrollLeft: number;
  scrollTop: number;

  // Selection and interaction
  selectedClipIds: Set<string>;
  dragState: DragState | null;
  trimState: TrimState | null;

  // Snap settings
  snapToPlayhead: boolean;
  snapToClips: boolean;
  snapToMarkers: boolean;

  // History for undo/redo
  history: TimelineSnapshot[];
  historyIndex: number;

  // Actions
  addClip: (clip: Clip) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  deleteClip: (id: string) => void;
  moveClip: (id: string, startTime: number, trackId: string) => void;
  trimClip: (id: string, startTime: number, duration: number) => void;
  splitClip: (id: string, splitTime: number) => void;

  setPlayhead: (time: number) => void;
  setZoom: (pxPerSec: number) => void;
  setScroll: (left: number, top: number) => void;

  selectClip: (id: string, multi: boolean) => void;
  deselectAll: () => void;

  undo: () => void;
  redo: () => void;

  // Serialization
  toJSON: () => TimelineJSON;
  fromJSON: (json: TimelineJSON) => void;
}
```

### Data Models

#### Clip Model

```typescript
interface Clip {
  id: string;
  trackId: string;
  startTime: number; // Timeline position in seconds
  duration: number; // Clip length in seconds
  sourceMediaPath: string; // Path to source video/audio file
  sourceStart: number; // Trim start in source media
  sourceEnd: number; // Trim end in source media
  type: "video" | "audio" | "text";

  // Visual assets (generated asynchronously)
  filmstripUrl: string | null;
  waveformPeaks: number[] | null;

  // Metadata
  name: string;
  locked: boolean;
  muted: boolean;
}
```

#### Track Model

```typescript
interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "text" | "effects";
  order: number; // Vertical stacking order (higher = on top)
  height: number; // Track height in pixels
  locked: boolean; // Prevent editing
  visible: boolean; // Show/hide in preview
  muted: boolean; // Mute audio
  color: string; // Track color for visual identification
}
```

#### Drag State

```typescript
interface DragState {
  clipIds: string[]; // Clips being dragged (supports multi-select)
  startX: number; // Initial pointer X
  startTimes: Map<string, number>; // Original clip start times
  currentOffset: number; // Current time offset from original
  snapTarget: SnapTarget | null;
}
```

#### Trim State

```typescript
interface TrimState {
  clipId: string;
  edge: "start" | "end";
  originalStartTime: number;
  originalDuration: number;
  currentTime: number;
  snapTarget: SnapTarget | null;
}
```

#### Snap Target

```typescript
interface SnapTarget {
  time: number;
  type: "playhead" | "clip-start" | "clip-end" | "marker";
  sourceId?: string; // ID of clip or marker
}
```

## Components and Interfaces

### Coordinate System Implementation

The coordinate system is the foundation of the timeline, providing bidirectional conversion between time and pixels.

```typescript
class CoordinateSystem {
  constructor(private pxPerSec: number) {}

  // Core conversion functions
  timeToPixels(time: number): number {
    return time * this.pxPerSec;
  }

  pixelsToTime(pixels: number): number {
    return pixels / this.pxPerSec;
  }

  // Zoom with cursor stability
  zoomToCursor(cursorX: number, scrollLeft: number, zoomFactor: number, minZoom: number, maxZoom: number): { newPxPerSec: number; newScrollLeft: number } {
    const timeUnderCursor = this.pixelsToTime(scrollLeft + cursorX);
    const newPxPerSec = clamp(this.pxPerSec * zoomFactor, minZoom, maxZoom);
    const newScrollLeft = timeUnderCursor * newPxPerSec - cursorX;

    return { newPxPerSec, newScrollLeft: Math.max(0, newScrollLeft) };
  }

  // Frame quantization
  quantizeToFrame(time: number, fps: number): number {
    const frameNumber = Math.round(time * fps);
    return frameNumber / fps;
  }

  // Ruler tick calculation
  calculateMajorTickInterval(): number {
    if (this.pxPerSec >= 100) return 1;
    if (this.pxPerSec >= 48) return 2;
    if (this.pxPerSec >= 24) return 5;
    return 10;
  }
}
```

### Snap System Design

The snap system detects nearby snap targets and provides magnetic alignment.

```typescript
class SnapSystem {
  private readonly SNAP_THRESHOLD = 8; // pixels

  constructor(
    private coords: CoordinateSystem,
    private enabled: {
      playhead: boolean;
      clips: boolean;
      markers: boolean;
    },
  ) {}

  findSnapTarget(time: number, clips: Clip[], playhead: number, markers: number[]): SnapTarget | null {
    const candidates: SnapTarget[] = [];
    const pixelPos = this.coords.timeToPixels(time);

    // Check playhead
    if (this.enabled.playhead) {
      const playheadPx = this.coords.timeToPixels(playhead);
      if (Math.abs(pixelPos - playheadPx) <= this.SNAP_THRESHOLD) {
        candidates.push({ time: playhead, type: "playhead" });
      }
    }

    // Check clip edges
    if (this.enabled.clips) {
      for (const clip of clips) {
        const startPx = this.coords.timeToPixels(clip.startTime);
        const endPx = this.coords.timeToPixels(clip.startTime + clip.duration);

        if (Math.abs(pixelPos - startPx) <= this.SNAP_THRESHOLD) {
          candidates.push({
            time: clip.startTime,
            type: "clip-start",
            sourceId: clip.id,
          });
        }

        if (Math.abs(pixelPos - endPx) <= this.SNAP_THRESHOLD) {
          candidates.push({
            time: clip.startTime + clip.duration,
            type: "clip-end",
            sourceId: clip.id,
          });
        }
      }
    }

    // Check markers
    if (this.enabled.markers) {
      for (const markerTime of markers) {
        const markerPx = this.coords.timeToPixels(markerTime);
        if (Math.abs(pixelPos - markerPx) <= this.SNAP_THRESHOLD) {
          candidates.push({ time: markerTime, type: "marker" });
        }
      }
    }

    // Return closest candidate
    if (candidates.length === 0) return null;

    return candidates.reduce((closest, candidate) => {
      const closestDist = Math.abs(time - closest.time);
      const candidateDist = Math.abs(time - candidate.time);
      return candidateDist < closestDist ? candidate : closest;
    });
  }
}
```

### Clip Interaction Handlers

```typescript
// Drag handler
function useClipDrag(clipId: string, coords: CoordinateSystem, snapSystem: SnapSystem) {
  const store = useTimelineStore();

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    const clip = store.clips.get(clipId);
    if (!clip || clip.locked) return;

    const selectedIds = store.selectedClipIds.has(clipId) ? Array.from(store.selectedClipIds) : [clipId];

    const startTimes = new Map(selectedIds.map((id) => [id, store.clips.get(id)!.startTime]));

    store.setDragState({
      clipIds: selectedIds,
      startX: e.clientX,
      startTimes,
      currentOffset: 0,
      snapTarget: null,
    });

    const handleMove = (e: PointerEvent) => {
      const deltaX = e.clientX - store.dragState!.startX;
      const deltaTime = coords.pixelsToTime(deltaX);

      // Calculate new time with snap
      const primaryClip = store.clips.get(selectedIds[0])!;
      const newTime = primaryClip.startTime + deltaTime;
      const snapTarget = snapSystem.findSnapTarget(newTime, Array.from(store.clips.values()), store.playhead, []);

      const snappedTime = snapTarget ? snapTarget.time : newTime;
      const finalOffset = snappedTime - primaryClip.startTime;

      store.setDragState({
        ...store.dragState!,
        currentOffset: finalOffset,
        snapTarget,
      });
    };

    const handleUp = () => {
      // Commit the drag
      const offset = store.dragState!.currentOffset;
      for (const id of selectedIds) {
        const originalTime = startTimes.get(id)!;
        store.moveClip(id, Math.max(0, originalTime + offset), clip.trackId);
      }

      store.setDragState(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return { handlePointerDown };
}
```

### Trim Handler

```typescript
function useClipTrim(clipId: string, edge: "start" | "end", coords: CoordinateSystem, snapSystem: SnapSystem) {
  const store = useTimelineStore();

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // Prevent drag

    const clip = store.clips.get(clipId);
    if (!clip || clip.locked) return;

    store.setTrimState({
      clipId,
      edge,
      originalStartTime: clip.startTime,
      originalDuration: clip.duration,
      currentTime: edge === "start" ? clip.startTime : clip.startTime + clip.duration,
      snapTarget: null,
    });

    const handleMove = (e: PointerEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + store.scrollLeft;
      const time = coords.pixelsToTime(x);

      const snapTarget = snapSystem.findSnapTarget(time, Array.from(store.clips.values()), store.playhead, []);

      const snappedTime = snapTarget ? snapTarget.time : time;

      // Validate trim constraints
      const clip = store.clips.get(clipId)!;
      const MIN_DURATION = 0.1;

      let finalTime = snappedTime;
      if (edge === "start") {
        finalTime = clamp(snappedTime, 0, clip.startTime + clip.duration - MIN_DURATION);
      } else {
        finalTime = clamp(snappedTime, clip.startTime + MIN_DURATION, store.duration);
      }

      store.setTrimState({
        ...store.trimState!,
        currentTime: finalTime,
        snapTarget,
      });
    };

    const handleUp = () => {
      const trimState = store.trimState!;
      const clip = store.clips.get(clipId)!;

      if (edge === "start") {
        const newDuration = clip.duration + (clip.startTime - trimState.currentTime);
        store.trimClip(clipId, trimState.currentTime, newDuration);
      } else {
        const newDuration = trimState.currentTime - clip.startTime;
        store.trimClip(clipId, clip.startTime, newDuration);
      }

      store.setTrimState(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return { handlePointerDown };
}
```

### Performance Optimizations

#### Virtualization Strategy

For timelines with many clips, we use viewport-based virtualization:

```typescript
function useVisibleClips(clips: Clip[], scrollLeft: number, viewportWidth: number, coords: CoordinateSystem) {
  return useMemo(() => {
    const startTime = coords.pixelsToTime(scrollLeft);
    const endTime = coords.pixelsToTime(scrollLeft + viewportWidth);

    // Add buffer for smooth scrolling
    const buffer = 2; // seconds

    return clips.filter((clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd >= startTime - buffer && clip.startTime <= endTime + buffer;
    });
  }, [clips, scrollLeft, viewportWidth, coords]);
}
```

#### Canvas Rendering for Waveforms

Waveforms are rendered using HTML5 Canvas for performance:

```typescript
function renderWaveform(canvas: HTMLCanvasElement, peaks: number[], width: number, height: number) {
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;

  // Scale for high-DPI displays
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Draw waveform
  const barWidth = width / peaks.length;
  const centerY = height / 2;

  ctx.fillStyle = "#10b981"; // emerald-500

  for (let i = 0; i < peaks.length; i++) {
    const barHeight = peaks[i] * centerY;
    const x = i * barWidth;

    // Draw symmetric bars from center
    ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2);
  }
}
```

#### Memoization Patterns

```typescript
// Memoize ruler ticks
const rulerTicks = useMemo(() => {
  const interval = coords.calculateMajorTickInterval();
  const ticks: number[] = [];

  for (let t = 0; t <= duration; t += interval) {
    ticks.push(t);
  }

  return ticks;
}, [duration, coords.pxPerSec]);

// Memoize clip positions
const clipPositions = useMemo(() => {
  return new Map(
    Array.from(clips.values()).map((clip) => [
      clip.id,
      {
        x: coords.timeToPixels(clip.startTime),
        width: coords.timeToPixels(clip.duration),
      },
    ]),
  );
}, [clips, coords.pxPerSec]);
```

### Undo/Redo Implementation

```typescript
interface TimelineSnapshot {
  clips: Map<string, Clip>;
  tracks: Map<string, Track>;
  playhead: number;
  selectedClipIds: Set<string>;
}

class UndoManager {
  private history: TimelineSnapshot[] = [];
  private index = -1;
  private readonly MAX_HISTORY = 50;

  pushState(snapshot: TimelineSnapshot) {
    // Remove any redo history
    this.history = this.history.slice(0, this.index + 1);

    // Add new state
    this.history.push(this.cloneSnapshot(snapshot));

    // Limit history size
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    } else {
      this.index++;
    }
  }

  undo(): TimelineSnapshot | null {
    if (this.index <= 0) return null;
    this.index--;
    return this.cloneSnapshot(this.history[this.index]);
  }

  redo(): TimelineSnapshot | null {
    if (this.index >= this.history.length - 1) return null;
    this.index++;
    return this.cloneSnapshot(this.history[this.index]);
  }

  private cloneSnapshot(snapshot: TimelineSnapshot): TimelineSnapshot {
    return {
      clips: new Map(snapshot.clips),
      tracks: new Map(snapshot.tracks),
      playhead: snapshot.playhead,
      selectedClipIds: new Set(snapshot.selectedClipIds),
    };
  }
}
```

## Export Pipeline

### FFmpeg Command Generation

The export pipeline translates timeline state into FFmpeg commands:

```typescript
interface ExportOptions {
  outputPath: string;
  resolution: { width: number; height: number };
  fps: number;
  codec: string;
  quality: number;
}

class ExportPipeline {
  generateFFmpegCommand(timeline: TimelineState, options: ExportOptions): string[] {
    const args: string[] = [];

    // Input files
    const clipsBySource = this.groupClipsBySource(timeline.clips);
    const inputMap = new Map<string, number>();
    let inputIndex = 0;

    for (const [sourcePath, clips] of clipsBySource) {
      args.push("-i", sourcePath);
      inputMap.set(sourcePath, inputIndex++);
    }

    // Build filter_complex for layering
    const filterChain = this.buildFilterChain(timeline.clips, timeline.tracks, inputMap, options);

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
  }

  private buildFilterChain(clips: Map<string, Clip>, tracks: Map<string, Track>, inputMap: Map<string, number>, options: ExportOptions): string {
    const filters: string[] = [];
    const sortedTracks = Array.from(tracks.values()).sort((a, b) => a.order - b.order);

    let layerIndex = 0;

    for (const track of sortedTracks) {
      if (!track.visible) continue;

      const trackClips = Array.from(clips.values())
        .filter((c) => c.trackId === track.id)
        .sort((a, b) => a.startTime - b.startTime);

      for (const clip of trackClips) {
        const inputIdx = inputMap.get(clip.sourceMediaPath)!;

        // Trim and position
        const trimFilter = `[${inputIdx}:v]trim=start=${clip.sourceStart}:end=${clip.sourceEnd},setpts=PTS-STARTPTS`;
        const delayFilter = `tpad=start_duration=${clip.startTime}`;

        filters.push(`${trimFilter},${delayFilter}[v${layerIndex}]`);

        if (!track.muted && track.type !== "text") {
          const audioFilter = `[${inputIdx}:a]atrim=start=${clip.sourceStart}:end=${clip.sourceEnd},asetpts=PTS-STARTPTS,adelay=${clip.startTime * 1000}|${clip.startTime * 1000}`;
          filters.push(`${audioFilter}[a${layerIndex}]`);
        }

        layerIndex++;
      }
    }

    // Overlay all layers
    if (layerIndex === 0) return "";

    let overlayChain = "[v0]";
    for (let i = 1; i < layerIndex; i++) {
      overlayChain = `${overlayChain}[v${i}]overlay[tmp${i}]`;
      if (i < layerIndex - 1) {
        overlayChain += `;[tmp${i}]`;
      }
    }

    return filters.join(";") + ";" + overlayChain;
  }

  private groupClipsBySource(clips: Map<string, Clip>): Map<string, Clip[]> {
    const groups = new Map<string, Clip[]>();

    for (const clip of clips.values()) {
      const existing = groups.get(clip.sourceMediaPath) || [];
      existing.push(clip);
      groups.set(clip.sourceMediaPath, existing);
    }

    return groups;
  }
}
```

## Error Handling

### Error Types and Recovery

```typescript
class TimelineError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = "TimelineError";
  }
}

// Error codes
const ErrorCodes = {
  MEDIA_LOAD_FAILED: "MEDIA_LOAD_FAILED",
  INVALID_TRIM: "INVALID_TRIM",
  INVALID_TRACK_TYPE: "INVALID_TRACK_TYPE",
  EXPORT_FAILED: "EXPORT_FAILED",
  PARSE_FAILED: "PARSE_FAILED",
  WAVEFORM_GENERATION_FAILED: "WAVEFORM_GENERATION_FAILED",
  FILMSTRIP_GENERATION_FAILED: "FILMSTRIP_GENERATION_FAILED",
} as const;

// Error handling in store actions
function createTimelineStore() {
  return create<TimelineState>((set, get) => ({
    // ... state

    trimClip: (id: string, startTime: number, duration: number) => {
      try {
        const clip = get().clips.get(id);
        if (!clip) {
          throw new TimelineError(`Clip ${id} not found`, ErrorCodes.INVALID_TRIM, false);
        }

        if (duration < 0.1) {
          throw new TimelineError("Clip duration must be at least 0.1 seconds", ErrorCodes.INVALID_TRIM, true);
        }

        if (startTime < 0 || startTime + duration > get().duration) {
          throw new TimelineError("Trim exceeds timeline boundaries", ErrorCodes.INVALID_TRIM, true);
        }

        // Perform trim
        set((state) => ({
          clips: new Map(state.clips).set(id, {
            ...clip,
            startTime,
            duration,
          }),
        }));
      } catch (error) {
        if (error instanceof TimelineError && error.recoverable) {
          // Show user-friendly error message
          console.warn(error.message);
          // Could dispatch to error notification system
        } else {
          // Log and potentially crash
          console.error("Fatal timeline error:", error);
          throw error;
        }
      }
    },
  }));
}
```

## Testing Strategy

The Timeline Engine uses a dual testing approach combining unit tests for specific scenarios and property-based tests for universal correctness properties.

### Unit Testing

Unit tests verify specific examples, edge cases, and integration points:

- **Coordinate System**: Test specific zoom levels, boundary conditions
- **Snap System**: Test snap threshold behavior, priority selection
- **Clip Operations**: Test drag to specific positions, trim to boundaries
- **UI Interactions**: Test click handlers, keyboard shortcuts
- **Export Pipeline**: Test FFmpeg command generation for known clip arrangements

### Property-Based Testing

Property-based tests verify universal properties across randomized inputs using fast-check library. Each test runs a minimum of 100 iterations.

**Testing Library**: fast-check (JavaScript/TypeScript property-based testing)

**Configuration**: Minimum 100 iterations per property test

**Tag Format**: Each property test must include a comment:

```typescript
// Feature: timeline-engine-v1, Property {number}: {property_text}
```
