/**
 * Procedural sound design system for the Tekken fighting game mode.
 * Uses the Web Audio API to generate all combat sounds without audio files.
 */
export class TekkenAudioManager {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _initialized = false;

  init(): void {
    try {
      this._ctx = new AudioContext();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.5;
      this._masterGain.connect(this._ctx.destination);
      this._initialized = true;
    } catch {
      // Web Audio not available
    }
  }

  private _ensureResumed(): void {
    if (this._ctx?.state === "suspended") {
      this._ctx.resume();
    }
  }

  // ---- Impact Sounds ----

  /** Light hit - quick noise burst */
  playLightHit(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // White noise burst through bandpass filter
    const duration = 0.08;
    const bufferSize = Math.floor(this._ctx.sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this._ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 1.5;

    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain!);
    source.start(now);
    source.stop(now + duration);
  }

  /** Heavy hit - deeper thud with more bass */
  playHeavyHit(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // Low frequency thud
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this._masterGain!);
    osc.start(now);
    osc.stop(now + 0.2);

    // Noise layer
    const duration = 0.12;
    const bufferSize = Math.floor(this._ctx.sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const src = this._ctx.createBufferSource();
    src.buffer = buffer;
    const filt = this._ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 1200;
    const g2 = this._ctx.createGain();
    g2.gain.setValueAtTime(0.4, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filt);
    filt.connect(g2);
    g2.connect(this._masterGain!);
    src.start(now);
    src.stop(now + duration);
  }

  /** Block sound - metallic clang */
  playBlock(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // High metallic ping
    const osc = this._ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const filter = this._ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 600;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Whoosh sound - for attack startup/active frames */
  playWhoosh(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    const duration = 0.15;
    const bufferSize = Math.floor(this._ctx.sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5;
    }

    const src = this._ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this._ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.linearRampToValueAtTime(800, now + duration);
    filter.Q.value = 0.8;

    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.3, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain!);
    src.start(now);
    src.stop(now + duration);
  }

  /** Counter hit - dramatic impact */
  playCounterHit(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // Deep boom
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this._masterGain!);
    osc.start(now);
    osc.stop(now + 0.35);

    // High crack
    const osc2 = this._ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    const g2 = this._ctx.createGain();
    g2.gain.setValueAtTime(0.3, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc2.connect(g2);
    g2.connect(this._masterGain!);
    osc2.start(now);
    osc2.stop(now + 0.12);
  }

  /** Launcher sound - rising pitch */
  playLaunch(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this._masterGain!);
    osc.start(now);
    osc.stop(now + 0.25);

    this.playHeavyHit();
  }

  /** KO sound - dramatic boom */
  playKO(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // Massive sub-bass
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(this._masterGain!);
    osc.start(now);
    osc.stop(now + 0.6);

    this.playCounterHit();
  }

  /** Crowd reaction - murmur/cheer */
  playCrowdReaction(intensity: "light" | "heavy" | "ko"): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // Simulated crowd noise with filtered noise
    const duration = intensity === "ko" ? 1.5 : intensity === "heavy" ? 0.6 : 0.3;
    const volume = intensity === "ko" ? 0.25 : intensity === "heavy" ? 0.15 : 0.08;
    const bufferSize = Math.floor(this._ctx.sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Multiple frequency crowd simulation
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const env = Math.sin(t * Math.PI); // bell curve envelope
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = this._ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this._ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = intensity === "ko" ? 600 : 400;
    filter.Q.value = 0.5;

    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain!);
    src.start(now);
    src.stop(now + duration);
  }

  /** Round announcement - rising tone */
  playRoundAnnounce(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // Dramatic horn-like tone
    for (let h = 0; h < 3; h++) {
      const osc = this._ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 220 * (h + 1);
      const gain = this._ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1 / (h + 1), now + 0.1);
      gain.gain.setValueAtTime(0.1 / (h + 1), now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      const filter = this._ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2000;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this._masterGain!);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  }

  /** Fight announcement - sharp accent */
  playFightAnnounce(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    const osc = this._ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.05);
    osc.frequency.setValueAtTime(880, now + 0.1);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    const filter = this._ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3000;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain!);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Walk footstep */
  playFootstep(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    const duration = 0.06;
    const bufferSize = Math.floor(this._ctx.sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const src = this._ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this._ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain!);
    src.start(now);
    src.stop(now + duration);
  }

  /** Rage activation sound - dramatic power-up */
  playRageActivation(): void {
    if (!this._initialized || !this._ctx) return;
    this._ensureResumed();
    const now = this._ctx.currentTime;

    // Rising power chord
    const freqs = [110, 165, 220, 330];
    for (const freq of freqs) {
      const osc = this._ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.5);
      const gain = this._ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gain.gain.setValueAtTime(0.08, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      const filter = this._ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.linearRampToValueAtTime(4000, now + 0.5);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this._masterGain!);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  }

  setMasterVolume(v: number): void {
    if (this._masterGain) this._masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  destroy(): void {
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
    this._initialized = false;
  }
}
