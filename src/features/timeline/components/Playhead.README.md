# Playhead Component

The Playhead component renders a vertical line with a triangular handle that indicates the current playback position on the timeline. It supports click-to-seek and drag-to-scrub interactions.

## Features

- **Visual Design**: Vertical line with triangular handle at top (Requirements 4.6)
- **Viewport Positioning**: Positioned absolutely relative to viewport, not affected by horizontal scroll (Requirements 4.7)
- **Click to Seek**: Click anywhere on timeline to move playhead (Requirements 4.1)
- **Drag to Scrub**: Drag to continuously update playhead position (Requirements 4.2)
- **Auto-scroll**: Automatically scrolls viewport when playhead moves outside visible area with 15% margin (Requirements 4.5)

## Usage

### Basic Usage

```tsx
import { Playhead } from "@/features/timeline/components/Playhead";
import { usePlayheadAutoScroll } from "@/features/timeline/hooks/usePlayheadAutoScroll";
import { CoordinateSystem } from "@/features/timeline/utils/coordinateSystem";
import { useTimelineStore } from "@/features/timeline/store";

function TimelineComponent() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const playhead = useTimelineStore((state) => state.playhead);
  const pxPerSec = useTimelineStore((state) => state.pxPerSec);
  const duration = useTimelineStore((state) => state.duration);

  const coords = useMemo(() => new CoordinateSystem(pxPerSec), [pxPerSec]);

  // Enable auto-scroll
  usePlayheadAutoScroll({
    playhead,
    coords,
    scrollRef,
    duration,
  });

  return (
    <div ref={scrollRef} className="relative overflow-x-auto">
      <div ref={containerRef} style={{ width: duration * pxPerSec }}>
        {/* Timeline content */}
      </div>

      {/* Playhead overlay */}
      <Playhead coords={coords} scrollLeft={scrollLeft} duration={duration} containerRef={containerRef} />
    </div>
  );
}
```

### Integration with Existing Timeline

The Playhead component is designed to replace inline playhead rendering in the Timeline component:

**Before:**

```tsx
{
  /* Old inline playhead */
}
<div className="pointer-events-none absolute inset-0 z-40">
  <div style={{ left: playhead * pxPerSec - scrollLeft }}>{/* Playhead visual */}</div>
</div>;
```

**After:**

```tsx
import { Playhead } from "@/features/timeline/components/Playhead";

<Playhead coords={coords} scrollLeft={scrollLeft} duration={duration} containerRef={timelineContentRef} />;
```

## Props

### `coords: CoordinateSystem`

The coordinate system instance for time-to-pixel conversion. Create using:

```tsx
const coords = useMemo(() => new CoordinateSystem(pxPerSec), [pxPerSec]);
```

### `scrollLeft: number`

Current horizontal scroll position in pixels. Update on scroll:

```tsx
const handleScroll = () => {
  setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
};
```

### `duration: number`

Timeline duration in seconds. Used to clamp playhead position.

### `containerRef: React.RefObject<HTMLDivElement>`

Reference to the timeline content container. Used to calculate click positions relative to timeline coordinates.

## Auto-scroll Hook

The `usePlayheadAutoScroll` hook automatically scrolls the viewport when the playhead moves outside the visible area.

### Usage

```tsx
import { usePlayheadAutoScroll } from "@/features/timeline/hooks/usePlayheadAutoScroll";

usePlayheadAutoScroll({
  playhead, // Current playhead time in seconds
  coords, // CoordinateSystem instance
  scrollRef, // Ref to scroll container
  duration, // Timeline duration
  marginPercent, // Optional: margin percentage (default: 0.15 for 15%)
});
```

### Behavior

- Monitors playhead position relative to viewport
- Triggers scroll when playhead is within 15% margin of viewport edges
- Centers playhead in viewport when scrolling
- Clamps scroll position to valid range

## Styling

The Playhead uses Tailwind CSS classes and inline styles for positioning. Key visual elements:

- **Triangular Handle**: White triangle with subtle shadow
- **Vertical Line**: 2px wide with gradient from white to semi-transparent
- **Drop Shadow**: Soft white glow for visibility
- **Z-index**: z-40 to appear above timeline content

## State Management

The Playhead component integrates with the Zustand timeline store:

```tsx
const playhead = useTimelineStore((state) => state.playhead);
const setPlayhead = useTimelineStore((state) => state.setPlayhead);
```

Clicking or dragging the playhead calls `setPlayhead(time)` to update the global state.

## Accessibility

- Invisible click/drag area has `aria-label="Timeline scrubber"`
- Visual playhead has `aria-hidden` to avoid duplicate announcements
- Supports keyboard navigation through timeline store actions

## Requirements Mapping

- **4.1**: Click on timeline moves playhead to clicked time position
- **4.2**: Drag on timeline continuously updates playhead position
- **4.3**: Synchronize playhead with video player current time (via store)
- **4.5**: Auto-scroll viewport when playhead moves outside visible area with 15% margin
- **4.6**: Render as vertical line with triangular handle at top
- **4.7**: Remain visible when scrolling horizontally (positioned absolutely relative to viewport)
