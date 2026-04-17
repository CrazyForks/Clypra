# Implementation Plan: Timeline Engine v1

## Overview

This implementation plan converts the Timeline Engine design into a series of incremental coding tasks. The timeline system is built with React 19, TypeScript, Zustand state management, and Tailwind CSS v4. The implementation follows a bottom-up approach: core utilities first, then state management, then UI components, and finally integration and export features.

## Tasks

- [x] 1. Set up core utilities and type definitions
  - Create TypeScript interfaces for Clip, Track, DragState, TrimState, SnapTarget
  - Create TimelineState interface with all state properties and actions
  - Define error types and error codes (TimelineError class)
  - Create utility functions for clamping, time formatting, and validation
  - _Requirements: 15.2, 15.3, 15.4, 22.6_

- [x] 1.1 Write unit tests for utility functions
  - Test time formatting for various durations (MM:SS, HH:MM:SS)
  - Test clamp function with boundary conditions
  - Test validation functions for clip constraints
  - _Requirements: 15.2, 22.6_

- [x] 2. Implement coordinate system
  - [x] 2.1 Create CoordinateSystem class with timeToPixels and pixelsToTime methods
    - Implement bidirectional time ↔ pixel conversion
    - Add zoom constraints (16-320 px/sec)
    - Implement zoomToCursor method for stable zoom behavior
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4_

  - [x] 2.2 Write unit tests for coordinate system
    - Test time-to-pixel conversion at various zoom levels
    - Test pixel-to-time conversion accuracy
    - Test zoom-to-cursor behavior maintains time under cursor
    - Test zoom clamping at boundaries
    - _Requirements: 1.1, 1.2, 1.6, 2.4_

  - [x] 2.3 Add frame quantization support
    - Implement quantizeToFrame method for frame-accurate positioning
    - Support multiple frame rates (24, 25, 30, 50, 60 FPS)
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.7_

  - [x] 2.4 Write unit tests for frame quantization
    - Test frame boundary calculation for different FPS values
    - Test quantization accuracy within 0.001 seconds
    - _Requirements: 24.2, 24.7_

- [x] 3. Implement snap system
  - [x] 3.1 Create SnapSystem class with snap detection logic
    - Implement findSnapTarget method with 8-pixel threshold
    - Support snap-to-playhead, snap-to-clips, snap-to-markers
    - Implement priority selection for closest snap target
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

  - [x] 3.2 Write unit tests for snap system
    - Test snap threshold detection (within 8 pixels)
    - Test snap priority when multiple targets are in range
    - Test snap target type identification
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Zustand state store
  - [x] 5.1 Create timeline store with initial state structure
    - Define state with clips Map, tracks Map, playhead, duration, zoom
    - Add selection state (selectedClipIds Set)
    - Add interaction state (dragState, trimState)
    - Add snap settings (snapToPlayhead, snapToClips, snapToMarkers)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 5.2 Implement clip management actions
    - Implement addClip action with validation
    - Implement updateClip action for property updates
    - Implement deleteClip action with cleanup
    - Implement moveClip action with boundary checks
    - Implement trimClip action with duration constraints
    - Implement splitClip action at playhead position
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.4, 6.5, 7.5, 7.6, 12.2, 12.3, 12.4, 12.5, 13.3_

  - [x] 5.3 Implement track management actions
    - Implement addTrack, updateTrack, deleteTrack actions
    - Implement track reordering logic
    - Implement track lock/visibility/mute toggles
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 5.4 Implement playhead and view state actions
    - Implement setPlayhead with boundary clamping
    - Implement setZoom with min/max constraints
    - Implement setScroll for viewport tracking
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 2.4, 15.4_

  - [x] 5.5 Implement selection actions
    - Implement selectClip with multi-select support (Ctrl+click)
    - Implement range selection (Shift+click)
    - Implement deselectAll action
    - _Requirements: 19.1, 19.2, 19.3, 19.5_

  - [x] 5.6 Write unit tests for store actions
    - Test clip CRUD operations
    - Test track management operations
    - Test selection state updates
    - Test boundary validation in actions
    - _Requirements: 15.1, 15.5, 15.6_

- [x] 6. Implement undo/redo system
  - [x] 6.1 Create UndoManager class with history stack
    - Implement pushState to save timeline snapshots
    - Implement undo to restore previous state
    - Implement redo to reapply undone operations
    - Limit history to 50 levels
    - Clear redo history on new operations
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 6.2 Integrate undo/redo into store actions
    - Add snapshot capture before state-modifying operations
    - Implement undo and redo store actions
    - Add keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
    - _Requirements: 14.6, 14.7_

  - [x] 6.3 Write unit tests for undo/redo
    - Test undo restores previous state correctly
    - Test redo reapplies operations
    - Test history limit enforcement
    - Test redo history clearing on new operations
    - _Requirements: 14.2, 14.3, 14.4, 14.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement time ruler component
  - [x] 8.1 Create TimeRuler component with tick calculation
    - Calculate major tick intervals based on zoom level (1s, 2s, 5s, 10s)
    - Render major tick marks with time labels
    - Format labels as MM:SS or HH:MM:SS based on duration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 8.2 Add subdivision tick marks
    - Render tenth-second ticks when zoom >= 26 px/sec
    - Render frame ticks when zoom >= 70 px/sec and px/frame >= 11
    - Use 2-frame or 4-frame intervals for frame ticks
    - _Requirements: 2.5, 2.6, 2.7, 3.8, 24.6_

  - [x] 8.3 Add sticky positioning for ruler
    - Make ruler sticky at top during vertical scroll
    - Ensure ruler stays visible during timeline navigation
    - _Requirements: 25.3_

  - [x] 8.4 Write unit tests for ruler calculations
    - Test tick interval selection at different zoom levels
    - Test time label formatting
    - Test subdivision visibility thresholds
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 9. Implement playhead component
  - [x] 9.1 Create Playhead component with visual design
    - Render vertical line with triangular handle
    - Position absolutely relative to viewport (not scrolled content)
    - Apply drop shadow and gradient styling
    - _Requirements: 4.6, 4.7_

  - [x] 9.2 Implement playhead interaction handlers
    - Handle click on timeline to move playhead
    - Handle drag on timeline to scrub playhead
    - Synchronize playhead with video player current time
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 9.3 Implement auto-scroll for playhead
    - Auto-scroll viewport when playhead moves outside visible area
    - Maintain 15% margin from viewport edges
    - _Requirements: 4.5_

  - [x] 9.4 Write unit tests for playhead positioning
    - Test playhead position calculation at various zoom levels
    - Test auto-scroll trigger conditions
    - _Requirements: 4.5, 4.7_

- [x] 10. Implement track header component
  - [x] 10.1 Create TimelineTrackHeaders component
    - Render track names and type icons
    - Add lock, visibility, and mute toggle buttons
    - Apply sticky positioning for horizontal scroll
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 25.4_

  - [x] 10.2 Implement track reordering
    - Add drag handles for track reordering
    - Update track order in store on drop
    - _Requirements: 9.8_

  - [x] 10.3 Write unit tests for track header interactions
    - Test lock toggle prevents clip editing
    - Test visibility toggle affects rendering
    - Test mute toggle affects audio
    - _Requirements: 9.5, 9.6, 9.7_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement clip rendering component
  - [x] 12.1 Create Clip component with visual layout
    - Render clip container with position and width from coordinate system
    - Display clip name and duration label
    - Apply track-specific styling (video, audio, text colors)
    - Render selection highlight border when selected
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 19.5_

  - [x] 12.2 Add trim handles to clip edges
    - Render left and right trim handles
    - Show resize cursor on hover
    - Apply visual styling for handle affordance
    - _Requirements: 7.1, 7.2_

  - [x] 12.3 Implement clip virtualization
    - Calculate visible clips based on viewport and scroll position
    - Only render clips within viewport plus buffer
    - Use 2-second buffer for smooth scrolling
    - _Requirements: 16.1, 16.6_

  - [x] 12.4 Write unit tests for clip positioning
    - Test clip position calculation at various zoom levels
    - Test minimum width enforcement (8 pixels)
    - Test virtualization viewport calculation
    - _Requirements: 5.1, 5.2, 5.3, 16.1_

- [x] 13. Implement waveform visualization
  - [x] 13.1 Create Waveform canvas component
    - Render waveform using HTML5 Canvas
    - Support high-DPI displays with device pixel ratio scaling
    - Draw symmetric bars from center line
    - Apply emerald color styling
    - _Requirements: 10.1, 10.2, 10.5, 10.6_

  - [x] 13.2 Integrate waveform data loading
    - Call Tauri backend to generate waveform peaks
    - Use 1000 sample buckets for waveform data
    - Display loading indicator during generation
    - Handle generation failures gracefully
    - _Requirements: 10.3, 10.4, 10.7, 22.2_

  - [x] 13.3 Write unit tests for waveform rendering
    - Test canvas scaling for high-DPI displays
    - Test waveform bar positioning and sizing
    - _Requirements: 10.5, 10.6_

- [x] 14. Implement filmstrip visualization
  - [x] 14.1 Create useFilmstrip hook for thumbnail generation
    - Call Tauri backend to extract video frames
    - Generate 18-72 frames based on clip duration
    - Compress as JPEG with 0.85 quality
    - Maintain source aspect ratio
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 14.2 Integrate filmstrip into clip component
    - Display filmstrip as background image
    - Show loading indicator during generation
    - Handle generation failures gracefully
    - _Requirements: 11.7, 22.3_

  - [x] 14.3 Write unit tests for filmstrip generation
    - Test frame count calculation based on duration
    - Test aspect ratio preservation
    - _Requirements: 11.2, 11.5_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement clip drag interaction
  - [x] 16.1 Create useClipDrag hook
    - Handle pointer down to initiate drag
    - Track pointer movement and calculate time offset
    - Support multi-clip drag for selected clips
    - Apply snap system during drag
    - _Requirements: 6.1, 6.2, 6.6, 6.7, 19.6_

  - [x] 16.2 Implement drag commit and validation
    - Commit new clip positions on pointer up
    - Clamp clip positions to timeline boundaries
    - Prevent negative start times
    - Add operation to undo history
    - _Requirements: 6.3, 6.4, 6.5, 14.6_

  - [x] 16.3 Write integration tests for clip dragging
    - Test drag updates clip position correctly
    - Test multi-clip drag maintains relative positions
    - Test snap alignment during drag
    - _Requirements: 6.2, 6.6, 19.6_

- [x] 17. Implement clip trim interaction
  - [x] 17.1 Create useClipTrim hook
    - Handle pointer down on trim handles
    - Track pointer movement and calculate new trim boundaries
    - Apply snap system during trim
    - Prevent trim beyond source media boundaries
    - _Requirements: 7.3, 7.4, 7.6, 7.7_

  - [x] 17.2 Implement trim validation and commit
    - Enforce minimum clip duration (0.1 seconds)
    - Clamp trim to timeline boundaries
    - Commit trim on pointer up
    - Add operation to undo history
    - _Requirements: 7.5, 14.6_

  - [x] 17.3 Write integration tests for clip trimming
    - Test trim start adjusts start time and duration
    - Test trim end adjusts duration only
    - Test minimum duration enforcement
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 18. Implement clip split operation
  - [x] 18.1 Add split action to store
    - Validate playhead is within clip boundaries
    - Create two new clips from split
    - Set correct start times and durations for both clips
    - Remove original clip
    - Preserve clip properties in both new clips
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 18.2 Add split keyboard shortcut (S key)
    - Implement keyboard handler for split tool activation
    - Apply split to clip under playhead
    - Add operation to undo history
    - _Requirements: 17.7, 14.6_

  - [x] 18.3 Write unit tests for clip splitting
    - Test split creates two clips with correct times
    - Test split preserves clip properties
    - Test split validation when playhead outside clip
    - _Requirements: 12.2, 12.3, 12.4, 12.6, 12.7_

- [x] 19. Implement clip deletion
  - [x] 19.1 Add delete action to store
    - Remove clip from clips Map
    - Remove clip from selection if selected
    - Add operation to undo history
    - _Requirements: 13.1, 13.2, 13.3, 13.6_

  - [x] 19.2 Implement delete keyboard shortcut
    - Handle Delete key press
    - Delete all selected clips
    - Prevent deletion of locked clips
    - _Requirements: 13.1, 13.5, 17.6_

  - [x] 19.3 Write unit tests for clip deletion
    - Test single clip deletion
    - Test multi-clip deletion
    - Test locked clip protection
    - _Requirements: 13.1, 13.3, 13.5_

- [x] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Implement multi-clip selection
  - [x] 21.1 Add selection rectangle drag
    - Handle pointer down on empty timeline area
    - Draw selection rectangle during drag
    - Select all clips intersecting rectangle on pointer up
    - _Requirements: 19.4, 19.5_

  - [x] 21.2 Implement Ctrl+click and Shift+click selection
    - Toggle individual clip selection with Ctrl+click
    - Select range between clips with Shift+click
    - Update selection state in store
    - _Requirements: 19.2, 19.3_

  - [x] 21.3 Write integration tests for selection
    - Test rectangle selection captures intersecting clips
    - Test Ctrl+click toggles selection
    - Test Shift+click selects range
    - _Requirements: 19.2, 19.3, 19.4_

- [x] 22. Implement keyboard shortcuts
  - [x] 22.1 Create keyboard event handler
    - Handle Space for play/pause toggle
    - Handle Left/Right arrows for frame stepping
    - Handle Home/End for playhead navigation
    - Handle Plus/Minus for zoom control
    - Handle V for selection tool, S for split tool
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.8, 17.9, 17.10_

  - [x] 22.2 Integrate keyboard shortcuts with store actions
    - Connect shortcuts to playhead movement actions
    - Connect shortcuts to zoom actions
    - Connect shortcuts to tool activation
    - Prevent shortcuts when typing in form elements
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.9, 17.10_

  - [x] 22.3 Write unit tests for keyboard shortcuts
    - Test each shortcut triggers correct action
    - Test shortcuts are disabled in form elements
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 23. Implement scroll and pan
  - [x] 23.1 Add scroll container with overflow handling
    - Enable horizontal and vertical scrolling
    - Track scroll position in store
    - Update visible clip range on scroll
    - _Requirements: 25.1, 25.2, 25.6_

  - [x] 23.2 Implement trackpad pinch zoom
    - Listen for wheel events with Ctrl key
    - Calculate zoom factor from deltaY
    - Apply zoom-to-cursor behavior
    - Update scroll position to maintain cursor stability
    - _Requirements: 2.1, 2.3_

  - [x] 23.3 Maintain scroll position during zoom
    - Preserve scroll position when zooming (except zoom-to-cursor)
    - Keep playhead visible during scroll
    - _Requirements: 25.7, 4.5_

  - [x] 23.4 Write integration tests for scroll and zoom
    - Test scroll updates visible clip range
    - Test pinch zoom maintains cursor position
    - _Requirements: 2.3, 25.6_

- [x] 24. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Implement track type constraints
  - [x] 25.1 Add track type validation to clip operations
    - Validate clip type matches track type on add/move
    - Show warning message for incompatible types
    - Allow video+audio clips on video tracks
    - Extract audio only for video clips on audio tracks
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_

  - [x] 25.2 Add visual track type indicators
    - Display track type icons in track headers
    - Apply color coding for track types
    - _Requirements: 23.7_

  - [x] 25.3 Write unit tests for track type validation
    - Test validation prevents incompatible clip placement
    - Test video clips allowed on video tracks
    - Test audio extraction for video clips on audio tracks
    - _Requirements: 23.1, 23.2, 23.3, 23.5, 23.6_

- [x] 26. Implement timeline serialization
  - [x] 26.1 Create timeline JSON serialization
    - Implement toJSON method in store
    - Serialize clips, tracks, playhead, zoom, and settings
    - Format JSON with proper indentation
    - _Requirements: 15.7, 21.1, 21.5_

  - [x] 26.2 Create timeline JSON parsing
    - Implement fromJSON method in store
    - Validate JSON structure against schema
    - Handle missing optional fields with defaults
    - Return descriptive errors for invalid JSON
    - _Requirements: 21.2, 21.3, 21.4, 21.7_

  - [x] 26.3 Write unit tests for serialization
    - Test round-trip serialization produces equivalent state
    - Test parsing handles missing optional fields
    - Test validation catches invalid JSON
    - _Requirements: 21.6, 21.7_

- [x] 27. Implement export pipeline
  - [x] 27.1 Create ExportPipeline class
    - Implement generateFFmpegCommand method
    - Group clips by source media
    - Build input arguments for each source file
    - _Requirements: 18.1, 18.2_

  - [x] 27.2 Implement FFmpeg filter chain generation
    - Build trim and position filters for each clip
    - Layer clips according to track order
    - Respect track mute and visibility settings
    - Generate overlay chain for multi-track composition
    - _Requirements: 18.3, 18.4, 18.5_

  - [x] 27.3 Add export validation and execution
    - Validate all source media files exist before export
    - Return descriptive error for missing files
    - Execute FFmpeg command via Tauri backend
    - Report progress percentage during export
    - _Requirements: 18.6, 18.7, 18.8, 18.9_

  - [x] 27.4 Write unit tests for FFmpeg command generation
    - Test command generation for single clip
    - Test command generation for multi-track timeline
    - Test filter chain respects track order
    - Test mute and visibility settings affect output
    - _Requirements: 18.2, 18.3, 18.4, 18.5_

- [x] 28. Implement error handling
  - [x] 28.1 Create TimelineError class and error codes
    - Define error codes for all error scenarios
    - Implement recoverable vs non-recoverable error handling
    - _Requirements: 22.6_

  - [x] 28.2 Add error handling to store actions
    - Wrap state-modifying operations in try-catch
    - Show user-friendly error messages for recoverable errors
    - Log errors with context for debugging
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

  - [x] 28.3 Add error UI components
    - Display error messages for media load failures
    - Show fallback messages for waveform/filmstrip failures
    - Display FFmpeg errors during export
    - Show tooltip explanations for invalid operations
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [x] 28.4 Write unit tests for error handling
    - Test error messages are descriptive
    - Test recoverable errors don't crash
    - Test invalid operations are prevented
    - _Requirements: 22.5, 22.6, 22.7_

- [x] 29. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 30. Implement accessibility features
  - [x] 30.1 Add ARIA labels to interactive elements
    - Label all buttons, sliders, and controls
    - Add role attributes for custom components
    - _Requirements: 20.1_

  - [x] 30.2 Implement keyboard navigation
    - Ensure all operations accessible via keyboard
    - Add visible focus indicators
    - Support Tab navigation through timeline elements
    - _Requirements: 20.2, 20.3_

  - [x] 30.3 Add screen reader announcements
    - Use ARIA live regions for state changes
    - Announce clip operations (drag, trim, split, delete)
    - Announce playhead position changes
    - _Requirements: 20.4_

  - [x] 30.4 Ensure visual accessibility
    - Verify 4.5:1 contrast ratio for text elements
    - Test browser zoom up to 200%
    - Provide text alternatives for waveforms and filmstrips
    - _Requirements: 20.5, 20.6, 20.7_

  - [x] 30.5 Write accessibility tests
    - Test ARIA labels are present
    - Test keyboard navigation works
    - Test focus indicators are visible
    - _Requirements: 20.1, 20.2, 20.3_

- [x] 31. Implement performance optimizations
  - [x] 31.1 Add memoization for expensive calculations
    - Memoize ruler tick calculations
    - Memoize clip position calculations
    - Memoize visible clip filtering
    - _Requirements: 16.4_

  - [x] 31.2 Optimize canvas rendering
    - Use requestAnimationFrame for smooth updates
    - Debounce scroll events
    - Cancel in-progress waveform/filmstrip generation on changes
    - _Requirements: 16.2, 16.3, 16.5_

  - [x] 31.3 Optimize for large timelines
    - Ensure virtualization works for 100+ clips
    - Maintain 60 FPS during playhead scrubbing
    - Load and render 100-clip timeline in under 2 seconds
    - _Requirements: 16.1, 16.6, 16.7_

  - [x] 31.4 Write performance tests
    - Test render time for 100-clip timeline
    - Test frame rate during playhead scrubbing
    - Test virtualization reduces DOM nodes
    - _Requirements: 16.1, 16.6, 16.7_

- [x] 32. Integration and wiring
  - [x] 32.1 Wire timeline components together
    - Connect TimelineContainer with all child components
    - Integrate store with all components via hooks
    - Connect keyboard shortcuts to global event listeners
    - Wire playhead synchronization with video player
    - _Requirements: 4.3, 15.6_

  - [x] 32.2 Integrate with existing Kyro editor
    - Update App.tsx to use new timeline store
    - Replace existing Timeline component with new implementation
    - Ensure video player synchronization works
    - Test import/export workflow end-to-end
    - _Requirements: 4.3, 18.6_

  - [x] 32.3 Write integration tests
    - Test complete user workflows (import, edit, export)
    - Test component interactions
    - Test state synchronization across components
    - _Requirements: 15.6, 4.3_

- [x] 33. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- The implementation uses TypeScript, React 19, Zustand, and Tailwind CSS v4
- Property-based tests are not included as the design does not define universal correctness properties
- Unit and integration tests validate specific examples and edge cases
- The timeline integrates with existing Tauri backend for FFmpeg operations
