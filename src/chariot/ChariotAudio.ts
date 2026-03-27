/**
 * ChariotAudio — Procedural Web Audio API sound engine for the chariot racing game.
 *
 * All sounds are synthesized in real-time — no audio files needed.
 * Channels: master → sfx, engine, ambient, music
 */

export class ChariotAudio {
  private _ctx: AudioContext | null = null;
  private _master!: GainNode;
  private _sfx!: GainNode;
  private _engine!: GainNode;
  private _ambient!: GainNode;
  private _music!: GainNode;

  // continuous engine
  private _engineOsc1: OscillatorNode | null = null;
  private _engineOsc2: OscillatorNode | null = null;
  private _engineGain: GainNode | null = null;
  private _engineFilter: BiquadFilterNode | null = null;

  // gallop rhythm
  private _gallopTimer = 0;
  private _gallopInterval = 0.3;

  // wind
  private _windNoise: AudioBufferSourceNode | null = null;
  private _windGain: GainNode | null = null;
  private _windFilter: BiquadFilterNode | null = null;

  // crowd ambient
  private _crowdNoise: AudioBufferSourceNode | null = null;
  private _crowdGain: GainNode | null = null;

  // music drone
  private _droneOsc: OscillatorNode | null = null;
  private _droneGain: GainNode | null = null;

  private _muted = false;

  // ── init ───────────────────────────────────────────────────────────────────

  init(): void {
    if (this._ctx) return;
    this._ctx = new AudioContext();

    this._master = this._ctx.createGain();
    this._master.gain.value = 0.35;
    this._master.connect(this._ctx.destination);

    this._sfx = this._ctx.createGain();
    this._sfx.gain.value = 0.7;
    this._sfx.connect(this._master);

    this._engine = this._ctx.createGain();
    this._engine.gain.value = 0.5;
    this._engine.connect(this._master);

    this._ambient = this._ctx.createGain();
    this._ambient.gain.value = 0.3;
    this._ambient.connect(this._master);

    this._music = this._ctx.createGain();
    this._music.gain.value = 0.15;
    this._music.connect(this._master);

    this._startEngine();
    this._startWind();
    this._startCrowd();
    this._startDrone();
  }

  destroy(): void {
    try {
      this._engineOsc1?.stop();
      this._engineOsc2?.stop();
      this._windNoise?.stop();
      this._crowdNoise?.stop();
      this._droneOsc?.stop();
    } catch { /* already stopped */ }
    this._ctx?.close();
    this._ctx = null;
  }

  toggleMute(): void {
    this._muted = !this._muted;
    if (this._master) this._master.gain.value = this._muted ? 0 : 0.35;
  }

  // ── continuous engine sound ────────────────────────────────────────────────

  private _startEngine(): void {
    const ctx = this._ctx!;

    // two detuned sawtooth oscillators for rich rumble
    this._engineOsc1 = ctx.createOscillator();
    this._engineOsc1.type = "sawtooth";
    this._engineOsc1.frequency.value = 45;

    this._engineOsc2 = ctx.createOscillator();
    this._engineOsc2.type = "square";
    this._engineOsc2.frequency.value = 47;

    this._engineFilter = ctx.createBiquadFilter();
    this._engineFilter.type = "lowpass";
    this._engineFilter.frequency.value = 200;
    this._engineFilter.Q.value = 3;

    this._engineGain = ctx.createGain();
    this._engineGain.gain.value = 0;

    this._engineOsc1.connect(this._engineFilter);
    this._engineOsc2.connect(this._engineFilter);
    this._engineFilter.connect(this._engineGain);
    this._engineGain.connect(this._engine);

    this._engineOsc1.start();
    this._engineOsc2.start();
  }

  /** Call every frame with speed 0..1 normalized */
  updateEngine(speedPct: number, boosting: boolean): void {
    if (!this._ctx || !this._engineOsc1 || !this._engineGain || !this._engineFilter) return;
    const now = this._ctx.currentTime;

    // pitch scales with speed: idle 45Hz → top speed 120Hz
    const basePitch = 45 + speedPct * 75;
    const boostAdd = boosting ? 30 : 0;
    this._engineOsc1.frequency.setTargetAtTime(basePitch + boostAdd, now, 0.1);
    this._engineOsc2!.frequency.setTargetAtTime(basePitch * 1.02 + boostAdd, now, 0.1);

    // volume
    const vol = Math.min(0.25, speedPct * 0.3);
    this._engineGain.gain.setTargetAtTime(vol, now, 0.05);

    // filter opens with speed
    this._engineFilter.frequency.setTargetAtTime(200 + speedPct * 600 + (boosting ? 400 : 0), now, 0.1);
  }

  // ── wind ───────────────────────────────────────────────────────────────────

  private _startWind(): void {
    const ctx = this._ctx!;
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // brown noise for wind
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }

    this._windNoise = ctx.createBufferSource();
    this._windNoise.buffer = buf;
    this._windNoise.loop = true;

    this._windFilter = ctx.createBiquadFilter();
    this._windFilter.type = "bandpass";
    this._windFilter.frequency.value = 400;
    this._windFilter.Q.value = 0.5;

    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0;

    this._windNoise.connect(this._windFilter);
    this._windFilter.connect(this._windGain);
    this._windGain.connect(this._ambient);
    this._windNoise.start();
  }

  updateWind(speedPct: number): void {
    if (!this._ctx || !this._windGain || !this._windFilter) return;
    const now = this._ctx.currentTime;
    this._windGain.gain.setTargetAtTime(speedPct * 0.4, now, 0.2);
    this._windFilter.frequency.setTargetAtTime(300 + speedPct * 800, now, 0.15);
  }

  // ── crowd ambient ──────────────────────────────────────────────────────────

  private _startCrowd(): void {
    const ctx = this._ctx!;
    const bufSize = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // filtered noise
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    this._crowdNoise = ctx.createBufferSource();
    this._crowdNoise.buffer = buf;
    this._crowdNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 500;
    filter.Q.value = 1.5;

    this._crowdGain = ctx.createGain();
    this._crowdGain.gain.value = 0.08;

    this._crowdNoise.connect(filter);
    filter.connect(this._crowdGain);
    this._crowdGain.connect(this._ambient);
    this._crowdNoise.start();
  }

  // ── background music drone ─────────────────────────────────────────────────

  private _startDrone(): void {
    const ctx = this._ctx!;
    this._droneOsc = ctx.createOscillator();
    this._droneOsc.type = "sine";
    this._droneOsc.frequency.value = 55; // A1

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(this._droneOsc.frequency);
    lfo.start();

    this._droneGain = ctx.createGain();
    this._droneGain.gain.value = 0.15;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 100;

    this._droneOsc.connect(droneFilter);
    droneFilter.connect(this._droneGain);
    this._droneGain.connect(this._music);
    this._droneOsc.start();
  }

  // ── gallop hoofbeats ───────────────────────────────────────────────────────

  updateGallop(dt: number, speedPct: number): void {
    if (!this._ctx || speedPct < 0.1) return;

    // gallop interval decreases with speed
    this._gallopInterval = 0.15 + (1 - speedPct) * 0.25;
    this._gallopTimer -= dt;

    if (this._gallopTimer <= 0) {
      this._gallopTimer = this._gallopInterval;
      this._playHoofbeat(speedPct);
    }
  }

  private _playHoofbeat(speedPct: number): void {
    const ctx = this._ctx!;
    const now = ctx.currentTime;

    // short noise burst for each hoofbeat
    const bufSize = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400 + speedPct * 300;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06 + speedPct * 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfx);
    src.start(now);
    src.stop(now + 0.05);
  }

  // ── one-shot SFX ───────────────────────────────────────────────────────────

  playCountdown(num: number): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const freq = num > 0 ? 440 : 880; // GO! is higher
    const dur = num > 0 ? 0.15 : 0.3;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this._sfx);
    osc.start(now);
    osc.stop(now + dur);

    if (num === 0) {
      // second higher tone for GO
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 1320;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.15, now + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(g2);
      g2.connect(this._sfx);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.35);
    }
  }

  playWhipCrack(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // sharp noise burst (crack)
    const bufSize = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.05));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfx);
    src.start(now);
    src.stop(now + 0.1);

    // tonal swoosh component
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.15, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(og);
    og.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playDriftStart(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // tire squeal: filtered noise
    const bufSize = Math.floor(ctx.sampleRate * 0.3);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setTargetAtTime(0.06, now + 0.1, 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfx);
    src.start(now);
    src.stop(now + 0.4);
  }

  playDriftBoost(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // ascending whoosh
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playBoost(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // deep rush + high shimmer
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.4);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(600, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.3);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfx);
    osc1.start(now); osc1.stop(now + 0.6);
    osc2.start(now); osc2.stop(now + 0.5);
  }

  playShieldActivate(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // shimmering ascending tones
    const notes = [330, 440, 554, 660];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.06);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
      osc.connect(g);
      g.connect(this._sfx);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    });
  }

  playLightningStrike(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // thunder crack: loud filtered noise burst
    const bufSize = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    src.connect(gain);
    gain.connect(this._sfx);
    src.start(now);
    src.stop(now + 0.6);

    // electric zap
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.2, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(og);
    og.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playOilDrop(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // wet splat
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playOilSlip(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // slippery squish
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playWallHit(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // heavy impact: low thud + debris crunch
    const bufSize = Math.floor(ctx.sampleRate * 0.15);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.12));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    src.connect(filter);
    filter.connect(g);
    g.connect(this._sfx);
    src.start(now);
    src.stop(now + 0.2);

    // thud tone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.2, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(og);
    og.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playChariotCollision(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // wood crunch
    const bufSize = Math.floor(ctx.sampleRate * 0.1);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.1));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 600;
    filter.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(filter);
    filter.connect(g);
    g.connect(this._sfx);
    src.start(now);
    src.stop(now + 0.12);
  }

  playPowerUpCollect(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // bright chime: two ascending tones
    const freqs = [523, 784]; // C5, G5
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.connect(g);
      g.connect(this._sfx);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  playLapComplete(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // triumphant ascending chord
    const notes = [392, 494, 587, 784]; // G4 B4 D5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.07);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.07 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.4);
      osc.connect(g);
      g.connect(this._sfx);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.4);
    });
  }

  playVictory(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // victory fanfare: ascending chord progression
    const chords = [
      [523, 659, 784],     // C E G
      [587, 740, 880],     // D F# A
      [659, 831, 988],     // E G# B
      [784, 988, 1175],    // G B D
    ];
    chords.forEach((chord, ci) => {
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = ci < 2 ? "sine" : "triangle";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        const t = now + ci * 0.25;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.05);
        g.gain.setValueAtTime(0.1, t + 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g);
        g.connect(this._sfx);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    });
  }

  playDefeat(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // descending sad tones
    const notes = [392, 330, 262, 196]; // G4 E4 C4 G3
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, now + i * 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.3);
      osc.connect(g);
      g.connect(this._sfx);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.3);
    });
  }

  playStartBoost(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // powerful whoosh + rising tone
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  playSlipstream(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // subtle suction whoosh
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(g);
    g.connect(this._sfx);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}
