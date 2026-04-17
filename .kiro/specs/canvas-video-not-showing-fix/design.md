# Canvas Video Not Showing Fix - Bugfix Design

## Overview

The canvas preview system is displaying a black rectangle instead of rendering video content when a video clip is imported to the timeline. The canvas dimensions are calculated correctly based on video aspect ratio, but the actual video frames fail to render. This design document formalizes the bug condition, analyzes the root cause, and outlines a targeted fix to ensure video frames render correctly while preserving all existing functionality.

The fix will focus on the video rendering pipeline, specifically investigating the interaction between VideoPool, SeekManager, and RenderEngine to identify why video elements are not being drawn to the canvas despite being loaded and seeked correctly.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a video clip exists at the playhead position but the canvas displays black instead of the video frame
- **Property (P)**: The desired behavior when the bug condition holds - the canvas should display the actual video frame from the clip at the current playhead position
- **Preservation**: Existing behaviors that must remain unchanged - canvas dimension calculation, timeline thumbnails, playhead movement, loading states, and error handling
- **renderFrame**: The async function in `CanvasRenderer.tsx` that orchestrates the frame rendering pipeline
- **RenderEngine.renderFrame**: The method in `RenderEngine.ts` that composites video frames onto the canvas
- **RenderEngine.drawClipFrame**: The private method that draws a single video element to the canvas using `ctx.drawImage()`
- **VideoPool**: The class in `VideoPool.ts` that manages HTML5 video element lifecycle and loading
- **ActiveClip**: An interface extending Clip with rendering metadata including `videoElement`, `trackIndex`, and `clipTime`
- **readyState**: The HTMLVideoElement property indicating video loading state (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)

## Bug Details

### Bug Condition

The bug manifests when a video clip is imported to the timeline and the playhead is positioned where the clip exists. The `renderFrame` function successfully resolves active clips, loads video elements from the VideoPool, seeks them to the correct time, and calls `RenderEngine.renderFrame()`, but the canvas displays only a black rectangle instead of the video content.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type { timelineTime: number, clips: Map<string, Clip>, tracks: Map<string, Track> }
  OUTPUT: boolean

  activeClips := FrameResolver.getActiveClips(input.timelineTime)

  RETURN activeClips.length > 0
         AND activeClips[0].type == "video"
         AND activeClips[0].videoElement.readyState >= 2
         AND activeClips[0].videoElement.videoWidth > 0
         AND activeClips[0].videoElement.videoHeight > 0
         AND canvasDisplaysBlackInsteadOfVideo()
END FUNCTION
```

### Examples

- **Example 1**: User imports `video.mp4` (1920x1080, 10 seconds) to timeline at position 0. Playhead is at 2.5 seconds. Expected: Canvas shows frame at 2.5s from video. Actual: Canvas shows black rectangle with correct 16:9 aspect ratio.

- **Example 2**: User imports `clip.mp4` to timeline and scrubs playhead through the clip duration. Expected: Canvas updates to show video frames as playhead moves. Actual: Canvas remains black throughout scrubbing, though dimensions update correctly.

- **Example 3**: User imports video clip and plays timeline. Expected: Canvas displays video frames synchronized with playhead. Actual: Canvas shows black rectangle during playback, though playhead moves correctly.

- **Edge Case**: User imports video with unusual aspect ratio (e.g., 9:16 portrait). Expected: Canvas shows video content with correct letterboxing/pillarboxing. Actual: Canvas shows black rectangle with correct aspect ratio calculations.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Canvas dimension calculation based on video aspect ratio must continue to work correctly (adaptive preview sizing)
- Timeline thumbnail generation and display must remain unchanged
- Playhead movement and scrubbing must continue to work correctly
- Loading state indicators ("Loading preview...", "Seeking...") must continue to display appropriately
- Error handling for video load failures must continue to show error messages
- "No clips at this position" message must continue to display when no clips are active
- Frame caching mechanism must continue to cache and retrieve rendered frames
- VideoPool reference counting and LRU eviction must continue to work correctly
- SeekManager debouncing and seek threshold logic must remain unchanged
- Multi-track layering order must continue to work correctly

**Scope:** All inputs that do NOT involve rendering video content to the canvas should be completely unaffected by this fix. This includes:

- Canvas dimension calculations and aspect ratio detection
- Video metadata loading and VideoPool management
- Seek operations and SeekManager logic
- Frame cache operations
- Timeline UI interactions (clip dragging, trimming, selection)
- Playhead control and RAF loop management

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Video Element Not Ready for Drawing**: The `RenderEngine.drawClipFrame()` method checks `video.readyState < 2` and skips drawing if the video is not ready. However, the video might be in a state where `readyState >= 2` but the video frame is not yet decoded or available for drawing. The check might be insufficient, or there could be a timing issue where the video element reports ready but `drawImage()` fails silently.

2. **Canvas Context State Issue**: The canvas 2D context might be in an incorrect state (e.g., wrong transform, clipping region, or global alpha) that prevents video frames from being visible. The context is scaled by device pixel ratio in the initialization, but there might be additional state that interferes with drawing.

3. **Video Element Seek Timing**: The `SeekManager.seekIfNeeded()` waits for the "seeked" event, but the video frame might not be decoded and ready for drawing immediately after the seek completes. There could be a race condition where `RenderEngine.renderFrame()` is called before the video frame is actually available for `drawImage()`.

4. **Silent drawImage Failure**: The `ctx.drawImage(video, ...)` call might be failing silently due to CORS issues, invalid video state, or other browser-specific restrictions. The current error handling wraps `drawImage()` in a try-catch but might not be catching all failure modes.

5. **Video Element Display/Visibility State**: HTML5 video elements might require certain properties (e.g., not being hidden, having dimensions) to be drawable to canvas. The video elements created by VideoPool might be in a state that prevents them from being drawn.

## Correctness Properties

Property 1: Bug Condition - Video Frames Render to Canvas

_For any_ timeline state where a video clip exists at the playhead position and the video element is loaded with valid dimensions, the fixed renderFrame function SHALL draw the video frame to the canvas using ctx.drawImage(), resulting in visible video content instead of a black rectangle.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Video-Rendering Behavior

_For any_ canvas preview operation that does NOT involve drawing video frames (dimension calculation, loading states, error messages, frame caching, video loading, seeking), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for canvas setup, video management, and UI feedback.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix will focus on ensuring video elements are in a drawable state before attempting to render them:

**File**: `src/features/canvas-preview/utils/RenderEngine.ts`

**Function**: `drawClipFrame` (private method)

**Specific Changes**:

1. **Enhanced Video Readiness Check**: Strengthen the `readyState` check to ensure the video frame is actually decoded and available for drawing. Instead of checking `readyState < 2`, verify `readyState >= 3` (HAVE_FUTURE_DATA) or `readyState === 4` (HAVE_ENOUGH_DATA) to ensure the frame is decoded.

2. **Add Video Element Validation**: Before calling `drawImage()`, validate that the video element has valid `currentTime`, is not paused in an invalid state, and has a valid `src` attribute.

3. **Explicit Error Logging for drawImage**: Enhance the try-catch around `drawImage()` to log more detailed information about why the draw might fail, including video element state, canvas context state, and any browser-specific errors.

4. **Video Element Visibility Workaround**: If needed, ensure video elements have the necessary properties to be drawable (e.g., not display:none, valid dimensions) by setting appropriate attributes when creating them in VideoPool.

5. **Add Diagnostic Logging**: Add console.log statements to track the exact state of video elements when `drawClipFrame()` is called, including `readyState`, `currentTime`, `videoWidth`, `videoHeight`, and whether `drawImage()` succeeds or fails.

**File**: `src/features/canvas-preview/utils/VideoPool.ts`

**Function**: `getVideo` (if needed based on root cause)

**Specific Changes**:

1. **Ensure Video Element Drawable State**: When creating video elements, ensure they have properties that make them drawable to canvas (e.g., not hidden, valid dimensions).

2. **Wait for Decoded Frame**: After seeking, potentially wait for a `requestVideoFrameCallback()` or similar mechanism to ensure the frame is decoded before returning the video element as ready.

**File**: `src/features/canvas-preview/components/CanvasRenderer.tsx`

**Function**: `renderFrame` (if needed based on root cause)

**Specific Changes**:

1. **Add Frame Decode Wait**: After `seekManager.seekIfNeeded()` completes, add a small delay or wait for a frame decode event before calling `renderEngine.renderFrame()`.

2. **Enhanced Diagnostic Logging**: Add logging to track the exact sequence of operations and video element state throughout the render pipeline.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by attempting to render video frames and observing black canvas output, then verify the fix works correctly by confirming video frames are visible and preserving existing behavior for all non-rendering operations.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis by examining video element state, canvas context state, and drawImage behavior. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that create a canvas, load a video clip, seek to a specific time, and attempt to render the frame. Capture the canvas output as an ImageData or ImageBitmap and verify that it contains only black pixels (bug manifestation). Run these tests on the UNFIXED code to observe failures and understand the root cause. Add extensive logging to track video element readyState, currentTime, dimensions, and drawImage success/failure.

**Test Cases**:

1. **Basic Video Render Test**: Import a simple 1920x1080 video clip, position playhead at 2.5 seconds, call renderFrame(), capture canvas output, verify it's all black pixels (will fail on unfixed code - demonstrates bug)

2. **Video Readiness State Test**: Track video element readyState progression during load and seek, verify readyState reaches 2+ but canvas still shows black (will fail on unfixed code - helps identify if readyState check is insufficient)

3. **DrawImage Direct Test**: Create a video element, load it, seek to a time, wait for seeked event, then directly call ctx.drawImage() and check if it draws anything (will fail on unfixed code - isolates whether drawImage itself is failing)

4. **Multiple Clips Test**: Import multiple video clips on different tracks, verify all show black instead of video content (will fail on unfixed code - confirms bug affects all clips)

**Expected Counterexamples**:

- Canvas ImageData shows all pixels are rgba(0,0,0,255) after renderFrame() completes
- Video element reports readyState >= 2 but drawImage() produces no visible output
- Possible causes: video frame not decoded despite readyState, canvas context state issue, silent drawImage failure, video element not in drawable state

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (video clip at playhead position), the fixed function produces the expected behavior (visible video content on canvas).

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderFrame_fixed(input.timelineTime)
  canvasImageData := captureCanvasOutput()
  ASSERT NOT allPixelsAreBlack(canvasImageData)
  ASSERT containsVideoContent(canvasImageData)
END FOR
```

**Test Plan**: After implementing the fix, run the same test cases from exploratory checking and verify that:

1. Canvas output contains non-black pixels representing video content
2. Video frames update correctly as playhead moves
3. Multiple clips render correctly with proper layering
4. Different video aspect ratios render correctly

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (operations not involving video frame rendering), the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderFrame_original(input) = renderFrame_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-rendering operations, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Canvas Dimension Preservation**: Observe that canvas dimensions are calculated correctly based on video aspect ratio on unfixed code, then write test to verify this continues after fix (should pass on both unfixed and fixed code)

2. **Loading State Preservation**: Observe that "Loading preview...", "Seeking...", and "No clips at this position" messages display correctly on unfixed code, then verify these continue to work after fix (should pass on both)

3. **Error Handling Preservation**: Observe that video load errors display error messages correctly on unfixed code, then verify error handling continues to work after fix (should pass on both)

4. **Frame Cache Preservation**: Observe that frame cache stores and retrieves frames correctly on unfixed code (even though they're black), then verify caching logic continues to work after fix (should pass on both)

5. **VideoPool Preservation**: Observe that VideoPool loads videos, manages reference counts, and evicts LRU entries correctly on unfixed code, then verify VideoPool behavior is unchanged after fix (should pass on both)

6. **SeekManager Preservation**: Observe that SeekManager debounces seeks, respects threshold, and handles timeouts correctly on unfixed code, then verify seek logic is unchanged after fix (should pass on both)

### Unit Tests

- Test video element readyState validation with different readyState values (0, 1, 2, 3, 4)
- Test drawClipFrame with video elements in various states (not ready, ready, seeking, error)
- Test canvas context state before and after drawing operations
- Test video element properties (currentTime, videoWidth, videoHeight, src) validation
- Test error handling for drawImage failures with different failure modes

### Property-Based Tests

- Generate random timeline states with various clip configurations and verify video content renders for all valid states
- Generate random video aspect ratios and verify correct rendering with proper scaling and centering
- Generate random playhead positions and verify frame rendering at all positions where clips exist
- Generate random multi-track configurations and verify correct layering order

### Integration Tests

- Test full render pipeline from clip import to canvas display with real video files
- Test scrubbing through video clips and verify canvas updates with video frames
- Test playback with RAF loop and verify continuous video frame rendering
- Test switching between different video clips and verify correct content displays
- Test error recovery when video load fails mid-render
