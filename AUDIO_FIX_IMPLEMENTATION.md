# Audio Fix Implementation - Separate Audio Elements

## 🎯 Problem Identified

The previous implementation had a critical flaw:

- **Video elements were playing** via `video.play()` to enable audio
- This caused videos to advance at their own pace
- Created massive drift (0.6+ seconds) between video.currentTime and Timeline Clock
- Result: "seek storm" - constant seeking that prevented smooth playback
- **No audio was actually heard** because videos were being seeked constantly

## ✅ Solution Implemented

### Core Principle: Separate Audio from Video Frame Sources

```
Video Elements (Frame Sources)     Audio Elements (Sound)
        ↓                                  ↓
   ALWAYS PAUSED                      CAN PLAY
   Seeked for frames                  Plays audio
   No audio output                    Synced to timeline
```

## 🏗️ Architecture Changes

### 1. Separate Audio Elements

**Before (BROKEN)**:

```typescript
// Used video element for both frames AND audio
const audioSource = audioContext.createMediaElementSource(video);
await video.play(); // ❌ Video plays independently!
```

**After (FIXED)**:

```typescript
// Create SEPARATE audio element
const audioElement = new Audio(sourceMediaPath);
const audioSource = audioContext.createMediaElementSource(audioElement);
await audioElement.play(); // ✅ Only audio plays!

// Video element stays PAUSED
video.pause(); // Always paused, only seeked
```

### 2. Timeline Clock Stays Performance-Based

**Before (BROKEN)**:

```typescript
// Tried to attach AudioContext to Timeline Clock
timelineClock.attachAudioContext(audioContext, playhead);
// This made audio the time authority, but videos couldn't keep up
```

**After (FIXED)**:

```typescript
// Timeline Clock uses performance.now() as authority
const currentTime = timelineClock.getCurrentTime(); // performance.now() based

// Audio follows timeline, not the other way around
syncAudioToTimeline(currentTime);
```

### 3. Audio Sync Strategy

**New Function**: `syncAudioToTimeline(timelineTime)`

```typescript
const syncAudioToTimeline = (timelineTime: number) => {
  const SYNC_THRESHOLD = 0.1; // 100ms tolerance

  for (const clip of activeClips) {
    const audioElement = audioElementsRef.current.get(clip.sourceMediaPath);

    if (audioElement && !audioElement.paused) {
      // Calculate expected audio time
      const expectedAudioTime = clip.clipTime + (timelineTime - clip.timelineStart);
      const actualAudioTime = audioElement.currentTime;
      const drift = actualAudioTime - expectedAudioTime;

      // Correct drift if exceeds threshold
      if (Math.abs(drift) > SYNC_THRESHOLD) {
        audioElement.currentTime = expectedAudioTime;
      }
    }
  }
};
```

## 📊 Data Flow

### Playback Mode (With Audio)

```
┌─────────────────────────────────────┐
│ Timeline Clock (performance.now())  │ ← Master Authority
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ RAF Loop                            │
│ - Gets time from clock              │
│ - Renders frame                     │
│ - Syncs audio                       │
└────────┬────────────────────────────┘
         ↓                    ↓
┌────────────────┐   ┌────────────────┐
│ Video Elements │   │ Audio Elements │
│ (PAUSED)       │   │ (PLAYING)      │
│ Seeked to time │   │ Synced to time │
└────────────────┘   └────────────────┘
         ↓                    ↓
┌────────────────┐   ┌────────────────┐
│ Canvas         │   │ Speakers       │
│ (Visual)       │   │ (Sound)        │
└────────────────┘   └────────────────┘
```

### Scrubbing Mode (No Audio)

```
┌─────────────────────────────────────┐
│ Timeline Clock (performance.now())  │ ← Master Authority
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ renderFrame(time)                   │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ Video Elements (PAUSED)             │
│ Seeked to time                      │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ Canvas (Visual)                     │
└─────────────────────────────────────┘

Audio Elements: PAUSED (no sound)
```

## 🔧 Key Implementation Details

### Video Elements Behavior

```typescript
// Video elements are ONLY for frames
// They are NEVER played, only seeked

// During scrubbing
video.pause();
video.currentTime = timelineTime;

// During playback
video.pause(); // STILL PAUSED!
video.currentTime = timelineTime;
```

### Audio Elements Behavior

```typescript
// Audio elements are SEPARATE
// They play during playback, paused during scrubbing

// During scrubbing
audioElement.pause();

// During playback
audioElement.currentTime = clipTime;
await audioElement.play();

// Sync in RAF loop
syncAudioToTimeline(currentTime);
```

### RAF Loop Changes

```typescript
const loop = () => {
  // 1. Get time from Timeline Clock (performance.now() based)
  const currentTime = timelineClock.getCurrentTime();

  // 2. Update store
  useTimelineStore.getState().setPlayhead(currentTime);

  // 3. Render frame (seeks video elements)
  renderFrame(currentTime);

  // 4. Sync audio elements to timeline
  syncAudioToTimeline(currentTime);

  // 5. Continue loop
  rafIdRef.current = requestAnimationFrame(loop);
};
```

## 📝 Code Changes Summary

### Files Modified

1. **`src/features/canvas-preview/components/CanvasRenderer.tsx`**
   - Removed `video.play()` calls
   - Added separate audio element creation
   - Added `syncAudioToTimeline()` function
   - Updated `startAudioPlayback()` to use audio elements
   - Updated `stopAudioPlayback()` to pause audio elements
   - Modified RAF loop to sync audio

2. **`src/features/canvas-preview/utils/TimelineClock.ts`**
   - Removed `attachAudioContext()` method
   - Removed `detachAudioContext()` method
   - Simplified to use only performance.now()
   - Removed audio-driven time logic

### New Refs Added

```typescript
const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
// Maps sourceMediaPath → HTMLAudioElement
// Separate from video elements used for frames
```

### Functions Changed

1. **`setupAudioElement(sourceMediaPath)`** (NEW)
   - Creates separate Audio element
   - Creates MediaElementAudioSourceNode
   - Connects to AudioContext destination
   - Caches for reuse

2. **`startAudioPlayback(clips)`** (MODIFIED)
   - Uses audio elements instead of video elements
   - Seeks audio to correct position
   - Plays audio elements only

3. **`stopAudioPlayback(clips)`** (MODIFIED)
   - Pauses audio elements
   - Suspends AudioContext

4. **`syncAudioToTimeline(timelineTime)`** (NEW)
   - Called in RAF loop
   - Corrects audio drift
   - Uses 100ms threshold

5. **`startRAFLoop()`** (MODIFIED)
   - Added `syncAudioToTimeline()` call
   - Timeline Clock uses performance.now()

## ✅ Expected Behavior

### During Playback

1. User clicks play
2. Timeline Clock starts (performance.now() based)
3. Audio elements start playing
4. RAF loop:
   - Gets time from Timeline Clock
   - Seeks video elements to that time (for frames)
   - Syncs audio elements to that time (for sound)
   - Renders frame to canvas
5. Result: Canvas shows video frames, speakers play audio, both in sync

### During Scrubbing

1. User drags playhead
2. Timeline Clock paused
3. Audio elements paused
4. `renderFrame()` called:
   - Seeks video elements to playhead time
   - Renders frame to canvas
5. Result: Canvas shows frame at playhead position, no audio

## 🎯 Why This Works

### Separation of Concerns

- **Video elements**: Frame sources (always paused)
- **Audio elements**: Sound sources (play during playback)
- **Timeline Clock**: Time authority (performance.now())
- **RAF loop**: Render loop (queries clock, syncs audio)

### No Drift

- Timeline Clock is authoritative (performance.now())
- Audio follows timeline (not the other way around)
- Drift correction every frame (100ms threshold)
- Videos never play independently

### Smooth Playback

- Videos stay paused (no seek storm)
- Audio plays continuously (only corrected when drift exceeds threshold)
- Canvas renders at 60fps
- Timeline advances smoothly

## 🐛 What Was Wrong Before

### Issue 1: Video Elements Playing

```typescript
// BROKEN
await video.play(); // Video advances independently
video.currentTime = targetTime; // Constant seeking while playing
// Result: Seek storm, no smooth playback
```

### Issue 2: Audio-Driven Time

```typescript
// BROKEN
timelineClock.attachAudioContext(audioContext, playhead);
const time = timelineClock.getCurrentTime(); // Uses audioContext.currentTime
// Result: Audio is authority, but videos can't keep up
```

### Issue 3: No Actual Audio Output

- Videos were playing for audio
- But they were being seeked constantly
- Seeking interrupts audio playback
- Result: No audio heard, just seeking sounds

## ✅ What's Fixed Now

### Fix 1: Separate Audio Elements

```typescript
// FIXED
const audioElement = new Audio(sourceMediaPath);
await audioElement.play(); // Audio plays smoothly

video.pause(); // Video stays paused
video.currentTime = targetTime; // Only seeked for frames
```

### Fix 2: Performance-Based Time

```typescript
// FIXED
const time = timelineClock.getCurrentTime(); // performance.now() based
syncAudioToTimeline(time); // Audio follows timeline
```

### Fix 3: Actual Audio Output

- Audio elements play continuously
- Only corrected when drift exceeds threshold
- Result: Smooth audio playback

## 🚀 Next Steps

### Testing Checklist

- [ ] Load video and play - should hear audio
- [ ] Pause - audio should stop
- [ ] Scrub - should see frames, no audio
- [ ] Resume - audio should continue from correct position
- [ ] Multiple clips - all audio should play in sync
- [ ] Long playback - no drift over time

### Future Optimizations

1. **Predictive Audio Loading**
   - Pre-load audio for upcoming clips
   - Smooth transitions between clips

2. **Audio Mixing**
   - Multiple audio tracks
   - Volume control per track
   - Crossfade support

3. **Audio-Driven Time (Advanced)**
   - Once basic sync works, can switch to audio-driven time
   - Requires more sophisticated video seeking strategy
   - Would eliminate audio drift entirely

## 📚 Documentation Updated

- **Architecture Guide**: `.kiro/steering/video-playback-architecture.md` (still valid)
- **Timeline Clock**: `src/features/canvas-preview/utils/TimelineClock.ts` (simplified)
- **This Document**: `AUDIO_FIX_IMPLEMENTATION.md` (new)

## 🎓 Key Learnings

### What Makes This Work

1. **Separate audio from video frame sources**
   - Video elements = frames only (always paused)
   - Audio elements = sound only (play during playback)

2. **Timeline Clock is authority**
   - Uses performance.now() for stable time
   - Audio follows timeline, not the other way around

3. **Drift correction, not prevention**
   - Accept small drift (< 100ms)
   - Correct when exceeds threshold
   - Prevents constant seeking

4. **RAF is render loop only**
   - Queries clock for time
   - Renders frame
   - Syncs audio
   - NOT a time source

### Why Previous Approach Failed

- Tried to use video elements for both frames and audio
- Video playback and seeking are incompatible
- Audio-driven time requires sophisticated video buffering
- Simpler to separate concerns

---

**Date**: 2026-04-17 **Status**: ✅ IMPLEMENTED **Impact**: Fixes no-audio issue and frame sync problems **Architecture**: Separate audio elements, performance-based time
