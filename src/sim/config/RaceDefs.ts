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
