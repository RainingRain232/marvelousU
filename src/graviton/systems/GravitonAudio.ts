// ---------------------------------------------------------------------------
// Graviton — Procedural audio
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
function ctx(): AudioContext { if (!_ctx) _ctx = new AudioContext(); return _ctx; }
function ensureResumed(): void { const c = ctx(); if (c.state === "suspended") c.resume(); }

export function playGCapture(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(800, t + 0.08);
  g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.1);
}

export function playGFling(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.15);
  g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.2);
}

export function playGKill(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(500 + i * 200, t + i * 0.05);
    g.gain.setValueAtTime(0.06, t + i * 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.1);
    o.connect(g).connect(c.destination); o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.1);
  }
}

export function playGHit(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.3);
  g.gain.setValueAtTime(0.1, t); g.gain.linearRampToValueAtTime(0, t + 0.3);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.3);
}

export function playGDeath(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(250, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.7);
  g.gain.setValueAtTime(0.12, t); g.gain.linearRampToValueAtTime(0, t + 0.7);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.7);
}

export function playGWave(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(100, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
  g.gain.setValueAtTime(0.07, t); g.gain.linearRampToValueAtTime(0, t + 0.5);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.5);
}

let _droneOsc: OscillatorNode | null = null;
let _droneGain: GainNode | null = null;
let _pullOsc: OscillatorNode | null = null;
let _pullGain: GainNode | null = null;

export function startGDrone(): void {
  if (_droneOsc) return;
  ensureResumed(); const c = ctx();
  _droneOsc = c.createOscillator(); _droneGain = c.createGain();
  _droneOsc.type = "sine"; _droneOsc.frequency.setValueAtTime(55, c.currentTime);
  _droneGain.gain.setValueAtTime(0, c.currentTime);
  _droneGain.gain.linearRampToValueAtTime(0.02, c.currentTime + 2);
  _droneOsc.connect(_droneGain).connect(c.destination); _droneOsc.start(c.currentTime);

  // Pull hum oscillator (silent by default)
  _pullOsc = c.createOscillator(); _pullGain = c.createGain();
  _pullOsc.type = "sine"; _pullOsc.frequency.setValueAtTime(80, c.currentTime);
  _pullGain.gain.setValueAtTime(0, c.currentTime);
  _pullOsc.connect(_pullGain).connect(c.destination); _pullOsc.start(c.currentTime);
}

/** Update audio based on game state */
export function updateGAudio(pulling: boolean, orbitCount: number, wave: number, threatLevel: number, hp: number, maxHp: number): void {
  if (!_droneGain || !_pullGain || !_droneOsc || !_pullOsc) return;
  const c = ctx(); const t = c.currentTime;

  // Drone: pitch and volume rise with wave + threat
  const dronePitch = 55 + wave * 2 + orbitCount * 3 + threatLevel * 15;
  const droneVol = 0.02 + orbitCount * 0.002 + threatLevel * 0.015;
  _droneOsc.frequency.setTargetAtTime(dronePitch, t, 0.3);
  _droneGain.gain.setTargetAtTime(droneVol, t, 0.3);

  // Pull hum
  if (pulling) {
    _pullOsc.frequency.setTargetAtTime(80 + orbitCount * 15, t, 0.1);
    _pullGain.gain.setTargetAtTime(0.015, t, 0.1);
  } else {
    _pullGain.gain.setTargetAtTime(0, t, 0.2);
  }

  // Low HP heartbeat via drone modulation
  if (hp <= 1 && hp > 0) {
    const heartPulse = Math.sin(t * 5) > 0.3 ? droneVol + 0.02 : droneVol * 0.5;
    _droneGain.gain.setTargetAtTime(heartPulse, t, 0.03);
    _droneOsc.frequency.setTargetAtTime(dronePitch - 10, t, 0.1);
  }
}

export function stopGDrone(): void {
  const c = ctx();
  if (_droneGain) _droneGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  if (_pullGain) _pullGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
  setTimeout(() => {
    for (const o of [_droneOsc, _pullOsc]) { if (o) { try { o.stop(); } catch {} } }
    _droneOsc = null; _droneGain = null; _pullOsc = null; _pullGain = null;
  }, 600);
}
