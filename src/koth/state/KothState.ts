// ---------------------------------------------------------------------------
// King of the Hill — core state
// ---------------------------------------------------------------------------

import type { UnitType, GuardianType, RelicType, CataclysmType, ObstacleDef, Difficulty, UpgradeId } from "../config/KothConfig";
import { KothConfig, ALL_UNIT_TYPES } from "../config/KothConfig";

export enum KothPhase {
  PLAYING = "playing",
  VICTORY = "victory",
}

export interface KothUnit {
  id: string;
  owner: number; // 0 = player, 1 = AI, 2 = neutral (guardian)
  type: UnitType | GuardianType;
  hp: number;
  maxHp: number;
  baseAtk: number;
  baseSpeed: number;
  atk: number;
  speed: number;
  range: number;
  attackRate: number;
  x: number;
  y: number;
  targetId: string | null;
  attackCooldown: number;
  alive: boolean;
  size: number;
  color: number;
  shape: string;
  goalX: number;
  goalY: number;
  // Movement/facing
  facingAngle: number; // radians, direction unit faces
  // Ability state
  hasCharged: boolean;
  idleTimer: number;
  hitFlash: number;
  slowDebuff: number;
  // Veterancy
  vetKills: number;
  vetLevel: number; // 0-3
  // Guardian special ability
  specialCooldown: number;
  // Slash arc VFX state
  slashArc: number; // timer for melee swing visual (0 = none)
  slashAngle: number; // angle of the slash
}

export interface KothProjectile {
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  color: number;
  owner: number;
  isSplash: boolean;
  sourceType: UnitType | GuardianType;
}

export interface KothRelic {
  id: string;
  type: RelicType;
  x: number;
  y: number;
  alive: boolean;
}

export interface KothCataclysm {
  type: CataclysmType;
  timer: number;
  x: number;
  y: number;
}

export interface KillFeedEntry {
  text: string;
  color: number;
  timer: number;
}

export interface KothPlayer {
  id: number;
  name: string;
  color: number;
  score: number;
  gold: number;
  goldAccum: number;
  spawnX: number;
  spawnY: number;
  isAI: boolean;
  controllingHill: boolean;
  speedBuffTimer: number;
  damageBuffTimer: number;
  armorBuffTimer: number;
  aiTimer: number;
  aiSaveMode: boolean;
}

export interface KothState {
  phase: KothPhase;
  paused: boolean;
  difficulty: Difficulty;
  winner: number;
  elapsed: number;
  units: KothUnit[];
  projectiles: KothProjectile[];
  relics: KothRelic[];
  obstacles: ObstacleDef[];
  cataclysm: KothCataclysm | null;
  players: [KothPlayer, KothPlayer];
  unitIdCounter: number;
  relicIdCounter: number;
  guardianTimer: number;
  guardianWaveIndex: number;
  relicTimer: number;
  cataclysmTimer: number;
  captureMeter: number;
  hillController: number;
  hillContestPulse: number;
  streakTimer: number;
  streakOwner: number;
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[];
  announcements: { text: string; color: number; timer: number }[];
  killFeed: KillFeedEntry[];
  // Ranged attack trails (brief line flashes)
  rangedTrails: { x1: number; y1: number; x2: number; y2: number; color: number; timer: number }[];
  // Floating combat text
  floatingTexts: { x: number; y: number; text: string; color: number; timer: number; maxTimer: number }[];
  // Multi-kill tracking
  recentKillTimer: [number, number]; // time since last kill per player
  killCombo: [number, number]; // consecutive kills within 2s
  // Guardian warning
  guardianWarning: number; // seconds of warning before next guardian spawn
  // UI state
  selectedUnit: UnitType;
  rallyX: number;
  rallyY: number;
  hasRallyPoint: boolean;
  hoveredUnit: UnitType | null;
  speedMult: number;
  // War Horn
  warHornCooldown: number;
  warHornTimer: number; // active duration remaining
  // Upgrades purchased [player 0 levels]
  upgrades: Record<UpgradeId, number>;
  // Screen shake
  shakeTimer: number;
  shakeIntensity: number;
  // Space held for auto-spawn
  spaceHeld: boolean;
  // Stats tracking
  kills: [number, number];
  unitsProduced: [number, number];
  goldSpent: [number, number];
  hillTimeHeld: [number, number];
  longestStreak: [number, number];
  guardiansKilled: [number, number];
}

function generateObstacles(): ObstacleDef[] {
  const obs: ObstacleDef[] = [];
  const cx = KothConfig.HILL_CENTER_X, cy = KothConfig.HILL_CENTER_Y;
  const hr = KothConfig.HILL_RADIUS;
  const types: ObstacleDef["type"][] = ["rock", "tree", "ruin"];
  const count = 6 + Math.floor(Math.random() * 4); // 6-9 obstacles
  for (let i = 0; i < count; i++) {
    // Try random positions until valid
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = 100 + Math.random() * (KothConfig.ARENA_W - 200);
      const y = 80 + Math.random() * (KothConfig.ARENA_H - 160);
      const dx = x - cx, dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < hr + 35) continue; // not on hill
      if (x < 80 || x > KothConfig.ARENA_W - 80) continue; // not at spawn
      // Not too close to existing obstacles
      let tooClose = false;
      for (const o of obs) {
        const odx = o.x - x, ody = o.y - y;
        if (odx * odx + ody * ody < 50 * 50) { tooClose = true; break; }
      }
      if (tooClose) continue;
      obs.push({ x, y, radius: 11 + Math.random() * 9, type: types[Math.floor(Math.random() * types.length)] });
      break;
    }
  }
  return obs;
}

export function createKothState(difficulty: Difficulty = "normal"): KothState {
  const { ARENA_W, ARENA_H, SPAWN_OFFSET } = KothConfig;
  return {
    phase: KothPhase.PLAYING,
    paused: false,
    difficulty,
    winner: -1,
    elapsed: 0,
    units: [],
    projectiles: [],
    relics: [],
    obstacles: generateObstacles(),
    cataclysm: null,
    players: [
      {
        id: 0, name: "You", color: 0x4488cc,
        score: 0, gold: KothConfig.START_GOLD, goldAccum: 0,
        spawnX: SPAWN_OFFSET, spawnY: ARENA_H / 2,
        isAI: false, controllingHill: false,
        speedBuffTimer: 0, damageBuffTimer: 0, armorBuffTimer: 0,
        aiTimer: 0, aiSaveMode: false,
      },
      {
        id: 1, name: "Enemy", color: 0xcc4444,
        score: 0, gold: KothConfig.START_GOLD, goldAccum: 0,
        spawnX: ARENA_W - SPAWN_OFFSET, spawnY: ARENA_H / 2,
        isAI: true, controllingHill: false,
        speedBuffTimer: 0, damageBuffTimer: 0, armorBuffTimer: 0,
        aiTimer: 0, aiSaveMode: false,
      },
    ],
    unitIdCounter: 0,
    relicIdCounter: 0,
    guardianTimer: 0,
    guardianWaveIndex: 0,
    relicTimer: KothConfig.RELIC_SPAWN_INTERVAL * 0.5,
    cataclysmTimer: KothConfig.CATACLYSM_FIRST_DELAY,
    captureMeter: 0,
    hillController: -1,
    hillContestPulse: 0,
    streakTimer: 0,
    streakOwner: -1,
    particles: [],
    announcements: [{ text: "Seize the Hill!", color: 0xffd700, timer: 3 }],
    killFeed: [],
    rangedTrails: [],
    floatingTexts: [],
    recentKillTimer: [99, 99],
    killCombo: [0, 0],
    guardianWarning: 0,
    selectedUnit: ALL_UNIT_TYPES[0],
    rallyX: KothConfig.HILL_CENTER_X,
    rallyY: KothConfig.HILL_CENTER_Y,
    hasRallyPoint: false,
    hoveredUnit: null,
    speedMult: 1,
    warHornCooldown: 0,
    warHornTimer: 0,
    upgrades: { sharp_blades: 0, thick_armor: 0, swift_boots: 0, war_drums: 0, blessed_weapons: 0 },
    shakeTimer: 0,
    shakeIntensity: 0,
    spaceHeld: false,
    kills: [0, 0],
    unitsProduced: [0, 0],
    goldSpent: [0, 0],
    hillTimeHeld: [0, 0],
    longestStreak: [0, 0],
    guardiansKilled: [0, 0],
  };
}
