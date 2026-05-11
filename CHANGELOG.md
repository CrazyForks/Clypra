# Changelog

All notable changes to Clypra will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha.1] - 2026-05-11

### Added

- **Text Rendering System**: Production-ready text rendering with deterministic font loading
  - TextClip model with alignment, line height, letter spacing, and padding support
  - FontLoader system with document.fonts API integration and caching
  - Canvas-based text rasterizer with wrapping, alignment, and clipping
  - Font preloading integrated into FrameScheduler pipeline
  - Unified rasterization path for preview and export (no layout drift)
- **Core Video Editor Features**:
  - Multi-track timeline with drag-and-drop support
  - Video preview with GPU-accelerated rendering
  - Basic video clip editing (trim, split, move)
  - Audio waveform visualization
  - Export functionality with FFmpeg integration
- **UI Components**:
  - Modern editor layout with resizable panels
  - Media library with thumbnail generation
  - Properties panel for clip adjustments
  - Timeline controls (play, pause, seek)
  - Export dialog with quality presets
- **Project Management**:
  - Create and save projects
  - Import media files (video, audio, images)
  - Project state persistence

### Technical

- Built with Tauri 2.0, React 19, and TypeScript
- GPU-accelerated preview rendering with WebGL
- Native FFmpeg integration for video processing
- Comprehensive test coverage for core systems
- Cross-platform support (macOS, Windows, Linux)

### Known Limitations

- Alpha release - expect bugs and missing features
- Limited export format options
- No undo/redo system yet
- No advanced effects or transitions
- No audio mixing controls

[Unreleased]: https://github.com/AIEraDev/Clypra/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/AIEraDev/Clypra/releases/tag/v0.1.0-alpha.1
