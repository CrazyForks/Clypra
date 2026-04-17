# Requirements Document: Canvas-Based Video Preview System v2

## Introduction

The Canvas-Based Video Preview System v2 is a professional-grade multi-clip rendering engine for the Kyro video editor. It replaces the single-video-element preview system (v1) with a canvas-based compositor capable of rendering multiple video clips from different source files simultaneously with proper layering, track visibility controls, and smooth real-time scrubbing. The system provides frame-accurate preview synchronized with the Timeline Engine v1, enabling users to see their multi-track composition in real-time.

## Glossary

- **Canvas_Compositor**: The rendering system that draws video frames to an HTML5 canvas element
- **Video_Pool**: A managed collection of HTML5 video elements, each representing a unique source media file
- **Frame_Resolver**: The component that determines which clips are active at a given timeline position
- **Render_Engine**: The component that draws active clip frames to the canvas with proper layering
- **Active_Clip**: A clip whose time range includes the current playhead position
- **Clip_Time**: The position within a source video file, calculated as: `clipTime = clip.inPoint + (timelineTime - clip.start)`
- **Timeline_Time**: The absolute position on the timeline in seconds
- **Source_Video**: An HTML5 video element loaded with a specific media file
- **Seek_Threshold**: The minimum time difference (0.03 seconds) required to trigger a video seek operation
- **RAF_Loop**: RequestAnimationFrame loop that drives continuous rendering during playback
- **Frame_Cache**: A temporary storage system for recently rendered frames to improve scrubbing performance
- **Track_Order**: The vertical stacking order of tracks, where higher-numbered tracks render on top
- **Playhead_Position**: The current timeline time synchronized with the Timeline Engine v1 state
- **Render_Context**: The 2D rendering context of the canvas element used for drawing operations
- **Video_Element_Pool**: A reusable pool of video elements to minimize memory allocation

## Requirements

### Requirement 1: Video Pool Management

**User Story:** As a developer, I want efficient video element management, so that the system can handle multiple source files without excessive memory usage.

#### Acceptance Criteria

1. THE Video_Pool SHALL maintain one Source_Video element for each unique source media file path
2. WHEN a new source media file is referenced, THE Video_Pool SHALL create a new Source_Video element and load the media
3. WHEN a source media file is no longer referenced by any clip, THE Video_Pool SHALL remove the corresponding Source_Video element
4. THE Video_Pool SHALL reuse existing Source_Video elements when multiple clips reference the same source file
5. THE Video_Pool SHALL support at least 10 simultaneous Source_Video elements
6. WHEN a Source_Video fails to load, THE Video_Pool SHALL emit an error event with the file path and error reason
7. THE Video_Pool SHALL preload video metadata for all source files to enable accurate seeking

### Requirement 2: Frame Resolution

**User Story:** As a video editor, I want the preview to show the correct clips at the current playhead position, so that I can see my composition accurately.

#### Acceptance Criteria

1. WHEN the Playhead_Position changes, THE Frame_Resolver SHALL identify all Active_Clips at that timeline time
2. THE Frame_Resolver SHALL calculate Clip_Time for each Active_Clip using the formula: `clipTime = clip.sourceStart + (timelineTime - clip.startTime)`
3. THE Frame_Resolver SHALL filter out clips on tracks where `visible` is false
4. THE Frame_Resolver SHALL sort Active_Clips by Track_Order with higher-numbered tracks appearing later in the list
5. THE Frame_Resolver SHALL return an empty list when no clips are active at the current Playhead_Position
6. FOR ALL Active_Clips, THE Frame_Resolver SHALL ensure Clip_Time is within the clip's source media boundaries
7. THE Frame_Resolver SHALL complete frame resolution in under 5 milliseconds for timelines with up to 100 clips

### Requirement 3: Smart Video Seeking

**User Story:** As a video editor, I want smooth scrubbing without lag, so that I can navigate my timeline efficiently.

#### Acceptance Criteria

1. WHEN the difference between current video time and target Clip_Time exceeds the Seek_Threshold, THE Render_Engine SHALL seek the Source_Video to the target time
2. WHEN the difference between current video time and target Clip_Time is less than or equal to the Seek_Threshold, THE Render_Engine SHALL use the current video frame without seeking
3. THE Render_Engine SHALL use a Seek_Threshold value of 0.03 seconds
4. WHEN rapid scrubbing occurs (multiple position changes within 100ms), THE Render_Engine SHALL debounce seek operations to the most recent position
5. THE Render_Engine SHALL wait for the `seeked` event before rendering a frame after a seek operation
6. WHEN a seek operation takes longer than 200ms, THE Render_Engine SHALL display a loading indicator
7. THE Render_Engine SHALL cancel pending seek operations when a new seek is requested

### Requirement 4: Canvas Rendering

**User Story:** As a video editor, I want to see all active clips composited together, so that I can preview my multi-track composition.

#### Acceptance Criteria

1. THE Render_Engine SHALL clear the canvas before each frame render
2. THE Render_Engine SHALL draw Active_Clips in Track_Order sequence (lowest track first, highest track last)
3. WHEN drawing a clip frame, THE Render_Engine SHALL use the canvas `drawImage` method with the Source_Video element
4. THE Render_Engine SHALL scale video frames to fit the canvas dimensions while maintaining aspect ratio
5. THE Render_Engine SHALL center video frames horizontally and vertically within the canvas
6. THE Render_Engine SHALL support high-DPI displays by scaling canvas resolution with device pixel ratio
7. WHEN no Active_Clips exist, THE Render_Engine SHALL display a black canvas

### Requirement 5: Playback Loop

**User Story:** As a video editor, I want smooth real-time playback, so that I can preview my video with proper motion.

#### Acceptance Criteria

1. WHEN playback starts, THE Canvas_Compositor SHALL initiate a RAF_Loop
2. THE RAF_Loop SHALL run at the display refresh rate (typically 60 FPS)
3. WHILE the RAF_Loop is active, THE Canvas_Compositor SHALL read the current Playhead_Position from the Timeline Engine v1 state
4. WHILE the RAF_Loop is active, THE Canvas_Compositor SHALL resolve active clips and render the current frame
5. WHEN playback stops, THE Canvas_Compositor SHALL cancel the RAF_Loop
6. THE Canvas_Compositor SHALL maintain 60 FPS during playback for timelines with up to 5 simultaneous video tracks
7. WHEN frame rendering takes longer than 16ms, THE Canvas_Compositor SHALL skip frames to maintain sync with the Playhead_Position

### Requirement 6: Timeline Synchronization

**User Story:** As a video editor, I want the preview to stay synchronized with the timeline playhead, so that I see the correct frame at all times.

#### Acceptance Criteria

1. THE Canvas_Compositor SHALL subscribe to Playhead_Position changes from the Timeline Engine v1 Zustand store
2. WHEN the Playhead_Position changes, THE Canvas_Compositor SHALL trigger a frame render
3. THE Canvas_Compositor SHALL use the Timeline Engine v1 `playhead` state value as the authoritative timeline time
4. WHEN the user scrubs the timeline, THE Canvas_Compositor SHALL update the preview in real-time
5. THE Canvas_Compositor SHALL maintain frame accuracy within 0.033 seconds (1 frame at 30 FPS) of the Playhead_Position
6. WHEN the Timeline Engine v1 state changes (clips added/removed/moved), THE Canvas_Compositor SHALL re-render the current frame
7. THE Canvas_Compositor SHALL respect the Timeline Engine v1 `duration` value as the maximum timeline time

### Requirement 7: Track Visibility Control

**User Story:** As a video editor, I want to hide specific tracks from the preview, so that I can focus on specific layers of my composition.

#### Acceptance Criteria

1. THE Canvas_Compositor SHALL read the `visible` property from each Track in the Timeline Engine v1 state
2. WHEN a Track `visible` property is false, THE Canvas_Compositor SHALL exclude all clips on that track from rendering
3. WHEN a Track `visible` property changes, THE Canvas_Compositor SHALL re-render the current frame
4. THE Canvas_Compositor SHALL render only clips on visible tracks in the correct Track_Order
5. WHEN all tracks are hidden, THE Canvas_Compositor SHALL display a black canvas
6. THE Canvas_Compositor SHALL update visibility in real-time without requiring playback restart
7. THE Canvas_Compositor SHALL maintain 60 FPS during playback when toggling track visibility

### Requirement 8: Multi-Clip Layering

**User Story:** As a video editor, I want clips on higher tracks to appear on top of clips on lower tracks, so that I can create layered compositions.

#### Acceptance Criteria

1. THE Render_Engine SHALL sort Active_Clips by their Track `order` property in ascending order
2. THE Render_Engine SHALL draw clips with lower Track `order` values first
3. THE Render_Engine SHALL draw clips with higher Track `order` values last (on top)
4. WHEN two clips on different tracks overlap in time, THE Render_Engine SHALL render the higher-track clip on top
5. WHEN multiple clips on the same track overlap in time, THE Render_Engine SHALL render only the topmost clip at that position
6. THE Render_Engine SHALL use canvas default compositing mode (source-over) for layering
7. FOR ALL frame renders, THE Render_Engine SHALL maintain correct layering order based on Track `order` values

### Requirement 9: Performance Optimization

**User Story:** As a video editor, I want responsive preview performance, so that I can work efficiently with complex timelines.

#### Acceptance Criteria

1. THE Canvas_Compositor SHALL render frames in under 16ms for timelines with up to 5 active video clips
2. THE Canvas_Compositor SHALL use requestAnimationFrame for all rendering operations to sync with display refresh
3. THE Canvas_Compositor SHALL cancel pending render operations when a new render is requested
4. THE Canvas_Compositor SHALL reuse canvas contexts without recreating them on each render
5. THE Canvas_Compositor SHALL avoid unnecessary DOM manipulations during rendering
6. THE Canvas_Compositor SHALL use efficient clip filtering to identify Active_Clips (O(n) complexity maximum)
7. WHEN the canvas is not visible, THE Canvas_Compositor SHALL pause rendering to conserve resources

### Requirement 10: Error Handling and Recovery

**User Story:** As a video editor, I want the preview to handle errors gracefully, so that one problematic clip doesn't break the entire preview.

#### Acceptance Criteria

1. WHEN a Source_Video fails to load, THE Canvas_Compositor SHALL display an error placeholder for that clip and continue rendering other clips
2. WHEN a Source_Video seek operation fails, THE Canvas_Compositor SHALL log the error and attempt to render the current frame
3. WHEN a canvas rendering operation fails, THE Canvas_Compositor SHALL log the error and retry on the next frame
4. THE Canvas_Compositor SHALL not crash when encountering invalid clip data; instead it SHALL skip the invalid clip
5. WHEN a video decode error occurs, THE Canvas_Compositor SHALL display the last successfully decoded frame
6. THE Canvas_Compositor SHALL emit error events with sufficient context for debugging (clip ID, source path, error message)
7. THE Canvas_Compositor SHALL recover to a valid rendering state after any error without requiring page reload

### Requirement 11: Canvas Initialization and Lifecycle

**User Story:** As a developer, I want proper canvas lifecycle management, so that resources are allocated and cleaned up correctly.

#### Acceptance Criteria

1. WHEN the Canvas_Compositor component mounts, THE Canvas_Compositor SHALL create a canvas element with a 2D rendering context
2. THE Canvas_Compositor SHALL set the canvas dimensions to match the container element size
3. THE Canvas_Compositor SHALL update canvas dimensions when the container is resized
4. WHEN the Canvas_Compositor component unmounts, THE Canvas_Compositor SHALL cancel all pending render operations
5. WHEN the Canvas_Compositor component unmounts, THE Canvas_Compositor SHALL release all Source_Video elements in the Video_Pool
6. THE Canvas_Compositor SHALL remove all event listeners when unmounting
7. THE Canvas_Compositor SHALL use React refs to maintain stable references to the canvas element and rendering context

### Requirement 12: Aspect Ratio and Scaling

**User Story:** As a video editor, I want videos to display without distortion, so that I can see the correct proportions.

#### Acceptance Criteria

1. THE Render_Engine SHALL calculate the aspect ratio of each Source_Video using `videoWidth / videoHeight`
2. THE Render_Engine SHALL calculate the canvas aspect ratio using `canvas.width / canvas.height`
3. WHEN the video aspect ratio differs from the canvas aspect ratio, THE Render_Engine SHALL letterbox or pillarbox the video
4. THE Render_Engine SHALL scale videos to fit within the canvas bounds while maintaining aspect ratio
5. THE Render_Engine SHALL center videos horizontally when pillarboxing (video narrower than canvas)
6. THE Render_Engine SHALL center videos vertically when letterboxing (video shorter than canvas)
7. FOR ALL video frames, THE Render_Engine SHALL preserve the source aspect ratio without distortion

### Requirement 13: Frame Cache System

**User Story:** As a video editor, I want smooth scrubbing performance, so that I can navigate the timeline without lag.

#### Acceptance Criteria

1. THE Frame_Cache SHALL store rendered canvas frames indexed by timeline time
2. WHEN scrubbing to a previously rendered time, THE Frame_Cache SHALL retrieve and display the cached frame
3. THE Frame_Cache SHALL use a maximum cache size of 100 frames
4. WHEN the cache exceeds maximum size, THE Frame_Cache SHALL evict the least recently used frames
5. WHEN timeline state changes (clips moved/added/removed), THE Frame_Cache SHALL invalidate all cached frames
6. THE Frame_Cache SHALL store frames as ImageBitmap objects for efficient rendering
7. THE Frame_Cache SHALL improve scrubbing performance by at least 50% for repeated positions

### Requirement 14: Clip Time Calculation

**User Story:** As a developer, I want accurate clip time calculation, so that the correct portion of source media is displayed.

#### Acceptance Criteria

1. THE Frame_Resolver SHALL calculate Clip_Time using the formula: `clipTime = clip.sourceStart + (timelineTime - clip.startTime)`
2. THE Frame_Resolver SHALL clamp Clip_Time to be within the range `[clip.sourceStart, clip.sourceEnd]`
3. WHEN a clip is trimmed, THE Frame_Resolver SHALL respect the `sourceStart` and `sourceEnd` boundaries
4. THE Frame_Resolver SHALL handle clips with `sourceStart` greater than 0 (trimmed source media)
5. THE Frame_Resolver SHALL handle clips where `sourceEnd - sourceStart` is less than the source media duration
6. FOR ALL Active_Clips, THE Frame_Resolver SHALL ensure Clip_Time is non-negative
7. FOR ALL Clip_Time calculations, THE Frame_Resolver SHALL maintain accuracy within 0.001 seconds

### Requirement 15: Integration with Timeline Engine v1

**User Story:** As a developer, I want seamless integration with the existing timeline, so that the preview system works with the current architecture.

#### Acceptance Criteria

1. THE Canvas_Compositor SHALL import and use the Timeline Engine v1 Zustand store via `useTimelineStore` hook
2. THE Canvas_Compositor SHALL read clip data from the `clips` Map in the Timeline Engine v1 state
3. THE Canvas_Compositor SHALL read track data from the `tracks` Map in the Timeline Engine v1 state
4. THE Canvas_Compositor SHALL read the `playhead` value from the Timeline Engine v1 state
5. THE Canvas_Compositor SHALL subscribe to state changes using Zustand's selector pattern for optimal performance
6. THE Canvas_Compositor SHALL not modify Timeline Engine v1 state; it SHALL be a read-only consumer
7. THE Canvas_Compositor SHALL work with the existing Clip and Track data models without requiring schema changes

### Requirement 16: Playback State Management

**User Story:** As a video editor, I want the preview to respond to play/pause controls, so that I can control playback.

#### Acceptance Criteria

1. THE Canvas_Compositor SHALL read the `isPlaying` state from the Timeline Engine v1 store
2. WHEN `isPlaying` is true, THE Canvas_Compositor SHALL start the RAF_Loop
3. WHEN `isPlaying` is false, THE Canvas_Compositor SHALL stop the RAF_Loop
4. WHEN `isPlaying` transitions from false to true, THE Canvas_Compositor SHALL resume rendering from the current Playhead_Position
5. WHEN `isPlaying` transitions from true to false, THE Canvas_Compositor SHALL render one final frame at the current position
6. THE Canvas_Compositor SHALL not control playback state; it SHALL only respond to state changes
7. THE Canvas_Compositor SHALL maintain sync with the Timeline Engine v1 playhead during playback

### Requirement 17: Video Loading States

**User Story:** As a video editor, I want to see loading indicators, so that I know when videos are being loaded or seeked.

#### Acceptance Criteria

1. WHEN a Source_Video is loading metadata, THE Canvas_Compositor SHALL display a loading indicator for that clip region
2. WHEN a Source_Video is seeking, THE Canvas_Compositor SHALL display the last rendered frame until the seek completes
3. WHEN all Source_Videos are loaded and ready, THE Canvas_Compositor SHALL remove all loading indicators
4. THE Canvas_Compositor SHALL display a "No clips at this position" message when no Active_Clips exist
5. THE Canvas_Compositor SHALL display a "Loading preview..." message during initial Video_Pool setup
6. WHEN a Source_Video fails to load, THE Canvas_Compositor SHALL display an error message with the file name
7. THE Canvas_Compositor SHALL provide visual feedback for all loading states without blocking user interaction

### Requirement 18: Memory Management

**User Story:** As a developer, I want efficient memory usage, so that the application doesn't consume excessive resources.

#### Acceptance Criteria

1. THE Video_Pool SHALL limit the number of simultaneous Source_Video elements to 10
2. WHEN the Video_Pool reaches capacity, THE Video_Pool SHALL evict the least recently used Source_Video element
3. THE Canvas_Compositor SHALL release ImageBitmap objects in the Frame_Cache when they are evicted
4. THE Canvas_Compositor SHALL use a single canvas element for all rendering operations
5. THE Canvas_Compositor SHALL avoid creating temporary canvas elements during rendering
6. THE Canvas_Compositor SHALL reuse the same Render_Context for all draw operations
7. THE Canvas_Compositor SHALL maintain total memory usage under 500MB for timelines with 10 source videos

### Requirement 19: High-DPI Display Support

**User Story:** As a video editor, I want crisp preview rendering on high-DPI displays, so that I can see fine details clearly.

#### Acceptance Criteria

1. THE Canvas_Compositor SHALL detect the device pixel ratio using `window.devicePixelRatio`
2. THE Canvas_Compositor SHALL set canvas internal resolution to `displayWidth * devicePixelRatio` by `displayHeight * devicePixelRatio`
3. THE Canvas_Compositor SHALL set canvas CSS dimensions to the display size in CSS pixels
4. THE Canvas_Compositor SHALL scale the Render_Context by the device pixel ratio before drawing
5. THE Canvas_Compositor SHALL render sharp video frames on Retina and high-DPI displays
6. THE Canvas_Compositor SHALL update device pixel ratio when the window moves between displays with different DPI
7. THE Canvas_Compositor SHALL maintain 60 FPS performance on high-DPI displays with device pixel ratio up to 3

### Requirement 20: Seek Debouncing

**User Story:** As a video editor, I want responsive scrubbing without excessive seek operations, so that the preview remains smooth.

#### Acceptance Criteria

1. WHEN multiple Playhead_Position changes occur within 100ms, THE Canvas_Compositor SHALL debounce seek operations
2. THE Canvas_Compositor SHALL execute only the most recent seek request after the debounce period
3. THE Canvas_Compositor SHALL render frames immediately using the current video position during the debounce period
4. WHEN scrubbing stops (no position changes for 100ms), THE Canvas_Compositor SHALL execute a final seek to the exact position
5. THE Canvas_Compositor SHALL cancel pending debounced seeks when playback starts
6. THE Canvas_Compositor SHALL not debounce seeks during playback (only during scrubbing)
7. THE Canvas_Compositor SHALL improve scrubbing smoothness by reducing seek operations by at least 80%

### Requirement 21: Canvas Compositor Parser and Serialization

**User Story:** As a developer, I want to serialize canvas compositor state, so that preview settings can be saved and restored.

#### Acceptance Criteria

1. WHEN the user saves a project, THE Canvas_Compositor_Parser SHALL serialize the Video_Pool state to JSON format
2. WHEN the user loads a project, THE Canvas_Compositor_Parser SHALL parse the JSON and reconstruct the Video_Pool
3. THE Canvas_Compositor_Parser SHALL validate the JSON structure against a schema before parsing
4. IF the JSON is invalid, THEN THE Canvas_Compositor_Parser SHALL return a descriptive error message
5. THE Canvas_Compositor_Pretty_Printer SHALL format compositor JSON with proper indentation for human readability
6. FOR ALL valid compositor states, serializing then parsing SHALL produce an equivalent state (round-trip property)
7. THE Canvas_Compositor_Parser SHALL handle missing optional fields by using default values

### Requirement 22: Render Pipeline Validation

**User Story:** As a developer, I want to validate the render pipeline, so that I can ensure correct frame composition.

#### Acceptance Criteria

1. THE Render_Engine SHALL validate that all Active_Clips have valid Source_Video elements before rendering
2. THE Render_Engine SHALL validate that all Clip_Time values are within source media boundaries
3. THE Render_Engine SHALL validate that the canvas Render_Context is available before drawing
4. WHEN validation fails, THE Render_Engine SHALL log a warning and skip the invalid clip
5. THE Render_Engine SHALL validate Track_Order values are numeric and finite
6. THE Render_Engine SHALL validate that canvas dimensions are positive integers
7. THE Render_Engine SHALL complete validation in under 1ms for timelines with up to 100 clips

### Requirement 23: Frame Accuracy Verification

**User Story:** As a video editor, I want frame-accurate preview, so that I can make precise editing decisions.

#### Acceptance Criteria

1. THE Canvas_Compositor SHALL render frames within 0.033 seconds (1 frame at 30 FPS) of the target Playhead_Position
2. THE Canvas_Compositor SHALL use the Source_Video `currentTime` property to verify seek accuracy
3. WHEN a Source_Video `currentTime` differs from the target Clip_Time by more than 0.033 seconds, THE Canvas_Compositor SHALL re-seek
4. THE Canvas_Compositor SHALL wait for the `seeked` event before considering a seek complete
5. THE Canvas_Compositor SHALL timeout seek operations after 500ms and render the current frame
6. THE Canvas_Compositor SHALL log frame accuracy metrics for debugging (target time vs actual time)
7. FOR ALL rendered frames during playback, THE Canvas_Compositor SHALL maintain sync within 0.033 seconds of the Playhead_Position

### Requirement 24: Clip Boundary Handling

**User Story:** As a video editor, I want clips to appear and disappear at the correct times, so that the preview matches my timeline arrangement.

#### Acceptance Criteria

1. WHEN the Playhead_Position enters a clip's time range, THE Canvas_Compositor SHALL include that clip in the render
2. WHEN the Playhead_Position exits a clip's time range, THE Canvas_Compositor SHALL exclude that clip from the render
3. THE Frame_Resolver SHALL consider a clip active when `clip.startTime <= timelineTime < clip.startTime + clip.duration`
4. THE Frame_Resolver SHALL handle clips with zero duration by not rendering them
5. THE Frame_Resolver SHALL handle clips that start at time 0 correctly
6. THE Frame_Resolver SHALL handle clips that extend to the timeline duration correctly
7. FOR ALL timeline positions, THE Frame_Resolver SHALL correctly identify Active_Clips based on time range inclusion

### Requirement 25: Video Element Reuse

**User Story:** As a developer, I want efficient video element reuse, so that the system minimizes resource allocation overhead.

#### Acceptance Criteria

1. WHEN multiple clips reference the same source file, THE Video_Pool SHALL reuse the same Source_Video element
2. THE Video_Pool SHALL seek the shared Source_Video element to different Clip_Time values as needed
3. THE Video_Pool SHALL track reference counts for each Source_Video element
4. WHEN a source file's reference count reaches zero, THE Video_Pool SHALL mark the Source_Video element for eviction
5. THE Video_Pool SHALL delay eviction for 5 seconds to allow for quick re-use
6. THE Video_Pool SHALL cancel delayed eviction when a source file is referenced again
7. THE Video_Pool SHALL reduce memory usage by at least 50% compared to creating separate video elements for each clip
