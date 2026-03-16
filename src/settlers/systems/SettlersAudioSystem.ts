// ---------------------------------------------------------------------------
// Settlers – Procedural audio system (Web Audio API)
// No external audio files needed – all sounds are synthesized
// ---------------------------------------------------------------------------

import type { SettlersState } from "../state/SettlersState";

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _initialized = false;

// Tracking for periodic sounds
let _lastAmbientTime = 0;
let _lastCombatCount = 0;

function _getCtx(): AudioContext | null {
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = 0.3;
      _masterGain.connect(_ctx.destination);
    } catch {
      return null;
    }
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

// ---------------------------------------------------------------------------
// Sound primitives
// ---------------------------------------------------------------------------

function _playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.1): void {
  const ctx = _getCtx();
  if (!ctx || !_masterGain) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(_masterGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function _playNoise(duration: number, volume = 0.05): void {
  const ctx = _getCtx();
  if (!ctx || !_masterGain) return;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(_masterGain);
  source.start();
}

// ---------------------------------------------------------------------------
// Game sound effects
// ---------------------------------------------------------------------------

export function playBuildSound(): void {
  // Hammer hits
  _playTone(200, 0.08, "square", 0.06);
  setTimeout(() => _playTone(250, 0.06, "square", 0.05), 100);
  setTimeout(() => _playTone(180, 0.1, "square", 0.04), 200);
}

export function playDemolishSound(): void {
  // Crumbling noise
  _playNoise(0.5, 0.08);
  _playTone(80, 0.3, "sawtooth", 0.04);
}

export function playCombatClash(): void {
  // Metal clang
  _playTone(800, 0.05, "square", 0.04);
  _playTone(1200, 0.03, "square", 0.03);
  _playNoise(0.1, 0.03);
}

export function playProductionComplete(): void {
  // Short chime
  _playTone(523, 0.12, "sine", 0.04);
  setTimeout(() => _playTone(659, 0.12, "sine", 0.04), 80);
}

export function playVictory(): void {
  // Fanfare
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => _playTone(f, 0.3, "sine", 0.08), i * 150);
  });
}

export function playDefeat(): void {
  // Sad descending
  const notes = [392, 349, 311, 261];
  notes.forEach((f, i) => {
    setTimeout(() => _playTone(f, 0.4, "sine", 0.06), i * 200);
  });
}

function _playAmbientBird(): void {
  // Bird chirp
  const ctx = _getCtx();
  if (!ctx || !_masterGain) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200 + Math.random() * 600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800 + Math.random() * 400, ctx.currentTime + 0.05);
  osc.frequency.exponentialRampToValueAtTime(1000 + Math.random() * 400, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.02, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(_masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

// ---------------------------------------------------------------------------
// Main update – called each frame from the game loop
// ---------------------------------------------------------------------------

export function updateAudio(state: SettlersState, _dt: number): void {
  if (!_initialized) {
    _initialized = true;
    // Audio context needs user gesture, so we just try here
  }

  const now = performance.now() / 1000;

  // Ambient sounds every 5-15 seconds
  if (now - _lastAmbientTime > 5 + Math.random() * 10) {
    _lastAmbientTime = now;
    if (Math.random() < 0.5) {
      _playAmbientBird();
    }
  }

  // Combat sounds
  if (state.combats.length > _lastCombatCount) {
    playCombatClash();
  }
  _lastCombatCount = state.combats.length;

  // Victory/defeat sounds
  if (state.gameOver && state.winner) {
    if (state.tick % 60 === 0) {
      // Play once
      if (state.winner === "p0") playVictory();
      else playDefeat();
    }
  }
}

export function destroyAudio(): void {
  if (_ctx) {
    _ctx.close().catch(() => {});
    _ctx = null;
    _masterGain = null;
  }
  _initialized = false;
}
