// ────────────────────────────────────────────────────────────────────────────
// Diablo — Procedural audio system (Web Audio API)
// ────────────────────────────────────────────────────────────────────────────

import type { DiabloMapId } from "./DiabloTypes";

export type SoundType = 'hit' | 'crit' | 'skill' | 'levelup' | 'loot' | 'death' | 'boss' | 'dodge' | 'potion' | 'gold';

export interface AudioState {
  ctx: AudioContext | null;
  muted: boolean;
  volume: number;
  bgmOscillators: OscillatorNode[];
  bgmGains: GainNode[];
  bgmPlaying: boolean;
  currentBgmMap: string;
}

export function createAudioState(): AudioState {
  return {
    ctx: null,
    muted: false,
    volume: 0.3,
    bgmOscillators: [],
    bgmGains: [],
    bgmPlaying: false,
    currentBgmMap: '',
  };
}

export function ensureAudio(audio: AudioState): AudioContext | null {
  if (!audio.ctx) {
    try { audio.ctx = new AudioContext(); } catch { return null; }
  }
  if (audio.ctx.state === 'suspended') {
    audio.ctx.resume();
  }
  return audio.ctx;
}

export function startBgm(audio: AudioState, mapId: DiabloMapId): void {
  stopBgm(audio);
  const ctx = ensureAudio(audio);
  if (!ctx || audio.muted) return;

  audio.currentBgmMap = mapId;
  audio.bgmPlaying = true;

  const biomes: Record<string, { freqs: number[]; types: OscillatorType[]; vol: number }> = {
    FOREST: { freqs: [110, 165, 220], types: ['sine', 'sine', 'triangle'], vol: 0.03 },
    ELVEN_VILLAGE: { freqs: [220, 330, 440], types: ['sine', 'sine', 'sine'], vol: 0.025 },
    NECROPOLIS_DUNGEON: { freqs: [55, 82, 110], types: ['sawtooth', 'sine', 'sine'], vol: 0.02 },
    VOLCANIC_WASTES: { freqs: [65, 98, 130], types: ['sawtooth', 'sawtooth', 'sine'], vol: 0.025 },
    FROZEN_TUNDRA: { freqs: [196, 294, 392], types: ['sine', 'sine', 'triangle'], vol: 0.02 },
    HAUNTED_CATHEDRAL: { freqs: [82, 123, 164], types: ['sine', 'triangle', 'sine'], vol: 0.025 },
    SHADOW_REALM: { freqs: [55, 73, 110], types: ['sawtooth', 'sine', 'sawtooth'], vol: 0.02 },
    CAMELOT: { freqs: [196, 247, 294], types: ['sine', 'sine', 'triangle'], vol: 0.03 },
    CRYSTAL_CAVERNS: { freqs: [330, 440, 523], types: ['sine', 'sine', 'sine'], vol: 0.02 },
    CORAL_DEPTHS: { freqs: [130, 196, 262], types: ['sine', 'triangle', 'sine'], vol: 0.025 },
  };

  const params = biomes[mapId] || { freqs: [73, 110, 146], types: ['sine', 'sine', 'triangle'] as OscillatorType[], vol: 0.02 };

  for (let i = 0; i < params.freqs.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = params.types[i];
    osc.frequency.setValueAtTime(params.freqs[i], ctx.currentTime);
    const lfoDepth = params.freqs[i] * 0.02;
    osc.frequency.linearRampToValueAtTime(params.freqs[i] + lfoDepth, ctx.currentTime + 4 + i * 2);
    osc.frequency.linearRampToValueAtTime(params.freqs[i] - lfoDepth, ctx.currentTime + 8 + i * 2);
    osc.frequency.linearRampToValueAtTime(params.freqs[i], ctx.currentTime + 12 + i * 2);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(params.vol, ctx.currentTime + 2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    audio.bgmOscillators.push(osc);
    audio.bgmGains.push(gain);
  }
}

export function stopBgm(audio: AudioState): void {
  const ctx = audio.ctx;
  if (!ctx) return;

  for (let i = 0; i < audio.bgmOscillators.length; i++) {
    try {
      audio.bgmGains[i].gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      audio.bgmOscillators[i].stop(ctx.currentTime + 1.5);
    } catch { /* already stopped */ }
  }
  audio.bgmOscillators = [];
  audio.bgmGains = [];
  audio.bgmPlaying = false;
  audio.currentBgmMap = '';
}

export function playSound(audio: AudioState, type: SoundType): void {
  if (audio.muted) return;
  const ctx = ensureAudio(audio);
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const vol = audio.volume;

  switch (type) {
    case 'hit':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'crit': {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      const noise = ctx.createOscillator();
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(800, now);
      noise.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vol * 0.3, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(ng);
      ng.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.08);
      break;
    }
    case 'skill':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
      gain.gain.setValueAtTime(vol * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'levelup':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.2);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.5);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.linearRampToValueAtTime(vol * 0.3, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    case 'loot':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1000, now + 0.05);
      osc.frequency.setValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'death':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    case 'boss':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);
      osc.frequency.linearRampToValueAtTime(80, now + 0.6);
      gain.gain.setValueAtTime(vol * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    case 'dodge':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
      gain.gain.setValueAtTime(vol * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    case 'potion':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.15);
      gain.gain.setValueAtTime(vol * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'gold':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1400, now + 0.03);
      gain.gain.setValueAtTime(vol * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
  }
}

export function destroyAudio(audio: AudioState): void {
  stopBgm(audio);
  if (audio.ctx) {
    audio.ctx.close();
    audio.ctx = null;
  }
}
