import {
  TekkenPhase,
  TekkenFighterState,
  TekkenAttackHeight,
  TekkenLimb,
} from "../../types";
import type { TekkenRankedProfile } from "../config/TekkenRankedConfig";
import type { TekkenSkinSlot } from "../config/TekkenCustomization";
import type { ComboChallengeState } from "../systems/TekkenComboChallengeSystem";
import type { StageTransitionState } from "../systems/TekkenStageTransitionSystem";

export interface TekkenInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  lp: boolean;
  rp: boolean;
  lk: boolean;
  rk: boolean;
  rage: boolean;
}

export interface InputBufferEntry {
  direction: string; // "n"|"f"|"b"|"d"|"u"|"d/f"|"d/b"|"u/f"|"u/b"
  buttons: string[]; // ["lp"], ["rp","lp"], etc.
  frame: number;
}

export interface JuggleState {
  isAirborne: boolean;
  velocity: { x: number; y: number; z: number };
  hitCount: number;
  screwUsed: boolean;
  boundUsed: boolean;
  gravityScale: number;
  wallSplatActive: boolean;
  wallSplatTimer: number;
  isWallSplatted: boolean;
  wallSplatFrames: number;
  currentLaunchGravity: number;
}

export interface TekkenMoveDef {
  id: string;
  name: string;
  type: "normal" | "special" | "command" | "throw" | "rage";
  height: TekkenAttackHeight;
  limb: TekkenLimb;
  startup: number;
  active: number;
  recovery: number;
  onHit: number;
  onBlock: number;
  onCounterHit: number;
  damage: number;
  chipDamage: number;
  isLauncher: boolean;
  launchHeight: number;
  launchGravity: number;
  isScrew: boolean;
  isBound: boolean;
  isHoming: boolean;
  isPowerCrush: boolean;
  hasHighCrush: boolean;
  hasLowCrush: boolean;
  knockback: number;
  wallSplat: boolean;
  hitbox: { x: number; y: number; z: number; w: number; h: number; d: number };
  advanceDistance: number;
}

export interface TekkenCommandInput {
  direction: string;
  buttons: string[];
}

export interface TekkenMoveEntry {
  input: TekkenCommandInput[];
  move: TekkenMoveDef;
}

export interface TekkenAIProfile {
  aggression: number;       // 0-1: how aggressively the AI approaches and attacks
  throwFrequency: number;   // 0-1: how often the AI attempts throws
  whiffPunishRate: number;  // 0-1: how reliably the AI punishes whiffed moves
  pressureStyle: number;    // 0-1: how much the AI pressures on offense (vs spacing)
  defensiveness: number;    // 0-1: how often the AI blocks/retreats preemptively
  pokeFrequency: number;    // 0-1: how often the AI uses safe pokes at range
  launcherFrequency: number; // 0-1: how often the AI goes for risky launchers
}

export interface TekkenCharacterDef {
  id: string;
  name: string;
  title: string;
  archetype: string;
  colors: { primary: number; secondary: number; accent: number; skin: number; hair: number };
  moveList: TekkenMoveEntry[];
  comboRoutes: string[][];
  advancedComboRoutes?: string[][];
  expertComboRoutes?: string[][];
  victoryPoseType?: string;
  rageArt: TekkenMoveDef;
  walkSpeed: number;
  dashSpeed: number;
  backdashDist: number;
  aiProfile?: TekkenAIProfile;
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  shakeIntensity: number;
  shakeDecay: number;
  zoomOffset: number;
}

export interface TekkenFighter {
  characterId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  facingRight: boolean;
  hp: number;
  maxHp: number;
  state: TekkenFighterState;
  stateTimer: number;
  currentMove: string | null;
  moveFrame: number;
  movePhase: "startup" | "active" | "recovery" | "none";
  moveHasHit: boolean;
  canCancel: boolean;
  comboCount: number;
  comboDamage: number;
  comboDamageScaling: number;
  grounded: boolean;
  juggle: JuggleState;
  hitstunFrames: number;
  blockstunFrames: number;
  invincibleFrames: number;
  dashFrames: number;
  rageActive: boolean;
  rageArtUsed: boolean;
  wallDistance: number;
  input: TekkenInputState;
  inputBuffer: InputBufferEntry[];
  crouching: boolean;
  counterHitWindow: boolean;
}

export type TekkenGameMode = "vs_cpu" | "vs_mode" | "arcade" | "training" | "ranked";

/** Per-character customization selections */
export interface TekkenCustomizationState {
  /** Map from slot to selected skin ID */
  equippedSkins: Partial<Record<TekkenSkinSlot, string>>;
  /** Set of unlocked skin IDs */
  unlockedSkins: Set<string>;
}

/** Arcade mode progression state */
export interface TekkenArcadeState {
  /** Opponents defeated so far */
  opponentsDefeated: number;
  /** Total opponents in arcade run */
  totalOpponents: number;
  /** Whether the story ending has been shown */
  endingShown: boolean;
}

export interface TrainingModeState {
  aiEnabled: boolean;
  showHitboxes: boolean;
  lastMoveName: string;
  lastMoveStartup: number;
  lastMoveActive: number;
  lastMoveRecovery: number;
  frameAdvantage: number;
}

export interface StageHazard {
  id: string;
  type: "fire_brazier" | "acid_patch" | "breakable_pillar";
  active: boolean;
  cooldownTimer: number;
  broken: boolean;
  position: { x: number; y: number; z: number };
  damage: number;
  radius: number;
}

export interface TekkenState {
  phase: TekkenPhase;
  gameMode: TekkenGameMode;
  fighters: [TekkenFighter, TekkenFighter];
  round: { roundNumber: number; winnerId: number | null; timeRemaining: number };
  roundResults: (0 | 1)[];
  bestOf: number;
  arenaId: string;
  isPaused: boolean;
  frameCount: number;
  slowdownFrames: number;
  slowdownScale: number;
  announcement: string | null;
  announcementTimer: number;
  stageWidth: number;
  stageDepth: number;
  cameraState: CameraState;
  trainingMode: TrainingModeState;
  difficulty: number; // 0=easy, 1=medium, 2=hard
  stageHazards: StageHazard[];
}

export function createDefaultInput(): TekkenInputState {
  return { left: false, right: false, up: false, down: false, lp: false, rp: false, lk: false, rk: false, rage: false };
}

export function createDefaultJuggle(): JuggleState {
  return { isAirborne: false, velocity: { x: 0, y: 0, z: 0 }, hitCount: 0, screwUsed: false, boundUsed: false, gravityScale: 1, wallSplatActive: false, wallSplatTimer: 0, isWallSplatted: false, wallSplatFrames: 0, currentLaunchGravity: 0 };
}

export function createFighter(characterId: string, x: number, facingRight: boolean): TekkenFighter {
  return {
    characterId,
    position: { x, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facingRight,
    hp: 170,
    maxHp: 170,
    state: TekkenFighterState.IDLE,
    stateTimer: 0,
    currentMove: null,
    moveFrame: 0,
    movePhase: "none",
    moveHasHit: false,
    canCancel: false,
    comboCount: 0,
    comboDamage: 0,
    comboDamageScaling: 1,
    grounded: true,
    juggle: createDefaultJuggle(),
    hitstunFrames: 0,
    blockstunFrames: 0,
    invincibleFrames: 0,
    dashFrames: 0,
    rageActive: false,
    rageArtUsed: false,
    wallDistance: 10,
    input: createDefaultInput(),
    inputBuffer: [],
    crouching: false,
    counterHitWindow: false,
  };
}

export function createTekkenState(gameMode: TekkenGameMode, arenaId: string, p1CharId: string, p2CharId: string): TekkenState {
  return {
    phase: TekkenPhase.INTRO,
    gameMode,
    fighters: [
      createFighter(p1CharId, -2.0, true),
      createFighter(p2CharId, 2.0, false),
    ],
    round: { roundNumber: 1, winnerId: null, timeRemaining: 60 * 60 },
    roundResults: [],
    bestOf: 3,
    arenaId,
    isPaused: false,
    frameCount: 0,
    slowdownFrames: 0,
    slowdownScale: 1,
    announcement: null,
    announcementTimer: 0,
    stageWidth: 7,
    stageDepth: 2,
    cameraState: {
      x: 0, y: 1.4, z: 5.5,
      targetX: 0, targetY: 0.9,
      shakeIntensity: 0, shakeDecay: 0.9, zoomOffset: 0,
    },
    trainingMode: {
      aiEnabled: true,
      showHitboxes: false,
      lastMoveName: "",
      lastMoveStartup: 0,
      lastMoveActive: 0,
      lastMoveRecovery: 0,
      frameAdvantage: 0,
    },
    difficulty: 1,
    stageHazards: [],
  };
}
