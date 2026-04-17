# Requirements Document: Timeline Engine v1

## Introduction

The Timeline Engine is a professional-grade video editing timeline system for the Kyro video editor. It provides frame-accurate editing capabilities, multi-layer composition, real-time scrubbing, and visual feedback similar to industry-standard tools like CapCut and Adobe Premiere Pro. The system enables users to arrange, trim, and manipulate video clips on a horizontal timeline with precise temporal control.

## Glossary

- **Timeline_Engine**: The complete timeline system including state management, rendering, and user interactions
- **Clip**: A video, audio, or text segment placed on the timeline with defined start time, duration, and track assignment
- **Track**: A horizontal layer on the timeline that contains clips (video, audio, text, or effects)
- **Playhead**: The vertical indicator showing the current playback position in time
- **Time_Ruler**: The horizontal scale at the top of the timeline showing time markers and frame numbers
- **Pixels_Per_Second**: The zoom level determining how many pixels represent one second of time
- **Trim_Handle**: The draggable edge of a clip used to adjust its start or end time
- **Snap_System**: The magnetic alignment system that helps clips align to the playhead, other clips, or time markers
- **Waveform**: Visual representation of audio amplitude over time
- **Filmstrip**: Horizontal strip of video thumbnails representing visual content
- **Coordinate_System**: The mapping between time (seconds) and horizontal position (pixels)
- **State_Manager**: The centralized state management system (Zustand or similar) that maintains timeline data
- **Video_Preview**: The video player component synchronized with the timeline playhead
- **Export_Pipeline**: The FFmpeg-based system that renders the final video based on timeline edits

## Requirements

### Requirement 1: Timeline Coordinate System

**User Story:** As a video editor, I want a consistent coordinate system, so that I can understand the relationship between time and visual position on the timeline.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL map time values to horizontal pixel positions using the formula: `x = time * Pixels_Per_Second`
2. THE Timeline_Engine SHALL map horizontal pixel positions to time values using the formula: `time = x / Pixels_Per_Second`
3. WHEN the Pixels_Per_Second value changes, THE Timeline_Engine SHALL recalculate all clip positions while preserving their time values
4. THE Timeline_Engine SHALL maintain a minimum Pixels_Per_Second value of 16 pixels per second
5. THE Timeline_Engine SHALL maintain a maximum Pixels_Per_Second value of 320 pixels per second
6. FOR ALL time-to-pixel conversions followed by pixel-to-time conversions, THE Timeline_Engine SHALL produce time values within 0.001 seconds of the original (round-trip property)

### Requirement 2: Zoom Control

**User Story:** As a video editor, I want to zoom in and out of the timeline, so that I can see fine details or get an overview of my project.

#### Acceptance Criteria

1. WHEN the user performs a pinch gesture on a trackpad, THE Timeline_Engine SHALL adjust the Pixels_Per_Second value proportionally to the gesture magnitude
2. WHEN the user adjusts the zoom slider, THE Timeline_Engine SHALL update the Pixels_Per_Second value to match the slider position
3. WHEN zooming occurs, THE Timeline_Engine SHALL keep the time value under the cursor position stable (zoom-to-cursor behavior)
4. THE Timeline_Engine SHALL clamp zoom values between 16 and 320 pixels per second
5. WHEN the Pixels_Per_Second value is below 26, THE Timeline_Engine SHALL hide tenth-second tick marks
6. WHEN the Pixels_Per_Second value is below 70, THE Timeline_Engine SHALL hide frame tick marks
7. WHEN the Pixels_Per_Second value is 70 or above AND pixels per frame is 11 or greater, THE Timeline_Engine SHALL display frame tick marks at 2-frame or 4-frame intervals

### Requirement 3: Time Ruler Display

**User Story:** As a video editor, I want to see time markers on the timeline, so that I can understand the temporal position of clips.

#### Acceptance Criteria

1. THE Time_Ruler SHALL display major tick marks at intervals determined by the current zoom level
2. WHEN Pixels_Per_Second is 100 or greater, THE Time_Ruler SHALL use 1-second intervals for major ticks
3. WHEN Pixels_Per_Second is between 48 and 99, THE Time_Ruler SHALL use 2-second intervals for major ticks
4. WHEN Pixels_Per_Second is between 24 and 47, THE Time_Ruler SHALL use 5-second intervals for major ticks
5. WHEN Pixels_Per_Second is below 24, THE Time_Ruler SHALL use 10-second intervals for major ticks
6. THE Time_Ruler SHALL display time labels in MM:SS format for times under 60 minutes
7. THE Time_Ruler SHALL display time labels in HH:MM:SS format for times 60 minutes or longer
8. WHEN Pixels_Per_Second is 26 or greater, THE Time_Ruler SHALL display tenth-second subdivision marks

### Requirement 4: Playhead Control

**User Story:** As a video editor, I want to control the playhead position, so that I can navigate to specific points in my video.

#### Acceptance Criteria

1. WHEN the user clicks on the timeline, THE Timeline_Engine SHALL move the Playhead to the clicked time position
2. WHEN the user drags on the timeline, THE Timeline_Engine SHALL continuously update the Playhead position to follow the pointer
3. THE Timeline_Engine SHALL synchronize the Playhead position with the Video_Preview current time
4. WHEN the Video_Preview time updates during playback, THE Timeline_Engine SHALL update the Playhead visual position
5. WHEN the Playhead moves outside the visible viewport, THE Timeline_Engine SHALL auto-scroll to keep the Playhead visible with a 15% margin
6. THE Playhead SHALL be rendered as a vertical line with a triangular handle at the top
7. THE Playhead SHALL remain visible when scrolling horizontally (positioned absolutely relative to viewport)

### Requirement 5: Clip Positioning

**User Story:** As a video editor, I want to place clips at specific times on the timeline, so that I can arrange my video content.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL position each Clip at horizontal coordinate `x = Clip.startTime * Pixels_Per_Second`
2. THE Timeline_Engine SHALL render each Clip with width `w = Clip.duration * Pixels_Per_Second`
3. WHEN a Clip duration is less than 0.01 seconds, THE Timeline_Engine SHALL render the Clip with a minimum width of 8 pixels
4. THE Timeline_Engine SHALL assign each Clip to exactly one Track
5. THE Timeline_Engine SHALL render Clips on higher-numbered Tracks above Clips on lower-numbered Tracks
6. WHEN two Clips on the same Track overlap in time, THE Timeline_Engine SHALL render the later Clip above the earlier Clip

### Requirement 6: Clip Dragging

**User Story:** As a video editor, I want to drag clips to different positions, so that I can rearrange my video sequence.

#### Acceptance Criteria

1. WHEN the user presses the pointer on a Clip, THE Timeline_Engine SHALL enter drag mode for that Clip
2. WHILE in drag mode, THE Timeline_Engine SHALL update the Clip start time based on pointer horizontal movement
3. WHEN the user releases the pointer, THE Timeline_Engine SHALL commit the new Clip position and exit drag mode
4. THE Timeline_Engine SHALL clamp Clip start times to be non-negative
5. THE Timeline_Engine SHALL clamp Clip end times to not exceed the total timeline duration
6. WHEN the Snap_System is enabled AND the Clip edge is within 8 pixels of a snap target, THE Timeline_Engine SHALL align the Clip to the snap target
7. THE Timeline_Engine SHALL provide visual feedback during dragging by updating the Clip position in real-time

### Requirement 7: Clip Trimming

**User Story:** As a video editor, I want to trim the start and end of clips, so that I can remove unwanted portions.

#### Acceptance Criteria

1. WHEN the user hovers over the left edge of a Clip, THE Timeline_Engine SHALL display a resize cursor
2. WHEN the user hovers over the right edge of a Clip, THE Timeline_Engine SHALL display a resize cursor
3. WHEN the user drags the left Trim_Handle, THE Timeline_Engine SHALL adjust the Clip start time while keeping the end time fixed
4. WHEN the user drags the right Trim_Handle, THE Timeline_Engine SHALL adjust the Clip end time while keeping the start time fixed
5. THE Timeline_Engine SHALL prevent trimming that would result in a Clip duration less than 0.1 seconds
6. THE Timeline_Engine SHALL prevent trimming beyond the source media boundaries
7. WHEN the Snap_System is enabled AND a Trim_Handle is within 8 pixels of a snap target, THE Timeline_Engine SHALL snap the handle to the target

### Requirement 8: Snap System

**User Story:** As a video editor, I want clips to snap to important positions, so that I can align content precisely without manual adjustment.

#### Acceptance Criteria

1. WHEN snap-to-playhead is enabled AND a Clip edge is within 8 pixels of the Playhead, THE Snap_System SHALL align the Clip edge to the Playhead time
2. WHEN snap-to-clip is enabled AND a Clip edge is within 8 pixels of another Clip edge, THE Snap_System SHALL align the edges
3. WHEN snap-to-markers is enabled AND a Clip edge is within 8 pixels of a time marker, THE Snap_System SHALL align the Clip edge to the marker time
4. THE Snap_System SHALL provide visual feedback by displaying a vertical snap line at the snap position
5. THE Snap_System SHALL prioritize the closest snap target when multiple targets are within range
6. THE Timeline_Engine SHALL allow users to toggle snap-to-playhead, snap-to-clip, and snap-to-markers independently

### Requirement 9: Track Management

**User Story:** As a video editor, I want to organize clips into separate tracks, so that I can layer video, audio, and text content.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL support at least 10 simultaneous Tracks
2. THE Timeline_Engine SHALL assign each Track a unique identifier
3. THE Timeline_Engine SHALL assign each Track a type (video, audio, text, or effects)
4. THE Timeline_Engine SHALL render Track headers showing the Track name and type
5. WHEN the user clicks a Track lock button, THE Timeline_Engine SHALL prevent editing of Clips on that Track
6. WHEN the user clicks a Track visibility button, THE Timeline_Engine SHALL hide the Track from the Video_Preview
7. WHEN the user clicks a Track mute button, THE Timeline_Engine SHALL exclude the Track audio from playback and export
8. THE Timeline_Engine SHALL allow users to reorder Tracks by dragging Track headers

### Requirement 10: Waveform Visualization

**User Story:** As a video editor, I want to see audio waveforms, so that I can identify audio content and align clips to audio cues.

#### Acceptance Criteria

1. WHEN a Clip contains audio, THE Timeline_Engine SHALL generate a Waveform visualization
2. THE Waveform SHALL display audio amplitude as a vertical envelope centered in the Clip audio region
3. THE Timeline_Engine SHALL generate Waveform data by sampling audio peaks at regular intervals
4. THE Timeline_Engine SHALL use a default of 1000 sample buckets for Waveform generation
5. THE Waveform SHALL be rendered using HTML canvas for performance
6. THE Waveform SHALL support high-DPI displays by scaling canvas resolution with device pixel ratio
7. WHEN Waveform generation is in progress, THE Timeline_Engine SHALL display a loading indicator

### Requirement 11: Filmstrip Visualization

**User Story:** As a video editor, I want to see video thumbnails on the timeline, so that I can identify visual content without playing the video.

#### Acceptance Criteria

1. WHEN a Clip contains video, THE Timeline_Engine SHALL generate a Filmstrip of thumbnails
2. THE Filmstrip SHALL contain between 18 and 72 frames depending on Clip duration
3. THE Timeline_Engine SHALL extract frames at evenly-spaced intervals across the Clip duration
4. THE Filmstrip SHALL be rendered as a horizontal strip image with all frames side-by-side
5. THE Filmstrip SHALL maintain the source video aspect ratio without distortion
6. THE Timeline_Engine SHALL compress Filmstrip images as JPEG with 0.85 quality
7. WHEN Filmstrip generation is in progress, THE Timeline_Engine SHALL display a loading indicator

### Requirement 12: Clip Splitting

**User Story:** As a video editor, I want to split clips at the playhead position, so that I can separate content into multiple segments.

#### Acceptance Criteria

1. WHEN the user activates the split tool AND clicks on a Clip, THE Timeline_Engine SHALL split the Clip at the Playhead time
2. THE Timeline_Engine SHALL create two new Clips from the split operation
3. THE first new Clip SHALL have start time equal to the original Clip start time and end time equal to the Playhead time
4. THE second new Clip SHALL have start time equal to the Playhead time and end time equal to the original Clip end time
5. THE Timeline_Engine SHALL remove the original Clip after splitting
6. THE Timeline_Engine SHALL preserve all Clip properties (track assignment, effects, etc.) in both new Clips
7. IF the Playhead is not within the Clip boundaries, THEN THE Timeline_Engine SHALL not perform the split operation

### Requirement 13: Clip Deletion

**User Story:** As a video editor, I want to delete clips, so that I can remove unwanted content from my timeline.

#### Acceptance Criteria

1. WHEN the user selects a Clip AND presses the delete key, THE Timeline_Engine SHALL remove the Clip from the timeline
2. WHEN the user activates the delete tool AND clicks on a Clip, THE Timeline_Engine SHALL remove the Clip from the timeline
3. THE Timeline_Engine SHALL remove all references to the deleted Clip from the State_Manager
4. THE Timeline_Engine SHALL not automatically move other Clips to fill the gap (no ripple delete in MVP)
5. WHEN multiple Clips are selected, THE Timeline_Engine SHALL delete all selected Clips
6. THE Timeline_Engine SHALL add the delete operation to the undo history

### Requirement 14: Undo and Redo

**User Story:** As a video editor, I want to undo and redo my actions, so that I can experiment without fear of losing work.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL record all state-modifying operations in an undo history
2. WHEN the user activates undo, THE Timeline_Engine SHALL revert the most recent operation and restore the previous state
3. WHEN the user activates redo, THE Timeline_Engine SHALL reapply the most recently undone operation
4. THE Timeline_Engine SHALL support at least 50 undo levels
5. WHEN a new operation is performed after undo, THE Timeline_Engine SHALL clear the redo history
6. THE Timeline_Engine SHALL support undo for clip drag, trim, split, delete, and track operations
7. THE Timeline_Engine SHALL provide keyboard shortcuts Ctrl+Z for undo and Ctrl+Shift+Z for redo

### Requirement 15: State Management

**User Story:** As a developer, I want centralized state management, so that timeline data is consistent across all components.

#### Acceptance Criteria

1. THE State_Manager SHALL maintain a single source of truth for all timeline data
2. THE State_Manager SHALL store Clip data including id, startTime, duration, trackId, sourceMediaPath, and type
3. THE State_Manager SHALL store Track data including id, name, type, locked, visible, and muted properties
4. THE State_Manager SHALL store Playhead position, zoom level, and scroll position
5. THE State_Manager SHALL provide actions for all timeline operations (addClip, updateClip, deleteClip, etc.)
6. THE State_Manager SHALL notify subscribed components when state changes occur
7. THE State_Manager SHALL serialize timeline state to JSON for saving and loading projects

### Requirement 16: Performance Optimization

**User Story:** As a video editor, I want smooth timeline performance, so that I can work efficiently with large projects.

#### Acceptance Criteria

1. WHEN the timeline contains more than 100 Clips, THE Timeline_Engine SHALL use virtualization to render only visible Clips
2. THE Timeline_Engine SHALL use canvas rendering for Waveform visualization to minimize DOM nodes
3. THE Timeline_Engine SHALL debounce scroll events to reduce render frequency
4. THE Timeline_Engine SHALL memoize expensive calculations (ruler ticks, clip positions) based on dependencies
5. THE Timeline_Engine SHALL cancel in-progress Filmstrip and Waveform generation when the source changes
6. THE Timeline_Engine SHALL maintain 60 FPS during playhead scrubbing for timelines up to 1 hour duration
7. THE Timeline_Engine SHALL load and render a 100-clip timeline in under 2 seconds

### Requirement 17: Keyboard Shortcuts

**User Story:** As a video editor, I want keyboard shortcuts, so that I can work efficiently without constantly reaching for the mouse.

#### Acceptance Criteria

1. WHEN the user presses Space, THE Timeline_Engine SHALL toggle playback
2. WHEN the user presses Left Arrow, THE Timeline_Engine SHALL move the Playhead backward by 1 frame
3. WHEN the user presses Right Arrow, THE Timeline_Engine SHALL move the Playhead forward by 1 frame
4. WHEN the user presses Home, THE Timeline_Engine SHALL move the Playhead to time 0
5. WHEN the user presses End, THE Timeline_Engine SHALL move the Playhead to the timeline end
6. WHEN the user presses Delete, THE Timeline_Engine SHALL delete selected Clips
7. WHEN the user presses S, THE Timeline_Engine SHALL activate the split tool
8. WHEN the user presses V, THE Timeline_Engine SHALL activate the selection tool
9. WHEN the user presses Plus, THE Timeline_Engine SHALL zoom in
10. WHEN the user presses Minus, THE Timeline_Engine SHALL zoom out

### Requirement 18: Export Pipeline Integration

**User Story:** As a video editor, I want to export my edited timeline, so that I can share the final video.

#### Acceptance Criteria

1. WHEN the user initiates export, THE Export_Pipeline SHALL generate an FFmpeg command based on timeline state
2. THE Export_Pipeline SHALL include trim operations for each Clip based on startTime and duration
3. THE Export_Pipeline SHALL layer Clips according to Track order using FFmpeg filter_complex
4. THE Export_Pipeline SHALL respect Track mute settings by excluding muted audio tracks
5. THE Export_Pipeline SHALL respect Track visibility settings by excluding hidden video tracks
6. THE Export_Pipeline SHALL execute the FFmpeg command via Tauri backend
7. THE Export_Pipeline SHALL report progress percentage during export
8. THE Export_Pipeline SHALL validate that all source media files exist before starting export
9. IF any source media file is missing, THEN THE Export_Pipeline SHALL return a descriptive error message

### Requirement 19: Multi-Clip Selection

**User Story:** As a video editor, I want to select multiple clips, so that I can perform batch operations.

#### Acceptance Criteria

1. WHEN the user clicks on a Clip, THE Timeline_Engine SHALL select that Clip and deselect others
2. WHEN the user Ctrl+clicks on a Clip, THE Timeline_Engine SHALL toggle that Clip selection without affecting others
3. WHEN the user Shift+clicks on a Clip, THE Timeline_Engine SHALL select all Clips between the last selected Clip and the clicked Clip
4. WHEN the user drags a selection rectangle, THE Timeline_Engine SHALL select all Clips intersecting the rectangle
5. THE Timeline_Engine SHALL render selected Clips with a highlight border
6. WHEN multiple Clips are selected, THE Timeline_Engine SHALL apply drag operations to all selected Clips simultaneously
7. WHEN multiple Clips are selected, THE Timeline_Engine SHALL apply delete operations to all selected Clips

### Requirement 20: Accessibility

**User Story:** As a user with disabilities, I want the timeline to be accessible, so that I can edit videos using assistive technologies.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL provide ARIA labels for all interactive elements
2. THE Timeline_Engine SHALL support keyboard navigation for all timeline operations
3. THE Timeline_Engine SHALL provide focus indicators for keyboard navigation
4. THE Timeline_Engine SHALL announce state changes to screen readers using ARIA live regions
5. THE Timeline_Engine SHALL maintain a minimum contrast ratio of 4.5:1 for text elements
6. THE Timeline_Engine SHALL support browser zoom up to 200% without loss of functionality
7. THE Timeline_Engine SHALL provide text alternatives for visual-only information (waveforms, filmstrips)

### Requirement 21: Timeline Parsing and Serialization

**User Story:** As a developer, I want to save and load timeline projects, so that users can persist their work.

#### Acceptance Criteria

1. WHEN the user saves a project, THE Timeline_Parser SHALL serialize the timeline state to JSON format
2. WHEN the user loads a project, THE Timeline_Parser SHALL parse the JSON and reconstruct the timeline state
3. THE Timeline_Parser SHALL validate the JSON structure against a schema before parsing
4. IF the JSON is invalid, THEN THE Timeline_Parser SHALL return a descriptive error message
5. THE Timeline_Pretty_Printer SHALL format timeline JSON with proper indentation for human readability
6. FOR ALL valid timeline states, serializing then parsing SHALL produce an equivalent state (round-trip property)
7. THE Timeline_Parser SHALL handle missing optional fields by using default values

### Requirement 22: Error Handling

**User Story:** As a video editor, I want clear error messages, so that I can understand and fix problems.

#### Acceptance Criteria

1. WHEN a media file cannot be loaded, THE Timeline_Engine SHALL display an error message with the file path and error reason
2. WHEN Waveform generation fails, THE Timeline_Engine SHALL display a fallback message and continue without the waveform
3. WHEN Filmstrip generation fails, THE Timeline_Engine SHALL display a fallback message and continue without the filmstrip
4. WHEN export fails, THE Export_Pipeline SHALL display the FFmpeg error output
5. WHEN an invalid operation is attempted (e.g., trim beyond boundaries), THE Timeline_Engine SHALL prevent the operation and show a tooltip explanation
6. THE Timeline_Engine SHALL log all errors to the console with sufficient context for debugging
7. THE Timeline_Engine SHALL not crash when encountering invalid state; instead it SHALL recover to a valid state

### Requirement 23: Track Type Constraints

**User Story:** As a video editor, I want tracks to enforce content type rules, so that I don't accidentally place incompatible content.

#### Acceptance Criteria

1. WHEN a Track type is "video", THE Timeline_Engine SHALL only allow Clips with video content on that Track
2. WHEN a Track type is "audio", THE Timeline_Engine SHALL only allow Clips with audio content on that Track
3. WHEN a Track type is "text", THE Timeline_Engine SHALL only allow Clips with text/caption content on that Track
4. WHEN the user attempts to place a Clip on an incompatible Track, THE Timeline_Engine SHALL prevent the operation and show a warning
5. THE Timeline_Engine SHALL allow Clips with both video and audio content on video Tracks
6. THE Timeline_Engine SHALL extract only audio from video Clips placed on audio Tracks
7. THE Timeline_Engine SHALL provide visual indicators for Track type (icon or color coding)

### Requirement 24: Frame-Accurate Positioning

**User Story:** As a video editor, I want frame-accurate control, so that I can make precise edits.

#### Acceptance Criteria

1. THE Timeline_Engine SHALL quantize all time values to frame boundaries when frame-snap is enabled
2. THE Timeline_Engine SHALL calculate frame boundaries using the formula: `frameTime = frameNumber / FPS`
3. WHEN frame-snap is enabled AND the user positions a Clip, THE Timeline_Engine SHALL round the time to the nearest frame
4. WHEN frame-snap is enabled AND the user moves the Playhead, THE Timeline_Engine SHALL round the time to the nearest frame
5. THE Timeline_Engine SHALL support frame rates of 24, 25, 30, 50, and 60 FPS
6. THE Timeline_Engine SHALL display frame numbers in the Time_Ruler when zoomed to 70 pixels per second or greater
7. FOR ALL frame-snapped positions, THE Timeline_Engine SHALL maintain accuracy within 0.001 seconds of the calculated frame time

### Requirement 25: Scroll and Pan

**User Story:** As a video editor, I want to scroll and pan the timeline, so that I can navigate long projects.

#### Acceptance Criteria

1. WHEN the timeline content width exceeds the viewport width, THE Timeline_Engine SHALL display a horizontal scrollbar
2. THE Timeline_Engine SHALL allow horizontal scrolling via scrollbar, mouse wheel, or trackpad gestures
3. THE Timeline_Engine SHALL keep the Time_Ruler visible during vertical scrolling (sticky positioning)
4. THE Timeline_Engine SHALL keep Track headers visible during horizontal scrolling (sticky positioning)
5. THE Timeline_Engine SHALL keep the Playhead visible during scrolling by positioning it relative to the viewport
6. WHEN the user scrolls, THE Timeline_Engine SHALL update the visible Clip range for virtualization
7. THE Timeline_Engine SHALL maintain scroll position when zooming (except during zoom-to-cursor)
