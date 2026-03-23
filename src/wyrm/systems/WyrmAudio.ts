// ---------------------------------------------------------------------------
// Wyrm — Procedural audio via Web Audio API
// Tiny synth sounds for game events — no assets needed.
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

function ensureResumed(): void {
  const c = ctx();
  if (c.state === "suspended") c.resume();
}

// ---------------------------------------------------------------------------
// Eat sound — short rising chirp
// ---------------------------------------------------------------------------

export function playEat(): void {
  ensureResumed();
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.08);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.1);
}

// ---------------------------------------------------------------------------
// Combo sound — higher pitch chirp
// ---------------------------------------------------------------------------

export function playCombo(comboCount: number): void {
  ensureResumed();
  const c = ctx();
  const baseFreq = 400 + comboCount * 80;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(baseFreq, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.12);
}

// ---------------------------------------------------------------------------
// Powerup sound — two-tone ascending
// ---------------------------------------------------------------------------

export function playPowerup(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(500 + i * 300, t + i * 0.08);
    gain.gain.setValueAtTime(0.1, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.15);
  }
}

// ---------------------------------------------------------------------------
// Fire breath — continuous low rumble (call once per fire activation)
// ---------------------------------------------------------------------------

export function playFire(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const noise = c.createOscillator();
  const gain = c.createGain();
  noise.type = "sawtooth";
  noise.frequency.setValueAtTime(80, t);
  noise.frequency.exponentialRampToValueAtTime(40, t + 0.3);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  noise.connect(gain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.3);
}

// ---------------------------------------------------------------------------
// Shield break — metallic clang
// ---------------------------------------------------------------------------

export function playShieldBreak(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}

// ---------------------------------------------------------------------------
// Death sound — descending buzz
// ---------------------------------------------------------------------------

export function playDeath(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.5);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

// ---------------------------------------------------------------------------
// Turn click — subtle tick for direction changes
// ---------------------------------------------------------------------------

export function playTurn(): void {
  ensureResumed();
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, c.currentTime);
  gain.gain.setValueAtTime(0.03, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.03);
}

// ---------------------------------------------------------------------------
// Wave warning — ominous low tone
// ---------------------------------------------------------------------------

export function playWave(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

// ---------------------------------------------------------------------------
// Portal warp — sci-fi swoosh
// ---------------------------------------------------------------------------

export function playPortal(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.3);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

// ---------------------------------------------------------------------------
// Boss hit — heavy impact
// ---------------------------------------------------------------------------

export function playBossHit(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

// ---------------------------------------------------------------------------
// Milestone fanfare — triumphant chord
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Ambient drone — subtle background atmosphere
// ---------------------------------------------------------------------------

let _droneOsc: OscillatorNode | null = null;
let _droneGain: GainNode | null = null;

export function startDrone(): void {
  if (_droneOsc) return;
  ensureResumed();
  const c = ctx();
  _droneOsc = c.createOscillator();
  _droneGain = c.createGain();
  _droneOsc.type = "sine";
  _droneOsc.frequency.setValueAtTime(55, c.currentTime); // low A
  _droneGain.gain.setValueAtTime(0, c.currentTime);
  _droneGain.gain.linearRampToValueAtTime(0.03, c.currentTime + 2);
  _droneOsc.connect(_droneGain).connect(c.destination);
  _droneOsc.start(c.currentTime);

  // Second harmonic
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(82.5, c.currentTime); // fifth
  gain2.gain.setValueAtTime(0, c.currentTime);
  gain2.gain.linearRampToValueAtTime(0.015, c.currentTime + 3);
  osc2.connect(gain2).connect(c.destination);
  osc2.start(c.currentTime);
}

export function stopDrone(): void {
  if (_droneGain) {
    const c = ctx();
    _droneGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  }
  setTimeout(() => {
    if (_droneOsc) { try { _droneOsc.stop(); } catch {} _droneOsc = null; }
    _droneGain = null;
  }, 600);
}

// ---------------------------------------------------------------------------
// Milestone fanfare — triumphant chord
// ---------------------------------------------------------------------------

export function playMilestone(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [523, 659, 784]; // C5, E5, G5 — major chord
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.06);
    gain.gain.setValueAtTime(0.08, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.4);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.4);
  }
}
