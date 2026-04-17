---
inclusion: auto
fileMatchPattern: "src/features/canvas-preview/**/*"
---

# Video Playback Architecture - Core Principles

## 🎯 Critical Mental Model

This is NOT a React app with video players. This IS a mini video engine that happens to use React for UI.

## 🧠 Architecture Hierarchy (Authority Chain)

```
┌──────────────────────────────────────┐
│ 1. Timeline Clock (Master Authority) │  ← performance.now() based
└────────────────┬─────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│ 2. Audio Context (Playback Mode)     │  ← Drives time during playback
└────────────────┬─────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│ 3. Frame Resolver                    │  ← Determines what to show
└────────────────┬─────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│ 4. Video Elements (Frame Sources)    │  ← ALWAYS PAUSED, seeked only
└────────────────┬─────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│ 5. Canvas Renderer (Visual Output)   │  ← Paints resolved frames
└──────────────────────────────────────┘
```

## ⚠️ Critical Rules (NEVER VIOLATE)

### Rule 1: Video Elements Are Frame Sources ONLY

- ❌ NEVER call `video.play()` for playback
- ❌ NEVER rely on video's internal playback
- ✅ ALWAYS keep videos paused
- ✅ ONLY use `video.currentTime = t` for seeking
- ✅ Videos are like image files that can seek

### Rule 2: RAF Is NOT The Clock

- ❌ NEVER use RAF deltaTime as timeline time
- ❌ NEVER accumulate time from RAF callbacks
- ✅ RAF is ONLY for rendering (paint loop)
- ✅ Time comes from Timeline Clock or Audio Context

### Rule 3: Timeline Clock Is Master (Scrubbing Mode)

```typescript
// ✅ CORRECT
const startTime = performance.now();
const getCurrentTime = () => (performance.now() - startTime) / 1000;

function rafLoop() {
  const time = getCurrentTime(); // Authority
  renderFrame(time);
  requestAnimationFrame(rafLoop);
}
```

### Rule 4: Audio Context Is Master (Playback Mode)

```typescript
// ✅ CORRECT - Audio drives time
const timelineTime = audioContext.currentTime - audioStartOffset;
renderFrame(timelineTime);

// ❌ WRONG - Trying to sync audio to timeline
audio.currentTime = timelineTime; // This causes drift!
```

### Rule 5: Threshold-Based Video Seeking

```typescript
// ✅ CORRECT - Prevent excessive seeking
const SEEK_THRESHOLD = 0.033; // ~1 frame at 30fps

if (Math.abs(video.currentTime - targetTime) > SEEK_THRESHOLD) {
  video.currentTime = targetTime;
  await waitForSeek(video);
}

// ❌ WRONG - Seeking every frame
video.currentTime = targetTime; // Causes jitter!
```

## 🎬 Two Operating Modes

### Mode 1: Scrubbing (User Control)

**Authority**: Timeline Clock (performance.now) **Audio**: OFF **Video**: Seeks freely to match timeline **Use Case**: User dragging playhead, frame-by-frame navigation

```typescript
// Scrubbing mode
const timelineTime = getCurrentTime();
seekVideoToTime(video, timelineTime);
renderFrame(timelineTime);
```

### Mode 2: Playback (Real-time)

**Authority**: Audio Context **Audio**: ON (drives time) **Video**: Follows audio time **Use Case**: Normal playback with audio

```typescript
// Playback mode
const audioTime = audioContext.currentTime - audioStartOffset;
seekVideoToTime(video, audioTime);
renderFrame(audioTime);
```

## 🔊 Audio System Architecture

### Current Implementation: Separate Audio Elements

**CRITICAL**: Audio elements are SEPARATE from video elements used for frames.

```typescript
// Video elements = frame sources ONLY (always paused)
const video = await videoPool.getVideo(sourceMediaPath);
video.pause(); // Always paused
video.currentTime = targetTime; // Only seeked for frames

// Audio elements = sound sources ONLY (play during playback)
const audioElement = new Audio(sourceMediaPath);
const audioSource = audioContext.createMediaElementSource(audioElement);
audioSource.connect(audioContext.destination);
await audioElement.play(); // Plays for audio
```

### Audio Sync Strategy

```typescript
// Timeline Clock is authority (performance.now() based)
const timelineTime = timelineClock.getCurrentTime();

// Audio follows timeline (corrected when drift exceeds threshold)
const SYNC_THRESHOLD = 0.1; // 100ms tolerance

if (Math.abs(audioElement.currentTime - expectedTime) > SYNC_THRESHOLD) {
  audioElement.currentTime = expectedTime;
}
```

### Why This Works

1. **No Conflict**: Video seeking doesn't interrupt audio playback
2. **Smooth Audio**: Audio plays continuously, only corrected when needed
3. **Accurate Frames**: Videos seeked freely without affecting audio
4. **Simple Sync**: Threshold-based correction prevents constant seeking

## 🎯 Frame Accuracy Requirements

### Seek Threshold

- **Value**: 0.033 seconds (~1 frame at 30fps)
- **Purpose**: Prevent excessive seeking
- **Trade-off**: Slight imprecision vs smooth playback

### Video currentTime Limitations

- Browser seeks to nearest keyframe
- Seek is asynchronous
- May not land exactly on target
- **Solution**: Accept small drift, prioritize smoothness

### Frame Decode Wait

```typescript
async function waitForFrameDecode(video: HTMLVideoElement) {
  if (video.readyState >= 2) return; // HAVE_CURRENT_DATA

  return new Promise((resolve) => {
    const check = () => {
      if (video.readyState >= 2) {
        video.removeEventListener("loadeddata", check);
        resolve();
      }
    };
    video.addEventListener("loadeddata", check);
    setTimeout(resolve, 500); // Timeout fallback
  });
}
```

## 🚀 Performance Optimizations

### 1. Smart Seeking

```typescript
// Only seek if difference exceeds threshold
if (Math.abs(video.currentTime - targetTime) > SEEK_THRESHOLD) {
  video.currentTime = targetTime;
}
```

### 2. Frame Caching

- Cache rendered frames as ImageBitmap
- Key: timeline time + clip state hash
- Invalidate on clip/track changes
- LRU eviction policy

### 3. Video Pool

- Reuse video elements
- Reference counting
- Lazy eviction (5s delay)
- Max pool size limit

### 4. RAF Optimization

- Cancel pending renders on new request
- Abort signal for async operations
- Skip render if already rendering

## 🐛 Common Pitfalls (Learn From These)

### ❌ Pitfall 1: Using RAF as Clock

```typescript
// WRONG
let time = 0;
function loop(timestamp) {
  const delta = timestamp - lastTime;
  time += delta / 1000;
  renderFrame(time); // Drift accumulates!
}
```

### ❌ Pitfall 2: Playing Video Elements

```typescript
// WRONG
await video.play(); // Video plays independently!
// Canvas shows one thing, video plays another
```

### ❌ Pitfall 3: Syncing Audio to Timeline

```typescript
// WRONG
setInterval(() => {
  audio.currentTime = timeline.playhead; // Causes audio glitches!
}, 16);
```

### ❌ Pitfall 4: Seeking Every Frame

```typescript
// WRONG
function render() {
  video.currentTime = timeline.playhead; // Excessive seeking!
  drawFrame(video);
}
```

## ✅ Correct Implementation Pattern

```typescript
class TimelineEngine {
  private startTime: number = 0;
  private audioStartOffset: number = 0;
  private isPlaying: boolean = false;

  // Master clock
  getCurrentTime(): number {
    if (this.isPlaying && this.audioContext) {
      // Audio drives time during playback
      return this.audioContext.currentTime - this.audioStartOffset;
    } else {
      // Timeline clock for scrubbing
      return (performance.now() - this.startTime) / 1000;
    }
  }

  // RAF loop (render only)
  private rafLoop = () => {
    const time = this.getCurrentTime(); // Get authoritative time
    this.renderFrame(time);
    this.rafId = requestAnimationFrame(this.rafLoop);
  };

  // Smart video seeking
  private async seekVideo(video: HTMLVideoElement, targetTime: number) {
    const THRESHOLD = 0.033;

    if (Math.abs(video.currentTime - targetTime) > THRESHOLD) {
      video.currentTime = targetTime;
      await this.waitForFrameDecode(video);
    }
  }
}
```

## 📊 Performance Targets

- **Frame Rate**: 30fps minimum, 60fps target
- **Seek Latency**: <100ms for scrubbing
- **Audio Sync**: <33ms drift (1 frame)
- **Memory**: <500MB for 10 video clips
- **Startup**: <2s to first frame

## 🔄 State Transitions

```
┌─────────────┐
│   STOPPED   │
└──────┬──────┘
       │ play()
       ↓
┌─────────────┐     pause()     ┌─────────────┐
│  PLAYING    │ ───────────────→│  PAUSED     │
│ (Audio ON)  │                 │ (Audio OFF) │
└──────┬──────┘                 └──────┬──────┘
       │                               │
       │ seek()                        │ seek()
       ↓                               ↓
┌─────────────┐                 ┌─────────────┐
│  SEEKING    │                 │  SCRUBBING  │
│ (Audio OFF) │                 │ (Audio OFF) │
└──────┬──────┘                 └──────┬──────┘
       │                               │
       └───────────────┬───────────────┘
                       ↓
                 ┌─────────────┐
                 │   STOPPED   │
                 └─────────────┘
```

## 🎓 Key Takeaways

1. **Video elements are NOT players** - They're frame sources
2. **RAF is NOT a clock** - It's a paint loop
3. **Audio is master during playback** - Timeline follows audio
4. **Threshold-based seeking** - Prevents jitter
5. **Two modes matter** - Scrubbing vs Playback
6. **Frame accuracy is approximate** - Accept small drift for smoothness

## 📚 Next Level: Frame Caching

Once basic playback works, implement:

- Predictive frame pre-loading
- Multi-threaded decoding (OffscreenCanvas + Workers)
- Adaptive quality based on performance
- Smart cache eviction strategies

This is what separates "it works" from "it feels professional".
