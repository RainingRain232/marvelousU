// ---------------------------------------------------------------------------
// The Last Flame — Procedural audio (v2)
// Tension-responsive: heartbeat, shadow proximity, stalker tone, drone mod
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
function ctx(): AudioContext { if (!_ctx) _ctx = new AudioContext(); return _ctx; }
function ensureResumed(): void { const c = ctx(); if (c.state === "suspended") c.resume(); }

export function playLFFlare(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(800, t + 0.15);
  g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.3);
  const o2 = c.createOscillator(), g2 = c.createGain();
  o2.type = "sawtooth"; o2.frequency.setValueAtTime(100, t); o2.frequency.exponentialRampToValueAtTime(50, t + 0.2);
  g2.gain.setValueAtTime(0.05, t + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o2.connect(g2).connect(c.destination); o2.start(t + 0.05); o2.stop(t + 0.25);
}

export function playLFCollect(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(500 + i * 300, t + i * 0.06);
    g.gain.setValueAtTime(0.07, t + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
    o.connect(g).connect(c.destination); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.12);
  }
}

export function playLFHit(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(250, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.3);
  g.gain.setValueAtTime(0.12, t); g.gain.linearRampToValueAtTime(0, t + 0.35);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.35);
}

export function playLFDeath(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
  g.gain.setValueAtTime(0.15, t); g.gain.linearRampToValueAtTime(0, t + 0.8);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.8);
}

export function playLFWave(): void {
  ensureResumed(); const c = ctx(); const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.5);
  g.gain.setValueAtTime(0.08, t); g.gain.linearRampToValueAtTime(0, t + 0.6);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.6);
}

// ---------------------------------------------------------------------------
// Continuous audio layers
// ---------------------------------------------------------------------------

let _droneOsc: OscillatorNode | null = null;
let _droneGain: GainNode | null = null;
let _heartOsc: OscillatorNode | null = null;
let _heartGain: GainNode | null = null;
let _stalkerOsc: OscillatorNode | null = null;
let _stalkerGain: GainNode | null = null;

export function startLFDrone(): void {
  if (_droneOsc) return;
  ensureResumed(); const c = ctx();

  // Base drone
  _droneOsc = c.createOscillator(); _droneGain = c.createGain();
  _droneOsc.type = "sine"; _droneOsc.frequency.setValueAtTime(45, c.currentTime);
  _droneGain.gain.setValueAtTime(0, c.currentTime);
  _droneGain.gain.linearRampToValueAtTime(0.03, c.currentTime + 2);
  _droneOsc.connect(_droneGain).connect(c.destination); _droneOsc.start(c.currentTime);

  // Heartbeat oscillator (silent by default, activated at low fuel)
  _heartOsc = c.createOscillator(); _heartGain = c.createGain();
  _heartOsc.type = "sine"; _heartOsc.frequency.setValueAtTime(40, c.currentTime);
  _heartGain.gain.setValueAtTime(0, c.currentTime);
  _heartOsc.connect(_heartGain).connect(c.destination); _heartOsc.start(c.currentTime);

  // Stalker tone (silent by default)
  _stalkerOsc = c.createOscillator(); _stalkerGain = c.createGain();
  _stalkerOsc.type = "sine"; _stalkerOsc.frequency.setValueAtTime(600, c.currentTime);
  _stalkerGain.gain.setValueAtTime(0, c.currentTime);
  _stalkerOsc.connect(_stalkerGain).connect(c.destination); _stalkerOsc.start(c.currentTime);
}

/** Call each frame to modulate audio tension based on game state */
export function updateLFAudio(fuel: number, wave: number, nearestShadowDist: number, hasStalker: boolean): void {
  if (!_droneGain || !_heartGain || !_stalkerGain || !_droneOsc || !_heartOsc || !_stalkerOsc) return;
  const c = ctx(); const t = c.currentTime;

  // Drone: pitch and volume rise with wave
  const dronePitch = 45 + wave * 2;
  const droneVol = 0.03 + Math.min(0.03, wave * 0.003);
  _droneOsc.frequency.setTargetAtTime(dronePitch, t, 0.5);
  _droneGain.gain.setTargetAtTime(droneVol, t, 0.3);

  // Heartbeat: activates below 30% fuel, gets faster/louder as fuel drops
  if (fuel < 0.3 && fuel > 0) {
    const urgency = 1 - fuel / 0.3; // 0 at 30%, 1 at 0%
    const heartVol = 0.02 + urgency * 0.04;
    const heartFreq = 35 + urgency * 15; // faster pitch = faster heartbeat feel
    _heartOsc.frequency.setTargetAtTime(heartFreq, t, 0.1);
    _heartGain.gain.setTargetAtTime(heartVol, t, 0.1);
    // Pulse the gain for heartbeat rhythm
    const pulse = Math.sin(t * (3 + urgency * 5)) > 0.3 ? heartVol : heartVol * 0.1;
    _heartGain.gain.setTargetAtTime(pulse, t, 0.02);
  } else {
    _heartGain.gain.setTargetAtTime(0, t, 0.3);
  }

  // Shadow proximity: drone gets more ominous when shadows are near
  if (nearestShadowDist < 80) {
    const proximity = 1 - nearestShadowDist / 80;
    _droneGain.gain.setTargetAtTime(droneVol + proximity * 0.02, t, 0.1);
    _droneOsc.frequency.setTargetAtTime(dronePitch - proximity * 10, t, 0.1);
  }

  // Stalker tone
  if (hasStalker) {
    _stalkerOsc.frequency.setTargetAtTime(500 + Math.sin(t * 0.5) * 100, t, 0.3);
    _stalkerGain.gain.setTargetAtTime(0.012, t, 0.5);
  } else {
    _stalkerGain.gain.setTargetAtTime(0, t, 0.5);
  }
}

export function stopLFDrone(): void {
  const c = ctx();
  if (_droneGain) _droneGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  if (_heartGain) _heartGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
  if (_stalkerGain) _stalkerGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
  setTimeout(() => {
    for (const o of [_droneOsc, _heartOsc, _stalkerOsc]) { if (o) { try { o.stop(); } catch {} } }
    _droneOsc = null; _droneGain = null; _heartOsc = null; _heartGain = null; _stalkerOsc = null; _stalkerGain = null;
  }, 600);
}
