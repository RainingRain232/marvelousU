// ---------------------------------------------------------------------------
// Shadowhand mode — core state
// ---------------------------------------------------------------------------

import type { CrewMember, CrewRole } from "../config/CrewDefs";
import { createCrewMember } from "../config/CrewDefs";
import type { TargetDef, LootDef } from "../config/TargetDefs";
import type { ShadowhandDifficulty } from "../config/ShadowhandConfig";
import { ShadowhandConfig } from "../config/ShadowhandConfig";

// ---------------------------------------------------------------------------
// Enums & types
// ---------------------------------------------------------------------------

export enum ShadowhandPhase {
  MAIN_MENU = "main_menu",
  GUILD_HUB = "guild_hub",
  TARGET_SELECT = "target_select",
  CREW_SELECT = "crew_select",
  PLANNING = "planning",
  HEIST = "heist",
  ESCAPE = "escape",
  RESULTS = "results",
  GAME_OVER = "game_over",
  VICTORY = "victory",
}

export enum AlertLevel {
  UNAWARE = 0,
  SUSPICIOUS = 1,
  ALARMED = 2,
}

export type TileType = "floor" | "wall" | "door" | "locked_door" | "window" | "trap" | "secret_door" | "stairs_up" | "stairs_down" | "entry_point" | "loot_spot" | "primary_loot";

export interface MapTile {
  x: number;
  y: number;
  type: TileType;
  roomId: number; // -1 for corridor
  lit: boolean; // in light
  torchSource: boolean;
  revealed: boolean; // seen by crew
  hasGuard: boolean;
  loot: LootDef | null;
  trapArmed: boolean;
  smoke: number; // smoke remaining seconds
  caltrops: boolean;
}

export interface Guard {
  id: string;
  x: number;
  y: number;
  angle: number; // facing direction in radians
  patrolPath: { x: number; y: number }[];
  patrolIndex: number;
  patrolForward: boolean;
  speed: number;
  alertLevel: AlertLevel;
  alertTimer: number;
  stunTimer: number;
  sleepTimer: number;
  investigating: { x: number; y: number } | null;
  canSeeThief: string | null; // thief id being tracked
  isElite: boolean;
  isDog: boolean;
  chasePath: { x: number; y: number }[];
  lastKnownThiefPos: { x: number; y: number } | null;
  waitTimer: number;
}

export interface ThiefUnit {
  id: string;
  crewMemberId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  crouching: boolean;
  speed: number;
  noiseLevel: number;
  visible: boolean; // visible to guards
  disguised: boolean;
  disguiseTimer: number;
  shadowMeld: boolean;
  shadowMeldTimer: number;
  selected: boolean;
  carryingLoot: LootDef[];
  hp: number;
  maxHp: number;
  alive: boolean;
  captured: boolean;
  escaped: boolean;
  role: import("../config/CrewDefs").CrewRole;
  abilities: string[];
  activePath: { x: number; y: number }[];
  // Stealth feedback
  detectionLevel: number; // 0-100, how close to being spotted
  nearestGuardDist: number; // distance to nearest aware guard
  inShadow: boolean;
  // Injury system
  injured: boolean;
  injuryPenalty: number; // 0-0.3, speed/ability penalty
}

export interface Room {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  connected: number[];
}

export interface HeistMap {
  width: number;
  height: number;
  tiles: MapTile[][];
  rooms: Room[];
  entryPoints: { x: number; y: number }[];
  primaryLootPos: { x: number; y: number };
  exitPoints: { x: number; y: number }[];
}

export interface NoiseEvent {
  x: number;
  y: number;
  radius: number;
  timer: number;
  source: string; // thief id or "environment"
}

export type HeistModifier =
  | "lockdown"        // all doors lock after 90s
  | "elite_patrol"    // extra elite guard mid-heist
  | "guard_rotation"  // new guards swap in at intervals
  | "paranoid"        // alert decay is halved
  | "fog"             // reduced vision for thieves
  | "treasure_room"   // extra loot but more traps
  | "inquisitor_spy"  // one guard has doubled vision range
  | "moonless_night"  // all window light removed (darker)
  ;

export interface HeistEvent {
  type: string;
  triggerTime: number; // seconds into heist
  triggered: boolean;
  message: string;
}

export interface ComboTracker {
  silentTakedowns: number;
  consecutiveLootPickups: number;
  timeInShadow: number;
  timeTotal: number;
  guardsAvoided: number; // passed within vision range without detection
  doorsPickedSilently: number;
  torchesExtinguished: number;
  perfectEscape: boolean; // no alerts at all
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface HeistState {
  map: HeistMap;
  guards: Guard[];
  thieves: ThiefUnit[];
  noiseEvents: NoiseEvent[];
  globalAlert: AlertLevel;
  globalAlertTimer: number;
  reinforcementTimer: number;
  reinforcementsSpawned: number;
  elapsedTime: number;
  lootCollected: LootDef[];
  primaryLootTaken: boolean;
  allEscaped: boolean;
  paused: boolean;
  speedMult: number;
  // New fields
  modifiers: HeistModifier[];
  events: HeistEvent[];
  combo: ComboTracker;
  particles: Particle[];
  screenShake: number; // remaining shake intensity
  announcements: { text: string; color: number; timer: number }[];
  // Guild upgrade flags (copied from state at init for heist-level access)
  hasShadowLibrary: boolean;
  hasThievesCant: boolean;
  hasIntelNetwork: boolean;
  // Alternate objectives
  objective: HeistObjective;
}

export type HeistObjective =
  | { type: "steal"; desc: string }     // default: steal primary loot and escape
  | { type: "rescue"; npcX: number; npcY: number; rescued: boolean; desc: string }
  | { type: "sabotage"; targetsLeft: number; total: number; desc: string }
  | { type: "timed"; timeLimit: number; desc: string }
  ;

export type GuildUpgradeId =
  | "safe_house"        // heat decays faster
  | "training_ground"   // crew XP +50%
  | "armory"            // equipment 20% cheaper
  | "intel_network"     // reveals guard count before heist
  | "escape_tunnels"    // +1 exit point on maps
  | "fence_contact"     // loot sells for 15% more
  | "infirmary"         // crew heal between heists
  | "shadow_library"    // shade/alchemist abilities enhanced
  | "thieves_cant"      // crew share vision range bonus
  ;

export interface Contract {
  id: string;
  name: string;
  desc: string;
  targetId: string;
  objective: HeistObjective;
  bonusGold: number;
  bonusRep: number;
  expiresDay: number;
  isRescue: boolean;
  rescueCrewId?: string;
}

export interface GuildState {
  gold: number;
  reputation: number;
  tier: number;
  heat: Map<string, number>;
  roster: CrewMember[];
  inventory: { id: string; uses: number }[];
  completedHeists: string[];
  totalLootValue: number;
  perfectHeists: number;
  day: number;
  upgrades: Set<GuildUpgradeId>;
  achievements: Set<string>;
  totalHeistsAttempted: number;
  totalHeistsSucceeded: number;
  longestStreak: number;
  currentStreak: number;
  guildName: string;
  // Contracts & flavor
  availableContracts: Contract[];
  news: string[];
  capturedCrewIds: string[]; // crew that can be rescued
  bonds: Map<string, number>; // "crewId1_crewId2" -> bond strength
  tutorialDone: boolean;
}

export interface ShadowhandState {
  phase: ShadowhandPhase;
  difficulty: ShadowhandDifficulty;
  seed: number;
  guild: GuildState;
  currentTarget: TargetDef | null;
  selectedCrew: string[];
  selectedEquipment: string[];
  activeContractId: string | null;
  heist: HeistState | null;
  score: number;
  log: string[];
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function createShadowhandState(seed: number, difficulty: ShadowhandDifficulty): ShadowhandState {
  const rng = seedRng(seed);

  // Start with 3 random crew members
  const startRoles: CrewRole[] = ["cutpurse", "sapmaster", "shade"];
  const roster: CrewMember[] = startRoles.map((role, i) =>
    createCrewMember(role, `crew_${i}`, Math.floor(rng() * 10000))
  );

  return {
    phase: ShadowhandPhase.GUILD_HUB,
    difficulty,
    seed,
    guild: {
      gold: ShadowhandConfig.STARTING_GOLD,
      reputation: 0,
      tier: 0,
      heat: new Map(),
      roster,
      inventory: [
        { id: "basic_lockpick", uses: 5 },
        { id: "smoke_bomb", uses: 2 },
      ],
      completedHeists: [],
      totalLootValue: 0,
      perfectHeists: 0,
      day: 1,
      upgrades: new Set(),
      achievements: new Set(),
      totalHeistsAttempted: 0,
      totalHeistsSucceeded: 0,
      longestStreak: 0,
      currentStreak: 0,
      guildName: "The Shadowhand",
      availableContracts: [],
      news: ["The guild is open for business.", "Camelot sleeps. Your knives are sharp."],
      capturedCrewIds: [],
      bonds: new Map(),
      tutorialDone: false,
    },
    currentTarget: null,
    selectedCrew: [],
    selectedEquipment: [],
    activeContractId: null,
    heist: null,
    score: 0,
    log: ["The Shadowhand guild opens its doors..."],
  };
}

export function createHeistState(map: HeistMap): HeistState {
  return {
    map,
    guards: [],
    thieves: [],
    noiseEvents: [],
    globalAlert: AlertLevel.UNAWARE,
    globalAlertTimer: 0,
    reinforcementTimer: 0,
    reinforcementsSpawned: 0,
    elapsedTime: 0,
    lootCollected: [],
    primaryLootTaken: false,
    allEscaped: false,
    paused: false,
    speedMult: 1,
    modifiers: [],
    events: [],
    combo: {
      silentTakedowns: 0,
      consecutiveLootPickups: 0,
      timeInShadow: 0,
      timeTotal: 0,
      guardsAvoided: 0,
      doorsPickedSilently: 0,
      torchesExtinguished: 0,
      perfectEscape: true,
    },
    particles: [],
    screenShake: 0,
    announcements: [],
    hasShadowLibrary: false,
    hasThievesCant: false,
    hasIntelNetwork: false,
    objective: { type: "steal", desc: "Steal the primary loot and escape." },
  };
}

export function addLog(state: ShadowhandState, msg: string): void {
  state.log.push(msg);
  if (state.log.length > 50) state.log.shift();
}

// ---------------------------------------------------------------------------
// Simple seeded RNG
// ---------------------------------------------------------------------------

export function seedRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
