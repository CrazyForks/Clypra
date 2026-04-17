# Timeline Feature

A CapCut-style video timeline with ruler, tracks, filmstrip, and waveform visualization.

## Components

### Timeline

Main timeline component that orchestrates all sub-components.

**Props:**

- `duration` - Video duration in seconds
- `trimStart` - Trim start time in seconds
- `trimEnd` - Trim end time in seconds
- `playhead` - Current playback position in seconds
- `onSeek` - Callback when user seeks to a new position
- `videoUrl` - Video source URL (blob or file URL)
- `sourcePath` - Original file path for backend processing

**Features:**

- Horizontal scrolling with overflow
- Pinch-to-zoom (trackpad gesture)
- Click/drag to seek
- Auto-scroll to keep playhead visible
- Responsive ruler with adaptive tick marks

### TimelineToolbar

Top toolbar with editing tools and controls.

**Features:**

- Undo/Redo buttons (UI only)
- Selection, split, delete, marker tools
- Snap toggles (magnet, snap, link)
- Zoom slider (16-320 px/sec)

### TimelineTrackHeaders

Left sidebar showing track information and controls.

**Features:**

- Text track header
- Video/audio track header
- Lock/visibility/audio toggles
- Cover image button

### Waveform

Canvas-based audio waveform visualization.

**Props:**

- `peaks` - Array of normalized peak values (0-1)
- `width` - Canvas width in pixels
- `height` - Canvas height in pixels
- `className` - Optional CSS classes

**Features:**

- Smooth envelope rendering
- Gradient fill
- Automatic smoothing
- High DPI support

## Hooks

### useFilmstrip

Generates a horizontal strip of video thumbnails.

**Parameters:**

- `videoUrl` - Video source URL
- `durationSec` - Video duration in seconds

**Returns:**

- `stripUrl` - Data URL of generated filmstrip image
- `loading` - Loading state

**Features:**

- Adaptive frame count (18-72 frames)
- Object-fit contain (no squashing)
- JPEG compression
- Automatic cleanup

## Utils

### timeFormat

**formatTimecode(seconds, fps = 30)** Formats time as HH:MM:SS:FF (CapCut-style).

```typescript
formatTimecode(65.5, 30); // "00:01:05:15"
```

**formatRulerLabel(seconds)** Formats time for ruler ticks (M:SS or MM:SS).

```typescript
formatRulerLabel(65); // "1:05"
formatRulerLabel(5); // "00:05"
```

## Usage Example

```typescript
import { Timeline } from "./features/timeline";

function App() {
  const [playhead, setPlayhead] = useState(0);

  return (
    <Timeline
      duration={120}
      trimStart={10}
      trimEnd={90}
      playhead={playhead}
      onSeek={setPlayhead}
      videoUrl="blob:..."
      sourcePath="/path/to/video.mp4"
    />
  );
}
```

## Styling

The timeline uses a dark theme with teal accents:

- Background: `#121212`
- Borders: `#2a2a2a`
- Accent: `#00c2ff` (teal)
- Video track: `#0d9488` (teal)
- Text track: `#ea580c` (orange)

Colors are defined in `src/constants/colors.ts`.

## Performance Considerations

### Memoization

- Ruler ticks are memoized based on duration and zoom
- Timeline width is memoized to prevent unnecessary recalculations
- Callbacks use `useCallback` to prevent re-renders

### Canvas Rendering

- Waveform uses canvas for efficient rendering
- High DPI support with device pixel ratio
- Smoothing algorithm reduces visual noise

### Filmstrip Generation

- Runs asynchronously to avoid blocking UI
- Cancels on unmount to prevent memory leaks
- Caches result as data URL

## Future Enhancements

- [ ] Multi-track support
- [ ] Drag-and-drop clips
- [ ] Keyframe animations
- [ ] Effects and transitions
- [ ] Audio mixing
- [ ] Subtitle editing
- [ ] Markers and comments
- [ ] Keyboard shortcuts
- [ ] Undo/redo functionality
- [ ] Snap-to-grid
