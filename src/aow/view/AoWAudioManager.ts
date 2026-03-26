// ---------------------------------------------------------------------------
// Age of Wonders — Procedural Audio Manager (Web Audio API)
// ---------------------------------------------------------------------------

export class AoWAudioManager {
  private _ctx: AudioContext | null = null;
  private _master: GainNode | null = null;
  private _ambientRunning = false;

  /** Lazy-init AudioContext (must happen after user gesture) */
  private _ensureCtx(): AudioContext {
    if (!this._ctx) {
      this._ctx = new AudioContext();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.08;
      this._master.connect(this._ctx.destination);
    }
    if (this._ctx.state === "suspended") {
      this._ctx.resume();
    }
    return this._ctx;
  }

  private _getMaster(): GainNode {
    this._ensureCtx();
    return this._master!;
  }

  // -----------------------------------------------------------------------
  // Ambient music — slow atmospheric background
  // -----------------------------------------------------------------------

  startAmbient(): void {
    if (this._ambientRunning) return;
    this._ambientRunning = true;

    const ctx = this._ensureCtx();
    const master = this._getMaster();

    // Low drone
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 80;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.3;
    drone.connect(droneGain);
    droneGain.connect(master);
    drone.start();

    // Minor chord progression (Am -> Dm -> Em -> Am)
    const chordFreqs = [
      [220, 261.63, 329.63],   // Am
      [293.66, 349.23, 440],   // Dm
      [329.63, 392, 493.88],   // Em
      [220, 261.63, 329.63],   // Am
    ];

    const chordOscs: OscillatorNode[] = [];
    const chordGains: GainNode[] = [];

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = chordFreqs[0][i];
      const g = ctx.createGain();
      g.gain.value = 0.08;
      osc.connect(g);
      g.connect(master);
      osc.start();
      chordOscs.push(osc);
      chordGains.push(g);
    }

    // Slowly cycle chords
    let chordIdx = 0;
    const chordInterval = setInterval(() => {
      if (!this._ambientRunning) {
        clearInterval(chordInterval);
        drone.stop();
        droneGain.disconnect();
        for (const o of chordOscs) { o.stop(); }
        for (const g of chordGains) { g.disconnect(); }
        return;
      }
      chordIdx = (chordIdx + 1) % chordFreqs.length;
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        chordOscs[i].frequency.linearRampToValueAtTime(chordFreqs[chordIdx][i], now + 2);
      }
    }, 8000);

    // Occasional ethereal pad sweep
    const padInterval = setInterval(() => {
      if (!this._ambientRunning) {
        clearInterval(padInterval);
        return;
      }
      this._playPadSweep(ctx, master);
    }, 12000);
  }

  stopAmbient(): void {
    this._ambientRunning = false;
  }

  private _playPadSweep(ctx: AudioContext, dest: AudioNode): void {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const g = ctx.createGain();
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(600, now + 3);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 1.5);
    g.gain.linearRampToValueAtTime(0, now + 3);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 3);
  }

  // -----------------------------------------------------------------------
  // Sound effects
  // -----------------------------------------------------------------------

  /** Short high ping — triangle wave 800Hz, 0.1s */
  playSelect(): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Soft footstep — noise burst, 0.05s */
  playMove(): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.linearRampToValueAtTime(0, now + 0.05);
    src.connect(g);
    g.connect(master);
    src.start(now);
  }

  /** Metallic clash — sawtooth + noise, 0.3s */
  playCombat(): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    // Sawtooth
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start(now);
    osc.stop(now + 0.3);

    // Noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.15, now);
    ng.gain.linearRampToValueAtTime(0, now + 0.15);
    src.connect(ng);
    ng.connect(master);
    src.start(now);
  }

  /** Different tone per domain */
  playSpellCast(domain: string): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    switch (domain) {
      case "fire":
        this._playTone(ctx, master, "sawtooth", 100, 60, 0.4, 0.3);
        break;
      case "ice":
        this._playCrystalChime(ctx, master, now);
        break;
      case "life":
        this._playHarpLike(ctx, master, now);
        break;
      case "death":
        this._playTone(ctx, master, "sawtooth", 70, 40, 0.5, 0.2);
        break;
      case "earth":
        this._playTone(ctx, master, "square", 60, 30, 0.3, 0.25);
        break;
      case "arcane":
        this._playShimmer(ctx, master, now);
        break;
      default:
        this._playTone(ctx, master, "sine", 440, 440, 0.2, 0.2);
    }
  }

  /** Triumphant fanfare — ascending major chord */
  playVictory(): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    // C major ascending: C4, E4, G4, C5
    const notes = [261.63, 329.63, 392, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const start = now + i * 0.2;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.3, start + 0.05);
      g.gain.linearRampToValueAtTime(0.15, start + 0.5);
      g.gain.linearRampToValueAtTime(0, start + 0.8);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + 0.8);
    });
  }

  /** Somber low tone — descending minor */
  playDefeat(): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    // Descending A minor: A4, F4, D4, A3
    const notes = [440, 349.23, 293.66, 220];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const start = now + i * 0.3;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.25, start + 0.05);
      g.gain.linearRampToValueAtTime(0, start + 0.8);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + 0.8);
    });
  }

  /** Bell toll */
  playCityCapture(): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    // Bell: sine with harmonics, long decay
    const fundamentals = [440, 880, 1320];
    for (const freq of fundamentals) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const vol = freq === 440 ? 0.3 : 0.1;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 1.5);
    }
  }

  /** Coin jingle — very short high metallic ping */
  playGold(): void {
    const ctx = this._ensureCtx();
    const master = this._getMaster();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.linearRampToValueAtTime(1800, now + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private _playTone(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
  ): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, now);
    g.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + duration);
  }

  /** Crystal chime for ice spells */
  private _playCrystalChime(ctx: AudioContext, dest: AudioNode, now: number): void {
    const freqs = [1200, 1600, 2000];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freqs[i];
      const g = ctx.createGain();
      const t = now + i * 0.08;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }

  /** Harp-like for life spells */
  private _playHarpLike(ctx: AudioContext, dest: AudioNode, now: number): void {
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freqs[i];
      const g = ctx.createGain();
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  }

  /** Shimmer for arcane spells */
  private _playShimmer(ctx: AudioContext, dest: AudioNode, now: number): void {
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const freq = 800 + Math.random() * 1200;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const t = now + i * 0.06;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  }
}

/** Singleton instance */
export const aowAudio = new AoWAudioManager();
