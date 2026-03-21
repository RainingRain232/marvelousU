// ---------------------------------------------------------------------------
// Morgan -- Game State
// Tracks player, guards, artifacts, map tiles, detection, traps, pickups
// ---------------------------------------------------------------------------

import {
  FLOOR_W, FLOOR_H, TileType, GuardState, GuardType, MorganSpell, PickupType,
  Difficulty,
  MAX_STAMINA, MAX_MANA,
  GUARD_HP, HEAVY_GUARD_HP, MAGE_GUARD_HP, HOUND_HP, BOSS_HP,
  type LevelDef, LEVEL_DEFS,
} from "./MorganConfig";

// --- Vector helpers ---
export interface Vec2 { x: number; z: number; }
export function v2(x: number, z: number): Vec2 { return { x, z }; }
export function v2Dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
export function v2Normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.z * v.z);
  return len > 0.001 ? { x: v.x / len, z: v.z / len } : { x: 0, z: 0 };
}
export function v2Add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, z: a.z + b.z }; }
export function v2Scale(v: Vec2, s: number): Vec2 { return { x: v.x * s, z: v.z * s }; }

// --- Player state ---
export interface MorganPlayer {
  pos: Vec2;
  angle: number;
  hp: number;
  maxHp: number;
  stamina: number;
  mana: number;
  sneaking: boolean;
  sprinting: boolean;
  cloaked: boolean;
  cloakTimer: number;
  score: number;
  artifacts: number;
  dead: boolean;
  spells: MorganSpell[];
  selectedSpell: number;
  keys: number;
  xp: number;
  upgrades: Set<string>; // "spell_tier" format
  backstabCooldown: number;
  timesDetected: number;
  guardsKilled: number;
  ghostKills: number; // kills from behind without being detected
  noiseLevel: number; // 0..1, how much noise the player is making
  moving: boolean;
  visibility: number;
  comboCount: number;
  comboTimer: number;
  gold: number;
  spellCooldowns: Record<string, number>; // spell -> remaining cooldown
  maxMana: number;
  maxStamina: number;
  manaRegenBonus: number;
  stealthBonus: number; // detection reduction multiplier (0.85 = 15% less)
  speedBonus: number;
  statUpgrades: Record<string, number>; // stat_id -> tier
}

// --- Guard ---
export interface Guard {
  id: number;
  pos: Vec2;
  angle: number;
  hp: number;
  maxHp: number;
  state: GuardState;
  guardType: GuardType;
  alertTimer: number;
  sleepTimer: number;
  stunTimer: number;
  patrolPath: Vec2[];
  patrolIndex: number;
  patrolForward: boolean;
  detection: number;
  lastKnownPlayerPos: Vec2 | null;
  isBoss: boolean;
  investigateTarget: Vec2 | null;
  mageFireCooldown: number;
  waitTimer: number; // pause at patrol waypoints
  bark: string | null;
  barkTimer: number;
  bossPhase: number; // 1, 2, 3 for boss; 0 for non-boss
  bossShockwaveCooldown: number;
  bossTeleportCooldown: number;
}

// --- Guard corpse ---
export interface Corpse {
  pos: Vec2;
  discovered: boolean;
  guardType: GuardType;
}

// --- Loot drop ---
export interface LootDrop {
  id: number;
  pos: Vec2;
  type: "gold" | "health" | "mana";
  value: number;
  collected: boolean;
  timer: number; // disappears after timeout
}

// --- Artifact ---
export interface Artifact {
  id: number;
  pos: Vec2;
  collected: boolean;
  type: "chalice" | "scroll" | "amulet" | "crystal" | "tome";
}

// --- Pickup ---
export interface Pickup {
  id: number;
  pos: Vec2;
  type: PickupType;
  collected: boolean;
}

// --- Sleep mist zone ---
export interface MistZone {
  pos: Vec2;
  radius: number;
  timer: number;
}

// --- Dark bolt projectile ---
export interface DarkBolt {
  pos: Vec2;
  dir: Vec2;
  speed: number;
  damage: number;
  timer: number;
}

// --- Mage fireball ---
export interface Fireball {
  pos: Vec2;
  dir: Vec2;
  speed: number;
  damage: number;
  timer: number;
}

// --- Shadow decoy ---
export interface Decoy {
  pos: Vec2;
  timer: number;
  explodes: boolean; // if upgraded
}

// --- Trap ---
export interface Trap {
  id: number;
  pos: Vec2;
  type: "pressure" | "ward";
  triggered: boolean;
  visible: boolean; // wards glow, pressure plates hidden unless sneaking
}

// --- Sound event (from noise propagation) ---
export interface SoundEvent {
  pos: Vec2;
  radius: number;
  timer: number; // decays, for visual indicator
}

// --- Level stats for rating ---
export interface LevelStats {
  timesDetected: number;
  guardsKilled: number;
  ghostKills: number;
  trapsTriggered: number;
  startTime: number;
  endTime: number;
}

// --- Game state ---
export interface MorganGameState {
  phase: "menu" | "playing" | "paused" | "level_complete" | "game_over" | "victory" | "upgrading";
  level: number;
  levelDef: LevelDef;
  player: MorganPlayer;
  guards: Guard[];
  artifacts: Artifact[];
  pickups: Pickup[];
  traps: Trap[];
  tiles: TileType[][];
  torchPositions: Vec2[];
  exitPos: Vec2;
  mistZones: MistZone[];
  darkBolts: DarkBolt[];
  fireballs: Fireball[];
  decoys: Decoy[];
  soundEvents: SoundEvent[];
  corpses: Corpse[];
  lootDrops: LootDrop[];
  extinguishedTorches: Set<number>;
  difficulty: Difficulty;
  time: number;
  alertLevel: number;
  detected: boolean;
  exitOpen: boolean;
  messages: { text: string; timer: number; color?: string }[];
  levelStats: LevelStats;
  totalXP: number;
  screenFlash: { color: string; timer: number } | null;
  tutorialShown: Set<string>;
}

// --- Factory ---
let _nextId = 0;

function guardHpForType(type: GuardType, isBoss: boolean): number {
  if (isBoss) return BOSS_HP;
  switch (type) {
    case GuardType.HEAVY: return HEAVY_GUARD_HP;
    case GuardType.MAGE: return MAGE_GUARD_HP;
    case GuardType.HOUND: return HOUND_HP;
    default: return GUARD_HP;
  }
}

export function createGuard(pos: Vec2, patrolPath: Vec2[], isBoss = false, guardType = GuardType.NORMAL): Guard {
  const hp = guardHpForType(guardType, isBoss);
  return {
    id: _nextId++,
    pos: { ...pos },
    angle: 0,
    hp,
    maxHp: hp,
    state: GuardState.PATROL,
    guardType,
    alertTimer: 0,
    sleepTimer: 0,
    stunTimer: 0,
    patrolPath,
    patrolIndex: 0,
    patrolForward: true,
    detection: 0,
    lastKnownPlayerPos: null,
    isBoss,
    investigateTarget: null,
    mageFireCooldown: 0,
    waitTimer: 0,
    bark: null,
    barkTimer: 0,
    bossPhase: isBoss ? 1 : 0,
    bossShockwaveCooldown: 0,
    bossTeleportCooldown: 0,
  };
}

export function createArtifact(pos: Vec2, type: Artifact["type"]): Artifact {
  return { id: _nextId++, pos: { ...pos }, collected: false, type };
}

export function createPickup(pos: Vec2, type: PickupType): Pickup {
  return { id: _nextId++, pos: { ...pos }, type, collected: false };
}

export function createTrap(pos: Vec2, type: Trap["type"]): Trap {
  return { id: _nextId++, pos: { ...pos }, type, triggered: false, visible: type === "ward" };
}

export function createPlayer(): MorganPlayer {
  return {
    pos: v2(3, 3),
    angle: 0,
    hp: 100,
    maxHp: 100,
    stamina: MAX_STAMINA,
    mana: MAX_MANA,
    sneaking: false,
    sprinting: false,
    cloaked: false,
    cloakTimer: 0,
    score: 0,
    artifacts: 0,
    dead: false,
    spells: [MorganSpell.SHADOW_CLOAK, MorganSpell.DARK_BOLT, MorganSpell.SLEEP_MIST, MorganSpell.BLINK, MorganSpell.DECOY],
    selectedSpell: 0,
    keys: 0,
    xp: 0,
    upgrades: new Set(),
    backstabCooldown: 0,
    timesDetected: 0,
    guardsKilled: 0,
    ghostKills: 0,
    noiseLevel: 0,
    moving: false,
    visibility: 0,
    comboCount: 0,
    comboTimer: 0,
    gold: 0,
    spellCooldowns: {},
    maxMana: MAX_MANA,
    maxStamina: MAX_STAMINA,
    manaRegenBonus: 0,
    stealthBonus: 1.0,
    speedBonus: 0,
    statUpgrades: {},
  };
}

export function createInitialState(): MorganGameState {
  const tiles: TileType[][] = [];
  for (let y = 0; y < FLOOR_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < FLOOR_W; x++) {
      tiles[y][x] = TileType.FLOOR;
    }
  }
  return {
    phase: "menu",
    level: 1,
    levelDef: LEVEL_DEFS[0],
    player: createPlayer(),
    guards: [],
    artifacts: [],
    pickups: [],
    traps: [],
    tiles,
    torchPositions: [],
    exitPos: v2(FLOOR_W - 3, FLOOR_H - 3),
    mistZones: [],
    darkBolts: [],
    fireballs: [],
    decoys: [],
    soundEvents: [],
    corpses: [],
    lootDrops: [],
    extinguishedTorches: new Set(),
    difficulty: Difficulty.NORMAL,
    time: 0,
    alertLevel: 0,
    detected: false,
    exitOpen: false,
    messages: [],
    levelStats: { timesDetected: 0, guardsKilled: 0, ghostKills: 0, trapsTriggered: 0, startTime: 0, endTime: 0 },
    totalXP: 0,
    screenFlash: null,
    tutorialShown: new Set(),
  };
}

export function pushMessage(state: MorganGameState, text: string, color?: string): void {
  state.messages.push({ text, timer: 3.5, color });
  if (state.messages.length > 6) state.messages.shift();
}

export function spawnLoot(state: MorganGameState, pos: Vec2): void {
  const r = Math.random();
  if (r < 0.35) {
    state.lootDrops.push({ id: _nextId++, pos: { ...pos }, type: "gold", value: 50, collected: false, timer: 30 });
  } else if (r < 0.55) {
    state.lootDrops.push({ id: _nextId++, pos: { ...pos }, type: "health", value: 25, collected: false, timer: 30 });
  } else if (r < 0.7) {
    state.lootDrops.push({ id: _nextId++, pos: { ...pos }, type: "mana", value: 30, collected: false, timer: 30 });
  }
}

export function emitSound(state: MorganGameState, pos: Vec2, radius: number): void {
  state.soundEvents.push({ pos: { ...pos }, radius, timer: 0.5 });
}
