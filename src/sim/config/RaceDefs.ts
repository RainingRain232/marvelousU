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
}

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
  /** Race tier ratings (1–5) indicating max unit tier the race can field per category. */
  tiers?: RaceTiers;
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
    },
  },
  {
    id: "dwarf",
    name: "Dwarves",
    title: "Forge-Lords of the Deep",
    flavor: "Masters of stone and steel, dwarven holds are near-impregnable fortresses. Their warriors are short of stature but unbreakable in resolve, clad in the finest armour money — or a mountain — can buy.",
    factionUnit: UnitType.HALBERDIER, // placeholder until dwarf unit is implemented
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0xcc8822,
  },
  {
    id: "orc",
    name: "Orcs",
    title: "Blood and Thunder",
    flavor: "The orcish hordes overwhelm with sheer ferocity. Where others plan and scheme, orcs simply charge — and they hit hard enough that the difference rarely matters.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0x886622,
  },
  {
    id: "undead",
    name: "Undead",
    title: "The Endless Legion",
    flavor: "Death is no obstacle to an undead army — it is a promotion. Every fallen warrior rises again, and their generals have had centuries to perfect the art of conquest.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0x7722aa,
  },
  {
    id: "demon",
    name: "Demons",
    title: "Scourge of the Pit",
    flavor: "Summoned from realms where mercy is a forgotten concept, demons revel in destruction. Their armies corrupt the land they march through, leaving nothing but ash and silence.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0xcc2222,
  },
  {
    id: "angel",
    name: "Angels",
    title: "Servants of Light",
    flavor: "Radiant warriors of divine origin, angels fight not for conquest but to protect. Their healing light and blessed weapons make them the most feared defensive force in existence.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0xddcc44,
  },
  {
    id: "beast",
    name: "Beastkin",
    title: "Wild and Untamed",
    flavor: "Neither fully beast nor fully man, the Beastkin honour the ancient pact between predator and tribe. Their warriors move with animal instinct and fight with a ferocity that chills even seasoned soldiers.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0x885533,
  },
  {
    id: "golem",
    name: "Golem Collective",
    title: "Minds of Stone",
    flavor: "Vast walking fortresses of enchanted rock, the Golem Collective does not bleed, does not tire, and does not feel fear. They simply advance — until there is nothing left to advance toward.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0x556688,
  },
  {
    id: "pirate",
    name: "Pirates",
    title: "Raiders of the High Seas",
    flavor: "No coast is safe when the black flag flies. Pirate crews fight dirty, hit fast, and vanish before reinforcements arrive — leaving only empty coffers and burning docks behind.",
    factionUnit: UnitType.HALBERDIER,
    factionUnits: [UnitType.HALBERDIER],
    factionUnitLabel: "Coming soon...",
    implemented: false,
    accentColor: 0x336699,
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

  // Horse archer is in stables but counts as ranged
  if (ut === UnitType.HORSE_ARCHER) return "ranged";

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
