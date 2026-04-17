import { forwardRef } from "react";

type VideoPlayerProps = {
  videoUrl: string | null;
  onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onError: () => void;
};

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ videoUrl, onLoadedMetadata, onTimeUpdate, onError }, ref) => {
  if (!videoUrl) {
    return <div className="flex aspect-video max-h-[38vh] w-full items-center justify-center text-sm text-zinc-600">No file loaded — use Import video.</div>;
  }

  return <video ref={ref} key={videoUrl} className="aspect-video max-h-[38vh] w-full bg-black object-contain" src={videoUrl} controls onLoadedMetadata={onLoadedMetadata} onTimeUpdate={onTimeUpdate} onError={onError} />;
});

VideoPlayer.displayName = "VideoPlayer";
