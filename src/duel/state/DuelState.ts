// ---------------------------------------------------------------------------
// Duel mode – state interfaces
// ---------------------------------------------------------------------------

import { AttackHeight, DuelFighterState, DuelPhase } from "../../types";
import { DuelBalance } from "../config/DuelBalanceConfig";

// ---- Hitbox ----------------------------------------------------------------

export interface Hitbox {
  x: number; // offset from fighter position
  y: number; // offset from ground (negative = up)
  width: number;
  height: number;
}

// ---- Move definition (frame data) -----------------------------------------

export interface DuelMoveDef {
  id: string;
  name: string;
  type: "normal" | "special" | "grab" | "zeal";
  height: AttackHeight;
  startup: number; // frames before hitbox active
  active: number; // frames hitbox is active
  recovery: number; // frames after hitbox ends
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  hitbox: Hitbox;
  isProjectile?: boolean;
  projectileSpeed?: number;
  projectileHeight?: AttackHeight;
  isAntiAir?: boolean;
  isLauncher?: boolean;
  hasInvincibility?: boolean;
  invincibleStartup?: number; // frames of invincibility at start
  movesForward?: number; // pixels to move forward during move
  movesBack?: number; // pixels to move backward
}

// ---- Character definition --------------------------------------------------

export interface DuelCharacterDef {
  id: string;
  name: string;
  title: string;
  portrait: string;
  fighterType: "sword" | "mage" | "archer" | "spear";
  maxHp: number;
  walkSpeed: number;
  backWalkSpeed: number;
  jumpVelocity: number;
  jumpForwardSpeed: number;
  weight: number; // affects knockback
  normals: Record<string, DuelMoveDef>;
  specials: Record<string, DuelMoveDef>;
  zeals: Record<string, DuelMoveDef>;
  grab: DuelMoveDef;
}

// ---- Input buffer ----------------------------------------------------------

export interface InputBufferEntry {
  code: string;
  frame: number;
  pressed: boolean;
}

// ---- Input result (what the system resolved this frame) --------------------

export interface DuelInputResult {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  forward: boolean;
  back: boolean;
  dashForward: boolean;
  dashBack: boolean;
  // Resolved action (null = no new action)
  action: string | null; // move ID to start
}

// ---- Projectile ------------------------------------------------------------

export interface DuelProjectile {
  id: number;
  ownerId: number;
  moveId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  hitbox: Hitbox;
  damage: number;
  chipDamage: number;
  height: AttackHeight;
  hitstun: number;
  blockstun: number;
  knockback: number;
  lifetime: number;
  active: boolean;
}

// ---- Fighter ---------------------------------------------------------------

export interface DuelFighter {
  characterId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facingRight: boolean;
  hp: number;
  maxHp: number;
  state: DuelFighterState;
  stateTimer: number;
  currentMove: string | null;
  moveFrame: number;
  moveHasHit: boolean; // prevent multi-hit on same move
  canCancelMove: boolean; // true when current move has hit and can be canceled
  comboChain: number; // number of moves chained via cancel in current combo (max 5)
  hitstunFrames: number;
  blockstunFrames: number;
  comboCount: number;
  comboDamage: number;
  comboDamageScaling: number;
  grounded: boolean;
  invincibleFrames: number;
  dashFrames: number; // remaining frames in a dash (0 = not dashing)
  zealGauge: number; // 0–100 ultimate meter
  // Input (raw key state)
  input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    lightPunch: boolean;
    medPunch: boolean;
    heavyPunch: boolean;
    lightKick: boolean;
    medKick: boolean;
    heavyKick: boolean;
  };
  inputBuffer: InputBufferEntry[];
}

// ---- Round -----------------------------------------------------------------

export interface DuelRound {
  roundNumber: number;
  winnerId: number | null;
  timeRemaining: number;
}

// ---- Top-level state -------------------------------------------------------

export type DuelGameMode = "vs_cpu" | "vs_mode" | "arcade" | "training";

export type TrainingDummyMode = "stand" | "crouch" | "jump" | "cpu";

export interface DuelState {
  phase: DuelPhase;
  gameMode: DuelGameMode;
  fighters: [DuelFighter, DuelFighter];
  round: DuelRound;
  roundResults: (0 | 1)[];
  bestOf: number;
  arenaId: string;
  isPaused: boolean;
  isAIOpponent: boolean;
  aiDifficulty: number;
  // Training mode
  trainingDummyMode: TrainingDummyMode;
  frameCount: number;
  slowdownFrames: number;
  projectiles: DuelProjectile[];
  nextProjectileId: number;
  // Announcements
  announcement: string | null;
  announcementTimer: number;
  // Screen dimensions (resolved at match start)
  screenW: number;
  screenH: number;
  stageFloorY: number;
  stageLeft: number;
  stageRight: number;
}

// ---- Factory ---------------------------------------------------------------

export function createFighter(
  characterId: string,
  x: number,
  facingRight: boolean,
  maxHp: number,
  floorY: number = 0,
): DuelFighter {
  return {
    characterId,
    position: { x, y: floorY },
    velocity: { x: 0, y: 0 },
    facingRight,
    hp: maxHp,
    maxHp,
    state: DuelFighterState.IDLE,
    stateTimer: 0,
    currentMove: null,
    moveFrame: 0,
    moveHasHit: false,
    canCancelMove: false,
    comboChain: 0,
    hitstunFrames: 0,
    blockstunFrames: 0,
    comboCount: 0,
    comboDamage: 0,
    comboDamageScaling: 1,
    grounded: true,
    invincibleFrames: 0,
    dashFrames: 0,
    zealGauge: 0,
    input: {
      left: false,
      right: false,
      up: false,
      down: false,
      lightPunch: false,
      medPunch: false,
      heavyPunch: false,
      lightKick: false,
      medKick: false,
      heavyKick: false,
    },
    inputBuffer: [],
  };
}

export function createDuelState(
  p1CharId: string,
  p2CharId: string,
  p1MaxHp: number,
  p2MaxHp: number,
  arenaId: string,
  isAI: boolean,
  screenW: number,
  screenH: number,
  gameMode: DuelGameMode = "vs_cpu",
): DuelState {
  const floorY = Math.round(screenH * DuelBalance.STAGE_FLOOR_RATIO);
  const stageLeft = DuelBalance.STAGE_MARGIN;
  const stageRight = screenW - DuelBalance.STAGE_MARGIN;
  const p1X = Math.round(screenW * DuelBalance.P1_START_RATIO);
  const p2X = Math.round(screenW * DuelBalance.P2_START_RATIO);

  return {
    phase: DuelPhase.INTRO,
    gameMode,
    fighters: [
      createFighter(p1CharId, p1X, true, p1MaxHp, floorY),
      createFighter(p2CharId, p2X, false, p2MaxHp, floorY),
    ],
    round: {
      roundNumber: 1,
      winnerId: null,
      timeRemaining: gameMode === "training" ? Infinity : DuelBalance.ROUND_TIME_FRAMES,
    },
    roundResults: [],
    bestOf: DuelBalance.BEST_OF,
    arenaId,
    isPaused: false,
    isAIOpponent: isAI,
    aiDifficulty: 1,
    frameCount: 0,
    slowdownFrames: 0,
    projectiles: [],
    nextProjectileId: 1,
    announcement: null,
    announcementTimer: 0,
    screenW,
    screenH,
    stageFloorY: floorY,
    stageLeft,
    stageRight,
    trainingDummyMode: "stand",
  };
}
