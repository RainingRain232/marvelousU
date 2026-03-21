// ---------------------------------------------------------------------------
// Morgan -- Audio System (Web Audio API)
// Procedural sound effects: footsteps, spells, guard alerts, ambient,
// heartbeat at low HP, torch crackle, artifact chime, damage, UI sounds
// ---------------------------------------------------------------------------

export class MorganAudio {
  private _ctx: AudioContext | null = null;
  private _masterGain!: GainNode;
  private _sfxGain!: GainNode;
  private _ambientGain!: GainNode;
  private _musicGain!: GainNode;
  private _ambientSource: AudioBufferSourceNode | null = null;
  private _heartbeatInterval: number | null = null;
  private _footstepTimer = 0;
  private _enabled = true;

  init(): void {
    try {
      this._ctx = new AudioContext();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.4;
      this._masterGain.connect(this._ctx.destination);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = 0.6;
      this._sfxGain.connect(this._masterGain);

      this._ambientGain = this._ctx.createGain();
      this._ambientGain.gain.value = 0.15;
      this._ambientGain.connect(this._masterGain);

      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = 0.08;
      this._musicGain.connect(this._masterGain);

      this._startAmbient();
      this._startDrone();
    } catch {
      this._enabled = false;
    }
  }

  private _ensure(): AudioContext | null {
    if (!this._enabled || !this._ctx) return null;
    if (this._ctx.state === "suspended") this._ctx.resume();
    return this._ctx;
  }

  // --- Ambient wind/cave drone ---
  private _startAmbient(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    // Brown noise for ambient cave atmosphere
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this._ambientSource = ctx.createBufferSource();
    this._ambientSource.buffer = buffer;
    this._ambientSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    this._ambientSource.connect(filter);
    filter.connect(this._ambientGain);
    this._ambientSource.start();
  }

  // --- Dark drone for atmosphere ---
  private _startDrone(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    // Low sine drone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 55; // low A
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.03;
    osc.connect(oscGain);
    oscGain.connect(this._musicGain);
    osc.start();
    // Modulate with LFO
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();
  }

  // --- Sound effects ---

  playFootstep(sneaking: boolean, sprinting: boolean): void {
    const ctx = this._ensure();
    if (!ctx) return;
    // Short noise burst filtered differently based on movement type
    const duration = sneaking ? 0.04 : sprinting ? 0.08 : 0.06;
    const bufSize = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = sneaking ? 400 : sprinting ? 1200 : 800;
    const gain = ctx.createGain();
    gain.gain.value = sneaking ? 0.05 : sprinting ? 0.25 : 0.12;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfxGain);
    src.start();
  }

  playSpellCast(spell: string): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (spell === "shadow_cloak") {
      // Whoosh down
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(g); g.connect(this._sfxGain);
      osc.start(now); osc.stop(now + 0.5);
    } else if (spell === "dark_bolt") {
      // Sharp zap
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(2000, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(g); g.connect(this._sfxGain);
      osc.start(now); osc.stop(now + 0.2);
    } else if (spell === "sleep_mist") {
      // Hiss
      const bufSize = Math.floor(ctx.sampleRate * 0.6);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * 0.5;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 2;
      const g = ctx.createGain(); g.gain.value = 0.1;
      src.connect(f); f.connect(g); g.connect(this._sfxGain);
      src.start();
    } else if (spell === "blink") {
      // Pop
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g); g.connect(this._sfxGain);
      osc.start(now); osc.stop(now + 0.1);
    } else if (spell === "decoy") {
      // Shimmer
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.15);
      osc.frequency.linearRampToValueAtTime(500, now + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(g); g.connect(this._sfxGain);
      osc.start(now); osc.stop(now + 0.35);
    }
  }

  playGuardAlert(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Alarm horn
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(400, now + 0.15);
    osc.frequency.setValueAtTime(300, now + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g); g.connect(this._sfxGain);
    osc.start(now); osc.stop(now + 0.5);
  }

  playGuardDeath(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Thud + low tone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g); g.connect(this._sfxGain);
    osc.start(now); osc.stop(now + 0.4);
  }

  playBackstab(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Sharp slice
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g); g.connect(this._sfxGain);
    osc.start(now); osc.stop(now + 0.15);
  }

  playArtifactCollect(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Ascending chime
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.1, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(g); g.connect(this._sfxGain);
      osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.3);
    });
  }

  playPickup(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g); g.connect(this._sfxGain);
    osc.start(now); osc.stop(now + 0.15);
  }

  playDamage(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    // Impact noise
    const bufSize = Math.floor(ctx.sampleRate * 0.15);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.2));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    const g = ctx.createGain(); g.gain.value = 0.25;
    src.connect(f); f.connect(g); g.connect(this._sfxGain);
    src.start();
  }

  playTrapTrigger(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Mechanical click + alarm
    const osc1 = ctx.createOscillator();
    osc1.type = "square";
    osc1.frequency.value = 1500;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.15, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc1.connect(g1); g1.connect(this._sfxGain);
    osc1.start(now); osc1.stop(now + 0.05);
    // Alarm buzz
    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.value = 440;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now + 0.05);
    g2.gain.linearRampToValueAtTime(0.1, now + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g2); g2.connect(this._sfxGain);
    osc2.start(now + 0.05); osc2.stop(now + 0.5);
  }

  playDoorUnlock(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Key turning + click
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(800, now + 0.1);
    osc.frequency.setValueAtTime(400, now + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g); g.connect(this._sfxGain);
    osc.start(now); osc.stop(now + 0.25);
  }

  playLevelComplete(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Triumphant ascending arpeggio
    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(g); g.connect(this._sfxGain);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.5);
    });
  }

  playExitOpen(): void {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Mystical shimmer
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 523 * (1 + i * 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.15);
      g.gain.linearRampToValueAtTime(0.08, now + i * 0.15 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.6);
      osc.connect(g); g.connect(this._sfxGain);
      osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.6);
    }
  }

  // --- Heartbeat at low HP ---
  updateHeartbeat(hpRatio: number): void {
    const ctx = this._ensure();
    if (!ctx) return;
    if (hpRatio < 0.3 && !this._heartbeatInterval) {
      const beat = () => {
        if (!this._ctx || this._ctx.state === "closed") return;
        const now = this._ctx.currentTime;
        // Double thump
        for (let i = 0; i < 2; i++) {
          const osc = this._ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(60, now + i * 0.15);
          osc.frequency.exponentialRampToValueAtTime(30, now + i * 0.15 + 0.1);
          const g = this._ctx.createGain();
          g.gain.setValueAtTime(0.15 * (1 - hpRatio), now + i * 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.15);
          osc.connect(g); g.connect(this._sfxGain);
          osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.15);
        }
      };
      beat();
      this._heartbeatInterval = window.setInterval(beat, 800) as unknown as number;
    } else if (hpRatio >= 0.3 && this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  // --- Tick footsteps based on player state ---
  tickFootsteps(dt: number, moving: boolean, sneaking: boolean, sprinting: boolean): void {
    if (!moving) return;
    this._footstepTimer += dt;
    const interval = sprinting ? 0.2 : sneaking ? 0.55 : 0.35;
    if (this._footstepTimer >= interval) {
      this._footstepTimer = 0;
      this.playFootstep(sneaking, sprinting);
    }
  }

  destroy(): void {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
    if (this._ambientSource) {
      try { this._ambientSource.stop(); } catch { /* noop */ }
      this._ambientSource = null;
    }
    if (this._ctx && this._ctx.state !== "closed") {
      this._ctx.close();
    }
    this._ctx = null;
  }
}
