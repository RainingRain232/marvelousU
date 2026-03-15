// ============================================================================
// ArthurianRPGState.ts – Shared state types used across all RPG systems
// ============================================================================

import {
  ElementalType,
  EnemyBehavior,
  ItemQualityTier,
  RPG_CONFIG,
} from "./ArthurianRPGConfig";

// ---------------------------------------------------------------------------
// Position / vector
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Attributes & skills
// ---------------------------------------------------------------------------

export interface Attributes {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  perception: number;
}

export interface SkillEntry {
  level: number;
  xp: number;
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  damageMultiplier?: number;
  defenseMultiplier?: number;
}

// ---------------------------------------------------------------------------
// Derived stats (computed from attributes + equipment)
// ---------------------------------------------------------------------------

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  maxStamina: number;
  physicalDamage: number;
  magicDamage: number;
  armor: number;
  blockEfficiency: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  moveSpeed: number;
  carryWeight: number;
}

// ---------------------------------------------------------------------------
// Equipment pieces
// ---------------------------------------------------------------------------

export interface WeaponSlot {
  id: string;
  name: string;
  baseDamage: number;
  attackSpeed: number;
  element?: ElementalType;
  attributeScaling?: number;
  onHitEffect?: ActiveEffect;
}

export interface ArmorSlot {
  id: string;
  name: string;
  armorValue: number;
  blockEfficiency?: number;
}

export interface EquippedGear {
  mainHand: WeaponSlot | null;
  offHand: (ArmorSlot & { armorValue: number; blockEfficiency?: number }) | null;
  head: ArmorSlot | null;
  chest: ArmorSlot | null;
  legs: ArmorSlot | null;
  feet: ArmorSlot | null;
  ring1: ArmorSlot | null;
  ring2: ArmorSlot | null;
  amulet: ArmorSlot | null;
  cloak: ArmorSlot | null;
}

// ---------------------------------------------------------------------------
// Active effects (buffs / debuffs / DoTs)
// ---------------------------------------------------------------------------

export interface ActiveEffect {
  id: string;
  name: string;
  duration: number;
  elapsed: number;
  tickInterval: number;
  damagePerTick?: number;
  healPerTick?: number;
  statModifiers?: Partial<Attributes>;
  element?: ElementalType;
  stacks?: number;
}

// ---------------------------------------------------------------------------
// Inventory & items
// ---------------------------------------------------------------------------

export interface InventoryItem {
  defId: string;
  quantity: number;
  quality: ItemQualityTier;
  enchantments: string[];
  weight: number;
  name: string;
  isQuestItem: boolean;
}

export interface Inventory {
  items: InventoryItem[];
  maxWeight: number;
}

export interface DroppedItem {
  id: string;
  defId: string;
  quantity: number;
  quality: ItemQualityTier;
  pos: Vec3;
  despawnTime: number;
}

// ---------------------------------------------------------------------------
// Combatant state
// ---------------------------------------------------------------------------

export interface CombatantState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  position: Vec3;
  isBlocking: boolean;
  attributes: Attributes;
  skills: Record<string, number>;
  perks: Perk[];
  equipment: EquippedGear;
  primaryElement?: ElementalType;
  level: number;
  xp: number;
  xpToNext: number;
  activeEffects: ActiveEffect[];
}

// ---------------------------------------------------------------------------
// Combat actions
// ---------------------------------------------------------------------------

export interface CombatAction {
  type: string; // matches CombatActionType values
  direction?: { x: number; z: number };
  spellId?: string;
  target?: CombatantState;
  specialId?: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Hit result
// ---------------------------------------------------------------------------

export interface HitResult {
  damage: number;
  blocked: boolean;
  dodged: boolean;
  critical: boolean;
  staggered: boolean;
  killed: boolean;
}

// ---------------------------------------------------------------------------
// Damage instance (internal to combat calc)
// ---------------------------------------------------------------------------

export interface DamageInstance {
  amount: number;
  element: ElementalType;
  isCritical: boolean;
  isBlocked: boolean;
  staggerDamage: number;
}

// ---------------------------------------------------------------------------
// Combo state
// ---------------------------------------------------------------------------

export interface ComboState {
  chain: number;
  lastHitTime: number;
}

// ---------------------------------------------------------------------------
// Combat state (expanded)
// ---------------------------------------------------------------------------

export interface CombatState {
  inCombat: boolean;
  targetId: string | null;
  cooldowns: Record<string, number>;
  comboCount: number;
  comboTimer: number;
  dodgeCooldown: number;
  blockActive: boolean;
  castingSpell: string | null;
  castProgress: number;
  staggerBuildup: number;
  isStaggered: boolean;
  lastDodgeTime: number;
  lastAttackTime: number;
}

// ---------------------------------------------------------------------------
// Enemy AI profile (used by combat AI)
// ---------------------------------------------------------------------------

export interface EnemyAIProfile {
  attackRange: number;
  heavyAttackChance: number;
  blockChance?: number;
  fleeThreshold?: number;
  decisionInterval?: number;
  attackDelay?: number;
}

// ---------------------------------------------------------------------------
// Boss phase (used by boss combat AI)
// ---------------------------------------------------------------------------

export interface BossPhase {
  name: string;
  hpThreshold: number;
  specialAttacks: {
    id: string;
    damage: number;
    element: ElementalType;
    cooldown: number;
    areaRadius: number;
  }[];
  canSummon: boolean;
  summonType?: string;
  summonCount?: number;
  summonCooldown?: number;
  attackRange?: number;
}

// ---------------------------------------------------------------------------
// Enemy instance (world)
// ---------------------------------------------------------------------------

export interface EnemyInstance {
  id: string;
  defId: string;
  pos: Vec3;
  rotation: number;
  hp: number;
  maxHp: number;
  state: EnemyBehavior;
  aiState: EnemyAIProfile;
  target: string | null;
  alertLevel: number;
  patrolPath: Vec3[];
  patrolIndex: number;
  lootTable: string;
  level: number;
  respawnTime: number;
  combatant: CombatantState;
}

// ---------------------------------------------------------------------------
// NPC instance (world)
// ---------------------------------------------------------------------------

export interface NPCInstance {
  id: string;
  defId: string;
  name: string;
  pos: Vec3;
  rotation: number;
  dialogueState: string;
  shopInventory: InventoryItem[];
  questIds: string[];
  schedule: NPCScheduleEntry[];
  faction: string;
  disposition: number;
  isEssential: boolean;
}

export interface NPCScheduleEntry {
  hour: number;
  location: Vec3;
  activity: "idle" | "walk" | "work" | "sleep" | "eat" | "patrol";
}

// ---------------------------------------------------------------------------
// Interactable objects (world)
// ---------------------------------------------------------------------------

export interface InteractableObject {
  id: string;
  type: "chest" | "door" | "shrine" | "lever" | "forge" | "alchemy_table" | "campfire";
  pos: Vec3;
  state: "closed" | "open" | "locked" | "activated" | "depleted";
  contents: InventoryItem[];
  requiredKeyId?: string;
  linkedObjectId?: string;
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export interface QuestObjective {
  id: string;
  description: string;
  type: "kill" | "collect" | "talk" | "explore" | "escort" | "craft";
  targetId: string;
  requiredCount: number;
  currentCount: number;
  completed: boolean;
  optional: boolean;
}

export interface QuestState {
  questId: string;
  stage: number;
  objectives: QuestObjective[];
  isActive: boolean;
  startedAt: number;
  lastUpdated: number;
}

// ---------------------------------------------------------------------------
// Companion state
// ---------------------------------------------------------------------------

export type CompanionCombatRole = "attacker" | "healer" | "defender";

export interface CompanionState {
  npcId: string;
  name: string;
  className: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  equipment: EquippedGear;
  combatRole: CompanionCombatRole;
  attributes: Attributes;
  morale: number;
  isAlive: boolean;
  combatant: CombatantState;
}

// ---------------------------------------------------------------------------
// Player wrapper (expanded)
// ---------------------------------------------------------------------------

export interface PlayerState {
  combatant: CombatantState;
  target: CombatantState | null;

  // Skills with XP tracking
  skillEntries: Record<string, SkillEntry>;
  perksUnlocked: string[];
  attributePointsAvailable: number;
  perkPointsAvailable: number;

  // Inventory & economy
  inventory: Inventory;
  gold: number;

  // Reputation per faction
  reputation: Record<string, number>;

  // Companions (up to 2 active)
  companions: CompanionState[];

  // Exploration
  discoveredLocations: string[];
  unlockedFastTravel: string[];
  currentRegion: string;

  // Camera
  cameraMode: "first_person" | "third_person";

  // Quests
  activeQuests: QuestState[];
  completedQuests: string[];

  // Crafting
  craftingRecipesKnown: string[];

  // Combat state (expanded)
  combat: CombatState;
}

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

export interface WorldState {
  timeOfDay: number; // 0-24
  dayCount: number;
  weather: "clear" | "rain" | "storm" | "fog" | "snow" | "overcast";
  currentRegion: string;
  enemies: EnemyInstance[];
  npcs: NPCInstance[];
  interactables: InteractableObject[];
  droppedItems: DroppedItem[];
  activeTriggers: string[];
  ambientDanger: number; // 0-1, affects spawn rates
}

// ---------------------------------------------------------------------------
// World state (master state object)
// ---------------------------------------------------------------------------

export interface ArthurianRPGState {
  player: PlayerState;
  enemies: CombatantState[];
  companions: CombatantState[];
  world: WorldState;
  worldTime: number; // hours (0-24)
  deltaTime: number;
  isPaused: boolean;
  difficulty: "easy" | "normal" | "hard" | "legendary";

  getCombatantById(id: string): CombatantState | null;
  getAliveEnemies(): CombatantState[];
}

// ---------------------------------------------------------------------------
// Default equipment factory
// ---------------------------------------------------------------------------

function createEmptyGear(): EquippedGear {
  return {
    mainHand: null,
    offHand: null,
    head: null,
    chest: null,
    legs: null,
    feet: null,
    ring1: null,
    ring2: null,
    amulet: null,
    cloak: null,
  };
}

// ---------------------------------------------------------------------------
// Default combat state
// ---------------------------------------------------------------------------

function createDefaultCombatState(): CombatState {
  return {
    inCombat: false,
    targetId: null,
    cooldowns: {},
    comboCount: 0,
    comboTimer: 0,
    dodgeCooldown: 0,
    blockActive: false,
    castingSpell: null,
    castProgress: 0,
    staggerBuildup: 0,
    isStaggered: false,
    lastDodgeTime: 0,
    lastAttackTime: 0,
  };
}

// ---------------------------------------------------------------------------
// Default world state
// ---------------------------------------------------------------------------

function createDefaultWorldState(): WorldState {
  return {
    timeOfDay: 8,
    dayCount: 1,
    weather: "clear",
    currentRegion: "camelot",
    enemies: [],
    npcs: [],
    interactables: [],
    droppedItems: [],
    activeTriggers: [],
    ambientDanger: 0,
  };
}

// ---------------------------------------------------------------------------
// Default factory
// ---------------------------------------------------------------------------

export function createDefaultState(
  className: string = "knight",
  playerName: string = "Knight of Camelot"
): ArthurianRPGState {
  const classAttributes: Record<string, Partial<Attributes>> = {
    knight: { strength: 14, constitution: 13, dexterity: 10 },
    ranger: { dexterity: 14, perception: 13, wisdom: 10 },
    mage: { intelligence: 14, wisdom: 13, charisma: 10 },
    paladin: { strength: 12, constitution: 12, wisdom: 12, charisma: 11 },
    rogue: { dexterity: 14, perception: 12, charisma: 11 },
  };

  const baseAttrs: Attributes = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    perception: 10,
  };

  const overrides = classAttributes[className] ?? classAttributes.knight;
  const attrs: Attributes = { ...baseAttrs, ...overrides };

  const player: CombatantState = {
    id: "player",
    name: playerName,
    hp: 80 + attrs.constitution * 2,
    maxHp: 80 + attrs.constitution * 2,
    mp: 30 + attrs.intelligence * 2,
    maxMp: 30 + attrs.intelligence * 2,
    stamina: 80 + attrs.dexterity,
    maxStamina: 80 + attrs.dexterity,
    position: { x: 0, y: 0, z: 0 },
    isBlocking: false,
    attributes: attrs,
    skills: {
      oneHanded: 15,
      twoHanded: 10,
      destruction: 5,
      restoration: 5,
      block: 10,
      heavyArmor: 10,
      lightArmor: 5,
      stealth: 5,
      alchemy: 5,
      smithing: 5,
      enchanting: 5,
      speech: 5,
      lockpicking: 5,
    },
    perks: [],
    equipment: createEmptyGear(),
    level: 1,
    xp: 0,
    xpToNext: RPG_CONFIG.xpPerLevelBase,
    activeEffects: [],
  };

  const skillEntries: Record<string, SkillEntry> = {};
  for (const [k, v] of Object.entries(player.skills)) {
    skillEntries[k] = { level: v, xp: 0 };
  }

  const state: ArthurianRPGState = {
    player: {
      combatant: player,
      target: null,
      skillEntries,
      perksUnlocked: [],
      attributePointsAvailable: 0,
      perkPointsAvailable: 0,
      inventory: { items: [], maxWeight: 100 + attrs.strength * 5 },
      gold: 50,
      reputation: { camelot: 0, saxons: -20, druids: 0, fae: 0 },
      companions: [],
      discoveredLocations: ["camelot_castle"],
      unlockedFastTravel: ["camelot_castle"],
      currentRegion: "camelot",
      cameraMode: "third_person",
      activeQuests: [],
      completedQuests: [],
      craftingRecipesKnown: [],
      combat: createDefaultCombatState(),
    },
    enemies: [],
    companions: [],
    world: createDefaultWorldState(),
    worldTime: 8,
    deltaTime: 0,
    isPaused: false,
    difficulty: "normal",

    getCombatantById(id: string): CombatantState | null {
      if (id === "player") return state.player.combatant;
      const e = state.enemies.find((en) => en.id === id);
      if (e) return e;
      return state.companions.find((c) => c.id === id) ?? null;
    },

    getAliveEnemies(): CombatantState[] {
      return state.enemies.filter((e) => e.hp > 0);
    },
  };

  return state;
}

// ---------------------------------------------------------------------------
// calculateDerivedStats – compute HP/MP/damage/armor from attributes+equipment
// ---------------------------------------------------------------------------

export function calculateDerivedStats(state: PlayerState): DerivedStats {
  const a = state.combatant.attributes;
  const eq = state.combatant.equipment;

  let armor = 0;
  let blockEff = 0;
  const armorSlots: (ArmorSlot | null)[] = [eq.head, eq.chest, eq.legs, eq.feet, eq.ring1, eq.ring2, eq.amulet, eq.cloak];
  for (const slot of armorSlots) {
    if (slot) {
      armor += slot.armorValue;
      if (slot.blockEfficiency) blockEff += slot.blockEfficiency;
    }
  }
  if (eq.offHand) {
    armor += eq.offHand.armorValue;
    blockEff += eq.offHand.blockEfficiency ?? 0;
  }

  const weaponDmg = eq.mainHand ? eq.mainHand.baseDamage : 5;
  const scaling = eq.mainHand?.attributeScaling ?? 1.0;

  return {
    maxHp: 80 + a.constitution * 2 + state.combatant.level * 5,
    maxMp: 30 + a.intelligence * 2 + a.wisdom + state.combatant.level * 2,
    maxStamina: 80 + a.dexterity + a.constitution * 0.5 + state.combatant.level * 2,
    physicalDamage: weaponDmg + a.strength * scaling * 0.5,
    magicDamage: a.intelligence * 1.5 + a.wisdom * 0.5,
    armor,
    blockEfficiency: Math.min(blockEff, 0.85),
    critChance: Math.min(0.05 + a.dexterity * 0.005 + a.perception * 0.003, 0.40),
    critMultiplier: 1.5 + a.dexterity * 0.01,
    dodgeChance: Math.min(a.dexterity * 0.005 + a.perception * 0.003, 0.30),
    moveSpeed: 5.0 + a.dexterity * 0.1,
    carryWeight: 100 + a.strength * 5,
  };
}

// ---------------------------------------------------------------------------
// XP & leveling
// ---------------------------------------------------------------------------

export function xpForLevel(level: number): number {
  return Math.floor(
    RPG_CONFIG.xpPerLevelBase * Math.pow(RPG_CONFIG.xpLevelMultiplier, level - 1)
  );
}

export function addXP(state: PlayerState, amount: number): void {
  state.combatant.xp += amount;
  while (state.combatant.xp >= state.combatant.xpToNext) {
    checkLevelUp(state);
  }
}

export function checkLevelUp(state: PlayerState): boolean {
  if (state.combatant.level >= RPG_CONFIG.maxLevel) return false;
  if (state.combatant.xp < state.combatant.xpToNext) return false;

  state.combatant.xp -= state.combatant.xpToNext;
  state.combatant.level += 1;
  state.combatant.xpToNext = xpForLevel(state.combatant.level + 1);
  state.attributePointsAvailable += RPG_CONFIG.attributePointsPerLevel;
  state.perkPointsAvailable += RPG_CONFIG.perkPointsPerLevel;

  // Recalculate max stats
  const derived = calculateDerivedStats(state);
  state.combatant.maxHp = derived.maxHp;
  state.combatant.maxMp = derived.maxMp;
  state.combatant.maxStamina = derived.maxStamina;

  // Fully heal on level-up
  state.combatant.hp = state.combatant.maxHp;
  state.combatant.mp = state.combatant.maxMp;
  state.combatant.stamina = state.combatant.maxStamina;

  return true;
}

// ---------------------------------------------------------------------------
// Inventory management
// ---------------------------------------------------------------------------

function currentCarryWeight(state: PlayerState): number {
  return state.inventory.items.reduce((sum, it) => sum + it.weight * it.quantity, 0);
}

export function addItem(
  state: PlayerState,
  defId: string,
  qty: number,
  name: string = defId,
  weight: number = 1,
  quality: ItemQualityTier = ItemQualityTier.Common
): boolean {
  if (currentCarryWeight(state) + weight * qty > state.inventory.maxWeight) {
    return false; // overweight
  }
  const existing = state.inventory.items.find(
    (it) => it.defId === defId && it.quality === quality
  );
  if (existing) {
    existing.quantity += qty;
  } else {
    state.inventory.items.push({
      defId,
      quantity: qty,
      quality,
      enchantments: [],
      weight,
      name,
      isQuestItem: false,
    });
  }
  return true;
}

export function removeItem(state: PlayerState, defId: string, qty: number = 1): boolean {
  const idx = state.inventory.items.findIndex((it) => it.defId === defId);
  if (idx === -1) return false;
  const item = state.inventory.items[idx];
  if (item.quantity < qty) return false;
  item.quantity -= qty;
  if (item.quantity <= 0) {
    state.inventory.items.splice(idx, 1);
  }
  return true;
}

export function equipItem(state: PlayerState, defId: string, slot: keyof EquippedGear): boolean {
  const itemIdx = state.inventory.items.findIndex((it) => it.defId === defId);
  if (itemIdx === -1) return false;

  // Unequip whatever is in that slot first
  const currentSlot = state.combatant.equipment[slot];
  if (currentSlot) {
    addItem(state, currentSlot.id, 1, currentSlot.name);
  }

  // Remove from inventory (consume 1)
  const item = state.inventory.items[itemIdx];
  item.quantity -= 1;
  if (item.quantity <= 0) state.inventory.items.splice(itemIdx, 1);

  // Place into slot (simplified: create gear from defId)
  if (slot === "mainHand") {
    (state.combatant.equipment as any)[slot] = {
      id: defId,
      name: defId,
      baseDamage: 10,
      attackSpeed: 1.0,
    } as WeaponSlot;
  } else {
    (state.combatant.equipment as any)[slot] = {
      id: defId,
      name: defId,
      armorValue: 5,
    } as ArmorSlot;
  }
  return true;
}

export function unequipItem(state: PlayerState, slot: keyof EquippedGear): boolean {
  const current = state.combatant.equipment[slot];
  if (!current) return false;
  const added = addItem(state, current.id, 1, current.name);
  if (!added) return false; // inventory full
  (state.combatant.equipment as any)[slot] = null;
  return true;
}

// ---------------------------------------------------------------------------
// Quest management
// ---------------------------------------------------------------------------

export function advanceQuest(state: PlayerState, questId: string): boolean {
  const quest = state.activeQuests.find((q) => q.questId === questId);
  if (!quest || !quest.isActive) return false;

  const allRequired = quest.objectives.filter((o) => !o.optional);
  const allDone = allRequired.every((o) => o.completed);
  if (allDone) {
    quest.stage += 1;
    quest.lastUpdated = Date.now();
    return true;
  }
  return false;
}

export function completeQuest(state: PlayerState, questId: string): boolean {
  const idx = state.activeQuests.findIndex((q) => q.questId === questId);
  if (idx === -1) return false;

  const quest = state.activeQuests[idx];
  const allRequired = quest.objectives.filter((o) => !o.optional);
  if (!allRequired.every((o) => o.completed)) return false;

  state.activeQuests.splice(idx, 1);
  state.completedQuests.push(questId);
  return true;
}

// ---------------------------------------------------------------------------
// Save / Load (localStorage serialization)
// ---------------------------------------------------------------------------

const SAVE_KEY = "arthurian_rpg_save";

export function saveGame(state: ArthurianRPGState): boolean {
  try {
    // Strip methods before serializing
    const serializable = {
      player: state.player,
      enemies: state.enemies,
      companions: state.companions,
      world: state.world,
      worldTime: state.worldTime,
      deltaTime: state.deltaTime,
      isPaused: state.isPaused,
      difficulty: state.difficulty,
    };
    const json = JSON.stringify(serializable);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SAVE_KEY, json);
    }
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): ArthurianRPGState | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;

    const data = JSON.parse(json);
    // Rebuild with methods
    const state = createDefaultState();
    Object.assign(state.player, data.player);
    state.enemies = data.enemies ?? [];
    state.companions = data.companions ?? [];
    state.world = data.world ?? state.world;
    state.worldTime = data.worldTime ?? 8;
    state.deltaTime = data.deltaTime ?? 0;
    state.isPaused = data.isPaused ?? false;
    state.difficulty = data.difficulty ?? "normal";
    return state;
  } catch {
    return null;
  }
}
