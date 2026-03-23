// ---------------------------------------------------------------------------
// BARD MODE — Rhythm battle game: cast spells through music
// ---------------------------------------------------------------------------
// Play as a medieval bard. Notes fall down 4 lanes. Hit them in time to
// damage enemies with musical magic. Build combos for devastating spell
// effects. Dodge enemy attacks. Manage mana for powerful spells.
// Survive increasingly fierce foes across 5 acts.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle, Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

// ── PROCEDURAL AUDIO ENGINE ────────────────────────────────────────────────
// Generates all game sounds using Web Audio API oscillators + noise.

class BardAudio {
  private _ctx: AudioContext | null = null;
  private _master: GainNode | null = null;
  private _bgGain: GainNode | null = null;
  private _bgOscs: OscillatorNode[] = [];
  private _bgPlaying = false;

  // Pentatonic scale frequencies per lane (medieval feel)
  private readonly LANE_FREQS = [
    [262, 330, 392],  // C4, E4, G4
    [294, 370, 440],  // D4, F#4, A4
    [330, 392, 494],  // E4, G4, B4
    [392, 494, 587],  // G4, B4, D5
  ];
  // Bass drone frequencies per enemy
  private readonly DRONE_FREQS = [82, 73, 98, 110, 65]; // C2, D2, G2, A2, C2

  init(): void {
    if (this._ctx) return;
    this._ctx = new AudioContext();
    this._master = this._ctx.createGain();
    this._master.gain.value = 0.35;
    this._master.connect(this._ctx.destination);
  }

  // Chord progressions per enemy (root notes for bass + chords)
  private readonly PROGRESSIONS = [
    [130.8, 146.8, 164.8, 146.8],   // goblin: C3 D3 E3 D3 (bouncy)
    [98, 110, 82.4, 110],            // skeleton: G2 A2 E2 A2 (eerie)
    [130.8, 155.6, 174.6, 196],      // elf: C3 Eb3 F3 G3 (mysterious)
    [110, 130.8, 146.8, 98],         // dragon: A2 C3 D3 G2 (epic)
    [82.4, 98, 73.4, 110],           // mordred: E2 G2 D2 A2 (dark)
  ];

  private _bgInterval: ReturnType<typeof setInterval> | null = null;
  private _bgBeatCount = 0;

  /** Start a rhythmic backing track synced to BPM */
  startBg(enemyIdx: number, bpm: number): void {
    this.stopBg();
    if (!this._ctx || !this._master) return;
    this._bgGain = this._ctx.createGain();
    this._bgGain.gain.value = 0.12;
    this._bgGain.connect(this._master);

    const progression = this.PROGRESSIONS[enemyIdx % this.PROGRESSIONS.length];
    const beatMs = (60 / bpm) * 1000;
    this._bgBeatCount = 0;

    // Rhythmic loop: plays bass + chord on each beat
    this._bgInterval = setInterval(() => {
      if (!this._ctx || !this._bgGain) return;
      const now = this._ctx.currentTime;
      const chordIdx = Math.floor(this._bgBeatCount / 4) % progression.length;
      const root = progression[chordIdx];
      const isDownbeat = this._bgBeatCount % 4 === 0;
      const isBackbeat = this._bgBeatCount % 4 === 2;

      // Bass note (every beat)
      const bass = this._ctx.createOscillator();
      bass.type = "triangle";
      bass.frequency.value = root;
      const bg = this._ctx.createGain();
      bg.gain.setValueAtTime(isDownbeat ? 0.12 : 0.07, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      const bf = this._ctx.createBiquadFilter();
      bf.type = "lowpass"; bf.frequency.value = 300;
      bass.connect(bf); bf.connect(bg); bg.connect(this._bgGain);
      bass.start(now); bass.stop(now + 0.25);

      // Chord stab (downbeats and backbeats)
      if (isDownbeat || isBackbeat) {
        const intervals = [1, 1.25, 1.5]; // root, minor 3rd, 5th
        for (const mult of intervals) {
          const o = this._ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = root * 2 * mult;
          const cg = this._ctx.createGain();
          cg.gain.setValueAtTime(isDownbeat ? 0.04 : 0.025, now);
          cg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          const cf = this._ctx.createBiquadFilter();
          cf.type = "lowpass"; cf.frequency.value = isDownbeat ? 1200 : 800;
          o.connect(cf); cf.connect(cg); cg.connect(this._bgGain!);
          o.start(now); o.stop(now + 0.2);
        }
      }

      // Hi-hat (offbeats)
      if (this._bgBeatCount % 2 === 1) {
        const bufLen = Math.floor(this._ctx.sampleRate * 0.03);
        const buf = this._ctx.createBuffer(1, bufLen, this._ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        const hg = this._ctx.createGain();
        hg.gain.setValueAtTime(0.04, now);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        const hf = this._ctx.createBiquadFilter();
        hf.type = "highpass"; hf.frequency.value = 8000;
        src.connect(hf); hf.connect(hg); hg.connect(this._bgGain!);
        src.start(now);
      }

      this._bgBeatCount++;
    }, beatMs);

    this._bgPlaying = true;
  }

  stopBg(): void {
    for (const o of this._bgOscs) { try { o.stop(); } catch { /* ok */ } }
    this._bgOscs = [];
    if (this._bgInterval) { clearInterval(this._bgInterval); this._bgInterval = null; }
    this._bgPlaying = false;
  }

  /** Continuous sustain tone for hold notes */
  startHoldSustain(lane: number): { stop: () => void } | null {
    if (!this._ctx || !this._master) return null;
    const freq = this.LANE_FREQS[lane][0];
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = this._ctx.createGain();
    g.gain.value = 0.06;
    const filt = this._ctx.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = 1000;
    osc.connect(filt); filt.connect(g); g.connect(this._master);
    osc.start();
    return {
      stop: () => {
        g.gain.exponentialRampToValueAtTime(0.001, this._ctx!.currentTime + 0.1);
        setTimeout(() => { try { osc.stop(); } catch { /* ok */ } }, 150);
      },
    };
  }

  /** Fever mode activation — triumphant fanfare */
  playFever(): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    const notes = [392, 494, 587, 784]; // G4 B4 D5 G5
    for (let i = 0; i < notes.length; i++) {
      const osc = this._ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      const g = this._ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.05);
      osc.connect(g); g.connect(this._master!);
      osc.start(now + i * 0.08); osc.stop(now + 0.7 + i * 0.05);
    }
  }

  /** Play a melodic note hit sound for a lane */
  playHit(lane: number, perfect: boolean): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    const freqs = this.LANE_FREQS[lane];
    const freq = freqs[Math.floor(Math.random() * freqs.length)];

    const osc = this._ctx.createOscillator();
    osc.type = perfect ? "triangle" : "square";
    osc.frequency.value = freq;

    const g = this._ctx.createGain();
    g.gain.setValueAtTime(perfect ? 0.25 : 0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (perfect ? 0.35 : 0.2));

    const filt = this._ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = perfect ? 3000 : 1500;

    osc.connect(filt);
    filt.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.4);

    // Perfect gets a harmonic chime
    if (perfect) {
      const osc2 = this._ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      const g2 = this._ctx.createGain();
      g2.gain.setValueAtTime(0.08, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(g2);
      g2.connect(this._master);
      osc2.start(now);
      osc2.stop(now + 0.5);
    }
  }

  /** Miss sound — dissonant buzz */
  playMiss(): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 90 + Math.random() * 30;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    const filt = this._ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 400;
    osc.connect(filt);
    filt.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Beat kick — subtle low thump on every beat */
  playBeat(): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Spell cast — rising sweep */
  playSpell(color: number): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    const baseFreq = color === 0x44ff88 ? 440 : color === 0xff8844 ? 220 : 330;
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.3);
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  /** Combo burst — arpeggio chord */
  playCombo(combo: number): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    const base = 330 + combo * 2;
    for (let i = 0; i < 4; i++) {
      const osc = this._ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = base * (1 + i * 0.25);
      const g = this._ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.04);
      g.gain.linearRampToValueAtTime(0.1, now + i * 0.04 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + i * 0.05);
      osc.connect(g);
      g.connect(this._master!);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.5 + i * 0.05);
    }
  }

  /** Enemy defeat — descending boom */
  playDefeat(): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    // Impact
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.8);
    // Noise burst
    const bufSize = this._ctx.sampleRate * 0.3;
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = this._ctx.createBufferSource();
    noise.buffer = buf;
    const ng = this._ctx.createGain();
    ng.gain.setValueAtTime(0.08, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    const nf = this._ctx.createBiquadFilter();
    nf.type = "lowpass"; nf.frequency.value = 800;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(this._master);
    noise.start(now);
  }

  /** Enemy attack warning — short high blip */
  playDanger(): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 880;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Power-up collect — sparkly rising tone */
  playPowerUp(): void {
    if (!this._ctx || !this._master) return;
    const now = this._ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this._ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 600 + i * 200;
      const g = this._ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.06);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(g);
      g.connect(this._master!);
      osc.start(now + i * 0.06);
      osc.stop(now + 0.5);
    }
  }

  cleanup(): void {
    this.stopBg();
    if (this._ctx) { try { this._ctx.close(); } catch { /* ok */ } this._ctx = null; }
  }
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────

const LANES = 4;
const LANE_KEYS = ["d", "f", "j", "k"];
const LANE_LABELS = ["D", "F", "J", "K"];
const LANE_COLORS = [0xff4466, 0x44bbff, 0x44ff88, 0xffaa44];
const LANE_W = 64;
const LANE_GAP = 6;
const HIGHWAY_W = LANES * LANE_W + (LANES - 1) * LANE_GAP;
const HIT_Y = 520;
const NOTE_SPEED_BASE = 280;
const PERFECT_WINDOW = 40;
const GOOD_WINDOW = 75;
const SPAWN_Y = -40;

const FONT = "monospace";
const COL_BG = 0x08060e;
const COL_BORDER = 0x6644aa;
const COL_GOLD = 0xffd700;

// ── TYPES ──────────────────────────────────────────────────────────────────

type NoteType = "normal" | "golden" | "poison"; // golden = power-up, poison = mana drain trap
type Difficulty = "easy" | "normal" | "hard";

interface Note {
  lane: number;
  y: number;
  hit: boolean;
  missed: boolean;
  holdLen: number;
  holdHeld: number;
  holding: boolean;
  type: NoteType;
}

interface EnemyAttack {
  lane: number;
  y: number;
  speed: number;
  warned: boolean; // has the warning flash been shown
}

interface Ripple {
  x: number; y: number; radius: number; maxRadius: number;
  life: number; maxLife: number; color: number;
}

interface MusicNote {
  x: number; y: number; vx: number; vy: number;
  symbol: string; life: number; maxLife: number; color: number; size: number;
}

type BossAbility = "speed_up" | "reverse" | "blind" | "fire_lanes" | "darkness";

interface Enemy {
  name: string;
  title: string;
  maxHp: number;
  hp: number;
  color: number;
  bpm: number;
  patterns: number[][];
  sprite: string;
  attackInterval: number;
  attackDmg: number;
  ability: BossAbility; // unique boss mechanic
  abilityInterval: number; // seconds between ability uses
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: number; size: number;
  grav: number; // gravity multiplier
}

interface FloatingText {
  x: number; y: number; text: string; color: number;
  life: number; maxLife: number; vy: number; scale: number;
}

// Spells the player can cast with mana
interface Spell {
  name: string;
  key: string;
  manaCost: number;
  desc: string;
  color: number;
}

const SPELLS: Spell[] = [
  { name: "HEAL", key: "1", manaCost: 30, desc: "+25 HP", color: 0x44ff88 },
  { name: "SMITE", key: "2", manaCost: 40, desc: "80 damage", color: 0xff8844 },
  { name: "SHIELD", key: "3", manaCost: 25, desc: "Block 3 attacks", color: 0x4488ff },
  { name: "SLOW", key: "4", manaCost: 35, desc: "Slow notes 4s", color: 0x88ccff },
];

// Boss taunts per enemy (shown periodically)
const BOSS_TAUNTS: string[][] = [
  ["You call that music?!", "My drum will crush your lute!", "Dance, bard! Dance!", "Louder! I can't hear you over my drum!"],
  ["Your melody is... dead.", "Bones rattle louder than your strings!", "I've been playing since before you were born!", "The grave calls for you..."],
  ["Such crude vibrations...", "My harp weeps for your lack of talent.", "The forest rejects your song!", "You cannot charm an elf with noise!"],
  ["ROOOAR! Your notes taste like ash!", "Fire and song don't mix, bard!", "I'll melt your lute!", "The mountain trembles — at MY voice!"],
  ["Silence is the only true music.", "Your king couldn't save you.", "Every note you play weakens you.", "Camelot's last bard... how fitting."],
];

// Phase patterns — bosses change patterns at HP thresholds
const PHASE_PATTERNS: number[][][] = [
  // Goblin phases: normal → syncopated → frantic
  [[0], [2], [0, 2], [1, 3]],
  [[1], [0, 3], [2], [0, 1, 3]],
  // Skeleton phases
  [[0, 1], [2, 3], [0, 2, 3]],
  [[1, 3], [0], [2, 3], [0, 1, 2, 3]],
  // Elf phases
  [[0], [1, 2, 3], [0, 2], [1]],
  [[0, 1, 2, 3], [0], [2, 3], [1, 2]],
  // Dragon phases
  [[0, 1, 2], [3], [0, 2, 3], [1]],
  [[0, 1, 2, 3], [0, 2], [1, 3], [0, 1, 2, 3]],
  // Mordred phases
  [[0, 1, 2, 3], [0, 2], [1, 3], [0], [2, 3]],
  [[0, 1, 2, 3], [0, 1, 2, 3], [1], [0, 2, 3], [0, 1, 2, 3]],
];

// ── SONG STRUCTURE ────────────────────────────────────────────────────────
// Each fight is a "song" with dynamic sections that change BPM & patterns.
type SongSection = "intro" | "verse" | "chorus" | "bridge" | "finale";
interface SongSectionDef {
  name: SongSection;
  beats: number;         // how many beats this section lasts
  bpmMult: number;       // multiplier on base BPM
  noteChance: number;    // chance to add extra notes (0=sparse, 1=dense)
  holdChance: number;    // chance of hold notes
  attackMult: number;    // multiplier on attack frequency (lower = fewer attacks)
}

const SONG_STRUCTURES: SongSectionDef[][] = [
  // Goblin (easy, ~60 beats)
  [
    { name: "intro", beats: 8, bpmMult: 0.8, noteChance: 0, holdChance: 0, attackMult: 0 },
    { name: "verse", beats: 16, bpmMult: 1, noteChance: 0.1, holdChance: 0.05, attackMult: 0.7 },
    { name: "chorus", beats: 12, bpmMult: 1.1, noteChance: 0.3, holdChance: 0.1, attackMult: 1 },
    { name: "verse", beats: 12, bpmMult: 1, noteChance: 0.15, holdChance: 0.1, attackMult: 0.8 },
    { name: "chorus", beats: 12, bpmMult: 1.15, noteChance: 0.35, holdChance: 0.12, attackMult: 1.2 },
    { name: "finale", beats: 8, bpmMult: 1.25, noteChance: 0.4, holdChance: 0.15, attackMult: 1.5 },
  ],
  // Skeleton (medium, ~80 beats)
  [
    { name: "intro", beats: 6, bpmMult: 0.85, noteChance: 0, holdChance: 0, attackMult: 0 },
    { name: "verse", beats: 16, bpmMult: 1, noteChance: 0.15, holdChance: 0.1, attackMult: 0.8 },
    { name: "chorus", beats: 12, bpmMult: 1.12, noteChance: 0.35, holdChance: 0.15, attackMult: 1 },
    { name: "bridge", beats: 8, bpmMult: 0.9, noteChance: 0.1, holdChance: 0.25, attackMult: 0.5 },
    { name: "chorus", beats: 16, bpmMult: 1.15, noteChance: 0.4, holdChance: 0.15, attackMult: 1.2 },
    { name: "finale", beats: 10, bpmMult: 1.3, noteChance: 0.5, holdChance: 0.18, attackMult: 1.5 },
  ],
  // Elf (hard, ~90 beats)
  [
    { name: "intro", beats: 6, bpmMult: 0.8, noteChance: 0, holdChance: 0, attackMult: 0 },
    { name: "verse", beats: 14, bpmMult: 1, noteChance: 0.2, holdChance: 0.12, attackMult: 0.8 },
    { name: "chorus", beats: 12, bpmMult: 1.15, noteChance: 0.4, holdChance: 0.15, attackMult: 1.1 },
    { name: "bridge", beats: 10, bpmMult: 0.85, noteChance: 0.1, holdChance: 0.3, attackMult: 0.4 },
    { name: "verse", beats: 12, bpmMult: 1.05, noteChance: 0.25, holdChance: 0.15, attackMult: 1 },
    { name: "chorus", beats: 14, bpmMult: 1.2, noteChance: 0.5, holdChance: 0.18, attackMult: 1.3 },
    { name: "finale", beats: 10, bpmMult: 1.35, noteChance: 0.55, holdChance: 0.2, attackMult: 1.6 },
  ],
  // Dragon (harder, ~100 beats)
  [
    { name: "intro", beats: 4, bpmMult: 0.85, noteChance: 0.05, holdChance: 0, attackMult: 0 },
    { name: "verse", beats: 14, bpmMult: 1, noteChance: 0.25, holdChance: 0.12, attackMult: 0.9 },
    { name: "chorus", beats: 14, bpmMult: 1.18, noteChance: 0.45, holdChance: 0.15, attackMult: 1.2 },
    { name: "bridge", beats: 8, bpmMult: 0.8, noteChance: 0.1, holdChance: 0.35, attackMult: 0.3 },
    { name: "chorus", beats: 16, bpmMult: 1.22, noteChance: 0.5, holdChance: 0.18, attackMult: 1.3 },
    { name: "bridge", beats: 6, bpmMult: 0.75, noteChance: 0.05, holdChance: 0.4, attackMult: 0.2 },
    { name: "finale", beats: 14, bpmMult: 1.4, noteChance: 0.6, holdChance: 0.2, attackMult: 1.8 },
  ],
  // Mordred (extreme, ~110 beats)
  [
    { name: "intro", beats: 4, bpmMult: 0.9, noteChance: 0.1, holdChance: 0, attackMult: 0 },
    { name: "verse", beats: 12, bpmMult: 1, noteChance: 0.3, holdChance: 0.15, attackMult: 1 },
    { name: "chorus", beats: 14, bpmMult: 1.2, noteChance: 0.5, holdChance: 0.18, attackMult: 1.3 },
    { name: "bridge", beats: 8, bpmMult: 0.75, noteChance: 0.08, holdChance: 0.4, attackMult: 0.3 },
    { name: "verse", beats: 12, bpmMult: 1.05, noteChance: 0.35, holdChance: 0.15, attackMult: 1.1 },
    { name: "chorus", beats: 16, bpmMult: 1.25, noteChance: 0.55, holdChance: 0.2, attackMult: 1.4 },
    { name: "bridge", beats: 6, bpmMult: 0.7, noteChance: 0.05, holdChance: 0.5, attackMult: 0.2 },
    { name: "finale", beats: 16, bpmMult: 1.45, noteChance: 0.65, holdChance: 0.22, attackMult: 2 },
  ],
];

// ── ENEMIES ────────────────────────────────────────────────────────────────

const ENEMIES: Omit<Enemy, "hp">[] = [
  {
    name: "GOBLIN DRUMMER",
    title: "Act I \u2014 The Tavern Brawl",
    maxHp: 400, color: 0x44aa44, bpm: 100,
    patterns: [[0], [2], [1], [3], [0, 2], [1, 3], [0], [1]],
    sprite: "goblin", attackInterval: 4, attackDmg: 8,
    ability: "speed_up", abilityInterval: 12, // temporarily speeds up notes
  },
  {
    name: "SKELETON PIPER",
    title: "Act II \u2014 The Bone Orchestra",
    maxHp: 600, color: 0xccccaa, bpm: 120,
    patterns: [[0, 1], [2, 3], [1], [0, 3], [2], [0, 1, 2], [3], [1, 2]],
    sprite: "skeleton", attackInterval: 3.2, attackDmg: 10,
    ability: "reverse", abilityInterval: 15, // reverses lane order briefly
  },
  {
    name: "DARK ELF HARPIST",
    title: "Act III \u2014 The Enchanted Grove",
    maxHp: 800, color: 0x8844cc, bpm: 135,
    patterns: [[0], [1, 2], [3], [0, 2, 3], [1], [0, 1, 2, 3], [2], [3, 0]],
    sprite: "elf", attackInterval: 2.8, attackDmg: 12,
    ability: "blind", abilityInterval: 14, // hides notes briefly
  },
  {
    name: "DRAGON VOCALIST",
    title: "Act IV \u2014 The Mountain Peak",
    maxHp: 1100, color: 0xff6622, bpm: 150,
    patterns: [[0, 1], [2, 3], [0, 2], [1, 3], [0, 1, 2, 3], [1], [0, 3], [0, 1, 2]],
    sprite: "dragon", attackInterval: 2.2, attackDmg: 15,
    ability: "fire_lanes", abilityInterval: 10, // sets 2 lanes on fire — must avoid
  },
  {
    name: "MORDRED THE SILENT",
    title: "Act V \u2014 The Throne Room",
    maxHp: 1500, color: 0xff2244, bpm: 170,
    patterns: [[0, 1, 2, 3], [0], [1, 3], [2], [0, 2, 3], [1, 2], [0, 1, 3], [0, 1, 2, 3]],
    sprite: "mordred", attackInterval: 1.8, attackDmg: 18,
    ability: "darkness", abilityInterval: 8, // dims entire screen
  },
];

// ── GAME CLASS ─────────────────────────────────────────────────────────────

export class BardGame {
  private _tickerCb: ((t: Ticker) => void) | null = null;
  private _keyDown: ((e: KeyboardEvent) => void) | null = null;
  private _keyUp: ((e: KeyboardEvent) => void) | null = null;
  private _audio = new BardAudio();

  // Difficulty
  private _difficulty: Difficulty = "normal";
  private _diffMods = { hpMult: 1, missDmg: 4, speedMult: 1, enemyAtkMult: 1, scoreMult: 1 };

  // State
  private _phase: "start" | "playing" | "victory" | "defeat" | "transition" | "upgrade" = "start";
  private _notes: Note[] = [];
  private _attacks: EnemyAttack[] = [];
  private _particles: Particle[] = [];
  private _floatingTexts: FloatingText[] = [];
  private _score = 0;
  private _combo = 0;
  private _maxCombo = 0;
  private _perfects = 0;
  private _goods = 0;
  private _misses = 0;
  private _totalNotes = 0;
  private _health = 100;
  private _maxHealth = 100;
  private _mana = 0;
  private _maxMana = 100;
  private _shield = 0;
  private _multiplier = 1;        // score multiplier (1x..4x)
  private _enemyIdx = 0;
  private _enemy!: Enemy;
  private _beatTimer = 0;
  private _beatIdx = 0;
  private _noteSpeed = NOTE_SPEED_BASE;
  private _time = 0;
  private _lanePressed = [false, false, false, false];
  private _laneFlash = [0, 0, 0, 0];
  private _screenShake = 0;
  private _spellGlow = 0;
  private _spellGlowColor = 0xcc88ff;
  private _transitionTimer = 0;
  private _isPaused = false;
  private _beatPulse = 0;
  private _enemyHitFlash = 0;
  private _attackTimer = 0;
  private _perfectStreak = 0;
  private _comboMilestone = 0;
  private _dangerPulse = 0;
  // Boss ability state
  private _abilityTimer = 0;
  private _abilityActive = 0;       // countdown for active ability duration
  private _abilityType: BossAbility | null = null;
  private _fireLanes: boolean[] = [false, false, false, false];
  private _laneReversed = false;
  // Combo fire visual
  private _comboFire = 0;
  // Fever mode
  private _feverMeter = 0;          // 0..100, fills from perfects
  private _feverActive = false;
  private _feverTimer = 0;          // seconds remaining
  private _feverFlash = 0;
  // Hold note sustain audio handles
  private _holdSustains: Map<Note, { stop: () => void }> = new Map();
  // Hit ripple rings
  private _ripples: Ripple[] = [];
  // Floating musical notes in background
  private _musicNotes: MusicNote[] = [];
  private _musicNoteTimer = 0;
  // Perfect streak flame height
  private _streakFlame = 0;
  // Boss enrage visual
  private _enraged = false;
  // High score
  private _highScore = 0;
  private _isNewHighScore = false;
  // Gameplay upgrades (chosen between acts)
  private _dmgBonus = 0;         // +flat damage per hit
  private _lifeStealPct = 0;     // % of damage healed
  // Chain timing (rapid successive hits bonus)
  private _lastHitTime = 0;
  private _chainCount = 0;
  // Score milestones
  private _nextMilestone = 5000;
  // Critical hit flash
  private _critFlash = 0;
  // Dodge mechanic (Space key)
  private _dodgeTimer = 0;        // >0 means dodge is active (invulnerable to attacks)
  private _dodgeCooldown = 0;     // cooldown before next dodge
  // Revival
  private _hasRevived = false;    // can only revive once per run
  // Boss taunts
  private _tauntTimer = 0;
  private _currentTaunt = "";
  private _tauntLife = 0;
  // Time slow spell
  private _timeSlowTimer = 0;
  // Beat metronome
  private _beatCount = 0;
  // Song structure
  private _songSectionIdx = 0;        // current section index
  private _songSectionBeat = 0;       // beats elapsed in current section
  private _currentSection: SongSectionDef = { name: "intro", beats: 8, bpmMult: 1, noteChance: 0, holdChance: 0, attackMult: 0 };
  private _sectionTransition = 0;     // visual flash when section changes
  // Phase transition (brief pause at HP thresholds)
  private _phaseTransitionTimer = 0;  // >0 = enemy is doing special move
  private _phaseTriggered = new Set<number>(); // which HP thresholds have fired
  // Resonance upgrade: near-misses count as Good
  private _hasResonance = false;
  // Echo upgrade: every Nth note auto-hits
  private _hasEcho = false;
  private _echoCounter = 0;
  // Arcane Focus: spells cost less
  private _hasArcaneFocus = false;
  // Current upgrade choices (stored so keyboard can reference them)
  private _upgradeChoices: { apply: () => void }[] = [];
  // Run history
  private _runHistory: { score: number; rank: string; difficulty: string; date: string }[] = [];
  // Starfield
  private _stars: { x: number; y: number; size: number; twinkleSpeed: number; brightness: number }[] = [];
  // Lane sparkles (ambient particles drifting up inside lanes)
  private _laneSparkles: { lane: number; x: number; y: number; vy: number; life: number; maxLife: number; size: number }[] = [];
  // Miss shatter effect per lane
  private _missShatter: number[] = [0, 0, 0, 0];
  // Victory confetti
  private _confetti: { x: number; y: number; vx: number; vy: number; rot: number; rotV: number; color: number; w: number; h: number; life: number }[] = [];

  // View
  private _root = new Container();
  private _bg = new Graphics();
  private _staffLines = new Graphics();
  private _highway = new Graphics();
  private _noteGfx = new Graphics();
  private _effectGfx = new Graphics();
  private _hudGfx = new Graphics();
  private _enemyGfx = new Graphics();
  private _textContainer = new Container();

  // ── BOOT / DESTROY ─────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._showStartScreen();
  }

  destroy(): void {
    if (this._tickerCb) viewManager.app.ticker.remove(this._tickerCb);
    if (this._keyDown) window.removeEventListener("keydown", this._keyDown);
    if (this._keyUp) window.removeEventListener("keyup", this._keyUp);
    this._audio.cleanup();
    this._root.destroy({ children: true });
    this._tickerCb = null;
    this._keyDown = null;
    this._keyUp = null;
  }

  // ── START SCREEN ─────────────────────────────────────────────────────────

  private _showStartScreen(): void {
    this._root.removeChildren();
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;

    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: COL_BG });
    this._root.addChild(bg);

    const border = new Graphics();
    border.rect(20, 20, sw - 40, sh - 40).stroke({ color: COL_BORDER, width: 2, alpha: 0.3 });
    border.rect(26, 26, sw - 52, sh - 52).stroke({ color: COL_BORDER, width: 0.5, alpha: 0.1 });
    // Corner ornaments (polygon trefoil knots)
    for (const [cx2, cy2] of [[28, 28], [sw - 28, 28], [28, sh - 28], [sw - 28, sh - 28]]) {
      // Diamond center
      border.moveTo(cx2, cy2 - 6).lineTo(cx2 + 6, cy2).lineTo(cx2, cy2 + 6).lineTo(cx2 - 6, cy2).closePath()
        .fill({ color: COL_GOLD, alpha: 0.2 });
      border.moveTo(cx2, cy2 - 4).lineTo(cx2 + 4, cy2).lineTo(cx2, cy2 + 4).lineTo(cx2 - 4, cy2).closePath()
        .fill({ color: COL_GOLD, alpha: 0.15 });
      // Extending lines (cross pattern)
      border.moveTo(cx2, cy2 - 6).lineTo(cx2, cy2 - 14).stroke({ color: COL_GOLD, width: 0.8, alpha: 0.15 });
      border.moveTo(cx2, cy2 + 6).lineTo(cx2, cy2 + 14).stroke({ color: COL_GOLD, width: 0.8, alpha: 0.15 });
      border.moveTo(cx2 - 6, cy2).lineTo(cx2 - 14, cy2).stroke({ color: COL_GOLD, width: 0.8, alpha: 0.15 });
      border.moveTo(cx2 + 6, cy2).lineTo(cx2 + 14, cy2).stroke({ color: COL_GOLD, width: 0.8, alpha: 0.15 });
    }
    // Top center lute silhouette emblem
    const embX = sw / 2, embY = 38;
    // Lute body (polygon)
    border.moveTo(embX - 8, embY + 4).lineTo(embX - 10, embY).lineTo(embX - 8, embY - 6)
      .lineTo(embX, embY - 10).lineTo(embX + 8, embY - 6).lineTo(embX + 10, embY)
      .lineTo(embX + 8, embY + 4).lineTo(embX, embY + 6).closePath()
      .fill({ color: COL_GOLD, alpha: 0.12 });
    // Sound hole
    border.circle(embX, embY - 2, 2.5).stroke({ color: COL_GOLD, width: 0.5, alpha: 0.15 });
    // Neck
    border.moveTo(embX - 1.5, embY - 10).lineTo(embX - 1.5, embY - 20).lineTo(embX + 1.5, embY - 20)
      .lineTo(embX + 1.5, embY - 10).closePath().fill({ color: COL_GOLD, alpha: 0.1 });
    // Headstock (triangle)
    border.moveTo(embX - 3, embY - 20).lineTo(embX, embY - 24).lineTo(embX + 3, embY - 20).closePath()
      .fill({ color: COL_GOLD, alpha: 0.12 });
    this._root.addChild(border);

    // Animated staff lines behind title
    const staffG = new Graphics();
    for (let i = 0; i < 5; i++) {
      staffG.moveTo(60, 68 + i * 10).lineTo(sw - 60, 68 + i * 10)
        .stroke({ color: COL_BORDER, width: 0.5, alpha: 0.12 });
    }
    // Treble clef approximation (polygon) at left of staff
    staffG.moveTo(50, 88).bezierCurveTo(50, 80, 54, 72, 50, 68)
      .stroke({ color: COL_GOLD, width: 1, alpha: 0.12 });
    staffG.circle(52, 100, 3).stroke({ color: COL_GOLD, width: 0.8, alpha: 0.1 });
    this._root.addChild(staffG);

    const title = new Text({ text: "\u266B  B A R D  \u266B", style: new TextStyle({
      fontFamily: FONT, fontSize: 42, fill: COL_GOLD, fontWeight: "bold", letterSpacing: 8,
    }) });
    title.anchor.set(0.5, 0); title.position.set(sw / 2, 72);
    this._root.addChild(title);

    const sub = new Text({ text: "A Rhythm Battle RPG", style: new TextStyle({
      fontFamily: FONT, fontSize: 14, fill: 0x887799, fontStyle: "italic",
    }) });
    sub.anchor.set(0.5, 0); sub.position.set(sw / 2, 122);
    this._root.addChild(sub);

    const lore = [
      "You are Taliesin, the legendary bard of Camelot.",
      "Your lute is enchanted \u2014 every note is a spell.",
      "Dark forces have silenced the kingdom's music.",
      "Battle through 5 acts of rhythmic combat",
      "to restore harmony to the realm.",
    ];
    let ly = 160;
    for (const line of lore) {
      const t = new Text({ text: line, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x998888 }) });
      t.anchor.set(0.5, 0); t.position.set(sw / 2, ly);
      this._root.addChild(t); ly += 16;
    }

    ly += 14;
    const controlTitle = new Text({ text: "CONTROLS", style: new TextStyle({
      fontFamily: FONT, fontSize: 12, fill: 0xccaa88, fontWeight: "bold", letterSpacing: 2,
    }) });
    controlTitle.anchor.set(0.5, 0); controlTitle.position.set(sw / 2, ly);
    this._root.addChild(controlTitle);
    ly += 22;

    const controls = [
      ["D  F  J  K", "Hit notes in each lane"],
      ["Hold key", "Hold notes for bonus damage"],
      ["1 2 3 4", "Spells: Heal / Smite / Shield / Slow"],
      ["Space", "Dodge enemy attacks (2s cooldown)"],
      ["\u26A0 Red/Purple", "Danger/Poison \u2014 DON'T press!"],
      ["Esc", "Pause"],
    ];
    for (const [key, desc] of controls) {
      const badge = new Graphics();
      const bw = Math.max(90, key.length * 7.5 + 16);
      badge.roundRect(sw / 2 - 190, ly, bw, 18, 3).fill({ color: 0x0a080e, alpha: 0.9 });
      badge.roundRect(sw / 2 - 190, ly, bw, 18, 3).stroke({ color: 0x444433, width: 1 });
      this._root.addChild(badge);
      const kt = new Text({ text: key, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xccbb88, fontWeight: "bold" }) });
      kt.anchor.set(0.5, 0.5); kt.position.set(sw / 2 - 190 + bw / 2, ly + 9);
      this._root.addChild(kt);
      const dt = new Text({ text: desc, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x888877 }) });
      dt.position.set(sw / 2 - 190 + bw + 10, ly + 3);
      this._root.addChild(dt);
      ly += 22;
    }

    // Spells info
    ly += 6;
    const spellTitle = new Text({ text: "SPELLS", style: new TextStyle({
      fontFamily: FONT, fontSize: 12, fill: 0xcc88ff, fontWeight: "bold", letterSpacing: 2,
    }) });
    spellTitle.anchor.set(0.5, 0); spellTitle.position.set(sw / 2, ly);
    this._root.addChild(spellTitle);
    ly += 20;

    for (const sp of SPELLS) {
      const spG = new Graphics();
      spG.roundRect(sw / 2 - 140, ly, 280, 18, 3).fill({ color: sp.color, alpha: 0.06 });
      spG.roundRect(sw / 2 - 140, ly, 280, 18, 3).stroke({ color: sp.color, width: 0.5, alpha: 0.25 });
      // Diamond icon at left edge of spell row
      const sdx = sw / 2 - 134, sdy = ly + 9;
      spG.moveTo(sdx, sdy - 4).lineTo(sdx + 4, sdy).lineTo(sdx, sdy + 4).lineTo(sdx - 4, sdy).closePath()
        .fill({ color: sp.color, alpha: 0.2 });
      this._root.addChild(spG);
      const st = new Text({ text: `[${sp.key}] ${sp.name} \u2014 ${sp.desc} (${sp.manaCost} mana)`, style: new TextStyle({
        fontFamily: FONT, fontSize: 9, fill: sp.color,
      }) });
      st.anchor.set(0.5, 0.5); st.position.set(sw / 2, ly + 9);
      this._root.addChild(st);
      ly += 22;
    }

    // Lane preview with diamond note icons
    ly += 8;
    const previewG = new Graphics();
    const previewX = sw / 2 - HIGHWAY_W / 2;
    for (let i = 0; i < LANES; i++) {
      const lx = previewX + i * (LANE_W + LANE_GAP);
      previewG.roundRect(lx, ly, LANE_W, 28, 4).fill({ color: LANE_COLORS[i], alpha: 0.12 });
      previewG.roundRect(lx, ly, LANE_W, 28, 4).stroke({ color: LANE_COLORS[i], width: 1.5, alpha: 0.4 });
      // Diamond note icon at top of each lane
      const dix = lx + LANE_W / 2, diy = ly - 6;
      previewG.moveTo(dix, diy - 4).lineTo(dix + 4, diy).lineTo(dix, diy + 4).lineTo(dix - 4, diy).closePath()
        .fill({ color: LANE_COLORS[i], alpha: 0.3 });
      previewG.moveTo(dix, diy - 4).lineTo(dix + 4, diy).lineTo(dix, diy + 4).lineTo(dix - 4, diy).closePath()
        .stroke({ color: LANE_COLORS[i], width: 0.8, alpha: 0.5 });
    }
    this._root.addChild(previewG);
    for (let i = 0; i < LANES; i++) {
      const lt = new Text({ text: LANE_LABELS[i], style: new TextStyle({
        fontFamily: FONT, fontSize: 15, fill: LANE_COLORS[i], fontWeight: "bold",
      }) });
      lt.anchor.set(0.5, 0.5);
      lt.position.set(previewX + i * (LANE_W + LANE_GAP) + LANE_W / 2, ly + 14);
      this._root.addChild(lt);
    }

    // Difficulty selector
    ly += 30;
    const diffTitle = new Text({ text: "DIFFICULTY", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xccaa88, fontWeight: "bold", letterSpacing: 2 }) });
    diffTitle.anchor.set(0.5, 0); diffTitle.position.set(sw / 2, ly);
    this._root.addChild(diffTitle);
    ly += 18;

    const diffs: { id: Difficulty; label: string; desc: string; color: number }[] = [
      { id: "easy", label: "BARD", desc: "More HP, less damage", color: 0x55aa55 },
      { id: "normal", label: "MINSTREL", desc: "The intended experience", color: 0xaa88cc },
      { id: "hard", label: "VIRTUOSO", desc: "Less HP, faster, brutal", color: 0xff5544 },
    ];
    const diffBtnW = 110, diffGap = 8;
    const diffStartX = sw / 2 - (diffBtnW * 3 + diffGap * 2) / 2;
    for (let di = 0; di < diffs.length; di++) {
      const d = diffs[di];
      const dx = diffStartX + di * (diffBtnW + diffGap);
      const sel = d.id === this._difficulty;
      const dBtn = new Graphics();
      dBtn.roundRect(dx, ly, diffBtnW, 32, 4).fill({ color: sel ? 0x1a1a2a : 0x0a0a14, alpha: 0.95 });
      dBtn.roundRect(dx, ly, diffBtnW, 32, 4).stroke({ color: d.color, width: sel ? 2 : 0.5, alpha: sel ? 0.8 : 0.25 });
      if (sel) dBtn.roundRect(dx + 2, ly + 2, diffBtnW - 4, 28, 3).stroke({ color: d.color, width: 0.5, alpha: 0.15 });
      dBtn.eventMode = "static"; dBtn.cursor = "pointer";
      dBtn.on("pointerdown", () => { this._difficulty = d.id; this._showStartScreen(); });
      this._root.addChild(dBtn);
      const dLabel = new Text({ text: d.label, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: sel ? d.color : 0x666655, fontWeight: "bold" }) });
      dLabel.anchor.set(0.5, 0); dLabel.position.set(dx + diffBtnW / 2, ly + 4);
      this._root.addChild(dLabel);
      const dDesc = new Text({ text: d.desc, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x777766 }) });
      dDesc.anchor.set(0.5, 0); dDesc.position.set(dx + diffBtnW / 2, ly + 18);
      this._root.addChild(dDesc);
    }
    ly += 42;

    // Start button with polygon wing ornaments
    const btnW = 240, btnH = 40;
    const btn = new Graphics();
    btn.roundRect(sw / 2 - btnW / 2, ly, btnW, btnH, 6).fill({ color: 0x1a0a2a, alpha: 0.95 });
    btn.roundRect(sw / 2 - btnW / 2, ly, btnW, btnH, 6).stroke({ color: COL_GOLD, width: 2 });
    // Wing ornaments flanking button
    const bly = ly + btnH / 2;
    // Left wing
    btn.moveTo(sw / 2 - btnW / 2 - 4, bly).lineTo(sw / 2 - btnW / 2 - 16, bly - 8)
      .lineTo(sw / 2 - btnW / 2 - 22, bly - 4).lineTo(sw / 2 - btnW / 2 - 16, bly)
      .lineTo(sw / 2 - btnW / 2 - 22, bly + 4).lineTo(sw / 2 - btnW / 2 - 16, bly + 8).closePath()
      .fill({ color: COL_GOLD, alpha: 0.1 });
    // Right wing
    btn.moveTo(sw / 2 + btnW / 2 + 4, bly).lineTo(sw / 2 + btnW / 2 + 16, bly - 8)
      .lineTo(sw / 2 + btnW / 2 + 22, bly - 4).lineTo(sw / 2 + btnW / 2 + 16, bly)
      .lineTo(sw / 2 + btnW / 2 + 22, bly + 4).lineTo(sw / 2 + btnW / 2 + 16, bly + 8).closePath()
      .fill({ color: COL_GOLD, alpha: 0.1 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => this._startGame());
    btn.on("pointerover", () => { btn.clear(); btn.roundRect(sw / 2 - btnW / 2, ly, btnW, btnH, 6).fill({ color: 0x2a1a3a }); btn.roundRect(sw / 2 - btnW / 2, ly, btnW, btnH, 6).stroke({ color: COL_GOLD, width: 2.5 }); });
    btn.on("pointerout", () => { btn.clear(); btn.roundRect(sw / 2 - btnW / 2, ly, btnW, btnH, 6).fill({ color: 0x1a0a2a, alpha: 0.95 }); btn.roundRect(sw / 2 - btnW / 2, ly, btnW, btnH, 6).stroke({ color: COL_GOLD, width: 2 }); });
    this._root.addChild(btn);
    const btnTxt = new Text({ text: "\u266B  Begin the Concert  \u266B", style: new TextStyle({
      fontFamily: FONT, fontSize: 15, fill: COL_GOLD, fontWeight: "bold",
    }) });
    btnTxt.anchor.set(0.5, 0.5); btnTxt.position.set(sw / 2, ly + btnH / 2);
    this._root.addChild(btnTxt);

    ly += btnH + 10;

    // Run history (if any)
    try {
      const hist = JSON.parse(localStorage.getItem("bard_history") ?? "[]") as { score: number; rank: string; difficulty: string; date: string }[];
      if (hist.length > 0) {
        const histTitle = new Text({ text: "RECENT RUNS", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x556677, letterSpacing: 1 }) });
        histTitle.anchor.set(0.5, 0); histTitle.position.set(sw / 2, ly);
        this._root.addChild(histTitle);
        ly += 14;
        for (let hi = 0; hi < Math.min(3, hist.length); hi++) {
          const h = hist[hi];
          const rankCol = h.rank === "S" ? COL_GOLD : h.rank === "A" ? 0x44ff88 : 0x888888;
          const ht = new Text({ text: `${h.rank} ${h.score.toLocaleString()} (${h.difficulty}) ${h.date}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: rankCol }) });
          ht.anchor.set(0.5, 0); ht.position.set(sw / 2, ly);
          this._root.addChild(ht);
          ly += 12;
        }
        ly += 4;
      }
    } catch { /* ok */ }

    const back = new Text({ text: "\u2190 Back to Camelot", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x776677 }) });
    back.anchor.set(0.5, 0); back.position.set(sw / 2, ly);
    back.eventMode = "static"; back.cursor = "pointer";
    back.on("pointerdown", () => { this.destroy(); window.dispatchEvent(new Event("bardExit")); });
    this._root.addChild(back);

    viewManager.addToLayer("ui", this._root);

    this._keyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") this._startGame();
      if (e.key === "Escape") { this.destroy(); window.dispatchEvent(new Event("bardExit")); }
    };
    window.addEventListener("keydown", this._keyDown);
  }

  // ── START GAME ──────────────────────────────────────────────────────────

  private _startGame(): void {
    if (this._keyDown) { window.removeEventListener("keydown", this._keyDown); this._keyDown = null; }
    if (this._keyUp) { window.removeEventListener("keyup", this._keyUp); this._keyUp = null; }
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    this._root.removeChildren();

    // Recreate graphics objects (they may have been destroyed)
    this._bg = new Graphics();
    this._staffLines = new Graphics();
    this._highway = new Graphics();
    this._noteGfx = new Graphics();
    this._effectGfx = new Graphics();
    this._hudGfx = new Graphics();
    this._enemyGfx = new Graphics();
    this._textContainer = new Container();

    // Reset state
    this._audio.init();

    // Apply difficulty
    if (this._difficulty === "easy") this._diffMods = { hpMult: 1.5, missDmg: 3, speedMult: 0.85, enemyAtkMult: 0.7, scoreMult: 0.8 };
    else if (this._difficulty === "hard") this._diffMods = { hpMult: 0.7, missDmg: 6, speedMult: 1.2, enemyAtkMult: 1.4, scoreMult: 1.5 };
    else this._diffMods = { hpMult: 1, missDmg: 4, speedMult: 1, enemyAtkMult: 1, scoreMult: 1 };

    this._score = 0; this._combo = 0; this._maxCombo = 0; this._multiplier = 1;
    this._perfects = 0; this._goods = 0; this._misses = 0; this._totalNotes = 0;
    this._maxHealth = Math.floor(100 * this._diffMods.hpMult); this._health = this._maxHealth;
    this._mana = 0; this._maxMana = 100; this._shield = 0;
    this._enemyIdx = 0; this._time = 0;
    this._notes = []; this._attacks = []; this._particles = []; this._floatingTexts = [];
    this._phase = "playing"; this._isPaused = false;
    this._perfectStreak = 0; this._comboMilestone = 0;
    this._beatPulse = 0; this._enemyHitFlash = 0; this._dangerPulse = 0;
    this._abilityTimer = 0; this._abilityActive = 0; this._abilityType = null;
    this._fireLanes = [false, false, false, false]; this._laneReversed = false;
    this._comboFire = 0;
    this._feverMeter = 0; this._feverActive = false; this._feverTimer = 0; this._feverFlash = 0;
    this._ripples = []; this._musicNotes = []; this._musicNoteTimer = 0;
    this._streakFlame = 0; this._enraged = false;
    this._laneSparkles = []; this._missShatter = [0, 0, 0, 0]; this._confetti = [];
    this._dmgBonus = 0; this._lifeStealPct = 0;
    this._lastHitTime = 0; this._chainCount = 0;
    this._nextMilestone = 5000; this._critFlash = 0;
    this._dodgeTimer = 0; this._dodgeCooldown = 0;
    this._hasRevived = false;
    this._tauntTimer = 0; this._currentTaunt = ""; this._tauntLife = 0;
    this._timeSlowTimer = 0; this._beatCount = 0;
    this._hasResonance = false; this._hasEcho = false; this._hasArcaneFocus = false;
    this._echoCounter = 0; this._upgradeChoices = [];
    this._songSectionIdx = 0; this._songSectionBeat = 0; this._sectionTransition = 0;
    this._phaseTransitionTimer = 0; this._phaseTriggered.clear(); this._enraged = false;
    // Generate starfield
    this._stars = [];
    const _sw = viewManager.screenWidth, _sh = viewManager.screenHeight;
    for (let i = 0; i < 60; i++) {
      this._stars.push({
        x: Math.random() * _sw, y: Math.random() * _sh,
        size: 0.5 + Math.random() * 1.5, twinkleSpeed: 1 + Math.random() * 3,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
    this._isNewHighScore = false;
    try { this._highScore = parseInt(localStorage.getItem("bard_highscore") ?? "0") || 0; } catch { this._highScore = 0; }
    for (const s of this._holdSustains.values()) s.stop();
    this._holdSustains.clear();
    this._lanePressed = [false, false, false, false];
    this._laneFlash = [0, 0, 0, 0];
    this._screenShake = 0; this._spellGlow = 0;

    this._loadEnemy(0);

    this._root.addChild(this._bg, this._staffLines, this._highway, this._enemyGfx, this._noteGfx, this._effectGfx, this._hudGfx, this._textContainer);
    viewManager.addToLayer("ui", this._root);

    this._keyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Escape") { this._togglePause(); return; }
      if (this._isPaused) return;
      if (this._phase === "victory" || this._phase === "defeat") return;

      // Upgrade selection (dynamic)
      if (this._phase === "upgrade") {
        const uIdx = ["1", "2", "3"].indexOf(e.key);
        if (uIdx >= 0 && uIdx < this._upgradeChoices.length) {
          this._upgradeChoices[uIdx].apply();
          this._health = Math.min(this._maxHealth, this._health + 20);
          this._loadEnemy(this._enemyIdx + 1);
          this._phase = "playing";
        }
        return;
      }

      if (this._phase !== "playing") return;

      // Dodge (Space)
      if (e.key === " " && this._dodgeCooldown <= 0) {
        this._dodgeTimer = 0.3; // 0.3s invulnerability window
        this._dodgeCooldown = 2; // 2s cooldown
        this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: HIT_Y - 40, text: "\u21BA DODGE!", color: 0x88ccff, life: 0.5, maxLife: 0.5, vy: -40, scale: 1.1 });
        return;
      }

      // Spell keys
      const spellIdx = ["1", "2", "3", "4"].indexOf(e.key);
      if (spellIdx >= 0) { this._castSpell(spellIdx); return; }

      const lane = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (lane >= 0) { this._lanePressed[lane] = true; this._onLaneHit(lane); }
    };
    this._keyUp = (e: KeyboardEvent) => {
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (lane >= 0) {
        this._lanePressed[lane] = false;
        // Stop holding any hold notes in this lane
        for (const n of this._notes) {
          if (n.lane === lane && n.holding) n.holding = false;
        }
      }
    };
    window.addEventListener("keydown", this._keyDown);
    window.addEventListener("keyup", this._keyUp);

    this._tickerCb = (ticker: Ticker) => {
      if (this._isPaused) { this._draw(); return; }
      this._update(ticker.deltaMS / 1000);
      this._draw();
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _loadEnemy(idx: number): void {
    this._enemyIdx = idx;
    const t = ENEMIES[idx];
    this._enemy = { ...t, hp: t.maxHp };
    this._beatTimer = 0; this._beatIdx = 0;
    this._noteSpeed = (NOTE_SPEED_BASE + idx * 30) * this._diffMods.speedMult;
    this._notes = []; this._attacks = [];
    this._attackTimer = 0;
    this._enemy.attackInterval /= this._diffMods.enemyAtkMult;
    this._enemy.attackDmg = Math.floor(this._enemy.attackDmg * this._diffMods.enemyAtkMult);
    this._abilityTimer = 0; this._abilityActive = 0; this._abilityType = null;
    this._fireLanes = [false, false, false, false]; this._laneReversed = false;
    // Song structure init
    this._songSectionIdx = 0; this._songSectionBeat = 0;
    const sections = SONG_STRUCTURES[idx] ?? SONG_STRUCTURES[0];
    this._currentSection = sections[0];
    this._phaseTriggered.clear(); this._phaseTransitionTimer = 0;
    this._audio.startBg(idx, t.bpm);
  }

  // ── UPDATE LOOP ──────────────────────────────────────────────────────────

  private _update(dt: number): void {
    if (this._phase === "transition") {
      this._transitionTimer -= dt;
      this._updateDecay(dt);
      if (this._transitionTimer <= 0) {
        if (this._enemyIdx + 1 < ENEMIES.length) {
          // Show upgrade selection instead of immediately starting next act
          this._phase = "upgrade";
          return;
        } else {
          this._phase = "victory";
          // Spawn victory confetti burst
          const _sw2 = viewManager.screenWidth;
          const confettiColors = [COL_GOLD, 0xff4466, 0x44bbff, 0x44ff88, 0xffaa44, 0xcc88ff, 0xffffff];
          for (let i = 0; i < 120; i++) {
            this._confetti.push({
              x: _sw2 * (0.2 + Math.random() * 0.6), y: -10 - Math.random() * 100,
              vx: (Math.random() - 0.5) * 200, vy: 50 + Math.random() * 150,
              rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 8,
              color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
              w: 3 + Math.random() * 5, h: 6 + Math.random() * 8, life: 5 + Math.random() * 3,
            });
          }
        }
      }
      return;
    }
    if (this._phase !== "playing") return;

    this._time += dt;
    const sh = viewManager.screenHeight;

    // Time slow effect
    const timeScale = this._timeSlowTimer > 0 ? 0.5 : 1;
    if (this._timeSlowTimer > 0) this._timeSlowTimer -= dt;

    // Phase transition pause (enemy special move animation)
    if (this._phaseTransitionTimer > 0) {
      this._phaseTransitionTimer -= dt;
      this._updateDecay(dt);
      return; // freeze gameplay briefly
    }

    // Song section tracking — advance sections based on beat count
    const sections = SONG_STRUCTURES[this._enemyIdx] ?? SONG_STRUCTURES[0];
    if (this._songSectionBeat >= this._currentSection.beats && this._songSectionIdx < sections.length - 1) {
      this._songSectionIdx++;
      this._songSectionBeat = 0;
      this._currentSection = sections[this._songSectionIdx];
      this._sectionTransition = 1; // flash
      // Show section name
      const sectionLabels: Record<SongSection, string> = {
        intro: "\u266B Intro", verse: "\u266B Verse", chorus: "\u266B Chorus!",
        bridge: "\u266B Bridge...", finale: "\u266B FINALE!",
      };
      const _sw3 = viewManager.screenWidth;
      this._floatingTexts.push({
        x: _sw3 / 2, y: viewManager.screenHeight * 0.35,
        text: sectionLabels[this._currentSection.name],
        color: this._currentSection.name === "finale" ? COL_GOLD : this._currentSection.name === "chorus" ? 0x88aaff : 0x887799,
        life: 1.5, maxLife: 1.5, vy: -20, scale: this._currentSection.name === "finale" ? 1.8 : 1.2,
      });
    }

    // Dynamic BPM based on song section
    const dynamicBpm = this._enemy.bpm * this._currentSection.bpmMult;
    const beatInterval = 60 / dynamicBpm;
    this._beatTimer += dt * timeScale;
    while (this._beatTimer >= beatInterval) {
      this._beatTimer -= beatInterval;
      this._beatPulse = 1;
      this._beatCount++;
      this._songSectionBeat++;
      this._audio.playBeat();

      // Intro section: no notes, just beat
      if (this._currentSection.name === "intro" && this._currentSection.noteChance <= 0) {
        this._beatIdx++;
        continue;
      }

      const pattern = this._getPattern();

      // Song section may add extra notes based on noteChance
      let spawnLanes = [...pattern];
      if (this._currentSection.noteChance > 0 && Math.random() < this._currentSection.noteChance) {
        const extra = Math.floor(Math.random() * LANES);
        if (!spawnLanes.includes(extra)) spawnLanes.push(extra);
      }

      for (const lane of spawnLanes) {
        // Echo upgrade: auto-hit every 4th note
        if (this._hasEcho) this._echoCounter++;
        const autoHit = this._hasEcho && this._echoCounter % 4 === 0;

        const holdChance = this._currentSection.holdChance + (this._enemyIdx >= 1 ? 0.05 : 0);
        const isHold = Math.random() < holdChance;
        const rng2 = Math.random();
        const noteType: NoteType = rng2 < 0.05 ? "golden" : (rng2 < 0.09 && this._enemyIdx >= 1) ? "poison" : "normal";

        if (autoHit && noteType === "normal") {
          // Auto-hit: immediately score as good, play sound, show visual
          this._combo++;
          this._score += 50;
          this._enemy.hp = Math.max(0, this._enemy.hp - 4);
          this._mana = Math.min(this._maxMana, this._mana + 1);
          this._audio.playHit(lane, false);
          const _sw3 = viewManager.screenWidth;
          const hx3 = _sw3 / 2 - HIGHWAY_W / 2;
          this._laneFlash[lane] = 0.4;
          this._floatingTexts.push({
            x: hx3 + lane * (LANE_W + LANE_GAP) + LANE_W / 2, y: HIT_Y - 20,
            text: "ECHO", color: 0x88ccff, life: 0.4, maxLife: 0.4, vy: -50, scale: 0.8,
          });
        } else {
          this._notes.push({
            lane, y: SPAWN_Y, hit: false, missed: false,
            holdLen: isHold && noteType === "normal" ? 60 + Math.random() * 80 : 0,
            holdHeld: 0, holding: false,
            type: noteType,
          });
          this._totalNotes++;
        }
      }
      this._beatIdx++;
    }

    // HP phase transitions (at 75%, 50%, 25%)
    const hpPct2 = this._enemy.hp / this._enemy.maxHp;
    for (const threshold of [75, 50, 25]) {
      if (hpPct2 * 100 <= threshold && !this._phaseTriggered.has(threshold)) {
        this._phaseTriggered.add(threshold);
        this._phaseTransitionTimer = 1.2; // 1.2 second pause
        this._screenShake = 0.5;
        this._enemyHitFlash = 0.8;
        const phaseNames: Record<number, string> = {
          75: "\u2694 Phase 2!", 50: "\u{1F525} Phase 3!!", 25: "\u{1F480} ENRAGE!!!",
        };
        this._floatingTexts.push({
          x: viewManager.screenWidth / 2, y: viewManager.screenHeight / 2 - 50,
          text: phaseNames[threshold]!, color: threshold === 25 ? 0xff2244 : threshold === 50 ? 0xff8844 : 0xffaa44,
          life: 1.5, maxLife: 1.5, vy: -25, scale: 2,
        });
        // At 25%, enrage
        if (threshold === 25) this._enraged = true;
        break; // only trigger one per frame
      }
    }

    // Multiplier: builds with combo (1x at 0, 2x at 15, 3x at 30, 4x at 50)
    this._multiplier = this._combo >= 50 ? 4 : this._combo >= 30 ? 3 : this._combo >= 15 ? 2 : 1;

    // Combo fire visual
    this._comboFire += (Math.min(1, this._combo / 30) - this._comboFire) * dt * 3;

    // Boss ability timer
    this._abilityTimer += dt;
    if (this._abilityTimer >= this._enemy.abilityInterval && this._abilityActive <= 0) {
      this._abilityTimer = 0;
      this._abilityType = this._enemy.ability;
      this._abilityActive = this._enemy.ability === "fire_lanes" ? 4 : this._enemy.ability === "darkness" ? 3 : 2.5;
      // Apply ability
      if (this._abilityType === "speed_up") {
        this._noteSpeed *= 1.5;
      } else if (this._abilityType === "reverse") {
        this._laneReversed = true;
      } else if (this._abilityType === "fire_lanes") {
        const l1 = Math.floor(Math.random() * LANES);
        let l2 = (l1 + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
        this._fireLanes = [false, false, false, false];
        this._fireLanes[l1] = true; this._fireLanes[l2] = true;
      }
      const sw = viewManager.screenWidth;
      const abilityNames: Record<BossAbility, string> = {
        speed_up: "\u26A1 TEMPO UP!", reverse: "\u{1F500} REVERSE!", blind: "\u{1F441} BLIND!",
        fire_lanes: "\u{1F525} FIRE LANES!", darkness: "\u{1F311} DARKNESS!",
      };
      this._floatingTexts.push({ x: sw / 2, y: sh / 2 - 60, text: abilityNames[this._abilityType], color: this._enemy.color, life: 1.5, maxLife: 1.5, vy: -30, scale: 1.5 });
      this._screenShake = 0.3;
    }
    // Ability active countdown
    if (this._abilityActive > 0) {
      this._abilityActive -= dt;
      // Fire lane damage
      if (this._abilityType === "fire_lanes") {
        for (let i = 0; i < LANES; i++) {
          if (this._fireLanes[i] && this._lanePressed[i]) {
            this._health = Math.max(0, this._health - dt * 15);
          }
        }
      }
      if (this._abilityActive <= 0) {
        // Revert ability
        if (this._abilityType === "speed_up") this._noteSpeed = NOTE_SPEED_BASE + this._enemyIdx * 30;
        if (this._abilityType === "reverse") this._laneReversed = false;
        if (this._abilityType === "fire_lanes") this._fireLanes = [false, false, false, false];
        this._abilityType = null;
      }
    }

    // Enemy attacks — frequency modulated by song section
    const atkInterval = this._enemy.attackInterval / Math.max(0.1, this._currentSection.attackMult);
    this._attackTimer += dt;
    if (this._attackTimer >= atkInterval && this._currentSection.attackMult > 0) {
      this._attackTimer -= atkInterval;
      const lane = Math.floor(Math.random() * LANES);
      this._attacks.push({ lane, y: SPAWN_Y, speed: this._noteSpeed * 0.7, warned: false });
      this._audio.playDanger();
    }

    // Move notes
    for (const n of this._notes) {
      if (n.hit && n.holdLen > 0 && n.holding) {
        // Hold note: accumulate hold progress
        n.holdHeld = Math.min(n.holdLen, n.holdHeld + this._noteSpeed * dt);
        // Continuous damage from holding
        if (Math.random() < dt * 8) {
          this._enemy.hp = Math.max(0, this._enemy.hp - 2);
          this._score += 15;
          this._mana = Math.min(this._maxMana, this._mana + 0.5);
        }
      }
      if (!n.hit && !n.missed) n.y += this._noteSpeed * dt * timeScale;
      if (!n.hit && !n.missed && n.y > HIT_Y + GOOD_WINDOW + 20) {
        n.missed = true;
        this._missShatter[n.lane] = 1;
        this._onMiss();
      }
    }
    // Hold note completion burst — check before cleanup
    const _sw4 = viewManager.screenWidth;
    const _hx4 = _sw4 / 2 - HIGHWAY_W / 2;
    for (const n of this._notes) {
      if (n.hit && n.holdLen > 0 && n.holdHeld >= n.holdLen && n.holding) {
        // Completion burst!
        n.holding = false; // mark done
        const burstDmg = 25 + this._dmgBonus * 2;
        this._enemy.hp = Math.max(0, this._enemy.hp - burstDmg);
        this._score += 500 * this._multiplier;
        this._mana = Math.min(this._maxMana, this._mana + 8);
        this._combo += 3;
        if (this._combo > this._maxCombo) this._maxCombo = this._combo;
        this._audio.playHit(n.lane, true);
        // Big visual: ripple + floating text + particles
        const lx3 = _hx4 + n.lane * (LANE_W + LANE_GAP);
        this._ripples.push({
          x: lx3 + LANE_W / 2, y: HIT_Y, radius: 8, maxRadius: 70,
          life: 0.5, maxLife: 0.5, color: LANE_COLORS[n.lane],
        });
        this._ripples.push({
          x: lx3 + LANE_W / 2, y: HIT_Y, radius: 4, maxRadius: 45,
          life: 0.35, maxLife: 0.35, color: COL_GOLD,
        });
        this._floatingTexts.push({
          x: lx3 + LANE_W / 2, y: HIT_Y - 30,
          text: `HOLD COMPLETE! -${burstDmg}`,
          color: COL_GOLD, life: 1, maxLife: 1, vy: -60, scale: 1.3,
        });
        this._screenShake = 0.2;
        // Burst particles
        for (let pi = 0; pi < 10; pi++) {
          const a = (pi / 10) * Math.PI * 2;
          this._particles.push({
            x: lx3 + LANE_W / 2, y: HIT_Y,
            vx: Math.cos(a) * (80 + Math.random() * 60),
            vy: Math.sin(a) * (80 + Math.random() * 60) - 40,
            life: 0.5, maxLife: 0.5, color: LANE_COLORS[n.lane],
            size: 3, grav: 150,
          });
        }
      }
    }
    // Clean finished hold notes and old notes
    this._notes = this._notes.filter(n => {
      if (n.hit && n.holdLen > 0) return n.holdHeld < n.holdLen;
      if (n.missed) return n.y < HIT_Y + 100;
      return n.y < 700;
    });

    // Move enemy attacks
    for (const a of this._attacks) {
      a.y += a.speed * dt * timeScale;
    }
    // Dodge & cooldown timers
    if (this._dodgeTimer > 0) this._dodgeTimer -= dt;
    if (this._dodgeCooldown > 0) this._dodgeCooldown -= dt;

    // Check if enemy attacks hit the player
    for (const a of this._attacks) {
      if (a.y >= HIT_Y - 15 && a.y <= HIT_Y + 15) {
        if (this._lanePressed[a.lane]) {
          // Dodge active — immune
          if (this._dodgeTimer > 0) {
            this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: HIT_Y - 40, text: "DODGED!", color: 0x88ccff, life: 0.5, maxLife: 0.5, vy: -40, scale: 1 });
            a.y = 9999;
            continue;
          }
          // Shield absorb
          if (this._shield > 0) {
            this._shield--;
            this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: HIT_Y - 40, text: "\u{1F6E1} BLOCKED", color: 0x4488ff, life: 0.7, maxLife: 0.7, vy: -50, scale: 1 });
          } else {
            this._health = Math.max(0, this._health - this._enemy.attackDmg);
            this._screenShake = 0.4;
            this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: HIT_Y - 40, text: `OUCH! -${this._enemy.attackDmg}`, color: 0xff4444, life: 0.7, maxLife: 0.7, vy: -50, scale: 1 });
          }
          a.y = 9999; // remove
        }
      }
    }
    this._attacks = this._attacks.filter(a => a.y < 700);

    this._updateDecay(dt);

    // Song section transition flash decay
    if (this._sectionTransition > 0) this._sectionTransition -= dt * 2;

    // Fever mode countdown
    if (this._feverActive) {
      this._feverTimer -= dt;
      this._feverFlash += dt * 6;
      if (this._feverTimer <= 0) {
        this._feverActive = false;
        this._feverMeter = 0;
      }
    }

    // Hold note sustain
    for (const [note, handle] of this._holdSustains) {
      if (!note.holding || note.holdHeld >= note.holdLen) {
        handle.stop();
        this._holdSustains.delete(note);
      }
    }

    // Ripple rings
    for (const r of this._ripples) { r.radius += (r.maxRadius / r.maxLife) * dt * 1.5; r.life -= dt; }
    this._ripples = this._ripples.filter(r => r.life > 0);

    // Lane sparkles — ambient particles drifting up inside lanes
    if (Math.random() < dt * 4) {
      const lane = Math.floor(Math.random() * LANES);
      const sw2 = viewManager.screenWidth;
      const hx2 = sw2 / 2 - HIGHWAY_W / 2;
      const lx2 = hx2 + lane * (LANE_W + LANE_GAP);
      this._laneSparkles.push({
        lane, x: lx2 + 8 + Math.random() * (LANE_W - 16),
        y: HIT_Y + 10 + Math.random() * 30,
        vy: -20 - Math.random() * 40, life: 2, maxLife: 2,
        size: 0.5 + Math.random() * 1.5,
      });
    }
    for (const sp of this._laneSparkles) {
      sp.y += sp.vy * dt;
      sp.x += Math.sin(this._time * 3 + sp.x * 0.1) * 0.3;
      sp.life -= dt;
    }
    this._laneSparkles = this._laneSparkles.filter(sp => sp.life > 0);

    // Miss shatter decay
    for (let i = 0; i < LANES; i++) {
      if (this._missShatter[i] > 0) this._missShatter[i] = Math.max(0, this._missShatter[i] - dt * 4);
    }

    // Victory confetti update
    for (const c of this._confetti) {
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vy += 80 * dt; // gentle gravity
      c.rot += c.rotV * dt;
      c.life -= dt;
    }
    this._confetti = this._confetti.filter(c => c.life > 0);

    // Floating musical notes
    this._musicNoteTimer += dt;
    if (this._musicNoteTimer > 0.8) {
      this._musicNoteTimer = 0;
      const sw = viewManager.screenWidth;
      const symbols = ["\u266A", "\u266B", "\u266C", "\u2669"];
      this._musicNotes.push({
        x: Math.random() * sw, y: viewManager.screenHeight + 10,
        vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        life: 6, maxLife: 6,
        color: LANE_COLORS[Math.floor(Math.random() * LANES)],
        size: 10 + Math.random() * 8,
      });
    }
    for (const mn of this._musicNotes) {
      mn.x += mn.vx * dt + Math.sin(this._time + mn.x * 0.01) * 0.5;
      mn.y += mn.vy * dt;
      mn.life -= dt;
    }
    this._musicNotes = this._musicNotes.filter(mn => mn.life > 0);

    // Perfect streak flame
    const targetFlame = Math.min(1, this._perfectStreak / 20);
    this._streakFlame += (targetFlame - this._streakFlame) * dt * 4;
    if (this._perfectStreak === 0) this._streakFlame *= (1 - dt * 6);

    // Boss enrage at 25% HP
    if (!this._enraged && this._enemy.hp < this._enemy.maxHp * 0.25 && this._enemy.hp > 0) {
      this._enraged = true;
      this._screenShake = 0.6;
      const sw = viewManager.screenWidth;
      this._floatingTexts.push({ x: sw / 2, y: 80, text: `${this._enemy.name} ENRAGES!`, color: 0xff2222, life: 2, maxLife: 2, vy: -20, scale: 1.4 });
    }

    // Attack warning flash — when attack is halfway down the screen
    for (const a of this._attacks) {
      if (!a.warned && a.y > HIT_Y * 0.4) {
        a.warned = true;
        this._laneFlash[a.lane] = Math.max(this._laneFlash[a.lane], 0.4);
      }
    }

    // High score tracking
    if (this._score > this._highScore) {
      this._highScore = this._score;
      this._isNewHighScore = true;
    }

    // Crit flash decay
    if (this._critFlash > 0) this._critFlash = Math.max(0, this._critFlash - dt * 4);

    // Score milestone rewards
    if (this._score >= this._nextMilestone) {
      this._nextMilestone += 5000;
      this._mana = Math.min(this._maxMana, this._mana + 15);
      this._health = Math.min(this._maxHealth, this._health + 8);
      const sw3 = viewManager.screenWidth;
      this._floatingTexts.push({ x: sw3 / 2, y: 250, text: `\u2726 MILESTONE! +15 Mana +8 HP \u2726`, color: 0x88ccff, life: 1.5, maxLife: 1.5, vy: -30, scale: 1.1 });
    }

    // Chain timing decay (chain resets if no hit within 0.5s)
    if (this._time - this._lastHitTime > 0.5 && this._chainCount > 0) {
      this._chainCount = 0;
    }

    // Enemy fights back harder at high combo (more frequent attacks)
    if (this._combo >= 20 && this._attackTimer > 0) {
      this._attackTimer += dt * 0.3; // speeds up attack timer by 30%
    }

    // Danger pulse when low HP
    if (this._health < 30 * this._diffMods.hpMult) {
      this._dangerPulse += dt * 4;
    } else {
      this._dangerPulse = 0;
    }

    // Boss taunts
    this._tauntTimer += dt;
    if (this._tauntTimer > 8 + Math.random() * 4) {
      this._tauntTimer = 0;
      const taunts = BOSS_TAUNTS[this._enemyIdx] ?? [];
      if (taunts.length > 0) {
        this._currentTaunt = taunts[Math.floor(Math.random() * taunts.length)];
        this._tauntLife = 3;
      }
    }
    if (this._tauntLife > 0) this._tauntLife -= dt;

    // Check defeat — with revival option
    if (this._health <= 0) {
      this._health = 0;
      if (!this._hasRevived && this._mana >= 50) {
        // Auto-revive: spend 50 mana, restore 30% HP
        this._hasRevived = true;
        this._mana -= 50;
        this._health = Math.floor(this._maxHealth * 0.3);
        this._screenShake = 0.8;
        this._spellGlow = 1.5; this._spellGlowColor = 0x44ff88;
        this._audio.playFever();
        const sw4 = viewManager.screenWidth;
        this._floatingTexts.push({ x: sw4 / 2, y: viewManager.screenHeight / 2 - 40, text: "\u2726 SECOND WIND! \u2726", color: 0x44ff88, life: 2, maxLife: 2, vy: -25, scale: 1.6 });
        for (let i = 0; i < 30; i++) {
          this._particles.push({
            x: sw4 / 2 + (Math.random() - 0.5) * 200, y: viewManager.screenHeight / 2,
            vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 250,
            life: 1, maxLife: 1, color: 0x44ff88, size: 2 + Math.random() * 2, grav: 100,
          });
        }
      } else {
        this._phase = "defeat";
      }
    }

    // Check enemy defeated
    if (this._enemy.hp <= 0) {
      this._enemy.hp = 0;
      this._phase = "transition";
      this._transitionTimer = 2.5;
      this._screenShake = 1.5;
      this._audio.stopBg();
      this._audio.playDefeat();
      const sw = viewManager.screenWidth;
      for (let i = 0; i < 60; i++) {
        this._particles.push({
          x: sw / 2 + (Math.random() - 0.5) * 100, y: 120 + Math.random() * 40,
          vx: (Math.random() - 0.5) * 500, vy: -Math.random() * 350 - 100,
          life: 1.8, maxLife: 1.8, color: this._enemy.color,
          size: 2 + Math.random() * 4, grav: 150,
        });
      }
    }
  }

  /** Get the current pattern — uses phase patterns at HP thresholds */
  private _getPattern(): number[] {
    const hpPct = this._enemy.hp / this._enemy.maxHp;
    const eidx = this._enemyIdx;

    // Phase selection: normal patterns, then phase patterns at 50% and 25%
    let patterns: number[][];
    if (hpPct < 0.25) {
      // Rage phase — use second phase pattern set
      const pIdx = eidx * 2 + 1;
      patterns = PHASE_PATTERNS[pIdx] ?? this._enemy.patterns;
    } else if (hpPct < 0.5) {
      // Phase 2 — use first phase pattern set
      const pIdx = eidx * 2;
      patterns = PHASE_PATTERNS[pIdx] ?? this._enemy.patterns;
    } else {
      patterns = this._enemy.patterns;
    }

    const base = patterns[this._beatIdx % patterns.length];

    // Rage mode additions below 30%
    if (hpPct < 0.3 && Math.random() < 0.3) {
      const extra = Math.floor(Math.random() * LANES);
      if (!base.includes(extra)) return [...base, extra];
    }
    return base;
  }

  private _updateDecay(dt: number): void {
    for (const p of this._particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.life -= dt;
    }
    this._particles = this._particles.filter(p => p.life > 0);

    for (const ft of this._floatingTexts) { ft.y += ft.vy * dt; ft.life -= dt; }
    this._floatingTexts = this._floatingTexts.filter(ft => ft.life > 0);

    for (let i = 0; i < LANES; i++) {
      if (this._laneFlash[i] > 0) this._laneFlash[i] = Math.max(0, this._laneFlash[i] - dt * 5);
    }
    if (this._screenShake > 0) this._screenShake = Math.max(0, this._screenShake - dt * 6);
    if (this._spellGlow > 0) this._spellGlow = Math.max(0, this._spellGlow - dt * 2.5);
    if (this._beatPulse > 0) this._beatPulse = Math.max(0, this._beatPulse - dt * 4);
    if (this._enemyHitFlash > 0) this._enemyHitFlash = Math.max(0, this._enemyHitFlash - dt * 5);
  }

  // ── INPUT HANDLING ──────────────────────────────────────────────────────

  private _onLaneHit(lane: number): void {
    // If lanes are reversed, remap input
    const effectiveLane = this._laneReversed ? (LANES - 1 - lane) : lane;

    let closest: Note | null = null;
    let closestDist = Infinity;
    for (const n of this._notes) {
      if (n.lane !== effectiveLane || n.hit || n.missed) continue;
      const dist = Math.abs(n.y - HIT_Y);
      if (dist < closestDist && dist < GOOD_WINDOW + 20) { closest = n; closestDist = dist; }
    }

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const hx = sw / 2 - HIGHWAY_W / 2;
    const lx = hx + effectiveLane * (LANE_W + LANE_GAP) + LANE_W / 2;

    // Resonance upgrade: expand window for near-misses
    const hitWindow = this._hasResonance ? GOOD_WINDOW + 25 : GOOD_WINDOW;
    if (closest && closestDist <= hitWindow) {
      closest.hit = true;
      this._laneFlash[effectiveLane] = 1;

      if (closest.holdLen > 0) {
        closest.holding = true;
        const sustain = this._audio.startHoldSustain(effectiveLane);
        if (sustain) this._holdSustains.set(closest, sustain);
      }

      const isPerfect = closestDist <= PERFECT_WINDOW;
      const feverBonus = this._feverActive ? 2 : 1;
      const isGolden = closest.type === "golden";
      const isPoison = closest.type === "poison";

      // Poison trap — drains mana, hurts, no combo benefit
      if (isPoison) {
        this._mana = Math.max(0, this._mana - 20);
        this._health = Math.max(0, this._health - 3);
        this._audio.playMiss();
        this._screenShake = 0.2;
        this._floatingTexts.push({ x: lx, y: HIT_Y - 30, text: "\u2620 POISON! -20 Mana", color: 0xaa44ff, life: 0.8, maxLife: 0.8, vy: -50, scale: 1.1 });
        for (let i = 0; i < 8; i++) {
          this._particles.push({ x: lx, y: HIT_Y, vx: (Math.random() - 0.5) * 150, vy: -Math.random() * 100 - 20, life: 0.4, maxLife: 0.4, color: 0xaa44ff, size: 1.5 + Math.random(), grav: 150 });
        }
        return;
      }

      this._combo++;
      if (this._combo > this._maxCombo) this._maxCombo = this._combo;

      // Chain timing
      const timeSinceHit = this._time - this._lastHitTime;
      this._lastHitTime = this._time;
      if (timeSinceHit < 0.3) this._chainCount++; else this._chainCount = 1;
      const chainMult = this._chainCount >= 4 ? 1.4 : this._chainCount >= 2 ? 1.15 : 1;

      // Critical hit (5% chance)
      const isCrit = Math.random() < 0.05;
      const critMult = isCrit ? 3 : 1;
      if (isCrit) {
        this._critFlash = 1;
        this._screenShake = Math.max(this._screenShake, 0.3);
        this._floatingTexts.push({ x: lx, y: HIT_Y - 55, text: "\u26A1 CRIT!", color: 0xff4488, life: 0.8, maxLife: 0.8, vy: -70, scale: 1.5 });
      }

      this._audio.playHit(effectiveLane, isPerfect);

      const baseDmgBonus = this._dmgBonus;
      let dmg: number;
      if (isPerfect) {
        this._perfects++;
        this._perfectStreak++;
        dmg = Math.floor((12 + baseDmgBonus + this._combo * 0.8) * this._multiplier * feverBonus * chainMult * critMult * this._diffMods.scoreMult);
        this._score += Math.floor((300 + this._combo * 10) * this._multiplier * feverBonus * chainMult * this._diffMods.scoreMult);
        // Build fever meter
        this._feverMeter = Math.min(100, this._feverMeter + 4);
        if (this._feverMeter >= 100 && !this._feverActive) {
          this._feverActive = true;
          this._feverTimer = 8;
          this._feverFlash = 0;
          this._audio.playFever();
          this._screenShake = 0.5;
          this._spellGlow = 1.5; this._spellGlowColor = COL_GOLD;
          this._floatingTexts.push({ x: sw / 2, y: sh / 2 - 80, text: "\u2726 F E V E R   M O D E \u2726", color: COL_GOLD, life: 2, maxLife: 2, vy: -25, scale: 1.8 });
          for (let i = 0; i < 40; i++) {
            this._particles.push({
              x: sw / 2 + (Math.random() - 0.5) * 300, y: sh / 2,
              vx: (Math.random() - 0.5) * 400, vy: -Math.random() * 300,
              life: 1.2, maxLife: 1.2, color: COL_GOLD, size: 2 + Math.random() * 3, grav: 80,
            });
          }
        }
        this._mana = Math.min(this._maxMana, this._mana + 4);
        this._floatingTexts.push({ x: lx, y: HIT_Y - 30, text: this._multiplier > 1 ? `PERFECT x${this._multiplier}` : "PERFECT", color: COL_GOLD, life: 0.8, maxLife: 0.8, vy: -60, scale: 1.2 });
        if (this._perfectStreak >= 5 && this._perfectStreak % 5 === 0) {
          const heal = 5;
          this._health = Math.min(this._maxHealth, this._health + heal);
          this._floatingTexts.push({ x: lx, y: HIT_Y - 55, text: `+${heal} HP`, color: 0x44ff88, life: 0.6, maxLife: 0.6, vy: -40, scale: 0.9 });
        }
      } else {
        this._goods++;
        this._perfectStreak = 0;
        dmg = Math.floor((8 + baseDmgBonus + this._combo * 0.4) * this._multiplier * feverBonus * chainMult * critMult * this._diffMods.scoreMult);
        this._score += Math.floor((100 + this._combo * 5) * this._multiplier * feverBonus * chainMult * this._diffMods.scoreMult);
        this._feverMeter = Math.min(100, this._feverMeter + 1);
        this._mana = Math.min(this._maxMana, this._mana + 2);
        this._floatingTexts.push({ x: lx, y: HIT_Y - 30, text: this._multiplier > 1 ? `GOOD x${this._multiplier}` : "GOOD", color: 0x44ff88, life: 0.6, maxLife: 0.6, vy: -50, scale: 1 });
      }

      // Golden note bonus: big mana + heal + bonus score
      if (isGolden) {
        this._mana = Math.min(this._maxMana, this._mana + 20);
        this._health = Math.min(this._maxHealth, this._health + 10);
        this._score += 500;
        this._audio.playPowerUp();
        this._floatingTexts.push({ x: lx, y: HIT_Y - 60, text: "\u2726 GOLDEN! +20 Mana +10 HP \u2726", color: COL_GOLD, life: 1, maxLife: 1, vy: -50, scale: 1.1 });
        for (let i = 0; i < 15; i++) {
          this._particles.push({
            x: lx, y: HIT_Y, vx: (Math.random() - 0.5) * 250, vy: -Math.random() * 200 - 50,
            life: 0.7, maxLife: 0.7, color: COL_GOLD, size: 2 + Math.random() * 2, grav: 100,
          });
        }
      }

      this._enemy.hp = Math.max(0, this._enemy.hp - dmg);
      this._enemyHitFlash = 0.6;

      // Life steal
      if (this._lifeStealPct > 0 && dmg > 0) {
        const steal = Math.max(1, Math.floor(dmg * this._lifeStealPct));
        this._health = Math.min(this._maxHealth, this._health + steal);
      }

      // Combo milestones
      if (this._combo >= 10 && this._combo % 10 === 0 && this._combo > this._comboMilestone) {
        this._comboMilestone = this._combo;
        const spellDmg = (25 + this._combo * 2) * this._multiplier;
        this._enemy.hp = Math.max(0, this._enemy.hp - spellDmg);
        this._spellGlow = 1;
        this._spellGlowColor = 0xcc88ff;
        this._screenShake = 0.4;
        this._audio.playCombo(this._combo);
        this._floatingTexts.push({ x: sw / 2, y: 100, text: `\u2726 SPELL BURST x${this._combo} \u2726  -${spellDmg}`, color: 0xcc88ff, life: 1.2, maxLife: 1.2, vy: -35, scale: 1.3 });
        for (let i = 0; i < 30; i++) {
          this._particles.push({
            x: lx, y: HIT_Y,
            vx: (Math.random() - 0.5) * 350, vy: -Math.random() * 280 - 60,
            life: 0.9, maxLife: 0.9, color: LANE_COLORS[effectiveLane],
            size: 2 + Math.random() * 2.5, grav: 120,
          });
        }
      }

      // Hit ripple ring (double ring for perfects)
      this._ripples.push({
        x: lx, y: HIT_Y, radius: 5, maxRadius: isPerfect ? 55 : 35,
        life: 0.35, maxLife: 0.35, color: isPerfect ? COL_GOLD : LANE_COLORS[effectiveLane],
      });
      if (isPerfect) {
        this._ripples.push({
          x: lx, y: HIT_Y, radius: 3, maxRadius: 35,
          life: 0.25, maxLife: 0.25, color: 0xffffff,
        });
      }
      if (isCrit) {
        // Crit gets a huge ripple
        this._ripples.push({
          x: lx, y: HIT_Y, radius: 10, maxRadius: 80,
          life: 0.5, maxLife: 0.5, color: 0xff4488,
        });
      }

      // Hit sparkles
      for (let i = 0; i < (isPerfect ? 10 : 5); i++) {
        this._particles.push({
          x: lx, y: HIT_Y,
          vx: (Math.random() - 0.5) * 180, vy: -Math.random() * 130 - 30,
          life: 0.45, maxLife: 0.45, color: isPerfect ? COL_GOLD : LANE_COLORS[effectiveLane],
          size: isPerfect ? 2 + Math.random() * 1.5 : 1.5 + Math.random(), grav: 200,
        });
      }
    } else {
      this._laneFlash[effectiveLane] = 0.3;
    }
  }

  private _onMiss(): void {
    this._misses++;
    this._combo = 0;
    this._comboMilestone = 0;
    this._perfectStreak = 0;
    this._comboFire = 0; this._chainCount = 0;
    if (!this._feverActive) this._feverMeter = Math.max(0, this._feverMeter - 10);
    this._health = Math.max(0, this._health - this._diffMods.missDmg);
    this._screenShake = 0.15;
    this._audio.playMiss();
    const sw = viewManager.screenWidth;
    this._floatingTexts.push({ x: sw / 2, y: HIT_Y - 20, text: "MISS", color: 0xff4444, life: 0.5, maxLife: 0.5, vy: -40, scale: 1 });
  }

  private _castSpell(idx: number): void {
    const spell = SPELLS[idx];
    const cost = this._hasArcaneFocus ? Math.floor(spell.manaCost * 0.7) : spell.manaCost;
    if (this._mana < cost) {
      this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: 200, text: "NOT ENOUGH MANA", color: 0xff4444, life: 0.6, maxLife: 0.6, vy: -30, scale: 0.9 });
      return;
    }
    this._mana -= cost;
    this._spellGlow = 1.2;
    this._spellGlowColor = spell.color;
    this._screenShake = 0.3;
    this._audio.playSpell(spell.color);

    if (spell.name === "HEAL") {
      const heal = 25;
      this._health = Math.min(this._maxHealth, this._health + heal);
      this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: 200, text: `\u2726 HEAL +${heal} HP \u2726`, color: spell.color, life: 1, maxLife: 1, vy: -40, scale: 1.2 });
    } else if (spell.name === "SMITE") {
      const dmg = 80;
      this._enemy.hp = Math.max(0, this._enemy.hp - dmg);
      this._enemyHitFlash = 1;
      this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: 100, text: `\u2726 SMITE -${dmg} \u2726`, color: spell.color, life: 1, maxLife: 1, vy: -40, scale: 1.3 });
      for (let i = 0; i < 40; i++) {
        this._particles.push({
          x: viewManager.screenWidth / 2 + (Math.random() - 0.5) * 60, y: 120,
          vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 200,
          life: 0.8, maxLife: 0.8, color: spell.color,
          size: 2 + Math.random() * 3, grav: 150,
        });
      }
    } else if (spell.name === "SHIELD") {
      this._shield = 3;
      this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: 200, text: "\u{1F6E1} SHIELD x3", color: spell.color, life: 1, maxLife: 1, vy: -40, scale: 1.1 });
    } else if (spell.name === "SLOW") {
      this._timeSlowTimer = 4;
      this._floatingTexts.push({ x: viewManager.screenWidth / 2, y: 200, text: "\u231B TIME SLOW 4s", color: spell.color, life: 1, maxLife: 1, vy: -40, scale: 1.1 });
    }
    this._score += 200;
  }

  private _togglePause(): void { this._isPaused = !this._isPaused; }

  // ── DRAW ──────────────────────────────────────────────────────────────────

  private _draw(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const hx = sw / 2 - HIGHWAY_W / 2;

    // Screen shake
    const shakeX = this._screenShake > 0 ? (Math.random() - 0.5) * this._screenShake * 10 : 0;
    const shakeY = this._screenShake > 0 ? (Math.random() - 0.5) * this._screenShake * 10 : 0;
    this._root.position.set(shakeX, shakeY);

    // ── Background ──
    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: COL_BG });

    // Ambient diagonal light rays (subtle, slowly moving)
    for (let r = 0; r < 3; r++) {
      const rayX = ((this._time * 8 + r * sw / 3) % (sw * 1.4)) - sw * 0.2;
      const rayW = 30 + r * 15;
      this._bg.moveTo(rayX, 0).lineTo(rayX + rayW, 0).lineTo(rayX + rayW - sh * 0.2, sh).lineTo(rayX - sh * 0.2, sh).closePath()
        .fill({ color: 0xffffff, alpha: 0.006 });
    }

    // Starfield — twinkling background stars
    for (const star of this._stars) {
      const twinkle = star.brightness * (0.5 + 0.5 * Math.sin(this._time * star.twinkleSpeed + star.x));
      this._bg.circle(star.x, star.y, star.size).fill({ color: 0xccccff, alpha: twinkle * 0.07 });
      if (star.size > 1.2) {
        // Cross sparkle on brighter stars
        this._bg.moveTo(star.x - star.size * 1.5, star.y).lineTo(star.x + star.size * 1.5, star.y)
          .stroke({ color: 0xddddff, width: 0.3, alpha: twinkle * 0.04 });
        this._bg.moveTo(star.x, star.y - star.size * 1.5).lineTo(star.x, star.y + star.size * 1.5)
          .stroke({ color: 0xddddff, width: 0.3, alpha: twinkle * 0.04 });
      }
    }

    // Subtle gradient overlay — darker at top, slightly lighter at bottom
    for (let i = 0; i < 6; i++) {
      const bandH = sh / 6;
      this._bg.rect(0, i * bandH, sw, bandH).fill({ color: 0x0a0816, alpha: 0.4 - i * 0.05 });
    }

    // Vignette — radial darkening at edges
    const vigW = sw * 0.2;
    this._bg.rect(0, 0, vigW, sh).fill({ color: 0x000000, alpha: 0.25 });
    this._bg.rect(sw - vigW, 0, vigW, sh).fill({ color: 0x000000, alpha: 0.25 });
    this._bg.rect(0, 0, sw, sh * 0.08).fill({ color: 0x000000, alpha: 0.2 });
    this._bg.rect(0, sh * 0.92, sw, sh * 0.08).fill({ color: 0x000000, alpha: 0.15 });

    // Beat pulse flash
    if (this._beatPulse > 0) {
      this._bg.rect(0, 0, sw, sh).fill({ color: this._enemy?.color ?? COL_BORDER, alpha: this._beatPulse * 0.03 });
      // Horizontal beat lines radiating from center
      const bpA = this._beatPulse * 0.08;
      this._bg.moveTo(0, sh * 0.5).lineTo(sw, sh * 0.5).stroke({ color: this._enemy?.color ?? COL_BORDER, width: 1, alpha: bpA });
      this._bg.moveTo(0, sh * 0.5 - 2).lineTo(sw, sh * 0.5 - 2).stroke({ color: this._enemy?.color ?? COL_BORDER, width: 0.5, alpha: bpA * 0.5 });
    }

    // Danger vignette
    if (this._dangerPulse > 0) {
      const dAlpha = 0.08 + 0.05 * Math.sin(this._dangerPulse);
      this._bg.rect(0, 0, sw, 50).fill({ color: 0xff0000, alpha: dAlpha });
      this._bg.rect(0, sh - 50, sw, 50).fill({ color: 0xff0000, alpha: dAlpha * 0.8 });
      this._bg.rect(0, 0, 30, sh).fill({ color: 0xff0000, alpha: dAlpha * 0.5 });
      this._bg.rect(sw - 30, 0, 30, sh).fill({ color: 0xff0000, alpha: dAlpha * 0.5 });
    }

    // Combo fire on sides of highway — polygon flame tongues
    if (this._comboFire > 0.1) {
      const fireH = sh * this._comboFire * 0.8;
      const fireAlpha = this._comboFire * 0.18;
      const flameCols = [0xff2200, 0xff6600, 0xffaa00, 0xffcc44];
      for (let side = 0; side < 2; side++) {
        const baseX = side === 0 ? hx - 4 : hx + HIGHWAY_W + 2;
        const dir = side === 0 ? -1 : 1;
        for (let i = 0; i < 5; i++) {
          const fx = baseX + dir * (i * 4);
          const fh = fireH * (1 - i * 0.15);
          for (let j = 0; j < 3; j++) {
            const flicker = Math.sin(this._time * (9 + j * 2.3) + i * 1.7 + side) * (6 + j * 3);
            const tongueH = fh * (0.25 + 0.2 * j);
            const ty = HIT_Y - tongueH + flicker;
            const tw = 3 + i * 0.5;
            const fa = fireAlpha * (1 - i * 0.15) * (1 - j * 0.2);
            // Polygon flame tongue (tapered)
            this._bg.moveTo(fx - tw, HIT_Y)
              .lineTo(fx - tw * 0.6 + dir * 2, ty + tongueH * 0.4)
              .lineTo(fx + dir * 1, ty) // tip
              .lineTo(fx + tw * 0.4 - dir * 1, ty + tongueH * 0.3)
              .lineTo(fx + tw, HIT_Y).closePath()
              .fill({ color: flameCols[Math.min(i, 3)], alpha: fa });
          }
        }
        // Ember sparks rising from fire (small diamonds)
        if (this._comboFire > 0.3) {
          for (let sp = 0; sp < 3; sp++) {
            const spx = baseX + dir * (sp * 6) + Math.sin(this._time * 5 + sp * 2) * 3;
            const spy = HIT_Y - fireH * 0.5 - ((this._time * 60 + sp * 40) % (fireH * 0.6));
            const spa = 0.12 * this._comboFire * Math.max(0, 1 - spy / (HIT_Y - fireH));
            if (spa > 0.01) {
              this._bg.moveTo(spx, spy - 2).lineTo(spx + 1.5, spy).lineTo(spx, spy + 2).lineTo(spx - 1.5, spy).closePath()
                .fill({ color: 0xffcc44, alpha: spa });
            }
          }
        }
      }
    }

    // Darkness ability overlay with polygon shadow tendrils
    if (this._abilityType === "darkness" && this._abilityActive > 0) {
      this._bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });
      // Jagged shadow polygon tendrils from edges
      for (let side = 0; side < 2; side++) {
        const bx2 = side === 0 ? 0 : sw;
        const dir2 = side === 0 ? 1 : -1;
        for (let t2 = 0; t2 < 4; t2++) {
          const ty = sh * 0.1 + t2 * sh * 0.25 + Math.sin(this._time * 1.5 + t2) * 20;
          const reach = 40 + Math.sin(this._time * 2 + t2 * 1.8) * 20;
          this._bg.moveTo(bx2, ty - 15).lineTo(bx2 + dir2 * reach * 0.5, ty - 8)
            .lineTo(bx2 + dir2 * reach, ty).lineTo(bx2 + dir2 * reach * 0.6, ty + 6)
            .lineTo(bx2 + dir2 * reach * 0.8, ty + 12).lineTo(bx2, ty + 18).closePath()
            .fill({ color: 0x000000, alpha: 0.12 });
        }
      }
      // Floating dark diamonds
      for (let i = 0; i < 5; i++) {
        const sx = ((this._time * 30 + i * sw / 5) % (sw + 80)) - 40;
        const sy = sh * 0.3 + Math.sin(this._time * 0.8 + i * 2) * sh * 0.2;
        const sz = 6 + Math.sin(this._time * 2 + i) * 2;
        this._bg.moveTo(sx, sy - sz).lineTo(sx + sz, sy).lineTo(sx, sy + sz).lineTo(sx - sz, sy).closePath()
          .fill({ color: 0x110022, alpha: 0.08 });
      }
    }

    // Fever mode golden glow with polygon starburst
    if (this._feverActive) {
      const feverAlpha = 0.04 + 0.025 * Math.sin(this._feverFlash);
      this._bg.rect(0, 0, sw, sh).fill({ color: COL_GOLD, alpha: feverAlpha });
      // Golden light rays from top center (polygon triangles)
      for (let i = 0; i < 7; i++) {
        const rayAngle = -0.4 + i * 0.13 + Math.sin(this._feverFlash * 0.5 + i) * 0.05;
        const rayW = 25 + i * 8;
        const rayX = sw / 2 + Math.tan(rayAngle) * sh;
        this._bg.moveTo(sw / 2, 0).lineTo(rayX - rayW, sh).lineTo(rayX + rayW, sh).closePath()
          .fill({ color: COL_GOLD, alpha: 0.008 + 0.004 * Math.sin(this._feverFlash * 2 + i) });
      }
      // Polygon starburst at top center
      const sbx = sw / 2, sby = 8;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + this._feverFlash * 0.3;
        const r1 = 12, r2 = 28 + Math.sin(this._feverFlash * 3 + i) * 6;
        const a2 = a + Math.PI / 8;
        this._bg.moveTo(sbx, sby)
          .lineTo(sbx + Math.cos(a) * r2, sby + Math.sin(a) * r2 * 0.5)
          .lineTo(sbx + Math.cos(a2) * r1, sby + Math.sin(a2) * r1 * 0.5).closePath()
          .fill({ color: COL_GOLD, alpha: 0.03 + 0.015 * Math.sin(this._feverFlash * 4 + i) });
      }
      // Animated border bars (polygon chevrons instead of plain rects)
      const chevH = 6;
      for (let ci = 0; ci < 8; ci++) {
        const cx2 = ((this._feverFlash * 80 + ci * sw / 8) % (sw + 40)) - 20;
        // Top chevron
        this._bg.moveTo(cx2, 0).lineTo(cx2 + 15, 0).lineTo(cx2 + 10, chevH).lineTo(cx2 + 5, chevH).closePath()
          .fill({ color: COL_GOLD, alpha: 0.12 + 0.06 * Math.sin(this._feverFlash * 3 + ci) });
        // Bottom chevron
        this._bg.moveTo(cx2, sh).lineTo(cx2 + 15, sh).lineTo(cx2 + 10, sh - chevH).lineTo(cx2 + 5, sh - chevH).closePath()
          .fill({ color: COL_GOLD, alpha: 0.12 + 0.06 * Math.sin(this._feverFlash * 3 + ci) });
      }
    }

    // Time slow visual with polygon hourglass
    if (this._timeSlowTimer > 0) {
      this._bg.rect(0, 0, sw, sh).fill({ color: 0x4488cc, alpha: 0.04 });
      const clkX = sw / 2, clkY = HIT_Y;
      // Polygon clock face (dodecagon)
      for (let i = 0; i < 12; i++) {
        const a1 = (i / 12) * Math.PI * 2 + this._time * 0.5;
        const a2 = ((i + 1) / 12) * Math.PI * 2 + this._time * 0.5;
        const r = 45;
        this._bg.moveTo(clkX + Math.cos(a1) * r, clkY + Math.sin(a1) * r)
          .lineTo(clkX + Math.cos(a2) * r, clkY + Math.sin(a2) * r)
          .stroke({ color: 0x88ccff, width: 0.5, alpha: 0.05 });
        // Hour markers (small diamond ticks)
        const mr = 40;
        const mx = clkX + Math.cos(a1) * mr, my = clkY + Math.sin(a1) * mr;
        this._bg.moveTo(mx, my - 1.5).lineTo(mx + 1.5, my).lineTo(mx, my + 1.5).lineTo(mx - 1.5, my).closePath()
          .fill({ color: 0x88ccff, alpha: 0.06 });
      }
      // Clock hands (polygon arrows)
      const handA = this._time * 2;
      const hr = 28;
      this._bg.moveTo(clkX, clkY).lineTo(clkX + Math.cos(handA) * hr, clkY + Math.sin(handA) * hr)
        .stroke({ color: 0xaaddff, width: 1, alpha: 0.06 });
      // Ripple rings expanding outward
      for (let r2 = 0; r2 < 2; r2++) {
        const rr = 20 + ((this._time * 30 + r2 * 25) % 40);
        const ra = Math.max(0, 0.04 - rr * 0.0008);
        if (ra > 0) {
          this._bg.moveTo(clkX + rr, clkY);
          for (let s = 1; s <= 12; s++) {
            const sa = (s / 12) * Math.PI * 2;
            this._bg.lineTo(clkX + Math.cos(sa) * rr, clkY + Math.sin(sa) * rr);
          }
          this._bg.closePath().stroke({ color: 0x88ccff, width: 0.5, alpha: ra });
        }
      }
    }

    // ── Background scene per act ──
    this._drawBgScene(sw, sh);

    // ── Floating musical note polygons ──
    for (const mn of this._musicNotes) {
      const alpha = (mn.life / mn.maxLife) * 0.09;
      if (alpha < 0.005) continue;
      const rot = Math.sin(this._time * 0.8 + mn.x * 0.005) * 0.3;
      const sc = mn.size / 14; // scale based on original font size
      const nx = mn.x, ny = mn.y;
      // Draw polygon musical note shape
      if (mn.symbol === "\u266A" || mn.symbol === "\u266B") {
        // Eighth note: oval head + stem + flag
        this._bg.ellipse(nx - 2 * sc, ny + 2 * sc, 3 * sc, 2.5 * sc).fill({ color: mn.color, alpha: alpha });
        this._bg.moveTo(nx + 1 * sc, ny + 2 * sc).lineTo(nx + 1 * sc, ny - 8 * sc)
          .stroke({ color: mn.color, width: 0.8 * sc, alpha: alpha });
        // Flag (polygon)
        this._bg.moveTo(nx + 1 * sc, ny - 8 * sc).bezierCurveTo(nx + 5 * sc, ny - 6 * sc, nx + 5 * sc, ny - 3 * sc, nx + 1 * sc, ny - 4 * sc)
          .stroke({ color: mn.color, width: 0.6 * sc, alpha: alpha });
      } else if (mn.symbol === "\u266C") {
        // Beamed double eighth: two heads + stems + beam
        this._bg.ellipse(nx - 3 * sc, ny + 2 * sc, 2.5 * sc, 2 * sc).fill({ color: mn.color, alpha: alpha });
        this._bg.ellipse(nx + 3 * sc, ny + 2 * sc, 2.5 * sc, 2 * sc).fill({ color: mn.color, alpha: alpha });
        this._bg.moveTo(nx - 0.5 * sc, ny + 2 * sc).lineTo(nx - 0.5 * sc, ny - 7 * sc)
          .stroke({ color: mn.color, width: 0.7 * sc, alpha: alpha });
        this._bg.moveTo(nx + 5.5 * sc, ny + 2 * sc).lineTo(nx + 5.5 * sc, ny - 7 * sc)
          .stroke({ color: mn.color, width: 0.7 * sc, alpha: alpha });
        // Beam (polygon)
        this._bg.moveTo(nx - 0.5 * sc, ny - 7 * sc).lineTo(nx + 5.5 * sc, ny - 7 * sc)
          .lineTo(nx + 5.5 * sc, ny - 5.5 * sc).lineTo(nx - 0.5 * sc, ny - 5.5 * sc).closePath()
          .fill({ color: mn.color, alpha: alpha });
      } else {
        // Quarter note: filled oval head + stem
        this._bg.ellipse(nx, ny + 1 * sc, 3 * sc, 2.5 * sc).fill({ color: mn.color, alpha: alpha });
        this._bg.moveTo(nx + 3 * sc, ny + 1 * sc).lineTo(nx + 3 * sc, ny - 8 * sc)
          .stroke({ color: mn.color, width: 0.8 * sc, alpha: alpha });
      }
    }

    // ── Perfect streak flame columns ──
    if (this._streakFlame > 0.05) {
      const flameH = 150 * this._streakFlame;
      const flameAlpha = this._streakFlame * 0.22;
      for (let side = 0; side < 2; side++) {
        const baseX = side === 0 ? hx - 10 : hx + HIGHWAY_W + 6;
        const dir = side === 0 ? -1 : 1;
        for (let i = 0; i < 4; i++) {
          const fx = baseX + dir * i * 4;
          const fh = flameH * (1 - i * 0.2);
          const flicker = Math.sin(this._time * 10 + i * 2.3 + side * 1.1) * 7;
          const fCol = [0xff2200, 0xff5500, 0xff9900, 0xffcc00][i];
          // Tapered flame shape
          this._bg.moveTo(fx, HIT_Y).lineTo(fx + dir * 3, HIT_Y - fh * 0.6 + flicker).lineTo(fx, HIT_Y - fh + flicker * 1.5)
            .lineTo(fx - dir * 2, HIT_Y - fh * 0.4 + flicker).closePath()
            .fill({ color: fCol, alpha: flameAlpha * (1 - i * 0.2) });
        }
      }
    }

    // ── Staff lines (scrolling, perspective-scaled) ──
    this._staffLines.clear();
    const staffScroll = (this._time * 35) % 24;
    for (let i = 0; i < LANES; i++) {
      const lx = hx + i * (LANE_W + LANE_GAP);
      for (let sy = -24 + staffScroll; sy < sh; sy += 24) {
        // Fade out toward top
        const yPct = Math.max(0, sy / sh);
        this._staffLines.moveTo(lx + 10, sy).lineTo(lx + LANE_W - 10, sy)
          .stroke({ color: LANE_COLORS[i], width: 0.3, alpha: 0.04 * yPct });
      }
    }

    // ── Highway ──
    this._highway.clear();

    // Highway outer glow border — pulses with beat AND combo
    const comboGlow = Math.min(0.15, this._combo * 0.003);
    const hwGlowAlpha = 0.08 + this._beatPulse * 0.06 + comboGlow;
    const hwGlowColor = this._feverActive ? COL_GOLD : this._combo >= 30 ? 0xcc88ff : this._combo >= 15 ? 0x88aaff : COL_BORDER;
    this._highway.roundRect(hx - 3, -2, HIGHWAY_W + 6, sh + 4, 4)
      .stroke({ color: hwGlowColor, width: 1.5 + comboGlow * 5, alpha: hwGlowAlpha });
    // Second outer glow at high combo
    if (this._combo >= 15) {
      this._highway.roundRect(hx - 6, -4, HIGHWAY_W + 12, sh + 8, 6)
        .stroke({ color: hwGlowColor, width: 1, alpha: comboGlow * 0.5 });
    }

    // Perspective convergence lines (subtle vanishing point at top center)
    const vanishX = hx + HIGHWAY_W / 2;
    for (let i = 0; i <= LANES; i++) {
      const edgeX = hx + i * (LANE_W + LANE_GAP) - (i < LANES ? 0 : LANE_GAP);
      this._highway.moveTo(edgeX, sh).lineTo(vanishX + (edgeX - vanishX) * 0.3, -10)
        .stroke({ color: 0xffffff, width: 0.3, alpha: 0.015 });
    }

    // Section transition flash overlay
    if (this._sectionTransition > 0) {
      const stCol = this._currentSection.name === "finale" ? COL_GOLD
        : this._currentSection.name === "chorus" ? 0x4466aa : 0x446644;
      this._highway.rect(hx, 0, HIGHWAY_W, sh).fill({ color: stCol, alpha: this._sectionTransition * 0.06 });
    }

    for (let i = 0; i < LANES; i++) {
      const lx = hx + i * (LANE_W + LANE_GAP);
      const flash = this._laneFlash[i];
      const onFire = this._fireLanes[i] && this._abilityActive > 0;
      const laneCol = onFire ? 0xff3300 : LANE_COLORS[i];

      // Lane background — gradient: darker at top, brighter near hit zone
      for (let band = 0; band < 10; band++) {
        const bandTop = (band / 10) * sh;
        const bandBot = ((band + 1) / 10) * sh;
        const bandAlpha = (onFire ? 0.04 : 0.015) + (band / 10) * (onFire ? 0.06 : 0.025) + flash * 0.06 * (band / 10);
        const fireFlicker = onFire ? 0.03 * Math.sin(this._time * 8 + band) : 0;
        const beatGlow = band >= 7 ? this._beatPulse * 0.012 : 0; // bottom lanes glow on beat
        this._highway.rect(lx, bandTop, LANE_W, bandBot - bandTop).fill({ color: laneCol, alpha: bandAlpha + fireFlicker + beatGlow });
      }

      // Lane edge lines (double — outer dim, inner brighter)
      this._highway.moveTo(lx, 0).lineTo(lx, sh).stroke({ color: laneCol, width: 0.8, alpha: 0.08 + flash * 0.2 });
      this._highway.moveTo(lx + LANE_W, 0).lineTo(lx + LANE_W, sh).stroke({ color: laneCol, width: 0.8, alpha: 0.08 + flash * 0.2 });
      // Inner glow rails (brighter, thinner)
      this._highway.moveTo(lx + 1, HIT_Y - 60).lineTo(lx + 1, HIT_Y + 40).stroke({ color: laneCol, width: 0.4, alpha: 0.15 + flash * 0.3 });
      this._highway.moveTo(lx + LANE_W - 1, HIT_Y - 60).lineTo(lx + LANE_W - 1, HIT_Y + 40).stroke({ color: laneCol, width: 0.4, alpha: 0.15 + flash * 0.3 });

      // Hit flash light beam shooting up (polygon)
      if (flash > 0.3) {
        const beamAlpha = (flash - 0.3) * 0.2;
        const beamH = 280 * flash;
        // Core tapered beam
        this._highway.moveTo(lx + LANE_W * 0.3, HIT_Y).lineTo(lx + LANE_W * 0.4, HIT_Y - beamH)
          .lineTo(lx + LANE_W * 0.6, HIT_Y - beamH).lineTo(lx + LANE_W * 0.7, HIT_Y).closePath()
          .fill({ color: LANE_COLORS[i], alpha: beamAlpha });
        // Wider subtle glow
        this._highway.moveTo(lx + LANE_W * 0.15, HIT_Y).lineTo(lx + LANE_W * 0.35, HIT_Y - beamH * 0.7)
          .lineTo(lx + LANE_W * 0.65, HIT_Y - beamH * 0.7).lineTo(lx + LANE_W * 0.85, HIT_Y).closePath()
          .fill({ color: LANE_COLORS[i], alpha: beamAlpha * 0.3 });
        // Beam tip spark (diamond)
        const tipY = HIT_Y - beamH;
        this._highway.moveTo(lx + LANE_W / 2, tipY - 6).lineTo(lx + LANE_W / 2 + 4, tipY)
          .lineTo(lx + LANE_W / 2, tipY + 6).lineTo(lx + LANE_W / 2 - 4, tipY).closePath()
          .fill({ color: 0xffffff, alpha: beamAlpha * 0.5 });
      }

      // Fire lane effects — polygon flames
      if (onFire) {
        for (let f = 0; f < 5; f++) {
          const fx2 = lx + 6 + (f / 5) * (LANE_W - 12);
          const fh2 = 12 + Math.sin(this._time * 9 + f * 2.3 + i) * 6;
          const fy2 = HIT_Y + 12;
          // Polygon flame tongue
          this._highway.moveTo(fx2 - 3, fy2 + fh2).lineTo(fx2 - 1, fy2 + fh2 * 0.3)
            .lineTo(fx2 + 1, fy2).lineTo(fx2 + 2, fy2 + fh2 * 0.4).lineTo(fx2 + 4, fy2 + fh2).closePath()
            .fill({ color: f % 2 === 0 ? 0xff4400 : 0xffaa00, alpha: 0.12 });
        }
        // Fire border glow
        this._highway.rect(lx, HIT_Y + 10, LANE_W, 30).fill({ color: 0xff2200, alpha: 0.04 + 0.02 * Math.sin(this._time * 6 + i) });
      }
    }

    // ── Hit zone — diamond receptors ──
    // Ambient hit line
    this._highway.moveTo(hx - 6, HIT_Y).lineTo(hx + HIGHWAY_W + 6, HIT_Y)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.04 + this._beatPulse * 0.03 });

    for (let i = 0; i < LANES; i++) {
      const lx = hx + i * (LANE_W + LANE_GAP);
      const cx = lx + LANE_W / 2;
      const pressed = this._lanePressed[i];
      const flash = this._laneFlash[i];
      const beatScale = 1 + this._beatPulse * 0.08; // receptors pulse with beat
      const hw = ((LANE_W - 10) / 2) * beatScale;
      const hh = 12 * beatScale;
      const col = LANE_COLORS[i];

      // Outer glow halo on beat
      if (this._beatPulse > 0.3) {
        const glowR = hw + 6;
        this._highway.moveTo(cx, HIT_Y - glowR).lineTo(cx + glowR, HIT_Y).lineTo(cx, HIT_Y + glowR).lineTo(cx - glowR, HIT_Y).closePath()
          .fill({ color: col, alpha: this._beatPulse * 0.03 });
      }

      // Receptor diamond fill
      const rAlpha = pressed ? 0.45 : 0.08 + flash * 0.25 + this._beatPulse * 0.02;
      this._highway.moveTo(cx, HIT_Y - hh).lineTo(cx + hw, HIT_Y).lineTo(cx, HIT_Y + hh).lineTo(cx - hw, HIT_Y).closePath()
        .fill({ color: col, alpha: rAlpha });
      // Inner highlight diamond
      this._highway.moveTo(cx, HIT_Y - hh * 0.4).lineTo(cx + hw * 0.4, HIT_Y).lineTo(cx, HIT_Y + hh * 0.4).lineTo(cx - hw * 0.4, HIT_Y).closePath()
        .fill({ color: 0xffffff, alpha: (pressed ? 0.15 : 0.03) + flash * 0.1 });
      // Receptor border — thicker when pressed, pulses with beat
      const borderW = pressed ? 2.5 : 1 + this._beatPulse * 0.8;
      this._highway.moveTo(cx, HIT_Y - hh - 1).lineTo(cx + hw + 1, HIT_Y).lineTo(cx, HIT_Y + hh + 1).lineTo(cx - hw - 1, HIT_Y).closePath()
        .stroke({ color: col, width: borderW, alpha: 0.5 + flash * 0.4 });
      // Corner tick marks at diamond vertices
      const tickLen = 4;
      this._highway.moveTo(cx, HIT_Y - hh - 2).lineTo(cx, HIT_Y - hh - 2 - tickLen).stroke({ color: col, width: 0.6, alpha: 0.2 });
      this._highway.moveTo(cx, HIT_Y + hh + 2).lineTo(cx, HIT_Y + hh + 2 + tickLen).stroke({ color: col, width: 0.6, alpha: 0.2 });
      this._highway.moveTo(cx - hw - 2, HIT_Y).lineTo(cx - hw - 2 - tickLen, HIT_Y).stroke({ color: col, width: 0.6, alpha: 0.2 });
      this._highway.moveTo(cx + hw + 2, HIT_Y).lineTo(cx + hw + 2 + tickLen, HIT_Y).stroke({ color: col, width: 0.6, alpha: 0.2 });
      // Press explosion ring
      if (pressed) {
        this._highway.moveTo(cx, HIT_Y - hh * 0.5).lineTo(cx + hw * 0.5, HIT_Y).lineTo(cx, HIT_Y + hh * 0.5).lineTo(cx - hw * 0.5, HIT_Y).closePath()
          .fill({ color: 0xffffff, alpha: 0.2 });
        // Glow circle
        this._highway.circle(cx, HIT_Y, hw + 4).fill({ color: col, alpha: 0.06 });
      }
    }

    // Lane labels
    this._textContainer.removeChildren();
    for (let i = 0; i < LANES; i++) {
      const lx = hx + i * (LANE_W + LANE_GAP) + LANE_W / 2;
      const pressed = this._lanePressed[i];
      const lt = new Text({ text: LANE_LABELS[i], style: new TextStyle({
        fontFamily: FONT, fontSize: pressed ? 14 : 11, fill: LANE_COLORS[i], fontWeight: "bold",
      }) });
      lt.anchor.set(0.5, 0.5); lt.position.set(lx, HIT_Y + 30);
      lt.alpha = pressed ? 1 : 0.3;
      this._textContainer.addChild(lt);

      // Fire warning
      if (this._fireLanes[i] && this._abilityActive > 0) {
        const ft = new Text({ text: "\u{1F525}", style: new TextStyle({ fontFamily: FONT, fontSize: 12 }) });
        ft.anchor.set(0.5, 0.5); ft.position.set(lx, HIT_Y + 48);
        ft.alpha = 0.5 + 0.3 * Math.sin(this._time * 6);
        this._textContainer.addChild(ft);
      }
    }

    // ── Lane sparkles (ambient particles inside lanes) ──
    for (const sp of this._laneSparkles) {
      const alpha = (sp.life / sp.maxLife) * 0.25;
      const sz = sp.size;
      // Diamond sparkle instead of circle
      this._highway.moveTo(sp.x, sp.y - sz).lineTo(sp.x + sz, sp.y).lineTo(sp.x, sp.y + sz).lineTo(sp.x - sz, sp.y).closePath()
        .fill({ color: LANE_COLORS[sp.lane], alpha });
      // Tiny glow
      if (sz > 1) {
        this._highway.circle(sp.x, sp.y, sz + 1).fill({ color: LANE_COLORS[sp.lane], alpha: alpha * 0.2 });
      }
    }

    // ── Miss shatter effect on receptors ──
    for (let i = 0; i < LANES; i++) {
      if (this._missShatter[i] > 0.1) {
        const lx = hx + i * (LANE_W + LANE_GAP);
        const cx2 = lx + LANE_W / 2;
        const shatterA = this._missShatter[i];
        // Cracking lines radiating from receptor center (jagged polygon cracks)
        for (let c = 0; c < 8; c++) {
          const angle = (c / 8) * Math.PI * 2 + i * 0.5;
          const len = 12 + shatterA * 22;
          const midLen = len * 0.5;
          const jitter = (Math.sin(c * 7.3 + i * 3) * 0.4);
          const mx = cx2 + Math.cos(angle + jitter) * midLen;
          const my = HIT_Y + Math.sin(angle + jitter) * midLen;
          // Jagged crack path
          this._highway.moveTo(cx2, HIT_Y).lineTo(mx, my)
            .lineTo(cx2 + Math.cos(angle) * len, HIT_Y + Math.sin(angle) * len)
            .stroke({ color: 0xff4444, width: 1.5 * shatterA, alpha: shatterA * 0.5 });
        }
        // Shattered diamond fragments flying outward
        for (let f = 0; f < 4; f++) {
          const fa = (f / 4) * Math.PI * 2 + 0.4;
          const fd = shatterA * 18 + 5;
          const fx = cx2 + Math.cos(fa) * fd;
          const fy = HIT_Y + Math.sin(fa) * fd;
          this._highway.moveTo(fx, fy - 3).lineTo(fx + 3, fy).lineTo(fx, fy + 3).lineTo(fx - 3, fy).closePath()
            .fill({ color: 0xff4444, alpha: shatterA * 0.3 });
        }
        // Red flash on receptor
        const hw2 = (LANE_W - 10) / 2;
        this._highway.moveTo(cx2, HIT_Y - 12).lineTo(cx2 + hw2, HIT_Y).lineTo(cx2, HIT_Y + 12).lineTo(cx2 - hw2, HIT_Y).closePath()
          .fill({ color: 0xff2222, alpha: shatterA * 0.25 });
        // Screen edge red flash
        this._highway.rect(lx, HIT_Y - 20, LANE_W, 40).fill({ color: 0xff0000, alpha: shatterA * 0.04 });
      }
    }

    // ── Ornamental hit zone decorations ──
    const hwCenter = hx + HIGHWAY_W / 2;
    const ornA = 0.06 + 0.03 * Math.sin(this._time * 2);
    // Center diamond
    this._highway.moveTo(hwCenter, HIT_Y - 20).lineTo(hwCenter + 5, HIT_Y).lineTo(hwCenter, HIT_Y + 20).lineTo(hwCenter - 5, HIT_Y).closePath()
      .stroke({ color: COL_BORDER, width: 0.8, alpha: ornA });
    // Ornamental brackets
    const bracketLen = 18;
    const hxR = hx + HIGHWAY_W;
    for (const [bx2, dir] of [[hx - 8, -1], [hxR + 8, 1]] as [number, number][]) {
      this._highway.moveTo(bx2, HIT_Y - bracketLen).lineTo(bx2, HIT_Y + bracketLen)
        .stroke({ color: COL_BORDER, width: 1, alpha: ornA });
      this._highway.moveTo(bx2, HIT_Y - bracketLen).lineTo(bx2 - dir * 4, HIT_Y - bracketLen)
        .stroke({ color: COL_BORDER, width: 1, alpha: ornA });
      this._highway.moveTo(bx2, HIT_Y + bracketLen).lineTo(bx2 - dir * 4, HIT_Y + bracketLen)
        .stroke({ color: COL_BORDER, width: 1, alpha: ornA });
      for (const by of [HIT_Y - bracketLen, HIT_Y + bracketLen]) {
        this._highway.moveTo(bx2, by - 2).lineTo(bx2 + dir * 2, by).lineTo(bx2, by + 2).lineTo(bx2 - dir * 2, by).closePath()
          .fill({ color: COL_BORDER, alpha: ornA * 1.5 });
      }
    }

    // ── Lane separator treble clef ornaments ──
    for (let i = 0; i < LANES - 1; i++) {
      const sepX = hx + (i + 1) * (LANE_W + LANE_GAP) - LANE_GAP / 2;
      // Dotted separator line
      for (let dy = 0; dy < sh; dy += 12) {
        this._highway.circle(sepX, dy, 0.5).fill({ color: 0xffffff, alpha: 0.03 });
      }
      // Musical note ornament at hit zone level
      const ornY = HIT_Y - 30 + Math.sin(this._time * 1.5 + i) * 3;
      this._highway.circle(sepX, ornY, 2.5).fill({ color: COL_BORDER, alpha: 0.08 });
      this._highway.moveTo(sepX + 2.5, ornY).lineTo(sepX + 2.5, ornY - 8).stroke({ color: COL_BORDER, width: 0.7, alpha: 0.06 });
    }

    // ── Animated Bard Character (below highway) ──
    {
      const bx = hwCenter, by = HIT_Y + 70;
      const bardBob = Math.sin(this._time * 2.5) * 2;
      const strumAnim = Math.sin(this._time * this._enemy.bpm / 15) * 3;
      const g2 = this._highway;

      // Body (robe)
      g2.moveTo(bx - 8, by + 15 + bardBob).lineTo(bx - 5, by - 5 + bardBob).lineTo(bx + 5, by - 5 + bardBob).lineTo(bx + 8, by + 15 + bardBob).closePath()
        .fill({ color: 0x2a1a4a, alpha: 0.5 });
      // Head
      g2.circle(bx, by - 10 + bardBob, 6).fill({ color: 0xddccaa, alpha: 0.4 });
      // Hat (bard's cap with feather)
      g2.moveTo(bx - 6, by - 14 + bardBob).lineTo(bx, by - 22 + bardBob).lineTo(bx + 6, by - 14 + bardBob).closePath()
        .fill({ color: 0x3a2a5a, alpha: 0.45 });
      g2.moveTo(bx + 4, by - 18 + bardBob).bezierCurveTo(bx + 8, by - 24 + bardBob, bx + 12, by - 22 + bardBob, bx + 10, by - 18 + bardBob)
        .stroke({ color: 0xcc8844, width: 1, alpha: 0.35 }); // feather
      // Eyes
      g2.circle(bx - 2, by - 11 + bardBob, 1).fill({ color: 0x4488ff, alpha: 0.6 });
      g2.circle(bx + 2, by - 11 + bardBob, 1).fill({ color: 0x4488ff, alpha: 0.6 });
      // Lute body
      g2.ellipse(bx - 10 + strumAnim * 0.3, by + 4 + bardBob, 6, 4).fill({ color: 0x7a5a2a, alpha: 0.45 });
      g2.ellipse(bx - 10 + strumAnim * 0.3, by + 4 + bardBob, 6, 4).stroke({ color: 0x9a7a4a, width: 0.8, alpha: 0.3 });
      // Lute neck
      g2.moveTo(bx - 15 + strumAnim * 0.2, by + 2 + bardBob).lineTo(bx - 22 + strumAnim * 0.1, by - 6 + bardBob)
        .stroke({ color: 0x7a5a2a, width: 1.5, alpha: 0.4 });
      // Strumming hand
      g2.circle(bx - 10 + strumAnim, by + 4 + bardBob, 2).fill({ color: 0xddccaa, alpha: 0.35 });
      // Strings (animated vibration)
      for (let s = 0; s < 3; s++) {
        const sy = by + 2 + s * 1.5 + bardBob;
        const vib = Math.sin(this._time * 20 + s * 2) * (this._combo > 0 ? 0.5 : 0.1);
        g2.moveTo(bx - 16, sy + vib).lineTo(bx - 5, sy - vib).stroke({ color: 0xccaa66, width: 0.3, alpha: 0.25 });
      }
      // Magical aura around bard (intensity based on combo)
      if (this._combo > 5) {
        const auraR = 16 + this._combo * 0.2;
        const auraA = Math.min(0.08, this._combo * 0.002);
        g2.circle(bx, by + bardBob, auraR).fill({ color: this._feverActive ? COL_GOLD : 0x8866cc, alpha: auraA });
      }
    }

    // ── Notes ──
    this._noteGfx.clear();
    for (const n of this._notes) {
      if (n.missed) {
        // Shattering diamond fragments
        const lx = hx + n.lane * (LANE_W + LANE_GAP);
        const cx2 = lx + LANE_W / 2;
        const missAge = (n.y - (HIT_Y + GOOD_WINDOW + 20)) / 60; // 0..1 ish
        const fadeA = Math.max(0, 0.35 - missAge * 0.3);
        if (fadeA > 0) {
          // 4 diamond shards flying apart
          for (let sh2 = 0; sh2 < 4; sh2++) {
            const angle = (sh2 / 4) * Math.PI * 2 + 0.3;
            const dist = missAge * 18;
            const sx2 = cx2 + Math.cos(angle) * dist;
            const sy2 = n.y + Math.sin(angle) * dist;
            this._noteGfx.moveTo(sx2, sy2 - 3).lineTo(sx2 + 4, sy2).lineTo(sx2, sy2 + 3).lineTo(sx2 - 4, sy2).closePath()
              .fill({ color: 0xff4444, alpha: fadeA });
          }
          // Red X at center
          this._noteGfx.moveTo(cx2 - 4, n.y - 4).lineTo(cx2 + 4, n.y + 4).stroke({ color: 0xff2222, width: 1.5, alpha: fadeA });
          this._noteGfx.moveTo(cx2 - 4, n.y + 4).lineTo(cx2 + 4, n.y - 4).stroke({ color: 0xff2222, width: 1.5, alpha: fadeA });
        }
        continue;
      }
      if (n.hit && n.holdLen <= 0) continue;
      const lx = hx + n.lane * (LANE_W + LANE_GAP);
      const col = LANE_COLORS[n.lane];

      if (n.holdLen > 0) {
        const tailTop = n.hit ? HIT_Y - n.holdLen + n.holdHeld : n.y - n.holdLen;
        const tailBot = n.hit ? HIT_Y : n.y;
        const holdPct = n.holdLen > 0 ? n.holdHeld / n.holdLen : 0;
        const beamCx = lx + LANE_W / 2;
        const clampTop = Math.max(SPAWN_Y, tailTop);
        const beamH = Math.max(0, tailBot - clampTop);

        // Outer beam glow
        this._noteGfx.roundRect(beamCx - 10, clampTop, 20, beamH, 4)
          .fill({ color: col, alpha: n.hit ? 0.12 + holdPct * 0.08 : 0.06 });
        // Core beam
        this._noteGfx.roundRect(beamCx - 5, clampTop, 10, beamH, 3)
          .fill({ color: col, alpha: n.hit ? 0.4 + holdPct * 0.3 : 0.25 });
        // Inner bright core
        this._noteGfx.roundRect(beamCx - 2, clampTop, 4, beamH, 2)
          .fill({ color: 0xffffff, alpha: n.hit ? 0.15 + holdPct * 0.15 : 0.08 });

        // Pulsing energy nodes along the beam
        if (n.hit && beamH > 10) {
          const nodeCount = Math.floor(beamH / 20);
          for (let ni = 0; ni < nodeCount; ni++) {
            const ny = clampTop + (ni + 0.5) * (beamH / nodeCount);
            const pulse = 0.3 + 0.2 * Math.sin(this._time * 8 + ni * 1.5);
            this._noteGfx.circle(beamCx, ny, 3 + pulse * 2).fill({ color: col, alpha: pulse * 0.4 });
            this._noteGfx.circle(beamCx, ny, 1.5).fill({ color: 0xffffff, alpha: pulse * 0.5 });
          }
        }

        // Held portion bright overlay
        if (n.hit && n.holdHeld > 0) {
          this._noteGfx.roundRect(beamCx - 7, HIT_Y - n.holdHeld, 14, n.holdHeld, 3)
            .fill({ color: col, alpha: 0.15 + holdPct * 0.1 });
        }
      }

      if (!n.hit) {
        const isBlind = this._abilityType === "blind" && this._abilityActive > 0 && n.y < HIT_Y - 150;
        if (!isBlind) {
          const noteCol = n.type === "golden" ? COL_GOLD : n.type === "poison" ? 0xaa44ff : col;
          const cx = lx + LANE_W / 2;
          const hw = (LANE_W - 12) / 2;
          const hh = 10;

          // Approach glow — note brightens as it nears hit zone
          const approachPct = Math.max(0, Math.min(1, 1 - Math.abs(n.y - HIT_Y) / (HIT_Y - SPAWN_Y)));
          const approachBoost = approachPct * 0.15;

          // Outer glow halo (grows near hit zone)
          if (approachPct > 0.5) {
            const glowR = hw + 8 + (approachPct - 0.5) * 12;
            this._noteGfx.circle(cx, n.y, glowR).fill({ color: noteCol, alpha: (approachPct - 0.5) * 0.08 });
          }

          // Diamond shape
          this._noteGfx.moveTo(cx, n.y - hh).lineTo(cx + hw, n.y).lineTo(cx, n.y + hh).lineTo(cx - hw, n.y).closePath()
            .fill({ color: noteCol, alpha: (n.type === "golden" ? 0.95 : 0.82) + approachBoost });
          // Inner diamond highlight
          const ihw = hw * 0.55, ihh = hh * 0.55;
          this._noteGfx.moveTo(cx, n.y - ihh).lineTo(cx + ihw, n.y).lineTo(cx, n.y + ihh).lineTo(cx - ihw, n.y).closePath()
            .fill({ color: 0xffffff, alpha: (n.type === "golden" ? 0.35 : 0.18) + approachBoost });
          // Outer diamond border
          const ohw = hw + 3, ohh = hh + 3;
          this._noteGfx.moveTo(cx, n.y - ohh).lineTo(cx + ohw, n.y).lineTo(cx, n.y + ohh).lineTo(cx - ohw, n.y).closePath()
            .stroke({ color: noteCol, width: n.type === "golden" ? 2.5 : 1 + approachPct, alpha: (n.type === "golden" ? 0.8 : 0.35) + approachBoost });

          // Golden shimmer halo with orbiting sparkles
          if (n.type === "golden") {
            const shimmer = 0.35 + 0.25 * Math.sin(this._time * 8 + n.y * 0.1);
            this._noteGfx.circle(cx, n.y, hw + 8).stroke({ color: COL_GOLD, width: 1, alpha: shimmer * 0.3 });
            for (let s = 0; s < 6; s++) {
              const sa = this._time * 4 + s * Math.PI / 3;
              const sr = hw + 6;
              this._noteGfx.circle(cx + Math.cos(sa) * sr, n.y + Math.sin(sa) * sr * 0.6, 1.2)
                .fill({ color: 0xffffff, alpha: shimmer * 0.4 });
            }
          }

          // Poison note — pulsing purple aura with skull symbol
          if (n.type === "poison") {
            const pPulse = 0.3 + 0.2 * Math.sin(this._time * 6 + n.y * 0.15);
            this._noteGfx.circle(cx, n.y, hw + 6).fill({ color: 0xaa44ff, alpha: pPulse * 0.06 });
            this._noteGfx.circle(cx, n.y, hw + 8).stroke({ color: 0x8822cc, width: 1, alpha: pPulse * 0.3 });
            // Dripping effect below
            for (let d = 0; d < 2; d++) {
              const dx = cx - 4 + d * 8;
              const dripY = n.y + hh + 2 + Math.sin(this._time * 4 + d * 2) * 3;
              this._noteGfx.circle(dx, dripY, 1.5).fill({ color: 0xaa44ff, alpha: pPulse * 0.4 });
              this._noteGfx.circle(dx, dripY + 4, 1).fill({ color: 0xaa44ff, alpha: pPulse * 0.2 });
            }
          }

          // Comet trail behind moving note
          const trailLen = 25 + approachPct * 15;
          this._noteGfx.moveTo(cx, n.y - hh - trailLen).lineTo(cx + hw * 0.35, n.y - hh - 3).lineTo(cx - hw * 0.35, n.y - hh - 3).closePath()
            .fill({ color: noteCol, alpha: 0.04 + approachPct * 0.03 });
          // Tiny spark at trail tip
          if (approachPct > 0.3) {
            this._noteGfx.circle(cx, n.y - hh - trailLen + 2, 1.5).fill({ color: noteCol, alpha: approachPct * 0.15 });
          }
        }
      }
    }

    // ── Enemy attacks (danger diamonds) ──
    for (const a of this._attacks) {
      const lx = hx + a.lane * (LANE_W + LANE_GAP);
      const acx = lx + LANE_W / 2;
      const hw = (LANE_W - 10) / 2;
      const pulse = 0.7 + 0.15 * Math.sin(this._time * 10);
      // Danger diamond
      this._noteGfx.moveTo(acx, a.y - 11).lineTo(acx + hw, a.y).lineTo(acx, a.y + 11).lineTo(acx - hw, a.y).closePath()
        .fill({ color: 0xff2222, alpha: pulse });
      // Spiky outer border
      this._noteGfx.moveTo(acx, a.y - 14).lineTo(acx + hw + 3, a.y).lineTo(acx, a.y + 14).lineTo(acx - hw - 3, a.y).closePath()
        .stroke({ color: 0xff0000, width: 2, alpha: 0.7 });
      // Skull X marks
      this._noteGfx.moveTo(acx - 5, a.y - 5).lineTo(acx + 5, a.y + 5).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
      this._noteGfx.moveTo(acx - 5, a.y + 5).lineTo(acx + 5, a.y - 5).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
      // Danger trail
      this._noteGfx.moveTo(acx, a.y - 35).lineTo(acx + hw * 0.4, a.y - 14).lineTo(acx - hw * 0.4, a.y - 14).closePath()
        .fill({ color: 0xff0000, alpha: 0.04 });
      // Warning flash on receptor when attack is close
      if (a.y > HIT_Y - 100 && a.y < HIT_Y) {
        const urgency = 1 - (HIT_Y - a.y) / 100;
        this._noteGfx.roundRect(lx + 3, HIT_Y - 14, LANE_W - 6, 28, 6)
          .fill({ color: 0xff0000, alpha: urgency * 0.15 });
      }
    }

    // ── Enemy ──
    this._enemyGfx.clear();
    if (this._phase !== "victory" && this._phase !== "defeat") this._drawEnemy(sw);

    // ── Effects ──
    this._effectGfx.clear();
    if (this._spellGlow > 0) {
      this._effectGfx.rect(0, 0, sw, sh).fill({ color: this._spellGlowColor, alpha: this._spellGlow * 0.06 });
      // Diamond burst instead of circle
      const spR = 140 * this._spellGlow;
      this._effectGfx.moveTo(sw / 2, HIT_Y - spR).lineTo(sw / 2 + spR * 0.7, HIT_Y)
        .lineTo(sw / 2, HIT_Y + spR).lineTo(sw / 2 - spR * 0.7, HIT_Y).closePath()
        .fill({ color: this._spellGlowColor, alpha: this._spellGlow * 0.08 });
      // Inner ring
      const spR2 = spR * 0.5;
      this._effectGfx.moveTo(sw / 2, HIT_Y - spR2).lineTo(sw / 2 + spR2, HIT_Y)
        .lineTo(sw / 2, HIT_Y + spR2).lineTo(sw / 2 - spR2, HIT_Y).closePath()
        .stroke({ color: this._spellGlowColor, width: 2 * this._spellGlow, alpha: this._spellGlow * 0.2 });
    }
    // Particles as diamond shapes with motion trails
    for (const p of this._particles) {
      const alpha = p.life / p.maxLife;
      const sz = p.size * (0.3 + alpha * 0.7);
      // Trail (smaller diamond behind)
      if (sz > 1.5) {
        const trailX = p.x - p.vx * 0.02;
        const trailY = p.y - p.vy * 0.02;
        this._effectGfx.moveTo(trailX, trailY - sz * 0.5).lineTo(trailX + sz * 0.5, trailY)
          .lineTo(trailX, trailY + sz * 0.5).lineTo(trailX - sz * 0.5, trailY).closePath()
          .fill({ color: p.color, alpha: alpha * 0.3 });
      }
      // Main diamond particle
      this._effectGfx.moveTo(p.x, p.y - sz).lineTo(p.x + sz, p.y)
        .lineTo(p.x, p.y + sz).lineTo(p.x - sz, p.y).closePath()
        .fill({ color: p.color, alpha: alpha * 0.9 });
      // Core bright dot
      if (alpha > 0.5) {
        this._effectGfx.circle(p.x, p.y, sz * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.4 });
      }
    }
    // Hit ripple rings (expanding polygon diamonds)
    for (const r of this._ripples) {
      const alpha = (r.life / r.maxLife) * 0.6;
      const rr = r.radius;
      // Outer expanding diamond
      this._effectGfx.moveTo(r.x, r.y - rr).lineTo(r.x + rr, r.y).lineTo(r.x, r.y + rr).lineTo(r.x - rr, r.y).closePath()
        .stroke({ color: r.color, width: 2.5 * alpha, alpha });
      // Inner diamond ring
      if (rr > 10) {
        const ir = rr * 0.6;
        this._effectGfx.moveTo(r.x, r.y - ir).lineTo(r.x + ir, r.y).lineTo(r.x, r.y + ir).lineTo(r.x - ir, r.y).closePath()
          .stroke({ color: r.color, width: 1 * alpha, alpha: alpha * 0.4 });
      }
      // Corner spark dots at diamond vertices
      if (alpha > 0.2) {
        for (const [dx, dy] of [[0, -rr], [rr, 0], [0, rr], [-rr, 0]]) {
          this._effectGfx.circle(r.x + dx, r.y + dy, 1.5 * alpha).fill({ color: 0xffffff, alpha: alpha * 0.5 });
        }
      }
    }

    // Victory confetti
    for (const c of this._confetti) {
      const alpha = Math.min(1, c.life / 2);
      // Rotate the confetti piece
      const cos = Math.cos(c.rot);
      const sin = Math.sin(c.rot);
      const hw = c.w / 2, hh = c.h / 2;
      // Draw as a rotated rectangle using polygon
      this._effectGfx.moveTo(c.x + (-hw * cos - -hh * sin), c.y + (-hw * sin + -hh * cos))
        .lineTo(c.x + (hw * cos - -hh * sin), c.y + (hw * sin + -hh * cos))
        .lineTo(c.x + (hw * cos - hh * sin), c.y + (hw * sin + hh * cos))
        .lineTo(c.x + (-hw * cos - hh * sin), c.y + (-hw * sin + hh * cos))
        .closePath().fill({ color: c.color, alpha: alpha * 0.7 });
    }

    // ── HUD ──
    this._hudGfx.clear();
    this._drawHUD(sw, sh);

    // ── Floating texts with glow backdrop ──
    for (const ft of this._floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      const scale = ft.scale * (0.8 + 0.2 * alpha);
      const fontSize = Math.round(14 * scale);
      // Subtle glow background for important texts
      if (scale >= 1.2 && alpha > 0.3) {
        const glowW = ft.text.length * fontSize * 0.4;
        this._effectGfx.ellipse(ft.x, ft.y, glowW, fontSize * 0.8).fill({ color: ft.color, alpha: alpha * 0.04 });
      }
      const t = new Text({ text: ft.text, style: new TextStyle({
        fontFamily: FONT, fontSize, fill: ft.color, fontWeight: "bold",
        dropShadow: scale >= 1.1 ? { color: ft.color, blur: 4, alpha: 0.3, distance: 0 } : undefined,
      }) });
      t.anchor.set(0.5, 0.5); t.position.set(ft.x, ft.y); t.alpha = alpha;
      this._textContainer.addChild(t);
    }

    // ── Crit flash overlay with diamond burst ──
    if (this._critFlash > 0) {
      this._effectGfx.rect(0, 0, sw, sh).fill({ color: 0xff4488, alpha: this._critFlash * 0.05 });
      // Crit diamond flash at screen center
      const crR = this._critFlash * 60;
      this._effectGfx.moveTo(sw / 2, HIT_Y - crR).lineTo(sw / 2 + crR * 0.8, HIT_Y)
        .lineTo(sw / 2, HIT_Y + crR).lineTo(sw / 2 - crR * 0.8, HIT_Y).closePath()
        .stroke({ color: 0xff4488, width: 1.5, alpha: this._critFlash * 0.15 });
    }

    // ── Chain indicator with polygon bracket ──
    if (this._chainCount >= 2) {
      const chainCol = this._chainCount >= 5 ? COL_GOLD : 0xffcc44;
      // Background bracket
      const cw2 = 50 + this._chainCount * 3;
      this._effectGfx.moveTo(sw / 2 - cw2 / 2, HIT_Y + 52).lineTo(sw / 2 - cw2 / 2 + 5, HIT_Y + 48)
        .lineTo(sw / 2 + cw2 / 2 - 5, HIT_Y + 48).lineTo(sw / 2 + cw2 / 2, HIT_Y + 52).closePath()
        .fill({ color: chainCol, alpha: 0.06 });
      const chainT = new Text({ text: `CHAIN x${this._chainCount}`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: chainCol, fontWeight: "bold" }) });
      chainT.anchor.set(0.5, 0); chainT.position.set(sw / 2, HIT_Y + 55);
      chainT.alpha = 0.7;
      this._textContainer.addChild(chainT);
    }

    // ── Overlays ──
    if (this._phase === "transition") this._drawTransition(sw, sh);
    else if (this._phase === "upgrade") this._drawUpgrade(sw, sh);
    else if (this._phase === "victory") this._drawResults(sw, sh, true);
    else if (this._phase === "defeat") this._drawResults(sw, sh, false);
    else if (this._isPaused) this._drawPause(sw, sh);
  }

  // ── ENEMY DRAWING ──────────────────────────────────────────────────────

  private _drawEnemy(sw: number): void {
    const cx = sw / 2, cy = 110;
    const e = this._enemy;
    const hpPct = e.hp / e.maxHp;
    const pulse = Math.sin(this._time * 3) * 0.05 + 1;
    const hitOff = this._enemyHitFlash > 0 ? (Math.random() - 0.5) * this._enemyHitFlash * 6 : 0;
    const g = this._enemyGfx;
    const bob = Math.sin(this._time * 2) * 3;
    const ex = cx + hitOff;

    // Enemy aura — intensifies as HP drops
    const auraIntensity = 1 + (1 - hpPct) * 0.5;
    g.circle(ex, cy, 60 * pulse * auraIntensity).fill({ color: e.color, alpha: 0.03 * auraIntensity });
    g.circle(ex, cy, 40 * pulse).fill({ color: e.color, alpha: 0.05 });

    // Hit flash overlay
    if (this._enemyHitFlash > 0.3) {
      g.circle(ex, cy, 35).fill({ color: 0xffffff, alpha: (this._enemyHitFlash - 0.3) * 0.4 });
    }

    // Rage indicator when below 30%
    if (hpPct < 0.3) {
      const rageAlpha = 0.05 + 0.03 * Math.sin(this._time * 8);
      g.circle(ex, cy, 50).stroke({ color: 0xff0000, width: 2, alpha: rageAlpha });
      g.circle(ex, cy, 55).stroke({ color: 0xff0000, width: 1, alpha: rageAlpha * 0.5 });
      // Enrage sparks radiating outward
      for (let i = 0; i < 6; i++) {
        const sa = this._time * 4 + i * Math.PI / 3;
        const sr = 40 + Math.sin(this._time * 6 + i) * 8;
        g.circle(ex + Math.cos(sa) * sr, cy + Math.sin(sa) * sr + bob, 1.5)
          .fill({ color: 0xff4444, alpha: 0.15 + 0.1 * Math.sin(this._time * 8 + i) });
      }
    }
    // Enrage text
    if (this._enraged && hpPct > 0) {
      const enrT = new Text({ text: "ENRAGED", style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xff4444, fontWeight: "bold" }) });
      enrT.anchor.set(0.5, 0); enrT.position.set(cx, cy + 70);
      enrT.alpha = 0.5 + 0.3 * Math.sin(this._time * 5);
      this._textContainer.addChild(enrT);
    }

    if (e.sprite === "goblin") {
      // Body (pentagon torso)
      g.moveTo(ex - 10, cy - 4 + bob).lineTo(ex - 14, cy + 10 + bob).lineTo(ex - 6, cy + 22 + bob)
        .lineTo(ex + 6, cy + 22 + bob).lineTo(ex + 14, cy + 10 + bob).lineTo(ex + 10, cy - 4 + bob).closePath()
        .fill({ color: 0x2a6a2a, alpha: 0.65 });
      // Leather vest (inner polygon)
      g.moveTo(ex - 7, cy - 2 + bob).lineTo(ex - 10, cy + 8 + bob).lineTo(ex - 4, cy + 14 + bob)
        .lineTo(ex + 4, cy + 14 + bob).lineTo(ex + 10, cy + 8 + bob).lineTo(ex + 7, cy - 2 + bob).closePath()
        .fill({ color: 0x4a3a1a, alpha: 0.3 });
      // Head
      g.circle(ex, cy - 12 + bob, 12).fill({ color: 0x3a8a3a, alpha: 0.7 });
      // Brow ridge (polygon)
      g.moveTo(ex - 10, cy - 14 + bob).lineTo(ex - 8, cy - 17 + bob).lineTo(ex + 8, cy - 17 + bob)
        .lineTo(ex + 10, cy - 14 + bob).closePath().fill({ color: 0x2a7a2a, alpha: 0.4 });
      // Eyes (slitted)
      g.moveTo(ex - 7, cy - 13 + bob).lineTo(ex - 3, cy - 14 + bob).lineTo(ex - 3, cy - 11 + bob).lineTo(ex - 7, cy - 12 + bob).closePath()
        .fill({ color: 0xff0000, alpha: 0.8 });
      g.moveTo(ex + 7, cy - 13 + bob).lineTo(ex + 3, cy - 14 + bob).lineTo(ex + 3, cy - 11 + bob).lineTo(ex + 7, cy - 12 + bob).closePath()
        .fill({ color: 0xff0000, alpha: 0.8 });
      // Pupils
      g.circle(ex - 5, cy - 12.5 + bob, 1).fill({ color: 0x000000, alpha: 0.7 });
      g.circle(ex + 5, cy - 12.5 + bob, 1).fill({ color: 0x000000, alpha: 0.7 });
      // Pointed ears (sharp polygons)
      g.moveTo(ex - 11, cy - 14 + bob).lineTo(ex - 20, cy - 24 + bob).lineTo(ex - 8, cy - 10 + bob).closePath().fill({ color: 0x3a8a3a, alpha: 0.6 });
      g.moveTo(ex + 11, cy - 14 + bob).lineTo(ex + 20, cy - 24 + bob).lineTo(ex + 8, cy - 10 + bob).closePath().fill({ color: 0x3a8a3a, alpha: 0.6 });
      // Ear inner
      g.moveTo(ex - 12, cy - 15 + bob).lineTo(ex - 17, cy - 22 + bob).lineTo(ex - 9, cy - 12 + bob).closePath().fill({ color: 0x4a5a2a, alpha: 0.3 });
      g.moveTo(ex + 12, cy - 15 + bob).lineTo(ex + 17, cy - 22 + bob).lineTo(ex + 9, cy - 12 + bob).closePath().fill({ color: 0x4a5a2a, alpha: 0.3 });
      // Grinning mouth (jagged polygon teeth)
      g.moveTo(ex - 6, cy - 6 + bob).lineTo(ex - 4, cy - 7 + bob).lineTo(ex - 2, cy - 5 + bob)
        .lineTo(ex, cy - 7 + bob).lineTo(ex + 2, cy - 5 + bob).lineTo(ex + 4, cy - 7 + bob)
        .lineTo(ex + 6, cy - 6 + bob).closePath().fill({ color: 0x1a1a0a, alpha: 0.5 });
      // Fangs
      g.moveTo(ex - 3, cy - 7 + bob).lineTo(ex - 2, cy - 4 + bob).lineTo(ex - 1, cy - 7 + bob).closePath().fill({ color: 0xddddaa, alpha: 0.5 });
      g.moveTo(ex + 1, cy - 7 + bob).lineTo(ex + 2, cy - 4 + bob).lineTo(ex + 3, cy - 7 + bob).closePath().fill({ color: 0xddddaa, alpha: 0.5 });
      // Drum (octagonal)
      const drumY = cy + 15 + bob;
      g.moveTo(ex + 14, drumY);
      for (let i = 1; i <= 8; i++) {
        const da = (i / 8) * Math.PI * 2;
        g.lineTo(ex + Math.cos(da) * 14, drumY + Math.sin(da) * 8);
      }
      g.closePath().fill({ color: 0x6a4a2a, alpha: 0.65 });
      g.ellipse(ex, drumY, 14, 8).stroke({ color: 0x8a6a4a, width: 1.5, alpha: 0.5 });
      // Drum skin pattern (pentagon)
      g.ellipse(ex, drumY - 1, 11, 6).stroke({ color: 0x9a7a5a, width: 0.5, alpha: 0.25 });
      // Drumsticks with motion
      const stickAngle = Math.sin(this._time * this._enemy.bpm / 15) * 0.3;
      g.moveTo(ex - 8, cy + 8 + bob).lineTo(ex - 16 + stickAngle * 10, cy + 2 + bob).stroke({ color: 0x8a7a5a, width: 2.5, alpha: 0.6 });
      g.moveTo(ex + 8, cy + 8 + bob).lineTo(ex + 16 - stickAngle * 10, cy + 2 + bob).stroke({ color: 0x8a7a5a, width: 2.5, alpha: 0.6 });
      // Stick tips
      g.circle(ex - 16 + stickAngle * 10, cy + 2 + bob, 2).fill({ color: 0x9a8a6a, alpha: 0.45 });
      g.circle(ex + 16 - stickAngle * 10, cy + 2 + bob, 2).fill({ color: 0x9a8a6a, alpha: 0.45 });
    } else if (e.sprite === "skeleton") {
      // Skull (polygon — not circle)
      g.moveTo(ex - 9, cy - 14 + bob).lineTo(ex - 10, cy - 20 + bob).lineTo(ex - 7, cy - 26 + bob)
        .lineTo(ex, cy - 28 + bob).lineTo(ex + 7, cy - 26 + bob).lineTo(ex + 10, cy - 20 + bob)
        .lineTo(ex + 9, cy - 14 + bob).lineTo(ex + 5, cy - 12 + bob).lineTo(ex, cy - 11 + bob)
        .lineTo(ex - 5, cy - 12 + bob).closePath().fill({ color: 0xddddcc, alpha: 0.6 });
      // Eye sockets (diamond-shaped voids)
      g.moveTo(ex - 5, cy - 22 + bob).lineTo(ex - 2, cy - 24 + bob).lineTo(ex - 2, cy - 20 + bob)
        .lineTo(ex - 5, cy - 18 + bob).lineTo(ex - 8, cy - 20 + bob).closePath().fill({ color: 0x000000, alpha: 0.8 });
      g.moveTo(ex + 5, cy - 22 + bob).lineTo(ex + 2, cy - 24 + bob).lineTo(ex + 2, cy - 20 + bob)
        .lineTo(ex + 5, cy - 18 + bob).lineTo(ex + 8, cy - 20 + bob).closePath().fill({ color: 0x000000, alpha: 0.8 });
      // Green soul lights in sockets
      g.circle(ex - 4, cy - 21 + bob, 1.5).fill({ color: 0x44ff44, alpha: 0.5 + 0.2 * Math.sin(this._time * 4) });
      g.circle(ex + 4, cy - 21 + bob, 1.5).fill({ color: 0x44ff44, alpha: 0.5 + 0.2 * Math.sin(this._time * 4) });
      // Nose (inverted triangle)
      g.moveTo(ex - 2, cy - 16 + bob).lineTo(ex + 2, cy - 16 + bob).lineTo(ex, cy - 13 + bob).closePath()
        .fill({ color: 0x1a1a0a, alpha: 0.5 });
      // Jaw (separate polygon with teeth)
      g.moveTo(ex - 7, cy - 12 + bob).lineTo(ex - 6, cy - 8 + bob).lineTo(ex + 6, cy - 8 + bob)
        .lineTo(ex + 7, cy - 12 + bob).closePath().fill({ color: 0xccccbb, alpha: 0.45 });
      // Teeth (individual triangles along jaw)
      for (let ti = -3; ti <= 3; ti++) {
        g.moveTo(ex + ti * 2 - 1, cy - 12 + bob).lineTo(ex + ti * 2, cy - 9 + bob).lineTo(ex + ti * 2 + 1, cy - 12 + bob).closePath()
          .fill({ color: 0xeeeedd, alpha: 0.5 });
      }
      // Spine (stacked polygon vertebrae)
      for (let i = 0; i < 6; i++) {
        const vy = cy - 6 + i * 5 + bob;
        const vw = 3 - i * 0.2;
        g.moveTo(ex - vw, vy).lineTo(ex, vy - 2).lineTo(ex + vw, vy).lineTo(ex, vy + 2).closePath()
          .fill({ color: 0xccccbb, alpha: 0.45 - i * 0.03 });
      }
      // Ribcage (polygon ribs — curved pairs)
      for (let i = 0; i < 4; i++) {
        const ry = cy - 2 + i * 5 + bob;
        // Left rib
        g.moveTo(ex - 2, ry).bezierCurveTo(ex - 10, ry - 3, ex - 14, ry, ex - 12, ry + 3)
          .stroke({ color: 0xbbbbaa, width: 1.5, alpha: 0.4 });
        // Right rib
        g.moveTo(ex + 2, ry).bezierCurveTo(ex + 10, ry - 3, ex + 14, ry, ex + 12, ry + 3)
          .stroke({ color: 0xbbbbaa, width: 1.5, alpha: 0.4 });
      }
      // Arms (segmented bones)
      for (const dir of [-1, 1]) {
        // Upper arm
        g.moveTo(ex + dir * 3, cy - 2 + bob).lineTo(ex + dir * 12, cy + 4 + bob)
          .stroke({ color: 0xbbbbaa, width: 2, alpha: 0.4 });
        // Joint dot
        g.circle(ex + dir * 12, cy + 4 + bob, 1.5).fill({ color: 0xccccbb, alpha: 0.35 });
        // Forearm
        g.moveTo(ex + dir * 12, cy + 4 + bob).lineTo(ex + dir * 16, cy + 14 + bob)
          .stroke({ color: 0xbbbbaa, width: 1.5, alpha: 0.35 });
        // Hand (pentagon)
        g.moveTo(ex + dir * 15, cy + 14 + bob).lineTo(ex + dir * 14, cy + 17 + bob)
          .lineTo(ex + dir * 16, cy + 19 + bob).lineTo(ex + dir * 18, cy + 17 + bob)
          .lineTo(ex + dir * 17, cy + 14 + bob).closePath().fill({ color: 0xccccbb, alpha: 0.3 });
      }
      // Bone pipe (polygon — flute shape)
      const pipeX = ex + 18;
      g.moveTo(pipeX, cy - 14 + bob).lineTo(pipeX + 2, cy - 14 + bob).lineTo(pipeX + 3, cy + 12 + bob)
        .lineTo(pipeX - 1, cy + 12 + bob).closePath().fill({ color: 0x9a9a8a, alpha: 0.4 });
      // Pipe holes
      for (let h = 0; h < 4; h++) {
        g.circle(pipeX + 1, cy - 8 + h * 5 + bob, 1).fill({ color: 0x2a2a1a, alpha: 0.35 });
      }
      // Musical notes floating out (diamond-shaped notes)
      for (let n2 = 0; n2 < 3; n2++) {
        const noteX = pipeX + 6 + Math.sin(this._time * 2 + n2 * 2) * 8;
        const noteY2 = cy - 14 - n2 * 8 + Math.sin(this._time * 3 + n2) * 4 + bob;
        const noteA = 0.3 - n2 * 0.08;
        g.moveTo(noteX, noteY2 - 2).lineTo(noteX + 2, noteY2).lineTo(noteX, noteY2 + 2).lineTo(noteX - 2, noteY2).closePath()
          .fill({ color: 0xaaffaa, alpha: noteA });
        g.moveTo(noteX + 2, noteY2).lineTo(noteX + 2, noteY2 - 5).stroke({ color: 0xaaffaa, width: 0.5, alpha: noteA });
      }
    } else if (e.sprite === "elf") {
      // Robe (layered polygon — outer cloak)
      g.moveTo(ex - 16, cy + 2 + bob).lineTo(ex - 14, cy - 12 + bob).lineTo(ex - 4, cy - 22 + bob)
        .lineTo(ex + 4, cy - 22 + bob).lineTo(ex + 14, cy - 12 + bob).lineTo(ex + 16, cy + 2 + bob)
        .lineTo(ex + 12, cy + 26 + bob).lineTo(ex - 12, cy + 26 + bob).closePath()
        .fill({ color: 0x3a1a5a, alpha: 0.55 });
      // Inner robe layer
      g.moveTo(ex - 10, cy - 4 + bob).lineTo(ex - 6, cy - 14 + bob).lineTo(ex + 6, cy - 14 + bob)
        .lineTo(ex + 10, cy - 4 + bob).lineTo(ex + 8, cy + 22 + bob).lineTo(ex - 8, cy + 22 + bob).closePath()
        .fill({ color: 0x2a0a4a, alpha: 0.3 });
      // Robe trim (zigzag polygon at hem)
      for (let zi = -10; zi <= 10; zi += 4) {
        g.moveTo(ex + zi - 2, cy + 26 + bob).lineTo(ex + zi, cy + 30 + bob).lineTo(ex + zi + 2, cy + 26 + bob).closePath()
          .fill({ color: COL_GOLD, alpha: 0.08 });
      }
      // Head
      g.circle(ex, cy - 20 + bob, 9).fill({ color: 0xccbbdd, alpha: 0.6 });
      // Hair (flowing polygon strands)
      g.moveTo(ex - 6, cy - 26 + bob).bezierCurveTo(ex - 10, cy - 22, ex - 12, cy - 14, ex - 10, cy - 8 + bob)
        .lineTo(ex - 8, cy - 8 + bob).bezierCurveTo(ex - 10, cy - 14, ex - 8, cy - 20, ex - 4, cy - 26 + bob).closePath()
        .fill({ color: 0x9988bb, alpha: 0.25 });
      g.moveTo(ex + 6, cy - 26 + bob).bezierCurveTo(ex + 10, cy - 22, ex + 12, cy - 14, ex + 10, cy - 8 + bob)
        .lineTo(ex + 8, cy - 8 + bob).bezierCurveTo(ex + 10, cy - 14, ex + 8, cy - 20, ex + 4, cy - 26 + bob).closePath()
        .fill({ color: 0x9988bb, alpha: 0.25 });
      // Elegant eyes (almond-shaped polygons)
      g.moveTo(ex - 6, cy - 21 + bob).lineTo(ex - 3, cy - 22 + bob).lineTo(ex - 1, cy - 21 + bob)
        .lineTo(ex - 3, cy - 20 + bob).closePath().fill({ color: 0xeeddff, alpha: 0.5 });
      g.moveTo(ex + 6, cy - 21 + bob).lineTo(ex + 3, cy - 22 + bob).lineTo(ex + 1, cy - 21 + bob)
        .lineTo(ex + 3, cy - 20 + bob).closePath().fill({ color: 0xeeddff, alpha: 0.5 });
      g.circle(ex - 3.5, cy - 21 + bob, 1.2).fill({ color: 0x8844cc, alpha: 0.9 });
      g.circle(ex + 3.5, cy - 21 + bob, 1.2).fill({ color: 0x8844cc, alpha: 0.9 });
      // Pointed ears (polygon)
      g.moveTo(ex - 9, cy - 20 + bob).lineTo(ex - 18, cy - 28 + bob).lineTo(ex - 7, cy - 16 + bob).closePath().fill({ color: 0xccbbdd, alpha: 0.5 });
      g.moveTo(ex + 9, cy - 20 + bob).lineTo(ex + 18, cy - 28 + bob).lineTo(ex + 7, cy - 16 + bob).closePath().fill({ color: 0xccbbdd, alpha: 0.5 });
      // Ear inner detail
      g.moveTo(ex - 10, cy - 21 + bob).lineTo(ex - 15, cy - 26 + bob).lineTo(ex - 8, cy - 17 + bob).closePath()
        .fill({ color: 0xddccee, alpha: 0.2 });
      g.moveTo(ex + 10, cy - 21 + bob).lineTo(ex + 15, cy - 26 + bob).lineTo(ex + 8, cy - 17 + bob).closePath()
        .fill({ color: 0xddccee, alpha: 0.2 });
      // Circlet/tiara (polygon band with gem)
      g.moveTo(ex - 7, cy - 26 + bob).lineTo(ex - 6, cy - 28 + bob).lineTo(ex + 6, cy - 28 + bob)
        .lineTo(ex + 7, cy - 26 + bob).closePath().fill({ color: COL_GOLD, alpha: 0.35 });
      // Gem (diamond)
      g.moveTo(ex, cy - 28 + bob).lineTo(ex + 2, cy - 30 + bob).lineTo(ex, cy - 32 + bob).lineTo(ex - 2, cy - 30 + bob).closePath()
        .fill({ color: 0xcc88ff, alpha: 0.6 });
      // Harp (polygon frame with strings)
      const harpX = ex - 20, harpY = cy - 6 + bob;
      // Frame (curved polygon)
      g.moveTo(harpX, harpY + 18).lineTo(harpX - 2, harpY).bezierCurveTo(harpX - 4, harpY - 8, harpX, harpY - 14, harpX + 6, harpY - 12)
        .lineTo(harpX + 4, harpY - 10).stroke({ color: COL_GOLD, width: 1.8, alpha: 0.5 });
      // Bottom bar
      g.moveTo(harpX, harpY + 18).lineTo(harpX + 4, harpY - 10).stroke({ color: COL_GOLD, width: 1, alpha: 0.4 });
      // Strings (polygon-like angled lines)
      for (let s = 0; s < 5; s++) {
        const t2 = s / 4;
        const sx = harpX - 1 + t2 * 5;
        const sy1 = harpY - 2 - t2 * 8;
        const sy2 = harpY + 16 - t2 * 12;
        const vib = Math.sin(this._time * 12 + s * 1.8) * (this._combo > 0 ? 0.6 : 0.15);
        g.moveTo(sx + vib, sy1).lineTo(sx - vib, sy2).stroke({ color: COL_GOLD, width: 0.4, alpha: 0.35 });
      }
      // Magic sparkles (diamond-shaped, orbiting)
      for (let i = 0; i < 5; i++) {
        const sa = this._time * 2 + i * 1.3;
        const sr = 28 + Math.sin(sa * 1.5) * 8;
        const sx = ex + Math.cos(sa) * sr;
        const sy = cy + Math.sin(sa) * sr + bob;
        // Diamond sparkle
        g.moveTo(sx, sy - 2).lineTo(sx + 1.5, sy).lineTo(sx, sy + 2).lineTo(sx - 1.5, sy).closePath()
          .fill({ color: 0xcc88ff, alpha: 0.25 + 0.1 * Math.sin(this._time * 5 + i) });
      }
      // Runic circle at feet
      const runeR = 18 + Math.sin(this._time * 1.5) * 2;
      const runeY = cy + 20 + bob;
      for (let s = 0; s < 8; s++) {
        const a1 = (s / 8) * Math.PI * 2 + this._time * 0.5;
        const a2 = ((s + 1) / 8) * Math.PI * 2 + this._time * 0.5;
        g.moveTo(ex + Math.cos(a1) * runeR, runeY + Math.sin(a1) * runeR * 0.3)
          .lineTo(ex + Math.cos(a2) * runeR, runeY + Math.sin(a2) * runeR * 0.3)
          .stroke({ color: 0xcc88ff, width: 0.6, alpha: 0.12 });
      }
    } else if (e.sprite === "dragon") {
      // Body — elongated hexagonal polygon
      g.moveTo(ex - 20, cy + 5 + bob).lineTo(ex - 26, cy + bob).lineTo(ex - 18, cy - 8 + bob)
        .lineTo(ex + 12, cy - 10 + bob).lineTo(ex + 22, cy - 2 + bob).lineTo(ex + 18, cy + 10 + bob)
        .lineTo(ex, cy + 16 + bob).lineTo(ex - 14, cy + 14 + bob).closePath()
        .fill({ color: 0x8a2200, alpha: 0.6 });
      // Belly (lighter polygon)
      g.moveTo(ex - 14, cy + 2 + bob).lineTo(ex - 8, cy - 2 + bob).lineTo(ex + 8, cy - 2 + bob)
        .lineTo(ex + 12, cy + 4 + bob).lineTo(ex + 6, cy + 12 + bob).lineTo(ex - 8, cy + 12 + bob).closePath()
        .fill({ color: 0xcc5533, alpha: 0.2 });
      // Scale pattern (rows of small diamonds on body)
      for (let sy = -6; sy <= 8; sy += 4) {
        for (let sx = -16; sx <= 14; sx += 6) {
          g.moveTo(ex + sx, cy + sy + bob).lineTo(ex + sx + 2, cy + sy + 2 + bob)
            .lineTo(ex + sx, cy + sy + 4 + bob).lineTo(ex + sx - 2, cy + sy + 2 + bob).closePath()
            .fill({ color: 0x6a1a00, alpha: 0.15 });
        }
      }
      // Head — angular polygon snout
      g.moveTo(ex + 18, cy - 6 + bob).lineTo(ex + 26, cy - 14 + bob).lineTo(ex + 34, cy - 12 + bob)
        .lineTo(ex + 36, cy - 6 + bob).lineTo(ex + 32, cy - 2 + bob).lineTo(ex + 22, cy + bob).closePath()
        .fill({ color: 0xaa3300, alpha: 0.6 });
      // Jaw (separate polygon)
      g.moveTo(ex + 22, cy + bob).lineTo(ex + 32, cy - 2 + bob).lineTo(ex + 35, cy + 2 + bob)
        .lineTo(ex + 28, cy + 4 + bob).closePath().fill({ color: 0x882200, alpha: 0.5 });
      // Teeth (small triangles along jaw line)
      for (let ti = 0; ti < 4; ti++) {
        const tx = ex + 24 + ti * 3;
        g.moveTo(tx, cy - 2 + bob).lineTo(tx + 1.5, cy + 2 + bob).lineTo(tx - 1.5, cy + 2 + bob).closePath()
          .fill({ color: 0xddddcc, alpha: 0.3 });
      }
      // Horns (polygon spikes)
      g.moveTo(ex + 26, cy - 14 + bob).lineTo(ex + 22, cy - 24 + bob).lineTo(ex + 28, cy - 16 + bob).closePath()
        .fill({ color: 0x5a2a00, alpha: 0.5 });
      g.moveTo(ex + 30, cy - 13 + bob).lineTo(ex + 32, cy - 22 + bob).lineTo(ex + 33, cy - 14 + bob).closePath()
        .fill({ color: 0x5a2a00, alpha: 0.45 });
      // Eyes (slit pupils)
      g.moveTo(ex + 27, cy - 10 + bob).lineTo(ex + 29, cy - 12 + bob).lineTo(ex + 31, cy - 10 + bob)
        .lineTo(ex + 29, cy - 8 + bob).closePath().fill({ color: 0xffcc00, alpha: 0.9 });
      g.moveTo(ex + 29, cy - 11 + bob).lineTo(ex + 29.5, cy - 9 + bob).stroke({ color: 0x000000, width: 0.8, alpha: 0.7 });
      // Wings — polygon membrane with finger bones
      const wingFlap = Math.sin(this._time * 3) * 6;
      // Left wing
      g.moveTo(ex - 8, cy - 6 + bob)
        .lineTo(ex - 22, cy - 28 - wingFlap + bob).lineTo(ex - 30, cy - 32 - wingFlap + bob)
        .lineTo(ex - 38, cy - 25 - wingFlap + bob).lineTo(ex - 35, cy - 10 + bob)
        .lineTo(ex - 24, cy + 2 + bob).closePath().fill({ color: 0x661100, alpha: 0.35 });
      // Wing finger bones
      g.moveTo(ex - 8, cy - 6 + bob).lineTo(ex - 30, cy - 32 - wingFlap + bob).stroke({ color: 0x883322, width: 1, alpha: 0.3 });
      g.moveTo(ex - 8, cy - 6 + bob).lineTo(ex - 38, cy - 25 - wingFlap + bob).stroke({ color: 0x883322, width: 0.8, alpha: 0.25 });
      // Right wing
      g.moveTo(ex + 10, cy - 8 + bob)
        .lineTo(ex + 18, cy - 30 - wingFlap + bob).lineTo(ex + 26, cy - 34 - wingFlap + bob)
        .lineTo(ex + 20, cy - 20 + bob).closePath().fill({ color: 0x661100, alpha: 0.3 });
      g.moveTo(ex + 10, cy - 8 + bob).lineTo(ex + 26, cy - 34 - wingFlap + bob).stroke({ color: 0x883322, width: 0.8, alpha: 0.25 });
      // Tail (segmented polygon)
      g.moveTo(ex - 20, cy + 6 + bob).lineTo(ex - 28, cy + 12 + bob).lineTo(ex - 36, cy + 10 + bob)
        .lineTo(ex - 42, cy + 6 + bob).lineTo(ex - 44, cy + 2 + bob)
        .lineTo(ex - 40, cy + 4 + bob).lineTo(ex - 34, cy + 8 + bob).lineTo(ex - 26, cy + 8 + bob).closePath()
        .fill({ color: 0x8a2200, alpha: 0.45 });
      // Tail spike
      g.moveTo(ex - 44, cy + 2 + bob).lineTo(ex - 50, cy - 2 + bob).lineTo(ex - 46, cy + 4 + bob).closePath()
        .fill({ color: 0x5a1a00, alpha: 0.4 });
      // Fire breath (layered polygon flames)
      const fireAlpha = 0.2 + 0.1 * Math.sin(this._time * 6);
      g.moveTo(ex + 35, cy - 4 + bob).lineTo(ex + 48, cy - 10 + bob).lineTo(ex + 52, cy - 6 + bob)
        .lineTo(ex + 48, cy + bob).lineTo(ex + 42, cy + 2 + bob).closePath()
        .fill({ color: 0xff6600, alpha: fireAlpha });
      g.moveTo(ex + 48, cy - 8 + bob).lineTo(ex + 58, cy - 6 + bob).lineTo(ex + 54, cy - 2 + bob)
        .lineTo(ex + 48, cy + bob).closePath().fill({ color: 0xffaa00, alpha: fireAlpha * 0.6 });
      g.moveTo(ex + 54, cy - 5 + bob).lineTo(ex + 62, cy - 3 + bob).lineTo(ex + 58, cy + bob).closePath()
        .fill({ color: 0xffdd44, alpha: fireAlpha * 0.3 });
    } else {
      // Mordred — dark armored king with crown and cursed sword
      // Cape (flowing polygon)
      const capeWave = Math.sin(this._time * 1.8) * 3;
      g.moveTo(ex - 14, cy - 8 + bob).lineTo(ex - 20, cy + 28 + bob + capeWave).lineTo(ex - 16, cy + 30 + bob - capeWave)
        .lineTo(ex, cy + 32 + bob).lineTo(ex + 16, cy + 30 + bob + capeWave).lineTo(ex + 20, cy + 28 + bob - capeWave)
        .lineTo(ex + 14, cy - 8 + bob).closePath().fill({ color: 0x0a0a1a, alpha: 0.5 });
      // Cape inner lining (red)
      g.moveTo(ex - 12, cy - 4 + bob).lineTo(ex - 16, cy + 24 + bob).lineTo(ex, cy + 28 + bob)
        .lineTo(ex + 16, cy + 24 + bob).lineTo(ex + 12, cy - 4 + bob).closePath()
        .fill({ color: 0x4a0a0a, alpha: 0.2 });
      // Armor body (hexagonal plate)
      g.moveTo(ex - 10, cy - 8 + bob).lineTo(ex - 14, cy + 6 + bob).lineTo(ex - 10, cy + 20 + bob)
        .lineTo(ex + 10, cy + 20 + bob).lineTo(ex + 14, cy + 6 + bob).lineTo(ex + 10, cy - 8 + bob).closePath()
        .fill({ color: 0x1a1a2a, alpha: 0.7 });
      // Armor plate lines
      g.moveTo(ex - 8, cy - 4 + bob).lineTo(ex + 8, cy - 4 + bob).stroke({ color: 0x2a2a3a, width: 0.8, alpha: 0.3 });
      g.moveTo(ex - 10, cy + 4 + bob).lineTo(ex + 10, cy + 4 + bob).stroke({ color: 0x2a2a3a, width: 0.8, alpha: 0.3 });
      // Chest emblem (evil diamond)
      g.moveTo(ex, cy - 2 + bob).lineTo(ex + 5, cy + 3 + bob).lineTo(ex, cy + 8 + bob).lineTo(ex - 5, cy + 3 + bob).closePath()
        .fill({ color: 0xff2244, alpha: 0.2 });
      g.moveTo(ex, cy - 2 + bob).lineTo(ex + 5, cy + 3 + bob).lineTo(ex, cy + 8 + bob).lineTo(ex - 5, cy + 3 + bob).closePath()
        .stroke({ color: 0xff2244, width: 0.8, alpha: 0.4 });
      // Shoulder pauldrons (polygon)
      for (const dir of [-1, 1]) {
        g.moveTo(ex + dir * 10, cy - 8 + bob).lineTo(ex + dir * 18, cy - 10 + bob).lineTo(ex + dir * 20, cy - 4 + bob)
          .lineTo(ex + dir * 16, cy + 2 + bob).lineTo(ex + dir * 10, cy + bob).closePath()
          .fill({ color: 0x2a2a3a, alpha: 0.5 });
        // Pauldron spike
        g.moveTo(ex + dir * 18, cy - 10 + bob).lineTo(ex + dir * 22, cy - 16 + bob).lineTo(ex + dir * 20, cy - 8 + bob).closePath()
          .fill({ color: 0x2a2a3a, alpha: 0.4 });
      }
      // Head (helmet)
      g.circle(ex, cy - 16 + bob, 11).fill({ color: 0x2a2a3a, alpha: 0.7 });
      // Visor slit (polygon)
      g.moveTo(ex - 8, cy - 17 + bob).lineTo(ex + 8, cy - 17 + bob).lineTo(ex + 7, cy - 14 + bob).lineTo(ex - 7, cy - 14 + bob).closePath()
        .fill({ color: 0x0a0a14, alpha: 0.6 });
      // Crown (five pointed polygon)
      for (let i = 0; i < 5; i++) {
        const dx = -8 + i * 4;
        g.moveTo(ex + dx - 2, cy - 26 + bob).lineTo(ex + dx, cy - 34 + bob).lineTo(ex + dx + 2, cy - 26 + bob).closePath()
          .fill({ color: COL_GOLD, alpha: 0.55 });
      }
      // Crown band
      g.moveTo(ex - 10, cy - 26 + bob).lineTo(ex + 10, cy - 26 + bob).lineTo(ex + 10, cy - 24 + bob).lineTo(ex - 10, cy - 24 + bob).closePath()
        .fill({ color: COL_GOLD, alpha: 0.35 });
      // Crown gems
      g.circle(ex, cy - 25 + bob, 1.5).fill({ color: 0xff2244, alpha: 0.6 });
      g.circle(ex - 6, cy - 25 + bob, 1).fill({ color: 0x4488ff, alpha: 0.5 });
      g.circle(ex + 6, cy - 25 + bob, 1).fill({ color: 0x4488ff, alpha: 0.5 });
      // Glowing red eyes through visor
      g.circle(ex - 4, cy - 16 + bob, 2).fill({ color: 0xff2244, alpha: 0.9 });
      g.circle(ex + 4, cy - 16 + bob, 2).fill({ color: 0xff2244, alpha: 0.9 });
      g.circle(ex - 4, cy - 16 + bob, 4).fill({ color: 0xff2244, alpha: 0.08 });
      g.circle(ex + 4, cy - 16 + bob, 4).fill({ color: 0xff2244, alpha: 0.08 });
      // Dark aura hexagonal rings
      const auraAngle = this._time * 1.5;
      for (let ring = 0; ring < 2; ring++) {
        const rr = 40 + ring * 15;
        const ra = 0.06 + 0.03 * Math.sin(this._time * 4 + ring);
        g.moveTo(ex + rr, cy + bob);
        for (let s = 1; s <= 6; s++) {
          const a = auraAngle + (s / 6) * Math.PI * 2;
          g.lineTo(ex + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5 + bob);
        }
        g.closePath().stroke({ color: 0xff2244, width: 1 + ring * 0.5, alpha: ra });
      }
      // Cursed sword (polygon blade + crossguard)
      const swordAngle = Math.sin(this._time * 2) * 0.3;
      const sx2 = ex + 18 + swordAngle * 5;
      // Blade (polygon with taper)
      g.moveTo(sx2 - 1.5, cy - 8 + bob).lineTo(sx2, cy - 20 + bob).lineTo(sx2 + 1.5, cy - 8 + bob)
        .lineTo(sx2 + 2, cy + 18 + bob).lineTo(sx2 - 2, cy + 18 + bob).closePath()
        .fill({ color: 0x888899, alpha: 0.5 });
      // Blood groove
      g.moveTo(sx2, cy - 6 + bob).lineTo(sx2, cy + 14 + bob).stroke({ color: 0xff2244, width: 0.8, alpha: 0.3 });
      // Crossguard (polygon)
      g.moveTo(sx2 - 6, cy - 8 + bob).lineTo(sx2 - 5, cy - 10 + bob).lineTo(sx2 + 5, cy - 10 + bob)
        .lineTo(sx2 + 6, cy - 8 + bob).lineTo(sx2 + 5, cy - 6 + bob).lineTo(sx2 - 5, cy - 6 + bob).closePath()
        .fill({ color: 0x4a4a5a, alpha: 0.45 });
      // Pommel gem
      g.circle(sx2, cy + 20 + bob, 2).fill({ color: 0xff2244, alpha: 0.4 });
      // Dark orbs orbiting
      for (let i = 0; i < 3; i++) {
        const oa = this._time * 1.5 + i * Math.PI * 2 / 3;
        const or = 30 + Math.sin(this._time * 3 + i) * 5;
        g.circle(ex + Math.cos(oa) * or, cy + Math.sin(oa) * or * 0.5 + bob, 3).fill({ color: 0xff2244, alpha: 0.12 });
        g.circle(ex + Math.cos(oa) * or, cy + Math.sin(oa) * or * 0.5 + bob, 6).fill({ color: 0xff2244, alpha: 0.03 });
      }
    }

    // HP bar — segmented with animated fill
    const hpW = 240, hpH = 14, hpX = cx - hpW / 2, hpY = cy + 52;
    // Dark background
    g.roundRect(hpX, hpY, hpW, hpH, 5).fill({ color: 0x0a0a0a, alpha: 0.9 });
    // Inner shadow
    g.roundRect(hpX + 1, hpY + 1, hpW - 2, hpH - 2, 4).fill({ color: 0x000000, alpha: 0.3 });
    if (hpPct > 0) {
      const hpCol = hpPct > 0.5 ? e.color : hpPct > 0.25 ? 0xffaa44 : 0xff4444;
      const fillW = (hpW - 2) * hpPct;
      // Main fill
      g.roundRect(hpX + 1, hpY + 1, fillW, hpH - 2, 4).fill({ color: hpCol, alpha: 0.85 });
      // Top shine
      g.roundRect(hpX + 1, hpY + 1, fillW, (hpH - 2) * 0.4, 3).fill({ color: 0xffffff, alpha: 0.1 });
      // Animated shimmer line moving across
      const shimX = ((this._time * 80) % (fillW + 20)) - 10;
      if (shimX > 0 && shimX < fillW) {
        g.rect(hpX + 1 + shimX - 3, hpY + 2, 6, hpH - 4).fill({ color: 0xffffff, alpha: 0.08 });
      }
    }
    // Phase markers at 75%, 50%, 25%
    for (const pct of [0.25, 0.5, 0.75]) {
      const mx = hpX + 1 + (hpW - 2) * pct;
      g.moveTo(mx, hpY).lineTo(mx, hpY + hpH).stroke({ color: 0x000000, width: 1, alpha: 0.4 });
      g.moveTo(mx, hpY + 1).lineTo(mx, hpY + 3).stroke({ color: 0xffffff, width: 0.5, alpha: 0.1 });
    }
    // Border
    g.roundRect(hpX, hpY, hpW, hpH, 5).stroke({ color: e.color, width: 1.5, alpha: 0.4 });
    // Corner ornaments
    for (const [ox, oy] of [[hpX - 2, hpY + hpH / 2], [hpX + hpW + 2, hpY + hpH / 2]]) {
      g.moveTo(ox, oy - 3).lineTo(ox + (ox < cx ? -3 : 3), oy).lineTo(ox, oy + 3).closePath()
        .fill({ color: e.color, alpha: 0.3 });
    }

    // Enemy name & info
    const nameT = new Text({ text: e.name, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: e.color, fontWeight: "bold", letterSpacing: 2 }) });
    nameT.anchor.set(0.5, 0); nameT.position.set(cx, hpY + 16);
    this._textContainer.addChild(nameT);

    const actT = new Text({ text: `${e.title}  ${e.bpm} BPM`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x887799 }) });
    actT.anchor.set(0.5, 0); actT.position.set(cx, hpY + 30);
    this._textContainer.addChild(actT);

    const hpT = new Text({ text: `${e.hp} / ${e.maxHp}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xaaaaaa }) });
    hpT.anchor.set(0.5, 0.5); hpT.position.set(cx, hpY + hpH / 2);
    this._textContainer.addChild(hpT);

    // Boss taunt speech bubble
    if (this._tauntLife > 0 && this._currentTaunt) {
      const tauntAlpha = Math.min(1, this._tauntLife / 0.5) * Math.min(1, (3 - this._tauntLife + 0.5));
      // Speech bubble bg
      const bubbleW = Math.min(220, this._currentTaunt.length * 6.5 + 20);
      const bubbleH = 22;
      const bx = cx - bubbleW / 2, by = cy - 55;
      g.roundRect(bx, by, bubbleW, bubbleH, 6).fill({ color: 0x000000, alpha: tauntAlpha * 0.7 });
      g.roundRect(bx, by, bubbleW, bubbleH, 6).stroke({ color: e.color, width: 1, alpha: tauntAlpha * 0.4 });
      // Tail pointing down to enemy
      g.moveTo(cx - 5, by + bubbleH).lineTo(cx, by + bubbleH + 6).lineTo(cx + 5, by + bubbleH).closePath()
        .fill({ color: 0x000000, alpha: tauntAlpha * 0.7 });
      const tauntT = new Text({ text: this._currentTaunt, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: e.color, fontStyle: "italic" }) });
      tauntT.anchor.set(0.5, 0.5); tauntT.position.set(cx, by + bubbleH / 2);
      tauntT.alpha = tauntAlpha;
      this._textContainer.addChild(tauntT);
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────────

  private _drawHUD(sw: number, sh: number): void {
    const g = this._hudGfx;
    const hx = sw / 2 - HIGHWAY_W / 2;

    // Score + high score
    const scoreT = new Text({ text: `SCORE  ${this._score}`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: COL_GOLD, fontWeight: "bold", letterSpacing: 1 }) });
    scoreT.anchor.set(1, 0); scoreT.position.set(sw - 16, 10);
    this._textContainer.addChild(scoreT);
    if (this._highScore > 0) {
      const hiT = new Text({ text: `HI ${this._highScore}${this._isNewHighScore ? " \u2726NEW" : ""}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: this._isNewHighScore ? COL_GOLD : 0x556677 }) });
      hiT.anchor.set(1, 0); hiT.position.set(sw - 16, 24);
      this._textContainer.addChild(hiT);
    }

    // Combo
    if (this._combo > 0) {
      const comboSize = Math.min(26, 14 + this._combo * 0.25);
      const comboCol = this._combo >= 30 ? 0xff88ff : this._combo >= 20 ? 0xcc88ff : this._combo >= 10 ? COL_GOLD : 0x44ff88;
      const comboT = new Text({ text: `${this._combo}x`, style: new TextStyle({ fontFamily: FONT, fontSize: comboSize, fill: comboCol, fontWeight: "bold" }) });
      comboT.anchor.set(1, 0); comboT.position.set(sw - 16, 28);
      this._textContainer.addChild(comboT);
    }

    // Health bar (left side) with heart polygon icon
    const barW = 130, barH = 12, barX = 14, barY = 10;
    // Heart icon (polygon)
    const hiX = barX - 1, hiY = barY + barH / 2;
    g.moveTo(hiX, hiY - 1).bezierCurveTo(hiX, hiY - 4, hiX - 4, hiY - 5, hiX - 4, hiY - 2)
      .bezierCurveTo(hiX - 4, hiY + 1, hiX, hiY + 4, hiX, hiY + 4)
      .bezierCurveTo(hiX, hiY + 4, hiX + 4, hiY + 1, hiX + 4, hiY - 2)
      .bezierCurveTo(hiX + 4, hiY - 5, hiX, hiY - 4, hiX, hiY - 1).closePath()
      .fill({ color: 0xff4444, alpha: 0.35 });
    g.roundRect(barX, barY, barW, barH, 4).fill({ color: 0x0a0a0a, alpha: 0.85 });
    const hpPct = this._health / this._maxHealth;
    if (hpPct > 0) {
      const hpCol = hpPct > 0.5 ? 0x44aa44 : hpPct > 0.25 ? 0xffaa44 : 0xff4444;
      g.roundRect(barX + 1, barY + 1, (barW - 2) * hpPct, barH - 2, 3).fill({ color: hpCol, alpha: 0.85 });
    }
    g.roundRect(barX, barY, barW, barH, 4).stroke({ color: 0x44aa44, width: 1, alpha: 0.35 });
    // Diamond end caps
    g.moveTo(barX - 4, barY + barH / 2).lineTo(barX, barY + barH / 2 - 4).lineTo(barX, barY + barH / 2 + 4).closePath()
      .fill({ color: 0x44aa44, alpha: 0.2 });
    g.moveTo(barX + barW + 4, barY + barH / 2).lineTo(barX + barW, barY + barH / 2 - 4).lineTo(barX + barW, barY + barH / 2 + 4).closePath()
      .fill({ color: 0x44aa44, alpha: 0.2 });
    const hpLabel = new Text({ text: `\u2665 ${this._health}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xcccccc }) });
    hpLabel.anchor.set(0.5, 0.5); hpLabel.position.set(barX + barW / 2, barY + barH / 2);
    this._textContainer.addChild(hpLabel);

    // Mana bar (below health) with diamond mana icon
    const manaY = barY + barH + 4;
    // Mana diamond icon
    const miX = barX - 1, miY = manaY + barH / 2;
    g.moveTo(miX, miY - 4).lineTo(miX + 3, miY).lineTo(miX, miY + 4).lineTo(miX - 3, miY).closePath()
      .fill({ color: 0x4488ff, alpha: 0.3 });
    g.moveTo(miX, miY - 2).lineTo(miX + 1.5, miY).lineTo(miX, miY + 2).lineTo(miX - 1.5, miY).closePath()
      .fill({ color: 0x88bbff, alpha: 0.2 });
    g.roundRect(barX, manaY, barW, barH, 4).fill({ color: 0x0a0a0a, alpha: 0.85 });
    const manaPct = this._mana / this._maxMana;
    if (manaPct > 0) {
      g.roundRect(barX + 1, manaY + 1, (barW - 2) * manaPct, barH - 2, 3).fill({ color: 0x4466cc, alpha: 0.85 });
    }
    g.roundRect(barX, manaY, barW, barH, 4).stroke({ color: 0x4466cc, width: 1, alpha: 0.35 });
    // Diamond end caps
    g.moveTo(barX - 4, manaY + barH / 2).lineTo(barX, manaY + barH / 2 - 4).lineTo(barX, manaY + barH / 2 + 4).closePath()
      .fill({ color: 0x4466cc, alpha: 0.2 });
    g.moveTo(barX + barW + 4, manaY + barH / 2).lineTo(barX + barW, manaY + barH / 2 - 4).lineTo(barX + barW, manaY + barH / 2 + 4).closePath()
      .fill({ color: 0x4466cc, alpha: 0.2 });
    const manaLabel = new Text({ text: `\u2726 ${Math.floor(this._mana)}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xaabbdd }) });
    manaLabel.anchor.set(0.5, 0.5); manaLabel.position.set(barX + barW / 2, manaY + barH / 2);
    this._textContainer.addChild(manaLabel);

    // Shield indicator
    if (this._shield > 0) {
      const shieldT = new Text({ text: `\u{1F6E1}x${this._shield}`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x4488ff, fontWeight: "bold" }) });
      shieldT.position.set(barX, manaY + barH + 4);
      this._textContainer.addChild(shieldT);
    }

    // Multiplier badge
    if (this._multiplier > 1) {
      const multCol = this._multiplier >= 4 ? 0xff88ff : this._multiplier >= 3 ? 0xcc88ff : COL_GOLD;
      g.roundRect(barX, manaY + barH + (this._shield > 0 ? 20 : 4), 50, 16, 3)
        .fill({ color: multCol, alpha: 0.15 })
        .roundRect(barX, manaY + barH + (this._shield > 0 ? 20 : 4), 50, 16, 3)
        .stroke({ color: multCol, width: 1, alpha: 0.5 });
      const multT = new Text({ text: `x${this._multiplier}`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: multCol, fontWeight: "bold" }) });
      multT.anchor.set(0.5, 0.5); multT.position.set(barX + 25, manaY + barH + (this._shield > 0 ? 28 : 12));
      this._textContainer.addChild(multT);
    }

    // Dodge cooldown indicator
    if (this._dodgeCooldown > 0) {
      const dodgeT = new Text({ text: `DODGE ${this._dodgeCooldown.toFixed(1)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x556677 }) });
      dodgeT.position.set(barX, manaY + barH + (this._shield > 0 ? 36 : 20) + (this._multiplier > 1 ? 18 : 0));
      this._textContainer.addChild(dodgeT);
    } else {
      const dodgeT = new Text({ text: "[SPACE] DODGE", style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x88ccff }) });
      dodgeT.position.set(barX, manaY + barH + (this._shield > 0 ? 36 : 20) + (this._multiplier > 1 ? 18 : 0));
      this._textContainer.addChild(dodgeT);
    }
    // Dodge active flash
    if (this._dodgeTimer > 0) {
      g.rect(hx - 2, HIT_Y - 16, HIGHWAY_W + 4, 32).stroke({ color: 0x88ccff, width: 2, alpha: 0.4 });
    }

    // Time slow indicator
    if (this._timeSlowTimer > 0) {
      const slowT = new Text({ text: `\u231B SLOW ${this._timeSlowTimer.toFixed(1)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x88ccff, fontWeight: "bold" }) });
      slowT.anchor.set(0.5, 0); slowT.position.set(sw / 2, sh - 52);
      slowT.alpha = 0.6 + 0.3 * Math.sin(this._time * 4);
      this._textContainer.addChild(slowT);
    }

    // Beat metronome (pulsing diamond synced to BPM)
    const metroX = hx - 24, metroY = HIT_Y;
    const metroPulse = this._beatPulse;
    const metroSize = 5 + metroPulse * 5;
    const metroCol = this._feverActive ? COL_GOLD : COL_BORDER;
    // Outer pulsing diamond
    g.moveTo(metroX, metroY - metroSize).lineTo(metroX + metroSize, metroY)
      .lineTo(metroX, metroY + metroSize).lineTo(metroX - metroSize, metroY).closePath()
      .fill({ color: metroCol, alpha: 0.1 + metroPulse * 0.2 });
    // Inner solid diamond
    g.moveTo(metroX, metroY - 3).lineTo(metroX + 3, metroY).lineTo(metroX, metroY + 3).lineTo(metroX - 3, metroY).closePath()
      .fill({ color: metroCol, alpha: 0.3 + metroPulse * 0.5 });
    // Border
    g.moveTo(metroX, metroY - metroSize).lineTo(metroX + metroSize, metroY)
      .lineTo(metroX, metroY + metroSize).lineTo(metroX - metroSize, metroY).closePath()
      .stroke({ color: metroCol, width: 0.8, alpha: 0.15 + metroPulse * 0.2 });
    // Beat count (shows current beat in measure: 1-2-3-4)
    const beatInMeasure = (this._beatCount % 4) + 1;
    const beatT = new Text({ text: `${beatInMeasure}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: beatInMeasure === 1 ? COL_GOLD : 0x667788 }) });
    beatT.anchor.set(0.5, 0.5); beatT.position.set(metroX, metroY + 12);
    this._textContainer.addChild(beatT);

    // Revival indicator
    if (!this._hasRevived && this._mana >= 50) {
      const revT = new Text({ text: "\u2665 Revival ready (50 mana)", style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x44aa44 }) });
      revT.position.set(barX, manaY + barH + (this._shield > 0 ? 50 : 34) + (this._multiplier > 1 ? 18 : 0));
      this._textContainer.addChild(revT);
    }

    // Active ability warning
    if (this._abilityType && this._abilityActive > 0) {
      const warnT = new Text({ text: `${this._abilityType.replace(/_/g, " ").toUpperCase()} ${this._abilityActive.toFixed(1)}s`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: this._enemy?.color ?? 0xff4444, fontWeight: "bold" }) });
      warnT.anchor.set(0.5, 0); warnT.position.set(sw / 2, 4);
      warnT.alpha = 0.6 + 0.3 * Math.sin(this._time * 6);
      this._textContainer.addChild(warnT);
    }

    // Reversed lanes indicator
    if (this._laneReversed) {
      const revT = new Text({ text: "\u{1F500} LANES REVERSED", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xff8844, fontWeight: "bold" }) });
      revT.anchor.set(0.5, 0); revT.position.set(sw / 2, HIT_Y + 48);
      revT.alpha = 0.5 + 0.3 * Math.sin(this._time * 4);
      this._textContainer.addChild(revT);
    }

    // Spell hotkeys (right of highway)
    const spellX = hx + HIGHWAY_W + 20;
    let spellY = HIT_Y - 60;
    for (let i = 0; i < SPELLS.length; i++) {
      const sp = SPELLS[i];
      const spCost = this._hasArcaneFocus ? Math.floor(sp.manaCost * 0.7) : sp.manaCost;
      const canCast = this._mana >= spCost;
      g.roundRect(spellX, spellY, 100, 20, 3).fill({ color: sp.color, alpha: canCast ? 0.08 : 0.02 });
      g.roundRect(spellX, spellY, 100, 20, 3).stroke({ color: sp.color, width: 0.5, alpha: canCast ? 0.3 : 0.1 });
      const st = new Text({ text: `[${sp.key}] ${sp.name}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: sp.color }) });
      st.position.set(spellX + 6, spellY + 4);
      st.alpha = canCast ? 1 : 0.3;
      this._textContainer.addChild(st);
      spellY += 24;
    }

    // Fever meter bar with polygon flame tips
    const feverW = 160, feverH = 8, feverX = sw / 2 - feverW / 2, feverY = sh - 38;
    g.roundRect(feverX, feverY, feverW, feverH, 3).fill({ color: 0x0a0a0a, alpha: 0.7 });
    if (this._feverMeter > 0) {
      const fCol = this._feverActive ? COL_GOLD : 0xcc8800;
      const fFillW = (feverW - 2) * (this._feverMeter / 100);
      g.roundRect(feverX + 1, feverY + 1, fFillW, feverH - 2, 2).fill({ color: fCol, alpha: this._feverActive ? 0.9 : 0.7 });
      // Flame tips at end of fill (polygon)
      if (this._feverMeter > 10 && !this._feverActive) {
        const ftx = feverX + 1 + fFillW;
        for (let fi = 0; fi < 3; fi++) {
          const fty = feverY + 1 + fi * 3;
          const fth = 3 + Math.sin(this._time * 8 + fi * 1.5) * 2;
          g.moveTo(ftx, fty).lineTo(ftx + fth, fty + 1).lineTo(ftx, fty + 2).closePath()
            .fill({ color: fCol, alpha: 0.3 });
        }
      }
    }
    const fBorderCol = this._feverActive ? COL_GOLD : 0x886600;
    g.roundRect(feverX, feverY, feverW, feverH, 3).stroke({ color: fBorderCol, width: 1, alpha: 0.4 });
    // Diamond end caps
    g.moveTo(feverX - 4, feverY + feverH / 2).lineTo(feverX, feverY).lineTo(feverX, feverY + feverH).closePath()
      .fill({ color: fBorderCol, alpha: 0.2 });
    g.moveTo(feverX + feverW + 4, feverY + feverH / 2).lineTo(feverX + feverW, feverY).lineTo(feverX + feverW, feverY + feverH).closePath()
      .fill({ color: fBorderCol, alpha: 0.2 });
    // Star icons flanking label when active
    if (this._feverActive) {
      for (const fsx of [sw / 2 - 44, sw / 2 + 44]) {
        const fsy = feverY - 6;
        g.moveTo(fsx, fsy - 4).lineTo(fsx + 2, fsy - 1).lineTo(fsx + 4, fsy - 1).lineTo(fsx + 2.5, fsy + 1)
          .lineTo(fsx + 3.5, fsy + 4).lineTo(fsx, fsy + 2).lineTo(fsx - 3.5, fsy + 4).lineTo(fsx - 2.5, fsy + 1)
          .lineTo(fsx - 4, fsy - 1).lineTo(fsx - 2, fsy - 1).closePath()
          .fill({ color: COL_GOLD, alpha: 0.25 + 0.1 * Math.sin(this._time * 5) });
      }
    }
    const feverLabel = new Text({ text: this._feverActive ? `FEVER ${this._feverTimer.toFixed(1)}s` : "FEVER", style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: this._feverActive ? COL_GOLD : 0x886644 }) });
    feverLabel.anchor.set(0.5, 0); feverLabel.position.set(sw / 2, feverY - 10);
    this._textContainer.addChild(feverLabel);

    // Stats
    const statsT = new Text({ text: `P:${this._perfects}  G:${this._goods}  M:${this._misses}  Best:${this._maxCombo}x`, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x556677 }) });
    statsT.position.set(14, sh - 22);
    this._textContainer.addChild(statsT);

    const actT = new Text({ text: `ACT ${this._enemyIdx + 1}/${ENEMIES.length}`, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x556677, letterSpacing: 1 }) });
    actT.anchor.set(1, 0); actT.position.set(sw - 14, sh - 22);
    this._textContainer.addChild(actT);

    // Song section indicator (top center)
    const sectionNames: Record<SongSection, string> = {
      intro: "INTRO", verse: "VERSE", chorus: "CHORUS", bridge: "BRIDGE", finale: "FINALE",
    };
    const secName = sectionNames[this._currentSection.name] ?? "";
    const secCol = this._currentSection.name === "finale" ? COL_GOLD
      : this._currentSection.name === "chorus" ? 0x88aaff
      : this._currentSection.name === "bridge" ? 0x88cc88 : 0x667788;
    const secT = new Text({ text: secName, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: secCol, letterSpacing: 2 }) });
    secT.anchor.set(0.5, 0); secT.position.set(sw / 2, 4);
    if (this._sectionTransition > 0) secT.alpha = 0.6 + 0.4 * this._sectionTransition;
    else secT.alpha = 0.4;
    this._textContainer.addChild(secT);

    // Section progress dots
    const sections2 = SONG_STRUCTURES[this._enemyIdx] ?? SONG_STRUCTURES[0];
    const dotStartX = sw / 2 - sections2.length * 5;
    for (let i = 0; i < sections2.length; i++) {
      const dx = dotStartX + i * 10;
      const active = i === this._songSectionIdx;
      const past = i < this._songSectionIdx;
      g.circle(dx, 16, active ? 3 : 2).fill({ color: active ? secCol : past ? 0x556677 : 0x333344, alpha: active ? 0.8 : 0.4 });
    }

    // Phase transition overlay (enemy special move)
    if (this._phaseTransitionTimer > 0) {
      const ptAlpha = Math.min(1, this._phaseTransitionTimer / 0.5);
      this._effectGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: ptAlpha * 0.4 });
      // Shockwave ring from enemy
      const ptRing = (1.2 - this._phaseTransitionTimer) * 150;
      this._effectGfx.moveTo(sw / 2, 110 - ptRing).lineTo(sw / 2 + ptRing, 110)
        .lineTo(sw / 2, 110 + ptRing).lineTo(sw / 2 - ptRing, 110).closePath()
        .stroke({ color: this._enemy.color, width: 3 * ptAlpha, alpha: ptAlpha * 0.5 });
      if (ptRing > 30) {
        this._effectGfx.moveTo(sw / 2, 110 - ptRing * 0.6).lineTo(sw / 2 + ptRing * 0.6, 110)
          .lineTo(sw / 2, 110 + ptRing * 0.6).lineTo(sw / 2 - ptRing * 0.6, 110).closePath()
          .stroke({ color: this._enemy.color, width: 1.5 * ptAlpha, alpha: ptAlpha * 0.3 });
      }
    }

    // Upgrade badges (show active upgrades as small icons)
    let badgeX = 14;
    const badgeY2 = sh - 36;
    if (this._hasResonance) {
      g.moveTo(badgeX + 5, badgeY2).lineTo(badgeX + 10, badgeY2 + 5).lineTo(badgeX + 5, badgeY2 + 10).lineTo(badgeX, badgeY2 + 5).closePath()
        .fill({ color: 0x88ddff, alpha: 0.3 });
      badgeX += 14;
    }
    if (this._hasEcho) {
      g.moveTo(badgeX + 5, badgeY2).lineTo(badgeX + 10, badgeY2 + 5).lineTo(badgeX + 5, badgeY2 + 10).lineTo(badgeX, badgeY2 + 5).closePath()
        .fill({ color: 0xcc88ff, alpha: 0.3 });
      badgeX += 14;
    }
    if (this._hasArcaneFocus) {
      g.moveTo(badgeX + 5, badgeY2).lineTo(badgeX + 10, badgeY2 + 5).lineTo(badgeX + 5, badgeY2 + 10).lineTo(badgeX, badgeY2 + 5).closePath()
        .fill({ color: 0x4488ff, alpha: 0.3 });
    }
  }

  // ── OVERLAYS ──────────────────────────────────────────────────────────────

  private _drawTransition(sw: number, sh: number): void {
    this._effectGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });

    // Victory laurel wreath (polygon arcs)
    const lx = sw / 2, lwy = sh / 2 - 50;
    for (let side = -1; side <= 1; side += 2) {
      for (let l = 0; l < 6; l++) {
        const a = (l / 6) * Math.PI * 0.7 + 0.3;
        const r = 55;
        const leafX = lx + side * Math.cos(a) * r;
        const leafY = lwy + Math.sin(a) * r * 0.5 - 15;
        // Leaf polygon (pointed ellipse)
        const la2 = a + (side > 0 ? 0.3 : -0.3);
        this._effectGfx.moveTo(leafX, leafY)
          .lineTo(leafX + Math.cos(la2) * 8, leafY + Math.sin(la2) * 4)
          .lineTo(leafX + Math.cos(la2) * 4, leafY + Math.sin(la2) * 2 + 3).closePath()
          .fill({ color: COL_GOLD, alpha: 0.08 });
      }
    }

    // Story dialogue per transition
    const stories = [
      "The tavern falls silent. The goblins scatter. Your lute hums with power.",
      "The bones collapse into dust. A spectral melody fades into the wind.",
      "The enchantment breaks. The grove returns to its ancient slumber.",
      "The dragon's song dies in its throat. The mountain trembles.",
      "Mordred's crown clatters to the floor. Harmony returns to Camelot.",
    ];

    const t1 = new Text({ text: `\u2726 ${this._enemy.name} DEFEATED \u2726`, style: new TextStyle({ fontFamily: FONT, fontSize: 24, fill: COL_GOLD, fontWeight: "bold" }) });
    t1.anchor.set(0.5, 0.5); t1.position.set(sw / 2, sh / 2 - 50);
    this._textContainer.addChild(t1);

    const storyT = new Text({ text: stories[this._enemyIdx] ?? "", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xccbbaa, fontStyle: "italic", wordWrap: true, wordWrapWidth: 400 }) });
    storyT.anchor.set(0.5, 0.5); storyT.position.set(sw / 2, sh / 2 - 15);
    this._textContainer.addChild(storyT);

    const healT = new Text({ text: "+20 HP restored", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x44ff88 }) });
    healT.anchor.set(0.5, 0.5); healT.position.set(sw / 2, sh / 2 + 12);
    this._textContainer.addChild(healT);

    if (this._enemyIdx + 1 < ENEMIES.length) {
      const next = ENEMIES[this._enemyIdx + 1];
      const t2 = new Text({ text: `Next: ${next.name}  \u2014  ${next.title}`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0x998899 }) });
      t2.anchor.set(0.5, 0.5); t2.position.set(sw / 2, sh / 2 + 38);
      this._textContainer.addChild(t2);

      // Boss ability preview
      const abilityDescs: Record<BossAbility, string> = {
        speed_up: "\u26A1 Beware: speeds up notes!", reverse: "\u{1F500} Beware: reverses lane order!",
        blind: "\u{1F441} Beware: hides approaching notes!", fire_lanes: "\u{1F525} Beware: sets lanes on fire!",
        darkness: "\u{1F311} Beware: plunges into darkness!",
      };
      const warnT = new Text({ text: abilityDescs[next.ability], style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: next.color }) });
      warnT.anchor.set(0.5, 0.5); warnT.position.set(sw / 2, sh / 2 + 58);
      this._textContainer.addChild(warnT);
    }
  }

  private _drawResults(sw: number, sh: number, victory: boolean): void {
    // Save high score and run history
    if (this._score > 0) {
      try {
        const prev = parseInt(localStorage.getItem("bard_highscore") ?? "0") || 0;
        if (this._score > prev) localStorage.setItem("bard_highscore", String(this._score));
        // Save run to history (keep last 5)
        const totalHit2 = this._perfects + this._goods;
        const acc2 = this._totalNotes > 0 ? (totalHit2 / this._totalNotes * 100) : 0;
        const rank2 = acc2 >= 95 ? "S" : acc2 >= 85 ? "A" : acc2 >= 70 ? "B" : acc2 >= 50 ? "C" : "D";
        const hist = JSON.parse(localStorage.getItem("bard_history") ?? "[]") as { score: number; rank: string; difficulty: string; date: string }[];
        hist.unshift({ score: this._score, rank: rank2, difficulty: this._difficulty, date: new Date().toLocaleDateString() });
        if (hist.length > 5) hist.length = 5;
        localStorage.setItem("bard_history", JSON.stringify(hist));
      } catch { /* ok */ }
    }

    this._effectGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.85 });

    const accent = victory ? COL_GOLD : 0xff4444;
    const pw = 440, ph = 380, px = (sw - pw) / 2, py = (sh - ph) / 2;

    this._effectGfx.roundRect(px, py, pw, ph, 10).fill({ color: 0x10102a, alpha: 0.95 });
    this._effectGfx.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 2, alpha: 0.6 });
    this._effectGfx.roundRect(px + 3, py + 3, pw - 6, ph - 6, 8).stroke({ color: accent, width: 0.5, alpha: 0.12 });
    // Corner diamond ornaments
    for (const [cx2, cy2] of [[px + 10, py + 10], [px + pw - 10, py + 10], [px + 10, py + ph - 10], [px + pw - 10, py + ph - 10]]) {
      this._effectGfx.moveTo(cx2, cy2 - 5).lineTo(cx2 + 5, cy2).lineTo(cx2, cy2 + 5).lineTo(cx2 - 5, cy2).closePath()
        .fill({ color: accent, alpha: 0.3 });
      this._effectGfx.moveTo(cx2, cy2 - 3).lineTo(cx2 + 3, cy2).lineTo(cx2, cy2 + 3).lineTo(cx2 - 3, cy2).closePath()
        .fill({ color: 0xffffff, alpha: 0.15 });
    }
    // Top center ornament (polygon crest)
    const crX = sw / 2, crY = py + 4;
    this._effectGfx.moveTo(crX - 12, crY + 2).lineTo(crX - 6, crY - 4).lineTo(crX, crY - 6)
      .lineTo(crX + 6, crY - 4).lineTo(crX + 12, crY + 2).lineTo(crX + 8, crY + 2)
      .lineTo(crX, crY - 2).lineTo(crX - 8, crY + 2).closePath()
      .fill({ color: accent, alpha: 0.2 });
    // Side bar ornaments
    this._effectGfx.moveTo(px + 6, py + ph / 2 - 20).lineTo(px + 2, py + ph / 2).lineTo(px + 6, py + ph / 2 + 20)
      .stroke({ color: accent, width: 0.8, alpha: 0.15 });
    this._effectGfx.moveTo(px + pw - 6, py + ph / 2 - 20).lineTo(px + pw - 2, py + ph / 2).lineTo(px + pw - 6, py + ph / 2 + 20)
      .stroke({ color: accent, width: 0.8, alpha: 0.15 });

    let y = py + 18;
    const title = victory ? "\u266B  CONCERT COMPLETE  \u266B" : "\u2620  THE MUSIC DIES  \u2620";
    const t1 = new Text({ text: title, style: new TextStyle({ fontFamily: FONT, fontSize: 22, fill: accent, fontWeight: "bold" }) });
    t1.anchor.set(0.5, 0); t1.position.set(sw / 2, y);
    this._textContainer.addChild(t1);
    y += 38;

    // Accuracy & rank
    const totalHit = this._perfects + this._goods;
    const accuracy = this._totalNotes > 0 ? (totalHit / this._totalNotes * 100) : 0;
    const rank = accuracy >= 95 ? "S" : accuracy >= 85 ? "A" : accuracy >= 70 ? "B" : accuracy >= 50 ? "C" : "D";
    const rankCol = rank === "S" ? COL_GOLD : rank === "A" ? 0x44ff88 : rank === "B" ? 0x44bbff : 0xff8844;

    // Rank emblem (polygon shield/crest behind rank letter)
    const embCx = sw / 2, embCy = y + 22;
    // Shield shape
    this._effectGfx.moveTo(embCx, embCy - 24).lineTo(embCx + 28, embCy - 16).lineTo(embCx + 26, embCy + 8)
      .lineTo(embCx, embCy + 24).lineTo(embCx - 26, embCy + 8).lineTo(embCx - 28, embCy - 16).closePath()
      .fill({ color: rankCol, alpha: 0.08 });
    this._effectGfx.moveTo(embCx, embCy - 24).lineTo(embCx + 28, embCy - 16).lineTo(embCx + 26, embCy + 8)
      .lineTo(embCx, embCy + 24).lineTo(embCx - 26, embCy + 8).lineTo(embCx - 28, embCy - 16).closePath()
      .stroke({ color: rankCol, width: 1.5, alpha: 0.25 });
    // Inner shield
    this._effectGfx.moveTo(embCx, embCy - 18).lineTo(embCx + 20, embCy - 12).lineTo(embCx + 18, embCy + 5)
      .lineTo(embCx, embCy + 18).lineTo(embCx - 18, embCy + 5).lineTo(embCx - 20, embCy - 12).closePath()
      .fill({ color: rankCol, alpha: 0.04 });
    // S rank gets star polygon on top
    if (rank === "S") {
      const starY = embCy - 28;
      this._effectGfx.moveTo(embCx, starY - 6).lineTo(embCx + 2.5, starY - 2).lineTo(embCx + 6, starY - 2)
        .lineTo(embCx + 3, starY + 1).lineTo(embCx + 4.5, starY + 5).lineTo(embCx, starY + 3)
        .lineTo(embCx - 4.5, starY + 5).lineTo(embCx - 3, starY + 1).lineTo(embCx - 6, starY - 2)
        .lineTo(embCx - 2.5, starY - 2).closePath().fill({ color: COL_GOLD, alpha: 0.3 });
    }
    const rankT = new Text({ text: rank, style: new TextStyle({ fontFamily: FONT, fontSize: 32, fill: rankCol, fontWeight: "bold" }) });
    rankT.anchor.set(0.5, 0.5); rankT.position.set(sw / 2, embCy);
    this._textContainer.addChild(rankT);
    y += 50;

    // New high score banner
    if (this._isNewHighScore) {
      const nhT = new Text({ text: "\u2726 NEW HIGH SCORE! \u2726", style: new TextStyle({ fontFamily: FONT, fontSize: 14, fill: COL_GOLD, fontWeight: "bold" }) });
      nhT.anchor.set(0.5, 0); nhT.position.set(sw / 2, y);
      this._textContainer.addChild(nhT);
      y += 22;
    }

    const lines = [
      `Score: ${this._score}${this._isNewHighScore ? "" : `  (Best: ${this._highScore})`}`,
      `Accuracy: ${accuracy.toFixed(1)}%`,
      `Max Combo: ${this._maxCombo}x  |  Multiplier: x${this._multiplier}`,
      `Perfects: ${this._perfects}  |  Goods: ${this._goods}  |  Misses: ${this._misses}`,
      `Enemies Defeated: ${this._enemyIdx + (victory ? 1 : 0)} / ${ENEMIES.length}`,
    ];
    for (const line of lines) {
      const t = new Text({ text: line, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xaabbcc }) });
      t.anchor.set(0.5, 0); t.position.set(sw / 2, y);
      this._textContainer.addChild(t); y += 20;
    }

    y += 16;
    const btnW = 180, btnH = 34;
    const retryBtn = new Graphics();
    retryBtn.roundRect(sw / 2 - btnW / 2, y, btnW, btnH, 5).fill({ color: 0x1a1a2a });
    retryBtn.roundRect(sw / 2 - btnW / 2, y, btnW, btnH, 5).stroke({ color: accent, width: 1.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => this._startGame());
    this._textContainer.addChild(retryBtn);
    const retryT = new Text({ text: "Play Again", style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: accent, fontWeight: "bold" }) });
    retryT.anchor.set(0.5, 0.5); retryT.position.set(sw / 2, y + btnH / 2);
    this._textContainer.addChild(retryT);

    y += btnH + 10;
    const exitT = new Text({ text: "\u2190 Back to Menu", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x776677 }) });
    exitT.anchor.set(0.5, 0); exitT.position.set(sw / 2, y);
    exitT.eventMode = "static"; exitT.cursor = "pointer";
    exitT.on("pointerdown", () => { this.destroy(); window.dispatchEvent(new Event("bardExit")); });
    this._textContainer.addChild(exitT);
  }

  private _drawUpgrade(sw: number, sh: number): void {
    this._effectGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });

    const pw = 450, ph = 260, px = (sw - pw) / 2, py = (sh - ph) / 2;
    this._effectGfx.roundRect(px, py, pw, ph, 10).fill({ color: 0x10102a, alpha: 0.95 });
    this._effectGfx.roundRect(px, py, pw, ph, 10).stroke({ color: COL_GOLD, width: 2, alpha: 0.5 });

    const t1 = new Text({ text: "\u2726 CHOOSE AN UPGRADE \u2726", style: new TextStyle({ fontFamily: FONT, fontSize: 18, fill: COL_GOLD, fontWeight: "bold" }) });
    t1.anchor.set(0.5, 0); t1.position.set(sw / 2, py + 16);
    this._textContainer.addChild(t1);

    const nextName = ENEMIES[this._enemyIdx + 1]?.name ?? "";
    const t2 = new Text({ text: `Preparing for: ${nextName}`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x887799 }) });
    t2.anchor.set(0.5, 0); t2.position.set(sw / 2, py + 40);
    this._textContainer.addChild(t2);

    // Build upgrade pool — 3 base + 3 conditional
    const allUpgrades = [
      { label: "\u2665 FORTIFY", desc: `+20 Max HP (${this._maxHealth} \u2192 ${this._maxHealth + 20})\n+Full heal`, color: 0x44ff88, key: "1",
        apply: () => { this._maxHealth += 20; this._health = this._maxHealth; } },
      { label: "\u2726 EMPOWER", desc: `+5 damage per hit\nCurrent: +${this._dmgBonus}`, color: 0xff8844, key: "2",
        apply: () => { this._dmgBonus += 5; } },
      { label: "\u2661 VAMPIRIC", desc: `+5% life steal\nCurrent: ${Math.round(this._lifeStealPct * 100)}%`, color: 0xcc44aa, key: "3",
        apply: () => { this._lifeStealPct += 0.05; } },
    ];
    if (!this._hasResonance) {
      allUpgrades.push({ label: "\u2728 RESONANCE", desc: "Near-misses still count\nas Good hits", color: 0x88ddff, key: "4",
        apply: () => { this._hasResonance = true; } });
    }
    if (!this._hasEcho) {
      allUpgrades.push({ label: "\u266C ECHO", desc: "Every 4th note\nauto-hits for you", color: 0xcc88ff, key: "5",
        apply: () => { this._hasEcho = true; } });
    }
    if (!this._hasArcaneFocus) {
      allUpgrades.push({ label: "\u2726 ARCANE FOCUS", desc: "Spells cost\n30% less mana", color: 0x4488ff, key: "6",
        apply: () => { this._hasArcaneFocus = true; } });
    }
    // Pick 3 random upgrades from pool
    const shuffled = allUpgrades.sort(() => Math.random() - 0.5);
    const upgrades = shuffled.slice(0, 3);
    // Reassign keys & store for keyboard handler
    upgrades.forEach((u, i) => u.key = String(i + 1));
    this._upgradeChoices = upgrades;

    const cardW = 130, cardH = 130, cardGap = 10;
    const cardsX = sw / 2 - (cardW * 3 + cardGap * 2) / 2;
    const cardsY = py + 60;

    for (let i = 0; i < upgrades.length; i++) {
      const u = upgrades[i];
      const ux = cardsX + i * (cardW + cardGap);

      const uBtn = new Graphics();
      uBtn.roundRect(ux, cardsY, cardW, cardH, 6).fill({ color: 0x0a0a1a, alpha: 0.95 });
      uBtn.roundRect(ux + 2, cardsY + 2, cardW - 4, cardH - 4, 5).stroke({ color: u.color, width: 0.5, alpha: 0.12 });
      uBtn.roundRect(ux, cardsY, cardW, cardH, 6).stroke({ color: u.color, width: 1.5, alpha: 0.5 });
      // Corner diamond ornaments on card
      for (const [cx3, cy3] of [[ux + 6, cardsY + 6], [ux + cardW - 6, cardsY + 6], [ux + 6, cardsY + cardH - 6], [ux + cardW - 6, cardsY + cardH - 6]]) {
        uBtn.moveTo(cx3, cy3 - 3).lineTo(cx3 + 3, cy3).lineTo(cx3, cy3 + 3).lineTo(cx3 - 3, cy3).closePath()
          .fill({ color: u.color, alpha: 0.15 });
      }
      // Large diamond icon in center of card
      const iconCx = ux + cardW / 2, iconCy = cardsY + cardH - 30;
      uBtn.moveTo(iconCx, iconCy - 12).lineTo(iconCx + 12, iconCy).lineTo(iconCx, iconCy + 12).lineTo(iconCx - 12, iconCy).closePath()
        .fill({ color: u.color, alpha: 0.06 });
      uBtn.moveTo(iconCx, iconCy - 12).lineTo(iconCx + 12, iconCy).lineTo(iconCx, iconCy + 12).lineTo(iconCx - 12, iconCy).closePath()
        .stroke({ color: u.color, width: 0.8, alpha: 0.15 });
      // Inner highlight
      uBtn.moveTo(iconCx, iconCy - 6).lineTo(iconCx + 6, iconCy).lineTo(iconCx, iconCy + 6).lineTo(iconCx - 6, iconCy).closePath()
        .fill({ color: u.color, alpha: 0.08 });

      uBtn.eventMode = "static"; uBtn.cursor = "pointer";
      uBtn.on("pointerover", () => {
        uBtn.clear();
        uBtn.roundRect(ux, cardsY, cardW, cardH, 6).fill({ color: 0x1a1a2a });
        uBtn.roundRect(ux, cardsY, cardW, cardH, 6).stroke({ color: u.color, width: 2, alpha: 0.8 });
        // Glow on hover
        uBtn.roundRect(ux - 2, cardsY - 2, cardW + 4, cardH + 4, 8).stroke({ color: u.color, width: 1, alpha: 0.2 });
      });
      uBtn.on("pointerout", () => {
        uBtn.clear();
        uBtn.roundRect(ux, cardsY, cardW, cardH, 6).fill({ color: 0x0a0a1a, alpha: 0.95 });
        uBtn.roundRect(ux, cardsY, cardW, cardH, 6).stroke({ color: u.color, width: 1.5, alpha: 0.5 });
      });
      uBtn.on("pointerdown", () => {
        u.apply();
        this._health = Math.min(this._maxHealth, this._health + 20);
        this._loadEnemy(this._enemyIdx + 1);
        this._phase = "playing";
      });
      this._textContainer.addChild(uBtn);

      const keyT = new Text({ text: `[${u.key}]`, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x667788 }) });
      keyT.anchor.set(0.5, 0); keyT.position.set(ux + cardW / 2, cardsY + 6);
      this._textContainer.addChild(keyT);

      const nameT = new Text({ text: u.label, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: u.color, fontWeight: "bold" }) });
      nameT.anchor.set(0.5, 0); nameT.position.set(ux + cardW / 2, cardsY + 22);
      this._textContainer.addChild(nameT);

      const descT = new Text({ text: u.desc, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x99aabb, wordWrap: true, wordWrapWidth: cardW - 16, align: "center" }) });
      descT.anchor.set(0.5, 0); descT.position.set(ux + cardW / 2, cardsY + 50);
      this._textContainer.addChild(descT);
    }
  }

  private _drawPause(sw: number, sh: number): void {
    this._effectGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });
    // Decorative diamond frame
    const pw2 = 260, ph2 = 120, px2 = (sw - pw2) / 2, py2 = (sh - ph2) / 2;
    this._effectGfx.roundRect(px2, py2, pw2, ph2, 8).fill({ color: 0x0a0a1a, alpha: 0.9 });
    this._effectGfx.roundRect(px2, py2, pw2, ph2, 8).stroke({ color: COL_GOLD, width: 1.5, alpha: 0.4 });
    this._effectGfx.roundRect(px2 + 3, py2 + 3, pw2 - 6, ph2 - 6, 6).stroke({ color: COL_GOLD, width: 0.4, alpha: 0.1 });
    // Corner diamonds
    for (const [cx3, cy3] of [[px2 + 8, py2 + 8], [px2 + pw2 - 8, py2 + 8], [px2 + 8, py2 + ph2 - 8], [px2 + pw2 - 8, py2 + ph2 - 8]]) {
      this._effectGfx.moveTo(cx3, cy3 - 4).lineTo(cx3 + 4, cy3).lineTo(cx3, cy3 + 4).lineTo(cx3 - 4, cy3).closePath()
        .fill({ color: COL_GOLD, alpha: 0.2 });
    }
    // Top ornament
    this._effectGfx.moveTo(sw / 2, py2 - 2).lineTo(sw / 2 + 8, py2 + 4).lineTo(sw / 2, py2 + 2).lineTo(sw / 2 - 8, py2 + 4).closePath()
      .fill({ color: COL_GOLD, alpha: 0.15 });
    // Musical note polygons flanking title
    for (const dir of [-1, 1]) {
      const nx = sw / 2 + dir * 80, ny = sh / 2 - 20;
      this._effectGfx.ellipse(nx, ny + 2, 4, 3).fill({ color: COL_GOLD, alpha: 0.12 });
      this._effectGfx.moveTo(nx + 4, ny + 2).lineTo(nx + 4, ny - 8).stroke({ color: COL_GOLD, width: 0.8, alpha: 0.1 });
    }
    const t = new Text({ text: "PAUSED", style: new TextStyle({ fontFamily: FONT, fontSize: 28, fill: COL_GOLD, fontWeight: "bold", letterSpacing: 6 }) });
    t.anchor.set(0.5, 0.5); t.position.set(sw / 2, sh / 2 - 20);
    this._textContainer.addChild(t);
    const t2 = new Text({ text: "Press ESC to resume", style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0x887799 }) });
    t2.anchor.set(0.5, 0.5); t2.position.set(sw / 2, sh / 2 + 15);
    this._textContainer.addChild(t2);
  }

  // ── BACKGROUND SCENES ──────────────────────────────────────────────────
  // Each act has a distinct atmospheric backdrop drawn behind the highway.

  private _drawBgScene(sw: number, sh: number): void {
    const g = this._bg;
    const idx = this._enemyIdx;
    const t = this._time;

    if (idx === 0) {
      // ACT I: Tavern — rich interior with rafters, chandelier, bar, tables
      // Floor planks (polygon)
      g.rect(0, sh * 0.7, sw, sh * 0.3).fill({ color: 0x1a120a, alpha: 0.3 });
      for (let i = 0; i < 8; i++) {
        const py = sh * 0.7 + i * (sh * 0.3 / 8);
        g.moveTo(0, py).lineTo(sw, py).stroke({ color: 0x2a1a0a, width: 0.5, alpha: 0.08 });
      }
      // Back wall
      g.rect(0, 0, sw, sh * 0.7).fill({ color: 0x120e08, alpha: 0.15 });
      // Wooden beams (vertical)
      for (let i = 0; i < 5; i++) {
        const bx = sw * (i / 4);
        g.rect(bx - 4, 0, 8, sh).fill({ color: 0x2a1a0a, alpha: 0.08 });
        // Beam brackets — triangular supports
        g.moveTo(bx - 4, sh * 0.15).lineTo(bx - 14, sh * 0.15 + 12).lineTo(bx - 4, sh * 0.15 + 12).closePath()
          .fill({ color: 0x2a1a0a, alpha: 0.07 });
        g.moveTo(bx + 4, sh * 0.15).lineTo(bx + 14, sh * 0.15 + 12).lineTo(bx + 4, sh * 0.15 + 12).closePath()
          .fill({ color: 0x2a1a0a, alpha: 0.07 });
      }
      // Horizontal beams with cross-bracing
      g.rect(0, sh * 0.15, sw, 6).fill({ color: 0x2a1a0a, alpha: 0.1 });
      g.rect(0, sh * 0.16 + 6, sw, 2).fill({ color: 0x1a0a00, alpha: 0.05 }); // shadow
      // Chandelier (pentagon chain + candles)
      const chandX = sw * 0.12, chandY = sh * 0.22;
      g.moveTo(chandX, sh * 0.15).lineTo(chandX, chandY).stroke({ color: 0x4a3a2a, width: 1, alpha: 0.1 }); // chain
      // Ring shape (hexagonal)
      for (let i = 0; i < 6; i++) {
        const a1 = (i / 6) * Math.PI * 2, a2 = ((i + 1) / 6) * Math.PI * 2;
        const r = 14;
        g.moveTo(chandX + Math.cos(a1) * r, chandY + Math.sin(a1) * r * 0.4)
          .lineTo(chandX + Math.cos(a2) * r, chandY + Math.sin(a2) * r * 0.4)
          .stroke({ color: 0x5a4a3a, width: 1.5, alpha: 0.1 });
      }
      // Candle flames on chandelier
      for (let i = 0; i < 4; i++) {
        const ca = (i / 4) * Math.PI * 2;
        const cfx = chandX + Math.cos(ca) * 12;
        const cfy = chandY + Math.sin(ca) * 5;
        const flicker = Math.sin(t * 6 + i * 1.5) * 1.5;
        // Flame polygon (teardrop)
        g.moveTo(cfx, cfy - 5 + flicker).bezierCurveTo(cfx + 2.5, cfy - 2, cfx + 2, cfy + 1, cfx, cfy + 2)
          .bezierCurveTo(cfx - 2, cfy + 1, cfx - 2.5, cfy - 2, cfx, cfy - 5 + flicker).closePath()
          .fill({ color: 0xffaa44, alpha: 0.15 });
        g.circle(cfx, cfy - 2 + flicker, 1.5).fill({ color: 0xffdd88, alpha: 0.2 });
        // Light halo
        g.circle(cfx, cfy, 10).fill({ color: 0xffaa44, alpha: 0.015 });
      }
      // Right chandelier
      const ch2X = sw * 0.88;
      g.moveTo(ch2X, sh * 0.15).lineTo(ch2X, chandY).stroke({ color: 0x4a3a2a, width: 1, alpha: 0.1 });
      for (let i = 0; i < 4; i++) {
        const ca = (i / 4) * Math.PI * 2;
        const cfx = ch2X + Math.cos(ca) * 10;
        const cfy = chandY + Math.sin(ca) * 4;
        const flicker = Math.sin(t * 5.5 + i * 2.2) * 1.5;
        g.moveTo(cfx, cfy - 4 + flicker).bezierCurveTo(cfx + 2, cfy - 1, cfx + 1.5, cfy + 1, cfx, cfy + 2)
          .bezierCurveTo(cfx - 1.5, cfy + 1, cfx - 2, cfy - 1, cfx, cfy - 4 + flicker).closePath()
          .fill({ color: 0xffaa44, alpha: 0.12 });
        g.circle(cfx, cfy, 8).fill({ color: 0xffaa44, alpha: 0.012 });
      }
      // Bar counter (polygon trapezoid)
      const barY = sh * 0.68;
      g.moveTo(sw * 0.05, barY + 12).lineTo(sw * 0.05 + 3, barY).lineTo(sw * 0.25 - 3, barY).lineTo(sw * 0.25, barY + 12).closePath()
        .fill({ color: 0x3a2a1a, alpha: 0.12 });
      g.moveTo(sw * 0.05, barY).lineTo(sw * 0.25, barY).stroke({ color: 0x4a3a2a, width: 1.5, alpha: 0.1 });
      // Bottles on bar (small polygon shapes)
      for (let i = 0; i < 4; i++) {
        const bx = sw * 0.08 + i * sw * 0.04;
        // Bottle: pentagon body + triangle neck
        g.moveTo(bx - 2, barY).lineTo(bx - 2.5, barY - 8).lineTo(bx - 1, barY - 10).lineTo(bx + 1, barY - 10)
          .lineTo(bx + 2.5, barY - 8).lineTo(bx + 2, barY).closePath()
          .fill({ color: [0x2a4a2a, 0x4a2a2a, 0x2a2a4a, 0x4a4a2a][i], alpha: 0.08 });
      }
      // Mugs on tables (hexagonal cross-section)
      for (const mx of [sw * 0.82, sw * 0.92]) {
        g.moveTo(mx - 4, sh * 0.72).lineTo(mx - 5, sh * 0.72 + 10).lineTo(mx + 5, sh * 0.72 + 10).lineTo(mx + 4, sh * 0.72).closePath()
          .fill({ color: 0x5a4a3a, alpha: 0.1 });
        g.moveTo(mx + 4, sh * 0.72 + 2).bezierCurveTo(mx + 7, sh * 0.72 + 3, mx + 7, sh * 0.72 + 8, mx + 4, sh * 0.72 + 9)
          .stroke({ color: 0x5a4a3a, width: 1, alpha: 0.08 }); // handle
        // Foam
        g.ellipse(mx, sh * 0.72, 4.5, 1.5).fill({ color: 0xddcc99, alpha: 0.06 });
      }
      // Barrel in corner (octagonal)
      const brlX = sw * 0.9, brlY = sh * 0.76;
      for (let i = 0; i < 8; i++) {
        const a1 = (i / 8) * Math.PI * 2, a2 = ((i + 1) / 8) * Math.PI * 2;
        g.moveTo(brlX + Math.cos(a1) * 10, brlY + Math.sin(a1) * 7)
          .lineTo(brlX + Math.cos(a2) * 10, brlY + Math.sin(a2) * 7)
          .stroke({ color: 0x4a3a2a, width: 1, alpha: 0.08 });
      }
      g.ellipse(brlX, brlY, 10, 7).stroke({ color: 0x5a4a3a, width: 0.5, alpha: 0.06 });
    } else if (idx === 1) {
      // ACT II: Graveyard — cross tombstones, iron fence, moon, mist, dead trees
      // Ground with grass tufts
      g.rect(0, sh * 0.75, sw, sh * 0.25).fill({ color: 0x0a1a0a, alpha: 0.25 });
      for (let i = 0; i < 12; i++) {
        const gx = sw * (i / 11);
        const gy = sh * 0.75;
        g.moveTo(gx - 3, gy + 2).lineTo(gx, gy - 3).lineTo(gx + 1, gy + 2).closePath().fill({ color: 0x1a3a1a, alpha: 0.06 });
        g.moveTo(gx + 2, gy + 2).lineTo(gx + 4, gy - 2).lineTo(gx + 5, gy + 2).closePath().fill({ color: 0x1a3a1a, alpha: 0.05 });
      }
      // Moon with crescent shadow
      const moonX = sw * 0.85, moonY = sh * 0.12;
      g.circle(moonX, moonY, 25).fill({ color: 0xddddcc, alpha: 0.06 });
      g.circle(moonX, moonY, 20).fill({ color: 0xeeeedd, alpha: 0.04 });
      g.circle(moonX + 6, moonY - 3, 18).fill({ color: 0x050510, alpha: 0.06 }); // shadow for crescent
      // Moon rays (triangular beams)
      for (let i = 0; i < 6; i++) {
        const ra = (i / 6) * Math.PI * 2;
        const rayLen = 50 + Math.sin(t * 0.3 + i) * 10;
        g.moveTo(moonX, moonY)
          .lineTo(moonX + Math.cos(ra - 0.05) * rayLen, moonY + Math.sin(ra - 0.05) * rayLen)
          .lineTo(moonX + Math.cos(ra + 0.05) * rayLen, moonY + Math.sin(ra + 0.05) * rayLen)
          .closePath().fill({ color: 0xddddcc, alpha: 0.008 });
      }
      // Iron fence (polygon pickets)
      const fenceY = sh * 0.72;
      g.moveTo(0, fenceY + 3).lineTo(sw, fenceY + 3).stroke({ color: 0x3a3a4a, width: 1, alpha: 0.08 }); // rail
      g.moveTo(0, fenceY + 10).lineTo(sw, fenceY + 10).stroke({ color: 0x3a3a4a, width: 1, alpha: 0.06 }); // lower rail
      for (let i = 0; i < 20; i++) {
        const fx = sw * (i / 19);
        // Picket with spear tip (pentagon top)
        g.moveTo(fx - 1.5, fenceY + 12).lineTo(fx - 1.5, fenceY).lineTo(fx, fenceY - 5).lineTo(fx + 1.5, fenceY).lineTo(fx + 1.5, fenceY + 12).closePath()
          .fill({ color: 0x3a3a4a, alpha: 0.07 });
      }
      // Cross tombstones (polygon crosses)
      for (let i = 0; i < 5; i++) {
        const tx = sw * 0.06 + i * sw * 0.2;
        const th = 18 + (i * 7) % 14;
        const tby = sh * 0.73;
        const tw = 4 + (i % 2) * 2;
        // Cross shape (polygon)
        g.moveTo(tx - tw, tby - th).lineTo(tx + tw, tby - th).lineTo(tx + tw, tby - th - 4)
          .lineTo(tx + tw + 6, tby - th - 4).lineTo(tx + tw + 6, tby - th - 4 - tw * 2)
          .lineTo(tx - tw - 6, tby - th - 4 - tw * 2).lineTo(tx - tw - 6, tby - th - 4)
          .lineTo(tx - tw, tby - th - 4).closePath()
          .fill({ color: 0x3a3a4a, alpha: 0.1 });
        // Tombstone body
        g.roundRect(tx - tw, tby - th, tw * 2, th, 1).fill({ color: 0x3a3a4a, alpha: 0.08 });
        // Cracks (decorative lines)
        g.moveTo(tx - 1, tby - th + 4).lineTo(tx + 2, tby - th + th * 0.5).stroke({ color: 0x2a2a3a, width: 0.5, alpha: 0.06 });
      }
      // Dead tree silhouettes (branching polygon)
      for (const dtx of [sw * 0.02, sw * 0.96]) {
        const dty = sh * 0.73;
        // Trunk
        g.moveTo(dtx - 3, dty).lineTo(dtx - 2, dty - 50).lineTo(dtx + 2, dty - 50).lineTo(dtx + 3, dty).closePath()
          .fill({ color: 0x1a1a1a, alpha: 0.12 });
        // Branches (angled polygons)
        g.moveTo(dtx, dty - 35).lineTo(dtx - 18, dty - 55).lineTo(dtx - 16, dty - 57).lineTo(dtx + 1, dty - 37).closePath()
          .fill({ color: 0x1a1a1a, alpha: 0.08 });
        g.moveTo(dtx, dty - 25).lineTo(dtx + 15, dty - 42).lineTo(dtx + 17, dty - 40).lineTo(dtx + 1, dty - 23).closePath()
          .fill({ color: 0x1a1a1a, alpha: 0.08 });
        g.moveTo(dtx - 1, dty - 45).lineTo(dtx + 10, dty - 62).lineTo(dtx + 12, dty - 60).lineTo(dtx + 1, dty - 43).closePath()
          .fill({ color: 0x1a1a1a, alpha: 0.07 });
      }
      // Mist wisps (elongated ellipses)
      for (let i = 0; i < 4; i++) {
        const mx = ((t * 12 + i * 180) % (sw + 100)) - 50;
        g.ellipse(mx, sh * 0.78 - i * 3, 50 + i * 12, 4).fill({ color: 0x8899aa, alpha: 0.025 });
      }
    } else if (idx === 2) {
      // ACT III: Enchanted grove — full trees with trunks/canopy, mushrooms, fireflies
      g.rect(0, sh * 0.8, sw, sh * 0.2).fill({ color: 0x0a150a, alpha: 0.2 });
      // Trees with proper polygon canopies
      for (const [tx, scale] of [[sw * 0.04, 1.1], [sw * 0.17, 0.9], [sw * 0.83, 1.0], [sw * 0.96, 0.8]] as [number, number][]) {
        const tby = sh * 0.78;
        // Trunk (tapered polygon)
        g.moveTo(tx - 3 * scale, tby).lineTo(tx - 2 * scale, tby - 45 * scale).lineTo(tx + 2 * scale, tby - 45 * scale).lineTo(tx + 3 * scale, tby).closePath()
          .fill({ color: 0x1a2a1a, alpha: 0.12 });
        // Roots (triangular)
        g.moveTo(tx - 3 * scale, tby).lineTo(tx - 10 * scale, tby + 3).lineTo(tx - 4 * scale, tby + 1).closePath()
          .fill({ color: 0x1a2a1a, alpha: 0.08 });
        g.moveTo(tx + 3 * scale, tby).lineTo(tx + 10 * scale, tby + 3).lineTo(tx + 4 * scale, tby + 1).closePath()
          .fill({ color: 0x1a2a1a, alpha: 0.08 });
        // Canopy layers (overlapping polygons — pentagon/hexagon shapes)
        const canopyY = tby - 45 * scale;
        for (let layer = 0; layer < 3; layer++) {
          const lr = (22 - layer * 5) * scale;
          const ly = canopyY - layer * 6 * scale;
          const sides = 6 + layer;
          g.moveTo(tx + lr, ly);
          for (let s = 1; s <= sides; s++) {
            const a = (s / sides) * Math.PI * 2;
            g.lineTo(tx + Math.cos(a) * lr, ly + Math.sin(a) * lr * 0.6);
          }
          g.closePath().fill({ color: [0x1a3a2a, 0x1a4a2a, 0x2a5a3a][layer], alpha: 0.06 - layer * 0.01 });
        }
        // Glowing leaf particles
        for (let l = 0; l < 3; l++) {
          const la = t * 0.7 + l * 2.1 + tx;
          const lx2 = tx + Math.cos(la) * 15 * scale;
          const ly2 = canopyY + Math.sin(la * 1.3) * 10 * scale;
          g.circle(lx2, ly2, 1).fill({ color: 0x44ff88, alpha: 0.06 + 0.03 * Math.sin(t * 3 + l) });
        }
      }
      // Mushrooms (polygon caps + stems)
      for (const [mx, ms] of [[sw * 0.08, 1], [sw * 0.14, 0.7], [sw * 0.88, 0.9], [sw * 0.93, 0.6]] as [number, number][]) {
        const my = sh * 0.8;
        // Stem
        g.moveTo(mx - 1.5 * ms, my).lineTo(mx - 1 * ms, my - 6 * ms).lineTo(mx + 1 * ms, my - 6 * ms).lineTo(mx + 1.5 * ms, my).closePath()
          .fill({ color: 0xccbbaa, alpha: 0.06 });
        // Cap (pentagon dome)
        g.moveTo(mx - 5 * ms, my - 6 * ms).lineTo(mx - 4 * ms, my - 10 * ms).lineTo(mx, my - 12 * ms)
          .lineTo(mx + 4 * ms, my - 10 * ms).lineTo(mx + 5 * ms, my - 6 * ms).closePath()
          .fill({ color: 0xaa3344, alpha: 0.06 });
        // Spots
        g.circle(mx - 1 * ms, my - 9 * ms, 1 * ms).fill({ color: 0xffffff, alpha: 0.04 });
        g.circle(mx + 2 * ms, my - 8 * ms, 0.7 * ms).fill({ color: 0xffffff, alpha: 0.03 });
      }
      // Floating magic orbs with trailing sparkles
      for (let i = 0; i < 5; i++) {
        const ox = sw * (0.05 + 0.22 * i) + Math.sin(t * 0.8 + i * 2) * 20;
        const oy = sh * 0.3 + Math.cos(t * 0.6 + i * 1.5) * 30;
        const orbA = 0.08 + 0.04 * Math.sin(t * 2 + i);
        g.circle(ox, oy, 4).fill({ color: 0xcc88ff, alpha: orbA });
        g.circle(ox, oy, 8).fill({ color: 0xcc88ff, alpha: orbA * 0.2 });
        // Trail (3 smaller circles behind)
        for (let tr = 1; tr <= 3; tr++) {
          const trx = ox - Math.cos(t * 0.8 + i * 2) * tr * 5;
          const try2 = oy + Math.sin(t * 0.6 + i * 1.5) * tr * 4;
          g.circle(trx, try2, 2 - tr * 0.4).fill({ color: 0xcc88ff, alpha: orbA * (0.4 - tr * 0.1) });
        }
      }
      // Fireflies (tiny animated dots)
      for (let i = 0; i < 8; i++) {
        const fx = sw * 0.05 + (sw * 0.2) * (i % 4) + Math.sin(t * 1.2 + i * 1.7) * 15;
        const fy = sh * 0.4 + Math.cos(t * 0.9 + i * 2.3) * (sh * 0.3);
        const fa = 0.05 + 0.05 * Math.sin(t * 4 + i * 3);
        g.circle(fx, fy, 1.2).fill({ color: 0xeeff66, alpha: fa });
      }
    } else if (idx === 3) {
      // ACT IV: Mountain peak — jagged polygon peaks, lava rivers, boulders, smoke
      // Lava pool at bottom
      g.rect(0, sh * 0.85, sw, sh * 0.15).fill({ color: 0x2a0800, alpha: 0.2 });
      g.rect(0, sh * 0.9, sw, sh * 0.1).fill({ color: 0xff4400, alpha: 0.03 + 0.01 * Math.sin(t * 2) });
      // Lava rivers (zigzag polygon)
      g.moveTo(sw * 0.15, sh * 0.88).lineTo(sw * 0.18, sh * 0.92).lineTo(sw * 0.22, sh * 0.89)
        .lineTo(sw * 0.28, sh * 0.93).lineTo(sw * 0.32, sh * 0.9)
        .lineTo(sw * 0.32, sh).lineTo(sw * 0.15, sh).closePath()
        .fill({ color: 0xff4400, alpha: 0.04 + 0.02 * Math.sin(t * 3) });
      g.moveTo(sw * 0.7, sh * 0.89).lineTo(sw * 0.74, sh * 0.93).lineTo(sw * 0.8, sh * 0.9)
        .lineTo(sw * 0.85, sh * 0.94).lineTo(sw * 0.85, sh).lineTo(sw * 0.7, sh).closePath()
        .fill({ color: 0xff4400, alpha: 0.03 + 0.015 * Math.sin(t * 2.5 + 1) });
      // Mountain silhouettes — multi-layer jagged polygons
      // Far mountains (lighter)
      g.moveTo(0, sh * 0.55).lineTo(sw * 0.1, sh * 0.3).lineTo(sw * 0.2, sh * 0.5).lineTo(sw * 0.35, sh * 0.22)
        .lineTo(sw * 0.5, sh * 0.45).lineTo(sw * 0.65, sh * 0.2).lineTo(sw * 0.8, sh * 0.48)
        .lineTo(sw * 0.9, sh * 0.25).lineTo(sw, sh * 0.5).lineTo(sw, sh).lineTo(0, sh).closePath()
        .fill({ color: 0x0a0808, alpha: 0.1 });
      // Near mountains (darker, sharper peaks)
      g.moveTo(0, sh * 0.6).lineTo(sw * 0.08, sh * 0.42).lineTo(sw * 0.12, sh * 0.55)
        .lineTo(sw * 0.22, sh * 0.35).lineTo(sw * 0.28, sh * 0.5).lineTo(sw * 0.42, sh * 0.28)
        .lineTo(sw * 0.55, sh * 0.52).lineTo(sw * 0.68, sh * 0.32).lineTo(sw * 0.78, sh * 0.55)
        .lineTo(sw * 0.88, sh * 0.38).lineTo(sw, sh * 0.58).lineTo(sw, sh).lineTo(0, sh).closePath()
        .fill({ color: 0x0f0a0a, alpha: 0.15 });
      // Snow caps (triangular polygons on peaks)
      for (const [px, py] of [[sw * 0.22, sh * 0.35], [sw * 0.42, sh * 0.28], [sw * 0.88, sh * 0.38]] as [number, number][]) {
        g.moveTo(px, py).lineTo(px - 6, py + 8).lineTo(px + 6, py + 8).closePath()
          .fill({ color: 0xccccdd, alpha: 0.04 });
      }
      // Boulders (octagonal polygons)
      for (const [bx, bScale] of [[sw * 0.06, 1.2], [sw * 0.18, 0.8], [sw * 0.88, 1.0], [sw * 0.94, 0.7]] as [number, number][]) {
        const by = sh * 0.84;
        const br = 6 * bScale;
        g.moveTo(bx + br, by);
        for (let s = 1; s <= 7; s++) {
          const a = (s / 7) * Math.PI * 2;
          const rr = br * (0.8 + Math.sin(s * 2.5) * 0.2); // irregular
          g.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.6);
        }
        g.closePath().fill({ color: 0x2a2a2a, alpha: 0.08 });
      }
      // Embers floating up (more of them)
      for (let i = 0; i < 8; i++) {
        const ex = sw * (0.05 + 0.12 * i) + Math.sin(t + i) * 15;
        const ey = sh * 0.85 - ((t * 40 + i * 80) % (sh * 0.5));
        const eSize = 1 + Math.sin(i * 2.3) * 0.5;
        g.circle(ex, ey, eSize).fill({ color: 0xff6600, alpha: 0.08 * (ey / sh) });
        // Ember trail
        g.circle(ex - Math.sin(t + i) * 2, ey + 5, eSize * 0.6).fill({ color: 0xff4400, alpha: 0.04 * (ey / sh) });
      }
      // Smoke plumes (stacked ellipses rising)
      for (const smokeX of [sw * 0.2, sw * 0.75]) {
        for (let s = 0; s < 4; s++) {
          const sy = sh * 0.85 - s * 15 - ((t * 20) % 60);
          const sAlpha = Math.max(0, 0.03 - s * 0.005 - ((t * 20) % 60) * 0.0003);
          g.ellipse(smokeX + Math.sin(t * 0.5 + s) * 8, sy, 10 + s * 4, 5 + s * 2).fill({ color: 0x333333, alpha: sAlpha });
        }
      }
    } else {
      // ACT V: Throne room — gothic arches, pillars, banners, mosaic floor
      // Mosaic floor (diamond tile pattern)
      g.rect(0, sh * 0.8, sw, sh * 0.2).fill({ color: 0x0a0a12, alpha: 0.15 });
      for (let fx = 0; fx < sw; fx += 20) {
        for (let fy = sh * 0.8; fy < sh; fy += 14) {
          const off = ((fy - sh * 0.8) / 14) % 2 === 0 ? 0 : 10;
          g.moveTo(fx + off, fy).lineTo(fx + off + 10, fy + 7).lineTo(fx + off, fy + 14).lineTo(fx + off - 10, fy + 7).closePath()
            .fill({ color: (fx / 20 + fy / 14) % 2 === 0 ? 0x1a1a2a : 0x0a0a14, alpha: 0.04 });
        }
      }
      // Dark carpet (polygon with fringe)
      g.moveTo(sw * 0.33, 0).lineTo(sw * 0.67, 0).lineTo(sw * 0.65, sh).lineTo(sw * 0.35, sh).closePath()
        .fill({ color: 0x2a0a0a, alpha: 0.08 });
      // Carpet fringe (zigzag)
      for (let fy = 0; fy < sh; fy += 8) {
        g.moveTo(sw * 0.34, fy).lineTo(sw * 0.33, fy + 4).lineTo(sw * 0.34, fy + 8)
          .stroke({ color: COL_GOLD, width: 0.5, alpha: 0.03 });
        g.moveTo(sw * 0.66, fy).lineTo(sw * 0.67, fy + 4).lineTo(sw * 0.66, fy + 8)
          .stroke({ color: COL_GOLD, width: 0.5, alpha: 0.03 });
      }
      // Pillars with polygon capitals
      for (const px of [sw * 0.08, sw * 0.22, sw * 0.78, sw * 0.92]) {
        g.rect(px - 5, sh * 0.1, 10, sh * 0.8).fill({ color: 0x2a2a3a, alpha: 0.1 });
        // Ornate capital (polygon crown shape)
        g.moveTo(px - 9, sh * 0.1).lineTo(px - 7, sh * 0.07).lineTo(px - 4, sh * 0.08).lineTo(px, sh * 0.06)
          .lineTo(px + 4, sh * 0.08).lineTo(px + 7, sh * 0.07).lineTo(px + 9, sh * 0.1).closePath()
          .fill({ color: 0x3a3a4a, alpha: 0.09 });
        // Base (stepped polygon)
        g.moveTo(px - 8, sh * 0.88).lineTo(px - 8, sh * 0.91).lineTo(px - 6, sh * 0.91).lineTo(px - 6, sh * 0.93)
          .lineTo(px + 6, sh * 0.93).lineTo(px + 6, sh * 0.91).lineTo(px + 8, sh * 0.91).lineTo(px + 8, sh * 0.88).closePath()
          .fill({ color: 0x3a3a4a, alpha: 0.08 });
        // Fluting lines
        for (let f = -2; f <= 2; f++) {
          g.moveTo(px + f * 2, sh * 0.12).lineTo(px + f * 2, sh * 0.86).stroke({ color: 0x1a1a2a, width: 0.5, alpha: 0.04 });
        }
      }
      // Gothic arches between pillars (pointed arch polygons)
      for (const [ax1, ax2] of [[sw * 0.08, sw * 0.22], [sw * 0.78, sw * 0.92]]) {
        const archMid = (ax1 + ax2) / 2;
        const archTop = sh * 0.04;
        g.moveTo(ax1, sh * 0.1).bezierCurveTo(ax1, archTop, archMid, archTop - 10, archMid, archTop)
          .bezierCurveTo(archMid, archTop - 10, ax2, archTop, ax2, sh * 0.1)
          .stroke({ color: 0x3a3a4a, width: 1.5, alpha: 0.07 });
      }
      // Banners (polygon pennants hanging from arches)
      for (const [bx, col2] of [[sw * 0.15, 0x8a2222], [sw * 0.85, 0x22228a]] as [number, number][]) {
        const by = sh * 0.08;
        const bw = 8, bh = 30 + Math.sin(t * 1.5 + bx) * 2;
        g.moveTo(bx - bw, by).lineTo(bx + bw, by).lineTo(bx + bw, by + bh * 0.7)
          .lineTo(bx, by + bh).lineTo(bx - bw, by + bh * 0.7).closePath()
          .fill({ color: col2, alpha: 0.06 });
        // Banner emblem (diamond)
        g.moveTo(bx, by + 8).lineTo(bx + 4, by + 14).lineTo(bx, by + 20).lineTo(bx - 4, by + 14).closePath()
          .fill({ color: COL_GOLD, alpha: 0.04 });
      }
      // Stained glass windows (polygon rosette)
      const glassColors = [0xff4444, 0x4444ff, COL_GOLD];
      for (let i = 0; i < 3; i++) {
        const gx = sw * (0.3 + i * 0.2);
        const gy = sh * 0.08;
        const glowA = 0.03 + 0.01 * Math.sin(t * 0.5 + i);
        // Rosette frame (octagonal)
        for (let s = 0; s < 8; s++) {
          const a1 = (s / 8) * Math.PI * 2, a2 = ((s + 1) / 8) * Math.PI * 2;
          g.moveTo(gx + Math.cos(a1) * 14, gy + Math.sin(a1) * 14)
            .lineTo(gx + Math.cos(a2) * 14, gy + Math.sin(a2) * 14)
            .stroke({ color: 0x4a4a5a, width: 1, alpha: 0.06 });
        }
        // Inner colored fill
        g.circle(gx, gy, 12).fill({ color: glassColors[i], alpha: glowA });
        // Light beam (trapezoid)
        g.moveTo(gx - 5, gy + 14).lineTo(gx + 5, gy + 14).lineTo(gx + 15, sh * 0.35).lineTo(gx - 15, sh * 0.35).closePath()
          .fill({ color: glassColors[i], alpha: glowA * 0.15 });
      }
      // Dark floating orbs (Mordred's magic)
      for (let i = 0; i < 4; i++) {
        const dx = sw * (0.15 + 0.23 * i) + Math.sin(t * 0.4 + i * 3) * 30;
        const dy = sh * 0.5 + Math.cos(t * 0.3 + i * 2) * 40;
        g.circle(dx, dy, 3).fill({ color: 0xff2244, alpha: 0.04 });
        g.circle(dx, dy, 7).fill({ color: 0xff2244, alpha: 0.01 });
      }
    }
  }
}
