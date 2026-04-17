# Video Playback Architecture Fix - Implementation Summary

## 🎯 Problem Identified

The original implementation had a fundamental architectural flaw:

- **Video elements were being played independently** via `video.play()`
- **RAF loop was accumulating deltaTime** as the time source
- **No separation between visual rendering and time authority**

This caused:

- ❌ No audio during playback
- ❌ Frame changes only on pause (when seek completed)
- ❌ Video element playing independently of canvas
- ❌ Time drift and sync issues

## ✅ Solution Implemented

### 1. Timeline Clock (Master Time Authority)

**File**: `src/features/canvas-preview/utils/TimelineClock.ts`

- Single source of truth for timeline time
- Uses `performance.now()` for scrubbing mode
- Will sync with AudioContext for playback mode (next phase)
- NOT driven by RAF deltaTime

```typescript
// ✅ CORRECT: Clock is authority
const time = timelineClock.getCurrentTime();
renderFrame(time);

// ❌ WRONG: RAF deltaTime accumulation
time += deltaTime; // Causes drift!
```

### 2. RAF as Render Loop Only

**File**: `src/features/canvas-preview/components/CanvasRenderer.tsx`

- RAF is now ONLY for painting frames
- Does NOT calculate or accumulate time
- Queries Timeline Clock for authoritative time

```typescript
const loop = () => {
  const currentTime = timelineClock.getCurrentTime(); // Authority
  renderFrame(currentTime); // Just paint
  requestAnimationFrame(loop);
};
```

### 3. Video Elements as Frame Sources

**File**: `src/features/canvas-preview/components/CanvasRenderer.tsx`

- Videos remain PAUSED (never call `video.play()`)
- Only `video.currentTime` is set for seeking
- Videos are like seekable image files
- Audio will be handled via Web Audio API (next phase)

```typescript
// ✅ CORRECT: Video is frame source
video.pause(); // Always paused
video.currentTime = targetTime; // Seek only

// ❌ WRONG: Video plays independently
await video.play(); // Don't do this!
```

### 4. Threshold-Based Seeking

**File**: `src/features/canvas-preview/utils/SeekManager.ts`

- Already implemented: Only seek if difference > 0.033s
- Prevents excessive seeking and jitter
- Balances accuracy vs smoothness

## 📁 Files Modified

1. **Created**: `.kiro/steering/video-playback-architecture.md`
   - Comprehensive architecture documentation
   - Core principles and rules
   - Common pitfalls and solutions
   - Auto-included for canvas-preview files

2. **Created**: `src/features/canvas-preview/utils/TimelineClock.ts`
   - Master time authority
   - Supports scrubbing and playback modes
   - Audio context integration ready

3. **Modified**: `src/features/canvas-preview/components/CanvasRenderer.tsx`
   - Integrated Timeline Clock
   - RAF loop now queries clock instead of accumulating time
   - Removed video.play() calls
   - Added audio context setup (prepared for next phase)

4. **Modified**: `src/features/canvas-preview/utils/VideoPool.ts`
   - Videos start muted (will be controlled by audio system)

## 🎬 Current State

### ✅ What Works Now

- Timeline Clock provides authoritative time
- RAF loop renders at correct times
- Video elements seek to match timeline
- No independent video playback
- Proper separation of concerns

### 🚧 Next Phase: Audio Integration

The architecture is now ready for proper audio:

1. **Web Audio API Integration**
   - Create MediaElementAudioSourceNode from video elements
   - Connect to AudioContext destination
   - Audio plays while video stays paused

2. **Audio-Driven Playback Mode**
   - Timeline Clock syncs with AudioContext.currentTime
   - Audio becomes master during playback
   - Video seeks to match audio time

3. **Two-Mode Operation**
   - **Scrubbing**: Timeline Clock (performance.now)
   - **Playback**: Audio Context (sample-accurate)

## 🧠 Key Architectural Principles

### Authority Hierarchy

```
1. Timeline Clock ← Master (scrubbing)
2. Audio Context ← Master (playback)
3. Frame Resolver ← Determines what to show
4. Video Elements ← Frame sources (always paused)
5. Canvas ← Visual output
```

### Critical Rules

1. **Video elements = frame sources ONLY** (never play)
2. **RAF = paint loop ONLY** (not time source)
3. **Timeline Clock = time authority** (scrubbing mode)
4. **Audio Context = time authority** (playback mode)
5. **Threshold-based seeking** (prevent jitter)

## 📊 Performance Characteristics

- **Frame Rate**: Stable (not tied to RAF deltaTime)
- **Seek Accuracy**: ~33ms threshold (1 frame at 30fps)
- **Time Drift**: Eliminated (no accumulation)
- **Audio Sync**: Ready for implementation

## 🎓 Lessons Learned

### What We Fixed

1. **Separated time authority from rendering**
   - Before: RAF deltaTime accumulated (drift)
   - After: Timeline Clock is authority

2. **Stopped playing video elements**
   - Before: video.play() caused independent playback
   - After: Videos paused, seeked only

3. **Prepared for audio integration**
   - Before: No audio strategy
   - After: Web Audio API ready

### Why This Matters

This is not a React app with video players. This is a **mini video engine** that happens to use React for UI.

The architecture now reflects this reality:

- Single time authority
- Clear separation of concerns
- Professional-grade sync strategy

## 🚀 Next Steps

1. **Implement Web Audio Integration**
   - Connect video elements to AudioContext
   - Enable audio during playback
   - Keep videos paused

2. **Audio-Driven Playback Mode**
   - Timeline Clock syncs with audio
   - Audio becomes master
   - Video follows audio time

3. **Frame Caching Optimization**
   - Predictive pre-loading
   - Multi-threaded decoding
   - Adaptive quality

4. **Performance Monitoring**
   - Track frame accuracy
   - Monitor audio sync drift
   - Measure render performance

## 📚 References

- **Steering Document**: `.kiro/steering/video-playback-architecture.md`
- **Timeline Clock**: `src/features/canvas-preview/utils/TimelineClock.ts`
- **Canvas Renderer**: `src/features/canvas-preview/components/CanvasRenderer.tsx`

---

**Status**: ✅ Core architecture fixed, ready for audio integration **Date**: 2026-04-17 **Impact**: Foundation for professional-grade video playback
