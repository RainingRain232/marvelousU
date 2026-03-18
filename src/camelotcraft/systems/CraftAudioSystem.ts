/**
 * CraftAudioSystem.ts
 * --------------------
 * Procedural audio system for Camelot Craft using the Web Audio API.
 * All sounds are generated from oscillators and noise — no external audio
 * files are required. Volume levels are governed by CB.SFX_VOLUME and
 * CB.AMBIENT_VOLUME from the balance config.
 */

import { CB } from "../config/CraftBalance";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

/** Nodes that make up the currently-playing ambient loop. */
let ambientNodes: AudioNode[] = [];
// ambient tracking is implicit via ambientNodes.length

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure the AudioContext is created and resumed (browsers require a user
 *  gesture before audio will play). */
function ensureCtx(): AudioContext {
  if (!ctx) {
    throw new Error("CraftAudioSystem: call initAudio() first");
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

/** Create a gain node pre-connected to the master output. */
function sfxGain(volume = CB.SFX_VOLUME): GainNode {
  const c = ensureCtx();
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(masterGain!);
  return g;
}

/** Schedule an oscillator to start now and stop after `duration` seconds. */
function scheduleOsc(
  osc: OscillatorNode,
  gain: GainNode,
  duration: number,
): void {
  const c = ensureCtx();
  osc.connect(gain);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

/** Create white-noise buffer of given duration (seconds). */
function noiseBuffer(duration: number): AudioBuffer {
  const c = ensureCtx();
  const sampleRate = c.sampleRate;
  const len = Math.floor(sampleRate * duration);
  const buf = c.createBuffer(1, len, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Initialise the audio context. Call once on first user interaction. */
export function initAudio(): void {
  if (ctx) return;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(ctx.destination);
}

/**
 * Short percussive crunch — block breaking.
 * Uses a burst of filtered noise with a fast exponential decay.
 */
export function playBlockBreak(): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const duration = 0.12;

  const buf = noiseBuffer(duration);
  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + duration);
  filter.Q.value = 1.5;

  const gain = sfxGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  src.start(now);
  src.stop(now + duration);
}

/**
 * Solid thud — block placement.
 * Low-frequency sine with fast decay.
 */
export function playBlockPlace(): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const duration = 0.15;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + duration);

  const gain = sfxGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME * 0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  scheduleOsc(osc, gain, duration);
}

/**
 * Pain grunt — player hurt.
 * Band-pass filtered noise burst with a dip in pitch to mimic a vocal hit.
 */
export function playHurt(): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const duration = 0.25;

  const buf = noiseBuffer(duration);
  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(250, now + duration);
  filter.Q.value = 5;

  const gain = sfxGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME, now);
  gain.gain.linearRampToValueAtTime(CB.SFX_VOLUME * 0.6, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  src.start(now);
  src.stop(now + duration);
}

/**
 * Short rising ping — item pickup.
 * Two quick ascending sine tones.
 */
export function playPickup(): void {
  const c = ensureCtx();
  const now = c.currentTime;

  // First tone
  const osc1 = c.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);

  const g1 = sfxGain();
  g1.gain.setValueAtTime(CB.SFX_VOLUME * 0.5, now);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc1.connect(g1);
  osc1.start(now);
  osc1.stop(now + 0.08);

  // Second tone (higher)
  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1320, now + 0.06);

  const g2 = sfxGain();
  g2.gain.setValueAtTime(0.001, now);
  g2.gain.setValueAtTime(CB.SFX_VOLUME * 0.5, now + 0.06);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc2.connect(g2);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.14);
}

/**
 * Low grunt — mob takes damage.
 * Short low-pitched sawtooth burst with filter sweep.
 */
export function playMobHurt(): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const duration = 0.18;

  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + duration);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + duration);

  const gain = sfxGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Descending tone — mob death.
 * Sawtooth sweeping down with reverb-like tail.
 */
export function playMobDeath(): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const duration = 0.4;

  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + duration);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + duration);

  const gain = sfxGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME * 0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Triumphant fanfare — quest complete.
 * Ascending major chord (C-E-G-C) played as sequential sine tones with
 * a warm triangle-wave tail on the final note.
 */
export function playQuestComplete(): void {
  const c = ensureCtx();
  const now = c.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const noteLen = 0.15;
  const gap = 0.12;
  const vol = CB.SFX_VOLUME * 0.6;

  notes.forEach((freq, i) => {
    const t = now + i * gap;
    const dur = i === notes.length - 1 ? noteLen * 2.5 : noteLen;

    const osc = c.createOscillator();
    osc.type = i === notes.length - 1 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, t);

    const g = sfxGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur);
  });
}

/**
 * Gentle looping ambient soundscape.
 *
 * @param timeOfDay 0..1 where 0 = midnight, 0.5 = noon
 *
 * During the day (0.25 – 0.75) birds chirp via periodic high-frequency
 * oscillator pings. At night, crickets are simulated with a fast amplitude-
 * modulated high-pitched sine.
 */
export function playAmbient(timeOfDay: number): void {
  stopAmbient(); // stop any existing ambient first

  const c = ensureCtx();
  const now = c.currentTime;

  const isDay = timeOfDay >= 0.25 && timeOfDay < 0.75;
  // ambient started

  if (isDay) {
    // --- Daytime: "birdsong" via paired detuned oscillators ---
    const osc1 = c.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(2400, now);

    const osc2 = c.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(3200, now);

    // LFO to modulate amplitude — gives a chirping rhythm
    const lfo = c.createOscillator();
    lfo.type = "square";
    lfo.frequency.setValueAtTime(3.5, now); // chirps per second

    const lfoGain = c.createGain();
    lfoGain.gain.value = CB.AMBIENT_VOLUME * 0.3;
    lfo.connect(lfoGain);

    const modGain = c.createGain();
    modGain.gain.value = 0;
    lfoGain.connect(modGain.gain);

    const mixGain = c.createGain();
    mixGain.gain.value = CB.AMBIENT_VOLUME * 0.15;
    mixGain.connect(masterGain!);

    osc1.connect(modGain);
    osc2.connect(modGain);
    modGain.connect(mixGain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    ambientNodes.push(osc1, osc2, lfo, lfoGain, modGain, mixGain);
  } else {
    // --- Night-time: "crickets" via fast AM sine ---
    const carrier = c.createOscillator();
    carrier.type = "sine";
    carrier.frequency.setValueAtTime(4800, now);

    // Amplitude modulation at ~55 Hz gives a buzzing/chirp texture
    const am = c.createOscillator();
    am.type = "sine";
    am.frequency.setValueAtTime(55, now);

    const amGain = c.createGain();
    amGain.gain.value = CB.AMBIENT_VOLUME * 0.2;
    am.connect(amGain);

    const modGain = c.createGain();
    modGain.gain.value = 0;
    amGain.connect(modGain.gain);

    // Secondary slower LFO to pulse the crickets on/off
    const pulse = c.createOscillator();
    pulse.type = "sine";
    pulse.frequency.setValueAtTime(0.4, now);

    const pulseGain = c.createGain();
    pulseGain.gain.value = CB.AMBIENT_VOLUME * 0.15;
    pulse.connect(pulseGain);

    const finalGain = c.createGain();
    finalGain.gain.value = CB.AMBIENT_VOLUME * 0.1;
    pulseGain.connect(finalGain.gain);

    carrier.connect(modGain);
    modGain.connect(finalGain);
    finalGain.connect(masterGain!);

    carrier.start(now);
    am.start(now);
    pulse.start(now);

    ambientNodes.push(carrier, am, amGain, modGain, pulse, pulseGain, finalGain);
  }
}

/** Stop any currently playing ambient loop. */
export function stopAmbient(): void {
  for (const node of ambientNodes) {
    try {
      if (node instanceof OscillatorNode) {
        node.stop();
      }
      node.disconnect();
    } catch {
      // already stopped — ignore
    }
  }
  ambientNodes = [];
  // ambient stopped
}

/** Tear down the audio system entirely. */
// ---------------------------------------------------------------------------
// Footstep sounds
// ---------------------------------------------------------------------------

let _stepTimer = 0;
let _lastStepType = 0;

/**
 * Play footstep sound. Call each frame; internally rate-limits.
 * @param onGround whether player is on ground
 * @param moving whether player is moving
 * @param sprinting whether sprinting
 * @param inWater whether in water
 */
export function playFootstep(onGround: boolean, moving: boolean, sprinting: boolean, inWater: boolean): void {
  if (!onGround || !moving) { _stepTimer = 0; return; }

  const interval = sprinting ? 0.28 : 0.45;
  _stepTimer += 1 / 60; // approximate per-frame
  if (_stepTimer < interval) return;
  _stepTimer -= interval;

  const c = ensureCtx();
  const now = c.currentTime;
  const gain = c.createGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  gain.connect(masterGain!);

  if (inWater) {
    // Splashy noise burst
    const buf = c.createBuffer(1, 2400, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 800);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    src.connect(filter).connect(gain);
    src.start(now);
  } else {
    // Short noise burst with varying pitch for footsteps
    _lastStepType = 1 - _lastStepType;
    const freq = _lastStepType === 0 ? 120 : 90;
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

// ---------------------------------------------------------------------------
// Container interaction sound
// ---------------------------------------------------------------------------

export function playChestOpen(): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const gain = c.createGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  gain.connect(masterGain!);

  // Creaky wood sound
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(350, now + 0.15);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.3);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.3);
}

// ---------------------------------------------------------------------------
// Fall damage impact sound
// ---------------------------------------------------------------------------

export function playFallImpact(severity: number): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const vol = Math.min(1, severity / 10) * CB.SFX_VOLUME;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  gain.connect(masterGain!);

  // Heavy thud
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.4);

  // Impact noise layer
  const buf = c.createBuffer(1, c.sampleRate * 0.2 | 0, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1000);
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(vol * 0.6, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  g2.connect(masterGain!);
  noise.connect(g2);
  noise.start(now);
}

// ---------------------------------------------------------------------------
// Level up jingle
// ---------------------------------------------------------------------------

export function playLevelUp(): void {
  const c = ensureCtx();
  const now = c.currentTime;
  const gain = c.createGain();
  gain.gain.setValueAtTime(CB.SFX_VOLUME * 0.6, now);
  gain.gain.linearRampToValueAtTime(0, now + 1.0);
  gain.connect(masterGain!);

  // Ascending arpeggio
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now + i * 0.12);
    g.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
    g.connect(gain);
    osc.connect(g);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
}

export function destroyAudio(): void {
  stopAmbient();
  if (ctx) {
    ctx.close();
    ctx = null;
    masterGain = null;
  }
}
