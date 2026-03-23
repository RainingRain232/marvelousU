// ---------------------------------------------------------------------------
// The Shifting Labyrinth – Procedural Audio Engine
// ---------------------------------------------------------------------------
// All sounds generated via Web Audio API oscillators + noise.
// No external audio files required.
// ---------------------------------------------------------------------------

export class LabyrinthAudio {
  private _ctx: AudioContext | null = null;
  private _master: GainNode | null = null;
  private _ambGain: GainNode | null = null;
  private _ambOsc: OscillatorNode | null = null;

  init(): void {
    if (this._ctx) return;
    this._ctx = new AudioContext();
    this._master = this._ctx.createGain();
    this._master.gain.value = 0.3;
    this._master.connect(this._ctx.destination);
  }

  private _ensureCtx(): boolean {
    if (!this._ctx || !this._master) {
      this.init();
    }
    return !!(this._ctx && this._master);
  }

  // ── Ambient drone (eerie low hum) ──

  startAmbient(zoneIdx: number): void {
    this.stopAmbient();
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;

    this._ambGain = ctx.createGain();
    this._ambGain.gain.value = 0.06;
    this._ambGain.connect(this._master!);

    const freqs = [55, 49, 62, 41, 37]; // zone drones
    const freq = freqs[zoneIdx % freqs.length];

    this._ambOsc = ctx.createOscillator();
    this._ambOsc.type = "triangle";
    this._ambOsc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;

    this._ambOsc.connect(filter);
    filter.connect(this._ambGain);
    this._ambOsc.start();
  }

  stopAmbient(): void {
    if (this._ambOsc) {
      try { this._ambOsc.stop(); } catch { /* ignore */ }
      this._ambOsc = null;
    }
  }

  // ── Footstep (short click) ──

  footstep(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 80 + Math.random() * 40;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // ── Rune collect (magical chime) ──

  runeCollect(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const g = ctx.createGain();
      const t = now + i * 0.08;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(g);
      g.connect(this._master!);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // ── Fuel pickup (warm whoosh) ──

  fuelCollect(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 600;

    osc.connect(f);
    f.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // ── Powerup (ascending tone) ──

  powerup(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // ── Minotaur roar (distorted bass growl) ──

  minotaurRoar(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 300;

    osc.connect(f);
    f.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.65);

    // Second harmonic
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(45, now);
    osc2.frequency.exponentialRampToValueAtTime(25, now + 0.4);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.06, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc2.connect(g2);
    g2.connect(this._master!);
    osc2.start(now);
    osc2.stop(now + 0.55);
  }

  // ── Minotaur alert (short warning tone) ──

  minotaurAlert(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 220;

      const g = ctx.createGain();
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 300;

      osc.connect(f);
      f.connect(g);
      g.connect(this._master!);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // ── Wall shift (rumble) ──

  wallShift(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    // Low rumble via noise-like oscillator
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.linearRampToValueAtTime(25, now + 0.4);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, now);
    g.gain.linearRampToValueAtTime(0.001, now + 0.5);

    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 150;

    osc.connect(f);
    f.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.55);

    // Crumble clicks
    for (let i = 0; i < 5; i++) {
      const click = ctx.createOscillator();
      click.type = "square";
      click.frequency.value = 100 + Math.random() * 100;

      const cg = ctx.createGain();
      const ct = now + i * 0.08 + Math.random() * 0.04;
      cg.gain.setValueAtTime(0.04, ct);
      cg.gain.exponentialRampToValueAtTime(0.001, ct + 0.04);

      click.connect(cg);
      cg.connect(this._master!);
      click.start(ct);
      click.stop(ct + 0.05);
    }
  }

  // ── Player damage (impact thud) ──

  playerHit(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // ── Player death (low descending tone) ──

  playerDeath(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const notes = [220, 185, 147, 110];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;

      const g = ctx.createGain();
      const t = now + i * 0.2;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 400;

      osc.connect(f);
      f.connect(g);
      g.connect(this._master!);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // ── Victory (triumphant ascending arpeggio) ──

  victory(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const g = ctx.createGain();
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(g);
      g.connect(this._master!);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // ── Trap sounds ──

  spikeTrap(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // ── Shop purchase ──

  purchase(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(550, now + 0.08);
    osc.frequency.setValueAtTime(660, now + 0.16);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // ── Decoy throw (whoosh) ──

  decoyThrow(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // ── Treasure (coin jingle) ──

  treasureCollect(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const notes = [587, 784, 988, 1175]; // D5, G5, B5, D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const g = ctx.createGain();
      const t = now + i * 0.06;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(g);
      g.connect(this._master!);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // ── Compass proximity ping (pitch rises with closeness) ──

  compassPing(closeness: number): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const freq = 400 + closeness * 600; // 400-1000 Hz based on proximity
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // ── Decoy expiring (fizzle) ──

  decoyExpire(): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400;

    osc.connect(f);
    f.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // ── Rune chain combo chime ──

  runeChain(count: number): void {
    if (!this._ensureCtx()) return;
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    // Rising tone based on chain count
    const baseFreq = 500 + count * 100;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.1);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(g);
    g.connect(this._master!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  destroy(): void {
    this.stopAmbient();
    if (this._ctx) {
      this._ctx.close().catch(() => {});
      this._ctx = null;
      this._master = null;
    }
  }
}
