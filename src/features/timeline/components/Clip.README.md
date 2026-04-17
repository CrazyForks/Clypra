# Clip Component

The Clip component renders individual clips on the timeline with visual layout, trim handles, and selection highlighting.

## Features

### Visual Layout (Requirements 5.1, 5.2, 5.3, 5.5, 5.6)

- **Position**: Clips are positioned at `x = startTime * pxPerSec`
- **Width**: Clips have width `w = duration * pxPerSec`
- **Minimum Width**: Enforces 8-pixel minimum width for very short clips
- **Clip Name**: Displays the clip name in the top-left
- **Duration Label**: Shows formatted duration in the bottom-left

### Track-Specific Styling (Requirement 5.3)

Clips are styled based on their type:

- **Video clips**: Teal gradient (`#0d9488` to `#0f766e`)
- **Audio clips**: Green gradient (`#10b981` to `#059669`)
- **Text clips**: Orange gradient (`#ea580c` to `#c2410c`)

### Selection Highlighting (Requirement 19.5)

Selected clips display a bright cyan outline (`#00c2ff`) with 2px width.

### Trim Handles (Requirements 7.1, 7.2)

- **Left Handle**: Positioned at the left edge with resize cursor on hover
- **Right Handle**: Positioned at the right edge with resize cursor on hover
- Both handles have visual affordance with gradient backgrounds
- Handles prevent clip drag when clicked (event propagation stopped)

## Usage

```tsx
import { Clip } from "@/features/timeline/components/Clip";
import { useTimelineStore } from "@/features/timeline/store";

function MyTimeline() {
  const { clips, selectedClipIds, selectClip, pxPerSec } = useTimelineStore();

  return (
    <div>
      {Array.from(clips.values()).map((clip) => (
        <Clip key={clip.id} clip={clip} isSelected={selectedClipIds.has(clip.id)} pxPerSec={pxPerSec} onSelect={selectClip} />
      ))}
    </div>
  );
}
```

## Virtualization

For performance with large timelines, use the `useVisibleClips` hook to only render clips within the viewport:

```tsx
import { useVisibleClips } from "@/features/timeline/hooks/useVisibleClips";

function MyTimeline() {
  const { clips, scrollLeft, pxPerSec } = useTimelineStore();
  const viewportWidth = 1920; // Get from ref or window

  const clipsArray = Array.from(clips.values());
  const visibleClips = useVisibleClips(clipsArray, scrollLeft, viewportWidth, pxPerSec);

  return (
    <div>
      {visibleClips.map((clip) => (
        <Clip key={clip.id} clip={clip} /* ... */ />
      ))}
    </div>
  );
}
```

The virtualization system uses a 2-second buffer for smooth scrolling (Requirement 16.6).

## Multi-Select

Clips support multi-select via Ctrl/Cmd+click:

```tsx
<Clip
  clip={clip}
  isSelected={selectedClipIds.has(clip.id)}
  pxPerSec={pxPerSec}
  onSelect={(id, multi) => {
    // multi is true when Ctrl/Cmd is pressed
    selectClip(id, multi);
  }}
/>
```

## Integration with TrackLane

The recommended way to use Clip components is through the TrackLane component, which handles:

- Filtering clips by track
- Applying virtualization
- Managing selection state
- Rendering locked track overlays

```tsx
import { TrackLane } from "@/features/timeline/components/TrackLane";

<TrackLane track={track} clips={allClips} selectedClipIds={selectedClipIds} pxPerSec={pxPerSec} scrollLeft={scrollLeft} viewportWidth={viewportWidth} onClipSelect={selectClip} />;
```

## Future Enhancements

The following features are planned for future tasks:

- **Drag interaction** (Task 16): Moving clips by dragging
- **Trim interaction** (Task 17): Adjusting clip boundaries via trim handles
- **Filmstrip visualization** (Task 14): Video thumbnails as clip background
- **Waveform visualization** (Task 13): Audio waveform overlay for audio clips
- **Split operation** (Task 18): Splitting clips at playhead position
- **Delete operation** (Task 19): Removing clips with keyboard shortcuts

## Testing

Unit tests verify:

- Clip position calculation at various zoom levels
- Width calculation based on duration
- Minimum width enforcement (8 pixels)
- Virtualization viewport calculation
- Buffer zone for smooth scrolling

Run tests with:

```bash
npm test -- src/features/timeline/components/__tests__/Clip.test.tsx
```
