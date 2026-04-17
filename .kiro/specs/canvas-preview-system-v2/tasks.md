# Implementation Plan: Canvas-Based Video Preview System v2

## Overview

This implementation plan converts the Canvas-Based Video Preview System v2 design into a series of incremental coding tasks. The system is built with React 19, TypeScript, Zustand state management (Timeline Engine v1 integration), and HTML5 Canvas. The implementation follows a bottom-up approach: core data models and interfaces first, then subsystem implementations (VideoPool, FrameResolver, SeekManager, RenderEngine, FrameCache), then the main CanvasRenderer component, and finally integration with Timeline Engine v1.

## Tasks

- [x] 1. Set up core data models and type definitions
  - Create TypeScript interfaces for ActiveClip, VideoPoolEntry, FrameCacheEntry, RenderState
  - Create CanvasPreviewError class with error codes (VIDEO_LOAD_FAILED, VIDEO_SEEK_FAILED, RENDER_FAILED, etc.)
  - Create directory structure: src/features/canvas-preview/{types,components,utils,**tests**}
  - _Requirements: 1.1, 1.2, 1.3, 10.1, 10.2, 10.3, 10.4_

- [x] 1.1 Write unit tests for type definitions
  - Test error class instantiation with different error codes
  - Test interface type checking
  - _Requirements: 10.6_

- [x] 2. Implement VideoPool class
  - [x] 2.1 Create VideoPool class with pool management
    - Implement getVideo method with reference counting
    - Implement releaseVideo method with delayed eviction (5 seconds)
    - Implement evictLRU method for capacity management
    - Implement loadVideoMetadata and waitForVideoReady helpers
    - Implement dispose method for cleanup
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6_

  - [x] 2.2 Write property test for VideoPool uniqueness
    - **Property 1: Video Pool Uniqueness**
    - **Validates: Requirements 1.1, 1.4, 25.1**

  - [x] 2.3 Write property test for reference counting
    - **Property 2: Video Pool Reference Counting**
    - **Validates: Requirements 1.3, 25.3**

  - [x] 2.4 Write property test for eviction on zero references
    - **Property 3: Video Pool Eviction on Zero References**
    - **Validates: Requirements 1.3, 25.4**

  - [x] 2.5 Write property test for eviction cancellation
    - **Property 4: Video Pool Eviction Cancellation**
    - **Validates: Requirements 25.6**

  - [x] 2.6 Write property test for capacity constraint
    - **Property 5: Video Pool Capacity Constraint**
    - **Validates: Requirements 1.5**

  - [x] 2.7 Write property test for error emission
    - **Property 6: Video Pool Error Emission**
    - **Validates: Requirements 1.6**

  - [x] 2.8 Write property test for metadata preloading
    - **Property 7: Video Pool Metadata Preloading**
    - **Validates: Requirements 1.7**

  - [x] 2.9 Write unit tests for VideoPool
    - Test video element creation for specific source paths
    - Test reference counting with specific add/remove sequences
    - Test LRU eviction with specific pool states
    - Test error handling for specific invalid paths
    - Test delayed eviction timing (5 second delay)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 3. Implement FrameResolver class
  - [x] 3.1 Create FrameResolver class with active clip detection
    - Implement getActiveClips method with time range filtering
    - Implement calculateClipTime method with formula: clipTime = sourceStart + (timelineTime - startTime)
    - Implement clip time clamping to source boundaries
    - Implement track visibility filtering
    - Implement track order sorting (ascending)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

  - [x] 3.2 Write property test for active clip detection
    - **Property 8: Active Clip Detection**
    - **Validates: Requirements 2.1, 24.1, 24.2, 24.3, 24.7**

  - [x] 3.3 Write property test for clip time calculation formula
    - **Property 9: Clip Time Calculation Formula**
    - **Validates: Requirements 2.2, 14.1**

  - [x] 3.4 Write property test for clip time boundary clamping
    - **Property 10: Clip Time Boundary Clamping**
    - **Validates: Requirements 2.6, 14.2, 14.3**

  - [x] 3.5 Write property test for invisible track filtering
    - **Property 11: Invisible Track Filtering**
    - **Validates: Requirements 2.3, 7.2**

  - [x] 3.6 Write property test for track order sorting
    - **Property 12: Track Order Sorting**
    - **Validates: Requirements 2.4, 8.1**

  - [x] 3.7 Write property test for empty active clips
    - **Property 13: Empty Active Clips for Empty Timeline**
    - **Validates: Requirements 2.5**

  - [x] 3.8 Write property test for clip time non-negativity
    - **Property 14: Clip Time Non-Negativity**
    - **Validates: Requirements 14.6**

  - [x] 3.9 Write property test for clip time precision
    - **Property 15: Clip Time Calculation Precision**
    - **Validates: Requirements 14.7**

  - [x] 3.10 Write unit tests for FrameResolver
    - Test active clip detection at specific timeline positions
    - Test clip time calculation with specific clip configurations
    - Test track visibility filtering with specific track states
    - Test sorting with specific track orders
    - Test boundary cases (time 0, timeline duration, zero-duration clips)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement SeekManager class
  - [x] 5.1 Create SeekManager class with smart seeking
    - Implement seekIfNeeded method with threshold check (0.03 seconds)
    - Implement debouncedSeek method with 100ms debounce window
    - Implement performSeek method with timeout protection (500ms)
    - Implement cancelPendingSeeks method
    - Implement dispose method for cleanup
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

  - [x] 5.2 Write property test for seek threshold above
    - **Property 16: Seek Threshold Behavior (Above Threshold)**
    - **Validates: Requirements 3.1**

  - [x] 5.3 Write property test for seek threshold within
    - **Property 17: Seek Threshold Behavior (Within Threshold)**
    - **Validates: Requirements 3.2**

  - [x] 5.4 Write property test for seek debouncing
    - **Property 18: Seek Debouncing**
    - **Validates: Requirements 3.4**

  - [x] 5.5 Write property test for seek cancellation
    - **Property 19: Seek Cancellation**
    - **Validates: Requirements 3.7**

  - [x] 5.6 Write unit tests for SeekManager
    - Test threshold behavior with specific time differences (0.02s, 0.03s, 0.04s)
    - Test debouncing with specific timing sequences
    - Test seek cancellation with specific overlapping requests
    - Test timeout handling with specific slow seeks
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 6. Implement RenderEngine class
  - [x] 6.1 Create RenderEngine class with canvas rendering
    - Implement renderFrame method with canvas clearing and clip drawing
    - Implement drawClipFrame method with aspect ratio scaling
    - Implement aspect ratio calculation (fit width or fit height)
    - Implement video frame centering (letterbox/pillarbox)
    - Implement validateRenderPipeline method
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 22.1, 22.2, 22.3, 22.4, 22.5_

  - [x] 6.2 Write property test for canvas clearing
    - **Property 20: Canvas Clearing Before Render**
    - **Validates: Requirements 4.1**

  - [x] 6.3 Write property test for layering order
    - **Property 21: Layering Order by Track Order**
    - **Validates: Requirements 4.2, 8.1, 8.2, 8.3, 8.4, 8.7**

  - [x] 6.4 Write property test for aspect ratio preservation
    - **Property 22: Aspect Ratio Preservation**
    - **Validates: Requirements 4.4, 12.1, 12.2, 12.7**

  - [x] 6.5 Write property test for video frame centering
    - **Property 23: Video Frame Centering**
    - **Validates: Requirements 4.5, 12.5, 12.6**

  - [x] 6.6 Write property test for high-DPI scaling
    - **Property 24: High-DPI Canvas Scaling**
    - **Validates: Requirements 4.6, 19.1, 19.2, 19.3, 19.4**

  - [x] 6.7 Write property test for black canvas
    - **Property 25: Black Canvas for No Active Clips**
    - **Validates: Requirements 4.7, 7.5**

  - [x] 6.8 Write unit tests for RenderEngine
    - Test aspect ratio scaling with specific video/canvas dimensions
    - Test centering calculations with specific letterbox/pillarbox cases
    - Test layering with specific track configurations
    - Test error handling with specific render failures
    - Test high-DPI scaling with specific device pixel ratios (1, 2, 3)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 7. Implement FrameCache class
  - [x] 7.1 Create FrameCache class with LRU caching
    - Implement get method with state hash validation
    - Implement set method with capacity management
    - Implement updateStateHash method for cache invalidation
    - Implement invalidate method to clear all cached frames
    - Implement evictLRU method for capacity management
    - Implement timeToKey and simpleHash helper methods
    - Implement dispose method for cleanup
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 7.2 Write unit tests for FrameCache
    - Test cache hits/misses with specific timeline positions
    - Test LRU eviction with specific access patterns
    - Test state invalidation with specific clip/track changes
    - Test ImageBitmap lifecycle
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement CanvasRenderer main component
  - [x] 9.1 Create CanvasRenderer component with canvas setup
    - Create canvas element with refs for stable references
    - Setup canvas with high-DPI support (device pixel ratio)
    - Initialize VideoPool, FrameCache, SeekManager instances
    - Subscribe to Timeline Engine v1 state (clips, tracks, playhead, isPlaying)
    - Implement cleanup on unmount
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [x] 9.2 Implement renderFrame method
    - Check frame cache for cached frame
    - Resolve active clips using FrameResolver
    - Get video elements from VideoPool
    - Seek videos using SeekManager
    - Render composite frame using RenderEngine
    - Cache rendered frame as ImageBitmap
    - _Requirements: 2.1, 2.7, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4, 13.1, 13.2_

  - [x] 9.3 Implement RAF loop for playback
    - Implement startRAFLoop method
    - Implement stopRAFLoop method
    - Read current playhead from Timeline Engine v1 state
    - Render frame at current playhead
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 9.4 Implement playhead change handler
    - React to playhead changes when not playing (scrubbing)
    - Trigger frame render on playhead change
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.5 Implement playback state handler
    - Start RAF loop when isPlaying becomes true
    - Stop RAF loop when isPlaying becomes false
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [x] 9.6 Write unit tests for CanvasRenderer
    - Test canvas initialization with high-DPI support
    - Test renderFrame method with mock subsystems
    - Test RAF loop start/stop
    - Test playhead change handling
    - Test playback state handling
    - _Requirements: 11.1, 11.2, 11.3, 15.1, 15.2, 15.3_

- [x] 10. Implement Timeline Engine v1 integration
  - [x] 10.1 Add isPlaying state to Timeline Engine v1 store
    - Add isPlaying boolean to TimelineState interface
    - Add setIsPlaying action to store
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 10.2 Wire CanvasRenderer to Timeline Engine v1
    - Subscribe to clips, tracks, playhead, isPlaying from store
    - Use shallow comparison for performance
    - Invalidate frame cache when clips/tracks change
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x] 10.3 Replace VideoPlayer component with CanvasRenderer
    - Update TimelineContainer to use CanvasRenderer
    - Remove old VideoPlayer component
    - Set canvas dimensions (1920x1080 or configurable)
    - _Requirements: 15.1, 15.2_

  - [x] 10.4 Write integration tests for Timeline Engine v1
    - Test Zustand store subscription
    - Test reactive rendering on state changes
    - Test playhead synchronization
    - Test track visibility updates
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement error handling
  - [x] 12.1 Add error handling to VideoPool
    - Wrap video loading in try-catch
    - Emit error events with file path and error reason
    - Continue operation after errors
    - _Requirements: 1.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 12.2 Add error handling to SeekManager
    - Wrap seek operations in try-catch
    - Log seek failures with context
    - Use current frame on seek failure
    - _Requirements: 3.5, 10.2, 10.3_

  - [x] 12.3 Add error handling to RenderEngine
    - Wrap drawImage in try-catch
    - Skip invalid clips and continue rendering
    - Display error placeholder for failed clips
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 12.4 Add error handling to CanvasRenderer
    - Handle canvas context loss
    - Validate clip data before processing
    - Display error messages for render failures
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 12.5 Write property test for error recovery
    - **Property 30: Error Recovery - Continue Rendering**
    - **Validates: Requirements 10.1, 10.2, 10.4**

  - [x] 12.6 Write property test for error event emission
    - **Property 31: Error Event Emission with Context**
    - **Validates: Requirements 10.6**

  - [x] 12.7 Write unit tests for error handling
    - Test video load failures with specific error scenarios
    - Test seek failures with specific error scenarios
    - Test render failures with specific error scenarios
    - Test canvas context loss recovery
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 13. Implement frame accuracy and synchronization
  - [x] 13.1 Add frame accuracy verification
    - Track last rendered time
    - Calculate frame accuracy (target vs actual)
    - Log warnings when accuracy exceeds 0.033 seconds
    - _Requirements: 6.5, 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

  - [x] 13.2 Implement timeline duration boundary clamping
    - Clamp playhead to [0, timeline.duration]
    - Validate timeline time in renderFrame
    - _Requirements: 6.7_

  - [x] 13.3 Write property test for frame accuracy
    - **Property 26: Frame Accuracy Synchronization**
    - **Validates: Requirements 6.5, 23.1**

  - [x] 13.4 Write property test for timeline duration boundary
    - **Property 27: Timeline Duration Boundary**
    - **Validates: Requirements 6.7**

  - [x] 13.5 Write unit tests for frame accuracy
    - Test frame accuracy calculation with specific playhead positions
    - Test timeline duration clamping with specific values
    - _Requirements: 6.5, 6.7, 23.1_

- [x] 14. Implement track visibility and rendering
  - [x] 14.1 Add track visibility handling
    - Filter clips by track visibility in FrameResolver
    - Re-render on track visibility changes
    - Maintain correct track order for visible tracks
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 14.2 Write property test for visible tracks rendering
    - **Property 28: Visible Tracks Only Rendering**
    - **Validates: Requirements 7.4**

  - [x] 14.3 Write unit tests for track visibility
    - Test visibility filtering with specific track states
    - Test re-rendering on visibility changes
    - Test track order with mixed visibility
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement render cancellation and optimization
  - [x] 16.1 Add render cancellation
    - Cancel pending RAF on new render request
    - Cancel pending seeks on new seek request
    - Track render state (isRendering flag)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 16.2 Write property test for render cancellation
    - **Property 29: Render Cancellation**
    - **Validates: Requirements 9.3**

  - [x] 16.3 Write unit tests for render cancellation
    - Test RAF cancellation on new render
    - Test seek cancellation on new seek
    - Test render state tracking
    - _Requirements: 9.3, 9.4_

- [x] 17. Implement serialization and parsing
  - [x] 17.1 Create CanvasCompositorParser class
    - Implement serialize method for VideoPool state
    - Implement parse method with JSON validation
    - Implement schema validation
    - Handle missing optional fields with defaults
    - Return descriptive errors for invalid JSON
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

  - [x] 17.2 Write property test for serialization round-trip
    - **Property 32: Serialization Round-Trip**
    - **Validates: Requirements 21.1, 21.2, 21.6**

  - [x] 17.3 Write property test for JSON validation
    - **Property 33: JSON Validation**
    - **Validates: Requirements 21.3**

  - [x] 17.4 Write property test for invalid JSON errors
    - **Property 34: Invalid JSON Error Messages**
    - **Validates: Requirements 21.4**

  - [x] 17.5 Write property test for default values
    - **Property 35: Default Values for Missing Fields**
    - **Validates: Requirements 21.7**

  - [x] 17.6 Write unit tests for serialization
    - Test round-trip serialization with specific states
    - Test parsing with missing optional fields
    - Test validation with specific invalid JSON
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

- [x] 18. Implement performance optimizations
  - [x] 18.1 Add memoization for expensive calculations
    - Memoize active clip resolution
    - Memoize aspect ratio calculations
    - Use React.memo for CanvasRenderer component
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 18.2 Optimize canvas rendering
    - Use requestAnimationFrame for smooth updates
    - Debounce scroll events
    - Cancel in-progress operations on changes
    - _Requirements: 9.2, 9.3, 9.5_

  - [x] 18.3 Optimize for large timelines
    - Ensure frame resolution works for 100+ clips
    - Maintain 60 FPS during playback
    - Target < 16ms render time for 5 clips
    - _Requirements: 2.7, 5.6, 9.6_

  - [x] 18.4 Write performance tests
    - Test render time for 5 active clips (target < 16ms)
    - Test frame rate during playback (target 60 FPS)
    - Test seek reduction from debouncing (target 80%)
    - Test cache hit rate during scrubbing (target 50% improvement)
    - Test memory usage with 10 videos (target < 500MB)
    - _Requirements: 2.7, 5.6, 9.6, 13.7, 18.7, 20.7_

- [x] 19. Implement clip boundary handling
  - [x] 19.1 Add clip boundary detection
    - Detect when playhead enters clip time range
    - Detect when playhead exits clip time range
    - Handle zero-duration clips
    - Handle clips at timeline boundaries
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

  - [x] 19.2 Write unit tests for clip boundaries
    - Test clip appearance at start time
    - Test clip disappearance at end time
    - Test zero-duration clips
    - Test clips at time 0 and timeline duration
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

- [x] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Implement video loading states
  - [x] 21.1 Add loading indicators
    - Display loading indicator during video metadata load
    - Display loading indicator during seek operations
    - Display last rendered frame during seeks
    - Display "No clips at this position" message when no active clips
    - Display "Loading preview..." message during initialization
    - Display error message for failed video loads
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 21.2 Write unit tests for loading states
    - Test loading indicator display during metadata load
    - Test loading indicator display during seeks
    - Test error message display for failed loads
    - _Requirements: 17.1, 17.2, 17.3, 17.6_

- [x] 22. Implement memory management
  - [x] 22.1 Add memory management optimizations
    - Limit VideoPool to 10 simultaneous videos
    - Implement LRU eviction when pool reaches capacity
    - Release ImageBitmap objects on cache eviction
    - Use single canvas element for all rendering
    - Reuse canvas context for all operations
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 25.7_

  - [x] 22.2 Write unit tests for memory management
    - Test VideoPool capacity limit (10 videos)
    - Test LRU eviction when capacity reached
    - Test ImageBitmap cleanup on eviction
    - _Requirements: 18.1, 18.2, 18.3_

- [x] 23. Integration and wiring
  - [x] 23.1 Wire all components together
    - Connect CanvasRenderer with all subsystems
    - Integrate with Timeline Engine v1 store
    - Wire playhead synchronization
    - Wire track visibility controls
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 23.2 Update App.tsx to use CanvasRenderer
    - Replace VideoPlayer with CanvasRenderer
    - Configure canvas dimensions
    - Test end-to-end workflow
    - _Requirements: 15.1, 15.2_

  - [x] 23.3 Write integration tests
    - Test complete render pipeline with mock videos
    - Test Timeline Engine v1 integration
    - Test RAF loop during playback
    - Test scrubbing performance
    - Test error recovery scenarios
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- The implementation uses TypeScript, React 19, Zustand (Timeline Engine v1), and HTML5 Canvas
- Property-based tests use fast-check library with minimum 100 iterations
- 35 correctness properties are defined in the design document
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end workflows
- Performance tests ensure 60 FPS target for up to 5 simultaneous video tracks
