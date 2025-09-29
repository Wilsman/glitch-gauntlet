import * as Tone from 'tone';

type MusicTrack = 'menu' | 'game' | null;

export type VolumeSettings = {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
};

const DEFAULT_MASTER_VOLUME = 0.3;
const DEFAULT_MUSIC_VOLUME = 1;
const DEFAULT_SFX_VOLUME = 1;
const VOLUME_TRANSITION = 0.05;

/**
 * Centralized audio manager powered by Tone.js for music and SFX.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private readonly isBrowser: boolean;
  private master: Tone.Gain | null = null;
  private musicGain: Tone.Gain | null = null;
  private sfxGain: Tone.Gain | null = null;
  private musicReverb: Tone.Reverb | null = null;
  private sfxReverb: Tone.Reverb | null = null;

  private menuSynth: Tone.PolySynth<Tone.Synth> | null = null;
  private menuSequence: Tone.Sequence<string[]> | null = null;

  private gameBass: Tone.MembraneSynth | null = null;
  private gameLead: Tone.FMSynth | null = null;
  private gameBassLoop: Tone.Loop | null = null;
  private gameLeadSequence: Tone.Sequence<string> | null = null;

  private shootSynth: Tone.MembraneSynth | null = null;
  private deathNoise: Tone.NoiseSynth | null = null;
  private clickSynth: Tone.Synth | null = null;
  private gameOverSynth: Tone.Synth | null = null;
  private victorySynth: Tone.Synth | null = null;

  private currentTrack: MusicTrack = null;
  private resumeBlockedLogged = false;
  private volumeSettings: VolumeSettings = {
    master: DEFAULT_MASTER_VOLUME,
    music: DEFAULT_MUSIC_VOLUME,
    sfx: DEFAULT_SFX_VOLUME,
    muted: false,
  };

  private constructor() {
    this.isBrowser = typeof window !== 'undefined';
  }

  private isContextRunning(): boolean {
    return this.isBrowser && Tone.context.state === 'running';
  }

  private ensureInitialized() {
    if (!this.isBrowser || this.master) return;

    this.master = new Tone.Gain(DEFAULT_MASTER_VOLUME).toDestination();
    this.musicGain = new Tone.Gain(DEFAULT_MUSIC_VOLUME).connect(this.master);
    this.sfxGain = new Tone.Gain(DEFAULT_SFX_VOLUME).connect(this.master);
    this.musicReverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).connect(this.musicGain);
    this.sfxReverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).connect(this.sfxGain);

    this.menuSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 1.5 },
    }).connect(this.musicReverb);

    this.menuSequence = new Tone.Sequence(
      (time, chord) => {
        this.menuSynth?.triggerAttackRelease(chord, '8n', time);
      },
      [
        ['C4', 'E4', 'G4'],
        ['A3', 'C4', 'E4'],
        ['F3', 'A3', 'C4'],
        ['G3', 'B3', 'D4'],
      ],
      '2n'
    );

    this.gameBass = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.05, release: 0.3 },
    }).connect(this.musicGain);

    this.gameBassLoop = new Tone.Loop((time) => {
      this.gameBass?.triggerAttackRelease('C2', '8n', time);
      this.gameBass?.triggerAttackRelease('G1', '8n', time + Tone.Time('0:2').toSeconds());
    }, '1m');

    this.gameLead = new Tone.FMSynth({
      harmonicity: 2.5,
      modulationIndex: 12,
      oscillator: { type: 'square' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.2 },
    }).connect(this.musicReverb);

    const leadNotes = ['C5', 'E5', 'G5', 'B4', 'A4', 'G4', 'E4', 'G4'];
    this.gameLeadSequence = new Tone.Sequence(
      (time, note) => {
        this.gameLead?.triggerAttackRelease(note, '16n', time);
      },
      leadNotes,
      '8n'
    );

    this.shootSynth = new Tone.MembraneSynth({
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0.1, release: 0.1 },
    }).connect(this.sfxGain);

    this.deathNoise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0, release: 0.2 },
    }).connect(this.sfxReverb);

    this.clickSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.1 },
    }).connect(this.sfxGain);

    this.gameOverSynth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.05, decay: 0.5, sustain: 0.2, release: 1 },
    }).connect(this.sfxReverb);

    this.victorySynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 1.2 },
    }).connect(this.sfxReverb);

    Tone.Transport.bpm.value = 96;
    this.applyVolumes();
  }

  private clampVolume(value: number) {
    return Math.min(1, Math.max(0, value));
  }

  private applyVolumes() {
    if (!this.master || !this.musicGain || !this.sfxGain) return;

    const masterGain = this.volumeSettings.muted ? 0 : this.volumeSettings.master;
    this.master.gain.rampTo(masterGain, VOLUME_TRANSITION);
    this.musicGain.gain.rampTo(this.volumeSettings.music, VOLUME_TRANSITION);
    this.sfxGain.gain.rampTo(this.volumeSettings.sfx, VOLUME_TRANSITION);
  }

  private ensureTransport() {
    if (!this.isBrowser) return;
    if (Tone.Transport.state === 'started') return;
    if (!this.isContextRunning()) return;
    try {
      Tone.Transport.start();
    } catch (error) {
      console.warn('Tone.js transport failed to start before user interaction', error);
    }
  }

  public async resume() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (!this.isContextRunning()) {
      try {
        await Tone.start();
      } catch (error) {
        if (!this.resumeBlockedLogged) {
          this.resumeBlockedLogged = true;
          console.warn('Tone.js audio context resume blocked until user interaction', error);
        }
        return;
      }
    }
    this.resumeBlockedLogged = false;
    this.ensureTransport();
  }

  public playMenuMusic() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (this.currentTrack === 'menu') return;

    this.stopGameMusic();
    this.menuSequence?.start(0);
    this.currentTrack = 'menu';
    this.ensureTransport();
  }

  public stopMenuMusic() {
    this.menuSequence?.stop();
    if (this.currentTrack === 'menu') {
      this.currentTrack = null;
    }
  }

  public playGameMusic() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (this.currentTrack === 'game') return;

    this.stopMenuMusic();
    this.gameBassLoop?.start(0);
    this.gameLeadSequence?.start(0);
    this.currentTrack = 'game';
    this.ensureTransport();
  }

  public stopGameMusic() {
    this.gameBassLoop?.stop();
    this.gameLeadSequence?.stop();
    if (this.currentTrack === 'game') {
      this.currentTrack = null;
    }
  }

  public playShoot() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (!this.isContextRunning()) return;
    this.shootSynth?.triggerAttackRelease('C3', '32n');
  }

  public playPlayerDeath() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (!this.isContextRunning()) return;
    this.deathNoise?.triggerAttackRelease('16n');
  }

  public playGameOver() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    this.stopGameMusic();
    if (!this.isContextRunning()) return;
    const now = Tone.now();
    this.gameOverSynth?.triggerAttackRelease('C4', '2n', now);
    this.gameOverSynth?.triggerAttackRelease('G3', '1n', now + 0.2);
  }

  public playVictory() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    this.stopGameMusic();
    if (!this.isContextRunning()) return;
    const now = Tone.now();
    this.victorySynth?.triggerAttackRelease('C5', '8n', now);
    this.victorySynth?.triggerAttackRelease('E5', '8n', now + 0.15);
    this.victorySynth?.triggerAttackRelease('G5', '4n', now + 0.3);
  }

  public playClick() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (!this.isContextRunning()) return;
    this.clickSynth?.triggerAttackRelease('C6', '32n');
  }

  public setMasterVolume(value: number) {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    this.volumeSettings.master = this.clampVolume(value);
    this.applyVolumes();
  }

  public setMusicVolume(value: number) {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    this.volumeSettings.music = this.clampVolume(value);
    this.applyVolumes();
  }

  public setSfxVolume(value: number) {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    this.volumeSettings.sfx = this.clampVolume(value);
    this.applyVolumes();
  }

  public setMuted(muted: boolean) {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    this.volumeSettings.muted = muted;
    this.applyVolumes();
  }

  public toggleMuted() {
    this.setMuted(!this.volumeSettings.muted);
  }

  public getVolumeSettings(): VolumeSettings {
    return { ...this.volumeSettings };
  }
}
