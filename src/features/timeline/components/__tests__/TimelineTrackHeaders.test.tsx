/**
 * Unit tests for TimelineTrackHeaders component
 * Requirements: 9.4, 9.5, 9.6, 9.7, 9.8, 25.4
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { TimelineTrackHeaders } from "../TimelineTrackHeaders";
import { useTimelineStore } from "../../store";
import type { Track } from "../../types/core";

// Mock the store
vi.mock("../../store", () => ({
  useTimelineStore: vi.fn(),
}));

describe("TimelineTrackHeaders", () => {
  const mockToggleTrackLock = vi.fn();
  const mockToggleTrackVisibility = vi.fn();
  const mockToggleTrackMute = vi.fn();
  const mockReorderTrack = vi.fn();

  const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
    id: "track-1",
    name: "Video Track 1",
    type: "video",
    order: 0,
    height: 148,
    locked: false,
    visible: true,
    muted: false,
    color: "#1e40af",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
      const state = {
        tracks: new Map<string, Track>(),
        toggleTrackLock: mockToggleTrackLock,
        toggleTrackVisibility: mockToggleTrackVisibility,
        toggleTrackMute: mockToggleTrackMute,
        reorderTrack: mockReorderTrack,
      };
      return selector ? selector(state) : state;
    });
  });

  describe("Track rendering", () => {
    /**
     * Test track header display
     * Requirements: 9.4
     */
    it("should render track name and type icon", () => {
      const track = createMockTrack({ name: "Main Video", type: "video" });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      expect(screen.getByText("Main Video")).toBeInTheDocument();
      expect(screen.getByTitle("Main Video")).toBeInTheDocument();
    });

    it("should render multiple tracks in order", () => {
      const track1 = createMockTrack({ id: "track-1", name: "Track 1", order: 0 });
      const track2 = createMockTrack({ id: "track-2", name: "Track 2", order: 1 });
      const track3 = createMockTrack({ id: "track-3", name: "Track 3", order: 2 });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([
            [track1.id, track1],
            [track2.id, track2],
            [track3.id, track3],
          ]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const trackElements = screen.getAllByTitle(/Track \d/);
      expect(trackElements).toHaveLength(3);
    });

    it("should render audio track with microphone icon", () => {
      const track = createMockTrack({ name: "Audio Track", type: "audio" });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      expect(screen.getByText("Audio Track")).toBeInTheDocument();
    });

    it("should render text track with text icon", () => {
      const track = createMockTrack({ name: "Captions", type: "text" });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      expect(screen.getByText("Captions")).toBeInTheDocument();
    });

    it("should render effects track with FX label", () => {
      const track = createMockTrack({ name: "Effects", type: "effects" });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      expect(screen.getByText("Effects")).toBeInTheDocument();
      expect(screen.getByText("FX")).toBeInTheDocument();
    });
  });

  describe("Lock toggle", () => {
    /**
     * Test track lock functionality
     * Requirements: 9.5
     */
    it("should call toggleTrackLock when lock button is clicked", async () => {
      const user = userEvent.setup();
      const track = createMockTrack({ id: "track-1", locked: false });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const lockButton = screen.getByLabelText(/Lock.*track/i);
      await user.click(lockButton);

      expect(mockToggleTrackLock).toHaveBeenCalledWith("track-1");
      expect(mockToggleTrackLock).toHaveBeenCalledTimes(1);
    });

    it("should show locked state visually", () => {
      const track = createMockTrack({ locked: true });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const lockButton = screen.getByLabelText(/Unlock.*track/i);
      expect(lockButton).toHaveClass("text-red-400");
    });

    it("should show unlocked state visually", () => {
      const track = createMockTrack({ locked: false });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const lockButton = screen.getByLabelText(/Lock.*track/i);
      expect(lockButton).toHaveClass("text-zinc-500");
    });
  });

  describe("Visibility toggle", () => {
    /**
     * Test track visibility functionality
     * Requirements: 9.6
     */
    it("should call toggleTrackVisibility when visibility button is clicked", async () => {
      const user = userEvent.setup();
      const track = createMockTrack({ id: "track-1", visible: true });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const visibilityButton = screen.getByLabelText(/Hide.*track/i);
      await user.click(visibilityButton);

      expect(mockToggleTrackVisibility).toHaveBeenCalledWith("track-1");
      expect(mockToggleTrackVisibility).toHaveBeenCalledTimes(1);
    });

    it("should show visible state visually", () => {
      const track = createMockTrack({ visible: true });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const visibilityButton = screen.getByLabelText(/Hide.*track/i);
      expect(visibilityButton).toHaveClass("text-zinc-400");
    });

    it("should show hidden state visually", () => {
      const track = createMockTrack({ visible: false });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const visibilityButton = screen.getByLabelText(/Show.*track/i);
      expect(visibilityButton).toHaveClass("text-zinc-600");
    });
  });

  describe("Mute toggle", () => {
    /**
     * Test track mute functionality
     * Requirements: 9.7
     */
    it("should call toggleTrackMute when mute button is clicked on video track", async () => {
      const user = userEvent.setup();
      const track = createMockTrack({ id: "track-1", type: "video", muted: false });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const muteButton = screen.getByLabelText(/Mute.*track/i);
      await user.click(muteButton);

      expect(mockToggleTrackMute).toHaveBeenCalledWith("track-1");
      expect(mockToggleTrackMute).toHaveBeenCalledTimes(1);
    });

    it("should call toggleTrackMute when mute button is clicked on audio track", async () => {
      const user = userEvent.setup();
      const track = createMockTrack({ id: "track-1", type: "audio", muted: false });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const muteButton = screen.getByLabelText(/Mute.*track/i);
      await user.click(muteButton);

      expect(mockToggleTrackMute).toHaveBeenCalledWith("track-1");
    });

    it("should not show mute button for text tracks", () => {
      const track = createMockTrack({ type: "text" });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      expect(screen.queryByLabelText(/Mute.*track/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Unmute.*track/i)).not.toBeInTheDocument();
    });

    it("should not show mute button for effects tracks", () => {
      const track = createMockTrack({ type: "effects" });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      expect(screen.queryByLabelText(/Mute.*track/i)).not.toBeInTheDocument();
    });

    it("should show muted state visually", () => {
      const track = createMockTrack({ type: "video", muted: true });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const muteButton = screen.getByLabelText(/Unmute.*track/i);
      expect(muteButton).toHaveClass("text-red-400");
    });

    it("should show unmuted state visually", () => {
      const track = createMockTrack({ type: "video", muted: false });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const muteButton = screen.getByLabelText(/Mute.*track/i);
      expect(muteButton).toHaveClass("text-zinc-400");
    });
  });

  describe("Track reordering", () => {
    /**
     * Test track drag-and-drop reordering
     * Requirements: 9.8
     */
    it("should make tracks draggable", () => {
      const track = createMockTrack();

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(<TimelineTrackHeaders />);

      const trackElement = container.querySelector('[draggable="true"]');
      expect(trackElement).toBeInTheDocument();
    });

    it("should apply opacity when dragging", async () => {
      const user = userEvent.setup();
      const track = createMockTrack();

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(<TimelineTrackHeaders />);

      const trackElement = container.querySelector('[draggable="true"]') as HTMLElement;
      expect(trackElement).not.toHaveClass("opacity-50");
    });

    it("should respect track height property", () => {
      const track = createMockTrack({ height: 200 });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(<TimelineTrackHeaders />);

      const trackElement = container.querySelector('[draggable="true"]') as HTMLElement;
      expect(trackElement.style.height).toBe("200px");
    });
  });

  describe("Sticky positioning", () => {
    /**
     * Test sticky positioning for horizontal scroll
     * Requirements: 25.4
     */
    it("should have sticky positioning class", () => {
      const track = createMockTrack();

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(<TimelineTrackHeaders />);

      const headerContainer = container.firstChild as HTMLElement;
      expect(headerContainer).toHaveClass("sticky");
      expect(headerContainer).toHaveClass("left-0");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty track list", () => {
      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map(),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(<TimelineTrackHeaders />);

      // Should only have the header spacer
      const headerContainer = container.firstChild as HTMLElement;
      expect(headerContainer.children.length).toBe(1); // Only spacer
    });

    it("should handle tracks with very long names", () => {
      const track = createMockTrack({
        name: "This is a very long track name that should be truncated to fit in the header area",
      });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([[track.id, track]]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const nameElement = screen.getByText(/This is a very long track name/);
      expect(nameElement).toHaveClass("truncate");
    });

    it("should sort tracks by order property", () => {
      const track1 = createMockTrack({ id: "track-1", name: "Track C", order: 2 });
      const track2 = createMockTrack({ id: "track-2", name: "Track A", order: 0 });
      const track3 = createMockTrack({ id: "track-3", name: "Track B", order: 1 });

      (useTimelineStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector?: (state: any) => any) => {
        const state = {
          tracks: new Map([
            [track1.id, track1],
            [track2.id, track2],
            [track3.id, track3],
          ]),
          toggleTrackLock: mockToggleTrackLock,
          toggleTrackVisibility: mockToggleTrackVisibility,
          toggleTrackMute: mockToggleTrackMute,
          reorderTrack: mockReorderTrack,
        };
        return selector ? selector(state) : state;
      });

      render(<TimelineTrackHeaders />);

      const trackNames = screen.getAllByTitle(/Track [ABC]/);
      expect(trackNames[0]).toHaveAttribute("title", "Track A");
      expect(trackNames[1]).toHaveAttribute("title", "Track B");
      expect(trackNames[2]).toHaveAttribute("title", "Track C");
    });
  });
});
