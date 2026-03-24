// ---------------------------------------------------------------------------
// Void Knight — Procedural audio via Web Audio API
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
function ctx(): AudioContext { if (!_ctx) _ctx = new AudioContext(); return _ctx; }
function ensureResumed(): void { const c = ctx(); if (c.state === "suspended") c.resume(); }

export function playVKDash(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(1600, t + 0.08);
  g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.1);
}

export function playVKCollect(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(600 + i * 400, t + i * 0.06);
    g.gain.setValueAtTime(0.08, t + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
    o.connect(g).connect(c.destination); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.12);
  }
}

export function playVKNearMiss(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.05);
  g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.06);
}

export function playVKHit(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
  g.gain.setValueAtTime(0.12, t); g.gain.linearRampToValueAtTime(0, t + 0.35);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.35);
}

export function playVKDeath(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.6);
  g.gain.setValueAtTime(0.15, t); g.gain.linearRampToValueAtTime(0, t + 0.6);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.6);
}

export function playVKWave(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const freqs = [440, 550, 660];
  for (let i = 0; i < freqs.length; i++) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(freqs[i], t + i * 0.08);
    g.gain.setValueAtTime(0.06, t + i * 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
    o.connect(g).connect(c.destination); o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.3);
  }
}

let _droneOsc: OscillatorNode | null = null;
let _droneGain: GainNode | null = null;

let _harmOsc: OscillatorNode | null = null;
let _harmGain: GainNode | null = null;
let _bassOsc: OscillatorNode | null = null;
let _bassGain: GainNode | null = null;

export function startVKDrone(): void {
  if (_droneOsc) return;
  ensureResumed(); const c = ctx();
  // Base drone
  _droneOsc = c.createOscillator(); _droneGain = c.createGain();
  _droneOsc.type = "sine"; _droneOsc.frequency.setValueAtTime(65, c.currentTime);
  _droneGain.gain.setValueAtTime(0, c.currentTime);
  _droneGain.gain.linearRampToValueAtTime(0.025, c.currentTime + 2);
  _droneOsc.connect(_droneGain).connect(c.destination); _droneOsc.start(c.currentTime);

  // Multiplier harmonic layer (fades in with multiplier)
  _harmOsc = c.createOscillator(); _harmGain = c.createGain();
  _harmOsc.type = "sine"; _harmOsc.frequency.setValueAtTime(130, c.currentTime);
  _harmGain.gain.setValueAtTime(0, c.currentTime);
  _harmOsc.connect(_harmGain).connect(c.destination); _harmOsc.start(c.currentTime);

  // Boss bass layer
  _bassOsc = c.createOscillator(); _bassGain = c.createGain();
  _bassOsc.type = "triangle"; _bassOsc.frequency.setValueAtTime(40, c.currentTime);
  _bassGain.gain.setValueAtTime(0, c.currentTime);
  _bassOsc.connect(_bassGain).connect(c.destination); _bassOsc.start(c.currentTime);
}

/** Call each frame to adjust audio layers based on game state */
export function updateVKAudio(multiplier: number, projCount: number, wave: number, hasBoss: boolean, slowActive: boolean): void {
  if (!_droneGain || !_harmGain || !_bassGain || !_droneOsc || !_harmOsc) return;
  const c = ctx(); const t = c.currentTime;

  // Base drone: pitch rises with wave
  const basePitch = 65 + wave * 3;
  _droneOsc.frequency.setTargetAtTime(basePitch, t, 0.5);

  // Drone volume: increases slightly with projectile density
  const densityVol = 0.02 + Math.min(0.02, projCount * 0.0005);
  _droneGain.gain.setTargetAtTime(densityVol, t, 0.3);

  // Harmonic: fades in with multiplier (audible above 2x)
  const harmVol = Math.max(0, Math.min(0.02, (multiplier - 1.5) * 0.008));
  _harmGain.gain.setTargetAtTime(harmVol, t, 0.3);
  _harmOsc.frequency.setTargetAtTime(basePitch * 2 + multiplier * 10, t, 0.3);

  // Boss bass: only during boss fights
  const bossVol = hasBoss ? 0.015 : 0;
  _bassGain.gain.setTargetAtTime(bossVol, t, 0.5);

  // Slow-time: drop drone pitch
  if (slowActive) {
    _droneOsc.frequency.setTargetAtTime(basePitch * 0.7, t, 0.1);
  }
}

export function playVKDashReady(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(900, t);
  g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.08);
}

export function playVKMultMilestone(mult: number): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const baseFreq = 400 + mult * 60;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(baseFreq, t); o.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.12);
  g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.15);
}

export function stopVKDrone(): void {
  const c = ctx();
  if (_droneGain) _droneGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  if (_harmGain) _harmGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  if (_bassGain) _bassGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  setTimeout(() => {
    for (const o of [_droneOsc, _harmOsc, _bassOsc]) { if (o) { try { o.stop(); } catch {} } }
    _droneOsc = null; _droneGain = null; _harmOsc = null; _harmGain = null; _bassOsc = null; _bassGain = null;
  }, 600);
}
