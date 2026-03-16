// ---------------------------------------------------------------------------
// Quest for the Grail — Curse System
// Powerful items with drawbacks that create interesting build decisions.
// ---------------------------------------------------------------------------

import { ItemType, ItemRarity } from "./GameConfig";
import type { ItemDef } from "./GameConfig";

// ---------------------------------------------------------------------------
// Curse types
// ---------------------------------------------------------------------------

export type CurseType =
  | "hp_drain"        // Lose HP each floor
  | "gold_siphon"     // Lose gold on kills
  | "slow"            // Reduced movement speed
  | "fragile"         // Increased damage taken
  | "blind"           // Reduced vision radius
  | "cursed_heal"     // Healing is halved
  | "berserk"         // Cannot use abilities
  | "doom"            // Slowly ticking damage in combat
  | "greed"           // Cannot pick up common items
  | "haunted";        // Random enemies spawn near you

export interface CurseDef {
  id: CurseType;
  name: string;
  description: string;
  /** Color for the curse icon. */
  color: number;
  /** Severity 1-3 (affects penalty strength). */
  severity: number;
}

export const CURSE_DEFS: Record<CurseType, CurseDef> = {
  hp_drain: {
    id: "hp_drain",
    name: "Blood Price",
    description: "Lose 10% max HP at the start of each floor.",
    color: 0xcc0000,
    severity: 2,
  },
  gold_siphon: {
    id: "gold_siphon",
    name: "Miser's Curse",
    description: "Lose 5 gold for every enemy killed.",
    color: 0xffcc00,
    severity: 1,
  },
  slow: {
    id: "slow",
    name: "Leaden Feet",
    description: "Movement speed reduced by 25%.",
    color: 0x888888,
    severity: 1,
  },
  fragile: {
    id: "fragile",
    name: "Glass Soul",
    description: "Take 30% more damage from all sources.",
    color: 0xff4466,
    severity: 3,
  },
  blind: {
    id: "blind",
    name: "Veil of Shadows",
    description: "Vision radius reduced to 2 tiles.",
    color: 0x333344,
    severity: 2,
  },
  cursed_heal: {
    id: "cursed_heal",
    name: "Withered Spirit",
    description: "All healing effects are halved.",
    color: 0x446644,
    severity: 2,
  },
  berserk: {
    id: "berserk",
    name: "Mindless Fury",
    description: "Cannot use knight abilities. Attack +30%.",
    color: 0xff6600,
    severity: 2,
  },
  doom: {
    id: "doom",
    name: "Doom Clock",
    description: "Take 2 damage per second during combat.",
    color: 0x440044,
    severity: 3,
  },
  greed: {
    id: "greed",
    name: "Collector's Burden",
    description: "Cannot pick up common-rarity items.",
    color: 0xaa8800,
    severity: 1,
  },
  haunted: {
    id: "haunted",
    name: "Haunted",
    description: "Wraiths periodically spawn near you.",
    color: 0x6644aa,
    severity: 2,
  },
};

// ---------------------------------------------------------------------------
// Cursed Item Definitions
// ---------------------------------------------------------------------------

export interface CursedItemDef {
  /** The base item definition (powerful stats). */
  item: ItemDef;
  /** The curse attached to this item. */
  curseType: CurseType;
  /** Whether the curse can be cleansed at a shrine (true) or is permanent. */
  cleansable: boolean;
}

export const CURSED_ITEM_DEFS: CursedItemDef[] = [
  // --- Weapons ---
  {
    item: {
      id: "cursed_soulreaver",
      name: "Soulreaver",
      type: ItemType.WEAPON,
      rarity: ItemRarity.LEGENDARY,
      color: 0x880044,
      attackBonus: 25,
      defenseBonus: 0,
      hpBonus: -15,
      speedBonus: 1,
      specialEffect: "life_steal",
      desc: "A blade that drinks souls. Immense power at a terrible price.",
    },
    curseType: "hp_drain",
    cleansable: false,
  },
  {
    item: {
      id: "cursed_greed_blade",
      name: "Blade of Avarice",
      type: ItemType.WEAPON,
      rarity: ItemRarity.RARE,
      color: 0xffaa00,
      attackBonus: 14,
      defenseBonus: 0,
      hpBonus: 0,
      speedBonus: 0,
      specialEffect: "gold_on_kill",
      desc: "Every kill fills your purse, but the blade demands its tithe.",
    },
    curseType: "gold_siphon",
    cleansable: true,
  },
  {
    item: {
      id: "cursed_berserker_axe",
      name: "Berserker's Axe",
      type: ItemType.WEAPON,
      rarity: ItemRarity.RARE,
      color: 0xff4400,
      attackBonus: 18,
      defenseBonus: -5,
      hpBonus: 20,
      speedBonus: 0,
      specialEffect: "berserk_rage",
      desc: "Fury incarnate. The axe swings itself — you just hold on.",
    },
    curseType: "berserk",
    cleansable: true,
  },

  // --- Armor ---
  {
    item: {
      id: "cursed_shadow_plate",
      name: "Shadow Plate",
      type: ItemType.ARMOR,
      rarity: ItemRarity.LEGENDARY,
      color: 0x222244,
      attackBonus: 5,
      defenseBonus: 20,
      hpBonus: 30,
      speedBonus: -1,
      specialEffect: "shadow_form",
      desc: "Forged in darkness. Impenetrable, but it clouds your sight.",
    },
    curseType: "blind",
    cleansable: false,
  },
  {
    item: {
      id: "cursed_doom_mail",
      name: "Doom Mail",
      type: ItemType.ARMOR,
      rarity: ItemRarity.RARE,
      color: 0x440044,
      attackBonus: 0,
      defenseBonus: 16,
      hpBonus: 40,
      speedBonus: 0,
      specialEffect: "reflect_damage",
      desc: "Ancient cursed armor. Reflects damage, but time is against you.",
    },
    curseType: "doom",
    cleansable: true,
  },
  {
    item: {
      id: "cursed_leaden_shield",
      name: "Leaden Shield",
      type: ItemType.ARMOR,
      rarity: ItemRarity.UNCOMMON,
      color: 0x666666,
      attackBonus: 0,
      defenseBonus: 14,
      hpBonus: 25,
      speedBonus: -2,
      desc: "Impossibly heavy. No blow can pierce it, but you can barely move.",
    },
    curseType: "slow",
    cleansable: true,
  },

  // --- Relics ---
  {
    item: {
      id: "cursed_crown_of_thorns",
      name: "Crown of Thorns",
      type: ItemType.RELIC,
      rarity: ItemRarity.LEGENDARY,
      color: 0xcc4444,
      attackBonus: 12,
      defenseBonus: 12,
      hpBonus: 0,
      speedBonus: 0,
      specialEffect: "thorns_aura",
      desc: "A crown that bleeds the wearer but devastates all who approach.",
    },
    curseType: "fragile",
    cleansable: false,
  },
  {
    item: {
      id: "cursed_phantom_ring",
      name: "Phantom Ring",
      type: ItemType.RELIC,
      rarity: ItemRarity.RARE,
      color: 0x6644aa,
      attackBonus: 8,
      defenseBonus: 4,
      hpBonus: 15,
      speedBonus: 1,
      specialEffect: "phase_shift",
      desc: "Lets you phase through walls, but attracts restless spirits.",
    },
    curseType: "haunted",
    cleansable: true,
  },
  {
    item: {
      id: "cursed_withered_amulet",
      name: "Withered Amulet",
      type: ItemType.RELIC,
      rarity: ItemRarity.RARE,
      color: 0x446644,
      attackBonus: 10,
      defenseBonus: 6,
      hpBonus: 20,
      speedBonus: 0,
      specialEffect: "xp_boost",
      desc: "An ancient amulet that grants wisdom but weakens the body's recovery.",
    },
    curseType: "cursed_heal",
    cleansable: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the curse definition for a cursed item.
 */
export function getCurseForItem(itemId: string): CurseDef | null {
  const cursedItem = CURSED_ITEM_DEFS.find(ci => ci.item.id === itemId);
  if (!cursedItem) return null;
  return CURSE_DEFS[cursedItem.curseType];
}

/**
 * Check if an item is cursed.
 */
export function isItemCursed(itemId: string): boolean {
  return CURSED_ITEM_DEFS.some(ci => ci.item.id === itemId);
}

/**
 * Get all cursed items as a Record for quick lookup.
 */
export function getCursedItemRecord(): Record<string, CursedItemDef> {
  const rec: Record<string, CursedItemDef> = {};
  for (const ci of CURSED_ITEM_DEFS) {
    rec[ci.item.id] = ci;
  }
  return rec;
}

/**
 * Apply curse penalties to player state values.
 * Returns adjusted values based on active curses.
 */
export function applyCursePenalties(
  activeCurses: CurseType[],
  values: {
    speed: number;
    damageTaken: number;
    visionRadius: number;
    healingMult: number;
    attackMult: number;
    canUseAbility: boolean;
  },
): {
  speed: number;
  damageTaken: number;
  visionRadius: number;
  healingMult: number;
  attackMult: number;
  canUseAbility: boolean;
} {
  const result = { ...values };

  for (const curse of activeCurses) {
    switch (curse) {
      case "slow":
        result.speed = Math.floor(result.speed * 0.75);
        break;
      case "fragile":
        result.damageTaken = result.damageTaken * 1.3;
        break;
      case "blind":
        result.visionRadius = Math.min(result.visionRadius, 2);
        break;
      case "cursed_heal":
        result.healingMult *= 0.5;
        break;
      case "berserk":
        result.canUseAbility = false;
        result.attackMult *= 1.3;
        break;
    }
  }

  return result;
}
