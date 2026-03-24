// ---------------------------------------------------------------------------
// Flux — Audio
// ---------------------------------------------------------------------------
let _ctx: AudioContext | null = null;
function ctx(): AudioContext { if (!_ctx) _ctx = new AudioContext(); return _ctx; }
function play(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12, delay = 0) {
  try { const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur);
  } catch { /* ignore */ }
}
export function playPlaceWell() { play(120, 0.3, "sine", 0.1); play(180, 0.2, "triangle", 0.06, 0.05); }
export function playSlingshot() { play(400, 0.1, "triangle", 0.08); play(600, 0.08, "sine", 0.05, 0.04); }
export function playCollision() { play(200, 0.15, "sawtooth", 0.08); play(150, 0.1, "square", 0.06); }
export function playRedirect() { play(800, 0.1, "sine", 0.08); play(1000, 0.08, "sine", 0.06, 0.04); }
export function playDamage() { play(150, 0.3, "sawtooth", 0.12); play(100, 0.4, "square", 0.08); }
export function playKill() { play(500, 0.1, "sine", 0.06); play(700, 0.08, "sine", 0.04, 0.04); }
export function playExplosion() { play(80, 0.5, "sawtooth", 0.12); play(60, 0.4, "square", 0.1); }
export function playWaveClear() { play(440, 0.15, "sine", 0.1); play(660, 0.15, "sine", 0.1, 0.1); play(880, 0.2, "sine", 0.1, 0.2); }
export function playDeath() { play(200, 0.5, "sawtooth", 0.12); play(100, 0.7, "sawtooth", 0.08, 0.3); }
export function playVictory() { play(440, 0.2, "sine", 0.1); play(660, 0.25, "sine", 0.1, 0.15); play(880, 0.3, "sine", 0.12, 0.3); }
export function playRecharge() { play(600, 0.06, "sine", 0.04); }
