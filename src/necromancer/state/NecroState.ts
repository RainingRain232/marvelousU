// ---------------------------------------------------------------------------
// Necromancer mode — game state
// ---------------------------------------------------------------------------

import type { CorpseType, CrusaderType, ChimeraDef, RelicRarity } from "../config/NecroConfig";
import { CORPSES, NecroConfig, CHIMERAS } from "../config/NecroConfig";

export type NecroPhase = "start" | "dig" | "ritual" | "battle" | "upgrade" | "results";

export interface Grave {
  id: number;
  x: number;
  y: number;
  /** Corpse type inside (null = empty) */
  corpseType: CorpseType | null;
  /** Whether it's been dug up */
  dug: boolean;
  /** Dig progress 0-1 */
  digProgress: number;
  /** Is currently being dug */
  digging: boolean;
}

export type CorpseQuality = "normal" | "blessed" | "cursed" | "ancient";

export interface Corpse {
  id: number;
  type: CorpseType;
  /** Position in the ritual area */
  slotIndex: number;
  /** Quality modifier */
  quality: CorpseQuality;
}

export interface Undead {
  id: number;
  name: string;
  type: CorpseType;
  /** Chimera info if combined */
  chimera: ChimeraDef | null;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  color: number;
  size: number;
  x: number;
  y: number;
  targetId: number;
  attackCooldown: number;
  ability: string | null;
  abilityCooldown: number;
  alive: boolean;
  ranged: boolean;
  range: number;
}

export interface Crusader {
  id: number;
  type: CrusaderType;
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  color: number;
  size: number;
  x: number;
  y: number;
  targetId: number;
  attackCooldown: number;
  alive: boolean;
  ability: string | null;
  abilityCooldown: number;
  // Boss fields (optional)
  isBoss?: boolean;
  bossType?: string;
  bossPhase?: number;
  bossAbilityCooldowns?: Record<string, number>;
  shieldTimer?: number;
  armorActive?: boolean;
  hasResurrected?: boolean;
}

export interface NecroState {
  phase: NecroPhase;
  wave: number; // 0-indexed
  totalWaves: number;

  // Player
  playerHp: number;
  maxPlayerHp: number;
  mana: number;
  maxMana: number;
  manaRegen: number;
  gold: number;
  score: number;

  // Graveyard
  graves: Grave[];
  graveIdCounter: number;

  // Corpses dug up (inventory for ritual phase)
  corpses: Corpse[];
  corpseIdCounter: number;

  // Ritual
  ritualSlotA: Corpse | null;
  ritualSlotB: Corpse | null;
  raisingProgress: number; // 0-1
  isRaising: boolean;
  raiseTime: number;

  // Army
  undead: Undead[];
  undeadIdCounter: number;

  // Enemies
  crusaders: Crusader[];
  crusaderIdCounter: number;
  crusaderSpawnTimer: number;
  crusaderSpawnQueue: { type: CrusaderType; delay: number }[];

  // Upgrades
  powerLevels: Record<string, number>;

  // FX
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[];
  announcements: { text: string; color: number; timer: number }[];
  log: string[];

  // Battle state
  battleTimer: number;
  battleWon: boolean;
  battleLost: boolean;

  // Dark nova cooldown
  novaCooldown: number;
  novaActive: boolean;

  // Elapsed time for animations
  elapsed: number;

  // Floating damage numbers
  damageNumbers: { x: number; y: number; text: string; color: number; timer: number; maxTimer: number }[];

  // Bone Wall spell
  boneWalls: { x: number; y: number; hp: number; maxHp: number; timer: number }[];
  boneWallCooldown: number;

  // Soul Leech spell
  soulLeechCooldown: number;

  // Battle speed
  battleSpeed: number; // 1 or 2

  // Temporary wave buffs from consumables
  tempDamageBonus: number;
  tempHpBonus: number;

  // Fallen undead (for resurrect scroll)
  fallenUndead: Undead[];

  // Ranged projectiles
  projectiles: { x: number; y: number; vx: number; vy: number; damage: number; life: number; color: number; fromUndead: boolean }[];

  // Endless mode
  endless: boolean;

  // Persistent battle marks (blood, debris)
  battleMarks: { x: number; y: number; type: "blood" | "debris"; size: number; alpha: number }[];

  // Screen flash
  screenFlash: { color: number; alpha: number; timer: number } | null;

  // Kill stats per wave
  waveKills: number;
  totalKills: number;

  // Combo system
  comboCount: number;
  comboTimer: number;
  bestCombo: number;

  // Wave bonus tracking
  waveCasualties: number;
  waveStartTime: number;

  // Random events
  activeEvent: { id: string; name: string; description: string; color: number } | null;

  // Battle log
  battleLog: { text: string; color: number; time: number }[];

  // Rally point
  rallyPoint: { x: number; y: number; timer: number } | null;

  // Relics
  relics: { id: string; name: string; rarity: RelicRarity; color: number; description: string }[];
  pendingRelicChoice: { id: string; name: string; rarity: RelicRarity; color: number; description: string }[] | null;

  // Boss tracking
  bossActive: boolean;
  bossBeamFx: { x1: number; y1: number; x2: number; y2: number; timer: number } | null;
  bossPoundFx: { x: number; y: number; radius: number; timer: number } | null;

  // War Cry buff
  warCryCooldown: number;
  warCryActive: number; // remaining duration, 0 = inactive

  // Grave scouting — hovered grave id
  hoveredGraveId: number;
}

export function createNecroState(): NecroState {
  return {
    phase: "start",
    wave: 0,
    totalWaves: 10,

    playerHp: NecroConfig.PLAYER_HP,
    maxPlayerHp: NecroConfig.PLAYER_HP,
    mana: NecroConfig.START_MANA,
    maxMana: NecroConfig.START_MAX_MANA,
    manaRegen: NecroConfig.BASE_MANA_REGEN,
    gold: 0,
    score: 0,

    graves: generateGraves(NecroConfig.BASE_GRAVE_COUNT),
    graveIdCounter: NecroConfig.BASE_GRAVE_COUNT,

    corpses: [],
    corpseIdCounter: 0,

    ritualSlotA: null,
    ritualSlotB: null,
    raisingProgress: 0,
    isRaising: false,
    raiseTime: NecroConfig.RAISE_TIME,

    undead: [],
    undeadIdCounter: 0,

    crusaders: [],
    crusaderIdCounter: 0,
    crusaderSpawnTimer: 2,
    crusaderSpawnQueue: [],

    powerLevels: {},

    particles: [],
    announcements: [{ text: "The dead await...", color: 0x44cc88, timer: 2 }],
    log: ["Wave 1 — Prepare your army."],

    battleTimer: 0,
    battleWon: false,
    battleLost: false,

    novaCooldown: 0,
    novaActive: false,

    elapsed: 0,

    damageNumbers: [],
    boneWalls: [],
    boneWallCooldown: 0,
    soulLeechCooldown: 0,
    battleSpeed: 1,
    tempDamageBonus: 0,
    tempHpBonus: 0,
    fallenUndead: [],
    projectiles: [],
    endless: false,
    battleMarks: [],
    screenFlash: null,
    waveKills: 0,
    totalKills: 0,
    comboCount: 0,
    comboTimer: 0,
    bestCombo: 0,
    waveCasualties: 0,
    waveStartTime: 0,
    activeEvent: null,
    battleLog: [],
    rallyPoint: null,
    relics: [],
    pendingRelicChoice: null,
    bossActive: false,
    bossBeamFx: null,
    bossPoundFx: null,
    warCryCooldown: 0,
    warCryActive: 0,
    hoveredGraveId: -1,
  };
}

function generateGraves(count: number): Grave[] {
  const graves: Grave[] = [];
  // Arrange in a rough grid in the graveyard area
  const cols = Math.ceil(count / 2);
  const startX = 80;
  const startY = 100;
  const spacingX = 90;
  const spacingY = 100;

  // Assign random corpse types based on weight
  const types: CorpseType[] = ["peasant", "soldier", "knight", "mage", "noble"];
  const weights = types.map(t => CORPSES[t].weight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    let roll = Math.random() * totalWeight;
    let corpseType: CorpseType = "peasant";
    for (let j = 0; j < types.length; j++) {
      roll -= weights[j];
      if (roll <= 0) { corpseType = types[j]; break; }
    }
    graves.push({
      id: i,
      x: startX + col * spacingX + (Math.random() - 0.5) * 20,
      y: startY + row * spacingY + (Math.random() - 0.5) * 20,
      corpseType,
      dug: false,
      digProgress: 0,
      digging: false,
    });
  }
  return graves;
}

export function findChimera(a: CorpseType, b: CorpseType): ChimeraDef | null {
  return CHIMERAS.find(c => (c.a === a && c.b === b) || (c.a === b && c.b === a)) ?? null;
}
