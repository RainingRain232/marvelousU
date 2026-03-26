// ---------------------------------------------------------------------------
// Age of Wonders — Configuration: Factions, Units, Spells, Terrain, Balance
// ---------------------------------------------------------------------------

import {
  AoWFaction, AoWTerrain, AoWUnitTier, AoWSpellDomain,
  type AoWUnitDef, type AoWSpellDef,
} from "../AoWTypes";

// ---------------------------------------------------------------------------
// Balance constants
// ---------------------------------------------------------------------------

export const AOW_BALANCE = {
  START_GOLD: 200,
  START_MANA: 50,
  BASE_GOLD_PER_TURN: 10,
  BASE_MANA_PER_TURN: 5,
  CITY_GOLD_PER_POP: 8,
  CITY_MANA_PER_POP: 3,
  HERO_RECRUIT_COST: 120,
  HERO_RECRUIT_COOLDOWN: 5, // turns
  MAX_ARMY_SIZE: 6,
  XP_PER_KILL: 30,
  XP_PER_LEVEL: 100,
  LEVEL_HP_BONUS: 5,
  LEVEL_ATK_BONUS: 1,
  LEVEL_DEF_BONUS: 1,
  WALL_DEFENSE_BONUS: 3,
  WALL_BUILD_COST: 80,
  RESEARCH_PER_TURN: 10,
  MAP_RADIUS_SMALL: 6,
  MAP_RADIUS_MEDIUM: 9,
  MAP_RADIUS_LARGE: 12,
  NEUTRAL_CITY_GARRISON: 3,
  GRAIL_SEARCH_CHANCE: 0.15, // per turn on ruins hex
};

// ---------------------------------------------------------------------------
// Faction definitions
// ---------------------------------------------------------------------------

export interface AoWFactionDef {
  id: AoWFaction;
  name: string;
  title: string;
  color: number;
  colorHex: string;
  description: string;
  bonuses: string[];
  startSpell: string;
}

export const AOW_FACTIONS: AoWFactionDef[] = [
  {
    id: AoWFaction.CAMELOT,
    name: "Knights of Camelot",
    title: "The Holy Order",
    color: 0xdaa520,
    colorHex: "#daa520",
    description: "Noble knights and paladins who fight with honor and divine magic.",
    bonuses: ["+2 defense for all units", "+20% healing from Life spells"],
    startSpell: "heal",
  },
  {
    id: AoWFaction.UNDEAD,
    name: "The Risen Court",
    title: "Lords of the Dead",
    color: 0x6b8e6b,
    colorHex: "#6b8e6b",
    description: "Necromancers and their undead legions, fueled by death magic.",
    bonuses: ["+2 attack for all units", "Units cause fear (−1 enemy morale)"],
    startSpell: "drain_life",
  },
  {
    id: AoWFaction.FEY,
    name: "The Fey Court",
    title: "Children of the Forest",
    color: 0x44cc88,
    colorHex: "#44cc88",
    description: "Elven archers and mystical creatures of the ancient woods.",
    bonuses: ["+1 movement for all units", "+2 range for archers"],
    startSpell: "entangle",
  },
  {
    id: AoWFaction.DWARVES,
    name: "Ironhold Clan",
    title: "Masters of Stone",
    color: 0xcc8844,
    colorHex: "#cc8844",
    description: "Sturdy dwarven warriors and engineers with unmatched fortifications.",
    bonuses: ["+3 defense in hills/mountains", "Cities start with walls"],
    startSpell: "stone_skin",
  },
];

// ---------------------------------------------------------------------------
// Unit definitions per faction
// ---------------------------------------------------------------------------

export const AOW_UNITS: AoWUnitDef[] = [
  // === CAMELOT ===
  { id: "cam_militia", name: "Militia", faction: AoWFaction.CAMELOT, tier: AoWUnitTier.TIER1,
    hp: 30, attack: 6, defense: 4, damage: [3, 5], speed: 3, range: 0,
    abilities: [], cost: 25, description: "Basic foot soldiers of Camelot" },
  { id: "cam_archer", name: "Longbowman", faction: AoWFaction.CAMELOT, tier: AoWUnitTier.TIER1,
    hp: 20, attack: 7, defense: 2, damage: [3, 6], speed: 3, range: 3,
    abilities: ["ranged"], cost: 35, description: "Skilled archers with long range" },
  { id: "cam_knight", name: "Knight", faction: AoWFaction.CAMELOT, tier: AoWUnitTier.TIER2,
    hp: 50, attack: 9, defense: 8, damage: [6, 10], speed: 4, range: 0,
    abilities: ["charge", "armored"], cost: 65, description: "Heavily armored cavalry" },
  { id: "cam_paladin", name: "Paladin", faction: AoWFaction.CAMELOT, tier: AoWUnitTier.TIER2,
    hp: 60, attack: 10, defense: 9, damage: [7, 12], speed: 3, range: 0,
    abilities: ["heal_self", "holy_strike", "armored"], cost: 90, description: "Holy warriors blessed by the Grail" },
  { id: "cam_griffin", name: "Royal Griffin", faction: AoWFaction.CAMELOT, tier: AoWUnitTier.TIER3,
    hp: 70, attack: 12, defense: 7, damage: [8, 14], speed: 5, range: 0,
    abilities: ["flying", "dive_attack"], cost: 120, description: "Majestic winged beasts of Camelot" },

  // === UNDEAD ===
  { id: "und_skeleton", name: "Skeleton", faction: AoWFaction.UNDEAD, tier: AoWUnitTier.TIER1,
    hp: 20, attack: 5, defense: 3, damage: [2, 4], speed: 3, range: 0,
    abilities: ["undead"], cost: 15, description: "Mindless bones, cheap and plentiful" },
  { id: "und_zombie", name: "Plague Zombie", faction: AoWFaction.UNDEAD, tier: AoWUnitTier.TIER1,
    hp: 35, attack: 4, defense: 5, damage: [3, 5], speed: 2, range: 0,
    abilities: ["undead", "poison"], cost: 25, description: "Shambling corpses that spread disease" },
  { id: "und_wraith", name: "Wraith", faction: AoWFaction.UNDEAD, tier: AoWUnitTier.TIER2,
    hp: 40, attack: 10, defense: 4, damage: [6, 10], speed: 4, range: 0,
    abilities: ["undead", "incorporeal", "life_steal"], cost: 70, description: "Ethereal spirits that drain the living" },
  { id: "und_vampire", name: "Vampire Lord", faction: AoWFaction.UNDEAD, tier: AoWUnitTier.TIER2,
    hp: 55, attack: 11, defense: 7, damage: [7, 12], speed: 4, range: 0,
    abilities: ["undead", "flying", "life_steal", "regenerate"], cost: 95, description: "Ancient bloodsuckers of terrible power" },
  { id: "und_bone_dragon", name: "Bone Dragon", faction: AoWFaction.UNDEAD, tier: AoWUnitTier.TIER3,
    hp: 80, attack: 14, defense: 8, damage: [10, 16], speed: 5, range: 2,
    abilities: ["undead", "flying", "fear", "breath_attack"], cost: 130, description: "Reanimated dragon skeleton of apocalyptic power" },

  // === FEY ===
  { id: "fey_sprite", name: "Sprite", faction: AoWFaction.FEY, tier: AoWUnitTier.TIER1,
    hp: 15, attack: 5, defense: 2, damage: [2, 4], speed: 5, range: 2,
    abilities: ["flying", "ranged"], cost: 20, description: "Tiny flying creatures with poison darts" },
  { id: "fey_ranger", name: "Elven Ranger", faction: AoWFaction.FEY, tier: AoWUnitTier.TIER1,
    hp: 25, attack: 8, defense: 3, damage: [4, 7], speed: 4, range: 4,
    abilities: ["ranged", "forest_walk"], cost: 40, description: "Swift archers at home in the woods" },
  { id: "fey_unicorn", name: "Unicorn", faction: AoWFaction.FEY, tier: AoWUnitTier.TIER2,
    hp: 45, attack: 9, defense: 6, damage: [5, 9], speed: 5, range: 0,
    abilities: ["charge", "magic_resist", "aura_heal"], cost: 75, description: "Magical steeds that heal allies nearby" },
  { id: "fey_treant", name: "Treant", faction: AoWFaction.FEY, tier: AoWUnitTier.TIER2,
    hp: 70, attack: 8, defense: 10, damage: [6, 10], speed: 2, range: 0,
    abilities: ["entangle", "regenerate", "armored"], cost: 85, description: "Ancient tree guardians, slow but mighty" },
  { id: "fey_phoenix", name: "Phoenix", faction: AoWFaction.FEY, tier: AoWUnitTier.TIER3,
    hp: 60, attack: 13, defense: 6, damage: [9, 15], speed: 6, range: 2,
    abilities: ["flying", "fire_aura", "rebirth", "breath_attack"], cost: 125, description: "Immortal firebird that rises from its ashes" },

  // === DWARVES ===
  { id: "dwf_warrior", name: "Axe Warrior", faction: AoWFaction.DWARVES, tier: AoWUnitTier.TIER1,
    hp: 35, attack: 6, defense: 6, damage: [4, 6], speed: 2, range: 0,
    abilities: ["armored"], cost: 30, description: "Stout warriors with axes and shields" },
  { id: "dwf_crossbow", name: "Crossbowman", faction: AoWFaction.DWARVES, tier: AoWUnitTier.TIER1,
    hp: 25, attack: 7, defense: 4, damage: [4, 7], speed: 2, range: 3,
    abilities: ["ranged", "armor_pierce"], cost: 35, description: "Heavy crossbows that pierce armor" },
  { id: "dwf_berserker", name: "Berserker", faction: AoWFaction.DWARVES, tier: AoWUnitTier.TIER2,
    hp: 55, attack: 12, defense: 3, damage: [8, 13], speed: 3, range: 0,
    abilities: ["frenzy", "fearless"], cost: 70, description: "Enraged dwarves that hit harder as they take damage" },
  { id: "dwf_golem", name: "Iron Golem", faction: AoWFaction.DWARVES, tier: AoWUnitTier.TIER2,
    hp: 80, attack: 8, defense: 12, damage: [5, 8], speed: 2, range: 0,
    abilities: ["armored", "magic_resist", "construct"], cost: 95, description: "Enchanted metal construct, nearly indestructible" },
  { id: "dwf_cannon", name: "Steam Cannon", faction: AoWFaction.DWARVES, tier: AoWUnitTier.TIER3,
    hp: 40, attack: 15, defense: 5, damage: [12, 20], speed: 1, range: 5,
    abilities: ["ranged", "siege", "area_attack"], cost: 110, description: "Devastating siege engine with explosive shells" },
];

// ---------------------------------------------------------------------------
// Hero definitions (one per faction)
// ---------------------------------------------------------------------------

export const AOW_HEROES: AoWUnitDef[] = [
  { id: "hero_arthur", name: "King Arthur", faction: AoWFaction.CAMELOT, tier: AoWUnitTier.HERO,
    hp: 80, attack: 12, defense: 10, damage: [8, 14], speed: 4, range: 0,
    abilities: ["leadership", "holy_strike", "inspire"], cost: 120,
    description: "The Once and Future King, wielder of Excalibur" },
  { id: "hero_morgoth", name: "Lich King Morgoth", faction: AoWFaction.UNDEAD, tier: AoWUnitTier.HERO,
    hp: 65, attack: 14, defense: 6, damage: [10, 16], speed: 3, range: 3,
    abilities: ["ranged", "life_steal", "raise_dead", "dark_ritual"], cost: 120,
    description: "Ancient lich of terrible necromantic power" },
  { id: "hero_elara", name: "Queen Elara", faction: AoWFaction.FEY, tier: AoWUnitTier.HERO,
    hp: 55, attack: 11, defense: 5, damage: [7, 12], speed: 5, range: 4,
    abilities: ["ranged", "forest_walk", "nature_magic", "summon_treant"], cost: 120,
    description: "The ageless Fey Queen, one with the forest" },
  { id: "hero_thorin", name: "Thane Thorin", faction: AoWFaction.DWARVES, tier: AoWUnitTier.HERO,
    hp: 90, attack: 13, defense: 12, damage: [9, 15], speed: 3, range: 0,
    abilities: ["armored", "frenzy", "fortify", "earthquake"], cost: 120,
    description: "Ironhold's mightiest thane, unbreakable in battle" },
];

// ---------------------------------------------------------------------------
// Spell definitions
// ---------------------------------------------------------------------------

export const AOW_SPELLS: AoWSpellDef[] = [
  // FIRE
  { id: "fireball", name: "Fireball", domain: AoWSpellDomain.FIRE, manaCost: 20,
    description: "Hurls a ball of flame at an enemy army, dealing 15-25 damage to all units",
    targetType: "army", effect: "damage_all", damage: 20 },
  { id: "meteor", name: "Meteor Strike", domain: AoWSpellDomain.FIRE, manaCost: 50,
    description: "Calls down a meteor on a hex, devastating everything in the area",
    targetType: "hex", effect: "damage_hex", damage: 40 },
  { id: "flame_ward", name: "Flame Ward", domain: AoWSpellDomain.FIRE, manaCost: 15,
    description: "Wraps a city in protective flames, damaging attackers",
    targetType: "city", effect: "city_ward" },

  // ICE
  { id: "blizzard", name: "Blizzard", domain: AoWSpellDomain.ICE, manaCost: 25,
    description: "Freezes an enemy army, halving their movement for 2 turns",
    targetType: "army", effect: "slow" },
  { id: "ice_wall", name: "Ice Wall", domain: AoWSpellDomain.ICE, manaCost: 15,
    description: "Creates an impassable ice wall on a hex for 3 turns",
    targetType: "hex", effect: "block_hex" },
  { id: "frozen_doom", name: "Frozen Doom", domain: AoWSpellDomain.ICE, manaCost: 60,
    description: "Encases all enemy armies in ice, dealing 30 damage globally",
    targetType: "global", effect: "global_damage", damage: 30 },

  // LIFE
  { id: "heal", name: "Heal", domain: AoWSpellDomain.LIFE, manaCost: 12,
    description: "Restores 20 HP to all units in a friendly army",
    targetType: "army", effect: "heal_all", heal: 20 },
  { id: "resurrect", name: "Resurrect", domain: AoWSpellDomain.LIFE, manaCost: 40,
    description: "Brings back a fallen unit in a friendly army at half HP",
    targetType: "army", effect: "resurrect" },
  { id: "divine_shield", name: "Divine Shield", domain: AoWSpellDomain.LIFE, manaCost: 30,
    description: "Grants +5 defense to all units in a friendly army for 3 turns",
    targetType: "army", effect: "buff_defense" },

  // DEATH
  { id: "drain_life", name: "Drain Life", domain: AoWSpellDomain.DEATH, manaCost: 15,
    description: "Drains 15 HP from an enemy army's strongest unit, healing your hero",
    targetType: "army", effect: "drain", damage: 15 },
  { id: "raise_dead", name: "Raise Dead", domain: AoWSpellDomain.DEATH, manaCost: 35,
    description: "Summons 2 skeleton units to a hex",
    targetType: "hex", effect: "summon", summonId: "und_skeleton" },
  { id: "curse", name: "Curse of Weakness", domain: AoWSpellDomain.DEATH, manaCost: 20,
    description: "Reduces attack of all units in an enemy army by 3 for 3 turns",
    targetType: "army", effect: "debuff_attack" },

  // EARTH
  { id: "stone_skin", name: "Stone Skin", domain: AoWSpellDomain.EARTH, manaCost: 15,
    description: "Grants +4 defense to all units in a friendly army for 2 turns",
    targetType: "army", effect: "buff_defense" },
  { id: "earthquake", name: "Earthquake", domain: AoWSpellDomain.EARTH, manaCost: 45,
    description: "Damages all units on a hex and destroys walls",
    targetType: "hex", effect: "earthquake", damage: 25 },
  { id: "entangle", name: "Entangle", domain: AoWSpellDomain.EARTH, manaCost: 12,
    description: "Roots an enemy army in place for 1 turn",
    targetType: "army", effect: "root" },

  // ARCANE
  { id: "teleport", name: "Teleport", domain: AoWSpellDomain.ARCANE, manaCost: 30,
    description: "Teleports a friendly army to any explored hex",
    targetType: "army", effect: "teleport" },
  { id: "dispel", name: "Dispel Magic", domain: AoWSpellDomain.ARCANE, manaCost: 10,
    description: "Removes all magical effects from a hex",
    targetType: "hex", effect: "dispel" },
  { id: "grail_vision", name: "Grail Vision", domain: AoWSpellDomain.ARCANE, manaCost: 50,
    description: "Reveals the location of the Holy Grail",
    targetType: "global", effect: "reveal_grail" },
];

// ---------------------------------------------------------------------------
// Terrain config
// ---------------------------------------------------------------------------

export interface AoWTerrainDef {
  id: AoWTerrain;
  moveCost: number;
  defenseBonus: number;
  passable: boolean;
  color: number;
  elevationRange: [number, number];
}

export const AOW_TERRAIN: Record<AoWTerrain, AoWTerrainDef> = {
  [AoWTerrain.PLAINS]: { id: AoWTerrain.PLAINS, moveCost: 1, defenseBonus: 0, passable: true, color: 0x5a8a3c, elevationRange: [0, 1] },
  [AoWTerrain.FOREST]: { id: AoWTerrain.FOREST, moveCost: 2, defenseBonus: 1, passable: true, color: 0x2d5a1e, elevationRange: [0, 1] },
  [AoWTerrain.HILLS]: { id: AoWTerrain.HILLS, moveCost: 2, defenseBonus: 2, passable: true, color: 0x8a7a3c, elevationRange: [1, 2] },
  [AoWTerrain.MOUNTAIN]: { id: AoWTerrain.MOUNTAIN, moveCost: 4, defenseBonus: 3, passable: true, color: 0x6a6a6a, elevationRange: [2, 3] },
  [AoWTerrain.WATER]: { id: AoWTerrain.WATER, moveCost: 99, defenseBonus: 0, passable: false, color: 0x2255aa, elevationRange: [0, 0] },
  [AoWTerrain.SWAMP]: { id: AoWTerrain.SWAMP, moveCost: 3, defenseBonus: -1, passable: true, color: 0x4a5a3a, elevationRange: [0, 0] },
  [AoWTerrain.SNOW]: { id: AoWTerrain.SNOW, moveCost: 2, defenseBonus: 0, passable: true, color: 0xccddee, elevationRange: [1, 2] },
  [AoWTerrain.LAVA]: { id: AoWTerrain.LAVA, moveCost: 99, defenseBonus: 0, passable: false, color: 0xcc3311, elevationRange: [0, 0] },
};

// ---------------------------------------------------------------------------
// City names pool
// ---------------------------------------------------------------------------

export const AOW_CITY_NAMES: Record<AoWFaction, string[]> = {
  [AoWFaction.CAMELOT]: ["Camelot", "Avalon", "Tintagel", "Glastonbury", "Caerleon", "Winchester", "Cardigan"],
  [AoWFaction.UNDEAD]: ["Necrolis", "Shadowfane", "Bonecrypt", "Dreadspire", "Tombhaven", "Ashenmoor", "Graveholt"],
  [AoWFaction.FEY]: ["Silverleaf", "Moonhollow", "Starbloom", "Dewglade", "Thornhaven", "Willowmist", "Crystalvale"],
  [AoWFaction.DWARVES]: ["Ironhold", "Deepforge", "Hammerfall", "Stonekeep", "Mithrilhall", "Anvilheim", "Goldvein"],
};

// ---------------------------------------------------------------------------
// Helper: get faction units
// ---------------------------------------------------------------------------

export function getUnitsForFaction(faction: AoWFaction): AoWUnitDef[] {
  return AOW_UNITS.filter(u => u.faction === faction);
}

export function getHeroForFaction(faction: AoWFaction): AoWUnitDef {
  return AOW_HEROES.find(h => h.faction === faction)!;
}

export function getFactionDef(faction: AoWFaction): AoWFactionDef {
  return AOW_FACTIONS.find(f => f.id === faction)!;
}

export function getSpellDef(id: string): AoWSpellDef | undefined {
  return AOW_SPELLS.find(s => s.id === id);
}

export function getUnitDef(id: string): AoWUnitDef | undefined {
  return AOW_UNITS.find(u => u.id === id) || AOW_HEROES.find(h => h.id === id);
}
