// Top-level RPG persistent state
import type { AbilityType, RPGPhase, UnitType, UpgradeType, Vec2 } from "@/types";
import type { LeaderBlessing } from "@rpg/config/LeaderEncounterDefs";
import type { CraftingDiscoveryState } from "@rpg/systems/CraftingDiscoverySystem";
import { createCraftingDiscoveryState } from "@rpg/systems/CraftingDiscoverySystem";

// ---------------------------------------------------------------------------
// Party & Equipment
// ---------------------------------------------------------------------------

export interface RPGItem {
  id: string;
  name: string;
  type: "weapon" | "armor" | "accessory" | "helmet" | "shield" | "legs" | "boots" | "ring" | "consumable" | "key" | "trade";
  stats: Partial<{ atk: number; def: number; hp: number; mp: number; speed: number; block: number; critChance: number }>;
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
  type: "poison" | "regen" | "slow" | "haste" | "shield" | "stun" | "wet";
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
  /** Spells learned through the spell learning system (UpgradeType keys). Unlimited capacity. */
  knownSpells: UpgradeType[];
  /** Spells currently equipped for use in battle (limited by class). */
  equippedSpells: UpgradeType[];
  equipment: EquipmentSlots;
  statusEffects: StatusEffect[];
  /** Mastery points earned after max level */
  masteryPoints: number;
  /** Mastery bonuses purchased: id → count */
  masteryBonuses: Record<string, number>;
  /** Permanent bonus crit chance from personal quests etc. */
  bonusCritChance: number;
  /** Permanent bonus healing multiplier from personal quests etc. */
  bonusHealingMult: number;
  /** Battles fought (for equipment durability) */
  battlesFought: number;
  /** Class specialization ID (set at level 10). */
  specializationId?: string;
  /** Human-readable specialization name. */
  specializationName?: string;
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
  type: "kill" | "collect" | "explore" | "talk" | "heal_total";
  targetId: string;
  current: number;
  required: number;
}

export interface QuestChoice {
  label: string;
  reward: { gold: number; xp: number; items?: RPGItem[]; recruitUnitType?: UnitType };
}

export interface QuestState {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  isComplete: boolean;
  reward: { gold: number; xp: number; items?: RPGItem[] };
  /** Optional branching choices */
  choices?: QuestChoice[];
  /** Personal quest: tied to specific party member ID */
  personalMemberId?: string;
}

// ---------------------------------------------------------------------------
// Bestiary
// ---------------------------------------------------------------------------

export interface BestiaryEntry {
  encounterId: string;
  name: string;
  timesDefeated: number;
  firstSeen: number; // gameTime when first encountered
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

  // --- Narrative ---
  /** Main quest progress: 0=not started, 1-5=shards collected, 5=completed */
  mainQuestStep: number;
  /** Collected lore entry IDs */
  collectedLore: Set<string>;
  /** Town reputation: townEntityId → reputation score */
  townReputation: Record<string, number>;
  /** Karma: positive=good, negative=evil. Affects NPC interactions */
  karma: number;

  // --- World ---
  /** Time of day: 0-239 wrapping. 0-59=morning, 60-119=day, 120-179=evening, 180-239=night */
  timeOfDay: number;
  /** Current weather condition */
  weather: "clear" | "rain" | "snow" | "fog";
  /** Steps until weather changes */
  weatherTimer: number;
  /** Discovered town entity IDs for fast travel */
  discoveredTowns: Set<string>;

  // --- Party Identity ---
  /** Affinity between party members: memberId → memberId → score */
  affinity: Record<string, Record<string, number>>;
  /** Unique recruits already hired (by recruit ID) */
  hiredUniqueRecruits: Set<string>;

  // --- QoL ---
  /** Bestiary entries: encounterId → entry */
  bestiary: Record<string, BestiaryEntry>;
  /** Unlocked achievement IDs */
  achievements: Set<string>;
  /** Difficulty setting */
  difficulty: "easy" | "normal" | "hard";
  /** Tutorial flags: key → shown */
  tutorialFlags: Record<string, boolean>;
  /** Battle animation speed multiplier */
  battleSpeed: 1 | 2 | 4;
  /** Random (tile) encounter rate multiplier: 0=none, 100=normal, 200=double */
  randomEncounterRate: number;
  /** Roaming enemy encounter rate multiplier: 0=none, 100=normal, 200=double */
  roamingEncounterRate: number;

  // --- Crafting Discovery ---
  /** Crafting experimentation / recipe discovery state. */
  craftingDiscovery: CraftingDiscoveryState;

  // --- Endgame ---
  /** New Game+ count (0 = first playthrough) */
  ngPlusCount: number;
  /** Deepest Abyss floor reached */
  abyssRecord: number;

  // --- Economy ---
  /** Total purchases at each town for reputation tracking */
  townPurchases: Record<string, number>;
  /** Arena fights remaining this town visit */
  arenaFightsLeft: number;
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
    // Narrative
    mainQuestStep: 0,
    collectedLore: new Set(),
    townReputation: {},
    karma: 0,
    // World
    timeOfDay: 60, // start at daytime
    weather: "clear",
    weatherTimer: 40,
    discoveredTowns: new Set(),
    // Party Identity
    affinity: {},
    hiredUniqueRecruits: new Set(),
    // QoL
    bestiary: {},
    achievements: new Set(),
    difficulty: "normal",
    tutorialFlags: {},
    battleSpeed: 1,
    randomEncounterRate: 100,
    roamingEncounterRate: 100,
    // Crafting Discovery
    craftingDiscovery: createCraftingDiscoveryState(),
    // Endgame
    ngPlusCount: 0,
    abyssRecord: 0,
    // Economy
    townPurchases: {},
    arenaFightsLeft: 3,
  };
}
