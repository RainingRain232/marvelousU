// Top-level RPG persistent state
import type { AbilityType, RPGPhase, UnitType, UpgradeType, Vec2 } from "@/types";
import type { LeaderBlessing } from "@rpg/config/LeaderEncounterDefs";

// ---------------------------------------------------------------------------
// Party & Equipment
// ---------------------------------------------------------------------------

export interface RPGItem {
  id: string;
  name: string;
  type: "weapon" | "armor" | "accessory" | "helmet" | "shield" | "legs" | "boots" | "ring" | "consumable" | "key";
  stats: Partial<{ atk: number; def: number; hp: number; mp: number; speed: number }>;
  description: string;
  abilityType?: AbilityType;
  value: number;
}

export interface EquipmentSlots {
  weapon: RPGItem | null;
  armor: RPGItem | null;
  accessory: RPGItem | null;
  helmet: RPGItem | null;
  shield: RPGItem | null;
  legs: RPGItem | null;
  boots: RPGItem | null;
  ring: RPGItem | null;
}

export interface StatusEffect {
  type: "poison" | "regen" | "slow" | "haste" | "shield" | "stun";
  duration: number;
  magnitude: number;
}

export interface PartyMember {
  id: string;
  name: string;
  unitType: UnitType;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  speed: number;
  range: number;
  abilityTypes: AbilityType[];
  /** Spells learned through the spell learning system (UpgradeType keys). */
  knownSpells: UpgradeType[];
  equipment: EquipmentSlots;
  statusEffects: StatusEffect[];
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryState {
  items: { item: RPGItem; quantity: number }[];
  maxSlots: number;
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export interface QuestObjective {
  type: "kill" | "collect" | "explore" | "talk";
  targetId: string;
  current: number;
  required: number;
}

export interface QuestState {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  isComplete: boolean;
  reward: { gold: number; xp: number; items?: RPGItem[] };
}

// ---------------------------------------------------------------------------
// Leader blessings (active buffs from legendary leader encounters)
// ---------------------------------------------------------------------------

export interface ActiveBlessing {
  blessingId: string;
  leaderId: string;
  name: string;
  effect: LeaderBlessing["effect"];
  remainingSteps: number; // -1 = permanent
}

// ---------------------------------------------------------------------------
// RPGState
// ---------------------------------------------------------------------------

export interface RPGState {
  phase: RPGPhase;
  party: PartyMember[];
  inventory: InventoryState;
  quests: QuestState[];
  gold: number;
  overworldPosition: Vec2;
  currentDungeonId: string | null;
  currentFloor: number;
  dungeonPosition: Vec2 | null;
  visitedDungeons: Set<string>;
  completedQuests: Set<string>;
  gameTime: number;
  battleMode: "turn" | "auto";
  seed: number;
  /** Steps taken since last town visit — used to reset recruit roster after 20 steps. */
  stepsSinceLastTown: number;
  /** Seed used to generate current recruit roster (changes every 20 steps). */
  recruitSeed: number;
  /** Party formation: maps member id → battle line (1=front, 2=back). Missing = front. */
  formation: Record<string, 1 | 2>;
  /** Leader IDs the player has met. */
  metLeaders: Set<string>;
  /** Active leader blessings (timed party buffs). */
  leaderBlessings: ActiveBlessing[];
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRPGState(seed: number, startPosition: Vec2): RPGState {
  return {
    phase: "overworld" as RPGPhase,
    party: [],
    inventory: { items: [], maxSlots: 20 },
    quests: [],
    gold: 100,
    overworldPosition: { ...startPosition },
    currentDungeonId: null,
    currentFloor: 0,
    dungeonPosition: null,
    visitedDungeons: new Set(),
    completedQuests: new Set(),
    gameTime: 0,
    battleMode: "turn",
    seed,
    stepsSinceLastTown: 0,
    recruitSeed: seed,
    formation: {},
    metLeaders: new Set(),
    leaderBlessings: [],
  };
}
