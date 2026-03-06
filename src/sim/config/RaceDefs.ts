// Race (faction) definitions.
// Each race grants a unique faction unit trained from the Faction Hall.
// Races that are not yet implemented use `implemented: false` and show a
// "Coming Soon" state in the race selection screen.

import { UnitType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RaceId = string;

export type MagicElement = "fire" | "cold" | "lightning" | "distortion" | "summon" | "nature" | "heal";

export interface RaceTiers {
  melee: number; ranged: number; siege: number;
  creature: number; magic: number;
  fire: number; cold: number; lightning: number;
  distortion: number; summon: number; nature: number;
  heal: number;
  // Spell school tiers (gate Archive spells by magic type)
  earth: number; arcane: number; shadow: number;
  poison: number; void: number; death: number;
}

/** Maps spellMagicType values to the RaceTiers key that gates them. */
export const SPELL_MAGIC_TO_TIER: Record<string, keyof RaceTiers> = {
  fire: "fire", ice: "cold", lightning: "lightning",
  earth: "earth", arcane: "arcane", holy: "heal",
  shadow: "shadow", poison: "poison", void: "void",
  death: "death", nature: "nature",
};

export interface RaceDef {
  id: RaceId;
  name: string;
  title: string;       // Short flavour subtitle, e.g. "Children of the Forest"
  flavor: string;      // One or two sentence lore blurb
  /** The faction-exclusive unit type unlocked by this race's Faction Hall. */
  factionUnit: UnitType;
  /** All faction-exclusive unit types (may include more than one). */
  factionUnits: UnitType[];
  /** Short one-line description of the faction unit, shown in the detail panel. */
  factionUnitLabel: string;
  /** Whether this race is fully playable (false = "Coming Soon" placeholder). */
  implemented: boolean;
  /** Accent colour used for the race card border / detail highlight (hex). */
  accentColor: number;
  /** Race tier ratings (1–7) indicating max unit tier the race can field per category. */
  tiers?: RaceTiers;
  /** Override starting gold for this race (defaults to BalanceConfig.START_GOLD). */
  startingGold?: number;
  /** Override starting mana for this race (defaults to 0). */
  startingMana?: number;
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const RACE_DEFINITIONS: RaceDef[] = [
  {
    id: "man",
    name: "Man",
    title: "Lords of the Realm",
    flavor: "Hardy and adaptable, the men of the realm forge empires through iron will and disciplined armies. Where elves rely on grace and dwarves on craft, men rely on numbers, loyalty, and stubborn courage.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER, UnitType.ROYAL_ARBALESTIER],
    factionUnitLabel: "Halberdier — elite heavy infantry with superior reach and armour.",
    implemented: true,
    accentColor: 0x4466cc,
    tiers: {
      melee: 4, ranged: 4, siege: 5,
      creature: 2, magic: 3,
      fire: 3, cold: 3, lightning: 3,
      distortion: 3, summon: 3, nature: 3,
      heal: 5,
      earth: 2, arcane: 2, shadow: 1, poison: 0, void: 0, death: 0,
    },
  },
  {
    id: "elf",
    name: "Elves",
    title: "Children of the Forest",
    flavor: "Ancient beyond memory, the elves weave magic and arrow-fire into an art form. Their archers strike from distances that leave enemies helpless, and their bond with the living wood grants them uncanny resilience.",
    factionUnit: UnitType.ELVEN_ARCHER,
    factionUnits: [UnitType.ELVEN_ARCHER],
    factionUnitLabel: "Elven Archer — unmatched range and precision, strikes from afar.",
    implemented: true,
    accentColor: 0x44aa44,
    tiers: {
      melee: 2, ranged: 5, siege: 2,
      creature: 5, magic: 5,
      fire: 3, cold: 4, lightning: 5,
      distortion: 2, summon: 3, nature: 5,
      heal: 4,
      earth: 3, arcane: 4, shadow: 1, poison: 0, void: 1, death: 0,
    },
  },
  {
    id: "horde",
    name: "The Horde",
    title: "Strength in Numbers",
    flavor: "The Horde does not build temples or study scrolls. They sharpen blades, breed war-beasts, and march. What they lack in arcane finesse they make up for with overwhelming force and an utter disregard for self-preservation.",
    factionUnit: UnitType.WARCHIEF,
    factionUnits: [UnitType.WARCHIEF],
    factionUnitLabel: "Warchief — brutal melee leader wielding a massive cleaver.",
    implemented: true,
    accentColor: 0x884422,
    tiers: {
      melee: 5, ranged: 5, siege: 5,
      creature: 5, magic: 0,
      fire: 0, cold: 0, lightning: 0,
      distortion: 0, summon: 0, nature: 0,
      heal: 1,
      earth: 0, arcane: 0, shadow: 0, poison: 0, void: 0, death: 0,
    },
  },
  {
    id: "adept",
    name: "The Adept",
    title: "Masters of the Arcane",
    flavor: "Where others train soldiers, the Adept train minds. Their armies are small and fragile, but a single archmage can level a battalion. They command every school of magic and bend reality itself to their will.",
    factionUnit: UnitType.ARCHMAGE,
    factionUnits: [UnitType.ARCHMAGE],
    factionUnitLabel: "Archmage — supreme arcanist channelling devastating arcane energy.",
    implemented: true,
    accentColor: 0x7744cc,
    tiers: {
      melee: 1, ranged: 1, siege: 0,
      creature: 3, magic: 5,
      fire: 5, cold: 5, lightning: 5,
      distortion: 5, summon: 5, nature: 5,
      heal: 4,
      earth: 4, arcane: 5, shadow: 4, poison: 3, void: 4, death: 3,
    },
  },
  {
    id: "elements",
    name: "The Elements",
    title: "Wrath of the Primordials",
    flavor: "Born from the raw forces that shaped the world, the Elements command fire, ice, storm, and void alike. They field no mortal soldiers — only creatures and pure elemental magic channelled through ancient conduits.",
    factionUnit: UnitType.HALBERDIER, // placeholder until faction unit is implemented
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: true,
    accentColor: 0xcc6622,
    tiers: {
      melee: 0, ranged: 0, siege: 0,
      creature: 5, magic: 5,
      fire: 5, cold: 5, lightning: 5,
      distortion: 5, summon: 5, nature: 5,
      heal: 0,
      earth: 5, arcane: 3, shadow: 2, poison: 2, void: 3, death: 2,
    },
  },
  {
    id: "op",
    name: "The OP",
    title: "Beyond All Limits",
    flavor: "Some call it cheating. Others call it destiny. The OP know no boundaries — every unit, every tier, unlimited gold. Why struggle when you can simply overwhelm?",
    factionUnit: UnitType.HALBERDIER, // placeholder — no faction unit
    factionUnits: [],
    factionUnitLabel: "None — The OP need no exclusive units.",
    implemented: true,
    accentColor: 0xffdd00,
    startingGold: 50000,
    startingMana: 50000,
    tiers: {
      melee: 7, ranged: 7, siege: 7,
      creature: 7, magic: 7,
      fire: 7, cold: 7, lightning: 7,
      distortion: 7, summon: 7, nature: 7,
      heal: 7,
      earth: 7, arcane: 7, shadow: 7, poison: 7, void: 7, death: 7,
    },
  },
  {
    id: "halfling",
    name: "Halflings",
    title: "The Little Folk",
    flavor: "Underestimated by all, the Halflings survive through cunning, speed, and an uncanny knack for hitting things with rocks. Their slingers are the fastest in the land, and their bond with woodland creatures makes their armies deceptively dangerous.",
    factionUnit: UnitType.HALFLING_SLINGER,
    factionUnits: [UnitType.HALFLING_SLINGER, UnitType.HALFLING_CHEF],
    factionUnitLabel: "Halfling Slinger — lightning-fast ranged skirmisher with deadly accuracy.",
    implemented: true,
    accentColor: 0x88aa44,
    tiers: {
      melee: 2, ranged: 7, siege: 1,
      creature: 5, magic: 3,
      fire: 2, cold: 2, lightning: 2,
      distortion: 1, summon: 3, nature: 7,
      heal: 4,
      earth: 3, arcane: 1, shadow: 2, poison: 3, void: 0, death: 0,
    },
  },
  {
    id: "lava",
    name: "Lava Children",
    title: "Born of the Molten Deep",
    flavor: "Forged in the heart of volcanoes where rock flows like water, the Lava Children are creatures of living flame and obsidian. They command fire with an intimacy no mortal mage can match, and their golem armies shrug off blows that would shatter steel.",
    factionUnit: UnitType.MAGMA_GOLEM,
    factionUnits: [UnitType.MAGMA_GOLEM, UnitType.LAVA_SHAMAN],
    factionUnitLabel: "Magma Golem — massive molten construct with fire aura and high resilience.",
    implemented: true,
    accentColor: 0xee5511,
    tiers: {
      melee: 4, ranged: 2, siege: 7,
      creature: 5, magic: 4,
      fire: 7, cold: 0, lightning: 3,
      distortion: 2, summon: 4, nature: 0,
      heal: 1,
      earth: 5, arcane: 2, shadow: 3, poison: 0, void: 2, death: 3,
    },
  },
  {
    id: "dwarf",
    name: "Dwarves",
    title: "Forge-Lords of the Deep",
    flavor: "Masters of stone and steel, dwarven holds are near-impregnable fortresses. Their warriors are short of stature but unbreakable in resolve, clad in the finest armour money — or a mountain — can buy.",
    factionUnit: UnitType.DWARVEN_GUARDIAN,
    factionUnits: [UnitType.DWARVEN_GUARDIAN, UnitType.RUNESMITH],
    factionUnitLabel: "Dwarven Guardian — ironclad shieldbearer, slow but nearly indestructible.",
    implemented: true,
    accentColor: 0xcc8822,
    tiers: {
      melee: 5, ranged: 3, siege: 7,
      creature: 2, magic: 2,
      fire: 2, cold: 2, lightning: 3,
      distortion: 1, summon: 1, nature: 1,
      heal: 3,
      earth: 7, arcane: 2, shadow: 0, poison: 0, void: 0, death: 0,
    },
  },
  {
    id: "orc",
    name: "Orcs",
    title: "Blood and Thunder",
    flavor: "The orcish hordes overwhelm with sheer ferocity. Where others plan and scheme, orcs simply charge — and they hit hard enough that the difference rarely matters.",
    factionUnit: UnitType.ORC_BRUTE,
    factionUnits: [UnitType.ORC_BRUTE, UnitType.ORC_DRUMMER],
    factionUnitLabel: "Orc Brute — hulking charger who hits like an avalanche.",
    implemented: true,
    accentColor: 0x886622,
    tiers: {
      melee: 7, ranged: 3, siege: 4,
      creature: 5, magic: 1,
      fire: 1, cold: 0, lightning: 1,
      distortion: 0, summon: 1, nature: 2,
      heal: 1,
      earth: 2, arcane: 0, shadow: 1, poison: 2, void: 0, death: 1,
    },
  },
  {
    id: "undead",
    name: "Undead",
    title: "The Endless Legion",
    flavor: "Death is no obstacle to an undead army — it is a promotion. Every fallen warrior rises again, and their generals have had centuries to perfect the art of conquest.",
    factionUnit: UnitType.DEATH_KNIGHT,
    factionUnits: [UnitType.DEATH_KNIGHT, UnitType.NECROMANCER],
    factionUnitLabel: "Death Knight — undying armoured revenant that regenerates from mortal wounds.",
    implemented: true,
    accentColor: 0x7722aa,
    tiers: {
      melee: 3, ranged: 2, siege: 2,
      creature: 4, magic: 5,
      fire: 1, cold: 3, lightning: 1,
      distortion: 3, summon: 5, nature: 0,
      heal: 0,
      earth: 1, arcane: 3, shadow: 7, poison: 4, void: 3, death: 7,
    },
  },
  {
    id: "demon",
    name: "Demons",
    title: "Scourge of the Pit",
    flavor: "Summoned from realms where mercy is a forgotten concept, demons revel in destruction. Their armies corrupt the land they march through, leaving nothing but ash and silence.",
    factionUnit: UnitType.PIT_LORD,
    factionUnits: [UnitType.PIT_LORD, UnitType.HELLFIRE_WARLOCK],
    factionUnitLabel: "Pit Lord — towering demon that breathes hellfire and crushes all before it.",
    implemented: true,
    accentColor: 0xcc2222,
    tiers: {
      melee: 5, ranged: 2, siege: 4,
      creature: 5, magic: 4,
      fire: 7, cold: 0, lightning: 3,
      distortion: 4, summon: 5, nature: 0,
      heal: 0,
      earth: 3, arcane: 2, shadow: 5, poison: 3, void: 7, death: 5,
    },
  },
  {
    id: "angel",
    name: "Angels",
    title: "Servants of Light",
    flavor: "Radiant warriors of divine origin, angels fight not for conquest but to protect. Their healing light and blessed weapons make them the most feared defensive force in existence.",
    factionUnit: UnitType.SERAPHIM,
    factionUnits: [UnitType.SERAPHIM, UnitType.DIVINE_CHAMPION],
    factionUnitLabel: "Seraphim — six-winged celestial healer radiating divine restoration.",
    implemented: true,
    accentColor: 0xddcc44,
    tiers: {
      melee: 3, ranged: 4, siege: 1,
      creature: 2, magic: 5,
      fire: 2, cold: 2, lightning: 3,
      distortion: 1, summon: 3, nature: 4,
      heal: 7,
      earth: 1, arcane: 7, shadow: 0, poison: 0, void: 1, death: 0,
    },
  },
  {
    id: "beast",
    name: "Beastkin",
    title: "Wild and Untamed",
    flavor: "Neither fully beast nor fully man, the Beastkin honour the ancient pact between predator and tribe. Their warriors move with animal instinct and fight with a ferocity that chills even seasoned soldiers.",
    factionUnit: UnitType.ALPHA_WOLF,
    factionUnits: [UnitType.ALPHA_WOLF, UnitType.BEAST_SHAMAN],
    factionUnitLabel: "Alpha Wolf — lightning-fast dire wolf that charges and tears apart its prey.",
    implemented: true,
    accentColor: 0x885533,
    tiers: {
      melee: 5, ranged: 3, siege: 1,
      creature: 7, magic: 2,
      fire: 1, cold: 1, lightning: 1,
      distortion: 0, summon: 4, nature: 7,
      heal: 3,
      earth: 3, arcane: 0, shadow: 1, poison: 2, void: 0, death: 0,
    },
  },
  {
    id: "golem",
    name: "Golem Collective",
    title: "Minds of Stone",
    flavor: "Vast walking fortresses of enchanted rock, the Golem Collective does not bleed, does not tire, and does not feel fear. They simply advance — until there is nothing left to advance toward.",
    factionUnit: UnitType.WAR_GOLEM,
    factionUnits: [UnitType.WAR_GOLEM, UnitType.RUNE_CORE],
    factionUnitLabel: "War Golem — colossal stone construct, nearly indestructible.",
    implemented: true,
    accentColor: 0x556688,
    tiers: {
      melee: 5, ranged: 2, siege: 5,
      creature: 4, magic: 1,
      fire: 2, cold: 1, lightning: 2,
      distortion: 2, summon: 1, nature: 0,
      heal: 0,
      earth: 7, arcane: 3, shadow: 0, poison: 0, void: 1, death: 0,
    },
  },
  {
    id: "pirate",
    name: "Pirates",
    title: "Raiders of the High Seas",
    flavor: "No coast is safe when the black flag flies. Pirate crews fight dirty, hit fast, and vanish before reinforcements arrive — leaving only empty coffers and burning docks behind.",
    factionUnit: UnitType.PIRATE_CAPTAIN,
    factionUnits: [UnitType.PIRATE_CAPTAIN, UnitType.CORSAIR_GUNNER],
    factionUnitLabel: "Pirate Captain — cunning fighter who nets enemies and cuts them down.",
    implemented: true,
    accentColor: 0x336699,
    tiers: {
      melee: 4, ranged: 5, siege: 7,
      creature: 2, magic: 2,
      fire: 2, cold: 1, lightning: 2,
      distortion: 1, summon: 1, nature: 2,
      heal: 2,
      earth: 1, arcane: 1, shadow: 3, poison: 2, void: 0, death: 0,
    },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getRace(id: RaceId): RaceDef | undefined {
  return RACE_DEFINITIONS.find((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// Race-based unit filtering
// ---------------------------------------------------------------------------

import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BuildingType } from "@/types";

/** Map from building type to the race tier category used for filtering. */
const BUILDING_TIER_CATEGORY: Partial<Record<BuildingType, keyof RaceTiers>> = {
  [BuildingType.BARRACKS]: "melee",
  [BuildingType.STABLES]: "melee",
  [BuildingType.ARCHERY_RANGE]: "ranged",
  [BuildingType.SIEGE_WORKSHOP]: "siege",
  [BuildingType.CREATURE_DEN]: "creature",
  [BuildingType.TEMPLE]: "heal",
  [BuildingType.ELITE_BARRACKS]: "melee",
  [BuildingType.ELITE_ARCHERY_RANGE]: "ranged",
  [BuildingType.ELITE_SIEGE_WORKSHOP]: "siege",
  [BuildingType.ELITE_MAGE_TOWER]: "magic",
  [BuildingType.ELITE_STABLES]: "melee",
  // Mage Tower uses per-element tiers — handled specially below.
  // Castle has mixed categories — handled specially below.
  // Faction Hall is never filtered.
};

/**
 * Return the race-tier key that should gate a given unit.
 * For mage/temple units with an `element` field the element tier is used;
 * otherwise the building's broad category tier is used.
 */
function getTierKey(ut: UnitType, buildingType: BuildingType): keyof RaceTiers | null {
  const def = UNIT_DEFINITIONS[ut];
  if (!def) return null;

  // Units with an element use that element's tier (mage tower + temple)
  if (def.element) return def.element as keyof RaceTiers;

  // Castle has mixed unit types
  if (buildingType === BuildingType.CASTLE) {
    // Archer → ranged, Swordsman → melee
    if (ut === UnitType.ARCHER) return "ranged";
    return "melee";
  }

  // Horse archers are in stables but count as ranged
  if (ut === UnitType.HORSE_ARCHER || ut === UnitType.ELDER_HORSE_ARCHER) return "ranged";

  return BUILDING_TIER_CATEGORY[buildingType] ?? null;
}

/**
 * Filter a building's shop inventory to only include units the race can field.
 * Units whose tier exceeds the race's tier rating for the relevant category
 * are removed. Returns a new array.
 *
 * Buildings without a tier mapping (Faction Hall, Blacksmith, etc.) are
 * returned unfiltered.
 */
export function filterInventoryByRace(
  inventory: UnitType[],
  buildingType: BuildingType,
  raceId: RaceId,
): UnitType[] {
  const race = getRace(raceId);
  if (!race?.tiers) return inventory; // unimplemented races → no filtering

  return inventory.filter((ut) => {
    const tierKey = getTierKey(ut, buildingType);
    if (!tierKey) return true; // no category → keep

    const unitDef = UNIT_DEFINITIONS[ut];
    if (!unitDef) return true;

    const unitTier = unitDef.tier ?? 1;
    const raceTierLimit = race.tiers![tierKey];
    return unitTier <= raceTierLimit;
  });
}
