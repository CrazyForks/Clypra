export type TimelineProps = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  playhead: number;
  onSeek: (t: number) => void;
  videoUrl: string | null;
  sourcePath: string | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
};

export type FilmstripResult = {
  stripUrl: string | null;
  loading: boolean;
};
