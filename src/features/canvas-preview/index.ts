/**
 * Canvas Preview System v2 - Main barrel export
 *
 * A professional-grade multi-clip rendering engine for the Kyro video editor.
 * Provides frame-accurate, multi-track video preview synchronized with Timeline Engine v1.
 */

// Export types
export type { ActiveClip, VideoPoolEntry, FrameCacheEntry, RenderState, CanvasPreviewConfig, CanvasPreviewErrorCodeType, CanvasPreviewErrorEvent } from "./types";

export { CanvasPreviewError, CanvasPreviewErrorCode } from "./types";

// Components
export { CanvasRenderer } from "./components/CanvasRenderer";
export type { CanvasRendererProps } from "./components/CanvasRenderer";

// Utils
export { VideoPool } from "./utils/VideoPool";
export { FrameResolver } from "./utils/FrameResolver";
export { SeekManager } from "./utils/SeekManager";
export { FrameCache } from "./utils/FrameCache";
export { RenderEngine } from "./utils/RenderEngine";
export { CanvasCompositorParser } from "./utils/CanvasCompositorParser";
export type { VideoPoolState, SerializableVideoPoolEntry } from "./utils/CanvasCompositorParser";
