// ---------------------------------------------------------------------------
// Settlers – Procedural audio system (Web Audio API)
// No external audio files needed – all sounds are synthesized
// ---------------------------------------------------------------------------

import type { SettlersState } from "../state/SettlersState";

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _sfxGain: GainNode | null = null;
let _musicGain: GainNode | null = null;
let _initialized = false;
let _muted = false;

// Volume levels (0..1)
let _masterVolume = 0.3;
let _sfxVolume = 1.0;
let _musicVolume = 0.5;

// Tracking for periodic sounds
let _lastAmbientTime = 0;
let _lastCombatCount = 0;
let _lastCompletedBuildings = new Set<string>();
let _lastSoldierCount = 0;
let _victoryPlayed = false;

// Background music state
let _musicOscillators: OscillatorNode[] = [];
let _musicPlaying = false;
let _musicBeatIndex = 0;
let _musicNextBeatTime = 0;
const MUSIC_BPM = 72;
const MUSIC_BEAT_DURATION = 60 / MUSIC_BPM;

function _getCtx(): AudioContext | null {
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = _muted ? 0 : _masterVolume;
      _masterGain.connect(_ctx.destination);

      _sfxGain = _ctx.createGain();
      _sfxGain.gain.value = _sfxVolume;
      _sfxGain.connect(_masterGain);

      _musicGain = _ctx.createGain();
      _musicGain.gain.value = _musicVolume;
      _musicGain.connect(_masterGain);
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
// Volume / mute controls (called from HUD)
// ---------------------------------------------------------------------------

export function setMasterVolume(v: number): void {
  _masterVolume = Math.max(0, Math.min(1, v));
  if (_masterGain) {
    _masterGain.gain.value = _muted ? 0 : _masterVolume;
  }
}

export function getMasterVolume(): number {
  return _masterVolume;
}

export function setSfxVolume(v: number): void {
  _sfxVolume = Math.max(0, Math.min(1, v));
  if (_sfxGain) {
    _sfxGain.gain.value = _sfxVolume;
  }
}

export function getSfxVolume(): number {
  return _sfxVolume;
}

export function setMusicVolume(v: number): void {
  _musicVolume = Math.max(0, Math.min(1, v));
  if (_musicGain) {
    _musicGain.gain.value = _musicVolume;
  }
}

export function getMusicVolume(): number {
  return _musicVolume;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  if (_masterGain) {
    _masterGain.gain.value = _muted ? 0 : _masterVolume;
  }
  return _muted;
}

export function isMuted(): boolean {
  return _muted;
}

// ---------------------------------------------------------------------------
// Sound primitives
// ---------------------------------------------------------------------------

function _playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.1): void {
  const ctx = _getCtx();
  if (!ctx || !_sfxGain) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(_sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function _playNoise(duration: number, volume = 0.05): void {
  const ctx = _getCtx();
  if (!ctx || !_sfxGain) return;

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
  gain.connect(_sfxGain);
  source.start();
}

/** Play a music-channel tone (for background music) */
function _playMusicTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.06): void {
  const ctx = _getCtx();
  if (!ctx || !_musicGain) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume * 0.8, ctx.currentTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(_musicGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
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

export function playUnitDeath(): void {
  // Low thud + fading groan
  _playTone(100, 0.2, "sawtooth", 0.05);
  _playNoise(0.3, 0.04);
  setTimeout(() => _playTone(65, 0.4, "triangle", 0.03), 100);
}

export function playConstructionComplete(): void {
  // Bright ascending chime – "building done!"
  _playTone(440, 0.1, "sine", 0.05);
  setTimeout(() => _playTone(554, 0.1, "sine", 0.05), 80);
  setTimeout(() => _playTone(659, 0.15, "sine", 0.06), 160);
  setTimeout(() => _playTone(880, 0.25, "sine", 0.05), 260);
}

export function playResourceCollected(): void {
  // Short soft click + ting
  _playTone(600, 0.04, "triangle", 0.03);
  setTimeout(() => _playTone(900, 0.06, "sine", 0.02), 40);
}

export function playResourceDelivered(): void {
  // Subtle drop sound
  _playTone(350, 0.05, "triangle", 0.03);
  _playTone(280, 0.08, "sine", 0.02);
}

export function playProductionComplete(): void {
  // Short chime
  _playTone(523, 0.12, "sine", 0.04);
  setTimeout(() => _playTone(659, 0.12, "sine", 0.04), 80);
}

export function playUIClick(): void {
  // Crisp click
  _playTone(1000, 0.03, "square", 0.02);
}

export function playUIToolSwitch(): void {
  // Two-tone switch
  _playTone(700, 0.04, "square", 0.02);
  setTimeout(() => _playTone(900, 0.04, "square", 0.02), 40);
}

export function playVictory(): void {
  // Fanfare – triumphant brass-like ascending
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => _playTone(f, 0.3, "sine", 0.08), i * 150);
  });
  // Add a harmony layer
  setTimeout(() => {
    const harmony = [330, 415, 494, 659];
    harmony.forEach((f, i) => {
      setTimeout(() => _playTone(f, 0.35, "triangle", 0.04), i * 150);
    });
  }, 50);
}

export function playDefeat(): void {
  // Sad descending
  const notes = [392, 349, 311, 261];
  notes.forEach((f, i) => {
    setTimeout(() => _playTone(f, 0.4, "sine", 0.06), i * 200);
  });
  // Minor chord underneath
  setTimeout(() => _playTone(196, 1.0, "triangle", 0.03), 200);
}

function _playAmbientBird(): void {
  // Bird chirp
  const ctx = _getCtx();
  if (!ctx || !_sfxGain) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200 + Math.random() * 600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800 + Math.random() * 400, ctx.currentTime + 0.05);
  osc.frequency.exponentialRampToValueAtTime(1000 + Math.random() * 400, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.02, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(_sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

function _playAmbientWind(): void {
  // Gentle wind – filtered noise
  const ctx = _getCtx();
  if (!ctx || !_sfxGain) return;

  const duration = 1.5 + Math.random() * 1.0;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400 + Math.random() * 300;
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(_sfxGain);
  source.start();
  source.stop(ctx.currentTime + duration);
}

// ---------------------------------------------------------------------------
// Procedural background music – medieval settlement theme
// Uses a pentatonic/modal scale played in a slow, looping pattern
// ---------------------------------------------------------------------------

// D Dorian mode notes (medieval-sounding): D E F G A B C
// Mapped to frequencies for a couple of octaves
const MELODY_NOTES = [
  293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, // D4..C5
  587.33, 659.25, 698.46, // D5..F5
];

// Bass notes (root, fourth, fifth patterns)
const BASS_NOTES = [
  146.83, // D3
  174.61, // F3
  196.00, // G3
  164.81, // E3
  130.81, // C3
  146.83, // D3
  196.00, // G3
  146.83, // D3
];

// Simple melody pattern indices (into MELODY_NOTES)
const MELODY_PATTERN = [
  0, 2, 4, 3, 2, 0, -1, 4,   // phrase 1 (-1 = rest)
  5, 4, 3, 2, 0, -1, 2, 0,   // phrase 2
  4, 6, 7, 6, 4, 3, 2, -1,   // phrase 3
  3, 2, 0, -1, 2, 4, 3, 0,   // phrase 4
];

const BASS_PATTERN = [
  0, -1, 0, -1, 1, -1, 2, -1, // bass line (-1 = rest)
  3, -1, 4, -1, 5, -1, 6, -1,
  0, -1, 7, -1, 1, -1, 2, -1,
  5, -1, 3, -1, 6, -1, 0, -1,
];

function _updateMusic(): void {
  const ctx = _getCtx();
  if (!ctx || !_musicGain) return;

  const now = ctx.currentTime;
  if (now < _musicNextBeatTime) return;

  // Schedule the next beat
  _musicNextBeatTime = now + MUSIC_BEAT_DURATION;

  const melodyIdx = MELODY_PATTERN[_musicBeatIndex % MELODY_PATTERN.length];
  const bassIdx = BASS_PATTERN[_musicBeatIndex % BASS_PATTERN.length];

  // Play melody note
  if (melodyIdx >= 0) {
    const freq = MELODY_NOTES[melodyIdx];
    // Alternate between sine and triangle for texture
    const type: OscillatorType = _musicBeatIndex % 4 < 2 ? "sine" : "triangle";
    _playMusicTone(freq, MUSIC_BEAT_DURATION * 0.85, type, 0.04);
  }

  // Play bass note
  if (bassIdx >= 0) {
    const freq = BASS_NOTES[bassIdx];
    _playMusicTone(freq, MUSIC_BEAT_DURATION * 1.5, "triangle", 0.03);
  }

  // Every 8 beats, add a gentle drone
  if (_musicBeatIndex % 8 === 0) {
    _playMusicTone(146.83, MUSIC_BEAT_DURATION * 4, "sine", 0.015); // D3 drone
    _playMusicTone(220.00, MUSIC_BEAT_DURATION * 4, "sine", 0.01);  // A3 fifth
  }

  _musicBeatIndex++;
}

// ---------------------------------------------------------------------------
// Main update – called each frame from the game loop
// ---------------------------------------------------------------------------

export function updateAudio(state: SettlersState, _dt: number): void {
  if (!_initialized) {
    _initialized = true;
    // Snapshot currently completed buildings
    for (const [id, b] of state.buildings) {
      if (b.constructionProgress >= 1) _lastCompletedBuildings.add(id);
    }
    _lastSoldierCount = state.soldiers.size;
    _musicPlaying = true;
    _musicNextBeatTime = 0;
  }

  const now = performance.now() / 1000;

  // --- Background music ---
  if (_musicPlaying && !state.gameOver) {
    _updateMusic();
  }

  // --- Ambient sounds every 5-15 seconds ---
  if (now - _lastAmbientTime > 5 + Math.random() * 10) {
    _lastAmbientTime = now;
    const r = Math.random();
    if (r < 0.4) {
      _playAmbientBird();
    } else if (r < 0.55) {
      _playAmbientWind();
    }
    // Occasionally play a second bird chirp after a short delay
    if (r < 0.2) {
      setTimeout(() => _playAmbientBird(), 200 + Math.random() * 400);
    }
  }

  // --- Construction complete detection ---
  for (const [id, building] of state.buildings) {
    if (building.constructionProgress >= 1 && !_lastCompletedBuildings.has(id)) {
      _lastCompletedBuildings.add(id);
      // Only play sound for player buildings
      if (building.owner === "p0") {
        playConstructionComplete();
      }
    }
  }
  // Clean up stale IDs
  for (const id of _lastCompletedBuildings) {
    if (!state.buildings.has(id)) _lastCompletedBuildings.delete(id);
  }

  // --- Combat sounds ---
  if (state.combats.length > _lastCombatCount) {
    playCombatClash();
  }
  _lastCombatCount = state.combats.length;

  // --- Unit death detection (soldier count decreased) ---
  const currentSoldierCount = state.soldiers.size;
  if (currentSoldierCount < _lastSoldierCount) {
    playUnitDeath();
  }
  _lastSoldierCount = currentSoldierCount;

  // --- Victory/defeat sounds (play once) ---
  if (state.gameOver && state.winner && !_victoryPlayed) {
    _victoryPlayed = true;
    _musicPlaying = false;
    if (state.winner === "p0") playVictory();
    else playDefeat();
  }
}

export function destroyAudio(): void {
  // Stop any lingering music oscillators
  for (const osc of _musicOscillators) {
    try { osc.stop(); } catch { /* already stopped */ }
  }
  _musicOscillators = [];
  _musicPlaying = false;

  if (_ctx) {
    _ctx.close().catch(() => {});
    _ctx = null;
    _masterGain = null;
    _sfxGain = null;
    _musicGain = null;
  }
  _initialized = false;
  _victoryPlayed = false;
  _lastCompletedBuildings = new Set();
  _musicBeatIndex = 0;
  _musicNextBeatTime = 0;
}
