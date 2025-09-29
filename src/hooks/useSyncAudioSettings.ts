import { useEffect } from 'react';
import { AudioManager } from '@/lib/audio/AudioManager';
import { useAudioSettings } from './useAudioSettings';

export function useSyncAudioSettings() {
  const { masterVolume, musicVolume, sfxVolume, muted } = useAudioSettings();

  useEffect(() => {
    const audio = AudioManager.getInstance();
    audio.setMasterVolume(masterVolume);
    audio.setMusicVolume(musicVolume);
    audio.setSfxVolume(sfxVolume);
    audio.setMuted(muted);
  }, [masterVolume, musicVolume, sfxVolume, muted]);
}
