// ---------------------------------------------------------------------------
// Rampart — procedural audio (Web Audio API)
// ---------------------------------------------------------------------------

export class RampartAudio {
  private _ctx: AudioContext | null = null;
  private _master: GainNode | null = null;
  private _bgGain: GainNode | null = null;
  private _bgOsc1: OscillatorNode | null = null;
  private _bgOsc2: OscillatorNode | null = null;

  start(): void {
    this._ctx = new AudioContext();
    this._master = this._ctx.createGain();
    this._master.gain.value = 0.3;
    this._master.connect(this._ctx.destination);

    // Ambient background drone
    this._bgGain = this._ctx.createGain();
    this._bgGain.gain.value = 0.04;
    this._bgGain.connect(this._master);

    this._bgOsc1 = this._ctx.createOscillator();
    this._bgOsc1.type = "sine";
    this._bgOsc1.frequency.value = 65;
    this._bgOsc1.connect(this._bgGain);
    this._bgOsc1.start();

    this._bgOsc2 = this._ctx.createOscillator();
    this._bgOsc2.type = "sine";
    this._bgOsc2.frequency.value = 98;
    this._bgOsc2.connect(this._bgGain);
    this._bgOsc2.start();
  }

  playShoot(): void {
    if (!this._ctx || !this._master) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this._ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.1);
    osc.connect(gain).connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.1);
  }

  playHit(): void {
    if (!this._ctx || !this._master) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this._ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.1, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.15);
    osc.connect(gain).connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.15);
  }

  playKill(): void {
    if (!this._ctx || !this._master) return;
    // Satisfying crunch
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this._ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.25);
    osc.connect(gain).connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.25);

    // Coin jingle for gold
    const coin = this._ctx.createOscillator();
    const coinGain = this._ctx.createGain();
    coin.type = "sine";
    coin.frequency.setValueAtTime(1200, this._ctx.currentTime + 0.05);
    coin.frequency.setValueAtTime(1600, this._ctx.currentTime + 0.1);
    coinGain.gain.setValueAtTime(0.06, this._ctx.currentTime + 0.05);
    coinGain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.3);
    coin.connect(coinGain).connect(this._master);
    coin.start(this._ctx.currentTime + 0.05);
    coin.stop(this._ctx.currentTime + 0.3);
  }

  playBuild(): void {
    if (!this._ctx || !this._master) return;
    // Hammer/construction sound
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, this._ctx.currentTime);
    osc.frequency.setValueAtTime(400, this._ctx.currentTime + 0.05);
    osc.frequency.setValueAtTime(600, this._ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.2);
    osc.connect(gain).connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.2);
  }

  playWaveStart(): void {
    if (!this._ctx || !this._master) return;
    // War horn
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, this._ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(165, this._ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(110, this._ctx.currentTime + 1);
    gain.gain.setValueAtTime(0, this._ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, this._ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, this._ctx.currentTime + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 1.2);
    osc.connect(gain).connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 1.2);

    // Second harmony
    const osc2 = this._ctx.createOscillator();
    const gain2 = this._ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(165, this._ctx.currentTime + 0.1);
    osc2.frequency.linearRampToValueAtTime(220, this._ctx.currentTime + 0.6);
    gain2.gain.setValueAtTime(0, this._ctx.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.06, this._ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 1.2);
    osc2.connect(gain2).connect(this._master);
    osc2.start(this._ctx.currentTime + 0.1);
    osc2.stop(this._ctx.currentTime + 1.2);
  }

  playSell(): void {
    if (!this._ctx || !this._master) return;
    // Coins dropping sound
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, this._ctx.currentTime);
    osc.frequency.setValueAtTime(800, this._ctx.currentTime + 0.05);
    osc.frequency.setValueAtTime(600, this._ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.2);
    osc.connect(gain).connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.2);
  }

  playUpgrade(): void {
    if (!this._ctx || !this._master) return;
    // Rising chime — ascending notes
    const notes = [400, 500, 600, 800];
    for (let i = 0; i < notes.length; i++) {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = "sine";
      const t = this._ctx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(notes[i], t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(this._master);
      osc.start(t);
      osc.stop(t + 0.15);
    }
    // Sparkle on top
    const sparkle = this._ctx.createOscillator();
    const sGain = this._ctx.createGain();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(1600, this._ctx.currentTime + 0.3);
    sGain.gain.setValueAtTime(0.06, this._ctx.currentTime + 0.3);
    sGain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.5);
    sparkle.connect(sGain).connect(this._master);
    sparkle.start(this._ctx.currentTime + 0.3);
    sparkle.stop(this._ctx.currentTime + 0.5);
  }

  playCastleDamage(): void {
    if (!this._ctx || !this._master) return;
    // Heavy impact
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this._ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.4);
    osc.connect(gain).connect(this._master);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.4);

    // Rumble noise
    const bufSize = this._ctx.sampleRate * 0.3;
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
    }
    const noise = this._ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this._ctx.createGain();
    nGain.gain.value = 0.08;
    noise.connect(nGain).connect(this._master);
    noise.start();
  }

  destroy(): void {
    if (this._bgOsc1) { try { this._bgOsc1.stop(); } catch {} }
    if (this._bgOsc2) { try { this._bgOsc2.stop(); } catch {} }
    if (this._ctx) { this._ctx.close(); }
    this._ctx = null;
    this._master = null;
  }
}
