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
  selected: boolean;
  carryingLoot: LootDef[];
  hp: number;
  maxHp: number;
  alive: boolean;
  captured: boolean;
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
}

export interface GuildState {
  gold: number;
  reputation: number;
  tier: number;
  heat: Map<string, number>; // region -> heat level
  roster: CrewMember[];
  inventory: { id: string; uses: number }[];
  completedHeists: string[];
  totalLootValue: number;
  perfectHeists: number; // no alerts
  day: number;
}

export interface ShadowhandState {
  phase: ShadowhandPhase;
  difficulty: ShadowhandDifficulty;
  seed: number;
  guild: GuildState;
  currentTarget: TargetDef | null;
  selectedCrew: string[]; // crew member ids
  selectedEquipment: string[]; // equipment ids
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
    },
    currentTarget: null,
    selectedCrew: [],
    selectedEquipment: [],
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
