// ---------------------------------------------------------------------------
// Depths of Avalon — Web Audio underwater soundscape
// Full procedural audio: ambient drone, combat pulse, ability SFX, heartbeat
// ---------------------------------------------------------------------------

export class DepthsAudio {
  private _ctx: AudioContext | null = null;
  private _masterGain!: GainNode;

  // Drone
  private _droneOsc!: OscillatorNode;
  private _droneGain!: GainNode;
  private _droneFilter!: BiquadFilterNode;

  // Bubble layer
  private _bubbleTimer = 0;

  // Combat pulse
  private _combatOsc!: OscillatorNode;
  private _combatGain!: GainNode;

  // Heartbeat (low HP)
  private _heartbeatTimer = 0;
  private _heartbeatActive = false;

  // State
  private _depthFactor = 0;
  private _combatIntensity = 0;
  private _started = false;

  start(): void {
    if (this._started) return;
    try { this._ctx = new AudioContext(); } catch { return; }
    this._started = true;

    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.15;
    this._masterGain.connect(this._ctx.destination);

    // Deep drone
    this._droneOsc = this._ctx.createOscillator();
    this._droneOsc.type = "sine";
    this._droneOsc.frequency.value = 55;
    this._droneFilter = this._ctx.createBiquadFilter();
    this._droneFilter.type = "lowpass";
    this._droneFilter.frequency.value = 120;
    this._droneGain = this._ctx.createGain();
    this._droneGain.gain.value = 0.3;
    this._droneOsc.connect(this._droneFilter);
    this._droneFilter.connect(this._droneGain);
    this._droneGain.connect(this._masterGain);
    this._droneOsc.start();

    // Second harmonic
    const drone2 = this._ctx.createOscillator();
    drone2.type = "sine";
    drone2.frequency.value = 82.5;
    const drone2Gain = this._ctx.createGain();
    drone2Gain.gain.value = 0.1;
    drone2.connect(drone2Gain);
    drone2Gain.connect(this._masterGain);
    drone2.start();

    // Combat pulse
    this._combatOsc = this._ctx.createOscillator();
    this._combatOsc.type = "sine";
    this._combatOsc.frequency.value = 40;
    this._combatGain = this._ctx.createGain();
    this._combatGain.gain.value = 0;
    this._combatOsc.connect(this._combatGain);
    this._combatGain.connect(this._masterGain);
    this._combatOsc.start();
  }

  update(depth: number, nearestEnemyDist: number, dt: number, hpRatio = 1): void {
    if (!this._ctx || !this._started) return;
    if (this._ctx.state === "suspended") this._ctx.resume();

    // Depth factor
    const targetDepth = Math.min(1, depth / 150);
    this._depthFactor += (targetDepth - this._depthFactor) * 2 * dt;
    this._droneOsc.frequency.value = 55 - this._depthFactor * 25;
    this._droneGain.gain.value = 0.2 + this._depthFactor * 0.3;
    this._droneFilter.frequency.value = 120 - this._depthFactor * 50;

    // Combat intensity
    const targetCombat = nearestEnemyDist < 15 ? (1 - nearestEnemyDist / 15) : 0;
    this._combatIntensity += (targetCombat - this._combatIntensity) * 3 * dt;
    this._combatGain.gain.value = this._combatIntensity * 0.15;
    this._combatOsc.frequency.value = 40 + this._combatIntensity * 20;

    // Random bubble pops
    this._bubbleTimer -= dt;
    if (this._bubbleTimer <= 0) {
      this._bubbleTimer = 0.3 + Math.random() * 1.5;
      this._playBubble();
    }

    // Heartbeat when low HP
    this._heartbeatActive = hpRatio < 0.3 && hpRatio > 0;
    if (this._heartbeatActive) {
      this._heartbeatTimer -= dt;
      if (this._heartbeatTimer <= 0) {
        this._heartbeatTimer = 0.6 + hpRatio * 0.8; // faster when lower HP
        this._playHeartbeat(hpRatio);
      }
    }
  }

  // ---- One-shot SFX ----

  playHit(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Meaty underwater thud
    const osc = this._ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 80 + Math.random() * 40;
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    const filter = this._ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 350;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playCritHit(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Higher pitch metallic ring
    const osc = this._ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    const filter = this._ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;
    filter.Q.value = 3;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playCollect(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Sparkly ascending chime
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playDash(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Whoosh — filtered noise sweep
    const bufferSize = this._ctx.sampleRate * 0.2;
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = this._ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this._ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    filter.Q.value = 2;
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    noise.start(now);
  }

  playHarpoon(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Twang + whoosh
    const osc = this._ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playChargeRelease(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Deep impact boom
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    const filter = this._ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playBossSpawn(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Deep horn — two-tone ascending
    for (let i = 0; i < 2; i++) {
      const osc = this._ctx.createOscillator();
      osc.type = "sawtooth";
      const t = now + i * 0.3;
      osc.frequency.setValueAtTime(60 + i * 20, t);
      osc.frequency.linearRampToValueAtTime(90 + i * 30, t + 0.25);
      const gain = this._ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      gain.gain.setValueAtTime(0.1, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      const filter = this._ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + 0.45);
    }
  }

  playRelic(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Magical chime — three ascending notes
    const notes = [523, 659, 784]; // C5, E5, G5
    for (let i = 0; i < 3; i++) {
      const osc = this._ctx.createOscillator();
      osc.type = "sine";
      const t = now + i * 0.12;
      osc.frequency.value = notes[i];
      const gain = this._ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + 0.45);
    }
  }

  playExcalibur(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Grand ascending fanfare
    const notes = [261, 329, 392, 523, 659, 784]; // C4 → G5
    for (let i = 0; i < notes.length; i++) {
      const osc = this._ctx.createOscillator();
      osc.type = "sine";
      const t = now + i * 0.15;
      osc.frequency.value = notes[i];
      const gain = this._ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.03);
      gain.gain.setValueAtTime(0.08, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + 0.85);
    }
    // Sustained chord underneath
    const chord = [261, 329, 392];
    for (const freq of chord) {
      const osc = this._ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = this._ctx.createGain();
      gain.gain.setValueAtTime(0, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.8);
      gain.gain.setValueAtTime(0.04, now + 2.0);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(now + 0.5);
      osc.stop(now + 3.5);
    }
  }

  playZoneTransition(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    // Deep whomp
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  // ---- Internal ----

  private _playBubble(): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 800 + Math.random() * 1200;
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0.02 + Math.random() * 0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + Math.random() * 0.1);
    const filter = this._ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = osc.frequency.value;
    filter.Q.value = 5;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private _playHeartbeat(hpRatio: number): void {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    const vol = 0.06 + (1 - hpRatio) * 0.08;
    // Double thump: lub-dub
    for (let i = 0; i < 2; i++) {
      const osc = this._ctx.createOscillator();
      osc.type = "sine";
      const t = now + i * 0.12;
      osc.frequency.setValueAtTime(i === 0 ? 50 : 40, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.1);
      const gain = this._ctx.createGain();
      gain.gain.setValueAtTime(i === 0 ? vol : vol * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  }

  destroy(): void {
    if (this._ctx) { this._ctx.close(); this._ctx = null; }
    this._started = false;
  }
}
