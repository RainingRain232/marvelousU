// ---------------------------------------------------------------------------
// Rift Wizard mode – procedural audio using Web Audio API
// Subscribes to EventBus events for fully decoupled sound playback
// ---------------------------------------------------------------------------

import { rwEventBus, RWEvent } from "./RiftWizardEventBus";
import { loadSettings } from "./RiftWizardSaveSystem";
import { SpellSchool } from "../state/RiftWizardState";

class RiftWizardAudioSystem {
  private _ctx: AudioContext | null = null;
  private _enabled = true;
  private _sfxVolume = 0.8;
  private _unsubs: (() => void)[] = [];
  private _ambientSource: AudioBufferSourceNode | null = null;
  private _ambientGain: GainNode | null = null;

  init(): void {
    try {
      this._ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      this._enabled = false;
      return;
    }

    // Load volume from settings
    const settings = loadSettings();
    this._sfxVolume = settings.sfxVolume;

    // Subscribe to EventBus events
    this._unsubs.push(
      rwEventBus.on(RWEvent.SPELL_CAST, (data) => {
        this._playSpellCast(data.school as SpellSchool | undefined);
      }),
      rwEventBus.on(RWEvent.SPELL_HIT, () => this._playSpellHit()),
      rwEventBus.on(RWEvent.ENEMY_DEATH, () => this._playEnemyDeath()),
      rwEventBus.on(RWEvent.BOSS_DEATH, () => this._playBossDeath()),
      rwEventBus.on(RWEvent.WIZARD_HIT, () => this._playWizardHit()),
      rwEventBus.on(RWEvent.WIZARD_DEATH, () => this._playWizardDeath()),
      rwEventBus.on(RWEvent.LEVEL_CLEAR, () => this._playLevelClear()),
      rwEventBus.on(RWEvent.ITEM_PICKUP, () => this._playItemPickup()),
      rwEventBus.on(RWEvent.SHRINE_USE, () => this._playShrineUse()),
      rwEventBus.on(RWEvent.VICTORY, () => this._playVictory()),
      rwEventBus.on(RWEvent.GAME_OVER, () => this._playGameOver()),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs.length = 0;
    this.stopAmbient();
    if (this._ctx) {
      this._ctx.close().catch(() => {});
      this._ctx = null;
    }
  }

  setVolume(vol: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, vol));
  }

  private _resume(): void {
    if (this._ctx && this._ctx.state === "suspended") {
      this._ctx.resume();
    }
  }

  // ---- Spell cast sounds per school ----------------------------------------

  private _playSpellCast(school?: SpellSchool): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;

    switch (school) {
      case SpellSchool.FIRE:
        // Low rumble + crackle
        this._playTone(now, 0.2, 80, 50, 0.2, "sawtooth");
        this._playNoise(now, 0.15, 800, 4000, 0.15);
        break;
      case SpellSchool.ICE:
        // High chime
        this._playTone(now, 0.15, 1200, 1800, 0.18, "sine");
        this._playTone(now + 0.05, 0.12, 1600, 2200, 0.12, "sine");
        break;
      case SpellSchool.LIGHTNING:
        // Sharp zap
        this._playNoise(now, 0.06, 2000, 8000, 0.25);
        this._playTone(now, 0.04, 2000, 200, 0.2, "sawtooth");
        break;
      case SpellSchool.ARCANE:
        // Whoosh
        this._playNoise(now, 0.2, 500, 3000, 0.12);
        this._playTone(now, 0.2, 400, 800, 0.1, "sine");
        break;
      case SpellSchool.NATURE:
        // Soft hum
        this._playTone(now, 0.25, 220, 220, 0.12, "sine");
        this._playTone(now, 0.25, 330, 330, 0.08, "sine");
        break;
      case SpellSchool.DARK:
        // Deep drone
        this._playTone(now, 0.3, 60, 40, 0.2, "sawtooth");
        this._playTone(now, 0.3, 90, 60, 0.1, "square");
        break;
      case SpellSchool.HOLY:
        // Bright chord
        this._playTone(now, 0.2, 523, 523, 0.12, "sine");
        this._playTone(now, 0.2, 659, 659, 0.1, "sine");
        this._playTone(now, 0.2, 784, 784, 0.08, "sine");
        break;
      default:
        // Generic cast sound
        this._playTone(now, 0.12, 500, 700, 0.12, "square");
        break;
    }
  }

  // ---- Impact / death sounds -----------------------------------------------

  private _playSpellHit(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    this._playNoise(now, 0.06, 1500, 5000, 0.18);
    this._playTone(now, 0.05, 300, 150, 0.15, "square");
  }

  private _playEnemyDeath(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Quick descending tone
    this._playTone(now, 0.15, 400, 100, 0.2, "sawtooth");
    this._playNoise(now, 0.08, 1000, 3000, 0.1);
  }

  private _playBossDeath(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Dramatic fanfare – chord progression
    this._playTone(now, 0.25, 262, 262, 0.2, "sine");       // C4
    this._playTone(now, 0.25, 330, 330, 0.15, "sine");       // E4
    this._playTone(now, 0.25, 392, 392, 0.15, "sine");       // G4
    this._playTone(now + 0.25, 0.25, 330, 330, 0.2, "sine"); // E4
    this._playTone(now + 0.25, 0.25, 392, 392, 0.15, "sine");// G4
    this._playTone(now + 0.25, 0.25, 523, 523, 0.15, "sine");// C5
    this._playTone(now + 0.5, 0.4, 523, 523, 0.25, "sine");  // C5 sustained
    this._playTone(now + 0.5, 0.4, 659, 659, 0.15, "sine");  // E5
    this._playNoise(now + 0.5, 0.2, 2000, 6000, 0.1);
  }

  private _playWizardHit(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Dull thud
    this._playTone(now, 0.1, 100, 50, 0.2, "sine");
    this._playNoise(now, 0.06, 200, 800, 0.12);
  }

  private _playWizardDeath(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Low sad tone
    this._playTone(now, 0.5, 200, 80, 0.2, "sine");
    this._playTone(now + 0.15, 0.4, 150, 60, 0.15, "sine");
    this._playTone(now + 0.3, 0.35, 100, 40, 0.1, "sine");
  }

  private _playLevelClear(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Ascending arpeggio
    const notes = [262, 330, 392, 523, 659];
    for (let i = 0; i < notes.length; i++) {
      this._playTone(now + i * 0.1, 0.15, notes[i], notes[i], 0.15, "sine");
    }
  }

  private _playItemPickup(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Bright ding
    this._playTone(now, 0.1, 1200, 1200, 0.15, "sine");
    this._playTone(now + 0.06, 0.12, 1600, 1600, 0.12, "sine");
  }

  private _playShrineUse(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Mystical shimmer
    this._playTone(now, 0.3, 600, 900, 0.1, "sine");
    this._playTone(now + 0.08, 0.3, 800, 1200, 0.08, "sine");
    this._playTone(now + 0.16, 0.3, 1000, 1500, 0.06, "sine");
    this._playNoise(now, 0.25, 3000, 8000, 0.04);
  }

  private _playVictory(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Triumphant fanfare
    const fanfare: [number, number, number][] = [
      [0, 392, 0.2],   // G4
      [0.15, 523, 0.2], // C5
      [0.3, 659, 0.2],  // E5
      [0.45, 784, 0.25],// G5
      [0.7, 784, 0.15], // G5
      [0.85, 1047, 0.3],// C6
    ];
    for (const [offset, freq, vol] of fanfare) {
      this._playTone(now + offset, 0.2, freq, freq, vol, "sine");
    }
    this._playNoise(now + 0.85, 0.3, 2000, 6000, 0.08);
  }

  private _playGameOver(): void {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    // Minor chord fade
    this._playTone(now, 0.6, 220, 220, 0.2, "sine");       // A3
    this._playTone(now, 0.6, 262, 262, 0.15, "sine");       // C4
    this._playTone(now, 0.6, 330, 330, 0.12, "sine");       // E4
    this._playTone(now + 0.4, 0.8, 196, 196, 0.15, "sine"); // G3
    this._playTone(now + 0.4, 0.8, 233, 233, 0.12, "sine"); // Bb3
  }

  // ---- Ambient background --------------------------------------------------

  playAmbient(): void {
    if (!this._enabled || !this._ctx || this._ambientSource) return;
    this._resume();

    // Create a subtle looping background drone
    const sampleRate = this._ctx.sampleRate;
    const duration = 4; // 4 second loop
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate a slow-evolving drone from layered low-frequency tones
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      data[i] =
        Math.sin(2 * Math.PI * 55 * t) * 0.15 +
        Math.sin(2 * Math.PI * 82.5 * t) * 0.08 +
        Math.sin(2 * Math.PI * 110 * t + Math.sin(t * 0.5) * 0.3) * 0.05 +
        (Math.random() * 2 - 1) * 0.01; // subtle noise layer
    }

    this._ambientSource = this._ctx.createBufferSource();
    this._ambientSource.buffer = buffer;
    this._ambientSource.loop = true;

    this._ambientGain = this._ctx.createGain();
    this._ambientGain.gain.value = 0.06 * this._sfxVolume;

    this._ambientSource.connect(this._ambientGain);
    this._ambientGain.connect(this._ctx.destination);
    this._ambientSource.start();
  }

  stopAmbient(): void {
    if (this._ambientSource) {
      try {
        this._ambientSource.stop();
      } catch {
        // already stopped
      }
      this._ambientSource.disconnect();
      this._ambientSource = null;
    }
    if (this._ambientGain) {
      this._ambientGain.disconnect();
      this._ambientGain = null;
    }
  }

  // ---- Low-level synthesis helpers -----------------------------------------

  private _playTone(
    time: number,
    duration: number,
    startFreq: number,
    endFreq: number,
    volume: number,
    waveform: OscillatorType = "square",
  ): void {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.connect(gain);
    gain.connect(this._ctx.destination);

    osc.type = waveform;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      time + duration,
    );

    gain.gain.setValueAtTime(volume * this._sfxVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private _playNoise(
    time: number,
    duration: number,
    lowFreq: number,
    highFreq: number,
    volume: number,
  ): void {
    if (!this._ctx) return;
    const bufferSize = Math.floor(this._ctx.sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = this._ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = (lowFreq + highFreq) / 2;
    bandpass.Q.value = 1;

    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(volume * this._sfxVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this._ctx.destination);

    source.start(time);
    source.stop(time + duration);
  }
}

/** Singleton audio system instance */
export const rwAudio = new RiftWizardAudioSystem();
