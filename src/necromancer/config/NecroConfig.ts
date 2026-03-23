// ---------------------------------------------------------------------------
// Necromancer mode — configuration & definitions
// ---------------------------------------------------------------------------

/** Types of corpses that can be dug up */
export type CorpseType = "peasant" | "soldier" | "knight" | "mage" | "noble";

export interface CorpseDef {
  id: CorpseType;
  name: string;
  description: string;
  /** Base stats when reanimated */
  hp: number;
  damage: number;
  speed: number; // pixels/sec
  /** How much mana to reanimate */
  manaCost: number;
  /** Color when undead */
  color: number;
  /** Rarity weight (lower = rarer) */
  weight: number;
  /** Size in pixels */
  size: number;
  /** Ranged attacker? */
  ranged: boolean;
  /** Attack range (only for ranged) */
  range: number;
}

export const CORPSES: Record<CorpseType, CorpseDef> = {
  peasant:  { id: "peasant",  name: "Peasant",  description: "Weak but cheap — fodder",     hp: 3,  damage: 1, speed: 40, manaCost: 5,  color: 0x667766, weight: 5, size: 6, ranged: false, range: 0 },
  soldier:  { id: "soldier",  name: "Soldier",  description: "Balanced melee fighter",       hp: 6,  damage: 2, speed: 35, manaCost: 10, color: 0x778888, weight: 3, size: 7, ranged: false, range: 0 },
  knight:   { id: "knight",   name: "Knight",   description: "Heavy tank, slow but tough",   hp: 10, damage: 3, speed: 30, manaCost: 18, color: 0x8899aa, weight: 2, size: 8, ranged: false, range: 0 },
  mage:     { id: "mage",     name: "Dead Mage", description: "Ranged caster — fragile",     hp: 4,  damage: 5, speed: 25, manaCost: 22, color: 0x9966cc, weight: 1, size: 6, ranged: true,  range: 120 },
  noble:    { id: "noble",    name: "Noble",    description: "Weak fighter, great combiner", hp: 5,  damage: 1, speed: 20, manaCost: 8,  color: 0xccaa66, weight: 2, size: 7, ranged: false, range: 0 },
};

/** Chimera bonuses when combining two corpse types */
export interface ChimeraDef {
  a: CorpseType;
  b: CorpseType;
  name: string;
  hpBonus: number;
  damageBonus: number;
  speedBonus: number;
  color: number;
  ability: "cleave" | "drain" | "explode" | "shield" | "frenzy";
}

export const CHIMERAS: ChimeraDef[] = [
  { a: "soldier", b: "knight",  name: "Death Knight",    hpBonus: 5,  damageBonus: 2, speedBonus: 5,  color: 0x556688, ability: "cleave" },
  { a: "mage",    b: "noble",   name: "Lich",            hpBonus: 3,  damageBonus: 4, speedBonus: -5, color: 0x8844cc, ability: "drain" },
  { a: "peasant", b: "soldier", name: "Ghoul",           hpBonus: 2,  damageBonus: 1, speedBonus: 15, color: 0x557755, ability: "frenzy" },
  { a: "knight",  b: "mage",    name: "Revenant",        hpBonus: 4,  damageBonus: 3, speedBonus: 0,  color: 0x6677aa, ability: "shield" },
  { a: "peasant", b: "mage",    name: "Corpse Bomb",     hpBonus: 1,  damageBonus: 8, speedBonus: 10, color: 0xaa5533, ability: "explode" },
  { a: "noble",   b: "soldier", name: "Wight",           hpBonus: 4,  damageBonus: 2, speedBonus: 5,  color: 0xbbaa77, ability: "drain" },
  { a: "noble",   b: "knight",  name: "Dread Lord",      hpBonus: 6,  damageBonus: 3, speedBonus: 0,  color: 0x997744, ability: "shield" },
  { a: "peasant", b: "noble",   name: "Shambling Horror", hpBonus: 8, damageBonus: 0, speedBonus: -10, color: 0x887766, ability: "frenzy" },
];

/** Crusader wave enemy types */
export type CrusaderType = "footman" | "templar" | "paladin" | "priest" | "banner" | "inquisitor";

export interface CrusaderDef {
  id: CrusaderType;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  color: number;
  size: number;
  /** Gold reward for killing */
  reward: number;
  /** Special ability */
  ability?: "heal_aura" | "holy_smite" | "rally" | "shield_wall" | "purge";
}

export const CRUSADERS: Record<CrusaderType, CrusaderDef> = {
  footman:  { id: "footman",  name: "Footman",  hp: 5,  damage: 1, speed: 30, color: 0xcccccc, size: 6, reward: 3 },
  templar:  { id: "templar",  name: "Templar",  hp: 8,  damage: 2, speed: 25, color: 0xddddaa, size: 7, reward: 5, ability: "holy_smite" },
  paladin:  { id: "paladin",  name: "Paladin",  hp: 15, damage: 3, speed: 20, color: 0xffd700, size: 8, reward: 10, ability: "shield_wall" },
  priest:   { id: "priest",   name: "Priest",   hp: 4,  damage: 0, speed: 22, color: 0xffffff, size: 5, reward: 8, ability: "heal_aura" },
  banner:   { id: "banner",   name: "Standard Bearer", hp: 6, damage: 1, speed: 28, color: 0xff4444, size: 6, reward: 6, ability: "rally" },
  inquisitor: { id: "inquisitor", name: "Inquisitor", hp: 12, damage: 4, speed: 18, color: 0xaa3333, size: 8, reward: 12, ability: "purge" },
};

/** Dark power upgrades the necromancer can buy between waves */
export interface DarkPower {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
  effect: "max_mana" | "mana_regen" | "raise_speed" | "army_hp" | "army_damage" | "grave_slots" | "life_drain" | "dark_nova";
}

export const DARK_POWERS: DarkPower[] = [
  { id: "mana_well",    name: "Mana Well",     description: "+20 max mana",           cost: 30,  maxLevel: 5, effect: "max_mana" },
  { id: "soul_siphon",  name: "Soul Siphon",   description: "+1 mana/sec regen",      cost: 25,  maxLevel: 4, effect: "mana_regen" },
  { id: "swift_ritual",  name: "Swift Ritual",  description: "Faster reanimation",     cost: 35,  maxLevel: 3, effect: "raise_speed" },
  { id: "bone_armor",   name: "Bone Armor",     description: "+2 HP to all undead",    cost: 40,  maxLevel: 3, effect: "army_hp" },
  { id: "death_grip",   name: "Death Grip",     description: "+1 damage to all undead", cost: 45, maxLevel: 3, effect: "army_damage" },
  { id: "grave_expand", name: "Unhallowed Ground", description: "+2 grave slots",      cost: 50,  maxLevel: 2, effect: "grave_slots" },
  { id: "life_drain",   name: "Life Drain",     description: "Undead heal on kill",     cost: 60,  maxLevel: 2, effect: "life_drain" },
  { id: "dark_nova",    name: "Dark Nova",      description: "AoE blast spell (click)", cost: 80, maxLevel: 1, effect: "dark_nova" },
];

/** Wave definitions — what crusaders spawn per wave */
export interface WaveEntry { type: CrusaderType; count: number }

export const WAVES: WaveEntry[][] = [
  // Wave 1 — easy
  [{ type: "footman", count: 4 }],
  // Wave 2
  [{ type: "footman", count: 5 }, { type: "templar", count: 1 }],
  // Wave 3
  [{ type: "footman", count: 4 }, { type: "templar", count: 2 }, { type: "priest", count: 1 }],
  // Wave 4
  [{ type: "footman", count: 3 }, { type: "templar", count: 3 }, { type: "banner", count: 1 }],
  // Wave 5 — boss wave
  [{ type: "templar", count: 3 }, { type: "paladin", count: 1 }, { type: "priest", count: 1 }, { type: "banner", count: 1 }],
  // Wave 6
  [{ type: "footman", count: 5 }, { type: "templar", count: 3 }, { type: "paladin", count: 1 }, { type: "priest", count: 1 }],
  // Wave 7 — inquisitor arrives
  [{ type: "templar", count: 3 }, { type: "paladin", count: 1 }, { type: "inquisitor", count: 1 }, { type: "priest", count: 2 }, { type: "banner", count: 1 }],
  // Wave 8
  [{ type: "templar", count: 4 }, { type: "paladin", count: 2 }, { type: "priest", count: 2 }, { type: "banner", count: 1 }, { type: "inquisitor", count: 1 }],
  // Wave 9
  [{ type: "paladin", count: 3 }, { type: "inquisitor", count: 2 }, { type: "priest", count: 2 }, { type: "banner", count: 2 }, { type: "templar", count: 3 }],
  // Wave 10 — final crusade
  [{ type: "paladin", count: 4 }, { type: "inquisitor", count: 3 }, { type: "priest", count: 3 }, { type: "banner", count: 2 }, { type: "templar", count: 5 }],
];

/** Generate an endless wave beyond the scripted ones */
export function generateEndlessWave(waveNum: number): WaveEntry[] {
  const scale = waveNum - WAVES.length + 1;
  return [
    { type: "footman", count: 3 + scale },
    { type: "templar", count: 2 + scale },
    { type: "paladin", count: 1 + Math.floor(scale / 2) },
    { type: "priest", count: 1 + Math.floor(scale / 3) },
    { type: "inquisitor", count: Math.floor(scale / 2) },
    { type: "banner", count: 1 + Math.floor(scale / 3) },
  ].filter(e => e.count > 0);
}

export const NecroConfig = {
  FIELD_WIDTH: 700,
  FIELD_HEIGHT: 500,
  /** Number of graves in the graveyard */
  BASE_GRAVE_COUNT: 6,
  /** Max undead army size */
  MAX_ARMY: 12,
  /** Starting mana */
  START_MANA: 30,
  /** Starting max mana */
  START_MAX_MANA: 50,
  /** Base mana regen per second */
  BASE_MANA_REGEN: 1.5,
  /** HP cost to raise a corpse (life force drain) */
  RAISE_HP_COST: 1,
  /** Dig time in seconds */
  DIG_TIME: 1.5,
  /** Raise time in seconds */
  RAISE_TIME: 2.0,
  /** Starting player HP */
  PLAYER_HP: 15,
  /** Crusader spawn interval during battle */
  CRUSADER_SPAWN_INTERVAL: 3,
  /** Battle duration before timeout (seconds) */
  BATTLE_TIMEOUT: 120,
  /** Mana restored per enemy killed (soul harvest) */
  SOUL_HARVEST_MANA: 3,
  /** HP restored per 5 kills (soul harvest) */
  SOUL_HARVEST_HP_INTERVAL: 5,
} as const;
