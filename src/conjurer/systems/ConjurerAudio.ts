// ---------------------------------------------------------------------------
// Conjurer — Audio (Web Audio API)
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
function ctx(): AudioContext { if (!_ctx) _ctx = new AudioContext(); return _ctx; }

function play(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12, delay = 0) {
  try {
    const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur);
  } catch { /* ignore */ }
}

export function playFireCast() { play(200, 0.2, "sawtooth", 0.1); play(150, 0.3, "triangle", 0.08); }
export function playIceCast() { play(800, 0.1, "sine", 0.08); play(1200, 0.08, "sine", 0.06, 0.03); play(600, 0.12, "sine", 0.05, 0.06); }
export function playLightningCast() { play(1500, 0.05, "sawtooth", 0.12); play(100, 0.15, "square", 0.08, 0.02); }
export function playVoidCast() { play(60, 0.5, "sine", 0.12); play(80, 0.4, "triangle", 0.08); }
export function playHit() { play(300, 0.08, "triangle", 0.06); }
export function playKill() { play(500, 0.1, "sine", 0.08); play(700, 0.08, "sine", 0.06, 0.05); }
export function playBossKill() { play(440, 0.2, "sine", 0.12); play(660, 0.2, "sine", 0.1, 0.1); play(880, 0.25, "sine", 0.1, 0.2); }
export function playDamage() { play(150, 0.3, "sawtooth", 0.15); play(100, 0.4, "square", 0.1); }
export function playManaCollect() { play(660, 0.06, "sine", 0.05); }
export function playWaveClear() { play(440, 0.15, "sine", 0.1); play(660, 0.15, "sine", 0.1, 0.1); play(880, 0.2, "sine", 0.1, 0.2); }
export function playLevelUp() { play(880, 0.15, "sine", 0.1); play(1100, 0.2, "sine", 0.1, 0.1); }
export function playDeath() { play(200, 0.5, "sawtooth", 0.15); play(150, 0.6, "sawtooth", 0.1, 0.2); play(100, 0.8, "sawtooth", 0.08, 0.4); }
export function playVictory() { play(440, 0.2, "sine", 0.12); play(550, 0.2, "sine", 0.1, 0.15); play(660, 0.25, "sine", 0.1, 0.3); play(880, 0.3, "sine", 0.12, 0.45); }
export function playCycle() { play(400, 0.06, "sine", 0.05); }
export function playDodge() { play(500, 0.08, "triangle", 0.06); play(300, 0.06, "sine", 0.04, 0.03); }
export function playUltimate() { play(220, 0.3, "sine", 0.15); play(330, 0.3, "sine", 0.12, 0.1); play(440, 0.4, "sine", 0.12, 0.2); play(660, 0.5, "sine", 0.1, 0.3); }
export function playCooldownReady() { play(880, 0.05, "sine", 0.04); play(1100, 0.04, "sine", 0.03, 0.03); }
