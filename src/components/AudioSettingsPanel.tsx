import React from 'react';
import { Volume2, VolumeX, Music2, Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAudioSettings } from '@/hooks/useAudioSettings';
import { cn } from '@/lib/utils';

type AudioSettingsPanelProps = {
  className?: string;
  embedded?: boolean;
};

const sliderToVolume = (value: number[]) => (value[0] ?? 0) / 100;
const volumeToSlider = (value: number) => [Math.round(value * 100)];

export function AudioSettingsPanel({ className, embedded = false }: AudioSettingsPanelProps) {
  const { masterVolume, musicVolume, sfxVolume, muted, setMasterVolume, setMusicVolume, setSfxVolume, setMuted } =
    useAudioSettings();

  const MasterIcon = muted ? VolumeX : Volume2;

  if (embedded) {
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs uppercase">
            <Label htmlFor="mute-toggle-embedded" className="font-press-start text-[10px] text-neon-pink">
              Mute
            </Label>
            <Switch id="mute-toggle-embedded" checked={muted} onCheckedChange={setMuted} className="data-[state=checked]:bg-neon-pink" />
          </div>
        </div>

        <div className="space-y-4 text-xs font-press-start">
          <div>
            <div className="mb-2 flex items-center justify-between text-neon-cyan">
              <span className="flex items-center gap-2">
                <Volume2 className="h-3.5 w-3.5" />
                Master
              </span>
              <span>{Math.round(masterVolume * 100)}%</span>
            </div>
            <Slider
              value={volumeToSlider(masterVolume)}
              onValueChange={(value) => setMasterVolume(sliderToVolume(value))}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-neon-yellow">
              <span className="flex items-center gap-2">
                <Music2 className="h-3.5 w-3.5" />
                Music
              </span>
              <span>{Math.round(musicVolume * 100)}%</span>
            </div>
            <Slider
              value={volumeToSlider(musicVolume)}
              onValueChange={(value) => setMusicVolume(sliderToVolume(value))}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-neon-pink">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                SFX
              </span>
              <span>{Math.round(sfxVolume * 100)}%</span>
            </div>
            <Slider
              value={volumeToSlider(sfxVolume)}
              onValueChange={(value) => setSfxVolume(sliderToVolume(value))}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className={cn(
        'pointer-events-auto w-64 rounded-lg border border-neon-cyan/40 bg-black/90 p-4 text-white shadow-[0_0_15px_rgba(0,255,255,0.25)] backdrop-blur transition-transform duration-300 hover:translate-y-0 -translate-y-[calc(100%-3rem)] group',
        className
      )}
    >
      {/* Hover Tab */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-24 h-8 bg-neon-cyan/20 border-2 border-t-0 border-neon-cyan flex items-center justify-center group-hover:bg-neon-cyan/40 transition-colors rounded-b-lg">
        <span className="font-press-start text-[8px] text-neon-cyan">AUDIO</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MasterIcon className="h-4 w-4 text-neon-cyan" />
          <span className="font-press-start text-xs tracking-wide text-neon-cyan">Audio</span>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase">
          <Label htmlFor="mute-toggle" className="font-press-start text-[10px] text-neon-pink">
            Mute
          </Label>
          <Switch id="mute-toggle" checked={muted} onCheckedChange={setMuted} className="data-[state=checked]:bg-neon-pink" />
        </div>
      </div>

      <div className="mt-4 space-y-4 text-xs font-press-start">
        <div>
          <div className="mb-2 flex items-center justify-between text-neon-cyan">
            <span className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5" />
              Master
            </span>
            <span>{Math.round(masterVolume * 100)}%</span>
          </div>
          <Slider
            value={volumeToSlider(masterVolume)}
            onValueChange={(value) => setMasterVolume(sliderToVolume(value))}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-neon-yellow">
            <span className="flex items-center gap-2">
              <Music2 className="h-3.5 w-3.5" />
              Music
            </span>
            <span>{Math.round(musicVolume * 100)}%</span>
          </div>
          <Slider
            value={volumeToSlider(musicVolume)}
            onValueChange={(value) => setMusicVolume(sliderToVolume(value))}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-neon-pink">
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              SFX
            </span>
            <span>{Math.round(sfxVolume * 100)}%</span>
          </div>
          <Slider
            value={volumeToSlider(sfxVolume)}
            onValueChange={(value) => setSfxVolume(sliderToVolume(value))}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}
