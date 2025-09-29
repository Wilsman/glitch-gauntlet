import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { AudioManager } from '@/lib/audio/AudioManager';

const STORAGE_KEY = 'glitch-gauntlet-audio-settings';
const DEFAULT_VOLUME = 0.3;

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

const syncAudio = (callback: (audio: AudioManager) => void) => {
  if (typeof window === 'undefined') return;
  const audio = AudioManager.getInstance();
  callback(audio);
};

type AudioSettingsState = {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  setMasterVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
};

export const useAudioSettings = create<AudioSettingsState>()(
  persist(
    immer((set, get) => ({
      masterVolume: DEFAULT_VOLUME,
      musicVolume: 1,
      sfxVolume: 1,
      muted: false,
      setMasterVolume: (value) => {
        const clamped = clampVolume(value);
        set((state) => {
          state.masterVolume = clamped;
        });
        syncAudio((audio) => audio.setMasterVolume(clamped));
      },
      setMusicVolume: (value) => {
        const clamped = clampVolume(value);
        set((state) => {
          state.musicVolume = clamped;
        });
        syncAudio((audio) => audio.setMusicVolume(clamped));
      },
      setSfxVolume: (value) => {
        const clamped = clampVolume(value);
        set((state) => {
          state.sfxVolume = clamped;
        });
        syncAudio((audio) => audio.setSfxVolume(clamped));
      },
      setMuted: (muted) => {
        set((state) => {
          state.muted = muted;
        });
        syncAudio((audio) => audio.setMuted(muted));
      },
      toggleMuted: () => {
        const muted = !get().muted;
        set((state) => {
          state.muted = muted;
        });
        syncAudio((audio) => audio.setMuted(muted));
      },
    })),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (!state || typeof window === 'undefined') return;
        syncAudio((audio) => {
          audio.setMasterVolume(state.masterVolume);
          audio.setMusicVolume(state.musicVolume);
          audio.setSfxVolume(state.sfxVolume);
          audio.setMuted(state.muted);
        });
      },
    }
  )
);
