// ---------------------------------------------------------------------------
// Merlin's Duel — Procedural audio via Web Audio API
// Tiny synth sounds for duel events — no assets needed.
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

/** Create a white-noise buffer source. */
function createNoise(c: AudioContext, duration: number): AudioBufferSourceNode {
  const len = Math.ceil(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

// ---------------------------------------------------------------------------
// 1. Fire spell — whooshing fire: noise burst with bandpass sweep + warm
//    sawtooth undertone
// ---------------------------------------------------------------------------

export function playDuelFireSpell(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Noise burst through bandpass sweep
  const noise = createNoise(c, 0.5);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(400, t);
  bp.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
  bp.frequency.exponentialRampToValueAtTime(300, t + 0.5);
  bp.Q.setValueAtTime(2, t);
  const nGain = c.createGain();
  nGain.gain.setValueAtTime(0.2, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  noise.connect(bp).connect(nGain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.5);

  // Warm sawtooth undertone
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.45);
}

// ---------------------------------------------------------------------------
// 2. Ice spell — crystalline ice: high sine with rapid vibrato, crackling
//    noise, descending pitch
// ---------------------------------------------------------------------------

export function playDuelIceSpell(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // High sine with rapid vibrato
  const osc = c.createOscillator();
  const vibrato = c.createOscillator();
  const vibratoGain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(2400, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);
  vibrato.type = "sine";
  vibrato.frequency.setValueAtTime(30, t);
  vibratoGain.gain.setValueAtTime(60, t);
  vibrato.connect(vibratoGain).connect(osc.frequency);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + 0.45);
  vibrato.stop(t + 0.45);

  // Crackling noise
  const noise = createNoise(c, 0.35);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(4000, t);
  const nGain = c.createGain();
  nGain.gain.setValueAtTime(0.06, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  noise.connect(hp).connect(nGain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.35);
}

// ---------------------------------------------------------------------------
// 3. Lightning spell — electric crack: short white noise burst with high-pass
//    filter, sine buzz with FM
// ---------------------------------------------------------------------------

export function playDuelLightningSpell(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Short white noise burst with high-pass
  const noise = createNoise(c, 0.15);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(3000, t);
  const nGain = c.createGain();
  nGain.gain.setValueAtTime(0.25, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  noise.connect(hp).connect(nGain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.15);

  // Sine buzz with FM
  const mod = c.createOscillator();
  const modGain = c.createGain();
  const carrier = c.createOscillator();
  const cGain = c.createGain();
  mod.type = "square";
  mod.frequency.setValueAtTime(150, t);
  modGain.gain.setValueAtTime(400, t);
  mod.connect(modGain).connect(carrier.frequency);
  carrier.type = "sine";
  carrier.frequency.setValueAtTime(200, t);
  cGain.gain.setValueAtTime(0.12, t);
  cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  carrier.connect(cGain).connect(c.destination);
  carrier.start(t);
  mod.start(t);
  carrier.stop(t + 0.2);
  mod.stop(t + 0.2);
}

// ---------------------------------------------------------------------------
// 4. Arcane spell — ethereal: multiple detuned sines creating shimmer,
//    ascending sweep
// ---------------------------------------------------------------------------

export function playDuelArcaneSpell(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  const baseFreqs = [440, 444, 436, 550, 554]; // detuned cluster
  for (let i = 0; i < baseFreqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreqs[i], t);
    osc.frequency.exponentialRampToValueAtTime(baseFreqs[i] * 2, t + 0.6);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  }
}

// ---------------------------------------------------------------------------
// 5. Shield — force field: low hum with ascending harmonics
// ---------------------------------------------------------------------------

export function playDuelShield(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Low hum
  const hum = c.createOscillator();
  const humGain = c.createGain();
  hum.type = "sawtooth";
  hum.frequency.setValueAtTime(60, t);
  humGain.gain.setValueAtTime(0.06, t);
  humGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  hum.connect(humGain).connect(c.destination);
  hum.start(t);
  hum.stop(t + 0.5);

  // Ascending harmonics
  const harmonics = [200, 400, 600, 800];
  for (let i = 0; i < harmonics.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(harmonics[i], t + i * 0.04);
    osc.frequency.exponentialRampToValueAtTime(harmonics[i] * 1.5, t + i * 0.04 + 0.3);
    gain.gain.setValueAtTime(0.03, t + i * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.04);
    osc.stop(t + i * 0.04 + 0.35);
  }
}

// ---------------------------------------------------------------------------
// 6. Hit — impact: low sine thud + filtered noise crunch
// ---------------------------------------------------------------------------

export function playDuelHit(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Low sine thud
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(100, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.18);

  // Filtered noise crunch
  const noise = createNoise(c, 0.12);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(800, t);
  bp.Q.setValueAtTime(1, t);
  const nGain = c.createGain();
  nGain.gain.setValueAtTime(0.15, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  noise.connect(bp).connect(nGain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.12);
}

// ---------------------------------------------------------------------------
// 7. Dodge — quick whoosh: bandpass-filtered noise sweep
// ---------------------------------------------------------------------------

export function playDuelDodge(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  const noise = createNoise(c, 0.2);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(3000, t + 0.1);
  bp.frequency.exponentialRampToValueAtTime(500, t + 0.2);
  bp.Q.setValueAtTime(3, t);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  noise.connect(bp).connect(gain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.2);
}

// ---------------------------------------------------------------------------
// 8. Block — metallic clang: high triangle with fast decay + bass impact
// ---------------------------------------------------------------------------

export function playDuelBlock(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // High triangle clang
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.12);

  // Bass impact
  const bass = c.createOscillator();
  const bGain = c.createGain();
  bass.type = "sine";
  bass.frequency.setValueAtTime(80, t);
  bass.frequency.exponentialRampToValueAtTime(30, t + 0.1);
  bGain.gain.setValueAtTime(0.15, t);
  bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  bass.connect(bGain).connect(c.destination);
  bass.start(t);
  bass.stop(t + 0.12);
}

// ---------------------------------------------------------------------------
// 9. Victory — triumphant: ascending C-E-G major chord
// ---------------------------------------------------------------------------

export function playDuelVictory(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [523, 659, 784]; // C5, E5, G5
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.08);
    gain.gain.setValueAtTime(0.1, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.5);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.5);
  }
}

// ---------------------------------------------------------------------------
// 10. Defeat — descending minor chord: C-Ab-F, slow fade
// ---------------------------------------------------------------------------

export function playDuelDefeat(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [523, 415, 349]; // C5, Ab4, F4 — descending minor
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.12);
    gain.gain.setValueAtTime(0.1, t + i * 0.12);
    gain.gain.linearRampToValueAtTime(0, t + i * 0.12 + 0.8);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.12);
    osc.stop(t + i * 0.12 + 0.8);
  }
}

// ---------------------------------------------------------------------------
// 11. Countdown — short sine pip at 880Hz
// ---------------------------------------------------------------------------

export function playDuelCountdown(): void {
  ensureResumed();
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, c.currentTime);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.08);
}

// ---------------------------------------------------------------------------
// 12. Fight — low brass-like sawtooth chord
// ---------------------------------------------------------------------------

export function playDuelFight(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [130, 164, 196]; // C3, E3, G3 — low major chord
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freqs[i], t);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }
}

// ---------------------------------------------------------------------------
// 13. Ambience — persistent magical drone with LFO
// ---------------------------------------------------------------------------

let _ambOsc1: OscillatorNode | null = null;
let _ambOsc2: OscillatorNode | null = null;
let _ambLfo: OscillatorNode | null = null;
let _ambGain: GainNode | null = null;

export function startDuelAmbience(): void {
  if (_ambOsc1) return;
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  _ambGain = c.createGain();
  _ambGain.gain.setValueAtTime(0, t);
  _ambGain.gain.linearRampToValueAtTime(0.03, t + 2);
  _ambGain.connect(c.destination);

  // Base drone
  _ambOsc1 = c.createOscillator();
  _ambOsc1.type = "sine";
  _ambOsc1.frequency.setValueAtTime(65, t); // low C
  _ambOsc1.connect(_ambGain);
  _ambOsc1.start(t);

  // Fifth above
  _ambOsc2 = c.createOscillator();
  _ambOsc2.type = "sine";
  _ambOsc2.frequency.setValueAtTime(98, t); // G below middle C
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.6, t);
  _ambOsc2.connect(g2).connect(_ambGain);
  _ambOsc2.start(t);

  // LFO modulating gain for magical pulsing
  _ambLfo = c.createOscillator();
  const lfoGain = c.createGain();
  _ambLfo.type = "sine";
  _ambLfo.frequency.setValueAtTime(0.4, t);
  lfoGain.gain.setValueAtTime(0.015, t);
  _ambLfo.connect(lfoGain).connect(_ambGain.gain);
  _ambLfo.start(t);
}

export function stopDuelAmbience(): void {
  if (_ambGain) {
    const c = ctx();
    _ambGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  }
  setTimeout(() => {
    if (_ambOsc1) { try { _ambOsc1.stop(); } catch {} _ambOsc1 = null; }
    if (_ambOsc2) { try { _ambOsc2.stop(); } catch {} _ambOsc2 = null; }
    if (_ambLfo) { try { _ambLfo.stop(); } catch {} _ambLfo = null; }
    _ambGain = null;
  }, 600);
}

// ---------------------------------------------------------------------------
// 14. Critical — double impact with glass shatter harmonics
// ---------------------------------------------------------------------------

export function playDuelCritical(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // First impact
  for (let i = 0; i < 2; i++) {
    const offset = i * 0.08;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, t + offset);
    osc.frequency.exponentialRampToValueAtTime(30, t + offset + 0.12);
    gain.gain.setValueAtTime(0.2, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.15);
  }

  // Glass shatter harmonics
  const shatterFreqs = [2200, 3100, 4400, 5800];
  for (let i = 0; i < shatterFreqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(shatterFreqs[i], t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(shatterFreqs[i] * 0.5, t + 0.35);
    gain.gain.setValueAtTime(0.04, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start(t + 0.05);
    osc.stop(t + 0.35);
  }
}

// ---------------------------------------------------------------------------
// 15. Mana restore — gentle ascending 3-tone arpeggio
// ---------------------------------------------------------------------------

export function playDuelManaRestore(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [392, 494, 587]; // G4, B4, D5 — gentle major
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.1);
    gain.gain.setValueAtTime(0.08, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.3);
  }
}
