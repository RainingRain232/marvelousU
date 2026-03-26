// ---------------------------------------------------------------------------
// SWORD OF AVALON — 2D Swordfighting Game
// Deep skeletal-animation combat with parrying, combos, stances, dodge rolls,
// stamina management, and an AI opponent. Fullscreen HTML5 Canvas.
// ---------------------------------------------------------------------------

import { viewManager } from "../view/ViewManager";
import { audioManager } from "../audio/AudioManager";

// ── Constants ────────────────────────────────────────────────────────────────

const HEALTH_MAX = 100;
const STAMINA_MAX = 100;
const GRAVITY = 0.6;
const MOVE_SPEED = 3.5;
const JUMP_FORCE = -12;
const DODGE_SPEED = 10;
const DODGE_FRAMES = 18;
const PARRY_WINDOW = 10;
const COMBO_WINDOW = 25;
const HITSTOP_FRAMES = 6;
const GROUND_Y_RATIO = 0.78;

interface AttackDef {
  damage: number;
  stamina: number;
  windup: number;
  active: number;
  recovery: number;
  reach: number;
  arc: number;
}

const ATTACKS: Record<string, AttackDef> = {
  slash:    { damage: 12, stamina: 12, windup: 10, active: 6, recovery: 12, reach: 70, arc: 1.2 },
  thrust:   { damage: 16, stamina: 15, windup: 14, active: 5, recovery: 14, reach: 85, arc: 0.3 },
  overhead: { damage: 22, stamina: 20, windup: 18, active: 6, recovery: 16, reach: 65, arc: 1.5 },
  sweep:    { damage: 10, stamina: 10, windup: 8,  active: 8, recovery: 10, reach: 75, arc: 1.0 },
};

interface StanceDef {
  dmgMul: number;
  defMul: number;
  spdMul: number;
  staminaRegen: number;
  color: string;
}

const STANCES: Record<string, StanceDef> = {
  aggressive: { dmgMul: 1.3, defMul: 0.7, spdMul: 1.15, staminaRegen: 0.25, color: "#c04040" },
  balanced:   { dmgMul: 1.0, defMul: 1.0, spdMul: 1.0,  staminaRegen: 0.4,  color: "#d4a843" },
  defensive:  { dmgMul: 0.7, defMul: 1.4, spdMul: 0.85, staminaRegen: 0.55, color: "#4080c0" },
};

interface ComboDef {
  name: string;
  dmgBonus: number;
  effect: string;
}

const COMBOS: Record<string, ComboDef> = {
  "slash,slash,thrust":   { name: "LANCELOT FURY",  dmgBonus: 1.5, effect: "stagger" },
  "slash,overhead":       { name: "DRAGON STRIKE",   dmgBonus: 1.8, effect: "knockback" },
  "thrust,thrust,slash":  { name: "SERPENT FANG",    dmgBonus: 1.4, effect: "stagger" },
  "sweep,slash,overhead": { name: "AVALON WRATH",    dmgBonus: 2.0, effect: "knockdown" },
  "slash,slash,slash":    { name: "TRIPLE EDGE",     dmgBonus: 1.3, effect: "none" },
  "thrust,sweep":         { name: "VIPER SWEEP",     dmgBonus: 1.4, effect: "stagger" },
  "overhead,sweep":       { name: "CRUSHING TIDE",   dmgBonus: 1.6, effect: "knockback" },
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

const J = {
  PELVIS: 0, SPINE: 1, CHEST: 2, NECK: 3, HEAD: 4,
  L_SHOULDER: 5, L_UPPER_ARM: 6, L_FOREARM: 7, L_HAND: 8,
  R_SHOULDER: 9, R_UPPER_ARM: 10, R_FOREARM: 11, R_HAND: 12,
  L_HIP: 13, L_THIGH: 14, L_SHIN: 15, L_FOOT: 16,
  R_HIP: 17, R_THIGH: 18, R_SHIN: 19, R_FOOT: 20,
} as const;

const JOINT_COUNT = 21;

// [parent, length, default_angle]
const BONE_DEF: [number, number, number][] = [];
BONE_DEF[J.PELVIS]      = [-1, 0, 0];
BONE_DEF[J.SPINE]       = [J.PELVIS, 18, -Math.PI / 2];
BONE_DEF[J.CHEST]       = [J.SPINE, 18, 0];
BONE_DEF[J.NECK]        = [J.CHEST, 10, 0];
BONE_DEF[J.HEAD]        = [J.NECK, 12, 0];
BONE_DEF[J.L_SHOULDER]  = [J.CHEST, 8, Math.PI * 0.8];
BONE_DEF[J.L_UPPER_ARM] = [J.L_SHOULDER, 22, 0.3];
BONE_DEF[J.L_FOREARM]   = [J.L_UPPER_ARM, 20, 0.5];
BONE_DEF[J.L_HAND]      = [J.L_FOREARM, 8, 0];
BONE_DEF[J.R_SHOULDER]  = [J.CHEST, 8, -Math.PI * 0.8];
BONE_DEF[J.R_UPPER_ARM] = [J.R_SHOULDER, 22, -0.3];
BONE_DEF[J.R_FOREARM]   = [J.R_UPPER_ARM, 20, -0.5];
BONE_DEF[J.R_HAND]      = [J.R_FOREARM, 8, 0];
BONE_DEF[J.L_HIP]       = [J.PELVIS, 10, Math.PI / 2 + 0.2];
BONE_DEF[J.L_THIGH]     = [J.L_HIP, 26, 0.1];
BONE_DEF[J.L_SHIN]      = [J.L_THIGH, 24, 0.1];
BONE_DEF[J.L_FOOT]      = [J.L_SHIN, 10, 0.8];
BONE_DEF[J.R_HIP]       = [J.PELVIS, 10, Math.PI / 2 - 0.2];
BONE_DEF[J.R_THIGH]     = [J.R_HIP, 26, -0.1];
BONE_DEF[J.R_SHIN]      = [J.R_THIGH, 24, -0.1];
BONE_DEF[J.R_FOOT]      = [J.R_SHIN, 10, -0.8];

// ── Poses ────────────────────────────────────────────────────────────────────

function makePose(overrides: Record<number, number>): Float64Array {
  const p = new Float64Array(JOINT_COUNT);
  for (const [j, a] of Object.entries(overrides)) p[parseInt(j)] = a;
  return p;
}

const POSES: Record<string, Float64Array> = {
  idle_balanced: makePose({
    [J.SPINE]: 0.05, [J.CHEST]: -0.05, [J.HEAD]: 0.05,
    [J.R_UPPER_ARM]: 0.4, [J.R_FOREARM]: -0.8, [J.R_HAND]: -0.2,
    [J.L_UPPER_ARM]: -0.2, [J.L_FOREARM]: 0.4,
  }),
  idle_aggressive: makePose({
    [J.SPINE]: 0.15, [J.CHEST]: -0.1, [J.HEAD]: 0.1,
    [J.R_UPPER_ARM]: 0.2, [J.R_FOREARM]: -0.5, [J.R_HAND]: -0.3,
    [J.L_UPPER_ARM]: -0.4, [J.L_FOREARM]: 0.6,
  }),
  idle_defensive: makePose({
    [J.SPINE]: -0.1, [J.CHEST]: 0.05, [J.HEAD]: 0,
    [J.R_UPPER_ARM]: 0.7, [J.R_FOREARM]: -1.2, [J.R_HAND]: 0.1,
    [J.L_UPPER_ARM]: 0.1, [J.L_FOREARM]: 0.2,
    [J.L_THIGH]: 0.15, [J.R_THIGH]: -0.15,
  }),
  walk1: makePose({
    [J.L_THIGH]: -0.4, [J.L_SHIN]: 0.3, [J.R_THIGH]: 0.4, [J.R_SHIN]: -0.1,
    [J.SPINE]: 0.05, [J.L_UPPER_ARM]: 0.2, [J.R_UPPER_ARM]: 0.4,
  }),
  walk2: makePose({
    [J.L_THIGH]: 0.4, [J.L_SHIN]: -0.1, [J.R_THIGH]: -0.4, [J.R_SHIN]: 0.3,
    [J.SPINE]: 0.05, [J.L_UPPER_ARM]: -0.1, [J.R_UPPER_ARM]: 0.5,
  }),
  slash_windup: makePose({
    [J.CHEST]: -0.3, [J.SPINE]: -0.15,
    [J.R_UPPER_ARM]: -1.2, [J.R_FOREARM]: -0.4, [J.R_HAND]: -0.3,
    [J.L_UPPER_ARM]: 0.3, [J.L_FOREARM]: 0.8,
  }),
  slash_active: makePose({
    [J.CHEST]: 0.4, [J.SPINE]: 0.2,
    [J.R_UPPER_ARM]: 1.0, [J.R_FOREARM]: 0.2, [J.R_HAND]: 0.1,
    [J.L_UPPER_ARM]: -0.3, [J.L_FOREARM]: 0.3,
  }),
  slash_recovery: makePose({
    [J.CHEST]: 0.2, [J.SPINE]: 0.1,
    [J.R_UPPER_ARM]: 0.8, [J.R_FOREARM]: -0.2,
    [J.L_UPPER_ARM]: -0.1, [J.L_FOREARM]: 0.3,
  }),
  thrust_windup: makePose({
    [J.CHEST]: -0.2, [J.SPINE]: -0.1,
    [J.R_UPPER_ARM]: -0.3, [J.R_FOREARM]: -1.5, [J.R_HAND]: 0,
    [J.L_UPPER_ARM]: 0.4, [J.L_FOREARM]: 0.9,
    [J.R_THIGH]: -0.2, [J.L_THIGH]: 0.2,
  }),
  thrust_active: makePose({
    [J.CHEST]: 0.15, [J.SPINE]: 0.15,
    [J.R_UPPER_ARM]: 0.1, [J.R_FOREARM]: -0.1, [J.R_HAND]: 0,
    [J.L_UPPER_ARM]: -0.5, [J.L_FOREARM]: 0.2,
    [J.R_THIGH]: 0.1, [J.L_THIGH]: -0.15,
  }),
  thrust_recovery: makePose({
    [J.CHEST]: 0.1, [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.4,
  }),
  overhead_windup: makePose({
    [J.CHEST]: -0.4, [J.SPINE]: -0.2,
    [J.R_UPPER_ARM]: -1.8, [J.R_FOREARM]: -1.0, [J.R_HAND]: -0.5,
    [J.L_UPPER_ARM]: -0.5, [J.L_FOREARM]: 0.3,
    [J.L_THIGH]: 0.2, [J.R_THIGH]: -0.2,
  }),
  overhead_active: makePose({
    [J.CHEST]: 0.5, [J.SPINE]: 0.3,
    [J.R_UPPER_ARM]: 1.4, [J.R_FOREARM]: 0.5, [J.R_HAND]: 0.3,
    [J.L_UPPER_ARM]: -0.4, [J.L_FOREARM]: 0.2,
  }),
  overhead_recovery: makePose({
    [J.CHEST]: 0.3, [J.SPINE]: 0.15,
    [J.R_UPPER_ARM]: 1.0, [J.R_FOREARM]: 0.2,
  }),
  sweep_windup: makePose({
    [J.SPINE]: 0.1, [J.CHEST]: 0.2,
    [J.R_UPPER_ARM]: 0.6, [J.R_FOREARM]: 0.4, [J.R_HAND]: 0.2,
    [J.L_UPPER_ARM]: -0.3,
    [J.L_THIGH]: 0.3, [J.R_THIGH]: -0.1,
  }),
  sweep_active: makePose({
    [J.SPINE]: -0.1, [J.CHEST]: -0.2,
    [J.R_UPPER_ARM]: 1.2, [J.R_FOREARM]: 0.6, [J.R_HAND]: 0.3,
    [J.L_UPPER_ARM]: 0.2,
    [J.L_THIGH]: -0.2, [J.L_SHIN]: 0.4,
  }),
  sweep_recovery: makePose({
    [J.R_UPPER_ARM]: 0.9, [J.R_FOREARM]: 0.3,
  }),
  block: makePose({
    [J.SPINE]: -0.15, [J.CHEST]: -0.1,
    [J.R_UPPER_ARM]: -0.8, [J.R_FOREARM]: -1.4, [J.R_HAND]: 0.2,
    [J.L_UPPER_ARM]: 0.5, [J.L_FOREARM]: 1.0,
    [J.L_THIGH]: 0.15, [J.R_THIGH]: -0.15,
  }),
  parry_success: makePose({
    [J.SPINE]: 0.1, [J.CHEST]: 0.15,
    [J.R_UPPER_ARM]: -0.2, [J.R_FOREARM]: -0.8, [J.R_HAND]: 0.4,
    [J.L_UPPER_ARM]: -0.3, [J.L_FOREARM]: 0.4,
  }),
  stagger: makePose({
    [J.SPINE]: -0.4, [J.CHEST]: -0.3, [J.HEAD]: -0.2,
    [J.R_UPPER_ARM]: 0.5, [J.R_FOREARM]: 0.3,
    [J.L_UPPER_ARM]: 0.3, [J.L_FOREARM]: -0.2,
    [J.L_THIGH]: 0.2, [J.R_THIGH]: -0.3,
  }),
  knockdown: makePose({
    [J.SPINE]: -1.0, [J.CHEST]: -0.5, [J.HEAD]: -0.3,
    [J.R_UPPER_ARM]: 1.5, [J.R_FOREARM]: 0.5,
    [J.L_UPPER_ARM]: 1.2, [J.L_FOREARM]: 0.3,
    [J.L_THIGH]: -0.8, [J.L_SHIN]: 0.5,
    [J.R_THIGH]: -0.6, [J.R_SHIN]: 0.4,
  }),
  death: makePose({
    [J.SPINE]: -1.2, [J.CHEST]: -0.6, [J.HEAD]: -0.5, [J.NECK]: -0.3,
    [J.R_UPPER_ARM]: 1.8, [J.R_FOREARM]: 0.8,
    [J.L_UPPER_ARM]: 1.5, [J.L_FOREARM]: 0.5,
    [J.L_THIGH]: -1.0, [J.L_SHIN]: 0.8,
    [J.R_THIGH]: -0.8, [J.R_SHIN]: 0.6,
  }),
  dodge: makePose({
    [J.SPINE]: 0.3, [J.CHEST]: 0.2,
    [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.4,
    [J.L_UPPER_ARM]: -0.2,
    [J.L_THIGH]: -0.5, [J.L_SHIN]: 0.8,
    [J.R_THIGH]: 0.3, [J.R_SHIN]: 0.2,
  }),
  crouch: makePose({
    [J.SPINE]: 0.3, [J.CHEST]: 0.1,
    [J.L_THIGH]: -0.6, [J.L_SHIN]: 1.0,
    [J.R_THIGH]: -0.5, [J.R_SHIN]: 0.9,
    [J.R_UPPER_ARM]: 0.5, [J.R_FOREARM]: -0.9,
  }),
  jump: makePose({
    [J.L_THIGH]: -0.3, [J.L_SHIN]: -0.2,
    [J.R_THIGH]: 0.2, [J.R_SHIN]: 0.3,
    [J.R_UPPER_ARM]: -0.5, [J.R_FOREARM]: -0.6,
    [J.L_UPPER_ARM]: 0.3,
  }),
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Bone {
  parent: number;
  length: number;
  baseAngle: number;
  angle: number;
  worldX: number;
  worldY: number;
  worldAngle: number;
}

interface Skeleton {
  bones: Bone[];
  rootX: number;
  rootY: number;
  scale: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  type: string; grav: number;
  rot: number; rotSpd: number;
}

interface TrailPoint { x: number; y: number; }

interface FighterConfig {
  color: string;
  armorColor: string;
  swordColor: string;
  name: string;
  isAI: boolean;
}

interface Fighter {
  x: number; y: number; vx: number; vy: number;
  facing: number;
  grounded: boolean;
  hp: number; stamina: number;
  stance: string;
  skeleton: Skeleton;
  targetPose: Float64Array;
  walkCycle: number;
  currentAttack: AttackDef | null;
  attackType: string | null;
  attackPhase: string | null;
  attackTimer: number;
  attackHit: boolean;
  blocking: boolean;
  parrying: boolean;
  parryTimer: number;
  blockHeld: boolean;
  dodging: boolean;
  dodgeTimer: number;
  dodgeDir: number;
  invulnerable: boolean;
  comboCount: number;
  comboTimer: number;
  comboSequence: string[];
  staggered: boolean;
  staggerTimer: number;
  knockedDown: boolean;
  knockdownTimer: number;
  dead: boolean;
  deathTimer: number;
  exhausted: boolean;
  crouching: boolean;
  swordTrail: TrailPoint[];
  swordTipX: number;
  swordTipY: number;
  color: string;
  armorColor: string;
  swordColor: string;
  name: string;
  isAI: boolean;
  aiTimer: number;
  aiAction: string | null;
  aiReactionDelay: number;
  stepTimer: number;
}

type Phase = "title" | "playing" | "game_over" | "victory";

// ── Utilities ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function clamp(v: number, mn: number, mx: number): number { return Math.max(mn, Math.min(mx, v)); }
function rand(a: number, b: number): number { return a + Math.random() * (b - a); }
function randInt(a: number, b: number): number { return Math.floor(rand(a, b + 1)); }

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const r = clamp(((num >> 16) & 0xff) + percent, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + percent, 0, 255);
  const b = clamp((num & 0xff) + percent, 0, 255);
  return `rgb(${r},${g},${b})`;
}

// ── Main Game Class ──────────────────────────────────────────────────────────

export class SwordOfAvalonGame {
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _animFrame = 0;
  private _phase: Phase = "title";
  private _difficulty = 1; // 0=squire, 1=knight, 2=champion
  private _frameCount = 0;

  private _player!: Fighter;
  private _ai!: Fighter;

  private _particles: Particle[] = [];
  private _shakeX = 0;
  private _shakeY = 0;
  private _shakeIntensity = 0;
  private _hitstopTimer = 0;

  private _comboDisplayName = "";
  private _comboDisplayTimer = 0;
  private _comboDisplayCount = 0;

  private _stats = { hitsLanded: 0, hitsTaken: 0, parries: 0, combos: 0, maxCombo: 0 };

  private _keys: Record<string, boolean> = {};
  private _justPressed: Record<string, boolean> = {};
  private _prevKeys: Record<string, boolean> = {};

  // Audio
  private _audioCtx: AudioContext | null = null;

  // HUD
  private _hud: HTMLDivElement | null = null;
  private _titleOverlay: HTMLDivElement | null = null;
  private _resultOverlay: HTMLDivElement | null = null;

  private _destroyed = false;

  // Bound handlers
  private _onKeyDown = (e: KeyboardEvent) => this._handleKeyDown(e);
  private _onKeyUp = (e: KeyboardEvent) => this._handleKeyUp(e);
  private _onResize = () => this._resizeCanvas();

  // ── Boot & Destroy ───────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    this._audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;cursor:none;";
    document.body.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d")!;
    this._resizeCanvas();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("resize", this._onResize);

    this._phase = "title";
    this._showTitle();

    const loop = () => {
      if (this._destroyed) return;
      this._animFrame = requestAnimationFrame(loop);
      this._tick();
    };
    loop();
  }

  destroy(): void {
    this._destroyed = true;
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("resize", this._onResize);
    this._titleOverlay?.parentNode?.removeChild(this._titleOverlay);
    this._resultOverlay?.parentNode?.removeChild(this._resultOverlay);
    this._hud?.parentNode?.removeChild(this._hud);
    this._canvas?.parentNode?.removeChild(this._canvas);
    this._audioCtx?.close().catch(() => {});
    this._audioCtx = null;
  }

  // ── Canvas ───────────────────────────────────────────────────────────────

  private _resizeCanvas(): void {
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }

  private get _W(): number { return this._canvas.width; }
  private get _H(): number { return this._canvas.height; }
  private get _groundY(): number { return this._H * GROUND_Y_RATIO; }

  // ── Input ────────────────────────────────────────────────────────────────

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this._cleanup();
      return;
    }
    this._keys[e.key.toLowerCase()] = true;
    e.preventDefault();
  }

  private _handleKeyUp(e: KeyboardEvent): void {
    this._keys[e.key.toLowerCase()] = false;
    e.preventDefault();
  }

  private _updateInput(): void {
    for (const k in this._keys) {
      this._justPressed[k] = this._keys[k] && !this._prevKeys[k];
      this._prevKeys[k] = this._keys[k];
    }
  }

  private _cleanup(): void {
    this.destroy();
    window.dispatchEvent(new Event("swordOfAvalonExit"));
  }

  // ── Audio ────────────────────────────────────────────────────────────────

  private _playSound(type: string, vol = 0.3): void {
    const ac = this._audioCtx;
    if (!ac) return;
    try {
      const now = ac.currentTime;
      const g = ac.createGain();
      g.connect(ac.destination);
      g.gain.setValueAtTime(vol, now);

      if (type === "slash") {
        const o = ac.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(200, now);
        o.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        const bq = ac.createBiquadFilter();
        bq.type = "highpass"; bq.frequency.value = 300;
        o.connect(bq); bq.connect(g);
        o.start(now); o.stop(now + 0.15);
      } else if (type === "clash") {
        for (let i = 0; i < 3; i++) {
          const o = ac.createOscillator();
          o.type = "square";
          o.frequency.setValueAtTime(800 + i * 400 + Math.random() * 200, now);
          o.frequency.exponentialRampToValueAtTime(200 + i * 100, now + 0.2);
          const g2 = ac.createGain();
          g2.gain.setValueAtTime(vol * 0.4, now);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          o.connect(g2); g2.connect(ac.destination);
          o.start(now); o.stop(now + 0.2);
        }
      } else if (type === "hit") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bq = ac.createBiquadFilter();
        bq.type = "lowpass"; bq.frequency.value = 600;
        src.connect(bq); bq.connect(g);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        src.start(now);
      } else if (type === "parry") {
        const o = ac.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(1200, now);
        o.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
        o.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        g.gain.setValueAtTime(vol * 0.6, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        o.connect(g);
        o.start(now); o.stop(now + 0.3);
      } else if (type === "dodge") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (data.length * 0.4));
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bq = ac.createBiquadFilter();
        bq.type = "bandpass"; bq.frequency.value = 1500; bq.Q.value = 2;
        src.connect(bq); bq.connect(g);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        src.start(now);
      } else if (type === "step") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15 * Math.exp(-i / (data.length * 0.15));
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bq = ac.createBiquadFilter();
        bq.type = "lowpass"; bq.frequency.value = 400;
        src.connect(bq); bq.connect(g);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.start(now);
      } else if (type === "combo") {
        const o = ac.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(600, now);
        o.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        g.gain.setValueAtTime(vol * 0.5, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g);
        o.start(now); o.stop(now + 0.2);
      } else if (type === "death") {
        for (let i = 0; i < 4; i++) {
          const o = ac.createOscillator();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(300 - i * 50, now + i * 0.15);
          o.frequency.exponentialRampToValueAtTime(40, now + i * 0.15 + 0.4);
          const g2 = ac.createGain();
          g2.gain.setValueAtTime(vol * 0.3, now + i * 0.15);
          g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
          o.connect(g2); g2.connect(ac.destination);
          o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.4);
        }
      } else if (type === "victory") {
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
          const o = ac.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(f, now + i * 0.15);
          const g2 = ac.createGain();
          g2.gain.setValueAtTime(vol * 0.4, now + i * 0.15);
          g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
          o.connect(g2); g2.connect(ac.destination);
          o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.5);
        });
      }
    } catch (_) { /* ignore audio errors */ }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────

  private _createSkeleton(): Skeleton {
    const bones: Bone[] = [];
    for (let i = 0; i < JOINT_COUNT; i++) {
      bones.push({
        parent: BONE_DEF[i][0], length: BONE_DEF[i][1],
        baseAngle: BONE_DEF[i][2], angle: BONE_DEF[i][2],
        worldX: 0, worldY: 0, worldAngle: 0,
      });
    }
    return { bones, rootX: 0, rootY: 0, scale: 1 };
  }

  private _solveFK(sk: Skeleton): void {
    for (let i = 0; i < JOINT_COUNT; i++) {
      const b = sk.bones[i];
      if (b.parent === -1) {
        b.worldX = sk.rootX; b.worldY = sk.rootY; b.worldAngle = b.angle;
      } else {
        const p = sk.bones[b.parent];
        b.worldAngle = p.worldAngle + b.angle;
        b.worldX = p.worldX + Math.cos(b.worldAngle) * b.length * sk.scale;
        b.worldY = p.worldY + Math.sin(b.worldAngle) * b.length * sk.scale;
      }
    }
  }

  private _applyPose(sk: Skeleton, pose: Float64Array, t: number): void {
    for (let i = 0; i < JOINT_COUNT; i++) {
      const target = BONE_DEF[i][2] + pose[i];
      sk.bones[i].angle = lerpAngle(sk.bones[i].angle, target, t);
    }
  }

  private _blendPoses(a: Float64Array, b: Float64Array, t: number): Float64Array {
    const r = new Float64Array(JOINT_COUNT);
    for (let i = 0; i < JOINT_COUNT; i++) r[i] = lerp(a[i], b[i], t);
    return r;
  }

  // ── Particles ────────────────────────────────────────────────────────────

  private _spawnParticle(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, type: string, grav = 0): void {
    if (this._particles.length > 600) this._particles.splice(0, 50);
    this._particles.push({ x, y, vx, vy, life, maxLife: life, size, color, type, grav, rot: 0, rotSpd: rand(-0.2, 0.2) });
  }

  private _spawnSparks(x: number, y: number, count: number, intensity = 1): void {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI, Math.PI);
      const s = rand(3, 8) * intensity;
      const colors = ["#ffd700", "#ff8c00", "#ffaa33", "#fff"];
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(10, 25), rand(1, 3), colors[randInt(0, 3)], "spark", 0.15);
    }
  }

  private _spawnBlood(x: number, y: number, count: number, dir = 0): void {
    for (let i = 0; i < count; i++) {
      const a = dir + rand(-0.8, 0.8);
      const s = rand(2, 6);
      const colors = ["#8b0000", "#a00000", "#c02020", "#600"];
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(15, 35), rand(2, 5), colors[randInt(0, 3)], "blood", 0.3);
    }
  }

  private _spawnDust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI, -0.3);
      const s = rand(0.5, 2);
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(20, 40), rand(3, 8), "rgba(150,130,100,0.4)", "dust", -0.02);
    }
  }

  private _updateParticles(): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += p.grav; p.vx *= 0.97; p.vy *= 0.97;
      p.life--; p.rot += p.rotSpd;
      if (p.life <= 0) this._particles.splice(i, 1);
    }
  }

  // ── Screen Shake ─────────────────────────────────────────────────────────

  private _triggerShake(intensity: number): void {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  private _updateShake(): void {
    if (this._shakeIntensity > 0.5) {
      this._shakeX = (Math.random() - 0.5) * this._shakeIntensity;
      this._shakeY = (Math.random() - 0.5) * this._shakeIntensity;
      this._shakeIntensity *= 0.85;
    } else {
      this._shakeX = this._shakeY = this._shakeIntensity = 0;
    }
  }

  // ── Fighter ──────────────────────────────────────────────────────────────

  private _createFighter(x: number, facing: number, config: FighterConfig): Fighter {
    return {
      x, y: 0, vx: 0, vy: 0, facing, grounded: true,
      hp: HEALTH_MAX, stamina: STAMINA_MAX,
      stance: "balanced",
      skeleton: this._createSkeleton(),
      targetPose: POSES.idle_balanced,
      walkCycle: 0,
      currentAttack: null, attackType: null, attackPhase: null,
      attackTimer: 0, attackHit: false,
      blocking: false, parrying: false, parryTimer: 0, blockHeld: false,
      dodging: false, dodgeTimer: 0, dodgeDir: 0, invulnerable: false,
      comboCount: 0, comboTimer: 0, comboSequence: [],
      staggered: false, staggerTimer: 0,
      knockedDown: false, knockdownTimer: 0,
      dead: false, deathTimer: 0,
      exhausted: false, crouching: false,
      swordTrail: [], swordTipX: 0, swordTipY: 0,
      color: config.color, armorColor: config.armorColor,
      swordColor: config.swordColor, name: config.name,
      isAI: config.isAI,
      aiTimer: 0, aiAction: null, aiReactionDelay: 0, stepTimer: 0,
    };
  }

  private _getIdlePose(f: Fighter): Float64Array {
    if (f.stance === "aggressive") return POSES.idle_aggressive;
    if (f.stance === "defensive") return POSES.idle_defensive;
    return POSES.idle_balanced;
  }

  private _startAttack(f: Fighter, type: string): void {
    if (f.dead || f.staggered || f.knockedDown || f.dodging) return;
    if (f.attackPhase && f.attackPhase !== "recovery") return;
    const atk = ATTACKS[type];
    if (f.stamina < atk.stamina) return;

    if (f.attackPhase === "recovery") f.comboTimer = COMBO_WINDOW;

    f.stamina -= atk.stamina;
    f.currentAttack = atk; f.attackType = type;
    f.attackPhase = "windup"; f.attackTimer = atk.windup;
    f.attackHit = false; f.blocking = false; f.parrying = false;

    if (f.comboTimer > 0) {
      f.comboSequence.push(type); f.comboCount++;
    } else {
      f.comboSequence = [type]; f.comboCount = 1;
    }
    f.comboTimer = COMBO_WINDOW;
    this._playSound("slash", 0.15);
  }

  private _startBlock(f: Fighter): void {
    if (f.dead || f.staggered || f.knockedDown || f.dodging || f.attackPhase) return;
    if (!f.blockHeld && !f.blocking) {
      f.parrying = true; f.parryTimer = PARRY_WINDOW;
    }
    f.blocking = true; f.blockHeld = true;
  }

  private _stopBlock(f: Fighter): void {
    f.blocking = false; f.blockHeld = false; f.parrying = false;
  }

  private _startDodge(f: Fighter, dir: number): void {
    if (f.dead || f.staggered || f.knockedDown || f.dodging) return;
    if (f.stamina < 20) return;
    f.stamina -= 20;
    f.dodging = true; f.dodgeTimer = DODGE_FRAMES;
    f.dodgeDir = dir || -f.facing; f.invulnerable = true;
    f.blocking = false; f.parrying = false;
    f.attackPhase = null; f.currentAttack = null;
    this._playSound("dodge", 0.2);
    this._spawnDust(f.x, this._groundY, 5);
  }

  private _updateFighter(f: Fighter): void {
    const st = STANCES[f.stance];

    if (f.dead) {
      f.deathTimer++;
      f.targetPose = POSES.death;
      this._applyPose(f.skeleton, f.targetPose, 0.08);
      f.y = Math.min(f.y, this._groundY + 20);
      this._solveFK(f.skeleton);
      return;
    }

    if (f.dodging) {
      f.dodgeTimer--;
      f.x += f.dodgeDir * DODGE_SPEED * (f.dodgeTimer / DODGE_FRAMES);
      f.targetPose = POSES.dodge;
      if (f.dodgeTimer <= 0) { f.dodging = false; f.invulnerable = false; }
    }
    if (f.staggered) {
      f.staggerTimer--;
      f.targetPose = POSES.stagger;
      if (f.staggerTimer <= 0) f.staggered = false;
    }
    if (f.knockedDown) {
      f.knockdownTimer--;
      f.targetPose = POSES.knockdown;
      if (f.knockdownTimer <= 0) f.knockedDown = false;
    }

    if (f.attackPhase) {
      f.attackTimer--;
      if (f.attackPhase === "windup") {
        f.targetPose = POSES[f.attackType + "_windup"];
        if (f.attackTimer <= 0) { f.attackPhase = "active"; f.attackTimer = f.currentAttack!.active; f.attackHit = false; }
      } else if (f.attackPhase === "active") {
        f.targetPose = POSES[f.attackType + "_active"];
        if (f.attackTimer <= 0) { f.attackPhase = "recovery"; f.attackTimer = f.currentAttack!.recovery; }
      } else if (f.attackPhase === "recovery") {
        f.targetPose = POSES[f.attackType + "_recovery"];
        if (f.attackTimer <= 0) { f.attackPhase = null; f.currentAttack = null; f.attackType = null; }
      }
    }

    if (f.parrying) { f.parryTimer--; if (f.parryTimer <= 0) f.parrying = false; }
    if (f.comboTimer > 0) {
      f.comboTimer--;
      if (f.comboTimer <= 0) { f.comboCount = 0; f.comboSequence = []; }
    }

    if (f.blocking && !f.attackPhase && !f.staggered && !f.knockedDown && !f.dodging) {
      f.targetPose = POSES.block;
    }

    if (!f.attackPhase && !f.blocking && !f.staggered && !f.knockedDown && !f.dodging) {
      if (f.crouching) {
        f.targetPose = POSES.crouch;
      } else if (!f.grounded) {
        f.targetPose = POSES.jump;
      } else if (Math.abs(f.vx) > 0.5) {
        f.walkCycle += 0.12 * st.spdMul;
        const t = (Math.sin(f.walkCycle) + 1) / 2;
        f.targetPose = this._blendPoses(POSES.walk1, POSES.walk2, t);
        f.stepTimer++;
        if (f.stepTimer > 14) { this._playSound("step", 0.05); f.stepTimer = 0; }
      } else {
        f.targetPose = this._getIdlePose(f);
        const breathe = Math.sin(this._frameCount * 0.04) * 0.02;
        f.targetPose = new Float64Array(f.targetPose);
        f.targetPose[J.CHEST] += breathe;
        f.targetPose[J.SPINE] += breathe * 0.5;
      }
    }

    // Physics
    f.vy += GRAVITY; f.y += f.vy;
    if (f.y >= this._groundY) { f.y = this._groundY; f.vy = 0; f.grounded = true; } else { f.grounded = false; }
    f.x += f.vx; f.vx *= 0.85;
    f.x = clamp(f.x, 60, this._W - 60);

    // Stamina regen
    if (!f.attackPhase && !f.blocking && !f.dodging) {
      f.stamina = Math.min(STAMINA_MAX, f.stamina + st.staminaRegen);
    }
    if (f.stamina <= 0) f.exhausted = true;
    if (f.stamina > 25) f.exhausted = false;

    // Pose
    const blendSpeed = f.attackPhase === "active" ? 0.25 : 0.12;
    this._applyPose(f.skeleton, f.targetPose, blendSpeed);

    const crouchOff = f.crouching ? 20 : 0;
    f.skeleton.rootX = 0; f.skeleton.rootY = -50 + crouchOff; f.skeleton.scale = 1.3;
    this._solveFK(f.skeleton);

    // Sword tip
    const hand = f.skeleton.bones[J.R_HAND];
    const swordLen = 55 * f.skeleton.scale;
    f.swordTipX = f.x + hand.worldX * f.facing + Math.cos(hand.worldAngle * f.facing) * swordLen * f.facing;
    f.swordTipY = f.y + hand.worldY + Math.sin(hand.worldAngle * f.facing) * swordLen;

    // Sword trail
    if (f.attackPhase === "active" || f.attackPhase === "windup") {
      f.swordTrail.push({ x: f.swordTipX, y: f.swordTipY });
      if (f.swordTrail.length > 12) f.swordTrail.shift();
    } else {
      if (f.swordTrail.length > 0) f.swordTrail.shift();
    }
  }

  // ── Combat Resolution ────────────────────────────────────────────────────

  private _resolveCombat(attacker: Fighter, defender: Fighter): void {
    if (attacker.attackPhase !== "active" || attacker.attackHit) return;
    if (defender.dead || defender.invulnerable) return;

    const dx = defender.x - attacker.x;
    if ((dx * attacker.facing) <= 0) return;
    const distance = Math.abs(dx);
    const reach = attacker.currentAttack!.reach * attacker.skeleton.scale;
    if (distance > reach) return;
    if (Math.abs(defender.y - attacker.y) > 80) return;

    attacker.attackHit = true;
    const hitX = (attacker.x + defender.x) / 2;
    const hitY = attacker.y - 40;
    const st = STANCES[attacker.stance];

    // Parry
    if (defender.parrying) {
      this._playSound("parry", 0.4);
      this._spawnSparks(hitX, hitY, 20, 1.5);
      this._triggerShake(12);
      this._hitstopTimer = HITSTOP_FRAMES + 2;
      attacker.staggered = true; attacker.staggerTimer = 25;
      attacker.attackPhase = null; attacker.currentAttack = null;
      defender.parrying = false; defender.blocking = false;
      if (!attacker.isAI) this._stats.parries++;
      if (!defender.isAI) this._stats.parries++;
      return;
    }

    // Block
    if (defender.blocking) {
      const blockCost = attacker.currentAttack!.damage * 0.8 / STANCES[defender.stance].defMul;
      defender.stamina -= blockCost;
      if (defender.stamina < 0) {
        defender.stamina = 0; defender.staggered = true;
        defender.staggerTimer = 30; defender.blocking = false;
        this._triggerShake(10);
      }
      this._playSound("clash", 0.35);
      this._spawnSparks(hitX, hitY, 12);
      this._triggerShake(6);
      this._hitstopTimer = HITSTOP_FRAMES;
      return;
    }

    // Hit connects
    let damage = attacker.currentAttack!.damage * st.dmgMul;

    // Combo check
    const seq = attacker.comboSequence.join(",");
    let comboTriggered: ComboDef | null = null;
    for (const [pattern, combo] of Object.entries(COMBOS)) {
      if (seq.endsWith(pattern)) { comboTriggered = combo; break; }
    }

    if (comboTriggered) {
      damage *= comboTriggered.dmgBonus;
      this._comboDisplayName = comboTriggered.name;
      this._comboDisplayTimer = 90;
      this._comboDisplayCount = attacker.comboCount;
      this._playSound("combo", 0.4);
      if (!attacker.isAI) this._stats.combos++;
      if (comboTriggered.effect === "knockback") defender.vx = attacker.facing * 8;
      else if (comboTriggered.effect === "knockdown") {
        defender.knockedDown = true; defender.knockdownTimer = 45;
        defender.vx = attacker.facing * 5; defender.vy = -4;
      } else if (comboTriggered.effect === "stagger") {
        defender.staggered = true; defender.staggerTimer = 20;
      }
    }

    damage /= STANCES[defender.stance].defMul;
    defender.hp -= damage;
    defender.vx += attacker.facing * 3;

    if (!attacker.isAI) this._stats.hitsLanded++;
    if (!defender.isAI) this._stats.hitsTaken++;

    if (!defender.knockedDown && !comboTriggered) {
      defender.staggered = true; defender.staggerTimer = 12;
    }

    this._playSound("hit", 0.35);
    const bloodDir = attacker.facing === 1 ? 0 : Math.PI;
    this._spawnBlood(hitX, hitY, 8, bloodDir);
    this._spawnSparks(hitX, hitY, 4);
    this._triggerShake(8 + damage * 0.3);
    this._hitstopTimer = HITSTOP_FRAMES;

    if (defender.hp <= 0) {
      defender.hp = 0; defender.dead = true; defender.deathTimer = 0;
      defender.vx = attacker.facing * 6; defender.vy = -5;
      this._playSound("death", 0.4);
      this._triggerShake(20);
      this._spawnBlood(hitX, hitY, 20, bloodDir);
    }
  }

  // ── AI ───────────────────────────────────────────────────────────────────

  private _updateAI(ai: Fighter, player: Fighter): void {
    if (ai.dead || this._phase !== "playing") return;

    const dx = player.x - ai.x;
    const distance = Math.abs(dx);
    ai.facing = dx > 0 ? 1 : -1;

    const reactionFrames = [22, 12, 5][this._difficulty];
    const aggressiveness = [0.3, 0.5, 0.7][this._difficulty];
    const parryChance = [0.05, 0.2, 0.45][this._difficulty];

    ai.aiTimer++;
    if (ai.aiTimer < reactionFrames && !ai.aiAction) return;
    if (ai.staggered || ai.knockedDown || ai.dodging) { ai.aiAction = null; return; }
    if (ai.attackPhase) return;

    // React to player attacks
    if (player.attackPhase === "windup" || player.attackPhase === "active") {
      if (distance < 100) {
        if (Math.random() < parryChance && !ai.blocking) {
          this._startBlock(ai); ai.parrying = true; ai.parryTimer = PARRY_WINDOW;
          ai.aiTimer = 0; return;
        } else if (Math.random() < 0.3) {
          this._startDodge(ai, player.facing); ai.aiTimer = 0; return;
        } else if (!ai.blocking) {
          this._startBlock(ai); ai.aiTimer = 0; return;
        }
      }
    }

    if (ai.blocking && !player.attackPhase) {
      if (Math.random() < 0.1) this._stopBlock(ai);
    }

    // Movement
    if (distance > 110) {
      ai.vx += ai.facing * MOVE_SPEED * 0.3 * STANCES[ai.stance].spdMul;
      ai.aiTimer = 0;
    } else if (distance < 50) {
      ai.vx -= ai.facing * MOVE_SPEED * 0.2;
      ai.aiTimer = 0;
    }

    // Attack
    if (distance > 50 && distance < 100 && ai.aiTimer > reactionFrames) {
      if (Math.random() < aggressiveness) {
        this._stopBlock(ai);
        const attacks = ["slash", "thrust", "overhead", "sweep"];
        const weights = [3, 2, 1, 2];
        if (ai.stamina < 30) { weights[2] = 0; weights[0] = 4; }
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        let chosen = "slash";
        for (let i = 0; i < attacks.length; i++) {
          r -= weights[i]; if (r <= 0) { chosen = attacks[i]; break; }
        }
        this._startAttack(ai, chosen);
        ai.aiTimer = 0;
      }
    }

    // Stance management
    if (Math.random() < 0.005) {
      if (ai.hp < 30) ai.stance = "defensive";
      else if (ai.stamina > 70 && ai.hp > 50) ai.stance = "aggressive";
      else ai.stance = "balanced";
    }
  }

  // ── Player Controller ────────────────────────────────────────────────────

  private _updatePlayerController(p: Fighter): void {
    if (p.dead) return;
    const st = STANCES[p.stance];

    if (!p.staggered && !p.knockedDown && !p.dodging) {
      if (this._keys["a"] || this._keys["arrowleft"]) p.vx -= MOVE_SPEED * 0.4 * st.spdMul;
      if (this._keys["d"] || this._keys["arrowright"]) p.vx += MOVE_SPEED * 0.4 * st.spdMul;
      if ((this._justPressed["w"] || this._justPressed["arrowup"]) && p.grounded && !p.blocking) {
        p.vy = JUMP_FORCE; p.grounded = false;
      }
      p.crouching = (this._keys["s"] || this._keys["arrowdown"]) && p.grounded && !p.attackPhase;
    }

    // Face opponent
    const dx = this._ai.x - p.x;
    if (Math.abs(dx) > 10) p.facing = dx > 0 ? 1 : -1;

    if (this._justPressed["j"]) this._startAttack(p, "slash");
    if (this._justPressed["k"]) this._startAttack(p, "thrust");
    if (this._justPressed["u"]) this._startAttack(p, "overhead");
    if (this._justPressed["i"]) this._startAttack(p, "sweep");

    if (this._keys["l"]) this._startBlock(p);
    else if (p.blocking) this._stopBlock(p);

    if (this._justPressed[" "]) {
      const dir = this._keys["a"] ? -1 : this._keys["d"] ? 1 : -p.facing;
      this._startDodge(p, dir);
    }

    if (this._justPressed["1"]) p.stance = "aggressive";
    if (this._justPressed["2"]) p.stance = "balanced";
    if (this._justPressed["3"]) p.stance = "defensive";
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  private _drawBackground(): void {
    const c = this._ctx;
    const W = this._W, H = this._H;
    const gY = this._groundY;

    // Sky
    const skyGrad = c.createLinearGradient(0, 0, 0, gY);
    skyGrad.addColorStop(0, "#0a0515");
    skyGrad.addColorStop(0.4, "#1a0e25");
    skyGrad.addColorStop(0.7, "#2a1535");
    skyGrad.addColorStop(1, "#3a2040");
    c.fillStyle = skyGrad;
    c.fillRect(0, 0, W, gY);

    // Stars
    for (let i = 0; i < 60; i++) {
      const sx = ((42 * (i + 1) * 7919) % W);
      const sy = ((42 * (i + 1) * 6271) % (gY * 0.6));
      const brightness = 0.3 + (i % 3) * 0.2;
      const twinkle = Math.sin(this._frameCount * 0.02 + i) * 0.15;
      c.fillStyle = `rgba(255,255,220,${brightness + twinkle})`;
      c.fillRect(sx, sy, 1.5, 1.5);
    }

    // Moon
    c.fillStyle = "rgba(255,250,220,0.15)";
    c.beginPath(); c.arc(W * 0.8, H * 0.12, 40, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,250,220,0.3)";
    c.beginPath(); c.arc(W * 0.8, H * 0.12, 30, 0, Math.PI * 2); c.fill();

    // Castle silhouette
    c.fillStyle = "#0d0818";
    c.fillRect(0, gY - 180, W, 180);
    for (let i = 0; i < 5; i++) {
      const tx = W * (0.1 + i * 0.2);
      const th = 60 + (i % 2) * 40;
      c.fillRect(tx - 25, gY - 180 - th, 50, th);
      for (let ci = -2; ci <= 2; ci++) c.fillRect(tx + ci * 10 - 4, gY - 180 - th - 12, 8, 12);
    }
    // Windows
    for (let i = 0; i < 8; i++) {
      const wx = W * (0.08 + i * 0.12);
      const wy = gY - 120 + (i % 3) * 20;
      c.fillStyle = `rgba(255,180,50,${0.1 + Math.sin(this._frameCount * 0.03 + i) * 0.05})`;
      c.fillRect(wx - 3, wy - 5, 6, 10);
    }

    // Ground
    const groundGrad = c.createLinearGradient(0, gY, 0, H);
    groundGrad.addColorStop(0, "#3a2a1a");
    groundGrad.addColorStop(0.3, "#2a1c10");
    groundGrad.addColorStop(1, "#1a0e05");
    c.fillStyle = groundGrad;
    c.fillRect(0, gY, W, H - gY);

    c.strokeStyle = "#5a4a30"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, gY); c.lineTo(W, gY); c.stroke();

    // Floor tiles
    c.strokeStyle = "rgba(90,74,48,0.2)"; c.lineWidth = 1;
    for (let i = 0; i < W; i += 60) { c.beginPath(); c.moveTo(i, gY); c.lineTo(i, H); c.stroke(); }
    for (let j = gY + 30; j < H; j += 30) { c.beginPath(); c.moveTo(0, j); c.lineTo(W, j); c.stroke(); }

    // Torches
    const torchPositions = [W * 0.15, W * 0.85];
    for (const tx of torchPositions) {
      c.fillStyle = "#2a1c10"; c.fillRect(tx - 8, gY - 150, 16, 150);
      c.fillStyle = "#3a2a1a"; c.fillRect(tx - 12, gY - 155, 24, 10);
      c.fillRect(tx - 10, gY - 5, 20, 8);
      c.fillStyle = "#5a4a30"; c.fillRect(tx - 4, gY - 145, 8, 5);
      const ff = Math.sin(this._frameCount * 0.15 + tx) * 3;
      const glowRad = 30 + ff;
      const glow = c.createRadialGradient(tx, gY - 155, 2, tx, gY - 155, glowRad);
      glow.addColorStop(0, "rgba(255,150,30,0.4)");
      glow.addColorStop(0.5, "rgba(255,100,20,0.1)");
      glow.addColorStop(1, "rgba(255,50,10,0)");
      c.fillStyle = glow;
      c.fillRect(tx - glowRad, gY - 155 - glowRad, glowRad * 2, glowRad * 2);
      c.fillStyle = "#ff8020";
      c.beginPath(); c.ellipse(tx, gY - 158 - ff, 4, 8 + ff * 0.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffcc44";
      c.beginPath(); c.ellipse(tx, gY - 156, 2, 4, 0, 0, Math.PI * 2); c.fill();
      if (this._frameCount % 4 === 0) {
        this._spawnParticle(tx + rand(-3, 3), gY - 160, rand(-0.3, 0.3), rand(-1.5, -0.5), rand(15, 30), rand(1, 3), "rgba(255,150,30,0.6)", "spark", -0.03);
      }
    }

    // Banners
    const bannerX = [W * 0.35, W * 0.65];
    for (const bx of bannerX) {
      c.fillStyle = "#3a1010";
      const wave = Math.sin(this._frameCount * 0.03 + bx * 0.01) * 3;
      c.beginPath();
      c.moveTo(bx - 15, gY - 170); c.lineTo(bx + 15, gY - 170);
      c.lineTo(bx + 12 + wave, gY - 100); c.lineTo(bx + wave, gY - 90);
      c.lineTo(bx - 12 + wave, gY - 100); c.closePath(); c.fill();
      c.fillStyle = "#d4a843"; c.font = "20px Georgia"; c.textAlign = "center";
      c.fillText("\u2694", bx + wave * 0.5, gY - 130);
      c.fillStyle = "#5a4a30"; c.fillRect(bx - 2, gY - 180, 4, 15);
    }
  }

  private _drawLimb(j1: number, j2: number, w1: number, w2: number, color: string, sk: Skeleton, f: number): void {
    const c = this._ctx;
    const b1 = sk.bones[j1], b2 = sk.bones[j2];
    const x1 = b1.worldX * f, y1 = b1.worldY;
    const x2 = b2.worldX * f, y2 = b2.worldY;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpX = Math.sin(angle), perpY = -Math.cos(angle);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x1 - perpX * w1, y1 - perpY * w1);
    c.lineTo(x2 - perpX * w2, y2 - perpY * w2);
    c.lineTo(x2 + perpX * w2, y2 + perpY * w2);
    c.lineTo(x1 + perpX * w1, y1 + perpY * w1);
    c.closePath(); c.fill();
  }

  private _drawJoint(j: number, r: number, color: string, sk: Skeleton, f: number): void {
    const c = this._ctx;
    const b = sk.bones[j];
    c.fillStyle = color;
    c.beginPath(); c.arc(b.worldX * f, b.worldY, r, 0, Math.PI * 2); c.fill();
  }

  private _drawFighter(fighter: Fighter): void {
    const c = this._ctx;

    c.save();
    c.translate(fighter.x, fighter.y);

    if (fighter.dodging) {
      c.globalAlpha = 0.3;
      c.save(); c.translate(-fighter.dodgeDir * 15, 0);
      this._drawFighterBody(fighter);
      c.restore(); c.globalAlpha = 1;
    }
    this._drawFighterBody(fighter);
    c.restore();
  }

  private _drawFighterBody(fighter: Fighter): void {
    const c = this._ctx;
    const sk = fighter.skeleton;
    const f = fighter.facing;

    const skinColor = fighter.isAI ? "#4a3a2a" : "#c4a080";
    const armorDark = fighter.isAI ? "#1a1a2a" : "#555";
    const armorLight = fighter.isAI ? "#2a2a3a" : "#777";
    const armorAccent = fighter.isAI ? "#600" : "#886622";
    const stanceColor = STANCES[fighter.stance].color;

    // Legs
    this._drawLimb(J.L_HIP, J.L_THIGH, 5, 7, armorDark, sk, f);
    this._drawLimb(J.L_THIGH, J.L_SHIN, 7, 5, armorLight, sk, f);
    this._drawLimb(J.L_SHIN, J.L_FOOT, 5, 4, armorDark, sk, f);
    this._drawJoint(J.L_THIGH, 4, armorAccent, sk, f);
    this._drawLimb(J.R_HIP, J.R_THIGH, 5, 7, armorDark, sk, f);
    this._drawLimb(J.R_THIGH, J.R_SHIN, 7, 5, armorLight, sk, f);
    this._drawLimb(J.R_SHIN, J.R_FOOT, 5, 4, armorDark, sk, f);
    this._drawJoint(J.R_THIGH, 4, armorAccent, sk, f);
    this._drawJoint(J.L_FOOT, 5, armorDark, sk, f);
    this._drawJoint(J.R_FOOT, 5, armorDark, sk, f);

    // Torso
    this._drawLimb(J.PELVIS, J.SPINE, 10, 12, armorDark, sk, f);
    this._drawLimb(J.SPINE, J.CHEST, 12, 14, armorLight, sk, f);
    this._drawLimb(J.CHEST, J.NECK, 12, 6, armorLight, sk, f);

    // Chest plate
    const chest = sk.bones[J.CHEST], spine = sk.bones[J.SPINE];
    c.strokeStyle = armorAccent; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(spine.worldX * f - 8 * f, spine.worldY);
    c.lineTo(chest.worldX * f, chest.worldY - 4);
    c.lineTo(spine.worldX * f + 8 * f, spine.worldY);
    c.stroke();

    // Belt
    const pelvis = sk.bones[J.PELVIS];
    c.fillStyle = armorAccent;
    c.fillRect(pelvis.worldX * f - 10, pelvis.worldY - 2, 20, 4);

    // Pauldrons
    this._drawJoint(J.L_SHOULDER, 8, armorAccent, sk, f);
    this._drawJoint(J.R_SHOULDER, 8, armorAccent, sk, f);

    // Arms
    this._drawLimb(J.L_SHOULDER, J.L_UPPER_ARM, 4, 5, skinColor, sk, f);
    this._drawLimb(J.L_UPPER_ARM, J.L_FOREARM, 5, 4, skinColor, sk, f);
    this._drawLimb(J.L_FOREARM, J.L_HAND, 4, 3, skinColor, sk, f);
    this._drawJoint(J.L_UPPER_ARM, 3, armorAccent, sk, f);
    this._drawLimb(J.R_SHOULDER, J.R_UPPER_ARM, 4, 5, skinColor, sk, f);
    this._drawLimb(J.R_UPPER_ARM, J.R_FOREARM, 5, 4, skinColor, sk, f);
    this._drawLimb(J.R_FOREARM, J.R_HAND, 4, 3, skinColor, sk, f);
    this._drawJoint(J.R_UPPER_ARM, 3, armorAccent, sk, f);
    this._drawJoint(J.L_HAND, 4, armorDark, sk, f);
    this._drawJoint(J.R_HAND, 4, armorDark, sk, f);

    // Sword
    const hand = sk.bones[J.R_HAND];
    const swordAngle = hand.worldAngle;
    const hx = hand.worldX * f, hy = hand.worldY;
    const swordLen = 55 * sk.scale;

    c.save();
    c.shadowColor = stanceColor;
    c.shadowBlur = fighter.attackPhase === "active" ? 15 : 5;
    const tipX = hx + Math.cos(swordAngle * f) * swordLen * f;
    const tipY = hy + Math.sin(swordAngle * f) * swordLen;
    c.strokeStyle = fighter.swordColor; c.lineWidth = 3;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(tipX, tipY); c.stroke();
    c.strokeStyle = "#fff"; c.lineWidth = 1; c.globalAlpha = 0.5;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(tipX, tipY); c.stroke();
    c.globalAlpha = 1;
    c.restore();

    // Cross guard
    const guardAngle = swordAngle + Math.PI / 2;
    c.strokeStyle = "#d4a843"; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(hx - Math.cos(guardAngle * f) * 8 * f, hy - Math.sin(guardAngle * f) * 8);
    c.lineTo(hx + Math.cos(guardAngle * f) * 8 * f, hy + Math.sin(guardAngle * f) * 8);
    c.stroke();

    // Pommel
    c.fillStyle = "#d4a843";
    c.beginPath();
    c.arc(hx - Math.cos(swordAngle * f) * 6 * f, hy - Math.sin(swordAngle * f) * 6, 3, 0, Math.PI * 2);
    c.fill();

    // Head / Helmet
    const head = sk.bones[J.HEAD];
    const headX = head.worldX * f, headY = head.worldY;
    c.fillStyle = armorLight;
    c.beginPath(); c.arc(headX, headY - 2, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#111";
    c.beginPath(); c.arc(headX + 3 * f, headY, 5, -0.3, 0.8); c.fill();
    c.fillStyle = armorAccent;
    c.beginPath(); c.moveTo(headX - 3 * f, headY - 12); c.lineTo(headX + 2 * f, headY - 14);
    c.lineTo(headX, headY - 5); c.closePath(); c.fill();
    c.fillStyle = fighter.isAI ? "#c04040" : "#ddd";
    c.fillRect(headX + 2 * f, headY - 2, 2, 1.5);
    c.fillRect(headX + 5 * f, headY - 2, 2, 1.5);

    // Stance glow
    if (!fighter.dead) {
      c.fillStyle = stanceColor;
      c.globalAlpha = 0.15 + Math.sin(this._frameCount * 0.06) * 0.05;
      c.beginPath(); c.ellipse(0, 0, 25, 5, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }

  private _drawSwordTrail(trail: TrailPoint[]): void {
    if (trail.length < 2) return;
    const c = this._ctx;
    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.5;
      const width = (i / trail.length) * 4;
      c.strokeStyle = `rgba(200,220,255,${alpha})`; c.lineWidth = width;
      c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke();
      c.strokeStyle = `rgba(150,180,255,${alpha * 0.3})`; c.lineWidth = width * 3;
      c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke();
    }
  }

  private _drawParticles(): void {
    const c = this._ctx;
    for (const p of this._particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      c.save(); c.globalAlpha = alpha;
      c.translate(p.x, p.y); c.rotate(p.rot);
      if (p.type === "spark") {
        c.fillStyle = p.color;
        c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        c.globalAlpha = alpha * 0.5;
        c.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else if (p.type === "blood") {
        c.fillStyle = p.color;
        c.beginPath(); c.arc(0, 0, p.size * alpha, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = p.color;
        c.beginPath(); c.arc(0, 0, p.size, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
  }

  private _drawBar(x: number, y: number, w: number, h: number, ratio: number, color: string, bgColor: string, _label: string): void {
    const c = this._ctx;
    ratio = clamp(ratio, 0, 1);
    c.fillStyle = bgColor; c.fillRect(x, y, w, h);
    const grad = c.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, color); grad.addColorStop(1, shadeColor(color, -30));
    c.fillStyle = grad; c.fillRect(x, y, w * ratio, h);
    c.strokeStyle = "rgba(212,168,67,0.4)"; c.lineWidth = 1; c.strokeRect(x, y, w, h);
  }

  private _drawUI(): void {
    const c = this._ctx;
    const W = this._W, H = this._H;
    const barW = Math.min(300, W * 0.22);
    const barH = 20;
    const staminaW = barW * 0.85;
    const staminaH = 12;
    const margin = 20;

    // Player
    c.fillStyle = "#d4a843"; c.font = "16px Georgia"; c.textAlign = "left";
    c.fillText(this._player.name, margin, margin - 4);
    this._drawBar(margin, margin, barW, barH, this._player.hp / HEALTH_MAX, "#a03030", "#301010", "");
    this._drawBar(margin, margin + barH + 4, staminaW, staminaH, this._player.stamina / STAMINA_MAX, "#30803a", "#102a10", "");
    c.fillStyle = STANCES[this._player.stance].color; c.font = "12px Georgia"; c.textAlign = "left";
    c.fillText(this._player.stance.toUpperCase(), margin, margin + barH + staminaH + 18);

    // AI
    c.textAlign = "right"; c.fillStyle = "#c04040"; c.font = "16px Georgia";
    c.fillText(this._ai.name, W - margin, margin - 4);
    this._drawBar(W - margin - barW, margin, barW, barH, this._ai.hp / HEALTH_MAX, "#a03030", "#301010", "");
    this._drawBar(W - margin - staminaW, margin + barH + 4, staminaW, staminaH, this._ai.stamina / STAMINA_MAX, "#30803a", "#102a10", "");
    c.fillStyle = STANCES[this._ai.stance].color; c.font = "12px Georgia"; c.textAlign = "right";
    c.fillText(this._ai.stance.toUpperCase(), W - margin, margin + barH + staminaH + 18);

    // Combo display
    if (this._comboDisplayTimer > 0) {
      this._comboDisplayTimer--;
      const alpha = clamp(this._comboDisplayTimer / 30, 0, 1);
      const scale = 1 + (1 - alpha) * 0.5;
      c.save(); c.globalAlpha = alpha;
      c.fillStyle = "#ffd700"; c.font = `bold ${Math.floor(28 * scale)}px Georgia`;
      c.textAlign = "center"; c.shadowColor = "#ffd700"; c.shadowBlur = 15;
      c.fillText(this._comboDisplayName, W / 2, H * 0.2);
      c.shadowBlur = 0; c.fillStyle = "#fff"; c.font = `${Math.floor(18 * scale)}px Georgia`;
      c.fillText(`${this._comboDisplayCount} HIT COMBO!`, W / 2, H * 0.2 + 30);
      c.restore();
    }

    if (this._player.comboCount > 1 && this._player.comboTimer > 0) {
      c.fillStyle = "#ffd700"; c.font = "bold 20px Georgia"; c.textAlign = "left";
      c.globalAlpha = clamp(this._player.comboTimer / 10, 0, 1);
      c.fillText(`${this._player.comboCount}x`, margin, margin + barH + staminaH + 38);
      c.globalAlpha = 1;
    }

    c.fillStyle = "rgba(160,128,64,0.3)"; c.font = "11px Georgia"; c.textAlign = "center";
    c.fillText("J-Slash  K-Thrust  U-Overhead  I-Sweep  L-Block/Parry  SPACE-Dodge  1/2/3-Stance  ESC-Quit", W / 2, H - 12);
  }

  // ── Overlays ─────────────────────────────────────────────────────────────

  private _showTitle(): void {
    this._titleOverlay = document.createElement("div");
    this._titleOverlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:60;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:radial-gradient(ellipse at center, rgba(30,15,5,0.92) 0%, rgba(10,5,2,0.98) 100%);
      font-family:Georgia,serif;
    `;
    this._titleOverlay.innerHTML = `
      <div style="font-size:72px;color:#d4a843;text-shadow:0 0 30px rgba(212,168,67,0.5),0 4px 8px rgba(0,0,0,0.8);letter-spacing:8px;margin-bottom:10px;text-align:center">SWORD OF AVALON</div>
      <div style="font-size:22px;color:#8b6914;letter-spacing:4px;margin-bottom:50px;text-align:center">A TALE OF STEEL AND HONOR</div>
      <div style="background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:24px 36px;margin-bottom:40px;max-width:600px">
        <div style="color:#d4a843;margin-bottom:12px;font-size:18px;letter-spacing:2px">CONTROLS</div>
        <div style="color:#a08040;font-size:14px;line-height:1.8">
          <span style="color:#d4a843;font-weight:bold">A / D</span> — Move &nbsp;&nbsp;
          <span style="color:#d4a843;font-weight:bold">W</span> — Jump &nbsp;&nbsp;
          <span style="color:#d4a843;font-weight:bold">S</span> — Crouch<br>
          <span style="color:#d4a843;font-weight:bold">J</span> — Slash &nbsp;&nbsp;
          <span style="color:#d4a843;font-weight:bold">K</span> — Thrust &nbsp;&nbsp;
          <span style="color:#d4a843;font-weight:bold">U</span> — Overhead<br>
          <span style="color:#d4a843;font-weight:bold">I</span> — Sweep &nbsp;&nbsp;
          <span style="color:#d4a843;font-weight:bold">L</span> — Block/Parry &nbsp;&nbsp;
          <span style="color:#d4a843;font-weight:bold">SPACE</span> — Dodge<br>
          <span style="color:#d4a843;font-weight:bold">1/2/3</span> — Stance: Aggressive / Balanced / Defensive &nbsp;&nbsp;
          <span style="color:#d4a843;font-weight:bold">ESC</span> — Quit
        </div>
      </div>
      <div id="soa-diff" style="display:flex;gap:12px;margin-bottom:30px"></div>
      <button id="soa-start" style="padding:16px 48px;font-size:22px;font-family:Georgia,serif;
        background:linear-gradient(180deg,#d4a843 0%,#8b6914 100%);color:#1a0e05;border:2px solid #d4a843;
        border-radius:4px;cursor:pointer;letter-spacing:3px;text-transform:uppercase">DRAW YOUR SWORD</button>
    `;
    document.body.appendChild(this._titleOverlay);

    const diffDiv = this._titleOverlay.querySelector("#soa-diff") as HTMLDivElement;
    const diffs = ["SQUIRE", "KNIGHT", "CHAMPION"];
    diffs.forEach((name, idx) => {
      const btn = document.createElement("button");
      btn.textContent = name;
      btn.style.cssText = `padding:10px 24px;font-size:16px;font-family:Georgia,serif;
        background:rgba(212,168,67,${idx === this._difficulty ? 0.25 : 0.1});
        color:${idx === this._difficulty ? "#d4a843" : "#a08040"};
        border:1px solid ${idx === this._difficulty ? "#d4a843" : "rgba(212,168,67,0.3)"};
        border-radius:4px;cursor:pointer;letter-spacing:2px`;
      btn.addEventListener("click", () => {
        this._difficulty = idx;
        diffDiv.querySelectorAll("button").forEach((b, bi) => {
          (b as HTMLButtonElement).style.background = `rgba(212,168,67,${bi === idx ? 0.25 : 0.1})`;
          (b as HTMLButtonElement).style.color = bi === idx ? "#d4a843" : "#a08040";
          (b as HTMLButtonElement).style.borderColor = bi === idx ? "#d4a843" : "rgba(212,168,67,0.3)";
        });
      });
      diffDiv.appendChild(btn);
    });

    this._titleOverlay.querySelector("#soa-start")!.addEventListener("click", () => {
      this._audioCtx?.resume();
      this._titleOverlay?.parentNode?.removeChild(this._titleOverlay);
      this._titleOverlay = null;
      this._initGame();
      this._phase = "playing";
    });
  }

  private _showResult(type: "game_over" | "victory"): void {
    this._resultOverlay = document.createElement("div");
    this._resultOverlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:60;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(10,5,2,0.9);font-family:Georgia,serif;
    `;
    const isVictory = type === "victory";
    this._resultOverlay.innerHTML = `
      <div style="font-size:56px;color:#d4a843;text-shadow:0 0 20px rgba(212,168,67,0.4);margin-bottom:20px;letter-spacing:6px">
        ${isVictory ? "VICTORY" : "DEFEATED"}
      </div>
      <div style="font-size:20px;color:#8b6914;margin-bottom:30px">
        ${isVictory ? "The legend of Avalon lives on!" : "The Black Knight stands victorious..."}
      </div>
      <div style="background:rgba(212,168,67,0.06);border:1px solid rgba(212,168,67,0.15);border-radius:8px;padding:20px 32px;margin-bottom:30px;text-align:left">
        <p style="color:#a08040;font-size:15px;line-height:2">Hits Landed: <span style="color:#d4a843">${this._stats.hitsLanded}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Hits Taken: <span style="color:#d4a843">${this._stats.hitsTaken}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Parries: <span style="color:#d4a843">${this._stats.parries}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Combos: <span style="color:#d4a843">${this._stats.combos}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Max Combo: <span style="color:#d4a843">${this._stats.maxCombo}x</span></p>
        ${isVictory ? `<p style="color:#a08040;font-size:15px;line-height:2">Health Remaining: <span style="color:#d4a843">${Math.ceil(this._player.hp)}%</span></p>` : ""}
      </div>
      <button id="soa-retry" style="padding:16px 48px;font-size:22px;font-family:Georgia,serif;
        background:linear-gradient(180deg,#d4a843 0%,#8b6914 100%);color:#1a0e05;border:2px solid #d4a843;
        border-radius:4px;cursor:pointer;letter-spacing:3px;text-transform:uppercase">FIGHT AGAIN</button>
    `;
    document.body.appendChild(this._resultOverlay);

    this._resultOverlay.querySelector("#soa-retry")!.addEventListener("click", () => {
      this._resultOverlay?.parentNode?.removeChild(this._resultOverlay);
      this._resultOverlay = null;
      this._initGame();
      this._phase = "playing";
    });
  }

  // ── Game Init ────────────────────────────────────────────────────────────

  private _initGame(): void {
    this._stats = { hitsLanded: 0, hitsTaken: 0, parries: 0, combos: 0, maxCombo: 0 };
    this._comboDisplayTimer = 0;
    this._particles.length = 0;
    this._shakeIntensity = 0;
    this._hitstopTimer = 0;
    this._frameCount = 0;

    this._player = this._createFighter(this._W * 0.3, 1, {
      color: "#d4a843", armorColor: "#666", swordColor: "#c8c8d0",
      name: "SIR GALAHAD", isAI: false,
    });
    this._ai = this._createFighter(this._W * 0.7, -1, {
      color: "#444", armorColor: "#1a1a2a", swordColor: "#8888a0",
      name: "THE BLACK KNIGHT", isAI: true,
    });
  }

  // ── Main Tick ────────────────────────────────────────────────────────────

  private _tick(): void {
    if (this._phase === "playing") {
      if (this._hitstopTimer > 0) {
        this._hitstopTimer--;
      } else {
        this._frameCount++;
        this._updateInput();
        this._updatePlayerController(this._player);
        this._updateAI(this._ai, this._player);
        this._updateFighter(this._player);
        this._updateFighter(this._ai);
        this._resolveCombat(this._player, this._ai);
        this._resolveCombat(this._ai, this._player);
        this._updateParticles();
        this._updateShake();

        if (this._player.comboCount > this._stats.maxCombo) this._stats.maxCombo = this._player.comboCount;

        if (this._ai.dead && this._ai.deathTimer > 60) {
          this._phase = "victory";
          this._playSound("victory", 0.4);
          this._showResult("victory");
        }
        if (this._player.dead && this._player.deathTimer > 60) {
          this._phase = "game_over";
          this._showResult("game_over");
        }
      }
    }

    // Render
    const c = this._ctx;
    c.clearRect(0, 0, this._W, this._H);
    c.save();
    c.translate(this._shakeX, this._shakeY);
    this._drawBackground();

    if (this._phase === "playing" || this._phase === "game_over" || this._phase === "victory") {
      const fighters = [this._player, this._ai].sort((a, b) => a.y - b.y);
      for (const f of fighters) {
        this._drawSwordTrail(f.swordTrail);
        this._drawFighter(f);
      }
      this._drawParticles();
      this._drawUI();
    }
    c.restore();

    // Vignette
    const vg = c.createRadialGradient(this._W / 2, this._H / 2, this._H * 0.3,
      this._W / 2, this._H / 2, this._H * 0.9);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.5)");
    c.fillStyle = vg;
    c.fillRect(0, 0, this._W, this._H);
  }
}
