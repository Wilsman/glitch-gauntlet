import { useState, useEffect } from "react";
import {
  Music2,
  Play,
  Square,
  CheckSquare,
  Square as SquareIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioManager } from "@/lib/audio/AudioManager";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { cn } from "@/lib/utils";

export function MusicSelectionPanel() {
  const { enabledGameTracks, toggleTrack } = useAudioSettings();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const handleTogglePlay = (trackName: string) => {
    const audio = AudioManager.getInstance();
    if (playingTrack === trackName) {
      audio.stopPreviewTrack();
      audio.playMenuMusic();
      setPlayingTrack(null);
    } else {
      audio.playPreviewTrack(trackName);
      setPlayingTrack(trackName);
    }
  };

  useEffect(() => {
    return () => {
      const audio = AudioManager.getInstance();
      audio.stopPreviewTrack();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-neon-cyan/30 pb-2">
        <Music2 className="h-4 w-4 text-neon-cyan" />
        <span className="font-press-start text-xs tracking-wide text-neon-cyan">
          Music Library
        </span>
      </div>

      <div className="grid gap-2">
        {AudioManager.GAME_TRACKS.map((track) => {
          const isEnabled = enabledGameTracks.includes(track);
          const isPlaying = playingTrack === track;
          const displayName = track.replace(".mp3", "");

          return (
            <div
              key={track}
              className={cn(
                "flex items-center justify-between p-2 rounded border transition-all duration-300",
                isEnabled
                  ? "bg-neon-cyan/10 border-neon-cyan/40"
                  : "bg-black/40 border-white/10 opacity-60"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 shrink-0 hover:bg-neon-yellow/20 hover:text-neon-yellow transition-colors",
                    isPlaying ? "text-neon-yellow" : "text-white/60"
                  )}
                  onClick={() => handleTogglePlay(track)}
                >
                  {isPlaying ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </Button>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-vt323 text-lg truncate",
                      isEnabled ? "text-white" : "text-white/40"
                    )}
                  >
                    {displayName}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "font-press-start text-[8px] h-8 px-2 transition-all",
                  isEnabled
                    ? "text-neon-cyan hover:bg-neon-cyan/20"
                    : "text-white/20 hover:text-white/40 hover:bg-white/5"
                )}
                onClick={() => toggleTrack(track)}
              >
                {isEnabled ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <SquareIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="font-vt323 text-sm text-neon-cyan/60 text-center italic">
        Checked tracks will be shuffled during gameplay.
      </p>
    </div>
  );
}
