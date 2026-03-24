// ---------------------------------------------------------------------------
// Echo — Audio
// ---------------------------------------------------------------------------
let _ctx: AudioContext | null = null;
function ctx(): AudioContext { if (!_ctx) _ctx = new AudioContext(); return _ctx; }
function play(f: number, d: number, t: OscillatorType = "sine", v = 0.1, dl = 0) {
  try { const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
    o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime + dl);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dl + d);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + dl); o.stop(c.currentTime + dl + d);
  } catch { /* */ }
}
export function playShoot() { play(600, 0.06, "triangle", 0.04); }
export function playHit() { play(300, 0.08, "triangle", 0.05); }
export function playKill() { play(500, 0.1, "sine", 0.06); play(700, 0.08, "sine", 0.04, 0.04); }
export function playDamage() { play(150, 0.25, "sawtooth", 0.12); }
export function playLoopComplete() { play(440, 0.15, "sine", 0.1); play(660, 0.2, "sine", 0.1, 0.1); play(880, 0.25, "sine", 0.1, 0.2); }
export function playLoopStart() { play(330, 0.1, "sine", 0.08); play(440, 0.1, "sine", 0.06, 0.08); }
export function playDeath() { play(200, 0.4, "sawtooth", 0.12); play(100, 0.6, "sawtooth", 0.08, 0.2); }
export function playVictory() { play(440, 0.2, "sine", 0.1); play(550, 0.2, "sine", 0.1, 0.15); play(660, 0.25, "sine", 0.1, 0.3); play(880, 0.3, "sine", 0.12, 0.45); }
