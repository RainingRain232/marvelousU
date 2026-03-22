// ---------------------------------------------------------------------------
// Jousting Tournament – Procedural Audio System (Web Audio API)
// Galloping hooves, lance impacts, crowd reactions, power meter tone,
// UI feedback, fanfares — all synthesized, zero asset loading.
// ---------------------------------------------------------------------------

export class JoustingAudio {
  private _ctx: AudioContext | null = null;
  private _master!: GainNode;
  private _sfx!: GainNode;
  private _crowd!: GainNode;
  private _enabled = true;
  private _crowdSource: AudioBufferSourceNode | null = null;
  private _gallopInterval: number | null = null;
  private _meterOsc: OscillatorNode | null = null;
  private _meterGain: GainNode | null = null;
  private _music!: GainNode;
  private _musicDrone: OscillatorNode | null = null;
  private _musicArp: number | null = null;
  private _musicDrum: number | null = null;
  private _musicPhase: "idle" | "aiming" | "charge" | "none" = "none";

  init(): void {
    try {
      this._ctx = new AudioContext();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.35;
      this._master.connect(this._ctx.destination);

      this._sfx = this._ctx.createGain();
      this._sfx.gain.value = 0.7;
      this._sfx.connect(this._master);

      this._crowd = this._ctx.createGain();
      this._crowd.gain.value = 0.08;
      this._crowd.connect(this._master);
    } catch {
      this._enabled = false;
    }
  }

  private _ensure(): AudioContext | null {
    if (!this._enabled || !this._ctx) return null;
    if (this._ctx.state === "suspended") this._ctx.resume();
    return this._ctx;
  }

  destroy(): void {
    this.stopGallop();
    this.stopMeterTone();
    this.stopCrowd();
    if (this._ctx && this._ctx.state !== "closed") {
      try { this._ctx.close(); } catch { /* noop */ }
    }
    this._ctx = null;
  }

  // --- Tone helper ---
  private _tone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.3): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this._sfx);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // =========================================================================
  // Sound effects
  // =========================================================================

  /** Short click when changing zone selection. */
  zoneChange(): void {
    this._tone(800, 0.05, "square", 0.1);
  }

  /** Confirm charge / select. */
  confirm(): void {
    this._tone(600, 0.08, "triangle", 0.2);
    setTimeout(() => this._tone(900, 0.06, "triangle", 0.15), 50);
  }

  /** Lance impact — generic hit. */
  hit(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    // Noise burst for wood crack
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.15));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    const flt = ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.value = 400;
    flt.Q.value = 2;
    src.connect(flt);
    flt.connect(g);
    g.connect(this._sfx);
    src.start();
    // Low thud
    this._tone(120, 0.15, "sine", 0.3);
  }

  /** Strong hit — perfect timing. */
  strongHit(): void {
    this.hit();
    setTimeout(() => this._tone(500, 0.1, "triangle", 0.25), 30);
    setTimeout(() => this._tone(700, 0.08, "triangle", 0.2), 80);
  }

  /** Unhorse — dramatic crash. */
  unhorse(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    // Big noise burst
    const len = Math.floor(ctx.sampleRate * 0.3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25)) * 1.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.6;
    src.connect(g);
    g.connect(this._sfx);
    src.start();
    // Heavy bass thud
    this._tone(60, 0.3, "sine", 0.5);
    this._tone(80, 0.2, "sine", 0.3);
    // Metal clang
    setTimeout(() => this._tone(1200, 0.15, "square", 0.15), 50);
    setTimeout(() => this._tone(800, 0.12, "square", 0.1), 120);
  }

  /** Block — dull clank. */
  block(): void {
    this._tone(250, 0.1, "triangle", 0.2);
    this._tone(180, 0.12, "sine", 0.15);
  }

  /** Glancing blow — weak scrape. */
  glance(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3)) * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.2;
    src.connect(g);
    g.connect(this._sfx);
    src.start();
  }

  /** Perfect timing achieved. */
  perfectTiming(): void {
    this._tone(800, 0.06, "sine", 0.2);
    setTimeout(() => this._tone(1200, 0.08, "sine", 0.15), 60);
    setTimeout(() => this._tone(1600, 0.06, "sine", 0.1), 120);
  }

  /** Feint performed. */
  feint(): void {
    this._tone(400, 0.04, "sawtooth", 0.12);
    setTimeout(() => this._tone(600, 0.04, "sawtooth", 0.08), 40);
  }

  /** Gold earned jingle. */
  goldEarned(): void {
    this._tone(1100, 0.06, "triangle", 0.12);
    setTimeout(() => this._tone(1400, 0.05, "triangle", 0.1), 60);
    setTimeout(() => this._tone(1700, 0.04, "triangle", 0.08), 110);
  }

  /** Shop purchase. */
  purchase(): void {
    this._tone(500, 0.05, "triangle", 0.15);
    setTimeout(() => this._tone(800, 0.06, "triangle", 0.12), 50);
  }

  /** Victory fanfare — short triumphant stab. */
  victory(): void {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, "triangle", 0.2 - i * 0.03), i * 100);
    });
  }

  /** Defeat — descending tones. */
  defeat(): void {
    const notes = [400, 350, 300, 250];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.25, "sine", 0.15 - i * 0.02), i * 120);
    });
  }

  /** Crowd favor full chime. */
  crowdFavorFull(): void {
    this._tone(800, 0.08, "triangle", 0.15);
    setTimeout(() => this._tone(1000, 0.1, "triangle", 0.12), 80);
    setTimeout(() => this._tone(1200, 0.12, "triangle", 0.1), 160);
  }

  /** Random event reveal. */
  eventReveal(): void {
    this._tone(600, 0.1, "sine", 0.15);
    setTimeout(() => this._tone(800, 0.12, "sine", 0.12), 80);
    setTimeout(() => this._tone(1000, 0.08, "triangle", 0.1), 160);
  }

  // =========================================================================
  // Continuous sounds
  // =========================================================================

  /** Start galloping hoof beats (accelerating rhythm). */
  startGallop(): void {
    this.stopGallop();
    let beat = 0;
    let interval = 200;
    const tick = () => {
      const ctx = this._ensure();
      if (!ctx) return;
      // Hoof beat: short noise burst
      const len = Math.floor(ctx.sampleRate * 0.03);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3)) * 0.6;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      // Alternate volume for canter rhythm
      g.gain.value = beat % 2 === 0 ? 0.15 : 0.08;
      const flt = ctx.createBiquadFilter();
      flt.type = "lowpass";
      flt.frequency.value = 600 + (beat % 2) * 200;
      src.connect(flt);
      flt.connect(g);
      g.connect(this._sfx);
      src.start();
      beat++;
      // Accelerate
      interval = Math.max(80, interval - 3);
      this._gallopInterval = window.setTimeout(tick, interval);
    };
    tick();
  }

  stopGallop(): void {
    if (this._gallopInterval !== null) {
      clearTimeout(this._gallopInterval);
      this._gallopInterval = null;
    }
  }

  /** Power meter oscillating tone — pitch follows meter position. */
  startMeterTone(): void {
    this.stopMeterTone();
    const ctx = this._ensure();
    if (!ctx) return;
    this._meterOsc = ctx.createOscillator();
    this._meterOsc.type = "sine";
    this._meterOsc.frequency.value = 300;
    this._meterGain = ctx.createGain();
    this._meterGain.gain.value = 0.06;
    this._meterOsc.connect(this._meterGain);
    this._meterGain.connect(this._sfx);
    this._meterOsc.start();
  }

  /** Update meter tone pitch based on position (0-1). */
  updateMeterTone(pos: number): void {
    if (!this._meterOsc) return;
    // Higher pitch near center (perfect zone)
    const dist = Math.abs(pos - 0.5);
    const freq = 200 + (1 - dist * 2) * 400; // 200-600 Hz
    this._meterOsc.frequency.value = freq;
  }

  stopMeterTone(): void {
    if (this._meterOsc) {
      try { this._meterOsc.stop(); } catch { /* noop */ }
      this._meterOsc = null;
    }
    this._meterGain = null;
  }

  /** Start crowd ambient murmur. */
  startCrowd(): void {
    this.stopCrowd();
    const ctx = this._ensure();
    if (!ctx) return;
    const bufLen = Math.floor(ctx.sampleRate * 3);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.015 * w) / 1.015;
      // Modulate with slow wave for murmur effect
      data[i] = last * 2 * (0.5 + 0.5 * Math.sin(i / ctx.sampleRate * Math.PI * 2 * 0.3));
    }
    this._crowdSource = ctx.createBufferSource();
    this._crowdSource.buffer = buf;
    this._crowdSource.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.value = 300;
    flt.Q.value = 0.5;
    this._crowdSource.connect(flt);
    flt.connect(this._crowd);
    this._crowdSource.start();
  }

  /** Crowd cheer burst (on hit/unhorse). */
  crowdCheer(intensity: number): void {
    if (!this._crowd) return;
    const ctx = this._ensure();
    if (!ctx) return;
    // Brief noise burst with higher frequency = excitement
    const len = Math.floor(ctx.sampleRate * 0.3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.5)) * intensity;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.15 * intensity;
    const flt = ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.value = 400 + intensity * 400;
    flt.Q.value = 0.8;
    src.connect(flt);
    flt.connect(g);
    g.connect(this._crowd);
    src.start();
  }

  stopCrowd(): void {
    if (this._crowdSource) {
      try { this._crowdSource.stop(); } catch { /* noop */ }
      this._crowdSource = null;
    }
  }
}

/** Singleton instance. */
export const joustingAudio = new JoustingAudio();
