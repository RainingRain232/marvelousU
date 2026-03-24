// ---------------------------------------------------------------------------
// Phantom — Audio (v2) — Web Audio API procedural sounds
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

function play(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0) {
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur);
  } catch { /* ignore */ }
}

export function playStep() { play(80, 0.05, "triangle", 0.04); }
export function playRelicCollect() { play(880, 0.15, "sine", 0.12); play(1100, 0.2, "sine", 0.1, 0.08); }
export function playKeyCollect() { play(660, 0.12, "sine", 0.1); play(990, 0.15, "sine", 0.1, 0.06); }
export function playDoorUnlock() { play(330, 0.2, "triangle", 0.1); play(440, 0.15, "sine", 0.08, 0.1); play(550, 0.15, "sine", 0.08, 0.2); }
export function playStonePickup() { play(400, 0.1, "triangle", 0.08); }
export function playStoneThrow() { play(200, 0.15, "sawtooth", 0.06); }
export function playStoneLand() { play(120, 0.2, "triangle", 0.1); }
export function playDetected() { play(300, 0.3, "sawtooth", 0.15); play(250, 0.4, "sawtooth", 0.1); }
export function playCaught() { play(150, 0.5, "sawtooth", 0.2); play(100, 0.6, "square", 0.15); }
export function playExitOpen() { play(660, 0.2, "sine", 0.1); play(880, 0.25, "sine", 0.12, 0.1); play(1100, 0.3, "sine", 0.1, 0.2); }
export function playFloorClear() { play(440, 0.15, "sine", 0.12); play(660, 0.2, "sine", 0.12, 0.1); play(880, 0.25, "sine", 0.12, 0.2); play(1100, 0.3, "sine", 0.1, 0.3); }
export function playTrapTriggered() { play(200, 0.3, "square", 0.12); play(150, 0.35, "square", 0.1); }
export function playHide() { play(300, 0.1, "sine", 0.05); }
export function playGameOver() { play(220, 0.4, "sawtooth", 0.15); play(165, 0.5, "sawtooth", 0.12, 0.15); play(110, 0.7, "sawtooth", 0.1, 0.3); }
export function playVictory() { play(440, 0.2, "sine", 0.12); play(550, 0.2, "sine", 0.12, 0.15); play(660, 0.25, "sine", 0.12, 0.3); play(880, 0.3, "sine", 0.15, 0.45); }

// New v2 sounds
export function playShadowDash() { play(600, 0.15, "sine", 0.08); play(900, 0.1, "sine", 0.06, 0.05); play(1200, 0.08, "sine", 0.04, 0.1); }
export function playSmokeBomb() { play(100, 0.4, "triangle", 0.1); play(80, 0.5, "triangle", 0.08); }
export function playBackstab() { play(150, 0.12, "sawtooth", 0.1); play(800, 0.08, "sine", 0.08, 0.05); }
export function playGhostRating() { play(880, 0.2, "sine", 0.1); play(1100, 0.25, "sine", 0.1, 0.15); play(1320, 0.3, "sine", 0.08, 0.3); }

// Ambient drone
let _droneOsc: OscillatorNode | null = null;
let _droneGain: GainNode | null = null;

export function startDrone(): void {
  try {
    const c = ctx();
    _droneOsc = c.createOscillator();
    _droneGain = c.createGain();
    _droneOsc.type = "sine";
    _droneOsc.frequency.value = 55;
    _droneGain.gain.value = 0.03;
    _droneOsc.connect(_droneGain);
    _droneGain.connect(c.destination);
    _droneOsc.start();
  } catch { /* ignore */ }
}

export function stopDrone(): void {
  try {
    if (_droneOsc) { _droneOsc.stop(); _droneOsc.disconnect(); _droneOsc = null; }
    if (_droneGain) { _droneGain.disconnect(); _droneGain = null; }
  } catch { /* ignore */ }
}
