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

  // File-based music players
  private menuPlayer: Tone.Player | null = null;
  private gamePlayer: Tone.Player | null = null;
  private previewPlayer: Tone.Player | null = null;

  public static readonly GAME_TRACKS = [
    'Digital Frenzy 2.mp3',
    'Digital Frenzy.mp3',
    'Pixel Dash.mp3',
    'Pixel Groove.mp3',
  ];

  // Legacy procedural music (kept for SFX compatibility; no longer used for music)
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
  private pickupSynth: Tone.Synth | null = null;
  // SFX scheduling guards
  private lastShootTime: number | null = null;
  private lastPickupTime: number | null = null;

  private currentTrack: MusicTrack = null;
  private requestedTrack: MusicTrack = null;
  private resumeBlockedLogged = false;
  private resumeListenersAttached = false;
  private readonly resumeHandler = async () => {
    try {
      await Tone.start();
    } catch (e) {
      console.debug('Audio context start deferred:', e);
    }
    this.removeResumeEventListeners();
    // Build nodes now that context is running
    this.ensureInitialized();
    this.ensureTransport();
    this.kickCurrentTrack();
  };
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
    // Avoid constructing Tone nodes before user gesture unlocks the context
    if (!this.isContextRunning()) {
      this.addResumeEventListeners();
      return;
    }

    this.master = new Tone.Gain(DEFAULT_MASTER_VOLUME).toDestination();
    this.musicGain = new Tone.Gain(DEFAULT_MUSIC_VOLUME).connect(this.master);
    this.sfxGain = new Tone.Gain(DEFAULT_SFX_VOLUME).connect(this.master);
    this.musicReverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).connect(this.musicGain);
    this.sfxReverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).connect(this.sfxGain);
    // --- File-based music setup ---
    const menuTrackUrl = encodeURI('/music/Pixel Pulse.mp3');
    this.menuPlayer = new Tone.Player({
      url: menuTrackUrl,
      loop: true,
      autostart: false,
    }).connect(this.musicGain);

    // Keep legacy synths initialized for SFX-only routes and to avoid null refs,
    // but we won't start these for music anymore.
    this.menuSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 1.5 },
    }).connect(this.musicReverb);

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
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 1.2 },
    }).connect(this.sfxReverb);

    this.pickupSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 },
    }).connect(this.sfxGain);

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

  private addResumeEventListeners() {
    if (!this.isBrowser || this.resumeListenersAttached) return;
    this.resumeListenersAttached = true;
    window.addEventListener('pointerdown', this.resumeHandler as EventListener, { passive: true } as any);
    window.addEventListener('keydown', this.resumeHandler as EventListener);
    window.addEventListener('touchstart', this.resumeHandler as EventListener, { passive: true } as any);
  }

  private removeResumeEventListeners() {
    if (!this.isBrowser || !this.resumeListenersAttached) return;
    window.removeEventListener('pointerdown', this.resumeHandler as EventListener);
    window.removeEventListener('keydown', this.resumeHandler as EventListener);
    window.removeEventListener('touchstart', this.resumeHandler as EventListener);
    this.resumeListenersAttached = false;
  }

  private kickCurrentTrack() {
    // Ensure requested track is playing after context resumes
    const want = this.requestedTrack ?? this.currentTrack;
    if (want === 'menu') {
      const p = this.menuPlayer;
      if (p) {
        try {
          if ((p as any).loaded || (p as any).buffer?.loaded) {
            p.restart();
          } else {
            p.autostart = true;
          }
        } catch (e) {
          console.debug('Menu player start deferred:', e);
        }
      }
    } else if (want === 'game') {
      const p = this.gamePlayer;
      if (p) {
        try {
          if ((p as any).loaded || (p as any).buffer?.loaded) {
            p.restart();
          } else {
            p.autostart = true;
          }
        } catch (e) {
          console.debug('Game player start deferred:', e);
        }
      }
    }
  }

  public async resume() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (!this.isContextRunning()) {
      // Defer to a user gesture to unlock the audio context
      if (!this.resumeBlockedLogged) {
        this.resumeBlockedLogged = true;
        console.debug('Audio context pending user gesture');
      }
      this.addResumeEventListeners();
      return;
    }
    // Context already running
    this.resumeBlockedLogged = false;
    this.ensureInitialized();
    this.ensureTransport();
    this.kickCurrentTrack();
  }

  public playMenuMusic() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (this.currentTrack === 'menu') return;

    this.stopGameMusic();
    // Stop legacy procedural music just in case
    if (this.menuSequence && 'cancel' in this.menuSequence) {
      try {
        this.menuSequence.cancel(0);
      } catch (e) {
        console.debug('Menu sequence cancel failed:', e);
      }
    }
    this.menuSequence?.stop(0);

    // Start file-based menu music (start now or autostart when loaded)
    if (this.menuPlayer) {
      const p = this.menuPlayer as any;
      try {
        const isLoaded = !!(p.loaded || p.buffer?.loaded);
        if (isLoaded) {
          // restart to guarantee playback
          if (p.state === 'started') p.restart(); else p.start();
        } else {
          p.autostart = true;
        }
      } catch (e) {
        console.debug('Menu player start deferred:', e);
      }
    }
    this.requestedTrack = 'menu';
    this.currentTrack = 'menu';
    this.ensureTransport();
  }

  public stopMenuMusic() {
    // Stop both legacy and file-based menu music
    this.menuSequence?.stop(0);
    if (this.menuSequence && 'cancel' in this.menuSequence) {
      try {
        this.menuSequence.cancel(0);
      } catch (e) {
        console.debug('Menu sequence cancel failed:', e);
      }
    }
    if (this.menuPlayer && this.menuPlayer.state === 'started') {
      try { this.menuPlayer.stop(); } catch (e) {
        console.debug('Menu player stop deferred:', e);
      }
    }
    if (this.currentTrack === 'menu') {
      this.currentTrack = null;
    }
    if (this.requestedTrack === 'menu') {
      this.requestedTrack = null;
    }
  }

  public playGameMusic(enabledTracks?: string[]) {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (this.currentTrack === 'game') return;

    this.stopMenuMusic();
    this.stopPreviewTrack();

    // Stop legacy procedural game music
    if (this.gameBassLoop && 'cancel' in this.gameBassLoop) {
      try {
        this.gameBassLoop.cancel(0);
      } catch (e) {
        console.debug('Game bass loop cancel failed:', e);
      }
    }
    if (this.gameLeadSequence && 'cancel' in this.gameLeadSequence) {
      try {
        this.gameLeadSequence.cancel(0);
      } catch (e) {
        console.debug('Game lead sequence cancel failed:', e);
      }
    }
    this.gameBassLoop?.stop(0);
    this.gameLeadSequence?.stop(0);

    // Start randomized file-based game music
    const possibleTracks = (enabledTracks && enabledTracks.length > 0)
      ? enabledTracks
      : AudioManager.GAME_TRACKS;

    const gameTracks = possibleTracks
      .map((name) => encodeURI(`/music/${name}`));
    const pick = gameTracks.length > 0
      ? gameTracks[Math.floor(Math.random() * gameTracks.length)]
      : encodeURI(`/music/${AudioManager.GAME_TRACKS[0]}`);

    // Recreate player each time to avoid TS/runtime incompatibilities with .load
    if (this.gamePlayer) {
      try {
        this.gamePlayer.stop();
        this.gamePlayer.dispose();
      } catch (e) {
        console.debug('Game player dispose deferred:', e);
      }
    }
    this.gamePlayer = new Tone.Player({
      url: pick,
      loop: true,
      autostart: true, // auto start as soon as the buffer is loaded
    }).connect(this.musicGain);
    this.requestedTrack = 'game';
    this.currentTrack = 'game';
    this.ensureTransport();
  }

  public stopGameMusic() {
    // Stop both legacy and file-based game music
    this.gameBassLoop?.stop(0);
    this.gameLeadSequence?.stop(0);
    if (this.gameBassLoop && 'cancel' in this.gameBassLoop) {
      try {
        this.gameBassLoop.cancel(0);
      } catch (e) {
        console.debug('Game bass loop cancel failed:', e);
      }
    }
    if (this.gameLeadSequence && 'cancel' in this.gameLeadSequence) {
      try {
        this.gameLeadSequence.cancel(0);
      } catch (e) {
        console.debug('Game lead sequence cancel failed:', e);
      }
    }
    if (this.gamePlayer) {
      try {
        if (this.gamePlayer.state === 'started') this.gamePlayer.stop();
      } catch (e) {
        console.debug('Game player stop deferred:', e);
      }
      try { this.gamePlayer.dispose(); } catch (e) {
        console.debug('Game player dispose deferred:', e);
      }
      this.gamePlayer = null;
    }
    if (this.currentTrack === 'game') {
      this.currentTrack = null;
    }
    if (this.requestedTrack === 'game') {
      this.requestedTrack = null;
    }
  }

  public playPreviewTrack(name: string) {
    if (!this.isBrowser) return;
    this.ensureInitialized();

    this.stopMenuMusic();
    this.stopGameMusic();
    this.stopPreviewTrack();

    this.previewPlayer = new Tone.Player({
      url: encodeURI(`/music/${name}`),
      loop: true,
      autostart: true,
    }).connect(this.musicGain!);

    this.ensureTransport();
  }

  public stopPreviewTrack() {
    if (this.previewPlayer) {
      try {
        if (this.previewPlayer.state === 'started') this.previewPlayer.stop();
        this.previewPlayer.dispose();
      } catch (e) {
        console.debug('Preview player stop/dispose error:', e);
      }
      this.previewPlayer = null;
    }
  }

  public playShoot() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (!this.isContextRunning()) return;
    const now = Tone.now();
    const epsilon = 0.0005; // 0.5ms to satisfy strict monotonic start times
    const time = this.lastShootTime !== null && now <= this.lastShootTime ? this.lastShootTime + epsilon : now;
    this.lastShootTime = time;
    this.shootSynth?.triggerAttackRelease('C3', '32n', time);
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
    this.clickSynth?.triggerAttackRelease("C6", "32n");
  }

  public playPickup() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    if (!this.isContextRunning()) return;

    const now = Tone.now();
    const epsilon = 0.005; // 5ms gap to avoid overlap clicks
    const time =
      this.lastPickupTime !== null && now <= this.lastPickupTime
        ? this.lastPickupTime + epsilon
        : now;
    this.lastPickupTime = time;

    // A high-pitched, satisfying "ching" - two quick notes
    this.pickupSynth?.triggerAttackRelease("E6", "32n", time);
    this.pickupSynth?.triggerAttackRelease("G6", "32n", time + 0.05);
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
