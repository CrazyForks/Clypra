# Playback Debugging Guide

## Issue

The playhead and canvas are not updating during video playback. When pressing space or clicking the play button, the video plays in the background but:

- The playhead stays at position 0
- The canvas shows a static frame
- The timeline doesn't sync with playback

## Console Log Strategy

All excessive logging has been removed. Only critical checkpoints remain:

### TimelineContainer Logs

**Play/Pause Actions:**

```
[PLAY] Starting playback
[PAUSE] Pausing playback
```

**Video Events:**

```
[VIDEO EVENT] play - setting isPlaying to true
[VIDEO EVENT] pause - setting isPlaying to false
[TIMEUPDATE] currentTime: X.XXX updating store playhead
```

### CanvasRenderer Logs

**Playback State Changes:**

```
[CANVAS] isPlaying changed to: true/false
```

**RAF Loop:**

```
[RAF] Starting loop
[RAF] Tick - playhead: X.XXX
```

## Expected Flow When Playing

1. **User clicks Play button or presses Space**

   ```
   [PLAY] Starting playback
   ```

2. **Video element fires play event**

   ```
   [VIDEO EVENT] play - setting isPlaying to true
   ```

3. **CanvasRenderer detects isPlaying change**

   ```
   [CANVAS] isPlaying changed to: true
   [RAF] Starting loop
   ```

4. **RAF loop starts ticking**

   ```
   [RAF] Tick - playhead: 0.000
   [RAF] Tick - playhead: 0.033
   [RAF] Tick - playhead: 0.066
   ...
   ```

5. **Video timeupdate events fire**
   ```
   [TIMEUPDATE] currentTime: 0.033 updating store playhead
   [TIMEUPDATE] currentTime: 0.250 updating store playhead
   [TIMEUPDATE] currentTime: 0.500 updating store playhead
   ...
   ```

## Debugging Checklist

### If you see `[PLAY] Starting playback` but no `[VIDEO EVENT] play`:

- The video element is not firing the play event
- Check if the video element exists: `videoRef.current`
- Check if the video source is loaded
- Check browser console for video errors

### If you see `[VIDEO EVENT] play` but no `[CANVAS] isPlaying changed`:

- The store's `isPlaying` state is not being updated
- Check if `setIsPlaying` is being called
- Check Zustand store subscription

### If you see `[CANVAS] isPlaying changed to: true` but no `[RAF] Starting loop`:

- The RAF loop is not starting
- Check if the useEffect dependency array includes `isPlaying`
- Check if there's an error in `startRAFLoop()`

### If you see `[RAF] Starting loop` but no `[RAF] Tick`:

- The RAF loop started but the loop function isn't being called
- Check if `requestAnimationFrame` is working
- Check if the loop is being cancelled immediately

### If you see `[RAF] Tick` but playhead is always 0.000:

- The store's playhead is not being updated
- Check if `[TIMEUPDATE]` logs are appearing
- Check if `setStorePlayhead` is being called
- Check if the video element's `currentTime` is advancing

### If you see `[TIMEUPDATE]` logs but playhead in RAF is still 0.000:

- The store update is not propagating
- Check Zustand store's `setPlayhead` function
- Check if there's a stale closure issue

## Key Files

- `src/features/timeline/components/TimelineContainer.tsx` - Play/pause control and video event handlers
- `src/features/canvas-preview/components/CanvasRenderer.tsx` - RAF loop and canvas rendering
- `src/features/timeline/store/timelineStore.ts` - Zustand store with `isPlaying` and `playhead` state

## Next Steps

1. Import a video
2. Click the Play button (or press Space)
3. Watch the console logs
4. Follow the debugging checklist above based on what you see (or don't see)
