// ---------------------------------------------------------------------------
// Grail Quest — Procedural audio via Web Audio API
// Tiny synth sounds for roguelike dungeon events — no assets needed.
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
// Footstep — quiet soft thud (very short, low frequency sine)
// ---------------------------------------------------------------------------

export function playGrailFootstep(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

// ---------------------------------------------------------------------------
// Attack — sword slash (noise burst with quick decay, band-pass filtered)
// ---------------------------------------------------------------------------

export function playGrailAttack(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Layer 1: Noise burst — metallic slash
  const bufferSize = c.sampleRate * 0.15;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(3500, t);
  filter.frequency.exponentialRampToValueAtTime(600, t + 0.12);
  filter.Q.setValueAtTime(3, t);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.15);

  // Layer 2: Tonal impact — low thud for weight
  const osc = c.createOscillator();
  const g2 = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
  g2.gain.setValueAtTime(0.12, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g2).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.1);

  // Layer 3: High ring — blade resonance
  const osc2 = c.createOscillator();
  const g3 = c.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(2200, t + 0.02);
  osc2.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
  g3.gain.setValueAtTime(0.05, t + 0.02);
  g3.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc2.connect(g3).connect(c.destination);
  osc2.start(t + 0.02);
  osc2.stop(t + 0.12);
}

// ---------------------------------------------------------------------------
// Hit — taking damage (low thump + high ping)
// ---------------------------------------------------------------------------

export function playGrailHit(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  // Low thump
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(100, t);
  osc1.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  gain1.gain.setValueAtTime(0.18, t);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc1.connect(gain1).connect(c.destination);
  osc1.start(t);
  osc1.stop(t + 0.12);
  // High ping
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1400, t);
  gain2.gain.setValueAtTime(0.08, t);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc2.connect(gain2).connect(c.destination);
  osc2.start(t);
  osc2.stop(t + 0.15);
}

// ---------------------------------------------------------------------------
// Enemy death — quick ascending notes
// ---------------------------------------------------------------------------

export function playGrailEnemyDeath(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [300, 450, 600, 900];
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.04);
    gain.gain.setValueAtTime(0.08, t + i * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.08);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.04);
    osc.stop(t + i * 0.04 + 0.08);
  }
}

// ---------------------------------------------------------------------------
// Pickup — item collected (bright two-tone chime)
// ---------------------------------------------------------------------------

export function playGrailPickup(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [880, 1320]; // A5, E6
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.08);
    gain.gain.setValueAtTime(0.1, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.15);
  }
}

// ---------------------------------------------------------------------------
// Death — player death (low descending tone, longer)
// ---------------------------------------------------------------------------

export function playGrailDeath(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

// ---------------------------------------------------------------------------
// Level up — fanfare (3 ascending notes, major chord)
// ---------------------------------------------------------------------------

export function playGrailLevelUp(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [523, 659, 784]; // C5, E5, G5 — major chord
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.1);
    gain.gain.setValueAtTime(0.1, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.3);
  }
}

// ---------------------------------------------------------------------------
// Door open — door creak (low frequency modulated tone)
// ---------------------------------------------------------------------------

export function playGrailDoorOpen(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const gain = c.createGain();
  // LFO modulates the main oscillator frequency
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(12, t);
  lfo.frequency.linearRampToValueAtTime(6, t + 0.3);
  lfoGain.gain.setValueAtTime(30, t);
  lfo.connect(lfoGain).connect(osc.frequency);
  // Main oscillator — low creaky tone
  osc.type = "triangle";
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.3);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain).connect(c.destination);
  lfo.start(t);
  osc.start(t);
  lfo.stop(t + 0.35);
  osc.stop(t + 0.35);
}

// ---------------------------------------------------------------------------
// Descend — descending stairs (deep echo reverb tone)
// ---------------------------------------------------------------------------

export function playGrailDescend(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  // Play a sequence of overlapping deep tones to simulate reverb echo
  const freqs = [110, 95, 80];
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.12);
    gain.gain.setValueAtTime(0.1 - i * 0.025, t + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.12);
    osc.stop(t + i * 0.12 + 0.4);
  }
}

// ---------------------------------------------------------------------------
// Chest — chest opening (metallic jingle, 2 quick bright tones)
// ---------------------------------------------------------------------------

export function playGrailChest(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const freqs = [1200, 1600];
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freqs[i], t + i * 0.06);
    gain.gain.setValueAtTime(0.1, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.12);
  }
}

// ---------------------------------------------------------------------------
// Trap — trap triggered (sharp noise burst)
// ---------------------------------------------------------------------------

export function playGrailTrap(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  const bufferSize = c.sampleRate * 0.08;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, t);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.08);
}

// ---------------------------------------------------------------------------
// Victory — finding the Grail (triumphant chord sequence)
// ---------------------------------------------------------------------------

export function playGrailVictory(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;
  // Triumphant chord sequence: C major -> G major -> C major (octave up)
  const chords = [
    [523, 659, 784],     // C5, E5, G5
    [784, 988, 1175],    // G5, B5, D6
    [1047, 1319, 1568],  // C6, E6, G6
  ];
  for (let ci = 0; ci < chords.length; ci++) {
    for (let ni = 0; ni < chords[ci].length; ni++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(chords[ci][ni], t + ci * 0.2);
      gain.gain.setValueAtTime(0.08, t + ci * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + ci * 0.2 + 0.45);
      osc.connect(gain).connect(c.destination);
      osc.start(t + ci * 0.2);
      osc.stop(t + ci * 0.2 + 0.45);
    }
  }
}

// ---------------------------------------------------------------------------
// Ambient dungeon drone — very low continuous hum
// ---------------------------------------------------------------------------

let _droneOsc: OscillatorNode | null = null;
let _droneGain: GainNode | null = null;
let _droneOsc2: OscillatorNode | null = null;
let _droneGain2: GainNode | null = null;
let _droneOsc3: OscillatorNode | null = null;
let _droneGain3: GainNode | null = null;
let _droneLfo: OscillatorNode | null = null;
let _droneLfoGain: GainNode | null = null;

export function startGrailDrone(): void {
  if (_droneOsc) return;
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Primary drone — deep low hum
  _droneOsc = c.createOscillator();
  _droneGain = c.createGain();
  _droneOsc.type = "sine";
  _droneOsc.frequency.setValueAtTime(42, t); // low E
  _droneGain.gain.setValueAtTime(0, t);
  _droneGain.gain.linearRampToValueAtTime(0.025, t + 2);
  _droneOsc.connect(_droneGain).connect(c.destination);
  _droneOsc.start(t);

  // Second harmonic — eerie fifth
  _droneOsc2 = c.createOscillator();
  _droneGain2 = c.createGain();
  _droneOsc2.type = "sine";
  _droneOsc2.frequency.setValueAtTime(63, t); // fifth above
  _droneGain2.gain.setValueAtTime(0, t);
  _droneGain2.gain.linearRampToValueAtTime(0.012, t + 3);
  _droneOsc2.connect(_droneGain2).connect(c.destination);
  _droneOsc2.start(t);

  // Third layer — sub-bass undertone for depth
  _droneOsc3 = c.createOscillator();
  _droneGain3 = c.createGain();
  _droneOsc3.type = "triangle";
  _droneOsc3.frequency.setValueAtTime(28, t); // sub-bass
  _droneGain3.gain.setValueAtTime(0, t);
  _droneGain3.gain.linearRampToValueAtTime(0.015, t + 4);
  _droneOsc3.connect(_droneGain3).connect(c.destination);
  _droneOsc3.start(t);

  // Rhythmic pulse LFO — subtle heartbeat-like amplitude modulation
  _droneLfo = c.createOscillator();
  _droneLfoGain = c.createGain();
  _droneLfo.type = "sine";
  _droneLfo.frequency.setValueAtTime(0.8, t); // slow pulse ~48 BPM
  _droneLfoGain.gain.setValueAtTime(0.008, t); // subtle modulation depth
  _droneLfo.connect(_droneLfoGain);
  _droneLfoGain.connect(_droneGain.gain);
  _droneLfoGain.connect(_droneGain3.gain);
  _droneLfo.start(t);
}

export function stopGrailDrone(): void {
  const c = ctx();
  const t = c.currentTime;
  if (_droneGain) {
    _droneGain.gain.linearRampToValueAtTime(0, t + 0.5);
  }
  if (_droneGain2) {
    _droneGain2.gain.linearRampToValueAtTime(0, t + 0.5);
  }
  if (_droneGain3) {
    _droneGain3.gain.linearRampToValueAtTime(0, t + 0.5);
  }
  if (_droneLfoGain) {
    _droneLfoGain.gain.linearRampToValueAtTime(0, t + 0.3);
  }
  setTimeout(() => {
    if (_droneOsc) { try { _droneOsc.stop(); } catch {} _droneOsc = null; }
    _droneGain = null;
    if (_droneOsc2) { try { _droneOsc2.stop(); } catch {} _droneOsc2 = null; }
    _droneGain2 = null;
    if (_droneOsc3) { try { _droneOsc3.stop(); } catch {} _droneOsc3 = null; }
    _droneGain3 = null;
    if (_droneLfo) { try { _droneLfo.stop(); } catch {} _droneLfo = null; }
    _droneLfoGain = null;
  }, 600);
}

// ---------------------------------------------------------------------------
// Critical hit — dramatic double-strike with reverb
// ---------------------------------------------------------------------------

export function playGrailCritical(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Create a convolver for reverb effect
  const convolver = c.createConvolver();
  const reverbLen = c.sampleRate * 0.4;
  const reverbBuf = c.createBuffer(2, reverbLen, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = reverbBuf.getChannelData(ch);
    for (let i = 0; i < reverbLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (reverbLen * 0.15));
    }
  }
  convolver.buffer = reverbBuf;
  const reverbGain = c.createGain();
  reverbGain.gain.setValueAtTime(0.12, t);
  convolver.connect(reverbGain).connect(c.destination);

  // First strike
  for (let strike = 0; strike < 2; strike++) {
    const offset = strike * 0.08;
    const bufSize = c.sampleRate * 0.12;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = c.createBufferSource();
    noise.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(strike === 0 ? 3000 : 4000, t + offset);
    filter.frequency.exponentialRampToValueAtTime(600, t + offset + 0.1);
    filter.Q.setValueAtTime(4, t + offset);
    const gain = c.createGain();
    gain.gain.setValueAtTime(strike === 0 ? 0.2 : 0.25, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);
    noise.connect(filter).connect(gain);
    gain.connect(c.destination);
    gain.connect(convolver); // send to reverb
    noise.start(t + offset);
    noise.stop(t + offset + 0.12);
  }

  // Low impact tone
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  g.gain.setValueAtTime(0.15, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(g);
  g.connect(c.destination);
  g.connect(convolver);
  osc.start(t + 0.06);
  osc.stop(t + 0.25);
}

// ---------------------------------------------------------------------------
// Boss phase transition — ominous descending tone + rumble
// ---------------------------------------------------------------------------

export function playGrailBossPhase(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Descending ominous tone
  const osc1 = c.createOscillator();
  const g1 = c.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(400, t);
  osc1.frequency.exponentialRampToValueAtTime(60, t + 0.8);
  g1.gain.setValueAtTime(0.1, t);
  g1.gain.linearRampToValueAtTime(0.15, t + 0.3);
  g1.gain.linearRampToValueAtTime(0, t + 0.8);
  osc1.connect(g1).connect(c.destination);
  osc1.start(t);
  osc1.stop(t + 0.8);

  // Sub-bass rumble
  const bufSize = c.sampleRate * 0.8;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const lpf = c.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.setValueAtTime(80, t);
  lpf.Q.setValueAtTime(5, t);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.05, t);
  g2.gain.linearRampToValueAtTime(0.15, t + 0.4);
  g2.gain.linearRampToValueAtTime(0, t + 0.8);
  noise.connect(lpf).connect(g2).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.8);

  // Eerie high overtone
  const osc2 = c.createOscillator();
  const g3 = c.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1200, t + 0.2);
  osc2.frequency.exponentialRampToValueAtTime(800, t + 0.7);
  g3.gain.setValueAtTime(0.04, t + 0.2);
  g3.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc2.connect(g3).connect(c.destination);
  osc2.start(t + 0.2);
  osc2.stop(t + 0.7);
}

// ---------------------------------------------------------------------------
// Shrine — ethereal healing chime (ascending harmonics)
// ---------------------------------------------------------------------------

export function playGrailShrine(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Ascending harmonic series with shimmer
  const freqs = [440, 660, 880, 1100, 1320]; // A4 harmonic series
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const start = t + i * 0.07;
    osc.frequency.setValueAtTime(freqs[i], start);
    osc.frequency.linearRampToValueAtTime(freqs[i] * 1.02, start + 0.3); // gentle shimmer
    gain.gain.setValueAtTime(0.07 - i * 0.008, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.5);
  }

  // Soft pad undertone
  const pad = c.createOscillator();
  const pg = c.createGain();
  pad.type = "triangle";
  pad.frequency.setValueAtTime(220, t);
  pg.gain.setValueAtTime(0.06, t);
  pg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  pad.connect(pg).connect(c.destination);
  pad.start(t);
  pad.stop(t + 0.6);
}

// ---------------------------------------------------------------------------
// Torch extinguish — hissing sound
// ---------------------------------------------------------------------------

export function playGrailTorchOut(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Hissing noise — high-pass filtered white noise with decay
  const bufSize = c.sampleRate * 0.4;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const hpf = c.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.setValueAtTime(4000, t);
  hpf.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  noise.connect(hpf).connect(gain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.4);

  // Low sizzle undertone
  const osc = c.createOscillator();
  const g2 = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
  g2.gain.setValueAtTime(0.04, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g2).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

// ---------------------------------------------------------------------------
// Auto-explore — quick soft footstep sequence
// ---------------------------------------------------------------------------

export function playGrailAutoExplore(): void {
  ensureResumed();
  const c = ctx();
  const t = c.currentTime;

  // Three quick soft footsteps
  for (let i = 0; i < 3; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const start = t + i * 0.06;
    osc.frequency.setValueAtTime(70 + i * 10, start);
    osc.frequency.exponentialRampToValueAtTime(35, start + 0.04);
    gain.gain.setValueAtTime(0.03, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.05);
  }
}

// ---------------------------------------------------------------------------
// Dynamic audio — respond to game state
// ---------------------------------------------------------------------------

export function updateGrailAudio(state: {
  floor: number;
  playerHp: number;
  playerMaxHp: number;
  torchTurns: number;
}): void {
  // Shift drone pitch based on floor depth
  if (_droneOsc && _droneOsc2 && _droneOsc3) {
    const c = ctx();
    const t = c.currentTime;
    const floorMod = Math.max(0, state.floor - 1);
    // Drone gets lower and more ominous on deeper floors
    const basePitch = 42 - floorMod * 1.5;
    _droneOsc.frequency.linearRampToValueAtTime(Math.max(25, basePitch), t + 0.5);
    _droneOsc2.frequency.linearRampToValueAtTime(Math.max(38, 63 - floorMod * 2), t + 0.5);
    _droneOsc3.frequency.linearRampToValueAtTime(Math.max(18, 28 - floorMod), t + 0.5);
  }

  // Faster pulse when low HP (heartbeat effect)
  if (_droneLfo) {
    const c = ctx();
    const t = c.currentTime;
    const hpRatio = state.playerMaxHp > 0 ? state.playerHp / state.playerMaxHp : 1;
    // Pulse speeds up as HP drops: 0.8 Hz at full -> 2.5 Hz at critical
    const pulseRate = hpRatio < 0.3 ? 2.5 : hpRatio < 0.5 ? 1.6 : 0.8;
    _droneLfo.frequency.linearRampToValueAtTime(pulseRate, t + 0.3);
    // Also increase modulation depth when low HP
    if (_droneLfoGain) {
      const depth = hpRatio < 0.3 ? 0.015 : hpRatio < 0.5 ? 0.012 : 0.008;
      _droneLfoGain.gain.linearRampToValueAtTime(depth, t + 0.3);
    }
  }

  // Eerie atmosphere when torch is low
  if (_droneGain2 && state.torchTurns !== undefined) {
    const c = ctx();
    const t = c.currentTime;
    // When torch is low (< 10 turns), make the fifth harmonic louder and dissonant
    if (state.torchTurns > 0 && state.torchTurns < 10) {
      _droneGain2.gain.linearRampToValueAtTime(0.025, t + 0.5);
      // Slight detune for unease
      if (_droneOsc2) {
        _droneOsc2.detune.linearRampToValueAtTime(15, t + 0.5);
      }
    } else {
      _droneGain2.gain.linearRampToValueAtTime(0.012, t + 0.5);
      if (_droneOsc2) {
        _droneOsc2.detune.linearRampToValueAtTime(0, t + 0.5);
      }
    }
  }
}
