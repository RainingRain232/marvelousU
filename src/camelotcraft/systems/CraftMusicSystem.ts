// ---------------------------------------------------------------------------
// Camelot Craft – Procedural medieval music system
// ---------------------------------------------------------------------------
// Generates a simple medieval lute/harp melody using the Web Audio API.
// No external audio files are required. The music adapts to time of day:
// night music is slower, lower, and more minor-sounding, while day music
// is slightly brighter and more energetic.
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _reverbGain: GainNode | null = null;
let _delay: DelayNode | null = null;

/** Timer until the next note should be played (seconds). */
let _noteTimer = 0;

/** Whether the system has been initialised. */
let _initialised = false;

/** Whether music is actively playing. */
let _playing = false;

/** Index into the scale for melodic movement bias. */
let _scaleIndex = 0;

/** Direction of melodic movement (+1 ascending, -1 descending). */
let _direction = 1;

// ---------------------------------------------------------------------------
// Scale definitions
// ---------------------------------------------------------------------------

// Pentatonic minor scale across two octaves — D3 up to G4
const DAY_SCALE: number[] = [
  147, // D3
  175, // F3
  196, // G3
  220, // A3
  262, // C4
  294, // D4
  349, // F4
  392, // G4
];

// Night scale: one octave lower, minor feel (same intervals, halved freqs)
const NIGHT_SCALE: number[] = [
  73.5,  // D2
  87.5,  // F2
  98,    // G2
  110,   // A2
  131,   // C3
  147,   // D3
  175,   // F3
  196,   // G3
];

// ---------------------------------------------------------------------------
// Tempo / timing
// ---------------------------------------------------------------------------

const DAY_NOTE_MIN = 0.4;
const DAY_NOTE_MAX = 0.8;
const NIGHT_NOTE_MIN = 0.7;
const NIGHT_NOTE_MAX = 1.3;

/** Chance to rest (skip a note) on any given beat. */
const REST_CHANCE = 0.2;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create the AudioContext and wiring. Safe to call multiple times. */
export function initMusic(): void {
  if (_initialised) return;

  try {
    _ctx = new AudioContext();

    // Master gain
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = CB.MUSIC_VOLUME;
    _masterGain.connect(_ctx.destination);

    // Simple delay-based pseudo-reverb
    _delay = _ctx.createDelay(0.5);
    _delay.delayTime.value = 0.18;

    _reverbGain = _ctx.createGain();
    _reverbGain.gain.value = 0.25;

    _delay.connect(_reverbGain);
    _reverbGain.connect(_masterGain);
    // Feedback loop for gentle tail
    _reverbGain.connect(_delay);

    _initialised = true;
    _playing = true;
    _noteTimer = 0;
    _scaleIndex = Math.floor(Math.random() * DAY_SCALE.length);
  } catch {
    // AudioContext may not be available in some environments
  }
}

/**
 * Update the music system. Should be called every frame.
 * @param timeOfDay 0.0 = midnight, 0.5 = noon, 1.0 = next midnight
 * @param dt delta time in seconds
 */
export function updateMusic(timeOfDay: number, dt: number): void {
  if (!_initialised || !_playing || !_ctx || !_masterGain) return;

  // Resume context on first interaction (browser autoplay policy)
  if (_ctx.state === "suspended") {
    _ctx.resume();
  }

  _noteTimer -= dt;
  if (_noteTimer > 0) return;

  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;
  const scale = isNight ? NIGHT_SCALE : DAY_SCALE;

  // Determine next interval
  const minInterval = isNight ? NIGHT_NOTE_MIN : DAY_NOTE_MIN;
  const maxInterval = isNight ? NIGHT_NOTE_MAX : DAY_NOTE_MAX;
  _noteTimer = minInterval + Math.random() * (maxInterval - minInterval);

  // Occasionally rest for variety
  if (Math.random() < REST_CHANCE) return;

  // Choose the next note using biased random walk along the scale
  _scaleIndex = pickNextNote(_scaleIndex, scale.length);

  const freq = scale[_scaleIndex];

  // Slightly brighter (shorter decay) during the day
  const decayBase = isNight ? 0.6 : 0.4;
  const decay = decayBase + Math.random() * 0.3;

  playPluckedNote(freq, decay);
}

/** Set music volume (0.0 – 1.0). */
export function setMusicVolume(vol: number): void {
  if (_masterGain) {
    _masterGain.gain.value = Math.max(0, Math.min(1, vol));
  }
}

/** Pause music generation (does not destroy context). */
export function stopMusic(): void {
  _playing = false;
}

/** Tear down all audio resources. */
export function destroyMusic(): void {
  _playing = false;

  if (_delay) {
    _delay.disconnect();
    _delay = null;
  }
  if (_reverbGain) {
    _reverbGain.disconnect();
    _reverbGain = null;
  }
  if (_masterGain) {
    _masterGain.disconnect();
    _masterGain = null;
  }
  if (_ctx) {
    _ctx.close().catch(() => {});
    _ctx = null;
  }

  _initialised = false;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Biased random walk along the scale to create melodic contour.
 * Tends to continue in the same direction, occasionally reverses,
 * and bounces at scale boundaries.
 */
function pickNextNote(current: number, scaleLen: number): number {
  // 70% chance to continue direction, 30% to reverse
  if (Math.random() < 0.3) {
    _direction = -_direction;
  }

  // Step size: usually 1, sometimes 2
  const step = Math.random() < 0.75 ? 1 : 2;
  let next = current + _direction * step;

  // Bounce off boundaries
  if (next >= scaleLen) {
    next = scaleLen - 2;
    _direction = -1;
  } else if (next < 0) {
    next = 1;
    _direction = 1;
  }

  return next;
}

/**
 * Play a single plucked-string note.
 * Uses a triangle wave with fast exponential gain decay to approximate
 * a lute or harp pluck. A delayed copy is sent through the reverb chain.
 */
function playPluckedNote(freq: number, decay: number): void {
  if (!_ctx || !_masterGain || !_delay) return;

  const now = _ctx.currentTime;

  // --- Primary oscillator (triangle for soft, harp-like timbre) ---
  const osc = _ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);

  // Slight pitch drop on attack for realism
  osc.frequency.setValueAtTime(freq * 1.005, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);

  // --- Gain envelope: fast attack, exponential decay ---
  const noteGain = _ctx.createGain();
  noteGain.gain.setValueAtTime(0.35, now);
  noteGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

  // --- Optional harmonic for brightness ---
  const osc2 = _ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, now);

  const harmGain = _ctx.createGain();
  harmGain.gain.setValueAtTime(0.08, now);
  harmGain.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.6);

  // --- Routing ---
  // Primary path: osc -> noteGain -> masterGain
  osc.connect(noteGain);
  noteGain.connect(_masterGain);

  // Harmonic path: osc2 -> harmGain -> masterGain
  osc2.connect(harmGain);
  harmGain.connect(_masterGain);

  // Reverb send: noteGain -> delay -> reverbGain -> masterGain (loop)
  noteGain.connect(_delay);

  // --- Schedule ---
  osc.start(now);
  osc.stop(now + decay + 0.05);
  osc2.start(now);
  osc2.stop(now + decay + 0.05);
}
